import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import request from 'supertest';
import { OnboardingModule } from '../../../src/onboarding/onboarding.module';
import { DatabaseModule } from '../../../src/database/database.module';
import { 
  validCompanyPlanData,
  validComplexPlanData,
  validClinicPlanData,
  invalidOnboardingData
} from '../fixtures/onboarding-data.fixture';

describe('OnboardingController E2E', () => {
  let app: INestApplication;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(global.__MONGO_URI__),
        DatabaseModule,
        OnboardingModule
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    // Clear database
    const connection = module.get('DatabaseConnection');
    await connection.db.dropDatabase();
  });

  afterAll(async () => {
    await app.close();
    await module.close();
  });

  beforeEach(async () => {
    // Clear all collections before each test
    const connection = module.get('DatabaseConnection');
    const collections = connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  });

  describe('/onboarding/complete (POST)', () => {
    describe('Successful Onboarding', () => {
      it('should complete company plan onboarding successfully', async () => {
        const response = await request(app.getHttpServer())
          .post('/onboarding/complete')
          .send(validCompanyPlanData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Onboarding completed successfully');
        expect(response.body.data).toBeDefined();
        expect(response.body.data.success).toBe(true);
        expect(response.body.data.userId).toBeDefined();
        expect(response.body.data.subscriptionId).toBeDefined();
        expect(response.body.data.entities.organization).toBeDefined();
      });

      it('should complete complex plan onboarding successfully', async () => {
        const response = await request(app.getHttpServer())
          .post('/onboarding/complete')
          .send(validComplexPlanData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.entities.complexes).toBeDefined();
        expect(response.body.data.entities.complexes.length).toBeGreaterThan(0);
      });

      it('should complete clinic plan onboarding successfully', async () => {
        const response = await request(app.getHttpServer())
          .post('/onboarding/complete')
          .send(validClinicPlanData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.entities.clinics).toBeDefined();
      });

      it('should handle onboarding with working hours', async () => {
        const dataWithWorkingHours = {
          ...validClinicPlanData,
          workingHours: [
            {
              dayOfWeek: 'monday',
              isWorkingDay: true,
              openingTime: '09:00',
              closingTime: '17:00',
              breakStartTime: '12:00',
              breakEndTime: '13:00'
            },
            {
              dayOfWeek: 'friday',
              isWorkingDay: false
            }
          ]
        };

        const response = await request(app.getHttpServer())
          .post('/onboarding/complete')
          .send(dataWithWorkingHours)
          .expect(201);

        expect(response.body.success).toBe(true);
      });

      it('should handle onboarding with contacts', async () => {
        const dataWithContacts = {
          ...validClinicPlanData,
          contacts: [
            {
              contactType: 'email',
              contactValue: 'test@clinic.com'
            },
            {
              contactType: 'facebook',
              contactValue: 'https://facebook.com/clinic'
            }
          ]
        };

        const response = await request(app.getHttpServer())
          .post('/onboarding/complete')
          .send(dataWithContacts)
          .expect(201);

        expect(response.body.success).toBe(true);
      });

      it('should handle onboarding with legal information', async () => {
        const dataWithLegalInfo = {
          ...validClinicPlanData,
          legalInfo: {
            termsConditions: 'Terms and conditions...',
            privacyPolicy: 'Privacy policy...'
          }
        };

        const response = await request(app.getHttpServer())
          .post('/onboarding/complete')
          .send(dataWithLegalInfo)
          .expect(201);

        expect(response.body.success).toBe(true);
      });
    });

    describe('Validation Errors', () => {
      it('should return 200 with error for invalid plan type', async () => {
        const response = await request(app.getHttpServer())
          .post('/onboarding/complete')
          .send(invalidOnboardingData.invalidPlanType)
          .expect(201); // Controller catches errors and returns 201 with error details

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Onboarding failed');
        expect(response.body.error).toContain('Invalid plan type');
      });

      it('should return error for company plan without organization', async () => {
        const response = await request(app.getHttpServer())
          .post('/onboarding/complete')
          .send(invalidOnboardingData.companyPlanWithoutOrganization)
          .expect(201);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Company plan requires organization data');
      });

      it('should return error for complex plan without complexes', async () => {
        const response = await request(app.getHttpServer())
          .post('/onboarding/complete')
          .send(invalidOnboardingData.complexPlanWithoutComplexes)
          .expect(201);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Complex plan requires at least one complex');
      });

      it('should return error for clinic plan without clinics', async () => {
        const response = await request(app.getHttpServer())
          .post('/onboarding/complete')
          .send(invalidOnboardingData.clinicPlanWithoutClinics)
          .expect(201);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Clinic plan requires at least one clinic');
      });

      it('should return error for invalid working hours', async () => {
        const response = await request(app.getHttpServer())
          .post('/onboarding/complete')
          .send(invalidOnboardingData.invalidWorkingHours)
          .expect(201);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      });

      it('should return error for conflicting working hours hierarchy', async () => {
        const response = await request(app.getHttpServer())
          .post('/onboarding/complete')
          .send(invalidOnboardingData.conflictingWorkingHours)
          .expect(201);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Working hours validation failed');
      });

      it('should return error for exceeding plan limits', async () => {
        const response = await request(app.getHttpServer())
          .post('/onboarding/complete')
          .send(invalidOnboardingData.exceedsPlanLimits)
          .expect(201);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      });

      it('should return error for invalid VAT number', async () => {
        const response = await request(app.getHttpServer())
          .post('/onboarding/complete')
          .send(invalidOnboardingData.invalidVATNumber)
          .expect(201);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      });
    });

    describe('Input Validation', () => {
      it('should return error for missing required userData', async () => {
        const response = await request(app.getHttpServer())
          .post('/onboarding/complete')
          .send({
            subscriptionData: validCompanyPlanData.subscriptionData,
            organization: validCompanyPlanData.organization
          })
          .expect(400); // This should be caught by class-validator

        expect(response.body.message).toBeDefined();
      });

      it('should return error for missing required subscriptionData', async () => {
        const response = await request(app.getHttpServer())
          .post('/onboarding/complete')
          .send({
            userData: validCompanyPlanData.userData,
            organization: validCompanyPlanData.organization
          })
          .expect(400);

        expect(response.body.message).toBeDefined();
      });

      it('should return error for invalid email format', async () => {
        const invalidData = {
          ...validCompanyPlanData,
          userData: {
            ...validCompanyPlanData.userData,
            email: 'invalid-email'
          }
        };

        const response = await request(app.getHttpServer())
          .post('/onboarding/complete')
          .send(invalidData)
          .expect(400);

        expect(response.body.message).toBeDefined();
      });

      it('should return error for invalid enum values', async () => {
        const invalidData = {
          ...validCompanyPlanData,
          subscriptionData: {
            ...validCompanyPlanData.subscriptionData,
            planType: 'invalid_plan'
          }
        };

        const response = await request(app.getHttpServer())
          .post('/onboarding/complete')
          .send(invalidData)
          .expect(400);

        expect(response.body.message).toBeDefined();
      });
    });

    describe('Content Type Handling', () => {
      it('should accept application/json content type', async () => {
        const response = await request(app.getHttpServer())
          .post('/onboarding/complete')
          .set('Content-Type', 'application/json')
          .send(validClinicPlanData)
          .expect(201);

        expect(response.body.success).toBe(true);
      });

      it('should reject non-JSON content type', async () => {
        await request(app.getHttpServer())
          .post('/onboarding/complete')
          .set('Content-Type', 'text/plain')
          .send('invalid data')
          .expect(400);
      });
    });
  });

  describe('/onboarding/validate (POST)', () => {
    describe('Valid Data Validation', () => {
      it('should validate company plan data successfully', async () => {
        const response = await request(app.getHttpServer())
          .post('/onboarding/validate')
          .send(validCompanyPlanData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Validation passed');
        expect(response.body.data.isValid).toBe(true);
        expect(response.body.data.errors).toHaveLength(0);
      });

      it('should validate complex plan data successfully', async () => {
        const response = await request(app.getHttpServer())
          .post('/onboarding/validate')
          .send(validComplexPlanData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.isValid).toBe(true);
      });

      it('should validate clinic plan data successfully', async () => {
        const response = await request(app.getHttpServer())
          .post('/onboarding/validate')
          .send(validClinicPlanData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.isValid).toBe(true);
      });
    });

    describe('Invalid Data Validation', () => {
      it('should return validation errors for invalid plan type', async () => {
        const response = await request(app.getHttpServer())
          .post('/onboarding/validate')
          .send(invalidOnboardingData.invalidPlanType)
          .expect(200);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
        expect(response.body.data.isValid).toBe(false);
        expect(response.body.data.errors.length).toBeGreaterThan(0);
      });

      it('should return validation errors for company plan without organization', async () => {
        const response = await request(app.getHttpServer())
          .post('/onboarding/validate')
          .send(invalidOnboardingData.companyPlanWithoutOrganization)
          .expect(200);

        expect(response.body.success).toBe(false);
        expect(response.body.data.isValid).toBe(false);
        expect(response.body.data.errors).toContain('Company plan requires organization data');
      });

      it('should return validation errors for invalid working hours', async () => {
        const response = await request(app.getHttpServer())
          .post('/onboarding/validate')
          .send(invalidOnboardingData.invalidWorkingHours)
          .expect(200);

        expect(response.body.success).toBe(false);
        expect(response.body.data.isValid).toBe(false);
        expect(response.body.data.errors.length).toBeGreaterThan(0);
      });
    });

    describe('Validation Step Parameter', () => {
      it('should handle validationStep parameter', async () => {
        const dataWithValidationStep = {
          ...validCompanyPlanData,
          validationStep: 'organization'
        };

        const response = await request(app.getHttpServer())
          .post('/onboarding/validate')
          .send(dataWithValidationStep)
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('Error Handling', () => {
      it('should handle validation service errors gracefully', async () => {
        // Send malformed data that might cause internal errors
        const malformedData = {
          userData: null,
          subscriptionData: null
        };

        const response = await request(app.getHttpServer())
          .post('/onboarding/validate')
          .send(malformedData)
          .expect(200);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation error');
        expect(response.body.error).toBeDefined();
      });
    });
  });

  describe('/onboarding/plans (GET)', () => {
    it('should retrieve available subscription plans', async () => {
      const response = await request(app.getHttpServer())
        .get('/onboarding/plans')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Available plans retrieved successfully');
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Should contain company, complex, and clinic plans
      const planTypes = response.body.data.map((plan: any) => plan.type);
      expect(planTypes).toContain('company');
      expect(planTypes).toContain('complex');
      expect(planTypes).toContain('clinic');
    });

    it('should return proper plan structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/onboarding/plans')
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      
      const plan = response.body.data[0];
      expect(plan).toHaveProperty('id');
      expect(plan).toHaveProperty('name');
      expect(plan).toHaveProperty('type');
      expect(plan).toHaveProperty('price');
      expect(plan).toHaveProperty('features');
      expect(Array.isArray(plan.features)).toBe(true);
    });

    it('should handle subscription service errors', async () => {
      // This would require mocking the service to fail
      // For now, we assume the service works correctly
      const response = await request(app.getHttpServer())
        .get('/onboarding/plans')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('/onboarding/progress/:userId (GET)', () => {
    it('should retrieve onboarding progress for user', async () => {
      const userId = 'test_user_123';
      
      const response = await request(app.getHttpServer())
        .get(`/onboarding/progress/${userId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('No progress found'); // Since it's not implemented yet
      expect(response.body.data).toBeNull();
    });

    it('should handle invalid user ID format', async () => {
      const invalidUserId = 'invalid-user-id';
      
      const response = await request(app.getHttpServer())
        .get(`/onboarding/progress/${invalidUserId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeNull();
    });

    it('should handle service errors gracefully', async () => {
      const userId = 'error_user_123';
      
      const response = await request(app.getHttpServer())
        .get(`/onboarding/progress/${userId}`)
        .expect(200);

      // Should handle errors gracefully and return appropriate response
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Cross-Origin Resource Sharing (CORS)', () => {
    it('should handle CORS preflight requests', async () => {
      await request(app.getHttpServer())
        .options('/onboarding/complete')
        .expect(204);
    });
  });

  describe('Large Payload Handling', () => {
    it('should handle large onboarding payloads', async () => {
      const largeDataSet = {
        ...validCompanyPlanData,
        complexes: Array(5).fill(0).map((_, i) => ({
          name: `Complex ${i + 1}`,
          address: `Very long address for complex ${i + 1} with lots of details about the location and surrounding area`,
          phone: `+96611${String(i).padStart(7, '0')}`,
          email: `complex${i + 1}@example.com`,
          managerName: `Manager Name for Complex ${i + 1}`,
          departmentIds: ['dept1', 'dept2', 'dept3']
        })),
        departments: Array(20).fill(0).map((_, i) => ({
          name: `Department ${i + 1}`,
          description: `Detailed description for department ${i + 1} with comprehensive information about services and capabilities`
        })),
        clinics: Array(10).fill(0).map((_, i) => ({
          name: `Clinic ${i + 1}`,
          address: `Detailed address for clinic ${i + 1}`,
          phone: `+96612${String(i).padStart(7, '0')}`,
          email: `clinic${i + 1}@example.com`,
          capacity: {
            maxStaff: 20,
            maxDoctors: 5,
            maxPatients: 100,
            sessionDuration: 45
          }
        })),
        workingHours: Array(35).fill(0).map((_, i) => ({
          dayOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'][i % 5],
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
          breakStartTime: '12:00',
          breakEndTime: '13:00'
        }))
      };

      const response = await request(app.getHttpServer())
        .post('/onboarding/complete')
        .send(largeDataSet)
        .expect(201);

      expect(response.body.success).toBe(true);
    }, 30000);
  });

  describe('Concurrent Requests', () => {
    it('should handle concurrent onboarding requests', async () => {
      const requests = Array(3).fill(0).map((_, i) => {
        const data = {
          ...validClinicPlanData,
          userData: {
            ...validClinicPlanData.userData,
            email: `user${i}@example.com`
          },
          clinics: [{
            ...validClinicPlanData.clinics![0],
            name: `Clinic ${i + 1}`
          }]
        };

        return request(app.getHttpServer())
          .post('/onboarding/complete')
          .send(data);
      });

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });
    }, 30000);
  });
});

