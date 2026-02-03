import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import request from 'supertest';
import { Types } from 'mongoose';

import { AppModule } from '../../../src/app.module';
import {
  adminUserData,
  ownerUserData,
  doctorUserData,
  staffUserData,
  testComplexData,
  testClinicData,
} from '../fixtures/clinic.fixtures';
import {
  registerAndLogin,
  createTestComplex,
  createTestClinic,
  cleanupTestData,
} from '../utils/test-helpers';

describe('Clinic Authorization (e2e)', () => {
  let app: INestApplication;
  let userModel: any;
  let complexModel: any;
  let clinicModel: any;
  let adminToken: string;
  let ownerToken: string;
  let doctorToken: string;
  let staffToken: string;
  let testClinicId: string;
  let targetClinicId: string;

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

    // Register users with different roles
    const adminResult = await registerAndLogin(app, adminUserData);
    adminToken = adminResult.accessToken;

    const ownerResult = await registerAndLogin(app, ownerUserData);
    ownerToken = ownerResult.accessToken;

    const doctorResult = await registerAndLogin(app, doctorUserData);
    doctorToken = doctorResult.accessToken;

    const staffResult = await registerAndLogin(app, staffUserData);
    staffToken = staffResult.accessToken;

    // Create test complex
    const testComplex = await createTestComplex(complexModel, testComplexData);
    const testComplexId = testComplex._id.toString();

    // Create test clinics
    const testClinic = await createTestClinic(clinicModel, {
      ...testClinicData,
      complexId: new Types.ObjectId(testComplexId),
      status: 'active',
      isActive: true,
    });
    testClinicId = testClinic._id.toString();

    const targetClinic = await createTestClinic(clinicModel, {
      name: { ar: 'عيادة الهدف', en: 'Target Clinic' },
      address: 'Target Clinic Address',
      phone: '+1234567905',
      email: 'targetclinic@clinic.com',
      complexId: new Types.ObjectId(testComplexId),
      status: 'active',
      isActive: true,
    });
    targetClinicId = targetClinic._id.toString();
  });

  afterAll(async () => {
    // Clean up after tests
    await cleanupTestData({ userModel, complexModel, clinicModel });
    await app.close();
  });

  describe('PATCH /clinics/:id/status - Authorization', () => {
    it('should allow ADMIN to change clinic status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'inactive',
          reason: 'Testing admin access',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.clinic.status).toBe('inactive');
    });

    it('should allow OWNER to change clinic status', async () => {
      // First, set status back to active
      await clinicModel.findByIdAndUpdate(testClinicId, {
        status: 'active',
        isActive: true,
      });

      const response = await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          status: 'suspended',
          reason: 'Testing owner access',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.clinic.status).toBe('suspended');
    });

    it('should reject DOCTOR from changing clinic status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/status`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          status: 'active',
          reason: 'Testing doctor access',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
      expect(response.body.error.message).toHaveProperty('ar');
      expect(response.body.error.message).toHaveProperty('en');
      expect(response.body.error.message.en).toBe(
        'You do not have permission to access this resource',
      );
    });

    it('should reject STAFF from changing clinic status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          status: 'active',
          reason: 'Testing staff access',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
      expect(response.body.error.message).toHaveProperty('ar');
      expect(response.body.error.message).toHaveProperty('en');
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/status`)
        .send({
          status: 'active',
          reason: 'Testing no auth',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /clinics/:id/transfer-staff - Authorization', () => {
    it('should allow ADMIN to transfer staff', async () => {
      const response = await request(app.getHttpServer())
        .post(`/clinics/${testClinicId}/transfer-staff`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          targetClinicId,
          transferDoctors: false,
          transferStaff: false,
          handleConflicts: 'reschedule',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('doctorsTransferred');
      expect(response.body.data).toHaveProperty('staffTransferred');
    });

    it('should allow OWNER to transfer staff', async () => {
      const response = await request(app.getHttpServer())
        .post(`/clinics/${testClinicId}/transfer-staff`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          targetClinicId,
          transferDoctors: false,
          transferStaff: false,
          handleConflicts: 'reschedule',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject DOCTOR from transferring staff', async () => {
      const response = await request(app.getHttpServer())
        .post(`/clinics/${testClinicId}/transfer-staff`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          targetClinicId,
          transferDoctors: false,
          transferStaff: false,
          handleConflicts: 'reschedule',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
      expect(response.body.error.message).toHaveProperty('ar');
      expect(response.body.error.message).toHaveProperty('en');
      expect(response.body.error.message.en).toBe(
        'You do not have permission to access this resource',
      );
    });

    it('should reject STAFF from transferring staff', async () => {
      const response = await request(app.getHttpServer())
        .post(`/clinics/${testClinicId}/transfer-staff`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          targetClinicId,
          transferDoctors: false,
          transferStaff: false,
          handleConflicts: 'reschedule',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app.getHttpServer())
        .post(`/clinics/${testClinicId}/transfer-staff`)
        .send({
          targetClinicId,
          transferDoctors: false,
          transferStaff: false,
          handleConflicts: 'reschedule',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('JWT Authentication Requirement', () => {
    it('should require JWT token for status change', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/status`)
        .send({
          status: 'active',
          reason: 'Testing',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should require JWT token for staff transfer', async () => {
      const response = await request(app.getHttpServer())
        .post(`/clinics/${testClinicId}/transfer-staff`)
        .send({
          targetClinicId,
          transferDoctors: false,
          transferStaff: false,
          handleConflicts: 'reschedule',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid JWT token for status change', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/status`)
        .set('Authorization', 'Bearer invalid-token')
        .send({
          status: 'active',
          reason: 'Testing',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid JWT token for staff transfer', async () => {
      const response = await request(app.getHttpServer())
        .post(`/clinics/${testClinicId}/transfer-staff`)
        .set('Authorization', 'Bearer invalid-token')
        .send({
          targetClinicId,
          transferDoctors: false,
          transferStaff: false,
          handleConflicts: 'reschedule',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
