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

describe('Clinic Capacity Endpoint (e2e)', () => {
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

  describe('GET /clinics/:id/capacity - Get Clinic Capacity Status', () => {
    let testComplexId: string;
    let testClinicId: string;

    beforeEach(async () => {
      // Create test complex
      const testComplex = await createTestComplex(
        complexModel,
        testComplexData,
      );
      testComplexId = testComplex._id.toString();

      // Create test clinic with capacity limits
      const testClinic = await createTestClinic(clinicModel, {
        ...testClinicData,
        complexId: new Types.ObjectId(testComplexId),
        maxDoctors: 10,
        maxStaff: 20,
        maxPatients: 100,
        isActive: true,
      });
      testClinicId = testClinic._id.toString();
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

    it('should return capacity status for a valid clinic', async () => {
      const response = await request(app.getHttpServer())
        .get(`/clinics/${testClinicId}/capacity`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data).toBeDefined();

      // Verify capacity data structure
      const { data } = response.body;
      expect(data.clinicId).toBe(testClinicId);
      expect(data.clinicName).toBeDefined();
      expect(data.capacity).toBeDefined();
      expect(data.recommendations).toBeDefined();
      expect(Array.isArray(data.recommendations)).toBe(true);

      // Verify doctors capacity
      expect(data.capacity.doctors).toBeDefined();
      expect(data.capacity.doctors.max).toBe(10);
      expect(data.capacity.doctors.current).toBeDefined();
      expect(typeof data.capacity.doctors.current).toBe('number');
      expect(data.capacity.doctors.available).toBeDefined();
      expect(data.capacity.doctors.percentage).toBeDefined();
      expect(typeof data.capacity.doctors.isExceeded).toBe('boolean');
      expect(Array.isArray(data.capacity.doctors.list)).toBe(true);

      // Verify staff capacity
      expect(data.capacity.staff).toBeDefined();
      expect(data.capacity.staff.max).toBe(20);
      expect(data.capacity.staff.current).toBeDefined();
      expect(typeof data.capacity.staff.current).toBe('number');
      expect(data.capacity.staff.available).toBeDefined();
      expect(data.capacity.staff.percentage).toBeDefined();
      expect(typeof data.capacity.staff.isExceeded).toBe('boolean');
      expect(Array.isArray(data.capacity.staff.list)).toBe(true);

      // Verify patients capacity
      expect(data.capacity.patients).toBeDefined();
      expect(data.capacity.patients.max).toBe(100);
      expect(data.capacity.patients.current).toBeDefined();
      expect(typeof data.capacity.patients.current).toBe('number');
      expect(data.capacity.patients.available).toBeDefined();
      expect(data.capacity.patients.percentage).toBeDefined();
      expect(typeof data.capacity.patients.isExceeded).toBe('boolean');
      expect(data.capacity.patients.count).toBeDefined();

      // Verify bilingual message
      verifyBilingualMessage(response.body.message);
      expect(response.body.message.ar).toBe('تم جلب حالة السعة بنجاح');
      expect(response.body.message.en).toBe(
        'Capacity status retrieved successfully',
      );
    });

    it('should detect capacity exceeded for doctors', async () => {
      // Create doctors exceeding capacity
      const doctors = [];
      for (let i = 0; i < 12; i++) {
        doctors.push({
          email: `doctor${i}@test.com`,
          password: 'Doctor123!',
          firstName: `Doctor${i}`,
          lastName: 'Test',
          role: 'doctor',
          phone: `+123456780${i}`,
          nationality: 'US',
          gender: 'male',
          clinicId: new Types.ObjectId(testClinicId),
          isActive: true,
        });
      }
      await userModel.insertMany(doctors);

      const response = await request(app.getHttpServer())
        .get(`/clinics/${testClinicId}/capacity`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify capacity exceeded
      const { data } = response.body;
      expect(data.capacity.doctors.current).toBe(12);
      expect(data.capacity.doctors.max).toBe(10);
      expect(data.capacity.doctors.isExceeded).toBe(true);
      expect(data.capacity.doctors.available).toBe(-2);
      expect(data.capacity.doctors.percentage).toBe(120);

      // Verify recommendations include doctor capacity warning
      expect(data.recommendations.length).toBeGreaterThan(0);
      expect(
        data.recommendations.some((r: string) =>
          r.toLowerCase().includes('doctor'),
        ),
      ).toBe(true);
    });

    it('should detect capacity exceeded for staff', async () => {
      // Create staff exceeding capacity
      const staff = [];
      for (let i = 0; i < 25; i++) {
        staff.push({
          email: `staff${i}@test.com`,
          password: 'Staff123!',
          firstName: `Staff${i}`,
          lastName: 'Test',
          role: 'nurse',
          phone: `+123456790${i % 10}`,
          nationality: 'US',
          gender: 'female',
          clinicId: new Types.ObjectId(testClinicId),
          isActive: true,
        });
      }
      await userModel.insertMany(staff);

      const response = await request(app.getHttpServer())
        .get(`/clinics/${testClinicId}/capacity`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify capacity exceeded
      const { data } = response.body;
      expect(data.capacity.staff.current).toBe(25);
      expect(data.capacity.staff.max).toBe(20);
      expect(data.capacity.staff.isExceeded).toBe(true);
      expect(data.capacity.staff.available).toBe(-5);
      expect(data.capacity.staff.percentage).toBe(125);

      // Verify recommendations include staff capacity warning
      expect(data.recommendations.length).toBeGreaterThan(0);
      expect(
        data.recommendations.some((r: string) =>
          r.toLowerCase().includes('staff'),
        ),
      ).toBe(true);
    });

    it('should include personnel lists in capacity breakdown', async () => {
      // Create some doctors and staff
      await userModel.insertMany([
        {
          email: 'doctor1@test.com',
          password: 'Doctor123!',
          firstName: 'John',
          lastName: 'Doe',
          role: 'doctor',
          phone: '+1234567801',
          nationality: 'US',
          gender: 'male',
          clinicId: new Types.ObjectId(testClinicId),
          isActive: true,
        },
        {
          email: 'nurse1@test.com',
          password: 'Nurse123!',
          firstName: 'Jane',
          lastName: 'Smith',
          role: 'nurse',
          phone: '+1234567802',
          nationality: 'US',
          gender: 'female',
          clinicId: new Types.ObjectId(testClinicId),
          isActive: true,
        },
      ]);

      const response = await request(app.getHttpServer())
        .get(`/clinics/${testClinicId}/capacity`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const { data } = response.body;

      // Verify doctors list structure
      expect(data.capacity.doctors.list.length).toBe(1);
      const doctor = data.capacity.doctors.list[0];
      expect(doctor.id).toBeDefined();
      expect(doctor.name).toBe('John Doe');
      expect(doctor.role).toBe('doctor');
      expect(doctor.email).toBe('doctor1@test.com');

      // Verify staff list structure
      expect(data.capacity.staff.list.length).toBe(1);
      const staff = data.capacity.staff.list[0];
      expect(staff.id).toBeDefined();
      expect(staff.name).toBe('Jane Smith');
      expect(staff.role).toBe('nurse');
      expect(staff.email).toBe('nurse1@test.com');
    });

    it('should calculate capacity correctly with zero limits', async () => {
      // Create clinic with zero capacity limits
      const zeroCapacityClinic = await createTestClinic(clinicModel, {
        ...testClinicData,
        name: { ar: 'عيادة بدون سعة', en: 'Zero Capacity Clinic' },
        email: 'zerocapacity@test.com',
        complexId: new Types.ObjectId(testComplexId),
        maxDoctors: 0,
        maxStaff: 0,
        maxPatients: 0,
        isActive: true,
      });

      const response = await request(app.getHttpServer())
        .get(`/clinics/${zeroCapacityClinic._id}/capacity`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const { data } = response.body;

      // Verify zero capacity
      expect(data.capacity.doctors.max).toBe(0);
      expect(data.capacity.doctors.percentage).toBe(0);
      expect(data.capacity.staff.max).toBe(0);
      expect(data.capacity.staff.percentage).toBe(0);
      expect(data.capacity.patients.max).toBe(0);
      expect(data.capacity.patients.percentage).toBe(0);
    });

    it('should return 404 when clinic not found', async () => {
      const nonExistentClinicId = generateObjectId();

      const response = await request(app.getHttpServer())
        .get(`/clinics/${nonExistentClinicId}/capacity`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      // Verify error response structure
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

      const response = await request(app.getHttpServer())
        .get(`/clinics/${invalidId}/capacity`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      // Verify error response
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 401 when no authentication token provided', async () => {
      await request(app.getHttpServer())
        .get(`/clinics/${testClinicId}/capacity`)
        .expect(401);
    });

    it('should return 401 when invalid authentication token provided', async () => {
      await request(app.getHttpServer())
        .get(`/clinics/${testClinicId}/capacity`)
        .set('Authorization', 'Bearer invalid-token-12345')
        .expect(401);
    });

    it('should not count inactive doctors and staff in capacity', async () => {
      // Create active and inactive doctors
      await userModel.insertMany([
        {
          email: 'activedoctor@test.com',
          password: 'Doctor123!',
          firstName: 'Active',
          lastName: 'Doctor',
          role: 'doctor',
          phone: '+1234567811',
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
          phone: '+1234567812',
          nationality: 'US',
          gender: 'male',
          clinicId: new Types.ObjectId(testClinicId),
          isActive: false,
        },
      ]);

      const response = await request(app.getHttpServer())
        .get(`/clinics/${testClinicId}/capacity`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const { data } = response.body;

      // Verify only active doctor is counted
      expect(data.capacity.doctors.current).toBe(1);
      expect(data.capacity.doctors.list.length).toBe(1);
      expect(data.capacity.doctors.list[0].name).toBe('Active Doctor');
    });
  });
});
