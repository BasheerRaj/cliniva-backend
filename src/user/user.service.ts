import {
  Injectable,
  NotFoundException,
  Logger,

} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../database/schemas/user.schema';
import { Organization } from '../database/schemas/organization.schema';
import { Complex } from '../database/schemas/complex.schema';
import { Clinic } from '../database/schemas/clinic.schema';
import { Subscription } from '../database/schemas/subscription.schema';
import { SubscriptionPlan } from '../database/schemas/subscription-plan.schema';
import { UserEntitiesResponseDto } from './dto/check-user-entities.dto';
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Organization.name)
    private organizationModel: Model<Organization>,
    @InjectModel(Complex.name) private complexModel: Model<Complex>,
    @InjectModel(Clinic.name) private clinicModel: Model<Clinic>,
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<Subscription>,
    @InjectModel(SubscriptionPlan.name)
    private subscriptionPlanModel: Model<SubscriptionPlan>,
  ) {}

  async checkUserEntities(userId: string): Promise<UserEntitiesResponseDto> {
    try {
      // Validate userId can be converted to ObjectId
      if (!Types.ObjectId.isValid(userId)) {
        throw new NotFoundException(`Invalid userId format: ${userId}`);
      }

      // Get user with subscription info
      console.log('🔍 Looking for user with ID:', userId);
      const user = await this.userModel
        .findById(userId)
        .populate('subscriptionId')
        .exec();
      console.log(
        '👤 Found user:',
        user ? `${user.email} (${user.role})` : 'null',
      );
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Get subscription details
      const subscription = await this.subscriptionModel
        .findById(user.subscriptionId)
        .populate('planId')
        .exec();
      if (!subscription) {
        throw new NotFoundException('User subscription not found');
      }

      const plan = subscription.planId as any; // Populated SubscriptionPlan
      const planType = plan.name; // clinic, complex, company

      // Check existing entities
      const [organizationCount, complexCount, clinicCount] = await Promise.all([
        this.organizationModel
          .countDocuments({ ownerId: new Types.ObjectId(userId) })
          .exec(),
        this.complexModel
          .countDocuments({ ownerId: new Types.ObjectId(userId) })
          .exec(),
        this.clinicModel
          .countDocuments({ ownerId: new Types.ObjectId(userId) })
          .exec(),
      ]);

      console.log('📊 Entity counts:', {
        organizationCount,
        complexCount,
        clinicCount,
        userId,
      });

      const hasOrganization = organizationCount > 0;
      const hasComplex = complexCount > 0;
      const hasClinic = clinicCount > 0;

      // Determine what the user needs based on their plan
      let needsSetup = false;
      let nextStep = 'dashboard';
      let hasPrimaryEntity = false;

      switch (planType) {
        case 'company':
          // Company plan requires organization as primary entity
          hasPrimaryEntity = hasOrganization;
          if (!hasOrganization) {
            needsSetup = true;
            nextStep = 'setup-company';
          }
          break;

        case 'complex':
          // Complex plan requires complex as primary entity
          hasPrimaryEntity = hasComplex;
          if (!hasComplex) {
            needsSetup = true;
            nextStep = 'setup-complex';
          }
          break;

        case 'clinic':
          // Clinic plan requires clinic as primary entity
          hasPrimaryEntity = hasClinic;
          if (!hasClinic) {
            needsSetup = true;
            nextStep = 'setup-clinic';
          }
          break;

        default:
          this.logger.warn(`Unknown plan type: ${planType}`);
          needsSetup = true;
          nextStep = 'setup-clinic';
      }

      return {
        hasOrganization,
        hasComplex,
        hasClinic,
        planType,
        hasPrimaryEntity,
        needsSetup,
        nextStep,
      };
    } catch (error) {
      this.logger.error(
        `Error checking user entities for user ${userId}:`,
        error,
      );
      throw error;
    }
  }
}
