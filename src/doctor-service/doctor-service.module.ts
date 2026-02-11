import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DoctorServiceController } from './doctor-service.controller';
import { DoctorServiceService } from './doctor-service.service';
import { DoctorServiceSchema } from '../database/schemas/doctor-service.schema';
import { ServiceSchema } from '../database/schemas/service.schema';
import { ClinicServiceSchema } from '../database/schemas/clinic-service.schema';
import { AppointmentSchema } from '../database/schemas/appointment.schema';
import { UserSchema } from '../database/schemas/user.schema';
import { ClinicSchema } from '../database/schemas/clinic.schema';
import { EmployeeShiftSchema } from '../database/schemas/employee-shift.schema';
import { EmployeeProfileSchema } from '../database/schemas/employee-profile.schema';
import { SubscriptionSchema } from '../database/schemas/subscription.schema';
import { SubscriptionPlanSchema } from '../database/schemas/subscription-plan.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'DoctorService', schema: DoctorServiceSchema },
      { name: 'Service', schema: ServiceSchema },
      { name: 'ClinicService', schema: ClinicServiceSchema },
      { name: 'Appointment', schema: AppointmentSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Clinic', schema: ClinicSchema },
      { name: 'EmployeeShift', schema: EmployeeShiftSchema },
      { name: 'EmployeeProfile', schema: EmployeeProfileSchema },
      { name: 'Subscription', schema: SubscriptionSchema },
      { name: 'SubscriptionPlan', schema: SubscriptionPlanSchema },
    ]),
    AuthModule,
  ],
  controllers: [DoctorServiceController],
  providers: [DoctorServiceService],
  exports: [DoctorServiceService],
})
export class DoctorServiceModule {}

