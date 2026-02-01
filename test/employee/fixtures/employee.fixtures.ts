import { Types } from 'mongoose';
import { UserRole } from '../../../src/common/enums/user-role.enum';

/**
 * Test fixtures for employee E2E tests
 */

// Admin user for testing
export const adminUserData = {
  email: 'admin@clinic.com',
  password: 'AdminPass123!',
  firstName: 'Admin',
  lastName: 'User',
  role: UserRole.ADMIN,
  phone: '+1234567891',
  nationality: 'US',
  gender: 'male',
  dateOfBirth: '1985-01-01',
  address: '123 Admin Street',
  isActive: true,
};

// Employee user for testing
export const employeeUserData = {
  email: 'employee@clinic.com',
  password: 'EmployeePass123!',
  firstName: 'Employee',
  lastName: 'User',
  role: UserRole.STAFF,
  phone: '+1234567892',
  nationality: 'US',
  gender: 'male',
  dateOfBirth: '1990-05-15',
  address: '456 Employee Avenue',
  jobTitle: 'Staff Member',
  dateOfHiring: new Date().toISOString().split('T')[0],
  salary: 50000,
  isActive: true,
};

// Test complex data
export const testComplexData = {
  name: { ar: 'مجمع الاختبار', en: 'Test Complex' },
  address: '123 Test Street',
  phone: '+1234567896',
  email: 'complex@test.com',
  isActive: true,
};

// Another complex data
export const anotherComplexData = {
  name: { ar: 'مجمع آخر', en: 'Another Complex' },
  address: '456 Another Street',
  phone: '+1234567897',
  email: 'another@test.com',
  isActive: true,
};

// Test clinic data
export const testClinicData = {
  name: { ar: 'عيادة الاختبار', en: 'Test Clinic' },
  address: '789 Clinic Road',
  phone: '+1234567898',
  email: 'clinic@test.com',
  isActive: true,
};

// Another clinic data
export const anotherClinicData = {
  name: { ar: 'عيادة أخرى', en: 'Another Clinic' },
  address: '321 Another Road',
  phone: '+1234567899',
  email: 'anotherclinic@test.com',
  isActive: true,
};

// Error messages for validation
export const expectedErrorMessages = {
  CANNOT_DELETE_SELF: {
    ar: 'لا يمكنك حذف حسابك الخاص',
    en: 'You cannot delete your own account',
  },
  CLINICS_DIFFERENT_COMPLEXES: {
    ar: 'يجب أن تكون جميع العيادات ضمن نفس المجمع',
    en: 'All clinics must be within the same complex',
  },
  EMPLOYEE_NOT_FOUND: {
    ar: 'الموظف غير موجود',
    en: 'Employee not found',
  },
  COMPLEX_MISMATCH: {
    ar: 'يجب أن يتطابق المجمع مع اشتراكك',
    en: 'Complex must match your subscription',
  },
  CLINIC_MISMATCH: {
    ar: 'يجب أن تتطابق العيادة مع اشتراكك',
    en: 'Clinic must match your subscription',
  },
};

// Test environment variables
export const testEnvironment = {
  JWT_SECRET: 'test-jwt-secret-for-employee-management',
  JWT_EXPIRES_IN: '1h',
  JWT_REFRESH_SECRET: 'test-refresh-secret-for-employee-management',
  JWT_REFRESH_EXPIRES_IN: '7d',
  NODE_ENV: 'test',
  MONGODB_URI:
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cliniva_test',
};
