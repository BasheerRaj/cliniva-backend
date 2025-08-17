import { RegisterDto, LoginDto } from '../../../src/auth/dto';
import { UserRole } from '../../../src/common/enums/user-role.enum';

// Valid test data
export const validRegisterData: RegisterDto = {
  email: 'doctor@clinic.com',
  password: 'SecurePass123!',
  firstName: 'John',
  lastName: 'Doe',
  role: UserRole.DOCTOR,
  phone: '+1234567890',
  nationality: 'US',
  gender: 'male',
};

export const validLoginData: LoginDto = {
  email: 'doctor@clinic.com',
  password: 'SecurePass123!',
};

// Invalid test data for validation testing
export const invalidRegisterData = {
  invalidEmail: {
    ...validRegisterData,
    email: 'invalid-email',
  },
  shortPassword: {
    ...validRegisterData,
    password: '123',
  },
  weakPassword: {
    ...validRegisterData,
    password: 'password',
  },
  missingFirstName: {
    ...validRegisterData,
    firstName: '',
  },
  invalidRole: {
    ...validRegisterData,
    role: 'invalid-role',
  },
  invalidGender: {
    ...validRegisterData,
    gender: 'invalid-gender',
  },
};

export const invalidLoginData = {
  invalidEmail: {
    ...validLoginData,
    email: 'invalid-email',
  },
  shortPassword: {
    ...validLoginData,
    password: '123',
  },
  emptyEmail: {
    ...validLoginData,
    email: '',
  },
  emptyPassword: {
    ...validLoginData,
    password: '',
  },
};

// Different user roles for testing
export const userRoleFixtures = {
  superAdmin: {
    ...validRegisterData,
    email: 'superadmin@clinic.com',
    role: UserRole.SUPER_ADMIN,
  },
  owner: {
    ...validRegisterData,
    email: 'owner@clinic.com',
    role: UserRole.OWNER,
  },
  admin: {
    ...validRegisterData,
    email: 'admin@clinic.com',
    role: UserRole.ADMIN,
  },
  doctor: {
    ...validRegisterData,
    email: 'doctor@clinic.com',
    role: UserRole.DOCTOR,
  },
  staff: {
    ...validRegisterData,
    email: 'staff@clinic.com',
    role: UserRole.STAFF,
  },
  patient: {
    ...validRegisterData,
    email: 'patient@clinic.com',
    role: UserRole.PATIENT,
  },
};

// JWT Token fixtures
export const tokenFixtures = {
  validAccessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoiZG9jdG9yIiwiaWF0IjoxNjA5NDU5MjAwLCJleHAiOjE2MDk1NDU2MDB9.signature',
  expiredAccessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoiZG9jdG9yIiwiaWF0IjoxNjA5NDU5MjAwLCJleHAiOjE2MDk0NTkyMDB9.signature',
  invalidToken: 'invalid.token.signature',
  malformedToken: 'malformed-token',
  validRefreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoiZG9jdG9yIiwiaWF0IjoxNjA5NDU5MjAwLCJleHAiOjE2MTA2NjQ4MDB9.signature',
  expiredRefreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoiZG9jdG9yIiwiaWF0IjoxNjA5NDU5MjAwLCJleHAiOjE2MDk0NTkyMDB9.signature',
};

// User database fixtures
export const userDatabaseFixtures = {
  activeUser: {
    _id: '507f1f77bcf86cd799439011',
    email: 'active@clinic.com',
    passwordHash: '$2b$12$validHashedPassword',
    firstName: 'Active',
    lastName: 'User',
    role: UserRole.DOCTOR,
    isActive: true,
    emailVerified: true,
    twoFactorEnabled: false,
    lastLogin: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  inactiveUser: {
    _id: '507f1f77bcf86cd799439012',
    email: 'inactive@clinic.com',
    passwordHash: '$2b$12$validHashedPassword',
    firstName: 'Inactive',
    lastName: 'User',
    role: UserRole.DOCTOR,
    isActive: false,
    emailVerified: false,
    twoFactorEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  unverifiedUser: {
    _id: '507f1f77bcf86cd799439013',
    email: 'unverified@clinic.com',
    passwordHash: '$2b$12$validHashedPassword',
    firstName: 'Unverified',
    lastName: 'User',
    role: UserRole.PATIENT,
    isActive: true,
    emailVerified: false,
    twoFactorEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

// Error response fixtures
export const errorResponseFixtures = {
  validationError: {
    statusCode: 400,
    message: [
      'email must be a valid email',
      'password must be at least 8 characters long',
    ],
    error: 'Bad Request',
  },
  unauthorizedError: {
    statusCode: 401,
    message: 'Invalid credentials',
    error: 'Unauthorized',
  },
  conflictError: {
    statusCode: 409,
    message: 'User with this email already exists',
    error: 'Conflict',
  },
  forbiddenError: {
    statusCode: 403,
    message: 'Insufficient permissions',
    error: 'Forbidden',
  },
};

// HTTP Headers fixtures
export const headerFixtures = {
  validAuthHeader: {
    Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  },
  invalidAuthHeader: {
    Authorization: 'Bearer invalid-token',
  },
  malformedAuthHeader: {
    Authorization: 'InvalidFormat token',
  },
  missingAuthHeader: {},
};

// Environment variables for testing
export const testEnvironment = {
  JWT_SECRET: 'test-jwt-secret-for-testing-purposes',
  JWT_EXPIRES_IN: '1h',
  JWT_REFRESH_SECRET: 'test-refresh-secret-for-testing',
  JWT_REFRESH_EXPIRES_IN: '7d',
  NODE_ENV: 'test',
};




