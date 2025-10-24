import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ComplexService } from './complex.service';
import { ComplexController } from './complex.controller';
import { ComplexSchema } from '../database/schemas/complex.schema';
import { UserSchema } from '../database/schemas/user.schema';
import { OrganizationSchema } from '../database/schemas/organization.schema';
import { SubscriptionSchema } from '../database/schemas/subscription.schema';
import { SubscriptionPlanSchema } from '../database/schemas/subscription-plan.schema';
import { SubscriptionModule } from '../subscription/subscription.module';
import { CommonModule } from '../common/common.module';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Complex', schema: ComplexSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Organization', schema: OrganizationSchema },
      { name: 'Subscription', schema: SubscriptionSchema },
      { name: 'SubscriptionPlan', schema: SubscriptionPlanSchema },
    ]),
    SubscriptionModule,
    CommonModule,
  ],
  controllers: [ComplexController],
  providers: [ComplexService, RolesGuard],
  exports: [ComplexService],
})
export class ComplexModule {}