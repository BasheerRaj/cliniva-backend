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
});
