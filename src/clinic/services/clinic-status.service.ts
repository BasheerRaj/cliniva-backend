import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, Types } from 'mongoose';
import { Clinic } from '../../database/schemas/clinic.schema';
import { User } from '../../database/schemas/user.schema';
import { Appointment } from '../../database/schemas/appointment.schema';
import { ERROR_CODES } from '../constants/error-codes.constant';
import { AuditService } from '../../auth/audit.service';
import { TransactionUtil } from '../../common/utils/transaction.util';
import { assertSameTenant, TenantUser } from '../../common/utils/tenant-scope.util';

/**
 * Options for changing clinic status
 */
export interface StatusChangeOptions {
  status: 'active' | 'inactive' | 'suspended';
  reason?: string;
  transferDoctors?: boolean;
  transferStaff?: boolean;
  targetClinicId?: string;
  targetDepartmentId?: string;
  notifyStaff?: boolean;
  notifyPatients?: boolean;
}

/**
 * Result of status change operation
 */
export interface StatusChangeResult {
  clinic: Clinic;
  doctorsTransferred?: number;
  staffTransferred?: number;
  appointmentsAffected?: number;
  appointmentsRescheduled?: number;
  notificationsSent?: {
    staff: number;
    patients: number;
    doctors: number;
  };
}

/**
 * Options for transferring staff
 */
export interface TransferOptions {
  targetClinicId: string;
  targetDepartmentId?: string;
  transferDoctors: boolean;
  transferStaff: boolean;
  doctorIds?: string[];
  staffIds?: string[];
  handleConflicts: 'reschedule' | 'notify' | 'cancel';
}

/**
 * Result of staff transfer operation
 */
export interface TransferResult {
  doctorsTransferred: number;
  staffTransferred: number;
  appointmentsAffected: number;
  errors: string[];
}

/**
 * Service for managing clinic status changes and staff transfers
 * Implements BZR-44: Status change with transfer
 */
@Injectable()
export class ClinicStatusService {
  constructor(
    @InjectModel('Clinic') private clinicModel: Model<Clinic>,
    @InjectModel('User') private userModel: Model<User>,
    @InjectModel('Appointment') private appointmentModel: Model<Appointment>,
    @InjectConnection() private connection: Connection,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Change clinic status with optional staff transfer
   * BZR-44: Status change with transfer
   *
   * @param clinicId - Clinic ID
   * @param options - Status change options
   * @param userId - User performing the action
   * @returns Status change result
   */
  async changeStatus(
    clinicId: string,
    options: StatusChangeOptions,
    userId: string,
    requestingUser?: TenantUser,
  ): Promise<StatusChangeResult> {
    // 1. Validate clinic exists
    const clinic = await this.clinicModel.findById(clinicId);
    if (!clinic) {
      throw new NotFoundException({
        code: 'CLINIC_007',
        message: ERROR_CODES.CLINIC_007.message,
      });
    }
    this.assertClinicTenantAccess(clinic, requestingUser);

    // Store old status for audit logging
    const oldStatus = clinic.status;

    // 2. Check for active appointments and staff
    const activeAppointments = await this.appointmentModel.countDocuments({
      clinicId: new Types.ObjectId(clinicId),
      status: { $in: ['scheduled', 'confirmed'] },
      appointmentDate: { $gte: new Date() },
      deletedAt: null,
    });

    const assignedDoctors = await this.userModel.countDocuments({
      $or: [
        { clinicId: new Types.ObjectId(clinicId) },
        { clinicIds: new Types.ObjectId(clinicId) },
      ],
      role: 'doctor',
      isActive: true,
      deletedAt: { $exists: false },
    });

    const assignedStaff = await this.userModel.countDocuments({
      $or: [
        { clinicId: new Types.ObjectId(clinicId) },
        { clinicIds: new Types.ObjectId(clinicId) },
      ],
      role: { $nin: ['doctor', 'patient'] },
      isActive: true,
      deletedAt: { $exists: false },
    });

    // 3. If deactivating with active appointments or doctors, require transfer decision.
    // Staff-only assignments should not block status change by themselves.
    if (options.status === 'inactive' || options.status === 'suspended') {
      if (
        (activeAppointments > 0 || assignedDoctors > 0) &&
        !options.transferDoctors &&
        !options.transferStaff &&
        !options.targetClinicId
      ) {
        throw new BadRequestException({
          message: {
            ar: 'يرجى اختيار ما إذا كنت تريد الاحتفاظ بالأطباء أو نقلهم',
            en: 'Please choose whether to keep or transfer doctors/staff',
          },
          code: 'CLINIC_004',
          requiresTransfer: true,
          activeAppointments,
          assignedDoctors,
          assignedStaff,
        });
      }
    }

    // 4. Start transaction for atomic operation (if replica set available)
    const { session, useTransaction } = await TransactionUtil.startTransaction(
      this.connection,
    );

    try {
      let doctorsTransferred = 0;
      let staffTransferred = 0;
      let appointmentsAffected = 0;

      // 5. Transfer staff if requested
      if (options.transferDoctors || options.transferStaff) {
        if (!options.targetClinicId) {
          throw new BadRequestException({
            message: {
              ar: 'يجب تحديد العيادة المستهدفة للنقل',
              en: 'Target clinic must be specified for transfer',
            },
            code: 'CLINIC_008',
          });
        }

        const transferResult = await this.transferStaff(
          clinicId,
          {
            targetClinicId: options.targetClinicId,
            targetDepartmentId: options.targetDepartmentId,
            transferDoctors: options.transferDoctors || false,
            transferStaff: options.transferStaff || false,
            handleConflicts: 'reschedule',
          },
          session,
          userId,
          requestingUser,
        );

        doctorsTransferred = transferResult.doctorsTransferred;
        staffTransferred = transferResult.staffTransferred;
        appointmentsAffected = transferResult.appointmentsAffected;
      }

      // 6. Mark appointments for rescheduling if not transferred
      if (activeAppointments > 0 && !options.transferDoctors) {
        await this.markAppointmentsForRescheduling(clinicId, session);
      }

      // 7. Update clinic status
      clinic.status = options.status;
      if (options.status === 'inactive' || options.status === 'suspended') {
        clinic.deactivatedAt = new Date();
        clinic.deactivatedBy = new Types.ObjectId(userId);
        clinic.deactivationReason = options.reason;
        clinic.isActive = false; // Update legacy field
      } else {
        clinic.isActive = true;
        clinic.deactivatedAt = undefined;
        clinic.deactivatedBy = undefined;
        clinic.deactivationReason = undefined;
      }
      await clinic.save(
        TransactionUtil.getSessionOptions(session, useTransaction),
      );

      // 8. Commit transaction (if available)
      await TransactionUtil.commitTransaction(session, useTransaction);

      // 9. Log audit event for status change
      await this.auditService.logClinicStatusChange(
        clinicId,
        oldStatus,
        options.status,
        options.reason,
        userId,
        '0.0.0.0', // IP address should be passed from controller
      );

      // 10. Send notifications (outside transaction)
      const notificationsSent = await this.sendNotifications(clinic, options, {
        doctorsTransferred,
        staffTransferred,
        appointmentsAffected,
      });

      return {
        clinic,
        doctorsTransferred:
          doctorsTransferred > 0 ? doctorsTransferred : undefined,
        staffTransferred: staffTransferred > 0 ? staffTransferred : undefined,
        appointmentsAffected:
          appointmentsAffected > 0 ? appointmentsAffected : undefined,
        notificationsSent,
      };
    } catch (error) {
      await TransactionUtil.abortTransaction(session, useTransaction);
      throw error;
    } finally {
      await TransactionUtil.endSession(session);
    }
  }

  /**
   * Transfer staff from one clinic to another
   *
   * @param fromClinicId - Source clinic ID
   * @param options - Transfer options
   * @param session - MongoDB session for transaction
   * @param userId - User ID who initiated the transfer
   * @returns Transfer result
   */
  async transferStaff(
    fromClinicId: string,
    options: TransferOptions,
    session?: any,
    userId?: string,
    requestingUser?: TenantUser,
  ): Promise<TransferResult> {
    if (options.targetClinicId === fromClinicId) {
      throw new BadRequestException({
        message: {
          ar: 'لا يمكن النقل إلى نفس العيادة',
          en: 'Cannot transfer to the same clinic',
        },
        code: 'CLINIC_008',
      });
    }

    const sourceClinic = await this.clinicModel.findById(fromClinicId).select(
      '_id subscriptionId',
    );
    if (!sourceClinic) {
      throw new NotFoundException({
        code: 'CLINIC_007',
        message: ERROR_CODES.CLINIC_007.message,
      });
    }
    this.assertClinicTenantAccess(sourceClinic, requestingUser);

    // 1. Validate target clinic exists
    const targetClinic = await this.clinicModel.findById(
      options.targetClinicId,
    );
    if (!targetClinic) {
      throw new NotFoundException({
        code: 'CLINIC_008',
        message: ERROR_CODES.CLINIC_008.message,
      });
    }
    this.assertClinicTenantAccess(targetClinic, requestingUser);
    if (targetClinic.status !== 'active' || targetClinic.isActive === false) {
      throw new BadRequestException({
        message: {
          ar: 'العيادة المستهدفة غير نشطة',
          en: 'Target clinic must be active to receive transferred doctors/staff',
        },
        code: 'CLINIC_008',
      });
    }

    const errors: string[] = [];
    let doctorsTransferred = 0;
    let staffTransferred = 0;
    let appointmentsAffected = 0;

    // 2. Transfer doctors if requested
    if (options.transferDoctors) {
      const doctorQuery: any = {
        clinicId: new Types.ObjectId(fromClinicId),
        role: 'doctor',
        isActive: true,
      };

      if (options.doctorIds && options.doctorIds.length > 0) {
        doctorQuery._id = {
          $in: options.doctorIds.map((id) => new Types.ObjectId(id)),
        };
      }

      const doctors = await this.userModel.find(doctorQuery).select('_id');
      const doctorIds = doctors.map((d) => d._id);

      const result = await this.userModel.updateMany(
        doctorQuery,
        {
          $set: {
            clinicId: new Types.ObjectId(options.targetClinicId),
            departmentId: options.targetDepartmentId
              ? new Types.ObjectId(options.targetDepartmentId)
              : null,
          },
        },
        session ? { session } : {},
      );

      doctorsTransferred = result.modifiedCount;

      // Transfer appointments for these doctors
      if (doctorIds.length > 0) {
        const appointmentResult = await this.appointmentModel.updateMany(
          {
            doctorId: { $in: doctorIds },
            clinicId: new Types.ObjectId(fromClinicId),
            status: { $in: ['scheduled', 'confirmed'] },
            appointmentDate: { $gte: new Date() },
            deletedAt: null,
          },
          {
            $set: {
              clinicId: new Types.ObjectId(options.targetClinicId),
            },
          },
          session ? { session } : {},
        );

        appointmentsAffected = appointmentResult.modifiedCount;
      }
    }

    // 3. Transfer staff if requested
    if (options.transferStaff) {
      const staffQuery: any = {
        clinicId: new Types.ObjectId(fromClinicId),
        role: { $nin: ['doctor', 'patient'] },
        isActive: true,
      };

      if (options.staffIds && options.staffIds.length > 0) {
        staffQuery._id = {
          $in: options.staffIds.map((id) => new Types.ObjectId(id)),
        };
      }

      const result = await this.userModel.updateMany(
        staffQuery,
        {
          $set: {
            clinicId: new Types.ObjectId(options.targetClinicId),
            departmentId: options.targetDepartmentId
              ? new Types.ObjectId(options.targetDepartmentId)
              : null,
          },
        },
        session ? { session } : {},
      );

      staffTransferred = result.modifiedCount;
    }

    // 4. Log audit event for staff transfer (if userId provided and transfer occurred)
    if (userId && (doctorsTransferred > 0 || staffTransferred > 0)) {
      // Log after transaction commits, so we do it outside the session
      // This will be called after the transaction in changeStatus
      setImmediate(() => {
        this.auditService.logClinicStaffTransfer(
          fromClinicId,
          options.targetClinicId,
          doctorsTransferred,
          staffTransferred,
          userId,
          '0.0.0.0', // IP address should be passed from controller
        );
      });
    }

    return {
      doctorsTransferred,
      staffTransferred,
      appointmentsAffected,
      errors,
    };
  }

  private assertClinicTenantAccess(clinic: any, requestingUser?: TenantUser) {
    if (!requestingUser || requestingUser.role === 'super_admin') {
      return;
    }

    try {
      assertSameTenant(
        clinic?.subscriptionId,
        requestingUser,
        {
          ar: 'ليس لديك صلاحية للوصول إلى هذه العيادة',
          en: 'You do not have permission to access this clinic',
        },
      );
    } catch {
      throw new ForbiddenException({
        message: {
          ar: 'ليس لديك صلاحية للوصول إلى هذه العيادة',
          en: 'You do not have permission to access this clinic',
        },
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }
  }

  /**
   * Mark appointments for rescheduling
   *
   * @param clinicId - Clinic ID
   * @param session - MongoDB session for transaction
   * @returns Number of appointments marked
   */
  private async markAppointmentsForRescheduling(
    clinicId: string,
    session: any,
  ): Promise<number> {
    const result = await this.appointmentModel.updateMany(
      {
        clinicId: new Types.ObjectId(clinicId),
        status: { $in: ['scheduled', 'confirmed'] },
        appointmentDate: { $gte: new Date() },
        deletedAt: null,
      },
      {
        $set: {
          reschedulingReason: 'Clinic status changed',
          markedForReschedulingAt: new Date(),
        },
      },
      session ? { session } : {},
    );

    return result.modifiedCount;
  }

  /**
   * Send notifications to affected parties
   *
   * @param clinic - Clinic document
   * @param options - Status change options
   * @param results - Transfer results
   * @returns Notification counts
   */
  private async sendNotifications(
    clinic: Clinic,
    options: StatusChangeOptions,
    results: {
      doctorsTransferred: number;
      staffTransferred: number;
      appointmentsAffected: number;
    },
  ): Promise<{ staff: number; patients: number; doctors: number }> {
    // TODO: Implement notification sending
    // This would integrate with notification service
    // For now, return stub values
    return {
      staff: 0,
      patients: 0,
      doctors: 0,
    };
  }
}
