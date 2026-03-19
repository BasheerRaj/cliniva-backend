import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import {
  Organization,
  Complex,
  Clinic,
  User,
  Subscription,
  SubscriptionPlan,
  UserAccess,
  WorkingHours,
  Patient,
  ClinicService,
  DoctorService,
} from '../schemas';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

interface DayConfig {
  dayOfWeek: DayOfWeek;
  isWorkingDay: boolean;
  openingTime?: string;
  closingTime?: string;
  breakStartTime?: string;
  breakEndTime?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hierarchical Working Hours Design
//
// Company (Organization)  : Mon–Thu 08:00–20:00 | Fri 08:00–17:00 | Sat 09:00–16:00 | Sun off
// Complex 1               : Mon–Thu 08:00–18:00 | Fri 08:00–15:00 | Sat 09:00–14:00 | Sun off
// Complex 2               : Mon–Thu 09:00–19:00 | Fri 09:00–16:00 | Sat 10:00–15:00 | Sun off
// Clinic 1A (Cardiology)  : Mon–Thu 08:00–16:00 | Fri 08:00–13:00 | Sat 09:00–13:00 | Sun off
// Clinic 1B (Neurology)   : Mon–Thu 09:00–17:00 | Fri 09:00–14:00 | Sat 10:00–13:00 | Sun off
// Clinic 2A (Pediatrics)  : Mon–Thu 09:00–18:00 | Fri 09:00–15:00 | Sat 10:00–14:00 | Sun off
// Clinic 2B (Dermatology) : Mon–Thu 10:00–18:00 | Fri 10:00–15:00 | Sat 10:00–14:00 | Sun off
// Each doctor             : subset of their clinic's hours
// ─────────────────────────────────────────────────────────────────────────────

const ORG_HOURS: DayConfig[] = [
  { dayOfWeek: 'monday',    isWorkingDay: true,  openingTime: '08:00', closingTime: '20:00' },
  { dayOfWeek: 'tuesday',   isWorkingDay: true,  openingTime: '08:00', closingTime: '20:00' },
  { dayOfWeek: 'wednesday', isWorkingDay: true,  openingTime: '08:00', closingTime: '20:00' },
  { dayOfWeek: 'thursday',  isWorkingDay: true,  openingTime: '08:00', closingTime: '20:00' },
  { dayOfWeek: 'friday',    isWorkingDay: true,  openingTime: '08:00', closingTime: '17:00', breakStartTime: '12:00', breakEndTime: '13:00' },
  { dayOfWeek: 'saturday',  isWorkingDay: true,  openingTime: '09:00', closingTime: '16:00' },
  { dayOfWeek: 'sunday',    isWorkingDay: false },
];

const COMPLEX1_HOURS: DayConfig[] = [
  { dayOfWeek: 'monday',    isWorkingDay: true,  openingTime: '08:00', closingTime: '18:00' },
  { dayOfWeek: 'tuesday',   isWorkingDay: true,  openingTime: '08:00', closingTime: '18:00' },
  { dayOfWeek: 'wednesday', isWorkingDay: true,  openingTime: '08:00', closingTime: '18:00' },
  { dayOfWeek: 'thursday',  isWorkingDay: true,  openingTime: '08:00', closingTime: '18:00' },
  { dayOfWeek: 'friday',    isWorkingDay: true,  openingTime: '08:00', closingTime: '15:00', breakStartTime: '12:00', breakEndTime: '13:00' },
  { dayOfWeek: 'saturday',  isWorkingDay: true,  openingTime: '09:00', closingTime: '14:00' },
  { dayOfWeek: 'sunday',    isWorkingDay: false },
];

const COMPLEX2_HOURS: DayConfig[] = [
  { dayOfWeek: 'monday',    isWorkingDay: true,  openingTime: '09:00', closingTime: '19:00' },
  { dayOfWeek: 'tuesday',   isWorkingDay: true,  openingTime: '09:00', closingTime: '19:00' },
  { dayOfWeek: 'wednesday', isWorkingDay: true,  openingTime: '09:00', closingTime: '19:00' },
  { dayOfWeek: 'thursday',  isWorkingDay: true,  openingTime: '09:00', closingTime: '19:00' },
  { dayOfWeek: 'friday',    isWorkingDay: true,  openingTime: '09:00', closingTime: '16:00', breakStartTime: '12:00', breakEndTime: '13:00' },
  { dayOfWeek: 'saturday',  isWorkingDay: true,  openingTime: '10:00', closingTime: '15:00' },
  { dayOfWeek: 'sunday',    isWorkingDay: false },
];

// Clinic 1A – Cardiology (inside Complex 1)
const CLINIC_1A_HOURS: DayConfig[] = [
  { dayOfWeek: 'monday',    isWorkingDay: true,  openingTime: '08:00', closingTime: '16:00' },
  { dayOfWeek: 'tuesday',   isWorkingDay: true,  openingTime: '08:00', closingTime: '16:00' },
  { dayOfWeek: 'wednesday', isWorkingDay: true,  openingTime: '08:00', closingTime: '16:00' },
  { dayOfWeek: 'thursday',  isWorkingDay: true,  openingTime: '08:00', closingTime: '16:00' },
  { dayOfWeek: 'friday',    isWorkingDay: true,  openingTime: '08:00', closingTime: '13:00' },
  { dayOfWeek: 'saturday',  isWorkingDay: true,  openingTime: '09:00', closingTime: '13:00' },
  { dayOfWeek: 'sunday',    isWorkingDay: false },
];

// Clinic 1B – Neurology (inside Complex 1)
const CLINIC_1B_HOURS: DayConfig[] = [
  { dayOfWeek: 'monday',    isWorkingDay: true,  openingTime: '09:00', closingTime: '17:00' },
  { dayOfWeek: 'tuesday',   isWorkingDay: true,  openingTime: '09:00', closingTime: '17:00' },
  { dayOfWeek: 'wednesday', isWorkingDay: true,  openingTime: '09:00', closingTime: '17:00' },
  { dayOfWeek: 'thursday',  isWorkingDay: true,  openingTime: '09:00', closingTime: '17:00' },
  { dayOfWeek: 'friday',    isWorkingDay: true,  openingTime: '09:00', closingTime: '14:00' },
  { dayOfWeek: 'saturday',  isWorkingDay: true,  openingTime: '10:00', closingTime: '13:00' },
  { dayOfWeek: 'sunday',    isWorkingDay: false },
];

// Clinic 2A – Pediatrics (inside Complex 2)
const CLINIC_2A_HOURS: DayConfig[] = [
  { dayOfWeek: 'monday',    isWorkingDay: true,  openingTime: '09:00', closingTime: '18:00' },
  { dayOfWeek: 'tuesday',   isWorkingDay: true,  openingTime: '09:00', closingTime: '18:00' },
  { dayOfWeek: 'wednesday', isWorkingDay: true,  openingTime: '09:00', closingTime: '18:00' },
  { dayOfWeek: 'thursday',  isWorkingDay: true,  openingTime: '09:00', closingTime: '18:00' },
  { dayOfWeek: 'friday',    isWorkingDay: true,  openingTime: '09:00', closingTime: '15:00' },
  { dayOfWeek: 'saturday',  isWorkingDay: true,  openingTime: '10:00', closingTime: '14:00' },
  { dayOfWeek: 'sunday',    isWorkingDay: false },
];

// Clinic 2B – Dermatology (inside Complex 2)
const CLINIC_2B_HOURS: DayConfig[] = [
  { dayOfWeek: 'monday',    isWorkingDay: true,  openingTime: '10:00', closingTime: '18:00' },
  { dayOfWeek: 'tuesday',   isWorkingDay: true,  openingTime: '10:00', closingTime: '18:00' },
  { dayOfWeek: 'wednesday', isWorkingDay: true,  openingTime: '10:00', closingTime: '18:00' },
  { dayOfWeek: 'thursday',  isWorkingDay: true,  openingTime: '10:00', closingTime: '18:00' },
  { dayOfWeek: 'friday',    isWorkingDay: true,  openingTime: '10:00', closingTime: '15:00' },
  { dayOfWeek: 'saturday',  isWorkingDay: true,  openingTime: '10:00', closingTime: '14:00' },
  { dayOfWeek: 'sunday',    isWorkingDay: false },
];

// ─── Doctor schedules (subset of their clinic hours) ──────────────────────────
// Clinic 1A doctors
const DOCTOR_1A_1_HOURS: DayConfig[] = [
  { dayOfWeek: 'monday',    isWorkingDay: true,  openingTime: '08:00', closingTime: '14:00' }, // within clinic 08–16
  { dayOfWeek: 'tuesday',   isWorkingDay: true,  openingTime: '08:00', closingTime: '14:00' },
  { dayOfWeek: 'wednesday', isWorkingDay: true,  openingTime: '08:00', closingTime: '14:00' },
  { dayOfWeek: 'thursday',  isWorkingDay: false },
  { dayOfWeek: 'friday',    isWorkingDay: true,  openingTime: '08:00', closingTime: '12:00' }, // within clinic 08–13
  { dayOfWeek: 'saturday',  isWorkingDay: false },
  { dayOfWeek: 'sunday',    isWorkingDay: false },
];

const DOCTOR_1A_2_HOURS: DayConfig[] = [
  { dayOfWeek: 'monday',    isWorkingDay: false },
  { dayOfWeek: 'tuesday',   isWorkingDay: true,  openingTime: '12:00', closingTime: '16:00' }, // within clinic 08–16
  { dayOfWeek: 'wednesday', isWorkingDay: false },
  { dayOfWeek: 'thursday',  isWorkingDay: true,  openingTime: '12:00', closingTime: '16:00' },
  { dayOfWeek: 'friday',    isWorkingDay: false },
  { dayOfWeek: 'saturday',  isWorkingDay: true,  openingTime: '09:00', closingTime: '13:00' }, // within clinic 09–13
  { dayOfWeek: 'sunday',    isWorkingDay: false },
];

// Clinic 1B doctors
const DOCTOR_1B_1_HOURS: DayConfig[] = [
  { dayOfWeek: 'monday',    isWorkingDay: true,  openingTime: '09:00', closingTime: '14:00' }, // within clinic 09–17
  { dayOfWeek: 'tuesday',   isWorkingDay: true,  openingTime: '09:00', closingTime: '14:00' },
  { dayOfWeek: 'wednesday', isWorkingDay: true,  openingTime: '09:00', closingTime: '14:00' },
  { dayOfWeek: 'thursday',  isWorkingDay: false },
  { dayOfWeek: 'friday',    isWorkingDay: true,  openingTime: '09:00', closingTime: '13:00' }, // within clinic 09–14
  { dayOfWeek: 'saturday',  isWorkingDay: false },
  { dayOfWeek: 'sunday',    isWorkingDay: false },
];

const DOCTOR_1B_2_HOURS: DayConfig[] = [
  { dayOfWeek: 'monday',    isWorkingDay: false },
  { dayOfWeek: 'tuesday',   isWorkingDay: true,  openingTime: '13:00', closingTime: '17:00' }, // within clinic 09–17
  { dayOfWeek: 'wednesday', isWorkingDay: false },
  { dayOfWeek: 'thursday',  isWorkingDay: true,  openingTime: '13:00', closingTime: '17:00' },
  { dayOfWeek: 'friday',    isWorkingDay: false },
  { dayOfWeek: 'saturday',  isWorkingDay: true,  openingTime: '10:00', closingTime: '13:00' }, // within clinic 10–13
  { dayOfWeek: 'sunday',    isWorkingDay: false },
];

// Clinic 2A doctors
const DOCTOR_2A_1_HOURS: DayConfig[] = [
  { dayOfWeek: 'monday',    isWorkingDay: true,  openingTime: '09:00', closingTime: '14:00' }, // within clinic 09–18
  { dayOfWeek: 'tuesday',   isWorkingDay: true,  openingTime: '09:00', closingTime: '14:00' },
  { dayOfWeek: 'wednesday', isWorkingDay: true,  openingTime: '09:00', closingTime: '14:00' },
  { dayOfWeek: 'thursday',  isWorkingDay: false },
  { dayOfWeek: 'friday',    isWorkingDay: true,  openingTime: '09:00', closingTime: '13:00' }, // within clinic 09–15
  { dayOfWeek: 'saturday',  isWorkingDay: false },
  { dayOfWeek: 'sunday',    isWorkingDay: false },
];

const DOCTOR_2A_2_HOURS: DayConfig[] = [
  { dayOfWeek: 'monday',    isWorkingDay: false },
  { dayOfWeek: 'tuesday',   isWorkingDay: true,  openingTime: '14:00', closingTime: '18:00' }, // within clinic 09–18
  { dayOfWeek: 'wednesday', isWorkingDay: false },
  { dayOfWeek: 'thursday',  isWorkingDay: true,  openingTime: '14:00', closingTime: '18:00' },
  { dayOfWeek: 'friday',    isWorkingDay: false },
  { dayOfWeek: 'saturday',  isWorkingDay: true,  openingTime: '10:00', closingTime: '14:00' }, // within clinic 10–14
  { dayOfWeek: 'sunday',    isWorkingDay: false },
];

// Clinic 2B doctors
const DOCTOR_2B_1_HOURS: DayConfig[] = [
  { dayOfWeek: 'monday',    isWorkingDay: true,  openingTime: '10:00', closingTime: '15:00' }, // within clinic 10–18
  { dayOfWeek: 'tuesday',   isWorkingDay: true,  openingTime: '10:00', closingTime: '15:00' },
  { dayOfWeek: 'wednesday', isWorkingDay: true,  openingTime: '10:00', closingTime: '15:00' },
  { dayOfWeek: 'thursday',  isWorkingDay: false },
  { dayOfWeek: 'friday',    isWorkingDay: true,  openingTime: '10:00', closingTime: '13:30' }, // within clinic 10–15
  { dayOfWeek: 'saturday',  isWorkingDay: false },
  { dayOfWeek: 'sunday',    isWorkingDay: false },
];

const DOCTOR_2B_2_HOURS: DayConfig[] = [
  { dayOfWeek: 'monday',    isWorkingDay: false },
  { dayOfWeek: 'tuesday',   isWorkingDay: true,  openingTime: '15:00', closingTime: '18:00' }, // within clinic 10–18
  { dayOfWeek: 'wednesday', isWorkingDay: false },
  { dayOfWeek: 'thursday',  isWorkingDay: true,  openingTime: '15:00', closingTime: '18:00' },
  { dayOfWeek: 'friday',    isWorkingDay: false },
  { dayOfWeek: 'saturday',  isWorkingDay: true,  openingTime: '10:00', closingTime: '14:00' }, // within clinic 10–14
  { dayOfWeek: 'sunday',    isWorkingDay: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// Seeder Service
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class ExampleDataSeederService {
  private readonly logger = new Logger(ExampleDataSeederService.name);
  private hashedPassword: string;

  constructor(
    @InjectModel(Organization.name) private organizationModel: Model<Organization>,
    @InjectModel(Complex.name) private complexModel: Model<Complex>,
    @InjectModel(Clinic.name) private clinicModel: Model<Clinic>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Subscription.name) private subscriptionModel: Model<Subscription>,
    @InjectModel(SubscriptionPlan.name) private subscriptionPlanModel: Model<SubscriptionPlan>,
    @InjectModel(UserAccess.name) private userAccessModel: Model<UserAccess>,
    @InjectModel(WorkingHours.name) private workingHoursModel: Model<WorkingHours>,
    @InjectModel(Patient.name) private patientModel: Model<Patient>,
    @InjectModel(ClinicService.name) private clinicServiceModel: Model<ClinicService>,
    @InjectModel('DoctorService') private doctorServiceModel: Model<DoctorService>,
  ) {}

  // ─── Public Entry Point ────────────────────────────────────────────────────

  async seedAll(): Promise<void> {
    this.logger.log('🌱 Starting example relational data seeding...');
    this.hashedPassword = await bcrypt.hash('Password123!', 10);

    try {
      const subscription = await this.createOrganizationAndSubscription();
      const organization  = await this.createOrganization(subscription);
      await this.createWorkingHours('organization', organization._id as Types.ObjectId, ORG_HOURS);

      const [complex1, complex2] = await Promise.all([
        this.createComplex(organization, subscription, 1),
        this.createComplex(organization, subscription, 2),
      ]);

      await this.createWorkingHours('complex', complex1._id as Types.ObjectId, COMPLEX1_HOURS, 'organization', organization._id as Types.ObjectId);
      await this.createWorkingHours('complex', complex2._id as Types.ObjectId, COMPLEX2_HOURS, 'organization', organization._id as Types.ObjectId);

      // Complex 1 → Clinic 1A (Cardiology) and Clinic 1B (Neurology)
      const clinic1A = await this.createClinic(complex1, organization, subscription, 'Cardiology Clinic', 'Cardiology', '1A');
      const clinic1B = await this.createClinic(complex1, organization, subscription, 'Neurology Clinic',  'Neurology',  '1B');

      await this.createWorkingHours('clinic', clinic1A._id as Types.ObjectId, CLINIC_1A_HOURS, 'complex', complex1._id as Types.ObjectId);
      await this.createWorkingHours('clinic', clinic1B._id as Types.ObjectId, CLINIC_1B_HOURS, 'complex', complex1._id as Types.ObjectId);

      // Complex 2 → Clinic 2A (Pediatrics) and Clinic 2B (Dermatology)
      const clinic2A = await this.createClinic(complex2, organization, subscription, 'Pediatrics Clinic',  'Pediatrics',  '2A');
      const clinic2B = await this.createClinic(complex2, organization, subscription, 'Dermatology Clinic', 'Dermatology', '2B');

      await this.createWorkingHours('clinic', clinic2A._id as Types.ObjectId, CLINIC_2A_HOURS, 'complex', complex2._id as Types.ObjectId);
      await this.createWorkingHours('clinic', clinic2B._id as Types.ObjectId, CLINIC_2B_HOURS, 'complex', complex2._id as Types.ObjectId);

      // Staff per clinic
      await this.createClinicStaff(clinic1A, organization, subscription, '1a', DOCTOR_1A_1_HOURS, DOCTOR_1A_2_HOURS);
      await this.createClinicStaff(clinic1B, organization, subscription, '1b', DOCTOR_1B_1_HOURS, DOCTOR_1B_2_HOURS);
      await this.createClinicStaff(clinic2A, organization, subscription, '2a', DOCTOR_2A_1_HOURS, DOCTOR_2A_2_HOURS);
      await this.createClinicStaff(clinic2B, organization, subscription, '2b', DOCTOR_2B_1_HOURS, DOCTOR_2B_2_HOURS);

      // Patients per clinic
      await this.seedPatients(clinic1A, complex1, organization, '1A');
      await this.seedPatients(clinic1B, complex1, organization, '1B');
      await this.seedPatients(clinic2A, complex2, organization, '2A');
      await this.seedPatients(clinic2B, complex2, organization, '2B');

      this.logger.log('✅ Example relational data seeding completed successfully');
      this.printSummary();
    } catch (error) {
      this.logger.error('❌ Example data seeding failed:', error.message);
      throw error;
    }
  }

  // ─── Organization & Subscription ──────────────────────────────────────────

  private async createOrganizationAndSubscription(): Promise<Subscription> {
    this.logger.log('📋 Setting up subscription plan and org owner...');

    // Ensure company plan exists
    let companyPlan = await this.subscriptionPlanModel.findOne({ name: 'company' });
    if (!companyPlan) {
      companyPlan = await this.subscriptionPlanModel.create({
        name: 'company',
        maxOrganizations: 1,
        maxComplexes: 50,
        maxClinics: 500,
        price: 999.99,
      });
    }

    // Org owner user
    let orgOwner = await this.userModel.findOne({ email: 'medicare.owner@example.com' });
    if (!orgOwner) {
      orgOwner = await this.userModel.create({
        email: 'medicare.owner@example.com',
        passwordHash: this.hashedPassword,
        firstName: 'Abdullah',
        lastName: 'Al-Saud',
        role: 'owner',
        phone: '+966-50-111-0001',
        gender: 'male',
        isActive: true,
        emailVerified: true,
        setupComplete: true,
        onboardingComplete: true,
        onboardingCompleted: true,
        planType: 'company',
        preferredLanguage: 'ar',
      });
      this.logger.log('  ✓ Created org owner: Abdullah Al-Saud');
    }

    // Subscription
    let subscription = await this.subscriptionModel.findOne({ userId: orgOwner._id });
    if (!subscription) {
      subscription = await this.subscriptionModel.create({
        userId: orgOwner._id,
        planId: companyPlan._id,
        status: 'active',
        startedAt: new Date('2024-01-01'),
        expiresAt: new Date('2025-12-31'),
      });
      this.logger.log('  ✓ Created company subscription');
    }

    // Update owner with subscription/org ids (org not created yet — will update after)
    await this.userModel.updateOne({ _id: orgOwner._id }, { subscriptionId: subscription._id });

    return subscription as unknown as Subscription;
  }

  // ─── Organization ──────────────────────────────────────────────────────────

  private async createOrganization(subscription: Subscription): Promise<Organization> {
    let org = await this.organizationModel.findOne({ name: 'MediCare Healthcare Group' });
    if (org) return org;

    const orgOwner = await this.userModel.findOne({ email: 'medicare.owner@example.com' });

    org = await this.organizationModel.create({
      subscriptionId: subscription._id,
      ownerId: orgOwner!._id,
      name: 'MediCare Healthcare Group',
      legalName: 'MediCare Healthcare Group LLC',
      logoUrl: '/assets/logos/medicare-group.png',
      website: 'https://medicarehealthgroup.com',
      yearEstablished: 2012,
      mission: 'Delivering compassionate, high-quality healthcare accessible to all',
      vision: 'To be the most trusted multi-specialty healthcare network in the region',
      overview: 'A multi-facility healthcare organization operating 2 medical complexes and 4 specialized clinics across the city',
      goals: 'Expand to 5 complexes and 20 clinics by 2027 with 97% patient satisfaction',
      ceoName: 'Dr. Abdullah Al-Saud',
      phoneNumbers: [
        { number: '+966-11-500-1000', type: 'primary',   label: 'Head Office' },
        { number: '+966-11-500-1001', type: 'secondary', label: 'Operations' },
        { number: '+966-50-111-0001', type: 'mobile',    label: 'CEO Direct' },
      ],
      email: 'info@medicarehealthgroup.com',
      address: {
        street: 'King Abdulaziz Road, Tower C, Floor 12',
        city: 'Riyadh',
        state: 'Riyadh Province',
        postalCode: '11452',
        country: 'Saudi Arabia',
        googleLocation: 'https://maps.google.com/?q=24.6877,46.7219',
      },
      emergencyContact: {
        name: 'Central Emergency Desk',
        phone: '+966-11-500-9999',
        email: 'emergency@medicarehealthgroup.com',
        relationship: 'Operations Center',
      },
      socialMediaLinks: {
        facebook:  'https://facebook.com/medicarehealthgroup',
        instagram: 'https://instagram.com/medicarehealthgroup',
        twitter:   'https://twitter.com/medicarehg',
        linkedin:  'https://linkedin.com/company/medicare-health-group',
        whatsapp:  '+966501110001',
        youtube:   'https://youtube.com/@medicarehealthgroup',
        website:   'https://medicarehealthgroup.com',
      },
      vatNumber: 'SA-300001234500003',
      crNumber:  'CR-1010123456',
      termsConditionsUrl: 'https://medicarehealthgroup.com/terms',
      privacyPolicyUrl:   'https://medicarehealthgroup.com/privacy',
    });
    this.logger.log('  ✓ Created organization: MediCare Healthcare Group');

    // Link org owner to org
    await this.userModel.updateOne(
      { email: 'medicare.owner@example.com' },
      { organizationId: org._id },
    );

    // Create org owner UserAccess record
    await this.createUserAccess(orgOwner!._id as Types.ObjectId, 'organization', org._id as Types.ObjectId, 'owner', orgOwner!._id as Types.ObjectId);

    return org;
  }

  // ─── Complex ──────────────────────────────────────────────────────────────

  private async createComplex(
    organization: Organization,
    subscription: Subscription,
    num: 1 | 2,
  ): Promise<Complex> {
    const configs = {
      1: {
        name: 'Al-Shifa Medical Complex',
        managerName: 'Dr. Sarah Al-Qahtani',
        street: 'Olaya Street, Block A, Building 12',
        city: 'Riyadh',
        email: 'alshifa@medicarehealthgroup.com',
        phone: '+966-11-501-2000',
        vatNumber: 'SA-300001234500011',
        crNumber: 'CR-1010234501',
      },
      2: {
        name: 'Al-Amal Medical Complex',
        managerName: 'Dr. Khalid Al-Otaibi',
        street: 'King Abdullah Road, Tower D, Floor 2',
        city: 'Riyadh',
        email: 'alamal@medicarehealthgroup.com',
        phone: '+966-11-502-3000',
        vatNumber: 'SA-300001234500022',
        crNumber: 'CR-1010345602',
      },
    };
    const cfg = configs[num];
    const orgOwner = await this.userModel.findOne({ email: 'medicare.owner@example.com' });

    let complex = await this.complexModel.findOne({ name: cfg.name });
    if (!complex) {
      complex = await this.complexModel.create({
        organizationId: organization._id,
        subscriptionId: subscription._id,
        ownerId: orgOwner!._id,
        name: cfg.name,
        managerName: cfg.managerName,
        logoUrl: `/assets/logos/${cfg.name.toLowerCase().replace(/\s+/g, '-')}.png`,
        website: `https://${cfg.name.toLowerCase().replace(/[\s-]+/g, '')}.medicarehealthgroup.com`,
        yearEstablished: 2018 + num,
        mission: `Delivering specialized multi-disciplinary care in ${cfg.city}`,
        vision: `A centre of clinical excellence and patient-centred innovation`,
        overview: `A modern medical complex hosting ${num === 1 ? 'Cardiology and Neurology' : 'Pediatrics and Dermatology'} clinics`,
        goals: `Reach 30,000 annual patient visits with consistent high satisfaction scores`,
        ceoName: cfg.managerName,
        phoneNumbers: [{ number: cfg.phone, type: 'primary', label: 'Reception' }],
        email: cfg.email,
        address: {
          street: cfg.street,
          city: cfg.city,
          state: 'Riyadh Province',
          postalCode: num === 1 ? '12244' : '12534',
          country: 'Saudi Arabia',
        },
        emergencyContact: {
          name: `${cfg.name} Emergency`,
          phone: cfg.phone.replace(/\d{4}$/, '9999'),
          email: `emergency@${cfg.email.split('@')[1]}`,
          relationship: 'Emergency Services',
        },
        socialMediaLinks: {
          instagram: `https://instagram.com/${cfg.name.toLowerCase().replace(/\s+/g, '')}`,
          twitter:   `https://twitter.com/${cfg.name.toLowerCase().replace(/\s+/g, '')}`,
          whatsapp:  cfg.phone.replace(/[^+\d]/g, ''),
        },
        vatNumber: cfg.vatNumber,
        crNumber:  cfg.crNumber,
        status: 'active',
      });
      this.logger.log(`  ✓ Created complex: ${cfg.name}`);
    }

    // Grant org owner access to complex
    await this.createUserAccess(orgOwner!._id as Types.ObjectId, 'complex', complex._id as Types.ObjectId, 'owner', orgOwner!._id as Types.ObjectId);

    return complex;
  }

  // ─── Clinic ───────────────────────────────────────────────────────────────

  private async createClinic(
    complex: Complex,
    organization: Organization,
    subscription: Subscription,
    name: string,
    specialization: string,
    code: string,
  ): Promise<Clinic> {
    // Use name + organizationId as stable idempotency key (complexId changes on every reset)
    let clinic = await this.clinicModel.findOne({ name, organizationId: organization._id });
    if (!clinic) {
      const orgOwner = await this.userModel.findOne({ email: 'medicare.owner@example.com' });
      const licSuffix = Math.floor(100000 + Math.random() * 900000);
      clinic = await this.clinicModel.create({
        complexId:      complex._id,
        organizationId: organization._id,
        subscriptionId: subscription._id,
        ownerId:        orgOwner!._id,       // placeholder; updated after clinic owner is created
        name,
        headDoctorName: `Head of ${specialization}`,
        specialization,
        licenseNumber:  `LIC-MC-${code.toUpperCase()}-${licSuffix}`,
        pin:            `${1000 + parseInt(code.replace(/\D/g, '') + (code.match(/[ab]/i)?.[0] === 'a' ? 1 : 2), 10)}`,
        logoUrl:        `/assets/logos/${name.toLowerCase().replace(/\s+/g, '-')}.png`,
        website:        `https://${name.toLowerCase().replace(/\s+/g, '')}.medicarehealthgroup.com`,
        yearEstablished: 2020,
        mission: `Excellence in ${specialization} care`,
        vision: `Leading ${specialization} clinic in the region`,
        overview: `A specialized ${specialization} clinic within ${(complex as any).name}`,
        goals: `Deliver best-in-class ${specialization} services to 10,000+ patients annually`,
        ceoName: `Director of ${specialization}`,
        phoneNumbers: [{ number: `+966-11-5${code}-${licSuffix.toString().slice(0,4)}`, type: 'primary', label: 'Reception' }],
        email: `${name.toLowerCase().replace(/\s+/g, '.')}@medicarehealthgroup.com`,
        address: {
          street: `${(complex as any).address?.street}, ${name}`,
          city:   (complex as any).address?.city,
          state:  'Riyadh Province',
          postalCode: (complex as any).address?.postalCode,
          country: 'Saudi Arabia',
        },
        maxStaff:        50,
        maxDoctors:      10,
        maxPatients:     1000,
        sessionDuration: 30,
        isActive: true,
        status: 'active',
      });
      this.logger.log(`    ✓ Created clinic: ${name}`);
    } else {
      // Sync scope refs to current IDs (they change on every db:reset)
      await this.clinicModel.updateOne(
        { _id: clinic._id },
        { complexId: complex._id, subscriptionId: subscription._id, organizationId: organization._id },
      );
      clinic = (await this.clinicModel.findById(clinic._id))!;
      this.logger.log(`    ↺ Updated clinic refs: ${name}`);
    }
    return clinic;
  }

  // ─── Clinic Staff (owner, admin, 2 doctors, 1 staff) ──────────────────────

  private async createClinicStaff(
    clinic: Clinic,
    organization: Organization,
    subscription: Subscription,
    code: string,
    doctor1Hours: DayConfig[],
    doctor2Hours: DayConfig[],
  ): Promise<void> {
    const staffDefinitions = this.getStaffDefinitions(code);

    const createdUsers: { [role: string]: any } = {};

    for (const def of staffDefinitions) {
      const user = await this.findOrCreateUser(def, clinic, organization, subscription);
      createdUsers[def.roleKey] = user;

      // Grant access at clinic scope
      await this.createUserAccess(
        user._id as Types.ObjectId,
        'clinic',
        clinic._id as Types.ObjectId,
        def.role,
        createdUsers['owner']?._id ?? user._id as Types.ObjectId,
      );
    }

    // Update clinic ownerId to the actual clinic owner user
    if (createdUsers['owner']) {
      await this.clinicModel.updateOne(
        { _id: clinic._id },
        { ownerId: createdUsers['owner']._id },
      );
    }

    // Create doctor working hours (within clinic hours)
    if (createdUsers['doctor1']) {
      await this.createWorkingHours(
        'user',
        createdUsers['doctor1']._id as Types.ObjectId,
        doctor1Hours,
        'clinic',
        clinic._id as Types.ObjectId,
      );
    }
    if (createdUsers['doctor2']) {
      await this.createWorkingHours(
        'user',
        createdUsers['doctor2']._id as Types.ObjectId,
        doctor2Hours,
        'clinic',
        clinic._id as Types.ObjectId,
      );
    }

    // Authorize clinic doctors for all services linked to this clinic
    const doctors = [createdUsers['doctor1'], createdUsers['doctor2']].filter(Boolean);
    if (doctors.length > 0) {
      await this.authorizeDoctorsForClinicServices(clinic, doctors);
    }
  }

  /**
   * Authorize doctors for all services available at their clinic.
   * Ensures ClinicService and DoctorService junction records exist so that
   * the appointment booking validation passes.
   */
  private async authorizeDoctorsForClinicServices(
    clinic: Clinic,
    doctors: any[],
  ): Promise<void> {
    // Fetch all services linked to this clinic
    const clinicServices = await this.clinicServiceModel.find({
      clinicId: clinic._id,
      isActive: true,
    });

    if (clinicServices.length === 0) {
      this.logger.debug(`  ↺ No services linked to clinic ${(clinic as any).name} – skipping doctor authorization`);
      return;
    }

    for (const doctor of doctors) {
      for (const cs of clinicServices) {
        const existing = await this.doctorServiceModel.findOne({
          doctorId: doctor._id,
          serviceId: cs.serviceId,
          clinicId: clinic._id,
        });
        if (!existing) {
          await this.doctorServiceModel.create({
            doctorId: doctor._id,
            serviceId: cs.serviceId,
            clinicId: clinic._id,
            isActive: true,
          });
        }
      }
    }

    this.logger.log(`  ✓ Authorized ${doctors.length} doctor(s) for ${clinicServices.length} service(s) at ${(clinic as any).name}`);
  }

  // ─── Staff Definitions per Clinic ────────────────────────────────────────

  private getStaffDefinitions(code: string): Array<{
    roleKey: string;
    role: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    gender: string;
    jobTitle: string;
  }> {
    const definitions: Record<string, Array<{
      roleKey: string;
      role: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      gender: string;
      jobTitle: string;
    }>> = {
      '1a': [
        { roleKey: 'owner',   role: 'owner',  firstName: 'Yousef',  lastName: 'Al-Qahtani', email: 'clinic.owner.1a@medicare.example.com',   phone: '+966-50-201-1001', gender: 'male',   jobTitle: 'Clinic Director – Cardiology' },
        { roleKey: 'admin',   role: 'admin',  firstName: 'Mariam',  lastName: 'Al-Tamimi',  email: 'clinic.admin.1a@medicare.example.com',   phone: '+966-50-201-1002', gender: 'female', jobTitle: 'Clinic Administrator' },
        { roleKey: 'doctor1', role: 'doctor', firstName: 'Khalid',  lastName: 'Al-Rashidi', email: 'doctor1.1a@medicare.example.com',         phone: '+966-50-201-1003', gender: 'male',   jobTitle: 'Cardiologist' },
        { roleKey: 'doctor2', role: 'doctor', firstName: 'Nora',    lastName: 'Al-Sulaiman',email: 'doctor2.1a@medicare.example.com',         phone: '+966-50-201-1004', gender: 'female', jobTitle: 'Interventional Cardiologist' },
        { roleKey: 'staff',   role: 'staff',  firstName: 'Fahad',   lastName: 'Al-Anazi',   email: 'staff.1a@medicare.example.com',           phone: '+966-50-201-1005', gender: 'male',   jobTitle: 'Patient Care Coordinator' },
      ],
      '1b': [
        { roleKey: 'owner',   role: 'owner',  firstName: 'Abdullah',lastName: 'Bin-Nasser', email: 'clinic.owner.1b@medicare.example.com',   phone: '+966-50-201-2001', gender: 'male',   jobTitle: 'Clinic Director – Neurology' },
        { roleKey: 'admin',   role: 'admin',  firstName: 'Rawan',   lastName: 'Al-Shehri',  email: 'clinic.admin.1b@medicare.example.com',   phone: '+966-50-201-2002', gender: 'female', jobTitle: 'Clinic Administrator' },
        { roleKey: 'doctor1', role: 'doctor', firstName: 'Omar',    lastName: 'Al-Harbi',   email: 'doctor1.1b@medicare.example.com',         phone: '+966-50-201-2003', gender: 'male',   jobTitle: 'Neurologist' },
        { roleKey: 'doctor2', role: 'doctor', firstName: 'Layla',   lastName: 'Al-Dosari',  email: 'doctor2.1b@medicare.example.com',         phone: '+966-50-201-2004', gender: 'female', jobTitle: 'Stroke & Vascular Neurologist' },
        { roleKey: 'staff',   role: 'staff',  firstName: 'Turki',   lastName: 'Al-Maliki',  email: 'staff.1b@medicare.example.com',           phone: '+966-50-201-2005', gender: 'male',   jobTitle: 'Medical Receptionist' },
      ],
      '2a': [
        { roleKey: 'owner',   role: 'owner',  firstName: 'Saad',    lastName: 'Al-Harthi',  email: 'clinic.owner.2a@medicare.example.com',   phone: '+966-50-202-3001', gender: 'male',   jobTitle: 'Clinic Director – Pediatrics' },
        { roleKey: 'admin',   role: 'admin',  firstName: 'Dana',    lastName: 'Al-Masoudi', email: 'clinic.admin.2a@medicare.example.com',   phone: '+966-50-202-3002', gender: 'female', jobTitle: 'Clinic Administrator' },
        { roleKey: 'doctor1', role: 'doctor', firstName: 'Hassan',  lastName: 'Al-Otaibi',  email: 'doctor1.2a@medicare.example.com',         phone: '+966-50-202-3003', gender: 'male',   jobTitle: 'Pediatrician' },
        { roleKey: 'doctor2', role: 'doctor', firstName: 'Maha',    lastName: 'Al-Ghamdi',  email: 'doctor2.2a@medicare.example.com',         phone: '+966-50-202-3004', gender: 'female', jobTitle: 'Neonatal Specialist' },
        { roleKey: 'staff',   role: 'staff',  firstName: 'Khalil',  lastName: 'Al-Yami',    email: 'staff.2a@medicare.example.com',           phone: '+966-50-202-3005', gender: 'male',   jobTitle: 'Nursing Assistant' },
      ],
      '2b': [
        { roleKey: 'owner',   role: 'owner',  firstName: 'Faisal',  lastName: 'Al-Zahrani', email: 'clinic.owner.2b@medicare.example.com',   phone: '+966-50-202-4001', gender: 'male',   jobTitle: 'Clinic Director – Dermatology' },
        { roleKey: 'admin',   role: 'admin',  firstName: 'Amira',   lastName: 'Al-Juhani',  email: 'clinic.admin.2b@medicare.example.com',   phone: '+966-50-202-4002', gender: 'female', jobTitle: 'Clinic Administrator' },
        { roleKey: 'doctor1', role: 'doctor', firstName: 'Tariq',   lastName: 'Al-Mutairi', email: 'doctor1.2b@medicare.example.com',         phone: '+966-50-202-4003', gender: 'male',   jobTitle: 'Dermatologist' },
        { roleKey: 'doctor2', role: 'doctor', firstName: 'Sara',    lastName: 'Al-Zahrani', email: 'doctor2.2b@medicare.example.com',         phone: '+966-50-202-4004', gender: 'female', jobTitle: 'Cosmetic Dermatologist' },
        { roleKey: 'staff',   role: 'staff',  firstName: 'Saud',    lastName: 'Al-Rashid',  email: 'staff.2b@medicare.example.com',           phone: '+966-50-202-4005', gender: 'male',   jobTitle: 'Clinical Support Specialist' },
      ],
    };
    return definitions[code] ?? [];
  }

  // ─── Create / Find User ───────────────────────────────────────────────────

  private async findOrCreateUser(
    def: { role: string; firstName: string; lastName: string; email: string; phone: string; gender: string },
    clinic: Clinic,
    organization: Organization,
    subscription: Subscription,
  ): Promise<User> {
    let user = await this.userModel.findOne({ email: def.email });
    if (!user) {
      user = await this.userModel.create({
        email: def.email,
        passwordHash: this.hashedPassword,
        firstName:    def.firstName,
        lastName:     def.lastName,
        role:         def.role,
        phone:        def.phone,
        gender:       def.gender,
        isActive:     true,
        emailVerified: true,
        setupComplete: true,
        onboardingComplete: true,
        onboardingCompleted: true,
        planType:         'company',
        preferredLanguage: 'ar',
        clinicId:          clinic._id,
        complexId:         (clinic as any).complexId,
        organizationId:    organization._id,
        subscriptionId:    subscription._id,
        createdBy:         null,
      });
      this.logger.log(`      ✓ Created ${def.role}: ${def.firstName} ${def.lastName}`);
    } else {
      // Always re-sync scope fields in case DB was reset and entities were recreated with new ObjectIds
      await this.userModel.updateOne(
        { _id: user._id },
        {
          clinicId:       clinic._id,
          complexId:      (clinic as any).complexId,
          organizationId: organization._id,
          subscriptionId: subscription._id,
        },
      );
      this.logger.log(`      ↺ Updated scope for ${def.role}: ${def.firstName} ${def.lastName}`);
    }
    return user;
  }

  // ─── Working Hours ────────────────────────────────────────────────────────

  private async createWorkingHours(
    entityType: string,
    entityId: Types.ObjectId,
    days: DayConfig[],
    parentEntityType?: string,
    parentEntityId?: Types.ObjectId,
  ): Promise<void> {
    for (const day of days) {
      const existing = await this.workingHoursModel.findOne({ entityType, entityId, dayOfWeek: day.dayOfWeek });
      if (!existing) {
        await this.workingHoursModel.create({
          entityType,
          entityId,
          dayOfWeek:    day.dayOfWeek,
          isWorkingDay: day.isWorkingDay,
          openingTime:  day.openingTime,
          closingTime:  day.closingTime,
          breakStartTime: day.breakStartTime,
          breakEndTime:   day.breakEndTime,
          isActive: true,
          parentEntityType: parentEntityType ?? undefined,
          parentEntityId:   parentEntityId   ?? undefined,
          validatedAgainstParent: !!parentEntityId,
          lastValidationDate: parentEntityId ? new Date() : undefined,
        });
      }
    }
  }

  // ─── User Access ──────────────────────────────────────────────────────────

  private async createUserAccess(
    userId: Types.ObjectId,
    scopeType: string,
    scopeId: Types.ObjectId,
    role: string,
    grantedBy: Types.ObjectId,
  ): Promise<void> {
    const existing = await this.userAccessModel.findOne({ userId, scopeType, scopeId, role });
    if (!existing) {
      await this.userAccessModel.create({
        userId,
        scopeType,
        scopeId,
        role,
        isActive:  true,
        grantedBy,
        grantedAt: new Date(),
      });
    }
  }

  // ─── Summary ──────────────────────────────────────────────────────────────

  private printSummary(): void {
    this.logger.log('');
    this.logger.log('📊 ═══════════════════════════════════════════════════');
    this.logger.log('📊  EXAMPLE DATA SUMMARY');
    this.logger.log('📊 ═══════════════════════════════════════════════════');
    this.logger.log('📊');
    this.logger.log('📊  ORGANIZATION');
    this.logger.log('📊    MediCare Healthcare Group');
    this.logger.log('📊    Owner : Abdullah Al-Saud  (medicare.owner@example.com)');
    this.logger.log('📊    Hours : Mon–Thu 08:00–20:00 | Fri 08:00–17:00 | Sat 09:00–16:00');
    this.logger.log('📊');
    this.logger.log('📊  COMPLEX 1 – Al-Shifa Medical Complex');
    this.logger.log('📊    Hours : Mon–Thu 08:00–18:00 | Fri 08:00–15:00 | Sat 09:00–14:00');
    this.logger.log('📊    ┌── Clinic 1A – Cardiology Clinic');
    this.logger.log('📊    │   Hours  : Mon–Thu 08:00–16:00 | Fri 08:00–13:00 | Sat 09:00–13:00');
    this.logger.log('📊    │   Owner  : Yousef Al-Qahtani');
    this.logger.log('📊    │   Admin  : Mariam Al-Tamimi');
    this.logger.log('📊    │   Doctor1: Khalid Al-Rashidi  (Mon–Wed+Fri 08–14)');
    this.logger.log('📊    │   Doctor2: Nora Al-Sulaiman   (Tue+Thu 12–16, Sat 09–13)');
    this.logger.log('📊    │   Staff  : Fahad Al-Anazi');
    this.logger.log('📊    └── Clinic 1B – Neurology Clinic');
    this.logger.log('📊        Hours  : Mon–Thu 09:00–17:00 | Fri 09:00–14:00 | Sat 10:00–13:00');
    this.logger.log('📊        Owner  : Abdullah Bin-Nasser');
    this.logger.log('📊        Admin  : Rawan Al-Shehri');
    this.logger.log('📊        Doctor1: Omar Al-Harbi    (Mon–Wed+Fri 09–14)');
    this.logger.log('📊        Doctor2: Layla Al-Dosari  (Tue+Thu 13–17, Sat 10–13)');
    this.logger.log('📊        Staff  : Turki Al-Maliki');
    this.logger.log('📊');
    this.logger.log('📊  COMPLEX 2 – Al-Amal Medical Complex');
    this.logger.log('📊    Hours : Mon–Thu 09:00–19:00 | Fri 09:00–16:00 | Sat 10:00–15:00');
    this.logger.log('📊    ┌── Clinic 2A – Pediatrics Clinic');
    this.logger.log('📊    │   Hours  : Mon–Thu 09:00–18:00 | Fri 09:00–15:00 | Sat 10:00–14:00');
    this.logger.log('📊    │   Owner  : Saad Al-Harthi');
    this.logger.log('📊    │   Admin  : Dana Al-Masoudi');
    this.logger.log('📊    │   Doctor1: Hassan Al-Otaibi (Mon–Wed+Fri 09–14)');
    this.logger.log('📊    │   Doctor2: Maha Al-Ghamdi   (Tue+Thu 14–18, Sat 10–14)');
    this.logger.log('📊    │   Staff  : Khalil Al-Yami');
    this.logger.log('📊    └── Clinic 2B – Dermatology Clinic');
    this.logger.log('📊        Hours  : Mon–Thu 10:00–18:00 | Fri 10:00–15:00 | Sat 10:00–14:00');
    this.logger.log('📊        Owner  : Faisal Al-Zahrani');
    this.logger.log('📊        Admin  : Amira Al-Juhani');
    this.logger.log('📊        Doctor1: Tariq Al-Mutairi (Mon–Wed+Fri 10–15/13:30)');
    this.logger.log('📊        Doctor2: Sara Al-Zahrani  (Tue+Thu 15–18, Sat 10–14)');
    this.logger.log('📊        Staff  : Saud Al-Rashid');
    this.logger.log('📊');
    this.logger.log('📊  DEFAULT PASSWORD : Password123!');
    this.logger.log('📊 ═══════════════════════════════════════════════════');
  }

  // ─── Patient definitions per clinic ─────────────────────────────────────

  private readonly PATIENT_DATA: Record<string, Array<{
    seq: number; firstName: string; lastName: string; dob: string;
    gender: string; phone: string; ins?: string; insStatus: string; status: string;
  }>> = {
    '1A': [
      { seq: 1,  firstName: 'Ahmed',    lastName: 'Al-Rashidi',   dob: '1985-03-12', gender: 'male',   phone: '+966501001001', ins: 'Bupa Arabia', insStatus: 'Active',   status: 'Active'   },
      { seq: 2,  firstName: 'Fatima',   lastName: 'Al-Ahmadi',    dob: '1990-07-25', gender: 'female', phone: '+966501001002',                     insStatus: 'Expired',  status: 'Active'   },
      { seq: 3,  firstName: 'Mohammed', lastName: 'Al-Mutairi',   dob: '1978-11-05', gender: 'male',   phone: '+966501001003', ins: 'Tawuniya',    insStatus: 'Active',   status: 'Active'   },
      { seq: 4,  firstName: 'Layla',    lastName: 'Al-Dosari',    dob: '1995-01-18', gender: 'female', phone: '+966501001004',                     insStatus: 'None',     status: 'Active'   },
      { seq: 5,  firstName: 'Abdullah', lastName: 'Al-Harbi',     dob: '1972-09-30', gender: 'male',   phone: '+966501001005', ins: 'Walaa',       insStatus: 'Pending',  status: 'Active'   },
      { seq: 6,  firstName: 'Nora',     lastName: 'Al-Shehri',    dob: '1988-04-14', gender: 'female', phone: '+966501001006', ins: 'Bupa Arabia', insStatus: 'Active',   status: 'Active'   },
      { seq: 7,  firstName: 'Khalid',   lastName: 'Al-Otaibi',    dob: '1965-12-22', gender: 'male',   phone: '+966501001007',                     insStatus: 'Expired',  status: 'Inactive' },
      { seq: 8,  firstName: 'Sara',     lastName: 'Al-Ghamdi',    dob: '1993-06-09', gender: 'female', phone: '+966501001008', ins: 'MedGulf',     insStatus: 'Active',   status: 'Active'   },
      { seq: 9,  firstName: 'Omar',     lastName: 'Al-Qahtani',   dob: '1980-02-28', gender: 'male',   phone: '+966501001009',                     insStatus: 'None',     status: 'Active'   },
      { seq: 10, firstName: 'Dana',     lastName: 'Al-Zahrani',   dob: '1997-08-17', gender: 'female', phone: '+966501001010', ins: 'Tawuniya',    insStatus: 'Active',   status: 'Active'   },
      { seq: 11, firstName: 'Yousef',   lastName: 'Al-Maliki',    dob: '1975-05-03', gender: 'male',   phone: '+966501001011', ins: 'Bupa Arabia', insStatus: 'Active',   status: 'Active'   },
      { seq: 12, firstName: 'Maha',     lastName: 'Al-Juhani',    dob: '1983-10-19', gender: 'female', phone: '+966501001012',                     insStatus: 'Expired',  status: 'Inactive' },
      { seq: 13, firstName: 'Tariq',    lastName: 'Al-Anazi',     dob: '1968-03-07', gender: 'male',   phone: '+966501001013', ins: 'Walaa',       insStatus: 'Active',   status: 'Active'   },
      { seq: 14, firstName: 'Rania',    lastName: 'Al-Rashid',    dob: '1992-11-24', gender: 'female', phone: '+966501001014',                     insStatus: 'Pending',  status: 'Active'   },
      { seq: 15, firstName: 'Hassan',   lastName: 'Al-Shammari',  dob: '1970-07-11', gender: 'male',   phone: '+966501001015', ins: 'MedGulf',     insStatus: 'Active',   status: 'Active'   },
    ],
    '1B': [
      { seq: 1,  firstName: 'Sami',     lastName: 'Al-Ghamdi',    dob: '1982-06-15', gender: 'male',   phone: '+966501002001', ins: 'Tawuniya',    insStatus: 'Active',   status: 'Active'   },
      { seq: 2,  firstName: 'Hessa',    lastName: 'Al-Qahtani',   dob: '1991-02-28', gender: 'female', phone: '+966501002002',                     insStatus: 'None',     status: 'Active'   },
      { seq: 3,  firstName: 'Badr',     lastName: 'Al-Shammari',  dob: '1976-09-10', gender: 'male',   phone: '+966501002003', ins: 'Bupa Arabia', insStatus: 'Active',   status: 'Active'   },
      { seq: 4,  firstName: 'Mona',     lastName: 'Al-Harbi',     dob: '1988-04-22', gender: 'female', phone: '+966501002004', ins: 'MedGulf',     insStatus: 'Active',   status: 'Active'   },
      { seq: 5,  firstName: 'Talal',    lastName: 'Al-Otaibi',    dob: '1964-12-05', gender: 'male',   phone: '+966501002005',                     insStatus: 'Expired',  status: 'Inactive' },
      { seq: 6,  firstName: 'Reema',    lastName: 'Al-Zahrani',   dob: '1994-07-19', gender: 'female', phone: '+966501002006', ins: 'Walaa',       insStatus: 'Active',   status: 'Active'   },
      { seq: 7,  firstName: 'Majed',    lastName: 'Al-Dosari',    dob: '1979-03-30', gender: 'male',   phone: '+966501002007', ins: 'Tawuniya',    insStatus: 'Active',   status: 'Active'   },
      { seq: 8,  firstName: 'Lina',     lastName: 'Al-Mutairi',   dob: '1996-11-14', gender: 'female', phone: '+966501002008',                     insStatus: 'Pending',  status: 'Active'   },
      { seq: 9,  firstName: 'Nawaf',    lastName: 'Al-Rashidi',   dob: '1970-08-25', gender: 'male',   phone: '+966501002009', ins: 'Bupa Arabia', insStatus: 'Active',   status: 'Active'   },
      { seq: 10, firstName: 'Abeer',    lastName: 'Al-Ahmadi',    dob: '1986-01-07', gender: 'female', phone: '+966501002010', ins: 'MedGulf',     insStatus: 'Active',   status: 'Active'   },
      { seq: 11, firstName: 'Faris',    lastName: 'Al-Anazi',     dob: '1973-05-18', gender: 'male',   phone: '+966501002011',                     insStatus: 'Expired',  status: 'Inactive' },
      { seq: 12, firstName: 'Ghada',    lastName: 'Al-Maliki',    dob: '1998-09-02', gender: 'female', phone: '+966501002012', ins: 'Walaa',       insStatus: 'Active',   status: 'Active'   },
    ],
    '2A': [
      { seq: 1,  firstName: 'Ziad',     lastName: 'Al-Tamimi',    dob: '2010-04-12', gender: 'male',   phone: '+966501003001', ins: 'Bupa Arabia', insStatus: 'Active',   status: 'Active'   },
      { seq: 2,  firstName: 'Jood',     lastName: 'Al-Sulaiman',  dob: '2015-08-30', gender: 'female', phone: '+966501003002', ins: 'Tawuniya',    insStatus: 'Active',   status: 'Active'   },
      { seq: 3,  firstName: 'Rakan',    lastName: 'Al-Bishi',     dob: '2008-01-22', gender: 'male',   phone: '+966501003003',                     insStatus: 'None',     status: 'Active'   },
      { seq: 4,  firstName: 'Lujain',   lastName: 'Al-Harthi',    dob: '2018-06-05', gender: 'female', phone: '+966501003004', ins: 'MedGulf',     insStatus: 'Active',   status: 'Active'   },
      { seq: 5,  firstName: 'Sultan',   lastName: 'Al-Yami',      dob: '2012-11-17', gender: 'male',   phone: '+966501003005', ins: 'Walaa',       insStatus: 'Pending',  status: 'Active'   },
      { seq: 6,  firstName: 'Rand',     lastName: 'Al-Juhani',    dob: '2020-03-08', gender: 'female', phone: '+966501003006', ins: 'Bupa Arabia', insStatus: 'Active',   status: 'Active'   },
      { seq: 7,  firstName: 'Hamad',    lastName: 'Al-Shehri',    dob: '2007-09-25', gender: 'male',   phone: '+966501003007', ins: 'Tawuniya',    insStatus: 'Active',   status: 'Active'   },
      { seq: 8,  firstName: 'Nada',     lastName: 'Al-Zahrani',   dob: '2016-12-14', gender: 'female', phone: '+966501003008',                     insStatus: 'Expired',  status: 'Inactive' },
      { seq: 9,  firstName: 'Yazeed',   lastName: 'Al-Qahtani',   dob: '2009-07-03', gender: 'male',   phone: '+966501003009', ins: 'MedGulf',     insStatus: 'Active',   status: 'Active'   },
      { seq: 10, firstName: 'Arwa',     lastName: 'Al-Harbi',     dob: '2019-02-20', gender: 'female', phone: '+966501003010', ins: 'Walaa',       insStatus: 'Active',   status: 'Active'   },
    ],
    '2B': [
      { seq: 1,  firstName: 'Wafa',     lastName: 'Al-Rashid',    dob: '1987-05-14', gender: 'female', phone: '+966501004001', ins: 'Bupa Arabia', insStatus: 'Active',   status: 'Active'   },
      { seq: 2,  firstName: 'Meshal',   lastName: 'Al-Ghamdi',    dob: '1993-10-27', gender: 'male',   phone: '+966501004002',                     insStatus: 'None',     status: 'Active'   },
      { seq: 3,  firstName: 'Asma',     lastName: 'Al-Otaibi',    dob: '1979-02-09', gender: 'female', phone: '+966501004003', ins: 'Tawuniya',    insStatus: 'Active',   status: 'Active'   },
      { seq: 4,  firstName: 'Raed',     lastName: 'Al-Mutairi',   dob: '1995-08-16', gender: 'male',   phone: '+966501004004', ins: 'MedGulf',     insStatus: 'Active',   status: 'Active'   },
      { seq: 5,  firstName: 'Hajar',    lastName: 'Al-Shammari',  dob: '1984-04-01', gender: 'female', phone: '+966501004005', ins: 'Walaa',       insStatus: 'Active',   status: 'Active'   },
      { seq: 6,  firstName: 'Bandar',   lastName: 'Al-Ahmadi',    dob: '1970-12-23', gender: 'male',   phone: '+966501004006',                     insStatus: 'Expired',  status: 'Inactive' },
      { seq: 7,  firstName: 'Shahad',   lastName: 'Al-Dosari',    dob: '1998-07-11', gender: 'female', phone: '+966501004007', ins: 'Bupa Arabia', insStatus: 'Active',   status: 'Active'   },
      { seq: 8,  firstName: 'Fhad',     lastName: 'Al-Zahrani',   dob: '1988-03-05', gender: 'male',   phone: '+966501004008', ins: 'Tawuniya',    insStatus: 'Pending',  status: 'Active'   },
    ],
  };

  // ─── Seed patients for a clinic ─────────────────────────────────────────

  private async seedPatients(
    clinic: Clinic,
    complex: Complex,
    organization: Organization,
    code: '1A' | '1B' | '2A' | '2B',
  ): Promise<void> {
    const clinicId       = clinic._id as Types.ObjectId;
    const complexId      = complex._id as Types.ObjectId;
    const organizationId = organization._id as Types.ObjectId;
    const patients = this.PATIENT_DATA[code];

    let created = 0;
    for (const p of patients) {
      const cardNumber = `CARD-${code}-${String(p.seq).padStart(3, '0')}`;
      if (await this.patientModel.findOne({ cardNumber })) continue;

      const patientNumber = `PAT${code}${String(p.seq).padStart(3, '0')}`;
      await this.patientModel.create({
        clinicId,
        complexId,
        organizationId,
        patientNumber,
        cardNumber,
        firstName:         p.firstName,
        lastName:          p.lastName,
        dateOfBirth:       new Date(p.dob),
        gender:            p.gender,
        status:            p.status,
        phone:             p.phone,
        insuranceCompany:  p.ins,
        insuranceStatus:   p.insStatus,
        preferredLanguage: 'ar',
      });
      created++;
    }

    if (created > 0) {
      this.logger.log(`  ✓ Seeded ${created} patients for Clinic ${code} (${(clinic as any).name})`);
    } else {
      this.logger.log(`  ↺ Patients already exist for Clinic ${code}`);
    }
  }

  // ─── Clear ────────────────────────────────────────────────────────────────

  async clearExampleData(): Promise<void> {
    this.logger.warn('🗑️ Clearing example data...');
    const emails = [
      'medicare.owner@example.com',
      'clinic.owner.1a@medicare.example.com',
      'clinic.admin.1a@medicare.example.com',
      'doctor1.1a@medicare.example.com',
      'doctor2.1a@medicare.example.com',
      'staff.1a@medicare.example.com',
      'clinic.owner.1b@medicare.example.com',
      'clinic.admin.1b@medicare.example.com',
      'doctor1.1b@medicare.example.com',
      'doctor2.1b@medicare.example.com',
      'staff.1b@medicare.example.com',
      'clinic.owner.2a@medicare.example.com',
      'clinic.admin.2a@medicare.example.com',
      'doctor1.2a@medicare.example.com',
      'doctor2.2a@medicare.example.com',
      'staff.2a@medicare.example.com',
      'clinic.owner.2b@medicare.example.com',
      'clinic.admin.2b@medicare.example.com',
      'doctor1.2b@medicare.example.com',
      'doctor2.2b@medicare.example.com',
      'staff.2b@medicare.example.com',
    ];

    const users = await this.userModel.find({ email: { $in: emails } });
    const userIds = users.map((u) => u._id);

    // Remove working hours for users
    await this.workingHoursModel.deleteMany({ entityType: 'user', entityId: { $in: userIds } });

    // Remove clinics
    const clinicNames = ['Cardiology Clinic', 'Neurology Clinic', 'Pediatrics Clinic', 'Dermatology Clinic'];
    const clinics = await this.clinicModel.find({ name: { $in: clinicNames } });
    const clinicIds = clinics.map((c) => c._id);
    await this.workingHoursModel.deleteMany({ entityType: 'clinic', entityId: { $in: clinicIds } });
    await this.patientModel.deleteMany({ cardNumber: /^CARD-(1A|1B|2A|2B)-/ });
    await this.clinicModel.deleteMany({ name: { $in: clinicNames } });

    // Remove complexes
    const complexNames = ['Al-Shifa Medical Complex', 'Al-Amal Medical Complex'];
    const complexes = await this.complexModel.find({ name: { $in: complexNames } });
    const complexIds = complexes.map((c) => c._id);
    await this.workingHoursModel.deleteMany({ entityType: 'complex', entityId: { $in: complexIds } });
    await this.complexModel.deleteMany({ name: { $in: complexNames } });

    // Remove organization
    const org = await this.organizationModel.findOne({ name: 'MediCare Healthcare Group' });
    if (org) {
      await this.workingHoursModel.deleteMany({ entityType: 'organization', entityId: org._id });
      await this.organizationModel.deleteOne({ _id: org._id });
    }

    // Remove user access
    await this.userAccessModel.deleteMany({ userId: { $in: userIds } });

    // Remove DoctorService records for example doctors
    await this.doctorServiceModel.deleteMany({ doctorId: { $in: userIds } });

    // Remove users
    await this.userModel.deleteMany({ email: { $in: emails } });

    this.logger.log('✅ Example data cleared');
  }
}
