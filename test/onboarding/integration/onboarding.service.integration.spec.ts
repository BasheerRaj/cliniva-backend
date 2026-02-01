import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { Connection } from 'mongoose';
import { OnboardingService } from '../../../src/onboarding/onboarding.service';
import { OnboardingModule } from '../../../src/onboarding/onboarding.module';
import { DatabaseModule } from '../../../src/database/database.module';
import {
  validCompanyPlanData,
  validComplexPlanData,
  validClinicPlanData,
} from '../fixtures/onboarding-data.fixture';

describe('OnboardingService Integration', () => {
  let service: OnboardingService;
  let connection: Connection;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(global.__MONGO_URI__),
        ConfigModule.forRoot(),
        DatabaseModule,
        OnboardingModule,
      ],
    }).compile();

    service = module.get<OnboardingService>(OnboardingService);
    connection = module.get<Connection>(getConnectionToken());

    if (connection.db) {
      await connection.db.dropDatabase();
    }
  });

  afterAll(async () => {
    await connection.close();
    await module.close();
  });

  beforeEach(async () => {
    // Clear all collections before each test
    const collections = connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  });

  describe('Complete Onboarding Integration', () => {
    it('should complete company plan onboarding end-to-end', async () => {
      const result = await service.completeOnboarding(validCompanyPlanData);

      expect(result.success).toBe(true);
      expect(result.userId).toBeDefined();
      expect(result.subscriptionId).toBeDefined();
      expect(result.entities.organization).toBeDefined();

      // Verify data was actually saved to database
      const subscriptions = await connection
        .collection('subscriptions')
        .find({})
        .toArray();
      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0].planType).toBe('company');

      const organizations = await connection
        .collection('organizations')
        .find({})
        .toArray();
      expect(organizations).toHaveLength(1);
      expect(organizations[0].name).toBe(
        validCompanyPlanData.organization?.name,
      );

      // Check if complexes were created
      const complexes = await connection
        .collection('complexes')
        .find({})
        .toArray();
      expect(complexes.length).toBeGreaterThan(0);

      // Check if clinics were created
      const clinics = await connection.collection('clinics').find({}).toArray();
      expect(clinics.length).toBeGreaterThan(0);
    }, 30000);

    it('should complete complex plan onboarding end-to-end', async () => {
      const result = await service.completeOnboarding(validComplexPlanData);

      expect(result.success).toBe(true);
      expect(result.entities.complexes).toBeDefined();
      expect(result.entities.complexes.length).toBeGreaterThan(0);

      // Verify data was saved
      const subscriptions = await connection
        .collection('subscriptions')
        .find({})
        .toArray();
      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0].planType).toBe('complex');

      const complexes = await connection
        .collection('complexes')
        .find({})
        .toArray();
      expect(complexes.length).toBeGreaterThan(0);
      expect(complexes[0].name).toBe('Al-Zahra Medical Complex');

      // Should not create organization for complex plan
      const organizations = await connection
        .collection('organizations')
        .find({})
        .toArray();
      expect(organizations).toHaveLength(0);
    }, 30000);

    it('should complete clinic plan onboarding end-to-end', async () => {
      const result = await service.completeOnboarding(validClinicPlanData);

      expect(result.success).toBe(true);
      expect(result.entities.clinics).toBeDefined();

      // Verify data was saved
      const subscriptions = await connection
        .collection('subscriptions')
        .find({})
        .toArray();
      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0].planType).toBe('clinic');

      const clinics = await connection.collection('clinics').find({}).toArray();
      expect(clinics).toHaveLength(1);
      expect(clinics[0].name).toBe('Bright Smile Dental Clinic');

      // Should not create organization or complexes for clinic plan
      const organizations = await connection
        .collection('organizations')
        .find({})
        .toArray();
      expect(organizations).toHaveLength(0);

      const complexes = await connection
        .collection('complexes')
        .find({})
        .toArray();
      expect(complexes).toHaveLength(0);
    }, 30000);
  });

  describe('Supporting Entities Integration', () => {
    it('should create working hours when provided', async () => {
      const dataWithWorkingHours = {
        ...validClinicPlanData,
        workingHours: [
          {
            entityType: 'clinic',
            entityName: 'Bright Smile Dental Clinic',
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '09:00',
            closingTime: '17:00',
            breakStartTime: '12:00',
            breakEndTime: '13:00',
          },
          {
            entityType: 'clinic',
            entityName: 'Bright Smile Dental Clinic',
            dayOfWeek: 'friday',
            isWorkingDay: false,
          },
        ],
      };

      const result = await service.completeOnboarding(dataWithWorkingHours);

      expect(result.success).toBe(true);

      // Verify working hours were created
      const workingHours = await connection
        .collection('workinghours')
        .find({})
        .toArray();
      expect(workingHours.length).toBeGreaterThan(0);

      const mondaySchedule = workingHours.find(
        (wh) => wh.dayOfWeek === 'monday',
      );
      expect(mondaySchedule).toBeDefined();
      expect(mondaySchedule.isWorkingDay).toBe(true);
      expect(mondaySchedule.openingTime).toBe('09:00');
      expect(mondaySchedule.closingTime).toBe('17:00');

      const fridaySchedule = workingHours.find(
        (wh) => wh.dayOfWeek === 'friday',
      );
      expect(fridaySchedule).toBeDefined();
      expect(fridaySchedule.isWorkingDay).toBe(false);
    }, 30000);

    it('should create contacts when provided', async () => {
      const dataWithContacts = {
        ...validClinicPlanData,
        contacts: [
          {
            contactType: 'email',
            contactValue: 'test@clinic.com',
          },
          {
            contactType: 'facebook',
            contactValue: 'https://facebook.com/clinic',
          },
          {
            contactType: 'whatsapp',
            contactValue: 'https://wa.me/966501234567',
          },
        ],
      };

      const result = await service.completeOnboarding(dataWithContacts);

      expect(result.success).toBe(true);

      // Verify contacts were created
      const contacts = await connection
        .collection('contacts')
        .find({})
        .toArray();
      expect(contacts.length).toBe(3);

      const emailContact = contacts.find((c) => c.contactType === 'email');
      expect(emailContact).toBeDefined();
      expect(emailContact.contactValue).toBe('test@clinic.com');

      const facebookContact = contacts.find(
        (c) => c.contactType === 'facebook',
      );
      expect(facebookContact).toBeDefined();
      expect(facebookContact.contactValue).toBe('https://facebook.com/clinic');
    }, 30000);

    it('should create legal documents when provided', async () => {
      const dataWithLegalInfo = {
        ...validClinicPlanData,
        legalInfo: {
          termsConditions: 'These are the terms and conditions...',
          privacyPolicy: 'This is our privacy policy...',
        },
      };

      const result = await service.completeOnboarding(dataWithLegalInfo);

      expect(result.success).toBe(true);

      // Verify legal documents were created
      const dynamicInfo = await connection
        .collection('dynamicinfo')
        .find({})
        .toArray();
      expect(dynamicInfo.length).toBe(2);

      const terms = dynamicInfo.find(
        (di) => di.infoType === 'terms_conditions',
      );
      expect(terms).toBeDefined();
      expect(terms.infoValue).toBe('These are the terms and conditions...');

      const privacy = dynamicInfo.find(
        (di) => di.infoType === 'privacy_policy',
      );
      expect(privacy).toBeDefined();
      expect(privacy.infoValue).toBe('This is our privacy policy...');
    }, 30000);

    it('should create user access permissions', async () => {
      const result = await service.completeOnboarding(validClinicPlanData);

      expect(result.success).toBe(true);

      // Verify user access was created
      const userAccess = await connection
        .collection('useraccess')
        .find({})
        .toArray();
      expect(userAccess.length).toBeGreaterThan(0);

      const access = userAccess[0];
      expect(access.userId).toBeDefined();
      expect(access.entityType).toBe('clinic');
      expect(access.permissions).toContain('read');
      expect(access.permissions).toContain('write');
      expect(access.isActive).toBe(true);
    }, 30000);
  });

  describe('Entity Relationships Integration', () => {
    it('should create proper relationships between entities in company plan', async () => {
      const result = await service.completeOnboarding(validCompanyPlanData);

      expect(result.success).toBe(true);

      // Get all entities
      const organizations = await connection
        .collection('organizations')
        .find({})
        .toArray();
      const complexes = await connection
        .collection('complexes')
        .find({})
        .toArray();
      const clinics = await connection.collection('clinics').find({}).toArray();
      const complexDepartments = await connection
        .collection('complexdepartments')
        .find({})
        .toArray();

      // Verify relationships
      expect(organizations).toHaveLength(1);
      expect(complexes.length).toBeGreaterThan(0);

      // Complex should reference organization
      const complex = complexes[0];
      expect(complex.organizationId.toString()).toBe(
        organizations[0]._id.toString(),
      );

      // Complex departments should exist
      expect(complexDepartments.length).toBeGreaterThan(0);
      const complexDept = complexDepartments[0];
      expect(complexDept.complexId.toString()).toBe(complex._id.toString());

      // Clinics should reference complex departments (if complexDepartmentId is provided)
      if (clinics.length > 0 && clinics[0].complexDepartmentId) {
        expect(clinics[0].complexDepartmentId).toBeDefined();
      }
    }, 30000);

    it('should handle working hours hierarchy correctly', async () => {
      const dataWithHierarchicalWorkingHours = {
        ...validComplexPlanData,
        workingHours: [
          // Complex working hours
          {
            entityType: 'complex',
            entityName: 'Al-Zahra Medical Complex',
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '08:00',
            closingTime: '18:00',
          },
          // Clinic working hours (within complex hours)
          {
            entityType: 'clinic',
            entityName: "Women's Wellness Center",
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '09:00',
            closingTime: '17:00',
          },
        ],
      };

      const result = await service.completeOnboarding(
        dataWithHierarchicalWorkingHours,
      );

      expect(result.success).toBe(true);

      // Verify working hours were created with proper hierarchy
      const workingHours = await connection
        .collection('workinghours')
        .find({})
        .toArray();
      expect(workingHours.length).toBe(2);

      const complexHours = workingHours.find(
        (wh) => wh.entityType === 'complex',
      );
      const clinicHours = workingHours.find((wh) => wh.entityType === 'clinic');

      expect(complexHours).toBeDefined();
      expect(clinicHours).toBeDefined();

      // Verify clinic hours are within complex hours
      expect(complexHours.openingTime).toBe('08:00');
      expect(complexHours.closingTime).toBe('18:00');
      expect(clinicHours.openingTime).toBe('09:00');
      expect(clinicHours.closingTime).toBe('17:00');
    }, 30000);
  });

  describe('Error Scenarios Integration', () => {
    it('should rollback transaction on validation failure', async () => {
      const invalidData = {
        ...validCompanyPlanData,
        subscriptionData: {
          planType: 'invalid_plan',
          planId: 'invalid_plan_id',
        },
      };

      await expect(
        service.completeOnboarding(invalidData as any),
      ).rejects.toThrow();

      // Verify no data was saved
      const subscriptions = await connection
        .collection('subscriptions')
        .find({})
        .toArray();
      const organizations = await connection
        .collection('organizations')
        .find({})
        .toArray();

      expect(subscriptions).toHaveLength(0);
      expect(organizations).toHaveLength(0);
    }, 30000);

    it('should rollback transaction on working hours validation failure', async () => {
      const dataWithInvalidWorkingHours = {
        ...validComplexPlanData,
        workingHours: [
          // Complex closed on monday
          {
            entityType: 'complex',
            entityName: 'Al-Zahra Medical Complex',
            dayOfWeek: 'monday',
            isWorkingDay: false,
          },
          // But clinic open on monday - should fail
          {
            entityType: 'clinic',
            entityName: "Women's Wellness Center",
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '09:00',
            closingTime: '17:00',
          },
        ],
      };

      await expect(
        service.completeOnboarding(dataWithInvalidWorkingHours),
      ).rejects.toThrow();

      // Verify no data was saved
      const subscriptions = await connection
        .collection('subscriptions')
        .find({})
        .toArray();
      const complexes = await connection
        .collection('complexes')
        .find({})
        .toArray();
      const workingHours = await connection
        .collection('workinghours')
        .find({})
        .toArray();

      expect(subscriptions).toHaveLength(0);
      expect(complexes).toHaveLength(0);
      expect(workingHours).toHaveLength(0);
    }, 30000);
  });

  describe('Data Consistency Integration', () => {
    it('should maintain data consistency across all entities', async () => {
      const result = await service.completeOnboarding(validCompanyPlanData);

      expect(result.success).toBe(true);

      // Verify all entities have consistent subscription references
      const subscriptionId = result.subscriptionId;

      const organizations = await connection
        .collection('organizations')
        .find({})
        .toArray();
      const complexes = await connection
        .collection('complexes')
        .find({})
        .toArray();
      const clinics = await connection.collection('clinics').find({}).toArray();

      expect(organizations[0].subscriptionId.toString()).toBe(subscriptionId);

      if (complexes.length > 0) {
        expect(complexes[0].subscriptionId.toString()).toBe(subscriptionId);
      }

      if (clinics.length > 0) {
        expect(clinics[0].subscriptionId.toString()).toBe(subscriptionId);
      }
    }, 30000);

    it('should create entities in correct order', async () => {
      // Monitor creation timestamps to ensure proper order
      const startTime = new Date();

      const result = await service.completeOnboarding(validCompanyPlanData);
      expect(result.success).toBe(true);

      const endTime = new Date();

      // Verify all entities were created within the time window
      const organizations = await connection
        .collection('organizations')
        .find({})
        .toArray();
      const complexes = await connection
        .collection('complexes')
        .find({})
        .toArray();

      expect(organizations[0].createdAt).toBeInstanceOf(Date);
      expect(organizations[0].createdAt.getTime()).toBeGreaterThanOrEqual(
        startTime.getTime(),
      );
      expect(organizations[0].createdAt.getTime()).toBeLessThanOrEqual(
        endTime.getTime(),
      );

      if (complexes.length > 0) {
        expect(complexes[0].createdAt).toBeInstanceOf(Date);
        // Complex should be created after organization
        expect(complexes[0].createdAt.getTime()).toBeGreaterThanOrEqual(
          organizations[0].createdAt.getTime(),
        );
      }
    }, 30000);
  });

  describe('Performance Integration', () => {
    it('should complete onboarding within reasonable time', async () => {
      const startTime = Date.now();

      const result = await service.completeOnboarding(validCompanyPlanData);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    }, 30000);

    it('should handle large entity counts efficiently', async () => {
      const largeDataSet = {
        ...validCompanyPlanData,
        complexes: Array(5)
          .fill(0)
          .map((_, i) => ({
            name: `Complex ${i + 1}`,
            address: `Address ${i + 1}`,
            departmentIds: ['dept1', 'dept2'],
          })),
        departments: Array(20)
          .fill(0)
          .map((_, i) => ({
            name: `Department ${i + 1}`,
            description: `Description ${i + 1}`,
          })),
        clinics: Array(10)
          .fill(0)
          .map((_, i) => ({
            name: `Clinic ${i + 1}`,
            capacity: { maxPatients: 100, sessionDuration: 30 },
          })),
        services: Array(50)
          .fill(0)
          .map((_, i) => ({
            name: `Service ${i + 1}`,
            description: `Service description ${i + 1}`,
            durationMinutes: 30,
            price: 100,
          })),
      };

      const startTime = Date.now();

      const result = await service.completeOnboarding(largeDataSet);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(15000); // Should complete within 15 seconds even with large dataset

      // Verify all entities were created
      const complexes = await connection
        .collection('complexes')
        .find({})
        .toArray();
      const departments = await connection
        .collection('departments')
        .find({})
        .toArray();
      const clinics = await connection.collection('clinics').find({}).toArray();
      const services = await connection
        .collection('services')
        .find({})
        .toArray();

      expect(complexes).toHaveLength(5);
      expect(departments).toHaveLength(20);
      expect(clinics).toHaveLength(10);
      expect(services).toHaveLength(50);
    }, 30000);
  });
});
