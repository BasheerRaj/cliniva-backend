/**
 * Bilingual Message Type Definitions
 * 
 * This file defines the core type interfaces for bilingual support (Arabic & English)
 * and standardized API response formats used throughout the Cliniva application.
 * 
 * @module common/types/bilingual-message
 */

/**
 * Represents a message in both Arabic and English languages.
 * Used for error messages, success messages, and all user-facing text.
 * 
 * @interface BilingualMessage
 * @property {string} ar - Arabic text (supports RTL)
 * @property {string} en - English text
 * 
 * @example
 * const message: BilingualMessage = {
 *   ar: 'تمت العملية بنجاح',
 *   en: 'Operation completed successfully'
 * };
 */
export interface BilingualMessage {
  ar: string;
  en: string;
}

/**
 * Standard API response structure for all endpoints.
 * Provides consistent response format across the application.
 * 
 * @interface ApiResponse
 * @template T - The type of data being returned
 * @property {boolean} success - Indicates if the operation was successful
 * @property {T} [data] - The response data (optional, present on success)
 * @property {BilingualMessage} [message] - Success message (optional)
 * @property {Object} [error] - Error details (optional, present on failure)
 * @property {string} error.code - Error code for programmatic handling
 * @property {BilingualMessage} error.message - Bilingual error message
 * @property {any} [error.details] - Additional error details (optional)
 * 
 * @example
 * // Success response
 * const response: ApiResponse<User> = {
 *   success: true,
 *   data: { id: '123', name: 'John Doe' },
 *   message: {
 *     ar: 'تم إنشاء المستخدم بنجاح',
 *     en: 'User created successfully'
 *   }
 * };
 * 
 * @example
 * // Error response
 * const response: ApiResponse = {
 *   success: false,
 *   error: {
 *     code: 'USER_NOT_FOUND',
 *     message: {
 *       ar: 'المستخدم غير موجود',
 *       en: 'User not found'
 *     },
 *     details: { userId: '123' }
 *   }
 * };
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: BilingualMessage;
  error?: {
    code: string;
    message: BilingualMessage;
    details?: any;
  };
}

/**
 * Paginated API response structure for list endpoints.
 * Extends ApiResponse with pagination metadata.
 * 
 * @interface PaginatedResponse
 * @template T - The type of items in the data array
 * @extends {ApiResponse<T[]>}
 * @property {T[]} [data] - Array of items for the current page
 * @property {Object} [meta] - Pagination metadata (optional)
 * @property {number} meta.page - Current page number (1-indexed)
 * @property {number} meta.limit - Number of items per page
 * @property {number} meta.total - Total number of items across all pages
 * @property {number} meta.totalPages - Total number of pages
 * 
 * @example
 * const response: PaginatedResponse<User> = {
 *   success: true,
 *   data: [
 *     { id: '1', name: 'User 1' },
 *     { id: '2', name: 'User 2' }
 *   ],
 *   meta: {
 *     page: 1,
 *     limit: 10,
 *     total: 25,
 *     totalPages: 3
 *   }
 * };
 */
export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  data?: T[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
