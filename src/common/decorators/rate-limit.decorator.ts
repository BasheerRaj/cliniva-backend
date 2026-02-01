import { SetMetadata } from '@nestjs/common';

/**
 * Rate limit types for different operations
 */
export enum RateLimitType {
  PASSWORD_RESET = 'password_reset',
  LOGIN_ATTEMPT = 'login_attempt',
  PASSWORD_CHANGE = 'password_change',
}

/**
 * Rate limit configuration interface
 */
export interface RateLimitConfig {
  type: RateLimitType;
  limit: number;
  windowSeconds: number;
}

/**
 * Metadata key for rate limit configuration
 */
export const RATE_LIMIT_KEY = 'rate_limit';

/**
 * Rate limit decorator
 * 
 * Applies rate limiting to an endpoint based on the specified type, limit, and time window.
 * 
 * @param type - Type of rate limit (password_reset, login_attempt, password_change)
 * @param limit - Maximum number of requests allowed in the time window
 * @param windowSeconds - Time window in seconds
 * 
 * @example
 * ```typescript
 * @RateLimit(RateLimitType.PASSWORD_RESET, 5, 3600)
 * @Post('forgot-password')
 * async forgotPassword() { ... }
 * ```
 * 
 * Requirements: 9.1-9.4, 9.6
 */
export const RateLimit = (
  type: RateLimitType,
  limit: number,
  windowSeconds: number,
) => SetMetadata(RATE_LIMIT_KEY, { type, limit, windowSeconds } as RateLimitConfig);
