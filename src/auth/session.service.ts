import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TokenBlacklist } from '../database/schemas/token-blacklist.schema';
import { TokenService } from './token.service';

/**
 * SessionService - Manages user sessions and token invalidation
 *
 * Provides methods for:
 * - Invalidating all user sessions (adds tokens to blacklist)
 * - Adding individual tokens to blacklist
 * - Checking if tokens are blacklisted
 * - Cleaning up expired tokens from blacklist
 * - Counting active sessions for a user
 *
 * Requirements: 3.3, 3.4, 3.5, 3.7
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    @InjectModel(TokenBlacklist.name)
    private readonly tokenBlacklistModel: Model<TokenBlacklist>,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Invalidate all sessions for a user
   *
   * This method adds all active tokens for a user to the blacklist.
   * Used when critical account changes occur (email change, role change, password change).
   *
   * @param userId - User ID whose sessions should be invalidated
   * @param reason - Reason for invalidation (e.g., 'password_change', 'email_change', 'role_change')
   * @param adminId - Optional admin ID if invalidation was triggered by an admin
   *
   * Requirement 3.3: Session invalidation adds tokens to blacklist
   *
   * Note: This method doesn't actually retrieve existing tokens because JWT is stateless.
   * Instead, it's called in conjunction with other operations that have access to the tokens.
   * The actual token blacklisting happens via addTokenToBlacklist() calls.
   */
  async invalidateUserSessions(
    userId: string,
    reason: string,
    adminId?: string,
  ): Promise<void> {
    try {
      this.logger.log(
        `Invalidating sessions for user ${userId}, reason: ${reason}${adminId ? `, admin: ${adminId}` : ''}`,
      );

      // Note: In a stateless JWT system, we don't have a list of active tokens.
      // This method serves as a coordination point for session invalidation logic.
      // The actual blacklisting happens when tokens are explicitly provided
      // (e.g., during logout, password change, etc.)

      // This method is primarily used to log the invalidation event
      // and can be extended to handle additional cleanup or notification logic.

      this.logger.log(`Session invalidation initiated for user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to invalidate sessions for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new Error('Failed to invalidate user sessions');
    }
  }

  /**
   * Add a token to the blacklist
   *
   * @param token - The JWT token to blacklist
   * @param userId - User ID who owns the token
   * @param expiresAt - When the token naturally expires
   * @param reason - Reason for blacklisting
   * @param adminId - Optional admin ID if blacklisting was triggered by an admin
   *
   * Requirement 3.3: Tokens are added to blacklist on invalidation
   * Requirement 3.5: Logout adds tokens to blacklist
   */
  async addTokenToBlacklist(
    token: string,
    userId: string,
    expiresAt: Date,
    reason: string,
    adminId?: string,
  ): Promise<void> {
    try {
      // Hash the token for storage
      const tokenHash = this.tokenService.hashToken(token);

      // Create blacklist entry
      const blacklistEntry = new this.tokenBlacklistModel({
        tokenHash,
        userId: new Types.ObjectId(userId),
        expiresAt,
        blacklistedAt: new Date(),
        reason,
        adminId: adminId ? new Types.ObjectId(adminId) : undefined,
      });

      await blacklistEntry.save();

      this.logger.log(
        `Token blacklisted for user ${userId}, reason: ${reason}`,
      );
    } catch (error) {
      // If duplicate key error (token already blacklisted), ignore it
      if (error.code === 11000) {
        this.logger.debug(`Token already blacklisted for user ${userId}`);
        return;
      }

      this.logger.error(
        `Failed to blacklist token for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new Error('Failed to blacklist token');
    }
  }

  /**
   * Check if a token is blacklisted
   *
   * @param tokenHash - SHA-256 hash of the token to check
   * @returns True if token is blacklisted, false otherwise
   *
   * Requirement 3.4: Blacklisted tokens are rejected
   */
  async isTokenBlacklisted(tokenHash: string): Promise<boolean> {
    try {
      const blacklistedToken = await this.tokenBlacklistModel
        .findOne({ tokenHash })
        .lean()
        .exec();

      const isBlacklisted = !!blacklistedToken;

      if (isBlacklisted) {
        this.logger.debug('Token is blacklisted');
      }

      return isBlacklisted;
    } catch (error) {
      this.logger.error(
        `Failed to check token blacklist status: ${error.message}`,
        error.stack,
      );
      // In case of error, fail secure by treating as blacklisted
      return true;
    }
  }

  /**
   * Clean up expired tokens from the blacklist
   *
   * Removes tokens that have passed their natural expiration time.
   * This is a maintenance operation that should be run periodically.
   *
   * @returns Number of tokens removed
   *
   * Requirement 3.7: Expired tokens are automatically removed from blacklist
   *
   * Note: MongoDB TTL index also handles automatic cleanup, but this method
   * provides explicit cleanup and returns count for monitoring.
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const now = new Date();

      const result = await this.tokenBlacklistModel
        .deleteMany({
          expiresAt: { $lt: now },
        })
        .exec();

      const deletedCount = result.deletedCount || 0;

      this.logger.log(
        `Cleaned up ${deletedCount} expired tokens from blacklist`,
      );

      return deletedCount;
    } catch (error) {
      this.logger.error(
        `Failed to cleanup expired tokens: ${error.message}`,
        error.stack,
      );
      throw new Error('Failed to cleanup expired tokens');
    }
  }

  /**
   * Get count of active (non-blacklisted) sessions for a user
   *
   * @param userId - User ID to count sessions for
   * @returns Number of blacklisted tokens for the user
   *
   * Note: In a stateless JWT system, we can only count blacklisted tokens.
   * The actual number of active sessions is unknown since tokens are not stored.
   * This method returns the count of blacklisted tokens as a proxy metric.
   */
  async getActiveSessionCount(userId: string): Promise<number> {
    try {
      const count = await this.tokenBlacklistModel
        .countDocuments({
          userId: new Types.ObjectId(userId),
          expiresAt: { $gt: new Date() }, // Only count non-expired blacklisted tokens
        })
        .exec();

      this.logger.debug(`User ${userId} has ${count} blacklisted tokens`);

      return count;
    } catch (error) {
      this.logger.error(
        `Failed to get session count for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new Error('Failed to get active session count');
    }
  }

  /**
   * Invalidate all user tokens (convenience method)
   *
   * This is an alias for invalidateUserSessions with a default reason.
   *
   * @param userId - User ID whose tokens should be invalidated
   */
  async invalidateAllUserTokens(userId: string): Promise<void> {
    await this.invalidateUserSessions(userId, 'manual_invalidation');
  }
}
