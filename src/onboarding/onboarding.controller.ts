import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpStatus,
  HttpCode,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { OnboardingService } from './onboarding.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import {
  ValidateOnboardingDto,
  OnboardingProgressDto,
} from './dto/validate-onboarding.dto';
import {
  OrganizationStepDto,
  OrganizationOverviewDto,
  OrganizationContactDto,
  OrganizationLegalDto,
  ComplexStepDto,
  ComplexOverviewDto,
  ComplexContactDto,
  ComplexLegalInfoDto,
  ComplexWorkingHoursDto,
  ClinicStepDto,
  ClinicOverviewDto,
  ClinicContactDto,
  ClinicLegalInfoDto,
  ClinicWorkingHoursDto,
  OnboardingStepProgressDto,
  StepSaveResponseDto,
  StepValidationResultDto,
  StartOnboardingDto,
} from './dto';
import { SkipComplexDto } from './dto/skip-complex.dto';
import { GetInheritedWorkingHoursDto } from './dto/get-inherited-working-hours.dto';
import { ValidatePlanLimitsDto } from './dto/validate-plan-limits.dto';
import { ValidateStepDto } from './dto/validate-step.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OnboardingSkipLogicService } from './services/onboarding-skip-logic.service';
import { OnboardingWorkingHoursService } from './services/onboarding-working-hours.service';
import { OnboardingPlanLimitService } from './services/onboarding-plan-limit.service';
import { OnboardingProgressService } from './services/onboarding-progress.service';
import { ONBOARDING_SWAGGER_EXAMPLES } from './constants/swagger-examples';

@ApiTags('Onboarding')
@Controller('onboarding')
export class OnboardingController {
  constructor(
    private readonly onboardingService: OnboardingService,
    private readonly subscriptionService: SubscriptionService,
    private readonly skipLogicService: OnboardingSkipLogicService,
    private readonly workingHoursService: OnboardingWorkingHoursService,
    private readonly planLimitService: OnboardingPlanLimitService,
    private readonly progressService: OnboardingProgressService,
  ) {}

  // ======== ONBOARDING FLOW ENDPOINTS ========

  /**
   * Start Onboarding Endpoint
   *
   * POST /onboarding/start
   *
   * Initializes the onboarding process for a new user based on their subscription plan.
   * Creates initial progress tracking and determines the first step in the onboarding flow.
   *
   * Requirements: US-1.1, US-1.2, US-1.3, US-1.4
   *
   * @param req - Request object containing authenticated user
   * @param startOnboardingDto - Contains plan type
   * @returns OnboardingStartResult with initial progress and first step
   *
   * Success Response (201):
   * {
   *   success: true,
   *   data: {
   *     userId: string,
   *     subscriptionId: string,
   *     planType: 'company' | 'complex' | 'clinic',
   *     currentStep: string,
   *     progress: StepProgress
   *   },
   *   message: { ar: '...', en: '...' }
   * }
   *
   * Error Response (400/401):
   * {
   *   success: false,
   *   error: {
   *     code: 'ERROR_CODE',
   *     message: { ar: '...', en: '...' },
   *     details: { ... },
   *     timestamp: '...'
   *   }
   * }
   */
  @Post('start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Start onboarding process',
    description: `
Initialize the onboarding process for a new user based on their subscription plan type.

**Plan Types:**
- **Company Plan**: Starts with organization setup (12 steps total)
- **Complex Plan**: Starts with complex setup (9 steps total)
- **Clinic Plan**: Starts with clinic setup (5 steps total)

**Process:**
1. Validates user authentication
2. Creates initial progress tracking
3. Determines first step based on plan type
4. Returns current step and progress information

**First Steps by Plan:**
- Company Plan: organization-overview
- Complex Plan: complex-overview
- Clinic Plan: clinic-overview

**Requirements:** US-1.1, US-1.2, US-1.3, US-1.4
    `,
  })
  @ApiBody({
    type: StartOnboardingDto,
    description: 'Plan type to determine onboarding flow',
    examples: {
      companyPlan: {
        summary: 'Company Plan',
        description:
          'Start onboarding for company plan (organization → complex → clinic)',
        value: ONBOARDING_SWAGGER_EXAMPLES.START_REQUEST,
      },
      complexPlan: {
        summary: 'Complex Plan',
        description: 'Start onboarding for complex plan (complex → clinic)',
        value: {
          planType: 'complex',
        },
      },
      clinicPlan: {
        summary: 'Clinic Plan',
        description: 'Start onboarding for clinic plan (single clinic)',
        value: {
          planType: 'clinic',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Onboarding process started successfully',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.START_SUCCESS,
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error - Invalid plan type',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.UNAUTHORIZED_ERROR,
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User or subscription not found',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.USER_NOT_FOUND,
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  async startOnboarding(
    @Request() req,
    @Body() startOnboardingDto: StartOnboardingDto,
  ) {
    try {
      const userId = req.user.id;
      const { planType } = startOnboardingDto;

      // Determine first step based on plan type
      const firstStepMap = {
        company: 'organization-overview',
        complex: 'complex-overview',
        clinic: 'clinic-overview',
      };

      const totalStepsMap = {
        company: 12,
        complex: 9,
        clinic: 5,
      };

      const currentStep = firstStepMap[planType];
      const totalSteps = totalStepsMap[planType];

      // Initialize progress (this would typically call a service method)
      const progress = {
        completedSteps: [],
        currentStep,
        totalSteps,
        percentComplete: 0,
      };

      return {
        success: true,
        data: {
          userId,
          subscriptionId: req.user.subscriptionId || null,
          planType,
          currentStep,
          progress,
        },
        message: {
          ar: 'تم بدء عملية التسجيل بنجاح',
          en: 'Onboarding process started successfully',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: {
            ar: 'حدث خطأ في الخادم',
            en: 'Internal server error',
          },
          details: error.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  // ======== EXISTING ENDPOINTS ========

  /**
   * Complete Onboarding Endpoint
   *
   * POST /onboarding/complete
   *
   * Completes the entire onboarding process by creating all necessary entities
   * (organization, complex, clinic) based on the user's subscription plan type.
   * This is a legacy endpoint that creates all entities in a single request.
   *
   * **Note:** This endpoint is being deprecated in favor of the step-by-step
   * onboarding flow (organization/overview, complex/overview, clinic/overview, etc.)
   * which provides better user experience and progress tracking.
   *
   * Requirements: US-5.1, US-5.2, US-5.3, US-5.4
   * Business Rules: BZR-26, BZR-28, BZR-29, BZR-30
   *
   * @param completeOnboardingDto - Complete onboarding data for all entities
   * @returns OnboardingCompleteResult with created entities
   *
   * Success Response (201):
   * {
   *   success: true,
   *   data: {
   *     organization: { id, name },
   *     complex: { id, name },
   *     clinic: { id, name },
   *     createdEntities: ['organization', 'complex', 'clinic']
   *   },
   *   message: { ar: '...', en: '...' }
   * }
   *
   * Error Response (400/404/500):
   * {
   *   success: false,
   *   error: {
   *     code: 'ERROR_CODE',
   *     message: { ar: '...', en: '...' },
   *     details: { ... },
   *     timestamp: '...'
   *   }
   * }
   */
  @Post('complete')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Complete onboarding process (Legacy)',
    description: `
Complete the entire onboarding process by creating all necessary entities in a single request.

**⚠️ Legacy Endpoint:** This endpoint is being deprecated in favor of the step-by-step onboarding flow.
New implementations should use the individual step endpoints (organization/overview, complex/overview, etc.)
for better user experience and progress tracking.

**Plan Types:**
- **Company Plan**: Creates organization → complexes → departments → clinics
- **Complex Plan**: Creates complex → departments → clinics  
- **Clinic Plan**: Creates single clinic

**Entity Creation Flow:**

**Company Plan (12 steps):**
1. Organization (name, legal info, contact)
2. Complex (name, departments, contact)
3. Clinic (name, services, contact)
4. Working hours for all entities

**Complex Plan (9 steps):**
1. Complex (name, departments, contact)
2. Clinic (name, services, contact)
3. Working hours for complex and clinic

**Clinic Plan (5 steps):**
1. Clinic (name, services, contact)
2. Working hours for clinic

**Business Rules:**
- BZR-26: Company plan allows maximum 1 organization
- BZR-28: Complex plan allows maximum 1 complex
- BZR-30: Clinic plan allows maximum 1 clinic
- BZR-29: Working hours can be inherited from parent entities
- All entities are validated before creation
- Atomic operation - all entities created or none

**Validation:**
- User must exist and be authenticated
- Subscription must exist and match plan type
- All required fields must be provided
- Entity names must be unique within scope
- License numbers must be valid format
- Contact information must be valid

**Process:**
1. Validates user and subscription
2. Checks plan limits (max entities allowed)
3. Creates entities in hierarchical order
4. Sets up relationships between entities
5. Creates default working hours if not provided
6. Updates user onboarding status
7. Returns created entity IDs

**Requirements:** US-5.1, US-5.2, US-5.3, US-5.4
    `,
  })
  @ApiBody({
    type: CompleteOnboardingDto,
    description:
      'Complete onboarding data including user, subscription, and entity information',
    examples: {
      companyPlan: {
        summary: 'Company Plan - Full Setup',
        description: 'Complete organization with complex and clinic',
        value: {
          userId: '507f1f77bcf86cd799439011',
          subscriptionId: '507f1f77bcf86cd799439012',
          planType: 'company',
          companyPlan: {
            organization: {
              name: 'HealthCorp Medical Group',
              legalName: 'HealthCorp Medical Services Company Ltd.',
              registrationNumber: '1010123456',
              phone: '+966112345678',
              email: 'info@healthcorp.sa',
              address: 'King Fahd Road, Al Olaya District, Riyadh 12211',
              googleLocation: '24.7136,46.6753',
              vatNumber: '300123456789003',
              crNumber: '1010123456',
            },
            complexes: [
              {
                name: 'HealthCorp Riyadh Medical Complex',
                address: 'King Abdulaziz Road, Al Malaz District, Riyadh',
                phone: '+966112234567',
                email: 'riyadh@healthcorp.sa',
                departments: ['Cardiology', 'Pediatrics', 'Orthopedics'],
              },
            ],
            clinics: [
              {
                name: 'Advanced Heart Center',
                address: 'Building A, Floor 3',
                phone: '+966112234501',
                email: 'heartcenter@healthcorp.sa',
                licenseNumber: 'LC-001-2023',
                specialization: 'Cardiology',
                departmentId: 'cardiology-dept-id',
              },
            ],
          },
        },
      },
      complexPlan: {
        summary: 'Complex Plan - Medical Complex',
        description: 'Medical complex with departments and clinics',
        value: {
          userId: '507f1f77bcf86cd799439013',
          subscriptionId: '507f1f77bcf86cd799439014',
          planType: 'complex',
          complexPlan: {
            complex: {
              name: 'Al-Zahra Medical Complex',
              address: 'Al-Madinah Road, Al Aziziyah District, Jeddah',
              phone: '+966126789012',
              email: 'info@alzahra-medical.com',
              departments: ['Obstetrics', 'Gynecology', 'Pediatrics'],
            },
            clinics: [
              {
                name: "Women's Wellness Center",
                address: 'Building 1, Ground Floor',
                phone: '+966126789013',
                email: 'womens-wellness@alzahra-medical.com',
                licenseNumber: 'LC-WW-2023-001',
                specialization: 'Obstetrics & Gynecology',
              },
            ],
          },
        },
      },
      clinicPlan: {
        summary: 'Clinic Plan - Standalone Clinic',
        description: 'Single standalone clinic',
        value: {
          userId: '507f1f77bcf86cd799439015',
          subscriptionId: '507f1f77bcf86cd799439016',
          planType: 'clinic',
          clinicPlan: {
            clinic: {
              name: 'Bright Smile Dental Clinic',
              address: 'Prince Sultan Street, Al Khobar',
              phone: '+966138901234',
              email: 'info@brightsmile-dental.sa',
              licenseNumber: 'DL-BS-2023-001',
              specialization: 'General and Cosmetic Dentistry',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Onboarding completed successfully - All entities created',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.COMPLETE_SUCCESS,
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error or business rule violation',
    schema: {
      examples: {
        validation: {
          summary: 'Validation Error',
          description: 'Invalid input data',
          value: ONBOARDING_SWAGGER_EXAMPLES.VALIDATION_ERROR,
        },
        organizationLimit: {
          summary: 'Organization Limit Reached',
          description: 'Company plan allows maximum 1 organization',
          value: ONBOARDING_SWAGGER_EXAMPLES.ORGANIZATION_ALREADY_EXISTS,
        },
        complexLimit: {
          summary: 'Complex Limit Reached',
          description: 'Complex plan allows maximum 1 complex',
          value: ONBOARDING_SWAGGER_EXAMPLES.COMPLEX_ALREADY_EXISTS,
        },
        clinicLimit: {
          summary: 'Clinic Limit Reached',
          description: 'Clinic plan allows maximum 1 clinic',
          value: ONBOARDING_SWAGGER_EXAMPLES.CLINIC_ALREADY_EXISTS,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.UNAUTHORIZED_ERROR,
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User or subscription not found',
    schema: {
      examples: {
        userNotFound: {
          summary: 'User Not Found',
          description: 'User ID does not exist',
          value: ONBOARDING_SWAGGER_EXAMPLES.USER_NOT_FOUND,
        },
        subscriptionNotFound: {
          summary: 'Subscription Not Found',
          description: 'Subscription ID does not exist',
          value: ONBOARDING_SWAGGER_EXAMPLES.SUBSCRIPTION_NOT_FOUND,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error during onboarding',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  async completeOnboarding(
    @Body() completeOnboardingDto: CompleteOnboardingDto,
  ) {
    try {
      const result = await this.onboardingService.completeOnboarding(
        completeOnboardingDto,
      );

      return {
        success: true,
        message: 'Onboarding completed successfully',
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Onboarding failed',
        error: error.message,
      };
    }
  }

  @Get('plans')
  async getAvailablePlans() {
    try {
      const plans = await this.subscriptionService.getAllSubscriptionPlans();

      return {
        success: true,
        message: 'Available plans retrieved successfully',
        data: plans,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve plans',
        error: error.message,
      };
    }
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateOnboardingData(
    @Body() validateOnboardingDto: ValidateOnboardingDto,
  ) {
    try {
      const validation = await this.onboardingService.validateOnboardingData(
        validateOnboardingDto,
      );

      return {
        success: validation.isValid,
        message: validation.isValid ? 'Validation passed' : 'Validation failed',
        data: {
          isValid: validation.isValid,
          errors: validation.errors,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Validation error',
        error: error.message,
      };
    }
  }

  @Get('status')
  async getOnboardingStatus(@Query('userId') userId: string) {
    try {
      if (!userId) {
        return {
          success: false,
          message: 'User ID is required',
          error: 'Missing user ID parameter',
        };
      }

      const status = await this.onboardingService.getOnboardingStatus(userId);

      return {
        success: true,
        message: 'Onboarding status retrieved successfully',
        data: status,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve onboarding status',
        error: error.message,
      };
    }
  }

  @Get('progress/:userId')
  async getOnboardingProgress(@Param('userId') userId: string) {
    try {
      const progress =
        await this.onboardingService.getOnboardingProgress(userId);

      return {
        success: true,
        message: progress ? 'Progress found' : 'No progress found',
        data: progress,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve progress',
        error: error.message,
      };
    }
  }

  // ======== NEW STEP-BY-STEP ENDPOINTS ========

  /**
   * Get Onboarding Progress Endpoint
   *
   * GET /onboarding/progress
   *
   * Retrieves the current onboarding progress for the authenticated user.
   * Returns information about completed steps, current step, and overall progress.
   *
   * Requirements: US-1.1, US-1.2, US-1.3, US-1.4, US-1.5
   *
   * @param req - Request object containing authenticated user
   * @returns OnboardingProgress with current state and completion status
   *
   * Success Response (200):
   * {
   *   success: true,
   *   data: {
   *     userId: string,
   *     subscriptionId: string,
   *     planType: 'company' | 'complex' | 'clinic',
   *     currentStep: string,
   *     completedSteps: string[],
   *     totalSteps: number,
   *     percentComplete: number,
   *     canSkipComplex: boolean,
   *     entities: { organizationId, complexId, clinicId }
   *   },
   *   message: { ar: '...', en: '...' },
   *   canProceed: true
   * }
   *
   * Error Response (401/404):
   * {
   *   success: false,
   *   message: 'Failed to retrieve progress',
   *   data: null,
   *   canProceed: false
   * }
   */
  @Get('progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get current onboarding progress',
    description: `
Retrieve the current onboarding progress for the authenticated user.

**Returns:**
- Current step in the onboarding flow
- List of completed steps
- Overall progress percentage
- Entity IDs (organization, complex, clinic) if created
- Whether complex can be skipped (company plan only)

**Progress Tracking:**
- **Company Plan**: 12 total steps (organization → complex → clinic)
- **Complex Plan**: 9 total steps (complex → clinic)
- **Clinic Plan**: 5 total steps (clinic only)

**Use Cases:**
- Resume onboarding from where user left off
- Display progress indicator in UI
- Determine next step in the flow
- Check if user can skip complex setup

**Requirements:** US-1.1, US-1.2, US-1.3, US-1.4, US-1.5
    `,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Progress retrieved successfully',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.PROGRESS_SUCCESS,
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.UNAUTHORIZED_ERROR,
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Onboarding progress not found',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.PROGRESS_NOT_FOUND,
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  async getCurrentProgress(@Request() req): Promise<StepSaveResponseDto> {
    try {
      const userId = req.user.id;
      const progress = await this.onboardingService.getStepProgress(userId);

      return {
        success: true,
        message: 'Progress retrieved successfully',
        data: progress,
        canProceed: true,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve progress',
        data: null,
        canProceed: false,
      };
    }
  }

  @Get('skip-to-dashboard')
  @UseGuards(JwtAuthGuard)
  async skipToDashboard(@Request() req): Promise<StepSaveResponseDto> {
    try {
      const userId = req.user.id;
      await this.onboardingService.markAsSkipped(userId);

      return {
        success: true,
        message: 'Setup saved as incomplete, redirecting to dashboard',
        nextStep: 'dashboard',
        canProceed: true,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to skip to dashboard',
        canProceed: false,
      };
    }
  }

  // ======== ORGANIZATION STEP ENDPOINTS (Company Plan) ========

  /**
   * Save Organization Overview Endpoint
   *
   * POST /onboarding/organization/overview
   *
   * First step in company plan onboarding. Creates or updates the organization entity
   * with basic information including name, legal details, and business profile.
   *
   * Requirements: US-2.1, US-2.2, US-2.3
   * Business Rules: BZR-26 (Company plan allows maximum 1 organization)
   *
   * @param req - Request object containing authenticated user
   * @param organizationOverviewDto - Organization basic information
   * @returns StepSaveResponseDto with created organization and next step
   */
  @Post('organization/overview')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Save organization overview (Company Plan - Step 1/3)',
    description: `
Save basic organization information for company plan onboarding.

**Company Plan Flow:**
1. **Organization Overview** ← You are here
2. Organization Contact
3. Organization Legal
4. Complex Setup (or skip)
5. Clinic Setup (or skip)

**Fields:**
- **Required**: name, legalName, registrationNumber
- **Optional**: logoUrl, website, yearEstablished, mission, vision, overview, goals, ceoName

**Business Rules:**
- BZR-26: Company plan allows maximum 1 organization
- Organization name must be unique within the system
- Registration number must be valid format

**Process:**
1. Validates user authentication and plan type
2. Checks if organization already exists (plan limit)
3. Creates new organization entity
4. Updates onboarding progress
5. Returns organization ID and next step

**Next Step:** organization-contact

**Requirements:** US-2.1, US-2.2, US-2.3
    `,
  })
  @ApiBody({
    type: OrganizationOverviewDto,
    description: 'Organization basic information',
    examples: {
      complete: {
        summary: 'Complete Organization Info',
        description: 'Full organization details with all optional fields',
        value: ONBOARDING_SWAGGER_EXAMPLES.ORGANIZATION_OVERVIEW_REQUEST,
      },
      minimal: {
        summary: 'Minimal Required Info',
        description: 'Only required fields for quick setup',
        value: {
          name: 'HealthCorp Medical Group',
          legalName: 'HealthCorp Medical Services Company Ltd.',
          registrationNumber: '1010123456',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Organization overview saved successfully',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.ORGANIZATION_OVERVIEW_SUCCESS,
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error or plan limit reached',
    schema: {
      examples: {
        validation: {
          summary: 'Validation Error',
          value: ONBOARDING_SWAGGER_EXAMPLES.VALIDATION_ERROR,
        },
        planLimit: {
          summary: 'Plan Limit Reached',
          value: ONBOARDING_SWAGGER_EXAMPLES.ORGANIZATION_ALREADY_EXISTS,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.UNAUTHORIZED_ERROR,
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  async saveOrganizationOverview(
    @Request() req,
    @Body() organizationOverviewDto: OrganizationOverviewDto,
  ): Promise<StepSaveResponseDto> {
    try {
      const userId = req.user.id;
      const result = await this.onboardingService.saveOrganizationOverview(
        userId,
        organizationOverviewDto,
      );

      return {
        success: true,
        message: 'Organization overview saved successfully',
        data: result.data,
        entityId: result.entityId,
        nextStep: result.nextStep,
        canProceed: result.canProceed,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to save organization overview',
        data: null,
        canProceed: false,
      };
    }
  }

  /**
   * Save Organization Contact Endpoint
   *
   * POST /onboarding/organization/contact
   *
   * Second step in company plan onboarding. Saves organization contact information
   * including phone numbers, email, address, emergency contact, and social media links.
   *
   * Requirements: US-2.1, US-2.2, US-2.3
   *
   * @param req - Request object containing authenticated user
   * @param organizationContactDto - Organization contact information
   * @returns StepSaveResponseDto with updated organization and next step
   */
  @Post('organization/contact')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Save organization contact info (Company Plan - Step 2/3)',
    description: `
Save organization contact information for company plan onboarding.

**Company Plan Flow:**
1. Organization Overview
2. **Organization Contact** ← You are here
3. Organization Legal
4. Complex Setup (or skip)
5. Clinic Setup (or skip)

**Contact Information:**
- **Phone Numbers**: Primary and secondary contact numbers with country codes
- **Email**: Organization primary email address
- **Address**: Complete address with Google Maps location
- **Emergency Contact**: Emergency contact person and phone
- **Social Media**: Facebook, Twitter, Instagram, LinkedIn links

**Validation:**
- Email must be valid format
- Phone numbers must include country code
- Address must include city and country
- Google location should be in "latitude,longitude" format

**Process:**
1. Validates organization exists (from step 1)
2. Updates organization with contact information
3. Updates onboarding progress
4. Returns next step

**Next Step:** organization-legal

**Requirements:** US-2.1, US-2.2, US-2.3
    `,
  })
  @ApiBody({
    type: OrganizationContactDto,
    description: 'Organization contact information',
    examples: {
      complete: {
        summary: 'Complete Contact Info',
        description: 'Full contact details with all fields',
        value: ONBOARDING_SWAGGER_EXAMPLES.ORGANIZATION_CONTACT_REQUEST,
      },
      minimal: {
        summary: 'Minimal Contact Info',
        description: 'Essential contact information only',
        value: {
          phoneNumbers: [
            {
              type: 'primary',
              number: '+966112345678',
              countryCode: '+966',
            },
          ],
          email: 'info@healthcorp.sa',
          address: {
            street: 'King Fahd Road',
            city: 'Riyadh',
            country: 'Saudi Arabia',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Organization contact information saved successfully',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.ORGANIZATION_CONTACT_SUCCESS,
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.UNAUTHORIZED_ERROR,
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found (must complete step 1 first)',
    schema: {
      example: {
        success: false,
        error: {
          code: 'ONBOARDING_007',
          message: {
            ar: 'الشركة غير موجودة',
            en: 'Organization not found',
          },
          details: {
            step: 'organization-contact',
            requiredStep: 'organization-overview',
          },
          timestamp: '2026-02-07T10:30:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  async saveOrganizationContact(
    @Request() req,
    @Body() organizationContactDto: OrganizationContactDto,
  ): Promise<StepSaveResponseDto> {
    try {
      const userId = req.user.id;
      const result = await this.onboardingService.saveOrganizationContact(
        userId,
        organizationContactDto,
      );

      return {
        success: true,
        message: 'Organization contact information saved successfully',
        data: result,
        nextStep: 'organization-legal',
        canProceed: true,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to save organization contact information',
        canProceed: false,
      };
    }
  }

  /**
   * Save Organization Legal Information Endpoint
   *
   * POST /onboarding/organization/legal
   *
   * Third and final step in organization setup for company plan. Saves legal and
   * compliance information including VAT number, commercial registration, and policy URLs.
   *
   * Requirements: US-2.1, US-2.2, US-2.3
   *
   * @param req - Request object containing authenticated user
   * @param organizationLegalDto - Organization legal information
   * @returns StepSaveResponseDto with updated organization and next step
   */
  @Post('organization/legal')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Save organization legal info (Company Plan - Step 3/3)',
    description: `
Save organization legal and compliance information for company plan onboarding.

**Company Plan Flow:**
1. Organization Overview
2. Organization Contact
3. **Organization Legal** ← You are here
4. Complex Setup (or skip)
5. Clinic Setup (or skip)

**Legal Information:**
- **VAT Number**: Tax registration number (15 digits for Saudi Arabia)
- **CR Number**: Commercial registration number
- **Terms & Conditions URL**: Link to organization's terms of service
- **Privacy Policy URL**: Link to organization's privacy policy

**Validation:**
- VAT number must be valid format (15 digits for KSA)
- CR number must be valid format
- URLs must be valid HTTPS links
- All fields are optional but recommended for compliance

**Process:**
1. Validates organization exists (from previous steps)
2. Updates organization with legal information
3. Marks organization setup as complete
4. Updates onboarding progress
5. Returns next step (complex-overview or dashboard)

**Next Step:** 
- Company Plan: complex-overview (can be skipped)
- After completion: User can proceed to complex setup or skip to dashboard

**Requirements:** US-2.1, US-2.2, US-2.3
    `,
  })
  @ApiBody({
    type: OrganizationLegalDto,
    description: 'Organization legal and compliance information',
    examples: {
      complete: {
        summary: 'Complete Legal Info',
        description: 'Full legal information with all fields',
        value: ONBOARDING_SWAGGER_EXAMPLES.ORGANIZATION_LEGAL_REQUEST,
      },
      minimal: {
        summary: 'Minimal Legal Info',
        description: 'Basic legal information',
        value: {
          vatNumber: '300123456789003',
          crNumber: '1010123456',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Organization legal information saved successfully',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.ORGANIZATION_LEGAL_SUCCESS,
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.UNAUTHORIZED_ERROR,
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found (must complete previous steps first)',
    schema: {
      example: {
        success: false,
        error: {
          code: 'ONBOARDING_007',
          message: {
            ar: 'الشركة غير موجودة',
            en: 'Organization not found',
          },
          details: {
            step: 'organization-legal',
            requiredSteps: ['organization-overview', 'organization-contact'],
          },
          timestamp: '2026-02-07T10:30:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  async saveOrganizationLegal(
    @Request() req,
    @Body() organizationLegalDto: OrganizationLegalDto,
  ): Promise<StepSaveResponseDto> {
    try {
      const userId = req.user.id;
      const result = await this.onboardingService.saveOrganizationLegal(
        userId,
        organizationLegalDto,
      );

      return {
        success: true,
        message: 'Organization legal information saved successfully',
        data: result,
        nextStep: 'complex-overview',
        canProceed: true,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to save organization legal information',
        canProceed: false,
      };
    }
  }

  /**
   * Complete Organization Setup Endpoint
   *
   * POST /onboarding/organization/complete
   *
   * Finalizes the organization setup and marks it as complete. This endpoint is called
   * after all organization steps are completed to transition to the next phase.
   *
   * Requirements: US-2.1, US-2.2, US-2.3
   *
   * @param req - Request object containing authenticated user
   * @returns StepSaveResponseDto with completion status and next step
   */
  @Post('organization/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete organization setup (Company Plan)',
    description: `
Finalize organization setup and proceed to next phase of onboarding.

**Purpose:**
- Marks organization setup as complete
- Validates all required organization information is present
- Determines next step based on plan type
- Updates onboarding progress to next phase

**Prerequisites:**
- Organization overview must be saved
- Organization contact must be saved
- Organization legal must be saved

**Process:**
1. Validates all organization steps are complete
2. Marks organization as finalized
3. Updates user's onboarding progress
4. Determines next step based on plan type

**Next Steps:**
- **Company Plan**: complex-overview (user can also skip to dashboard)
- **Other Plans**: dashboard (organization setup not applicable)

**Use Cases:**
- User completes all organization steps and wants to proceed
- User wants to finalize organization before setting up complex
- System needs to validate organization completion before allowing complex setup

**Requirements:** US-2.1, US-2.2, US-2.3
    `,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Organization setup completed successfully',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.ORGANIZATION_COMPLETE_SUCCESS,
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Organization setup incomplete - missing required steps',
    schema: {
      example: {
        success: false,
        error: {
          code: 'ONBOARDING_010',
          message: {
            ar: 'يجب إكمال جميع خطوات الشركة قبل المتابعة',
            en: 'Must complete all organization steps before proceeding',
          },
          details: {
            completedSteps: ['organization-overview', 'organization-contact'],
            missingSteps: ['organization-legal'],
          },
          timestamp: '2026-02-07T10:30:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.UNAUTHORIZED_ERROR,
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
    schema: {
      example: {
        success: false,
        error: {
          code: 'ONBOARDING_007',
          message: {
            ar: 'الشركة غير موجودة',
            en: 'Organization not found',
          },
          timestamp: '2026-02-07T10:30:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  async completeOrganizationSetup(
    @Request() req,
  ): Promise<StepSaveResponseDto> {
    try {
      const userId = req.user.id;
      const result =
        await this.onboardingService.completeOrganizationSetup(userId);

      return {
        success: true,
        message: 'Organization setup completed successfully',
        data: result,
        nextStep:
          result.planType === 'company' ? 'complex-overview' : 'dashboard',
        canProceed: true,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to complete organization setup',
        canProceed: false,
      };
    }
  }

  // ======== COMPLEX STEP ENDPOINTS (Company Plan & Complex Plan) ========

  /**
   * Save Complex Overview Endpoint
   *
   * POST /onboarding/complex/overview
   *
   * First step in complex setup for both company and complex plans. Creates or updates
   * the medical complex entity with basic information, departments, and inheritance settings.
   *
   * Requirements: US-3.1, US-3.2, US-3.3
   * Business Rules: BZR-28 (Complex plan allows maximum 1 complex)
   *
   * @param req - Request object containing authenticated user
   * @param complexOverviewDto - Complex basic information and department setup
   * @returns StepSaveResponseDto with created complex and next step
   */
  @Post('complex/overview')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Save complex overview (Company/Complex Plan - Step 1/4)',
    description: `
Save basic medical complex information for company or complex plan onboarding.

**Plan Flows:**

**Company Plan Flow:**
1. Organization Setup (3 steps)
2. **Complex Overview** ← You are here (Step 4/12)
3. Complex Contact
4. Complex Legal
5. Complex Working Hours
6. Clinic Setup (5 steps)

**Complex Plan Flow:**
1. **Complex Overview** ← You are here (Step 1/9)
2. Complex Contact
3. Complex Legal
4. Complex Working Hours
5. Clinic Setup (5 steps)

**Fields:**
- **Required**: name
- **Optional**: managerName, logoUrl, website, yearEstablished, mission, vision, overview, goals, ceoName
- **Departments**: departmentIds (existing), newDepartmentNames (create new)
- **Inheritance**: inheritanceSettings (control data inheritance from organization)

**Department Management:**
- Assign existing departments via departmentIds
- Create new departments via newDepartmentNames
- Departments can be added/modified later

**Inheritance Settings (Company Plan Only):**
- inheritWorkingHours: Inherit working hours from organization
- inheritContactInfo: Inherit contact information from organization
- inheritLegalInfo: Inherit legal information from organization

**Business Rules:**
- BZR-28: Complex plan allows maximum 1 complex
- Company plan can have multiple complexes
- Complex name must be unique within organization
- At least one department recommended but not required

**Process:**
1. Validates user authentication and plan type
2. Checks plan limits (complex plan: max 1)
3. Creates new complex entity
4. Creates or assigns departments
5. Applies inheritance settings if specified
6. Updates onboarding progress
7. Returns complex ID and next step

**Next Step:** complex-contact

**Requirements:** US-3.1, US-3.2, US-3.3
    `,
  })
  @ApiBody({
    type: ComplexOverviewDto,
    description: 'Complex basic information and department setup',
    examples: {
      complete: {
        summary: 'Complete Complex Info',
        description: 'Full complex details with departments and inheritance',
        value: ONBOARDING_SWAGGER_EXAMPLES.COMPLEX_OVERVIEW_REQUEST,
      },
      minimal: {
        summary: 'Minimal Required Info',
        description: 'Only required fields for quick setup',
        value: {
          name: 'Al-Zahra Medical Complex',
        },
      },
      withDepartments: {
        summary: 'With New Departments',
        description: 'Complex with new departments to create',
        value: {
          name: 'City Medical Complex',
          managerName: 'Dr. Sarah Ahmed',
          newDepartmentNames: ['Emergency', 'Surgery', 'Radiology'],
        },
      },
      withInheritance: {
        summary: 'With Inheritance (Company Plan)',
        description: 'Complex inheriting data from organization',
        value: {
          name: 'Branch Medical Complex',
          inheritanceSettings: {
            inheritWorkingHours: true,
            inheritContactInfo: true,
            inheritLegalInfo: false,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Complex overview saved successfully',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.COMPLEX_OVERVIEW_SUCCESS,
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error or plan limit reached',
    schema: {
      examples: {
        validation: {
          summary: 'Validation Error',
          value: ONBOARDING_SWAGGER_EXAMPLES.VALIDATION_ERROR,
        },
        planLimit: {
          summary: 'Plan Limit Reached',
          value: ONBOARDING_SWAGGER_EXAMPLES.COMPLEX_ALREADY_EXISTS,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.UNAUTHORIZED_ERROR,
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found (company plan only)',
    schema: {
      example: {
        success: false,
        error: {
          code: 'ONBOARDING_007',
          message: {
            ar: 'الشركة غير موجودة',
            en: 'Organization not found',
          },
          details: {
            step: 'complex-overview',
            requiredStep: 'organization-legal',
            planType: 'company',
          },
          timestamp: '2026-02-07T10:30:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  async saveComplexOverview(
    @Request() req,
    @Body() complexOverviewDto: ComplexOverviewDto,
  ): Promise<StepSaveResponseDto> {
    try {
      const userId = req.user.id;
      const result = await this.onboardingService.saveComplexOverview(
        userId,
        complexOverviewDto,
      );

      return {
        success: true,
        message: 'Complex overview saved successfully',
        data: result.data,
        entityId: result.entityId,
        nextStep: result.nextStep,
        canProceed: result.canProceed,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to save complex overview',
        canProceed: false,
      };
    }
  }

  @Post('complex/contact')
  @UseGuards(JwtAuthGuard)
  async saveComplexContact(
    @Request() req,
    @Body() complexContactDto: ComplexContactDto,
  ): Promise<StepSaveResponseDto> {
    try {
      const userId = req.user.id;
      const result = await this.onboardingService.saveComplexContact(
        userId,
        complexContactDto,
      );

      return {
        success: true,
        message: 'Complex contact information saved successfully',
        data: result.data,
        entityId: result.entityId,
        nextStep: result.nextStep,
        canProceed: result.canProceed,
      };
    } catch (error) {
      console.error('❌ Complex contact save failed:', error);
      return {
        success: false,
        message: error.message || 'Failed to save complex contact information',
        canProceed: false,
      };
    }
  }

  @Post('complex/legal')
  @UseGuards(JwtAuthGuard)
  async saveComplexLegal(
    @Request() req,
    @Body() complexLegalDto: ComplexLegalInfoDto,
  ): Promise<StepSaveResponseDto> {
    try {
      const userId = req.user.id;
      const result = await this.onboardingService.saveComplexLegal(
        userId,
        complexLegalDto,
      );

      return {
        success: true,
        message: 'Complex legal information saved successfully',
        data: result,
        nextStep: result.nextStep,
        canProceed: true,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to save complex legal information',
        canProceed: false,
      };
    }
  }

  /**
   * Save Complex Schedule (Working Hours) Endpoint
   *
   * POST /onboarding/complex/schedule
   *
   * Fourth and final step in complex setup. Saves working hours schedule for the complex.
   * Working hours define when the complex is open for operations and can be inherited by clinics.
   *
   * Requirements: US-3.1, US-3.2, US-3.3, US-3.4
   * Business Rules: BZR-29 (Working hours inheritance from parent entities)
   *
   * @param req - Request object containing authenticated user
   * @param workingHoursDto - Array of working hours for each day of the week
   * @returns StepSaveResponseDto with saved schedule and next step
   */
  @Post('complex/schedule')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Save complex working hours schedule (Complex Plan - Step 4/4)',
    description: `
Save working hours schedule for the medical complex during onboarding.

**Company Plan Flow:**
1. Organization Setup (3 steps)
2. Complex Overview
3. Complex Contact
4. Complex Legal
5. **Complex Schedule** ← You are here
6. Clinic Setup (or skip)

**Complex Plan Flow:**
1. Complex Overview
2. Complex Contact
3. Complex Legal
4. **Complex Schedule** ← You are here
5. Clinic Setup

**Working Hours Configuration:**
- Define operating hours for each day of the week
- Set break times for lunch or prayer breaks
- Mark inactive days (e.g., Sunday closed)
- Support for 24-hour format (HH:MM)

**Fields Per Day:**
- **dayOfWeek**: monday, tuesday, wednesday, thursday, friday, saturday, sunday
- **openingTime**: Opening time in HH:MM format (e.g., "08:00")
- **closingTime**: Closing time in HH:MM format (e.g., "20:00")
- **isActive**: Whether the complex is open on this day
- **breakStartTime**: Optional break start time (e.g., "12:00")
- **breakEndTime**: Optional break end time (e.g., "13:00")

**Validation Rules:**
- Opening time must be before closing time
- Break times must be within opening hours
- Break start must be before break end
- All times must be in HH:MM format
- All 7 days of the week must be provided

**Inheritance (BZR-29):**
- Clinics within this complex can inherit these working hours
- Inherited hours can be modified by individual clinics
- Provides consistency across the complex

**Process:**
1. Validates complex exists (from previous steps)
2. Validates working hours format and logic
3. Creates working hours records for the complex
4. Updates onboarding progress
5. Returns next step (clinic-overview or dashboard)

**Next Step:** 
- Company/Complex Plan: clinic-overview
- If skipping clinic: dashboard

**Requirements:** US-3.1, US-3.2, US-3.3, US-3.4
**Business Rules:** BZR-29
    `,
  })
  @ApiBody({
    type: [ComplexWorkingHoursDto],
    description:
      'Array of working hours for each day of the week (7 days required)',
    examples: {
      fullWeek: {
        summary: 'Full Week Schedule',
        description: 'Complete working hours for all 7 days with breaks',
        value: ONBOARDING_SWAGGER_EXAMPLES.COMPLEX_SCHEDULE_REQUEST,
      },
      weekdaysOnly: {
        summary: 'Weekdays Only',
        description: 'Open Monday-Saturday, closed Sunday',
        value: {
          workingHours: [
            {
              dayOfWeek: 'monday',
              openingTime: '08:00',
              closingTime: '20:00',
              isActive: true,
              breakStartTime: '12:00',
              breakEndTime: '13:00',
            },
            {
              dayOfWeek: 'tuesday',
              openingTime: '08:00',
              closingTime: '20:00',
              isActive: true,
              breakStartTime: '12:00',
              breakEndTime: '13:00',
            },
            {
              dayOfWeek: 'wednesday',
              openingTime: '08:00',
              closingTime: '20:00',
              isActive: true,
              breakStartTime: '12:00',
              breakEndTime: '13:00',
            },
            {
              dayOfWeek: 'thursday',
              openingTime: '08:00',
              closingTime: '20:00',
              isActive: true,
              breakStartTime: '12:00',
              breakEndTime: '13:00',
            },
            {
              dayOfWeek: 'friday',
              openingTime: '08:00',
              closingTime: '20:00',
              isActive: true,
              breakStartTime: '12:00',
              breakEndTime: '13:00',
            },
            {
              dayOfWeek: 'saturday',
              openingTime: '08:00',
              closingTime: '14:00',
              isActive: true,
              breakStartTime: null,
              breakEndTime: null,
            },
            {
              dayOfWeek: 'sunday',
              openingTime: null,
              closingTime: null,
              isActive: false,
              breakStartTime: null,
              breakEndTime: null,
            },
          ],
        },
      },
      noBreaks: {
        summary: 'No Break Times',
        description: 'Working hours without break times',
        value: {
          workingHours: [
            {
              dayOfWeek: 'monday',
              openingTime: '08:00',
              closingTime: '20:00',
              isActive: true,
              breakStartTime: null,
              breakEndTime: null,
            },
            {
              dayOfWeek: 'tuesday',
              openingTime: '08:00',
              closingTime: '20:00',
              isActive: true,
              breakStartTime: null,
              breakEndTime: null,
            },
            {
              dayOfWeek: 'wednesday',
              openingTime: '08:00',
              closingTime: '20:00',
              isActive: true,
              breakStartTime: null,
              breakEndTime: null,
            },
            {
              dayOfWeek: 'thursday',
              openingTime: '08:00',
              closingTime: '20:00',
              isActive: true,
              breakStartTime: null,
              breakEndTime: null,
            },
            {
              dayOfWeek: 'friday',
              openingTime: '08:00',
              closingTime: '20:00',
              isActive: true,
              breakStartTime: null,
              breakEndTime: null,
            },
            {
              dayOfWeek: 'saturday',
              openingTime: '08:00',
              closingTime: '20:00',
              isActive: true,
              breakStartTime: null,
              breakEndTime: null,
            },
            {
              dayOfWeek: 'sunday',
              openingTime: null,
              closingTime: null,
              isActive: false,
              breakStartTime: null,
              breakEndTime: null,
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Complex schedule saved successfully',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.COMPLEX_SCHEDULE_SUCCESS,
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error - Invalid working hours format or logic',
    schema: {
      examples: {
        invalidTime: {
          summary: 'Invalid Time Format',
          value: {
            success: false,
            error: {
              code: 'ONBOARDING_009',
              message: {
                ar: 'صيغة الوقت غير صالحة',
                en: 'Invalid time format',
              },
              details: {
                field: 'workingHours[0].openingTime',
                constraint: 'Must be in HH:MM format',
                value: '8:00',
              },
              timestamp: '2026-02-07T10:30:00.000Z',
            },
          },
        },
        invalidLogic: {
          summary: 'Invalid Time Logic',
          value: {
            success: false,
            error: {
              code: 'ONBOARDING_009',
              message: {
                ar: 'وقت الإغلاق يجب أن يكون بعد وقت الفتح',
                en: 'Closing time must be after opening time',
              },
              details: {
                field: 'workingHours[0]',
                openingTime: '20:00',
                closingTime: '08:00',
              },
              timestamp: '2026-02-07T10:30:00.000Z',
            },
          },
        },
        missingDays: {
          summary: 'Missing Days',
          value: {
            success: false,
            error: {
              code: 'ONBOARDING_009',
              message: {
                ar: 'يجب توفير جميع أيام الأسبوع السبعة',
                en: 'All 7 days of the week must be provided',
              },
              details: {
                providedDays: 5,
                requiredDays: 7,
              },
              timestamp: '2026-02-07T10:30:00.000Z',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.UNAUTHORIZED_ERROR,
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Complex not found (must complete previous steps first)',
    schema: {
      example: {
        success: false,
        error: {
          code: 'ONBOARDING_007',
          message: {
            ar: 'المجمع غير موجود',
            en: 'Complex not found',
          },
          details: {
            step: 'complex-schedule',
            requiredSteps: [
              'complex-overview',
              'complex-contact',
              'complex-legal',
            ],
          },
          timestamp: '2026-02-07T10:30:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @Post('complex/schedule')
  @UseGuards(JwtAuthGuard)
  async saveComplexSchedule(
    @Request() req,
    @Body() workingHoursDto: ComplexWorkingHoursDto[],
  ): Promise<StepSaveResponseDto> {
    try {
      const userId = req.user.id;
      const result = await this.onboardingService.saveComplexSchedule(
        userId,
        workingHoursDto,
      );

      return {
        success: true,
        message: 'Complex schedule saved successfully',
        data: result,
        nextStep: 'clinic-overview',
        canProceed: true,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to save complex schedule',
        canProceed: false,
      };
    }
  }

  @Post('complex/complete')
  @UseGuards(JwtAuthGuard)
  async completeComplexSetup(@Request() req): Promise<StepSaveResponseDto> {
    try {
      const userId = req.user.id;
      const result = await this.onboardingService.completeComplexSetup(userId);

      return {
        success: true,
        message: 'Complex setup completed successfully',
        data: result,
        nextStep: result.hasMoreSteps ? 'clinic-overview' : 'dashboard',
        canProceed: true,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to complete complex setup',
        canProceed: false,
      };
    }
  }

  // ======== CLINIC STEP ENDPOINTS ========

  /**
   * Save Clinic Overview Endpoint
   *
   * POST /onboarding/clinic/overview
   *
   * First step in clinic setup for all plan types. Creates or updates the clinic entity
   * with basic information including name, specialization, and business profile.
   *
   * Requirements: US-3.1, US-3.2, US-3.3
   * Business Rules: BZR-30 (Clinic plan allows maximum 1 clinic)
   *
   * @param req - Request object containing authenticated user
   * @param clinicOverviewDto - Clinic basic information
   * @returns StepSaveResponseDto with created clinic and next step
   */
  @Post('clinic/overview')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Save clinic overview (All Plans - Clinic Step 1/5)',
    description: `
Save basic clinic information for onboarding process.

**Plan-Specific Flows:**

**Company Plan (Step 7/12):**
1. Organization Setup (3 steps)
2. Complex Setup (4 steps)
3. **Clinic Overview** ← You are here
4. Clinic Contact
5. Clinic Services
6. Clinic Legal
7. Clinic Schedule

**Complex Plan (Step 5/9):**
1. Complex Setup (4 steps)
2. **Clinic Overview** ← You are here
3. Clinic Contact
4. Clinic Services
5. Clinic Legal
6. Clinic Schedule

**Clinic Plan (Step 1/5):**
1. **Clinic Overview** ← You are here
2. Clinic Contact
3. Clinic Services
4. Clinic Legal
5. Clinic Schedule

**Fields:**
- **Required**: name
- **Optional**: headDoctorName, specialization, licenseNumber, pin, logoUrl, website, 
  complexDepartmentId, yearEstablished, mission, vision, overview, goals, ceoName, services

**Business Rules:**
- BZR-30: Clinic plan allows maximum 1 clinic
- Clinic name must be unique within the parent entity (complex/department)
- License number must be unique if provided
- Services can be added during clinic setup or later

**Inheritance:**
- Can inherit working hours from parent complex (if applicable)
- Can inherit contact information from parent complex (if applicable)
- Can inherit legal information from parent complex (if applicable)

**Process:**
1. Validates user authentication and plan type
2. Checks if clinic already exists (plan limit for clinic plan)
3. Creates new clinic entity
4. Creates associated services if provided
5. Updates onboarding progress
6. Returns clinic ID and next step

**Next Step:** clinic-contact

**Requirements:** US-3.1, US-3.2, US-3.3
    `,
  })
  @ApiBody({
    type: ClinicOverviewDto,
    description: 'Clinic basic information and services',
    examples: {
      complete: {
        summary: 'Complete Clinic Info',
        description:
          'Full clinic details with all optional fields and services',
        value: ONBOARDING_SWAGGER_EXAMPLES.CLINIC_OVERVIEW_REQUEST,
      },
      minimal: {
        summary: 'Minimal Required Info',
        description: 'Only required fields for quick setup',
        value: {
          name: 'Advanced Heart Center',
        },
      },
      withServices: {
        summary: 'Clinic with Services',
        description: 'Clinic setup with initial services',
        value: {
          name: 'Advanced Heart Center',
          specialization: 'Cardiology',
          headDoctorName: 'Dr. Sarah Al-Zahrani',
          licenseNumber: 'LC-CARD-2023-001',
          services: [
            {
              name: 'Cardiac Consultation',
              description: 'Initial cardiac assessment and consultation',
              durationMinutes: 30,
              price: 300,
            },
            {
              name: 'ECG Test',
              description: 'Electrocardiogram test',
              durationMinutes: 15,
              price: 150,
            },
          ],
        },
      },
      withInheritance: {
        summary: 'Clinic with Inheritance Settings',
        description: 'Clinic setup with inheritance from parent complex',
        value: {
          name: 'Pediatric Care Center',
          specialization: 'Pediatrics',
          complexDepartmentId: '507f1f77bcf86cd799439020',
          inheritanceSettings: {
            inheritWorkingHours: true,
            inheritContactInfo: true,
            inheritLegalInfo: false,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Clinic overview saved successfully',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.CLINIC_OVERVIEW_SUCCESS,
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error or plan limit reached',
    schema: {
      examples: {
        validation: {
          summary: 'Validation Error',
          value: ONBOARDING_SWAGGER_EXAMPLES.VALIDATION_ERROR,
        },
        planLimit: {
          summary: 'Plan Limit Reached',
          value: {
            success: false,
            error: {
              code: 'ONBOARDING_004',
              message: {
                ar: 'الخطة تسمح بإنشاء عيادة واحدة فقط',
                en: 'Plan allows maximum 1 clinic',
              },
              details: {
                currentCount: 1,
                maxAllowed: 1,
                planType: 'clinic',
              },
              timestamp: '2026-02-07T10:30:00.000Z',
            },
          },
        },
        duplicateName: {
          summary: 'Duplicate Clinic Name',
          value: {
            success: false,
            error: {
              code: 'ONBOARDING_010',
              message: {
                ar: 'اسم العيادة موجود بالفعل',
                en: 'Clinic name already exists',
              },
              details: {
                field: 'name',
                value: 'Advanced Heart Center',
              },
              timestamp: '2026-02-07T10:30:00.000Z',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.UNAUTHORIZED_ERROR,
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description:
      'Parent entity not found (complex/department required for company/complex plans)',
    schema: {
      example: {
        success: false,
        error: {
          code: 'ONBOARDING_007',
          message: {
            ar: 'المجمع أو القسم غير موجود',
            en: 'Complex or department not found',
          },
          details: {
            step: 'clinic-overview',
            requiredEntity: 'complex',
          },
          timestamp: '2026-02-07T10:30:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  async saveClinicOverview(
    @Request() req,
    @Body() clinicOverviewDto: ClinicOverviewDto,
  ): Promise<StepSaveResponseDto> {
    const userId = req.user.id;
    const result = await this.onboardingService.saveClinicOverview(
      userId,
      clinicOverviewDto,
    );

    return {
      success: true,
      message: 'Clinic overview saved successfully',
      data: result.data,
      entityId: result.entityId,
      nextStep: result.nextStep,
      canProceed: result.canProceed,
    };
  }

  @Post('clinic/contact')
  @UseGuards(JwtAuthGuard)
  async saveClinicContact(
    @Request() req,
    @Body() clinicContactDto: ClinicContactDto,
  ): Promise<StepSaveResponseDto> {
    try {
      const userId = req.user.id;
      const result = await this.onboardingService.saveClinicContact(
        userId,
        clinicContactDto,
      );

      return {
        success: true,
        message: 'Clinic contact information saved successfully',
        data: result,
        nextStep: 'clinic-services',
        canProceed: true,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to save clinic contact information',
        canProceed: false,
      };
    }
  }

  @Post('clinic/services-capacity')
  @UseGuards(JwtAuthGuard)
  async saveClinicServicesCapacity(
    @Request() req,
    @Body() servicesCapacityDto: any,
  ): Promise<StepSaveResponseDto> {
    try {
      const userId = req.user.id;
      const result = await this.onboardingService.saveClinicServicesCapacity(
        userId,
        servicesCapacityDto,
      );

      return {
        success: true,
        message: 'Clinic services and capacity saved successfully',
        data: result,
        nextStep: 'clinic-legal',
        canProceed: true,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to save clinic services and capacity',
        canProceed: false,
      };
    }
  }

  @Post('clinic/legal')
  @UseGuards(JwtAuthGuard)
  async saveClinicLegal(
    @Request() req,
    @Body() clinicLegalDto: ClinicLegalInfoDto,
  ): Promise<StepSaveResponseDto> {
    try {
      const userId = req.user.id;
      const result = await this.onboardingService.saveClinicLegal(
        userId,
        clinicLegalDto,
      );

      return {
        success: true,
        message: 'Clinic legal information saved successfully',
        data: result,
        nextStep: 'clinic-schedule',
        canProceed: true,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to save clinic legal information',
        canProceed: false,
      };
    }
  }

  /**
   * Save Clinic Schedule (Working Hours) Endpoint
   *
   * POST /onboarding/clinic/schedule
   *
   * Final step in clinic setup. Saves working hours schedule for the clinic.
   * Clinics can inherit working hours from their parent complex or define custom hours.
   *
   * Requirements: US-4.1, US-4.2, US-4.3, US-4.4
   * Business Rules: BZR-29 (Working hours inheritance from parent entities)
   *
   * @param req - Request object containing authenticated user
   * @param workingHoursDto - Array of working hours for each day of the week
   * @returns StepSaveResponseDto with saved schedule and completion status
   */
  @Post('clinic/schedule')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Save clinic working hours schedule (Final Step)',
    description: `
Save working hours schedule for the clinic during onboarding. This is the final step before completing onboarding.

**Company Plan Flow:**
1. Organization Setup (3 steps)
2. Complex Setup (4 steps)
3. Clinic Overview
4. Clinic Contact
5. Clinic Services & Capacity
6. Clinic Legal
7. **Clinic Schedule** ← You are here (Final Step)

**Complex Plan Flow:**
1. Complex Setup (4 steps)
2. Clinic Overview
3. Clinic Contact
4. Clinic Services & Capacity
5. Clinic Legal
6. **Clinic Schedule** ← You are here (Final Step)

**Clinic Plan Flow:**
1. Clinic Overview
2. Clinic Contact
3. Clinic Services & Capacity
4. Clinic Legal
5. **Clinic Schedule** ← You are here (Final Step)

**Working Hours Configuration:**
- Define operating hours for each day of the week
- Set break times for lunch or prayer breaks
- Mark inactive days (e.g., Sunday closed)
- Support for 24-hour format (HH:MM)
- Option to inherit from parent complex (if applicable)

**Fields Per Day:**
- **dayOfWeek**: monday, tuesday, wednesday, thursday, friday, saturday, sunday
- **openingTime**: Opening time in HH:MM format (e.g., "09:00")
- **closingTime**: Closing time in HH:MM format (e.g., "17:00")
- **isActive**: Whether the clinic is open on this day
- **breakStartTime**: Optional break start time (e.g., "12:30")
- **breakEndTime**: Optional break end time (e.g., "13:30")

**Additional Fields:**
- **inheritFromParent**: Boolean flag to inherit working hours from parent complex

**Validation Rules:**
- Opening time must be before closing time
- Break times must be within opening hours
- Break start must be before break end
- All times must be in HH:MM format
- All 7 days of the week must be provided
- If inheriting, parent complex must have working hours defined

**Inheritance Options (BZR-29):**

1. **Custom Hours**: Define unique working hours for the clinic
   - Useful for specialized clinics with different schedules
   - Example: Dental clinic open evenings only

2. **Inherited Hours**: Use parent complex working hours
   - Maintains consistency across the complex
   - Can be modified later if needed
   - Automatically updates if parent hours change

3. **Hybrid Approach**: Inherit and then customize
   - Start with parent hours
   - Modify specific days as needed

**Process:**
1. Validates clinic exists (from previous steps)
2. If inheriting, fetches parent complex working hours
3. Validates working hours format and logic
4. Creates working hours records for the clinic
5. Marks onboarding as complete
6. Returns completion status

**Next Step:** completed (onboarding finished, redirect to dashboard)

**Requirements:** US-4.1, US-4.2, US-4.3, US-4.4
**Business Rules:** BZR-29
    `,
  })
  @ApiBody({
    type: [ClinicWorkingHoursDto],
    description:
      'Array of working hours for each day of the week (7 days required) or inheritance flag',
    examples: {
      customHours: {
        summary: 'Custom Working Hours',
        description: 'Define unique working hours for the clinic',
        value: ONBOARDING_SWAGGER_EXAMPLES.CLINIC_SCHEDULE_REQUEST,
      },
      inheritedHours: {
        summary: 'Inherit from Complex',
        description: 'Use parent complex working hours',
        value: {
          inheritFromParent: true,
        },
      },
      eveningClinic: {
        summary: 'Evening Clinic',
        description: 'Clinic open in evenings only',
        value: {
          workingHours: [
            {
              dayOfWeek: 'monday',
              openingTime: '16:00',
              closingTime: '22:00',
              isActive: true,
              breakStartTime: null,
              breakEndTime: null,
            },
            {
              dayOfWeek: 'tuesday',
              openingTime: '16:00',
              closingTime: '22:00',
              isActive: true,
              breakStartTime: null,
              breakEndTime: null,
            },
            {
              dayOfWeek: 'wednesday',
              openingTime: '16:00',
              closingTime: '22:00',
              isActive: true,
              breakStartTime: null,
              breakEndTime: null,
            },
            {
              dayOfWeek: 'thursday',
              openingTime: '16:00',
              closingTime: '22:00',
              isActive: true,
              breakStartTime: null,
              breakEndTime: null,
            },
            {
              dayOfWeek: 'friday',
              openingTime: '16:00',
              closingTime: '22:00',
              isActive: true,
              breakStartTime: null,
              breakEndTime: null,
            },
            {
              dayOfWeek: 'saturday',
              openingTime: null,
              closingTime: null,
              isActive: false,
              breakStartTime: null,
              breakEndTime: null,
            },
            {
              dayOfWeek: 'sunday',
              openingTime: null,
              closingTime: null,
              isActive: false,
              breakStartTime: null,
              breakEndTime: null,
            },
          ],
          inheritFromParent: false,
        },
      },
      weekendClinic: {
        summary: 'Weekend Clinic',
        description: 'Clinic open on weekends only',
        value: {
          workingHours: [
            {
              dayOfWeek: 'monday',
              openingTime: null,
              closingTime: null,
              isActive: false,
              breakStartTime: null,
              breakEndTime: null,
            },
            {
              dayOfWeek: 'tuesday',
              openingTime: null,
              closingTime: null,
              isActive: false,
              breakStartTime: null,
              breakEndTime: null,
            },
            {
              dayOfWeek: 'wednesday',
              openingTime: null,
              closingTime: null,
              isActive: false,
              breakStartTime: null,
              breakEndTime: null,
            },
            {
              dayOfWeek: 'thursday',
              openingTime: null,
              closingTime: null,
              isActive: false,
              breakStartTime: null,
              breakEndTime: null,
            },
            {
              dayOfWeek: 'friday',
              openingTime: '09:00',
              closingTime: '21:00',
              isActive: true,
              breakStartTime: '13:00',
              breakEndTime: '14:00',
            },
            {
              dayOfWeek: 'saturday',
              openingTime: '09:00',
              closingTime: '21:00',
              isActive: true,
              breakStartTime: '13:00',
              breakEndTime: '14:00',
            },
            {
              dayOfWeek: 'sunday',
              openingTime: '09:00',
              closingTime: '17:00',
              isActive: true,
              breakStartTime: null,
              breakEndTime: null,
            },
          ],
          inheritFromParent: false,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Clinic schedule saved successfully - Onboarding complete',
    schema: {
      examples: {
        customHours: {
          summary: 'Custom Hours Saved',
          value: ONBOARDING_SWAGGER_EXAMPLES.CLINIC_SCHEDULE_SUCCESS,
        },
        inheritedHours: {
          summary: 'Inherited Hours Saved',
          value: ONBOARDING_SWAGGER_EXAMPLES.CLINIC_SCHEDULE_INHERITED,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error - Invalid working hours format or logic',
    schema: {
      examples: {
        invalidTime: {
          summary: 'Invalid Time Format',
          value: {
            success: false,
            error: {
              code: 'ONBOARDING_009',
              message: {
                ar: 'صيغة الوقت غير صالحة',
                en: 'Invalid time format',
              },
              details: {
                field: 'workingHours[0].openingTime',
                constraint: 'Must be in HH:MM format',
                value: '9:00',
              },
              timestamp: '2026-02-07T10:30:00.000Z',
            },
          },
        },
        invalidLogic: {
          summary: 'Invalid Time Logic',
          value: {
            success: false,
            error: {
              code: 'ONBOARDING_009',
              message: {
                ar: 'وقت الإغلاق يجب أن يكون بعد وقت الفتح',
                en: 'Closing time must be after opening time',
              },
              details: {
                field: 'workingHours[2]',
                openingTime: '17:00',
                closingTime: '09:00',
              },
              timestamp: '2026-02-07T10:30:00.000Z',
            },
          },
        },
        missingDays: {
          summary: 'Missing Days',
          value: {
            success: false,
            error: {
              code: 'ONBOARDING_009',
              message: {
                ar: 'يجب توفير جميع أيام الأسبوع السبعة',
                en: 'All 7 days of the week must be provided',
              },
              details: {
                providedDays: 5,
                requiredDays: 7,
              },
              timestamp: '2026-02-07T10:30:00.000Z',
            },
          },
        },
        inheritanceNotAvailable: {
          summary: 'Cannot Inherit - No Parent Hours',
          value: {
            success: false,
            error: {
              code: 'ONBOARDING_012',
              message: {
                ar: 'ساعات العمل غير موجودة في المجمع الأب',
                en: 'Working hours not found in parent complex',
              },
              details: {
                clinicId: '507f1f77bcf86cd799439015',
                complexId: '507f1f77bcf86cd799439014',
                inheritFromParent: true,
              },
              timestamp: '2026-02-07T10:30:00.000Z',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.UNAUTHORIZED_ERROR,
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Clinic not found (must complete previous steps first)',
    schema: {
      example: {
        success: false,
        error: {
          code: 'ONBOARDING_007',
          message: {
            ar: 'العيادة غير موجودة',
            en: 'Clinic not found',
          },
          details: {
            step: 'clinic-schedule',
            requiredSteps: [
              'clinic-overview',
              'clinic-contact',
              'clinic-services-capacity',
              'clinic-legal',
            ],
          },
          timestamp: '2026-02-07T10:30:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
    schema: {
      example: ONBOARDING_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @Post('clinic/schedule')
  @UseGuards(JwtAuthGuard)
  async saveClinicSchedule(
    @Request() req,
    @Body() workingHoursDto: ClinicWorkingHoursDto[],
  ): Promise<StepSaveResponseDto> {
    try {
      const userId = req.user.id;
      const result = await this.onboardingService.saveClinicSchedule(
        userId,
        workingHoursDto,
      );

      return {
        success: true,
        message: 'Clinic schedule saved successfully',
        data: result,
        nextStep: 'completed',
        canProceed: true,
      };
    } catch (error) {
      // If it's a BadRequestException with validation errors, re-throw it
      if (error instanceof BadRequestException) {
        throw error;
      }

      // For other errors, return generic error response
      return {
        success: false,
        message: 'Failed to save clinic schedule',
        canProceed: false,
      };
    }
  }

  @Post('clinic/complete')
  @UseGuards(JwtAuthGuard)
  async completeClinicSetup(@Request() req): Promise<StepSaveResponseDto> {
    try {
      const userId = req.user.id;
      const result = await this.onboardingService.completeClinicSetup(userId);

      return {
        success: true,
        message: 'Clinic setup and onboarding completed successfully',
        data: result,
        nextStep: 'dashboard',
        canProceed: true,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to complete clinic setup',
        canProceed: false,
      };
    }
  }

  // ======== M2 BUSINESS RULES ENDPOINTS ========

  /**
   * Skip Complex Endpoint
   *
   * POST /onboarding/skip-complex
   *
   * Allows company plan users to skip the complex and clinic setup steps.
   * When complex is skipped, clinic is automatically skipped as well (BZR-25).
   *
   * Requirements: US-1.1, US-1.2, US-1.3, US-1.4, US-1.6, US-1.7
   * Business Rules: BZR-25 (Skip complex → skip clinic, company plan only)
   *
   * @param skipComplexDto - Contains userId and subscriptionId
   * @returns SkipResult with updated progress and bilingual message
   *
   * Success Response (200):
   * {
   *   success: true,
   *   data: {
   *     currentStep: 'dashboard',
   *     skippedSteps: ['complex-overview', 'complex-details', ...],
   *     progress: StepProgress,
   *   },
   *   message: { ar: '...', en: '...' }
   * }
   *
   * Error Response (400/403):
   * {
   *   success: false,
   *   error: {
   *     code: 'ONBOARDING_001',
   *     message: { ar: '...', en: '...' },
   *     details: { ... },
   *     timestamp: '...'
   *   }
   * }
   */
  @Post('skip-complex')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Skip complex and clinic setup (Company plan only)',
    description: `
Skip the complex and clinic setup steps during onboarding. This endpoint is only available for company plan users.

**Business Rule (BZR-25):**
- When complex is skipped, clinic is automatically skipped as well
- User is redirected to dashboard
- Skipped steps are tracked in user progress
- Complex and clinic can be added later from the dashboard

**Restrictions:**
- Only available for company plan subscriptions
- Returns error for complex and clinic plans

**Requirements:** US-1.1, US-1.2, US-1.3, US-1.4, US-1.6, US-1.7
    `,
  })
  @ApiBody({
    type: SkipComplexDto,
    description: 'User and subscription identifiers',
    examples: {
      skipComplex: {
        summary: 'Skip Complex Request',
        description: 'Request to skip complex and clinic setup',
        value: {
          userId: '507f1f77bcf86cd799439011',
          subscriptionId: '507f1f77bcf86cd799439012',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Complex and clinic skipped successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            currentStep: { type: 'string', example: 'dashboard' },
            skippedSteps: {
              type: 'array',
              items: { type: 'string' },
              example: [
                'complex-overview',
                'complex-contact',
                'complex-legal',
                'complex-schedule',
                'clinic-overview',
                'clinic-contact',
                'clinic-services',
                'clinic-legal',
                'clinic-schedule',
              ],
            },
            progress: {
              type: 'object',
              description: 'Updated user progress',
            },
          },
        },
        message: {
          type: 'object',
          properties: {
            ar: { type: 'string', example: 'تم تخطي المجمع والعيادة بنجاح' },
            en: {
              type: 'string',
              example: 'Complex and clinic skipped successfully',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Skip not allowed for non-company plans',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'ONBOARDING_001' },
            message: {
              type: 'object',
              properties: {
                ar: {
                  type: 'string',
                  example: 'يمكن تخطي المجمع فقط في خطة الشركة',
                },
                en: {
                  type: 'string',
                  example: 'Can only skip complex in company plan',
                },
              },
            },
            details: { type: 'object' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User or subscription not found',
  })
  async skipComplex(@Body() skipComplexDto: SkipComplexDto) {
    const result = await this.skipLogicService.skipComplexStep(
      skipComplexDto.userId,
      skipComplexDto.subscriptionId,
    );

    return {
      success: result.success,
      data: {
        currentStep: result.currentStep,
        skippedSteps: result.skippedSteps,
        progress: result.progress,
      },
      message: result.message,
    };
  }

  /**
   * Get Inherited Working Hours Endpoint
   *
   * GET /onboarding/inherited-working-hours
   *
   * Retrieves inherited working hours from parent entities.
   * Clinic inherits from complex, complex inherits from organization (BZR-29).
   *
   * Requirements: US-4.1, US-4.2, US-4.3, US-4.4, US-4.5, US-4.6, US-4.7
   * Business Rules: BZR-29 (Working hours inheritance)
   *
   * @param query - Contains subscriptionId, planType, and optional complexId
   * @returns InheritanceResult with working hours and source information
   *
   * Success Response (200):
   * {
   *   success: true,
   *   data: {
   *     workingHours: WorkingHours[],
   *     source: {
   *       entityType: 'organization' | 'complex',
   *       entityId: string,
   *       entityName: string
   *     },
   *     canModify: boolean,
   *     message: { ar: '...', en: '...' }
   *   }
   * }
   *
   * Error Response (404):
   * {
   *   success: false,
   *   error: {
   *     code: 'ONBOARDING_011' | 'ONBOARDING_012',
   *     message: { ar: '...', en: '...' },
   *     details: { ... },
   *     timestamp: '...'
   *   }
   * }
   */
  @Get('inherited-working-hours')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get inherited working hours from parent entities',
    description: `
Retrieve working hours inherited from parent entities in the organizational hierarchy.

**Inheritance Rules (BZR-29):**
- **Clinic**: Inherits working hours from its parent complex
- **Complex**: Inherits working hours from parent organization (company plan only)
- **Clinic Plan**: No inheritance (standalone clinic)

**Use Cases:**
- Pre-populate working hours form during onboarding
- Display inherited hours with source information
- Allow users to modify inherited hours

**Source Information:**
- Returns the entity type, ID, and name of the source
- Indicates whether hours can be modified
- Provides bilingual notification about inheritance

**Requirements:** US-4.1, US-4.2, US-4.3, US-4.4, US-4.5, US-4.6, US-4.7
    `,
  })
  @ApiQuery({
    name: 'subscriptionId',
    required: true,
    type: String,
    description: 'Subscription identifier',
    example: '507f1f77bcf86cd799439012',
  })
  @ApiQuery({
    name: 'planType',
    required: true,
    enum: ['company', 'complex', 'clinic'],
    description: 'Subscription plan type',
    example: 'company',
  })
  @ApiQuery({
    name: 'complexId',
    required: false,
    type: String,
    description: 'Complex identifier (required for clinic in complex plan)',
    example: '507f1f77bcf86cd799439013',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Working hours retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            workingHours: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  day: { type: 'string', example: 'monday' },
                  startTime: { type: 'string', example: '09:00' },
                  endTime: { type: 'string', example: '17:00' },
                  isActive: { type: 'boolean', example: true },
                  breakStartTime: { type: 'string', example: '12:00' },
                  breakEndTime: { type: 'string', example: '13:00' },
                },
              },
            },
            source: {
              type: 'object',
              properties: {
                entityType: {
                  type: 'string',
                  enum: ['organization', 'complex'],
                  example: 'complex',
                },
                entityId: {
                  type: 'string',
                  example: '507f1f77bcf86cd799439013',
                },
                entityName: {
                  type: 'string',
                  example: 'HealthCorp Riyadh Medical Complex',
                },
              },
            },
            canModify: { type: 'boolean', example: true },
            message: {
              type: 'object',
              properties: {
                ar: {
                  type: 'string',
                  example: 'تم وراثة ساعات العمل من المجمع',
                },
                en: {
                  type: 'string',
                  example: 'Working hours inherited from complex',
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Parent entity or working hours not found',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'ONBOARDING_011' },
            message: {
              type: 'object',
              properties: {
                ar: { type: 'string', example: 'الكيان الأصلي غير موجود' },
                en: { type: 'string', example: 'Parent entity not found' },
              },
            },
            details: { type: 'object' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getInheritedWorkingHours(@Query() query: GetInheritedWorkingHoursDto) {
    const result = await this.workingHoursService.getInheritedWorkingHours(
      query.subscriptionId,
      query.planType,
      query.complexId,
    );

    return {
      success: true,
      data: {
        workingHours: result.workingHours,
        source: result.source,
        canModify: result.canModify,
        message: result.message,
      },
    };
  }

  /**
   * Validate Plan Limits Endpoint
   *
   * GET /onboarding/validate-plan-limits
   *
   * Validates if a new entity can be created based on plan limits.
   * Enforces business rules for entity creation limits per plan type.
   *
   * Requirements: US-2.1, US-2.2, US-2.3, US-2.4
   * Business Rules:
   * - BZR-26: Company plan allows maximum 1 organization
   * - BZR-28: Complex plan allows maximum 1 complex
   * - BZR-30: Clinic plan allows maximum 1 clinic
   *
   * @param query - Contains subscriptionId and entityType
   * @returns LimitResult with validation status and bilingual message
   *
   * Success Response (200):
   * {
   *   success: true,
   *   data: {
   *     canCreate: boolean,
   *     currentCount: number,
   *     maxAllowed: number,
   *     planType: string,
   *     message?: { ar: '...', en: '...' }
   *   }
   * }
   *
   * Error Response (404):
   * {
   *   success: false,
   *   error: {
   *     code: 'ONBOARDING_008',
   *     message: { ar: '...', en: '...' },
   *     details: { ... },
   *     timestamp: '...'
   *   }
   * }
   */
  @Get('validate-plan-limits')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate plan limits before entity creation',
    description: `
Check if a new entity can be created based on subscription plan limits.

**Plan Limits (Business Rules):**
- **Company Plan (BZR-26)**: Maximum 1 organization
- **Complex Plan (BZR-28)**: Maximum 1 complex
- **Clinic Plan (BZR-30)**: Maximum 1 clinic

**Validation Logic:**
- Counts existing non-soft-deleted entities
- Compares count against plan maximum
- Returns whether creation is allowed
- Provides bilingual error message if limit reached

**Use Cases:**
- Pre-validate before showing entity creation form
- Display limit information to users
- Prevent API calls that would fail due to limits

**Requirements:** US-2.1, US-2.2, US-2.3, US-2.4
    `,
  })
  @ApiQuery({
    name: 'subscriptionId',
    required: true,
    type: String,
    description: 'Subscription identifier',
    example: '507f1f77bcf86cd799439012',
  })
  @ApiQuery({
    name: 'entityType',
    required: true,
    enum: ['organization', 'complex', 'clinic'],
    description: 'Type of entity to validate',
    example: 'organization',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Validation completed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            canCreate: { type: 'boolean', example: true },
            currentCount: { type: 'number', example: 0 },
            maxAllowed: { type: 'number', example: 1 },
            planType: { type: 'string', example: 'company' },
            message: {
              type: 'object',
              properties: {
                ar: { type: 'string', example: 'يمكن إنشاء شركة جديدة' },
                en: { type: 'string', example: 'Can create new organization' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Plan limit reached',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            canCreate: { type: 'boolean', example: false },
            currentCount: { type: 'number', example: 1 },
            maxAllowed: { type: 'number', example: 1 },
            planType: { type: 'string', example: 'company' },
            message: {
              type: 'object',
              properties: {
                ar: {
                  type: 'string',
                  example: 'الخطة تسمح بإنشاء شركة واحدة فقط',
                },
                en: {
                  type: 'string',
                  example: 'Plan allows maximum 1 company',
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Subscription not found',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'ONBOARDING_008' },
            message: {
              type: 'object',
              properties: {
                ar: { type: 'string', example: 'الاشتراك غير موجود' },
                en: { type: 'string', example: 'Subscription not found' },
              },
            },
            details: { type: 'object' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async validatePlanLimits(@Query() query: ValidatePlanLimitsDto) {
    try {
      // Get subscription to determine plan type
      const subscription = await this.subscriptionService.getSubscriptionById(
        query.subscriptionId,
      );

      // Get plan type from populated planId
      const plan = subscription.planId as any; // Populated SubscriptionPlan
      const planType = plan?.name;

      if (!planType) {
        return {
          success: false,
          error: {
            code: 'ONBOARDING_006',
            message: {
              ar: 'نوع الخطة غير صالح',
              en: 'Invalid plan type',
            },
            details: { subscriptionId: query.subscriptionId },
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Validate plan limit
      const result = await this.planLimitService.validatePlanLimit(
        query.subscriptionId,
        query.entityType,
        planType as 'company' | 'complex' | 'clinic',
      );

      return {
        success: true,
        data: {
          canCreate: result.canCreate,
          currentCount: result.currentCount,
          maxAllowed: result.maxAllowed,
          planType: result.planType,
          message: result.message,
        },
      };
    } catch (error) {
      // Handle subscription not found
      if (error.status === 404 || error.code === 'SUBSCRIPTION_NOT_FOUND') {
        return {
          success: false,
          error: {
            code: 'ONBOARDING_008',
            message: {
              ar: 'الاشتراك غير موجود',
              en: 'Subscription not found',
            },
            details: { subscriptionId: query.subscriptionId },
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Handle other errors
      throw error;
    }
  }

  /**
   * Validate Step Endpoint
   *
   * POST /onboarding/validate-step
   *
   * Validates step dependencies before allowing user to access a step.
   * Ensures prerequisite steps are completed or skipped.
   *
   * Requirements: US-3.1, US-3.2, US-3.3, US-3.4
   * Business Rules:
   * - BZR-27: Clinic details require complex details first
   * - Exception: If complex step is skipped, clinic can proceed
   *
   * @param validateStepDto - Contains userId, subscriptionId, and requestedStep
   * @returns DependencyResult with validation status and bilingual message
   *
   * Success Response (200):
   * {
   *   success: true,
   *   data: {
   *     canProceed: boolean,
   *     missingSteps: string[],
   *     message?: { ar: '...', en: '...' }
   *   }
   * }
   *
   * Error Response (404):
   * {
   *   success: false,
   *   error: {
   *     code: 'ONBOARDING_007',
   *     message: { ar: '...', en: '...' },
   *     details: { ... },
   *     timestamp: '...'
   *   }
   * }
   */
  @Post('validate-step')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate step dependencies before navigation',
    description: `
Validate that all prerequisite steps are completed before allowing access to a requested step.

**Step Dependencies (BZR-27):**
- **Clinic Steps**: Require complex steps to be completed first
- **Exception**: If complex is skipped, clinic steps can proceed
- **Organization Steps**: No dependencies (first in flow)
- **Complex Steps**: Require organization steps (company plan only)

**Validation Logic:**
- Checks user's progress for completed steps
- Checks for skipped steps (which bypass dependencies)
- Returns list of missing prerequisite steps
- Provides bilingual error message with missing steps

**Use Cases:**
- Validate before navigating to a step
- Display missing steps to user
- Prevent access to steps with unmet dependencies
- Guide users through correct onboarding flow

**Requirements:** US-3.1, US-3.2, US-3.3, US-3.4
    `,
  })
  @ApiBody({
    type: ValidateStepDto,
    description: 'Step validation request',
    examples: {
      validateClinicStep: {
        summary: 'Validate Clinic Step',
        description: 'Check if user can access clinic step',
        value: {
          userId: '507f1f77bcf86cd799439011',
          subscriptionId: '507f1f77bcf86cd799439012',
          requestedStep: 'clinic-overview',
        },
      },
      validateComplexStep: {
        summary: 'Validate Complex Step',
        description: 'Check if user can access complex step',
        value: {
          userId: '507f1f77bcf86cd799439011',
          subscriptionId: '507f1f77bcf86cd799439012',
          requestedStep: 'complex-overview',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Validation completed - can proceed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            canProceed: { type: 'boolean', example: true },
            missingSteps: {
              type: 'array',
              items: { type: 'string' },
              example: [],
            },
            message: {
              type: 'object',
              properties: {
                ar: { type: 'string', example: 'يمكن المتابعة إلى هذه الخطوة' },
                en: { type: 'string', example: 'Can proceed to this step' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed - missing prerequisites',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            canProceed: { type: 'boolean', example: false },
            missingSteps: {
              type: 'array',
              items: { type: 'string' },
              example: ['complex-overview', 'complex-contact', 'complex-legal'],
            },
            message: {
              type: 'object',
              properties: {
                ar: {
                  type: 'string',
                  example: 'يجب إكمال تفاصيل المجمع قبل تعبئة تفاصيل العيادة',
                },
                en: {
                  type: 'string',
                  example:
                    'Must complete complex details before filling clinic details',
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'ONBOARDING_007' },
            message: {
              type: 'object',
              properties: {
                ar: { type: 'string', example: 'المستخدم غير موجود' },
                en: { type: 'string', example: 'User not found' },
              },
            },
            details: { type: 'object' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async validateStep(@Body() validateStepDto: ValidateStepDto) {
    try {
      // Validate step dependency
      const result = await this.progressService.validateStepDependency(
        validateStepDto.userId,
        validateStepDto.requestedStep,
      );

      return {
        success: true,
        data: {
          canProceed: result.canProceed,
          missingSteps: result.missingSteps,
          message: result.message,
        },
      };
    } catch (error) {
      // Handle user not found
      if (error.status === 404 || error.code === 'USER_NOT_FOUND') {
        return {
          success: false,
          error: {
            code: 'ONBOARDING_007',
            message: {
              ar: 'المستخدم غير موجود',
              en: 'User not found',
            },
            details: { userId: validateStepDto.userId },
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Handle other errors
      throw error;
    }
  }

  // ======== EXISTING VALIDATION ENDPOINTS (MOVED TO BOTTOM) ========
  @Post('validate-organization-name')
  @HttpCode(HttpStatus.OK)
  async validateOrganizationName(@Body() body: { name: string }) {
    try {
      const isAvailable = await this.onboardingService.validateOrganizationName(
        body.name,
      );

      return {
        success: true,
        message: isAvailable
          ? 'Organization name is available'
          : 'Organization name is already taken',
        data: {
          isAvailable,
          name: body.name,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to validate organization name',
        error: error.message,
      };
    }
  }

  @Post('validate-email')
  @HttpCode(HttpStatus.OK)
  async validateEmail(@Body() body: { email: string }) {
    try {
      const isAvailable = await this.onboardingService.validateEmail(
        body.email,
      );

      return {
        success: true,
        message: isAvailable ? 'Email is available' : 'Email is already taken',
        data: {
          isAvailable,
          email: body.email,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to validate email',
        error: error.message,
      };
    }
  }

  @Post('validate-vat')
  @HttpCode(HttpStatus.OK)
  async validateVatNumber(@Body() body: { vatNumber: string }) {
    try {
      const isValid = await this.onboardingService.validateVatNumber(
        body.vatNumber,
      );

      return {
        isUnique: isValid,
        message: isValid
          ? 'VAT number is valid'
          : 'Invalid VAT number format or already in use',
      };
    } catch (error) {
      return {
        isUnique: false,
        message: error.message || 'Failed to validate VAT number',
      };
    }
  }

  @Post('validate-cr')
  @HttpCode(HttpStatus.OK)
  async validateCrNumber(@Body() body: { crNumber: string }) {
    try {
      const isValid = await this.onboardingService.validateCrNumber(
        body.crNumber,
      );

      return {
        isUnique: isValid,
        message: isValid
          ? 'CR number is valid'
          : 'Invalid CR number format or already in use',
      };
    } catch (error) {
      return {
        isUnique: false,
        message: error.message || 'Failed to validate CR number',
      };
    }
  }

  @Post('validate-complex-name')
  @HttpCode(HttpStatus.OK)
  async validateComplexName(
    @Body() body: { name: string; organizationId?: string },
  ) {
    try {
      const isAvailable = await this.onboardingService.validateComplexName(
        body.name,
        body.organizationId,
      );

      return {
        isUnique: isAvailable,
        message: isAvailable
          ? 'Complex name is available'
          : 'Complex name is already taken',
      };
    } catch (error) {
      return {
        isUnique: false,
        message: error.message || 'Failed to validate complex name',
      };
    }
  }

  @Post('validate-clinic-name')
  @HttpCode(HttpStatus.OK)
  async validateClinicName(
    @Body() body: { name: string; complexId?: string; organizationId?: string },
  ) {
    try {
      const isAvailable = await this.onboardingService.validateClinicName(
        body.name,
        body.complexId,
        body.organizationId,
      );

      return {
        isUnique: isAvailable,
        message: isAvailable
          ? 'Clinic name is available'
          : 'Clinic name is already taken',
      };
    } catch (error) {
      return {
        isUnique: false,
        message: error.message || 'Failed to validate clinic name',
      };
    }
  }
}
