/**
 * Invoice Error Constants
 *
 * All error messages are bilingual (Arabic & English) to support
 * the platform's internationalization requirements.
 *
 * Each error has:
 * - code: Unique error identifier (INVOICE_XXX format)
 * - message: Bilingual error message with 'ar' and 'en' properties
 *
 * Requirements: 12.1, 12.3, 12.5, 12.7, 12.9
 */

export interface BilingualMessage {
  ar: string;
  en: string;
}

export interface InvoiceError {
  code: string;
  message: BilingualMessage;
}

/**
 * Invoice-specific error messages
 */
export const INVOICE_ERRORS = {
  /**
   * Error: Invoice cannot be edited because status is not draft
   * MSG-683612os (Code 82)
   * Requirement: 4.11
   */
  CANNOT_EDIT_NON_DRAFT: {
    code: 'INVOICE_001',
    message: {
      ar: 'لا يمكنك تعديل هذه الفاتورة لأن حالتها ليست مسودة',
      en: 'You cannot edit this invoice because its status is not draft',
    },
  },

  /**
   * Error: Invoice title is required
   * Requirement: 13.1
   */
  TITLE_REQUIRED: {
    code: 'INVOICE_002',
    message: {
      ar: 'عنوان الفاتورة مطلوب',
      en: 'Invoice title is required',
    },
  },

  /**
   * Error: Invoice title exceeds maximum length
   * Requirement: 13.1
   */
  TITLE_TOO_LONG: {
    code: 'INVOICE_003',
    message: {
      ar: 'عنوان الفاتورة يتجاوز الحد الأقصى المسموح به (200 حرف)',
      en: 'Invoice title exceeds maximum length (200 characters)',
    },
  },

  /**
   * Error: Issue date cannot be in the future
   * Requirement: 13.2
   */
  FUTURE_ISSUE_DATE: {
    code: 'INVOICE_004',
    message: {
      ar: 'تاريخ الإصدار لا يمكن أن يكون في المستقبل',
      en: 'Issue date cannot be in the future',
    },
  },

  /**
   * Error: At least one service must be selected
   * Requirement: 13.3
   */
  SERVICE_REQUIRED: {
    code: 'INVOICE_005',
    message: {
      ar: 'يجب اختيار خدمة واحدة على الأقل',
      en: 'At least one service must be selected',
    },
  },

  /**
   * Error: Sessions must be a positive integer
   * Requirement: 13.4
   */
  INVALID_SESSIONS: {
    code: 'INVOICE_006',
    message: {
      ar: 'عدد الجلسات يجب أن يكون عدداً صحيحاً موجباً',
      en: 'Sessions must be a positive integer',
    },
  },

  /**
   * Error: Discount must be a non-negative number
   * Requirement: 13.5
   */
  INVALID_DISCOUNT: {
    code: 'INVOICE_007',
    message: {
      ar: 'الخصم يجب أن يكون رقماً غير سالب',
      en: 'Discount must be a non-negative number',
    },
  },

  /**
   * Error: Total amount calculation is incorrect
   * Requirement: 13.6
   */
  INVALID_TOTAL_CALCULATION: {
    code: 'INVOICE_008',
    message: {
      ar: 'حساب المبلغ الإجمالي غير صحيح',
      en: 'Total amount calculation is incorrect',
    },
  },

  /**
   * Error: Invoice number generation failed
   * Requirement: 14.1, 14.2
   */
  NUMBER_GENERATION_FAILED: {
    code: 'INVOICE_009',
    message: {
      ar: 'فشل إنشاء رقم الفاتورة',
      en: 'Invoice number generation failed',
    },
  },

  /**
   * Error: Duplicate invoice number detected
   * Requirement: 13.10
   */
  DUPLICATE_INVOICE_NUMBER: {
    code: 'INVOICE_010',
    message: {
      ar: 'رقم الفاتورة موجود بالفعل',
      en: 'Invoice number already exists',
    },
  },

  /**
   * Error: Cannot delete invoice with associated payments
   * Requirement: 13.12
   */
  CANNOT_DELETE_WITH_PAYMENTS: {
    code: 'INVOICE_011',
    message: {
      ar: 'لا يمكن حذف الفاتورة لأنها تحتوي على دفعات مرتبطة',
      en: 'Cannot delete invoice with associated payments',
    },
  },

  /**
   * Error: Patient field cannot be modified
   * Requirement: 4.4
   */
  CANNOT_MODIFY_PATIENT: {
    code: 'INVOICE_012',
    message: {
      ar: 'لا يمكن تعديل حقل المريض',
      en: 'Patient field cannot be modified',
    },
  },

  /**
   * Error: Service is not active
   * Requirement: 1.7
   */
  SERVICE_NOT_ACTIVE: {
    code: 'INVOICE_013',
    message: {
      ar: 'الخدمة المحددة غير نشطة',
      en: 'Selected service is not active',
    },
  },

  /**
   * Error: Invoice status transition failed
   * Requirement: 5.1, 15.2
   */
  STATUS_TRANSITION_FAILED: {
    code: 'INVOICE_014',
    message: {
      ar: 'فشل تغيير حالة الفاتورة',
      en: 'Invoice status transition failed',
    },
  },

  /**
   * Error: Cannot transition non-draft invoice to posted
   * Requirement: 5.1
   */
  CANNOT_POST_NON_DRAFT: {
    code: 'INVOICE_015',
    message: {
      ar: 'لا يمكن نشر فاتورة ليست في حالة مسودة',
      en: 'Cannot post invoice that is not in draft status',
    },
  },

  /**
   * Error: Validation failed
   * General validation error
   */
  VALIDATION_FAILED: {
    code: 'INVOICE_016',
    message: {
      ar: 'فشل التحقق من صحة البيانات',
      en: 'Validation failed',
    },
  },

  /**
   * Error: Issue date is in the future
   * Requirement: 13.2
   */
  ISSUE_DATE_FUTURE: {
    code: 'INVOICE_017',
    message: {
      ar: 'تاريخ الإصدار لا يمكن أن يكون في المستقبل',
      en: 'Issue date cannot be in the future',
    },
  },

  /**
   * Error: Patient field is immutable
   * Requirement: 4.4
   */
  PATIENT_IMMUTABLE: {
    code: 'INVOICE_018',
    message: {
      ar: 'لا يمكن تعديل حقل المريض في الفاتورة الموجودة',
      en: 'Patient field cannot be modified in existing invoice',
    },
  },

  /**
   * Error: Invoice already posted
   * Requirement: 5.1
   */
  ALREADY_POSTED: {
    code: 'INVOICE_019',
    message: {
      ar: 'الفاتورة منشورة بالفعل',
      en: 'Invoice is already posted',
    },
  },

  /**
   * Error: Invoice has payments and cannot be deleted
   * Requirement: 13.12
   */
  HAS_PAYMENTS: {
    code: 'INVOICE_020',
    message: {
      ar: 'لا يمكن حذف الفاتورة لأنها تحتوي على دفعات مرتبطة',
      en: 'Cannot delete invoice with associated payments',
    },
  },
} as const;

/**
 * Not found error messages for invoice-related entities
 */
export const NOT_FOUND_ERRORS = {
  /**
   * Error: Invoice not found
   */
  INVOICE: {
    code: 'INVOICE_NOT_FOUND_001',
    message: {
      ar: 'الفاتورة غير موجودة',
      en: 'Invoice not found',
    },
  },

  /**
   * Error: Patient not found
   * Requirement: 1.2
   */
  PATIENT: {
    code: 'INVOICE_NOT_FOUND_002',
    message: {
      ar: 'المريض غير موجود',
      en: 'Patient not found',
    },
  },

  /**
   * Error: Service not found
   * Requirement: 1.2
   */
  SERVICE: {
    code: 'INVOICE_NOT_FOUND_003',
    message: {
      ar: 'الخدمة غير موجودة',
      en: 'Service not found',
    },
  },

  /**
   * Error: Clinic not found
   */
  CLINIC: {
    code: 'INVOICE_NOT_FOUND_004',
    message: {
      ar: 'العيادة غير موجودة',
      en: 'Clinic not found',
    },
  },

  /**
   * Error: Appointment not found
   * Requirement: 15.1
   */
  APPOINTMENT: {
    code: 'INVOICE_NOT_FOUND_005',
    message: {
      ar: 'الموعد غير موجود',
      en: 'Appointment not found',
    },
  },
} as const;

/**
 * Authorization error messages
 */
export const AUTH_ERRORS = {
  /**
   * Error: Unauthorized access to invoice
   * Requirement: 11.5
   */
  UNAUTHORIZED_ACCESS: {
    code: 'INVOICE_AUTH_001',
    message: {
      ar: 'غير مصرح لك بالوصول إلى هذه الفاتورة',
      en: 'Unauthorized access to this invoice',
    },
  },

  /**
   * Error: Insufficient permissions to edit invoice
   * Requirement: 4.6, 4.7, 11.7
   */
  INSUFFICIENT_PERMISSIONS: {
    code: 'INVOICE_AUTH_002',
    message: {
      ar: 'ليس لديك صلاحيات كافية لتنفيذ هذا الإجراء',
      en: 'Insufficient permissions to perform this action',
    },
  },

  /**
   * Error: Insufficient permissions to delete invoice
   */
  INSUFFICIENT_DELETE_PERMISSIONS: {
    code: 'INVOICE_AUTH_003',
    message: {
      ar: 'ليس لديك صلاحيات كافية لحذف هذه الفاتورة',
      en: 'Insufficient permissions to delete this invoice',
    },
  },

  /**
   * Error: Staff can only access their clinic's invoices
   * Requirement: 11.1
   */
  CLINIC_ACCESS_DENIED: {
    code: 'INVOICE_AUTH_004',
    message: {
      ar: 'يمكنك الوصول فقط إلى فواتير عيادتك',
      en: 'You can only access invoices from your clinic',
    },
  },

  /**
   * Error: Staff can only edit their own invoices
   * Requirement: 4.6, 11.7
   */
  OWNER_EDIT_ONLY: {
    code: 'INVOICE_AUTH_005',
    message: {
      ar: 'يمكنك تعديل الفواتير التي أنشأتها فقط',
      en: 'You can only edit invoices you created',
    },
  },
} as const;

/**
 * Success messages
 */
export const SUCCESS_MESSAGES = {
  /**
   * Success: Invoice created successfully
   * Requirement: 1.14
   */
  INVOICE_CREATED: {
    code: 'INVOICE_SUCCESS_001',
    message: {
      ar: 'تم إنشاء الفاتورة بنجاح',
      en: 'Invoice created successfully',
    },
  },

  /**
   * Success: Invoice updated successfully
   * Requirement: 4.10
   */
  INVOICE_UPDATED: {
    code: 'INVOICE_SUCCESS_002',
    message: {
      ar: 'تم تحديث الفاتورة بنجاح',
      en: 'Invoice updated successfully',
    },
  },

  /**
   * Success: Invoice deleted successfully
   */
  INVOICE_DELETED: {
    code: 'INVOICE_SUCCESS_003',
    message: {
      ar: 'تم حذف الفاتورة بنجاح',
      en: 'Invoice deleted successfully',
    },
  },

  /**
   * Success: Invoice transitioned to posted
   * Requirement: 5.1
   */
  INVOICE_POSTED: {
    code: 'INVOICE_SUCCESS_004',
    message: {
      ar: 'تم نشر الفاتورة بنجاح',
      en: 'Invoice posted successfully',
    },
  },

  /**
   * Success: Invoice retrieved successfully
   */
  INVOICE_RETRIEVED: {
    code: 'INVOICE_SUCCESS_005',
    message: {
      ar: 'تم استرجاع الفاتورة بنجاح',
      en: 'Invoice retrieved successfully',
    },
  },

  /**
   * Success: Invoice list retrieved successfully
   */
  INVOICE_LIST_RETRIEVED: {
    code: 'INVOICE_SUCCESS_006',
    message: {
      ar: 'تم استرجاع قائمة الفواتير بنجاح',
      en: 'Invoice list retrieved successfully',
    },
  },
} as const;

/**
 * Informational messages
 */
export const INVOICE_INFO_MESSAGES = {
  /**
   * Info: Service duplication warning
   * MSG-d494mpld (Code 81)
   * Requirement: 1.6
   */
  SERVICE_DUPLICATION_WARNING: {
    code: 'INVOICE_INFO_001',
    message: {
      ar: 'تم إضافة الخدمة المحددة بالفعل إلى الفاتورة لهذا المريض. يرجى المراجعة لتجنب التكرار',
      en: 'The selected service has already been added to the invoice for this patient. Please review to avoid duplicates',
    },
  },
} as const;

/**
 * Type for error codes
 */
export type InvoiceErrorCode = keyof typeof INVOICE_ERRORS;
export type InvoiceSuccessCode = keyof typeof SUCCESS_MESSAGES;
export type InvoiceNotFoundCode = keyof typeof NOT_FOUND_ERRORS;
export type InvoiceAuthErrorCode = keyof typeof AUTH_ERRORS;
export type InvoiceInfoCode = keyof typeof INVOICE_INFO_MESSAGES;

/**
 * Helper function to get error message by code
 */
export function getInvoiceErrorMessage(
  code: InvoiceErrorCode,
  language: 'ar' | 'en' = 'en',
): string {
  return INVOICE_ERRORS[code].message[language];
}

/**
 * Helper function to get success message by code
 */
export function getInvoiceSuccessMessage(
  code: InvoiceSuccessCode,
  language: 'ar' | 'en' = 'en',
): string {
  return SUCCESS_MESSAGES[code].message[language];
}

/**
 * Helper function to get not found error message by code
 */
export function getInvoiceNotFoundMessage(
  code: InvoiceNotFoundCode,
  language: 'ar' | 'en' = 'en',
): string {
  return NOT_FOUND_ERRORS[code].message[language];
}

/**
 * Helper function to get auth error message by code
 */
export function getInvoiceAuthErrorMessage(
  code: InvoiceAuthErrorCode,
  language: 'ar' | 'en' = 'en',
): string {
  return AUTH_ERRORS[code].message[language];
}

/**
 * Helper function to get info message by code
 */
export function getInvoiceInfoMessage(
  code: InvoiceInfoCode,
  language: 'ar' | 'en' = 'en',
): string {
  return INVOICE_INFO_MESSAGES[code].message[language];
}
