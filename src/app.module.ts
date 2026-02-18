import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { UploadModule } from './upload/upload.module';
import { DepartmentModule } from './department/department.module';
import { ServiceModule } from './service/service.module';
import { SpecialtyModule } from './specialty/specialty.module';
import { ContactModule } from './contact/contact.module';
import { ComplexModule } from './complex/complex.module';
import { ClinicModule } from './clinic/clinic.module';
import { OrganizationModule } from './organization/organization.module';
import { WorkingHoursModule } from './working-hours/working-hours.module';
import { DynamicInfoModule } from './dynamic-info/dynamic-info.module';
import { UserAccessModule } from './user-access/user-access.module';
import { UserModule } from './user/user.module';
import { ValidationModule } from './validation/validation.module';
import { PatientModule } from './patient/patient.module';
import { AppointmentModule } from './appointment/appointment.module';
import { MedicalReportModule } from './medical-report/medical-report.module';
import { EmployeeModule } from './employee/employee.module';
import { ScheduleModule } from './schedule/schedule.module';
import { DoctorSpecialtiesModule } from './doctor-specialties/doctor-specialties.module';
import { EmergencyContactsModule } from './emergency-contacts/emergency-contacts.module';
import { DoctorServiceModule } from './doctor-service/doctor-service.module';
import { ServiceOfferModule } from './service-offer/service-offer.module';
import { NotificationModule } from './notification/notification.module';
import { PatientPortalModule } from './patient-portal/patient-portal.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    DatabaseModule,
    AuthModule,
    OnboardingModule,
    SubscriptionModule,
    UploadModule,
    ValidationModule,
    DepartmentModule,
    ServiceModule,
    SpecialtyModule,
    ContactModule,
    ComplexModule,
    ClinicModule,
    OrganizationModule,
    WorkingHoursModule,
    DynamicInfoModule,
    UserAccessModule,
    UserModule,
    PatientModule,
    AppointmentModule,
    MedicalReportModule,
    EmployeeModule,
    ScheduleModule,
    DoctorSpecialtiesModule,
    EmergencyContactsModule,
    DoctorServiceModule,
    ServiceOfferModule,
    NotificationModule,
    PatientPortalModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
