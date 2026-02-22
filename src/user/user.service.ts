import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection, RootFilterQuery } from 'mongoose';
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
import { UserRestrictionService } from './user-restriction.service';
import { DoctorDeactivationService } from './doctor-deactivation.service';
import { ValidationUtil } from '../common/utils/validation.util';
import { ResponseBuilder } from '../common/utils/response-builder.util';
import { ERROR_MESSAGES } from '../common/utils/error-messages.constant';

import { GetUsersFilterDto } from './dto/get-users-filter.dto';
import { SortOrder } from '../common/dto/pagination-query.dto';
import { WorkingHoursService } from '../working-hours/working-hours.service';

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
    private readonly userRestrictionService: UserRestrictionService,
    private readonly doctorDeactivationService: DoctorDeactivationService,
    private readonly workingHoursService: WorkingHoursService,
  ) { }

  /**
   * Get paginated list of users with filtering
   *
   * Task 1.1: Implement getUsers method for paginated list with filters
   * Requirements: 4.1, 4.2
   *
   * @param filterDto - Filter and pagination options
   * @param requestingUser - The user making the request
   * @returns Paginated users list
   */
  async getUsers(filterDto: GetUsersFilterDto, requestingUser?: any) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = SortOrder.DESC,
        search,
        role,
        isActive,
        organizationId,
        complexId,
        clinicId,
      } = filterDto;

      let targetSubscriptionId = organizationId; // organizationId here seems to refer to subscription/org scope
      let targetComplexId = complexId;
      let targetClinicId = clinicId;

      // TENANT ISOLATION (ISSUE-011)
      if (requestingUser && requestingUser.role !== 'super_admin') {
        if (requestingUser.subscriptionId) {
          targetSubscriptionId = requestingUser.subscriptionId;
        }
        if (requestingUser.complexId) {
          targetComplexId = requestingUser.complexId;
        }
        if (requestingUser.clinicId) {
          targetClinicId = requestingUser.clinicId;
        }
      }

      const query: RootFilterQuery<User> = {};

      // Apply filters
      if (role) query.role = role;
      if (isActive !== undefined) query.isActive = isActive;
      if (targetSubscriptionId)
        query.subscriptionId = new Types.ObjectId(targetSubscriptionId);
      if (targetComplexId) query.complexId = new Types.ObjectId(targetComplexId);
      if (targetClinicId) query.clinicId = new Types.ObjectId(targetClinicId);

      // Search by name or email
      if (search) {
        query.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ];
      }

      // Execute query with pagination
      const skip = (page - 1) * limit;
      const [users, total] = await Promise.all([
        this.userModel
          .find(query)
          .sort({ [sortBy]: sortOrder === SortOrder.ASC ? 1 : -1 })
          .skip(skip)
          .limit(limit)
          .populate('organizationId', 'name nameAr')
          .populate('complexId', 'name nameAr')
          .populate('clinicId', 'name nameAr')
          .select('-passwordHash -__v')
          .lean()
          .exec(),
        this.userModel.countDocuments(query).exec(),
      ]);

      return {
        users,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error('Error fetching users list:', error);
      throw new BadRequestException({
        message: {
          ar: 'حدث خطأ أثناء جلب قائمة المستخدمين',
          en: 'Error fetching users list',
        },
        code: 'USERS_FETCH_ERROR',
      });
    }
  }

  async checkUserEntities(userId: string, requestingUser?: any): Promise<UserEntitiesResponseDto> {
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

      // TENANT ISOLATION (ISSUE-012)
      if (requestingUser && requestingUser.role !== 'super_admin') {
        if (requestingUser.subscriptionId && user.subscriptionId?.toString() !== requestingUser.subscriptionId) {
          throw new ForbiddenException({
            message: {
              ar: 'ليس لديك صلاحية للوصول إلى هذا المستخدم',
              en: 'You do not have permission to access this user',
            },
            code: 'INSUFFICIENT_PERMISSIONS',
          });
        }
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
      const planType = plan?.name || 'clinic'; // clinic, complex, company

      // Check existing entities and future appointments
      const [organizationCount, complexCount, clinicCount, futureAppointmentsCount] = await Promise.all([
        this.organizationModel
          .countDocuments({ ownerId: new Types.ObjectId(userId) })
          .exec(),
        this.complexModel
          .countDocuments({ ownerId: new Types.ObjectId(userId) })
          .exec(),
        this.clinicModel
          .countDocuments({ ownerId: new Types.ObjectId(userId) })
          .exec(),
        this.appointmentModel
          .countDocuments({
            doctorId: new Types.ObjectId(userId),
            status: { $in: ['scheduled', 'confirmed'] },
            appointmentDate: { $gte: new Date() },
          })
          .exec(),
      ]);

      console.log('📊 Entity and appointment counts:', {
        organizationCount,
        complexCount,
        clinicCount,
        futureAppointmentsCount,
        userId,
      });

      const hasOrganization = organizationCount > 0;
      const hasComplex = complexCount > 0;
      const hasClinic = clinicCount > 0;
      const hasFutureAppointments = futureAppointmentsCount > 0;

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
        hasFutureAppointments,
        futureAppointmentsCount,
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
      // Use ValidationUtil for consistent validation
      const currentUser = await ValidationUtil.validateEntityExists(
        this.userModel,
        userId,
        ERROR_MESSAGES.USER_NOT_FOUND,
      );

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
   * Task 9.2: Add validation to user status endpoints
   * Requirements: 3.1 (BZR-n0c4e9f2), 8.1, 8.3, 8.5
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
      // Task 9.2: Check UserRestrictionService before allowing status change
      // Requirement 8.1, 8.3: Prevent self-deactivation
      if (!updateUserStatusDto.isActive) {
        this.userRestrictionService.canDeactivateUser(currentUserId, userId);

        // Rule: User has no future appointments
        const futureAppointmentsCount = await this.appointmentModel
          .countDocuments({
            doctorId: new Types.ObjectId(userId),
            status: { $in: ['scheduled', 'confirmed'] },
            appointmentDate: { $gte: new Date() },
          })
          .exec();

        if (futureAppointmentsCount > 0) {
          throw new BadRequestException({
            message: {
              ar: 'لا يمكن إلغاء تفعيل المستخدم لأن لديه مواعيد مستقبلية. يرجى نقل المواعيد أو إلغاؤها أولاً',
              en: 'Cannot deactivate user because they have future appointments. Please transfer or cancel appointments first',
            },
            code: 'USER_HAS_FUTURE_APPOINTMENTS',
            details: { appointmentCount: futureAppointmentsCount },
          });
        }
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

      // Task 9.2: Log failed self-action attempts in audit trail
      // Requirement 8.5: Audit logging for status changes
      await this.auditService.logUserStatusChange(
        userId,
        updateUserStatusDto.isActive,
        currentUserId,
        ipAddress,
        userAgent,
      );

      // Also log session invalidation if deactivating (for backward compatibility)
      if (!updateUserStatusDto.isActive) {
        await this.auditService.logSessionInvalidation(
          userId,
          'user_deactivated',
          0, // Token count not tracked in stateless JWT
          currentUserId,
        );
      }

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
      // Task 9.2: Return 403 Forbidden with bilingual error if self-action
      // The UserRestrictionService already throws ForbiddenException with bilingual message
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
                  transferredFrom: new Types.ObjectId(doctorId),
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
                  rescheduledReason: 'doctor_deactivated',
                  rescheduledAt: new Date(),
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

      // Audit log for doctor deactivation with transfer details
      await this.auditService.logDoctorDeactivated(
        doctorId,
        currentUserId,
        ipAddress,
        userAgent,
        {
          appointmentsTransferred: transferredCount,
          appointmentsRescheduled: rescheduledCount,
          targetDoctorId: transferData.targetDoctorId,
        },
      );

      // Log appointment transfer if any appointments were transferred
      if (transferredCount > 0 && transferData.targetDoctorId) {
        await this.auditService.logAppointmentsTransferred(
          doctorId,
          transferData.targetDoctorId,
          transferredCount,
          currentUserId,
          ipAddress,
          userAgent,
        );
      }

      // Also log session invalidation (for backward compatibility)
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
    includeDeactivated?: boolean;
  }) {
    try {
      // Build query
      const query: RootFilterQuery<User> = {};

      if (!filters?.includeDeactivated) {
        query.isActive = true;
      }

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
        `Retrieved ${users.length} users for dropdown with filters: ${JSON.stringify(filters || {})}`,
      );

      return ResponseBuilder.success(users);
    } catch (error) {
      this.logger.error('Error getting users for dropdown:', error);
      throw error;
    }
  }

  /**
   * Delete user with self-modification check
   *
   * This method handles user deletion with validation to prevent self-deletion
   * and ensure the user is deactivated before deletion.
   *
   * Task 9.3: Add validation to user delete endpoint
   * Requirements: 9.1, 9.3, 9.4
   * Design: Section 2.1 - User Restriction Service
   *
   * Business Rules:
   * - BZR-m3d5a8b7: Users cannot delete their own account
   * - Users must be deactivated before deletion
   *
   * @param userId - User ID to delete
   * @param currentUserId - ID of user performing the action
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent string from the request
   * @returns Standardized response with success message
   */
  async deleteUser(
    userId: string,
    currentUserId: string,
    ipAddress: string,
    userAgent: string,
  ) {
    try {
      // Task 9.3: Check UserRestrictionService before allowing deletion
      // Requirement 9.1, 9.3: Prevent self-deletion
      this.userRestrictionService.canDeleteUser(currentUserId, userId);

      // Validate user exists
      const user = await ValidationUtil.validateEntityExists(
        this.userModel,
        userId,
        ERROR_MESSAGES.USER_NOT_FOUND,
      );

      // Task 9.3: Check that user is deactivated before deletion
      // Requirement 9.4: Deactivation before deletion
      if (user.isActive) {
        this.logger.warn(
          `Attempted to delete active user ${userId}. User must be deactivated first.`,
        );
        throw new BadRequestException({
          message: {
            ar: 'يجب إلغاء تفعيل المستخدم قبل الحذف',
            en: 'User must be deactivated before deletion',
          },
          code: 'USER_MUST_BE_DEACTIVATED',
        });
      }

      // Delete user
      await this.userModel.findByIdAndDelete(userId).exec();

      // Task 9.3: Log failed self-action attempts in audit trail
      // Requirement 9.3: Audit logging for deletion
      await this.auditService.logUserDeleted(
        userId,
        currentUserId,
        ipAddress,
        userAgent,
      );

      this.logger.log(
        `User ${userId} deleted successfully by ${currentUserId}`,
      );

      // Return standardized response
      return ResponseBuilder.success(
        { deletedUserId: userId },
        ERROR_MESSAGES.USER_DELETED,
      );
    } catch (error) {
      // Task 9.3: Return 403 Forbidden with bilingual error if self-action
      // The UserRestrictionService already throws ForbiddenException with bilingual message
      this.logger.error(`Error deleting user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Transfer appointments from one doctor to another
   * Task 10.3: Create appointment transfer endpoint
   * Requirements: 7.2, 7.3, 7.4, 7.6
   *
   * This method delegates to DoctorDeactivationService.transferAppointments()
   * to handle the actual transfer logic, including:
   * - Validating target doctor exists and is active
   * - Updating appointment records with transfer details
   * - Sending email notifications to affected patients
   * - Logging transfer details in audit trail
   *
   * @param fromDoctorId - Source doctor ID
   * @param toDoctorId - Target doctor ID
   * @param appointmentIds - Array of appointment IDs to transfer
   * @param actorId - ID of the user performing the transfer
   * @returns Transfer result with success/failure counts
   */
  async transferAppointments(
    fromDoctorId: string,
    toDoctorId: string,
    appointmentIds: string[],
    actorId: string,
  ) {
    try {
      this.logger.log(
        `Transferring ${appointmentIds.length} appointments from doctor ${fromDoctorId} to ${toDoctorId}`,
      );

      // Validate source doctor exists
      const sourceDoctor = await this.userModel.findById(fromDoctorId).exec();
      if (!sourceDoctor) {
        throw new NotFoundException({
          message: {
            ar: 'الطبيب المصدر غير موجود',
            en: 'Source doctor not found',
          },
          code: 'SOURCE_DOCTOR_NOT_FOUND',
        });
      }

      // Call DoctorDeactivationService to handle the transfer
      const result = await this.doctorDeactivationService.transferAppointments(
        fromDoctorId,
        toDoctorId,
        appointmentIds,
        actorId,
      );

      this.logger.log(
        `Transfer complete: ${result.transferred} succeeded, ${result.failed} failed`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Error transferring appointments from ${fromDoctorId} to ${toDoctorId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Find user by ID
   * Helper method to retrieve user details
   *
   * @param userId - User ID
   * @returns User document or null if not found
   */
  async findById(userId: string): Promise<User | null> {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        return null;
      }

      return await this.userModel.findById(userId).exec();
    } catch (error) {
      this.logger.error(`Error finding user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Get user details by ID with populated entities
   *
   * This method retrieves user details with populated related entities and excludes sensitive fields.
   * It is used by the GET /users/:id endpoint to provide comprehensive user information.
   *
   * Task 2: Enhance UserService with getUserDetailById method
   * Requirements: 4.4, 4.5, 5.1
   * Design: Section 3.2
   *
   * @param userId - User ID (MongoDB ObjectId)
   * @param requestingUser - The user making the request
   * @returns User document with populated entities
   */
  async getUserDetailById(userId: string, requestingUser?: any): Promise<User> {
    try {
      // Validate ObjectId format
      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException({
          message: {
            ar: 'معرف المستخدم غير صالح',
            en: 'Invalid user ID format',
          },
          code: 'INVALID_USER_ID',
        });
      }

      // Query user with population and field exclusion
      const [user, workingHours] = await Promise.all([
        this.userModel
          .findById(userId)
          .select(
            '-passwordHash -passwordResetToken -emailVerificationToken -__v',
          )
          .populate('subscriptionId', 'planType status')
          .populate('organizationId', 'name nameAr')
          .populate('complexId', 'name nameAr')
          .populate('clinicId', 'name nameAr')
          .exec(),
        this.workingHoursService.getWorkingHours('user', userId),
      ]);

      // Check if user exists
      if (!user) {
        throw new NotFoundException({
          message: {
            ar: 'المستخدم غير موجود',
            en: 'User not found',
          },
          code: 'USER_NOT_FOUND',
        });
      }

      // TENANT ISOLATION (ISSUE-012)
      if (requestingUser && requestingUser.role !== 'super_admin') {
        if (requestingUser.subscriptionId && user.subscriptionId?.toString() !== requestingUser.subscriptionId) {
          throw new ForbiddenException({
            message: {
              ar: 'ليس لديك صلاحية للوصول إلى هذا المستخدم',
              en: 'You do not have permission to access this user',
            },
            code: 'INSUFFICIENT_PERMISSIONS',
          });
        }
      }

      // Attach working hours to the user object (temporarily for the controller to use)
      const userWithWH = user.toObject();
      userWithWH.workingHours = workingHours;

      this.logger.log(`User ${userId} details retrieved successfully`);
      return userWithWH as any;
    } catch (error) {
      // Re-throw HTTP exceptions
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      // Log and throw internal server error
      this.logger.error(`Error retrieving user ${userId}:`, error);
      throw new BadRequestException({
        message: {
          ar: 'حدث خطأ أثناء جلب بيانات المستخدم',
          en: 'Error retrieving user data',
        },
        code: 'USER_RETRIEVAL_ERROR',
      });
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string) {
    try {
      const user = await this.userModel
        .findById(userId)
        .select('preferences preferredLanguage')
        .exec();

      if (!user) {
        throw new NotFoundException({
          message: ERROR_MESSAGES.USER_NOT_FOUND,
          code: 'USER_NOT_FOUND',
        });
      }

      // Return preferences with defaults
      const preferences: any = user.preferences || {};
      return {
        language: preferences.language || user.preferredLanguage || 'en',
        theme: preferences.theme || 'light',
        notifications: {
          email: preferences.notifications?.email ?? true,
          sms: preferences.notifications?.sms ?? false,
          push: preferences.notifications?.push ?? true,
          appointmentReminders:
            preferences.notifications?.appointmentReminders ?? true,
          systemUpdates: preferences.notifications?.systemUpdates ?? false,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Error retrieving preferences for user ${userId}:`,
        error,
      );
      throw new BadRequestException({
        message: {
          ar: 'حدث خطأ أثناء جلب التفضيلات',
          en: 'Error retrieving preferences',
        },
        code: 'PREFERENCES_RETRIEVAL_ERROR',
      });
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId: string, preferencesDto: any) {
    try {
      const user = await this.userModel.findById(userId).exec();

      if (!user) {
        throw new NotFoundException({
          message: ERROR_MESSAGES.USER_NOT_FOUND,
          code: 'USER_NOT_FOUND',
        });
      }

      // Initialize preferences if not exists
      if (!user.preferences) {
        user.preferences = {} as any;
      }

      const preferences: any = user.preferences;

      // Update language
      if (preferencesDto.language) {
        preferences.language = preferencesDto.language;
        user.preferredLanguage = preferencesDto.language; // Keep in sync
      }

      // Update theme
      if (preferencesDto.theme) {
        preferences.theme = preferencesDto.theme;
      }

      // Update notifications
      if (preferencesDto.notifications) {
        if (!preferences.notifications) {
          preferences.notifications = {};
        }
        Object.assign(preferences.notifications, preferencesDto.notifications);
      }

      user.markModified('preferences');
      await user.save();

      this.logger.log(`Preferences updated for user ${userId}`);

      return ResponseBuilder.success(user.preferences, {
        ar: 'تم تحديث التفضيلات بنجاح',
        en: 'Preferences updated successfully',
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Error updating preferences for user ${userId}:`,
        error,
      );
      throw new BadRequestException({
        message: {
          ar: 'حدث خطأ أثناء تحديث التفضيلات',
          en: 'Error updating preferences',
        },
        code: 'PREFERENCES_UPDATE_ERROR',
      });
    }
  }
}
