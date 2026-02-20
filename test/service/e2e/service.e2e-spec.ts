import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import request from 'supertest';

import { AppModule } from '../../../src/app.module';
import {
  adminUserData,
  validServiceData,
  departmentServiceData,
  clinicServiceData,
  expectedErrorMessages,
  testEnvironment,
} from '../fixtures/service.fixtures';
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

describe('Service Management (e2e)', () => {
  let app: INestApplication;
  let serviceModel: any;
  let userModel: any;
  let complexModel: any;
  let departmentModel: any;
  let clinicModel: any;
  let appointmentModel: any;
  let clinicServiceModel: any;
  let adminToken: string;
  let adminUserId: string;
  let testComplexId: string;
  let testDepartmentId: string;
  let testClinicId: string;

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
    serviceModel = moduleFixture.get(getModelToken('Service'));
    userModel = moduleFixture.get(getModelToken('User'));
    complexModel = moduleFixture.get(getModelToken('Complex'));
    departmentModel = moduleFixture.get(getModelToken('ComplexDepartment'));
    clinicModel = moduleFixture.get(getModelToken('Clinic'));
    appointmentModel = moduleFixture.get(getModelToken('Appointment'));
    clinicServiceModel = moduleFixture.get(getModelToken('ClinicService'));

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
  });

  afterAll(async () => {
    // Clean up after tests
    await cleanupTestData({
      userModel,
      complexModel,
      clinicModel,
      appointmentModel,
    });
    await serviceModel.deleteMany({});
    await clinicServiceModel.deleteMany({});
    await departmentModel.deleteMany({});
    await app.close();
  });

  describe('POST /services - Create Service', () => {
    it('should successfully create a service for complex department', async () => {
      const response = await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...departmentServiceData,
          complexDepartmentId: testDepartmentId,
        })
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.name).toBe(departmentServiceData.name);
      expect(response.body.complexDepartmentId).toBe(testDepartmentId);
      expect(response.body._id).toBeDefined();
    });

    it('should successfully create a service for clinic', async () => {
      const response = await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...clinicServiceData,
          clinicId: testClinicId,
        })
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.name).toBe(clinicServiceData.name);
      expect(response.body.clinicId).toBe(testClinicId);
      expect(response.body._id).toBeDefined();
    });

    it('should return 400 when service name already exists in department', async () => {
      // Create first service
      await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...validServiceData,
          name: 'Duplicate Service',
          complexDepartmentId: testDepartmentId,
        })
        .expect(201);

      // Try to create duplicate
      const response = await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...validServiceData,
          name: 'Duplicate Service',
          complexDepartmentId: testDepartmentId,
        })
        .expect(400);

      expect(response.body.message).toContain('already exists');
    });

    it('should return 400 when service name is too short', async () => {
      const response = await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'A',
          complexDepartmentId: testDepartmentId,
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should return 401 when no authentication token provided', async () => {
      await request(app.getHttpServer())
        .post('/services')
        .send(validServiceData)
        .expect(401);
    });
  });

  describe('GET /services/:id - Get Service by ID', () => {
    let testServiceId: string;

    beforeEach(async () => {
      const service = await serviceModel.create({
        ...validServiceData,
        complexDepartmentId: testDepartmentId,
      });
      testServiceId = service._id.toString();
    });

    afterEach(async () => {
      await serviceModel.findByIdAndDelete(testServiceId);
    });

    it('should successfully get service by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/services/${testServiceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body._id).toBe(testServiceId);
      expect(response.body.name).toBe(validServiceData.name);
    });

    it('should return 404 when service not found', async () => {
      const nonExistentId = generateObjectId();
      const response = await request(app.getHttpServer())
        .get(`/services/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.message).toBeDefined();
    });

    it('should return 401 when no authentication token provided', async () => {
      await request(app.getHttpServer())
        .get(`/services/${testServiceId}`)
        .expect(401);
    });
  });

  describe('PUT /services/:id - Update Service', () => {
    let testServiceId: string;

    beforeEach(async () => {
      const service = await serviceModel.create({
        ...validServiceData,
        complexDepartmentId: testDepartmentId,
      });
      testServiceId = service._id.toString();
    });

    afterEach(async () => {
      await serviceModel.findByIdAndDelete(testServiceId);
    });

    it('should successfully update service', async () => {
      const response = await request(app.getHttpServer())
        .put(`/services/${testServiceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Service Name',
          price: 200,
        })
        .expect(200);

      expect(response.body.name).toBe('Updated Service Name');
      expect(response.body.price).toBe(200);
    });

    it('should return 404 when service not found', async () => {
      const nonExistentId = generateObjectId();
      await request(app.getHttpServer())
        .put(`/services/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name' })
        .expect(404);
    });

    it('should return 400 when duplicate name provided', async () => {
      // Create another service
      const anotherService = await serviceModel.create({
        name: 'Another Service',
        complexDepartmentId: testDepartmentId,
        durationMinutes: 30,
        price: 100,
      });

      // Try to update with duplicate name
      const response = await request(app.getHttpServer())
        .put(`/services/${testServiceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Another Service',
        })
        .expect(400);

      expect(response.body.message).toContain('already exists');

      // Clean up
      await serviceModel.findByIdAndDelete(anotherService._id);
    });
  });

  describe('DELETE /services/:id - Delete Service', () => {
    let testServiceId: string;

    beforeEach(async () => {
      const service = await serviceModel.create({
        ...validServiceData,
        complexDepartmentId: testDepartmentId,
      });
      testServiceId = service._id.toString();
    });

    afterEach(async () => {
      await serviceModel.findByIdAndDelete(testServiceId);
    });

    it('should successfully delete service with no appointments', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/services/${testServiceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.deletedAt).toBeDefined();

      // Verify service is soft deleted
      const deletedService = await serviceModel.findById(testServiceId);
      expect(deletedService.deletedAt).toBeDefined();
    });

    it('should return 400 when service has active appointments', async () => {
      // Create a patient
      const patient = await createTestUser(userModel, {
        email: 'patient@test.com',
        password: 'Patient123!',
        firstName: 'Patient',
        lastName: 'Test',
        role: 'patient',
        phone: '+1234567892',
        nationality: 'US',
        gender: 'male',
        isActive: true,
      });

      // Create future appointment
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await createTestAppointment(appointmentModel, {
        patientId: patient._id,
        serviceId: testServiceId,
        status: 'scheduled',
        appointmentDate: tomorrow,
        duration: 30,
      });

      const response = await request(app.getHttpServer())
        .delete(`/services/${testServiceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.message).toBeDefined();
      expect(response.body.activeAppointmentsCount).toBeDefined();

      // Clean up
      await appointmentModel.deleteMany({ serviceId: testServiceId });
      await userModel.findByIdAndDelete(patient._id);
    });

    it('should return 404 when service not found', async () => {
      const nonExistentId = generateObjectId();
      await request(app.getHttpServer())
        .delete(`/services/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('POST /services/validate-names - Validate Service Names', () => {
    it('should return valid when no conflicts', async () => {
      const response = await request(app.getHttpServer())
        .post('/services/validate-names')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          serviceNames: ['New Service 1', 'New Service 2'],
          complexDepartmentId: testDepartmentId,
        })
        .expect(200);

      expect(response.body.isValid).toBe(true);
      expect(response.body.conflicts).toHaveLength(0);
    });

    it('should return conflicts when duplicates exist', async () => {
      // Create a service
      await serviceModel.create({
        name: 'Existing Service',
        complexDepartmentId: testDepartmentId,
        durationMinutes: 30,
        price: 100,
      });

      const response = await request(app.getHttpServer())
        .post('/services/validate-names')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          serviceNames: ['Existing Service', 'New Service'],
          complexDepartmentId: testDepartmentId,
        })
        .expect(200);

      expect(response.body.isValid).toBe(false);
      expect(response.body.conflicts.length).toBeGreaterThan(0);
    });
  });

  describe('GET /services/complex-departments/:complexDepartmentId - Get Services by Department', () => {
    beforeEach(async () => {
      // Create test services
      await serviceModel.create({
        name: 'Service 1',
        complexDepartmentId: testDepartmentId,
        durationMinutes: 30,
        price: 100,
      });
      await serviceModel.create({
        name: 'Service 2',
        complexDepartmentId: testDepartmentId,
        durationMinutes: 45,
        price: 150,
      });
    });

    afterEach(async () => {
      await serviceModel.deleteMany({ complexDepartmentId: testDepartmentId });
    });

    it('should return services for department', async () => {
      const response = await request(app.getHttpServer())
        .get(`/services/complex-departments/${testDepartmentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('POST /services/clinics/:clinicId/assign - Assign Services to Clinic', () => {
    let service1Id: string;
    let service2Id: string;

    beforeEach(async () => {
      const service1 = await serviceModel.create({
        name: 'Service to Assign 1',
        complexDepartmentId: testDepartmentId,
        durationMinutes: 30,
        price: 100,
      });
      service1Id = service1._id.toString();

      const service2 = await serviceModel.create({
        name: 'Service to Assign 2',
        complexDepartmentId: testDepartmentId,
        durationMinutes: 45,
        price: 150,
      });
      service2Id = service2._id.toString();
    });

    afterEach(async () => {
      await clinicServiceModel.deleteMany({ clinicId: testClinicId });
      await serviceModel.deleteMany({ _id: { $in: [service1Id, service2Id] } });
    });

    it('should successfully assign services to clinic', async () => {
      const response = await request(app.getHttpServer())
        .post(`/services/clinics/${testClinicId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          serviceAssignments: [
            {
              serviceId: service1Id,
              priceOverride: 110,
              isActive: true,
            },
            {
              serviceId: service2Id,
              priceOverride: 160,
              isActive: true,
            },
          ],
        })
        .expect(201);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });
  });

  describe('GET /services/clinics/:clinicId - Get Services by Clinic', () => {
    let serviceId: string;

    beforeEach(async () => {
      const service = await serviceModel.create({
        name: 'Clinic Service',
        complexDepartmentId: testDepartmentId,
        durationMinutes: 30,
        price: 100,
      });
      serviceId = service._id.toString();

      // Assign to clinic
      await clinicServiceModel.create({
        clinicId: testClinicId,
        serviceId: serviceId,
        isActive: true,
      });
    });

    afterEach(async () => {
      await clinicServiceModel.deleteMany({ clinicId: testClinicId });
      await serviceModel.findByIdAndDelete(serviceId);
    });

    it('should return services assigned to clinic', async () => {
      const response = await request(app.getHttpServer())
        .get(`/services/clinics/${testClinicId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('PATCH /services/:id/status - Change Service Status', () => {
    let testServiceId: string;

    beforeEach(async () => {
      const service = await serviceModel.create({
        ...validServiceData,
        complexDepartmentId: testDepartmentId,
        isActive: true,
      });
      testServiceId = service._id.toString();
    });

    afterEach(async () => {
      await serviceModel.findByIdAndDelete(testServiceId);
    });

    it('should successfully deactivate service', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/services/${testServiceId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isActive: false,
          reason: 'Service temporarily unavailable due to maintenance',
        })
        .expect(200);

      expect(response.body.isActive).toBe(false);
      expect(response.body.deactivatedAt).toBeDefined();

      // Verify in database
      const updatedService = await serviceModel.findById(testServiceId);
      expect(updatedService.isActive).toBe(false);
    });

    it('should successfully activate service', async () => {
      // First deactivate
      await serviceModel.findByIdAndUpdate(testServiceId, {
        isActive: false,
        deactivatedAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .patch(`/services/${testServiceId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isActive: true,
        })
        .expect(200);

      expect(response.body.isActive).toBe(true);
    });

    it('should return 400 when deactivating without reason', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/services/${testServiceId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isActive: false,
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should return 400 when reason is too short', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/services/${testServiceId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isActive: false,
          reason: 'Short',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('PATCH /services/bulk-status - Bulk Status Change', () => {
    let service1Id: string;
    let service2Id: string;

    beforeEach(async () => {
      const service1 = await serviceModel.create({
        name: 'Bulk Service 1',
        complexDepartmentId: testDepartmentId,
        durationMinutes: 30,
        price: 100,
        isActive: true,
      });
      service1Id = service1._id.toString();

      const service2 = await serviceModel.create({
        name: 'Bulk Service 2',
        complexDepartmentId: testDepartmentId,
        durationMinutes: 45,
        price: 150,
        isActive: true,
      });
      service2Id = service2._id.toString();
    });

    afterEach(async () => {
      await serviceModel.deleteMany({ _id: { $in: [service1Id, service2Id] } });
    });

    it('should successfully change status for multiple services', async () => {
      const response = await request(app.getHttpServer())
        .patch('/services/bulk-status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          serviceIds: [service1Id, service2Id],
          isActive: false,
          reason: 'Temporary closure due to maintenance',
          confirmRescheduling: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.updated).toBe(2);
    });
  });

  describe('GET /services/active - Get Active Services', () => {
    beforeEach(async () => {
      await serviceModel.create({
        name: 'Active Service 1',
        complexDepartmentId: testDepartmentId,
        durationMinutes: 30,
        price: 100,
        isActive: true,
      });
      await serviceModel.create({
        name: 'Inactive Service',
        complexDepartmentId: testDepartmentId,
        durationMinutes: 30,
        price: 100,
        isActive: false,
      });
    });

    afterEach(async () => {
      await serviceModel.deleteMany({ complexDepartmentId: testDepartmentId });
    });

    it('should return only active services', async () => {
      const response = await request(app.getHttpServer())
        .get('/services/active')
        .query({ complexDepartmentId: testDepartmentId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((service: any) => {
        expect(service.isActive).toBe(true);
      });
    });
  });
});


