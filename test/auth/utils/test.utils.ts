import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

import { User, UserSchema } from '../../../src/database/schemas/user.schema';
import { AuthService } from '../../../src/auth/auth.service';
import { testEnvironment } from '../fixtures/auth.fixtures';

/**
 * Create a test user in the database
 */
export const createTestUser = async (
  userModel: Model<User>,
  userData: Partial<User> = {}
): Promise<User> => {
  const defaultUser = {
    email: 'test@example.com',
    passwordHash: await bcrypt.hash('password123', 12),
    firstName: 'Test',
    lastName: 'User',
    role: 'doctor',
    isActive: true,
    emailVerified: false,
    twoFactorEnabled: false,
    ...userData,
  };

  const user = new userModel(defaultUser);
  return user.save();
};

/**
 * Clean up test users from database
 */
export const cleanupTestUsers = async (userModel: Model<User>): Promise<void> => {
  await userModel.deleteMany({
    email: { $regex: /@(test|example|clinic)\.com$/ },
  });
};

/**
 * Generate JWT token for testing
 */
export const generateTestToken = (jwtService: JwtService, payload: any): string => {
  return jwtService.sign(payload, {
    secret: testEnvironment.JWT_SECRET,
    expiresIn: testEnvironment.JWT_EXPIRES_IN,
  });
};

/**
 * Generate expired JWT token for testing
 */
export const generateExpiredToken = (jwtService: JwtService, payload: any): string => {
  return jwtService.sign(payload, {
    secret: testEnvironment.JWT_SECRET,
    expiresIn: '-1h', // Expired 1 hour ago
  });
};

/**
 * Create test module with authentication components
 */
export const createAuthTestModule = async (): Promise<TestingModule> => {
  return Test.createTestingModule({
    imports: [
      MongooseModule.forRoot(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cliniva_test'),
      MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    ],
    providers: [
      AuthService,
      {
        provide: JwtService,
        useValue: {
          sign: jest.fn().mockReturnValue('mock-token'),
          signAsync: jest.fn().mockResolvedValue('mock-token'),
          verify: jest.fn().mockReturnValue({ sub: 'user-id', email: 'test@example.com' }),
          verifyAsync: jest.fn().mockResolvedValue({ sub: 'user-id', email: 'test@example.com' }),
        },
      },
    ],
  }).compile();
};

/**
 * Setup test environment variables
 */
export const setupTestEnvironment = (): void => {
  Object.assign(process.env, testEnvironment);
};

/**
 * Reset test environment
 */
export const resetTestEnvironment = (): void => {
  Object.keys(testEnvironment).forEach(key => {
    delete process.env[key];
  });
};

/**
 * Create mock request with user
 */
export const createMockRequest = (user: any = {}, headers: any = {}): any => {
  return {
    user: {
      id: 'user-id',
      email: 'test@example.com',
      role: 'doctor',
      isActive: true,
      ...user,
    },
    headers: {
      authorization: 'Bearer mock-token',
      ...headers,
    },
  };
};

/**
 * Create mock response
 */
export const createMockResponse = (): any => {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
};

/**
 * Sleep utility for async testing
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Assert that password is properly hashed
 */
export const assertPasswordHashed = async (
  plainPassword: string,
  hashedPassword: string
): Promise<void> => {
  const isValid = await bcrypt.compare(plainPassword, hashedPassword);
  expect(isValid).toBe(true);
  expect(hashedPassword).not.toBe(plainPassword);
  expect(hashedPassword.startsWith('$2b$')).toBe(true);
};

/**
 * Assert JWT token structure
 */
export const assertJwtTokenStructure = (token: string): void => {
  expect(typeof token).toBe('string');
  expect(token.split('.')).toHaveLength(3);
  expect(token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/);
};

/**
 * Assert authentication response structure
 */
export const assertAuthResponseStructure = (response: any): void => {
  expect(response).toHaveProperty('access_token');
  expect(response).toHaveProperty('refresh_token');
  expect(response).toHaveProperty('expires_in');
  expect(response).toHaveProperty('user');
  
  expect(typeof response.access_token).toBe('string');
  expect(typeof response.refresh_token).toBe('string');
  expect(typeof response.expires_in).toBe('number');
  expect(typeof response.user).toBe('object');
  
  assertJwtTokenStructure(response.access_token);
  assertJwtTokenStructure(response.refresh_token);
  
  expect(response.user).toHaveProperty('id');
  expect(response.user).toHaveProperty('email');
  expect(response.user).toHaveProperty('firstName');
  expect(response.user).toHaveProperty('lastName');
  expect(response.user).toHaveProperty('role');
  expect(response.user).toHaveProperty('isActive');
  expect(response.user).toHaveProperty('emailVerified');
};

/**
 * Assert user profile structure
 */
export const assertUserProfileStructure = (profile: any): void => {
  expect(profile).toHaveProperty('id');
  expect(profile).toHaveProperty('email');
  expect(profile).toHaveProperty('firstName');
  expect(profile).toHaveProperty('lastName');
  expect(profile).toHaveProperty('role');
  expect(profile).toHaveProperty('isActive');
  expect(profile).toHaveProperty('emailVerified');
  expect(profile).toHaveProperty('twoFactorEnabled');
  expect(profile).toHaveProperty('createdAt');
  expect(profile).toHaveProperty('updatedAt');
  
  expect(typeof profile.id).toBe('string');
  expect(typeof profile.email).toBe('string');
  expect(typeof profile.isActive).toBe('boolean');
  expect(typeof profile.emailVerified).toBe('boolean');
  expect(typeof profile.twoFactorEnabled).toBe('boolean');
};

/**
 * Test helpers for common error scenarios
 */
export const testErrorScenarios = {
  async testUnauthorized(requestFn: () => Promise<any>): Promise<void> {
    await expect(requestFn()).rejects.toThrow('Unauthorized');
  },

  async testForbidden(requestFn: () => Promise<any>): Promise<void> {
    await expect(requestFn()).rejects.toThrow('Forbidden');
  },

  async testValidationError(requestFn: () => Promise<any>): Promise<void> {
    await expect(requestFn()).rejects.toThrow('Bad Request');
  },

  async testConflict(requestFn: () => Promise<any>): Promise<void> {
    await expect(requestFn()).rejects.toThrow('Conflict');
  },
};




