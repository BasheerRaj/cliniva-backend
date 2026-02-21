import { UserRole } from '../../../src/common/enums/user-role.enum';

/**
 * Test fixtures for specialty E2E tests
 */

// Valid specialty data for testing
export const validSpecialtyData = {
  name: 'Cardiology',
  description: 'Heart and cardiovascular system',
  isActive: true,
};

// Additional specialty data
export const secondSpecialtyData = {
  name: 'Dermatology',
  description: 'Skin and related conditions',
  isActive: true,
};

// Admin user for testing (OWNER can self-register, has full access)
export const adminUserData = {
  email: 'admin@specialty-test.com',
  password: 'AdminPass123!',
  firstName: 'Admin',
  lastName: 'User',
  role: UserRole.OWNER,
  phone: '+1234567891',
  nationality: 'US',
  gender: 'male',
};

// Doctor user for testing (for doctor-specialties integration - created by owner)
export const doctorUserData = {
  email: 'doctor@specialty-test.com',
  password: 'DoctorPass123!',
  firstName: 'Doctor',
  lastName: 'User',
  role: UserRole.DOCTOR,
  phone: '+1234567892',
  nationality: 'US',
  gender: 'male',
};

// Test environment variables
export const testEnvironment = {
  JWT_SECRET: 'test-jwt-secret-for-specialty-management',
  JWT_EXPIRES_IN: '1h',
  JWT_REFRESH_SECRET: 'test-refresh-secret-for-specialty-management',
  JWT_REFRESH_EXPIRES_IN: '7d',
  NODE_ENV: 'test',
  MONGODB_URI:
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cliniva_test',
};
