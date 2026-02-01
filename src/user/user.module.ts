import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User, UserSchema } from '../database/schemas/user.schema';
import { Organization, OrganizationSchema } from '../database/schemas/organization.schema';
import { Complex, ComplexSchema } from '../database/schemas/complex.schema';
import { Clinic, ClinicSchema } from '../database/schemas/clinic.schema';
import { Subscription, SubscriptionSchema } from '../database/schemas/subscription.schema';
import { SubscriptionPlan, SubscriptionPlanSchema } from '../database/schemas/subscription-plan.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Organization.name, schema: OrganizationSchema },
      { name: Complex.name, schema: ComplexSchema },
      { name: Clinic.name, schema: ClinicSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
    ]),
    forwardRef(() => AuthModule), // Use forwardRef to avoid circular dependency
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
