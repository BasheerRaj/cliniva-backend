import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { User } from '../database/schemas/user.schema';
import { Organization } from '../database/schemas/organization.schema';
import { Complex } from '../database/schemas/complex.schema';
import { Clinic } from '../database/schemas/clinic.schema';
import { Subscription } from '../database/schemas/subscription.schema';
import { SubscriptionPlan } from '../database/schemas/subscription-plan.schema';
import { Appointment } from '../database/schemas/appointment.schema';
import { UserEntitiesResponseDto } from './dto/check-user-entities.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { DeactivateWithTransferDto } from './dto/deactivate-with-transfer.dto';
import { SessionService } from '../auth/session.service';
import { EmailService } from '../auth/email.service';
import { AuditService } from '../auth/audit.service';
import { ValidationUtil } from '../common/utils/validation.util';
import { ResponseBuilder } from '../common/utils/response-builder.util';
import { ERROR_MESSAGES } from '../common/utils/error-messages.constant';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Organization.name)
    private organizationModel: Model<Organization>,
    @InjectModel(Complex.name) private complexModel: Model<Complex>,
    @InjectModel(Clinic.name) private clinicModel: Model<Clinic>,
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<Subscription>,
    @InjectModel(SubscriptionPlan.name)
    private subscriptionPlanModel: Model<SubscriptionPlan>,
    @InjectModel(Appointment.name) private appointmentModel: Model<Appointment>,
    @InjectConnection() private connection: Connection,
    private readonly sessionService: SessionService,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
  ) {}

  async checkUserEntities(userId: string): Promise<UserEntitiesResponseDto> {
    try {
      // Validate userId can be converted to ObjectId
      if (!Types.ObjectId.isValid(userId)) {
        throw new NotFoundException(`Invalid userId format: ${userId}`);
      }

      // Get user with subscription info
      console.log('🔍 Looking for user with ID:', userId);
      const user = await this.userModel
        .findById(userId)
        .populate('subscriptionId')
        .exec();
      console.log(
        '👤 Found user:',
        user ? `${user.email} (${user.role})` : 'null',
      );
      if (!user) {
        throw new NotFoundException({
          message: ERROR_MESSAGES.USER_NOT_FOUND,
          code: 'USER_NOT_FOUND',
        });
      }

      // Get subscription details
      const subscription = await this.subscriptionModel
        .findById(user.subscriptionId)
        .populate('planId')
        .exec();
      if (!subscription) {
        throw new NotFoundException({
          message: ERROR_MESSAGES.SUBSCRIPTION_NOT_FOUND,
          code: 'SUBSCRIPTION_NOT_FOUND',
        });
      }

      const plan = subscription.planId as any; // Populated SubscriptionPlan
      const planType = plan.name; // clinic, complex, company

      // Check existing entities
      const [organizationCount, complexCount, clinicCount] = await Promise.all([
        this.organizationModel
          .countDocuments({ ownerId: new Types.ObjectId(userId) })
          .exec(),
        this.complexModel
          .countDocuments({ ownerId: new Types.ObjectId(userId) })
          .exec(),
        this.clinicModel
          .countDocuments({ ownerId: new Types.ObjectId(userId) })
          .exec(),
      ]);

      console.log('📊 Entity counts:', {
        organizationCount,
        complexCount,
        clinicCount,
        userId,
      });

      const hasOrganization = organizationCount > 0;
      const hasComplex = complexCount > 0;
      const hasClinic = clinicCount > 0;

      // Determine what the user needs based on their plan
      let needsSetup = false;
      let nextStep = 'dashboard';
      let hasPrimaryEntity = false;

      switch (planType) {
        case 'company':
          // Company plan requires organization as primary entity
          hasPrimaryEntity = hasOrganization;
          if (!hasOrganization) {
            needsSetup = true;
            nextStep = 'setup-company';
          }
          break;

        case 'complex':
          // Complex plan requires complex as primary entity
          hasPrimaryEntity = hasComplex;
          if (!hasComplex) {
            needsSetup = true;
            nextStep = 'setup-complex';
          }
          break;

        case 'clinic':
          // Clinic plan requires clinic as primary entity
          hasPrimaryEntity = hasClinic;
          if (!hasClinic) {
            needsSetup = true;
            nextStep = 'setup-clinic';
          }
          break;

        default:
          this.logger.warn(`Unknown plan type: ${planType}`);
          needsSetup = true;
          nextStep = 'setup-clinic';
      }

      return {
        hasOrganization,
        hasComplex,
        hasClinic,
        planType,
        hasPrimaryEntity,
        needsSetup,
        nextStep,
      };
    } catch (error) {
      this.logger.error(
        `Error checking user entities for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Update user information with session invalidation hooks
   *
   * This method handles user updates and automatically invalidates sessions
   * when critical fields (email, role) are changed.
   *
   * Task 17.1: Add session invalidation to user update operations
   * Requirements: 3.1, 3.2, 3.8
   *
   * @param userId - User ID to update
   * @param updateUserDto - Update data
   * @param adminId - Admin ID performing the update (optional)
   * @returns Updated user
   */
  async updateUser(
    userId: string,
    updateUserDto: UpdateUserDto,
    adminId?: string,
  ): Promise<User> {
    try {
      // Validate userId format
      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException({
          message: ERROR_MESSAGES.INVALID_ID_FORMAT,
          code: 'INVALID_ID_FORMAT',
          details: { userId },
        });
      }

      // Get current user data
      const currentUser = await this.userModel.findById(userId).exec();
      if (!currentUser) {
        throw new NotFoundException({
          message: ERROR_MESSAGES.USER_NOT_FOUND,
          code: 'USER_NOT_FOUND',
        });
      }

      // Track what changed for session invalidation
      const emailChanged =
        updateUserDto.email && updateUserDto.email !== currentUser.email;
      const roleChanged =
        updateUserDto.role && updateUserDto.role !== currentUser.role;
      const oldEmail = currentUser.email;
      const oldRole = currentUser.role;

      // Update user
      const updatedUser = await this.userModel
        .findByIdAndUpdate(
          userId,
          { $set: updateUserDto },
          { new: true, runValidators: true },
        )
        .exec();

      if (!updatedUser) {
        throw new NotFoundException({
          message: ERROR_MESSAGES.USER_NOT_FOUND,
          code: 'USER_NOT_FOUND',
        });
      }

      // Handle email change - Requirement 3.1
      if (emailChanged) {
        this.logger.log(
          `Email changed for user ${userId}: ${oldEmail} -> ${updateUserDto.email}`,
        );

        // Invalidate all user sessions - Requirement 3.1
        await this.sessionService.invalidateUserSessions(
          userId,
          'email_change',
          adminId,
        );

        // Send notification to new email - Requirement 3.8
        const language = updatedUser.preferredLanguage || 'en';
        await this.emailService.sendUsernameChangedNotification(
          updateUserDto.email!,
          oldEmail,
          updatedUser.firstName,
          language,
        );

        // Log session invalidation - Requirement 3.8
        await this.auditService.logSessionInvalidation(
          userId,
          'email_change',
          0, // Token count not tracked in stateless JWT
          adminId,
        );
      }

      // Handle role change - Requirement 3.2
      if (roleChanged) {
        this.logger.log(
          `Role changed for user ${userId}: ${oldRole} -> ${updateUserDto.role}`,
        );

        // Invalidate all user sessions - Requirement 3.2
        await this.sessionService.invalidateUserSessions(
          userId,
          'role_change',
          adminId,
        );

        // Send notification to user - Requirement 3.8
        const language = updatedUser.preferredLanguage || 'en';
        await this.emailService.sendRoleChangedNotification(
          updatedUser.email,
          updatedUser.firstName,
          oldRole,
          updateUserDto.role!,
          language,
        );

        // Log session invalidation - Requirement 3.8
        await this.auditService.logSessionInvalidation(
          userId,
          'role_change',
          0, // Token count not tracked in stateless JWT
          adminId,
        );
      }

      this.logger.log(`User ${userId} updated successfully`);
      return updatedUser;
    } catch (error) {
      this.logger.error(`Error updating user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update user status (activate/deactivate) with self-modification check
   *
   * This method handles user status changes and automatically invalidates sessions
   * when deactivating a user. It prevents users from deactivating their own accounts.
   *
   * Task 4.1: Implement updateUserStatus method
   * Requirements: 3.1 (BZR-n0c4e9f2)
   * Design: Section 3.2.1
   *
   * @param userId - User ID to update status
   * @param updateUserStatusDto - Status update data
   * @param currentUserId - ID of user performing the action
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent string from the request
   * @returns Standardized response with updated user
   */
  async updateUserStatus(
    userId: string,
    updateUserStatusDto: UpdateUserStatusDto,
    currentUserId: string,
    ipAddress: string,
    userAgent: string,
  ) {
    try {
      // Validate not self-modification when deactivating
      if (!updateUserStatusDto.isActive) {
        ValidationUtil.validateNotSelfModification(
          userId,
          currentUserId,
          'deactivate',
        );
      }

      // Validate user exists
      const user = await ValidationUtil.validateEntityExists(
        this.userModel,
        userId,
        ERROR_MESSAGES.USER_NOT_FOUND,
      );

      // Store previous status for audit log
      const previousStatus = user.isActive;

      // Update status
      user.isActive = updateUserStatusDto.isActive;
      await user.save();

      // Invalidate sessions if deactivating
      if (!updateUserStatusDto.isActive) {
        await this.sessionService.invalidateUserSessions(
          userId,
          'user_deactivated',
          currentUserId,
        );

        this.logger.log(`User ${userId} deactivated and sessions invalidated`);
      }

      // Create audit log entry
      await this.auditService.logSessionInvalidation(
        userId,
        updateUserStatusDto.isActive ? 'user_activated' : 'user_deactivated',
        0, // Token count not tracked in stateless JWT
        currentUserId,
      );

      this.logger.log(
        `User ${userId} status updated: ${previousStatus} -> ${updateUserStatusDto.isActive}`,
      );

      // Return standardized response
      return ResponseBuilder.success(
        user,
        updateUserStatusDto.isActive
          ? ERROR_MESSAGES.USER_ACTIVATED
          : ERROR_MESSAGES.USER_DEACTIVATED,
      );
    } catch (error) {
      this.logger.error(`Error updating user status for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Deactivate doctor with appointment transfer
   *
   * This method handles doctor deactivation with optional appointment transfer.
   * It uses database transactions to ensure atomicity and prevents self-modification.
   *
   * Task 4.2: Implement deactivateDoctorWithTransfer method
   * Requirements: 3.3 (BZR-q0d8a9f1)
   * Design: Section 3.2.1
   *
   * @param doctorId - Doctor ID to deactivate
   * @param transferData - Transfer options (transfer, skip, or error)
   * @param currentUserId - ID of user performing the action
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent string from the request
   * @returns Standardized response with deactivation details
   */
  async deactivateDoctorWithTransfer(
    doctorId: string,
    transferData: DeactivateWithTransferDto,
    currentUserId: string,
    ipAddress: string,
    userAgent: string,
  ) {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // Validate not self-modification
      ValidationUtil.validateNotSelfModification(
        doctorId,
        currentUserId,
        'deactivate',
      );

      // Validate doctor exists
      const doctor = await ValidationUtil.validateEntityExists(
        this.userModel,
        doctorId,
        ERROR_MESSAGES.DOCTOR_NOT_FOUND,
      );

      // Check for active appointments
      const activeAppointments = await this.appointmentModel
        .find({
          doctorId: new Types.ObjectId(doctorId),
          status: { $in: ['scheduled', 'confirmed'] },
          appointmentDate: { $gte: new Date() },
        })
        .session(session)
        .exec();

      let transferredCount = 0;
      let rescheduledCount = 0;

      if (activeAppointments.length > 0) {
        if (transferData.transferAppointments && transferData.targetDoctorId) {
          // Validate target doctor
          const targetDoctor = await ValidationUtil.validateEntityExists(
            this.userModel,
            transferData.targetDoctorId,
            ERROR_MESSAGES.DOCTOR_NOT_FOUND,
          );

          ValidationUtil.validateUserActive(targetDoctor);

          // Transfer appointments
          const updateResult = await this.appointmentModel
            .updateMany(
              {
                doctorId: new Types.ObjectId(doctorId),
                status: { $in: ['scheduled', 'confirmed'] },
                appointmentDate: { $gte: new Date() },
              },
              {
                $set: {
                  doctorId: new Types.ObjectId(transferData.targetDoctorId),
                  previousDoctorId: new Types.ObjectId(doctorId),
                  transferredAt: new Date(),
                  transferredBy: new Types.ObjectId(currentUserId),
                },
              },
              { session },
            )
            .exec();

          transferredCount = updateResult.modifiedCount;

          this.logger.log(
            `Transferred ${transferredCount} appointments from doctor ${doctorId} to ${transferData.targetDoctorId}`,
          );

          // TODO: Send notifications to patients about doctor change
          // This will be implemented when notification service is ready
        } else if (transferData.skipTransfer) {
          // Mark appointments for rescheduling (using cancelled status with rescheduling reason)
          const updateResult = await this.appointmentModel
            .updateMany(
              {
                doctorId: new Types.ObjectId(doctorId),
                status: { $in: ['scheduled', 'confirmed'] },
                appointmentDate: { $gte: new Date() },
              },
              {
                $set: {
                  status: 'cancelled',
                  cancellationReason: 'doctor_deactivated',
                  reschedulingReason: 'doctor_deactivated',
                  markedForReschedulingAt: new Date(),
                  markedBy: new Types.ObjectId(currentUserId),
                },
              },
              { session },
            )
            .exec();

          rescheduledCount = updateResult.modifiedCount;

          this.logger.log(
            `Marked ${rescheduledCount} appointments for rescheduling for doctor ${doctorId}`,
          );
        } else {
          throw new BadRequestException({
            message: ERROR_MESSAGES.DOCTOR_HAS_APPOINTMENTS,
            code: 'DOCTOR_HAS_APPOINTMENTS',
            details: { appointmentCount: activeAppointments.length },
          });
        }
      }

      // Deactivate doctor
      doctor.isActive = false;
      (doctor as any).deactivatedAt = new Date();
      (doctor as any).deactivatedBy = new Types.ObjectId(currentUserId);
      await doctor.save({ session });

      // Invalidate sessions
      await this.sessionService.invalidateUserSessions(
        doctorId,
        'user_deactivated',
        currentUserId,
      );

      // Audit log
      await this.auditService.logSessionInvalidation(
        doctorId,
        'doctor_deactivated_with_transfer',
        0, // Token count not tracked in stateless JWT
        currentUserId,
      );

      await session.commitTransaction();

      this.logger.log(
        `Doctor ${doctorId} deactivated successfully. Transferred: ${transferredCount}, Rescheduled: ${rescheduledCount}`,
      );

      return ResponseBuilder.success(
        {
          deactivatedUser: doctor,
          appointmentsTransferred: transferredCount,
          appointmentsRescheduled: rescheduledCount,
          targetDoctorId: transferData.targetDoctorId,
        },
        ERROR_MESSAGES.USER_DEACTIVATED,
      );
    } catch (error) {
      await session.abortTransaction();
      this.logger.error('Failed to deactivate doctor with transfer', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get users for dropdown (only active users)
   *
   * This method returns a list of active users for dropdown/selection purposes.
   * It filters out deactivated users and applies optional filters for role, complex, and clinic.
   *
   * Task 4.3: Implement getUsersForDropdown method
   * Requirements: 3.2 (BZR-q4f3e1b8)
   * Design: Section 3.2.1
   *
   * @param filters - Optional filters (role, complexId, clinicId)
   * @returns Standardized response with active users
   */
  async getUsersForDropdown(filters?: {
    role?: string;
    complexId?: string;
    clinicId?: string;
  }) {
    try {
      // Build query - only active users
      const query: any = { isActive: true };

      // Apply optional filters
      if (filters?.role) {
        query.role = filters.role;
      }
      if (filters?.complexId) {
        query.complexId = new Types.ObjectId(filters.complexId);
      }
      if (filters?.clinicId) {
        query.clinicId = new Types.ObjectId(filters.clinicId);
      }

      // Execute query with sorting
      const users = await this.userModel
        .find(query)
        .select('_id firstName lastName email role complexId clinicId')
        .sort({ firstName: 1, lastName: 1 })
        .lean()
        .exec();

      this.logger.log(
        `Retrieved ${users.length} active users for dropdown with filters: ${JSON.stringify(filters || {})}`,
      );

      return ResponseBuilder.success(users);
    } catch (error) {
      this.logger.error('Error getting users for dropdown:', error);
      throw error;
    }
  }
}
