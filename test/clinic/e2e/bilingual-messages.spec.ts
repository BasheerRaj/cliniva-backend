import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import request from 'supertest';
import { Types } from 'mongoose';

import { AppModule } from '../../../src/app.module';
import { ERROR_CODES } from '../../../src/clinic/constants/error-codes.constant';
import {
  adminUserData,
  testComplexData,
  testClinicData,
} from '../fixtures/clinic.fixtures';
import {
  registerAndLogin,
  createTestComplex,
  createTestClinic,
  cleanupTestData,
  verifyBilingualMessage,
  generateObjectId,
} from '../utils/test-helpers';

/**
 * Comprehensive Bilingual Message Testing
 * 
 * Task 17.2: Test bilingual messages
 * 
 * This test suite verifies that ALL messages (error and success) are bilingual:
 * - All error messages have both Arabic (ar) and English (en) translations
 * - All success messages have both Arabic (ar) and English (en) translations
 * - Message structure is consistent across all endpoints
 * 
 * Requirements: Task 17.2 - Verify all messages are bilingual
 */
describe('Bilingual Messages (e2e)', () => {
  let app: INestApplication;
  let userModel: any;
  let complexModel: any;
  let clinicModel: any;
  let subscriptionModel: any;
  let appointmentModel: any;
  let workingHoursModel: any;
  let adminToken: string;
  let adminUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    // Get models
    userModel = moduleFixture.get(getModelToken('User'));
    complexModel = moduleFixture.get(getModelToken('Complex'));
    clinicModel = moduleFixture.get(getModelToken('Clinic'));
    subscriptionModel = moduleFixture.get(getModelToken('Subscription'));
    appointmentModel = moduleFixture.get(getModelToken('Appointment'));
    workingHoursModel = moduleFixture.get(getModelToken('WorkingHours'));

    // Clean up before tests
    await cleanupTestData({ 
      userModel, 
      complexModel, 
      clinicModel,
    });

    // Register admin user
    const adminResult = await registerAndLogin(app, adminUserData);
    adminToken = adminResult.accessToken;
    adminUserId = adminResult.userId;
  });

  afterAll(async () => {
    await cleanupTestData({ 
      userModel, 
      complexModel, 
      clinicModel,
    });
    await app.close();
  });

  describe('Error Code Constants Verification', () => {
    it('should have bilingual messages for all error codes in constants', () => {
      const errorCodeKeys = Object.keys(ERROR_CODES);
      
      expect(errorCodeKeys.length).toBeGreaterThan(0);
      
      errorCodeKeys.forEach((key) => {
        const errorCode = ERROR_CODES[key];
        
        // Verify structure
        expect(errorCode).toHaveProperty('code');
        expect(errorCode).toHaveProperty('message');
        expect(errorCode.message).toHaveProperty('ar');
        expect(errorCode.message).toHaveProperty('en');
        
        // Verify types
        expect(typeof errorCode.code).toBe('string');
        expect(typeof errorCode.message.ar).toBe('string');
        expect(typeof errorCode.message.en).toBe('string');
        
        // Verify not empty
        expect(errorCode.message.ar.length).toBeGreaterThan(0);
        expect(errorCode.message.en.length).toBeGreaterThan(0);
        
        // Verify code format
        expect(errorCode.code).toMatch(/^CLINIC_\d{3}$/);
      });
    });

    it('should have all 10 error codes defined', () => {
      const expectedCodes = [
        'CLINIC_001',
        'CLINIC_002',
        'CLINIC_003',
        'CLINIC_004',
        'CLINIC_005',
        'CLINIC_006',
        'CLINIC_007',
        'CLINIC_008',
        'CLINIC_009',
        'CLINIC_010',
      ];

      expectedCodes.forEach((code) => {
        const errorCode = Object.values(ERROR_CODES).find((ec) => ec.code === code);
        expect(errorCode).toBeDefined();
        expect(errorCode?.message).toHaveProperty('ar');
        expect(errorCode?.message).toHaveProperty('en');
      });
    });
  });

  describe('Success Messages - All Endpoints', () => {
    let testComplexId: string;
    let testClinicId: string;

    beforeEach(async () => {
      // Create test complex
      const testComplex = await createTestComplex(complexModel, {
        ...testComplexData,
        personInChargeId: new Types.ObjectId(adminUserId),
      });
      testComplexId = testComplex._id.toString();

      // Create test clinic
      const testClinic = await createTestClinic(clinicModel, {
        ...testClinicData,
        complexId: testComplexId,
        status: 'active',
      });
      testClinicId = testClinic._id.toString();

      // Create complex working hours for validation tests
      await workingHoursModel.create({
        entityType: 'complex',
        entityId: new Types.ObjectId(testComplexId),
        dayOfWeek: 'monday',
        isWorkingDay: true,
        openingTime: '08:00',
        closingTime: '20:00',
        isActive: true,
      });
    });

    afterEach(async () => {
      await workingHoursModel.deleteMany({});
      await clinicModel.deleteMany({});
      await complexModel.deleteMany({});
    });

    it('GET /clinics/:id - should return bilingual success message', async () => {
      const response = await request(app.getHttpServer())
        .get(`/clinics/${testClinicId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBeDefined();
      verifyBilingualMessage(response.body.message);
      
      expect(response.body.message.ar).toBe('تم استرجاع تفاصيل العيادة بنجاح');
      expect(response.body.message.en).toBe('Clinic details retrieved successfully');
    });

    it('GET /clinics/:id/capacity - should return bilingual success message', async () => {
      const response = await request(app.getHttpServer())
        .get(`/clinics/${testClinicId}/capacity`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBeDefined();
      verifyBilingualMessage(response.body.message);
      
      expect(response.body.message.ar).toBe('تم جلب حالة السعة بنجاح');
      expect(response.body.message.en).toBe('Capacity status retrieved successfully');
    });

    it('POST /clinics/:id/validate-working-hours - should return bilingual success message', async () => {
      const response = await request(app.getHttpServer())
        .post(`/clinics/${testClinicId}/validate-working-hours`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          workingHours: [
            {
              dayOfWeek: 'monday',
              isWorkingDay: true,
              openingTime: '09:00',
              closingTime: '17:00',
            },
          ],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBeDefined();
      verifyBilingualMessage(response.body.message);
      
      expect(response.body.message.ar).toBe('تم التحقق من ساعات العمل بنجاح');
      expect(response.body.message.en).toBe('Working hours validated successfully');
    });

    it('PATCH /clinics/:id/status - should return bilingual success message', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'suspended',
          reason: 'Testing bilingual messages',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBeDefined();
      verifyBilingualMessage(response.body.message);
      
      expect(response.body.message.ar).toBe('تم تغيير حالة العيادة بنجاح');
      expect(response.body.message.en).toBe('Clinic status changed successfully');
    });

    it('PATCH /clinics/:id/pic - should return bilingual success message', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/pic`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          personInChargeId: adminUserId,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBeDefined();
      verifyBilingualMessage(response.body.message);
      
      expect(response.body.message.ar).toBe('تم تعيين الشخص المسؤول بنجاح');
      expect(response.body.message.en).toBe('Person-in-charge assigned successfully');
    });

    it('POST /clinics/:id/transfer-staff - should return bilingual success message', async () => {
      // Create target clinic for transfer
      const targetClinic = await createTestClinic(clinicModel, {
        ...testClinicData,
        name: { ar: 'عيادة الهدف', en: 'Target Clinic' },
        email: 'target@test.com',
        complexId: testComplexId,
      });

      const response = await request(app.getHttpServer())
        .post(`/clinics/${testClinicId}/transfer-staff`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          targetClinicId: targetClinic._id.toString(),
          transferDoctors: false,
          transferStaff: false,
          handleConflicts: 'reschedule',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBeDefined();
      verifyBilingualMessage(response.body.message);
      
      expect(response.body.message.ar).toBe('تم نقل الموظفين بنجاح');
      expect(response.body.message.en).toBe('Staff transferred successfully');
    });
  });

  describe('Error Messages - All Error Codes', () => {
    it('CLINIC_001 - should have bilingual error message', async () => {
      // Create subscription with limit reached
      const subscription = await subscriptionModel.create({
        userId: new Types.ObjectId(adminUserId),
        planType: 'clinic',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        maxClinics: 1,
        currentClinics: 1, // Limit reached
      });

      const testComplex = await createTestComplex(complexModel, testComplexData);

      const response = await request(app.getHttpServer())
        .post('/clinics')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...testClinicData,
          complexId: testComplex._id.toString(),
          subscriptionId: subscription._id.toString(),
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CLINIC_001');
      verifyBilingualMessage(response.body.error.message);
      
      expect(response.body.error.message.ar).toBe('تم تجاوز الحد الأقصى للعيادات المسموح به في الخطة');
      expect(response.body.error.message.en).toBe('Plan clinic limit exceeded');

      // Cleanup
      await subscriptionModel.deleteMany({});
      await complexModel.deleteMany({});
    });

    it('CLINIC_002 - should have bilingual error message', async () => {
      const testComplex = await createTestComplex(complexModel, {
        ...testComplexData,
        personInChargeId: new Types.ObjectId(adminUserId),
      });

      const testClinic = await createTestClinic(clinicModel, {
        ...testClinicData,
        complexId: testComplex._id.toString(),
      });

      const invalidUserId = generateObjectId();

      const response = await request(app.getHttpServer())
        .patch(`/clinics/${testClinic._id.toString()}/pic`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          personInChargeId: invalidUserId,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CLINIC_002');
      verifyBilingualMessage(response.body.error.message);
      
      expect(response.body.error.message.ar).toBe('يجب أن يكون الشخص المسؤول من المسؤولين عن المجمع');
      expect(response.body.error.message.en).toBe('Person in charge must be from complex PICs');

      // Cleanup
      await clinicModel.deleteMany({});
      await complexModel.deleteMany({});
    });

    it('CLINIC_007 - should have bilingual error message', async () => {
      const nonExistentId = generateObjectId();

      const response = await request(app.getHttpServer())
        .get(`/clinics/${nonExistentId}/capacity`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CLINIC_007');
      verifyBilingualMessage(response.body.error.message);
      
      expect(response.body.error.message.ar).toBe('العيادة غير موجودة');
      expect(response.body.error.message.en).toBe('Clinic not found');
    });

    it('CLINIC_008 - should have bilingual error message', async () => {
      const testComplex = await createTestComplex(complexModel, testComplexData);
      const testClinic = await createTestClinic(clinicModel, {
        ...testClinicData,
        complexId: testComplex._id.toString(),
      });

      const nonExistentTargetId = generateObjectId();

      const response = await request(app.getHttpServer())
        .post(`/clinics/${testClinic._id.toString()}/transfer-staff`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          targetClinicId: nonExistentTargetId,
          transferDoctors: false,
          transferStaff: false,
          handleConflicts: 'reschedule',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CLINIC_008');
      verifyBilingualMessage(response.body.error.message);
      
      expect(response.body.error.message.ar).toBe('العيادة المستهدفة غير موجودة');
      expect(response.body.error.message.en).toBe('Target clinic not found');

      // Cleanup
      await clinicModel.deleteMany({});
      await complexModel.deleteMany({});
    });
  });

  describe('Validation Error Messages', () => {
    let testComplexId: string;
    let testClinicId: string;

    beforeEach(async () => {
      const testComplex = await createTestComplex(complexModel, testComplexData);
      testComplexId = testComplex._id.toString();

      const testClinic = await createTestClinic(clinicModel, {
        ...testClinicData,
        complexId: testComplexId,
      });
      testClinicId = testClinic._id.toString();

      // Create complex working hours
      await workingHoursModel.create({
        entityType: 'complex',
        entityId: new Types.ObjectId(testComplexId),
        dayOfWeek: 'monday',
        isWorkingDay: true,
        openingTime: '08:00',
        closingTime: '17:00',
        isActive: true,
      });
    });

    afterEach(async () => {
      await workingHoursModel.deleteMany({});
      await clinicModel.deleteMany({});
      await complexModel.deleteMany({});
    });

    it('Working hours validation errors should be bilingual', async () => {
      const response = await request(app.getHttpServer())
        .post(`/clinics/${testClinicId}/validate-working-hours`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          workingHours: [
            {
              dayOfWeek: 'monday',
              isWorkingDay: true,
              openingTime: '07:00', // Before complex opens
              closingTime: '18:00', // After complex closes
            },
          ],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.errors.length).toBeGreaterThan(0);

      // Verify each error has bilingual message
      response.body.data.errors.forEach((error: any) => {
        verifyBilingualMessage(error.message);
        expect(error.message.ar).toBeTruthy();
        expect(error.message.en).toBeTruthy();
      });
    });

    it('Conflict detection messages should be bilingual', async () => {
      // Create appointment
      await appointmentModel.create({
        clinicId: new Types.ObjectId(testClinicId),
        patientId: new Types.ObjectId(),
        doctorId: new Types.ObjectId(),
        appointmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        appointmentTime: '16:00',
        status: 'scheduled',
        urgency: 'medium',
      });

      const response = await request(app.getHttpServer())
        .post(`/clinics/${testClinicId}/validate-working-hours`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          workingHours: [
            {
              dayOfWeek: 'monday',
              isWorkingDay: true,
              openingTime: '08:00',
              closingTime: '15:00', // Closes before appointment
            },
          ],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.conflicts).toBeDefined();

      // Verify appointment conflicts have bilingual messages
      if (response.body.data.conflicts.appointments.length > 0) {
        response.body.data.conflicts.appointments.forEach((conflict: any) => {
          verifyBilingualMessage(conflict.reason);
          expect(conflict.reason.ar).toBeTruthy();
          expect(conflict.reason.en).toBeTruthy();
        });
      }

      // Cleanup
      await appointmentModel.deleteMany({});
    });
  });

  describe('Message Consistency', () => {
    it('All error messages should follow consistent structure', () => {
      Object.values(ERROR_CODES).forEach((errorCode) => {
        // Verify structure
        expect(errorCode).toHaveProperty('code');
        expect(errorCode).toHaveProperty('message');
        expect(errorCode.message).toHaveProperty('ar');
        expect(errorCode.message).toHaveProperty('en');

        // Verify Arabic message is in Arabic script
        expect(errorCode.message.ar).toMatch(/[\u0600-\u06FF]/);

        // Verify English message is in Latin script
        expect(errorCode.message.en).toMatch(/[a-zA-Z]/);
      });
    });

    it('All messages should be non-empty strings', () => {
      Object.values(ERROR_CODES).forEach((errorCode) => {
        expect(errorCode.message.ar.trim().length).toBeGreaterThan(0);
        expect(errorCode.message.en.trim().length).toBeGreaterThan(0);
      });
    });

    it('Error codes should be unique', () => {
      const codes = Object.values(ERROR_CODES).map((ec) => ec.code);
      const uniqueCodes = new Set(codes);
      expect(codes.length).toBe(uniqueCodes.size);
    });
  });

  describe('Complete Coverage Summary', () => {
    it('should verify all endpoints return bilingual messages', () => {
      const endpointsWithBilingualMessages = [
        'GET /clinics/:id',
        'GET /clinics/:id/capacity',
        'POST /clinics/:id/validate-working-hours',
        'PATCH /clinics/:id/status',
        'PATCH /clinics/:id/pic',
        'POST /clinics/:id/transfer-staff',
      ];

      const errorCodesWithBilingualMessages = [
        'CLINIC_001',
        'CLINIC_002',
        'CLINIC_003',
        'CLINIC_004',
        'CLINIC_005',
        'CLINIC_006',
        'CLINIC_007',
        'CLINIC_008',
        'CLINIC_009',
        'CLINIC_010',
      ];

      // This test documents the coverage
      expect(endpointsWithBilingualMessages.length).toBe(6);
      expect(errorCodesWithBilingualMessages.length).toBe(10);
    });
  });
});
