/**
 * Bilingual Error Codes for Complex Management
 *
 * All error codes follow the format COMPLEX_XXX where XXX is a three-digit number.
 * Each error code contains both Arabic (ar) and English (en) messages.
 *
 * Requirements: 11.1, 11.2
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
 * Complex Management Error Codes
 *
 * COMPLEX_001: Plan limit exceeded for Complex plan
 * COMPLEX_002: Invalid person-in-charge
 * COMPLEX_003: Cannot delete complex with active clinics
 * COMPLEX_004: Must transfer clinics before deactivation
 * COMPLEX_005: Invalid target complex for transfer
 * COMPLEX_006: Complex not found
 * COMPLEX_007: Department linked to clinics
 * COMPLEX_008: Subscription is not active
 * COMPLEX_009: Invalid email format
 * COMPLEX_010: Invalid phone format
 */
export const ERROR_CODES = {
  COMPLEX_001: {
    code: 'COMPLEX_001',
    message: {
      ar: 'تم تجاوز حد الخطة. الخطة المعقدة تسمح بمجمع واحد كحد أقصى',
      en: 'Plan limit exceeded. Complex plan allows maximum 1 complex',
    },
  },
  COMPLEX_002: {
    code: 'COMPLEX_002',
    message: {
      ar: 'الشخص المسؤول غير صالح. يجب أن يكون موظفًا في المجمع',
      en: 'Invalid person-in-charge. Must be an employee of the complex',
    },
  },
  COMPLEX_003: {
    code: 'COMPLEX_003',
    message: {
      ar: 'لا يمكن حذف المجمع مع وجود عيادات نشطة',
      en: 'Cannot delete complex with active clinics',
    },
  },
  COMPLEX_004: {
    code: 'COMPLEX_004',
    message: {
      ar: 'يجب نقل العيادات قبل إلغاء التنشيط',
      en: 'Must transfer clinics before deactivation',
    },
  },
  COMPLEX_005: {
    code: 'COMPLEX_005',
    message: {
      ar: 'المجمع المستهدف غير صالح للنقل',
      en: 'Invalid target complex for transfer',
    },
  },
  COMPLEX_006: {
    code: 'COMPLEX_006',
    message: {
      ar: 'المجمع غير موجود',
      en: 'Complex not found',
    },
  },
  COMPLEX_007: {
    code: 'COMPLEX_007',
    message: {
      ar: 'القسم مرتبط بعيادات ولا يمكن إزالته',
      en: 'Department linked to clinics and cannot be removed',
    },
  },
  COMPLEX_008: {
    code: 'COMPLEX_008',
    message: {
      ar: 'الاشتراك غير نشط',
      en: 'Subscription is not active',
    },
  },
  COMPLEX_009: {
    code: 'COMPLEX_009',
    message: {
      ar: 'تنسيق البريد الإلكتروني غير صالح',
      en: 'Invalid email format',
    },
  },
  COMPLEX_010: {
    code: 'COMPLEX_010',
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
