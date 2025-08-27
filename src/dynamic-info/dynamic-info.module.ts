import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DynamicInfoService } from './dynamic-info.service';
import { DynamicInfoController } from './dynamic-info.controller';
import { DynamicInfoSchema } from '../database/schemas/dynamic-info.schema';
import { CommonModule } from '../common/common.module';
import { AuthModule } from '../auth/auth.module';
import { User, UserSchema } from '../database/schemas/user.schema';
import { Subscription, SubscriptionSchema } from '../database/schemas/subscription.schema';
import { SubscriptionPlan, SubscriptionPlanSchema } from '../database/schemas/subscription-plan.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'DynamicInfo', schema: DynamicInfoSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Subscription', schema: SubscriptionSchema },
      { name: 'SubscriptionPlan', schema: SubscriptionPlanSchema }
    ]),
    CommonModule,
    AuthModule,
  ],
  controllers: [DynamicInfoController],
  providers: [DynamicInfoService],
  exports: [DynamicInfoService],
})
export class DynamicInfoModule {}
