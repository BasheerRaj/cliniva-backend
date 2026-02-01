/**
 * Test fixtures for clinic E2E tests
 */

export const testEnvironment = {
  NODE_ENV: 'test',
  JWT_SECRET: 'test-secret-key-for-clinic-tests',
  JWT_EXPIRES_IN: '1h',
};

export const adminUserData = {
  email: 'clinicadmin@test.com',
  password: 'ClinicAdmin123!',
  firstName: 'Clinic',
  lastName: 'Admin',
  role: 'admin',
  phone: '+1234567900',
  nationality: 'US',
  gender: 'male',
  isActive: true,
};

export const testComplexData = {
  name: { ar: 'مجمع الاختبار', en: 'Test Complex' },
  address: 'Test Complex Address',
  phone: '+1234567901',
  email: 'testcomplex@clinic.com',
  isActive: true,
};

export const anotherComplexData = {
  name: { ar: 'مجمع آخر', en: 'Another Complex' },
  address: 'Another Complex Address',
  phone: '+1234567902',
  email: 'anothercomplex@clinic.com',
  isActive: true,
};

export const testClinicData = {
  name: { ar: 'عيادة الاختبار', en: 'Test Clinic' },
  address: 'Test Clinic Address',
  phone: '+1234567903',
  email: 'testclinic@clinic.com',
  isActive: true,
};

export const inactiveClinicData = {
  name: { ar: 'عيادة غير نشطة', en: 'Inactive Clinic' },
  address: 'Inactive Clinic Address',
  phone: '+1234567904',
  email: 'inactiveclinic@clinic.com',
  isActive: false,
};

export const expectedErrorMessages = {
  COMPLEX_NOT_FOUND: {
    ar: 'المجمع الطبي غير موجود',
    en: 'Medical complex not found',
  },
  INVALID_ID_FORMAT: {
    ar: 'صيغة المعرف غير صالحة',
    en: 'Invalid ID format',
  },
};
