import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SessionService } from './session.service';

/**
 * TokenCleanupTask - Scheduled task for cleaning expired tokens from blacklist
 * 
 * This task runs every hour to remove expired tokens from the TokenBlacklist collection.
 * Expired tokens are those that have passed their natural expiration time and no longer
 * need to be stored in the blacklist.
 * 
 * Requirements: 3.7 - Expired tokens are automatically removed from blacklist
 */
@Injectable()
export class TokenCleanupTask {
  private readonly logger = new Logger(TokenCleanupTask.name);

  constructor(private readonly sessionService: SessionService) {}

  /**
   * Clean up expired tokens from the blacklist
   * 
   * Runs every hour (at the start of each hour: 00:00, 01:00, 02:00, etc.)
   * 
   * The cleanup process:
   * 1. Queries TokenBlacklist for tokens where expiresAt < current time
   * 2. Deletes all matching tokens
   * 3. Logs the number of tokens removed
   * 
   * Note: MongoDB TTL index also provides automatic cleanup, but this scheduled
   * task ensures explicit cleanup and provides monitoring metrics.
   * 
   * Requirement 3.7: Expired tokens are automatically removed from blacklist
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleTokenCleanup(): Promise<void> {
    this.logger.log('Starting scheduled token blacklist cleanup');

    try {
      const deletedCount = await this.sessionService.cleanupExpiredTokens();

      this.logger.log(
        `Token cleanup completed successfully. Removed ${deletedCount} expired token(s) from blacklist`,
      );

      // Log warning if unusually high number of tokens were cleaned up
      if (deletedCount > 1000) {
        this.logger.warn(
          `High number of expired tokens cleaned up: ${deletedCount}. Consider reviewing token expiration settings.`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Token cleanup failed: ${error.message}`,
        error.stack,
      );
      // Don't throw - we don't want to crash the application if cleanup fails
      // The next scheduled run will attempt cleanup again
    }
  }

  /**
   * Manual trigger for token cleanup (for testing or manual operations)
   * 
   * This method can be called directly to trigger cleanup outside of the schedule.
   * Useful for testing or manual maintenance operations.
   * 
   * @returns Number of tokens removed
   */
  async triggerManualCleanup(): Promise<number> {
    this.logger.log('Manual token cleanup triggered');

    try {
      const deletedCount = await this.sessionService.cleanupExpiredTokens();

      this.logger.log(
        `Manual cleanup completed. Removed ${deletedCount} expired token(s)`,
      );

      return deletedCount;
    } catch (error) {
      this.logger.error(
        `Manual cleanup failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
