/**
 * Swagger Examples for Authentication Module
 *
 * This file contains example request/response payloads for API documentation.
 * Used by @ApiBody() and @ApiResponse() decorators in the controller.
 */

// ============================================================================
// REGISTER EXAMPLES
// ============================================================================

export const REGISTER_REQUEST_EXAMPLE = {
  email: 'john.doe@example.com',
  password: 'SecurePass123!',
  firstName: 'John',
  lastName: 'Doe',
  role: 'owner',
  phone: '+1234567890',
  nationality: 'US',
  gender: 'male',
};

export const REGISTER_RESPONSE_EXAMPLE = {
  access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  expires_in: 86400,
  user: {
    id: '507f1f77bcf86cd799439011',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'owner',
    isActive: true,
    emailVerified: false,
    isFirstLogin: true,
    passwordChangeRequired: false,
    preferredLanguage: 'en',
    isOwner: true,
  },
};

// ============================================================================
// LOGIN EXAMPLES
// ============================================================================

export const LOGIN_REQUEST_EXAMPLE = {
  email: 'john.doe@example.com',
  password: 'SecurePass123!',
};

export const LOGIN_RESPONSE_EXAMPLE = {
  access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  expires_in: 86400,
  user: {
    id: '507f1f77bcf86cd799439011',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'owner',
    isActive: true,
    emailVerified: true,
    isFirstLogin: false,
    passwordChangeRequired: false,
    preferredLanguage: 'en',
    setupComplete: true,
    subscriptionId: '507f1f77bcf86cd799439012',
    organizationId: '507f1f77bcf86cd799439013',
    complexId: null,
    clinicId: null,
    onboardingComplete: true,
    onboardingProgress: ['company', 'subscription', 'complete'],
    planType: 'company',
    isOwner: true,
  },
};

export const LOGIN_FIRST_TIME_RESPONSE_EXAMPLE = {
  access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  expires_in: 86400,
  user: {
    id: '507f1f77bcf86cd799439011',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'owner',
    isActive: true,
    emailVerified: false,
    isFirstLogin: true,
    passwordChangeRequired: true,
    preferredLanguage: 'en',
    isOwner: true,
  },
};

// ============================================================================
// FIRST LOGIN PASSWORD CHANGE EXAMPLES
// ============================================================================

export const FIRST_LOGIN_PASSWORD_CHANGE_REQUEST_EXAMPLE = {
  currentPassword: 'TempPassword123!',
  newPassword: 'NewSecurePass456!',
  confirmPassword: 'NewSecurePass456!',
};

export const FIRST_LOGIN_PASSWORD_CHANGE_RESPONSE_EXAMPLE = {
  access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  expires_in: 86400,
  user: {
    id: '507f1f77bcf86cd799439011',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'owner',
    isActive: true,
    emailVerified: false,
    isFirstLogin: false,
    passwordChangeRequired: false,
    preferredLanguage: 'en',
    isOwner: true,
  },
};

// ============================================================================
// CHANGE PASSWORD EXAMPLES
// ============================================================================

export const CHANGE_PASSWORD_REQUEST_EXAMPLE = {
  currentPassword: 'CurrentPass123!',
  newPassword: 'NewSecurePass789!',
  confirmPassword: 'NewSecurePass789!',
};

export const CHANGE_PASSWORD_RESPONSE_EXAMPLE = {
  success: true,
  message: {
    ar: 'تم تغيير كلمة المرور بنجاح',
    en: 'Password changed successfully',
  },
};

// ============================================================================
// FORGOT PASSWORD EXAMPLES
// ============================================================================

export const FORGOT_PASSWORD_REQUEST_EXAMPLE = {
  email: 'john.doe@example.com',
};

export const FORGOT_PASSWORD_RESPONSE_EXAMPLE = {
  success: true,
  message: {
    ar: 'إذا كان البريد الإلكتروني موجوداً في نظامنا، ستتلقى رسالة لإعادة تعيين كلمة المرور',
    en: 'If the email exists in our system, you will receive a password reset email',
  },
};

// ============================================================================
// RESET PASSWORD EXAMPLES
// ============================================================================

export const RESET_PASSWORD_REQUEST_EXAMPLE = {
  token: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6',
  newPassword: 'NewSecurePass123!',
  confirmPassword: 'NewSecurePass123!',
};

export const RESET_PASSWORD_RESPONSE_EXAMPLE = {
  success: true,
  message: {
    ar: 'تم إعادة تعيين كلمة المرور بنجاح',
    en: 'Password has been reset successfully',
  },
};

// ============================================================================
// REFRESH TOKEN EXAMPLES
// ============================================================================

export const REFRESH_TOKEN_REQUEST_EXAMPLE = {
  refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
};

export const REFRESH_TOKEN_RESPONSE_EXAMPLE = {
  access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  expires_in: 86400,
  user: {
    id: '507f1f77bcf86cd799439011',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'owner',
    isActive: true,
    emailVerified: true,
    isOwner: true,
  },
};

// ============================================================================
// GET PROFILE EXAMPLES
// ============================================================================

export const GET_PROFILE_RESPONSE_EXAMPLE = {
  id: '507f1f77bcf86cd799439011',
  email: 'john.doe@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'owner',
  isActive: true,
  emailVerified: true,
  phone: '+1234567890',
  nationality: 'US',
  gender: 'male',
  preferredLanguage: 'en',
  lastLogin: '2024-02-03T10:30:00.000Z',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-02-03T10:30:00.000Z',
};

// ============================================================================
// LOGOUT EXAMPLES
// ============================================================================

export const LOGOUT_RESPONSE_EXAMPLE = {
  success: true,
  message: {
    ar: 'تم تسجيل الخروج بنجاح',
    en: 'Logout successful',
  },
};

// ============================================================================
// ERROR RESPONSE EXAMPLES
// ============================================================================

export const ERROR_INVALID_CREDENTIALS_EXAMPLE = {
  statusCode: 401,
  message: {
    ar: 'بيانات الاعتماد غير صحيحة',
    en: 'Invalid credentials',
  },
  code: 'INVALID_CREDENTIALS',
  timestamp: '2024-02-03T10:30:00.000Z',
  path: '/auth/login',
};

export const ERROR_EMAIL_EXISTS_EXAMPLE = {
  statusCode: 409,
  message: {
    ar: 'مستخدم بهذا البريد الإلكتروني موجود بالفعل',
    en: 'User with this email already exists',
  },
  code: 'EMAIL_ALREADY_EXISTS',
  timestamp: '2024-02-03T10:30:00.000Z',
  path: '/auth/register',
};

export const ERROR_ACCOUNT_INACTIVE_EXAMPLE = {
  statusCode: 401,
  message: {
    ar: 'الحساب غير نشط',
    en: 'Account is inactive',
  },
  code: 'ACCOUNT_INACTIVE',
  timestamp: '2024-02-03T10:30:00.000Z',
  path: '/auth/login',
};

export const ERROR_PASSWORDS_DO_NOT_MATCH_EXAMPLE = {
  statusCode: 400,
  message: {
    ar: 'كلمات المرور غير متطابقة',
    en: 'Passwords do not match',
  },
  code: 'PASSWORDS_DO_NOT_MATCH',
  timestamp: '2024-02-03T10:30:00.000Z',
  path: '/auth/first-login-password-change',
};

export const ERROR_INVALID_CURRENT_PASSWORD_EXAMPLE = {
  statusCode: 400,
  message: {
    ar: 'كلمة المرور الحالية غير صحيحة',
    en: 'Current password is incorrect',
  },
  code: 'INVALID_CURRENT_PASSWORD',
  timestamp: '2024-02-03T10:30:00.000Z',
  path: '/auth/change-password',
};

export const ERROR_RATE_LIMIT_EXCEEDED_EXAMPLE = {
  statusCode: 429,
  message: {
    ar: 'تم تجاوز الحد المسموح من المحاولات',
    en: 'Rate limit exceeded',
  },
  code: 'RATE_LIMIT_EXCEEDED',
  timestamp: '2024-02-03T10:30:00.000Z',
  path: '/auth/login',
};

export const ERROR_TOKEN_EXPIRED_EXAMPLE = {
  statusCode: 401,
  message: {
    ar: 'انتهت صلاحية الرمز',
    en: 'Token expired',
  },
  code: 'AUTH_002',
  timestamp: '2024-02-03T10:30:00.000Z',
  path: '/auth/refresh',
};

export const ERROR_TOKEN_BLACKLISTED_EXAMPLE = {
  statusCode: 401,
  message: {
    ar: 'الرمز محظور',
    en: 'Token blacklisted',
  },
  code: 'AUTH_012',
  timestamp: '2024-02-03T10:30:00.000Z',
  path: '/auth/refresh',
};

export const ERROR_PASSWORD_RESET_TOKEN_INVALID_EXAMPLE = {
  statusCode: 400,
  message: {
    ar: 'رمز إعادة تعيين كلمة المرور غير صالح',
    en: 'Password reset token is invalid',
  },
  code: 'PASSWORD_RESET_TOKEN_INVALID',
  timestamp: '2024-02-03T10:30:00.000Z',
  path: '/auth/reset-password',
};

export const ERROR_PASSWORD_RESET_TOKEN_EXPIRED_EXAMPLE = {
  statusCode: 400,
  message: {
    ar: 'انتهت صلاحية رمز إعادة تعيين كلمة المرور',
    en: 'Password reset token has expired',
  },
  code: 'PASSWORD_RESET_TOKEN_EXPIRED',
  timestamp: '2024-02-03T10:30:00.000Z',
  path: '/auth/reset-password',
};

export const ERROR_UNAUTHORIZED_EXAMPLE = {
  statusCode: 401,
  message: {
    ar: 'غير مصرح',
    en: 'Unauthorized',
  },
  code: 'UNAUTHORIZED',
  timestamp: '2024-02-03T10:30:00.000Z',
  path: '/auth/profile',
};

export const ERROR_VALIDATION_EXAMPLE = {
  statusCode: 400,
  message: [
    'email must be an email',
    'password must be at least 8 characters long',
    'password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  ],
  error: 'Bad Request',
  timestamp: '2024-02-03T10:30:00.000Z',
  path: '/auth/register',
};
