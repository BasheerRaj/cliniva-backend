import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SpecialtyController } from './specialty.controller';
import { SpecialtyService } from './specialty.service';
import { SpecialtySchema } from '../database/schemas/specialty.schema';
import {
  DoctorSpecialty,
  DoctorSpecialtySchema,
} from '../database/schemas/doctor-specialty.schema';
import { Complex, ComplexSchema } from '../database/schemas/complex.schema';
import { UserSchema } from '../database/schemas/user.schema';
import { SubscriptionSchema } from '../database/schemas/subscription.schema';
import { SubscriptionPlanSchema } from '../database/schemas/subscription-plan.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Specialty', schema: SpecialtySchema },
      { name: 'DoctorSpecialty', schema: DoctorSpecialtySchema },
      { name: 'Complex', schema: ComplexSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Subscription', schema: SubscriptionSchema },
      { name: 'SubscriptionPlan', schema: SubscriptionPlanSchema },
    ]),
    AuthModule,
  ],
  controllers: [SpecialtyController],
  providers: [SpecialtyService],
  exports: [SpecialtyService],
})
export class SpecialtyModule {}
