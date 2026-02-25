/**
 * Bilingual error messages for session-related operations
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 * 
 * All error messages follow the bilingual format: { ar: "Arabic message", en: "English message" }
 * These constants are used throughout the session management system for consistent error reporting
 */
export const SESSION_ERROR_MESSAGES = {
  // Session Validation Errors (Requirements: 6.1, 6.2, 6.3, 1.4, 1.5)
  INVALID_SESSION_STRUCTURE: {
    ar: 'بنية الجلسة غير صالحة',
    en: 'Invalid session structure',
  },
  DUPLICATE_SESSION_ORDER: {
    ar: 'أرقام ترتيب الجلسات يجب أن تكون فريدة',
    en: 'Session order numbers must be unique',
  },
  MAX_SESSIONS_EXCEEDED: {
    ar: 'لا يمكن أن تحتوي الخدمة على أكثر من 50 جلسة',
    en: 'Service cannot have more than 50 sessions',
  },
  INVALID_SESSION_DURATION: {
    ar: 'مدة الجلسة يجب أن تكون بين 5 و 480 دقيقة',
    en: 'Session duration must be between 5 and 480 minutes',
  },
  EMPTY_SESSION_NAME: {
    ar: 'اسم الجلسة لا يمكن أن يكون فارغاً',
    en: 'Session name cannot be empty',
  },
  INVALID_SESSION_ORDER: {
    ar: 'ترتيب الجلسة يجب أن يكون رقماً موجباً',
    en: 'Session order must be a positive number',
  },

  // Session Reference Errors (Requirements: 3.4, 6.4, 6.5)
  SESSION_ID_REQUIRED: {
    ar: 'معرف الجلسة مطلوب للخدمات التي تحتوي على جلسات',
    en: 'Session ID is required for services with sessions',
  },
  INVALID_SESSION_ID: {
    ar: 'معرف الجلسة غير صالح للخدمة المحددة',
    en: 'Invalid session ID for the specified service',
  },
  SESSION_NOT_FOUND: {
    ar: 'الجلسة غير موجودة في الخدمة المحددة',
    en: 'Session not found in the specified service',
  },
  SERVICE_HAS_NO_SESSIONS: {
    ar: 'الخدمة المحددة لا تحتوي على جلسات',
    en: 'The specified service does not have sessions',
  },

  // Duplicate Booking Errors (Requirements: 4.1, 4.2, 4.3, 4.4)
  DUPLICATE_SESSION_BOOKING: {
    ar: 'هذا المريض لديه موعد نشط لهذه الجلسة بالفعل',
    en: 'This patient already has an active appointment for this session',
  },
  COMPLETED_SESSION_REBOOKING: {
    ar: 'لا يمكن إعادة حجز جلسة مكتملة',
    en: 'Cannot rebook a completed session',
  },

  // Batch Booking Errors (Requirements: 7.2, 7.3, 7.5)
  BATCH_BOOKING_FAILED: {
    ar: 'فشل الحجز الجماعي. لم يتم إنشاء أي مواعيد',
    en: 'Batch booking failed. No appointments were created',
  },
  BATCH_MIXED_PATIENT: {
    ar: 'يجب أن تكون جميع الحجوزات في الدفعة لنفس المريض',
    en: 'All bookings in batch must be for the same patient',
  },
  BATCH_MIXED_SERVICE: {
    ar: 'يجب أن تكون جميع الحجوزات في الدفعة لنفس الخدمة',
    en: 'All bookings in batch must be for the same service',
  },

  // Session Removal Errors (Requirements: 13.1, 13.2, 13.3, 13.4, 13.5)
  CANNOT_REMOVE_SESSION_WITH_ACTIVE_APPOINTMENTS: {
    ar: 'لا يمكن إزالة الجلسة لأنها تحتوي على مواعيد نشطة',
    en: 'Cannot remove session because it has active appointments',
  },
  SERVICE_DELETED_CANNOT_BOOK: {
    ar: 'لا يمكن حجز مواعيد لخدمة محذوفة',
    en: 'Cannot book appointments for a deleted service',
  },

  // General Service Errors
  SERVICE_NOT_FOUND: {
    ar: 'الخدمة غير موجودة',
    en: 'Service not found',
  },
  SERVICE_INACTIVE: {
    ar: 'الخدمة غير نشطة',
    en: 'Service is inactive',
  },
};
