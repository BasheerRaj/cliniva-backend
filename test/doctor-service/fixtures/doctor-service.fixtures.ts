import { Types } from 'mongoose';
import { UserRole } from '../../../src/common/enums/user-role.enum';

/**
 * Test fixtures for doctor-service E2E tests
 */

// Admin user for testing
export const adminUserData = {
  email: 'admin@doctor-service-test.com',
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
  email: 'doctor@doctor-service-test.com',
  password: 'DoctorPass123!',
  firstName: 'Doctor',
  lastName: 'User',
  role: UserRole.DOCTOR,
  phone: '+1234567892',
  nationality: 'US',
  gender: 'male',
  isActive: true,
};

// Second doctor for transfer tests
export const targetDoctorData = {
  email: 'targetdoctor@doctor-service-test.com',
  password: 'TargetPass123!',
  firstName: 'Target',
  lastName: 'Doctor',
  role: UserRole.DOCTOR,
  phone: '+1234567893',
  nationality: 'US',
  gender: 'male',
  isActive: true,
};

// Staff user for testing
export const staffUserData = {
  email: 'staff@doctor-service-test.com',
  password: 'StaffPass123!',
  firstName: 'Staff',
  lastName: 'User',
  role: UserRole.STAFF,
  phone: '+1234567894',
  nationality: 'US',
  gender: 'female',
  isActive: true,
};

// Complex data for testing
export const complexData = {
  name: 'Test Medical Complex',
  email: 'complex@doctor-service-test.com',
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
  email: 'clinic@doctor-service-test.com',
  phoneNumbers: ['+1234567895'],
  address: 'Test Address',
  isActive: true,
};

// Service data for testing
export const serviceData = {
  name: 'General Consultation',
  description: 'Standard medical consultation',
  durationMinutes: 30,
  price: 150,
};

// Error messages for validation
export const expectedErrorMessages = {
  SERVICE_NOT_FOUND: {
    ar: 'الخدمة غير موجودة',
    en: 'Service not found',
  },
  DOCTOR_NOT_FOUND: {
    ar: 'الطبيب غير موجود أو غير نشط',
    en: 'Doctor not found or inactive',
  },
  CLINIC_NOT_FOUND: {
    ar: 'العيادة غير موجودة',
    en: 'Clinic not found',
  },
  DOCTOR_NOT_ASSIGNED: {
    ar: 'الطبيب غير مسند لهذه الخدمة',
    en: 'Doctor is not assigned to this service',
  },
  DOCTOR_ALREADY_ASSIGNED: {
    ar: 'الطبيب مسند بالفعل لهذه الخدمة في هذه العيادة',
    en: 'Doctor is already assigned to this service at this clinic',
  },
  DOCTOR_NOT_AT_CLINIC: {
    ar: 'الطبيب لا يعمل في هذه العيادة',
    en: 'Doctor does not work at this clinic',
  },
  SERVICE_NOT_AVAILABLE: {
    ar: 'الخدمة غير متاحة في هذه العيادة',
    en: 'Service is not available at this clinic',
  },
  HAS_ACTIVE_APPOINTMENTS: {
    ar: 'الطبيب لديه مواعيد نشطة. يرجى نقل المواعيد أو إلغاؤها أولاً',
    en: 'Doctor has active appointments. Please transfer or cancel appointments first',
  },
  CANNOT_DELETE_WITH_APPOINTMENTS: {
    ar: 'لا يمكن حذف الطبيب لأنه لديه مواعيد مرتبطة بهذه الخدمة. استخدم إلغاء التنشيط بدلاً من ذلك',
    en: 'Cannot delete doctor because they have appointments for this service. Use deactivate instead',
  },
};

// Test environment variables
export const testEnvironment = {
  JWT_SECRET: 'test-jwt-secret-for-doctor-service-management',
  JWT_EXPIRES_IN: '1h',
  JWT_REFRESH_SECRET: 'test-refresh-secret-for-doctor-service-management',
  JWT_REFRESH_EXPIRES_IN: '7d',
  NODE_ENV: 'test',
  MONGODB_URI:
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cliniva_test',
};


