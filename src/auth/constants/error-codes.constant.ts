/**
 * Authentication Error Codes
 *
 * Centralized error codes for the authentication module.
 * Used for consistent error handling and API documentation.
 */

export const AUTH_ERROR_CODES = {
  // Authentication Errors (AUTH_001 - AUTH_020)
  INVALID_CREDENTIALS: 'AUTH_001',
  TOKEN_EXPIRED: 'AUTH_002',
  INVALID_TOKEN: 'AUTH_003',
  ACCOUNT_INACTIVE: 'AUTH_004',
  EMAIL_NOT_VERIFIED: 'AUTH_005',
  AUTHENTICATION_FAILED: 'AUTH_006',
  ACCESS_TOKEN_REQUIRED: 'AUTH_007',
  UNAUTHORIZED: 'AUTH_008',
  TOKEN_BLACKLISTED: 'AUTH_012',

  // Registration Errors (REG_001 - REG_020)
  EMAIL_ALREADY_EXISTS: 'REG_001',
  REGISTRATION_FAILED: 'REG_002',
  INVALID_EMAIL: 'REG_003',
  WEAK_PASSWORD: 'REG_004',

  // Password Management Errors (PWD_001 - PWD_020)
  INVALID_CURRENT_PASSWORD: 'PWD_001',
  PASSWORDS_DO_NOT_MATCH: 'PWD_002',
  NEW_PASSWORD_SAME_AS_CURRENT: 'PWD_003',
  PASSWORD_CHANGE_FAILED: 'PWD_004',
  PASSWORD_RESET_TOKEN_INVALID: 'PWD_005',
  PASSWORD_RESET_TOKEN_EXPIRED: 'PWD_006',
  PASSWORD_RESET_TOKEN_USED: 'PWD_007',
  PASSWORD_RESET_FAILED: 'PWD_008',
  PASSWORD_RESET_EMAIL_FAILED: 'PWD_009',

  // Rate Limiting Errors (RATE_001 - RATE_020)
  RATE_LIMIT_EXCEEDED: 'RATE_001',
  TOO_MANY_LOGIN_ATTEMPTS: 'RATE_002',
  TOO_MANY_PASSWORD_CHANGES: 'RATE_003',
  TOO_MANY_PASSWORD_RESETS: 'RATE_004',

  // User Errors (USER_001 - USER_020)
  USER_NOT_FOUND: 'USER_001',
  USER_ID_NOT_FOUND: 'USER_002',

  // Permission Errors (PERM_001 - PERM_020)
  INSUFFICIENT_PERMISSIONS: 'PERM_001',
  ADMIN_NOT_FOUND: 'PERM_002',

  // Logout Errors (LOGOUT_001 - LOGOUT_020)
  LOGOUT_FAILED: 'LOGOUT_001',

  // General Errors
  INTERNAL_SERVER_ERROR: 'ERR_500',
  BAD_REQUEST: 'ERR_400',
} as const;

export type AuthErrorCode =
  (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];

/**
 * Error Messages (Bilingual)
 */
export const AUTH_ERROR_MESSAGES = {
  [AUTH_ERROR_CODES.INVALID_CREDENTIALS]: {
    ar: 'بيانات الاعتماد غير صحيحة',
    en: 'Invalid credentials',
  },
  [AUTH_ERROR_CODES.TOKEN_EXPIRED]: {
    ar: 'انتهت صلاحية الرمز',
    en: 'Token expired',
  },
  [AUTH_ERROR_CODES.INVALID_TOKEN]: {
    ar: 'رمز غير صالح',
    en: 'Invalid token',
  },
  [AUTH_ERROR_CODES.ACCOUNT_INACTIVE]: {
    ar: 'الحساب غير نشط',
    en: 'Account is inactive',
  },
  [AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED]: {
    ar: 'البريد الإلكتروني غير مؤكد',
    en: 'Email not verified',
  },
  [AUTH_ERROR_CODES.AUTHENTICATION_FAILED]: {
    ar: 'فشلت المصادقة',
    en: 'Authentication failed',
  },
  [AUTH_ERROR_CODES.ACCESS_TOKEN_REQUIRED]: {
    ar: 'رمز الوصول مطلوب',
    en: 'Access token required',
  },
  [AUTH_ERROR_CODES.UNAUTHORIZED]: {
    ar: 'غير مصرح',
    en: 'Unauthorized',
  },
  [AUTH_ERROR_CODES.TOKEN_BLACKLISTED]: {
    ar: 'الرمز محظور',
    en: 'Token blacklisted',
  },
  [AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS]: {
    ar: 'مستخدم بهذا البريد الإلكتروني موجود بالفعل',
    en: 'User with this email already exists',
  },
  [AUTH_ERROR_CODES.REGISTRATION_FAILED]: {
    ar: 'فشل التسجيل',
    en: 'Registration failed',
  },
  [AUTH_ERROR_CODES.INVALID_EMAIL]: {
    ar: 'البريد الإلكتروني غير صالح',
    en: 'Invalid email address',
  },
  [AUTH_ERROR_CODES.WEAK_PASSWORD]: {
    ar: 'كلمة المرور ضعيفة',
    en: 'Weak password',
  },
  [AUTH_ERROR_CODES.INVALID_CURRENT_PASSWORD]: {
    ar: 'كلمة المرور الحالية غير صحيحة',
    en: 'Current password is incorrect',
  },
  [AUTH_ERROR_CODES.PASSWORDS_DO_NOT_MATCH]: {
    ar: 'كلمات المرور غير متطابقة',
    en: 'Passwords do not match',
  },
  [AUTH_ERROR_CODES.NEW_PASSWORD_SAME_AS_CURRENT]: {
    ar: 'كلمة المرور الجديدة يجب أن تختلف عن الحالية',
    en: 'New password must differ from current password',
  },
  [AUTH_ERROR_CODES.PASSWORD_CHANGE_FAILED]: {
    ar: 'فشل تغيير كلمة المرور',
    en: 'Password change failed',
  },
  [AUTH_ERROR_CODES.PASSWORD_RESET_TOKEN_INVALID]: {
    ar: 'رمز إعادة تعيين كلمة المرور غير صالح',
    en: 'Password reset token is invalid',
  },
  [AUTH_ERROR_CODES.PASSWORD_RESET_TOKEN_EXPIRED]: {
    ar: 'انتهت صلاحية رمز إعادة تعيين كلمة المرور',
    en: 'Password reset token has expired',
  },
  [AUTH_ERROR_CODES.PASSWORD_RESET_TOKEN_USED]: {
    ar: 'تم استخدام رمز إعادة تعيين كلمة المرور بالفعل',
    en: 'Password reset token has already been used',
  },
  [AUTH_ERROR_CODES.PASSWORD_RESET_FAILED]: {
    ar: 'فشل إعادة تعيين كلمة المرور',
    en: 'Password reset failed',
  },
  [AUTH_ERROR_CODES.PASSWORD_RESET_EMAIL_FAILED]: {
    ar: 'فشل إرسال رسالة إعادة تعيين كلمة المرور',
    en: 'Failed to send password reset email',
  },
  [AUTH_ERROR_CODES.RATE_LIMIT_EXCEEDED]: {
    ar: 'تم تجاوز الحد المسموح من المحاولات',
    en: 'Rate limit exceeded',
  },
  [AUTH_ERROR_CODES.TOO_MANY_LOGIN_ATTEMPTS]: {
    ar: 'عدد كبير جداً من محاولات تسجيل الدخول',
    en: 'Too many login attempts',
  },
  [AUTH_ERROR_CODES.TOO_MANY_PASSWORD_CHANGES]: {
    ar: 'عدد كبير جداً من محاولات تغيير كلمة المرور',
    en: 'Too many password change attempts',
  },
  [AUTH_ERROR_CODES.TOO_MANY_PASSWORD_RESETS]: {
    ar: 'عدد كبير جداً من محاولات إعادة تعيين كلمة المرور',
    en: 'Too many password reset attempts',
  },
  [AUTH_ERROR_CODES.USER_NOT_FOUND]: {
    ar: 'المستخدم غير موجود',
    en: 'User not found',
  },
  [AUTH_ERROR_CODES.USER_ID_NOT_FOUND]: {
    ar: 'معرف المستخدم غير موجود',
    en: 'User ID not found',
  },
  [AUTH_ERROR_CODES.INSUFFICIENT_PERMISSIONS]: {
    ar: 'ليس لديك صلاحية كافية',
    en: 'Insufficient permissions',
  },
  [AUTH_ERROR_CODES.ADMIN_NOT_FOUND]: {
    ar: 'المسؤول غير موجود',
    en: 'Admin not found',
  },
  [AUTH_ERROR_CODES.LOGOUT_FAILED]: {
    ar: 'فشل تسجيل الخروج',
    en: 'Logout failed',
  },
  [AUTH_ERROR_CODES.INTERNAL_SERVER_ERROR]: {
    ar: 'خطأ داخلي في الخادم',
    en: 'Internal server error',
  },
  [AUTH_ERROR_CODES.BAD_REQUEST]: {
    ar: 'طلب غير صالح',
    en: 'Bad request',
  },
} as const;
