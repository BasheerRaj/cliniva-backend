import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';
import { AppointmentSchema } from '../database/schemas/appointment.schema';
import { PatientSchema } from '../database/schemas/patient.schema';
import { UserSchema } from '../database/schemas/user.schema';
import { ClinicSchema } from '../database/schemas/clinic.schema';
import { ServiceSchema } from '../database/schemas/service.schema';
import { SubscriptionSchema } from '../database/schemas/subscription.schema';
import { SubscriptionPlanSchema } from '../database/schemas/subscription-plan.schema';
import { SubscriptionModule } from '../subscription/subscription.module';
import { PatientModule } from '../patient/patient.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Appointment', schema: AppointmentSchema },
      { name: 'Patient', schema: PatientSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Clinic', schema: ClinicSchema },
      { name: 'Service', schema: ServiceSchema },
      { name: 'Subscription', schema: SubscriptionSchema },
      { name: 'SubscriptionPlan', schema: SubscriptionPlanSchema },
    ]),
    SubscriptionModule,
    PatientModule,
  ],
  controllers: [AppointmentController],
  providers: [AppointmentService],
  exports: [AppointmentService],
})
export class AppointmentModule {}
