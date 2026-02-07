import { HttpException, HttpStatus } from '@nestjs/common';
import { BilingualMessage } from '../interfaces';

/**
 * Onboarding Exception
 * 
 * Custom exception class for onboarding-related errors.
 * Provides consistent error structure with bilingual messages.
 * 
 * All onboarding errors follow this format:
 * - success: false
 * - error: { code, message (bilingual), details, timestamp }
 * 
 * Requirements: US-6.1, US-6.2
 */
export class OnboardingException extends HttpException {
  constructor(
    errorConstant: { code: string; message: BilingualMessage },
    details?: any,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    const response = {
      success: false,
      error: {
        code: errorConstant.code,
        message: errorConstant.message,
        details: details || undefined,
        timestamp: new Date().toISOString(),
      },
    };

    super(response, statusCode);
  }

  /**
   * Create exception with NOT_FOUND status
   */
  static notFound(
    errorConstant: { code: string; message: BilingualMessage },
    details?: any,
  ): OnboardingException {
    return new OnboardingException(errorConstant, details, HttpStatus.NOT_FOUND);
  }

  /**
   * Create exception with FORBIDDEN status
   */
  static forbidden(
    errorConstant: { code: string; message: BilingualMessage },
    details?: any,
  ): OnboardingException {
    return new OnboardingException(errorConstant, details, HttpStatus.FORBIDDEN);
  }

  /**
   * Create exception with CONFLICT status
   */
  static conflict(
    errorConstant: { code: string; message: BilingualMessage },
    details?: any,
  ): OnboardingException {
    return new OnboardingException(errorConstant, details, HttpStatus.CONFLICT);
  }

  /**
   * Create exception with UNPROCESSABLE_ENTITY status
   */
  static unprocessable(
    errorConstant: { code: string; message: BilingualMessage },
    details?: any,
  ): OnboardingException {
    return new OnboardingException(
      errorConstant,
      details,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
