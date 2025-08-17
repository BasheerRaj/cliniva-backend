import { Controller, Post, Get, Put, Body, Param, HttpStatus, HttpCode } from '@nestjs/common';
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
      const plans = await this.subscriptionService.getAllSubscriptionPlans();
      
      return {
        success: true,
        message: 'Subscription plans retrieved successfully',
        data: plans
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve subscription plans',
        error: error.message
      };
    }
  }
}
