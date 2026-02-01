/**
 * Response Builder Utility
 * 
 * This utility class provides standardized methods for building API responses
 * across the Cliniva application. It ensures consistent response formats for
 * success, error, and paginated responses with bilingual message support.
 * 
 * @module common/utils/response-builder
 */

import {
  BilingualMessage,
  ApiResponse,
  PaginatedResponse,
} from '../types/bilingual-message.type';

/**
 * Utility class for building standardized API responses.
 * Provides static methods for creating success, error, and paginated responses.
 * 
 * @class ResponseBuilder
 * 
 * @example
 * // Success response
 * return ResponseBuilder.success(user, {
 *   ar: 'تم إنشاء المستخدم بنجاح',
 *   en: 'User created successfully'
 * });
 * 
 * @example
 * // Paginated response
 * return ResponseBuilder.paginated(users, 1, 10, 100);
 * 
 * @example
 * // Error response
 * return ResponseBuilder.error('USER_NOT_FOUND', {
 *   ar: 'المستخدم غير موجود',
 *   en: 'User not found'
 * });
 */
export class ResponseBuilder {
  /**
   * Build a success response with optional data and message.
   * 
   * @template T - The type of data being returned
   * @param {T} data - The response data
   * @param {BilingualMessage} [message] - Optional success message in Arabic and English
   * @returns {ApiResponse<T>} Standardized success response
   * 
   * @example
   * const user = { id: '123', name: 'John Doe' };
   * return ResponseBuilder.success(user, {
   *   ar: 'تم تحديث المستخدم بنجاح',
   *   en: 'User updated successfully'
   * });
   * 
   * @example
   * // Without message
   * return ResponseBuilder.success({ count: 5 });
   */
  static success<T>(data: T, message?: BilingualMessage): ApiResponse<T> {
    return {
      success: true,
      data,
      ...(message && { message }),
    };
  }

  /**
   * Build a paginated response with data and pagination metadata.
   * Automatically calculates total pages based on total items and limit.
   * 
   * @template T - The type of items in the data array
   * @param {T[]} data - Array of items for the current page
   * @param {number} page - Current page number (1-indexed)
   * @param {number} limit - Number of items per page
   * @param {number} total - Total number of items across all pages
   * @param {BilingualMessage} [message] - Optional success message
   * @returns {PaginatedResponse<T>} Standardized paginated response
   * 
   * @example
   * const users = [{ id: '1', name: 'User 1' }, { id: '2', name: 'User 2' }];
   * return ResponseBuilder.paginated(users, 1, 10, 25, {
   *   ar: 'تم جلب المستخدمين بنجاح',
   *   en: 'Users fetched successfully'
   * });
   * 
   * @example
   * // Without message
   * return ResponseBuilder.paginated(clinics, 2, 20, 45);
   */
  static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
    message?: BilingualMessage,
  ): PaginatedResponse<T> {
    return {
      success: true,
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      ...(message && { message }),
    };
  }

  /**
   * Build an error response with error code, message, and optional details.
   * 
   * @param {string} code - Error code for programmatic handling (e.g., 'USER_NOT_FOUND')
   * @param {BilingualMessage} message - Bilingual error message
   * @param {any} [details] - Optional additional error details
   * @returns {ApiResponse} Standardized error response
   * 
   * @example
   * return ResponseBuilder.error('INVALID_CREDENTIALS', {
   *   ar: 'بيانات الاعتماد غير صالحة',
   *   en: 'Invalid credentials'
   * }, { attemptCount: 3 });
   * 
   * @example
   * // Without details
   * return ResponseBuilder.error('FORBIDDEN', {
   *   ar: 'غير مصرح لك بالوصول',
   *   en: 'Access forbidden'
   * });
   */
  static error(
    code: string,
    message: BilingualMessage,
    details?: any,
  ): ApiResponse {
    return {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
    };
  }
}
