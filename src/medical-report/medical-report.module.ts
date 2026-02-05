import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MedicalReportService } from './medical-report.service';
import { MedicalReportController } from './medical-report.controller';
import { MedicalReportSchema } from '../database/schemas/medical-report.schema';
import { AppointmentSchema } from '../database/schemas/appointment.schema';
import { PatientSchema } from '../database/schemas/patient.schema';
import { UserSchema } from '../database/schemas/user.schema';
import { SubscriptionSchema } from '../database/schemas/subscription.schema';
import { SubscriptionPlanSchema } from '../database/schemas/subscription-plan.schema';
import { SubscriptionModule } from '../subscription/subscription.module';
import { PatientModule } from '../patient/patient.module';
import { AppointmentModule } from '../appointment/appointment.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'MedicalReport', schema: MedicalReportSchema },
      { name: 'Appointment', schema: AppointmentSchema },
      { name: 'Patient', schema: PatientSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Subscription', schema: SubscriptionSchema },
      { name: 'SubscriptionPlan', schema: SubscriptionPlanSchema },
    ]),
    SubscriptionModule,
    PatientModule,
    AppointmentModule,
    AuthModule,
  ],
  controllers: [MedicalReportController],
  providers: [MedicalReportService],
  exports: [MedicalReportService],
})
export class MedicalReportModule {}
