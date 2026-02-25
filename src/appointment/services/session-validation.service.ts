import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ServiceSessionDto } from '../../service/dto/service-session.dto';
import { SESSION_ERROR_MESSAGES } from '../constants/session-error-messages.constant';

/**
 * SessionValidationService
 *
 * Validates session data structure and business rules before persisting to the database.
 * This is a pure logic service with no database dependency.
 *
 * Requirements: 1.4, 1.5, 2.3, 6.1, 6.2, 6.3
 */
@Injectable()
export class SessionValidationService {
  private readonly logger = new Logger(SessionValidationService.name);

  /**
   * Validates the full session array structure:
   *  - Max 50 sessions (Req 1.4)
   *  - Each session name is non-empty when provided (Req 6.1)
   *  - Each session order is a positive integer (Req 6.2)
   *  - Each session duration is within range when provided (Req 2.3)
   *  - Order numbers are unique across the array (Req 1.5, 6.3)
   *
   * Requirements: 6.1, 6.2, 6.3
   */
  validateSessionStructure(sessions: ServiceSessionDto[]): void {
    this.logger.debug(`Validating session structure for ${sessions.length} sessions`);

    // 1. Guard against exceeding the maximum allowed count first
    this.validateMaxSessionCount(sessions);

    // 2. Validate each session individually
    for (const session of sessions) {
      // Name is optional, but when provided it must not be blank
      if (session.name !== undefined && session.name.trim() === '') {
        throw new BadRequestException({
          message: SESSION_ERROR_MESSAGES.EMPTY_SESSION_NAME,
          code: 'EMPTY_SESSION_NAME',
          details: { sessionOrder: session.order },
        });
      }

      // Order must be a positive integer (1, 2, 3, …)
      if (!Number.isInteger(session.order) || session.order < 1) {
        throw new BadRequestException({
          message: SESSION_ERROR_MESSAGES.INVALID_SESSION_ORDER,
          code: 'INVALID_SESSION_ORDER',
          details: { sessionOrder: session.order },
        });
      }

      // Duration is optional, but when provided it must be in [5, 480]
      if (session.duration !== undefined) {
        this.validateSessionDuration(session.duration);
      }
    }

    // 3. Cross-session uniqueness check
    this.validateUniqueOrderNumbers(sessions);

    this.logger.debug('Session structure validation passed');
  }

  /**
   * Validates that a session duration is between 5 and 480 minutes (8 hours).
   *
   * Requirement: 2.3
   */
  validateSessionDuration(duration: number): void {
    if (duration < 5 || duration > 480) {
      throw new BadRequestException({
        message: SESSION_ERROR_MESSAGES.INVALID_SESSION_DURATION,
        code: 'INVALID_SESSION_DURATION',
        details: { duration, min: 5, max: 480 },
      });
    }
  }

  /**
   * Validates that all session order numbers are unique within the array.
   * Collects all duplicated values and includes them in the error details.
   *
   * Requirements: 1.5, 6.3
   */
  validateUniqueOrderNumbers(sessions: ServiceSessionDto[]): void {
    const orderNumbers = sessions.map((s) => s.order);
    const uniqueOrders = new Set(orderNumbers);

    if (orderNumbers.length !== uniqueOrders.size) {
      const duplicates = orderNumbers.filter(
        (order, index) => orderNumbers.indexOf(order) !== index,
      );

      throw new BadRequestException({
        message: SESSION_ERROR_MESSAGES.DUPLICATE_SESSION_ORDER,
        code: 'DUPLICATE_SESSION_ORDER',
        details: { duplicateOrders: [...new Set(duplicates)] },
      });
    }
  }

  /**
   * Validates that the sessions array does not exceed the maximum allowed count (50).
   *
   * Requirement: 1.4
   */
  validateMaxSessionCount(sessions: ServiceSessionDto[]): void {
    if (sessions.length > 50) {
      throw new BadRequestException({
        message: SESSION_ERROR_MESSAGES.MAX_SESSIONS_EXCEEDED,
        code: 'MAX_SESSIONS_EXCEEDED',
        details: { count: sessions.length, max: 50 },
      });
    }
  }
}
