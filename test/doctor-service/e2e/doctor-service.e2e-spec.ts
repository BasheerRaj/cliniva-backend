import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import request from 'supertest';

import { AppModule } from '../../../src/app.module';
import {
  adminUserData,
  doctorUserData,
  targetDoctorData,
  expectedErrorMessages,
  testEnvironment,
} from '../fixtures/doctor-service.fixtures';
import {
  registerAndLogin,
  createTestUser,
  createTestComplex,
  createTestClinic,
  createTestAppointment,
  cleanupTestData,
  verifyBilingualMessage,
  verifyApiResponse,
  generateObjectId,
} from '../../user/utils/test-helpers';

describe('Doctor-Service Management (e2e)', () => {
  let app: INestApplication;
  let doctorServiceModel: any;
  let serviceModel: any;
  let userModel: any;
  let complexModel: any;
  let departmentModel: any;
  let clinicModel: any;
  let appointmentModel: any;
  let clinicServiceModel: any;
  let employeeShiftModel: any;
  let adminToken: string;
  let adminUserId: string;
  let doctor1Id: string;
  let doctor2Id: string;
  let testComplexId: string;
  let testDepartmentId: string;
  let testClinicId: string;
  let testServiceId: string;

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
    doctorServiceModel = moduleFixture.get(getModelToken('DoctorService'));
    serviceModel = moduleFixture.get(getModelToken('Service'));
    userModel = moduleFixture.get(getModelToken('User'));
    complexModel = moduleFixture.get(getModelToken('Complex'));
    departmentModel = moduleFixture.get(getModelToken('ComplexDepartment'));
    clinicModel = moduleFixture.get(getModelToken('Clinic'));
    appointmentModel = moduleFixture.get(getModelToken('Appointment'));
    clinicServiceModel = moduleFixture.get(getModelToken('ClinicService'));
    employeeShiftModel = moduleFixture.get(getModelToken('EmployeeShift'));

    // Clean up before tests
    await cleanupTestData({
      userModel,
      complexModel,
      clinicModel,
      appointmentModel,
    });

    // Register admin user
    const adminResult = await registerAndLogin(app, adminUserData);
    adminToken = adminResult.accessToken;
    adminUserId = adminResult.userId;

    // Register doctors
    const doctor1Result = await registerAndLogin(app, doctorUserData);
    doctor1Id = doctor1Result.userId;

    const doctor2Result = await registerAndLogin(app, targetDoctorData);
    doctor2Id = doctor2Result.userId;

    // Create test complex
    const complex = await createTestComplex(complexModel, {
      name: 'Test Medical Complex',
      email: 'complex@test.com',
      phone: '+1234567890',
      address: {
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        country: 'Test Country',
        postalCode: '12345',
      },
      status: 'active',
    });
    testComplexId = complex._id.toString();

    // Create test department
    const department = await departmentModel.create({
      name: 'Cardiology',
      description: 'Cardiology department',
      complexId: testComplexId,
      isActive: true,
    });
    testDepartmentId = department._id.toString();

    // Create test clinic
    const clinic = await createTestClinic(clinicModel, {
      name: { ar: 'عيادة الاختبار', en: 'Test Clinic' },
      email: 'clinic@test.com',
      phoneNumbers: ['+1234567891'],
      address: 'Test Address',
      complexId: testComplexId,
      complexDepartmentId: testDepartmentId,
      isActive: true,
    });
    testClinicId = clinic._id.toString();

    // Assign doctors to clinic
    await userModel.findByIdAndUpdate(doctor1Id, {
      clinicId: testClinicId,
    });
    await userModel.findByIdAndUpdate(doctor2Id, {
      clinicId: testClinicId,
    });

    // Create test service
    const service = await serviceModel.create({
      name: 'General Consultation',
      description: 'Standard consultation',
      durationMinutes: 30,
      price: 150,
      complexDepartmentId: testDepartmentId,
      isActive: true,
    });
    testServiceId = service._id.toString();

    // Assign service to clinic
    await clinicServiceModel.create({
      clinicId: testClinicId,
      serviceId: testServiceId,
      isActive: true,
    });
  });

  afterAll(async () => {
    // Clean up after tests
    await cleanupTestData({
      userModel,
      complexModel,
      clinicModel,
      appointmentModel,
    });
    await doctorServiceModel.deleteMany({});
    await serviceModel.deleteMany({});
    await clinicServiceModel.deleteMany({});
    await departmentModel.deleteMany({});
    await employeeShiftModel.deleteMany({});
    await app.close();
  });

  describe('POST /services/:serviceId/doctors - Assign Doctor to Service', () => {
    afterEach(async () => {
      await doctorServiceModel.deleteMany({
        serviceId: testServiceId,
        clinicId: testClinicId,
      });
    });

    it('should successfully assign doctor to service', async () => {
      const response = await request(app.getHttpServer())
        .post(`/services/${testServiceId}/doctors`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          doctorId: doctor1Id,
          clinicId: testClinicId,
          notes: 'Specialized in this service',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.doctorId).toBe(doctor1Id);
      expect(response.body.data.serviceId).toBe(testServiceId);
      expect(response.body.data.clinicId).toBe(testClinicId);
      expect(response.body.data.isActive).toBe(true);
    });

    it('should return 400 when doctor already assigned', async () => {
      // First assignment
      await request(app.getHttpServer())
        .post(`/services/${testServiceId}/doctors`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          doctorId: doctor1Id,
          clinicId: testClinicId,
        })
        .expect(201);

      // Try to assign again
      const response = await request(app.getHttpServer())
        .post(`/services/${testServiceId}/doctors`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          doctorId: doctor1Id,
          clinicId: testClinicId,
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should return 400 when doctor does not work at clinic', async () => {
      // Create doctor not assigned to clinic
      const doctorNotAtClinic = await createTestUser(userModel, {
        email: 'doctor-not-at-clinic@test.com',
        password: 'Doctor123!',
        firstName: 'Doctor',
        lastName: 'NotAtClinic',
        role: 'doctor',
        phone: '+1234567899',
        nationality: 'US',
        gender: 'male',
        isActive: true,
      });

      const response = await request(app.getHttpServer())
        .post(`/services/${testServiceId}/doctors`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          doctorId: doctorNotAtClinic._id.toString(),
          clinicId: testClinicId,
        })
        .expect(400);

      expect(response.body.message).toBeDefined();

      // Clean up
      await userModel.findByIdAndDelete(doctorNotAtClinic._id);
    });

    it('should return 404 when service not found', async () => {
      const nonExistentServiceId = generateObjectId();
      await request(app.getHttpServer())
        .post(`/services/${nonExistentServiceId}/doctors`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          doctorId: doctor1Id,
          clinicId: testClinicId,
        })
        .expect(404);
    });

    it('should return 401 when no authentication token provided', async () => {
      await request(app.getHttpServer())
        .post(`/services/${testServiceId}/doctors`)
        .send({
          doctorId: doctor1Id,
          clinicId: testClinicId,
        })
        .expect(401);
    });
  });

  describe('GET /services/:serviceId/doctors - Get Doctors for Service', () => {
    beforeEach(async () => {
      // Assign doctors
      await doctorServiceModel.create({
        doctorId: doctor1Id,
        serviceId: testServiceId,
        clinicId: testClinicId,
        isActive: true,
      });
      await doctorServiceModel.create({
        doctorId: doctor2Id,
        serviceId: testServiceId,
        clinicId: testClinicId,
        isActive: true,
      });
    });

    afterEach(async () => {
      await doctorServiceModel.deleteMany({
        serviceId: testServiceId,
      });
    });

    it('should return doctors assigned to service', async () => {
      const response = await request(app.getHttpServer())
        .get(`/services/${testServiceId}/doctors`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by clinic', async () => {
      const response = await request(app.getHttpServer())
        .get(`/services/${testServiceId}/doctors`)
        .query({ clinicId: testClinicId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should include stats when requested', async () => {
      const response = await request(app.getHttpServer())
        .get(`/services/${testServiceId}/doctors`)
        .query({ includeStats: 'true' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.length > 0) {
        expect(response.body.data[0]).toHaveProperty('activeAppointmentsCount');
        expect(response.body.data[0]).toHaveProperty('totalAppointmentsCount');
      }
    });
  });

  describe('GET /services/:serviceId/available-doctors - Get Available Doctors', () => {
    beforeEach(async () => {
      // Assign doctor1
      await doctorServiceModel.create({
        doctorId: doctor1Id,
        serviceId: testServiceId,
        clinicId: testClinicId,
        isActive: true,
      });
    });

    afterEach(async () => {
      await doctorServiceModel.deleteMany({
        serviceId: testServiceId,
      });
    });

    it('should return available doctors', async () => {
      const response = await request(app.getHttpServer())
        .get(`/services/${testServiceId}/available-doctors`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      // doctor2 should be available (not assigned)
      const doctor2 = response.body.data.find((d: any) => d._id === doctor2Id);
      expect(doctor2).toBeDefined();
      expect(doctor2.isAlreadyAssigned).toBe(false);
    });

    it('should mark already assigned doctors', async () => {
      const response = await request(app.getHttpServer())
        .get(`/services/${testServiceId}/available-doctors`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const doctor1 = response.body.data.find((d: any) => d._id === doctor1Id);
      expect(doctor1).toBeDefined();
      expect(doctor1.isAlreadyAssigned).toBe(true);
    });
  });

  describe('PATCH /services/:serviceId/doctors/:doctorId/deactivate - Deactivate Doctor from Service', () => {
    let assignmentId: string;

    beforeEach(async () => {
      const assignment = await doctorServiceModel.create({
        doctorId: doctor1Id,
        serviceId: testServiceId,
        clinicId: testClinicId,
        isActive: true,
      });
      assignmentId = assignment._id.toString();
    });

    afterEach(async () => {
      await doctorServiceModel.deleteMany({
        serviceId: testServiceId,
        doctorId: doctor1Id,
      });
      await appointmentModel.deleteMany({
        serviceId: testServiceId,
        doctorId: doctor1Id,
      });
    });

    it('should successfully deactivate doctor with no appointments', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/services/${testServiceId}/doctors/${doctor1Id}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clinicId: testClinicId,
          reason: 'Doctor transferred to another department',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(false);
      expect(response.body.data.deactivatedAt).toBeDefined();

      // Verify in database
      const deactivated = await doctorServiceModel.findById(assignmentId);
      expect(deactivated.isActive).toBe(false);
    });

    it('should return 400 when doctor has active appointments without transfer', async () => {
      // Create a patient
      const patient = await createTestUser(userModel, {
        email: 'patient@test.com',
        password: 'Patient123!',
        firstName: 'Patient',
        lastName: 'Test',
        role: 'patient',
        phone: '+1234567898',
        nationality: 'US',
        gender: 'male',
        isActive: true,
      });

      // Create future appointment
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await createTestAppointment(appointmentModel, {
        patientId: patient._id,
        doctorId: doctor1Id,
        serviceId: testServiceId,
        clinicId: testClinicId,
        status: 'scheduled',
        appointmentDate: tomorrow,
        duration: 30,
      });

      const response = await request(app.getHttpServer())
        .patch(`/services/${testServiceId}/doctors/${doctor1Id}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clinicId: testClinicId,
          reason: 'Doctor transferred to another department',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
      expect(response.body.activeAppointmentsCount).toBeDefined();
      expect(response.body.requiresTransfer).toBe(true);

      // Clean up
      await userModel.findByIdAndDelete(patient._id);
    });

    it('should successfully transfer appointments when provided', async () => {
      // Create a patient
      const patient = await createTestUser(userModel, {
        email: 'patient-transfer@test.com',
        password: 'Patient123!',
        firstName: 'Patient',
        lastName: 'Transfer',
        role: 'patient',
        phone: '+1234567897',
        nationality: 'US',
        gender: 'male',
        isActive: true,
      });

      // Create future appointment
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await createTestAppointment(appointmentModel, {
        patientId: patient._id,
        doctorId: doctor1Id,
        serviceId: testServiceId,
        clinicId: testClinicId,
        status: 'scheduled',
        appointmentDate: tomorrow,
        duration: 30,
      });

      const response = await request(app.getHttpServer())
        .patch(`/services/${testServiceId}/doctors/${doctor1Id}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clinicId: testClinicId,
          reason: 'Doctor transferred to another department',
          transferAppointmentsTo: doctor2Id,
          notifyPatients: false,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.appointmentsTransferred).toBeDefined();
      expect(response.body.data.appointmentsTransferred.count).toBe(1);

      // Verify appointment was transferred
      const transferredAppointment = await appointmentModel.findOne({
        doctorId: doctor2Id,
        serviceId: testServiceId,
      });
      expect(transferredAppointment).toBeDefined();

      // Clean up
      await userModel.findByIdAndDelete(patient._id);
    });

    it('should return 404 when assignment not found', async () => {
      const nonExistentDoctorId = generateObjectId();
      await request(app.getHttpServer())
        .patch(
          `/services/${testServiceId}/doctors/${nonExistentDoctorId}/deactivate`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clinicId: testClinicId,
          reason: 'Test reason for deactivation',
        })
        .expect(404);
    });
  });

  describe('DELETE /services/:serviceId/doctors/:doctorId - Remove Doctor from Service', () => {
    beforeEach(async () => {
      await doctorServiceModel.create({
        doctorId: doctor1Id,
        serviceId: testServiceId,
        clinicId: testClinicId,
        isActive: true,
      });
    });

    afterEach(async () => {
      await doctorServiceModel.deleteMany({
        serviceId: testServiceId,
        doctorId: doctor1Id,
      });
      await appointmentModel.deleteMany({
        serviceId: testServiceId,
        doctorId: doctor1Id,
      });
    });

    it('should successfully remove doctor with no appointments', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/services/${testServiceId}/doctors/${doctor1Id}`)
        .query({ clinicId: testClinicId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify deleted
      const deleted = await doctorServiceModel.findOne({
        serviceId: testServiceId,
        doctorId: doctor1Id,
        clinicId: testClinicId,
      });
      expect(deleted).toBeNull();
    });

    it('should return 400 when doctor has appointments', async () => {
      // Create a patient
      const patient = await createTestUser(userModel, {
        email: 'patient-delete@test.com',
        password: 'Patient123!',
        firstName: 'Patient',
        lastName: 'Delete',
        role: 'patient',
        phone: '+1234567896',
        nationality: 'US',
        gender: 'male',
        isActive: true,
      });

      // Create appointment (even past appointments prevent deletion)
      await createTestAppointment(appointmentModel, {
        patientId: patient._id,
        doctorId: doctor1Id,
        serviceId: testServiceId,
        clinicId: testClinicId,
        status: 'completed',
        appointmentDate: new Date(Date.now() - 86400000), // Yesterday
        duration: 30,
      });

      const response = await request(app.getHttpServer())
        .delete(`/services/${testServiceId}/doctors/${doctor1Id}`)
        .query({ clinicId: testClinicId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.message).toBeDefined();
      expect(response.body.totalAppointmentsCount).toBeDefined();
      expect(response.body.useDeactivateInstead).toBe(true);

      // Clean up
      await userModel.findByIdAndDelete(patient._id);
    });

    it('should return 404 when assignment not found', async () => {
      const nonExistentDoctorId = generateObjectId();
      await request(app.getHttpServer())
        .delete(`/services/${testServiceId}/doctors/${nonExistentDoctorId}`)
        .query({ clinicId: testClinicId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PATCH /services/:serviceId/doctors/:doctorId - Update Doctor Service Notes', () => {
    beforeEach(async () => {
      await doctorServiceModel.create({
        doctorId: doctor1Id,
        serviceId: testServiceId,
        clinicId: testClinicId,
        isActive: true,
        notes: 'Original notes',
      });
    });

    afterEach(async () => {
      await doctorServiceModel.deleteMany({
        serviceId: testServiceId,
        doctorId: doctor1Id,
      });
    });

    it('should successfully update notes', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/services/${testServiceId}/doctors/${doctor1Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clinicId: testClinicId,
          notes: 'Updated notes for this assignment',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notes).toBe(
        'Updated notes for this assignment',
      );

      // Verify in database
      const updated = await doctorServiceModel.findOne({
        serviceId: testServiceId,
        doctorId: doctor1Id,
        clinicId: testClinicId,
      });
      expect(updated.notes).toBe('Updated notes for this assignment');
    });

    it('should return 404 when assignment not found', async () => {
      const nonExistentDoctorId = generateObjectId();
      await request(app.getHttpServer())
        .patch(`/services/${testServiceId}/doctors/${nonExistentDoctorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clinicId: testClinicId,
          notes: 'Test notes',
        })
        .expect(404);
    });
  });
});
