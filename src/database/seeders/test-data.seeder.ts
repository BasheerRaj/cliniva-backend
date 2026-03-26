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
  Service,
  ClinicService,
  EmployeeProfile,
  UserAccess,
  WorkingHours,
  Patient,
} from '../schemas';

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface StaffDef {
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  gender: string;
  phone: string;
}

interface ClinicConfig {
  code: string;
  name: string;
  specialization: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TEST_DOMAIN = '@cliniva-test.com';
const TEST_PASSWORD = 'Test@1234';

// Standard clinic schedule: Mon–Fri 08:00–17:00 (lunch break), Sat 09:00–14:00, Sun off
const CLINIC_HOURS: DayConfig[] = [
  { dayOfWeek: 'monday',    isWorkingDay: true,  openingTime: '08:00', closingTime: '17:00', breakStartTime: '12:00', breakEndTime: '13:00' },
  { dayOfWeek: 'tuesday',   isWorkingDay: true,  openingTime: '08:00', closingTime: '17:00', breakStartTime: '12:00', breakEndTime: '13:00' },
  { dayOfWeek: 'wednesday', isWorkingDay: true,  openingTime: '08:00', closingTime: '17:00', breakStartTime: '12:00', breakEndTime: '13:00' },
  { dayOfWeek: 'thursday',  isWorkingDay: true,  openingTime: '08:00', closingTime: '17:00', breakStartTime: '12:00', breakEndTime: '13:00' },
  { dayOfWeek: 'friday',    isWorkingDay: true,  openingTime: '08:00', closingTime: '17:00', breakStartTime: '12:00', breakEndTime: '13:00' },
  { dayOfWeek: 'saturday',  isWorkingDay: true,  openingTime: '09:00', closingTime: '14:00' },
  { dayOfWeek: 'sunday',    isWorkingDay: false },
];

// Doctor 1: Mon–Thu 08:00–14:00 (morning shift)
const DOCTOR_1_HOURS: DayConfig[] = [
  { dayOfWeek: 'monday',    isWorkingDay: true,  openingTime: '08:00', closingTime: '14:00' },
  { dayOfWeek: 'tuesday',   isWorkingDay: true,  openingTime: '08:00', closingTime: '14:00' },
  { dayOfWeek: 'wednesday', isWorkingDay: true,  openingTime: '08:00', closingTime: '14:00' },
  { dayOfWeek: 'thursday',  isWorkingDay: true,  openingTime: '08:00', closingTime: '14:00' },
  { dayOfWeek: 'friday',    isWorkingDay: false },
  { dayOfWeek: 'saturday',  isWorkingDay: false },
  { dayOfWeek: 'sunday',    isWorkingDay: false },
];

// Doctor 2: Mon, Wed, Thu, Sat 10:00–17:00 (afternoon/weekend shift)
const DOCTOR_2_HOURS: DayConfig[] = [
  { dayOfWeek: 'monday',    isWorkingDay: true,  openingTime: '10:00', closingTime: '17:00' },
  { dayOfWeek: 'tuesday',   isWorkingDay: false },
  { dayOfWeek: 'wednesday', isWorkingDay: true,  openingTime: '10:00', closingTime: '17:00' },
  { dayOfWeek: 'thursday',  isWorkingDay: true,  openingTime: '10:00', closingTime: '17:00' },
  { dayOfWeek: 'friday',    isWorkingDay: false },
  { dayOfWeek: 'saturday',  isWorkingDay: true,  openingTime: '10:00', closingTime: '14:00' },
  { dayOfWeek: 'sunday',    isWorkingDay: false },
];

// 5 patients per clinic
const PATIENT_POOL = [
  { firstName: 'Ahmed',  lastName: 'Al-Rashidi', gender: 'male',   dob: '1980-03-12' },
  { firstName: 'Fatima', lastName: 'Al-Ahmadi',  gender: 'female', dob: '1982-07-25' },
  { firstName: 'Khalid', lastName: 'Al-Mutairi', gender: 'male',   dob: '1984-11-05' },
  { firstName: 'Nora',   lastName: 'Al-Ghamdi',  gender: 'female', dob: '1986-02-14' },
  { firstName: 'Omar',   lastName: 'Al-Zahrani', gender: 'male',   dob: '1988-09-30' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Per-clinic staff definitions
// email prefix → full email built as `${prefix}${TEST_DOMAIN}`
// phone: +966 5 {series} {2-digit codeId+slot} 00001  (9 digits after +966)
// ─────────────────────────────────────────────────────────────────────────────

function buildStaffDefs(code: string, codeId: number): StaffDef[] {
  const ADMIN_NAMES: [string, string, string][] = [
    ['Mariam',  'Al-Tamimi',  'female'],
    ['Rawan',   'Al-Shehri',  'female'],
  ];
  const DOCTOR_NAMES: [string, string, string][] = [
    ['Khalid',  'Al-Rashidi', 'male'],
    ['Nora',    'Al-Sulaiman','female'],
  ];
  const STAFF_NAMES: [string, string, string][] = [
    ['Fahad',   'Al-Anazi',   'male'],
    ['Huda',    'Al-Basri',   'female'],
  ];

  // Offset names by codeId so each clinic gets different names
  const pick = <T>(arr: T[], offset: number): T => arr[(offset) % arr.length];

  const ALL_ADMINS: [string, string, string][] = [
    ['Mariam',  'Al-Tamimi',   'female'], ['Rawan',   'Al-Shehri',   'female'],
    ['Dana',    'Al-Masoudi',  'female'], ['Eman',    'Al-Qahtani',  'female'],
    ['Nada',    'Al-Sulaiman', 'female'], ['Ahmad',   'Al-Shehri',   'male'],
    ['Fatimah', 'Al-Rashidi',  'female'], ['Yasser',  'Al-Dosari',   'male'],
    ['Hessa',   'Al-Harbi',    'female'], ['Khalil',  'Al-Ghamdi',   'male'],
    ['Samira',  'Al-Zahrani',  'female'], ['Turki',   'Al-Otaibi',   'male'],
  ];
  const ALL_DOCTORS: [string, string, string][] = [
    ['Khalid', 'Al-Rashidi', 'male'],  ['Nora',   'Al-Sulaiman','female'],
    ['Omar',   'Al-Harbi',   'male'],  ['Layla',  'Al-Dosari',  'female'],
    ['Hassan', 'Al-Otaibi',  'male'],  ['Maha',   'Al-Ghamdi',  'female'],
    ['Tariq',  'Al-Mutairi', 'male'],  ['Sara',   'Al-Zahrani', 'female'],
    ['Walid',  'Al-Ghamdi',  'male'],  ['Aisha',  'Al-Maliki',  'female'],
    ['Majed',  'Al-Tamimi',  'male'],  ['Reem',   'Al-Harbi',   'female'],
  ];
  const ALL_STAFF: [string, string, string][] = [
    ['Fahad',  'Al-Anazi',   'male'],  ['Huda',   'Al-Basri',   'female'],
    ['Turki',  'Al-Maliki',  'male'],  ['Amira',  'Al-Juhani',  'female'],
    ['Khalil', 'Al-Yami',    'male'],  ['Lujain', 'Al-Zahrani', 'female'],
    ['Saud',   'Al-Rashid',  'male'],  ['Dina',   'Al-Ahmadi',  'female'],
    ['Bandar', 'Al-Anazi',   'male'],  ['Haya',   'Al-Otaibi',  'female'],
    ['Sultan', 'Al-Masoudi', 'male'],  ['Sahar',  'Al-Juhani',  'female'],
  ];

  // Use void to silence unused variable lint
  void ADMIN_NAMES;
  void DOCTOR_NAMES;
  void STAFF_NAMES;
  void pick;

  const offset = (codeId - 1) * 2; // each clinic uses 2 entries from each pool

  return [
    {
      email: `admin1.${code}${TEST_DOMAIN}`,
      role: 'admin',
      firstName: ALL_ADMINS[offset][0],
      lastName:  ALL_ADMINS[offset][1],
      gender:    ALL_ADMINS[offset][2],
      jobTitle: 'Clinic Admin',
      phone: buildPhone(3, codeId, 1),
    },
    {
      email: `admin2.${code}${TEST_DOMAIN}`,
      role: 'admin',
      firstName: ALL_ADMINS[offset + 1][0],
      lastName:  ALL_ADMINS[offset + 1][1],
      gender:    ALL_ADMINS[offset + 1][2],
      jobTitle: 'Senior Admin',
      phone: buildPhone(3, codeId, 2),
    },
    {
      email: `dr1.${code}${TEST_DOMAIN}`,
      role: 'doctor',
      firstName: ALL_DOCTORS[offset][0],
      lastName:  ALL_DOCTORS[offset][1],
      gender:    ALL_DOCTORS[offset][2],
      jobTitle: 'General Practitioner',
      phone: buildPhone(3, codeId, 3),
    },
    {
      email: `dr2.${code}${TEST_DOMAIN}`,
      role: 'doctor',
      firstName: ALL_DOCTORS[offset + 1][0],
      lastName:  ALL_DOCTORS[offset + 1][1],
      gender:    ALL_DOCTORS[offset + 1][2],
      jobTitle: 'Specialist Doctor',
      phone: buildPhone(3, codeId, 4),
    },
    {
      email: `staff1.${code}${TEST_DOMAIN}`,
      role: 'staff',
      firstName: ALL_STAFF[offset][0],
      lastName:  ALL_STAFF[offset][1],
      gender:    ALL_STAFF[offset][2],
      jobTitle: 'Receptionist',
      phone: buildPhone(3, codeId, 5),
    },
    {
      email: `staff2.${code}${TEST_DOMAIN}`,
      role: 'staff',
      firstName: ALL_STAFF[offset + 1][0],
      lastName:  ALL_STAFF[offset + 1][1],
      gender:    ALL_STAFF[offset + 1][2],
      jobTitle: 'Nurse',
      phone: buildPhone(3, codeId, 6),
    },
  ];
}

/**
 * Builds a valid Saudi mobile number (+966 5XXXXXXXX, 9 digits after +966).
 * series: 1-digit (e.g. 3 for staff, 4 for patients)
 * codeId: 1-6 (clinic index)
 * slot:   1-6 (role slot within clinic)
 *
 * Result format: +966 5{series}{codeId}{slot}00001  (9 digits: 1+1+1+1+5)
 */
function buildPhone(series: number, codeId: number, slot: number): string {
  return `+96650${series}${codeId}${slot}00001`;
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class TestDataSeederService {
  private readonly logger = new Logger(TestDataSeederService.name);
  private hashedPassword = '';

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<Subscription>,
    @InjectModel(SubscriptionPlan.name)
    private readonly subscriptionPlanModel: Model<SubscriptionPlan>,
    @InjectModel(Organization.name)
    private readonly organizationModel: Model<Organization>,
    @InjectModel(Complex.name)
    private readonly complexModel: Model<Complex>,
    @InjectModel(Clinic.name)
    private readonly clinicModel: Model<Clinic>,
    @InjectModel(EmployeeProfile.name)
    private readonly employeeProfileModel: Model<EmployeeProfile>,
    @InjectModel(Patient.name)
    private readonly patientModel: Model<Patient>,
    @InjectModel(Service.name)
    private readonly serviceModel: Model<Service>,
    @InjectModel(ClinicService.name)
    private readonly clinicServiceModel: Model<ClinicService>,
    @InjectModel('DoctorService')
    private readonly doctorServiceModel: Model<any>,
    @InjectModel(UserAccess.name)
    private readonly userAccessModel: Model<UserAccess>,
    @InjectModel(WorkingHours.name)
    private readonly workingHoursModel: Model<WorkingHours>,
  ) {}

  // ─── Public API ────────────────────────────────────────────────────────────

  async seedTestData(): Promise<void> {
    this.logger.log('🌱 Starting test data seeding...');
    this.hashedPassword = await bcrypt.hash(TEST_PASSWORD, 12);

    const { companyPlan, complexPlan } = await this.ensureBasePlans();
    await this.seedCompanyOwnerHierarchy(companyPlan);
    await this.seedComplexOwnerHierarchy(complexPlan);

    this.logger.log('✅ Test data seeding completed successfully');
    this.logger.log('');
    this.logger.log('📋 Credentials:');
    this.logger.log(`  Owner 1 (company): owner1${TEST_DOMAIN} / ${TEST_PASSWORD}`);
    this.logger.log(`  Owner 2 (complex): owner2${TEST_DOMAIN} / ${TEST_PASSWORD}`);
    this.logger.log(`  Staff pattern:     admin1.a1${TEST_DOMAIN} / ${TEST_PASSWORD}`);
  }

  async clearTestData(): Promise<void> {
    this.logger.log('🗑️  Clearing test data...');

    const ownerEmails = [`owner1${TEST_DOMAIN}`, `owner2${TEST_DOMAIN}`];
    const owners = await this.userModel
      .find({ email: { $in: ownerEmails } })
      .select('_id')
      .lean();
    const ownerIds = owners.map(u => (u as any)._id);

    if (!ownerIds.length) {
      this.logger.log('  ↺ No test owners found — nothing to clear');
      return;
    }

    const subscriptions = await this.subscriptionModel
      .find({ userId: { $in: ownerIds } })
      .select('_id')
      .lean();
    const subscriptionIds = subscriptions.map(s => (s as any)._id);

    const complexes = await this.complexModel
      .find({ subscriptionId: { $in: subscriptionIds } })
      .select('_id')
      .lean();
    const complexIds = complexes.map(c => (c as any)._id);

    const clinics = await this.clinicModel
      .find({ subscriptionId: { $in: subscriptionIds } })
      .select('_id')
      .lean();
    const clinicIds = clinics.map(c => (c as any)._id);

    const allTestUsers = await this.userModel
      .find({ email: new RegExp(`${TEST_DOMAIN.replace('.', '\\.')}$`) })
      .select('_id')
      .lean();
    const allTestUserIds = allTestUsers.map(u => (u as any)._id);

    // Delete in reverse creation order
    const dr = await this.doctorServiceModel.deleteMany({ clinicId: { $in: clinicIds } });
    this.logger.log(`  ✓ Deleted ${dr.deletedCount} DoctorService records`);

    const cs = await this.clinicServiceModel.deleteMany({ clinicId: { $in: clinicIds } });
    this.logger.log(`  ✓ Deleted ${cs.deletedCount} ClinicService records`);

    const ua = await this.userAccessModel.deleteMany({ userId: { $in: allTestUserIds } });
    this.logger.log(`  ✓ Deleted ${ua.deletedCount} UserAccess records`);

    const wh = await this.workingHoursModel.deleteMany({
      entityId: { $in: [...clinicIds, ...allTestUserIds] },
    });
    this.logger.log(`  ✓ Deleted ${wh.deletedCount} WorkingHours records`);

    const ep = await this.employeeProfileModel.deleteMany({ userId: { $in: allTestUserIds } });
    this.logger.log(`  ✓ Deleted ${ep.deletedCount} EmployeeProfile records`);

    const pt = await this.patientModel.deleteMany({ clinicId: { $in: clinicIds } });
    this.logger.log(`  ✓ Deleted ${pt.deletedCount} Patient records`);

    const sv = await this.serviceModel.deleteMany({ complexId: { $in: complexIds } });
    this.logger.log(`  ✓ Deleted ${sv.deletedCount} complex-scoped Service records`);

    const us = await this.userModel.deleteMany({
      email: new RegExp(`${TEST_DOMAIN.replace('.', '\\.')}$`),
    });
    this.logger.log(`  ✓ Deleted ${us.deletedCount} User records`);

    const cl = await this.clinicModel.deleteMany({ subscriptionId: { $in: subscriptionIds } });
    this.logger.log(`  ✓ Deleted ${cl.deletedCount} Clinic records`);

    const cx = await this.complexModel.deleteMany({ subscriptionId: { $in: subscriptionIds } });
    this.logger.log(`  ✓ Deleted ${cx.deletedCount} Complex records`);

    const og = await this.organizationModel.deleteMany({ subscriptionId: { $in: subscriptionIds } });
    this.logger.log(`  ✓ Deleted ${og.deletedCount} Organization records`);

    const sb = await this.subscriptionModel.deleteMany({ userId: { $in: ownerIds } });
    this.logger.log(`  ✓ Deleted ${sb.deletedCount} Subscription records`);

    this.logger.log('✅ Test data cleared successfully');
  }

  // ─── Base Plans ────────────────────────────────────────────────────────────

  private async ensureBasePlans(): Promise<{ companyPlan: any; complexPlan: any }> {
    let companyPlan = await this.subscriptionPlanModel.findOne({ name: 'company' });
    if (!companyPlan) {
      companyPlan = await this.subscriptionPlanModel.create({
        name: 'company',
        maxOrganizations: 1,
        maxComplexes: 50,
        maxClinics: 500,
        price: 999.99,
      });
      this.logger.log('  ✓ Created company subscription plan');
    }

    let complexPlan = await this.subscriptionPlanModel.findOne({ name: 'complex' });
    if (!complexPlan) {
      complexPlan = await this.subscriptionPlanModel.create({
        name: 'complex',
        maxOrganizations: 0,
        maxComplexes: 1,
        maxClinics: 10,
        price: 299.99,
      });
      this.logger.log('  ✓ Created complex subscription plan');
    }

    return { companyPlan, complexPlan };
  }

  // ─── Company Plan Hierarchy ────────────────────────────────────────────────

  private async seedCompanyOwnerHierarchy(companyPlan: any): Promise<void> {
    this.logger.log('\n📦 Seeding company plan hierarchy (Owner 1)...');

    // 1. Owner user
    let owner1 = await this.userModel.findOne({ email: `owner1${TEST_DOMAIN}` });
    if (!owner1) {
      owner1 = await this.userModel.create({
        username: `owner1${TEST_DOMAIN}`,
        email: `owner1${TEST_DOMAIN}`,
        passwordHash: this.hashedPassword,
        firstName: 'Mohammed',
        lastName: 'Al-Rashid',
        role: 'owner',
        planType: 'company',
        gender: 'male',
        phone: '+966501000001',
        preferredLanguage: 'ar',
        isActive: true,
        emailVerified: true,
        setupComplete: true,
        onboardingComplete: true,
      });
      this.logger.log('  ✓ Created company owner: Mohammed Al-Rashid');
    }

    // 2. Subscription
    let sub1 = await this.subscriptionModel.findOne({ userId: owner1._id });
    if (!sub1) {
      sub1 = await this.subscriptionModel.create({
        userId: owner1._id,
        planId: companyPlan._id,
        status: 'active',
        startedAt: new Date('2024-01-01'),
        expiresAt: new Date('2026-12-31'),
      });
      this.logger.log('  ✓ Created company subscription');
    }
    await this.userModel.updateOne({ _id: owner1._id }, { subscriptionId: sub1._id });

    // 3. Organization
    const org = await this.findOrCreateOrganization(sub1._id, owner1._id as Types.ObjectId);
    await this.userModel.updateOne({ _id: owner1._id }, { organizationId: org._id });

    // 4. Global services
    const globalServices = await this.ensureGlobalServices();

    // 5. Complex Alpha → Clinics A1 + A2
    const complexAlpha = await this.findOrCreateComplex(
      'Test Complex Alpha',
      sub1._id,
      owner1._id as Types.ObjectId,
      org._id as Types.ObjectId,
    );
    const cardioService = await this.findOrCreateComplexService(
      'Cardiology Consultation',
      complexAlpha._id,
      45,
      400,
    );
    const alphaClinics: ClinicConfig[] = [
      { code: 'a1', name: 'Cardiology Test Clinic', specialization: 'Cardiology' },
      { code: 'a2', name: 'Neurology Test Clinic',  specialization: 'Neurology' },
    ];
    for (let i = 0; i < alphaClinics.length; i++) {
      const cfg = alphaClinics[i];
      const clinic = await this.findOrCreateClinic(
        cfg.name,
        cfg.specialization,
        sub1._id,
        owner1._id as Types.ObjectId,
        complexAlpha._id as Types.ObjectId,
        org._id as Types.ObjectId,
      );
      await this.populateClinic(
        clinic,
        cfg.code,
        i + 1,
        sub1._id,
        owner1._id as Types.ObjectId,
        complexAlpha._id as Types.ObjectId,
        org._id as Types.ObjectId,
        [...globalServices, cardioService],
      );
    }

    // 6. Complex Beta → Clinics B1 + B2
    const complexBeta = await this.findOrCreateComplex(
      'Test Complex Beta',
      sub1._id,
      owner1._id as Types.ObjectId,
      org._id as Types.ObjectId,
    );
    const pediatricService = await this.findOrCreateComplexService(
      'Pediatric Assessment',
      complexBeta._id,
      30,
      300,
    );
    const betaClinics: ClinicConfig[] = [
      { code: 'b1', name: 'Pediatrics Test Clinic',  specialization: 'Pediatrics' },
      { code: 'b2', name: 'Dermatology Test Clinic', specialization: 'Dermatology' },
    ];
    for (let i = 0; i < betaClinics.length; i++) {
      const cfg = betaClinics[i];
      const clinic = await this.findOrCreateClinic(
        cfg.name,
        cfg.specialization,
        sub1._id,
        owner1._id as Types.ObjectId,
        complexBeta._id as Types.ObjectId,
        org._id as Types.ObjectId,
      );
      await this.populateClinic(
        clinic,
        cfg.code,
        i + 3, // codeId: b1=3, b2=4
        sub1._id,
        owner1._id as Types.ObjectId,
        complexBeta._id as Types.ObjectId,
        org._id as Types.ObjectId,
        [...globalServices, pediatricService],
      );
    }
  }

  // ─── Complex Plan Hierarchy ────────────────────────────────────────────────

  private async seedComplexOwnerHierarchy(complexPlan: any): Promise<void> {
    this.logger.log('\n📦 Seeding complex plan hierarchy (Owner 2)...');

    // 1. Owner user
    let owner2 = await this.userModel.findOne({ email: `owner2${TEST_DOMAIN}` });
    if (!owner2) {
      owner2 = await this.userModel.create({
        username: `owner2${TEST_DOMAIN}`,
        email: `owner2${TEST_DOMAIN}`,
        passwordHash: this.hashedPassword,
        firstName: 'Sarah',
        lastName: 'Al-Qahtani',
        role: 'owner',
        planType: 'complex',
        gender: 'female',
        phone: '+966502000001',
        preferredLanguage: 'ar',
        isActive: true,
        emailVerified: true,
        setupComplete: true,
        onboardingComplete: true,
      });
      this.logger.log('  ✓ Created complex owner: Sarah Al-Qahtani');
    }

    // 2. Subscription
    let sub2 = await this.subscriptionModel.findOne({ userId: owner2._id });
    if (!sub2) {
      sub2 = await this.subscriptionModel.create({
        userId: owner2._id,
        planId: complexPlan._id,
        status: 'active',
        startedAt: new Date('2024-01-01'),
        expiresAt: new Date('2026-12-31'),
      });
      this.logger.log('  ✓ Created complex subscription');
    }
    await this.userModel.updateOne({ _id: owner2._id }, { subscriptionId: sub2._id });

    // 3. Standalone complex (no organizationId)
    const complexGamma = await this.findOrCreateComplex(
      'Test Independent Complex',
      sub2._id,
      owner2._id as Types.ObjectId,
    );

    // 4. Global services + complex-specific service
    const globalServices = await this.ensureGlobalServices();
    const entService = await this.findOrCreateComplexService(
      'ENT Consultation',
      complexGamma._id,
      30,
      350,
    );

    // 5. Clinics C1 + C2
    const gammaClinics: ClinicConfig[] = [
      { code: 'c1', name: 'ENT Test Clinic',          specialization: 'ENT' },
      { code: 'c2', name: 'Ophthalmology Test Clinic', specialization: 'Ophthalmology' },
    ];
    for (let i = 0; i < gammaClinics.length; i++) {
      const cfg = gammaClinics[i];
      const clinic = await this.findOrCreateClinic(
        cfg.name,
        cfg.specialization,
        sub2._id,
        owner2._id as Types.ObjectId,
        complexGamma._id as Types.ObjectId,
      );
      await this.populateClinic(
        clinic,
        cfg.code,
        i + 5, // codeId: c1=5, c2=6
        sub2._id,
        owner2._id as Types.ObjectId,
        complexGamma._id as Types.ObjectId,
        undefined,
        [...globalServices, entService],
      );
    }
  }

  // ─── Entity Creators ───────────────────────────────────────────────────────

  private async findOrCreateOrganization(
    subscriptionId: any,
    ownerId: Types.ObjectId,
  ): Promise<any> {
    let org = await this.organizationModel.findOne({ name: 'Cliniva Test Healthcare Group' });
    if (!org) {
      org = await this.organizationModel.create({
        subscriptionId,
        ownerId,
        name: 'Cliniva Test Healthcare Group',
        legalName: 'Cliniva Test Healthcare Group LLC',
        email: 'info@test-healthcare.com',
        phoneNumbers: [{ number: '+966112345678', type: 'primary', label: 'Main Office' }],
        address: { street: 'King Fahd Road', city: 'Riyadh', country: 'Saudi Arabia' },
      });
      this.logger.log('  ✓ Created organization: Cliniva Test Healthcare Group');
    } else {
      await this.organizationModel.updateOne({ _id: org._id }, { subscriptionId, ownerId });
    }
    return org;
  }

  private async findOrCreateComplex(
    name: string,
    subscriptionId: any,
    ownerId: Types.ObjectId,
    organizationId?: any,
  ): Promise<any> {
    let complex = await this.complexModel.findOne({ name });
    if (!complex) {
      complex = await this.complexModel.create({
        subscriptionId,
        ownerId,
        name,
        status: 'active',
        ...(organizationId ? { organizationId } : {}),
      });
      this.logger.log(`  ✓ Created complex: ${name}`);
    } else {
      await this.complexModel.updateOne(
        { _id: complex._id },
        { subscriptionId, ownerId, ...(organizationId ? { organizationId } : {}) },
      );
    }
    return complex;
  }

  private async findOrCreateClinic(
    name: string,
    specialization: string,
    subscriptionId: any,
    ownerId: Types.ObjectId,
    complexId: Types.ObjectId,
    organizationId?: any,
  ): Promise<any> {
    let clinic = await this.clinicModel.findOne({ name });
    if (!clinic) {
      clinic = await this.clinicModel.create({
        subscriptionId,
        ownerId,
        complexId,
        name,
        specialization,
        maxStaff: 50,
        maxDoctors: 10,
        maxPatients: 1000,
        sessionDuration: 30,
        isActive: true,
        status: 'active',
        ...(organizationId ? { organizationId } : {}),
      });
      this.logger.log(`  ✓ Created clinic: ${name}`);
    } else {
      await this.clinicModel.updateOne(
        { _id: clinic._id },
        {
          subscriptionId,
          ownerId,
          complexId,
          ...(organizationId ? { organizationId } : {}),
        },
      );
    }
    return clinic;
  }

  // ─── Clinic Population ─────────────────────────────────────────────────────

  private async populateClinic(
    clinic: any,
    code: string,
    codeId: number,
    subscriptionId: any,
    ownerId: Types.ObjectId,
    complexId: Types.ObjectId,
    organizationId: Types.ObjectId | undefined,
    services: any[],
  ): Promise<void> {
    this.logger.log(`\n  📋 Populating: ${clinic.name} (${code})`);

    const staffDefs = buildStaffDefs(code, codeId);
    const doctors: Array<{ user: any; isDoctor1: boolean }> = [];

    // Create staff
    for (const def of staffDefs) {
      const user = await this.findOrCreateStaffUser(
        def,
        clinic,
        subscriptionId,
        ownerId,
        complexId,
        organizationId,
      );
      if (def.role === 'doctor') {
        doctors.push({ user, isDoctor1: def.email.startsWith('dr1.') });
      }
    }

    // Working hours
    await this.seedClinicWorkingHours(clinic._id);
    for (const { user, isDoctor1 } of doctors) {
      await this.seedDoctorWorkingHours(user._id, clinic._id, isDoctor1);
    }

    // Services → clinic links + doctor authorizations
    for (const svc of services) {
      await this.linkServiceToClinic(svc._id, clinic._id);
      for (const { user } of doctors) {
        await this.authorizeDoctorForService(user._id, svc._id, clinic._id);
      }
    }

    // Patients
    await this.seedPatients(clinic, code, complexId, organizationId);
  }

  private async findOrCreateStaffUser(
    def: StaffDef,
    clinic: any,
    subscriptionId: any,
    ownerId: Types.ObjectId,
    complexId: Types.ObjectId,
    organizationId: Types.ObjectId | undefined,
  ): Promise<any> {
    let user = await this.userModel.findOne({ email: def.email });
    if (!user) {
      user = await this.userModel.create({
        username: def.email.toLowerCase(),
        email: def.email,
        passwordHash: this.hashedPassword,
        firstName: def.firstName,
        lastName: def.lastName,
        role: def.role,
        gender: def.gender,
        phone: def.phone,
        dateOfBirth: new Date('1985-01-01'),
        preferredLanguage: 'ar',
        isActive: true,
        emailVerified: true,
        setupComplete: true,
        onboardingComplete: true,
        subscriptionId,
        complexId,
        clinicId: clinic._id,
        createdBy: ownerId,
        ...(organizationId ? { organizationId } : {}),
      });
      this.logger.log(`    ✓ ${def.role}: ${def.firstName} ${def.lastName}`);
    } else {
      await this.userModel.updateOne(
        { _id: user._id },
        {
          subscriptionId,
          complexId,
          clinicId: clinic._id,
          ...(organizationId ? { organizationId } : {}),
        },
      );
    }

    // Employee profile
    const hasProfile = await this.employeeProfileModel.findOne({ userId: user._id });
    if (!hasProfile) {
      await this.employeeProfileModel.create({
        userId: user._id,
        jobTitle: def.jobTitle,
        dateOfHiring: new Date('2022-01-01'),
        isActive: true,
      });
    }

    // UserAccess
    await this.grantUserAccess(user._id, 'clinic', clinic._id, def.role, ownerId);

    return user;
  }

  // ─── Working Hours ─────────────────────────────────────────────────────────

  private async seedClinicWorkingHours(clinicId: any): Promise<void> {
    for (const day of CLINIC_HOURS) {
      await this.upsertWorkingHours({
        entityType: 'clinic',
        entityId: clinicId,
        ...day,
        isActive: true,
      });
    }
  }

  private async seedDoctorWorkingHours(
    doctorId: any,
    clinicId: any,
    isDoctor1: boolean,
  ): Promise<void> {
    const schedule = isDoctor1 ? DOCTOR_1_HOURS : DOCTOR_2_HOURS;
    for (const day of schedule) {
      await this.upsertWorkingHours({
        entityType: 'user',
        entityId: doctorId,
        parentEntityType: 'clinic',
        parentEntityId: clinicId,
        ...day,
        isActive: true,
      });
    }
  }

  private async upsertWorkingHours(data: Record<string, any>): Promise<void> {
    const { entityType, entityId, dayOfWeek } = data;
    const existing = await this.workingHoursModel.findOne({ entityType, entityId, dayOfWeek });
    if (!existing) {
      await this.workingHoursModel.create(data);
    }
  }

  // ─── Services ──────────────────────────────────────────────────────────────

  /** Global services (no clinicId / complexId) — shared across all clinics */
  private async ensureGlobalServices(): Promise<any[]> {
    const defs = [
      { name: 'General Consultation', durationMinutes: 30, price: 200 },
      { name: 'Follow-up Visit',       durationMinutes: 15, price: 100 },
    ];

    const result: any[] = [];
    for (const def of defs) {
      let svc = await this.serviceModel.findOne({
        name: def.name,
        complexId: { $exists: false },
        clinicId:  { $exists: false },
      });
      if (!svc) {
        svc = await this.serviceModel.create({
          name: def.name,
          durationMinutes: def.durationMinutes,
          price: def.price,
          paymentPlan: 'single_payment',
          isActive: true,
        });
        this.logger.log(`  ✓ Created global service: ${def.name}`);
      }
      result.push(svc);
    }
    return result;
  }

  private async findOrCreateComplexService(
    name: string,
    complexId: any,
    durationMinutes: number,
    price: number,
  ): Promise<any> {
    let svc = await this.serviceModel.findOne({ name, complexId });
    if (!svc) {
      svc = await this.serviceModel.create({
        name,
        complexId,
        durationMinutes,
        price,
        paymentPlan: 'single_payment',
        isActive: true,
      });
      this.logger.log(`  ✓ Created complex service: ${name}`);
    }
    return svc;
  }

  private async linkServiceToClinic(serviceId: any, clinicId: any): Promise<void> {
    const existing = await this.clinicServiceModel.findOne({ serviceId, clinicId });
    if (!existing) {
      await this.clinicServiceModel.create({ serviceId, clinicId, isActive: true });
    }
  }

  private async authorizeDoctorForService(
    doctorId: any,
    serviceId: any,
    clinicId: any,
  ): Promise<void> {
    const existing = await this.doctorServiceModel.findOne({ doctorId, serviceId, clinicId });
    if (!existing) {
      await this.doctorServiceModel.create({ doctorId, serviceId, clinicId, isActive: true });
    }
  }

  // ─── Patients ──────────────────────────────────────────────────────────────

  private async seedPatients(
    clinic: any,
    code: string,
    complexId: any,
    organizationId?: any,
  ): Promise<void> {
    let created = 0;
    for (let i = 0; i < PATIENT_POOL.length; i++) {
      const p = PATIENT_POOL[i];
      const seq = String(i + 1).padStart(3, '0');
      const cardNumber = `TEST-${code.toUpperCase()}-${seq}`;

      const existing = await this.patientModel.findOne({ cardNumber });
      if (existing) continue;

      const codeId = CLINIC_CODE_INDEX[code] ?? 0;

      await this.patientModel.create({
        cardNumber,
        patientNumber: `TPAT${code.toUpperCase()}${seq}`,
        firstName: p.firstName,
        lastName: p.lastName,
        dateOfBirth: new Date(p.dob),
        gender: p.gender,
        status: 'Active',
        phone: buildPhone(4, codeId, i + 1),
        clinicId: clinic._id,
        complexId,
        insuranceStatus: 'None',
        preferredLanguage: 'ar',
        ...(organizationId ? { organizationId } : {}),
      });
      created++;
    }
    this.logger.log(`    ✓ Seeded ${created} patient(s) for ${clinic.name}`);
  }

  // ─── User Access ───────────────────────────────────────────────────────────

  private async grantUserAccess(
    userId: any,
    scopeType: string,
    scopeId: any,
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
        isActive: true,
        grantedBy,
        grantedAt: new Date(),
      });
    }
  }
}

// Lookup used by seedPatients (must be at module scope)
const CLINIC_CODE_INDEX: Record<string, number> = {
  a1: 1,
  a2: 2,
  b1: 3,
  b2: 4,
  c1: 5,
  c2: 6,
};
