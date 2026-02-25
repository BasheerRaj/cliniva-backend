import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';
import { AppointmentCrudService } from './appointment-crud.service';
import { AppointmentConflictService } from './appointment-conflict.service';
import { AppointmentSchema } from '../database/schemas/appointment.schema';
import { PatientSchema } from '../database/schemas/patient.schema';
import { UserSchema } from '../database/schemas/user.schema';
import { ClinicSchema } from '../database/schemas/clinic.schema';
import { ServiceSchema } from '../database/schemas/service.schema';
import { DepartmentSchema } from '../database/schemas/department.schema';
import { MedicalReportSchema } from '../database/schemas/medical-report.schema';
import { SubscriptionSchema } from '../database/schemas/subscription.schema';
import { SubscriptionPlanSchema } from '../database/schemas/subscription-plan.schema';
import { ScheduleSchema } from '../database/schemas/schedule.schema';
import { ClinicServiceSchema } from '../database/schemas/clinic-service.schema';
import { DoctorServiceSchema } from '../database/schemas/doctor-service.schema';
import { SubscriptionModule } from '../subscription/subscription.module';
import { PatientModule } from '../patient/patient.module';
import { AuthModule } from '../auth/auth.module';
import { WorkingHoursModule } from '../working-hours/working-hours.module';
import { WorkingHoursIntegrationService } from './services/working-hours-integration.service';
import { AppointmentWorkingHoursService } from './services/appointment-working-hours.service';
import { AppointmentValidationService } from './services/appointment-validation.service';
import { AppointmentStatusService } from './services/appointment-status.service';
import { AppointmentLifecycleService } from './services/appointment-lifecycle.service';
import { AppointmentCalendarService } from './services/appointment-calendar.service';
import { SessionValidationService } from './services/session-validation.service';
import { AppointmentSessionService } from './services/appointment-session.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Appointment', schema: AppointmentSchema },
      { name: 'Patient', schema: PatientSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Clinic', schema: ClinicSchema },
      { name: 'Service', schema: ServiceSchema },
      { name: 'Department', schema: DepartmentSchema },
      { name: 'MedicalReport', schema: MedicalReportSchema },
      { name: 'Subscription', schema: SubscriptionSchema },
      { name: 'SubscriptionPlan', schema: SubscriptionPlanSchema },
      { name: 'Schedule', schema: ScheduleSchema },
      { name: 'ClinicService', schema: ClinicServiceSchema },
      { name: 'DoctorService', schema: DoctorServiceSchema },
    ]),
    SubscriptionModule,
    PatientModule,
    AuthModule,
    WorkingHoursModule,
  ],
  controllers: [AppointmentController],
  providers: [
    AppointmentService,
    AppointmentCrudService,
    AppointmentConflictService,
    WorkingHoursIntegrationService,
    AppointmentWorkingHoursService,
    AppointmentValidationService,
    AppointmentStatusService,
    AppointmentLifecycleService,
    AppointmentCalendarService,
    SessionValidationService,
    AppointmentSessionService,
  ],
  exports: [
    AppointmentService,
    AppointmentCrudService,
    AppointmentConflictService,
    WorkingHoursIntegrationService,
    AppointmentWorkingHoursService,
    AppointmentValidationService,
    AppointmentStatusService,
    AppointmentLifecycleService,
    AppointmentCalendarService,
    SessionValidationService,
    AppointmentSessionService,
  ],
})
export class AppointmentModule {}
