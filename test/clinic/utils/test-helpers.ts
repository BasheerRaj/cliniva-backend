import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Types } from 'mongoose';

/**
 * Helper functions for clinic E2E tests
 */

/**
 * Register a user and return the access token
 */
export async function registerAndLogin(
  app: INestApplication,
  userData: any,
): Promise<{ accessToken: string; userId: string; user: any }> {
  const registerResponse = await request(app.getHttpServer())
    .post('/auth/register')
    .send(userData)
    .expect(201);

  return {
    accessToken: registerResponse.body.access_token,
    userId: registerResponse.body.user._id || registerResponse.body.user.id,
    user: registerResponse.body.user,
  };
}

/**
 * Create a test complex directly in the database
 */
export async function createTestComplex(
  complexModel: any,
  complexData: any,
): Promise<any> {
  const complex = new complexModel(complexData);
  return await complex.save();
}

/**
 * Create a test clinic directly in the database
 */
export async function createTestClinic(
  clinicModel: any,
  clinicData: any,
): Promise<any> {
  const clinic = new clinicModel(clinicData);
  return await clinic.save();
}

/**
 * Clean up test data
 */
export async function cleanupTestData(models: {
  userModel?: any;
  complexModel?: any;
  clinicModel?: any;
}): Promise<void> {
  const promises = [];

  if (models.userModel) {
    promises.push(models.userModel.deleteMany({}));
  }
  if (models.complexModel) {
    promises.push(models.complexModel.deleteMany({}));
  }
  if (models.clinicModel) {
    promises.push(models.clinicModel.deleteMany({}));
  }

  await Promise.all(promises);
}

/**
 * Verify bilingual message structure
 */
export function verifyBilingualMessage(message: any): void {
  expect(message).toHaveProperty('ar');
  expect(message).toHaveProperty('en');
  expect(typeof message.ar).toBe('string');
  expect(typeof message.en).toBe('string');
}

/**
 * Verify standardized API response structure
 */
export function verifyApiResponse(response: any, expectSuccess: boolean = true): void {
  expect(response).toHaveProperty('success');
  expect(response.success).toBe(expectSuccess);

  if (expectSuccess) {
    expect(response).toHaveProperty('data');
  } else {
    expect(response).toHaveProperty('error');
    expect(response.error).toHaveProperty('code');
    expect(response.error).toHaveProperty('message');
    verifyBilingualMessage(response.error.message);
  }
}

/**
 * Generate a valid MongoDB ObjectId string
 */
export function generateObjectId(): string {
  return new Types.ObjectId().toString();
}
