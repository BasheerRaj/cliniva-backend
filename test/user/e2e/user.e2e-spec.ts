import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import request from 'supertest';

import { AppModule } from '../../../src/app.module';
import {
  adminUserData,
  doctorUserData,
  targetDoctorData,
  staffUserData,
  expectedErrorMessages,
  testEnvironment,
} from '../fixtures/user.fixtures';
import {
  registerAndLogin,
  createTestUser,
  createTestComplex,
  createTestAppointment,
  cleanupTestData,
  verifyBilingualMessage,
  verifyApiResponse,
  generateObjectId,
} from '../utils/test-helpers';

describe('User Management (e2e)', () => {
  let app: INestApplication;
  let userModel: any;
  let appointmentModel: any;
  let adminToken: string;
  let adminUserId: string;

  beforeAll(async () => {
    // Set test environment variables
    Object.assign(process.env, testEnvironment);

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
    appointmentModel = moduleFixture.get(getModelToken('Appointment'));

    // Clean up before tests
    await cleanupTestData({ userModel, appointmentModel });

    // Register test users
    const adminResult = await registerAndLogin(app, adminUserData);
    adminToken = adminResult.accessToken;
    adminUserId = adminResult.userId;

    // Register other users for future tests
    await registerAndLogin(app, doctorUserData);
    await registerAndLogin(app, targetDoctorData);
    await registerAndLogin(app, staffUserData);
  });

  afterAll(async () => {
    // Clean up after tests
    await cleanupTestData({ userModel, appointmentModel });
    await app.close();
  });

  describe('PATCH /users/:id/status - Update User Status', () => {
    let testUserId: string;

    beforeEach(async () => {
      // Create a test user for status updates
      const testUser = await createTestUser(userModel, {
        email: 'statustest@clinic.com',
        password: 'StatusTest123!',
        firstName: 'Status',
        lastName: 'Test',
        role: 'staff',
        phone: '+1234567899',
        nationality: 'US',
        gender: 'male',
        isActive: true,
      });
      testUserId = testUser._id.toString();
    });

    afterEach(async () => {
      // Clean up test user
      if (testUserId) {
        await userModel.findByIdAndDelete(testUserId);
      }
    });

    it('should successfully update user status (deactivate)', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/users/${testUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.isActive).toBe(false);

      // Verify bilingual message
      if (response.body.message) {
        verifyBilingualMessage(response.body.message);
      }

      // Verify user was actually updated in database
      const updatedUser = await userModel.findById(testUserId);
      expect(updatedUser.isActive).toBe(false);
    });

    it('should successfully update user status (activate)', async () => {
      // First deactivate the user
      await userModel.findByIdAndUpdate(testUserId, { isActive: false });

      const response = await request(app.getHttpServer())
        .patch(`/users/${testUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true })
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.isActive).toBe(true);

      // Verify user was actually updated in database
      const updatedUser = await userModel.findById(testUserId);
      expect(updatedUser.isActive).toBe(true);
    });

    it('should return 403 when trying to deactivate own account', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/users/${adminUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(403);

      // Verify error response structure
      verifyApiResponse(response.body, false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('SELF_MODIFICATION_FORBIDDEN');

      // Verify bilingual error message
      verifyBilingualMessage(response.body.error.message);
      expect(response.body.error.message.ar).toBe(
        expectedErrorMessages.CANNOT_DEACTIVATE_SELF.ar,
      );
      expect(response.body.error.message.en).toBe(
        expectedErrorMessages.CANNOT_DEACTIVATE_SELF.en,
      );

      // Verify user status was NOT changed
      const unchangedUser = await userModel.findById(adminUserId);
      expect(unchangedUser.isActive).toBe(true);
    });

    it('should return 401 when no authentication token provided', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${testUserId}/status`)
        .send({ isActive: false })
        .expect(401);
    });

    it('should return 401 when invalid authentication token provided', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${testUserId}/status`)
        .set('Authorization', 'Bearer invalid-token-12345')
        .send({ isActive: false })
        .expect(401);
    });

    it('should return 404 when user not found', async () => {
      const nonExistentUserId = generateObjectId();

      const response = await request(app.getHttpServer())
        .patch(`/users/${nonExistentUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(404);

      // Verify error response structure
      verifyApiResponse(response.body, false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('ENTITY_NOT_FOUND');

      // Verify bilingual error message
      verifyBilingualMessage(response.body.error.message);
      expect(response.body.error.message.ar).toBe(
        expectedErrorMessages.USER_NOT_FOUND.ar,
      );
      expect(response.body.error.message.en).toBe(
        expectedErrorMessages.USER_NOT_FOUND.en,
      );
    });

    it('should return 400 when invalid ObjectId format provided', async () => {
      const invalidId = 'invalid-id-format';

      const response = await request(app.getHttpServer())
        .patch(`/users/${invalidId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(400);

      // Verify error response structure
      verifyApiResponse(response.body, false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 when isActive field is missing', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/users/${testUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      // Verify error response structure
      expect(response.body.message).toBeDefined();
    });

    it('should return 400 when isActive is not a boolean', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/users/${testUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: 'not-a-boolean' })
        .expect(400);

      // Verify error response structure
      expect(response.body.message).toBeDefined();
    });

    it('should allow activating own account', async () => {
      // First deactivate admin (using another admin or direct DB update)
      await userModel.findByIdAndUpdate(adminUserId, { isActive: false });

      // Admin should be able to activate their own account
      const response = await request(app.getHttpServer())
        .patch(`/users/${adminUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true })
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data.isActive).toBe(true);

      // Restore admin status
      await userModel.findByIdAndUpdate(adminUserId, { isActive: true });
    });

    it('should invalidate sessions when deactivating user', async () => {
      // Create a user with active session
      const userWithSession = await createTestUser(userModel, {
        email: 'sessiontest@clinic.com',
        password: 'SessionTest123!',
        firstName: 'Session',
        lastName: 'Test',
        role: 'staff',
        phone: '+1234567898',
        nationality: 'US',
        gender: 'male',
        isActive: true,
      });

      // Deactivate the user
      await request(app.getHttpServer())
        .patch(`/users/${userWithSession._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200);

      // Verify user is deactivated
      const deactivatedUser = await userModel.findById(userWithSession._id);
      expect(deactivatedUser.isActive).toBe(false);

      // Clean up
      await userModel.findByIdAndDelete(userWithSession._id);
    });
  });

  describe('POST /users/:id/deactivate-with-transfer - Deactivate Doctor with Transfer', () => {
    let doctorWithAppointmentsId: string;
    let targetDoctorId: string;
    let patientId: string;

    beforeEach(async () => {
      // Create a patient for appointments
      const patient = await createTestUser(userModel, {
        email: 'patient@clinic.com',
        password: 'Patient123!',
        firstName: 'Patient',
        lastName: 'Test',
        role: 'patient',
        phone: '+1234567800',
        nationality: 'US',
        gender: 'male',
        isActive: true,
      });
      patientId = patient._id.toString();

      // Create doctor with appointments
      const doctorWithAppointments = await createTestUser(userModel, {
        email: 'doctorwithappts@clinic.com',
        password: 'Doctor123!',
        firstName: 'Doctor',
        lastName: 'WithAppointments',
        role: 'doctor',
        phone: '+1234567801',
        nationality: 'US',
        gender: 'male',
        isActive: true,
      });
      doctorWithAppointmentsId = doctorWithAppointments._id.toString();

      // Create target doctor for transfer
      const targetDoctor = await createTestUser(userModel, {
        email: 'targetdoctor2@clinic.com',
        password: 'Target123!',
        firstName: 'Target',
        lastName: 'Doctor',
        role: 'doctor',
        phone: '+1234567802',
        nationality: 'US',
        gender: 'male',
        isActive: true,
      });
      targetDoctorId = targetDoctor._id.toString();

      // Create future appointments for the doctor
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await createTestAppointment(appointmentModel, {
        patientId,
        doctorId: doctorWithAppointmentsId,
        status: 'scheduled',
        appointmentDate: tomorrow,
        duration: 30,
        notes: 'Test appointment 1',
      });

      await createTestAppointment(appointmentModel, {
        patientId,
        doctorId: doctorWithAppointmentsId,
        status: 'confirmed',
        appointmentDate: new Date(tomorrow.getTime() + 86400000), // Day after tomorrow
        duration: 30,
        notes: 'Test appointment 2',
      });
    });

    afterEach(async () => {
      // Clean up test data
      if (doctorWithAppointmentsId) {
        await userModel.findByIdAndDelete(doctorWithAppointmentsId);
      }
      if (targetDoctorId) {
        await userModel.findByIdAndDelete(targetDoctorId);
      }
      if (patientId) {
        await userModel.findByIdAndDelete(patientId);
      }
      await appointmentModel.deleteMany({
        doctorId: { $in: [doctorWithAppointmentsId, targetDoctorId] },
      });
    });

    it('should successfully transfer appointments to target doctor', async () => {
      const response = await request(app.getHttpServer())
        .post(`/users/${doctorWithAppointmentsId}/deactivate-with-transfer`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          transferAppointments: true,
          targetDoctorId: targetDoctorId,
          skipTransfer: false,
        })
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.deactivatedUser).toBeDefined();
      expect(response.body.data.appointmentsTransferred).toBe(2);
      expect(response.body.data.appointmentsRescheduled).toBe(0);
      expect(response.body.data.targetDoctorId).toBe(targetDoctorId);

      // Verify bilingual message
      if (response.body.message) {
        verifyBilingualMessage(response.body.message);
      }

      // Verify doctor was deactivated
      const deactivatedDoctor = await userModel.findById(
        doctorWithAppointmentsId,
      );
      expect(deactivatedDoctor.isActive).toBe(false);
      expect(deactivatedDoctor.deactivatedAt).toBeDefined();
      expect(deactivatedDoctor.deactivatedBy).toBeDefined();

      // Verify appointments were transferred
      const transferredAppointments = await appointmentModel.find({
        doctorId: targetDoctorId,
        previousDoctorId: doctorWithAppointmentsId,
      });
      expect(transferredAppointments.length).toBe(2);

      // Verify transfer metadata
      transferredAppointments.forEach((appointment) => {
        expect(appointment.transferredAt).toBeDefined();
        expect(appointment.transferredBy).toBeDefined();
        expect(appointment.status).toMatch(/scheduled|confirmed/);
      });

      // Verify no appointments remain with old doctor
      const remainingAppointments = await appointmentModel.find({
        doctorId: doctorWithAppointmentsId,
        status: { $in: ['scheduled', 'confirmed'] },
      });
      expect(remainingAppointments.length).toBe(0);
    });

    it('should successfully skip transfer and mark appointments for rescheduling', async () => {
      const response = await request(app.getHttpServer())
        .post(`/users/${doctorWithAppointmentsId}/deactivate-with-transfer`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          transferAppointments: false,
          skipTransfer: true,
        })
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.appointmentsTransferred).toBe(0);
      expect(response.body.data.appointmentsRescheduled).toBe(2);

      // Verify doctor was deactivated
      const deactivatedDoctor = await userModel.findById(
        doctorWithAppointmentsId,
      );
      expect(deactivatedDoctor.isActive).toBe(false);

      // Verify appointments were marked for rescheduling
      const rescheduledAppointments = await appointmentModel.find({
        doctorId: doctorWithAppointmentsId,
        status: 'needs_rescheduling',
      });
      expect(rescheduledAppointments.length).toBe(2);

      // Verify rescheduling metadata
      rescheduledAppointments.forEach((appointment) => {
        expect(appointment.reschedulingReason).toBe('doctor_deactivated');
        expect(appointment.markedForReschedulingAt).toBeDefined();
        expect(appointment.markedBy).toBeDefined();
      });
    });

    it('should return 400 error when doctor has appointments but no transfer option provided', async () => {
      const response = await request(app.getHttpServer())
        .post(`/users/${doctorWithAppointmentsId}/deactivate-with-transfer`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          transferAppointments: false,
          skipTransfer: false,
        })
        .expect(400);

      // Verify error response structure
      verifyApiResponse(response.body, false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('DOCTOR_HAS_APPOINTMENTS');

      // Verify bilingual error message
      verifyBilingualMessage(response.body.error.message);
      expect(response.body.error.message.ar).toBe(
        expectedErrorMessages.DOCTOR_HAS_APPOINTMENTS.ar,
      );
      expect(response.body.error.message.en).toBe(
        expectedErrorMessages.DOCTOR_HAS_APPOINTMENTS.en,
      );

      // Verify error details include appointment count
      expect(response.body.error.details).toBeDefined();
      expect(response.body.error.details.appointmentCount).toBe(2);

      // Verify doctor was NOT deactivated
      const unchangedDoctor = await userModel.findById(
        doctorWithAppointmentsId,
      );
      expect(unchangedDoctor.isActive).toBe(true);
    });

    it('should return 403 when trying to deactivate own account', async () => {
      // Create a doctor and get their token
      const doctorResult = await registerAndLogin(app, {
        email: 'selfdoctor@clinic.com',
        password: 'SelfDoctor123!',
        firstName: 'Self',
        lastName: 'Doctor',
        role: 'doctor',
        phone: '+1234567803',
        nationality: 'US',
        gender: 'male',
        isActive: true,
      });

      const response = await request(app.getHttpServer())
        .post(`/users/${doctorResult.userId}/deactivate-with-transfer`)
        .set('Authorization', `Bearer ${doctorResult.accessToken}`)
        .send({
          transferAppointments: false,
          skipTransfer: true,
        })
        .expect(403);

      // Verify error response structure
      verifyApiResponse(response.body, false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('SELF_MODIFICATION_FORBIDDEN');

      // Verify bilingual error message
      verifyBilingualMessage(response.body.error.message);
      expect(response.body.error.message.ar).toBe(
        expectedErrorMessages.CANNOT_DEACTIVATE_SELF.ar,
      );
      expect(response.body.error.message.en).toBe(
        expectedErrorMessages.CANNOT_DEACTIVATE_SELF.en,
      );

      // Verify doctor status was NOT changed
      const unchangedDoctor = await userModel.findById(doctorResult.userId);
      expect(unchangedDoctor.isActive).toBe(true);

      // Clean up
      await userModel.findByIdAndDelete(doctorResult.userId);
    });

    it('should rollback transaction on transfer failure', async () => {
      // Create an inactive target doctor to cause transfer failure
      const inactiveDoctor = await createTestUser(userModel, {
        email: 'inactivedoctor@clinic.com',
        password: 'Inactive123!',
        firstName: 'Inactive',
        lastName: 'Doctor',
        role: 'doctor',
        phone: '+1234567804',
        nationality: 'US',
        gender: 'male',
        isActive: false,
      });

      const response = await request(app.getHttpServer())
        .post(`/users/${doctorWithAppointmentsId}/deactivate-with-transfer`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          transferAppointments: true,
          targetDoctorId: inactiveDoctor._id.toString(),
          skipTransfer: false,
        })
        .expect(400);

      // Verify error response
      verifyApiResponse(response.body, false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('USER_INACTIVE');

      // Verify bilingual error message
      verifyBilingualMessage(response.body.error.message);
      expect(response.body.error.message.ar).toBe(
        expectedErrorMessages.DEACTIVATED_USER_ASSIGNMENT.ar,
      );
      expect(response.body.error.message.en).toBe(
        expectedErrorMessages.DEACTIVATED_USER_ASSIGNMENT.en,
      );

      // Verify rollback: doctor should still be active
      const unchangedDoctor = await userModel.findById(
        doctorWithAppointmentsId,
      );
      expect(unchangedDoctor.isActive).toBe(true);
      expect(unchangedDoctor.deactivatedAt).toBeUndefined();

      // Verify rollback: appointments should not be transferred
      const untransferredAppointments = await appointmentModel.find({
        doctorId: doctorWithAppointmentsId,
        status: { $in: ['scheduled', 'confirmed'] },
      });
      expect(untransferredAppointments.length).toBe(2);

      // Verify no appointments were transferred to inactive doctor
      const noTransferredAppointments = await appointmentModel.find({
        doctorId: inactiveDoctor._id,
      });
      expect(noTransferredAppointments.length).toBe(0);

      // Clean up
      await userModel.findByIdAndDelete(inactiveDoctor._id);
    });

    it('should successfully deactivate doctor with no appointments', async () => {
      // Create a doctor without appointments
      const doctorNoAppointments = await createTestUser(userModel, {
        email: 'doctornoappts@clinic.com',
        password: 'DoctorNo123!',
        firstName: 'Doctor',
        lastName: 'NoAppointments',
        role: 'doctor',
        phone: '+1234567805',
        nationality: 'US',
        gender: 'male',
        isActive: true,
      });

      const response = await request(app.getHttpServer())
        .post(`/users/${doctorNoAppointments._id}/deactivate-with-transfer`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          transferAppointments: false,
          skipTransfer: false,
        })
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.appointmentsTransferred).toBe(0);
      expect(response.body.data.appointmentsRescheduled).toBe(0);

      // Verify doctor was deactivated
      const deactivatedDoctor = await userModel.findById(
        doctorNoAppointments._id,
      );
      expect(deactivatedDoctor.isActive).toBe(false);

      // Clean up
      await userModel.findByIdAndDelete(doctorNoAppointments._id);
    });

    it('should return 404 when doctor not found', async () => {
      const nonExistentDoctorId = generateObjectId();

      const response = await request(app.getHttpServer())
        .post(`/users/${nonExistentDoctorId}/deactivate-with-transfer`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          transferAppointments: false,
          skipTransfer: true,
        })
        .expect(404);

      // Verify error response structure
      verifyApiResponse(response.body, false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('ENTITY_NOT_FOUND');

      // Verify bilingual error message
      verifyBilingualMessage(response.body.error.message);
      expect(response.body.error.message.ar).toBe(
        expectedErrorMessages.DOCTOR_NOT_FOUND.ar,
      );
      expect(response.body.error.message.en).toBe(
        expectedErrorMessages.DOCTOR_NOT_FOUND.en,
      );
    });

    it('should return 404 when target doctor not found', async () => {
      const nonExistentTargetId = generateObjectId();

      const response = await request(app.getHttpServer())
        .post(`/users/${doctorWithAppointmentsId}/deactivate-with-transfer`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          transferAppointments: true,
          targetDoctorId: nonExistentTargetId,
          skipTransfer: false,
        })
        .expect(404);

      // Verify error response structure
      verifyApiResponse(response.body, false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('ENTITY_NOT_FOUND');

      // Verify bilingual error message
      verifyBilingualMessage(response.body.error.message);

      // Verify doctor was NOT deactivated (rollback)
      const unchangedDoctor = await userModel.findById(
        doctorWithAppointmentsId,
      );
      expect(unchangedDoctor.isActive).toBe(true);
    });

    it('should return 401 when no authentication token provided', async () => {
      await request(app.getHttpServer())
        .post(`/users/${doctorWithAppointmentsId}/deactivate-with-transfer`)
        .send({
          transferAppointments: false,
          skipTransfer: true,
        })
        .expect(401);
    });

    it('should return 400 when invalid ObjectId format provided', async () => {
      const invalidId = 'invalid-id-format';

      const response = await request(app.getHttpServer())
        .post(`/users/${invalidId}/deactivate-with-transfer`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          transferAppointments: false,
          skipTransfer: true,
        })
        .expect(400);

      // Verify error response structure
      verifyApiResponse(response.body, false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 when transferAppointments is missing', async () => {
      const response = await request(app.getHttpServer())
        .post(`/users/${doctorWithAppointmentsId}/deactivate-with-transfer`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          skipTransfer: true,
        })
        .expect(400);

      // Verify error response structure
      expect(response.body.message).toBeDefined();
    });

    it('should return 400 when targetDoctorId is missing but transferAppointments is true', async () => {
      const response = await request(app.getHttpServer())
        .post(`/users/${doctorWithAppointmentsId}/deactivate-with-transfer`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          transferAppointments: true,
          skipTransfer: false,
        })
        .expect(400);

      // Verify error response structure
      expect(response.body.message).toBeDefined();
    });

    it('should only transfer future appointments, not past ones', async () => {
      // Create a past appointment
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await createTestAppointment(appointmentModel, {
        patientId,
        doctorId: doctorWithAppointmentsId,
        status: 'completed',
        appointmentDate: yesterday,
        duration: 30,
        notes: 'Past appointment',
      });

      const response = await request(app.getHttpServer())
        .post(`/users/${doctorWithAppointmentsId}/deactivate-with-transfer`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          transferAppointments: true,
          targetDoctorId: targetDoctorId,
          skipTransfer: false,
        })
        .expect(200);

      // Verify only future appointments were transferred (2, not 3)
      expect(response.body.data.appointmentsTransferred).toBe(2);

      // Verify past appointment was not transferred
      const pastAppointment = await appointmentModel.findOne({
        doctorId: doctorWithAppointmentsId,
        appointmentDate: yesterday,
      });
      expect(pastAppointment).toBeDefined();
      expect(pastAppointment.status).toBe('completed');
      expect(pastAppointment.previousDoctorId).toBeUndefined();
    });
  });

  describe('GET /users/dropdown - Get Users for Dropdown', () => {
    let activeUser1Id: string;
    let activeUser2Id: string;
    let inactiveUserId: string;
    let testComplexId: string;

    beforeEach(async () => {
      // Create test complex
      const complexModel = app.get(getModelToken('Complex'));
      const testComplex = await createTestComplex(complexModel, {
        name: { ar: 'مجمع الاختبار', en: 'Test Complex' },
        address: 'Test Address',
        phone: '+1234567890',
        email: 'complex@test.com',
        isActive: true,
      });
      testComplexId = testComplex._id.toString();

      // Create active users with different roles
      const activeUser1 = await createTestUser(userModel, {
        email: 'activeuser1@clinic.com',
        password: 'Active123!',
        firstName: 'Active',
        lastName: 'User1',
        role: 'doctor',
        phone: '+1234567810',
        nationality: 'US',
        gender: 'male',
        isActive: true,
        complexId: testComplexId,
      });
      activeUser1Id = activeUser1._id.toString();

      const activeUser2 = await createTestUser(userModel, {
        email: 'activeuser2@clinic.com',
        password: 'Active123!',
        firstName: 'Active',
        lastName: 'User2',
        role: 'staff',
        phone: '+1234567811',
        nationality: 'US',
        gender: 'female',
        isActive: true,
        complexId: testComplexId,
      });
      activeUser2Id = activeUser2._id.toString();

      // Create inactive user
      const inactiveUser = await createTestUser(userModel, {
        email: 'inactiveuser@clinic.com',
        password: 'Inactive123!',
        firstName: 'Inactive',
        lastName: 'User',
        role: 'doctor',
        phone: '+1234567812',
        nationality: 'US',
        gender: 'male',
        isActive: false,
        complexId: testComplexId,
      });
      inactiveUserId = inactiveUser._id.toString();
    });

    afterEach(async () => {
      // Clean up test data
      if (activeUser1Id) {
        await userModel.findByIdAndDelete(activeUser1Id);
      }
      if (activeUser2Id) {
        await userModel.findByIdAndDelete(activeUser2Id);
      }
      if (inactiveUserId) {
        await userModel.findByIdAndDelete(inactiveUserId);
      }
      if (testComplexId) {
        const complexModel = app.get(getModelToken('Complex'));
        await complexModel.findByIdAndDelete(testComplexId);
      }
    });

    it('should return only active users', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/dropdown')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify only active users are returned
      const userIds = response.body.data.map((user: any) => user._id);
      expect(userIds).toContain(activeUser1Id);
      expect(userIds).toContain(activeUser2Id);
      expect(userIds).not.toContain(inactiveUserId);

      // Verify all returned users are active
      response.body.data.forEach((user: any) => {
        expect(user._id).toBeDefined();
        expect(user.firstName).toBeDefined();
        expect(user.lastName).toBeDefined();
        expect(user.email).toBeDefined();
        expect(user.role).toBeDefined();
      });
    });

    it('should apply role filter correctly', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/dropdown')
        .query({ role: 'doctor' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify only doctors are returned
      const userIds = response.body.data.map((user: any) => user._id);
      expect(userIds).toContain(activeUser1Id);
      expect(userIds).not.toContain(activeUser2Id); // staff user
      expect(userIds).not.toContain(inactiveUserId); // inactive doctor

      // Verify all returned users are doctors
      response.body.data.forEach((user: any) => {
        expect(user.role).toBe('doctor');
      });
    });

    it('should apply complex filter correctly', async () => {
      // Create another complex and user
      const complexModel = app.get(getModelToken('Complex'));
      const anotherComplex = await createTestComplex(complexModel, {
        name: { ar: 'مجمع آخر', en: 'Another Complex' },
        address: 'Another Address',
        phone: '+1234567891',
        email: 'another@test.com',
        isActive: true,
      });

      const userInAnotherComplex = await createTestUser(userModel, {
        email: 'anotherusercomplexuser@clinic.com',
        password: 'Another123!',
        firstName: 'Another',
        lastName: 'User',
        role: 'doctor',
        phone: '+1234567813',
        nationality: 'US',
        gender: 'male',
        isActive: true,
        complexId: anotherComplex._id.toString(),
      });

      const response = await request(app.getHttpServer())
        .get('/users/dropdown')
        .query({ complexId: testComplexId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify only users from test complex are returned
      const userIds = response.body.data.map((user: any) => user._id);
      expect(userIds).toContain(activeUser1Id);
      expect(userIds).toContain(activeUser2Id);
      expect(userIds).not.toContain(userInAnotherComplex._id.toString());
      expect(userIds).not.toContain(inactiveUserId); // inactive user

      // Clean up
      await userModel.findByIdAndDelete(userInAnotherComplex._id);
      await complexModel.findByIdAndDelete(anotherComplex._id);
    });

    it('should apply multiple filters (role and complex)', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/dropdown')
        .query({ role: 'doctor', complexId: testComplexId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify only active doctors from test complex are returned
      const userIds = response.body.data.map((user: any) => user._id);
      expect(userIds).toContain(activeUser1Id);
      expect(userIds).not.toContain(activeUser2Id); // staff user
      expect(userIds).not.toContain(inactiveUserId); // inactive doctor

      // Verify all returned users match filters
      response.body.data.forEach((user: any) => {
        expect(user.role).toBe('doctor');
      });
    });

    it('should return empty array when no users match filters', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/dropdown')
        .query({ role: 'nonexistent_role' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0);
    });

    it('should return users sorted by name', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/dropdown')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify users are sorted by firstName, lastName
      if (response.body.data.length > 1) {
        for (let i = 0; i < response.body.data.length - 1; i++) {
          const current = response.body.data[i];
          const next = response.body.data[i + 1];
          const currentName = `${current.firstName} ${current.lastName}`;
          const nextName = `${next.firstName} ${next.lastName}`;
          expect(currentName.localeCompare(nextName)).toBeLessThanOrEqual(0);
        }
      }
    });

    it('should return 401 when no authentication token provided', async () => {
      await request(app.getHttpServer()).get('/users/dropdown').expect(401);
    });

    it('should return 401 when invalid authentication token provided', async () => {
      await request(app.getHttpServer())
        .get('/users/dropdown')
        .set('Authorization', 'Bearer invalid-token-12345')
        .expect(401);
    });

    it('should not include sensitive fields in response', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/dropdown')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data).toBeDefined();

      // Verify sensitive fields are not included
      response.body.data.forEach((user: any) => {
        expect(user.password).toBeUndefined();
        expect(user.passwordHash).toBeUndefined();
        expect(user.refreshToken).toBeUndefined();
      });
    });
  });
});
