import { Controller, Post, Get, Put, Body, Param, HttpStatus, HttpCode, BadRequestException } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto, UpdateSubscriptionStatusDto } from './dto/create-subscription.dto';

@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSubscription(@Body() createSubscriptionDto: CreateSubscriptionDto) {
    try {
      const subscription = await this.subscriptionService.createSubscription(createSubscriptionDto);
      
      return {
        success: true,
        message: 'Subscription created successfully',
        data: subscription
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create subscription',
        error: error.message
      };
    }
  }

  @Get('user/:userId')
  async getUserSubscription(@Param('userId') userId: string) {
    try {
      const subscription = await this.subscriptionService.getSubscriptionByUser(userId);
      
      return {
        success: true,
        message: subscription ? 'Subscription found' : 'No subscription found',
        data: subscription
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve subscription',
        error: error.message
      };
    }
  }

  @Put(':id/status')
  @HttpCode(HttpStatus.OK)
  async updateSubscriptionStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateSubscriptionStatusDto
  ) {
    try {
      const subscription = await this.subscriptionService.updateSubscriptionStatus(id, updateStatusDto);
      
      return {
        success: true,
        message: 'Subscription status updated successfully',
        data: subscription
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update subscription status',
        error: error.message
      };
    }
  }

  @Get('plans')
  async getSubscriptionPlans() {
    try {
      const rawPlans = await this.subscriptionService.getAllSubscriptionPlans();
      
      // Transform plans to match frontend expectations
      const enrichedPlans = rawPlans.map(plan => ({
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
        description: this.getDescription(plan.name)
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
      company: 'Company Plan'
    };
    return names[planType] || planType;
  }

  private getDescription(planType: string): string {
    const descriptions = {
      clinic: 'Simple and affordable solution for independent clinics and small practices',
      complex: 'Ideal for medical complexes with multiple departments and clinics under one roof',
      company: 'Perfect for large healthcare networks managing multiple complexes and locations'
    };
    return descriptions[planType] || 'Professional healthcare management solution';
  }

  private getFeatures(planType: string): string[] {
    const features = {
      clinic: [
        'Patient management system',
        'Appointment scheduling',
        'Basic reporting',
        'Staff management (up to 3 users)',
        'Email support'
      ],
      complex: [
        'Multi-clinic management',
        'Department-based control',
        'Advanced reporting dashboard',
        'Staff management (up to 50 users)',
        'Inventory management',
        'Priority support'
      ],
      company: [
        'Centralized admin and reporting',
        'Multi-location support',
        'Role hierarchy across all levels',
        'Advanced analytics',
        'Unlimited staff users',
        'Priority support',
        'Custom integrations'
      ]
    };
    return features[planType] || ['Professional features', '24/7 support', 'Secure platform'];
  }

  private getLimitations(plan: { maxClinics?: number; maxComplexes?: number; maxOrganizations?: number }): string[] {
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
