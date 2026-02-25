/**
 * Appointment Utilities Index
 *
 * Central export point for all appointment utility functions.
 *
 * @module appointment/utils
 */

// Time conversion utilities
export {
  timeToMinutes,
  minutesToTime,
  calculateEndTime,
} from './time-utils';

// Bilingual message generation
export {
  generateBilingualMessage,
  interpolateMessage,
} from './message-generator';

// Response formatters
export {
  formatAppointmentResponse,
  formatAppointmentListResponse,
  formatCalendarResponse,
  formatAvailabilityResponse,
  formatErrorResponse,
  createPaginationMeta,
} from './response-formatters';
