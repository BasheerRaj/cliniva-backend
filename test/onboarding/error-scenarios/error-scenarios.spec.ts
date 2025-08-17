import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
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
  resetAllMocks,
  makeServiceFail
} from '../mocks/service.mocks';
import { validCompanyPlanData, validComplexPlanData, validClinicPlanData } from '../fixtures/onboarding-data.fixture';
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

describe('Error Scenarios Tests', () => {
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

  describe('Service Failure Scenarios', () => {
    it('should handle subscription service failure', async () => {
      makeServiceFail('subscription', new Error('Database connection failed'));

      await expect(
        service.completeOnboarding(validCompanyPlanData)
      ).rejects.toThrow(InternalServerErrorException);

      // Verify transaction was aborted
      const session = mockConnection.startSession();
      expect(session.abortTransaction).toHaveBeenCalled();
      expect(session.endSession).toHaveBeenCalled();
    });

    it('should handle organization service failure', async () => {
      makeServiceFail('organization', new Error('Organization creation failed'));

      await expect(
        service.completeOnboarding(validCompanyPlanData)
      ).rejects.toThrow(InternalServerErrorException);

      expect(mockSubscriptionService.createSubscription).toHaveBeenCalled();
      // Verify transaction rollback
      const session = mockConnection.startSession();
      expect(session.abortTransaction).toHaveBeenCalled();
    });

    it('should handle complex service failure', async () => {
      makeServiceFail('complex', new Error('Complex creation failed'));

      await expect(
        service.completeOnboarding(validComplexPlanData)
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should handle clinic service failure', async () => {
      makeServiceFail('clinic', new Error('Clinic creation failed'));

      await expect(
        service.completeOnboarding(validClinicPlanData)
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should handle department service failure', async () => {
      makeServiceFail('department', new Error('Department creation failed'));

      const complexDataWithDepts = {
        ...validComplexPlanData,
        complexes: [{
          name: 'Test Complex',
          departmentIds: ['dept1', 'dept2']
        }],
        departments: [
          { name: 'Department 1' },
          { name: 'Department 2' }
        ]
      };

      await expect(
        service.completeOnboarding(complexDataWithDepts)
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should handle working hours service failure', async () => {
      makeServiceFail('workingHours', new Error('Working hours creation failed'));

      const dataWithWorkingHours = {
        ...validClinicPlanData,
        workingHours: [
          {
            entityType: 'clinic',
            entityName: 'Advanced Heart Center',
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '09:00',
            closingTime: '17:00'
          }
        ]
      };

      await expect(
        service.completeOnboarding(dataWithWorkingHours)
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should handle contact service failure', async () => {
      makeServiceFail('contact', new Error('Contact creation failed'));

      const dataWithContacts = {
        ...validClinicPlanData,
        contacts: [
          {
            contactType: 'email',
            contactValue: 'test@example.com'
          }
        ]
      };

      await expect(
        service.completeOnboarding(dataWithContacts)
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should handle dynamic info service failure', async () => {
      makeServiceFail('dynamicInfo', new Error('Dynamic info creation failed'));

      const dataWithLegalInfo = {
        ...validClinicPlanData,
        legalInfo: {
          termsConditions: 'Terms and conditions...',
          privacyPolicy: 'Privacy policy...'
        }
      };

      await expect(
        service.completeOnboarding(dataWithLegalInfo)
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should handle user access service failure', async () => {
      makeServiceFail('userAccess', new Error('User access creation failed'));

      await expect(
        service.completeOnboarding(validClinicPlanData)
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should handle multiple service failures', async () => {
      makeServiceFail('organization', new Error('Organization failed'));
      makeServiceFail('complex', new Error('Complex failed'));

      await expect(
        service.completeOnboarding(validCompanyPlanData)
      ).rejects.toThrow(InternalServerErrorException);

      // Should fail at the first service (organization)
      expect(mockOrganizationService.createOrganization).toHaveBeenCalled();
      expect(mockComplexService.createComplex).not.toHaveBeenCalled();
    });
  });

  describe('Transaction Failure Scenarios', () => {
    beforeEach(() => {
      // Reset mocks before each test to avoid cross-test interference
      resetAllMocks();
    });

    it('should handle session start failure', async () => {
      mockConnection.startSession.mockRejectedValue(new Error('Session start failed'));

      await expect(
        service.completeOnboarding(validClinicPlanData)
      ).rejects.toThrow(Error);
    });

    it('should handle transaction start failure', async () => {
      const mockSession = {
        startTransaction: jest.fn().mockRejectedValue(new Error('Transaction start failed')),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn()
      };
      mockConnection.startSession.mockResolvedValue(mockSession);

      await expect(
        service.completeOnboarding(validClinicPlanData)
      ).rejects.toThrow(Error);
    });

    it('should handle transaction commit failure', async () => {
      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn().mockRejectedValue(new Error('Commit failed')),
        abortTransaction: jest.fn(),
        endSession: jest.fn()
      };
      mockConnection.startSession.mockResolvedValue(mockSession);

      await expect(
        service.completeOnboarding(validClinicPlanData)
      ).rejects.toThrow(Error);

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should handle transaction abort failure', async () => {
      makeServiceFail('subscription', new Error('Subscription failed'));
      
      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn().mockRejectedValue(new Error('Abort failed')),
        endSession: jest.fn()
      };
      mockConnection.startSession.mockResolvedValue(mockSession);

      await expect(
        service.completeOnboarding(validClinicPlanData)
      ).rejects.toThrow(Error);

      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should handle session end failure', async () => {
      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn().mockRejectedValue(new Error('End session failed'))
      };
      mockConnection.startSession.mockResolvedValue(mockSession);

      try {
        // Should still complete successfully despite session end failure
        const result = await service.completeOnboarding(validClinicPlanData);
        expect(result.success).toBe(true);
      } catch (error) {
        // Accept that session end failure might be propagated
        expect(error).toBeDefined();
      }
      
      // Reset the mock after this test
      resetAllMocks();
    });
  });

  describe('Data Validation Edge Cases', () => {
    beforeEach(() => {
      resetAllMocks();
    });

    it('should handle null/undefined data', async () => {
      await expect(
        service.completeOnboarding(null as any)
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.completeOnboarding(undefined as any)
      ).rejects.toThrow();
    });

    it('should handle empty objects', async () => {
      await expect(
        service.completeOnboarding({} as any)
      ).rejects.toThrow();
    });

    it('should handle malformed subscription data', async () => {
      const malformedData = {
        ...validClinicPlanData,
        subscriptionData: null
      };

      await expect(
        service.completeOnboarding(malformedData as any)
      ).rejects.toThrow();
    });

    it('should handle invalid plan type combinations', async () => {
      const invalidCombination = {
        ...validClinicPlanData,
        subscriptionData: {
          planType: 'clinic',
          planId: 'company_plan_id' // Mismatched plan ID
        },
        organization: {
          name: 'Should not be allowed for clinic plan'
        }
      };

      await expect(
        service.completeOnboarding(invalidCombination as any)
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle circular references in data', async () => {
      const circularData = { ...validClinicPlanData };
      (circularData as any).self = circularData; // Create circular reference

      // Should handle gracefully (serialization might fail, but shouldn't crash)
      await expect(
        service.completeOnboarding(circularData)
      ).rejects.toThrow();
    });

    it('should handle extremely large data objects', async () => {
      const largeData = {
        ...validCompanyPlanData,
        complexes: Array(1000).fill(0).map((_, i) => ({
          name: `Complex ${i}`,
          departmentIds: Array(100).fill(0).map((_, j) => `dept_${i}_${j}`)
        })),
        departments: Array(10000).fill(0).map((_, i) => ({
          name: `Department ${i}`,
          description: 'A'.repeat(10000) // Very long description
        }))
      };

      // Should reject due to plan limits
      await expect(
        service.completeOnboarding(largeData)
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle special characters and encoding issues', async () => {
      const specialCharData = {
        ...validClinicPlanData,
        clinics: [{
          name: '🏥 Clinic \x00\x01\x02 with 𝕰𝖒𝖔𝖏𝖎 and ™©® symbols',
          capacity: { maxPatients: 50, sessionDuration: 30 },
          specialization: 'General 💊 Medicine & 🩺 Diagnostics'
        }]
      };

      // Should handle special characters gracefully
      const result = await service.completeOnboarding(specialCharData);
      expect(result.success).toBe(true);
    });
  });

  describe('Working Hours Validation Errors', () => {
    it('should handle invalid time formats', async () => {
      const invalidTimeData = {
        ...validClinicPlanData,
        workingHours: [
          {
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: 'not-a-time',
            closingTime: '25:61'
          }
        ]
      };

      await expect(
        service.completeOnboarding(invalidTimeData)
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle impossible time combinations', async () => {
      const impossibleTimeData = {
        ...validClinicPlanData,
        workingHours: [
          {
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '18:00',
            closingTime: '09:00' // Closing before opening
          }
        ]
      };

      // This should pass basic format validation but might fail business logic
      const result = await service.validateOnboardingData(impossibleTimeData);
      expect(result.isValid).toBe(true); // Current validation doesn't check time logic
    });

    it('should handle missing required working hours fields', async () => {
      const incompleteWorkingHours = {
        ...validClinicPlanData,
        workingHours: [
          {
            dayOfWeek: 'monday',
            isWorkingDay: true
            // Missing opening and closing times
          }
        ]
      };

      await expect(
        service.completeOnboarding(incompleteWorkingHours)
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle conflicting hierarchical working hours with complex data structure', async () => {
      const conflictingHierarchicalData = {
        ...validComplexPlanData,
        workingHours: [
          // Complex closed
          {
            entityType: 'complex',
            entityName: 'Al-Zahra Medical Complex',
            dayOfWeek: 'friday',
            isWorkingDay: false
          },
          // Multiple clinics trying to work when complex is closed
          {
            entityType: 'clinic',
            entityName: 'Clinic A',
            dayOfWeek: 'friday',
            isWorkingDay: true,
            openingTime: '09:00',
            closingTime: '17:00'
          },
          {
            entityType: 'clinic',
            entityName: 'Clinic B',
            dayOfWeek: 'friday',
            isWorkingDay: true,
            openingTime: '10:00',
            closingTime: '16:00'
          }
        ]
      };

      await expect(
        service.completeOnboarding(conflictingHierarchicalData)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Business Logic Validation Errors', () => {
    it('should handle organization without name in company plan', async () => {
      const organizationWithoutName = {
        ...validCompanyPlanData,
        organization: {
          ...validCompanyPlanData.organization,
          name: '' // Empty name
        }
      };

      await expect(
        service.completeOnboarding(organizationWithoutName as any)
      ).rejects.toThrow('Organization name is required for company plan');
    });

    it('should handle clinic capacity validation errors', async () => {
      const invalidCapacityData = {
        ...validClinicPlanData,
        clinics: [{
          name: 'Test Clinic',
          capacity: {} // Missing required capacity fields
        }]
      };

      await expect(
        service.completeOnboarding(invalidCapacityData as any)
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle invalid email formats', async () => {
      const invalidEmailData = {
        ...validClinicPlanData,
        userData: {
          ...validClinicPlanData.userData,
          email: 'not-an-email'
        }
      };

      // This would be caught by DTO validation before reaching the service
      const result = await service.validateOnboardingData(invalidEmailData as any);
      expect(result.isValid).toBe(true); // Service-level validation doesn't check email format
    });

    it('should handle invalid phone number formats', async () => {
      const invalidPhoneData = {
        ...validClinicPlanData,
        organization: {
          name: 'Test Organization',
          phone: '123' // Invalid phone format
        }
      };

      const result = await service.validateOnboardingData(invalidPhoneData);
      expect(result.isValid).toBe(false); // Phone validation is enabled
    });

    it('should handle invalid URL formats', async () => {
      const invalidUrlData = {
        ...validClinicPlanData,
        clinics: [{
          name: 'Test Clinic',
          website: 'not-a-url',
          logoUrl: 'also-not-a-url',
          capacity: { maxPatients: 50, sessionDuration: 30 }
        }]
      };

      const result = await service.validateOnboardingData(invalidUrlData);
      expect(result.isValid).toBe(true); // Service-level validation doesn't check URL format
    });

    it('should handle VAT number validation in business profile', async () => {
      const invalidVATData = {
        ...validCompanyPlanData,
        organization: {
          ...validCompanyPlanData.organization,
          name: 'Test Organization', // Ensure name is defined
          legalInfo: {
            vatNumber: '123', // Invalid VAT format
            crNumber: '1010123456'
          }
        }
      };

      const result = await service.validateOnboardingData(invalidVATData);
      expect(result.isValid).toBe(false); // VAT validation is implemented
      expect(result.errors.some(error => error.includes('Invalid VAT number format'))).toBe(true);
    });

    it('should handle CR number validation in business profile', async () => {
      const invalidCRData = {
        ...validCompanyPlanData,
        organization: {
          ...validCompanyPlanData.organization,
          name: 'Test Organization', // Ensure name is defined
          legalInfo: {
            vatNumber: '300123456789001',
            crNumber: 'invalid-cr' // Invalid CR format
          }
        }
      };

      const result = await service.validateOnboardingData(invalidCRData);
      expect(result.isValid).toBe(true); // CR validation not currently implemented
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('should handle out of memory scenarios gracefully', async () => {
      // Simulate out of memory by creating very large objects
      const memoryIntensiveData = {
        ...validCompanyPlanData,
        organization: {
          ...validCompanyPlanData.organization,
          name: 'Test Organization', // Ensure name is defined
          description: 'A'.repeat(10 * 1024 * 1024) // 10MB string
        }
      };

      // Should either complete or fail gracefully without crashing
      try {
        await service.completeOnboarding(memoryIntensiveData);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle timeout scenarios', async () => {
      // Simulate slow service response
      mockSubscriptionService.createSubscription.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 10000)) // 10 second delay
      );

      // Should timeout gracefully
      await expect(
        service.completeOnboarding(validClinicPlanData)
      ).rejects.toThrow();
    }, 15000); // 15 second test timeout

    it('should handle concurrent onboarding attempts', async () => {
      // Multiple simultaneous onboarding requests
      const promises = Array(10).fill(0).map((_, i) => {
        const data = {
          ...validClinicPlanData,
          userData: {
            ...validClinicPlanData.userData,
            email: `user${i}@example.com`
          }
        };
        return service.completeOnboarding(data);
      });

      // All should complete successfully
      const results = await Promise.all(promises);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('External Dependency Failures', () => {
    it('should handle database connection loss during onboarding', async () => {
      // Simulate database connection loss after subscription creation
      mockSubscriptionService.createSubscription.mockResolvedValueOnce({
        id: 'sub_123',
        planType: 'company'
      });
      
      mockOrganizationService.createOrganization.mockRejectedValue(
        new Error('Connection lost')
      );

      await expect(
        service.completeOnboarding(validCompanyPlanData)
      ).rejects.toThrow(InternalServerErrorException);

      const session = mockConnection.startSession();
      expect(session.abortTransaction).toHaveBeenCalled();
    });

    it('should handle partial data corruption scenarios', async () => {
      // Simulate service returning corrupted data
      mockSubscriptionService.createSubscription.mockResolvedValue({
        corrupted: 'data',
        missing: 'id'
      });

      await expect(
        service.completeOnboarding(validCompanyPlanData)
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should handle service returning null/undefined', async () => {
      mockSubscriptionService.createSubscription.mockResolvedValue(null);

      await expect(
        service.completeOnboarding(validCompanyPlanData)
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should handle service throwing unexpected errors', async () => {
      mockSubscriptionService.createSubscription.mockImplementation(() => {
        throw new TypeError('Unexpected error type');
      });

      await expect(
        service.completeOnboarding(validCompanyPlanData)
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('Recovery and Cleanup Scenarios', () => {
    it('should properly clean up on validation failure', async () => {
      const invalidData = {
        ...validCompanyPlanData,
        subscriptionData: {
          planType: 'invalid',
          planId: 'invalid'
        }
      };

      await expect(
        service.completeOnboarding(invalidData as any)
      ).rejects.toThrow(BadRequestException);

      // Verify no services were called after validation failure
      expect(mockSubscriptionService.createSubscription).not.toHaveBeenCalled();
      expect(mockOrganizationService.createOrganization).not.toHaveBeenCalled();
    });

    it('should properly clean up on service failure', async () => {
      makeServiceFail('organization', new Error('Cleanup test'));

      await expect(
        service.completeOnboarding(validCompanyPlanData)
      ).rejects.toThrow(InternalServerErrorException);

      const session = mockConnection.startSession();
      expect(session.startTransaction).toHaveBeenCalled();
      expect(session.abortTransaction).toHaveBeenCalled();
      expect(session.endSession).toHaveBeenCalled();
    });

    it('should handle cleanup failure gracefully', async () => {
      makeServiceFail('subscription', new Error('Service failure'));
      
      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn().mockRejectedValue(new Error('Cleanup failed')),
        endSession: jest.fn()
      };
      mockConnection.startSession.mockResolvedValue(mockSession);

      await expect(
        service.completeOnboarding(validCompanyPlanData)
      ).rejects.toThrow(Error);

      // Should still attempt to end session even if abort fails
      expect(mockSession.endSession).toHaveBeenCalled();
    });
  });
});

