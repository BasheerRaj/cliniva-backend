import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitService } from '../rate-limit.service';
import { AuditService } from '../audit.service';
import {
  RATE_LIMIT_KEY,
  RateLimitConfig,
  RateLimitType,
} from '../../common/decorators/rate-limit.decorator';
import { AuthErrorCode } from '../../common/enums/auth-error-code.enum';
import { AUTH_ERROR_MESSAGES } from '../../common/constants/auth-error-messages.constant';

/**
 * RateLimitGuard - Implements rate limiting for protected endpoints
 * 
 * This guard checks if the request exceeds the configured rate limit.
 * If the limit is exceeded, it:
 * 1. Throws TooManyRequestsException with AUTH_011 code
 * 2. Logs the violation to the audit log
 * 
 * The guard uses the @RateLimit decorator metadata to determine:
 * - Type of rate limit (password_reset, login_attempt, password_change)
 * - Maximum allowed requests
 * - Time window in seconds
 * 
 * Requirements: 9.1-9.4, 9.6
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: RateLimitService,
    private readonly auditService: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get rate limit configuration from decorator metadata
    const rateLimitConfig = this.reflector.get<RateLimitConfig>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    // If no rate limit configured, allow the request
    if (!rateLimitConfig) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { type, limit, windowSeconds } = rateLimitConfig;

    // Extract IP address from request
    const ipAddress = request.ip || request.connection?.remoteAddress || 'unknown';

    // Extract user ID from JWT payload (if authenticated)
    const userId = request.user?.userId || request.user?.sub;

    try {
      let allowed = false;

      // Check rate limit based on type
      switch (type) {
        case RateLimitType.PASSWORD_RESET:
          // Rate limit by IP address
          allowed = await this.rateLimitService.checkPasswordResetLimit(ipAddress);
          break;

        case RateLimitType.LOGIN_ATTEMPT:
          // Rate limit by IP address
          allowed = await this.rateLimitService.checkLoginAttemptLimit(ipAddress);
          break;

        case RateLimitType.PASSWORD_CHANGE:
          // Rate limit by user ID
          if (!userId) {
            // If no user ID, allow the request (authentication will fail later)
            return true;
          }
          allowed = await this.rateLimitService.checkPasswordChangeLimit(userId);
          break;

        default:
          this.logger.warn(`Unknown rate limit type: ${type}`);
          return true;
      }

      // If rate limit exceeded, log violation and throw exception
      if (!allowed) {
        const endpoint = request.url || request.path || 'unknown';
        const requestType = type;

        // Log rate limit violation to audit log
        await this.auditService.logRateLimitViolation(
          ipAddress,
          endpoint,
          requestType,
        );

        this.logger.warn(
          `Rate limit exceeded for ${type} from IP ${ipAddress}${userId ? ` (user: ${userId})` : ''}`,
        );

        // Throw TooManyRequestsException with AUTH_011 code and bilingual message
        throw new HttpException(
          {
            success: false,
            error: {
              code: AuthErrorCode.RATE_LIMIT_EXCEEDED,
              message: AUTH_ERROR_MESSAGES[AuthErrorCode.RATE_LIMIT_EXCEEDED],
            },
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Rate limit not exceeded, allow the request
      return true;
    } catch (error) {
      // If it's already an HttpException, re-throw it
      if (error instanceof HttpException) {
        throw error;
      }

      // Log unexpected errors
      this.logger.error(
        `Rate limit check failed for ${type}: ${error.message}`,
        error.stack,
      );

      // Fail open - allow the request if rate limit check fails
      // This prevents service errors from blocking legitimate users
      return true;
    }
  }
}
