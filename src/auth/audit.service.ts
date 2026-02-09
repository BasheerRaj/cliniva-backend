import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { AuditLog } from '../database/schemas/audit-log.schema';
import { AuditEventType } from '../common/enums/audit-event-type.enum';

export interface SecurityEvent {
  eventType: string;
  userId: string;
  actorId?: string;
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

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

  /**
   * Log user status change event
   * @param userId - User ID whose status was changed
   * @param isActive - New status (true = activated, false = deactivated)
   * @param changedBy - User ID who made the change
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent string from the request
   */
  async logUserStatusChange(
    userId: string,
    isActive: boolean,
    changedBy: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      await this.auditLogModel.create({
        eventType: AuditEventType.USER_STATUS_CHANGE,
        userId: new Types.ObjectId(userId),
        adminId: new Types.ObjectId(changedBy),
        ipAddress,
        userAgent,
        timestamp: new Date(),
        success: true,
        details: {
          action: isActive ? 'User activated' : 'User deactivated',
          newStatus: isActive,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to log user status change for user ${userId}`,
        error,
      );
    }
  }

  /**
   * Log user deletion event
   * Task 9.3: Add validation to user delete endpoint
   * Requirements: 9.3
   *
   * @param userId - User ID that was deleted
   * @param deletedBy - User ID who deleted the user
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent string from the request
   */
  async logUserDeleted(
    userId: string,
    deletedBy: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      await this.auditLogModel.create({
        eventType: AuditEventType.USER_DELETED,
        userId: new Types.ObjectId(userId),
        adminId: new Types.ObjectId(deletedBy),
        ipAddress,
        userAgent,
        timestamp: new Date(),
        success: true,
        details: {
          action: 'User deleted',
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to log user deletion for user ${userId}`,
        error,
      );
    }
  }

  /**
   * Log employee creation event
   * @param employeeId - Employee ID that was created
   * @param createdBy - User ID who created the employee
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent string from the request
   * @param details - Additional details about the employee
   */
  async logEmployeeCreated(
    employeeId: string,
    createdBy: string,
    ipAddress: string,
    userAgent?: string,
    details?: any,
  ): Promise<void> {
    try {
      await this.auditLogModel.create({
        eventType: AuditEventType.EMPLOYEE_CREATED,
        userId: new Types.ObjectId(employeeId),
        adminId: new Types.ObjectId(createdBy),
        ipAddress,
        userAgent,
        timestamp: new Date(),
        success: true,
        details: {
          action: 'Employee created',
          ...details,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to log employee creation for ${employeeId}`,
        error,
      );
    }
  }

  /**
   * Log employee update event
   * @param employeeId - Employee ID that was updated
   * @param updatedBy - User ID who updated the employee
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent string from the request
   * @param changes - Fields that were changed
   */
  async logEmployeeUpdated(
    employeeId: string,
    updatedBy: string,
    ipAddress: string,
    userAgent?: string,
    changes?: any,
  ): Promise<void> {
    try {
      await this.auditLogModel.create({
        eventType: AuditEventType.EMPLOYEE_UPDATED,
        userId: new Types.ObjectId(employeeId),
        adminId: new Types.ObjectId(updatedBy),
        ipAddress,
        userAgent,
        timestamp: new Date(),
        success: true,
        details: {
          action: 'Employee updated',
          changes,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to log employee update for ${employeeId}`,
        error,
      );
    }
  }

  /**
   * Log employee deletion event
   * @param employeeId - Employee ID that was deleted
   * @param deletedBy - User ID who deleted the employee
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent string from the request
   */
  async logEmployeeDeleted(
    employeeId: string,
    deletedBy: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      await this.auditLogModel.create({
        eventType: AuditEventType.EMPLOYEE_DELETED,
        userId: new Types.ObjectId(employeeId),
        adminId: new Types.ObjectId(deletedBy),
        ipAddress,
        userAgent,
        timestamp: new Date(),
        success: true,
        details: {
          action: 'Employee deleted (soft delete)',
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to log employee deletion for ${employeeId}`,
        error,
      );
    }
  }

  /**
   * Log employee termination event
   * @param employeeId - Employee ID that was terminated
   * @param terminatedBy - User ID who terminated the employee
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent string from the request
   * @param terminationDetails - Details about the termination
   */
  async logEmployeeTerminated(
    employeeId: string,
    terminatedBy: string,
    ipAddress: string,
    userAgent?: string,
    terminationDetails?: any,
  ): Promise<void> {
    try {
      await this.auditLogModel.create({
        eventType: AuditEventType.EMPLOYEE_TERMINATED,
        userId: new Types.ObjectId(employeeId),
        adminId: new Types.ObjectId(terminatedBy),
        ipAddress,
        userAgent,
        timestamp: new Date(),
        success: true,
        details: {
          action: 'Employee terminated',
          ...terminationDetails,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to log employee termination for ${employeeId}`,
        error,
      );
    }
  }

  /**
   * Log doctor deactivation with appointment transfer
   * @param doctorId - Doctor ID that was deactivated
   * @param deactivatedBy - User ID who deactivated the doctor
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent string from the request
   * @param transferDetails - Details about appointment transfers
   */
  async logDoctorDeactivated(
    doctorId: string,
    deactivatedBy: string,
    ipAddress: string,
    userAgent?: string,
    transferDetails?: {
      appointmentsTransferred?: number;
      appointmentsRescheduled?: number;
      targetDoctorId?: string;
    },
  ): Promise<void> {
    try {
      await this.auditLogModel.create({
        eventType: AuditEventType.DOCTOR_DEACTIVATED,
        userId: new Types.ObjectId(doctorId),
        adminId: new Types.ObjectId(deactivatedBy),
        ipAddress,
        userAgent,
        timestamp: new Date(),
        success: true,
        details: {
          action: 'Doctor deactivated with appointment handling',
          ...transferDetails,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to log doctor deactivation for ${doctorId}`,
        error,
      );
    }
  }

  /**
   * Log appointment transfer event
   * @param fromDoctorId - Doctor ID appointments were transferred from
   * @param toDoctorId - Doctor ID appointments were transferred to
   * @param appointmentCount - Number of appointments transferred
   * @param transferredBy - User ID who initiated the transfer
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent string from the request
   */
  async logAppointmentsTransferred(
    fromDoctorId: string,
    toDoctorId: string,
    appointmentCount: number,
    transferredBy: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      await this.auditLogModel.create({
        eventType: AuditEventType.APPOINTMENTS_TRANSFERRED,
        userId: new Types.ObjectId(fromDoctorId),
        adminId: new Types.ObjectId(transferredBy),
        ipAddress,
        userAgent,
        timestamp: new Date(),
        success: true,
        details: {
          action: 'Appointments transferred to another doctor',
          fromDoctorId,
          toDoctorId,
          appointmentCount,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to log appointment transfer from ${fromDoctorId} to ${toDoctorId}`,
        error,
      );
    }
  }

  /**
   * Log clinic status change event
   * @param clinicId - Clinic ID whose status was changed
   * @param oldStatus - Previous status
   * @param newStatus - New status
   * @param reason - Reason for status change
   * @param changedBy - User ID who made the change
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent string from the request
   */
  async logClinicStatusChange(
    clinicId: string,
    oldStatus: string,
    newStatus: string,
    reason: string | undefined,
    changedBy: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      await this.auditLogModel.create({
        eventType: AuditEventType.CLINIC_STATUS_CHANGED,
        userId: new Types.ObjectId(changedBy),
        adminId: new Types.ObjectId(changedBy),
        ipAddress,
        userAgent,
        timestamp: new Date(),
        success: true,
        details: {
          action: 'Clinic status changed',
          clinicId,
          oldStatus,
          newStatus,
          reason: reason || 'No reason provided',
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to log clinic status change for clinic ${clinicId}`,
        error,
      );
    }
  }

  /**
   * Log clinic staff transfer event
   * @param fromClinicId - Source clinic ID
   * @param toClinicId - Target clinic ID
   * @param doctorsTransferred - Number of doctors transferred
   * @param staffTransferred - Number of staff transferred
   * @param transferredBy - User ID who initiated the transfer
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent string from the request
   */
  async logClinicStaffTransfer(
    fromClinicId: string,
    toClinicId: string,
    doctorsTransferred: number,
    staffTransferred: number,
    transferredBy: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      await this.auditLogModel.create({
        eventType: AuditEventType.CLINIC_STAFF_TRANSFERRED,
        userId: new Types.ObjectId(transferredBy),
        adminId: new Types.ObjectId(transferredBy),
        ipAddress,
        userAgent,
        timestamp: new Date(),
        success: true,
        details: {
          action: 'Staff transferred between clinics',
          fromClinicId,
          toClinicId,
          doctorsTransferred,
          staffTransferred,
          totalTransferred: doctorsTransferred + staffTransferred,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to log staff transfer from clinic ${fromClinicId} to ${toClinicId}`,
        error,
      );
    }
  }

  /**
   * Log security event with transaction support
   * Generic method for logging security events with optional MongoDB session
   * Requirements: 7.6, 20.1-20.5
   *
   * @param event - Security event details
   * @param session - Optional MongoDB session for transaction support
   */
  async logSecurityEvent(
    event: SecurityEvent,
    session?: ClientSession,
  ): Promise<void> {
    try {
      const auditLogData = {
        eventType: event.eventType as AuditEventType,
        userId: new Types.ObjectId(event.userId),
        adminId: event.actorId ? new Types.ObjectId(event.actorId) : undefined,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        timestamp: event.timestamp,
        success: true,
        details: event.metadata,
      };

      if (session) {
        await this.auditLogModel.create([auditLogData], { session });
      } else {
        await this.auditLogModel.create(auditLogData);
      }
    } catch (error) {
      this.logger.error(
        `Failed to log security event ${event.eventType} for user ${event.userId}`,
        error,
      );
      // Don't throw - audit logging failure shouldn't block operations
    }
  }
}
