import { Types } from 'mongoose';
import { UserRole } from '../../../src/common/enums/user-role.enum';

/**
 * Test fixtures for service E2E tests
 */

// Valid service data for testing
export const validServiceData = {
  name: 'General Consultation',
  description: 'Standard medical consultation with a general practitioner',
  durationMinutes: 30,
  price: 150,
};

// Service for complex department
export const departmentServiceData = {
  name: 'Cardiology Consultation',
  description: 'Cardiology consultation service',
  durationMinutes: 45,
  price: 250,
  complexDepartmentId: '', // Will be set in tests
};

// Service for clinic
export const clinicServiceData = {
  name: 'Clinic-Specific Service',
  description: 'Service specific to a clinic',
  durationMinutes: 30,
  price: 200,
  clinicId: '', // Will be set in tests
};

// Admin user for testing
export const adminUserData = {
  email: 'admin@service-test.com',
  password: 'AdminPass123!',
  firstName: 'Admin',
  lastName: 'User',
  role: UserRole.ADMIN,
  phone: '+1234567891',
  nationality: 'US',
  gender: 'male',
  isActive: true,
};

// Doctor user for testing
export const doctorUserData = {
  email: 'doctor@service-test.com',
  password: 'DoctorPass123!',
  firstName: 'Doctor',
  lastName: 'User',
  role: UserRole.DOCTOR,
  phone: '+1234567892',
  nationality: 'US',
  gender: 'male',
  isActive: true,
};

// Staff user for testing
export const staffUserData = {
  email: 'staff@service-test.com',
  password: 'StaffPass123!',
  firstName: 'Staff',
  lastName: 'User',
  role: UserRole.STAFF,
  phone: '+1234567893',
  nationality: 'US',
  gender: 'female',
  isActive: true,
};

// Complex data for testing
export const complexData = {
  name: 'Test Medical Complex',
  email: 'complex@service-test.com',
  phone: '+1234567890',
  address: {
    street: '123 Test Street',
    city: 'Test City',
    state: 'Test State',
    country: 'Test Country',
    postalCode: '12345',
  },
  status: 'active' as const,
  departments: [],
};

// Department data for testing
export const departmentData = {
  name: 'Cardiology',
  description: 'Cardiology department',
  isActive: true,
};

// Clinic data for testing
export const clinicData = {
  name: { ar: 'عيادة الاختبار', en: 'Test Clinic' },
  email: 'clinic@service-test.com',
  phoneNumbers: ['+1234567894'],
  address: 'Test Address',
  isActive: true,
};

// Error messages for validation
export const expectedErrorMessages = {
  SERVICE_NOT_FOUND: {
    ar: 'الخدمة غير موجودة',
    en: 'Service not found',
  },
  SERVICE_NAME_EXISTS: {
    ar: 'اسم الخدمة موجود بالفعل',
    en: 'Service name already exists',
  },
  COMPLEX_DEPARTMENT_NOT_FOUND: {
    ar: 'قسم المجمع غير موجود',
    en: 'Complex department not found',
  },
  CLINIC_NOT_FOUND: {
    ar: 'العيادة غير موجودة',
    en: 'Clinic not found',
  },
  CANNOT_DELETE_WITH_APPOINTMENTS: {
    ar: 'لا يمكن حذف الخدمة لأنها تحتوي على مواعيد نشطة',
    en: 'Cannot delete service because it has active appointments',
  },
  INVALID_SERVICE_NAME: {
    ar: 'اسم الخدمة يجب أن يكون بين 2 و 100 حرف',
    en: 'Service name must be between 2 and 100 characters',
  },
};

// Test environment variables
export const testEnvironment = {
  JWT_SECRET: 'test-jwt-secret-for-service-management',
  JWT_EXPIRES_IN: '1h',
  JWT_REFRESH_SECRET: 'test-refresh-secret-for-service-management',
  JWT_REFRESH_EXPIRES_IN: '7d',
  NODE_ENV: 'test',
  MONGODB_URI:
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cliniva_test',
};

