import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserAccessService } from './user-access.service';
import { UserAccessController } from './user-access.controller';
import { UserAccessSchema } from '../database/schemas/user-access.schema';
import { AccessLogSchema } from '../database/schemas/access-log.schema';
import { UserSchema } from '../database/schemas/user.schema';
import { OrganizationSchema } from '../database/schemas/organization.schema';
import { ComplexSchema } from '../database/schemas/complex.schema';
import { ClinicSchema } from '../database/schemas/clinic.schema';
import { SubscriptionSchema } from '../database/schemas/subscription.schema';
import { SubscriptionPlanSchema } from '../database/schemas/subscription-plan.schema';
import { SubscriptionModule } from '../subscription/subscription.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'UserAccess', schema: UserAccessSchema },
      { name: 'AccessLog', schema: AccessLogSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Organization', schema: OrganizationSchema },
      { name: 'Complex', schema: ComplexSchema },
      { name: 'Clinic', schema: ClinicSchema },
      { name: 'Subscription', schema: SubscriptionSchema },
      { name: 'SubscriptionPlan', schema: SubscriptionPlanSchema },
    ]),
    SubscriptionModule,
    CommonModule,
  ],
  controllers: [UserAccessController],
  providers: [UserAccessService],
  exports: [UserAccessService],
})
export class UserAccessModule {}
