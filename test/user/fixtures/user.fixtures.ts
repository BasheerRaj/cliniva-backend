import { Types } from 'mongoose';
import { UserRole } from '../../../src/common/enums/user-role.enum';

/**
 * Test fixtures for user E2E tests
 */

// Valid user data for testing
export const validUserData = {
  email: 'testuser@clinic.com',
  password: 'SecurePass123!',
  firstName: 'Test',
  lastName: 'User',
  role: UserRole.DOCTOR,
  phone: '+1234567890',
  nationality: 'US',
  gender: 'male',
  isActive: true,
};

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
  isActive: true,
};

// Doctor user for testing
export const doctorUserData = {
  email: 'doctor@clinic.com',
  password: 'DoctorPass123!',
  firstName: 'Doctor',
  lastName: 'User',
  role: UserRole.DOCTOR,
  phone: '+1234567892',
  nationality: 'US',
  gender: 'male',
  isActive: true,
};

// Target doctor for appointment transfer
export const targetDoctorData = {
  email: 'targetdoctor@clinic.com',
  password: 'TargetPass123!',
  firstName: 'Target',
  lastName: 'Doctor',
  role: UserRole.DOCTOR,
  phone: '+1234567893',
  nationality: 'US',
  gender: 'male',
  isActive: true,
};

// Inactive user for testing
export const inactiveUserData = {
  email: 'inactive@clinic.com',
  password: 'InactivePass123!',
  firstName: 'Inactive',
  lastName: 'User',
  role: UserRole.STAFF,
  phone: '+1234567894',
  nationality: 'US',
  gender: 'female',
  isActive: false,
};

// Staff user for testing
export const staffUserData = {
  email: 'staff@clinic.com',
  password: 'StaffPass123!',
  firstName: 'Staff',
  lastName: 'User',
  role: UserRole.STAFF,
  phone: '+1234567895',
  nationality: 'US',
  gender: 'female',
  isActive: true,
};

// Complex data for testing
export const complexData = {
  name: 'Test Medical Complex',
  address: '123 Test Street',
  phone: '+1234567896',
  email: 'complex@clinic.com',
  isActive: true,
};

// Clinic data for testing
export const clinicData = {
  name: 'Test Clinic',
  address: '456 Test Avenue',
  phoneNumbers: ['+1234567897'],
  email: 'clinic@clinic.com',
  specialization: 'General',
  isActive: true,
};

// Appointment data for testing
export const appointmentData = {
  patientId: new Types.ObjectId(),
  status: 'scheduled',
  appointmentDate: new Date(Date.now() + 86400000), // Tomorrow
  duration: 30,
  notes: 'Test appointment',
};

// Error messages for validation
export const expectedErrorMessages = {
  CANNOT_DEACTIVATE_SELF: {
    ar: 'لا يمكنك إلغاء تفعيل حسابك الخاص',
    en: 'You cannot deactivate your own account',
  },
  CANNOT_DELETE_SELF: {
    ar: 'لا يمكنك حذف حسابك الخاص',
    en: 'You cannot delete your own account',
  },
  USER_NOT_FOUND: {
    ar: 'المستخدم غير موجود',
    en: 'User not found',
  },
  DOCTOR_NOT_FOUND: {
    ar: 'الطبيب غير موجود',
    en: 'Doctor not found',
  },
  COMPLEX_NOT_FOUND: {
    ar: 'المجمع الطبي غير موجود',
    en: 'Medical complex not found',
  },
  DOCTOR_HAS_APPOINTMENTS: {
    ar: 'الطبيب لديه مواعيد نشطة. يجب نقلها أو إلغاؤها أولاً',
    en: 'Doctor has active appointments. Must transfer or cancel them first',
  },
  TARGET_DOCTOR_INACTIVE: {
    ar: 'الطبيب المستهدف غير نشط',
    en: 'Target doctor is inactive',
  },
  DEACTIVATED_USER_ASSIGNMENT: {
    ar: 'لا يمكن تعيين مستخدم غير نشط',
    en: 'Cannot assign deactivated user',
  },
  CLINICS_DIFFERENT_COMPLEXES: {
    ar: 'يجب أن تكون جميع العيادات ضمن نفس المجمع',
    en: 'All clinics must be within the same complex',
  },
};

// Test environment variables
export const testEnvironment = {
  JWT_SECRET: 'test-jwt-secret-for-user-management',
  JWT_EXPIRES_IN: '1h',
  JWT_REFRESH_SECRET: 'test-refresh-secret-for-user-management',
  JWT_REFRESH_EXPIRES_IN: '7d',
  NODE_ENV: 'test',
  MONGODB_URI: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cliniva_test',
};
