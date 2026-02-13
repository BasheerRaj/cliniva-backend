import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Types, Model } from 'mongoose';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import {
  ValidateOnboardingDto,
  OnboardingProgressDto,
} from './dto/validate-onboarding.dto';

// Specialized Services
import { OnboardingValidationService } from './services/onboarding-validation.service';
import { OnboardingProgressService } from './services/onboarding-progress.service';
import { OnboardingPlanLimitService } from './services/onboarding-plan-limit.service';
import { OnboardingSkipLogicService } from './services/onboarding-skip-logic.service';
import { OnboardingWorkingHoursService } from './services/onboarding-working-hours.service';
import { OnboardingEntityFactoryService } from './services/onboarding-entity-factory.service';

// Legacy Services (still needed for some operations)
import { SubscriptionService } from '../subscription/subscription.service';
import { OrganizationService } from '../organization/organization.service';
import { ComplexService } from '../complex/complex.service';
import { ClinicService } from '../clinic/clinic.service';
import { DepartmentService } from '../department/department.service';
import { ServiceService } from '../service/service.service';
import { WorkingHoursService } from '../working-hours/working-hours.service';
import { WorkingHoursValidationService } from '../working-hours/services/working-hours-validation.service';
import { ContactService } from '../contact/contact.service';
import { DynamicInfoService } from '../dynamic-info/dynamic-info.service';
import { UserAccessService } from '../user-access/user-access.service';
import { UserRole } from '../common/enums/user-role.enum';
import { UserService } from '../user/user.service';

// Schemas
import { User } from '../database/schemas/user.schema';
import { SubscriptionPlan } from '../database/schemas/subscription-plan.schema';

// Utilities
import { ValidationUtil } from '../common/utils/validation.util';
import { EntityRelationshipUtil } from '../common/utils/entity-relationship.util';
import { PlanConfigUtil } from '../common/utils/plan-config.util';
import { DataTransformerUtil } from '../common/utils/data-transformer.util';

// Step DTOs
import {
  OrganizationOverviewDto,
  OrganizationContactDto,
  OrganizationLegalDto,
  ComplexOverviewDto,
  ComplexContactDto,
  ComplexLegalInfoDto,
  ComplexWorkingHoursDto,
  ClinicOverviewDto,
  ClinicContactDto,
  ClinicLegalInfoDto,
  ClinicWorkingHoursDto,
  OnboardingStepProgressDto,
  OnboardingStepType,
  StepSaveResponseDto,
} from './dto';

// Interfaces
import { EntityResult } from './interfaces/entity-result.interface';
import { StepProgress } from './interfaces/step-progress.interface';

export interface OnboardingResult {
  success: boolean;
  userId: string;
  subscriptionId: string;
  entities: {
    organization?: any;
    complexes?: any[];
    departments?: any[];
    clinics?: any[];
    services?: any[];
  };
  errors?: string[];
}

/**
 * OnboardingService - Orchestrator for onboarding flow
 *
 * This service coordinates the onboarding process by delegating to specialized services:
 * - OnboardingValidationService: All validation logic
 * - OnboardingProgressService: Progress tracking and step management
 * - OnboardingPlanLimitService: Plan limit enforcement
 * - OnboardingSkipLogicService: Skip logic implementation
 * - OnboardingWorkingHoursService: Working hours inheritance
 * - OnboardingEntityFactoryService: Unified entity creation
 *
 * Responsibilities:
 * - Coordinate onboarding flow
 * - Manage database transactions
 * - Delegate to specialized services
 * - Handle backward compatibility
 */
@Injectable()
export class OnboardingService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('SubscriptionPlan')
    private readonly subscriptionPlanModel: Model<SubscriptionPlan>,

    // Specialized onboarding services
    private readonly validationService: OnboardingValidationService,
    private readonly progressService: OnboardingProgressService,
    private readonly planLimitService: OnboardingPlanLimitService,
    private readonly skipLogicService: OnboardingSkipLogicService,
    private readonly workingHoursService: OnboardingWorkingHoursService,
    private readonly entityFactoryService: OnboardingEntityFactoryService,

    // Legacy services (still needed for some operations)
    private readonly subscriptionService: SubscriptionService,
    private readonly organizationService: OrganizationService,
    private readonly complexService: ComplexService,
    private readonly clinicService: ClinicService,
    private readonly departmentService: DepartmentService,
    private readonly serviceService: ServiceService,
    private readonly legacyWorkingHoursService: WorkingHoursService,
    private readonly workingHoursValidationService: WorkingHoursValidationService,
    private readonly contactService: ContactService,
    private readonly dynamicInfoService: DynamicInfoService,
    private readonly userAccessService: UserAccessService,
    private readonly userService: UserService,
  ) {}

  /**
   * Complete onboarding process
   *
   * This method orchestrates the complete onboarding flow by:
   * 1. Validating onboarding data (ValidationService)
   * 2. Checking plan limits (PlanLimitService)
   * 3. Creating entities (EntityFactoryService)
   * 4. Setting up user access
   * 5. Tracking progress (ProgressService)
   *
   * @param onboardingDto - Complete onboarding data
   * @returns OnboardingResult with created entities
   */
  async completeOnboarding(
    onboardingDto: CompleteOnboardingDto,
  ): Promise<OnboardingResult> {
    const session = await this.connection.startSession();

    try {
      session.startTransaction();

      // Step 1: Validate onboarding data using ValidationService
      const validation =
        await this.validationService.validateOnboarding(onboardingDto);
      if (!validation.isValid) {
        throw new BadRequestException({
          message: {
            ar: 'فشل التحقق من البيانات',
            en: 'Validation failed',
          },
          errors: validation.errors,
        });
      }

      // Step 2: Find or get existing user
      const user = await this.findUserByEmail(onboardingDto.userData.email);
      if (!user) {
        throw new BadRequestException({
          message: {
            ar: 'المستخدم غير موجود. يرجى إنشاء حساب أولاً',
            en: 'User not found. Please create an account first.',
          },
        });
      }
      const userId = (user._id as any).toString();

      // Step 3: Resolve plan ID from plan type
      const actualPlanId = await this.resolvePlanId(
        onboardingDto.subscriptionData.planType,
        onboardingDto.subscriptionData.planId,
      );

      // Step 4: Check plan limits using PlanLimitService
      const planType = onboardingDto.subscriptionData.planType;
      const entityType = this.getEntityTypeForPlan(planType);

      // Note: For new subscriptions, we skip limit check as there are no existing entities
      // Limit checks are enforced during entity creation in EntityFactoryService

      // Step 5: Create subscription
      const subscription = await this.subscriptionService.createSubscription({
        userId,
        subscriptionPlanId: actualPlanId,
        planType: onboardingDto.subscriptionData.planType,
      });
      const subscriptionId =
        (subscription as any).id || (subscription as any)._id?.toString() || '';

      // Step 6: Create entities using EntityFactoryService
      const entityResult =
        await this.entityFactoryService.createEntitiesForPlan(
          planType as 'company' | 'complex' | 'clinic',
          subscriptionId,
          onboardingDto,
          userId,
        );

      // Step 7: Setup user access permissions
      await this.setupUserAccess(userId, planType, entityResult);

      // Step 8: Update progress using ProgressService
      await this.progressService.markStepComplete(
        userId,
        'onboarding-complete',
      );

      await session.commitTransaction();

      return {
        success: true,
        userId,
        subscriptionId,
        entities: {
          organization: entityResult.organization,
          complexes: entityResult.complexes || [],
          departments: entityResult.departments || [],
          clinics: entityResult.clinics || [],
          services: entityResult.services || [],
        },
      };
    } catch (error) {
      await session.abortTransaction();

      // Re-throw BadRequestException as-is
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException({
        message: {
          ar: 'فشل إكمال التسجيل',
          en: 'Onboarding failed',
        },
        details: error.message,
      });
    } finally {
      await session.endSession();
    }
  }

  /**
   * Get entity type for plan type
   * Helper method to determine which entity type to check limits for
   */
  private getEntityTypeForPlan(
    planType: string,
  ): 'organization' | 'complex' | 'clinic' {
    switch (planType.toLowerCase()) {
      case 'company':
        return 'organization';
      case 'complex':
        return 'complex';
      case 'clinic':
        return 'clinic';
      default:
        return 'clinic';
    }
  }

  private async findUserByEmail(email: string): Promise<User | null> {
    return await this.userModel.findOne({ email: email.toLowerCase() });
  }

  /**
   * Resolve plan ID from plan type
   * Helper method to find subscription plan by type or validate existing ID
   */
  private async resolvePlanId(
    planType: string,
    planId: string,
  ): Promise<string> {
    // If planId is already a valid ObjectId, return it
    if (Types.ObjectId.isValid(planId) && planId.length === 24) {
      return planId;
    }

    // Otherwise, find plan by type name
    const plan = await this.subscriptionPlanModel.findOne({
      name: planType.toLowerCase(),
    });
    if (!plan) {
      throw new BadRequestException({
        message: {
          ar: `خطة الاشتراك غير موجودة لنوع: ${planType}`,
          en: `Subscription plan not found for type: ${planType}`,
        },
      });
    }

    return (plan._id as any).toString();
  }

  // ============================================================================
  // LEGACY METHODS - Backward Compatibility
  // ============================================================================
  // The following methods are kept for backward compatibility with existing
  // step-by-step onboarding flow. These methods will be gradually migrated
  // to use the new specialized services in future iterations.
  // ============================================================================

  /**
   * Validate onboarding data
   * Delegates to OnboardingValidationService
   *
   * @deprecated Use validationService.validateOnboarding() directly
   */
  async validateOnboardingData(
    onboardingDto: ValidateOnboardingDto,
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const result =
      await this.validationService.validateOnboarding(onboardingDto);

    // Convert ValidationError[] to string[] for backward compatibility
    return {
      isValid: result.isValid,
      errors: result.errors.map((err) =>
        typeof err === 'string'
          ? err
          : err.message?.en || err.message?.ar || 'Validation error',
      ),
    };
  }

  /**
   * Setup user access permissions
   * Creates user access records for all created entities
   */
  private async setupUserAccess(
    userId: string,
    planType: string,
    entityResult: EntityResult,
  ): Promise<void> {
    const entityMappings = this.buildEntityMappingsWithHierarchy(entityResult);

    for (const mapping of entityMappings) {
      await this.userAccessService.createUserAccessLegacy(
        userId,
        mapping.type,
        mapping.id,
        UserRole.OWNER,
      );
    }
  }

  /**
   * Build entity mappings with hierarchy
   * Helper method to create entity mappings for user access
   */
  private buildEntityMappingsWithHierarchy(
    entityResult: EntityResult,
  ): Array<{ type: string; id: string; name?: string }> {
    const mappings: Array<{ type: string; id: string; name?: string }> = [];

    if (entityResult.organization) {
      mappings.push({
        type: 'organization',
        id:
          entityResult.organization.id ||
          entityResult.organization._id?.toString() ||
          '',
        name: entityResult.organization.name,
      });
    }

    if (entityResult.complexes && Array.isArray(entityResult.complexes)) {
      entityResult.complexes.forEach((complex: any) => {
        mappings.push({
          type: 'complex',
          id: complex.id || complex._id?.toString() || '',
          name: complex.name,
        });
      });
    }

    if (entityResult.clinics && Array.isArray(entityResult.clinics)) {
      entityResult.clinics.forEach((clinic: any) => {
        mappings.push({
          type: 'clinic',
          id: clinic.id || clinic._id?.toString() || '',
          name: clinic.name,
        });
      });
    }

    return mappings;
  }

  /**
   * Create departments for complex
   * Helper method to link departments to a complex
   */
  private async createDepartmentsForComplex(
    complexId: string,
    departmentIds: string[],
  ): Promise<void> {
    for (const departmentId of departmentIds) {
      await this.departmentService.createComplexDepartment(
        complexId,
        departmentId,
      );
    }
  }

  private getDefaultPermissionsForPlan(planType: string): string[] {
    switch (planType.toLowerCase()) {
      case 'company':
        return ['read', 'write', 'delete', 'admin'];
      case 'complex':
        return ['read', 'write'];
      case 'clinic':
        return ['read', 'write'];
      default:
        return ['read'];
    }
  }

  async getOnboardingProgress(
    userId: string,
  ): Promise<OnboardingProgressDto | null> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      return null;
    }

    // Get subscription information
    let subscription: any = null;
    let plan: any = null;

    if (user.subscriptionId) {
      subscription =
        await this.subscriptionService.getSubscriptionByUser(userId);
      if (subscription) {
        plan = await this.subscriptionService.getSubscriptionPlan(
          subscription.planId.toString(),
        );
      }
    }

    return {
      userId: (user._id as any).toString(),
      planType: (plan?.name as 'clinic' | 'complex' | 'company') || 'clinic',
      completedSteps: user.onboardingProgress || [],
      hasSubscription: !!subscription,
      isComplete: user.onboardingComplete || false,
    } as any;
  }

  async getOnboardingStatus(userId: string): Promise<any> {
    try {
      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Check if user has subscription
      let hasSubscription = false;
      let subscriptionId: string | null = null;
      let planType: string | null = null;

      if (user.subscriptionId) {
        hasSubscription = true;
        subscriptionId = user.subscriptionId.toString();

        try {
          const subscription =
            await this.subscriptionService.getSubscriptionByUser(userId);
          if (subscription) {
            // Check if planId is populated (object) or just an ID
            if (subscription.planId) {
              if (typeof subscription.planId === 'object' && 'name' in subscription.planId) {
                // planId is populated with SubscriptionPlan document
                planType = (subscription.planId as any).name || null;
              } else {
                // planId is just an ObjectId, need to fetch the plan
                const plan = await this.subscriptionService.getSubscriptionPlan(
                  subscription.planId.toString(),
                );
                planType = plan?.name || null;
              }
            }
          }
        } catch (error) {
          // Ignore subscription lookup errors for now
          console.error('Error fetching subscription plan:', error.message);
        }
      }

      // Determine current step
      let currentStep = 'plan_selection';
      let nextAction = 'Select a subscription plan';

      if (hasSubscription) {
        currentStep = 'organization_setup';
        nextAction = 'Complete organization setup';
      }

      if (user.setupComplete) {
        currentStep = 'completed';
        nextAction = 'Access dashboard';
      }

      return {
        userId: (user._id as any).toString(),
        hasSubscription,
        subscriptionId,
        planType,
        onboardingProgress: user.onboardingProgress || [],
        setupComplete: user.setupComplete || false,
        onboardingComplete: user.onboardingComplete || false,
        currentStep,
        nextAction,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to get onboarding status: ${error.message}`,
      );
    }
  }

  async validateOrganizationName(name: string): Promise<boolean> {
    if (!name || name.trim().length === 0) {
      throw new BadRequestException('Organization name is required');
    }

    try {
      const trimmedName = name.trim();

      // Basic validation - check if name is reasonable length and format
      if (trimmedName.length < 2) {
        return false; // Too short
      }

      if (trimmedName.length > 100) {
        return false; // Too long
      }

      // Check if organization name already exists
      const existingOrg =
        await this.organizationService.getOrganizationByName(trimmedName);

      // Return true if name is available (not taken)
      return !existingOrg;
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to validate organization name',
      );
    }
  }

  async validateEmail(email: string): Promise<boolean> {
    if (!email || email.trim().length === 0) {
      throw new BadRequestException('Email is required');
    }

    try {
      const trimmedEmail = email.trim().toLowerCase();

      // Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        return false; // Invalid email format
      }

      if (trimmedEmail.length < 5) {
        return false; // Too short
      }

      if (trimmedEmail.length > 254) {
        return false; // Too long (RFC 5321 limit)
      }

      // Check if email already exists in users
      const existingUser = await this.userModel
        .findOne({ email: trimmedEmail })
        .exec();
      if (existingUser) {
        return false; // Email is already taken by a user
      }

      // Check if email already exists in organizations
      const existingOrg = await this.organizationService.getAllOrganizations();
      const orgWithEmail = existingOrg.find(
        (org) => org.email?.toLowerCase() === trimmedEmail,
      );
      if (orgWithEmail) {
        return false; // Email is already taken by an organization
      }

      // Return true if email is available (not taken)
      return true;
    } catch (error) {
      throw new InternalServerErrorException('Failed to validate email');
    }
  }

  async validateVatNumber(vatNumber: string): Promise<boolean> {
    if (!vatNumber || vatNumber.trim().length === 0) {
      throw new BadRequestException('VAT number is required');
    }

    try {
      const trimmedVat = vatNumber.trim().replace(/\s+/g, ''); // Remove spaces

      // Basic VAT number format validation - allow 10-15 digits for flexibility
      const vatRegex = /^[0-9]{10,15}$/;
      if (!vatRegex.test(trimmedVat)) {
        return false; // Invalid VAT format - must be 10-15 digits
      }

      // Check if VAT number already exists in organizations
      const existingOrgs = await this.organizationService.getAllOrganizations();
      const orgWithVat = existingOrgs.find(
        (org) => org.vatNumber === trimmedVat,
      );
      if (orgWithVat) {
        return false; // VAT number is already in use
      }

      // Return true if VAT number is valid and available
      return true;
    } catch (error) {
      throw new InternalServerErrorException('Failed to validate VAT number');
    }
  }

  async validateCrNumber(crNumber: string): Promise<boolean> {
    if (!crNumber || crNumber.trim().length === 0) {
      throw new BadRequestException('CR number is required');
    }

    try {
      const trimmedCr = crNumber.trim().replace(/\s+/g, ''); // Remove spaces

      // Basic CR number format validation - allow 7-12 digits for flexibility
      const crRegex = /^[0-9]{7,12}$/;
      if (!crRegex.test(trimmedCr)) {
        return false; // Invalid CR format - must be 7-12 digits
      }

      // Check if CR number already exists in organizations
      const existingOrgs = await this.organizationService.getAllOrganizations();
      const orgWithCr = existingOrgs.find((org) => org.crNumber === trimmedCr);
      if (orgWithCr) {
        return false; // CR number is already in use
      }

      // Return true if CR number is valid and available
      return true;
    } catch (error) {
      throw new InternalServerErrorException('Failed to validate CR number');
    }
  }

  async validateComplexName(
    name: string,
    organizationId?: string,
  ): Promise<boolean> {
    if (!name || name.trim().length === 0) {
      throw new BadRequestException('Complex name is required');
    }

    try {
      const trimmedName = name.trim().toLowerCase();

      if (trimmedName.length < 2) {
        return false; // Name too short
      }

      // Check if complex name already exists
      // For now, we'll implement a simple check - you can expand this based on your complex data model
      // This is a placeholder implementation that assumes complex uniqueness

      // If organizationId is provided, check within that organization scope
      if (organizationId) {
        // Check for complex name uniqueness within the organization
        // This would need to be implemented based on your complex-organization relationship
        console.log(
          `Validating complex name "${trimmedName}" within organization "${organizationId}"`,
        );
      }

      // For now, return true (available) - implement actual logic based on your data model
      return true;
    } catch (error) {
      throw new InternalServerErrorException('Failed to validate complex name');
    }
  }

  async validateClinicName(
    name: string,
    complexId?: string,
    organizationId?: string,
  ): Promise<boolean> {
    if (!name || name.trim().length === 0) {
      throw new BadRequestException('Clinic name is required');
    }

    try {
      const trimmedName = name.trim().toLowerCase();

      if (trimmedName.length < 2) {
        return false; // Name too short
      }

      // Check if clinic name already exists
      // For now, we'll implement a simple check - you can expand this based on your clinic data model
      // This is a placeholder implementation that assumes clinic uniqueness

      // If complexId is provided, check within that complex scope
      if (complexId) {
        console.log(
          `Validating clinic name "${trimmedName}" within complex "${complexId}"`,
        );
      }

      // If organizationId is provided, check within that organization scope
      if (organizationId) {
        console.log(
          `Validating clinic name "${trimmedName}" within organization "${organizationId}"`,
        );
      }

      // For now, return true (available) - implement actual logic based on your data model
      return true;
    } catch (error) {
      throw new InternalServerErrorException('Failed to validate clinic name');
    }
  }

  // ======== STEP-BY-STEP ONBOARDING METHODS ========

  private stepProgressCache = new Map<string, StepProgress>();

  async getStepProgress(userId: string): Promise<OnboardingStepProgressDto> {
    try {
      // Get user and their subscription
      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Get subscription to determine plan type
      const subscription = await this.subscriptionService.getSubscriptionByUser(userId);
      let planType: 'company' | 'complex' | 'clinic' = 'clinic';
      
      if (subscription) {
        // Check if planId is populated (object) or just an ID
        if (subscription.planId) {
          if (typeof subscription.planId === 'object' && 'name' in subscription.planId) {
            // planId is populated with SubscriptionPlan document
            const planName = (subscription.planId as any).name?.toLowerCase();
            if (planName === 'company') planType = 'company';
            else if (planName === 'complex') planType = 'complex';
            else planType = 'clinic';
          } else {
            // planId is just an ObjectId, need to fetch the plan
            const plan = await this.subscriptionPlanModel.findById(
              subscription.planId,
            );
            if (plan) {
              const planName = plan.name?.toLowerCase();
              if (planName === 'company') planType = 'company';
              else if (planName === 'complex') planType = 'complex';
              else planType = 'clinic';
            }
          }
        }
      }

      // Determine total steps based on plan type
      const stepCounts = {
        company: 9,  // org(3) + complex(4) + clinic(2)
        complex: 6,  // complex(4) + clinic(2)
        clinic: 3,   // clinic(3)
      };

      // Get completed steps from user's onboardingProgress
      const completedSteps = user.onboardingProgress || [];
      
      // Determine current step based on completed steps and plan type
      let currentStep = 'organization-overview';
      if (planType === 'company') {
        if (!completedSteps.includes('organization-overview')) {
          currentStep = 'organization-overview';
        } else if (!completedSteps.includes('organization-contact')) {
          currentStep = 'organization-contact';
        } else if (!completedSteps.includes('organization-legal')) {
          currentStep = 'organization-legal';
        } else if (!completedSteps.includes('complex-overview')) {
          currentStep = 'complex-overview';
        } else if (!completedSteps.includes('complex-contact')) {
          currentStep = 'complex-contact';
        } else if (!completedSteps.includes('complex-legal')) {
          currentStep = 'complex-legal';
        } else if (!completedSteps.includes('complex-schedule')) {
          currentStep = 'complex-schedule';
        } else if (!completedSteps.includes('clinic-overview')) {
          currentStep = 'clinic-overview';
        } else if (!completedSteps.includes('clinic-contact')) {
          currentStep = 'clinic-contact';
        } else if (!completedSteps.includes('clinic-legal')) {
          currentStep = 'clinic-legal';
        } else if (!completedSteps.includes('clinic-schedule')) {
          currentStep = 'clinic-schedule';
        } else {
          currentStep = 'completed';
        }
      } else if (planType === 'complex') {
        if (!completedSteps.includes('complex-overview')) {
          currentStep = 'complex-overview';
        } else if (!completedSteps.includes('complex-contact')) {
          currentStep = 'complex-contact';
        } else if (!completedSteps.includes('complex-legal')) {
          currentStep = 'complex-legal';
        } else if (!completedSteps.includes('complex-schedule')) {
          currentStep = 'complex-schedule';
        } else if (!completedSteps.includes('clinic-overview')) {
          currentStep = 'clinic-overview';
        } else if (!completedSteps.includes('clinic-contact')) {
          currentStep = 'clinic-contact';
        } else {
          currentStep = 'completed';
        }
      } else {
        // clinic plan
        if (!completedSteps.includes('clinic-overview')) {
          currentStep = 'clinic-overview';
        } else if (!completedSteps.includes('clinic-contact')) {
          currentStep = 'clinic-contact';
        } else if (!completedSteps.includes('clinic-schedule')) {
          currentStep = 'clinic-schedule';
        } else {
          currentStep = 'completed';
        }
      }

      return {
        userId,
        currentStep: currentStep as OnboardingStepType,
        planType,
        completedSteps,
        totalSteps: stepCounts[planType],
        currentStepNumber: completedSteps.length + 1,
        canSkipCurrent: planType === 'company' && currentStep === 'complex-overview',
      };
    } catch (error) {
      console.error('Error getting step progress:', error);
      throw new InternalServerErrorException(
        'Failed to get onboarding progress',
      );
    }
  }

  async markAsSkipped(userId: string) {
    try {
      // Simple implementation - mark user as having skipped onboarding
      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        throw new BadRequestException('User not found');
      }

      return { skipped: true, timestamp: new Date(), redirectTo: 'dashboard' };
    } catch (error) {
      console.error('Error marking as skipped:', error);
      throw new InternalServerErrorException('Failed to skip onboarding');
    }
  }

  async saveOrganizationOverview(userId: string, dto: OrganizationOverviewDto) {
    try {
      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Check if user already has an organization
      const organizations =
        await this.organizationService.getAllOrganizations();
      const existingOrg = organizations.find(
        (org) => org.ownerId?.toString() === userId,
      );

      if (existingOrg) {
        // Update existing organization with new standardized structure
        const updateData = {
          name: dto.name,
          legalName: dto.legalName,
          logoUrl: dto.logoUrl,
          website: dto.website,
          // Business profile fields (flattened from DTO)
          yearEstablished: dto.yearEstablished,
          mission: dto.mission,
          vision: dto.vision,
          overview: dto.overview, // Use overview field correctly
          goals: dto.goals,
          ceoName: dto.ceoName,
        };

        const updatedOrg = await this.organizationService.updateOrganization(
          (existingOrg._id as any).toString(),
          updateData,
        );

        // Mark step as complete
        await this.progressService.markStepComplete(userId, 'organization-overview');

        return {
          success: true,
          entityId: (updatedOrg._id as any).toString(),
          canProceed: true,
          nextStep: 'organization_contact',
          data: updateData,
        };
      } else {
        // Create new organization if it doesn't exist
        // Get user's subscription to link to organization
        const subscription =
          await this.subscriptionService.getSubscriptionByUser(userId);
        if (!subscription) {
          throw new BadRequestException('No active subscription found');
        }

        // Create organization with new standardized structure
        const organizationData = {
          name: dto.name,
          legalName: dto.legalName,
          logoUrl: dto.logoUrl,
          website: dto.website,
          // Business profile fields (flattened from DTO)
          yearEstablished: dto.yearEstablished,
          mission: dto.mission,
          vision: dto.vision,
          overview: dto.overview, // Use overview field correctly
          goals: dto.goals,
          ceoName: dto.ceoName,
          // Ownership and subscription
          ownerId: userId,
          subscriptionId: (subscription._id as any).toString(),
        };

        const organization = await this.organizationService.createOrganization(
          organizationData as any,
          userId,
        );

        // Mark step as complete
        await this.progressService.markStepComplete(userId, 'organization-overview');

        return {
          success: true,
          entityId: (organization._id as any).toString(),
          canProceed: true,
          nextStep: 'organization_contact',
          data: organizationData,
        };
      }
    } catch (error) {
      console.error('Error saving organization overview:', error);

      // More specific error handling
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to save organization overview',
      );
    }
  }

  async saveOrganizationContact(userId: string, dto: OrganizationContactDto) {
    try {
      // Find existing organization for this user
      const organizations =
        await this.organizationService.getAllOrganizations();
      const userOrg = organizations.find(
        (org) => org.ownerId?.toString() === userId,
      );

      if (!userOrg) {
        throw new BadRequestException(
          'Organization not found for user. Please complete company overview first.',
        );
      }

      // Update organization with new standardized contact structure
      const updateData = {
        phoneNumbers: dto.phoneNumbers,
        email: dto.email,
        address: dto.address,
        emergencyContact: dto.emergencyContact,
        socialMediaLinks: dto.socialMediaLinks,
      };

      const updatedOrg = await this.organizationService.updateOrganization(
        (userOrg._id as any).toString(),
        updateData as any,
      );

      // Mark step as complete
      await this.progressService.markStepComplete(userId, 'organization-contact');

      return {
        success: true,
        entityId: (updatedOrg._id as any).toString(),
        canProceed: true,
        nextStep: 'organization_legal',
        data: updatedOrg,
      };
    } catch (error) {
      console.error('Error saving organization contact:', error);
      throw new InternalServerErrorException(
        'Failed to save organization contact information',
      );
    }
  }

  async saveOrganizationLegal(userId: string, dto: OrganizationLegalDto) {
    try {
      // Find existing organization for this user
      const organizations =
        await this.organizationService.getAllOrganizations();
      const userOrg = organizations.find(
        (org) => org.ownerId?.toString() === userId,
      );

      if (!userOrg) {
        throw new BadRequestException(
          'Organization not found for user. Please complete previous steps first.',
        );
      }

      // Update organization with legal information (same structure as DTO)
      const updateData = {
        vatNumber: dto.vatNumber,
        crNumber: dto.crNumber,
        termsConditionsUrl: dto.termsConditionsUrl,
        privacyPolicyUrl: dto.privacyPolicyUrl,
      };

      const updatedOrg = await this.organizationService.updateOrganization(
        (userOrg._id as any).toString(),
        updateData,
      );

      // Mark step as complete
      await this.progressService.markStepComplete(userId, 'organization-legal');

      // Determine next step based on subscription plan
      const subscription =
        await this.subscriptionService.getSubscriptionByUser(userId);
      let nextStep = 'complete';

      if (subscription) {
        // Get plan details to determine type
        const plan = await this.subscriptionPlanModel.findById(
          (subscription as any).planId,
        );
        const planType = plan?.name?.toLowerCase() || 'company';
        if (planType === 'company') {
          nextStep = 'complex_overview'; // Company plan continues to complex
        }
        // For other plans, organization setup is complete
      }

      return {
        success: true,
        entityId: (updatedOrg._id as any).toString(),
        canProceed: true,
        nextStep,
        data: updatedOrg,
      };
    } catch (error) {
      console.error('Error saving organization legal info:', error);
      throw new InternalServerErrorException(
        'Failed to save organization legal information',
      );
    }
  }

  async completeOrganizationSetup(userId: string) {
    try {
      // Find the user's organization
      const organizations =
        await this.organizationService.getAllOrganizations();
      const userOrg = organizations.find(
        (org) => org.ownerId?.toString() === userId,
      );

      if (!userOrg) {
        throw new BadRequestException('Organization not found for user');
      }

      // Get the user's subscription to determine plan type
      const subscription =
        await this.subscriptionService.getSubscriptionByUser(userId);
      const planType =
        (subscription?.planId as any)?.name?.toLowerCase() || 'company';

      return {
        completed: true,
        planType,
        organizationId: (userOrg._id as any).toString(),
      };
    } catch (error) {
      console.error('Error completing organization setup:', error);
      throw new InternalServerErrorException(
        'Failed to complete organization setup',
      );
    }
  }

  // Enhanced helper method for data inheritance - respects user intent vs default inheritance
  private inheritDataFromOrganization(
    organization: any,
    entityData: any,
    inheritanceSettings?: any,
  ): any {
    // Helper function to determine if a value should be inherited
    const shouldInherit = (
      field: string,
      currentValue: any,
      parentValue: any,
    ): boolean => {
      // If inheritance settings specify this field should be overridden, don't inherit
      if (inheritanceSettings?.fieldsToOverride?.includes(field)) {
        return false;
      }

      // If inheritance settings specify only certain fields to inherit, check if this field is included
      if (
        inheritanceSettings?.fieldsToInherit &&
        !inheritanceSettings.fieldsToInherit.includes(field)
      ) {
        return false;
      }

      // If current value is explicitly set to empty string, respect user's choice
      if (currentValue === '') {
        return false;
      }

      // If current value is null, undefined, or missing, inherit from parent
      if (currentValue === null || currentValue === undefined) {
        return !!parentValue;
      }

      // If current value exists and is not empty, keep it
      return false;
    };

    // Helper function to safely inherit a field
    const inheritField = (field: string, defaultValue?: any): any => {
      const currentValue = entityData[field];
      const parentValue = organization[field];

      if (shouldInherit(field, currentValue, parentValue)) {
        return parentValue;
      }

      return currentValue !== undefined ? currentValue : defaultValue;
    };

    const result = {
      // Keep all existing entity data as base
      ...entityData,

      // Apply intelligent inheritance for specific fields
      logoUrl: inheritField('logoUrl'),
      yearEstablished: inheritField('yearEstablished'),
      mission: inheritField('mission'),
      vision: inheritField('vision'),
      overview: inheritField('overview'),
      goals: inheritField('goals'),
      website: inheritField('website'),
      ceoName: inheritField('ceoName'),

      // Contact information inheritance (if not provided)
      email: inheritField('email'),
      phoneNumbers:
        entityData.phoneNumbers && entityData.phoneNumbers.length > 0
          ? entityData.phoneNumbers
          : organization.phoneNumbers || [],

      // Address inheritance with more sophisticated logic
      address:
        entityData.address &&
        (entityData.address.street ||
          entityData.address.city ||
          entityData.address.state ||
          entityData.address.postalCode)
          ? entityData.address
          : organization.address,

      // Emergency contact inheritance
      emergencyContact:
        entityData.emergencyContact &&
        (entityData.emergencyContact.name || entityData.emergencyContact.phone)
          ? entityData.emergencyContact
          : organization.emergencyContact,

      // Social media links inheritance
      socialMediaLinks:
        entityData.socialMediaLinks &&
        Object.values(entityData.socialMediaLinks).some((val) => val)
          ? entityData.socialMediaLinks
          : organization.socialMediaLinks,

      // Legal information inheritance
      vatNumber: inheritField('vatNumber'),
      crNumber: inheritField('crNumber'),

      // Fields that should never be inherited (must be unique per entity)
      name: entityData.name, // Always use entity's own name
    };

    // Log inheritance actions for debugging
    const inheritedFields: string[] = [];
    Object.keys(result).forEach((field) => {
      if (
        entityData[field] !== result[field] &&
        result[field] === organization[field]
      ) {
        inheritedFields.push(field);
      }
    });

    if (inheritedFields.length > 0) {
      console.log(
        `🔗 Inherited fields from parent: ${inheritedFields.join(', ')}`,
      );
    }

    return result;
  }

  private inheritContactFromOrganization(
    organization: any,
    complexContactData: any,
  ): any {
    return {
      ...complexContactData,
      phoneNumbers: complexContactData.phoneNumbers?.length
        ? complexContactData.phoneNumbers
        : organization.phoneNumbers,
      email: complexContactData.email || organization.email,
      address: complexContactData.address || organization.address,
      emergencyContact:
        complexContactData.emergencyContact || organization.emergencyContact,
      socialMediaLinks: {
        ...organization.socialMediaLinks,
        ...complexContactData.socialMediaLinks, // User changes override
      },
    };
  }

  /**
   * Helper method to find user's complex with robust lookup logic
   */
  private async findUserComplex(userId: string): Promise<any> {
    let userComplex: any | null = null;

    const subscription =
      await this.subscriptionService.getSubscriptionByUser(userId);
    const organizations = await this.organizationService.getAllOrganizations();
    const userOrg = organizations.find(
      (org) => org.ownerId?.toString() === userId,
    );

    // First try to find complex through organization
    if (userOrg) {
      try {
        const complexes = await this.complexService.getComplexesByOrganization(
          (userOrg._id as any).toString(),
        );
        // Find complex owned by this user, or take the first one
        userComplex =
          complexes.find(
            (complex: any) => complex.ownerId?.toString() === userId,
          ) ||
          complexes[0] ||
          null;
      } catch (error) {
        console.log('No complexes found for organization:', error.message);
      }
    }

    // If not found through organization, try through subscription
    if (!userComplex && subscription) {
      try {
        userComplex = await this.complexService.getComplexBySubscription(
          (subscription._id as any).toString(),
        );
      } catch (error) {
        console.log('No complex found for subscription:', error.message);
      }
    }

    return userComplex;
  }

  async saveComplexOverview(userId: string, dto: ComplexOverviewDto) {
    try {
      // Check if user already has a complex
      const existingComplex: any = await this.findUserComplex(userId);

      const subscription =
        await this.subscriptionService.getSubscriptionByUser(userId);
      if (!subscription) {
        throw new BadRequestException('No active subscription found for user');
      }

      // Get organization (may be null for complex-only plans)
      const organizations =
        await this.organizationService.getAllOrganizations();
      const userOrg = organizations.find(
        (org) => org.ownerId?.toString() === userId,
      );

      // Handle shared logo URL
      const logoUrl = dto.logoUrl;
      if (logoUrl && userOrg && logoUrl === userOrg.logoUrl) {
        console.log(
          '🔗 Complex using same logo as organization, keeping shared reference',
        );
        // Keep the same URL to maintain sharing
      }

      // Prepare complex data with inheritance from organization if exists
      let complexData = {
        name: dto.name,
        managerName: dto.managerName,
        logoUrl: logoUrl,
        website: dto.website,
        // Business information
        yearEstablished: dto.yearEstablished,
        mission: dto.mission,
        vision: dto.vision,
        overview: dto.overview,
        goals: dto.goals,
        ceoName: dto.ceoName,
        // Ownership and relationships
        ownerId: userId,
        subscriptionId: (subscription._id as any).toString(),
        organizationId: userOrg?._id || null,
      };

      // Apply inheritance from organization if it exists
      if (userOrg) {
        complexData = this.inheritDataFromOrganization(
          userOrg,
          complexData,
          dto.inheritanceSettings,
        );
      }

      let complex: any;
      if (existingComplex) {
        // Update existing complex
        console.log('📝 Updating existing complex:', existingComplex._id);
        complex = await this.complexService.updateComplex(
          existingComplex._id.toString(),
          complexData,
        );
      } else {
        // Create new complex
        console.log('🆕 Creating new complex for user:', userId);
        complex = await this.complexService.createComplex(complexData as any);
      }

      const complexId = complex._id?.toString();
      console.log('✅ Complex saved with ID:', complexId);

      // Link existing departments to complex
      const allDepartments = await this.departmentService.getAllDepartments();

      // Create new departments and link to complex
      const createdDepartments: any[] = [];
      if (dto.newDepartmentNames && dto.newDepartmentNames.length > 0) {
        for (const deptName of dto.newDepartmentNames) {
          const nameTrimmed = deptName.trim();
          if (nameTrimmed) {
            // Check for existing department
            let department = allDepartments.find(
              (d) => d.name.toLowerCase() === nameTrimmed.toLowerCase(),
            );
            if (!department) {
              department = await this.departmentService.createDepartment({
                name: nameTrimmed,
                description: `Department for ${dto.name}`,
              });
            }
            // Link department to complex
            await this.departmentService.createComplexDepartment(
              complexId,
              (department._id as any)?.toString(),
            );
            createdDepartments.push(department);
          }
        }
      }

      // Link existing departments to complex if provided
      if (dto.departmentIds && dto.departmentIds.length > 0) {
        await this.createDepartmentsForComplex(complexId, dto.departmentIds);
      }

      // Mark step as complete
      await this.progressService.markStepComplete(userId, 'complex-overview');

      return {
        success: true,
        entityId: complexId,
        canProceed: true,
        nextStep: 'complex_contact',
        data: {
          complex: {
            id: complexId,
            ...complexData,
          },
          departments: createdDepartments,
        },
      };
    } catch (error) {
      console.error('Error saving complex overview:', error);
      throw new InternalServerErrorException('Failed to save complex overview');
    }
  }

  async saveComplexContact(
    userId: string,
    dto: ComplexContactDto,
  ): Promise<StepSaveResponseDto> {
    try {
      console.log('🔍 Looking for complex for user:', userId);

      // Use the robust helper method to find user's complex
      const userComplex: any = await this.findUserComplex(userId);

      if (!userComplex) {
        console.error('❌ Complex not found for user:', userId);
        throw new BadRequestException(
          'Complex not found for user. Please complete complex overview first.',
        );
      }

      console.log('✅ Found complex:', userComplex._id);

      // Get organization for inheritance
      const organizations =
        await this.organizationService.getAllOrganizations();
      const userOrg = organizations.find(
        (org) => org.ownerId?.toString() === userId,
      );

      // Apply inheritance if organization exists
      let contactData = dto;
      if (userOrg) {
        console.log('📋 Applying contact inheritance from organization');
        contactData = this.inheritContactFromOrganization(userOrg, dto);
      }

      // Update complex with new standardized contact structure
      const updateData = {
        phoneNumbers: contactData.phoneNumbers,
        email: contactData.email,
        address: contactData.address,
        emergencyContact: contactData.emergencyContact,
        socialMediaLinks: contactData.socialMediaLinks,
      };

      console.log('📞 Updating complex contact data:', updateData);
      const updatedComplex = await this.complexService.updateComplex(
        userComplex._id.toString(),
        updateData as any,
      );

      // Mark step as complete
      await this.progressService.markStepComplete(userId, 'complex-contact');

      return {
        success: true,
        entityId: updatedComplex.data._id.toString(),
        canProceed: true,
        nextStep: 'complex_legal',
        data: updatedComplex.data,
      };
    } catch (error) {
      console.error('Error saving complex contact:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to save complex contact');
    }
  }

  async saveComplexLegal(
    userId: string,
    dto: ComplexLegalInfoDto,
  ): Promise<StepSaveResponseDto> {
    try {
      console.log(
        '🔍 Looking for complex for legal info update, user:',
        userId,
      );

      // Use the robust helper method to find user's complex
      const userComplex: any = await this.findUserComplex(userId);

      if (!userComplex) {
        console.error(
          '❌ Complex not found for legal info update, user:',
          userId,
        );
        throw new BadRequestException(
          'Complex not found for user. Please complete complex overview first.',
        );
      }

      console.log('✅ Found complex for legal update:', userComplex._id);

      // Update complex with legal information
      const updateData = {
        vatNumber: dto.vatNumber,
        crNumber: dto.crNumber,
        termsConditionsUrl: dto.termsConditionsUrl,
        privacyPolicyUrl: dto.privacyPolicyUrl,
      };

      console.log('📝 Updating complex legal data:', updateData);
      const updatedComplex = await this.complexService.updateComplex(
        userComplex._id.toString(),
        updateData as any,
      );

      // Determine next step based on subscription plan
      const subscription =
        await this.subscriptionService.getSubscriptionByUser(userId);
      let nextStep = 'complete';

      if (subscription) {
        const plan = await this.subscriptionPlanModel.findById(
          (subscription as any).planId,
        );
        const planType = plan?.name?.toLowerCase() || 'complex';
        if (planType === 'company') {
          nextStep = 'clinic_overview'; // Company plan continues to clinic
        }
        // For complex-only plans, this completes the setup
      }

      // Mark step as complete
      await this.progressService.markStepComplete(userId, 'complex-legal');

      return {
        success: true,
        entityId: updatedComplex.data._id.toString(),
        canProceed: true,
        nextStep,
        data: updatedComplex.data,
      };
    } catch (error) {
      console.error('❌ Error saving complex legal info:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to save complex legal information',
      );
    }
  }

  async saveComplexSchedule(
    userId: string,
    workingHours: ComplexWorkingHoursDto[],
  ): Promise<{ updated: boolean; complexId: string; workingHours: any }> {
    try {
      console.log('🔍 Looking for complex for schedule update, user:', userId);

      // Use the robust helper method to find user's complex
      const userComplex: any = await this.findUserComplex(userId);

      if (!userComplex) {
        console.error(
          '❌ Complex not found for schedule update, user:',
          userId,
        );
        throw new BadRequestException('Complex not found for user');
      }

      const complexId = userComplex._id.toString();
      console.log('✅ Found complex for schedule update:', complexId);

      // Prepare working hours data for the service
      const scheduleData = workingHours
        .filter((wh) => wh.isWorkingDay && wh.openingTime && wh.closingTime)
        .map((workingHour) => ({
          dayOfWeek: workingHour.dayOfWeek,
          isWorkingDay: workingHour.isWorkingDay,
          openingTime: workingHour.openingTime,
          closingTime: workingHour.closingTime,
          breakStartTime: workingHour.breakStartTime,
          breakEndTime: workingHour.breakEndTime,
        }));

      console.log('📅 Updating complex schedule data:', scheduleData);

      // Save working hours using the working hours service
      const workingHoursDto = {
        entityType: 'complex',
        entityId: complexId,
        schedule: scheduleData,
      };

      await this.legacyWorkingHoursService.updateWorkingHours(
        'complex',
        complexId,
        workingHoursDto as any,
      );

      // Mark step as complete
      await this.progressService.markStepComplete(userId, 'complex-schedule');

      return {
        updated: true,
        complexId,
        workingHours: scheduleData,
      };
    } catch (error) {
      console.error('❌ Error saving complex schedule:', error);
      throw new InternalServerErrorException('Failed to save complex schedule');
    }
  }

  async completeComplexSetup(userId: string): Promise<any> {
    try {
      console.log('🏁 Completing complex setup for user:', userId);

      // Use the robust helper method to find user's complex
      const userComplex: any = await this.findUserComplex(userId);

      if (!userComplex) {
        console.error(
          '❌ Complex not found during completion for user:',
          userId,
        );
        throw new BadRequestException(
          'Complex not found for user. Please complete complex overview first.',
        );
      }

      const complexId = userComplex._id.toString();
      console.log('✅ Found complex for completion:', complexId);

      // Get associated departments
      const departments =
        await this.departmentService.getDepartmentsByComplex(complexId);

      // Get working hours for the complex
      const workingHours = await this.legacyWorkingHoursService.getWorkingHours(
        'complex',
        complexId,
      );

      // Update user access to include complex permissions
      await this.userAccessService.createUserAccess({
        userId,
        scopeType: 'complex',
        scopeId: complexId,
        role: UserRole.ADMIN,
      });

      // Get subscription to determine next steps
      const subscription =
        await this.subscriptionService.getSubscriptionByUser(userId);
      const plan = await this.subscriptionPlanModel.findById(
        subscription?.planId,
      );
      const hasMoreSteps = plan?.name?.toLowerCase() === 'company';

      const result = {
        completed: true,
        hasMoreSteps,
        complexId,
        departments,
        workingHours,
        nextStep: hasMoreSteps ? 'clinic_setup' : null,
      };

      console.log('🎉 Complex setup completed:', result);
      return result;
    } catch (error) {
      console.error('❌ Error completing complex setup:', error);
      throw new InternalServerErrorException(
        'Failed to complete complex setup',
      );
    }
  }

  async saveClinicOverview(
    userId: string,
    dto: ClinicOverviewDto,
  ): Promise<StepSaveResponseDto> {
    try {
      // Find existing clinic or create new one
      const existingClinic: any = null;

      const subscription =
        await this.subscriptionService.getSubscriptionByUser(userId);
      if (!subscription) {
        throw new BadRequestException('No active subscription found for user');
      }

      // Get related entities (may be null for clinic-only plans)
      const organizations =
        await this.organizationService.getAllOrganizations();
      const userOrg = organizations.find(
        (org) => org.ownerId?.toString() === userId,
      );

      // Use robust helper method to find user's complex
      const userComplex = await this.findUserComplex(userId);

      if (userComplex) {
        console.log(
          '✅ Found complex for clinic linking:',
          userComplex._id,
          'Name:',
          userComplex.name,
        );
      } else {
        console.log(
          'ℹ️  No complex found - this is expected for clinic-only plans',
        );
      }

      // Enhanced logo inheritance and validation logic
      let logoUrl = dto.logoUrl;

      // Helper function to validate logo URL accessibility
      const isValidLogoUrl = async (url: string): Promise<boolean> => {
        if (!url || url.trim() === '') return false;

        // For relative paths, check if file exists
        if (url.startsWith('/uploads/')) {
          try {
            const fs = require('fs');
            const path = require('path');
            const fullPath = path.join(
              process.cwd(),
              'uploads',
              url.replace('/uploads/', ''),
            );
            return fs.existsSync(fullPath);
          } catch (error) {
            console.warn(
              'Could not verify logo file existence:',
              url,
              error.message,
            );
            return false;
          }
        }

        // For external URLs, assume valid (could add HTTP check in production)
        if (url.startsWith('http://') || url.startsWith('https://')) {
          return true;
        }

        return false;
      };

      // Normalize logo URL format
      const normalizeLogoUrl = (url: string): string => {
        if (!url || url.trim() === '') return url;

        // If it's already a relative path, keep it
        if (url.startsWith('/uploads/')) {
          return url;
        }

        // If it's a full URL with our domain, convert to relative
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        if (url.startsWith(baseUrl)) {
          return url.replace(baseUrl, '');
        }

        return url; // Keep external URLs as-is
      };

      if (!logoUrl || logoUrl.trim() === '') {
        // No custom logo provided, inherit from parent entities with validation

        // Prioritize complex logo first, then organization logo
        if (userComplex?.logoUrl) {
          const complexLogoUrl = normalizeLogoUrl(userComplex.logoUrl);
          const isValidComplex = await isValidLogoUrl(complexLogoUrl);
          if (isValidComplex) {
            logoUrl = complexLogoUrl;
            console.log(
              '🔗 Clinic inheriting valid logo from complex:',
              logoUrl,
            );
          } else {
            console.warn(
              '⚠️  Invalid logo URL from complex, skipping:',
              complexLogoUrl,
            );
          }
        }

        // If complex logo not available or invalid, try organization logo
        if (!logoUrl && userOrg?.logoUrl) {
          const orgLogoUrl = normalizeLogoUrl(userOrg.logoUrl);
          const isValidOrg = await isValidLogoUrl(orgLogoUrl);
          if (isValidOrg) {
            logoUrl = orgLogoUrl;
            console.log(
              '🔗 Clinic inheriting valid logo from organization:',
              logoUrl,
            );
          } else {
            console.warn(
              '⚠️  Invalid logo URL from organization, skipping:',
              orgLogoUrl,
            );
          }
        }

        // If no valid inherited logo found, use default placeholder
        if (!logoUrl) {
          logoUrl = '/uploads/logos/default-clinic-logo.png';
          console.log('📷 Using default clinic logo placeholder');
        }
      } else {
        // Custom logo provided - validate and normalize
        logoUrl = normalizeLogoUrl(logoUrl);
        const isValid = await isValidLogoUrl(logoUrl);

        if (!isValid) {
          console.warn(
            '⚠️  Custom logo URL is invalid, attempting inheritance fallback:',
            logoUrl,
          );

          // Fallback to parent logo if custom logo is invalid
          if (
            userComplex?.logoUrl &&
            (await isValidLogoUrl(normalizeLogoUrl(userComplex.logoUrl)))
          ) {
            logoUrl = normalizeLogoUrl(userComplex.logoUrl);
            console.log(
              '🔗 Fallback: Using complex logo due to invalid custom logo',
            );
          } else if (
            userOrg?.logoUrl &&
            (await isValidLogoUrl(normalizeLogoUrl(userOrg.logoUrl)))
          ) {
            logoUrl = normalizeLogoUrl(userOrg.logoUrl);
            console.log(
              '🔗 Fallback: Using organization logo due to invalid custom logo',
            );
          } else {
            logoUrl = '/uploads/logos/default-clinic-logo.png';
            console.log(
              '📷 Fallback: Using default logo due to all invalid logos',
            );
          }
        } else {
          // Check for sharing with parent entities
          const normalizedComplexLogo = userComplex?.logoUrl
            ? normalizeLogoUrl(userComplex.logoUrl)
            : null;
          const normalizedOrgLogo = userOrg?.logoUrl
            ? normalizeLogoUrl(userOrg.logoUrl)
            : null;

          if (normalizedComplexLogo && logoUrl === normalizedComplexLogo) {
            console.log(
              '🔗 Clinic using same logo as complex, maintaining shared reference',
            );
          } else if (normalizedOrgLogo && logoUrl === normalizedOrgLogo) {
            console.log(
              '🔗 Clinic using same logo as organization, maintaining shared reference',
            );
          }
        }
      }

      // Debug: Log complexDepartmentId processing
      console.log('🔍 DEBUG complexDepartmentId processing:', {
        received: dto.complexDepartmentId,
        type: typeof dto.complexDepartmentId,
        length: dto.complexDepartmentId?.length,
        trimmed: dto.complexDepartmentId?.trim(),
        isEmpty: dto.complexDepartmentId?.trim() === '',
        userComplex: userComplex?._id?.toString(),
        userComplexName: userComplex?.name,
      });

      // Prepare clinic data
      let clinicData = {
        name: dto.name,
        headDoctorName: dto.headDoctorName,
        specialization: dto.specialization,
        licenseNumber: dto.licenseNumber,
        pin: dto.pin,
        logoUrl: logoUrl,
        website: dto.website,
        // Business information
        yearEstablished: dto.yearEstablished,
        mission: dto.mission,
        vision: dto.vision,
        overview: dto.overview,
        goals: dto.goals,
        ceoName: dto.ceoName,
        // Ownership and relationships
        ownerId: userId,
        subscriptionId: (subscription._id as any).toString(),
        organizationId: userOrg?._id || null,
        complexId: userComplex?._id || null,
        complexDepartmentId:
          dto.complexDepartmentId && dto.complexDepartmentId.trim() !== ''
            ? dto.complexDepartmentId
            : undefined,
      };

      console.log(
        '✅ Final clinicData.complexDepartmentId:',
        clinicData.complexDepartmentId,
      );

      // Apply inheritance from complex if exists, else from organization
      if (userComplex) {
        clinicData = this.inheritDataFromOrganization(
          userComplex,
          clinicData,
          dto.inheritanceSettings,
        ); // Complex has same structure as org
      } else if (userOrg) {
        clinicData = this.inheritDataFromOrganization(
          userOrg,
          clinicData,
          dto.inheritanceSettings,
        );
      }

      let clinic: any;
      if (existingClinic) {
        console.log('🔄 Updating existing clinic:', existingClinic._id);
        clinic = await this.clinicService.updateClinic(
          existingClinic._id.toString(),
          clinicData,
        );
      } else {
        console.log('✨ Creating new clinic');
        clinic = await this.clinicService.createClinic(clinicData);
      }

      // Process services if provided in the DTO
      const createdServiceIds: string[] = [];
      if (
        dto.services &&
        Array.isArray(dto.services) &&
        dto.services.length > 0
      ) {
        console.log(
          '🔄 Processing services for clinic:',
          clinic._id,
          'Services count:',
          dto.services.length,
        );
        console.log('📋 Services data:', JSON.stringify(dto.services, null, 2));

        for (const serviceData of dto.services) {
          console.log('🔄 Processing service:', serviceData);
          if (serviceData.name && serviceData.name.trim()) {
            try {
              console.log('🏗️ Creating service:', serviceData.name);
              // Create the service in the services collection
              // Each clinic gets its own separate services, even with duplicate names
              const newService = await this.serviceService.createService({
                name: serviceData.name.trim(),
                description: serviceData.description?.trim() || '',
                durationMinutes: serviceData.durationMinutes || 30,
                price: serviceData.price || 0,
                clinicId: clinic._id.toString(), // Link service directly to this clinic
                complexDepartmentId: clinic.complexDepartmentId
                  ? clinic.complexDepartmentId.toString()
                  : undefined,
              });

              console.log('✅ Created service:', newService._id);
              createdServiceIds.push((newService._id as any).toString());

              console.log('🔗 Linking service to clinic...');
              // Link service to clinic via ClinicService
              await this.serviceService.assignServicesToClinic(
                clinic._id.toString(),
                {
                  serviceAssignments: [
                    {
                      serviceId: (newService._id as any).toString(),
                      priceOverride: serviceData.price,
                      isActive: true,
                    },
                  ],
                },
              );
              console.log('✅ Service linked to clinic successfully');
            } catch (serviceError) {
              console.error('Error creating service:', serviceError);
              // Continue with other services
            }
          } else {
            console.log('⚠️ Skipping empty service:', serviceData);
          }
        }

        // Services are now managed through ClinicService junction table only
        console.log(
          '✅ Services created and linked via ClinicService junction table:',
          createdServiceIds.length,
        );
      }

      // Mark step as complete
      await this.progressService.markStepComplete(userId, 'clinic-overview');

      return {
        success: true,
        entityId: clinic._id?.toString(),
        canProceed: true,
        nextStep: 'clinic_contact',
        data: {
          clinic: {
            id: clinic._id?.toString(),
            ...clinicData,
            servicesCreated: createdServiceIds.length,
          },
        },
      };
    } catch (error) {
      console.error('Error saving clinic overview:', error);
      throw new InternalServerErrorException('Failed to save clinic overview');
    }
  }

  async saveClinicContact(
    userId: string,
    dto: ClinicContactDto,
  ): Promise<StepSaveResponseDto> {
    try {
      console.log('🔍 saveClinicContact called with:', { userId, dto });

      // Find clinic by user
      const userClinic = await this.clinicService.findClinicByUser(userId);

      if (!userClinic) {
        console.error('❌ Clinic not found for user:', userId);
        throw new BadRequestException(
          'Clinic not found for user. Please complete clinic overview first.',
        );
      }

      console.log('✅ Found clinic:', userClinic._id, 'for user:', userId);

      // Get related entities for inheritance (may be null for clinic-only plans)
      const organizations =
        await this.organizationService.getAllOrganizations();
      const userOrg = organizations.find(
        (org) => org.ownerId?.toString() === userId,
      );

      // Use robust helper method to find user's complex
      const userComplex = await this.findUserComplex(userId);

      console.log('📋 Inheritance sources:', {
        userOrg: !!userOrg,
        userComplex: !!userComplex,
      });

      // Apply inheritance from complex if exists, else from organization
      let contactData = dto;
      if (userComplex) {
        contactData = this.inheritContactFromOrganization(userComplex, dto);
        console.log('📥 Applied inheritance from complex');
      } else if (userOrg) {
        contactData = this.inheritContactFromOrganization(userOrg, dto);
        console.log('📥 Applied inheritance from organization');
      }

      console.log(
        '📞 Final contact data:',
        JSON.stringify(contactData, null, 2),
      );

      // Update clinic with new standardized contact structure
      const updateData = {
        phoneNumbers: contactData.phoneNumbers,
        email: contactData.email,
        address: contactData.address,
        emergencyContact: contactData.emergencyContact,
        socialMediaLinks: contactData.socialMediaLinks,
      };

      console.log(
        '🔄 Updating clinic contact for clinic:',
        userClinic._id,
        updateData,
      );
      const updatedClinic = await this.clinicService.updateClinic(
        (userClinic._id as any).toString(),
        updateData as any,
      );
      console.log('✅ Clinic contact updated successfully:', updatedClinic._id);

      // Mark step as complete
      await this.progressService.markStepComplete(userId, 'clinic-contact');

      return {
        success: true,
        entityId: (updatedClinic._id as any).toString(),
        canProceed: true,
        nextStep: 'clinic_services',
        data: updatedClinic,
      };
    } catch (error) {
      console.error('Error saving clinic contact:', error);
      throw new InternalServerErrorException('Failed to save clinic contact');
    }
  }

  async saveClinicServicesCapacity(
    userId: string,
    dto: any,
  ): Promise<{ updated: boolean; data: any; servicesCreated: number }> {
    try {
      console.log('🔍 saveClinicServicesCapacity called with:', {
        userId,
        dto,
      });

      // Find clinic by user
      const userClinic = await this.clinicService.findClinicByUser(userId);

      if (!userClinic) {
        console.error('❌ Clinic not found for user:', userId);
        throw new BadRequestException(
          'Clinic not found for user. Please complete clinic overview first.',
        );
      }

      console.log('✅ Found clinic:', userClinic._id, 'for user:', userId);
      const updateData: any = {};
      const createdServiceIds: string[] = [];

      // Create services if provided
      if (
        dto.services &&
        Array.isArray(dto.services) &&
        dto.services.length > 0
      ) {
        console.log(
          '🔄 Creating services for clinic:',
          userClinic._id,
          'Services count:',
          dto.services.length,
        );
        console.log('📋 Services data:', JSON.stringify(dto.services, null, 2));

        // Process all services in batch for better consistency
        const servicePromises = dto.services.map(async (serviceData, index) => {
          console.log(
            `🔄 Processing service ${index + 1}/${dto.services.length}:`,
            serviceData,
          );
          if (serviceData.name && serviceData.name.trim()) {
            try {
              console.log('🏗️ Creating service:', serviceData.name);

              // Create the service in the services collection
              // Each clinic gets its own separate services, even with duplicate names
              const newService = await this.serviceService.createService({
                name: serviceData.name.trim(),
                description: serviceData.description?.trim() || '',
                durationMinutes: serviceData.durationMinutes || 30,
                price: serviceData.price || 0,
                clinicId: (userClinic._id as any).toString(), // Link service directly to this clinic
                complexDepartmentId: userClinic.complexDepartmentId
                  ? (userClinic.complexDepartmentId as any).toString()
                  : undefined,
              });

              console.log('✅ Created service:', newService._id);

              // Link service to clinic via ClinicService
              console.log('🔗 Linking service to clinic...');
              await this.serviceService.assignServicesToClinic(
                (userClinic._id as any).toString(),
                {
                  serviceAssignments: [
                    {
                      serviceId: (newService._id as any).toString(),
                      priceOverride: serviceData.price,
                      isActive: true,
                    },
                  ],
                },
              );
              console.log('✅ Service linked to clinic successfully');

              return (newService._id as any).toString();
            } catch (serviceError) {
              console.error(
                `Error creating service "${serviceData.name}":`,
                serviceError,
              );
              return null;
            }
          } else {
            console.log('⚠️ Skipping empty service:', serviceData);
            return null;
          }
        });

        // Wait for all service creations to complete
        const serviceResults = await Promise.all(servicePromises);
        const successfulServiceIds = serviceResults.filter((id) => id !== null);
        createdServiceIds.push(...successfulServiceIds);

        console.log('📊 Batch service creation completed:', {
          total: dto.services.length,
          successful: successfulServiceIds.length,
          failed: serviceResults.length - successfulServiceIds.length,
        });

        // Services are managed through ClinicService junction table only
        console.log(
          '✅ Services linked via ClinicService junction table:',
          createdServiceIds.length,
        );
      } else {
        console.log('⚠️ No services provided or empty services array');
      }

      // Update capacity if provided
      if (dto.capacity) {
        console.log('📊 Updating capacity:', dto.capacity);
        updateData.maxStaff = dto.capacity.maxStaff;
        updateData.maxDoctors = dto.capacity.maxDoctors;
        updateData.maxPatients = dto.capacity.maxPatients;
        updateData.sessionDuration = dto.capacity.sessionDuration;
      } else {
        console.log('⚠️ No capacity data provided');
      }

      console.log('🔄 Updating clinic with services and capacity:', updateData);
      const updatedClinic = await this.clinicService.updateClinic(
        (userClinic._id as any).toString(),
        updateData,
      );
      console.log('✅ Clinic updated successfully:', updatedClinic._id);

      return {
        updated: true,
        data: updatedClinic,
        servicesCreated: createdServiceIds.length,
      };
    } catch (error) {
      console.error('Error saving clinic services and capacity:', error);
      throw new InternalServerErrorException(
        'Failed to save clinic services and capacity',
      );
    }
  }

  async saveClinicLegal(
    userId: string,
    dto: ClinicLegalInfoDto,
  ): Promise<StepSaveResponseDto> {
    try {
      // Find clinic by user
      const userClinic = await this.clinicService.findClinicByUser(userId);

      if (!userClinic) {
        throw new BadRequestException(
          'Clinic not found for user. Please complete clinic overview first.',
        );
      }

      // Update clinic with legal information (uses standardized DTO structure)
      const updateData = {
        vatNumber: dto.vatNumber,
        crNumber: dto.crNumber,
        termsConditionsUrl: dto.termsConditionsUrl,
        privacyPolicyUrl: dto.privacyPolicyUrl,
      };

      console.log(
        '🔄 Updating clinic legal information for clinic:',
        userClinic._id,
      );
      const updatedClinic = await this.clinicService.updateClinic(
        (userClinic._id as any).toString(),
        updateData as any,
      );

      // Mark step as complete
      await this.progressService.markStepComplete(userId, 'clinic-legal');

      return {
        success: true,
        entityId: (updatedClinic._id as any).toString(),
        canProceed: true,
        nextStep: 'clinic_schedule',
        data: updatedClinic,
      };
    } catch (error) {
      console.error('Error saving clinic legal information:', error);
      throw new InternalServerErrorException(
        'Failed to save clinic legal information',
      );
    }
  }

  async saveClinicSchedule(
    userId: string,
    workingHours: ClinicWorkingHoursDto[],
  ): Promise<{
    updated: boolean;
    workingHours: ClinicWorkingHoursDto[];
    scheduleType: string;
    clinicId: string;
    parentComplexId?: string;
  }> {
    try {
      // Find clinic by user
      const userClinic = await this.clinicService.findClinicByUser(userId);

      if (!userClinic) {
        throw new BadRequestException({
          message: {
            ar: 'لم يتم العثور على العيادة للمستخدم. يرجى إكمال نظرة عامة على العيادة أولاً',
            en: 'Clinic not found for user. Please complete clinic overview first.',
          },
        });
      }

      // Get user's subscription to determine plan type
      const subscription =
        await this.subscriptionService.getSubscriptionByUser(userId);
      if (!subscription) {
        throw new BadRequestException({
          message: {
            ar: 'لم يتم العثور على اشتراك للمستخدم',
            en: 'No subscription found for user',
          },
        });
      }

      const plan = await this.subscriptionService.getSubscriptionWithPlan(
        (subscription._id as any).toString(),
      );
      const planType = plan.plan.name.toLowerCase(); // 'clinic', 'complex', 'company'

      console.log(
        '🔄 Saving clinic schedule for plan type:',
        planType,
        'clinic:',
        userClinic._id,
      );

      if (planType === 'clinic') {
        // Independent clinic plan - save schedule directly to clinic
        console.log('📅 Saving independent clinic schedule');

        // Save working hours to clinic-specific schedule
        // For now, store in a simple format - can be enhanced with proper WorkingHours entity
        const scheduleData = {
          workingHours: workingHours,
          scheduleType: 'clinic-independent',
          lastUpdated: new Date(),
        };

        const updatedClinic = await this.clinicService.updateClinic(
          (userClinic._id as any).toString(),
          { scheduleData } as any,
        );

        return {
          updated: true,
          workingHours: workingHours,
          scheduleType: 'clinic-independent',
          clinicId: (updatedClinic._id as any).toString(),
        };
      } else {
        // Complex/Company plan - clinic inherits from complex but can override
        console.log('📅 Saving clinic schedule with complex inheritance');

        // Find parent complex
        let parentComplexId = userClinic.complexId;
        if (!parentComplexId && userClinic.complexDepartmentId) {
          // Get complex ID from complex department
          const complexDepartment =
            await this.departmentService.getComplexDepartmentById(
              (userClinic.complexDepartmentId as any).toString(),
            );
          parentComplexId = complexDepartment?.complexId;
        }

        if (!parentComplexId) {
          throw new BadRequestException({
            message: {
              ar: 'لم يتم العثور على المجمع الطبي الأصلي للعيادة',
              en: 'Parent complex not found for clinic',
            },
          });
        }

        // Validate clinic working hours against complex working hours
        console.log('🔍 Validating clinic hours against complex hours');
        console.log('📋 Clinic schedule to validate:', JSON.stringify(workingHours, null, 2));
        console.log('🏢 Parent complex ID:', (parentComplexId as any).toString());
        
        const validationResult =
          await this.workingHoursValidationService.validateHierarchical(
            workingHours,
            'complex',
            (parentComplexId as any).toString(),
            userClinic.name || 'Clinic',
          );

        console.log('✅ Validation result:', JSON.stringify(validationResult, null, 2));

        if (!validationResult.isValid) {
          // Format validation errors for response
          const errorMessages = validationResult.errors.map((error) => {
            return {
              day: error.dayOfWeek,
              message: error.message,
              suggestedRange: error.suggestedRange,
            };
          });

          throw new BadRequestException({
            message: {
              ar: 'ساعات عمل العيادة يجب أن تكون ضمن ساعات عمل المجمع الطبي',
              en: 'Clinic working hours must be within complex working hours',
            },
            errors: errorMessages,
          });
        }

        const scheduleData = {
          workingHours: workingHours,
          scheduleType: 'clinic-override',
          parentComplexId: parentComplexId,
          lastUpdated: new Date(),
        };

        const updatedClinic = await this.clinicService.updateClinic(
          (userClinic._id as any).toString(),
          { scheduleData } as any,
        );

        // Mark step as complete
        await this.progressService.markStepComplete(userId, 'clinic-schedule');

        return {
          updated: true,
          workingHours: workingHours,
          scheduleType: 'clinic-override',
          parentComplexId: (parentComplexId as any)?.toString(),
          clinicId: (updatedClinic._id as any).toString(),
        };
      }
    } catch (error) {
      console.error('Error saving clinic schedule:', error);
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      throw new InternalServerErrorException({
        message: {
          ar: 'فشل في حفظ جدول العيادة',
          en: 'Failed to save clinic schedule',
        },
      });
    }
  }

  async completeClinicSetup(
    userId: string,
  ): Promise<{ completed: boolean; message: string; clinic?: any }> {
    try {
      console.log('🏁 Starting clinic setup completion for user:', userId);

      // Find the user's clinic
      const userClinic = await this.clinicService.findClinicByUser(userId);

      if (!userClinic) {
        throw new NotFoundException('No clinic found for user');
      }

      console.log('🏥 Found user clinic:', userClinic._id);

      // Get all services linked to this clinic via ClinicService junction table
      const clinicServices = await this.serviceService.getServicesByClinic(
        (userClinic._id as any).toString(),
      );

      console.log('🔧 Found services for clinic:', {
        clinicId: userClinic._id,
        serviceCount: clinicServices.length,
      });

      // Services are managed entirely through ClinicService junction table
      // No need to update clinic document - all relationships are handled via junction table

      console.log('✅ Clinic setup completion successful:', {
        clinicId: userClinic._id,
        serviceCount: clinicServices.length,
        servicesLinked: true,
      });

      return {
        completed: true,
        message: `Clinic setup completed successfully! ${clinicServices.length} services linked.`,
        clinic: userClinic,
      };
    } catch (error) {
      console.error('Error completing clinic setup:', error);
      throw new InternalServerErrorException('Failed to complete clinic setup');
    }
  }

  // ======== HELPER METHODS ========

  private mapToProgressDto(progress: StepProgress): OnboardingStepProgressDto {
    const stepCounts = this.getStepCounts(progress.planType);

    return {
      currentStep: progress.currentStep as any,
      completedSteps: progress.completedSteps as any[],
      planType: progress.planType,
      totalSteps: stepCounts.total,
      organizationId: progress.stepData?.organizationId,
      complexId: progress.stepData?.complexId,
      clinicId: progress.stepData?.clinicId,
    } as any;
  }

  private async calculateCurrentProgress(
    userId: string,
    planType: 'company' | 'complex' | 'clinic',
  ): Promise<StepProgress> {
    const progress: StepProgress = {
      userId,
      subscriptionId: '',
      currentStep: 'organization-overview',
      completedSteps: [],
      skippedSteps: [],
      planType,
      stepData: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Check what entities exist for this user by getting organizations and finding user's org
    const organizations = await this.organizationService.getAllOrganizations();
    const existingOrg = organizations.find(
      (org) => org.ownerId?.toString() === userId,
    );

    if (existingOrg) {
      progress.stepData.organizationId = (existingOrg._id as any).toString();
      progress.completedSteps.push(
        'organization-overview',
        'organization-contact',
        'organization-legal',
      );

      if (planType === 'company') {
        progress.currentStep = 'complex-overview';

        const complexes = await this.complexService.getComplexesByOrganization(
          (existingOrg._id as any).toString(),
        );
        const existingComplex = complexes[0];
        if (existingComplex) {
          progress.stepData.complexId = (existingComplex._id as any).toString();
          progress.completedSteps.push(
            'complex-overview',
            'complex-contact',
            'complex-schedule',
          );
          progress.currentStep = 'clinic-overview';

          const clinics = await this.clinicService.getClinicsByComplex(
            (existingComplex._id as any).toString(),
          );
          const existingClinic = clinics[0];
          if (existingClinic) {
            progress.stepData.clinicId = (existingClinic._id as any).toString();
            progress.completedSteps.push(
              'clinic-overview',
              'clinic-contact',
              'clinic-schedule',
            );
            progress.currentStep = 'completed';
          }
        }
      }
    }

    return progress;
  }

  private async getOrCreateProgress(userId: string): Promise<StepProgress> {
    if (this.stepProgressCache.has(userId)) {
      const cached = this.stepProgressCache.get(userId);
      if (cached) return cached;
    }

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const subscription =
      await this.subscriptionService.getSubscriptionByUser(userId);
    const planType =
      ((subscription?.planId as any)?.name?.toLowerCase() as
        | 'company'
        | 'complex'
        | 'clinic') || 'company';

    const progress = await this.calculateCurrentProgress(userId, planType);
    this.stepProgressCache.set(userId, progress);

    return progress;
  }

  private getStepCounts(planType: string) {
    switch (planType) {
      case 'company':
        return { total: 9 }; // org(3) + complex(3) + clinic(3)
      case 'complex':
        return { total: 6 }; // org(3) + clinic(3)
      case 'clinic':
        return { total: 3 }; // org(3)
      default:
        return { total: 9 };
    }
  }

  // ======== SKIP FUNCTIONALITY WITH ENTITY CHECKING ========

  async skipRemainingSteps(userId: string): Promise<void> {
    try {
      // Check what entities the user already has
      const entitiesStatus = await this.userService.checkUserEntities(userId);

      if (entitiesStatus.needsSetup) {
        console.log(
          `⚠️ User ${userId} still needs setup: ${entitiesStatus.nextStep}`,
        );
        // Mark as skipped but still incomplete
        await this.userModel.findByIdAndUpdate(userId, {
          $set: {
            'onboardingStatus.isSkipped': true,
            'onboardingStatus.skippedAt': new Date(),
            'onboardingStatus.needsCompletetion': true,
          },
        });
      } else {
        console.log(
          `✅ User ${userId} has completed required entities, marking as complete`,
        );
        // User has all required entities, mark as fully completed
        await this.userModel.findByIdAndUpdate(userId, {
          $set: {
            'onboardingStatus.isCompleted': true,
            'onboardingStatus.completedAt': new Date(),
            'onboardingStatus.isSkipped': false,
            'onboardingStatus.skippedAt': new Date(),
          },
        });
      }

      // Clear progress cache
      this.stepProgressCache.delete(userId);

      console.log(`✅ User ${userId} skipped remaining onboarding steps`);
    } catch (error) {
      console.error('Error skipping remaining steps:', error);
      throw new Error('Failed to skip remaining steps');
    }
  }

  async skipCurrentStep(
    userId: string,
  ): Promise<{ message: string; nextStep: string }> {
    try {
      // Check what entities the user already has
      const entitiesStatus = await this.userService.checkUserEntities(userId);

      // If user has completed required setup, redirect to dashboard
      if (!entitiesStatus.needsSetup) {
        await this.skipRemainingSteps(userId);
        return {
          message: 'Setup already complete. Redirecting to dashboard...',
          nextStep: 'dashboard',
        };
      }

      // If user needs setup, determine next logical step
      const progress = await this.getOrCreateProgress(userId);
      const user = await this.userModel.findById(userId).exec();

      if (!user) {
        throw new Error('User not found');
      }

      // Get user's plan type
      const subscription =
        await this.subscriptionService.getSubscriptionByUser(userId);
      const planType =
        ((subscription?.planId as any)?.name?.toLowerCase() as
          | 'company'
          | 'complex'
          | 'clinic') || 'company';

      let nextStep = 'dashboard';
      let message = 'Step skipped. Redirecting to dashboard...';

      // Determine next step based on plan type and what they already have
      if (planType === 'company') {
        if (!entitiesStatus.hasOrganization) {
          // Still need organization
          nextStep = 'organization-overview';
          message = 'Step skipped. Please complete company setup first...';
        } else if (!entitiesStatus.hasComplex) {
          // Has organization, needs complex
          nextStep = 'complex-overview';
          message = 'Company step skipped. Moving to complex setup...';
        } else if (!entitiesStatus.hasClinic) {
          // Has organization and complex, needs clinic
          nextStep = 'clinic-overview';
          message = 'Complex step skipped. Moving to clinic setup...';
        } else {
          // Has all required entities
          nextStep = 'dashboard';
          message = 'All setup complete. Redirecting to dashboard...';
        }
      } else if (planType === 'complex') {
        if (!entitiesStatus.hasOrganization) {
          nextStep = 'organization-overview';
          message = 'Step skipped. Please complete company setup first...';
        } else if (!entitiesStatus.hasClinic) {
          nextStep = 'clinic-overview';
          message = 'Complex step skipped. Moving to clinic setup...';
        } else {
          nextStep = 'dashboard';
          message = 'All setup complete. Redirecting to dashboard...';
        }
      } else {
        // Clinic plan - only needs organization
        if (!entitiesStatus.hasOrganization) {
          nextStep = 'organization-overview';
          message = 'Step skipped. Please complete company setup first...';
        } else {
          nextStep = 'dashboard';
          message = 'Setup complete. Redirecting to dashboard...';
        }
      }

      // If going to dashboard, mark as completed
      if (nextStep === 'dashboard') {
        await this.skipRemainingSteps(userId);
      }

      return { message, nextStep };
    } catch (error) {
      console.error('Error skipping current step:', error);
      throw new Error('Failed to skip current step');
    }
  }

  private async getSharedLogoUrl(
    logoUrl: string,
    entityType: 'organization' | 'complex' | 'clinic',
    currentEntityId: string,
  ): Promise<string> {
    if (!logoUrl || !logoUrl.startsWith('/uploads/')) {
      return logoUrl; // External URLs or empty logos don't need sharing
    }

    try {
      // Check if this logo is already used by parent entities
      const organizations =
        await this.organizationService.getAllOrganizations();
      // Get complexes from all organizations
      const complexes: any[] = [];
      for (const org of organizations) {
        try {
          const orgComplexes =
            await this.complexService.getComplexesByOrganization(
              (org._id as any).toString(),
            );
          complexes.push(...orgComplexes);
        } catch (error) {
          // Continue if organization has no complexes
        }
      }

      // If this is the same logo as organization, reference it
      const orgWithSameLogo = organizations.find(
        (org) => org.logoUrl === logoUrl,
      );
      if (orgWithSameLogo && entityType !== 'organization') {
        console.log(
          `🔗 Using shared logo from organization: ${orgWithSameLogo._id}`,
        );
        return logoUrl; // Keep the same URL to share
      }

      // If this is the same logo as complex, reference it
      const complexWithSameLogo = complexes.find(
        (complex) => complex.logoUrl === logoUrl,
      );
      if (complexWithSameLogo && entityType === 'clinic') {
        console.log(
          `🔗 Using shared logo from complex: ${complexWithSameLogo._id}`,
        );
        return logoUrl; // Keep the same URL to share
      }

      return logoUrl;
    } catch (error) {
      console.error('Error checking shared logo URL:', error);
      return logoUrl; // Fallback to original URL
    }
  }
}
