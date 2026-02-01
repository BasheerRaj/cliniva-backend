import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RateLimitCounter } from '../database/schemas/rate-limit-counter.schema';

/**
 * RateLimitService - Implements rate limiting for abuse prevention
 *
 * Provides methods for:
 * - Checking password reset limits (5 per hour)
 * - Checking login attempt limits (10 per 15 minutes)
 * - Checking password change limits (3 per hour)
 * - Incrementing counters with time windows
 * - Resetting counters
 * - Getting remaining attempts
 *
 * Requirements: 9.1, 9.2, 9.3, 9.5
 */
@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  // Rate limit configurations
  private readonly PASSWORD_RESET_LIMIT = 5;
  private readonly PASSWORD_RESET_WINDOW = 3600; // 1 hour in seconds

  private readonly LOGIN_ATTEMPT_LIMIT = 10;
  private readonly LOGIN_ATTEMPT_WINDOW = 900; // 15 minutes in seconds

  private readonly PASSWORD_CHANGE_LIMIT = 3;
  private readonly PASSWORD_CHANGE_WINDOW = 3600; // 1 hour in seconds

  constructor(
    @InjectModel(RateLimitCounter.name)
    private readonly rateLimitCounterModel: Model<RateLimitCounter>,
  ) {}

  /**
   * Check if password reset limit has been exceeded for an IP address
   *
   * @param ipAddress - IP address to check
   * @returns True if limit not exceeded, false if exceeded
   *
   * Requirement 9.1: Password reset requests limited to 5 per hour per IP
   */
  async checkPasswordResetLimit(ipAddress: string): Promise<boolean> {
    try {
      const key = `password_reset:${ipAddress}`;
      const count = await this.incrementCounter(
        key,
        this.PASSWORD_RESET_WINDOW,
      );

      const allowed = count <= this.PASSWORD_RESET_LIMIT;

      if (!allowed) {
        this.logger.warn(
          `Password reset rate limit exceeded for IP ${ipAddress}: ${count}/${this.PASSWORD_RESET_LIMIT}`,
        );
      }

      return allowed;
    } catch (error) {
      this.logger.error(
        `Failed to check password reset limit for IP ${ipAddress}: ${error.message}`,
        error.stack,
      );
      // Fail open to avoid blocking legitimate users due to service errors
      return true;
    }
  }

  /**
   * Check if login attempt limit has been exceeded for an IP address
   *
   * @param ipAddress - IP address to check
   * @returns True if limit not exceeded, false if exceeded
   *
   * Requirement 9.2: Login attempts limited to 10 per 15 minutes per IP
   */
  async checkLoginAttemptLimit(ipAddress: string): Promise<boolean> {
    try {
      const key = `login_attempt:${ipAddress}`;
      const count = await this.incrementCounter(key, this.LOGIN_ATTEMPT_WINDOW);

      const allowed = count <= this.LOGIN_ATTEMPT_LIMIT;

      if (!allowed) {
        this.logger.warn(
          `Login attempt rate limit exceeded for IP ${ipAddress}: ${count}/${this.LOGIN_ATTEMPT_LIMIT}`,
        );
      }

      return allowed;
    } catch (error) {
      this.logger.error(
        `Failed to check login attempt limit for IP ${ipAddress}: ${error.message}`,
        error.stack,
      );
      // Fail open to avoid blocking legitimate users due to service errors
      return true;
    }
  }

  /**
   * Check if password change limit has been exceeded for a user
   *
   * @param userId - User ID to check
   * @returns True if limit not exceeded, false if exceeded
   *
   * Requirement 9.3: Password changes limited to 3 per hour per user
   */
  async checkPasswordChangeLimit(userId: string): Promise<boolean> {
    try {
      const key = `password_change:${userId}`;
      const count = await this.incrementCounter(
        key,
        this.PASSWORD_CHANGE_WINDOW,
      );

      const allowed = count <= this.PASSWORD_CHANGE_LIMIT;

      if (!allowed) {
        this.logger.warn(
          `Password change rate limit exceeded for user ${userId}: ${count}/${this.PASSWORD_CHANGE_LIMIT}`,
        );
      }

      return allowed;
    } catch (error) {
      this.logger.error(
        `Failed to check password change limit for user ${userId}: ${error.message}`,
        error.stack,
      );
      // Fail open to avoid blocking legitimate users due to service errors
      return true;
    }
  }

  /**
   * Increment a rate limit counter and return the current count
   *
   * This method implements a sliding window rate limiting algorithm:
   * 1. Try to find existing counter for the key
   * 2. If found and within window, increment count
   * 3. If not found or expired, create new counter with count 1
   * 4. Return current count
   *
   * @param key - Unique key for the counter (e.g., "password_reset:192.168.1.1")
   * @param windowSeconds - Time window in seconds
   * @returns Current count after increment
   *
   * Requirement 9.5: Rate limit counters reset after time window expires
   */
  async incrementCounter(key: string, windowSeconds: number): Promise<number> {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - windowSeconds * 1000);
      const expiresAt = new Date(now.getTime() + windowSeconds * 1000);

      // Try to find and update existing counter within the window
      const existingCounter = await this.rateLimitCounterModel
        .findOne({
          key,
          windowStart: { $gte: windowStart },
        })
        .exec();

      if (existingCounter) {
        // Counter exists and is within window - increment it
        existingCounter.count += 1;
        existingCounter.expiresAt = expiresAt; // Extend expiration
        await existingCounter.save();

        this.logger.debug(
          `Incremented counter for key ${key}: ${existingCounter.count}`,
        );

        return existingCounter.count;
      } else {
        // No valid counter found - create new one
        try {
          const newCounter = await this.rateLimitCounterModel.create({
            key,
            count: 1,
            windowStart: now,
            expiresAt,
          });

          this.logger.debug(`Created new counter for key ${key}: 1`);

          return newCounter.count;
        } catch (error) {
          // Handle race condition where another request created the counter
          if (error.code === 11000) {
            // Duplicate key - retry the increment
            const counter = await this.rateLimitCounterModel
              .findOne({ key })
              .exec();

            if (counter) {
              counter.count += 1;
              counter.expiresAt = expiresAt;
              await counter.save();
              return counter.count;
            }
          }
          throw error;
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to increment counter for key ${key}: ${error.message}`,
        error.stack,
      );
      throw new Error('Failed to increment rate limit counter');
    }
  }

  /**
   * Reset a rate limit counter
   *
   * @param key - Unique key for the counter to reset
   *
   * Requirement 9.5: Rate limit counters can be reset
   */
  async resetCounter(key: string): Promise<void> {
    try {
      await this.rateLimitCounterModel.deleteOne({ key }).exec();

      this.logger.log(`Reset counter for key ${key}`);
    } catch (error) {
      this.logger.error(
        `Failed to reset counter for key ${key}: ${error.message}`,
        error.stack,
      );
      throw new Error('Failed to reset rate limit counter');
    }
  }

  /**
   * Get remaining attempts for a rate limit key
   *
   * @param key - Unique key for the counter
   * @param limit - Maximum allowed attempts
   * @returns Number of remaining attempts (0 if limit exceeded)
   *
   * Requirement 9.5: Calculate remaining attempts for rate limits
   */
  async getRemainingAttempts(key: string, limit: number): Promise<number> {
    try {
      const counter = await this.rateLimitCounterModel.findOne({ key }).exec();

      if (!counter) {
        // No counter exists - all attempts available
        return limit;
      }

      const remaining = Math.max(0, limit - counter.count);

      this.logger.debug(
        `Remaining attempts for key ${key}: ${remaining}/${limit}`,
      );

      return remaining;
    } catch (error) {
      this.logger.error(
        `Failed to get remaining attempts for key ${key}: ${error.message}`,
        error.stack,
      );
      // Return 0 on error to be safe
      return 0;
    }
  }
}
