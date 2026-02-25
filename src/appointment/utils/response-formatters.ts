/**
 * Response Formatters
 *
 * This module provides utilities for formatting appointment responses with
 * bilingual messages and consistent structure.
 *
 * @module appointment/utils/response-formatters
 */

import { BilingualMessage } from '../../common/types/bilingual-message.type';
import { ResponseBuilder } from '../../common/utils/response-builder.util';
import {
  AppointmentResponseDto,
  AppointmentDataDto,
} from '../dto/responses/appointment-response.dto';
import {
  AppointmentListResponseDto,
  PaginationMeta,
} from '../dto/responses/appointment-list-response.dto';
import {
  CalendarResponseDto,
  CalendarData,
} from '../dto/responses/calendar-response.dto';

/**
 * Format a single appointment response with bilingual message.
 *
 * @param {AppointmentDataDto} appointment - The appointment data
 * @param {BilingualMessage} message - Bilingual success message
 * @returns {AppointmentResponseDto} Formatted appointment response
 *
 * @example
 * const response = formatAppointmentResponse(appointment, {
 *   ar: 'تم إنشاء الموعد بنجاح',
 *   en: 'Appointment created successfully'
 * });
 */
export function formatAppointmentResponse(
  appointment: AppointmentDataDto,
  message: BilingualMessage,
): AppointmentResponseDto {
  return {
    success: true,
    data: appointment,
    message,
  };
}

/**
 * Format an appointment list response with pagination and bilingual message.
 *
 * @param {AppointmentDataDto[]} appointments - Array of appointment data
 * @param {number} page - Current page number (1-indexed)
 * @param {number} limit - Number of items per page
 * @param {number} total - Total number of items
 * @param {BilingualMessage} message - Bilingual success message
 * @returns {AppointmentListResponseDto} Formatted appointment list response
 *
 * @example
 * const response = formatAppointmentListResponse(
 *   appointments,
 *   1,
 *   20,
 *   150,
 *   {
 *     ar: 'تم جلب المواعيد بنجاح',
 *     en: 'Appointments fetched successfully'
 *   }
 * );
 */
export function formatAppointmentListResponse(
  appointments: AppointmentDataDto[],
  page: number,
  limit: number,
  total: number,
  message: BilingualMessage,
): AppointmentListResponseDto {
  const totalPages = Math.ceil(total / limit);
  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  const meta: PaginationMeta = {
    page,
    limit,
    total,
    totalPages,
    hasPrevious,
    hasNext,
  };

  return {
    success: true,
    data: appointments,
    meta,
    message,
  };
}

/**
 * Format a calendar response with bilingual message.
 *
 * @param {CalendarData} calendarData - The calendar data with appointments grouped by date
 * @param {BilingualMessage} message - Bilingual success message
 * @returns {CalendarResponseDto} Formatted calendar response
 *
 * @example
 * const response = formatCalendarResponse(calendarData, {
 *   ar: 'تم جلب التقويم بنجاح',
 *   en: 'Calendar fetched successfully'
 * });
 */
export function formatCalendarResponse(
  calendarData: CalendarData,
  message: BilingualMessage,
): CalendarResponseDto {
  return {
    success: true,
    data: calendarData,
    message,
  };
}

/**
 * Format an availability response with time slots and bilingual message.
 * This is a generic formatter that can be used for availability endpoints.
 *
 * @param {T} availabilityData - The availability data (time slots, etc.)
 * @param {BilingualMessage} message - Bilingual success message
 * @returns {Object} Formatted availability response
 *
 * @example
 * const response = formatAvailabilityResponse(
 *   { slots: [...], date: '2024-03-15' },
 *   {
 *     ar: 'تم جلب الأوقات المتاحة بنجاح',
 *     en: 'Available slots fetched successfully'
 *   }
 * );
 */
export function formatAvailabilityResponse<T>(
  availabilityData: T,
  message: BilingualMessage,
): {
  success: boolean;
  data: T;
  message: BilingualMessage;
} {
  return {
    success: true,
    data: availabilityData,
    message,
  };
}

/**
 * Format an error response with bilingual message.
 * This is a convenience wrapper around ResponseBuilder.error for appointment-specific errors.
 *
 * @param {string} code - Error code for programmatic handling
 * @param {BilingualMessage} message - Bilingual error message
 * @param {any} [details] - Optional additional error details
 * @returns {Object} Formatted error response
 *
 * @example
 * const response = formatErrorResponse('APPOINTMENT_NOT_FOUND', {
 *   ar: 'الموعد غير موجود',
 *   en: 'Appointment not found'
 * });
 */
export function formatErrorResponse(
  code: string,
  message: BilingualMessage,
  details?: any,
): {
  success: boolean;
  error: {
    code: string;
    message: BilingualMessage;
    details?: any;
  };
} {
  return ResponseBuilder.error(code, message, details) as any;
}

/**
 * Create pagination metadata object.
 * This is a helper function for creating pagination metadata separately.
 *
 * @param {number} page - Current page number (1-indexed)
 * @param {number} limit - Number of items per page
 * @param {number} total - Total number of items
 * @returns {PaginationMeta} Pagination metadata
 *
 * @example
 * const meta = createPaginationMeta(1, 20, 150);
 * // Returns: { page: 1, limit: 20, total: 150, totalPages: 8, hasPrevious: false, hasNext: true }
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  return {
    page,
    limit,
    total,
    totalPages,
    hasPrevious,
    hasNext,
  };
}
