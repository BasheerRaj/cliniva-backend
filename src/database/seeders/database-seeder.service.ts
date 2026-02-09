import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SubscriptionPlan,
  Department,
  Specialty,
  EmailTemplate,
  SmsTemplate,
} from '../schemas';
import { EntitiesSeederService } from './entities.seeder';

@Injectable()
export class DatabaseSeederService {
  private readonly logger = new Logger(DatabaseSeederService.name);

  constructor(
    @InjectModel(SubscriptionPlan.name)
    private subscriptionPlanModel: Model<SubscriptionPlan>,
    @InjectModel(Department.name) private departmentModel: Model<Department>,
    @InjectModel(Specialty.name) private specialtyModel: Model<Specialty>,
    @InjectModel(EmailTemplate.name)
    private emailTemplateModel: Model<EmailTemplate>,
    @InjectModel(SmsTemplate.name) private smsTemplateModel: Model<SmsTemplate>,
    private entitiesSeeder: EntitiesSeederService,
  ) {}

  async seedAll(): Promise<void> {
    this.logger.log('🌱 Starting database seeding...');

    try {
      // Seed base data first
      await this.seedSubscriptionPlans();
      await this.seedDepartments();
      await this.seedSpecialties();
      await this.seedEmailTemplates();
      await this.seedSmsTemplates();

      // Seed entities (organizations, complexes, clinics)
      await this.entitiesSeeder.seedAll();

      this.logger.log('✅ Database seeding completed successfully');
    } catch (error) {
      this.logger.error('❌ Database seeding failed:', error.message);
      throw error;
    }
  }

  private async seedSubscriptionPlans(): Promise<void> {
    this.logger.log('📋 Seeding subscription plans...');

    const plans = [
      {
        name: 'clinic',
        maxOrganizations: 0,
        maxComplexes: 0,
        maxClinics: 1,
        price: 99.99,
      },
      {
        name: 'complex',
        maxOrganizations: 0,
        maxComplexes: 1,
        maxClinics: 10,
        price: 299.99,
      },
      {
        name: 'company',
        maxOrganizations: 1,
        maxComplexes: 50,
        maxClinics: 500,
        price: 999.99,
      },
    ];

    for (const plan of plans) {
      const existing = await this.subscriptionPlanModel.findOne({
        name: plan.name,
      });
      if (!existing) {
        await this.subscriptionPlanModel.create(plan);
        this.logger.log(`  ✓ Created subscription plan: ${plan.name}`);
      }
    }
  }

  private async seedDepartments(): Promise<void> {
    this.logger.log('🏥 Seeding departments...');

    const departments = [
      {
        name: 'Cardiology',
        description: 'Heart and cardiovascular system care',
      },
      { name: 'Dermatology', description: 'Skin, hair, and nail disorders' },
      { name: 'Emergency Medicine', description: 'Emergency and urgent care' },
      { name: 'Endocrinology', description: 'Hormone and metabolic disorders' },
      { name: 'Gastroenterology', description: 'Digestive system disorders' },
      { name: 'General Medicine', description: 'Primary healthcare services' },
      { name: 'Gynecology', description: "Women's reproductive health" },
      { name: 'Neurology', description: 'Nervous system disorders' },
      { name: 'Obstetrics', description: 'Pregnancy and childbirth care' },
      { name: 'Oncology', description: 'Cancer treatment and care' },
      { name: 'Ophthalmology', description: 'Eye and vision care' },
      { name: 'Orthopedics', description: 'Bone, joint, and muscle disorders' },
      { name: 'Otolaryngology', description: 'Ear, nose, and throat care' },
      { name: 'Pediatrics', description: "Children's healthcare" },
      {
        name: 'Psychiatry',
        description: 'Mental health and behavioral disorders',
      },
      { name: 'Pulmonology', description: 'Lung and respiratory system care' },
      { name: 'Radiology', description: 'Medical imaging and diagnostics' },
      {
        name: 'Urology',
        description: 'Urinary system and male reproductive health',
      },
    ];

    for (const dept of departments) {
      const existing = await this.departmentModel.findOne({ name: dept.name });
      if (!existing) {
        await this.departmentModel.create(dept);
        this.logger.log(`  ✓ Created department: ${dept.name}`);
      }
    }
  }

  private async seedSpecialties(): Promise<void> {
    this.logger.log('👨‍⚕️ Seeding medical specialties...');

    const specialties = [
      { name: 'Cardiologist', description: 'Heart specialist' },
      { name: 'Dermatologist', description: 'Skin specialist' },
      {
        name: 'Emergency Physician',
        description: 'Emergency medicine specialist',
      },
      { name: 'Endocrinologist', description: 'Hormone specialist' },
      {
        name: 'Gastroenterologist',
        description: 'Digestive system specialist',
      },
      { name: 'General Practitioner', description: 'Primary care physician' },
      { name: 'Gynecologist', description: "Women's health specialist" },
      { name: 'Neurologist', description: 'Nervous system specialist' },
      {
        name: 'Obstetrician',
        description: 'Pregnancy and childbirth specialist',
      },
      { name: 'Oncologist', description: 'Cancer specialist' },
      { name: 'Ophthalmologist', description: 'Eye specialist' },
      { name: 'Orthopedic Surgeon', description: 'Bone and joint specialist' },
      { name: 'Otolaryngologist', description: 'ENT specialist' },
      { name: 'Pediatrician', description: "Children's specialist" },
      { name: 'Psychiatrist', description: 'Mental health specialist' },
      { name: 'Pulmonologist', description: 'Lung specialist' },
      { name: 'Radiologist', description: 'Medical imaging specialist' },
      { name: 'Urologist', description: 'Urinary system specialist' },
    ];

    for (const specialty of specialties) {
      const existing = await this.specialtyModel.findOne({
        name: specialty.name,
      });
      if (!existing) {
        await this.specialtyModel.create(specialty);
        this.logger.log(`  ✓ Created specialty: ${specialty.name}`);
      }
    }
  }

  private async seedEmailTemplates(): Promise<void> {
    this.logger.log('📧 Seeding email templates...');

    const templates = [
      {
        templateName: 'appointment_confirmation',
        subject: 'Appointment Confirmation - {{clinicName}}',
        bodyHtml: `
          <h2>Appointment Confirmed</h2>
          <p>Dear {{patientName}},</p>
          <p>Your appointment has been confirmed with the following details:</p>
          <ul>
            <li><strong>Doctor:</strong> {{doctorName}}</li>
            <li><strong>Date:</strong> {{appointmentDate}}</li>
            <li><strong>Time:</strong> {{appointmentTime}}</li>
            <li><strong>Service:</strong> {{serviceName}}</li>
            <li><strong>Clinic:</strong> {{clinicName}}</li>
          </ul>
          <p>Please arrive 15 minutes before your appointment time.</p>
          <p>Best regards,<br>{{clinicName}} Team</p>
        `,
        bodyText: `
          Appointment Confirmed
          
          Dear {{patientName}},
          
          Your appointment has been confirmed with the following details:
          
          Doctor: {{doctorName}}
          Date: {{appointmentDate}}
          Time: {{appointmentTime}}
          Service: {{serviceName}}
          Clinic: {{clinicName}}
          
          Please arrive 15 minutes before your appointment time.
          
          Best regards,
          {{clinicName}} Team
        `,
        variables: {
          patientName: 'Patient full name',
          doctorName: 'Doctor full name',
          appointmentDate: 'Appointment date',
          appointmentTime: 'Appointment time',
          serviceName: 'Service name',
          clinicName: 'Clinic name',
        },
        isActive: true,
        createdBy: null, // Will be set when user creates it
      },
      {
        templateName: 'appointment_reminder',
        subject: 'Appointment Reminder - Tomorrow at {{appointmentTime}}',
        bodyHtml: `
          <h2>Appointment Reminder</h2>
          <p>Dear {{patientName}},</p>
          <p>This is a reminder that you have an appointment tomorrow:</p>
          <ul>
            <li><strong>Doctor:</strong> {{doctorName}}</li>
            <li><strong>Date:</strong> {{appointmentDate}}</li>
            <li><strong>Time:</strong> {{appointmentTime}}</li>
            <li><strong>Service:</strong> {{serviceName}}</li>
            <li><strong>Clinic:</strong> {{clinicName}}</li>
          </ul>
          <p>Please arrive 15 minutes before your appointment time.</p>
          <p>If you need to reschedule, please contact us as soon as possible.</p>
          <p>Best regards,<br>{{clinicName}} Team</p>
        `,
        bodyText: `
          Appointment Reminder
          
          Dear {{patientName}},
          
          This is a reminder that you have an appointment tomorrow:
          
          Doctor: {{doctorName}}
          Date: {{appointmentDate}}
          Time: {{appointmentTime}}
          Service: {{serviceName}}
          Clinic: {{clinicName}}
          
          Please arrive 15 minutes before your appointment time.
          
          If you need to reschedule, please contact us as soon as possible.
          
          Best regards,
          {{clinicName}} Team
        `,
        variables: {
          patientName: 'Patient full name',
          doctorName: 'Doctor full name',
          appointmentDate: 'Appointment date',
          appointmentTime: 'Appointment time',
          serviceName: 'Service name',
          clinicName: 'Clinic name',
        },
        isActive: true,
        createdBy: null,
      },
    ];

    for (const template of templates) {
      const existing = await this.emailTemplateModel.findOne({
        templateName: template.templateName,
      });
      if (!existing) {
        await this.emailTemplateModel.create(template);
        this.logger.log(`  ✓ Created email template: ${template.templateName}`);
      }
    }
  }

  private async seedSmsTemplates(): Promise<void> {
    this.logger.log('📱 Seeding SMS templates...');

    const templates = [
      {
        templateName: 'appointment_reminder_sms',
        messageText:
          'Hi {{patientName}}, reminder: You have an appointment tomorrow at {{appointmentTime}} with {{doctorName}} at {{clinicName}}. Please arrive 15 mins early.',
        variables: {
          patientName: 'Patient first name',
          doctorName: 'Doctor name',
          appointmentTime: 'Appointment time',
          clinicName: 'Clinic name',
        },
        isActive: true,
        createdBy: null,
      },
      {
        templateName: 'appointment_confirmation_sms',
        messageText:
          'Appointment confirmed! {{patientName}}, your appointment with {{doctorName}} is scheduled for {{appointmentDate}} at {{appointmentTime}}. Location: {{clinicName}}.',
        variables: {
          patientName: 'Patient first name',
          doctorName: 'Doctor name',
          appointmentDate: 'Appointment date',
          appointmentTime: 'Appointment time',
          clinicName: 'Clinic name',
        },
        isActive: true,
        createdBy: null,
      },
    ];

    for (const template of templates) {
      const existing = await this.smsTemplateModel.findOne({
        templateName: template.templateName,
      });
      if (!existing) {
        await this.smsTemplateModel.create(template);
        this.logger.log(`  ✓ Created SMS template: ${template.templateName}`);
      }
    }
  }

  async clearDatabase(): Promise<void> {
    this.logger.warn('🗑️ Clearing database...');

    try {
      // Clear entities first (due to foreign key relationships)
      await this.entitiesSeeder.clearEntities();

      // Then clear base data
      await this.subscriptionPlanModel.deleteMany({});
      await this.departmentModel.deleteMany({});
      await this.specialtyModel.deleteMany({});
      await this.emailTemplateModel.deleteMany({});
      await this.smsTemplateModel.deleteMany({});

      this.logger.log('✅ Database cleared successfully');
    } catch (error) {
      this.logger.error('❌ Database clearing failed:', error.message);
      throw error;
    }
  }
}
