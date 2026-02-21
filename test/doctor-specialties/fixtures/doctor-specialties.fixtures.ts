import { UserRole } from '../../../src/common/enums/user-role.enum';

/**
 * Test fixtures for doctor-specialties E2E tests
 */

// Admin user for testing (OWNER can self-register)
export const adminUserData = {
  email: 'admin@doctor-specialties-test.com',
  password: 'AdminPass123!',
  firstName: 'Admin',
  lastName: 'User',
  role: UserRole.OWNER,
  phone: '+1234567891',
  nationality: 'US',
  gender: 'male',
};

// Doctor user for testing (created by owner)
export const doctorUserData = {
  email: 'doctor@doctor-specialties-test.com',
  password: 'DoctorPass123!',
  firstName: 'Doctor',
  lastName: 'User',
  role: UserRole.DOCTOR,
  phone: '+1234567892',
  nationality: 'US',
  gender: 'male',
};

// Second doctor for testing
export const secondDoctorUserData = {
  email: 'doctor2@doctor-specialties-test.com',
  password: 'Doctor2Pass123!',
  firstName: 'Second',
  lastName: 'Doctor',
  role: UserRole.DOCTOR,
  phone: '+1234567893',
  nationality: 'US',
  gender: 'male',
};

// Staff user (non-doctor for validation)
export const staffUserData = {
  email: 'staff@doctor-specialties-test.com',
  password: 'StaffPass123!',
  firstName: 'Staff',
  lastName: 'User',
  role: UserRole.STAFF,
  phone: '+1234567894',
  nationality: 'US',
  gender: 'female',
};

// Valid assignment data
export const validAssignmentData = {
  yearsOfExperience: 5,
  certificationNumber: 'CERT-12345',
};

// Test environment variables
export const testEnvironment = {
  JWT_SECRET: 'test-jwt-secret-for-doctor-specialties-management',
  JWT_EXPIRES_IN: '1h',
  JWT_REFRESH_SECRET: 'test-refresh-secret-for-doctor-specialties-management',
  JWT_REFRESH_EXPIRES_IN: '7d',
  NODE_ENV: 'test',
  MONGODB_URI:
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cliniva_test',
};
