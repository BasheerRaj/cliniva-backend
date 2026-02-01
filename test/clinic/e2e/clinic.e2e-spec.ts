import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import request from 'supertest';

import { AppModule } from '../../../src/app.module';
import {
  adminUserData,
  testComplexData,
  anotherComplexData,
  testClinicData,
  inactiveClinicData,
  expectedErrorMessages,
  testEnvironment,
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

describe('Clinic Management (e2e)', () => {
  let app: INestApplication;
  let userModel: any;
  let complexModel: any;
  let clinicModel: any;
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
    complexModel = moduleFixture.get(getModelToken('Complex'));
    clinicModel = moduleFixture.get(getModelToken('Clinic'));

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

  describe('GET /clinics/by-complex/:complexId - Get Clinics by Complex', () => {
    let testComplexId: string;
    let anotherComplexId: string;
    let clinic1Id: string;
    let clinic2Id: string;
    let clinic3Id: string;
    let inactiveClinicId: string;

    beforeEach(async () => {
      // Create test complexes
      const testComplex = await createTestComplex(
        complexModel,
        testComplexData,
      );
      testComplexId = testComplex._id.toString();

      const anotherComplex = await createTestComplex(
        complexModel,
        anotherComplexData,
      );
      anotherComplexId = anotherComplex._id.toString();

      // Create clinics for test complex
      const clinic1 = await createTestClinic(clinicModel, {
        ...testClinicData,
        name: { ar: 'عيادة 1', en: 'Clinic 1' },
        email: 'clinic1@test.com',
        complexId: testComplexId,
        isActive: true,
      });
      clinic1Id = clinic1._id.toString();

      const clinic2 = await createTestClinic(clinicModel, {
        ...testClinicData,
        name: { ar: 'عيادة 2', en: 'Clinic 2' },
        email: 'clinic2@test.com',
        complexId: testComplexId,
        isActive: true,
      });
      clinic2Id = clinic2._id.toString();

      // Create inactive clinic for test complex
      const inactiveClinic = await createTestClinic(clinicModel, {
        ...inactiveClinicData,
        complexId: testComplexId,
      });
      inactiveClinicId = inactiveClinic._id.toString();

      // Create clinic for another complex
      const clinic3 = await createTestClinic(clinicModel, {
        ...testClinicData,
        name: { ar: 'عيادة 3', en: 'Clinic 3' },
        email: 'clinic3@test.com',
        complexId: anotherComplexId,
        isActive: true,
      });
      clinic3Id = clinic3._id.toString();
    });

    afterEach(async () => {
      // Clean up test data
      await clinicModel.deleteMany({});
      await complexModel.deleteMany({});
    });

    it('should return clinics for the specified complex', async () => {
      const response = await request(app.getHttpServer())
        .get(`/clinics/by-complex/${testComplexId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify correct clinics are returned
      const clinicIds = response.body.data.map((clinic: any) => clinic._id);
      expect(clinicIds).toContain(clinic1Id);
      expect(clinicIds).toContain(clinic2Id);
      expect(clinicIds).toContain(inactiveClinicId);
      expect(clinicIds).not.toContain(clinic3Id); // From another complex

      // Verify clinic data structure
      response.body.data.forEach((clinic: any) => {
        expect(clinic._id).toBeDefined();
        expect(clinic.name).toBeDefined();
        expect(clinic.address).toBeDefined();
        expect(clinic.phone).toBeDefined();
        expect(clinic.email).toBeDefined();
        expect(clinic.isActive).toBeDefined();
      });
    });

    it('should filter by isActive=true', async () => {
      const response = await request(app.getHttpServer())
        .get(`/clinics/by-complex/${testComplexId}`)
        .query({ isActive: true })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify only active clinics are returned
      const clinicIds = response.body.data.map((clinic: any) => clinic._id);
      expect(clinicIds).toContain(clinic1Id);
      expect(clinicIds).toContain(clinic2Id);
      expect(clinicIds).not.toContain(inactiveClinicId);

      // Verify all returned clinics are active
      response.body.data.forEach((clinic: any) => {
        expect(clinic.isActive).toBe(true);
      });
    });

    it('should filter by isActive=false', async () => {
      const response = await request(app.getHttpServer())
        .get(`/clinics/by-complex/${testComplexId}`)
        .query({ isActive: false })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify only inactive clinics are returned
      const clinicIds = response.body.data.map((clinic: any) => clinic._id);
      expect(clinicIds).not.toContain(clinic1Id);
      expect(clinicIds).not.toContain(clinic2Id);
      expect(clinicIds).toContain(inactiveClinicId);

      // Verify all returned clinics are inactive
      response.body.data.forEach((clinic: any) => {
        expect(clinic.isActive).toBe(false);
      });
    });

    it('should sort clinics by name ascending (default)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/clinics/by-complex/${testComplexId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify clinics are sorted by name
      if (response.body.data.length > 1) {
        for (let i = 0; i < response.body.data.length - 1; i++) {
          const current = response.body.data[i].name.en;
          const next = response.body.data[i + 1].name.en;
          expect(current.localeCompare(next)).toBeLessThanOrEqual(0);
        }
      }
    });

    it('should sort clinics by name descending', async () => {
      const response = await request(app.getHttpServer())
        .get(`/clinics/by-complex/${testComplexId}`)
        .query({ sortBy: 'name', sortOrder: 'desc' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify clinics are sorted by name descending
      if (response.body.data.length > 1) {
        for (let i = 0; i < response.body.data.length - 1; i++) {
          const current = response.body.data[i].name.en;
          const next = response.body.data[i + 1].name.en;
          expect(current.localeCompare(next)).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('should return empty array when complex has no clinics', async () => {
      // Create a complex with no clinics
      const emptyComplex = await createTestComplex(complexModel, {
        name: { ar: 'مجمع فارغ', en: 'Empty Complex' },
        address: 'Empty Address',
        phone: '+1234567905',
        email: 'empty@test.com',
        isActive: true,
      });

      const response = await request(app.getHttpServer())
        .get(`/clinics/by-complex/${emptyComplex._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0);

      // Clean up
      await complexModel.findByIdAndDelete(emptyComplex._id);
    });

    it('should return 404 when complex not found', async () => {
      const nonExistentComplexId = generateObjectId();

      const response = await request(app.getHttpServer())
        .get(`/clinics/by-complex/${nonExistentComplexId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      // Verify error response structure
      verifyApiResponse(response.body, false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('ENTITY_NOT_FOUND');

      // Verify bilingual error message
      verifyBilingualMessage(response.body.error.message);
      expect(response.body.error.message.ar).toBe(
        expectedErrorMessages.COMPLEX_NOT_FOUND.ar,
      );
      expect(response.body.error.message.en).toBe(
        expectedErrorMessages.COMPLEX_NOT_FOUND.en,
      );
    });

    it('should return 400 when invalid ObjectId format provided', async () => {
      const invalidId = 'invalid-id-format';

      const response = await request(app.getHttpServer())
        .get(`/clinics/by-complex/${invalidId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      // Verify error response structure
      verifyApiResponse(response.body, false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INVALID_ID_FORMAT');

      // Verify bilingual error message
      verifyBilingualMessage(response.body.error.message);
      expect(response.body.error.message.ar).toBe(
        expectedErrorMessages.INVALID_ID_FORMAT.ar,
      );
      expect(response.body.error.message.en).toBe(
        expectedErrorMessages.INVALID_ID_FORMAT.en,
      );
    });

    it('should return 401 when no authentication token provided', async () => {
      await request(app.getHttpServer())
        .get(`/clinics/by-complex/${testComplexId}`)
        .expect(401);
    });

    it('should return 401 when invalid authentication token provided', async () => {
      await request(app.getHttpServer())
        .get(`/clinics/by-complex/${testComplexId}`)
        .set('Authorization', 'Bearer invalid-token-12345')
        .expect(401);
    });

    it('should apply multiple filters (isActive and sortOrder)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/clinics/by-complex/${testComplexId}`)
        .query({ isActive: true, sortBy: 'name', sortOrder: 'desc' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify only active clinics are returned
      response.body.data.forEach((clinic: any) => {
        expect(clinic.isActive).toBe(true);
      });

      // Verify clinics are sorted descending
      if (response.body.data.length > 1) {
        for (let i = 0; i < response.body.data.length - 1; i++) {
          const current = response.body.data[i].name.en;
          const next = response.body.data[i + 1].name.en;
          expect(current.localeCompare(next)).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe('GET /clinics/dropdown - Get Clinics for Dropdown', () => {
    let testComplexId: string;
    let activeClinic1Id: string;
    let activeClinic2Id: string;
    let inactiveClinicId: string;

    beforeEach(async () => {
      // Create test complex
      const testComplex = await createTestComplex(
        complexModel,
        testComplexData,
      );
      testComplexId = testComplex._id.toString();

      // Create active clinics
      const activeClinic1 = await createTestClinic(clinicModel, {
        ...testClinicData,
        name: { ar: 'عيادة نشطة 1', en: 'Active Clinic 1' },
        email: 'activeclinic1@test.com',
        complexId: testComplexId,
        isActive: true,
      });
      activeClinic1Id = activeClinic1._id.toString();

      const activeClinic2 = await createTestClinic(clinicModel, {
        ...testClinicData,
        name: { ar: 'عيادة نشطة 2', en: 'Active Clinic 2' },
        email: 'activeclinic2@test.com',
        complexId: testComplexId,
        isActive: true,
      });
      activeClinic2Id = activeClinic2._id.toString();

      // Create inactive clinic
      const inactiveClinic = await createTestClinic(clinicModel, {
        ...inactiveClinicData,
        complexId: testComplexId,
      });
      inactiveClinicId = inactiveClinic._id.toString();
    });

    afterEach(async () => {
      // Clean up test data
      await clinicModel.deleteMany({});
      await complexModel.deleteMany({});
    });

    it('should return only active clinics', async () => {
      const response = await request(app.getHttpServer())
        .get('/clinics/dropdown')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify only active clinics are returned
      const clinicIds = response.body.data.map((clinic: any) => clinic._id);
      expect(clinicIds).toContain(activeClinic1Id);
      expect(clinicIds).toContain(activeClinic2Id);
      expect(clinicIds).not.toContain(inactiveClinicId);

      // Verify all returned clinics are active
      response.body.data.forEach((clinic: any) => {
        expect(clinic._id).toBeDefined();
        expect(clinic.name).toBeDefined();
      });
    });

    it('should filter by complexId', async () => {
      // Create another complex with a clinic
      const anotherComplex = await createTestComplex(
        complexModel,
        anotherComplexData,
      );
      const clinicInAnotherComplex = await createTestClinic(clinicModel, {
        ...testClinicData,
        name: { ar: 'عيادة في مجمع آخر', en: 'Clinic in Another Complex' },
        email: 'anotherc@test.com',
        complexId: anotherComplex._id.toString(),
        isActive: true,
      });

      const response = await request(app.getHttpServer())
        .get('/clinics/dropdown')
        .query({ complexId: testComplexId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify only clinics from test complex are returned
      const clinicIds = response.body.data.map((clinic: any) => clinic._id);
      expect(clinicIds).toContain(activeClinic1Id);
      expect(clinicIds).toContain(activeClinic2Id);
      expect(clinicIds).not.toContain(clinicInAnotherComplex._id.toString());
      expect(clinicIds).not.toContain(inactiveClinicId);

      // Clean up
      await clinicModel.findByIdAndDelete(clinicInAnotherComplex._id);
      await complexModel.findByIdAndDelete(anotherComplex._id);
    });

    it('should return empty array when no active clinics exist', async () => {
      // Delete all active clinics
      await clinicModel.deleteMany({ isActive: true });

      const response = await request(app.getHttpServer())
        .get('/clinics/dropdown')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0);
    });

    it('should return clinics sorted by name', async () => {
      const response = await request(app.getHttpServer())
        .get('/clinics/dropdown')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify clinics are sorted by name
      if (response.body.data.length > 1) {
        for (let i = 0; i < response.body.data.length - 1; i++) {
          const current =
            response.body.data[i].name.en || response.body.data[i].name;
          const next =
            response.body.data[i + 1].name.en || response.body.data[i + 1].name;
          const currentName =
            typeof current === 'string' ? current : current.en;
          const nextName = typeof next === 'string' ? next : next.en;
          expect(currentName.localeCompare(nextName)).toBeLessThanOrEqual(0);
        }
      }
    });

    it('should return 401 when no authentication token provided', async () => {
      await request(app.getHttpServer()).get('/clinics/dropdown').expect(401);
    });

    it('should return 401 when invalid authentication token provided', async () => {
      await request(app.getHttpServer())
        .get('/clinics/dropdown')
        .set('Authorization', 'Bearer invalid-token-12345')
        .expect(401);
    });

    it('should not include sensitive fields in response', async () => {
      const response = await request(app.getHttpServer())
        .get('/clinics/dropdown')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data).toBeDefined();

      // Verify only necessary fields are included
      response.body.data.forEach((clinic: any) => {
        expect(clinic._id).toBeDefined();
        expect(clinic.name).toBeDefined();
        // Sensitive or unnecessary fields should not be included
        expect(clinic.password).toBeUndefined();
        expect(clinic.internalNotes).toBeUndefined();
      });
    });

    it('should return empty array when filtering by non-existent complex', async () => {
      const nonExistentComplexId = generateObjectId();

      const response = await request(app.getHttpServer())
        .get('/clinics/dropdown')
        .query({ complexId: nonExistentComplexId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0);
    });
  });
});
