import { Types } from 'mongoose';
import { UserRole } from '../../../src/common/enums/user-role.enum';

/**
 * Test fixtures for service-offer E2E tests
 */

// Admin user for testing
export const adminUserData = {
  email: 'admin@service-offer-test.com',
  password: 'AdminPass123!',
  firstName: 'Admin',
  lastName: 'User',
  role: UserRole.ADMIN,
  phone: '+1234567891',
  nationality: 'US',
  gender: 'male',
  isActive: true,
};

// Service data for testing
export const serviceData = {
  name: 'General Consultation',
  description: 'Standard medical consultation',
  durationMinutes: 30,
  price: 150,
};

// Offer data for testing
export const offerData = {
  name: 'Summer Discount',
  description: 'Summer discount offer',
  discountType: 'percent' as const,
  discountValue: 20,
  startsAt: new Date(Date.now() + 86400000), // Tomorrow
  endsAt: new Date(Date.now() + 86400000 * 90), // 90 days from now
  isActive: true,
};

// Fixed amount offer
export const fixedOfferData = {
  name: 'Fixed Discount',
  description: 'Fixed amount discount',
  discountType: 'fixed' as const,
  discountValue: 50,
  startsAt: new Date(Date.now() + 86400000),
  endsAt: new Date(Date.now() + 86400000 * 90),
  isActive: true,
};

// Expired offer
export const expiredOfferData = {
  name: 'Expired Discount',
  description: 'Expired discount offer',
  discountType: 'percent' as const,
  discountValue: 15,
  startsAt: new Date(Date.now() - 86400000 * 30), // 30 days ago
  endsAt: new Date(Date.now() - 86400000), // Yesterday
  isActive: true,
};

// Future offer
export const futureOfferData = {
  name: 'Future Discount',
  description: 'Future discount offer',
  discountType: 'percent' as const,
  discountValue: 25,
  startsAt: new Date(Date.now() + 86400000 * 7), // 7 days from now
  endsAt: new Date(Date.now() + 86400000 * 90),
  isActive: true,
};

// Error messages for validation
export const expectedErrorMessages = {
  SERVICE_NOT_FOUND: {
    ar: 'الخدمة غير موجودة',
    en: 'Service not found',
  },
  OFFER_NOT_FOUND: {
    ar: 'العرض غير موجود',
    en: 'Offer not found',
  },
  DISCOUNT_ALREADY_ASSIGNED: {
    ar: 'الخصم مسند بالفعل لهذه الخدمة',
    en: 'Discount is already assigned to this service',
  },
  DISCOUNT_NOT_ASSIGNED: {
    ar: 'الخصم غير مسند لهذه الخدمة',
    en: 'Discount is not assigned to this service',
  },
};

// Test environment variables
export const testEnvironment = {
  JWT_SECRET: 'test-jwt-secret-for-service-offer-management',
  JWT_EXPIRES_IN: '1h',
  JWT_REFRESH_SECRET: 'test-refresh-secret-for-service-offer-management',
  JWT_REFRESH_EXPIRES_IN: '7d',
  NODE_ENV: 'test',
  MONGODB_URI:
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cliniva_test',
};
