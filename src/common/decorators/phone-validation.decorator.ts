import { applyDecorators } from '@nestjs/common';
import { IsOptional, IsString, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Custom decorator for phone number validation
 * Enforces E.164 international phone number format with country code
 *
 * Format: +[country code][number]
 * Example: +966501234567 (Saudi Arabia)
 *
 * Rules:
 * - Must start with '+'
 * - Country code: 1-3 digits (1-9, no leading zeros)
 * - Total length: 8-15 digits after '+'
 *
 * @param required - If true, field is required. If false, field is optional.
 * @param description - Custom description for API documentation
 * @param example - Example phone number for API documentation
 */
export function IsPhoneNumberWithCountryCode(
  required: boolean = false,
  description?: string,
  example: string = '+966501234567',
) {
  const decorators = [
    ApiPropertyOptional({
      description:
        description || 'Phone number with country code (E.164 format)',
      example,
      type: String,
      pattern: '^\\+[1-9]\\d{1,14}$',
    }),
    IsString({
      message: JSON.stringify({
        ar: 'رقم الهاتف يجب أن يكون نصاً',
        en: 'Phone number must be a string',
      }),
    }),
    Matches(/^\+[1-9]\d{7,14}$/, {
      message: JSON.stringify({
        ar: 'رقم الهاتف يجب أن يبدأ برمز الدولة ويحتوي على 8-15 رقماً (مثال: +966501234567)',
        en: 'Phone number must include country code and contain 8-15 digits (e.g., +966501234567)',
      }),
    }),
  ];

  if (!required) {
    decorators.unshift(IsOptional());
  }

  return applyDecorators(...decorators);
}
