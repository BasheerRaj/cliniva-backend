import { Injectable, CanActivate, ExecutionContext, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../../database/schemas/user.schema';
import { Organization } from '../../database/schemas/organization.schema';
import { Complex } from '../../database/schemas/complex.schema';
import { Clinic } from '../../database/schemas/clinic.schema';
import { Subscription } from '../../database/schemas/subscription.schema';
import { SubscriptionPlan } from '../../database/schemas/subscription-plan.schema';

export interface SetupRequirement {
  requireOnboardingComplete?: boolean; // Require user.onboardingComplete = true
  requireSetupComplete?: boolean; // Require user.setupComplete = true
  requireActiveSubscription?: boolean; // Require active subscription
  requireEntitiesForPlan?: boolean; // Require entities based on subscription plan
  allowIncompleteSetup?: boolean; // Allow access even if setup is incomplete (for onboarding endpoints)
}

// Decorator to set setup completion requirements
export const RequireSetupCompletion = (requirements: SetupRequirement = {}) =>
  (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    Reflect.defineMetadata('setupRequirements', requirements, descriptor?.value || target);
    return descriptor || target;
  };

@Injectable()
export class SetupCompletionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('Organization') private readonly organizationModel: Model<Organization>,
    @InjectModel('Complex') private readonly complexModel: Model<Complex>,
    @InjectModel('Clinic') private readonly clinicModel: Model<Clinic>,
    @InjectModel('Subscription') private readonly subscriptionModel: Model<Subscription>,
    @InjectModel('SubscriptionPlan') private readonly subscriptionPlanModel: Model<SubscriptionPlan>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirements = this.reflector.get<SetupRequirement>('setupRequirements', context.getHandler()) || {};
    
    // If no requirements are set, allow access
    if (Object.keys(requirements).length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      throw new ForbiddenException({
        message: {
          ar: 'المصادقة مطلوبة',
          en: 'Authentication required',
        },
        code: 'AUTHENTICATION_REQUIRED',
      });
    }

    try {
      const userDoc = await this.userModel.findById(user.userId).exec();
      if (!userDoc) {
        throw new ForbiddenException({
          message: {
            ar: 'المستخدم غير موجود',
            en: 'User not found',
          },
          code: 'USER_NOT_FOUND',
        });
      }

      // Check onboarding completion requirement
      if (requirements.requireOnboardingComplete && !userDoc.onboardingComplete) {
        throw new ForbiddenException({
          message: {
            ar: 'يجب إكمال عملية الإعداد للوصول إلى هذا المورد',
            en: 'Onboarding must be completed to access this resource',
          },
          code: 'ONBOARDING_INCOMPLETE',
        });
      }

      // Check setup completion requirement
      if (requirements.requireSetupComplete && !userDoc.setupComplete) {
        throw new ForbiddenException({
          message: {
            ar: 'يجب إكمال إعداد الحساب للوصول إلى هذا المورد',
            en: 'Account setup must be completed to access this resource',
          },
          code: 'SETUP_INCOMPLETE',
        });
      }

      // Check active subscription requirement
      if (requirements.requireActiveSubscription) {
        const hasActiveSubscription = await this.verifyActiveSubscription(userDoc);
        if (!hasActiveSubscription) {
          throw new ForbiddenException({
            message: {
              ar: 'يتطلب اشتراك نشط للوصول إلى هذا المورد',
              en: 'Active subscription required to access this resource',
            },
            code: 'SUBSCRIPTION_REQUIRED',
          });
        }
      }

      // Check entities requirement based on plan
      if (requirements.requireEntitiesForPlan) {
        const hasRequiredEntities = await this.verifyRequiredEntitiesExist(userDoc);
        if (!hasRequiredEntities) {
          throw new ForbiddenException({
            message: {
              ar: 'الكيانات المطلوبة لخطة الاشتراك الخاصة بك مفقودة. يرجى إكمال الإعداد',
              en: 'Required entities for your subscription plan are missing. Please complete setup.',
            },
            code: 'REQUIRED_ENTITIES_MISSING',
          });
        }
      }

      // Add setup context to request for potential use in controller
      request.setupContext = {
        onboardingComplete: userDoc.onboardingComplete,
        setupComplete: userDoc.setupComplete,
        hasActiveSubscription: requirements.requireActiveSubscription ? 
          await this.verifyActiveSubscription(userDoc) : undefined,
        verified: true
      };

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new ForbiddenException({
        message: {
          ar: 'فشل التحقق من الإعداد',
          en: 'Setup verification failed',
        },
        code: 'SETUP_VERIFICATION_FAILED',
      });
    }
  }

  private async verifyActiveSubscription(user: User): Promise<boolean> {
    if (!user.subscriptionId) {
      return false;
    }

    const subscription = await this.subscriptionModel
      .findById(user.subscriptionId)
      .exec();

    return subscription?.status === 'active';
  }

  private async verifyRequiredEntitiesExist(user: User): Promise<boolean> {
    if (!user.subscriptionId) {
      return false;
    }

    const subscription = await this.subscriptionModel
      .findById(user.subscriptionId)
      .populate('planId')
      .exec();

    if (!subscription) {
      return false;
    }

    const plan = subscription.planId as any; // SubscriptionPlan after populate
    if (!plan) {
      return false;
    }

    const planType = plan.name?.toLowerCase();

    switch (planType) {
      case 'company':
        return this.verifyCompanyPlanEntities(user);
      
      case 'complex':
        return this.verifyComplexPlanEntities(user);
      
      case 'clinic':
        return this.verifyClinicPlanEntities(user);
      
      default:
        return false;
    }
  }

  private async verifyCompanyPlanEntities(user: User): Promise<boolean> {
    // Company plan requires: Organization + at least one Complex + at least one Clinic
    const [orgCount, complexCount, clinicCount] = await Promise.all([
      this.organizationModel.countDocuments({ ownerId: (user._id as any) }).exec(),
      this.complexModel.countDocuments().populate('organizationId').exec().then(async () => {
        const complexes = await this.complexModel.find().populate('organizationId').exec();
        return complexes.filter(complex => 
          complex.organizationId && (complex.organizationId as any).ownerId?.toString() === (user._id as any).toString()
        ).length;
      }),
      this.clinicModel.countDocuments().exec().then(async () => {
        const clinics = await this.clinicModel.find().populate('complexId').exec();
        let count = 0;
        for (const clinic of clinics) {
          if (clinic.complexId) {
            const complex = await this.complexModel.findById(clinic.complexId).populate('organizationId').exec();
                         if (complex?.organizationId && (complex.organizationId as any).ownerId?.toString() === (user._id as any).toString()) {
              count++;
            }
          }
        }
        return count;
      })
    ]);

    return orgCount > 0 && complexCount > 0 && clinicCount > 0;
  }

  private async verifyComplexPlanEntities(user: User): Promise<boolean> {
    // Complex plan requires: Organization + at least one Clinic
    const [orgCount, clinicCount] = await Promise.all([
      this.organizationModel.countDocuments({ ownerId: (user._id as any) }).exec(),
      this.clinicModel.countDocuments().exec().then(async () => {
        // For complex plan, clinics might be directly linked to organization
        let count = 0;
        const clinics = await this.clinicModel.find().exec();
        const userOrgs = await this.organizationModel.find({ ownerId: (user._id as any) }).exec();
        const userOrgIds = userOrgs.map(org => (org._id as any).toString());
        
        // Check if clinic belongs to user through subscription
        for (const clinic of clinics) {
          const clinicSubscription = await this.subscriptionModel.findById(clinic.subscriptionId).exec();
          if (clinicSubscription && clinicSubscription.userId.toString() === (user._id as any).toString()) {
            count++;
          }
        }
        return count;
      })
    ]);

    return orgCount > 0 && clinicCount > 0;
  }

  private async verifyClinicPlanEntities(user: User): Promise<boolean> {
    // Clinic plan requires: Organization (which acts as the clinic)
    const orgCount = await this.organizationModel.countDocuments({ ownerId: (user._id as any) }).exec();
    return orgCount > 0;
  }

  // Helper method to check setup status for any user
  async getUserSetupStatus(userId: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      return null;
    }

    const [hasActiveSubscription, hasRequiredEntities] = await Promise.all([
      this.verifyActiveSubscription(user),
      this.verifyRequiredEntitiesExist(user)
    ]);

    return {
      userId: (user._id as any).toString(),
      onboardingComplete: user.onboardingComplete || false,
      setupComplete: user.setupComplete || false,
      hasActiveSubscription,
      hasRequiredEntities,
      onboardingProgress: user.onboardingProgress || [],
      subscriptionId: user.subscriptionId?.toString(),
      organizationId: user.organizationId?.toString(),
      complexId: user.complexId?.toString(),
      clinicId: user.clinicId?.toString()
    };
  }

  // Helper method to update user setup status
  async markUserSetupComplete(userId: string): Promise<boolean> {
    try {
      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        return false;
      }

      const hasRequiredEntities = await this.verifyRequiredEntitiesExist(user);
      if (!hasRequiredEntities) {
        return false;
      }

      await this.userModel.findByIdAndUpdate(userId, {
        setupComplete: true,
        onboardingComplete: true
      }).exec();

      return true;
    } catch (error) {
      return false;
    }
  }
} 