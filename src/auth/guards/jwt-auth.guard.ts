import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../../database/schemas/user.schema';
import { Subscription } from '../../database/schemas/subscription.schema';
import { SubscriptionPlan } from '../../database/schemas/subscription-plan.schema';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Subscription.name) private readonly subscriptionModel: Model<Subscription>,
    @InjectModel(SubscriptionPlan.name) private readonly subscriptionPlanModel: Model<SubscriptionPlan>,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // Temporarily simplified - just use standard JWT authentication
      const result = await super.canActivate(context);
      console.log('🔐 JWT Auth result:', result);
      
      if (!result) {
        console.log('❌ JWT authentication failed');
        return false;
      }

      const request = context.switchToHttp().getRequest();
      console.log('👤 Authenticated user:', request.user);
      
      return true;
    } catch (error) {
      console.error('❌ JWT Auth Guard error:', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  // Temporarily comment out the complex enhancement
  /* 
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First, perform the standard JWT authentication
    const result = await super.canActivate(context);
    
    if (!result) {
      return false;
    }

    // Enhance the request with additional context
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new UnauthorizedException('Invalid user context');
    }

    try {
      // Fetch complete user data
      const userDoc = await this.userModel.findById(user.id).exec();
      if (!userDoc) {
        throw new UnauthorizedException('User not found');
      }

      // Fetch subscription data if available
      let subscription: any = null;
      let subscriptionPlan: any = null;
      
      if (userDoc.subscriptionId) {
        subscription = await this.subscriptionModel
          .findById(userDoc.subscriptionId)
          .populate('planId')
          .exec();
        
        if (subscription) {
          subscriptionPlan = subscription.planId; // SubscriptionPlan after populate
        }
      }

      // Add enhanced context to the request
      request.user = {
        ...user,
        // Core user data
        email: userDoc.email,
        firstName: userDoc.firstName,
        lastName: userDoc.lastName,
        role: userDoc.role,
        isActive: userDoc.isActive,
        
        // Setup status
        setupComplete: userDoc.setupComplete,
        onboardingComplete: userDoc.onboardingComplete,
        onboardingProgress: userDoc.onboardingProgress || [],
        
        // Entity references
        organizationId: userDoc.organizationId?.toString(),
        complexId: userDoc.complexId?.toString(),
        clinicId: userDoc.clinicId?.toString(),
        
        // Subscription context
        subscriptionId: userDoc.subscriptionId?.toString(),
        subscription: subscription ? {
          id: (subscription._id as any).toString(),
          status: subscription.status,
          startedAt: subscription.startedAt,
          expiresAt: subscription.expiresAt,
          planType: subscriptionPlan?.name?.toLowerCase(),
          plan: subscriptionPlan ? {
            id: (subscriptionPlan._id as any).toString(),
            name: subscriptionPlan.name,
            maxOrganizations: subscriptionPlan.maxOrganizations,
            maxComplexes: subscriptionPlan.maxComplexes,
            maxClinics: subscriptionPlan.maxClinics,
            price: subscriptionPlan.price
          } : null
        } : null,

        // Flags for quick access
        hasActiveSubscription: subscription?.status === 'active',
        isSetupComplete: userDoc.setupComplete,
        isOnboardingComplete: userDoc.onboardingComplete
      };

      return true;
    } catch (error) {
      console.error('JWT Auth Guard enhancement error:', error);
      // Don't fail authentication due to context enhancement errors
      // Just log and continue with basic user data
      return true;
    }
  }
  */

  // Helper method to get enhanced user context
  static getEnhancedUser(request: any) {
    return request.user || null;
  }

  // Helper method to check if user has active subscription
  static hasActiveSubscription(request: any): boolean {
    return request.user?.hasActiveSubscription || false;
  }

  // Helper method to get user's subscription plan type
  static getSubscriptionPlanType(request: any): string | null {
    return request.user?.subscription?.planType || null;
  }

  // Helper method to check setup completion status
  static isSetupComplete(request: any): boolean {
    return request.user?.isSetupComplete || false;
  }

  // Helper method to check onboarding completion status  
  static isOnboardingComplete(request: any): boolean {
    return request.user?.isOnboardingComplete || false;
  }
}



