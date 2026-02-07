import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

// Core Entity Modules
import { SubscriptionModule } from '../subscription/subscription.module';
import { OrganizationModule } from '../organization/organization.module';
import { ComplexModule } from '../complex/complex.module';
import { ClinicModule } from '../clinic/clinic.module';
import { DepartmentModule } from '../department/department.module';
import { ServiceModule } from '../service/service.module';

// Supporting Modules
import { WorkingHoursModule } from '../working-hours/working-hours.module';
import { ContactModule } from '../contact/contact.module';
import { DynamicInfoModule } from '../dynamic-info/dynamic-info.module';
import { UserAccessModule } from '../user-access/user-access.module';
import { UserModule } from '../user/user.module';
import { CommonModule } from '../common/common.module';
import { AuthModule } from '../auth/auth.module';

// Schemas
import { UserSchema } from '../database/schemas/user.schema';
import { SubscriptionSchema } from '../database/schemas/subscription.schema';
import { SubscriptionPlanSchema } from '../database/schemas/subscription-plan.schema';
import { OrganizationSchema } from '../database/schemas/organization.schema';
import { ComplexSchema } from '../database/schemas/complex.schema';
import { ClinicSchema } from '../database/schemas/clinic.schema';
import { WorkingHoursSchema } from '../database/schemas/working-hours.schema';

// Services
import { OnboardingValidationService } from './services/onboarding-validation.service';
import { OnboardingProgressService } from './services/onboarding-progress.service';
import { OnboardingPlanLimitService } from './services/onboarding-plan-limit.service';
import { OnboardingSkipLogicService } from './services/onboarding-skip-logic.service';
import { OnboardingWorkingHoursService } from './services/onboarding-working-hours.service';
import { OnboardingEntityFactoryService } from './services/onboarding-entity-factory.service';

@Module({
  imports: [
    // Mongoose models
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'Subscription', schema: SubscriptionSchema },
      { name: 'SubscriptionPlan', schema: SubscriptionPlanSchema },
      { name: 'Organization', schema: OrganizationSchema },
      { name: 'Complex', schema: ComplexSchema },
      { name: 'Clinic', schema: ClinicSchema },
      { name: 'WorkingHours', schema: WorkingHoursSchema },
    ]),

    // Core entity modules
    SubscriptionModule,
    OrganizationModule,
    ComplexModule,
    ClinicModule,
    DepartmentModule,
    ServiceModule,

    // Supporting modules
    WorkingHoursModule,
    ContactModule,
    DynamicInfoModule,
    UserAccessModule,
    UserModule,
    CommonModule,
    AuthModule,
  ],
  controllers: [OnboardingController],
  providers: [
    OnboardingService,
    OnboardingValidationService,
    OnboardingProgressService,
    OnboardingPlanLimitService,
    OnboardingSkipLogicService,
    OnboardingWorkingHoursService,
    OnboardingEntityFactoryService,
  ],
  exports: [
    OnboardingService,
    OnboardingValidationService,
    OnboardingProgressService,
    OnboardingPlanLimitService,
    OnboardingSkipLogicService,
    OnboardingWorkingHoursService,
    OnboardingEntityFactoryService,
  ],
})
export class OnboardingModule {}
