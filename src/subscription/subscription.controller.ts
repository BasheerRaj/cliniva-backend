import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  HttpStatus,
  HttpCode,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionStatusDto,
} from './dto/create-subscription.dto';
import { SUBSCRIPTION_SWAGGER_EXAMPLES } from './constants/swagger-examples';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @ApiOperation({
    summary: 'Create new subscription',
    description:
      'Creates a new subscription for a user with the specified plan. Validates plan existence, checks for active subscriptions, and updates user onboarding progress. Each user can only have one active subscription at a time.',
  })
  @ApiResponse({
    status: 201,
    description: 'Subscription created successfully',
    schema: {
      example: SUBSCRIPTION_SWAGGER_EXAMPLES.CREATE_SUBSCRIPTION_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Validation error or active subscription exists',
    schema: {
      example: SUBSCRIPTION_SWAGGER_EXAMPLES.ACTIVE_SUBSCRIPTION_EXISTS,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Subscription plan not found',
    schema: {
      example: SUBSCRIPTION_SWAGGER_EXAMPLES.PLAN_NOT_FOUND,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
    schema: {
      example: SUBSCRIPTION_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @ApiBody({ type: CreateSubscriptionDto })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSubscription(
    @Body() createSubscriptionDto: CreateSubscriptionDto,
  ) {
    try {
      const subscription = await this.subscriptionService.createSubscription(
        createSubscriptionDto,
      );

      return {
        success: true,
        message: 'Subscription created successfully',
        data: subscription,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create subscription',
        error: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Get user subscription',
    description:
      'Retrieves the subscription details for a specific user, including populated plan information. Returns null if no subscription exists for the user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription found or no subscription exists',
    schema: {
      example: SUBSCRIPTION_SWAGGER_EXAMPLES.GET_USER_SUBSCRIPTION_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid user ID',
    schema: {
      example: SUBSCRIPTION_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
    schema: {
      example: SUBSCRIPTION_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to retrieve subscription for',
    example: '507f1f77bcf86cd799439012',
    type: String,
  })
  @Get('user/:userId')
  async getUserSubscription(@Param('userId') userId: string) {
    try {
      const subscription =
        await this.subscriptionService.getSubscriptionByUser(userId);

      return {
        success: true,
        message: subscription ? 'Subscription found' : 'No subscription found',
        data: subscription,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve subscription',
        error: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Update subscription status',
    description:
      'Updates the status of an existing subscription. When status is set to "cancelled", the expiration date is automatically set to the current time. Supports active, inactive, and cancelled statuses.',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription status updated successfully',
    schema: {
      example: SUBSCRIPTION_SWAGGER_EXAMPLES.UPDATE_STATUS_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid status value',
    schema: {
      example: SUBSCRIPTION_SWAGGER_EXAMPLES.INVALID_STATUS,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Subscription not found',
    schema: {
      example: SUBSCRIPTION_SWAGGER_EXAMPLES.SUBSCRIPTION_NOT_FOUND,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
    schema: {
      example: SUBSCRIPTION_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @ApiParam({
    name: 'id',
    description: 'Subscription ID to update',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @ApiBody({ type: UpdateSubscriptionStatusDto })
  @Put(':id/status')
  @HttpCode(HttpStatus.OK)
  async updateSubscriptionStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateSubscriptionStatusDto,
  ) {
    try {
      const subscription =
        await this.subscriptionService.updateSubscriptionStatus(
          id,
          updateStatusDto,
        );

      return {
        success: true,
        message: 'Subscription status updated successfully',
        data: subscription,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update subscription status',
        error: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Get all subscription plans',
    description:
      'Retrieves all available subscription plans with enriched information including features, limitations, and pricing. Plans are categorized into three types: Clinic (single location), Complex (multi-department facility), and Company (enterprise network). Each plan includes detailed feature lists, entity limits, and descriptions to help users choose the appropriate plan.',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription plans retrieved successfully',
    schema: {
      example: SUBSCRIPTION_SWAGGER_EXAMPLES.GET_PLANS_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Failed to retrieve plans',
    schema: {
      example: SUBSCRIPTION_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
    schema: {
      example: SUBSCRIPTION_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @Get('plans')
  async getSubscriptionPlans() {
    try {
      const rawPlans = await this.subscriptionService.getAllSubscriptionPlans();

      // Transform plans to match frontend expectations
      const enrichedPlans = rawPlans.map((plan) => ({
        _id: plan._id,
        name: this.getDisplayName(plan.name),
        type: plan.name, // clinic, complex, company
        price: plan.price,
        currency: 'USD',
        billingPeriod: 'monthly',
        features: this.getFeatures(plan.name),
        limitations: this.getLimitations(plan),
        maxClinics: plan.maxClinics,
        maxComplexes: plan.maxComplexes,
        maxOrganizations: plan.maxOrganizations,
        isActive: true,
        isPopular: plan.name === 'complex', // Mark complex as popular
        description: this.getDescription(plan.name),
      }));

      return enrichedPlans;
    } catch (error) {
      throw new BadRequestException('Failed to retrieve subscription plans');
    }
  }

  private getDisplayName(planType: string): string {
    const names = {
      clinic: 'Single Clinic Plan',
      complex: 'Complex Plan',
      company: 'Company Plan',
    };
    return names[planType] || planType;
  }

  private getDescription(planType: string): string {
    const descriptions = {
      clinic:
        'Simple and affordable solution for independent clinics and small practices',
      complex:
        'Ideal for medical complexes with multiple departments and clinics under one roof',
      company:
        'Perfect for large healthcare networks managing multiple complexes and locations',
    };
    return (
      descriptions[planType] || 'Professional healthcare management solution'
    );
  }

  private getFeatures(planType: string): string[] {
    const features = {
      clinic: [
        'Minimal setup',
        'Quick onboarding',
        'Direct management by the clinic owner or manager',
      ],
      complex: [
        'Localized administration',
        'Department-based control',
        'Full visibility over all clinics',
      ],
      company: [
        'Centralized admin and reporting',
        'Multi-location support',
        'Role hierarchy across all levels',
      ],
    };
    return (
      features[planType] || [
        'Professional features',
        '24/7 support',
        'Secure platform',
      ]
    );
  }

  private getLimitations(plan: {
    maxClinics?: number;
    maxComplexes?: number;
    maxOrganizations?: number;
  }): string[] {
    const result: string[] = [];

    if (plan.maxClinics) {
      result.push(`Up to ${plan.maxClinics} clinics`);
    }
    if (plan.maxComplexes) {
      result.push(`Up to ${plan.maxComplexes} complexes`);
    }
    if (plan.maxOrganizations) {
      result.push(`Up to ${plan.maxOrganizations} organizations`);
    }

    return result.length > 0 ? result : ['Professional features included'];
  }
}
