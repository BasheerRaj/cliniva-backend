/**
 * Department Error Messages Constants
 *
 * This file contains all bilingual error and success messages specific to
 * the Department module. All messages support both Arabic (ar) and English (en).
 *
 * @module department/constants/error-messages
 */

import { BilingualMessage } from '../../common/types/bilingual-message.type';

/**
 * Department-specific error codes.
 * These codes are used to identify specific error scenarios in the Department module.
 *
 * @constant DEPARTMENT_ERROR_CODES
 * @type {Object.<string, string>}
 *
 * @example
 * // Using in a service
 * throw new BadRequestException({
 *   message: DEPARTMENT_ERROR_MESSAGES.LINKED_TO_CLINICS,
 *   code: DEPARTMENT_ERROR_CODES.LINKED_TO_CLINICS
 * });
 */
export const DEPARTMENT_ERROR_CODES = {
  /**
   * Error code when department is linked to one or more clinics.
   * Business Rule: BZR-36
   */
  LINKED_TO_CLINICS: 'DEPARTMENT_001',

  /**
   * Error code when department has associated services.
   * Business Rule: BZR-36
   */
  HAS_SERVICES: 'DEPARTMENT_002',

  /**
   * Error code when department is not found in the database.
   */
  NOT_FOUND: 'DEPARTMENT_003',

  /**
   * Error code when department name already exists.
   */
  NAME_EXISTS: 'DEPARTMENT_004',
} as const;

/**
 * Department-specific error and success messages.
 * All messages are bilingual (Arabic & English) to support internationalization.
 *
 * @constant DEPARTMENT_ERROR_MESSAGES
 * @type {Object.<string, BilingualMessage>}
 *
 * @example
 * // Using in a service for error
 * throw new BadRequestException({
 *   message: DEPARTMENT_ERROR_MESSAGES.LINKED_TO_CLINICS,
 *   code: DEPARTMENT_ERROR_CODES.LINKED_TO_CLINICS,
 *   linkedClinics: clinicsData
 * });
 *
 * @example
 * // Using in a service for success
 * return {
 *   success: true,
 *   message: DEPARTMENT_SUCCESS_MESSAGES.DELETED
 * };
 */
export const DEPARTMENT_ERROR_MESSAGES = {
  /**
   * Error when attempting to delete a department that is linked to clinics.
   * Business Rule: BZR-36
   */
  LINKED_TO_CLINICS: {
    ar: 'لا يمكن حذف القسم لأنه مرتبط بعيادة',
    en: 'Cannot delete department because it is linked to a clinic',
  } as BilingualMessage,

  /**
   * Error when attempting to delete a department that has services.
   * Business Rule: BZR-36
   */
  HAS_SERVICES: {
    ar: 'لا يمكن حذف القسم لأنه يحتوي على خدمات',
    en: 'Cannot delete department because it has services',
  } as BilingualMessage,

  /**
   * Error when department is not found in the database.
   */
  NOT_FOUND: {
    ar: 'القسم غير موجود',
    en: 'Department not found',
  } as BilingualMessage,

  /**
   * Error when department name already exists.
   */
  NAME_EXISTS: {
    ar: 'اسم القسم موجود بالفعل',
    en: 'Department name already exists',
  } as BilingualMessage,
} as const;

/**
 * Department-specific success messages.
 * All messages are bilingual (Arabic & English) to support internationalization.
 *
 * @constant DEPARTMENT_SUCCESS_MESSAGES
 * @type {Object.<string, BilingualMessage>}
 *
 * @example
 * // Using in a service
 * return {
 *   success: true,
 *   data: department,
 *   message: DEPARTMENT_SUCCESS_MESSAGES.CREATED
 * };
 */
export const DEPARTMENT_SUCCESS_MESSAGES = {
  /**
   * Success message when department is created.
   */
  CREATED: {
    ar: 'تم إنشاء القسم بنجاح',
    en: 'Department created successfully',
  } as BilingualMessage,

  /**
   * Success message when department is updated.
   */
  UPDATED: {
    ar: 'تم تحديث القسم بنجاح',
    en: 'Department updated successfully',
  } as BilingualMessage,

  /**
   * Success message when department is deleted.
   */
  DELETED: {
    ar: 'تم حذف القسم بنجاح',
    en: 'Department deleted successfully',
  } as BilingualMessage,

  /**
   * Success message when department is retrieved.
   */
  RETRIEVED: {
    ar: 'تم استرجاع القسم بنجاح',
    en: 'Department retrieved successfully',
  } as BilingualMessage,

  /**
   * Success message when departments list is retrieved.
   */
  LIST_RETRIEVED: {
    ar: 'تم استرجاع قائمة الأقسام بنجاح',
    en: 'Departments list retrieved successfully',
  } as BilingualMessage,
} as const;

/**
 * Helper function to create dynamic bilingual messages for department operations.
 * Replaces placeholders in the format {paramName} with actual values.
 *
 * @function createDepartmentMessage
 * @param {string} arTemplate - Arabic message template with {placeholders}
 * @param {string} enTemplate - English message template with {placeholders}
 * @param {Record<string, string | number>} params - Object containing parameter values
 * @returns {BilingualMessage} Bilingual message with substituted values
 *
 * @example
 * const message = createDepartmentMessage(
 *   'لا يمكن حذف القسم لأنه مرتبط بـ {count} عيادات',
 *   'Cannot delete department because it is linked to {count} clinics',
 *   { count: 3 }
 * );
 * // Result: { ar: 'لا يمكن حذف القسم لأنه مرتبط بـ 3 عيادات', en: 'Cannot delete department because it is linked to 3 clinics' }
 *
 * @example
 * const message = createDepartmentMessage(
 *   'لا يمكن حذف القسم لأنه مرتبط بـ {clinicCount} عيادات و {serviceCount} خدمات',
 *   'Cannot delete department because it is linked to {clinicCount} clinics and {serviceCount} services',
 *   { clinicCount: 3, serviceCount: 5 }
 * );
 */
export const createDepartmentMessage = (
  arTemplate: string,
  enTemplate: string,
  params: Record<string, string | number>,
): BilingualMessage => {
  let ar = arTemplate;
  let en = enTemplate;

  // Replace all placeholders with actual values
  Object.entries(params).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    ar = ar.replace(new RegExp(placeholder, 'g'), String(value));
    en = en.replace(new RegExp(placeholder, 'g'), String(value));
  });

  return { ar, en };
};

/**
 * Helper function to build dynamic reason messages for can-delete endpoint.
 * Generates appropriate bilingual messages based on linkage type.
 *
 * @function buildCannotDeleteReason
 * @param {number} clinicCount - Number of linked clinics
 * @param {number} serviceCount - Number of linked services
 * @returns {BilingualMessage} Bilingual reason message
 *
 * @example
 * const reason = buildCannotDeleteReason(3, 0);
 * // Result: { ar: 'لا يمكن حذف القسم لأنه مرتبط بـ 3 عيادات', en: 'Cannot delete department because it is linked to 3 clinics' }
 *
 * @example
 * const reason = buildCannotDeleteReason(0, 5);
 * // Result: { ar: 'لا يمكن حذف القسم لأنه يحتوي على 5 خدمات', en: 'Cannot delete department because it has 5 services' }
 *
 * @example
 * const reason = buildCannotDeleteReason(3, 5);
 * // Result: { ar: 'لا يمكن حذف القسم لأنه مرتبط بـ 3 عيادات و 5 خدمات', en: 'Cannot delete department because it is linked to 3 clinics and 5 services' }
 */
export const buildCannotDeleteReason = (
  clinicCount: number,
  serviceCount: number,
): BilingualMessage => {
  const hasClinics = clinicCount > 0;
  const hasServices = serviceCount > 0;

  if (hasClinics && hasServices) {
    return createDepartmentMessage(
      'لا يمكن حذف القسم لأنه مرتبط بـ {clinicCount} عيادات و {serviceCount} خدمات',
      'Cannot delete department because it is linked to {clinicCount} clinics and {serviceCount} services',
      { clinicCount, serviceCount },
    );
  } else if (hasClinics) {
    return createDepartmentMessage(
      'لا يمكن حذف القسم لأنه مرتبط بـ {clinicCount} عيادات',
      'Cannot delete department because it is linked to {clinicCount} clinics',
      { clinicCount },
    );
  } else if (hasServices) {
    return createDepartmentMessage(
      'لا يمكن حذف القسم لأنه يحتوي على {serviceCount} خدمات',
      'Cannot delete department because it has {serviceCount} services',
      { serviceCount },
    );
  }

  // Should not reach here, but return a generic message
  return {
    ar: 'لا يمكن حذف القسم',
    en: 'Cannot delete department',
  };
};

/**
 * Helper function to build recommendations for can-delete endpoint.
 * Generates appropriate bilingual recommendations based on linkage type.
 *
 * @function buildDeletionRecommendations
 * @param {number} clinicCount - Number of linked clinics
 * @param {number} serviceCount - Number of linked services
 * @returns {BilingualMessage} Bilingual recommendations message
 *
 * @example
 * const recommendations = buildDeletionRecommendations(3, 0);
 * // Result: { ar: 'يرجى إزالة القسم من جميع العيادات المرتبطة قبل الحذف', en: 'Please remove the department from all linked clinics before deletion' }
 *
 * @example
 * const recommendations = buildDeletionRecommendations(0, 5);
 * // Result: { ar: 'يرجى حذف أو نقل جميع الخدمات المرتبطة قبل حذف القسم', en: 'Please delete or move all linked services before deleting the department' }
 *
 * @example
 * const recommendations = buildDeletionRecommendations(3, 5);
 * // Result: { ar: 'يرجى إزالة القسم من جميع العيادات والخدمات المرتبطة قبل الحذف', en: 'Please remove the department from all linked clinics and services before deletion' }
 */
export const buildDeletionRecommendations = (
  clinicCount: number,
  serviceCount: number,
): BilingualMessage => {
  const hasClinics = clinicCount > 0;
  const hasServices = serviceCount > 0;

  if (hasClinics && hasServices) {
    return {
      ar: 'يرجى إزالة القسم من جميع العيادات والخدمات المرتبطة قبل الحذف',
      en: 'Please remove the department from all linked clinics and services before deletion',
    };
  } else if (hasClinics) {
    return {
      ar: 'يرجى إزالة القسم من جميع العيادات المرتبطة قبل الحذف',
      en: 'Please remove the department from all linked clinics before deletion',
    };
  } else if (hasServices) {
    return {
      ar: 'يرجى حذف أو نقل جميع الخدمات المرتبطة قبل حذف القسم',
      en: 'Please delete or move all linked services before deleting the department',
    };
  }

  // Should not reach here, but return a generic message
  return {
    ar: 'يرجى التحقق من الارتباطات قبل الحذف',
    en: 'Please check linkages before deletion',
  };
};
