/**
 * Bilingual Error Codes for Clinic Management
 *
 * All error codes follow the format CLINIC_XXX where XXX is a three-digit number.
 * Each error code contains both Arabic (ar) and English (en) messages.
 *
 * Requirements: Section 8 (Error Codes)
 * Design: Section 8.1 (Error Codes)
 */

export interface BilingualMessage {
  ar: string;
  en: string;
}

export interface ErrorCode {
  code: string;
  message: BilingualMessage;
}

/**
 * Clinic Management Error Codes
 *
 * CLINIC_001: Plan limit exceeded for Clinic plan
 * CLINIC_002: Invalid person-in-charge (must be from complex PICs)
 * CLINIC_003: Cannot delete clinic with active appointments
 * CLINIC_004: Must transfer doctors/staff before deactivation
 * CLINIC_005: Working hours outside complex hours
 * CLINIC_006: Working hours conflict with appointments
 * CLINIC_007: Clinic not found
 * CLINIC_008: Target clinic not found
 * CLINIC_009: Invalid email format
 * CLINIC_010: Invalid phone format
 */
export const ERROR_CODES = {
  CLINIC_001: {
    code: 'CLINIC_001',
    message: {
      ar: 'تم تجاوز الحد الأقصى للعيادات المسموح به في الخطة',
      en: 'Plan clinic limit exceeded',
    },
  },
  CLINIC_002: {
    code: 'CLINIC_002',
    message: {
      ar: 'يجب أن يكون الشخص المسؤول من المسؤولين عن المجمع',
      en: 'Person in charge must be from complex PICs',
    },
  },
  CLINIC_003: {
    code: 'CLINIC_003',
    message: {
      ar: 'لا يمكن حذف العيادة لوجود مواعيد نشطة',
      en: 'Cannot delete clinic with active appointments',
    },
  },
  CLINIC_004: {
    code: 'CLINIC_004',
    message: {
      ar: 'يرجى اختيار ما إذا كنت تريد الاحتفاظ بالأطباء أو نقلهم',
      en: 'Must transfer doctors/staff before deactivation',
    },
  },
  CLINIC_005: {
    code: 'CLINIC_005',
    message: {
      ar: 'ساعات العمل خارج نطاق ساعات المجمع',
      en: 'Working hours outside complex hours',
    },
  },
  CLINIC_006: {
    code: 'CLINIC_006',
    message: {
      ar: 'تعارض في ساعات العمل مع المواعيد',
      en: 'Working hours conflict with appointments',
    },
  },
  CLINIC_007: {
    code: 'CLINIC_007',
    message: {
      ar: 'العيادة غير موجودة',
      en: 'Clinic not found',
    },
  },
  CLINIC_008: {
    code: 'CLINIC_008',
    message: {
      ar: 'العيادة المستهدفة غير موجودة',
      en: 'Target clinic not found',
    },
  },
  CLINIC_009: {
    code: 'CLINIC_009',
    message: {
      ar: 'تنسيق البريد الإلكتروني غير صالح',
      en: 'Invalid email format',
    },
  },
  CLINIC_010: {
    code: 'CLINIC_010',
    message: {
      ar: 'تنسيق رقم الهاتف غير صالح',
      en: 'Invalid phone format',
    },
  },
} as const;

/**
 * Type-safe error code keys
 */
export type ErrorCodeKey = keyof typeof ERROR_CODES;

/**
 * Helper function to get error code by key
 */
export const getErrorCode = (key: ErrorCodeKey): ErrorCode => {
  return ERROR_CODES[key];
};

/**
 * Helper function to get bilingual message by key
 */
export const getErrorMessage = (key: ErrorCodeKey): BilingualMessage => {
  return ERROR_CODES[key].message;
};
