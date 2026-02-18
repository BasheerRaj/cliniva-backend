import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Organization,
  Complex,
  Clinic,
  User,
  Subscription,
  SubscriptionPlan,
} from '../schemas';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EntitiesSeederService {
  private readonly logger = new Logger(EntitiesSeederService.name);

  constructor(
    @InjectModel(Organization.name)
    private organizationModel: Model<Organization>,
    @InjectModel(Complex.name)
    private complexModel: Model<Complex>,
    @InjectModel(Clinic.name)
    private clinicModel: Model<Clinic>,
    @InjectModel(User.name)
    private userModel: Model<User>,
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<Subscription>,
    @InjectModel(SubscriptionPlan.name)
    private subscriptionPlanModel: Model<SubscriptionPlan>,
  ) {}

  async seedAll(): Promise<void> {
    this.logger.log('🌱 Starting entities seeding...');

    try {
      // Seed in order: Users -> Subscriptions -> Organizations -> Complexes -> Clinics
      const users = await this.seedUsers();
      await this.seedCompanyPlanEntities(users);
      await this.seedComplexPlanEntities(users);
      await this.seedClinicPlanEntities(users);

      this.logger.log('✅ Entities seeding completed successfully');
    } catch (error) {
      this.logger.error('❌ Entities seeding failed:', error.message);
      throw error;
    }
  }

  private async seedUsers(): Promise<any> {
    this.logger.log('👥 Seeding users...');

    const hashedPassword = await bcrypt.hash('Password123!', 10);

    const users: {
      companyOwner: any;
      complexOwner: any;
      clinicOwner: any;
    } = {
      companyOwner: null,
      complexOwner: null,
      clinicOwner: null,
    };

    // Company Plan Owner
    const companyOwner = await this.userModel.findOne({
      email: 'company.owner@cliniva.com',
    });
    if (!companyOwner) {
      users.companyOwner = await this.userModel.create({
        email: 'company.owner@cliniva.com',
        passwordHash: hashedPassword,
        firstName: 'Ahmed',
        lastName: 'Al-Rashid',
        role: 'owner',
        isActive: true,
        emailVerified: true,
        onboardingComplete: true,
        setupComplete: true,
      });
      this.logger.log('  ✓ Created company owner user');
    } else {
      users.companyOwner = companyOwner;
    }

    // Complex Plan Owner
    const complexOwner = await this.userModel.findOne({
      email: 'complex.owner@cliniva.com',
    });
    if (!complexOwner) {
      users.complexOwner = await this.userModel.create({
        email: 'complex.owner@cliniva.com',
        passwordHash: hashedPassword,
        firstName: 'Fatima',
        lastName: 'Al-Mansour',
        role: 'owner',
        isActive: true,
        emailVerified: true,
        onboardingComplete: true,
        setupComplete: true,
      });
      this.logger.log('  ✓ Created complex owner user');
    } else {
      users.complexOwner = complexOwner;
    }

    // Clinic Plan Owner
    const clinicOwner = await this.userModel.findOne({
      email: 'clinic.owner@cliniva.com',
    });
    if (!clinicOwner) {
      users.clinicOwner = await this.userModel.create({
        email: 'clinic.owner@cliniva.com',
        passwordHash: hashedPassword,
        firstName: 'Mohammed',
        lastName: 'Al-Zahrani',
        role: 'owner',
        isActive: true,
        emailVerified: true,
        onboardingComplete: true,
        setupComplete: true,
      });
      this.logger.log('  ✓ Created clinic owner user');
    } else {
      users.clinicOwner = clinicOwner;
    }

    return users;
  }

  private async seedCompanyPlanEntities(users: any): Promise<void> {
    this.logger.log('🏢 Seeding Company Plan entities...');

    // Get company plan
    const companyPlan = await this.subscriptionPlanModel.findOne({
      name: 'company',
    });
    if (!companyPlan) {
      this.logger.warn('  ⚠️ Company plan not found, skipping...');
      return;
    }

    // Create subscription
    let subscription = await this.subscriptionModel.findOne({
      userId: users.companyOwner._id,
      planId: companyPlan._id,
    });

    if (!subscription) {
      subscription = await this.subscriptionModel.create({
        userId: users.companyOwner._id,
        planId: companyPlan._id,
        status: 'active',
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      });
      this.logger.log('  ✓ Created company subscription');
    }

    // Create Organization
    let organization = await this.organizationModel.findOne({
      name: 'HealthCare Solutions Group',
    });

    if (!organization) {
      organization = await this.organizationModel.create({
        subscriptionId: subscription._id,
        ownerId: users.companyOwner._id,
        name: 'HealthCare Solutions Group',
        legalName: 'HealthCare Solutions Group LLC',
        logoUrl: '/assets/logos/healthcare-solutions.png',
        website: 'https://healthcaresolutions.com',
        yearEstablished: 2010,
        mission:
          'To provide comprehensive healthcare services with excellence and compassion',
        vision: 'To be the leading healthcare provider in the region by 2030',
        overview:
          'A multi-facility healthcare organization serving over 100,000 patients annually',
        goals:
          'Expand to 10 complexes and 100 clinics by 2025, maintain 95% patient satisfaction',
        ceoName: 'Dr. Abdullah Al-Saud',
        phoneNumbers: [
          { number: '+966-11-234-5678', type: 'primary', label: 'Main Office' },
          { number: '+966-11-234-5679', type: 'secondary', label: 'Support' },
          { number: '+966-50-123-4567', type: 'mobile', label: 'CEO Mobile' },
        ],
        email: 'info@healthcaresolutions.com',
        address: {
          street: 'King Fahd Road, Tower A, Floor 15',
          city: 'Riyadh',
          state: 'Riyadh Province',
          postalCode: '11564',
          country: 'Saudi Arabia',
          googleLocation: 'https://maps.google.com/?q=24.7136,46.6753',
        },
        emergencyContact: {
          name: 'Emergency Operations Center',
          phone: '+966-11-234-9999',
          email: 'emergency@healthcaresolutions.com',
          relationship: 'Operations',
        },
        socialMediaLinks: {
          facebook: 'https://facebook.com/healthcaresolutions',
          instagram: 'https://instagram.com/healthcaresolutions',
          twitter: 'https://twitter.com/healthcaresol',
          linkedin: 'https://linkedin.com/company/healthcare-solutions',
          whatsapp: '+966501234567',
          youtube: 'https://youtube.com/@healthcaresolutions',
          website: 'https://healthcaresolutions.com',
        },
        vatNumber: 'SA-123456789',
        crNumber: 'CR-1234567890',
        termsConditionsUrl: 'https://healthcaresolutions.com/terms',
        privacyPolicyUrl: 'https://healthcaresolutions.com/privacy',
      });
      this.logger.log('  ✓ Created organization: HealthCare Solutions Group');
    }

    // Create Complexes under Organization
    const complexData = [
      {
        name: 'Central Medical Complex',
        managerName: 'Dr. Sarah Al-Qahtani',
        city: 'Riyadh',
        street: 'Olaya Street, Building 45',
      },
      {
        name: 'North Medical Complex',
        managerName: 'Dr. Khalid Al-Otaibi',
        city: 'Riyadh',
        street: 'King Abdullah Road, Complex B',
      },
    ];

    for (const complexInfo of complexData) {
      let complex = await this.complexModel.findOne({
        organizationId: organization._id,
        name: complexInfo.name,
      });

      if (!complex) {
        complex = await this.complexModel.create({
          organizationId: organization._id,
          subscriptionId: subscription._id,
          ownerId: users.companyOwner._id,
          name: complexInfo.name,
          managerName: complexInfo.managerName,
          logoUrl: `/assets/logos/${complexInfo.name.toLowerCase().replace(/\s+/g, '-')}.png`,
          website: `https://${complexInfo.name.toLowerCase().replace(/\s+/g, '')}.healthcaresolutions.com`,
          yearEstablished: 2015,
          mission: 'Delivering quality healthcare to our community',
          vision: 'Excellence in patient care and medical innovation',
          overview: `A state-of-the-art medical facility in ${complexInfo.city}`,
          phoneNumbers: [
            {
              number: `+966-11-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`,
              type: 'primary',
              label: 'Reception',
            },
          ],
          email: `${complexInfo.name.toLowerCase().replace(/\s+/g, '.')}@healthcaresolutions.com`,
          address: {
            street: complexInfo.street,
            city: complexInfo.city,
            state: 'Riyadh Province',
            postalCode: '11564',
            country: 'Saudi Arabia',
          },
          status: 'active',
        });
        this.logger.log(`  ✓ Created complex: ${complexInfo.name}`);

        // Create Clinics under Complex
        const clinicNames = [
          'Cardiology Clinic',
          'Pediatrics Clinic',
          'Orthopedics Clinic',
        ];

        for (const clinicName of clinicNames) {
          const clinic = await this.clinicModel.findOne({
            complexId: complex._id,
            name: clinicName,
          });

          if (!clinic) {
            await this.clinicModel.create({
              complexId: complex._id,
              organizationId: organization._id,
              subscriptionId: subscription._id,
              ownerId: users.companyOwner._id,
              name: clinicName,
              headDoctorName: `Dr. ${['Ali', 'Nora', 'Omar'][Math.floor(Math.random() * 3)]} ${['Al-Harbi', 'Al-Mutairi', 'Al-Dosari'][Math.floor(Math.random() * 3)]}`,
              specialization: clinicName.replace(' Clinic', ''),
              licenseNumber: `LIC-${Math.floor(Math.random() * 900000 + 100000)}`,
              pin: `${Math.floor(Math.random() * 9000 + 1000)}`,
              phoneNumbers: [
                {
                  number: `+966-11-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`,
                  type: 'primary',
                },
              ],
              email: `${clinicName.toLowerCase().replace(/\s+/g, '.')}@${complexInfo.name.toLowerCase().replace(/\s+/g, '')}.com`,
              address: {
                street: `${complexInfo.street}, ${clinicName}`,
                city: complexInfo.city,
                state: 'Riyadh Province',
                postalCode: '11564',
                country: 'Saudi Arabia',
              },
              maxStaff: 50,
              maxDoctors: 10,
              maxPatients: 1000,
              sessionDuration: 30,
              isActive: true,
              status: 'active',
            });
            this.logger.log(`    ✓ Created clinic: ${clinicName}`);
          }
        }
      }
    }
  }

  private async seedComplexPlanEntities(users: any): Promise<void> {
    this.logger.log('🏥 Seeding Complex Plan entities...');

    // Get complex plan
    const complexPlan = await this.subscriptionPlanModel.findOne({
      name: 'complex',
    });
    if (!complexPlan) {
      this.logger.warn('  ⚠️ Complex plan not found, skipping...');
      return;
    }

    // Create subscription
    let subscription = await this.subscriptionModel.findOne({
      userId: users.complexOwner._id,
      planId: complexPlan._id,
    });

    if (!subscription) {
      subscription = await this.subscriptionModel.create({
        userId: users.complexOwner._id,
        planId: complexPlan._id,
        status: 'active',
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });
      this.logger.log('  ✓ Created complex subscription');
    }

    // Create standalone Complex (no organization)
    let complex = await this.complexModel.findOne({
      name: 'Al-Noor Medical Complex',
    });

    if (!complex) {
      complex = await this.complexModel.create({
        subscriptionId: subscription._id,
        ownerId: users.complexOwner._id,
        name: 'Al-Noor Medical Complex',
        managerName: 'Dr. Fatima Al-Mansour',
        logoUrl: '/assets/logos/al-noor-complex.png',
        website: 'https://alnoormedical.com',
        yearEstablished: 2018,
        mission: 'Comprehensive healthcare under one roof',
        vision: 'Leading multi-specialty medical center in Jeddah',
        overview:
          'A modern medical complex with 8 departments and 15 specialized clinics',
        goals: 'Serve 50,000 patients annually with 98% satisfaction rate',
        ceoName: 'Dr. Fatima Al-Mansour',
        phoneNumbers: [
          { number: '+966-12-654-3210', type: 'primary', label: 'Main Desk' },
          { number: '+966-12-654-3211', type: 'emergency', label: 'Emergency' },
        ],
        email: 'info@alnoormedical.com',
        address: {
          street: 'Palestine Street, Medical District',
          city: 'Jeddah',
          state: 'Makkah Province',
          postalCode: '23442',
          country: 'Saudi Arabia',
          googleLocation: 'https://maps.google.com/?q=21.5433,39.1728',
        },
        emergencyContact: {
          name: 'Emergency Department',
          phone: '+966-12-654-9999',
          email: 'emergency@alnoormedical.com',
          relationship: 'Emergency Services',
        },
        socialMediaLinks: {
          facebook: 'https://facebook.com/alnoormedical',
          instagram: 'https://instagram.com/alnoormedical',
          twitter: 'https://twitter.com/alnoormedical',
          whatsapp: '+966501234568',
        },
        vatNumber: 'SA-987654321',
        crNumber: 'CR-9876543210',
        status: 'active',
      });
      this.logger.log('  ✓ Created complex: Al-Noor Medical Complex');

      // Create Clinics under Complex
      const clinics = [
        {
          name: 'General Medicine Clinic',
          specialization: 'General Medicine',
          doctor: 'Dr. Hassan Al-Ghamdi',
        },
        {
          name: 'Dermatology Clinic',
          specialization: 'Dermatology',
          doctor: 'Dr. Layla Al-Shehri',
        },
        {
          name: 'ENT Clinic',
          specialization: 'Otolaryngology',
          doctor: 'Dr. Yousef Al-Malki',
        },
        {
          name: 'Ophthalmology Clinic',
          specialization: 'Ophthalmology',
          doctor: 'Dr. Maha Al-Zahrani',
        },
        {
          name: 'Dental Clinic',
          specialization: 'Dentistry',
          doctor: 'Dr. Tariq Al-Juhani',
        },
      ];

      for (const clinicInfo of clinics) {
        const clinic = await this.clinicModel.findOne({
          complexId: complex._id,
          name: clinicInfo.name,
        });

        if (!clinic) {
          await this.clinicModel.create({
            complexId: complex._id,
            subscriptionId: subscription._id,
            ownerId: users.complexOwner._id,
            name: clinicInfo.name,
            headDoctorName: clinicInfo.doctor,
            specialization: clinicInfo.specialization,
            licenseNumber: `LIC-${Math.floor(Math.random() * 900000 + 100000)}`,
            pin: `${Math.floor(Math.random() * 9000 + 1000)}`,
            phoneNumbers: [
              {
                number: `+966-12-654-${Math.floor(Math.random() * 9000 + 1000)}`,
                type: 'primary',
              },
            ],
            email: `${clinicInfo.name.toLowerCase().replace(/\s+/g, '.')}@alnoormedical.com`,
            address: {
              street: `Palestine Street, Medical District, ${clinicInfo.name}`,
              city: 'Jeddah',
              state: 'Makkah Province',
              postalCode: '23442',
              country: 'Saudi Arabia',
            },
            maxStaff: 30,
            maxDoctors: 5,
            maxPatients: 500,
            sessionDuration: 20,
            isActive: true,
            status: 'active',
          });
          this.logger.log(`    ✓ Created clinic: ${clinicInfo.name}`);
        }
      }
    }
  }

  private async seedClinicPlanEntities(users: any): Promise<void> {
    this.logger.log('🏥 Seeding Clinic Plan entities...');

    // Get clinic plan
    const clinicPlan = await this.subscriptionPlanModel.findOne({
      name: 'clinic',
    });
    if (!clinicPlan) {
      this.logger.warn('  ⚠️ Clinic plan not found, skipping...');
      return;
    }

    // Create subscription
    let subscription = await this.subscriptionModel.findOne({
      userId: users.clinicOwner._id,
      planId: clinicPlan._id,
    });

    if (!subscription) {
      subscription = await this.subscriptionModel.create({
        userId: users.clinicOwner._id,
        planId: clinicPlan._id,
        status: 'active',
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });
      this.logger.log('  ✓ Created clinic subscription');
    }

    // Create standalone Clinic (no complex, no organization)
    const clinic = await this.clinicModel.findOne({
      name: 'Family Care Clinic',
    });

    if (!clinic) {
      await this.clinicModel.create({
        subscriptionId: subscription._id,
        ownerId: users.clinicOwner._id,
        name: 'Family Care Clinic',
        headDoctorName: 'Dr. Mohammed Al-Zahrani',
        specialization: 'Family Medicine',
        licenseNumber: 'LIC-456789',
        pin: '7890',
        logoUrl: '/assets/logos/family-care-clinic.png',
        website: 'https://familycareclinic.com',
        yearEstablished: 2020,
        mission: 'Quality family healthcare for all ages',
        vision: 'Your trusted neighborhood healthcare provider',
        overview:
          'A friendly family clinic serving the local community with comprehensive primary care services',
        goals: 'Provide accessible, affordable healthcare to 5,000 families',
        ceoName: 'Dr. Mohammed Al-Zahrani',
        phoneNumbers: [
          { number: '+966-13-789-4560', type: 'primary', label: 'Reception' },
          {
            number: '+966-50-987-6543',
            type: 'mobile',
            label: 'Doctor Mobile',
          },
        ],
        email: 'info@familycareclinic.com',
        address: {
          street: 'Al-Khobar Street, Building 12',
          city: 'Dammam',
          state: 'Eastern Province',
          postalCode: '32241',
          country: 'Saudi Arabia',
          googleLocation: 'https://maps.google.com/?q=26.4207,50.0888',
        },
        emergencyContact: {
          name: 'Dr. Mohammed Al-Zahrani',
          phone: '+966-50-987-6543',
          email: 'dr.zahrani@familycareclinic.com',
          relationship: 'Head Doctor',
        },
        socialMediaLinks: {
          facebook: 'https://facebook.com/familycareclinic',
          instagram: 'https://instagram.com/familycareclinic',
          whatsapp: '+966509876543',
        },
        vatNumber: 'SA-456789123',
        crNumber: 'CR-4567891230',
        maxStaff: 20,
        maxDoctors: 3,
        maxPatients: 300,
        sessionDuration: 15,
        isActive: true,
        status: 'active',
      });
      this.logger.log('  ✓ Created clinic: Family Care Clinic');
    }
  }

  async clearEntities(): Promise<void> {
    this.logger.warn('🗑️ Clearing entities...');

    try {
      await this.clinicModel.deleteMany({});
      await this.complexModel.deleteMany({});
      await this.organizationModel.deleteMany({});
      await this.subscriptionModel.deleteMany({});
      // Don't delete users as they might be needed for other operations

      this.logger.log('✅ Entities cleared successfully');
    } catch (error) {
      this.logger.error('❌ Entities clearing failed:', error.message);
      throw error;
    }
  }
}
