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

  // ======== EXISTING ENDPOINTS ========
  @Post('complete')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Complete onboarding process',
    description: `
Complete the onboarding process for a new user based on their subscription plan type.

**Plan Types:**
- **Company Plan**: Creates organization → complexes → departments → clinics
- **Complex Plan**: Creates complex → departments → clinics
- **Clinic Plan**: Creates single clinic

**Business Rules:**
- BZR-26: Company plan allows maximum 1 organization
- BZR-28: Complex plan allows maximum 1 complex
- BZR-30: Clinic plan allows maximum 1 clinic
- All entities are validated before creation
- Working hours can be inherited from parent entities (BZR-29)

**Requirements:** US-5.1, US-5.2, US-5.3, US-5.4
    `,
  })
  @ApiBody({
    type: CompleteOnboardingDto,
    description:
      'Complete onboarding data including user, subscription, and entity information',
    examples: {
      companyPlan: {
        summary: 'Company Plan Example',
        description: 'Full organization with complexes and clinics',
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
            },
            complexes: [
              {
                name: 'HealthCorp Riyadh Medical Complex',
                address: 'King Abdulaziz Road, Al Malaz District, Riyadh',
                phone: '+966112234567',
                email: 'riyadh@healthcorp.sa',
              },
            ],
            clinics: [
              {
                name: 'Advanced Heart Center',
                address: 'Building A, Floor 3',
                phone: '+966112234501',
                email: 'heartcenter@healthcorp.sa',
                licenseNumber: 'LC-001-2023',
              },
            ],
          },
        },
      },
      complexPlan: {
        summary: 'Complex Plan Example',
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
            },
            clinics: [
              {
                name: "Women's Wellness Center",
                address: 'Building 1, Ground Floor',
                phone: '+966126789013',
                email: 'womens-wellness@alzahra-medical.com',
                licenseNumber: 'LC-WW-2023-001',
              },
            ],
          },
        },
      },
      clinicPlan: {
        summary: 'Clinic Plan Example',
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
    description: 'Onboarding completed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Onboarding completed successfully',
        },
        data: {
          type: 'object',
          properties: {
            organization: {
              type: 'object',
              description: 'Created organization (company plan only)',
            },
            complex: {
              type: 'object',
              description: 'Created complex (company and complex plans)',
            },
            clinic: {
              type: 'object',
              description: 'Created clinic (all plans)',
            },
            createdEntities: {
              type: 'array',
              items: { type: 'string' },
              example: ['organization', 'complex', 'clinic'],
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error or business rule violation',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Onboarding failed' },
        error: { type: 'string', example: 'Plan allows maximum 1 company' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User or subscription not found',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Server error during onboarding',
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

  // Step Progress Management
  @Get('progress')
  @UseGuards(JwtAuthGuard)
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

  // Organization Step Endpoints
  @Post('organization/overview')
  @UseGuards(JwtAuthGuard)
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

  @Post('organization/contact')
  @UseGuards(JwtAuthGuard)
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

  @Post('organization/legal')
  @UseGuards(JwtAuthGuard)
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

  @Post('organization/complete')
  @UseGuards(JwtAuthGuard)
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

  // Complex Step Endpoints
  @Post('complex/overview')
  @UseGuards(JwtAuthGuard)
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

  // Clinic Step Endpoints
  @Post('clinic/overview')
  @UseGuards(JwtAuthGuard)
  async saveClinicOverview(
    @Request() req,
    @Body() clinicOverviewDto: ClinicOverviewDto,
  ): Promise<StepSaveResponseDto> {
    try {
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
    } catch (error) {
      return {
        success: false,
        message: 'Failed to save clinic overview',
        canProceed: false,
      };
    }
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
