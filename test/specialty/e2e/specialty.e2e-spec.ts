import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import request from 'supertest';

import { AppModule } from '../../../src/app.module';
import {
  adminUserData,
  doctorUserData,
  validSpecialtyData,
  secondSpecialtyData,
  testEnvironment,
} from '../fixtures/specialty.fixtures';
import {
  registerAndLogin,
  cleanupTestData,
  generateObjectId,
} from '../../user/utils/test-helpers';

describe('Specialty Management (e2e)', () => {
  let app: INestApplication;
  let specialtyModel: any;
  let doctorSpecialtyModel: any;
  let userModel: any;
  let complexModel: any;
  let adminToken: string;
  let doctorId: string;
  let testComplexId: string;
  let subscriptionModel: any;
  let subscriptionPlanModel: any;

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

    specialtyModel = moduleFixture.get(getModelToken('Specialty'));
    doctorSpecialtyModel = moduleFixture.get(getModelToken('DoctorSpecialty'));
    userModel = moduleFixture.get(getModelToken('User'));
    complexModel = moduleFixture.get(getModelToken('Complex'));
    subscriptionModel = moduleFixture.get(getModelToken('Subscription'));
    subscriptionPlanModel = moduleFixture.get(getModelToken('SubscriptionPlan'));

    await cleanupTestData({ userModel, complexModel });

    const adminResult = await registerAndLogin(app, adminUserData);
    adminToken = adminResult.accessToken;

    // Doctor must be created by owner (admin) - use register with auth
    const createDoctorRes = await request(app.getHttpServer())
      .post('/auth/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(doctorUserData)
      .expect(201);
    doctorId = createDoctorRes.body.user.id || createDoctorRes.body.user._id;

    // Create complex with required ownerId and subscriptionId (for complexId filter test)
    const plan = await subscriptionPlanModel.create({
      name: 'complex',
      maxOrganizations: 1,
      maxComplexes: 5,
      maxClinics: 10,
      price: 100,
    });
    const subscription = await subscriptionModel.create({
      userId: adminResult.userId,
      planId: plan._id,
      status: 'active',
    });
    const complex = await complexModel.create({
      name: 'Test Medical Complex',
      email: 'complex@specialty-test.com',
      ownerId: adminResult.userId,
      subscriptionId: subscription._id,
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
  });

  afterAll(async () => {
    await doctorSpecialtyModel.deleteMany({});
    await specialtyModel.deleteMany({});
    await complexModel.deleteMany({});
    await subscriptionModel?.deleteMany({});
    await subscriptionPlanModel?.deleteMany({});
    await cleanupTestData({ userModel, complexModel });
    await app.close();
  });

  describe('POST /specialties - Create Specialty', () => {
    afterEach(async () => {
      await specialtyModel.deleteMany({});
    });

    it('should successfully create a specialty', async () => {
      const response = await request(app.getHttpServer())
        .post('/specialties')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validSpecialtyData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe(validSpecialtyData.name);
      expect(response.body.data.description).toBe(validSpecialtyData.description);
      expect(response.body.data.isActive).toBe(true);
      expect(response.body.data._id).toBeDefined();
      expect(response.body.message).toBeDefined();
    });

    it('should create specialty with complexId', async () => {
      const response = await request(app.getHttpServer())
        .post('/specialties')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...validSpecialtyData,
          name: 'Pediatrics',
          complexId: testComplexId,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.complexId).toBe(testComplexId);
    });

    it('should return 409 when specialty name already exists', async () => {
      await request(app.getHttpServer())
        .post('/specialties')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validSpecialtyData)
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/specialties')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validSpecialtyData)
        .expect(409);

      expect(response.body.message).toBeDefined();
    });

    it('should return 400 when name is empty', async () => {
      await request(app.getHttpServer())
        .post('/specialties')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'No name' })
        .expect(400);
    });

    it('should return 401 when no authentication token provided', async () => {
      await request(app.getHttpServer())
        .post('/specialties')
        .send(validSpecialtyData)
        .expect(401);
    });
  });

  describe('GET /specialties - List Specialties', () => {
    beforeEach(async () => {
      await specialtyModel.create(validSpecialtyData);
      await specialtyModel.create(secondSpecialtyData);
    });

    afterEach(async () => {
      await specialtyModel.deleteMany({});
    });

    it('should return paginated list of specialties', async () => {
      const response = await request(app.getHttpServer())
        .get('/specialties')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.specialties).toBeDefined();
      expect(Array.isArray(response.body.data.specialties)).toBe(true);
      expect(response.body.data.total).toBeGreaterThanOrEqual(2);
      expect(response.body.data.page).toBeDefined();
      expect(response.body.data.totalPages).toBeDefined();
    });

    it('should filter by search', async () => {
      const response = await request(app.getHttpServer())
        .get('/specialties')
        .query({ search: 'Cardio' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.specialties.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data.specialties[0].name).toContain('Cardio');
    });

    it('should filter by isActive', async () => {
      await specialtyModel.updateOne(
        { name: validSpecialtyData.name },
        { isActive: false },
      );

      const response = await request(app.getHttpServer())
        .get('/specialties')
        .query({ isActive: 'false' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.specialties.forEach((s: any) => {
        expect(s.isActive).toBe(false);
      });
    });

    it('should return 401 when no authentication token provided', async () => {
      await request(app.getHttpServer()).get('/specialties').expect(401);
    });
  });

  describe('GET /specialties/:id - Get Specialty Details', () => {
    let testSpecialtyId: string;

    beforeEach(async () => {
      const specialty = await specialtyModel.create(validSpecialtyData);
      testSpecialtyId = specialty._id.toString();
    });

    afterEach(async () => {
      await specialtyModel.deleteMany({});
    });

    it('should successfully get specialty by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/specialties/${testSpecialtyId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testSpecialtyId);
      expect(response.body.data.name).toBe(validSpecialtyData.name);
      expect(response.body.data.assignedDoctors).toBeDefined();
      expect(response.body.data.statistics).toBeDefined();
    });

    it('should return 404 when specialty not found', async () => {
      const nonExistentId = generateObjectId();
      await request(app.getHttpServer())
        .get(`/specialties/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 401 when no authentication token provided', async () => {
      await request(app.getHttpServer())
        .get(`/specialties/${testSpecialtyId}`)
        .expect(401);
    });
  });

  describe('GET /specialties/:id/stats - Get Specialty Statistics', () => {
    let testSpecialtyId: string;

    beforeEach(async () => {
      const specialty = await specialtyModel.create(validSpecialtyData);
      testSpecialtyId = specialty._id.toString();
    });

    afterEach(async () => {
      await specialtyModel.deleteMany({});
    });

    it('should successfully get specialty statistics', async () => {
      const response = await request(app.getHttpServer())
        .get(`/specialties/${testSpecialtyId}/stats`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.statistics).toBeDefined();
      expect(response.body.data.statistics).toHaveProperty('totalDoctors');
      expect(response.body.data.statistics).toHaveProperty('totalAppointments');
      expect(response.body.data.statistics).toHaveProperty('averageExperience');
    });

    it('should return 404 when specialty not found', async () => {
      const nonExistentId = generateObjectId();
      await request(app.getHttpServer())
        .get(`/specialties/${nonExistentId}/stats`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PATCH /specialties/:id/status - Toggle Specialty Status', () => {
    let testSpecialtyId: string;

    beforeEach(async () => {
      const specialty = await specialtyModel.create(validSpecialtyData);
      testSpecialtyId = specialty._id.toString();
    });

    afterEach(async () => {
      await doctorSpecialtyModel.deleteMany({});
      await specialtyModel.deleteMany({});
    });

    it('should successfully deactivate specialty', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/specialties/${testSpecialtyId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isActive: false,
          reason: 'Temporarily unavailable',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(false);
      expect(response.body.data.deactivatedAt).toBeDefined();

      const updated = await specialtyModel.findById(testSpecialtyId);
      expect(updated.isActive).toBe(false);
    });

    it('should successfully activate specialty', async () => {
      await specialtyModel.findByIdAndUpdate(testSpecialtyId, {
        isActive: false,
        deactivatedAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .patch(`/specialties/${testSpecialtyId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(true);
    });

    it('should return 400 when deactivating specialty with assigned doctors', async () => {
      await doctorSpecialtyModel.create({
        doctorId: new Types.ObjectId(doctorId),
        specialtyId: new Types.ObjectId(testSpecialtyId),
      });

      await request(app.getHttpServer())
        .patch(`/specialties/${testSpecialtyId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false, reason: 'Test' })
        .expect(400);
    });

    it('should return 404 when specialty not found', async () => {
      const nonExistentId = generateObjectId();
      await request(app.getHttpServer())
        .patch(`/specialties/${nonExistentId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false, reason: 'Test' })
        .expect(404);
    });
  });

  describe('PUT /specialties/:id - Update Specialty', () => {
    let testSpecialtyId: string;

    beforeEach(async () => {
      const specialty = await specialtyModel.create(validSpecialtyData);
      testSpecialtyId = specialty._id.toString();
    });

    afterEach(async () => {
      await specialtyModel.deleteMany({});
    });

    it('should successfully update specialty', async () => {
      const response = await request(app.getHttpServer())
        .put(`/specialties/${testSpecialtyId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Cardiology',
          description: 'Updated description',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Cardiology');
      expect(response.body.data.description).toBe('Updated description');
    });

    it('should return 404 when specialty not found', async () => {
      const nonExistentId = generateObjectId();
      await request(app.getHttpServer())
        .put(`/specialties/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name' })
        .expect(404);
    });

    it('should return 409 when updating to duplicate name', async () => {
      await specialtyModel.create(secondSpecialtyData);

      await request(app.getHttpServer())
        .put(`/specialties/${testSpecialtyId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: secondSpecialtyData.name })
        .expect(409);
    });
  });

  describe('DELETE /specialties/:id - Delete Specialty', () => {
    let testSpecialtyId: string;

    beforeEach(async () => {
      const specialty = await specialtyModel.create({
        ...validSpecialtyData,
        isActive: false,
      });
      testSpecialtyId = specialty._id.toString();
    });

    afterEach(async () => {
      await doctorSpecialtyModel.deleteMany({});
      await specialtyModel.deleteMany({});
    });

    it('should successfully delete deactivated specialty with no doctors', async () => {
      await request(app.getHttpServer())
        .delete(`/specialties/${testSpecialtyId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      const deleted = await specialtyModel.findById(testSpecialtyId);
      expect(deleted).toBeNull();
    });

    it('should return 400 when specialty is still active', async () => {
      const activeSpecialty = await specialtyModel.create({
        ...secondSpecialtyData,
        isActive: true,
      });
      const activeId = activeSpecialty._id.toString();

      await request(app.getHttpServer())
        .delete(`/specialties/${activeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      await specialtyModel.findByIdAndDelete(activeId);
    });

    it('should return 400 when specialty has assigned doctors', async () => {
      await doctorSpecialtyModel.create({
        doctorId: new Types.ObjectId(doctorId),
        specialtyId: new Types.ObjectId(testSpecialtyId),
      });

      await request(app.getHttpServer())
        .delete(`/specialties/${testSpecialtyId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should return 404 when specialty not found', async () => {
      const nonExistentId = generateObjectId();
      await request(app.getHttpServer())
        .delete(`/specialties/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
