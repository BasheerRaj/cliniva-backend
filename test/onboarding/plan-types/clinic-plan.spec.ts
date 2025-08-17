import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { OnboardingService } from '../../../src/onboarding/onboarding.service';
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
  resetAllMocks
} from '../mocks/service.mocks';
import { validClinicPlanData } from '../fixtures/onboarding-data.fixture';

// Add real service class imports for DI tokens
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
import { UserRole } from '../../../src/common/enums/user-role.enum';

describe('Clinic Plan Tests', () => {
  let service: OnboardingService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        OnboardingService,
        {
          provide: getConnectionToken(),
          useValue: mockConnection
        },
        {
          provide: SubscriptionService,
          useValue: mockSubscriptionService
        },
        {
          provide: OrganizationService,
          useValue: mockOrganizationService
        },
        {
          provide: ComplexService,
          useValue: mockComplexService
        },
        {
          provide: ClinicService,
          useValue: mockClinicService
        },
        {
          provide: DepartmentService,
          useValue: mockDepartmentService
        },
        {
          provide: ServiceService,
          useValue: mockServiceService
        },
        {
          provide: WorkingHoursService,
          useValue: mockWorkingHoursService
        },
        {
          provide: ContactService,
          useValue: mockContactService
        },
        {
          provide: DynamicInfoService,
          useValue: mockDynamicInfoService
        },
        {
          provide: UserAccessService,
          useValue: mockUserAccessService
        }
      ],
    }).compile();

    service = module.get<OnboardingService>(OnboardingService);
    resetAllMocks();
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Clinic Plan Structure Validation', () => {
    it('should validate basic clinic plan with single clinic', async () => {
      const basicClinicData = {
        ...validClinicPlanData,
        services: undefined,
        workingHours: undefined,
        contacts: undefined
      };

      const result = await service.validateOnboardingData(basicClinicData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate clinic plan with complete data', async () => {
      const completeClinicData = {
        ...validClinicPlanData,
        clinics: [
          {
            name: 'Bright Smile Dental Clinic',
            address: 'Prince Sultan Street, Al Khobar, Saudi Arabia',
            googleLocation: '26.2185,50.1974',
            phone: '+966138901234',
            email: 'info@brightsmile-dental.sa',
            licenseNumber: 'DL-BS-2023-001',
            logoUrl: 'https://brightsmile-dental.sa/logo.png',
            website: 'https://brightsmile-dental.sa',
            headDoctorName: 'Dr. Ali Al-Mutairi',
            specialization: 'General and Cosmetic Dentistry',
            pin: 'BS2023',
            capacity: {
              maxStaff: 8,
              maxDoctors: 3,
              maxPatients: 50,
              sessionDuration: 45
            },
            businessProfile: {
              yearEstablished: 2020,
              mission: 'Exceptional dental care with patient comfort',
              vision: 'Leading dental clinic in Eastern Province',
              ceoName: 'Dr. Ali Al-Mutairi'
            },
            legalInfo: {
              vatNumber: '300555666777003',
              crNumber: '3070555666'
            }
          }
        ],
        services: [
          {
            name: 'Dental Cleaning',
            description: 'Professional teeth cleaning',
            durationMinutes: 45,
            price: 200
          },
          {
            name: 'Tooth Filling',
            description: 'Dental restorations',
            durationMinutes: 60,
            price: 350
          },
          {
            name: 'Root Canal',
            description: 'Endodontic therapy',
            durationMinutes: 90,
            price: 800
          }
        ]
      };

      const result = await service.validateOnboardingData(completeClinicData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject clinic plan without clinics', async () => {
      const clinicWithoutClinics = {
        ...validClinicPlanData,
        clinics: undefined
      };

      const result = await service.validateOnboardingData(clinicWithoutClinics);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Clinic plan requires at least one clinic');
    });

    it('should reject clinic plan with empty clinics array', async () => {
      const clinicWithEmptyArray = {
        ...validClinicPlanData,
        clinics: []
      };

      const result = await service.validateOnboardingData(clinicWithEmptyArray);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Clinic plan requires at least one clinic');
    });

    it('should reject clinic plan with organization (not allowed)', async () => {
      const clinicWithOrganization = {
        ...validClinicPlanData,
        organization: {
          name: 'Should not be allowed'
        }
      };

      const result = await service.validateOnboardingData(clinicWithOrganization);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => 
        error.includes('Maximum 0 organization(s) allowed')
      )).toBe(true);
    });

    it('should reject clinic plan with complexes (not allowed)', async () => {
      const clinicWithComplexes = {
        ...validClinicPlanData,
        complexes: [
          { name: 'Should not be allowed', departmentIds: ['dept1'] }
        ]
      };

      const result = await service.validateOnboardingData(clinicWithComplexes);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => 
        error.includes('Maximum 0 complex(es) allowed')
      )).toBe(true);
    });
  });

  describe('Clinic Plan Capacity Validation', () => {
    it('should validate clinic with complete capacity information', async () => {
      const clinicWithCapacity = {
        ...validClinicPlanData,
        clinics: [
          {
            name: 'Test Clinic',
            capacity: {
              maxStaff: 10,
              maxDoctors: 4,
              maxPatients: 60,
              sessionDuration: 30
            }
          }
        ]
      };

      const result = await service.validateOnboardingData(clinicWithCapacity);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject clinic without capacity', async () => {
      const clinicWithoutCapacity = {
        ...validClinicPlanData,
        clinics: [
          {
            name: 'Test Clinic'
            // Missing capacity
          }
        ]
      };

      const result = await service.validateOnboardingData(clinicWithoutCapacity);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Clinic plan requires maximum patient capacity');
      expect(result.errors).toContain('Clinic plan requires default session duration');
    });

    it('should reject clinic with incomplete capacity', async () => {
      const clinicWithIncompleteCapacity = {
        ...validClinicPlanData,
        clinics: [
          {
            name: 'Test Clinic',
            capacity: {
              maxStaff: 10
              // Missing maxPatients and sessionDuration
            }
          }
        ]
      };

      const result = await service.validateOnboardingData(clinicWithIncompleteCapacity);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Clinic plan requires maximum patient capacity');
      expect(result.errors).toContain('Clinic plan requires default session duration');
    });

    it('should validate clinic with only required capacity fields', async () => {
      const clinicWithMinimalCapacity = {
        ...validClinicPlanData,
        clinics: [
          {
            name: 'Test Clinic',
            capacity: {
              maxPatients: 50,
              sessionDuration: 30
              // Optional: maxStaff, maxDoctors
            }
          }
        ]
      };

      const result = await service.validateOnboardingData(clinicWithMinimalCapacity);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle zero values in capacity', async () => {
      const clinicWithZeroCapacity = {
        ...validClinicPlanData,
        clinics: [
          {
            name: 'Test Clinic',
            capacity: {
              maxStaff: 0,
              maxDoctors: 0,
              maxPatients: 0, // This might be invalid in business logic
              sessionDuration: 0 // This might be invalid in business logic
            }
          }
        ]
      };

      const result = await service.validateOnboardingData(clinicWithZeroCapacity);
      // Basic validation should pass, business logic validation might fail
      expect(result.isValid).toBe(true);
    });

    it('should handle negative values in capacity', async () => {
      const clinicWithNegativeCapacity = {
        ...validClinicPlanData,
        clinics: [
          {
            name: 'Test Clinic',
            capacity: {
              maxStaff: -1,
              maxDoctors: -1,
              maxPatients: -1,
              sessionDuration: -1
            }
          }
        ]
      };

      const result = await service.validateOnboardingData(clinicWithNegativeCapacity);
      // This should probably fail in business validation
      expect(result.isValid).toBe(true); // Currently no business validation for negative values
    });
  });

  describe('Clinic Plan Limits Validation', () => {
    it('should accept single clinic (maximum allowed)', async () => {
      const singleClinicData = {
        ...validClinicPlanData,
        clinics: [
          {
            name: 'Single Clinic',
            capacity: { maxPatients: 100, sessionDuration: 45 }
          }
        ]
      };

      const result = await service.validateOnboardingData(singleClinicData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject multiple clinics', async () => {
      const multipleClinicData = {
        ...validClinicPlanData,
        clinics: [
          {
            name: 'Clinic 1',
            capacity: { maxPatients: 50, sessionDuration: 30 }
          },
          {
            name: 'Clinic 2', // Exceeds limit of 1
            capacity: { maxPatients: 50, sessionDuration: 30 }
          }
        ]
      };

      const result = await service.validateOnboardingData(multipleClinicData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Maximum 1 clinic(s) allowed'))).toBe(true);
    });

    it('should accept maximum allowed departments', async () => {
      const maxDepartmentsData = {
        ...validClinicPlanData,
        departments: Array(10).fill(0).map((_, i) => ({
          name: `Department ${i + 1}`,
          description: `Department ${i + 1} description`
        }))
      };

      const result = await service.validateOnboardingData(maxDepartmentsData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject exceeding department limit', async () => {
      const exceedDeptData = {
        ...validClinicPlanData,
        departments: Array(11).fill(0).map((_, i) => ({ // Exceeds limit of 10
          name: `Department ${i + 1}`
        }))
      };

      const result = await service.validateOnboardingData(exceedDeptData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Maximum 10 department(s) allowed'))).toBe(true);
    });

    it('should accept maximum allowed services', async () => {
      const maxServicesData = {
        ...validClinicPlanData,
        services: Array(50).fill(0).map((_, i) => ({
          name: `Service ${i + 1}`,
          description: `Service ${i + 1} description`,
          durationMinutes: 30,
          price: 100
        }))
      };

      const result = await service.validateOnboardingData(maxServicesData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject exceeding service limit', async () => {
      const exceedServiceData = {
        ...validClinicPlanData,
        services: Array(51).fill(0).map((_, i) => ({ // Exceeds limit of 50
          name: `Service ${i + 1}`,
          durationMinutes: 30,
          price: 100
        }))
      };

      const result = await service.validateOnboardingData(exceedServiceData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Maximum 50 service(s) allowed'))).toBe(true);
    });
  });

  describe('Clinic Plan Entity Creation', () => {
    it('should create clinic without organization or complex reference', async () => {
      await service.completeOnboarding(validClinicPlanData);

      expect(mockClinicService.createClinic).toHaveBeenCalledWith({
        subscriptionId: expect.any(String),
        name: 'Bright Smile Dental Clinic',
        address: 'Prince Sultan Street, Al Khobar, Saudi Arabia',
        googleLocation: '26.2185,50.1974',
        phone: '+966138901234',
        email: 'info@brightsmile-dental.sa',
        licenseNumber: 'DL-BS-2023-001',
        logoUrl: 'https://brightsmile-dental.sa/logo.png',
        website: 'https://brightsmile-dental.sa',
        headDoctorName: 'Dr. Ali Al-Mutairi',
        specialization: 'General and Cosmetic Dentistry',
        pin: 'BS2023',
        capacity: expect.any(Object),
        businessProfile: expect.any(Object),
        legalInfo: expect.any(Object)
      });

      // Should not create organization or complex
      expect(mockOrganizationService.createOrganization).not.toHaveBeenCalled();
      expect(mockComplexService.createComplex).not.toHaveBeenCalled();
    });

    it('should create services when provided', async () => {
      const clinicWithServices = {
        ...validClinicPlanData,
        services: [
          {
            name: 'Dental Checkup',
            description: 'Regular dental examination',
            durationMinutes: 30,
            price: 150
          },
          {
            name: 'Teeth Whitening',
            description: 'Professional teeth whitening',
            durationMinutes: 60,
            price: 400
          }
        ]
      };

      await service.completeOnboarding(clinicWithServices);

      expect(mockServiceService.createService).toHaveBeenCalledTimes(2);
      expect(mockServiceService.createService).toHaveBeenCalledWith({
        name: 'Dental Checkup',
        description: 'Regular dental examination',
        durationMinutes: 30,
        price: 150
      });
      expect(mockServiceService.createService).toHaveBeenCalledWith({
        name: 'Teeth Whitening',
        description: 'Professional teeth whitening',
        durationMinutes: 60,
        price: 400
      });
    });

    it('should create user access with clinic plan permissions', async () => {
      await service.completeOnboarding(validClinicPlanData);

      expect(mockUserAccessService.createUserAccess).toHaveBeenCalledWith(
        expect.any(String), // userId
        'clinic',           // entityType
        expect.any(String), // entityId
        UserRole.OWNER     // role
      );
    });

    it('should handle clinic creation with minimal data', async () => {
      const minimalClinicData = {
        ...validClinicPlanData,
        clinics: [
          {
            name: 'Minimal Clinic',
            capacity: { maxPatients: 30, sessionDuration: 30 }
          }
        ],
        services: undefined,
        workingHours: undefined,
        contacts: undefined
      };

      await service.completeOnboarding(minimalClinicData);

      expect(mockClinicService.createClinic).toHaveBeenCalledWith({
        subscriptionId: expect.any(String),
        name: 'Minimal Clinic',
        capacity: { maxPatients: 30, sessionDuration: 30 }
      });
    });
  });

  describe('Clinic Plan Working Hours', () => {
    it('should validate clinic working hours without hierarchy', async () => {
      const clinicWithWorkingHours = {
        ...validClinicPlanData,
        workingHours: [
          {
            dayOfWeek: 'sunday',
            isWorkingDay: true,
            openingTime: '09:00',
            closingTime: '18:00',
            breakStartTime: '13:00',
            breakEndTime: '14:30'
          },
          {
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '09:00',
            closingTime: '18:00',
            breakStartTime: '13:00',
            breakEndTime: '14:30'
          },
          {
            dayOfWeek: 'friday',
            isWorkingDay: false
          },
          {
            dayOfWeek: 'saturday',
            isWorkingDay: true,
            openingTime: '10:00',
            closingTime: '16:00'
          }
        ]
      };

      const result = await service.validateOnboardingData(clinicWithWorkingHours);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate clinic working hours with all days of week', async () => {
      const clinicWithFullWeek = {
        ...validClinicPlanData,
        workingHours: [
          { dayOfWeek: 'sunday', isWorkingDay: true, openingTime: '09:00', closingTime: '17:00' },
          { dayOfWeek: 'monday', isWorkingDay: true, openingTime: '09:00', closingTime: '17:00' },
          { dayOfWeek: 'tuesday', isWorkingDay: true, openingTime: '09:00', closingTime: '17:00' },
          { dayOfWeek: 'wednesday', isWorkingDay: true, openingTime: '09:00', closingTime: '17:00' },
          { dayOfWeek: 'thursday', isWorkingDay: true, openingTime: '09:00', closingTime: '17:00' },
          { dayOfWeek: 'friday', isWorkingDay: false },
          { dayOfWeek: 'saturday', isWorkingDay: true, openingTime: '10:00', closingTime: '16:00' }
        ]
      };

      const result = await service.validateOnboardingData(clinicWithFullWeek);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject duplicate days in working hours', async () => {
      const clinicWithDuplicateDays = {
        ...validClinicPlanData,
        workingHours: [
          { dayOfWeek: 'monday', isWorkingDay: true, openingTime: '09:00', closingTime: '17:00' },
          { dayOfWeek: 'monday', isWorkingDay: false } // Duplicate
        ]
      };

      const result = await service.validateOnboardingData(clinicWithDuplicateDays);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Duplicate days found'))).toBe(true);
    });

    it('should reject invalid day names', async () => {
      const clinicWithInvalidDay = {
        ...validClinicPlanData,
        workingHours: [
          { dayOfWeek: 'invalidday', isWorkingDay: true, openingTime: '09:00', closingTime: '17:00' }
        ]
      };

      const result = await service.validateOnboardingData(clinicWithInvalidDay);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Invalid day'))).toBe(true);
    });

    it('should reject working day without times', async () => {
      const clinicWithMissingTimes = {
        ...validClinicPlanData,
        workingHours: [
          { dayOfWeek: 'monday', isWorkingDay: true } // Missing opening and closing times
        ]
      };

      const result = await service.validateOnboardingData(clinicWithMissingTimes);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => 
        error.includes('Opening and closing times required')
      )).toBe(true);
    });

    it('should validate non-working day without times', async () => {
      const clinicWithNonWorkingDay = {
        ...validClinicPlanData,
        workingHours: [
          { dayOfWeek: 'friday', isWorkingDay: false } // No times needed
        ]
      };

      const result = await service.validateOnboardingData(clinicWithNonWorkingDay);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Clinic Plan Business Profile Validation', () => {
    it('should validate clinic business profile', async () => {
      const clinicWithProfile = {
        ...validClinicPlanData,
        clinics: [
          {
            name: 'Advanced Dental Clinic',
            capacity: { maxPatients: 60, sessionDuration: 45 },
            businessProfile: {
              yearEstablished: 2020,
              mission: 'Providing exceptional dental care with modern technology',
              vision: 'Leading dental practice in the region',
              ceoName: 'Dr. Ahmed Al-Rashid'
            },
            legalInfo: {
              vatNumber: '300555666777003',
              crNumber: '3070555666'
            }
          }
        ]
      };

      const result = await service.validateOnboardingData(clinicWithProfile);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid business profile data', async () => {
      const clinicWithInvalidProfile = {
        ...validClinicPlanData,
        clinics: [
          {
            name: 'Test Clinic',
            capacity: { maxPatients: 50, sessionDuration: 30 },
            businessProfile: {
              yearEstablished: 1800, // Too early
              mission: 'A'.repeat(1001), // Too long
              ceoName: 'B'.repeat(256) // Too long
            },
            legalInfo: {
              vatNumber: 'invalid_vat',
              crNumber: 'invalid_cr'
            }
          }
        ]
      };

      const result = await service.validateOnboardingData(clinicWithInvalidProfile);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle clinic without business profile', async () => {
      const clinicWithoutProfile = {
        ...validClinicPlanData,
        clinics: [
          {
            name: 'Simple Clinic',
            capacity: { maxPatients: 40, sessionDuration: 30 }
            // No business profile or legal info
          }
        ]
      };

      const result = await service.validateOnboardingData(clinicWithoutProfile);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Clinic Plan Edge Cases', () => {
    it('should handle clinic with minimal required fields', async () => {
      const minimalClinic = {
        ...validClinicPlanData,
        clinics: [
          {
            name: 'Minimal Clinic',
            capacity: { maxPatients: 20, sessionDuration: 30 }
          }
        ],
        services: undefined,
        workingHours: undefined,
        contacts: undefined
      };

      const result = await service.validateOnboardingData(minimalClinic);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle Arabic clinic data', async () => {
      const arabicClinicData = {
        ...validClinicPlanData,
        clinics: [
          {
            name: 'عيادة الابتسامة المشرقة',
            address: 'شارع الأمير سلطان، الخبر، المملكة العربية السعودية',
            headDoctorName: 'د. علي المطيري',
            specialization: 'طب الأسنان العام والتجميلي',
            capacity: {
              maxStaff: 8,
              maxDoctors: 3,
              maxPatients: 50,
              sessionDuration: 45
            },
            businessProfile: {
              yearEstablished: 2020,
              mission: 'تقديم رعاية أسنان استثنائية مع راحة المريض',
              vision: 'عيادة الأسنان الرائدة في المنطقة الشرقية'
            }
          }
        ],
        services: [
          {
            name: 'تنظيف الأسنان',
            description: 'تنظيف احترافي للأسنان',
            durationMinutes: 45,
            price: 200
          }
        ]
      };

      const result = await service.validateOnboardingData(arabicClinicData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle special characters in clinic data', async () => {
      const specialCharsClinic = {
        ...validClinicPlanData,
        clinics: [
          {
            name: 'Bright Smile Dental Clinic ™ © ®',
            email: 'info+appointments@brightsmile-dental.co.uk',
            website: 'https://brightsmile-dental.sa/?ref=onboarding&utm_source=test',
            pin: 'BS-2023!@#',
            capacity: { maxPatients: 50, sessionDuration: 30 }
          }
        ],
        services: [
          {
            name: 'Service-1 (Premium)',
            description: 'Service_1 [Advanced] with {Special} characters',
            durationMinutes: 30,
            price: 200
          }
        ]
      };

      const result = await service.validateOnboardingData(specialCharsClinic);
      expect(result.isValid).toBe(true);
    });

    it('should handle very long clinic names and descriptions', async () => {
      const longDataClinic = {
        ...validClinicPlanData,
        clinics: [
          {
            name: 'A'.repeat(500), // Very long name
            address: 'B'.repeat(1000), // Very long address
            specialization: 'C'.repeat(300), // Very long specialization
            capacity: { maxPatients: 50, sessionDuration: 30 }
          }
        ]
      };

      const result = await service.validateOnboardingData(longDataClinic);
      expect(result.isValid).toBe(true);
    });

    it('should handle clinic with complex department reference (edge case)', async () => {
      const clinicWithComplexDept = {
        ...validClinicPlanData,
        clinics: [
          {
            name: 'Specialized Clinic',
            complexDepartmentId: 'complex_dept_123',
            capacity: { maxPatients: 40, sessionDuration: 30 }
          }
        ]
      };

      const result = await service.validateOnboardingData(clinicWithComplexDept);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle various capacity edge cases', async () => {
      const capacityEdgeCases = [
        { maxPatients: 1, sessionDuration: 1 }, // Minimum values
        { maxPatients: 1000, sessionDuration: 480 }, // Large values
        { maxStaff: 100, maxDoctors: 50, maxPatients: 500, sessionDuration: 120 } // All fields with large values
      ];

      for (const capacity of capacityEdgeCases) {
        const clinicData = {
          ...validClinicPlanData,
          clinics: [
            {
              name: 'Edge Case Clinic',
              capacity
            }
          ]
        };

        const result = await service.validateOnboardingData(clinicData);
        expect(result.isValid).toBe(true);
      }
    });

    it('should handle empty service arrays', async () => {
      const clinicWithEmptyServices = {
        ...validClinicPlanData,
        services: []
      };

      const result = await service.validateOnboardingData(clinicWithEmptyServices);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle services with various pricing', async () => {
      const clinicWithVariedServices = {
        ...validClinicPlanData,
        services: [
          { name: 'Free Consultation', durationMinutes: 15, price: 0 },
          { name: 'Basic Service', durationMinutes: 30, price: 100 },
          { name: 'Premium Service', durationMinutes: 90, price: 1000 },
          { name: 'Service without price', durationMinutes: 45 } // No price
        ]
      };

      const result = await service.validateOnboardingData(clinicWithVariedServices);
      expect(result.isValid).toBe(true);
    });

    it('should handle mixed working day patterns', async () => {
      const clinicWithMixedSchedule = {
        ...validClinicPlanData,
        workingHours: [
          { dayOfWeek: 'sunday', isWorkingDay: true, openingTime: '08:00', closingTime: '20:00' }, // Long day
          { dayOfWeek: 'monday', isWorkingDay: true, openingTime: '09:00', closingTime: '13:00' }, // Morning only
          { dayOfWeek: 'tuesday', isWorkingDay: true, openingTime: '15:00', closingTime: '19:00' }, // Afternoon only
          { dayOfWeek: 'wednesday', isWorkingDay: true, openingTime: '10:00', closingTime: '16:00', breakStartTime: '12:00', breakEndTime: '14:00' }, // With long break
          { dayOfWeek: 'thursday', isWorkingDay: false }, // Closed
          { dayOfWeek: 'friday', isWorkingDay: false }, // Closed
          { dayOfWeek: 'saturday', isWorkingDay: true, openingTime: '11:00', closingTime: '15:00' } // Short day
        ]
      };

      const result = await service.validateOnboardingData(clinicWithMixedSchedule);
      expect(result.isValid).toBe(true);
    });
  });
});

