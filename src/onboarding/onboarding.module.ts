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
import { CommonModule } from '../common/common.module';

// Schemas
import { UserSchema } from '../database/schemas/user.schema';
import { SubscriptionPlanSchema } from '../database/schemas/subscription-plan.schema';

@Module({
  imports: [
    // Mongoose models
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'SubscriptionPlan', schema: SubscriptionPlanSchema },
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
    CommonModule,
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
