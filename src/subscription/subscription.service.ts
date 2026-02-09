import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Subscription } from '../database/schemas/subscription.schema';
import { SubscriptionPlan } from '../database/schemas/subscription-plan.schema';
import { User } from '../database/schemas/user.schema';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionStatusDto,
} from './dto/create-subscription.dto';
import { ValidationUtil } from '../common/utils/validation.util';
import { ERROR_MESSAGES } from '../common/utils/error-messages.constant';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectModel('Subscription')
    private readonly subscriptionModel: Model<Subscription>,
    @InjectModel('SubscriptionPlan')
    private readonly subscriptionPlanModel: Model<SubscriptionPlan>,
    @InjectModel('User') private userModel: Model<User>,
  ) {}

  async createSubscription(
    createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<Subscription> {
    // Validate plan exists by ID
    const plan = await this.subscriptionPlanModel.findById(
      createSubscriptionDto.subscriptionPlanId,
    );

    if (!plan) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.SUBSCRIPTION_PLAN_NOT_FOUND,
        code: 'SUBSCRIPTION_PLAN_NOT_FOUND',
        details: { planId: createSubscriptionDto.subscriptionPlanId },
      });
    }

    // If planType is provided, validate it matches the plan
    if (createSubscriptionDto.planType) {
      if (plan.name.toLowerCase() !== createSubscriptionDto.planType.toLowerCase()) {
        throw new BadRequestException({
          message: ERROR_MESSAGES.PLAN_TYPE_MISMATCH,
          code: 'PLAN_TYPE_MISMATCH',
          details: {
            expectedPlanType: plan.name,
            providedPlanType: createSubscriptionDto.planType,
          },
        });
      }
    }

    // Check if user already has an active subscription
    const existingSubscription = await this.subscriptionModel.findOne({
      userId: new Types.ObjectId(createSubscriptionDto.userId),
      status: 'active',
    });

    if (existingSubscription) {
      throw new BadRequestException({
        message: ERROR_MESSAGES.ACTIVE_SUBSCRIPTION_EXISTS,
        code: 'ACTIVE_SUBSCRIPTION_EXISTS',
      });
    }

    // Calculate expiration date based on billing cycle
    const startDate = new Date();
    let expiresAt: Date | null = null;

    if (createSubscriptionDto.expiresAt) {
      // Use provided expiration date
      expiresAt = new Date(createSubscriptionDto.expiresAt);
    } else if (createSubscriptionDto.billingCycle) {
      // Calculate based on billing cycle
      expiresAt = new Date(startDate);
      if (createSubscriptionDto.billingCycle === 'monthly') {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      } else if (createSubscriptionDto.billingCycle === 'yearly') {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      }
    }

    const subscriptionData = {
      userId: new Types.ObjectId(createSubscriptionDto.userId),
      planId: plan._id as Types.ObjectId,
      status: createSubscriptionDto.status || 'active',
      startedAt: startDate,
      expiresAt,
    };

    const subscription = new this.subscriptionModel(subscriptionData);
    const savedSubscription = await subscription.save();

    // Update user with subscription details and onboarding progress
    await this.userModel.findByIdAndUpdate(createSubscriptionDto.userId, {
      subscriptionId: savedSubscription._id,
      onboardingProgress: ['plan_selected', 'account_created'],
      onboardingComplete: false,
      setupComplete: false,
    });

    return savedSubscription;
  }

  async getSubscriptionByUser(userId: string): Promise<Subscription | null> {
    return await this.subscriptionModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .populate('planId')
      .exec();
  }

  async getSubscriptionById(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.subscriptionModel
      .findById(subscriptionId)
      .populate('planId')
      .exec();

    if (!subscription) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.SUBSCRIPTION_NOT_FOUND,
        code: 'SUBSCRIPTION_NOT_FOUND',
      });
    }

    return subscription;
  }

  async updateSubscriptionStatus(
    subscriptionId: string,
    updateStatusDto: UpdateSubscriptionStatusDto,
  ): Promise<Subscription> {
    const subscription = await this.subscriptionModel.findById(subscriptionId);
    if (!subscription) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.SUBSCRIPTION_NOT_FOUND,
        code: 'SUBSCRIPTION_NOT_FOUND',
      });
    }

    subscription.status = updateStatusDto.status;

    // Set expiry date if cancelling
    if (updateStatusDto.status === 'cancelled') {
      subscription.expiresAt = new Date();
    }

    return await subscription.save();
  }

  async getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return await this.subscriptionPlanModel.find().exec();
  }

  async getSubscriptionPlan(planId: string): Promise<SubscriptionPlan> {
    const plan = await this.subscriptionPlanModel.findById(planId);
    if (!plan) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.SUBSCRIPTION_PLAN_NOT_FOUND,
        code: 'SUBSCRIPTION_PLAN_NOT_FOUND',
      });
    }
    return plan;
  }

  async validatePlan(planId: string, planType: string): Promise<boolean> {
    const plan = await this.getSubscriptionPlan(planId);
    return plan.name.toLowerCase() === planType.toLowerCase();
  }

  async validateSubscriptionLimits(
    subscriptionId: string,
    entityCounts: { organizations: number; complexes: number; clinics: number },
  ): Promise<boolean> {
    const subscription = await this.getSubscriptionById(subscriptionId);
    const plan = subscription.planId as any; // Populated plan

    return ValidationUtil.validatePlanLimits(plan.name, entityCounts);
  }

  async isSubscriptionActive(subscriptionId: string): Promise<boolean> {
    const subscription = await this.getSubscriptionById(subscriptionId);

    if (subscription.status !== 'active') {
      return false;
    }

    // Check if subscription has expired
    if (subscription.expiresAt && subscription.expiresAt < new Date()) {
      // Auto-update status to inactive
      await this.updateSubscriptionStatus(subscriptionId, {
        status: 'inactive',
      });
      return false;
    }

    return true;
  }

  async getSubscriptionWithPlan(
    subscriptionId: string,
  ): Promise<{ subscription: Subscription; plan: SubscriptionPlan }> {
    const subscription = await this.getSubscriptionById(subscriptionId);

    // planId is already populated by getSubscriptionById, so we can use it directly
    const plan = subscription.planId as any; // This is now the populated SubscriptionPlan object

    if (!plan || !plan._id) {
      throw new NotFoundException('Subscription plan not found');
    }

    return { subscription, plan };
  }
}
