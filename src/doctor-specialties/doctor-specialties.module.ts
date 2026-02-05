import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DoctorSpecialtiesService } from './doctor-specialties.service';
import { DoctorSpecialtiesController } from './doctor-specialties.controller';
import { DoctorSpecialtySchema } from '../database/schemas/doctor-specialty.schema';
import { UserSchema } from '../database/schemas/user.schema';
import { SpecialtySchema } from '../database/schemas/specialty.schema';
import { SubscriptionSchema } from '../database/schemas/subscription.schema';
import { SubscriptionPlanSchema } from '../database/schemas/subscription-plan.schema';
import { CommonModule } from '../common/common.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'DoctorSpecialty', schema: DoctorSpecialtySchema },
      { name: 'User', schema: UserSchema },
      { name: 'Specialty', schema: SpecialtySchema },
      { name: 'Subscription', schema: SubscriptionSchema },
      { name: 'SubscriptionPlan', schema: SubscriptionPlanSchema },
    ]),
    CommonModule,
    AuthModule,
  ],
  controllers: [DoctorSpecialtiesController],
  providers: [DoctorSpecialtiesService],
  exports: [DoctorSpecialtiesService],
})
export class DoctorSpecialtiesModule {}
