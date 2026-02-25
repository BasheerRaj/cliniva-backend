/**
 * Time Conversion Utilities
 *
 * This module provides centralized time conversion utilities for the Appointment module.
 * These utilities handle conversion between HH:mm time format and minutes since midnight,
 * as well as calculating end times based on start time and duration.
 *
 * @module appointment/utils/time-utils
 */

/**
 * Convert time string (HH:mm) to minutes since midnight.
 *
 * @param {string} time - Time in HH:mm format (e.g., "09:30", "14:00")
 * @returns {number} Minutes since midnight (e.g., "09:30" returns 570)
 *
 * @example
 * timeToMinutes("09:30"); // Returns 570 (9 * 60 + 30)
 * timeToMinutes("14:00"); // Returns 840 (14 * 60 + 0)
 * timeToMinutes("00:00"); // Returns 0
 * timeToMinutes("23:59"); // Returns 1439
 */
export function timeToMinutes(time: string): number {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string (HH:mm).
 *
 * @param {number} minutes - Minutes since midnight (0-1439)
 * @returns {string} Time in HH:mm format with zero-padding
 *
 * @example
 * minutesToTime(570); // Returns "09:30"
 * minutesToTime(840); // Returns "14:00"
 * minutesToTime(0);   // Returns "00:00"
 * minutesToTime(1439); // Returns "23:59"
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Calculate end time by adding duration to start time.
 *
 * @param {string} startTime - Start time in HH:mm format
 * @param {number} durationMinutes - Duration to add in minutes
 * @returns {string} End time in HH:mm format
 *
 * @example
 * calculateEndTime("09:30", 30); // Returns "10:00"
 * calculateEndTime("14:00", 45); // Returns "14:45"
 * calculateEndTime("23:30", 45); // Returns "00:15" (next day)
 */
export function calculateEndTime(
  startTime: string,
  durationMinutes: number,
): string {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = startMinutes + durationMinutes;
  // Handle overflow to next day (wrap around at 1440 minutes = 24 hours)
  const normalizedEndMinutes = endMinutes % 1440;
  return minutesToTime(normalizedEndMinutes);
}
