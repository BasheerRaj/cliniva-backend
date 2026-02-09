import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Custom exception filter to handle validation errors with bilingual messages.
 * 
 * This filter intercepts BadRequestException thrown by class-validator and
 * parses JSON-stringified bilingual messages from DTO decorators.
 * 
 * @example
 * // In DTO:
 * @IsEmail({}, {
 *   message: JSON.stringify({
 *     ar: 'البريد الإلكتروني غير صالح',
 *     en: 'Invalid email address'
 *   })
 * })
 * 
 * // Filter converts to:
 * {
 *   success: false,
 *   error: {
 *     code: 'VALIDATION_ERROR',
 *     message: {
 *       ar: 'البريد الإلكتروني غير صالح',
 *       en: 'Invalid email address'
 *     }
 *   }
 * }
 */
@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse: any = exception.getResponse();

    // Check if this is a validation error from class-validator
    if (
      exceptionResponse.message &&
      Array.isArray(exceptionResponse.message)
    ) {
      // Parse bilingual messages from validation errors
      const errors = exceptionResponse.message.map((msg: string) => {
        try {
          // Try to parse as JSON (bilingual message)
          const parsed = JSON.parse(msg);
          if (parsed.ar && parsed.en) {
            return parsed;
          }
          // If not bilingual, return as-is
          return { ar: msg, en: msg };
        } catch {
          // If parsing fails, return as-is
          return { ar: msg, en: msg };
        }
      });

      // Return first error (or combine multiple errors)
      const firstError = errors[0];

      return response.status(status).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: firstError,
          details: errors.length > 1 ? errors : undefined,
        },
      });
    }

    // Check if this is a custom exception with bilingual message
    if (exceptionResponse.message && typeof exceptionResponse.message === 'object') {
      return response.status(status).json({
        success: false,
        error: {
          code: exceptionResponse.code || 'BAD_REQUEST',
          message: exceptionResponse.message,
          details: exceptionResponse.details,
        },
      });
    }

    // Default error response
    return response.status(status).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: {
          ar: exceptionResponse.message || 'حدث خطأ في الطلب',
          en: exceptionResponse.message || 'Bad request',
        },
      },
    });
  }
}
