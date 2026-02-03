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

describe('Clinic Working Hours Validation Endpoint (e2e)', () => {
  let app: INestApplication;
  let userModel: any;
  let complexModel: any;
  let clinicModel: any;
  let workingHoursModel: any;
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
    workingHoursModel = moduleFixture.get(getModelToken('WorkingHours'));
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

  describe('POST /clinics/:id/validate-working-hours - Validate Working Hours', () => {
    let testComplexId: string;
    let testClinicId: string;

    beforeEach(async () => {
      // Create test complex
      const testComplex = await createTestComplex(
        complexModel,
        testComplexData,
      );
      testComplexId = testComplex._id.toString();

      // Create complex working hours (Mon-Fri: 08:00-18:00)
      await workingHoursModel.insertMany([
        {
          entityType: 'complex',
          entityId: new Types.ObjectId(testComplexId),
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '08:00',
          closingTime: '18:00',
          isActive: true,
        },
        {
          entityType: 'complex',
          entityId: new Types.ObjectId(testComplexId),
          dayOfWeek: 'tuesday',
          isWorkingDay: true,
          openingTime: '08:00',
          closingTime: '18:00',
          isActive: true,
        },
        {
          entityType: 'complex',
          entityId: new Types.ObjectId(testComplexId),
          dayOfWeek: 'wednesday',
          isWorkingDay: true,
          openingTime: '08:00',
          closingTime: '18:00',
          isActive: true,
        },
        {
          entityType: 'complex',
          entityId: new Types.ObjectId(testComplexId),
          dayOfWeek: 'thursday',
          isWorkingDay: true,
          openingTime: '08:00',
          closingTime: '18:00',
          isActive: true,
        },
        {
          entityType: 'complex',
          entityId: new Types.ObjectId(testComplexId),
          dayOfWeek: 'friday',
          isWorkingDay: true,
          openingTime: '08:00',
          closingTime: '18:00',
          isActive: true,
        },
        {
          entityType: 'complex',
          entityId: new Types.ObjectId(testComplexId),
          dayOfWeek: 'saturday',
          isWorkingDay: false,
          isActive: true,
        },
        {
          entityType: 'complex',
          entityId: new Types.ObjectId(testComplexId),
          dayOfWeek: 'sunday',
          isWorkingDay: false,
          isActive: true,
        },
      ]);

      // Create test clinic
      const testClinic = await createTestClinic(clinicModel, {
        ...testClinicData,
        complexId: new Types.ObjectId(testComplexId),
        isActive: true,
      });
      testClinicId = testClinic._id.toString();
    });

    afterEach(async () => {
      // Clean up test data
      await appointmentModel?.deleteMany({});
      await workingHoursModel?.deleteMany({});
      await clinicModel.deleteMany({});
      await complexModel.deleteMany({});
    });

    it('should validate working hours successfully when within complex hours', async () => {
      const validWorkingHours = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
        {
          dayOfWeek: 'tuesday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
      ];

      const response = await request(app.getHttpServer())
        .post(`/clinics/${testClinicId}/validate-working-hours`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ workingHours: validWorkingHours })
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      const { data } = response.body;

      expect(data.isValid).toBe(true);
      expect(data.errors).toBeDefined();
      expect(Array.isArray(data.errors)).toBe(true);
      expect(data.errors.length).toBe(0);
      expect(data.conflicts).toBeDefined();
      expect(data.requiresRescheduling).toBe(false);
      expect(data.affectedAppointments).toBe(0);

      // Verify bilingual message
      verifyBilingualMessage(response.body.message);
    });

    it('should reject hours outside complex hours', async () => {
      const invalidWorkingHours = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '07:00', // Before complex opens
          closingTime: '17:00',
        },
      ];

      const response = await request(app.getHttpServer())
        .post(`/clinics/${testClinicId}/validate-working-hours`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ workingHours: invalidWorkingHours })
        .expect(200);

      const { data } = response.body;

      expect(data.isValid).toBe(false);
      expect(data.errors.length).toBeGreaterThan(0);

      // Verify error structure
      const error = data.errors[0];
      expect(error.dayOfWeek).toBe('monday');
      expect(error.message).toBeDefined();
      verifyBilingualMessage(error.message);
      expect(error.message.ar).toContain('ساعات العيادة يجب أن تكون ضمن ساعات المجمع');
      expect(error.message.en).toContain('Clinic hours must be within complex hours');
      expect(error.complexHours).toBeDefined();
      expect(error.clinicHours).toBeDefined();
    });

    it('should reject clinic open when complex is closed', async () => {
      const invalidWorkingHours = [
        {
          dayOfWeek: 'saturday', // Complex is closed
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
      ];

      const response = await request(app.getHttpServer())
        .post(`/clinics/${testClinicId}/validate-working-hours`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ workingHours: invalidWorkingHours })
        .expect(200);

      const { data } = response.body;

      expect(data.isValid).toBe(false);
      expect(data.errors.length).toBeGreaterThan(0);

      // Verify error structure
      const error = data.errors[0];
      expect(error.dayOfWeek).toBe('saturday');
      verifyBilingualMessage(error.message);
      expect(error.message.ar).toContain('لا يمكن فتح العيادة');
      expect(error.message.ar).toContain('عندما يكون المجمع مغلقاً');
      expect(error.message.en).toContain('Clinic cannot be open');
      expect(error.message.en).toContain('when complex is closed');
    });

    it('should detect appointment conflicts', async () => {
      // Create a doctor
      const doctor = await userModel.create({
        email: 'doctor@test.com',
        password: 'Doctor123!',
        firstName: 'Test',
        lastName: 'Doctor',
        role: 'doctor',
        phone: '+1234567801',
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
        phone: '+1234567802',
        nationality: 'US',
        gender: 'male',
        isActive: true,
      });

      // Create an appointment at 19:00 (outside new hours)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // Next week
      futureDate.setHours(0, 0, 0, 0);

      // Set to Monday
      while (futureDate.getDay() !== 1) {
        futureDate.setDate(futureDate.getDate() + 1);
      }

      await appointmentModel.create({
        clinicId: new Types.ObjectId(testClinicId),
        patientId: patient._id,
        doctorId: doctor._id,
        appointmentDate: futureDate,
        appointmentTime: '19:00',
        status: 'scheduled',
        urgency: 'medium',
      });

      // Propose new hours that end at 17:00
      const newWorkingHours = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00', // Appointment at 19:00 will conflict
        },
      ];

      const response = await request(app.getHttpServer())
        .post(`/clinics/${testClinicId}/validate-working-hours`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ workingHours: newWorkingHours })
        .expect(200);

      const { data } = response.body;

      expect(data.conflicts).toBeDefined();
      expect(data.conflicts.appointments).toBeDefined();
      expect(Array.isArray(data.conflicts.appointments)).toBe(true);

      if (data.conflicts.appointments.length > 0) {
        const conflict = data.conflicts.appointments[0];
        expect(conflict.id).toBeDefined();
        expect(conflict.type).toBe('appointment');
        expect(conflict.name).toContain('Patient');
        expect(conflict.date).toBeDefined();
        expect(conflict.time).toBe('19:00');
        expect(conflict.reason).toBeDefined();
        verifyBilingualMessage(conflict.reason);
      }

      expect(data.requiresRescheduling).toBe(data.conflicts.appointments.length > 0);
      expect(data.affectedAppointments).toBe(data.conflicts.appointments.length);
    });

    it('should validate multiple days correctly', async () => {
      const multiDayHours = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
        {
          dayOfWeek: 'tuesday',
          isWorkingDay: true,
          openingTime: '07:00', // Invalid - before complex opens
          closingTime: '17:00',
        },
        {
          dayOfWeek: 'saturday', // Invalid - complex closed
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
      ];

      const response = await request(app.getHttpServer())
        .post(`/clinics/${testClinicId}/validate-working-hours`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ workingHours: multiDayHours })
        .expect(200);

      const { data } = response.body;

      expect(data.isValid).toBe(false);
      expect(data.errors.length).toBe(2); // Two invalid days

      // Verify both errors are present
      const errorDays = data.errors.map((e: any) => e.dayOfWeek);
      expect(errorDays).toContain('tuesday');
      expect(errorDays).toContain('saturday');
    });

    it('should return bilingual error messages', async () => {
      const invalidWorkingHours = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '07:00',
          closingTime: '19:00',
        },
      ];

      const response = await request(app.getHttpServer())
        .post(`/clinics/${testClinicId}/validate-working-hours`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ workingHours: invalidWorkingHours })
        .expect(200);

      const { data } = response.body;

      expect(data.errors.length).toBeGreaterThan(0);

      // Verify all error messages are bilingual
      data.errors.forEach((error: any) => {
        verifyBilingualMessage(error.message);
        expect(error.message.ar).toBeTruthy();
        expect(error.message.en).toBeTruthy();
        expect(typeof error.message.ar).toBe('string');
        expect(typeof error.message.en).toBe('string');
      });
    });

    it('should return 404 when clinic not found', async () => {
      const nonExistentClinicId = generateObjectId();

      const response = await request(app.getHttpServer())
        .post(`/clinics/${nonExistentClinicId}/validate-working-hours`)
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
        .expect(404);

      // Verify error response
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('CLINIC_007');
      verifyBilingualMessage(response.body.error.message);
    });

    it('should return 400 for invalid request body', async () => {
      const response = await request(app.getHttpServer())
        .post(`/clinics/${testClinicId}/validate-working-hours`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          workingHours: [
            {
              dayOfWeek: 'invalid-day',
              isWorkingDay: true,
              openingTime: 'invalid-time',
              closingTime: '17:00',
            },
          ],
        })
        .expect(400);

      // Verify validation error
      expect(response.body.success).toBe(false);
    });

    it('should return 401 when no authentication token provided', async () => {
      await request(app.getHttpServer())
        .post(`/clinics/${testClinicId}/validate-working-hours`)
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
        .expect(401);
    });

    it('should return 401 when invalid authentication token provided', async () => {
      await request(app.getHttpServer())
        .post(`/clinics/${testClinicId}/validate-working-hours`)
        .set('Authorization', 'Bearer invalid-token-12345')
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
        .expect(401);
    });

    it('should handle clinic without complex gracefully', async () => {
      // Create clinic without complex
      const clinicWithoutComplex = await createTestClinic(clinicModel, {
        ...testClinicData,
        name: { ar: 'عيادة بدون مجمع', en: 'Clinic Without Complex' },
        email: 'nocomplex@test.com',
        complexId: null,
        isActive: true,
      });

      const response = await request(app.getHttpServer())
        .post(`/clinics/${clinicWithoutComplex._id}/validate-working-hours`)
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
        .expect(400);

      // Verify error response
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      verifyBilingualMessage(response.body.error.message);
    });

    it('should handle empty working hours array', async () => {
      const response = await request(app.getHttpServer())
        .post(`/clinics/${testClinicId}/validate-working-hours`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ workingHours: [] })
        .expect(200);

      const { data } = response.body;

      expect(data.isValid).toBe(true);
      expect(data.errors.length).toBe(0);
      expect(data.conflicts.appointments.length).toBe(0);
    });
  });
});
