import { DataTransformerUtil } from '../../../src/common/utils/data-transformer.util';
import { Types } from 'mongoose';

describe('DataTransformerUtil', () => {
  describe('transformOnboardingDataToEntities', () => {
    it('should transform company plan data correctly', () => {
      const onboardingData = {
        user: { name: 'John Doe' },
        subscription: { planType: 'company' },
        organization: { name: 'Test Corp' },
        complexes: [{ name: 'Complex 1', departmentIds: ['dept1', 'dept2'] }],
        departments: [{ name: 'Dept 1' }, { name: 'Dept 2' }],
        clinics: [
          { name: 'Clinic 1', complexDepartmentId: '507f1f77bcf86cd799439026' },
        ],
        services: [{ name: 'Service 1' }],
        workingHours: [{ dayOfWeek: 'monday' }],
        contacts: [{ type: 'email' }],
        dynamicInfo: [{ type: 'terms' }],
      };

      const entities =
        DataTransformerUtil.transformOnboardingDataToEntities(onboardingData);

      // Check order and types
      expect(entities[0].type).toBe('subscription');
      expect(entities[0].order).toBe(1);
      expect(entities[1].type).toBe('organization');
      expect(entities[1].order).toBe(2);

      // Subscription should have no dependencies
      expect(entities[0].dependencies).toEqual([]);

      // Organization should depend on subscription
      expect(entities[1].dependencies).toEqual(['subscription']);

      // Complex should depend on subscription and organization
      const complexEntity = entities.find((e) => e.type === 'complex');
      expect(complexEntity?.dependencies).toEqual([
        'subscription',
        'organization',
      ]);

      // Check that entities are sorted by order
      for (let i = 1; i < entities.length; i++) {
        expect(entities[i].order).toBeGreaterThanOrEqual(entities[i - 1].order);
      }
    });

    it('should transform complex plan data correctly', () => {
      const onboardingData = {
        user: { name: 'Test User' },
        subscription: { planType: 'complex' },
        complexes: [{ name: 'Complex 1' }],
        departments: [{ name: 'Dept 1' }],
      };

      const entities =
        DataTransformerUtil.transformOnboardingDataToEntities(onboardingData);

      expect(entities[0].type).toBe('subscription');

      const complexEntity = entities.find((e) => e.type === 'complex');
      expect(complexEntity?.dependencies).toEqual(['subscription']); // No organization dependency
    });

    it('should transform clinic plan data correctly', () => {
      const onboardingData = {
        user: { name: 'Test User' },
        subscription: { planType: 'clinic' },
        clinics: [{ name: 'Clinic 1' }],
      };

      const entities =
        DataTransformerUtil.transformOnboardingDataToEntities(onboardingData);

      expect(entities[0].type).toBe('subscription');

      const clinicEntity = entities.find((e) => e.type === 'clinic');
      expect(clinicEntity?.dependencies).toEqual(['subscription']);
    });

    it('should handle complexDepartment relationships', () => {
      const onboardingData = {
        user: { name: 'Test User' },
        subscription: { planType: 'company' },
        organization: { name: 'Test Corp' },
        complexes: [
          {
            id: '507f1f77bcf86cd799439011',
            name: 'Complex 1',
            departmentIds: [
              '507f1f77bcf86cd799439012',
              '507f1f77bcf86cd799439013',
            ],
          },
        ],
        departments: [{ name: 'Dept 1' }, { name: 'Dept 2' }],
      };

      const entities =
        DataTransformerUtil.transformOnboardingDataToEntities(onboardingData);

      const complexDeptEntities = entities.filter(
        (e) => e.type === 'complexDepartment',
      );
      expect(complexDeptEntities).toHaveLength(2);

      expect(complexDeptEntities[0].data).toEqual({
        complexId: '507f1f77bcf86cd799439011',
        departmentId: '507f1f77bcf86cd799439012',
      });
      expect(complexDeptEntities[0].dependencies).toEqual([
        'complex',
        'department',
      ]);

      expect(complexDeptEntities[1].data).toEqual({
        complexId: '507f1f77bcf86cd799439011',
        departmentId: '507f1f77bcf86cd799439013',
      });
    });

    it('should handle clinic with complexDepartmentId dependency', () => {
      const onboardingData = {
        user: { name: 'Test User' },
        subscription: { planType: 'complex' },
        clinics: [
          { name: 'Clinic 1', complexDepartmentId: '507f1f77bcf86cd799439014' },
        ],
      };

      const entities =
        DataTransformerUtil.transformOnboardingDataToEntities(onboardingData);

      const clinicEntity = entities.find((e) => e.type === 'clinic');
      expect(clinicEntity?.dependencies).toEqual(['complexDepartment']);
    });

    it('should handle clinic without complexDepartmentId dependency', () => {
      const onboardingData = {
        user: { name: 'Test User' },
        subscription: { planType: 'clinic' },
        clinics: [{ name: 'Clinic 1' }],
      };

      const entities =
        DataTransformerUtil.transformOnboardingDataToEntities(onboardingData);

      const clinicEntity = entities.find((e) => e.type === 'clinic');
      expect(clinicEntity?.dependencies).toEqual(['subscription']);
    });

    it('should handle supporting entities', () => {
      const onboardingData = {
        user: { name: 'Test User' },
        subscription: { planType: 'clinic' },
        workingHours: [{ dayOfWeek: 'monday' }],
        contacts: [{ type: 'email' }],
        dynamicInfo: [{ type: 'terms' }],
      };

      const entities =
        DataTransformerUtil.transformOnboardingDataToEntities(onboardingData);

      const workingHoursEntity = entities.find(
        (e) => e.type === 'workingHours',
      );
      expect(workingHoursEntity?.dependencies).toEqual(['entity']);

      const contactEntity = entities.find((e) => e.type === 'contact');
      expect(contactEntity?.dependencies).toEqual(['entity']);

      const dynamicInfoEntity = entities.find((e) => e.type === 'dynamicInfo');
      expect(dynamicInfoEntity?.dependencies).toEqual(['entity']);
    });

    it('should handle missing optional data', () => {
      const onboardingData = {
        user: { name: 'Test User' },
        subscription: { planType: 'clinic' },
      };

      const entities =
        DataTransformerUtil.transformOnboardingDataToEntities(onboardingData);

      expect(entities).toHaveLength(1);
      expect(entities[0].type).toBe('subscription');
    });
  });

  describe('normalizeContactData', () => {
    it('should normalize contact data correctly', () => {
      const contacts = [
        {
          contactType: 'Email',
          contactValue: 'TEST@EXAMPLE.COM',
          isActive: true,
        },
        {
          contactType: 'phone',
          contactValue: '+966 50 123 4567',
          isActive: false,
        },
        {
          contactType: 'facebook',
          contactValue: 'HTTPS://FACEBOOK.COM/TestPage',
        },
      ];

      const normalized = DataTransformerUtil.normalizeContactData(
        contacts,
        'organization',
        '507f1f77bcf86cd799439015',
      );

      expect(normalized).toHaveLength(3);

      expect(normalized[0]).toEqual({
        entityType: 'organization',
        entityId: new Types.ObjectId('507f1f77bcf86cd799439015'),
        contactType: 'email',
        contactValue: 'test@example.com',
        isActive: true,
      });

      expect(normalized[1]).toEqual({
        entityType: 'organization',
        entityId: new Types.ObjectId('507f1f77bcf86cd799439015'),
        contactType: 'phone',
        contactValue: '+966501234567',
        isActive: false,
      });

      expect(normalized[2]).toEqual({
        entityType: 'organization',
        entityId: new Types.ObjectId('507f1f77bcf86cd799439015'),
        contactType: 'facebook',
        contactValue: 'https://facebook.com/testpage',
        isActive: true, // Default value
      });
    });

    it('should use contact entityType and entityId if provided', () => {
      const contacts = [
        {
          entityType: 'clinic',
          entityId: '507f1f77bcf86cd799439016',
          contactType: 'email',
          contactValue: 'clinic@example.com',
        },
      ];

      const normalized = DataTransformerUtil.normalizeContactData(
        contacts,
        'organization',
        '507f1f77bcf86cd799439015',
      );

      expect(normalized[0].entityType).toBe('clinic');
      expect(normalized[0].entityId).toEqual(
        new Types.ObjectId('507f1f77bcf86cd799439016'),
      );
    });

    it('should normalize WhatsApp contacts', () => {
      const contacts = [
        {
          contactType: 'whatsapp',
          contactValue: '+966 50-123-4567',
        },
      ];

      const normalized = DataTransformerUtil.normalizeContactData(
        contacts,
        'clinic',
        '507f1f77bcf86cd799439024',
      );

      expect(normalized[0].contactValue).toBe('+966501234567');
    });

    it('should handle unknown contact types', () => {
      const contacts = [
        {
          contactType: 'unknown',
          contactValue: '  Some Value  ',
        },
      ];

      const normalized = DataTransformerUtil.normalizeContactData(
        contacts,
        'clinic',
        '507f1f77bcf86cd799439024',
      );

      expect(normalized[0].contactValue).toBe('Some Value');
    });
  });

  describe('normalizeWorkingHoursData', () => {
    it('should normalize working hours data correctly', () => {
      const schedule = [
        {
          dayOfWeek: 'MONDAY',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
          breakStartTime: '12:00',
          breakEndTime: '13:00',
        },
        {
          dayOfWeek: 'Friday',
          isWorkingDay: false,
        },
      ];

      const normalized = DataTransformerUtil.normalizeWorkingHoursData(
        schedule,
        'organization',
        '507f1f77bcf86cd799439023',
      );

      expect(normalized).toHaveLength(2);

      expect(normalized[0]).toEqual({
        entityType: 'organization',
        entityId: new Types.ObjectId('507f1f77bcf86cd799439023'),
        dayOfWeek: 'monday',
        isWorkingDay: true,
        openingTime: '09:00',
        closingTime: '17:00',
        breakStartTime: '12:00',
        breakEndTime: '13:00',
        isActive: true,
      });

      expect(normalized[1]).toEqual({
        entityType: 'organization',
        entityId: new Types.ObjectId('507f1f77bcf86cd799439023'),
        dayOfWeek: 'friday',
        isWorkingDay: false,
        openingTime: undefined,
        closingTime: undefined,
        breakStartTime: undefined,
        breakEndTime: undefined,
        isActive: true,
      });
    });

    it('should use entityType and entityId from input if provided', () => {
      const schedule = [
        {
          entityType: 'clinic',
          entityId: '507f1f77bcf86cd799439024',
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '10:00',
          closingTime: '16:00',
        },
      ];

      const normalized = DataTransformerUtil.normalizeWorkingHoursData(
        schedule,
        'organization',
        '507f1f77bcf86cd799439023',
      );

      expect(normalized[0].entityType).toBe('clinic');
      expect(normalized[0].entityId).toEqual(
        new Types.ObjectId('507f1f77bcf86cd799439024'),
      );
    });
  });

  describe('extractLegalInfoFromEntity', () => {
    it('should extract legal info correctly', () => {
      const entityData = {
        name: 'Test Entity',
        vatNumber: '300123456789001',
        crNumber: '1010123456',
        termsConditions: 'Terms and conditions...',
        privacyPolicy: 'Privacy policy...',
        googleLocation: '24.7136,46.6753',
        otherField: 'Should not be included',
      };

      const legalInfo =
        DataTransformerUtil.extractLegalInfoFromEntity(entityData);

      expect(legalInfo).toEqual({
        vatNumber: '300123456789001',
        crNumber: '1010123456',
        termsConditions: 'Terms and conditions...',
        privacyPolicy: 'Privacy policy...',
        googleLocation: '24.7136,46.6753',
      });
    });

    it('should handle missing legal info fields', () => {
      const entityData = {
        name: 'Test Entity',
      };

      const legalInfo =
        DataTransformerUtil.extractLegalInfoFromEntity(entityData);

      expect(legalInfo).toEqual({
        vatNumber: undefined,
        crNumber: undefined,
        termsConditions: undefined,
        privacyPolicy: undefined,
        googleLocation: undefined,
      });
    });
  });

  describe('generateEntityIds', () => {
    it('should generate IDs for all entity types', () => {
      const entityStructure = {
        organization: { name: 'Org' },
        complex: [{ name: 'Complex 1' }, { name: 'Complex 2' }],
        department: [{ name: 'Dept 1' }],
        clinic: [{ name: 'Clinic 1' }],
        service: [{ name: 'Service 1' }],
      };

      const idMappings = DataTransformerUtil.generateEntityIds(entityStructure);

      expect(idMappings.organization).toBeDefined();
      expect(idMappings.complex_0).toBeDefined();
      expect(idMappings.complex_1).toBeDefined();
      expect(idMappings.department_0).toBeDefined();
      expect(idMappings.clinic_0).toBeDefined();
      expect(idMappings.service_0).toBeDefined();

      // Check that IDs are valid ObjectId strings
      expect(Types.ObjectId.isValid(idMappings.organization)).toBe(true);
      expect(Types.ObjectId.isValid(idMappings.complex_0)).toBe(true);

      // Check that entities have IDs assigned
      expect((entityStructure.organization as any).id).toBe(
        idMappings.organization,
      );
      expect((entityStructure.complex[0] as any).id).toBe(idMappings.complex_0);
      expect((entityStructure.complex[1] as any).id).toBe(idMappings.complex_1);
    });

    it('should handle empty entity structure', () => {
      const entityStructure = {};

      const idMappings = DataTransformerUtil.generateEntityIds(entityStructure);

      expect(Object.keys(idMappings)).toHaveLength(0);
    });

    it('should handle single entities vs arrays', () => {
      const entityStructure = {
        organization: { name: 'Single Org' },
        complex: [{ name: 'Array Complex' }],
      };

      const idMappings = DataTransformerUtil.generateEntityIds(entityStructure);

      expect(idMappings.organization).toBeDefined();
      expect(idMappings.complex_0).toBeDefined();
      expect((entityStructure.organization as any).id).toBe(
        idMappings.organization,
      );
      expect((entityStructure.complex[0] as any).id).toBe(idMappings.complex_0);
    });
  });

  describe('extractLocationCoordinates', () => {
    it('should extract coordinates from Google location string', () => {
      const coordinates =
        DataTransformerUtil.extractLocationCoordinates('24.7136,46.6753');

      expect(coordinates).toEqual({
        latitude: 24.7136,
        longitude: 46.6753,
      });
    });

    it('should extract negative coordinates', () => {
      const coordinates =
        DataTransformerUtil.extractLocationCoordinates('-34.6037,-58.3816');

      expect(coordinates).toEqual({
        latitude: -34.6037,
        longitude: -58.3816,
      });
    });

    it('should return null for invalid coordinate format', () => {
      const coordinates = DataTransformerUtil.extractLocationCoordinates(
        'invalid coordinates',
      );
      expect(coordinates).toBeNull();
    });

    it('should return null for Place ID format', () => {
      const coordinates = DataTransformerUtil.extractLocationCoordinates(
        'ChIJN1t_tDeuEmsRUsoyG83frY4',
      );
      expect(coordinates).toBeNull();
    });

    it('should handle decimal coordinates', () => {
      const coordinates =
        DataTransformerUtil.extractLocationCoordinates('24,46');

      expect(coordinates).toEqual({
        latitude: 24,
        longitude: 46,
      });
    });
  });

  describe('normalizeAddress', () => {
    it('should normalize complete address', () => {
      const address = {
        addressLine1: '123 Main Street',
        addressLine2: 'Apt 4B',
        city: 'Riyadh',
        state: 'Riyadh Province',
        postalCode: '12345',
        country: 'Saudi Arabia',
      };

      const normalized = DataTransformerUtil.normalizeAddress(address);

      expect(normalized).toBe(
        '123 Main Street, Apt 4B, Riyadh, Riyadh Province, 12345, Saudi Arabia',
      );
    });

    it('should normalize partial address', () => {
      const address = {
        addressLine1: '123 Main Street',
        city: 'Riyadh',
        country: 'Saudi Arabia',
      };

      const normalized = DataTransformerUtil.normalizeAddress(address);

      expect(normalized).toBe('123 Main Street, Riyadh, Saudi Arabia');
    });

    it('should handle empty address', () => {
      const address = {};

      const normalized = DataTransformerUtil.normalizeAddress(address);

      expect(normalized).toBe('');
    });

    it('should filter out undefined and null values', () => {
      const address = {
        addressLine1: '123 Main Street',
        addressLine2: undefined,
        city: undefined,
        state: 'Province',
        postalCode: '',
        country: 'Saudi Arabia',
      } as any;

      const normalized = DataTransformerUtil.normalizeAddress(address);

      expect(normalized).toBe('123 Main Street, Province, Saudi Arabia');
    });
  });

  describe('transformEntityForDatabase', () => {
    it('should transform entity with reference fields', () => {
      const entityData = {
        name: 'Test Entity',
        organizationId: '507f1f77bcf86cd799439019',
        complexId: '507f1f77bcf86cd799439021',
      };

      const idMappings = {
        '507f1f77bcf86cd799439019': '507f1f77bcf86cd799439020',
        '507f1f77bcf86cd799439021': '507f1f77bcf86cd799439022',
      };

      const transformed = DataTransformerUtil.transformEntityForDatabase(
        'complex',
        entityData,
        idMappings,
      );

      expect(transformed.name).toBe('Test Entity');
      expect(transformed.organizationId).toEqual(
        new Types.ObjectId('507f1f77bcf86cd799439019'),
      );
      expect(transformed.createdAt).toBeInstanceOf(Date);
      expect(transformed.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle entity without reference fields', () => {
      const entityData = {
        name: 'Test Entity',
        description: 'A test entity',
      };

      const transformed = DataTransformerUtil.transformEntityForDatabase(
        'organization',
        entityData,
        {},
      );

      expect(transformed.name).toBe('Test Entity');
      expect(transformed.description).toBe('A test entity');
      expect(transformed.createdAt).toBeInstanceOf(Date);
      expect(transformed.updatedAt).toBeInstanceOf(Date);
    });

    it('should preserve non-reference fields', () => {
      const entityData = {
        name: 'Test Entity',
        email: 'test@example.com',
        phone: '+966501234567',
        isActive: true,
      };

      const transformed = DataTransformerUtil.transformEntityForDatabase(
        'clinic',
        entityData,
        {},
      );

      expect(transformed.name).toBe('Test Entity');
      expect(transformed.email).toBe('test@example.com');
      expect(transformed.phone).toBe('+966501234567');
      expect(transformed.isActive).toBe(true);
    });
  });

  describe('createDynamicInfoEntries', () => {
    it('should create dynamic info entries for legal info', () => {
      const legalInfo = {
        termsConditions: 'Terms and conditions content...',
        privacyPolicy: 'Privacy policy content...',
        vatNumber: '300123456789001', // Should not create entry
      };

      const entries = DataTransformerUtil.createDynamicInfoEntries(
        'organization',
        '507f1f77bcf86cd799439023',
        legalInfo,
      );

      expect(entries).toHaveLength(2);

      expect(entries[0]).toEqual({
        entityType: 'organization',
        entityId: new Types.ObjectId('507f1f77bcf86cd799439023'),
        infoType: 'terms_conditions',
        infoValue: 'Terms and conditions content...',
        isActive: true,
      });

      expect(entries[1]).toEqual({
        entityType: 'organization',
        entityId: new Types.ObjectId('507f1f77bcf86cd799439023'),
        infoType: 'privacy_policy',
        infoValue: 'Privacy policy content...',
        isActive: true,
      });
    });

    it('should create only terms conditions entry', () => {
      const legalInfo = {
        termsConditions: 'Terms and conditions content...',
      };

      const entries = DataTransformerUtil.createDynamicInfoEntries(
        'clinic',
        '507f1f77bcf86cd799439024',
        legalInfo,
      );

      expect(entries).toHaveLength(1);
      expect(entries[0].infoType).toBe('terms_conditions');
    });

    it('should create only privacy policy entry', () => {
      const legalInfo = {
        privacyPolicy: 'Privacy policy content...',
      };

      const entries = DataTransformerUtil.createDynamicInfoEntries(
        'complex',
        '507f1f77bcf86cd799439025',
        legalInfo,
      );

      expect(entries).toHaveLength(1);
      expect(entries[0].infoType).toBe('privacy_policy');
    });

    it('should return empty array for empty legal info', () => {
      const legalInfo = {};

      const entries = DataTransformerUtil.createDynamicInfoEntries(
        'organization',
        '507f1f77bcf86cd799439023',
        legalInfo,
      );

      expect(entries).toHaveLength(0);
    });
  });
});
