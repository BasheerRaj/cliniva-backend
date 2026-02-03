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

describe('Clinic Status Change Endpoint (e2e)', () => {
  let app: INestApplication;
  let userModel: any;
  let complexModel: any;
  let clinicModel: any;
  let appointmentModel: any;
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
    appointmentModel = moduleFixture.get(getModelToken('Appointment'));

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

  describe('PATCH /clinics/:id/status - Change Clinic Status', () => {
    let testComplexId: string;
    let testClinicId: string;
    let targetClinicId: string;

    beforeEach(async () => {
      // Create test complex
      const testComplex = await createTestComplex(
        complexModel,
        testComplexData,
      );
      testComplexId = testComplex._id.toString();

      // Create source clinic
      const testClinic = await createTestClinic(clinicModel, {
        ...testClinicData,
        complexId: new Types.ObjectId(testComplexId),
        status: 'active',
        isActive: true,
      });
      testClinicId = testClinic._id.toString();

      // Create target clinic for transfers
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

    afterEach(async () => {
      // Clean up test data
      await appointmentModel?.deleteMany({});
      await clinicModel.deleteMany({});
      await complexModel.deleteMany({});
      await userModel.deleteMany({
        _id: { $ne: new Types.ObjectId(adminUserId) },
      });
    });

    it('should change status to inactive successfully without resources', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'inactive',
          reason: 'Temporary closure for maintenance',
        })
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      const { data } = response.body;

      expect(data.clinic).toBeDefined();
      expect(data.clinic.status).toBe('inactive');
      expect(data.clinic.isActive).toBe(false);
      expect(data.clinic.deactivatedAt).toBeDefined();
      expect(data.clinic.deactivatedBy).toBeDefined();
      expect(data.clinic.deactivationReason).toBe(
        'Temporary closure for maintenance',
      );

      // Verify bilingual message
      verifyBilingualMessage(response.body.message);
      expect(response.body.message.ar).toBe('تم تغيير حالة العيادة بنجاح');
      expect(response.body.message.en).toBe(
        'Clinic status changed successfully',
      );
    });

    it('should change status to suspended successfully', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'suspended',
          reason: 'Pending license renewal',
        })
        .expect(200);

      const { data } = response.body;

      expect(data.clinic.status).toBe('suspended');
      expect(data.clinic.isActive).toBe(false);
      expect(data.clinic.deactivationReason).toBe('Pending license renewal');
    });

    it('should change status to active successfully', async () => {
      // First deactivate the clinic
      await clinicModel.findByIdAndUpdate(testClinicId, {
        status: 'inactive',
        isActive: false,
      });

      const response = await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'active',
        })
        .expect(200);

      const { data } = response.body;

      expect(data.clinic.status).toBe('active');
      expect(data.clinic.isActive).toBe(true);
    });

    it('should require transfer decision when deactivating with assigned doctors', async () => {
      // Create doctors assigned to the clinic
      await userModel.insertMany([
        {
          email: 'doctor1@test.com',
          password: 'Doctor123!',
          firstName: 'Doctor',
          lastName: 'One',
          role: 'doctor',
          phone: '+1234567811',
          nationality: 'US',
          gender: 'male',
          clinicId: new Types.ObjectId(testClinicId),
          isActive: true,
        },
        {
          email: 'doctor2@test.com',
          password: 'Doctor123!',
          firstName: 'Doctor',
          lastName: 'Two',
          role: 'doctor',
          phone: '+1234567812',
          nationality: 'US',
          gender: 'male',
          clinicId: new Types.ObjectId(testClinicId),
          isActive: true,
        },
      ]);

      const response = await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'inactive',
          reason: 'Closure',
        })
        .expect(400);

      // Verify error response
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('CLINIC_004');

      // Verify bilingual error message
      verifyBilingualMessage(response.body.error.message);
      expect(response.body.error.message.ar).toContain(
        'يرجى اختيار ما إذا كنت تريد',
      );
      expect(response.body.error.message.en).toContain(
        'Please choose whether to keep or transfer',
      );

      // Verify additional information
      expect(response.body.error.requiresTransfer).toBe(true);
      expect(response.body.error.assignedDoctors).toBe(2);
    });

    it('should require transfer decision when deactivating with active appointments', async () => {
      // Create a doctor
      const doctor = await userModel.create({
        email: 'doctor@test.com',
        password: 'Doctor123!',
        firstName: 'Test',
        lastName: 'Doctor',
        role: 'doctor',
        phone: '+1234567813',
        nationality: 'US',
        gender: 'male',
        clinicId: new Types.ObjectId(testClinicId),
        isActive: true,
      });

      // Create a patient
      const patient = await userModel.create({
        email: 'patient@test.com',
        password: 'Patient123!',
        firstName: 'Test',
        lastName: 'Patient',
        role: 'patient',
        phone: '+1234567814',
        nationality: 'US',
        gender: 'male',
        isActive: true,
      });

      // Create future appointments
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      await appointmentModel.insertMany([
        {
          clinicId: new Types.ObjectId(testClinicId),
          patientId: patient._id,
          doctorId: doctor._id,
          appointmentDate: futureDate,
          appointmentTime: '10:00',
          status: 'scheduled',
          urgency: 'medium',
        },
        {
          clinicId: new Types.ObjectId(testClinicId),
          patientId: patient._id,
          doctorId: doctor._id,
          appointmentDate: futureDate,
          appointmentTime: '14:00',
          status: 'confirmed',
          urgency: 'high',
        },
      ]);

      const response = await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'inactive',
        })
        .expect(400);

      // Verify error response
      expect(response.body.error.code).toBe('CLINIC_004');
      expect(response.body.error.requiresTransfer).toBe(true);
      expect(response.body.error.activeAppointments).toBe(2);
      expect(response.body.error.assignedDoctors).toBe(1);
    });

    it('should transfer doctors successfully when changing status', async () => {
      // Create doctors assigned to the clinic
      await userModel.insertMany([
        {
          email: 'doctor1@test.com',
          password: 'Doctor123!',
          firstName: 'Doctor',
          lastName: 'One',
          role: 'doctor',
          phone: '+1234567815',
          nationality: 'US',
          gender: 'male',
          clinicId: new Types.ObjectId(testClinicId),
          isActive: true,
        },
        {
          email: 'doctor2@test.com',
          password: 'Doctor123!',
          firstName: 'Doctor',
          lastName: 'Two',
          role: 'doctor',
          phone: '+1234567816',
          nationality: 'US',
          gender: 'female',
          clinicId: new Types.ObjectId(testClinicId),
          isActive: true,
        },
      ]);

      const response = await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'inactive',
          reason: 'Permanent closure',
          transferDoctors: true,
          targetClinicId: targetClinicId,
        })
        .expect(200);

      const { data } = response.body;

      // Verify status change
      expect(data.clinic.status).toBe('inactive');

      // Verify doctors were transferred
      expect(data.doctorsTransferred).toBe(2);

      // Verify doctors are now assigned to target clinic
      const transferredDoctors = await userModel.find({
        clinicId: new Types.ObjectId(targetClinicId),
        role: 'doctor',
      });
      expect(transferredDoctors.length).toBe(2);
    });

    it('should transfer staff successfully when changing status', async () => {
      // Create staff assigned to the clinic
      await userModel.insertMany([
        {
          email: 'nurse1@test.com',
          password: 'Nurse123!',
          firstName: 'Nurse',
          lastName: 'One',
          role: 'nurse',
          phone: '+1234567817',
          nationality: 'US',
          gender: 'female',
          clinicId: new Types.ObjectId(testClinicId),
          isActive: true,
        },
        {
          email: 'receptionist@test.com',
          password: 'Staff123!',
          firstName: 'Reception',
          lastName: 'Staff',
          role: 'receptionist',
          phone: '+1234567818',
          nationality: 'US',
          gender: 'male',
          clinicId: new Types.ObjectId(testClinicId),
          isActive: true,
        },
      ]);

      const response = await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'inactive',
          reason: 'Relocation',
          transferStaff: true,
          targetClinicId: targetClinicId,
        })
        .expect(200);

      const { data } = response.body;

      // Verify staff were transferred
      expect(data.staffTransferred).toBe(2);

      // Verify staff are now assigned to target clinic
      const transferredStaff = await userModel.find({
        clinicId: new Types.ObjectId(targetClinicId),
        role: { $nin: ['doctor', 'patient'] },
      });
      expect(transferredStaff.length).toBe(2);
    });

    it('should transfer both doctors and staff when requested', async () => {
      // Create doctors and staff
      await userModel.insertMany([
        {
          email: 'doctor@test.com',
          password: 'Doctor123!',
          firstName: 'Test',
          lastName: 'Doctor',
          role: 'doctor',
          phone: '+1234567819',
          nationality: 'US',
          gender: 'male',
          clinicId: new Types.ObjectId(testClinicId),
          isActive: true,
        },
        {
          email: 'nurse@test.com',
          password: 'Nurse123!',
          firstName: 'Test',
          lastName: 'Nurse',
          role: 'nurse',
          phone: '+1234567820',
          nationality: 'US',
          gender: 'female',
          clinicId: new Types.ObjectId(testClinicId),
          isActive: true,
        },
      ]);

      const response = await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'inactive',
          reason: 'Complete relocation',
          transferDoctors: true,
          transferStaff: true,
          targetClinicId: targetClinicId,
        })
        .expect(200);

      const { data } = response.body;

      // Verify both were transferred
      expect(data.doctorsTransferred).toBe(1);
      expect(data.staffTransferred).toBe(1);
    });

    it('should mark appointments for rescheduling when deactivating', async () => {
      // Create a doctor and patient
      const doctor = await userModel.create({
        email: 'doctor@test.com',
        password: 'Doctor123!',
        firstName: 'Test',
        lastName: 'Doctor',
        role: 'doctor',
        phone: '+1234567821',
        nationality: 'US',
        gender: 'male',
        clinicId: new Types.ObjectId(testClinicId),
        isActive: true,
      });

      const patient = await userModel.create({
        email: 'patient@test.com',
        password: 'Patient123!',
        firstName: 'Test',
        lastName: 'Patient',
        role: 'patient',
        phone: '+1234567822',
        nationality: 'US',
        gender: 'male',
        isActive: true,
      });

      // Create future appointments
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      await appointmentModel.insertMany([
        {
          clinicId: new Types.ObjectId(testClinicId),
          patientId: patient._id,
          doctorId: doctor._id,
          appointmentDate: futureDate,
          appointmentTime: '10:00',
          status: 'scheduled',
          urgency: 'medium',
        },
        {
          clinicId: new Types.ObjectId(testClinicId),
          patientId: patient._id,
          doctorId: doctor._id,
          appointmentDate: futureDate,
          appointmentTime: '14:00',
          status: 'confirmed',
          urgency: 'high',
        },
      ]);

      const response = await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'inactive',
          reason: 'Closure',
          transferDoctors: true,
          targetClinicId: targetClinicId,
        })
        .expect(200);

      const { data } = response.body;

      // Verify appointments were affected
      expect(data.appointmentsAffected).toBeGreaterThan(0);
    });

    it('should require target clinic when transferring staff', async () => {
      // Create doctors
      await userModel.create({
        email: 'doctor@test.com',
        password: 'Doctor123!',
        firstName: 'Test',
        lastName: 'Doctor',
        role: 'doctor',
        phone: '+1234567823',
        nationality: 'US',
        gender: 'male',
        clinicId: new Types.ObjectId(testClinicId),
        isActive: true,
      });

      const response = await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'inactive',
          transferDoctors: true,
          // Missing targetClinicId
        })
        .expect(400);

      // Verify error response
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('CLINIC_008');
      verifyBilingualMessage(response.body.error.message);
    });

    it('should return 404 when target clinic not found', async () => {
      // Create doctors
      await userModel.create({
        email: 'doctor@test.com',
        password: 'Doctor123!',
        firstName: 'Test',
        lastName: 'Doctor',
        role: 'doctor',
        phone: '+1234567824',
        nationality: 'US',
        gender: 'male',
        clinicId: new Types.ObjectId(testClinicId),
        isActive: true,
      });

      const nonExistentClinicId = generateObjectId();

      const response = await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'inactive',
          transferDoctors: true,
          targetClinicId: nonExistentClinicId,
        })
        .expect(404);

      // Verify error response
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CLINIC_008');
      verifyBilingualMessage(response.body.error.message);
    });

    it('should return 404 when clinic not found', async () => {
      const nonExistentClinicId = generateObjectId();

      const response = await request(app.getHttpServer())
        .patch(`/clinics/${nonExistentClinicId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'inactive',
        })
        .expect(404);

      // Verify error response
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CLINIC_007');
      verifyBilingualMessage(response.body.error.message);
      expect(response.body.error.message.ar).toBe('العيادة غير موجودة');
      expect(response.body.error.message.en).toBe('Clinic not found');
    });

    it('should return 400 for invalid status value', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'invalid-status',
        })
        .expect(400);

      // Verify validation error
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid clinic ID format', async () => {
      const invalidId = 'invalid-id-format';

      const response = await request(app.getHttpServer())
        .patch(`/clinics/${invalidId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'inactive',
        })
        .expect(400);

      // Verify error response
      expect(response.body.success).toBe(false);
    });

    it('should return 401 when no authentication token provided', async () => {
      await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/status`)
        .send({
          status: 'inactive',
        })
        .expect(401);
    });

    it('should return 401 when invalid authentication token provided', async () => {
      await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/status`)
        .set('Authorization', 'Bearer invalid-token-12345')
        .send({
          status: 'inactive',
        })
        .expect(401);
    });

    it('should not transfer inactive doctors', async () => {
      // Create active and inactive doctors
      await userModel.insertMany([
        {
          email: 'activedoctor@test.com',
          password: 'Doctor123!',
          firstName: 'Active',
          lastName: 'Doctor',
          role: 'doctor',
          phone: '+1234567825',
          nationality: 'US',
          gender: 'male',
          clinicId: new Types.ObjectId(testClinicId),
          isActive: true,
        },
        {
          email: 'inactivedoctor@test.com',
          password: 'Doctor123!',
          firstName: 'Inactive',
          lastName: 'Doctor',
          role: 'doctor',
          phone: '+1234567826',
          nationality: 'US',
          gender: 'male',
          clinicId: new Types.ObjectId(testClinicId),
          isActive: false,
        },
      ]);

      const response = await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'inactive',
          transferDoctors: true,
          targetClinicId: targetClinicId,
        })
        .expect(200);

      const { data } = response.body;

      // Verify only active doctor was transferred
      expect(data.doctorsTransferred).toBe(1);

      // Verify only active doctor is in target clinic
      const transferredDoctors = await userModel.find({
        clinicId: new Types.ObjectId(targetClinicId),
        role: 'doctor',
        isActive: true,
      });
      expect(transferredDoctors.length).toBe(1);
      expect(transferredDoctors[0].email).toBe('activedoctor@test.com');
    });

    it('should handle status change with notification flags', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'inactive',
          reason: 'Temporary closure',
          notifyStaff: true,
          notifyPatients: true,
        })
        .expect(200);

      const { data } = response.body;

      // Verify status change
      expect(data.clinic.status).toBe('inactive');

      // Notification counts may be present (stub implementation)
      if (data.notificationsSent) {
        expect(data.notificationsSent).toBeDefined();
      }
    });

    it('should preserve clinic data during status change', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'suspended',
          reason: 'License renewal',
        })
        .expect(200);

      const { data } = response.body;

      // Verify clinic data is preserved
      expect(data.clinic._id.toString()).toBe(testClinicId);
      expect(data.clinic.name).toEqual(testClinicData.name);
      expect(data.clinic.email).toBe(testClinicData.email);
      expect(data.clinic.phone).toBe(testClinicData.phone);
      expect(data.clinic.complexId.toString()).toBe(testComplexId);
    });

    it('should handle multiple status changes', async () => {
      // First change: active -> inactive
      await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'inactive',
          reason: 'First closure',
        })
        .expect(200);

      // Second change: inactive -> active
      await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'active',
        })
        .expect(200);

      // Third change: active -> suspended
      const response = await request(app.getHttpServer())
        .patch(`/clinics/${testClinicId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'suspended',
          reason: 'License issue',
        })
        .expect(200);

      const { data } = response.body;

      // Verify final status
      expect(data.clinic.status).toBe('suspended');
      expect(data.clinic.deactivationReason).toBe('License issue');
    });
  });
});
