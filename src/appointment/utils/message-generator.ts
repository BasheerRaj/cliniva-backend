/**
 * Bilingual Message Generator
 *
 * This module provides utilities for generating bilingual messages (Arabic & English)
 * with parameter interpolation for the Appointment module.
 *
 * @module appointment/utils/message-generator
 */

import { BilingualMessage } from '../../common/types/bilingual-message.type';
import { createDynamicMessage } from '../../common/utils/error-messages.constant';

/**
 * Generate a bilingual message with parameter substitution.
 * This is a convenience wrapper around the common createDynamicMessage utility
 * specifically for appointment-related messages.
 *
 * @param {string} arTemplate - Arabic message template with {placeholders}
 * @param {string} enTemplate - English message template with {placeholders}
 * @param {Record<string, string | number>} [params] - Optional parameters for interpolation
 * @returns {BilingualMessage} Bilingual message with substituted values
 *
 * @example
 * // Simple message without parameters
 * const message = generateBilingualMessage(
 *   'تم إنشاء الموعد بنجاح',
 *   'Appointment created successfully'
 * );
 *
 * @example
 * // Message with single parameter
 * const message = generateBilingualMessage(
 *   'الموعد في {date}',
 *   'Appointment on {date}',
 *   { date: '2024-01-15' }
 * );
 *
 * @example
 * // Message with multiple parameters
 * const message = generateBilingualMessage(
 *   'الموعد مع الدكتور {doctorName} في {time}',
 *   'Appointment with Dr. {doctorName} at {time}',
 *   { doctorName: 'Ahmed', time: '10:00' }
 * );
 *
 * @example
 * // Message with numeric parameters
 * const message = generateBilingualMessage(
 *   'تم العثور على {count} موعد',
 *   'Found {count} appointments',
 *   { count: 5 }
 * );
 */
export function generateBilingualMessage(
  arTemplate: string,
  enTemplate: string,
  params?: Record<string, string | number>,
): BilingualMessage {
  // If no parameters provided, return the templates as-is
  if (!params || Object.keys(params).length === 0) {
    return {
      ar: arTemplate,
      en: enTemplate,
    };
  }

  // Convert all parameter values to strings for interpolation
  const stringParams: Record<string, string> = {};
  Object.entries(params).forEach(([key, value]) => {
    stringParams[key] = String(value);
  });

  // Use the common utility for parameter substitution
  return createDynamicMessage(arTemplate, enTemplate, stringParams);
}

/**
 * Create a bilingual message from a template object with parameters.
 * This is useful when you have a predefined message template and want to
 * fill in the parameters.
 *
 * @param {BilingualMessage} template - Message template with placeholders
 * @param {Record<string, string | number>} [params] - Optional parameters for interpolation
 * @returns {BilingualMessage} Bilingual message with substituted values
 *
 * @example
 * const template = {
 *   ar: 'الموعد في {date} الساعة {time}',
 *   en: 'Appointment on {date} at {time}'
 * };
 * const message = interpolateMessage(template, {
 *   date: '2024-01-15',
 *   time: '10:00'
 * });
 */
export function interpolateMessage(
  template: BilingualMessage,
  params?: Record<string, string | number>,
): BilingualMessage {
  return generateBilingualMessage(template.ar, template.en, params);
}
