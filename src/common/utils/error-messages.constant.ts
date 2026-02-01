/**
 * Error Messages Constants
 * 
 * This file contains all bilingual error and success messages used throughout
 * the Cliniva application. All messages support both Arabic (ar) and English (en).
 * 
 * @module common/utils/error-messages
 */

import { BilingualMessage } from '../types/bilingual-message.type';

/**
 * Centralized error and success messages for the application.
 * All messages are bilingual (Arabic & English) to support internationalization.
 * 
 * @constant ERROR_MESSAGES
 * @type {Object.<string, BilingualMessage>}
 * 
 * @example
 * // Using in a service
 * throw new ForbiddenException({
 *   message: ERROR_MESSAGES.CANNOT_DEACTIVATE_SELF,
 *   code: 'SELF_MODIFICATION_FORBIDDEN'
 * });
 * 
 * @example
 * // Using in a response
 * return {
 *   success: true,
 *   data: user,
 *   message: ERROR_MESSAGES.USER_UPDATED
 * };
 */
export const ERROR_MESSAGES = {
  // ============================================================================
  // Self-Modification Errors
  // ============================================================================
  
  /**
   * Error when user attempts to deactivate their own account.
   * Business Rule: BZR-n0c4e9f2
   */
  CANNOT_DEACTIVATE_SELF: {
    ar: 'لا يمكنك إلغاء تفعيل حسابك الخاص',
    en: 'You cannot deactivate your own account'
  } as BilingualMessage,
  
  /**
   * Error when user attempts to delete their own account.
   * Business Rule: BZR-m3d5a8b7
   */
  CANNOT_DELETE_SELF: {
    ar: 'لا يمكنك حذف حسابك الخاص',
    en: 'You cannot delete your own account'
  } as BilingualMessage,
  
  // ============================================================================
  // Entity Not Found Errors
  // ============================================================================
  
  /**
   * Error when a user is not found in the database.
   */
  USER_NOT_FOUND: {
    ar: 'المستخدم غير موجود',
    en: 'User not found'
  } as BilingualMessage,
  
  /**
   * Error when a medical complex is not found in the database.
   */
  COMPLEX_NOT_FOUND: {
    ar: 'المجمع الطبي غير موجود',
    en: 'Medical complex not found'
  } as BilingualMessage,
  
  /**
   * Error when a clinic is not found in the database.
   */
  CLINIC_NOT_FOUND: {
    ar: 'العيادة غير موجودة',
    en: 'Clinic not found'
  } as BilingualMessage,
  
  /**
   * Error when a doctor is not found in the database.
   */
  DOCTOR_NOT_FOUND: {
    ar: 'الطبيب غير موجود',
    en: 'Doctor not found'
  } as BilingualMessage,
  
  /**
   * Error when an employee is not found in the database.
   */
  EMPLOYEE_NOT_FOUND: {
    ar: 'الموظف غير موجود',
    en: 'Employee not found'
  } as BilingualMessage,
  
  /**
   * Error when an organization is not found in the database.
   */
  ORGANIZATION_NOT_FOUND: {
    ar: 'المنظمة غير موجودة',
    en: 'Organization not found'
  } as BilingualMessage,
  
  /**
   * Error when a department is not found in the database.
   */
  DEPARTMENT_NOT_FOUND: {
    ar: 'القسم غير موجود',
    en: 'Department not found'
  } as BilingualMessage,
  
  // ============================================================================
  // Assignment Errors
  // ============================================================================
  
  /**
   * Error when attempting to assign a deactivated user to an entity.
   * Business Rule: BZR-q4f3e1b8
   */
  DEACTIVATED_USER_ASSIGNMENT: {
    ar: 'لا يمكن تعيين مستخدم غير نشط',
    en: 'Cannot assign deactivated user'
  } as BilingualMessage,
  
  /**
   * Error when employee is assigned to multiple complexes.
   * Business Rule: BZR-5e6f7a8b
   */
  SINGLE_COMPLEX_REQUIRED: {
    ar: 'يجب تعيين الموظف لمجمع واحد فقط',
    en: 'Employee must be assigned to a single complex only'
  } as BilingualMessage,
  
  /**
   * Error when clinics belong to different complexes.
   * Business Rule: BZR-5e6f7a8b
   */
  CLINICS_DIFFERENT_COMPLEXES: {
    ar: 'يجب أن تكون جميع العيادات ضمن نفس المجمع',
    en: 'All clinics must be within the same complex'
  } as BilingualMessage,
  
  /**
   * Error when complex doesn't match subscription (Plan 2).
   * Business Rule: BZR-i4c3e2f7
   */
  COMPLEX_MISMATCH: {
    ar: 'يجب أن يتطابق المجمع مع اشتراكك',
    en: 'Complex must match your subscription'
  } as BilingualMessage,
  
  /**
   * Error when clinic doesn't match subscription (Plan 3).
   * Business Rule: BZR-j8a9f0d5
   */
  CLINIC_MISMATCH: {
    ar: 'يجب أن تتطابق العيادة مع اشتراكك',
    en: 'Clinic must match your subscription'
  } as BilingualMessage,
  
  // ============================================================================
  // Appointment Transfer Errors
  // ============================================================================
  
  /**
   * Error when target doctor is not specified for appointment transfer.
   * Business Rule: BZR-q0d8a9f1
   */
  TARGET_DOCTOR_REQUIRED: {
    ar: 'يجب تحديد الطبيب المستهدف لنقل المواعيد',
    en: 'Target doctor is required for appointment transfer'
  } as BilingualMessage,
  
  /**
   * Error when target doctor is inactive.
   * Business Rule: BZR-q0d8a9f1
   */
  TARGET_DOCTOR_INACTIVE: {
    ar: 'الطبيب المستهدف غير نشط',
    en: 'Target doctor is inactive'
  } as BilingualMessage,
  
  /**
   * Error when doctor has active appointments that must be handled.
   * Business Rule: BZR-q0d8a9f1
   */
  DOCTOR_HAS_APPOINTMENTS: {
    ar: 'الطبيب لديه مواعيد نشطة. يجب نقلها أو إلغاؤها أولاً',
    en: 'Doctor has active appointments. Must transfer or cancel them first'
  } as BilingualMessage,
  
  /**
   * Error when appointment is not found.
   */
  APPOINTMENT_NOT_FOUND: {
    ar: 'الموعد غير موجود',
    en: 'Appointment not found'
  } as BilingualMessage,
  
  // ============================================================================
  // Validation Errors
  // ============================================================================
  
  /**
   * Error when ID format is invalid (not a valid MongoDB ObjectId).
   */
  INVALID_ID_FORMAT: {
    ar: 'صيغة المعرف غير صالحة',
    en: 'Invalid ID format'
  } as BilingualMessage,
  
  /**
   * Error when a required field is missing.
   */
  REQUIRED_FIELD: {
    ar: 'هذا الحقل مطلوب',
    en: 'This field is required'
  } as BilingualMessage,
  
  /**
   * Error when email format is invalid.
   */
  INVALID_EMAIL: {
    ar: 'البريد الإلكتروني غير صالح',
    en: 'Invalid email address'
  } as BilingualMessage,
  
  /**
   * Error when phone number format is invalid.
   */
  INVALID_PHONE: {
    ar: 'رقم الهاتف غير صالح',
    en: 'Invalid phone number'
  } as BilingualMessage,
  
  /**
   * Error when date format is invalid.
   */
  INVALID_DATE: {
    ar: 'التاريخ غير صالح',
    en: 'Invalid date'
  } as BilingualMessage,
  
  /**
   * Error when array is empty but should contain items.
   */
  EMPTY_ARRAY: {
    ar: 'القائمة فارغة',
    en: 'Array is empty'
  } as BilingualMessage,
  
  // ============================================================================
  // Authorization Errors
  // ============================================================================
  
  /**
   * Error when user is not authorized to perform an action.
   */
  UNAUTHORIZED: {
    ar: 'غير مصرح لك بالوصول',
    en: 'Unauthorized access'
  } as BilingualMessage,
  
  /**
   * Error when user doesn't have required permissions.
   */
  INSUFFICIENT_PERMISSIONS: {
    ar: 'ليس لديك الصلاحيات الكافية',
    en: 'Insufficient permissions'
  } as BilingualMessage,
  
  /**
   * Error when token is invalid or expired.
   */
  INVALID_TOKEN: {
    ar: 'الرمز غير صالح أو منتهي الصلاحية',
    en: 'Invalid or expired token'
  } as BilingualMessage,
  
  // ============================================================================
  // Success Messages
  // ============================================================================
  
  /**
   * Success message when user is deactivated.
   */
  USER_DEACTIVATED: {
    ar: 'تم إلغاء تفعيل المستخدم بنجاح',
    en: 'User deactivated successfully'
  } as BilingualMessage,
  
  /**
   * Success message when user is activated.
   */
  USER_ACTIVATED: {
    ar: 'تم تفعيل المستخدم بنجاح',
    en: 'User activated successfully'
  } as BilingualMessage,
  
  /**
   * Success message when appointments are transferred.
   */
  APPOINTMENTS_TRANSFERRED: {
    ar: 'تم نقل المواعيد بنجاح',
    en: 'Appointments transferred successfully'
  } as BilingualMessage,
  
  /**
   * Success message when user is updated.
   */
  USER_UPDATED: {
    ar: 'تم تحديث المستخدم بنجاح',
    en: 'User updated successfully'
  } as BilingualMessage,
  
  /**
   * Success message when user is created.
   */
  USER_CREATED: {
    ar: 'تم إنشاء المستخدم بنجاح',
    en: 'User created successfully'
  } as BilingualMessage,
  
  /**
   * Success message when user is deleted.
   */
  USER_DELETED: {
    ar: 'تم حذف المستخدم بنجاح',
    en: 'User deleted successfully'
  } as BilingualMessage,
  
  /**
   * Success message when employee is created.
   */
  EMPLOYEE_CREATED: {
    ar: 'تم إنشاء الموظف بنجاح',
    en: 'Employee created successfully'
  } as BilingualMessage,
  
  /**
   * Success message when employee is updated.
   */
  EMPLOYEE_UPDATED: {
    ar: 'تم تحديث الموظف بنجاح',
    en: 'Employee updated successfully'
  } as BilingualMessage,
  
  /**
   * Success message when employee is deleted.
   */
  EMPLOYEE_DELETED: {
    ar: 'تم حذف الموظف بنجاح',
    en: 'Employee deleted successfully'
  } as BilingualMessage,
  
  /**
   * Success message when operation completes successfully.
   */
  OPERATION_SUCCESSFUL: {
    ar: 'تمت العملية بنجاح',
    en: 'Operation completed successfully'
  } as BilingualMessage,
};

/**
 * Helper function to create dynamic bilingual messages with parameter substitution.
 * Replaces placeholders in the format {paramName} with actual values.
 * 
 * @function createDynamicMessage
 * @param {string} arTemplate - Arabic message template with {placeholders}
 * @param {string} enTemplate - English message template with {placeholders}
 * @param {Record<string, string>} params - Object containing parameter values
 * @returns {BilingualMessage} Bilingual message with substituted values
 * 
 * @example
 * const message = createDynamicMessage(
 *   'تم العثور على {count} مستخدم',
 *   'Found {count} users',
 *   { count: '5' }
 * );
 * // Result: { ar: 'تم العثور على 5 مستخدم', en: 'Found 5 users' }
 * 
 * @example
 * const message = createDynamicMessage(
 *   'المستخدم {name} غير موجود',
 *   'User {name} not found',
 *   { name: 'John Doe' }
 * );
 * // Result: { ar: 'المستخدم John Doe غير موجود', en: 'User John Doe not found' }
 */
export const createDynamicMessage = (
  arTemplate: string,
  enTemplate: string,
  params: Record<string, string>
): BilingualMessage => {
  let ar = arTemplate;
  let en = enTemplate;
  
  // Replace all placeholders with actual values
  Object.entries(params).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    ar = ar.replace(new RegExp(placeholder, 'g'), value);
    en = en.replace(new RegExp(placeholder, 'g'), value);
  });
  
  return { ar, en };
};
