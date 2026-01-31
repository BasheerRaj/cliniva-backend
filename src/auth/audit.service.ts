import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog } from '../database/schemas/audit-log.schema';
import { AuditEventType } from '../common/enums/audit-event-type.enum';

export interface AuditLogFilters {
  userId?: string;
  eventType?: AuditEventType;
  ipAddress?: string;
  startDate?: Date;
  endDate?: Date;
  success?: boolean;
  limit?: number;
  skip?: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLog>,
  ) {}

  /**
   * Log successful login event
   * @param userId - User ID who logged in
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent string from the request
   */
  async logLoginSuccess(
    userId: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      await this.auditLogModel.create({
        eventType: AuditEventType.LOGIN_SUCCESS,
        userId: new Types.ObjectId(userId),
        ipAddress,
        userAgent,
        timestamp: new Date(),
        success: true,
        details: {
          action: 'User logged in successfully',
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to log login success for user ${userId}`,
        error,
      );
    }
  }

  /**
   * Log failed login attempt
   * @param email - Email address attempted
   * @param ipAddress - IP address of the request
   * @param reason - Reason for failure
   */
  async logLoginFailure(
    email: string,
    ipAddress: string,
    reason: string,
  ): Promise<void> {
    try {
      await this.auditLogModel.create({
        eventType: AuditEventType.LOGIN_FAILURE,
        email,
        ipAddress,
        timestamp: new Date(),
        success: false,
        details: {
          reason,
          action: 'Login attempt failed',
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to log login failure for email ${email}`,
        error,
      );
    }
  }

  /**
   * Log password change event
   * @param userId - User ID whose password was changed
   * @param changeType - Type of password change (first_login, user_initiated, admin_reset)
   * @param adminId - Admin ID if admin-initiated (optional)
   */
  async logPasswordChange(
    userId: string,
    changeType: 'first_login' | 'user_initiated' | 'admin_reset',
    adminId?: string,
  ): Promise<void> {
    try {
      await this.auditLogModel.create({
        eventType: AuditEventType.PASSWORD_CHANGE,
        userId: new Types.ObjectId(userId),
        adminId: adminId ? new Types.ObjectId(adminId) : undefined,
        ipAddress: '0.0.0.0', // Will be updated by caller if available
        timestamp: new Date(),
        success: true,
        details: {
          changeType,
          action: 'Password changed',
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to log password change for user ${userId}`,
        error,
      );
    }
  }

  /**
   * Log password reset request
   * @param email - Email address requesting reset
   * @param ipAddress - IP address of the request
   */
  async logPasswordResetRequest(
    email: string,
    ipAddress: string,
  ): Promise<void> {
    try {
      await this.auditLogModel.create({
        eventType: AuditEventType.PASSWORD_RESET_REQUEST,
        email,
        ipAddress,
        timestamp: new Date(),
        success: true,
        details: {
          action: 'Password reset requested',
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to log password reset request for email ${email}`,
        error,
      );
    }
  }

  /**
   * Log password reset completion
   * @param userId - User ID whose password was reset
   * @param tokenUsed - Token that was used for reset
   */
  async logPasswordResetComplete(
    userId: string,
    tokenUsed: string,
  ): Promise<void> {
    try {
      await this.auditLogModel.create({
        eventType: AuditEventType.PASSWORD_RESET_COMPLETE,
        userId: new Types.ObjectId(userId),
        ipAddress: '0.0.0.0', // Will be updated by caller if available
        timestamp: new Date(),
        success: true,
        details: {
          tokenUsed: tokenUsed.substring(0, 8) + '...', // Only log partial token for security
          action: 'Password reset completed',
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to log password reset completion for user ${userId}`,
        error,
      );
    }
  }

  /**
   * Log session invalidation event
   * @param userId - User ID whose sessions were invalidated
   * @param reason - Reason for invalidation
   * @param tokenCount - Number of tokens invalidated
   * @param adminId - Admin ID if admin-initiated (optional)
   */
  async logSessionInvalidation(
    userId: string,
    reason: string,
    tokenCount: number,
    adminId?: string,
  ): Promise<void> {
    try {
      await this.auditLogModel.create({
        eventType: AuditEventType.SESSION_INVALIDATION,
        userId: new Types.ObjectId(userId),
        adminId: adminId ? new Types.ObjectId(adminId) : undefined,
        ipAddress: '0.0.0.0', // Will be updated by caller if available
        timestamp: new Date(),
        success: true,
        details: {
          reason,
          tokenCount,
          action: 'Sessions invalidated',
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to log session invalidation for user ${userId}`,
        error,
      );
    }
  }

  /**
   * Log rate limit violation
   * @param ipAddress - IP address that violated rate limit
   * @param endpoint - Endpoint that was rate limited
   * @param requestType - Type of request that was rate limited
   */
  async logRateLimitViolation(
    ipAddress: string,
    endpoint: string,
    requestType: string,
  ): Promise<void> {
    try {
      await this.auditLogModel.create({
        eventType: AuditEventType.RATE_LIMIT_VIOLATION,
        ipAddress,
        timestamp: new Date(),
        success: false,
        details: {
          endpoint,
          requestType,
          action: 'Rate limit exceeded',
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to log rate limit violation for IP ${ipAddress}`,
        error,
      );
    }
  }

  /**
   * Query audit logs with filters
   * @param filters - Filter criteria for audit logs
   * @returns Array of audit log entries
   */
  async getAuditLogs(filters: AuditLogFilters): Promise<AuditLog[]> {
    try {
      const query: any = {};

      // Apply filters
      if (filters.userId) {
        query.userId = new Types.ObjectId(filters.userId);
      }

      if (filters.eventType) {
        query.eventType = filters.eventType;
      }

      if (filters.ipAddress) {
        query.ipAddress = filters.ipAddress;
      }

      if (filters.success !== undefined) {
        query.success = filters.success;
      }

      // Date range filter
      if (filters.startDate || filters.endDate) {
        query.timestamp = {};
        if (filters.startDate) {
          query.timestamp.$gte = filters.startDate;
        }
        if (filters.endDate) {
          query.timestamp.$lte = filters.endDate;
        }
      }

      // Execute query with pagination
      const limit = filters.limit || 100;
      const skip = filters.skip || 0;

      return await this.auditLogModel
        .find(query)
        .sort({ timestamp: -1 }) // Most recent first
        .limit(limit)
        .skip(skip)
        .populate('userId', 'email firstName lastName')
        .populate('adminId', 'email firstName lastName')
        .exec();
    } catch (error) {
      this.logger.error('Failed to query audit logs', error);
      throw error;
    }
  }
}
