import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import request from 'supertest';

import { AppModule } from '../../../src/app.module';
import {
  adminUserData,
  doctorUserData,
  secondDoctorUserData,
  staffUserData,
  validAssignmentData,
  testEnvironment,
} from '../fixtures/doctor-specialties.fixtures';
import {
  registerAndLogin,
  createTestUser,
  cleanupTestData,
  generateObjectId,
} from '../../user/utils/test-helpers';

describe('Doctor-Specialties Management (e2e)', () => {
  let app: INestApplication;
  let doctorSpecialtyModel: any;
  let specialtyModel: any;
  let userModel: any;
  let adminToken: string;
  let doctor1Id: string;
  let doctor2Id: string;
  let staffId: string;
  let specialty1Id: string;
  let specialty2Id: string;

  beforeAll(async () => {
    Object.assign(process.env, testEnvironment);

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

    doctorSpecialtyModel = moduleFixture.get(getModelToken('DoctorSpecialty'));
    specialtyModel = moduleFixture.get(getModelToken('Specialty'));
    userModel = moduleFixture.get(getModelToken('User'));

    await doctorSpecialtyModel.deleteMany({});
    await specialtyModel.deleteMany({});
    await cleanupTestData({ userModel });

    const adminResult = await registerAndLogin(app, adminUserData);
    adminToken = adminResult.accessToken;

    // Create doctors and staff via authenticated owner
    const doctor1Res = await request(app.getHttpServer())
      .post('/auth/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(doctorUserData)
      .expect(201);
    doctor1Id = doctor1Res.body.user._id || doctor1Res.body.user.id;

    const doctor2Res = await request(app.getHttpServer())
      .post('/auth/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(secondDoctorUserData)
      .expect(201);
    doctor2Id = doctor2Res.body.user._id || doctor2Res.body.user.id;

    // Create staff via DB (owner may need scope for API registration)
    const { password: _pwd, ...staffData } = staffUserData;
    const staff = await createTestUser(userModel, {
      ...staffData,
      passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G2icYp2o5KfR3e',
    });
    staffId = staff._id.toString();

    const specialty1 = await specialtyModel.create({
      name: 'Cardiology',
      description: 'Heart and cardiovascular system',
      isActive: true,
    });
    specialty1Id = specialty1._id.toString();

    const specialty2 = await specialtyModel.create({
      name: 'Dermatology',
      description: 'Skin conditions',
      isActive: true,
    });
    specialty2Id = specialty2._id.toString();
  });

  afterAll(async () => {
    await doctorSpecialtyModel.deleteMany({});
    await specialtyModel.deleteMany({});
    await cleanupTestData({ userModel });
    await app.close();
  });

  describe('POST /doctor-specialties - Assign Specialty to Doctor', () => {
    afterEach(async () => {
      await doctorSpecialtyModel.deleteMany({});
    });

    it('should successfully assign specialty to doctor', async () => {
      const response = await request(app.getHttpServer())
        .post('/doctor-specialties')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          doctorId: doctor1Id,
          specialtyId: specialty1Id,
          ...validAssignmentData,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.doctorId).toBe(doctor1Id);
      expect(response.body.data.specialtyId).toBe(specialty1Id);
      expect(response.body.data.yearsOfExperience).toBe(
        validAssignmentData.yearsOfExperience,
      );
      expect(response.body.data.certificationNumber).toBe(
        validAssignmentData.certificationNumber,
      );
    });

    it('should assign with minimal data', async () => {
      const response = await request(app.getHttpServer())
        .post('/doctor-specialties')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          doctorId: doctor2Id,
          specialtyId: specialty2Id,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.yearsOfExperience).toBe(0);
    });

    it('should return 409 when doctor already assigned to specialty', async () => {
      await request(app.getHttpServer())
        .post('/doctor-specialties')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          doctorId: doctor1Id,
          specialtyId: specialty1Id,
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/doctor-specialties')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          doctorId: doctor1Id,
          specialtyId: specialty1Id,
        })
        .expect(409);

      expect(response.body.message).toContain('already assigned');
    });

    it('should return 400 when user is not a doctor', async () => {
      const response = await request(app.getHttpServer())
        .post('/doctor-specialties')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          doctorId: staffId,
          specialtyId: specialty1Id,
        })
        .expect(400);

      expect(response.body.message).toContain('not a doctor');
    });

    it('should return 404 when doctor not found', async () => {
      const nonExistentId = generateObjectId();
      await request(app.getHttpServer())
        .post('/doctor-specialties')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          doctorId: nonExistentId,
          specialtyId: specialty1Id,
        })
        .expect(404);
    });

    it('should return 404 when specialty not found', async () => {
      const nonExistentId = generateObjectId();
      await request(app.getHttpServer())
        .post('/doctor-specialties')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          doctorId: doctor1Id,
          specialtyId: nonExistentId,
        })
        .expect(404);
    });

    it('should return 401 when no authentication token provided', async () => {
      await request(app.getHttpServer())
        .post('/doctor-specialties')
        .send({
          doctorId: doctor1Id,
          specialtyId: specialty1Id,
        })
        .expect(401);
    });
  });

  describe('GET /doctor-specialties/doctor/:doctorId - Get Doctor Specialties', () => {
    beforeEach(async () => {
      await doctorSpecialtyModel.create({
        doctorId: doctor1Id,
        specialtyId: specialty1Id,
        yearsOfExperience: 5,
      });
      await doctorSpecialtyModel.create({
        doctorId: doctor1Id,
        specialtyId: specialty2Id,
        yearsOfExperience: 3,
      });
    });

    afterEach(async () => {
      await doctorSpecialtyModel.deleteMany({});
    });

    it('should return doctor specialties', async () => {
      const response = await request(app.getHttpServer())
        .get(`/doctor-specialties/doctor/${doctor1Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.count).toBe(response.body.data.length);
      if (response.body.data.length > 0) {
        expect(response.body.data[0]).toHaveProperty('specialty');
        expect(response.body.data[0].specialty).toHaveProperty('name');
      }
    });

    it('should return empty array when doctor has no specialties', async () => {
      const response = await request(app.getHttpServer())
        .get(`/doctor-specialties/doctor/${doctor2Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.count).toBe(0);
    });

    it('should return 400 for invalid doctor ID', async () => {
      await request(app.getHttpServer())
        .get('/doctor-specialties/doctor/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('GET /doctor-specialties/specialty/:specialtyId - Get Doctors by Specialty', () => {
    beforeEach(async () => {
      await doctorSpecialtyModel.create({
        doctorId: doctor1Id,
        specialtyId: specialty1Id,
      });
      await doctorSpecialtyModel.create({
        doctorId: doctor2Id,
        specialtyId: specialty1Id,
      });
    });

    afterEach(async () => {
      await doctorSpecialtyModel.deleteMany({});
    });

    it('should return doctors for specialty', async () => {
      const response = await request(app.getHttpServer())
        .get(`/doctor-specialties/specialty/${specialty1Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.count).toBe(response.body.data.length);
      if (response.body.data.length > 0) {
        expect(response.body.data[0]).toHaveProperty('doctor');
        expect(response.body.data[0].doctor).toHaveProperty('firstName');
      }
    });

    it('should return 400 for invalid specialty ID', async () => {
      await request(app.getHttpServer())
        .get('/doctor-specialties/specialty/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('GET /doctor-specialties/details/:id - Get Assignment by ID', () => {
    let assignmentId: string;

    beforeEach(async () => {
      const assignment = await doctorSpecialtyModel.create({
        doctorId: doctor1Id,
        specialtyId: specialty1Id,
        yearsOfExperience: 10,
        certificationNumber: 'CERT-999',
      });
      assignmentId = assignment._id.toString();
    });

    afterEach(async () => {
      await doctorSpecialtyModel.deleteMany({});
    });

    it('should return assignment details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/doctor-specialties/details/${assignmentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(assignmentId);
      expect(response.body.data.doctorId).toBe(doctor1Id);
      expect(response.body.data.specialtyId).toBe(specialty1Id);
      expect(response.body.data.yearsOfExperience).toBe(10);
      expect(response.body.data.certificationNumber).toBe('CERT-999');
      expect(response.body.data.doctor).toBeDefined();
      expect(response.body.data.specialty).toBeDefined();
    });

    it('should return 404 when assignment not found', async () => {
      const nonExistentId = generateObjectId();
      await request(app.getHttpServer())
        .get(`/doctor-specialties/details/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('GET /doctor-specialties - Search Assignments', () => {
    beforeEach(async () => {
      await doctorSpecialtyModel.create({
        doctorId: doctor1Id,
        specialtyId: specialty1Id,
      });
    });

    afterEach(async () => {
      await doctorSpecialtyModel.deleteMany({});
    });

    it('should return paginated search results', async () => {
      const response = await request(app.getHttpServer())
        .get('/doctor-specialties')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(1);
      expect(response.body.pagination.page).toBeDefined();
      expect(response.body.pagination.totalPages).toBeDefined();
    });

    it('should filter by doctorId', async () => {
      const response = await request(app.getHttpServer())
        .get('/doctor-specialties')
        .query({ doctorId: doctor1Id })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((item: any) => {
        expect(item.doctorId).toBe(doctor1Id);
      });
    });

    it('should filter by specialtyId', async () => {
      const response = await request(app.getHttpServer())
        .get('/doctor-specialties')
        .query({ specialtyId: specialty1Id })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((item: any) => {
        expect(item.specialtyId).toBe(specialty1Id);
      });
    });
  });

  describe('PUT /doctor-specialties/:id - Update Assignment', () => {
    let assignmentId: string;

    beforeEach(async () => {
      const assignment = await doctorSpecialtyModel.create({
        doctorId: doctor1Id,
        specialtyId: specialty1Id,
        yearsOfExperience: 5,
        certificationNumber: 'OLD-CERT',
      });
      assignmentId = assignment._id.toString();
    });

    afterEach(async () => {
      await doctorSpecialtyModel.deleteMany({});
    });

    it('should successfully update assignment', async () => {
      const response = await request(app.getHttpServer())
        .put(`/doctor-specialties/${assignmentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          yearsOfExperience: 15,
          certificationNumber: 'NEW-CERT-123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.yearsOfExperience).toBe(15);
      expect(response.body.data.certificationNumber).toBe('NEW-CERT-123');

      const updated = await doctorSpecialtyModel.findById(assignmentId);
      expect(updated.yearsOfExperience).toBe(15);
      expect(updated.certificationNumber).toBe('NEW-CERT-123');
    });

    it('should return 404 when assignment not found', async () => {
      const nonExistentId = generateObjectId();
      await request(app.getHttpServer())
        .put(`/doctor-specialties/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ yearsOfExperience: 10 })
        .expect(404);
    });
  });

  describe('DELETE /doctor-specialties/:id - Remove Assignment', () => {
    let assignmentId: string;

    beforeEach(async () => {
      const assignment = await doctorSpecialtyModel.create({
        doctorId: doctor1Id,
        specialtyId: specialty1Id,
      });
      assignmentId = assignment._id.toString();
    });

    afterEach(async () => {
      await doctorSpecialtyModel.deleteMany({});
    });

    it('should successfully remove assignment', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/doctor-specialties/${assignmentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('removed');

      const deleted = await doctorSpecialtyModel.findById(assignmentId);
      expect(deleted).toBeNull();
    });

    it('should return 404 when assignment not found', async () => {
      const nonExistentId = generateObjectId();
      await request(app.getHttpServer())
        .delete(`/doctor-specialties/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('POST /doctor-specialties/bulk-assign - Bulk Assign Specialties', () => {
    afterEach(async () => {
      await doctorSpecialtyModel.deleteMany({ doctorId: doctor2Id });
    });

    it('should successfully bulk assign specialties', async () => {
      const response = await request(app.getHttpServer())
        .post('/doctor-specialties/bulk-assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          doctorId: doctor2Id,
          specialtyIds: [specialty1Id, specialty2Id],
          yearsOfExperience: 3,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toBe(2);
      expect(response.body.data.failed).toBe(0);

      const assignments = await doctorSpecialtyModel.find({
        doctorId: doctor2Id,
      });
      expect(assignments.length).toBe(2);
    });

    it('should handle partial success when some already assigned', async () => {
      await doctorSpecialtyModel.create({
        doctorId: doctor2Id,
        specialtyId: specialty1Id,
      });

      const response = await request(app.getHttpServer())
        .post('/doctor-specialties/bulk-assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          doctorId: doctor2Id,
          specialtyIds: [specialty1Id, specialty2Id],
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toBe(1);
      expect(response.body.data.failed).toBe(1);
      expect(response.body.data.errors.length).toBeGreaterThan(0);
    });
  });

  describe('GET /doctor-specialties/stats - Get Assignment Statistics', () => {
    beforeEach(async () => {
      await doctorSpecialtyModel.create({
        doctorId: doctor1Id,
        specialtyId: specialty1Id,
      });
    });

    afterEach(async () => {
      await doctorSpecialtyModel.deleteMany({});
    });

    it('should return assignment statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/doctor-specialties/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data).toHaveProperty('totalAssignments');
      expect(response.body.data).toHaveProperty('doctorsWithSpecialties');
      expect(response.body.data).toHaveProperty('specialtiesAssigned');
    });
  });
});
