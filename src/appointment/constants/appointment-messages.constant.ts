/**
 * Appointment Error and Success Messages
 *
 * This file contains all bilingual error and success messages specific to
 * the Appointment module. All messages support both Arabic (ar) and English (en).
 *
 * @module appointment/constants/appointment-messages
 */

import { BilingualMessage } from '../../common/types/bilingual-message.type';

/**
 * Appointment-specific error and success messages.
 * All messages are bilingual (Arabic & English) to support internationalization.
 *
 * @constant APPOINTMENT_MESSAGES
 * @type {Object.<string, BilingualMessage>}
 */
export const APPOINTMENT_MESSAGES = {
  // ============================================================================
  // Validation Error Messages
  // ============================================================================

  /**
   * Error when appointment date is in the past.
   * Requirement: 1.10
   */
  APPOINTMENT_DATE_IN_PAST: {
    ar: 'لا يمكن إنشاء موعد في تاريخ سابق',
    en: 'Cannot create appointment in the past',
  } as BilingualMessage,

  /**
   * Error when appointment time is invalid format.
   */
  INVALID_APPOINTMENT_TIME: {
    ar: 'وقت الموعد غير صالح',
    en: 'Invalid appointment time',
  } as BilingualMessage,

  /**
   * Error when appointment duration is invalid.
   */
  INVALID_DURATION: {
    ar: 'مدة الموعد غير صالحة',
    en: 'Invalid appointment duration',
  } as BilingualMessage,

  /**
   * Error when required field is missing.
   */
  REQUIRED_FIELD_MISSING: {
    ar: 'الحقل {field} مطلوب',
    en: 'Field {field} is required',
  } as BilingualMessage,

  // ============================================================================
  // Entity Not Found Errors
  // ============================================================================

  /**
   * Error when appointment is not found.
   */
  APPOINTMENT_NOT_FOUND: {
    ar: 'الموعد غير موجود',
    en: 'Appointment not found',
  } as BilingualMessage,

  /**
   * Error when patient is not found or inactive.
   * Requirement: 1.1
   */
  PATIENT_NOT_FOUND_OR_INACTIVE: {
    ar: 'المريض غير موجود أو غير نشط',
    en: 'Patient not found or inactive',
  } as BilingualMessage,

  /**
   * Error when doctor is not found or inactive.
   * Requirement: 1.2
   */
  DOCTOR_NOT_FOUND_OR_INACTIVE: {
    ar: 'الطبيب غير موجود أو غير نشط',
    en: 'Doctor not found or inactive',
  } as BilingualMessage,

  /**
   * Error when service is not found or inactive.
   * Requirement: 1.3
   */
  SERVICE_NOT_FOUND_OR_INACTIVE: {
    ar: 'الخدمة غير موجودة أو غير نشطة',
    en: 'Service not found or inactive',
  } as BilingualMessage,

  /**
   * Error when clinic is not found or inactive.
   * Requirement: 1.4
   */
  CLINIC_NOT_FOUND_OR_INACTIVE: {
    ar: 'العيادة غير موجودة أو غير نشطة',
    en: 'Clinic not found or inactive',
  } as BilingualMessage,

  /**
   * Error when department is not found.
   * Requirement: 1.5
   */
  DEPARTMENT_NOT_FOUND: {
    ar: 'القسم غير موجود',
    en: 'Department not found',
  } as BilingualMessage,

  // ============================================================================
  // Business Rule Errors
  // ============================================================================

  /**
   * Error when service is not provided by the clinic.
   * Requirement: 1.6
   */
  SERVICE_NOT_PROVIDED_BY_CLINIC: {
    ar: 'الخدمة غير متوفرة في هذه العيادة',
    en: 'Service is not provided by this clinic',
  } as BilingualMessage,

  /**
   * Error when doctor is not authorized for the service.
   * Requirement: 1.7
   */
  DOCTOR_NOT_AUTHORIZED_FOR_SERVICE: {
    ar: 'الطبيب غير مصرح له بتقديم هذه الخدمة',
    en: 'Doctor is not authorized to provide this service',
  } as BilingualMessage,

  /**
   * Error when appointment is outside clinic working hours.
   * Requirement: 2.1, 2.4
   */
  OUTSIDE_CLINIC_WORKING_HOURS: {
    ar: 'الموعد خارج ساعات عمل العيادة ({openingTime} - {closingTime})',
    en: 'Appointment is outside clinic working hours ({openingTime} - {closingTime})',
  } as BilingualMessage,

  /**
   * Error when appointment is outside doctor working hours.
   * Requirement: 2.2, 2.5
   */
  OUTSIDE_DOCTOR_WORKING_HOURS: {
    ar: 'الموعد خارج ساعات عمل الطبيب ({openingTime} - {closingTime})',
    en: 'Appointment is outside doctor working hours ({openingTime} - {closingTime})',
  } as BilingualMessage,

  /**
   * Error when appointment end time exceeds working hours.
   * Requirement: 2.3
   */
  APPOINTMENT_END_TIME_EXCEEDS_HOURS: {
    ar: 'وقت انتهاء الموعد ({endTime}) يتجاوز ساعات العمل',
    en: 'Appointment end time ({endTime}) exceeds working hours',
  } as BilingualMessage,

  /**
   * Error when doctor has conflicting appointment.
   * Requirement: 3.1, 3.4
   */
  DOCTOR_CONFLICT: {
    ar: 'الطبيب لديه موعد آخر في هذا الوقت',
    en: 'Doctor has another appointment at this time',
  } as BilingualMessage,

  /**
   * Error when doctor has conflicting appointment with details.
   * Requirement: 3.5
   */
  DOCTOR_CONFLICT_WITH_DETAILS: {
    ar: 'الطبيب لديه موعد آخر من {startTime} إلى {endTime}',
    en: 'Doctor has another appointment from {startTime} to {endTime}',
  } as BilingualMessage,

  /**
   * Error when facility is closed or doctor unavailable.
   */
  FACILITY_CLOSED_OR_UNAVAILABLE: {
    ar: 'المرفق مغلق أو الطبيب غير متاح في هذا التاريخ',
    en: 'Facility is closed or doctor is unavailable on this date',
  } as BilingualMessage,

  /**
   * Error when appointment overlaps with break time.
   */
  APPOINTMENT_OVERLAPS_BREAK: {
    ar: 'الموعد يتعارض مع وقت استراحة الطبيب',
    en: 'Appointment overlaps with doctor break time',
  } as BilingualMessage,

  // ============================================================================
  // Status Transition Errors
  // ============================================================================

  /**
   * Error when invalid status transition is attempted.
   * Requirement: 6.12
   */
  INVALID_STATUS_TRANSITION: {
    ar: 'لا يمكن تغيير حالة الموعد من {currentStatus} إلى {newStatus}',
    en: 'Cannot change appointment status from {currentStatus} to {newStatus}',
  } as BilingualMessage,

  /**
   * Error when trying to cancel completed appointment.
   * Requirement: 6.4, 10.7
   */
  CANNOT_CANCEL_COMPLETED: {
    ar: 'لا يمكن إلغاء موعد مكتمل',
    en: 'Cannot cancel completed appointment',
  } as BilingualMessage,

  /**
   * Error when trying to cancel in-progress appointment.
   * Requirement: 6.4
   */
  CANNOT_CANCEL_IN_PROGRESS: {
    ar: 'لا يمكن إلغاء موعد قيد التنفيذ',
    en: 'Cannot cancel in-progress appointment',
  } as BilingualMessage,

  /**
   * Error when trying to start completed appointment.
   * Requirement: 7.5
   */
  CANNOT_START_COMPLETED: {
    ar: 'لا يمكن بدء موعد مكتمل',
    en: 'Cannot start completed appointment',
  } as BilingualMessage,

  /**
   * Error when trying to start cancelled appointment.
   * Requirement: 7.5
   */
  CANNOT_START_CANCELLED: {
    ar: 'لا يمكن بدء موعد ملغي',
    en: 'Cannot start cancelled appointment',
  } as BilingualMessage,

  /**
   * Error when trying to complete appointment not in progress.
   * Requirement: 8.1, 8.10
   */
  CANNOT_COMPLETE_NOT_IN_PROGRESS: {
    ar: 'يمكن إكمال المواعيد قيد التنفيذ فقط',
    en: 'Only in-progress appointments can be completed',
  } as BilingualMessage,

  /**
   * Error when trying to update completed appointment.
   * Requirement: 9.1, 9.8
   */
  CANNOT_UPDATE_COMPLETED: {
    ar: 'لا يمكن تحديث موعد مكتمل',
    en: 'Cannot update completed appointment',
  } as BilingualMessage,

  /**
   * Error when trying to reschedule completed appointment.
   * Requirement: 11.1, 11.9
   */
  CANNOT_RESCHEDULE_COMPLETED: {
    ar: 'لا يمكن إعادة جدولة موعد مكتمل',
    en: 'Cannot reschedule completed appointment',
  } as BilingualMessage,

  /**
   * Error when trying to delete in-progress appointment.
   * Requirement: 13.8
   */
  CANNOT_DELETE_IN_PROGRESS: {
    ar: 'لا يمكن حذف موعد قيد التنفيذ',
    en: 'Cannot delete in-progress appointment',
  } as BilingualMessage,

  /**
   * Error when trying to delete completed appointment.
   * Requirement: 13.8
   */
  CANNOT_DELETE_COMPLETED: {
    ar: 'لا يمكن حذف موعد مكتمل',
    en: 'Cannot delete completed appointment',
  } as BilingualMessage,

  // ============================================================================
  // Required Field Errors
  // ============================================================================

  /**
   * Error when completion notes are required.
   * Requirement: 6.2, 8.2
   */
  COMPLETION_NOTES_REQUIRED: {
    ar: 'ملاحظات الإكمال مطلوبة',
    en: 'Completion notes are required',
  } as BilingualMessage,

  /**
   * Error when cancellation reason is required.
   * Requirement: 6.3, 10.1
   */
  CANCELLATION_REASON_REQUIRED: {
    ar: 'سبب الإلغاء مطلوب',
    en: 'Cancellation reason is required',
  } as BilingualMessage,

  /**
   * Error when new date and time are required for rescheduling.
   * Requirement: 11.2
   */
  NEW_DATE_TIME_REQUIRED: {
    ar: 'التاريخ والوقت الجديد مطلوبان لإعادة الجدولة',
    en: 'New date and time are required for rescheduling',
  } as BilingualMessage,

  /**
   * Error when doctor notes are required.
   * Requirement: 8.2
   */
  DOCTOR_NOTES_REQUIRED: {
    ar: 'ملاحظات الطبيب مطلوبة',
    en: 'Doctor notes are required',
  } as BilingualMessage,

  // ============================================================================
  // Authorization Errors
  // ============================================================================

  /**
   * Error when user is not authorized to perform action.
   * Requirement: 1.12
   */
  UNAUTHORIZED_ACTION: {
    ar: 'غير مصرح لك بتنفيذ هذا الإجراء',
    en: 'You are not authorized to perform this action',
  } as BilingualMessage,

  /**
   * Error when insufficient permissions.
   */
  INSUFFICIENT_PERMISSIONS: {
    ar: 'ليس لديك الصلاحيات الكافية',
    en: 'Insufficient permissions',
  } as BilingualMessage,

  // ============================================================================
  // Medical Record Integration Errors
  // ============================================================================

  /**
   * Error when medical report creation fails.
   * Requirement: 8.8
   */
  MEDICAL_REPORT_CREATION_FAILED: {
    ar: 'فشل إنشاء التقرير الطبي',
    en: 'Failed to create medical report',
  } as BilingualMessage,

  /**
   * Error when transaction rollback occurs.
   * Requirement: 8.7, 8.8
   */
  TRANSACTION_FAILED: {
    ar: 'فشلت العملية وتم التراجع عن التغييرات',
    en: 'Operation failed and changes were rolled back',
  } as BilingualMessage,

  // ============================================================================
  // Quick Patient Creation Errors
  // ============================================================================

  /**
   * Error when patient creation fails during booking.
   * Requirement: 14.5
   */
  PATIENT_CREATION_FAILED: {
    ar: 'فشل إنشاء المريض',
    en: 'Failed to create patient',
  } as BilingualMessage,

  /**
   * Error when patient data validation fails.
   * Requirement: 14.1
   */
  INVALID_PATIENT_DATA: {
    ar: 'بيانات المريض غير صالحة',
    en: 'Invalid patient data',
  } as BilingualMessage,

  // ============================================================================
  // Availability Errors
  // ============================================================================

  /**
   * Error when no available slots found.
   * Requirement: 12.1-12.8
   */
  NO_AVAILABLE_SLOTS: {
    ar: 'لا توجد أوقات متاحة',
    en: 'No available time slots',
  } as BilingualMessage,

  /**
   * Error when doctor is not available at requested time.
   * Requirement: 11.5
   */
  DOCTOR_NOT_AVAILABLE: {
    ar: 'الطبيب غير متاح في الوقت المطلوب',
    en: 'Doctor is not available at the requested time',
  } as BilingualMessage,

  // ============================================================================
  // Success Messages
  // ============================================================================

  /**
   * Success message when appointment is created.
   * Requirement: 1.11
   */
  APPOINTMENT_CREATED: {
    ar: 'تم إنشاء الموعد بنجاح',
    en: 'Appointment created successfully',
  } as BilingualMessage,

  /**
   * Success message when appointment is updated.
   */
  APPOINTMENT_UPDATED: {
    ar: 'تم تحديث الموعد بنجاح',
    en: 'Appointment updated successfully',
  } as BilingualMessage,

  /**
   * Success message when appointment is cancelled.
   */
  APPOINTMENT_CANCELLED: {
    ar: 'تم إلغاء الموعد بنجاح',
    en: 'Appointment cancelled successfully',
  } as BilingualMessage,

  /**
   * Success message when appointment is rescheduled.
   */
  APPOINTMENT_RESCHEDULED: {
    ar: 'تم إعادة جدولة الموعد بنجاح',
    en: 'Appointment rescheduled successfully',
  } as BilingualMessage,

  /**
   * Success message when appointment is started.
   * Requirement: 7.2
   */
  APPOINTMENT_STARTED: {
    ar: 'تم بدء الموعد بنجاح',
    en: 'Appointment started successfully',
  } as BilingualMessage,

  /**
   * Success message when appointment is completed.
   * Requirement: 8.3
   */
  APPOINTMENT_COMPLETED: {
    ar: 'تم إكمال الموعد بنجاح',
    en: 'Appointment completed successfully',
  } as BilingualMessage,

  /**
   * Success message when appointment is confirmed.
   */
  APPOINTMENT_CONFIRMED: {
    ar: 'تم تأكيد الموعد بنجاح',
    en: 'Appointment confirmed successfully',
  } as BilingualMessage,

  /**
   * Success message when appointment is deleted.
   * Requirement: 13.2
   */
  APPOINTMENT_DELETED: {
    ar: 'تم حذف الموعد بنجاح',
    en: 'Appointment deleted successfully',
  } as BilingualMessage,

  /**
   * Success message when appointment is restored.
   * Requirement: 13.7
   */
  APPOINTMENT_RESTORED: {
    ar: 'تم استعادة الموعد بنجاح',
    en: 'Appointment restored successfully',
  } as BilingualMessage,

  /**
   * Success message when patient and appointment are created.
   * Requirement: 14.7
   */
  PATIENT_AND_APPOINTMENT_CREATED: {
    ar: 'تم إنشاء المريض والموعد بنجاح',
    en: 'Patient and appointment created successfully',
  } as BilingualMessage,

  /**
   * Success message when status is updated.
   * Requirement: 6.5
   */
  STATUS_UPDATED: {
    ar: 'تم تحديث حالة الموعد بنجاح',
    en: 'Appointment status updated successfully',
  } as BilingualMessage,
};
