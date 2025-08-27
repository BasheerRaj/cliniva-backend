import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ValidationController } from './validation.controller';
import { OrganizationModule } from '../organization/organization.module';
import { ComplexModule } from '../complex/complex.module';
import { ClinicModule } from '../clinic/clinic.module';
import { AuthModule } from '../auth/auth.module';
import { User, UserSchema } from '../database/schemas/user.schema';
import { Subscription, SubscriptionSchema } from '../database/schemas/subscription.schema';
import { SubscriptionPlan, SubscriptionPlanSchema } from '../database/schemas/subscription-plan.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'Subscription', schema: SubscriptionSchema },
      { name: 'SubscriptionPlan', schema: SubscriptionPlanSchema }
    ]),
    AuthModule,
    OrganizationModule,
    ComplexModule,
    ClinicModule,
  ],
  controllers: [ValidationController],
  providers: [],
  exports: [],
})
export class ValidationModule {} 