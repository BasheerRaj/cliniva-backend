import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import request from 'supertest';
import { Types } from 'mongoose';

import { AppModule } from '../../../src/app.module';
import {
  adminUserData,
  testComplexData,
  testClinicData,
  anotherComplexData,
} from '../fixtures/clinic.fixtures';
import {
  registerAndLogin,
  createTestComplex,
  createTestClinic,
  cleanupTestData,
  verifyBilingualMessage,
  verifyApiResponse,
  generateObjectId,
} from '../utils/test-helpers';

describe('Clinic PIC Assignment Endpoint (e2e)', () => {
  let app: INestApplication;
  let userModel: any;
  let complexModel: any;
  let clinicModel: any;
  let adminToken: string;
  let adminUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply validation pipe
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

    // Clean up before tests
    await cleanupTestData({ userModel, complexModel, clinicModel });

    // Register admin user
    const adminResult = await registerAndLogin(app, adminUserData);
    adminToken = adminResult.accessToken;
    adminUserId = adminResult.userId;
  });

  afterAll(async () => {
    // Clean up after tests
    await cleanupTestData({ userModel, complexModel, clinicModel });
    await app.close();
  });

  describe('PATCH /clinics/:id/pic - Assign Person-in-Charge', () => {
    let testComplexId: string;
    let testClinicId: string;
    let picUserId: string;

    beforeEach(async () => {
      // Create a PIC user
      const picUser = await userModel.create({
        email: 'pic@test.com',
        password: 'PIC123!',
        firstName: 'PIC',
        lastName: 'User',
        role: 'manager',
        phone: '+1234567910',
        nationality: 'US',
        gender: 'male',
        isActive: true,
      });
      picUserId = picUser._id.toString();

      // Create test complex with PIC
      const testComplex = await createTestComplex(complexModel, {
        ...testComplexData,
        personInChargeId: new Types.ObjectId(picUserId),
      });
      testComplexId = testComplex._id.toString();

      // Create test clinic linked to complex
      const testClinic = await createTestClinic(clinicModel, {
        ...testClinicData,
        complexId: new Types.ObjectId(testComplexId),
        isActive: true,
      });
      testClinicId = testClinic._id.toString();
    });

    afterEach(async () => {
      // Clean up test data
      await clinicModel.deleteMany({});
      await complexModel.deleteMany({});
      await userModel.deleteMany({ _id: { $ne: new Types.ObjectId(adminUserId) } });
    });

    it('should successfully assign PIC to clinic', async () => {
      const assignPICDto = {
        personInChargeId: picUserId,
      };

      const response = await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/pic`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(assignPICDto)
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data).toBeDefined();

      // Verify clinic data
      const { data } = response.body;
      expect(data._id).toBe(testClinicId);
      expect(data.personInChargeId).toBeDefined();

      // Verify PIC is populated
      if (typeof data.personInChargeId === 'object') {
        expect(data.personInChargeId._id).toBe(picUserId);
        expect(data.personInChargeId.firstName).toBe('PIC');
        expect(data.personInChargeId.lastName).toBe('User');
        expect(data.personInChargeId.email).toBe('pic@test.com');
        expect(data.personInChargeId.role).toBe('manager');
      } else {
        expect(data.personInChargeId).toBe(picUserId);
      }

      // Verify bilingual success message
      verifyBilingualMessage(response.body.message);
      expect(response.body.message.ar).toBe('تم تعيين الشخص المسؤول بنجاح');
      expect(response.body.message.en).toBe(
        'Person in charge assigned successfully',
      );
    });

    it('should update existing PIC assignment', async () => {
      // First assign a PIC
      await clinicModel.findByIdAndUpdate(testClinicId, {
        personInChargeId: new Types.ObjectId(picUserId),
      });

      // Create another PIC user for the same complex
      const newPicUser = await userModel.create({
        email: 'newpic@test.com',
        password: 'NewPIC123!',
        firstName: 'New',
        lastName: 'PIC',
        role: 'manager',
        phone: '+1234567911',
        nationality: 'US',
        gender: 'female',
        isActive: true,
      });
      const newPicUserId = newPicUser._id.toString();

      // Update complex PIC
      await complexModel.findByIdAndUpdate(testComplexId, {
        personInChargeId: new Types.ObjectId(newPicUserId),
      });

      // Update clinic PIC
      const assignPICDto = {
        personInChargeId: newPicUserId,
      };

      const response = await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/pic`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(assignPICDto)
        .expect(200);

      // Verify PIC was updated
      const { data } = response.body;
      if (typeof data.personInChargeId === 'object') {
        expect(data.personInChargeId._id).toBe(newPicUserId);
        expect(data.personInChargeId.firstName).toBe('New');
        expect(data.personInChargeId.lastName).toBe('PIC');
      } else {
        expect(data.personInChargeId).toBe(newPicUserId);
      }
    });

    it('should reject PIC not from parent complex (CLINIC_002)', async () => {
      // Create another user who is NOT a PIC of the complex
      const nonPicUser = await userModel.create({
        email: 'nonpic@test.com',
        password: 'NonPIC123!',
        firstName: 'Non',
        lastName: 'PIC',
        role: 'doctor',
        phone: '+1234567912',
        nationality: 'US',
        gender: 'male',
        isActive: true,
      });
      const nonPicUserId = nonPicUser._id.toString();

      const assignPICDto = {
        personInChargeId: nonPicUserId,
      };

      const response = await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/pic`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(assignPICDto)
        .expect(400);

      // Verify error response
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('CLINIC_002');

      // Verify bilingual error message
      verifyBilingualMessage(response.body.error.message);
      expect(response.body.error.message.ar).toBe(
        'يجب أن يكون الشخص المسؤول من المسؤولين عن المجمع',
      );
      expect(response.body.error.message.en).toBe(
        'Person in charge must be from complex PICs',
      );
    });

    it('should reject PIC from different complex', async () => {
      // Create another complex with its own PIC
      const anotherPicUser = await userModel.create({
        email: 'anotherpic@test.com',
        password: 'AnotherPIC123!',
        firstName: 'Another',
        lastName: 'PIC',
        role: 'manager',
        phone: '+1234567913',
        nationality: 'US',
        gender: 'male',
        isActive: true,
      });
      const anotherPicUserId = anotherPicUser._id.toString();

      const anotherComplex = await createTestComplex(complexModel, {
        ...anotherComplexData,
        personInChargeId: new Types.ObjectId(anotherPicUserId),
      });

      // Try to assign PIC from different complex
      const assignPICDto = {
        personInChargeId: anotherPicUserId,
      };

      const response = await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/pic`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(assignPICDto)
        .expect(400);

      // Verify error response
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('CLINIC_002');

      // Verify bilingual error message
      verifyBilingualMessage(response.body.error.message);
    });

    it('should return 404 when clinic not found (CLINIC_007)', async () => {
      const nonExistentClinicId = generateObjectId();

      const assignPICDto = {
        personInChargeId: picUserId,
      };

      const response = await request(app.getHttpServer())
        .patch(`/clinics/${nonExistentClinicId}/pic`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(assignPICDto)
        .expect(404);

      // Verify error response
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('CLINIC_007');

      // Verify bilingual error message
      verifyBilingualMessage(response.body.error.message);
      expect(response.body.error.message.ar).toBe('العيادة غير موجودة');
      expect(response.body.error.message.en).toBe('Clinic not found');
    });

    it('should return 400 for invalid clinic ID format', async () => {
      const invalidId = 'invalid-id-format';

      const assignPICDto = {
        personInChargeId: picUserId,
      };

      const response = await request(app.getHttpServer())
        .patch(`/clinics/${invalidId}/pic`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(assignPICDto)
        .expect(400);

      // Verify error response
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for invalid personInChargeId format', async () => {
      const assignPICDto = {
        personInChargeId: 'invalid-user-id',
      };

      const response = await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/pic`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(assignPICDto)
        .expect(400);

      // Verify error response
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 when personInChargeId is missing', async () => {
      const assignPICDto = {};

      const response = await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/pic`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(assignPICDto)
        .expect(400);

      // Verify error response
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 when clinic has no parent complex', async () => {
      // Create a clinic without a parent complex
      const standaloneClinic = await createTestClinic(clinicModel, {
        ...testClinicData,
        name: { ar: 'عيادة مستقلة', en: 'Standalone Clinic' },
        email: 'standalone@test.com',
        complexId: null, // No parent complex
        isActive: true,
      });

      const assignPICDto = {
        personInChargeId: picUserId,
      };

      const response = await request(app.getHttpServer())
        .patch(`/clinics/${standaloneClinic._id}/pic`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(assignPICDto)
        .expect(400);

      // Verify error response
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('CLINIC_NO_COMPLEX');

      // Verify bilingual error message
      verifyBilingualMessage(response.body.error.message);
      expect(response.body.error.message.ar).toBe('العيادة غير مرتبطة بمجمع');
      expect(response.body.error.message.en).toBe(
        'Clinic is not associated with a complex',
      );
    });

    it('should return 401 when no authentication token provided', async () => {
      const assignPICDto = {
        personInChargeId: picUserId,
      };

      await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/pic`)
        .send(assignPICDto)
        .expect(401);
    });

    it('should return 401 when invalid authentication token provided', async () => {
      const assignPICDto = {
        personInChargeId: picUserId,
      };

      await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/pic`)
        .set('Authorization', 'Bearer invalid-token-12345')
        .send(assignPICDto)
        .expect(401);
    });

    it('should handle complex with null personInChargeId', async () => {
      // Update complex to have null PIC
      await complexModel.findByIdAndUpdate(testComplexId, {
        personInChargeId: null,
      });

      const assignPICDto = {
        personInChargeId: picUserId,
      };

      const response = await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/pic`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(assignPICDto)
        .expect(400);

      // Verify error response
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('CLINIC_002');
    });

    it('should verify PIC assignment persists in database', async () => {
      const assignPICDto = {
        personInChargeId: picUserId,
      };

      await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/pic`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(assignPICDto)
        .expect(200);

      // Verify in database
      const updatedClinic = await clinicModel.findById(testClinicId).exec();
      expect(updatedClinic.personInChargeId).toBeDefined();
      expect(updatedClinic.personInChargeId.toString()).toBe(picUserId);
    });
  });
});
