import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseService } from './database.service';
import { DatabaseController } from './database.controller';
import { DatabaseSeederService } from './seeders/database-seeder.service';
import { EntitiesSeederService } from './seeders/entities.seeder';
import { ExampleDataSeederService } from './seeders/example-data.seeder';
import { TestDataSeederService } from './seeders/test-data.seeder';
import { DatabaseInitializerService } from './database-initializer.service';
import {
  ServiceOffer,
  ServiceOfferSchema,
} from '../service-offer/schemas/service-offer.schema';

// Import all schemas
import {
  SubscriptionPlan,
  SubscriptionPlanSchema,
  Subscription,
  SubscriptionSchema,
  User,
  UserSchema,
  UserAccess,
  UserAccessSchema,
  UserLocation,
  UserLocationSchema,
  Organization,
  OrganizationSchema,
  Complex,
  ComplexSchema,
  Department,
  DepartmentSchema,
  ComplexDepartment,
  ComplexDepartmentSchema,
  Clinic,
  ClinicSchema,
  Specialty,
  SpecialtySchema,
  DoctorSpecialty,
  DoctorSpecialtySchema,
  Patient,
  PatientSchema,
  Service,
  ServiceSchema,
  ClinicService,
  ClinicServiceSchema,
  Appointment,
  AppointmentSchema,
  MedicalReport,
  MedicalReportSchema,
  Offer,
  OfferSchema,
  OfferTarget,
  OfferTargetSchema,
  AppointmentOffer,
  AppointmentOfferSchema,
  Invoice,
  InvoiceSchema,
  Payment,
  PaymentSchema,
  Counter,
  CounterSchema,
  InsuranceClaim,
  InsuranceClaimSchema,
  Notification,
  NotificationSchema,
  EmailTemplate,
  EmailTemplateSchema,
  SmsTemplate,
  SmsTemplateSchema,
  DynamicInfo,
  DynamicInfoSchema,
  Contact,
  ContactSchema,
  WorkingHours,
  WorkingHoursSchema,
  EmployeeShift,
  EmployeeShiftSchema,
  EmployeeProfile,
  EmployeeProfileSchema,
  DoctorServiceSchema,
  AuditLog,
  AuditLogSchema,
  TokenBlacklist,
  TokenBlacklistSchema,
  RateLimitCounter,
  RateLimitCounterSchema,
} from './schemas';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri:
          configService.get<string>('MONGODB_URI') ||
          'mongodb://localhost:27017/cliniva',
        connectionFactory: (connection) => {
          connection.on('connected', () => {
            console.log('✅ MongoDB connected successfully');
          });
          connection.on('error', (error) => {
            console.error('❌ MongoDB connection error:', error);
          });
          connection.on('disconnected', () => {
            console.log('⚠️ MongoDB disconnected');
          });
          return connection;
        },
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      // Subscription Management
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
      { name: Subscription.name, schema: SubscriptionSchema },

      // User Management
      { name: User.name, schema: UserSchema },
      { name: UserAccess.name, schema: UserAccessSchema },
      { name: UserLocation.name, schema: UserLocationSchema },

      // Organizational Structure
      { name: Organization.name, schema: OrganizationSchema },
      { name: Complex.name, schema: ComplexSchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: ComplexDepartment.name, schema: ComplexDepartmentSchema },
      { name: Clinic.name, schema: ClinicSchema },

      // Medical Specialties
      { name: Specialty.name, schema: SpecialtySchema },
      { name: DoctorSpecialty.name, schema: DoctorSpecialtySchema },

      // Patient Management
      { name: Patient.name, schema: PatientSchema },

      // Services & Appointments
      { name: Service.name, schema: ServiceSchema },
      { name: ClinicService.name, schema: ClinicServiceSchema },
      { name: Appointment.name, schema: AppointmentSchema },
      { name: MedicalReport.name, schema: MedicalReportSchema },

      // Offers & Discounts
      { name: Offer.name, schema: OfferSchema },
      { name: OfferTarget.name, schema: OfferTargetSchema },
      { name: AppointmentOffer.name, schema: AppointmentOfferSchema },
      { name: ServiceOffer.name, schema: ServiceOfferSchema },

      // Billing & Payment Management
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: InsuranceClaim.name, schema: InsuranceClaimSchema },
      { name: Counter.name, schema: CounterSchema },

      // Notification & Communication System
      { name: Notification.name, schema: NotificationSchema },
      { name: EmailTemplate.name, schema: EmailTemplateSchema },
      { name: SmsTemplate.name, schema: SmsTemplateSchema },

      // Dynamic Information System
      { name: DynamicInfo.name, schema: DynamicInfoSchema },
      { name: Contact.name, schema: ContactSchema },
      { name: WorkingHours.name, schema: WorkingHoursSchema },

      // Employee Management
      { name: EmployeeShift.name, schema: EmployeeShiftSchema },
      { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
      { name: 'DoctorService', schema: DoctorServiceSchema },

      // Audit Trail
      { name: AuditLog.name, schema: AuditLogSchema },

      // Authentication & Session Management
      { name: TokenBlacklist.name, schema: TokenBlacklistSchema },
      { name: RateLimitCounter.name, schema: RateLimitCounterSchema },
    ]),
  ],
  controllers: [DatabaseController],
  providers: [
    DatabaseService,
    DatabaseSeederService,
    EntitiesSeederService,
    ExampleDataSeederService,
    TestDataSeederService,
    DatabaseInitializerService,
  ],
  exports: [
    DatabaseService,
    DatabaseSeederService,
    ExampleDataSeederService,
    TestDataSeederService,
    DatabaseInitializerService,
    MongooseModule,
  ],
})
export class DatabaseModule {}
