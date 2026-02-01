import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { OnboardingService } from '../../../src/onboarding/onboarding.service';
import { ValidationUtil } from '../../../src/common/utils/validation.util';
import { PlanConfigUtil } from '../../../src/common/utils/plan-config.util';
import { EntityRelationshipUtil } from '../../../src/common/utils/entity-relationship.util';
import { SubscriptionService } from '../../../src/subscription/subscription.service';
import { OrganizationService } from '../../../src/organization/organization.service';
import { ComplexService } from '../../../src/complex/complex.service';
import { ClinicService } from '../../../src/clinic/clinic.service';
import { DepartmentService } from '../../../src/department/department.service';
import { ServiceService } from '../../../src/service/service.service';
import { WorkingHoursService } from '../../../src/working-hours/working-hours.service';
import { ContactService } from '../../../src/contact/contact.service';
import { DynamicInfoService } from '../../../src/dynamic-info/dynamic-info.service';
import { UserAccessService } from '../../../src/user-access/user-access.service';
import {
  mockSubscriptionService,
  mockOrganizationService,
  mockComplexService,
  mockClinicService,
  mockDepartmentService,
  mockServiceService,
  mockWorkingHoursService,
  mockContactService,
  mockDynamicInfoService,
  mockUserAccessService,
  mockConnection,
  resetAllMocks,
} from '../mocks/service.mocks';

describe('Comprehensive Validation Logic Tests', () => {
  let service: OnboardingService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        OnboardingService,
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
        {
          provide: SubscriptionService,
          useValue: mockSubscriptionService,
        },
        {
          provide: OrganizationService,
          useValue: mockOrganizationService,
        },
        {
          provide: ComplexService,
          useValue: mockComplexService,
        },
        {
          provide: ClinicService,
          useValue: mockClinicService,
        },
        {
          provide: DepartmentService,
          useValue: mockDepartmentService,
        },
        {
          provide: ServiceService,
          useValue: mockServiceService,
        },
        {
          provide: WorkingHoursService,
          useValue: mockWorkingHoursService,
        },
        {
          provide: ContactService,
          useValue: mockContactService,
        },
        {
          provide: DynamicInfoService,
          useValue: mockDynamicInfoService,
        },
        {
          provide: UserAccessService,
          useValue: mockUserAccessService,
        },
      ],
    }).compile();

    service = module.get<OnboardingService>(OnboardingService);
    resetAllMocks();
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Plan Configuration Validation', () => {
    describe('Company Plan Validation Rules', () => {
      it('should enforce organization requirement for company plan', async () => {
        const dataWithoutOrg = {
          userData: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            password: 'password123',
          },
          subscriptionData: {
            planType: 'company',
            planId: 'company_plan_001',
          },
          // Missing organization
        };

        const result = await service.validateOnboardingData(dataWithoutOrg);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Company plan requires organization data',
        );
      });

      it('should enforce complex-department relationship for company plan', async () => {
        const dataWithComplexesNoDepts = {
          userData: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            password: 'password123',
          },
          subscriptionData: { planType: 'company', planId: 'company_plan_001' },
          organization: { name: 'Test Corp' },
          complexes: [{ name: 'Complex 1', departmentIds: ['dept1'] }],
          // Missing departments array
        };

        const result = await service.validateOnboardingData(
          dataWithComplexesNoDepts,
        );
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Invalid entity hierarchy for selected plan',
        );
      });

      it('should validate company plan entity limits', async () => {
        const exceedingLimitsData = {
          userData: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            password: 'password123',
          },
          subscriptionData: { planType: 'company', planId: 'company_plan_001' },
          organization: { name: 'Test Corp' },
          complexes: Array(11)
            .fill(0)
            .map((_, i) => ({
              name: `Complex ${i}`,
              departmentIds: ['dept1'],
            })),
          departments: [{ name: 'Department 1' }],
        };

        const result =
          await service.validateOnboardingData(exceedingLimitsData);
        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((error) =>
            error.includes('Maximum 10 complex(es) allowed'),
          ),
        ).toBe(true);
      });

      it('should allow maximum entities within company plan limits', async () => {
        const maxLimitsData = {
          userData: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            password: 'password123',
          },
          subscriptionData: { planType: 'company', planId: 'company_plan_001' },
          organization: { name: 'Test Corp' },
          complexes: Array(10)
            .fill(0)
            .map((_, i) => ({
              name: `Complex ${i}`,
              departmentIds: ['dept1'],
            })),
          departments: Array(100)
            .fill(0)
            .map((_, i) => ({ name: `Department ${i}` })),
          clinics: Array(50)
            .fill(0)
            .map((_, i) => ({
              name: `Clinic ${i}`,
              capacity: { maxPatients: 50, sessionDuration: 30 },
            })),
          services: Array(200)
            .fill(0)
            .map((_, i) => ({
              name: `Service ${i}`,
              durationMinutes: 30,
              price: 100,
            })),
        };

        const result = await service.validateOnboardingData(maxLimitsData);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Complex Plan Validation Rules', () => {
      it('should enforce complex requirement for complex plan', async () => {
        const dataWithoutComplexes = {
          userData: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            password: 'password123',
          },
          subscriptionData: { planType: 'complex', planId: 'complex_plan_001' },
          departments: [{ name: 'Department 1' }],
          // Missing complexes
        };

        const result =
          await service.validateOnboardingData(dataWithoutComplexes);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Complex plan requires at least one complex',
        );
      });

      it('should enforce department requirement for complex plan', async () => {
        const dataWithoutDepartments = {
          userData: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            password: 'password123',
          },
          subscriptionData: { planType: 'complex', planId: 'complex_plan_001' },
          complexes: [{ name: 'Complex 1', departmentIds: ['dept1'] }],
          // Missing departments
        };

        const result = await service.validateOnboardingData(
          dataWithoutDepartments,
        );
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Complex plan requires at least one department',
        );
      });

      it('should reject organization for complex plan', async () => {
        const dataWithOrganization = {
          userData: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            password: 'password123',
          },
          subscriptionData: { planType: 'complex', planId: 'complex_plan_001' },
          organization: { name: 'Should not be allowed' },
          complexes: [{ name: 'Complex 1', departmentIds: ['dept1'] }],
          departments: [{ name: 'Department 1' }],
        };

        const result =
          await service.validateOnboardingData(dataWithOrganization);
        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((error) =>
            error.includes('Maximum 0 organization(s) allowed'),
          ),
        ).toBe(true);
      });

      it('should validate complex plan entity limits', async () => {
        const exceedingLimitsData = {
          userData: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            password: 'password123',
          },
          subscriptionData: { planType: 'complex', planId: 'complex_plan_001' },
          complexes: Array(6)
            .fill(0)
            .map((_, i) => ({
              name: `Complex ${i}`,
              departmentIds: ['dept1'],
            })),
          departments: [{ name: 'Department 1' }],
        };

        const result =
          await service.validateOnboardingData(exceedingLimitsData);
        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((error) =>
            error.includes('Maximum 5 complex(es) allowed'),
          ),
        ).toBe(true);
      });
    });

    describe('Clinic Plan Validation Rules', () => {
      it('should enforce clinic requirement for clinic plan', async () => {
        const dataWithoutClinics = {
          userData: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            password: 'password123',
          },
          subscriptionData: { planType: 'clinic', planId: 'clinic_plan_001' },
          // Missing clinics
        };

        const result = await service.validateOnboardingData(dataWithoutClinics);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Clinic plan requires at least one clinic',
        );
      });

      it('should enforce capacity requirements for clinic plan', async () => {
        const dataWithoutCapacity = {
          userData: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            password: 'password123',
          },
          subscriptionData: { planType: 'clinic', planId: 'clinic_plan_001' },
          clinics: [{ name: 'Test Clinic' }], // Missing capacity
        };

        const result =
          await service.validateOnboardingData(dataWithoutCapacity);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Clinic plan requires maximum patient capacity',
        );
        expect(result.errors).toContain(
          'Clinic plan requires default session duration',
        );
      });

      it('should reject organization and complexes for clinic plan', async () => {
        const dataWithInvalidEntities = {
          userData: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            password: 'password123',
          },
          subscriptionData: { planType: 'clinic', planId: 'clinic_plan_001' },
          organization: { name: 'Should not be allowed' },
          complexes: [{ name: 'Should not be allowed' }],
          clinics: [
            {
              name: 'Test Clinic',
              capacity: { maxPatients: 50, sessionDuration: 30 },
            },
          ],
        };

        const result = await service.validateOnboardingData(
          dataWithInvalidEntities,
        );
        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((error) =>
            error.includes('Maximum 0 organization(s) allowed'),
          ),
        ).toBe(true);
        expect(
          result.errors.some((error) =>
            error.includes('Maximum 0 complex(es) allowed'),
          ),
        ).toBe(true);
      });

      it('should reject multiple clinics for clinic plan', async () => {
        const dataWithMultipleClinics = {
          userData: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            password: 'password123',
          },
          subscriptionData: { planType: 'clinic', planId: 'clinic_plan_001' },
          clinics: [
            {
              name: 'Clinic 1',
              capacity: { maxPatients: 50, sessionDuration: 30 },
            },
            {
              name: 'Clinic 2',
              capacity: { maxPatients: 50, sessionDuration: 30 },
            }, // Exceeds limit
          ],
        };

        const result = await service.validateOnboardingData(
          dataWithMultipleClinics,
        );
        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((error) =>
            error.includes('Maximum 1 clinic(s) allowed'),
          ),
        ).toBe(true);
      });
    });
  });

  describe('Business Profile Validation', () => {
    it('should validate year established range', async () => {
      const testCases = [
        { year: 1899, shouldPass: false, description: 'too early' },
        { year: 1900, shouldPass: true, description: 'minimum valid' },
        { year: 2020, shouldPass: true, description: 'valid year' },
        {
          year: new Date().getFullYear(),
          shouldPass: true,
          description: 'current year',
        },
        {
          year: new Date().getFullYear() + 1,
          shouldPass: false,
          description: 'future year',
        },
      ];

      for (const testCase of testCases) {
        const businessProfile = {
          yearEstablished: testCase.year,
          mission: 'Test mission',
          vision: 'Test vision',
          ceoName: 'Test CEO',
        };

        const result = ValidationUtil.validateBusinessProfile(businessProfile);
        expect(result.isValid).toBe(testCase.shouldPass);

        if (!testCase.shouldPass) {
          expect(result.errors.length).toBeGreaterThan(0);
          expect(
            result.errors.some((error) => error.includes('Year established')),
          ).toBe(true);
        }
      }
    });

    it('should validate text field lengths', async () => {
      const testCases = [
        {
          field: 'mission',
          value: 'A'.repeat(1001),
          shouldPass: false,
          expectedError: 'Mission statement cannot exceed 1000 characters',
        },
        {
          field: 'vision',
          value: 'B'.repeat(1001),
          shouldPass: false,
          expectedError: 'Vision statement cannot exceed 1000 characters',
        },
        {
          field: 'ceoName',
          value: 'C'.repeat(256),
          shouldPass: false,
          expectedError: 'CEO name cannot exceed 255 characters',
        },
        {
          field: 'mission',
          value: 'A'.repeat(1000),
          shouldPass: true,
          expectedError: null,
        },
      ];

      for (const testCase of testCases) {
        const businessProfile = {
          yearEstablished: 2020,
          [testCase.field]: testCase.value,
        };

        const result = ValidationUtil.validateBusinessProfile(businessProfile);
        expect(result.isValid).toBe(testCase.shouldPass);

        if (!testCase.shouldPass && testCase.expectedError) {
          expect(result.errors).toContain(testCase.expectedError);
        }
      }
    });

    it('should validate VAT and CR number formats', async () => {
      const testCases = [
        {
          vatNumber: '300123456789001',
          crNumber: '1010123456',
          shouldPass: true,
          description: 'valid Saudi formats',
        },
        {
          vatNumber: '123456789012345',
          crNumber: '2050987654',
          shouldPass: true,
          description: 'valid alternative formats',
        },
        {
          vatNumber: 'invalid_vat',
          crNumber: '1010123456',
          shouldPass: false,
          description: 'invalid VAT format',
        },
        {
          vatNumber: '300123456789001',
          crNumber: 'invalid_cr',
          shouldPass: false,
          description: 'invalid CR format',
        },
        {
          vatNumber: '30012345678900',
          crNumber: '101012345',
          shouldPass: false,
          description: 'wrong lengths',
        },
      ];

      for (const testCase of testCases) {
        const businessProfile = {
          yearEstablished: 2020,
          vatNumber: testCase.vatNumber,
          crNumber: testCase.crNumber,
        };

        const result = ValidationUtil.validateBusinessProfile(businessProfile);
        expect(result.isValid).toBe(testCase.shouldPass);
      }
    });
  });

  describe('Working Hours Validation', () => {
    it('should validate basic working hours format', async () => {
      const validSchedules = [
        [
          {
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '09:00',
            closingTime: '17:00',
          },
          { dayOfWeek: 'friday', isWorkingDay: false },
        ],
        [
          {
            dayOfWeek: 'sunday',
            isWorkingDay: true,
            openingTime: '08:00',
            closingTime: '20:00',
            breakStartTime: '12:00',
            breakEndTime: '14:00',
          },
        ],
        [], // Empty schedule should be valid
      ];

      for (const schedule of validSchedules) {
        const result = ValidationUtil.validateWorkingHours(schedule);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });

    it('should reject invalid working hours formats', async () => {
      const invalidSchedules = [
        // Duplicate days
        [
          {
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '09:00',
            closingTime: '17:00',
          },
          { dayOfWeek: 'monday', isWorkingDay: false },
        ],
        // Invalid day name
        [
          {
            dayOfWeek: 'invalidday',
            isWorkingDay: true,
            openingTime: '09:00',
            closingTime: '17:00',
          },
        ],
        // Missing times for working day
        [{ dayOfWeek: 'monday', isWorkingDay: true }],
        // Invalid time format
        [
          {
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '25:00',
            closingTime: '17:60',
          },
        ],
      ];

      for (const schedule of invalidSchedules) {
        const result = ValidationUtil.validateWorkingHours(schedule);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('should validate hierarchical working hours constraints', async () => {
      const validHierarchies = [
        {
          parent: [
            {
              dayOfWeek: 'monday',
              isWorkingDay: true,
              openingTime: '08:00',
              closingTime: '18:00',
            },
          ],
          child: [
            {
              dayOfWeek: 'monday',
              isWorkingDay: true,
              openingTime: '09:00',
              closingTime: '17:00',
            },
          ],
        },
        {
          parent: [{ dayOfWeek: 'friday', isWorkingDay: false }],
          child: [{ dayOfWeek: 'friday', isWorkingDay: false }],
        },
        {
          parent: [
            {
              dayOfWeek: 'monday',
              isWorkingDay: true,
              openingTime: '09:00',
              closingTime: '17:00',
            },
          ],
          child: [{ dayOfWeek: 'monday', isWorkingDay: false }], // Child can be closed when parent is open
        },
      ];

      for (const hierarchy of validHierarchies) {
        const result = ValidationUtil.validateHierarchicalWorkingHours(
          hierarchy.parent,
          hierarchy.child,
          'Parent',
          'Child',
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });

    it('should reject invalid hierarchical working hours', async () => {
      const invalidHierarchies = [
        {
          parent: [{ dayOfWeek: 'friday', isWorkingDay: false }],
          child: [
            {
              dayOfWeek: 'friday',
              isWorkingDay: true,
              openingTime: '09:00',
              closingTime: '17:00',
            },
          ],
          expectedError: 'Child cannot be open on friday when Parent is closed',
        },
        {
          parent: [
            {
              dayOfWeek: 'monday',
              isWorkingDay: true,
              openingTime: '09:00',
              closingTime: '17:00',
            },
          ],
          child: [
            {
              dayOfWeek: 'monday',
              isWorkingDay: true,
              openingTime: '08:00',
              closingTime: '17:00',
            },
          ],
          expectedError:
            'Child opening time (08:00) on monday must be at or after Parent opening time (09:00)',
        },
        {
          parent: [
            {
              dayOfWeek: 'monday',
              isWorkingDay: true,
              openingTime: '09:00',
              closingTime: '17:00',
            },
          ],
          child: [
            {
              dayOfWeek: 'monday',
              isWorkingDay: true,
              openingTime: '10:00',
              closingTime: '18:00',
            },
          ],
          expectedError:
            'Child closing time (18:00) on monday must be at or before Parent closing time (17:00)',
        },
      ];

      for (const hierarchy of invalidHierarchies) {
        const result = ValidationUtil.validateHierarchicalWorkingHours(
          hierarchy.parent,
          hierarchy.child,
          'Parent',
          'Child',
        );
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(hierarchy.expectedError);
      }
    });
  });

  describe('Contact Information Validation', () => {
    it('should validate social media URLs', async () => {
      const testCases = [
        {
          platform: 'facebook',
          url: 'https://facebook.com/testpage',
          shouldPass: true,
        },
        {
          platform: 'facebook',
          url: 'https://www.facebook.com/testpage/',
          shouldPass: true,
        },
        {
          platform: 'instagram',
          url: 'https://instagram.com/testuser',
          shouldPass: true,
        },
        {
          platform: 'whatsapp',
          url: 'https://wa.me/966501234567',
          shouldPass: true,
        },
        {
          platform: 'facebook',
          url: 'https://instagram.com/wrongplatform',
          shouldPass: false,
        },
        { platform: 'unknown', url: 'https://example.com', shouldPass: true }, // Generic validation
        { platform: 'facebook', url: 'invalid-url', shouldPass: false },
      ];

      for (const testCase of testCases) {
        const result = ValidationUtil.validateSocialMediaUrl(
          testCase.platform,
          testCase.url,
        );
        expect(result).toBe(testCase.shouldPass);
      }
    });

    it('should validate email formats', async () => {
      const testCases = [
        { email: 'test@example.com', shouldPass: true },
        { email: 'user.name+tag@domain.co.uk', shouldPass: true },
        { email: 'invalid-email', shouldPass: false },
        { email: 'test@', shouldPass: false },
        { email: '@domain.com', shouldPass: false },
        { email: 'test.domain.com', shouldPass: false },
      ];

      for (const testCase of testCases) {
        const result = ValidationUtil.validateEmail(testCase.email);
        expect(result).toBe(testCase.shouldPass);
      }
    });

    it('should validate phone number formats', async () => {
      const testCases = [
        { phone: '+966501234567', shouldPass: true },
        { phone: '0501234567', shouldPass: true },
        { phone: '966501234567', shouldPass: false },
        { phone: '+966 50 123 4567', shouldPass: true }, // With spaces
        { phone: '+966-50-123-4567', shouldPass: true }, // With dashes
        { phone: '+966401234567', shouldPass: false }, // Invalid prefix
        { phone: '+96650123456', shouldPass: false }, // Too short
        { phone: '1234567890', shouldPass: false }, // Wrong format
      ];

      for (const testCase of testCases) {
        const result = ValidationUtil.validatePhone(testCase.phone);
        expect(result).toBe(testCase.shouldPass);
      }
    });

    it('should validate Google location formats', async () => {
      const testCases = [
        { location: '24.7136,46.6753', shouldPass: true }, // Coordinates
        { location: '-34.6037,58.3816', shouldPass: true }, // Negative coordinates
        { location: 'ChIJN1t_tDeuEmsRUsoyG83frY4', shouldPass: true }, // Place ID
        { location: 'King Fahd Road, Riyadh, Saudi Arabia', shouldPass: true }, // Address
        { location: 'invalid', shouldPass: false },
        { location: '123', shouldPass: false },
        { location: '', shouldPass: true }, // Optional field
      ];

      for (const testCase of testCases) {
        const result = ValidationUtil.validateGoogleLocation(testCase.location);
        expect(result).toBe(testCase.shouldPass);
      }
    });
  });

  describe('Entity Relationship Validation', () => {
    it('should validate entity hierarchy for each plan type', async () => {
      const testCases = [
        {
          planType: 'company',
          entities: { organization: { name: 'Test' } },
          shouldPass: true,
        },
        {
          planType: 'company',
          entities: {
            organization: { name: 'Test' },
            complexes: [{ name: 'Complex' }],
            departments: [{ name: 'Dept' }],
          },
          shouldPass: true,
        },
        {
          planType: 'company',
          entities: {
            complexes: [{ name: 'Complex' }],
            // Missing organization
          },
          shouldPass: false,
        },
        {
          planType: 'complex',
          entities: {
            complexes: [{ name: 'Complex' }],
            departments: [{ name: 'Dept' }],
          },
          shouldPass: true,
        },
        {
          planType: 'complex',
          entities: {
            complexes: [{ name: 'Complex' }],
            // Missing departments
          },
          shouldPass: false,
        },
        {
          planType: 'clinic',
          entities: {
            clinics: [{ name: 'Clinic' }],
          },
          shouldPass: true,
        },
        {
          planType: 'clinic',
          entities: {
            // Missing clinics
          },
          shouldPass: false,
        },
      ];

      for (const testCase of testCases) {
        const result = EntityRelationshipUtil.validateEntityHierarchy(
          testCase.planType,
          testCase.entities,
        );
        expect(result).toBe(testCase.shouldPass);
      }
    });

    it('should validate entity dependencies', async () => {
      const testCases = [
        {
          entityType: 'organization',
          dependencies: [],
          shouldPass: true,
        },
        {
          entityType: 'complex',
          dependencies: [{ type: 'subscription', id: 'sub_123' }],
          shouldPass: true,
        },
        {
          entityType: 'complexDepartment',
          dependencies: [
            { type: 'complex', id: 'complex_123' },
            { type: 'department', id: 'dept_123' },
          ],
          shouldPass: true,
        },
        {
          entityType: 'complexDepartment',
          dependencies: [{ type: 'complex', id: 'complex_123' }], // Missing department
          shouldPass: false,
        },
        {
          entityType: 'workingHours',
          dependencies: ['entity_123'],
          shouldPass: true,
        },
        {
          entityType: 'userAccess',
          dependencies: [{ type: 'user', id: 'user_123' }, 'entity_123'],
          shouldPass: true,
        },
      ];

      for (const testCase of testCases) {
        const result = EntityRelationshipUtil.validateEntityDependencies(
          testCase.entityType,
          testCase.dependencies,
        );
        expect(result).toBe(testCase.shouldPass);
      }
    });

    it('should validate entity relationships', async () => {
      const validEntities = [
        { id: 'org_123', name: 'Organization' },
        { id: 'complex_123', organizationId: 'org_123', name: 'Complex' },
        { id: 'clinic_123', complexId: 'complex_123', name: 'Clinic' },
      ];

      const invalidEntities = [
        { id: 'complex_123', organizationId: 'invalid_org', name: 'Complex' },
      ];

      expect(
        EntityRelationshipUtil.validateEntityRelationships(validEntities),
      ).toBe(true);
      expect(
        EntityRelationshipUtil.validateEntityRelationships(invalidEntities),
      ).toBe(false);
    });
  });

  describe('Plan Configuration Validation', () => {
    it('should retrieve correct plan configurations', async () => {
      const companyConfig = PlanConfigUtil.getPlanConfiguration('company');
      expect(companyConfig).toBeDefined();
      expect(companyConfig?.name).toBe('Company Plan');
      expect(companyConfig?.maxOrganizations).toBe(1);
      expect(companyConfig?.maxComplexes).toBe(10);
      expect(companyConfig?.maxClinics).toBe(50);

      const complexConfig = PlanConfigUtil.getPlanConfiguration('complex');
      expect(complexConfig).toBeDefined();
      expect(complexConfig?.name).toBe('Complex Plan');
      expect(complexConfig?.maxOrganizations).toBe(0);
      expect(complexConfig?.maxComplexes).toBe(5);

      const clinicConfig = PlanConfigUtil.getPlanConfiguration('clinic');
      expect(clinicConfig).toBeDefined();
      expect(clinicConfig?.name).toBe('Clinic Plan');
      expect(clinicConfig?.maxClinics).toBe(1);

      const invalidConfig = PlanConfigUtil.getPlanConfiguration('invalid');
      expect(invalidConfig).toBeNull();
    });

    it('should validate plan limits correctly', async () => {
      const testCases = [
        {
          planType: 'company',
          entityCounts: {
            organizations: 1,
            complexes: 10,
            clinics: 50,
            departments: 100,
            services: 200,
          },
          shouldPass: true,
        },
        {
          planType: 'company',
          entityCounts: { organizations: 2, complexes: 5, clinics: 25 },
          shouldPass: false,
          expectedErrors: ['Maximum 1 organization(s) allowed'],
        },
        {
          planType: 'complex',
          entityCounts: { organizations: 0, complexes: 5, clinics: 20 },
          shouldPass: true,
        },
        {
          planType: 'complex',
          entityCounts: { organizations: 1, complexes: 3, clinics: 15 },
          shouldPass: false,
          expectedErrors: ['Maximum 0 organization(s) allowed'],
        },
        {
          planType: 'clinic',
          entityCounts: { organizations: 0, complexes: 0, clinics: 1 },
          shouldPass: true,
        },
        {
          planType: 'clinic',
          entityCounts: { organizations: 0, complexes: 0, clinics: 2 },
          shouldPass: false,
          expectedErrors: ['Maximum 1 clinic(s) allowed'],
        },
      ];

      for (const testCase of testCases) {
        const result = PlanConfigUtil.validatePlanLimits(
          testCase.planType,
          testCase.entityCounts,
        );
        expect(result.isValid).toBe(testCase.shouldPass);

        if (!testCase.shouldPass && testCase.expectedErrors) {
          testCase.expectedErrors.forEach((expectedError) => {
            expect(
              result.errors.some((error) => error.includes(expectedError)),
            ).toBe(true);
          });
        }
      }
    });
  });

  describe('Integration Validation Tests', () => {
    it('should validate complete onboarding scenarios with all validations', async () => {
      const complexOnboardingData = {
        userData: {
          firstName: 'Dr. Ahmed',
          lastName: 'Al-Rashid',
          email: 'ahmed@example.com',
          password: 'SecurePassword123!',
          phone: '+966501234567',
          nationality: 'Saudi Arabian',
          dateOfBirth: '1980-01-01',
          gender: 'male',
        },
        subscriptionData: {
          planType: 'company',
          planId: 'company_premium_001',
        },
        organization: {
          name: 'Advanced Healthcare Group',
          legalName: 'Advanced Healthcare Group LLC',
          phone: '+966112345678',
          email: 'info@advancedhealthcare.sa',
          address: 'King Fahd Road, Riyadh, Saudi Arabia',
          googleLocation: '24.7136,46.6753',
          logoUrl: 'https://advancedhealthcare.sa/logo.png',
          website: 'https://www.advancedhealthcare.sa',
          businessProfile: {
            yearEstablished: 2015,
            mission:
              'Providing world-class healthcare services with compassionate care',
            vision: 'Leading healthcare provider in the Middle East',
            ceoName: 'Dr. Ahmed Al-Rashid',
          },
          legalInfo: {
            vatNumber: '300123456789001',
            crNumber: '1010123456',
          },
        },
        complexes: [
          {
            name: 'Riyadh Medical Complex',
            address: 'King Abdulaziz Road, Riyadh',
            phone: '+966512234567',
            email: 'riyadh@advancedhealthcare.sa',
            managerName: 'Dr. Sarah Al-Zahra',
          },
        ],
        departments: [
          {
            name: 'Cardiology',
            description: 'Comprehensive heart and cardiovascular care',
          },
          {
            name: 'Pediatrics',
            description: 'Specialized medical care for children',
          },
        ],
        clinics: [
          {
            name: 'Heart Center',
            phone: '+966512234501',
            email: 'heart@advancedhealthcare.sa',
            headDoctorName: 'Dr. Faisal Al-Otaibi',
            specialization: 'Interventional Cardiology',
            capacity: {
              maxStaff: 25,
              maxDoctors: 8,
              maxPatients: 150,
              sessionDuration: 45,
            },
          },
        ],
        workingHours: [],
        contacts: [
          {
            contactType: 'facebook',
            contactValue: 'https://facebook.com/AdvancedHealthcareSA',
          },
          {
            contactType: 'phone',
            contactValue: '+966501234567',
          },
          {
            contactType: 'email',
            contactValue: 'contact@advancedhealthcare.sa',
          },
        ],
        legalInfo: {
          termsConditions:
            'Detailed terms and conditions for the healthcare services...',
          privacyPolicy:
            'Comprehensive privacy policy protecting patient data...',
        },
      };

      const result = await service.validateOnboardingData(
        complexOnboardingData,
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect multiple validation failures in complex scenario', async () => {
      const invalidComplexData = {
        userData: {
          firstName: 'Test',
          lastName: 'User',
          email: 'invalid-email', // Invalid email
          password: 'weak', // Weak password
          phone: '123', // Invalid phone
        },
        subscriptionData: {
          planType: 'company',
          planId: 'invalid_plan',
        },
        organization: {
          name: '', // Empty name
          businessProfile: {
            yearEstablished: 1800, // Too early
            mission: 'A'.repeat(1001), // Too long
            ceoName: 'B'.repeat(256), // Too long
          },
          legalInfo: {
            vatNumber: 'invalid', // Invalid format
            crNumber: 'invalid', // Invalid format
          },
        },
        complexes: Array(15)
          .fill(0)
          .map((_, i) => ({
            // Exceeds limit
            name: `Complex ${i}`,
            departmentIds: ['dept1'],
          })),
        departments: Array(150)
          .fill(0)
          .map((_, i) => ({
            // Exceeds limit
            name: `Department ${i}`,
          })),
        workingHours: [
          {
            dayOfWeek: 'invalidday', // Invalid day
            isWorkingDay: true,
            openingTime: '25:00', // Invalid time
            closingTime: '26:00', // Invalid time
          },
          {
            dayOfWeek: 'monday',
            isWorkingDay: true, // Missing times
          },
        ],
        contacts: [
          {
            contactType: 'facebook',
            contactValue: 'invalid-url', // Invalid URL
          },
        ],
      };

      const result = await service.validateOnboardingData(invalidComplexData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(5); // Multiple validation failures
    });
  });

  describe('Edge Case Validations', () => {
    it('should handle boundary values correctly', async () => {
      const boundaryTests = [
        {
          description: 'Maximum allowed entities at exact limits',
          data: {
            userData: {
              firstName: 'Test',
              lastName: 'User',
              email: 'test@example.com',
              password: 'password123',
            },
            subscriptionData: { planType: 'company', planId: 'company_plan' },
            organization: { name: 'Test Org' },
            complexes: Array(10)
              .fill(0)
              .map((_, i) => ({
                name: `Complex ${i}`,
                departmentIds: ['dept1'],
              })),
            departments: Array(100)
              .fill(0)
              .map((_, i) => ({ name: `Dept ${i}` })),
            clinics: Array(50)
              .fill(0)
              .map((_, i) => ({
                name: `Clinic ${i}`,
                capacity: { maxPatients: 1, sessionDuration: 1 },
              })),
            services: Array(200)
              .fill(0)
              .map((_, i) => ({
                name: `Service ${i}`,
                durationMinutes: 1,
                price: 0,
              })),
          },
          shouldPass: true,
        },
        {
          description: 'One entity over the limit',
          data: {
            userData: {
              firstName: 'Test',
              lastName: 'User',
              email: 'test@example.com',
              password: 'password123',
            },
            subscriptionData: { planType: 'company', planId: 'company_plan' },
            organization: { name: 'Test Org' },
            complexes: Array(11)
              .fill(0)
              .map((_, i) => ({
                name: `Complex ${i}`,
                departmentIds: ['dept1'],
              })),
            departments: [{ name: 'Dept 1' }],
          },
          shouldPass: false,
        },
      ];

      for (const test of boundaryTests) {
        const result = await service.validateOnboardingData(test.data);
        expect(result.isValid).toBe(test.shouldPass);
      }
    });

    it('should handle empty and null values appropriately', async () => {
      const emptyValueTests = [
        {
          description: 'Empty optional fields should be valid',
          data: {
            userData: {
              firstName: 'Test',
              lastName: 'User',
              email: 'test@example.com',
              password: 'password123',
            },
            subscriptionData: { planType: 'clinic', planId: 'clinic_plan' },
            clinics: [
              {
                name: 'Test Clinic',
                capacity: { maxPatients: 50, sessionDuration: 30 },
              },
            ],
            workingHours: [],
            contacts: [],
            services: [],
          },
          shouldPass: true,
        },
        {
          description: 'Undefined optional fields should be valid',
          data: {
            userData: {
              firstName: 'Test',
              lastName: 'User',
              email: 'test@example.com',
              password: 'password123',
            },
            subscriptionData: { planType: 'clinic', planId: 'clinic_plan' },
            clinics: [
              {
                name: 'Test Clinic',
                capacity: { maxPatients: 50, sessionDuration: 30 },
              },
            ],
            // Optional fields undefined
          },
          shouldPass: true,
        },
      ];

      for (const test of emptyValueTests) {
        const result = await service.validateOnboardingData(test.data);
        expect(result.isValid).toBe(test.shouldPass);
      }
    });
  });
});
