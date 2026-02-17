import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PatientService } from './patient.service';
import { PatientController } from './patient.controller';
import { PatientSchema } from '../database/schemas/patient.schema';
import { UserSchema } from '../database/schemas/user.schema';
import { AppointmentSchema } from '../database/schemas/appointment.schema';
import { SubscriptionSchema } from '../database/schemas/subscription.schema';
import { SubscriptionPlanSchema } from '../database/schemas/subscription-plan.schema';
import { SubscriptionModule } from '../subscription/subscription.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Patient', schema: PatientSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Appointment', schema: AppointmentSchema },
      { name: 'Subscription', schema: SubscriptionSchema },
      { name: 'SubscriptionPlan', schema: SubscriptionPlanSchema },
    ]),
    SubscriptionModule,
    AuthModule,
  ],
  controllers: [PatientController],
  providers: [PatientService],
  exports: [PatientService],
})
export class PatientModule {}
