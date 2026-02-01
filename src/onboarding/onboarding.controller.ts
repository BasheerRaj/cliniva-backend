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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('onboarding')
export class OnboardingController {
  constructor(
    private readonly onboardingService: OnboardingService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  // ======== EXISTING ENDPOINTS ========
  @Post('complete')
  @HttpCode(HttpStatus.CREATED)
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
