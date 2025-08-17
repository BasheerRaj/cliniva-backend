import { Controller, Post, Get, Body, Param, HttpStatus, HttpCode } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { ValidateOnboardingDto, OnboardingProgressDto } from './dto/validate-onboarding.dto';

@Controller('onboarding')
export class OnboardingController {
  constructor(
    private readonly onboardingService: OnboardingService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @Post('complete')
  @HttpCode(HttpStatus.CREATED)
  async completeOnboarding(@Body() completeOnboardingDto: CompleteOnboardingDto) {
    try {
      const result = await this.onboardingService.completeOnboarding(completeOnboardingDto);
      
      return {
        success: true,
        message: 'Onboarding completed successfully',
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: 'Onboarding failed',
        error: error.message
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
        data: plans
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve plans',
        error: error.message
      };
    }
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateOnboardingData(@Body() validateOnboardingDto: ValidateOnboardingDto) {
    try {
      const validation = await this.onboardingService.validateOnboardingData(validateOnboardingDto);
      
      return {
        success: validation.isValid,
        message: validation.isValid ? 'Validation passed' : 'Validation failed',
        data: {
          isValid: validation.isValid,
          errors: validation.errors
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Validation error',
        error: error.message
      };
    }
  }

  @Get('progress/:userId')
  async getOnboardingProgress(@Param('userId') userId: string) {
    try {
      const progress = await this.onboardingService.getOnboardingProgress(userId);
      
      return {
        success: true,
        message: progress ? 'Progress found' : 'No progress found',
        data: progress
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve progress',
        error: error.message
      };
    }
  }
}
