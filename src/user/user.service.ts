import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../database/schemas/user.schema';
import { Organization } from '../database/schemas/organization.schema';
import { Complex } from '../database/schemas/complex.schema';
import { Clinic } from '../database/schemas/clinic.schema';
import { Subscription } from '../database/schemas/subscription.schema';
import { SubscriptionPlan } from '../database/schemas/subscription-plan.schema';
import { UserEntitiesResponseDto } from './dto/check-user-entities.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SessionService } from '../auth/session.service';
import { EmailService } from '../auth/email.service';
import { AuditService } from '../auth/audit.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Organization.name) private organizationModel: Model<Organization>,
    @InjectModel(Complex.name) private complexModel: Model<Complex>,
    @InjectModel(Clinic.name) private clinicModel: Model<Clinic>,
    @InjectModel(Subscription.name) private subscriptionModel: Model<Subscription>,
    @InjectModel(SubscriptionPlan.name) private subscriptionPlanModel: Model<SubscriptionPlan>,
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
      const user = await this.userModel.findById(userId).populate('subscriptionId').exec();
      console.log('👤 Found user:', user ? `${user.email} (${user.role})` : 'null');
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Get subscription details
      const subscription = await this.subscriptionModel.findById(user.subscriptionId).populate('planId').exec();
      if (!subscription) {
        throw new NotFoundException('User subscription not found');
      }

      const plan = subscription.planId as any; // Populated SubscriptionPlan
      const planType = plan.name; // clinic, complex, company

      // Check existing entities
      const [organizationCount, complexCount, clinicCount] = await Promise.all([
        this.organizationModel.countDocuments({ ownerId: new Types.ObjectId(userId) }).exec(),
        this.complexModel.countDocuments({ ownerId: new Types.ObjectId(userId) }).exec(),
        this.clinicModel.countDocuments({ ownerId: new Types.ObjectId(userId) }).exec(),
      ]);

      console.log('📊 Entity counts:', {
        organizationCount,
        complexCount, 
        clinicCount,
        userId
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
      this.logger.error(`Error checking user entities for user ${userId}:`, error);
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
        throw new BadRequestException(`Invalid userId format: ${userId}`);
      }

      // Get current user data
      const currentUser = await this.userModel.findById(userId).exec();
      if (!currentUser) {
        throw new NotFoundException('User not found');
      }

      // Track what changed for session invalidation
      const emailChanged = updateUserDto.email && updateUserDto.email !== currentUser.email;
      const roleChanged = updateUserDto.role && updateUserDto.role !== currentUser.role;
      const oldEmail = currentUser.email;
      const oldRole = currentUser.role;

      // Update user
      const updatedUser = await this.userModel
        .findByIdAndUpdate(
          userId,
          { $set: updateUserDto },
          { new: true, runValidators: true }
        )
        .exec();

      if (!updatedUser) {
        throw new NotFoundException('User not found after update');
      }

      // Handle email change - Requirement 3.1
      if (emailChanged) {
        this.logger.log(`Email changed for user ${userId}: ${oldEmail} -> ${updateUserDto.email}`);
        
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
        this.logger.log(`Role changed for user ${userId}: ${oldRole} -> ${updateUserDto.role}`);
        
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
}
