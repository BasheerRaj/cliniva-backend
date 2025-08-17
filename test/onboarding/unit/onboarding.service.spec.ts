import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { OnboardingService } from '../../../src/onboarding/onboarding.service';
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
  makeServiceFail
} from '../mocks/service.mocks';
import { 
  validCompanyPlanData,
  validComplexPlanData,
  validClinicPlanData,
  invalidOnboardingData,
  mockServiceResponses
} from '../fixtures/onboarding-data.fixture';

describe('OnboardingService', () => {
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

  describe('validateOnboardingData', () => {
    describe('Valid Data Validation', () => {
      it('should validate valid company plan data', async () => {
        const result = await service.validateOnboardingData(validCompanyPlanData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate valid complex plan data', async () => {
        const result = await service.validateOnboardingData(validComplexPlanData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate valid clinic plan data', async () => {
        const result = await service.validateOnboardingData(validClinicPlanData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Invalid Plan Type Validation', () => {
      it('should reject invalid plan type', async () => {
        const result = await service.validateOnboardingData(invalidOnboardingData.invalidPlanType);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid plan type');
      });
    });

    describe('Plan-Specific Validation', () => {
      it('should reject company plan without organization', async () => {
        const result = await service.validateOnboardingData(invalidOnboardingData.companyPlanWithoutOrganization);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Company plan requires organization data');
      });

      it('should reject complex plan without complexes', async () => {
        const result = await service.validateOnboardingData(invalidOnboardingData.complexPlanWithoutComplexes);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Complex plan requires at least one complex');
      });

      it('should reject clinic plan without clinics', async () => {
        const result = await service.validateOnboardingData(invalidOnboardingData.clinicPlanWithoutClinics);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Clinic plan requires at least one clinic');
      });

      it('should reject clinic plan without capacity', async () => {
        const result = await service.validateOnboardingData(invalidOnboardingData.clinicPlanWithoutCapacity);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Clinic plan requires maximum patient capacity');
        expect(result.errors).toContain('Clinic plan requires default session duration');
      });
    });

    describe('Entity Hierarchy Validation', () => {
      it('should validate entity hierarchy for company plan', async () => {
        const data = {
          ...validCompanyPlanData,
          complexes: [{ name: 'Complex 1' }],
          departments: [] // Should fail - complexes without departments
        };

        const result = await service.validateOnboardingData(data);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid entity hierarchy for selected plan');
      });
    });

    describe('Plan Limits Validation', () => {
      it('should reject exceeding plan limits', async () => {
        const result = await service.validateOnboardingData(invalidOnboardingData.exceedsPlanLimits);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('Maximum 1 clinic(s) allowed'))).toBe(true);
      });
    });

    describe('Working Hours Validation', () => {
      it('should reject invalid working hours format', async () => {
        const result = await service.validateOnboardingData(invalidOnboardingData.invalidWorkingHours);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('Invalid day'))).toBe(true);
      });

      it('should reject conflicting working hours hierarchy', async () => {
        const result = await service.validateOnboardingData(invalidOnboardingData.conflictingWorkingHours);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('Clinic cannot be open on sunday when Complex is closed'))).toBe(true);
      });
    });

    describe('Legal Information Validation', () => {
      it('should reject invalid VAT number', async () => {
        const result = await service.validateOnboardingData(invalidOnboardingData.invalidVATNumber as any);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('Invalid VAT number format'))).toBe(true);
      });
    });
  });

  describe('completeOnboarding', () => {
    describe('Successful Onboarding', () => {
      it('should complete company plan onboarding successfully', async () => {
        const result = await service.completeOnboarding(validCompanyPlanData);

        expect(result.success).toBe(true);
        expect(result.userId).toBeDefined();
        expect(result.subscriptionId).toBeDefined();
        expect(result.entities.organization).toBeDefined();

        // Verify service calls
        expect(mockSubscriptionService.createSubscription).toHaveBeenCalledWith({
          userId: expect.any(String),
          planId: validCompanyPlanData.subscriptionData.planId,
          planType: validCompanyPlanData.subscriptionData.planType
        });
        expect(mockOrganizationService.createOrganization).toHaveBeenCalled();
      });

      it('should complete complex plan onboarding successfully', async () => {
        const result = await service.completeOnboarding(validComplexPlanData);

        expect(result.success).toBe(true);
        expect(result.entities.complexes).toBeDefined();
        expect(result.entities.complexes!.length).toBeGreaterThan(0);

        expect(mockComplexService.createComplex).toHaveBeenCalled();
        expect(mockOrganizationService.createOrganization).not.toHaveBeenCalled();
      });

      it('should complete clinic plan onboarding successfully', async () => {
        const result = await service.completeOnboarding(validClinicPlanData);

        expect(result.success).toBe(true);
        expect(result.entities.clinics).toBeDefined();

        expect(mockClinicService.createClinic).toHaveBeenCalled();
        expect(mockOrganizationService.createOrganization).not.toHaveBeenCalled();
        expect(mockComplexService.createComplex).not.toHaveBeenCalled();
      });
    });

    describe('Transaction Management', () => {
      it('should start and commit transaction on success', async () => {
        await service.completeOnboarding(validCompanyPlanData);

        const session = mockConnection.startSession();
        expect(mockConnection.startSession).toHaveBeenCalled();
        expect(session.startTransaction).toHaveBeenCalled();
        expect(session.commitTransaction).toHaveBeenCalled();
        expect(session.endSession).toHaveBeenCalled();
      });

      it('should abort transaction on validation failure', async () => {
        try {
          await service.completeOnboarding(invalidOnboardingData.invalidPlanType);
        } catch (error) {
          // Expected to throw
        }

        const session = mockConnection.startSession();
        expect(session.abortTransaction).toHaveBeenCalled();
        expect(session.endSession).toHaveBeenCalled();
      });

      it('should abort transaction on service failure', async () => {
        makeServiceFail('subscription', new Error('Subscription service failed'));

        try {
          await service.completeOnboarding(validCompanyPlanData);
        } catch (error) {
          // Expected to throw
        }

        const session = mockConnection.startSession();
        expect(session.abortTransaction).toHaveBeenCalled();
        expect(session.endSession).toHaveBeenCalled();
      });
    });

    describe('Error Handling', () => {
      it('should throw BadRequestException for validation errors', async () => {
        await expect(
          service.completeOnboarding(invalidOnboardingData.invalidPlanType)
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw InternalServerErrorException for service errors', async () => {
        makeServiceFail('subscription', new Error('Database connection failed'));

        await expect(
          service.completeOnboarding(validCompanyPlanData)
        ).rejects.toThrow(InternalServerErrorException);
      });

      it('should handle organization service failure', async () => {
        makeServiceFail('organization', new Error('Organization creation failed'));

        await expect(
          service.completeOnboarding(validCompanyPlanData)
        ).rejects.toThrow(InternalServerErrorException);
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
    });

    describe('Supporting Entities Creation', () => {
      it('should create working hours when provided', async () => {
        const dataWithWorkingHours = {
          ...validClinicPlanData,
          workingHours: [
            {
              entityType: 'clinic',
              entityName: 'Bright Smile Dental Clinic',
              dayOfWeek: 'tuesday',
              isWorkingDay: true,
              openingTime: '09:00',
              closingTime: '17:00'
            }
          ]
        };

        mockClinicService.createClinic.mockResolvedValue({
          ...mockServiceResponses.clinic,
          name: 'Bright Smile Dental Clinic'
        });

        await service.completeOnboarding(dataWithWorkingHours);

        expect(mockWorkingHoursService.createWorkingHours).toHaveBeenCalled();
      });

      it('should create contacts when provided', async () => {
        const dataWithContacts = {
          ...validClinicPlanData,
          contacts: [
            {
              contactType: 'email',
              contactValue: 'test@example.com'
            }
          ]
        };

        await service.completeOnboarding(dataWithContacts);

        expect(mockContactService.createBulkContacts).toHaveBeenCalled();
      });

      it('should create legal documents when provided', async () => {
        const dataWithLegalInfo = {
          ...validClinicPlanData,
          legalInfo: {
            termsConditions: 'Terms and conditions...',
            privacyPolicy: 'Privacy policy...'
          }
        };

        await service.completeOnboarding(dataWithLegalInfo);

        expect(mockDynamicInfoService.createLegalDocuments).toHaveBeenCalled();
      });

      it('should create user access permissions', async () => {
        await service.completeOnboarding(validClinicPlanData);

        expect(mockUserAccessService.createUserAccess).toHaveBeenCalled();
      });

      it('should handle working hours validation failure', async () => {
        const dataWithInvalidWorkingHours = {
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
          service.completeOnboarding(dataWithInvalidWorkingHours)
        ).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe('createEntitiesByPlan', () => {
    describe('Company Plan Entities', () => {
      it('should create organization, complexes, and clinics for company plan', async () => {
        const result = await service.completeOnboarding(validCompanyPlanData);

        expect(result.entities.organization).toBeDefined();
        expect(mockOrganizationService.createOrganization).toHaveBeenCalledWith({
          subscriptionId: expect.any(String),
          name: validCompanyPlanData.organization?.name,
          legalName: validCompanyPlanData.organization?.legalName,
          registrationNumber: validCompanyPlanData.organization?.registrationNumber,
          phone: validCompanyPlanData.organization?.phone,
          email: validCompanyPlanData.organization?.email,
          address: validCompanyPlanData.organization?.address,
          googleLocation: validCompanyPlanData.organization?.googleLocation,
          logoUrl: validCompanyPlanData.organization?.logoUrl,
          website: validCompanyPlanData.organization?.website,
          yearEstablished: validCompanyPlanData.organization?.businessProfile?.yearEstablished,
          mission: validCompanyPlanData.organization?.businessProfile?.mission,
          vision: validCompanyPlanData.organization?.businessProfile?.vision,
          ceoName: validCompanyPlanData.organization?.businessProfile?.ceoName,
          vatNumber: validCompanyPlanData.organization?.legalInfo?.vatNumber,
          crNumber: validCompanyPlanData.organization?.legalInfo?.crNumber
        });
      });

      it('should create complexes with department relationships', async () => {
        await service.completeOnboarding(validCompanyPlanData);

        expect(mockComplexService.createComplex).toHaveBeenCalled();
        expect(mockDepartmentService.createComplexDepartment).toHaveBeenCalled();
      });

      it('should handle company plan without organization name', async () => {
        const invalidData = {
          ...validCompanyPlanData,
          organization: { ...validCompanyPlanData.organization, name: undefined }
        };

        await expect(
          service.completeOnboarding(invalidData as any)
        ).rejects.toThrow('Organization name is required for company plan');
      });
    });

    describe('Complex Plan Entities', () => {
      it('should create complexes for complex plan', async () => {
        await service.completeOnboarding(validComplexPlanData);

        expect(mockComplexService.createComplex).toHaveBeenCalled();
        expect(mockOrganizationService.createOrganization).not.toHaveBeenCalled();
      });
    });

    describe('Clinic Plan Entities', () => {
      it('should create clinics for clinic plan', async () => {
        await service.completeOnboarding(validClinicPlanData);

        expect(mockClinicService.createClinic).toHaveBeenCalled();
        expect(mockOrganizationService.createOrganization).not.toHaveBeenCalled();
        expect(mockComplexService.createComplex).not.toHaveBeenCalled();
      });
    });
  });

  describe('getOnboardingProgress', () => {
    it('should return null (not implemented)', async () => {
      const result = await service.getOnboardingProgress('user_123');
      expect(result).toBeNull();
    });
  });

  describe('Entity ID Handling', () => {
    it('should handle different ID formats from services', async () => {
      // Mock service returning object with _id
      mockOrganizationService.createOrganization.mockResolvedValue({
        _id: 'org_object_id_123',
        name: 'Test Org'
      });

      const result = await service.completeOnboarding(validCompanyPlanData);

      expect(result.entities.organization).toBeDefined();
      expect(mockComplexService.createComplex).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org_object_id_123'
        })
      );
    });

    it('should handle services returning objects with id field', async () => {
      mockOrganizationService.createOrganization.mockResolvedValue({
        id: 'org_regular_id_123',
        name: 'Test Org'
      });

      const result = await service.completeOnboarding(validCompanyPlanData);

      expect(result.entities.organization).toBeDefined();
    });

    it('should handle services returning objects without id field', async () => {
      mockOrganizationService.createOrganization.mockResolvedValue({
        name: 'Test Org'
        // No id or _id field
      });

      const result = await service.completeOnboarding(validCompanyPlanData);

      expect(result.entities.organization).toBeDefined();
      // Should still create complexes even without organization ID
      expect(mockComplexService.createComplex).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty arrays for optional entities', async () => {
      const dataWithEmptyArrays = {
        ...validCompanyPlanData,
        complexes: [],
        clinics: [],
        workingHours: [],
        contacts: []
      };

      const result = await service.completeOnboarding(dataWithEmptyArrays);

      expect(result.success).toBe(true);
      expect(mockComplexService.createComplex).not.toHaveBeenCalled();
      expect(mockClinicService.createClinic).not.toHaveBeenCalled();
    });

    it('should handle undefined optional entities', async () => {
      const dataWithUndefined = {
        ...validCompanyPlanData,
        complexes: undefined,
        clinics: undefined,
        workingHours: undefined,
        contacts: undefined
      };

      const result = await service.completeOnboarding(dataWithUndefined);

      expect(result.success).toBe(true);
    });

    it('should handle very large entity counts within limits', async () => {
      const dataWithManyEntities = {
        ...validCompanyPlanData,
        complexes: Array(10).fill(0).map((_, i) => ({
          name: `Complex ${i + 1}`,
          departmentIds: ['dept1']
        })),
        departments: Array(100).fill(0).map((_, i) => ({
          name: `Department ${i + 1}`
        })),
        clinics: Array(50).fill(0).map((_, i) => ({
          name: `Clinic ${i + 1}`,
          capacity: { maxPatients: 100, sessionDuration: 30 }
        }))
      };

      const result = await service.completeOnboarding(dataWithManyEntities);

      expect(result.success).toBe(true);
      expect(mockComplexService.createComplex).toHaveBeenCalledTimes(10);
      expect(mockClinicService.createClinic).toHaveBeenCalledTimes(50);
    });
  });
});

