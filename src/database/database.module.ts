import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseService } from './database.service';
import { DatabaseController } from './database.controller';
import { DatabaseSeederService } from './seeders/database-seeder.service';
import { DatabaseInitializerService } from './database-initializer.service';

// Import all schemas
import {
  SubscriptionPlan, SubscriptionPlanSchema,
  Subscription, SubscriptionSchema,
  User, UserSchema,
  UserAccess, UserAccessSchema,
  UserLocation, UserLocationSchema,
  Organization, OrganizationSchema,
  Complex, ComplexSchema,
  Department, DepartmentSchema,
  ComplexDepartment, ComplexDepartmentSchema,
  Clinic, ClinicSchema,
  Specialty, SpecialtySchema,
  DoctorSpecialty, DoctorSpecialtySchema,
  Patient, PatientSchema,
  Service, ServiceSchema,
  ClinicService, ClinicServiceSchema,
  Appointment, AppointmentSchema,
  MedicalReport, MedicalReportSchema,
  Offer, OfferSchema,
  OfferTarget, OfferTargetSchema,
  AppointmentOffer, AppointmentOfferSchema,
  Invoice, InvoiceSchema,
  InvoiceItem, InvoiceItemSchema,
  Payment, PaymentSchema,
  InsuranceClaim, InsuranceClaimSchema,
  Notification, NotificationSchema,
  EmailTemplate, EmailTemplateSchema,
  SmsTemplate, SmsTemplateSchema,
  DynamicInfo, DynamicInfoSchema,
  Contact, ContactSchema,
  WorkingHours, WorkingHoursSchema,
  EmployeeShift, EmployeeShiftSchema,
  AuditLog, AuditLogSchema,
} from './schemas';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI') || 'mongodb://localhost:27017/cliniva',
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
      
      // Billing & Payment Management
      { name: Invoice.name, schema: InvoiceSchema },
      { name: InvoiceItem.name, schema: InvoiceItemSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: InsuranceClaim.name, schema: InsuranceClaimSchema },
      
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
      
      // Audit Trail
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [DatabaseController],
  providers: [DatabaseService, DatabaseSeederService, DatabaseInitializerService],
  exports: [DatabaseService, DatabaseSeederService, DatabaseInitializerService, MongooseModule],
})
export class DatabaseModule {}

