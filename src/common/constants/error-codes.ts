/**
 * Common Error Codes Registry
 * 
 * Centralized registry of all standard error codes with bilingual messages.
 * Used across all modules for consistent error handling and Swagger documentation.
 * 
 * @module common/constants/error-codes
 */

import { BilingualMessage } from '../types/bilingual-message.type';

/**
 * Standard error codes used throughout the application
 */
export enum ErrorCode {
  // Authentication & Authorization Errors (1xxx)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_BLACKLISTED = 'TOKEN_BLACKLISTED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Validation Errors (2xxx)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  REQUIRED_FIELD = 'REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_PHONE = 'INVALID_PHONE',
  INVALID_DATE = 'INVALID_DATE',
  INVALID_ENUM_VALUE = 'INVALID_ENUM_VALUE',
  
  // Resource Errors (3xxx)
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  
  // Business Logic Errors (4xxx)
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  SUBSCRIPTION_REQUIRED = 'SUBSCRIPTION_REQUIRED',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
  
  // System Errors (5xxx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  // Rate Limiting (6xxx)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
}

/**
 * Bilingual error messages for all standard error codes
 */
export const STANDARD_ERROR_MESSAGES: Record<ErrorCode, BilingualMessage> = {
  // Authentication & Authorization Errors
  [ErrorCode.UNAUTHORIZED]: {
    ar: 'غير مصرح لك بالوصول',
    en: 'Unauthorized access',
  },
  [ErrorCode.INVALID_CREDENTIALS]: {
    ar: 'بيانات الاعتماد غير صحيحة',
    en: 'Invalid credentials',
  },
  [ErrorCode.TOKEN_EXPIRED]: {
    ar: 'انتهت صلاحية الرمز',
    en: 'Token expired',
  },
  [ErrorCode.TOKEN_INVALID]: {
    ar: 'رمز غير صالح',
    en: 'Invalid token',
  },
  [ErrorCode.TOKEN_BLACKLISTED]: {
    ar: 'الرمز محظور',
    en: 'Token blacklisted',
  },
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: {
    ar: 'ليس لديك الصلاحيات الكافية',
    en: 'Insufficient permissions',
  },
  
  // Validation Errors
  [ErrorCode.VALIDATION_ERROR]: {
    ar: 'خطأ في التحقق من البيانات',
    en: 'Validation error',
  },
  [ErrorCode.REQUIRED_FIELD]: {
    ar: 'هذا الحقل مطلوب',
    en: 'This field is required',
  },
  [ErrorCode.INVALID_FORMAT]: {
    ar: 'تنسيق غير صالح',
    en: 'Invalid format',
  },
  [ErrorCode.INVALID_EMAIL]: {
    ar: 'البريد الإلكتروني غير صالح',
    en: 'Invalid email address',
  },
  [ErrorCode.INVALID_PHONE]: {
    ar: 'رقم الهاتف غير صالح',
    en: 'Invalid phone number',
  },
  [ErrorCode.INVALID_DATE]: {
    ar: 'التاريخ غير صالح',
    en: 'Invalid date',
  },
  [ErrorCode.INVALID_ENUM_VALUE]: {
    ar: 'قيمة غير صالحة',
    en: 'Invalid value',
  },
  
  // Resource Errors
  [ErrorCode.NOT_FOUND]: {
    ar: 'العنصر غير موجود',
    en: 'Item not found',
  },
  [ErrorCode.ALREADY_EXISTS]: {
    ar: 'العنصر موجود بالفعل',
    en: 'Item already exists',
  },
  [ErrorCode.DUPLICATE_ENTRY]: {
    ar: 'إدخال مكرر',
    en: 'Duplicate entry',
  },
  [ErrorCode.RESOURCE_CONFLICT]: {
    ar: 'تعارض في الموارد',
    en: 'Resource conflict',
  },
  
  // Business Logic Errors
  [ErrorCode.OPERATION_NOT_ALLOWED]: {
    ar: 'العملية غير مسموح بها',
    en: 'Operation not allowed',
  },
  [ErrorCode.BUSINESS_RULE_VIOLATION]: {
    ar: 'انتهاك قاعدة عمل',
    en: 'Business rule violation',
  },
  [ErrorCode.INVALID_STATE_TRANSITION]: {
    ar: 'انتقال حالة غير صالح',
    en: 'Invalid state transition',
  },
  [ErrorCode.QUOTA_EXCEEDED]: {
    ar: 'تم تجاوز الحد المسموح',
    en: 'Quota exceeded',
  },
  [ErrorCode.SUBSCRIPTION_REQUIRED]: {
    ar: 'يتطلب اشتراك',
    en: 'Subscription required',
  },
  [ErrorCode.SUBSCRIPTION_EXPIRED]: {
    ar: 'انتهت صلاحية الاشتراك',
    en: 'Subscription expired',
  },
  
  // System Errors
  [ErrorCode.INTERNAL_ERROR]: {
    ar: 'حدث خطأ داخلي في الخادم',
    en: 'Internal server error',
  },
  [ErrorCode.DATABASE_ERROR]: {
    ar: 'خطأ في قاعدة البيانات',
    en: 'Database error',
  },
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: {
    ar: 'خطأ في خدمة خارجية',
    en: 'External service error',
  },
  [ErrorCode.SERVICE_UNAVAILABLE]: {
    ar: 'الخدمة غير متاحة',
    en: 'Service unavailable',
  },
  [ErrorCode.TIMEOUT_ERROR]: {
    ar: 'انتهت مهلة الطلب',
    en: 'Request timeout',
  },
  
  // Rate Limiting
  [ErrorCode.RATE_LIMIT_EXCEEDED]: {
    ar: 'تم تجاوز الحد المسموح من المحاولات',
    en: 'Rate limit exceeded',
  },
  [ErrorCode.TOO_MANY_REQUESTS]: {
    ar: 'عدد كبير جداً من الطلبات',
    en: 'Too many requests',
  },
};

/**
 * Helper function to get error message by code
 * @param code - Error code
 * @returns Bilingual error message
 */
export function getErrorMessage(code: ErrorCode): BilingualMessage {
  return STANDARD_ERROR_MESSAGES[code] || STANDARD_ERROR_MESSAGES[ErrorCode.INTERNAL_ERROR];
}

/**
 * Helper function to create error response object
 * @param code - Error code
 * @param details - Optional additional error details
 * @returns Error response object
 */
export function createErrorResponse(code: ErrorCode, details?: any) {
  return {
    code,
    message: getErrorMessage(code),
    details,
  };
}
