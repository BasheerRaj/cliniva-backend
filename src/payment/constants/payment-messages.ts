/**
 * Payment Messages - M7 Billing & Payments MVP
 * Bilingual error and success messages for payment operations
 * Requirements: 12.2, 12.4, 12.6, 12.8, 12.10
 */

export const PAYMENT_ERRORS = {
  AMOUNT_ZERO: {
    ar: 'لا يمكن أن يكون مبلغ الدفع صفرًا',
    en: 'The Payment Amount cannot be zero',
  },
  AMOUNT_EXCEEDS_BALANCE: {
    ar: 'لا يمكن أن يتجاوز مبلغ الدفع الرصيد المستحق',
    en: 'Payment amount cannot exceed the Outstanding Balance',
  },
  DATE_FUTURE: {
    ar: 'لا يمكن أن يكون تاريخ الدفع في المستقبل',
    en: 'The Payment Date cannot be in the future',
  },
  INVOICE_ALREADY_PAID: {
    ar: 'هذه الفاتورة مدفوعة بالكامل بالفعل',
    en: 'This Invoice is already marked as Paid',
  },
  INVOICE_CANCELLED: {
    ar: 'هذه الفاتورة ملغاة',
    en: 'This Invoice is Cancelled',
  },
  INVOICE_NOT_POSTED: {
    ar: 'لا يمكن إضافة دفعة لفاتورة غير منشورة',
    en: 'Cannot add payment to a non-Posted invoice',
  },
  PATIENT_MISMATCH: {
    ar: 'المريض المحدد لا يتطابق مع مريض الفاتورة',
    en: 'The specified patient does not match the invoice patient',
  },
  INVALID_AMOUNT: {
    ar: 'مبلغ الدفع غير صالح',
    en: 'Invalid payment amount',
  },
  INVALID_METHOD: {
    ar: 'طريقة الدفع غير صالحة',
    en: 'Invalid payment method',
  },
  INVALID_DATE: {
    ar: 'تاريخ الدفع غير صالح',
    en: 'Invalid payment date',
  },
};

export const SUCCESS_MESSAGES = {
  PAYMENT_CREATED: {
    ar: 'تم حفظ الدفعة بنجاح وتحديث أرصدة الفاتورة',
    en: 'Payment saved successfully and invoice balances updated',
  },
  PAYMENT_UPDATED: {
    ar: 'تم تحديث الدفعة بنجاح',
    en: 'Payment updated successfully',
  },
  PAYMENT_DELETED: {
    ar: 'تم حذف الدفعة بنجاح',
    en: 'Payment deleted successfully',
  },
  BALANCE_UPDATED: {
    ar: 'تم تحديث أرصدة الفاتورة بنجاح',
    en: 'Invoice balances updated successfully',
  },
};

export const NOT_FOUND_ERRORS = {
  PAYMENT: {
    ar: 'الدفعة غير موجودة',
    en: 'Payment not found',
  },
  INVOICE: {
    ar: 'الفاتورة غير موجودة',
    en: 'Invoice not found',
  },
  PATIENT: {
    ar: 'المريض غير موجود',
    en: 'Patient not found',
  },
  CLINIC: {
    ar: 'العيادة غير موجودة',
    en: 'Clinic not found',
  },
};

export const AUTH_ERRORS = {
  INSUFFICIENT_PERMISSIONS: {
    ar: 'ليس لديك صلاحيات كافية لتنفيذ هذا الإجراء',
    en: 'You do not have sufficient permissions to perform this action',
  },
  UNAUTHORIZED_ACCESS: {
    ar: 'غير مصرح لك بالوصول إلى هذا المورد',
    en: 'You are not authorized to access this resource',
  },
};

export const VALIDATION_ERRORS = {
  REQUIRED_FIELD: {
    ar: 'هذا الحقل مطلوب',
    en: 'This field is required',
  },
  INVALID_FORMAT: {
    ar: 'التنسيق غير صالح',
    en: 'Invalid format',
  },
  INVALID_VALUE: {
    ar: 'القيمة غير صالحة',
    en: 'Invalid value',
  },
};
