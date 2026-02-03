import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  validComplexData,
  statusUpdateFixtures,
  testEnvironment,
} from '../fixtures/complex.fixtures';
import {
  createTestComplex,
  createTestUser,
  createTestClinic,
  createClinicsForComplex,
  cleanupTestData,
  assertBilingualMessage,
  assertPaginationMetadata,
  assertComplexStructure,
  assertCapacityStructure,
  assertErrorResponse,
  assertSuccessResponse,
} from '../utils/test-helpers';

/**
 * Comprehensive integration tests for Complex Management Endpoints
 * Tests all 10 endpoints as specified in requirements
 */
describe('Complex Management (e2e)', () => {
  let app: INestApplication;
  let complexModel: Model<any>;
  let userModel: Model<any>;
  let clinicModel: Model<any>;
  let departmentModel: Model<any>;
  let appointmentModel: Model<any>;

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

    complexModel = moduleFixture.get(getModelToken('Complex'));
    userModel = moduleFixture.get(getModelToken('User'));
    clinicModel = moduleFixture.get(getModelToken('Clinic'));
    departmentModel = moduleFixture.get(getModelToken('Department'));
    appointmentModel = moduleFixture.get(getModelToken('Appointment'));
  });

  afterAll(async () => {
    await cleanupTestData({
      complexModel,
      userModel,
      clinicModel,
      departmentModel,
      appointmentModel,
    });
    await app.close();
  });

  beforeEach(async () => {
    await cleanupTestData({
      complexModel,
      userModel,
      clinicModel,
      departmentModel,
      appointmentModel,
    });
  });

  /**
   * Test 19.1: GET /complexes - List complexes with pagination and filters
   * Requirements: 1.1-1.11
   */
  describe('GET /complexes', () => {
    it('should return paginated list of complexes', async () => {
      await createTestComplex(complexModel, validComplexData);

      const response = await request(app.getHttpServer())
        .get('/complexes')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      assertPaginationMetadata(response.body.meta);
      assertBilingualMessage(response.body.message);
    });

    it('should filter by status', async () => {
      await createTestComplex(complexModel, {
        ...validComplexData,
        status: 'active',
      });
      await createTestComplex(complexModel, {
        ...validComplexData,
        email: 'inactive@test.com',
        status: 'inactive',
      });

      const response = await request(app.getHttpServer())
        .get('/complexes')
        .query({ status: 'active' })
        .expect(200);

      expect(response.body.data.every((c: any) => c.status === 'active')).toBe(
        true,
      );
    });

    it('should include counts when requested', async () => {
      await createTestComplex(complexModel, validComplexData);

      const response = await request(app.getHttpServer())
        .get('/complexes')
        .query({ includeCounts: true })
        .expect(200);

      if (response.body.data.length > 0) {
        expect(response.body.data[0]).toHaveProperty(
          'scheduledAppointmentsCount',
        );
        expect(response.body.data[0]).toHaveProperty('clinicsAssignedCount');
        expect(response.body.data[0]).toHaveProperty('capacity');
      }
    });

    it('should sort results correctly', async () => {
      await createTestComplex(complexModel, {
        ...validComplexData,
        name: 'Zebra',
      });
      await createTestComplex(complexModel, {
        ...validComplexData,
        name: 'Alpha',
        email: 'alpha@test.com',
      });

      const response = await request(app.getHttpServer())
        .get('/complexes')
        .query({ sortBy: 'name', sortOrder: 'asc' })
        .expect(200);

      expect(response.body.data[0].name).toBe('Alpha');
    });
  });

  /**
   * Test 19.2: GET /complexes/:id - Get complex details
   * Requirements: 2.1-2.9
   */
  describe('GET /complexes/:id', () => {
    it('should return complex details with all relationships', async () => {
      const complex = await createTestComplex(complexModel, validComplexData);

      const response = await request(app.getHttpServer())
        .get(`/complexes/${complex._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('scheduledAppointmentsCount');
      expect(response.body.data).toHaveProperty('clinicsAssignedCount');
      expect(response.body.data).toHaveProperty('departmentsCount');
      expect(response.body.data).toHaveProperty('capacity');
      assertComplexStructure(response.body.data);
      assertCapacityStructure(response.body.data.capacity);
    });

    it('should return 404 for non-existent complex', async () => {
      const fakeId = new Types.ObjectId();

      const response = await request(app.getHttpServer())
        .get(`/complexes/${fakeId}`)
        .expect(404);

      assertErrorResponse(response.body);
      expect(response.body.error.code).toBe('COMPLEX_006');
    });

    it('should return 400 for invalid complex ID', async () => {
      const response = await request(app.getHttpServer())
        .get('/complexes/invalid-id')
        .expect(400);

      assertErrorResponse(response.body);
    });
  });

  /**
   * Test 19.3: POST /complexes - Create complex
   * Requirements: 3.1-3.9
   */
  describe('POST /complexes', () => {
    it('should create complex with valid data', async () => {
      const response = await request(app.getHttpServer())
        .post('/complexes')
        .send(validComplexData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.name).toBe(validComplexData.name);
      expect(response.body.data.status).toBe('active');
      assertBilingualMessage(response.body.message);
    });

    it('should reject invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/complexes')
        .send({ ...validComplexData, email: 'invalid-email' })
        .expect(400);

      assertErrorResponse(response.body);
    });

    it('should reject missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/complexes')
        .send({ email: 'test@test.com' })
        .expect(400);

      assertErrorResponse(response.body);
    });
  });

  /**
   * Test 19.4: PUT /complexes/:id - Update complex
   * Requirements: 4.1-4.9
   */
  describe('PUT /complexes/:id', () => {
    it('should update complex with valid data', async () => {
      const complex = await createTestComplex(complexModel, validComplexData);

      const response = await request(app.getHttpServer())
        .put(`/complexes/${complex._id}`)
        .send({ name: 'Updated Complex Name' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Complex Name');
    });

    it('should return 404 for non-existent complex', async () => {
      const fakeId = new Types.ObjectId();

      const response = await request(app.getHttpServer())
        .put(`/complexes/${fakeId}`)
        .send({ name: 'Updated Name' })
        .expect(404);

      assertErrorResponse(response.body);
      expect(response.body.error.code).toBe('COMPLEX_006');
    });

    it('should validate email format on update', async () => {
      const complex = await createTestComplex(complexModel, validComplexData);

      const response = await request(app.getHttpServer())
        .put(`/complexes/${complex._id}`)
        .send({ email: 'invalid-email' })
        .expect(400);

      assertErrorResponse(response.body);
    });
  });

  /**
   * Test 19.5: DELETE /complexes/:id - Soft delete complex
   * Requirements: 5.1-5.6
   */
  describe('DELETE /complexes/:id', () => {
    it('should soft delete complex without active clinics', async () => {
      const complex = await createTestComplex(complexModel, validComplexData);

      const response = await request(app.getHttpServer())
        .delete(`/complexes/${complex._id}`)
        .expect(200);

      assertSuccessResponse(response.body);

      // Verify soft delete
      const deletedComplex = await complexModel.findById(complex._id);
      expect(deletedComplex.deletedAt).toBeDefined();
    });

    it('should prevent deletion with active clinics', async () => {
      const complex = await createTestComplex(complexModel, validComplexData);
      await createTestClinic(clinicModel, {
        complexId: complex._id,
        isActive: true,
        deletedAt: null,
      });

      const response = await request(app.getHttpServer())
        .delete(`/complexes/${complex._id}`)
        .expect(400);

      assertErrorResponse(response.body);
      expect(response.body.error.code).toBe('COMPLEX_003');
    });

    it('should return 404 for non-existent complex', async () => {
      const fakeId = new Types.ObjectId();

      const response = await request(app.getHttpServer())
        .delete(`/complexes/${fakeId}`)
        .expect(404);

      assertErrorResponse(response.body);
      expect(response.body.error.code).toBe('COMPLEX_006');
    });
  });

  /**
   * Test 19.6: PATCH /complexes/:id/status - Update status with cascading
   * Requirements: 6.1-6.10
   */
  describe('PATCH /complexes/:id/status', () => {
    it('should update status to inactive', async () => {
      const complex = await createTestComplex(complexModel, validComplexData);

      const response = await request(app.getHttpServer())
        .patch(`/complexes/${complex._id}/status`)
        .send(statusUpdateFixtures.deactivate)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.complex.status).toBe('inactive');
      expect(response.body.data).toHaveProperty('servicesDeactivated');
    });

    it('should transfer clinics when deactivating', async () => {
      const sourceComplex = await createTestComplex(
        complexModel,
        validComplexData,
      );
      const targetComplex = await createTestComplex(complexModel, {
        ...validComplexData,
        email: 'target@test.com',
        name: 'Target Complex',
      });
      await createClinicsForComplex(
        clinicModel,
        sourceComplex._id.toString(),
        2,
      );

      const response = await request(app.getHttpServer())
        .patch(`/complexes/${sourceComplex._id}/status`)
        .send({
          ...statusUpdateFixtures.deactivateWithTransfer,
          targetComplexId: targetComplex._id.toString(),
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('clinicsTransferred');
      expect(response.body.data.clinicsTransferred).toBeGreaterThan(0);
    });

    it('should require target complex when deactivating with clinics', async () => {
      const complex = await createTestComplex(complexModel, validComplexData);
      await createTestClinic(clinicModel, { complexId: complex._id });

      const response = await request(app.getHttpServer())
        .patch(`/complexes/${complex._id}/status`)
        .send(statusUpdateFixtures.deactivate)
        .expect(400);

      assertErrorResponse(response.body);
      expect(response.body.error.code).toBe('COMPLEX_004');
    });
  });

  /**
   * Test 19.7: GET /complexes/:id/capacity - Get capacity calculations
   * Requirements: 7.1-7.6
   */
  describe('GET /complexes/:id/capacity', () => {
    it('should return capacity breakdown', async () => {
      const complex = await createTestComplex(complexModel, validComplexData);
      await createTestClinic(clinicModel, {
        complexId: complex._id,
        maxDoctors: 10,
        maxStaff: 20,
        maxPatients: 100,
      });

      const response = await request(app.getHttpServer())
        .get(`/complexes/${complex._id}/capacity`)
        .expect(200);

      expect(response.body.success).toBe(true);
      assertCapacityStructure(response.body.data);
      expect(response.body.data.total.maxDoctors).toBeGreaterThan(0);
    });

    it('should include recommendations when over capacity', async () => {
      const complex = await createTestComplex(complexModel, validComplexData);
      const clinic = await createTestClinic(clinicModel, {
        complexId: complex._id,
        maxDoctors: 1,
      });

      // Create users exceeding capacity
      await createTestUser(userModel, { clinicId: clinic._id, role: 'doctor' });
      await createTestUser(userModel, {
        clinicId: clinic._id,
        role: 'doctor',
        email: 'doctor2@test.com',
      });

      const response = await request(app.getHttpServer())
        .get(`/complexes/${complex._id}/capacity`)
        .expect(200);

      if (response.body.data.utilization.doctors > 100) {
        expect(response.body.data).toHaveProperty('recommendations');
        expect(Array.isArray(response.body.data.recommendations)).toBe(true);
      }
    });

    it('should return 404 for non-existent complex', async () => {
      const fakeId = new Types.ObjectId();

      const response = await request(app.getHttpServer())
        .get(`/complexes/${fakeId}/capacity`)
        .expect(404);

      assertErrorResponse(response.body);
      expect(response.body.error.code).toBe('COMPLEX_006');
    });
  });

  /**
   * Test 19.8: PATCH /complexes/:id/pic - Assign person-in-charge
   * Requirements: 8.1-8.6
   */
  describe('PATCH /complexes/:id/pic', () => {
    it('should assign person-in-charge', async () => {
      const complex = await createTestComplex(complexModel, validComplexData);
      const user = await createTestUser(userModel, {
        role: 'admin',
        complexId: complex._id,
      });

      const response = await request(app.getHttpServer())
        .patch(`/complexes/${complex._id}/pic`)
        .send({ userId: user._id.toString() })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.personInChargeId).toBeDefined();
    });

    it('should reject patient role as PIC', async () => {
      const complex = await createTestComplex(complexModel, validComplexData);
      const patient = await createTestUser(userModel, {
        role: 'patient',
        complexId: complex._id,
      });

      const response = await request(app.getHttpServer())
        .patch(`/complexes/${complex._id}/pic`)
        .send({ userId: patient._id.toString() })
        .expect(400);

      assertErrorResponse(response.body);
      expect(response.body.error.code).toBe('COMPLEX_002');
    });

    it('should return 404 for non-existent complex', async () => {
      const fakeId = new Types.ObjectId();
      const user = await createTestUser(userModel, { role: 'admin' });

      const response = await request(app.getHttpServer())
        .patch(`/complexes/${fakeId}/pic`)
        .send({ userId: user._id.toString() })
        .expect(404);

      assertErrorResponse(response.body);
      expect(response.body.error.code).toBe('COMPLEX_006');
    });
  });

  /**
   * Test 19.9: DELETE /complexes/:id/pic - Remove person-in-charge
   * Requirements: 9.1-9.4
   */
  describe('DELETE /complexes/:id/pic', () => {
    it('should remove person-in-charge', async () => {
      const user = await createTestUser(userModel, { role: 'admin' });
      const complex = await createTestComplex(complexModel, {
        ...validComplexData,
        personInChargeId: user._id,
      });

      const response = await request(app.getHttpServer())
        .delete(`/complexes/${complex._id}/pic`)
        .expect(200);

      assertSuccessResponse(response.body);

      // Verify PIC removed
      const updatedComplex = await complexModel.findById(complex._id);
      expect(updatedComplex.personInChargeId).toBeNull();
    });

    it('should return 404 for non-existent complex', async () => {
      const fakeId = new Types.ObjectId();

      const response = await request(app.getHttpServer())
        .delete(`/complexes/${fakeId}/pic`)
        .expect(404);

      assertErrorResponse(response.body);
      expect(response.body.error.code).toBe('COMPLEX_006');
    });
  });

  /**
   * Test 19.10: POST /complexes/:id/transfer-clinics - Transfer clinics
   * Requirements: 10.1-10.10
   */
  describe('POST /complexes/:id/transfer-clinics', () => {
    it('should transfer clinics between complexes', async () => {
      const sourceComplex = await createTestComplex(
        complexModel,
        validComplexData,
      );
      const targetComplex = await createTestComplex(complexModel, {
        ...validComplexData,
        email: 'target@test.com',
        name: 'Target Complex',
      });
      const clinics = await createClinicsForComplex(
        clinicModel,
        sourceComplex._id.toString(),
        2,
      );

      const response = await request(app.getHttpServer())
        .post(`/complexes/${sourceComplex._id}/transfer-clinics`)
        .send({
          targetComplexId: targetComplex._id.toString(),
          clinicIds: clinics.map((c) => c._id.toString()),
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.clinicsTransferred).toBe(2);
      expect(response.body.data).toHaveProperty('staffUpdated');
      expect(response.body.data).toHaveProperty('conflicts');
    });

    it('should validate clinic ownership', async () => {
      const sourceComplex = await createTestComplex(
        complexModel,
        validComplexData,
      );
      const targetComplex = await createTestComplex(complexModel, {
        ...validComplexData,
        email: 'target@test.com',
        name: 'Target Complex',
      });
      const otherComplex = await createTestComplex(complexModel, {
        ...validComplexData,
        email: 'other@test.com',
        name: 'Other Complex',
      });
      const clinic = await createTestClinic(clinicModel, {
        complexId: otherComplex._id,
      });

      const response = await request(app.getHttpServer())
        .post(`/complexes/${sourceComplex._id}/transfer-clinics`)
        .send({
          targetComplexId: targetComplex._id.toString(),
          clinicIds: [clinic._id.toString()],
        })
        .expect(400);

      assertErrorResponse(response.body);
    });

    it('should require at least one clinic ID', async () => {
      const sourceComplex = await createTestComplex(
        complexModel,
        validComplexData,
      );
      const targetComplex = await createTestComplex(complexModel, {
        ...validComplexData,
        email: 'target@test.com',
        name: 'Target Complex',
      });

      const response = await request(app.getHttpServer())
        .post(`/complexes/${sourceComplex._id}/transfer-clinics`)
        .send({
          targetComplexId: targetComplex._id.toString(),
          clinicIds: [],
        })
        .expect(400);

      assertErrorResponse(response.body);
    });

    it('should validate target complex exists and is active', async () => {
      const sourceComplex = await createTestComplex(
        complexModel,
        validComplexData,
      );
      const clinics = await createClinicsForComplex(
        clinicModel,
        sourceComplex._id.toString(),
        1,
      );
      const fakeTargetId = new Types.ObjectId();

      const response = await request(app.getHttpServer())
        .post(`/complexes/${sourceComplex._id}/transfer-clinics`)
        .send({
          targetComplexId: fakeTargetId.toString(),
          clinicIds: clinics.map((c) => c._id.toString()),
        })
        .expect(400);

      assertErrorResponse(response.body);
      expect(response.body.error.code).toBe('COMPLEX_005');
    });
  });
});
