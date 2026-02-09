import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TokenBlacklist } from '../database/schemas/token-blacklist.schema';
import { Session, DeviceInfo } from '../database/schemas/session.schema';
import { TokenService } from './token.service';

/**
 * SessionService - Manages user sessions and token invalidation
 *
 * Provides methods for:
 * - Creating and managing user sessions
 * - Session restoration
 * - Invalidating all user sessions (adds tokens to blacklist)
 * - Adding individual tokens to blacklist
 * - Checking if tokens are blacklisted
 * - Cleaning up expired tokens from blacklist
 * - Counting active sessions for a user
 *
 * Requirements: 3.3, 3.4, 3.5, 3.7, 4.1, 4.2, 4.3, 5.1, 6.1
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    @InjectModel(TokenBlacklist.name)
    private readonly tokenBlacklistModel: Model<TokenBlacklist>,
    @InjectModel(Session.name)
    private readonly sessionModel: Model<Session>,
    private readonly tokenService: TokenService,
  ) {}

  // ==================== Session Management Methods ====================

  /**
   * Create a new session
   *
   * @param userId - User ID for the session
   * @param deviceInfo - Device information (userAgent, ipAddress, browser, os)
   * @param token - Access token
   * @param refreshToken - Refresh token
   * @param expiresAt - Session expiration date
   * @returns Created session
   *
   * Requirements: 4.1, 4.2
   */
  async createSession(
    userId: string,
    deviceInfo: DeviceInfo,
    token: string,
    refreshToken: string,
    expiresAt: Date,
  ): Promise<Session> {
    try {
      // Hash the token for storage
      const tokenHash = this.tokenService.hashToken(token);

      const session = new this.sessionModel({
        userId: new Types.ObjectId(userId),
        token: tokenHash,
        refreshToken,
        deviceInfo,
        expiresAt,
        isActive: true,
      });

      const savedSession = await session.save();

      this.logger.log(
        `Session created for user ${userId} from ${deviceInfo.ipAddress}`,
      );

      return savedSession;
    } catch (error) {
      this.logger.error(
        `Failed to create session for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new Error('Failed to create session');
    }
  }

  /**
   * Restore session from token
   *
   * @param token - Access token to restore session from
   * @returns Session if found and active, null otherwise
   *
   * Requirements: 4.2, 4.3, 4.4
   */
  async restoreSession(token: string): Promise<Session | null> {
    try {
      // Hash the token for lookup
      const tokenHash = this.tokenService.hashToken(token);

      const session = await this.sessionModel
        .findOne({
          token: tokenHash,
          isActive: true,
          expiresAt: { $gt: new Date() },
        })
        .lean()
        .exec();

      if (session) {
        this.logger.debug(`Session restored for user ${session.userId}`);
      } else {
        this.logger.debug('No active session found for token');
      }

      return session as Session | null;
    } catch (error) {
      this.logger.error(
        `Failed to restore session: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Invalidate all sessions for a user
   *
   * This method marks all active sessions as inactive and adds their tokens to the blacklist.
   * Used when critical account changes occur (username change, role change, password change).
   *
   * @param userId - User ID whose sessions should be invalidated
   * @param reason - Reason for invalidation (e.g., 'password_change', 'username_change', 'role_change')
   * @param adminId - Optional admin ID if invalidation was triggered by an admin
   * @returns Number of sessions invalidated
   *
   * Requirements: 4.3, 5.1, 6.1
   */
  async invalidateUserSessions(
    userId: string,
    reason: string,
    adminId?: string,
  ): Promise<number> {
    try {
      this.logger.log(
        `Invalidating sessions for user ${userId}, reason: ${reason}${adminId ? `, admin: ${adminId}` : ''}`,
      );

      // Find all active sessions for the user
      const activeSessions = await this.sessionModel
        .find({
          userId: new Types.ObjectId(userId),
          isActive: true,
        })
        .exec();

      if (activeSessions.length === 0) {
        this.logger.log(`No active sessions found for user ${userId}`);
        return 0;
      }

      // Mark all sessions as inactive
      const updateResult = await this.sessionModel
        .updateMany(
          {
            userId: new Types.ObjectId(userId),
            isActive: true,
          },
          {
            $set: {
              isActive: false,
              invalidatedAt: new Date(),
              invalidationReason: reason,
            },
          },
        )
        .exec();

      // Add all tokens to blacklist
      for (const session of activeSessions) {
        try {
          await this.addTokenToBlacklist(
            session.token,
            userId,
            session.expiresAt,
            reason,
            adminId,
          );
        } catch (error) {
          // Continue even if blacklisting fails for individual tokens
          this.logger.warn(
            `Failed to blacklist token for session ${session._id}: ${error.message}`,
          );
        }
      }

      const invalidatedCount = updateResult.modifiedCount || 0;

      this.logger.log(
        `Invalidated ${invalidatedCount} sessions for user ${userId}`,
      );

      return invalidatedCount;
    } catch (error) {
      this.logger.error(
        `Failed to invalidate sessions for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new Error('Failed to invalidate user sessions');
    }
  }

  /**
   * Invalidate a specific session
   *
   * @param sessionId - Session ID to invalidate
   * @param reason - Reason for invalidation
   * @returns void
   *
   * Requirements: 4.3
   */
  async invalidateSession(sessionId: string, reason?: string): Promise<void> {
    try {
      const session = await this.sessionModel.findById(sessionId).exec();

      if (!session) {
        this.logger.warn(`Session ${sessionId} not found`);
        return;
      }

      // Mark session as inactive
      session.isActive = false;
      session.invalidatedAt = new Date();
      session.invalidationReason = reason || 'manual_invalidation';

      await session.save();

      // Add token to blacklist
      await this.addTokenToBlacklist(
        session.token,
        session.userId.toString(),
        session.expiresAt,
        reason || 'manual_invalidation',
      );

      this.logger.log(`Session ${sessionId} invalidated`);
    } catch (error) {
      this.logger.error(
        `Failed to invalidate session ${sessionId}: ${error.message}`,
        error.stack,
      );
      throw new Error('Failed to invalidate session');
    }
  }

  /**
   * Get active sessions for a user
   *
   * @param userId - User ID to get sessions for
   * @returns Array of active sessions
   *
   * Requirements: 4.1, 4.2
   */
  async getActiveSessions(userId: string): Promise<Session[]> {
    try {
      const sessions = await this.sessionModel
        .find({
          userId: new Types.ObjectId(userId),
          isActive: true,
          expiresAt: { $gt: new Date() },
        })
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      this.logger.debug(
        `Found ${sessions.length} active sessions for user ${userId}`,
      );

      return sessions as Session[];
    } catch (error) {
      this.logger.error(
        `Failed to get active sessions for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new Error('Failed to get active sessions');
    }
  }

  // ==================== Token Blacklist Methods ====================

  // ==================== Token Blacklist Methods ====================

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
   * @returns Number of sessions invalidated
   */
  async invalidateAllUserTokens(userId: string): Promise<number> {
    return await this.invalidateUserSessions(userId, 'manual_invalidation');
  }
}
