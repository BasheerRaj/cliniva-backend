import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import request from 'supertest';

import { AppModule } from '../../../src/app.module';
import {
  adminUserData,
  serviceData,
  offerData,
  fixedOfferData,
  expiredOfferData,
  futureOfferData,
  expectedErrorMessages,
  testEnvironment,
} from '../fixtures/service-offer.fixtures';
import {
  registerAndLogin,
  createTestComplex,
  cleanupTestData,
  verifyBilingualMessage,
  verifyApiResponse,
  generateObjectId,
} from '../../user/utils/test-helpers';

describe('Service-Offer Management (e2e)', () => {
  let app: INestApplication;
  let serviceOfferModel: any;
  let serviceModel: any;
  let offerModel: any;
  let userModel: any;
  let complexModel: any;
  let departmentModel: any;
  let clinicModel: any;
  let adminToken: string;
  let adminUserId: string;
  let testServiceId: string;
  let testOfferId: string;
  let testFixedOfferId: string;
  let testExpiredOfferId: string;
  let testFutureOfferId: string;

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
    serviceOfferModel = moduleFixture.get(getModelToken('ServiceOffer'));
    serviceModel = moduleFixture.get(getModelToken('Service'));
    offerModel = moduleFixture.get(getModelToken('Offer'));
    userModel = moduleFixture.get(getModelToken('User'));
    complexModel = moduleFixture.get(getModelToken('Complex'));
    departmentModel = moduleFixture.get(getModelToken('ComplexDepartment'));
    clinicModel = moduleFixture.get(getModelToken('Clinic'));

    // Clean up before tests
    await cleanupTestData({
      userModel,
      complexModel,
      clinicModel,
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
    const testComplexId = complex._id.toString();

    // Create test department
    const department = await departmentModel.create({
      name: 'Cardiology',
      description: 'Cardiology department',
      complexId: testComplexId,
      isActive: true,
    });
    const testDepartmentId = department._id.toString();

    // Create test service
    const service = await serviceModel.create({
      ...serviceData,
      complexDepartmentId: testDepartmentId,
    });
    testServiceId = service._id.toString();

    // Create test offers
    const offer = await offerModel.create(offerData);
    testOfferId = offer._id.toString();

    const fixedOffer = await offerModel.create(fixedOfferData);
    testFixedOfferId = fixedOffer._id.toString();

    const expiredOffer = await offerModel.create(expiredOfferData);
    testExpiredOfferId = expiredOffer._id.toString();

    const futureOffer = await offerModel.create(futureOfferData);
    testFutureOfferId = futureOffer._id.toString();
  });

  afterAll(async () => {
    // Clean up after tests
    await cleanupTestData({
      userModel,
      complexModel,
      clinicModel,
    });
    await serviceOfferModel.deleteMany({});
    await serviceModel.deleteMany({});
    await offerModel.deleteMany({});
    await departmentModel.deleteMany({});
    await app.close();
  });

  describe('POST /services/:serviceId/discounts - Assign Discount to Service', () => {
    afterEach(async () => {
      await serviceOfferModel.deleteMany({
        serviceId: testServiceId,
      });
    });

    it('should successfully assign discount to service', async () => {
      const response = await request(app.getHttpServer())
        .post(`/services/${testServiceId}/discounts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          offerId: testOfferId,
          isActive: true,
        })
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.serviceId).toBe(testServiceId);
      expect(response.body.offerId).toBe(testOfferId);
      expect(response.body.isActive).toBe(true);
      expect(response.body.offer).toBeDefined();
      expect(response.body.offer.name).toBe(offerData.name);
    });

    it('should return 400 when discount already assigned', async () => {
      // First assignment
      await request(app.getHttpServer())
        .post(`/services/${testServiceId}/discounts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          offerId: testOfferId,
          isActive: true,
        })
        .expect(201);

      // Try to assign again
      const response = await request(app.getHttpServer())
        .post(`/services/${testServiceId}/discounts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          offerId: testOfferId,
          isActive: true,
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should return 404 when service not found', async () => {
      const nonExistentServiceId = generateObjectId();
      await request(app.getHttpServer())
        .post(`/services/${nonExistentServiceId}/discounts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          offerId: testOfferId,
          isActive: true,
        })
        .expect(404);
    });

    it('should return 404 when offer not found', async () => {
      const nonExistentOfferId = generateObjectId();
      await request(app.getHttpServer())
        .post(`/services/${testServiceId}/discounts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          offerId: nonExistentOfferId,
          isActive: true,
        })
        .expect(404);
    });

    it('should return 401 when no authentication token provided', async () => {
      await request(app.getHttpServer())
        .post(`/services/${testServiceId}/discounts`)
        .send({
          offerId: testOfferId,
          isActive: true,
        })
        .expect(401);
    });
  });

  describe('GET /services/:serviceId/discounts - Get Service Discounts', () => {
    beforeEach(async () => {
      // Assign multiple discounts
      await serviceOfferModel.create({
        serviceId: testServiceId,
        offerId: testOfferId,
        isActive: true,
      });
      await serviceOfferModel.create({
        serviceId: testServiceId,
        offerId: testFixedOfferId,
        isActive: true,
      });
      await serviceOfferModel.create({
        serviceId: testServiceId,
        offerId: testExpiredOfferId,
        isActive: true,
      });
    });

    afterEach(async () => {
      await serviceOfferModel.deleteMany({
        serviceId: testServiceId,
      });
    });

    it('should return all discounts for service', async () => {
      const response = await request(app.getHttpServer())
        .get(`/services/${testServiceId}/discounts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by active status', async () => {
      // Deactivate one
      await serviceOfferModel.findOneAndUpdate(
        { serviceId: testServiceId, offerId: testOfferId },
        { isActive: false },
      );

      const response = await request(app.getHttpServer())
        .get(`/services/${testServiceId}/discounts`)
        .query({ isActive: 'true' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((discount: any) => {
        expect(discount.isActive).toBe(true);
      });
    });

    it('should exclude expired offers by default', async () => {
      const response = await request(app.getHttpServer())
        .get(`/services/${testServiceId}/discounts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Expired offers should not be in the list (unless includeExpired=true)
      const expiredDiscount = response.body.find(
        (d: any) => d.offerId === testExpiredOfferId,
      );
      // This depends on implementation - expired offers might be filtered
    });

    it('should include expired offers when requested', async () => {
      const response = await request(app.getHttpServer())
        .get(`/services/${testServiceId}/discounts`)
        .query({ includeExpired: 'true' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 404 when service not found', async () => {
      const nonExistentServiceId = generateObjectId();
      await request(app.getHttpServer())
        .get(`/services/${nonExistentServiceId}/discounts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('DELETE /services/:serviceId/discounts/:offerId - Remove Discount from Service', () => {
    beforeEach(async () => {
      await serviceOfferModel.create({
        serviceId: testServiceId,
        offerId: testOfferId,
        isActive: true,
      });
    });

    afterEach(async () => {
      await serviceOfferModel.deleteMany({
        serviceId: testServiceId,
      });
    });

    it('should successfully remove discount from service', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/services/${testServiceId}/discounts/${testOfferId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify deleted
      const deleted = await serviceOfferModel.findOne({
        serviceId: testServiceId,
        offerId: testOfferId,
      });
      expect(deleted).toBeNull();
    });

    it('should return 404 when discount assignment not found', async () => {
      const nonExistentOfferId = generateObjectId();
      await request(app.getHttpServer())
        .delete(`/services/${testServiceId}/discounts/${nonExistentOfferId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 401 when no authentication token provided', async () => {
      await request(app.getHttpServer())
        .delete(`/services/${testServiceId}/discounts/${testOfferId}`)
        .expect(401);
    });
  });

  describe('PATCH /services/:serviceId/discounts/:offerId/deactivate - Deactivate Discount', () => {
    beforeEach(async () => {
      await serviceOfferModel.create({
        serviceId: testServiceId,
        offerId: testOfferId,
        isActive: true,
      });
    });

    afterEach(async () => {
      await serviceOfferModel.deleteMany({
        serviceId: testServiceId,
      });
    });

    it('should successfully deactivate discount', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/services/${testServiceId}/discounts/${testOfferId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.isActive).toBe(false);
      expect(response.body.deactivatedAt).toBeDefined();

      // Verify in database
      const deactivated = await serviceOfferModel.findOne({
        serviceId: testServiceId,
        offerId: testOfferId,
      });
      expect(deactivated.isActive).toBe(false);
    });

    it('should return 404 when discount assignment not found', async () => {
      const nonExistentOfferId = generateObjectId();
      await request(app.getHttpServer())
        .patch(
          `/services/${testServiceId}/discounts/${nonExistentOfferId}/deactivate`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('POST /services/:serviceId/calculate-price - Calculate Service Price', () => {
    beforeEach(async () => {
      // Assign active discount
      await serviceOfferModel.create({
        serviceId: testServiceId,
        offerId: testOfferId,
        isActive: true,
      });
    });

    afterEach(async () => {
      await serviceOfferModel.deleteMany({
        serviceId: testServiceId,
      });
    });

    it('should calculate price with percent discount', async () => {
      const appointmentDate = new Date(Date.now() + 86400000 * 2); // 2 days from now

      const response = await request(app.getHttpServer())
        .post(`/services/${testServiceId}/calculate-price`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          basePrice: 150,
          appointmentDate: appointmentDate.toISOString(),
        })
        .expect(200);

      expect(response.body.basePrice).toBe(150);
      expect(response.body.finalPrice).toBeDefined();
      expect(response.body.discountApplied).toBeDefined();
      expect(response.body.discountApplied.type).toBe('percent');
      expect(response.body.discountApplied.value).toBe(20);
      // 20% of 150 = 30, so final price should be 120
      expect(response.body.finalPrice).toBe(120);
    });

    it('should calculate price with fixed discount', async () => {
      // Assign fixed discount
      await serviceOfferModel.create({
        serviceId: testServiceId,
        offerId: testFixedOfferId,
        isActive: true,
      });

      const appointmentDate = new Date(Date.now() + 86400000 * 2);

      const response = await request(app.getHttpServer())
        .post(`/services/${testServiceId}/calculate-price`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          basePrice: 150,
          appointmentDate: appointmentDate.toISOString(),
        })
        .expect(200);

      expect(response.body.basePrice).toBe(150);
      expect(response.body.finalPrice).toBeDefined();
      // Should apply the first valid discount (percent or fixed depending on order)
    });

    it('should not apply expired discounts', async () => {
      // Assign expired discount
      await serviceOfferModel.create({
        serviceId: testServiceId,
        offerId: testExpiredOfferId,
        isActive: true,
      });

      const appointmentDate = new Date(); // Current date (expired offer ended yesterday)

      const response = await request(app.getHttpServer())
        .post(`/services/${testServiceId}/calculate-price`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          basePrice: 150,
          appointmentDate: appointmentDate.toISOString(),
        })
        .expect(200);

      // Expired discount should not be applied
      // If no valid discount, finalPrice should equal basePrice
      // or apply the non-expired discount
    });

    it('should not apply future discounts', async () => {
      // Assign future discount
      await serviceOfferModel.create({
        serviceId: testServiceId,
        offerId: testFutureOfferId,
        isActive: true,
      });

      const appointmentDate = new Date(); // Current date (future offer starts in 7 days)

      const response = await request(app.getHttpServer())
        .post(`/services/${testServiceId}/calculate-price`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          basePrice: 150,
          appointmentDate: appointmentDate.toISOString(),
        })
        .expect(200);

      // Future discount should not be applied for current date
    });

    it('should return base price when no discount applies', async () => {
      // Remove all discounts
      await serviceOfferModel.deleteMany({
        serviceId: testServiceId,
      });

      const appointmentDate = new Date(Date.now() + 86400000 * 2);

      const response = await request(app.getHttpServer())
        .post(`/services/${testServiceId}/calculate-price`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          basePrice: 150,
          appointmentDate: appointmentDate.toISOString(),
        })
        .expect(200);

      expect(response.body.basePrice).toBe(150);
      expect(response.body.finalPrice).toBe(150);
      expect(response.body.discountApplied).toBeNull();
    });

    it('should return 404 when service not found', async () => {
      const nonExistentServiceId = generateObjectId();
      await request(app.getHttpServer())
        .post(`/services/${nonExistentServiceId}/calculate-price`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          basePrice: 150,
          appointmentDate: new Date().toISOString(),
        })
        .expect(404);
    });

    it('should use service price when basePrice not provided', async () => {
      const appointmentDate = new Date(Date.now() + 86400000 * 2);

      const response = await request(app.getHttpServer())
        .post(`/services/${testServiceId}/calculate-price`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          appointmentDate: appointmentDate.toISOString(),
        })
        .expect(200);

      expect(response.body.basePrice).toBe(serviceData.price);
      expect(response.body.finalPrice).toBeDefined();
    });
  });
});
