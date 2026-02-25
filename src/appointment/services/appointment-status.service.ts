import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Appointment } from '../../database/schemas/appointment.schema';
import {
  AppointmentStatus,
  isValidStatusTransition,
} from '../constants/appointment-status.enum';

/**
 * Service for managing appointment status transitions and validations
 * Implements tasks 7.3 and 7.4 from the appointments management spec
 */
@Injectable()
export class AppointmentStatusService {
  private readonly logger = new Logger(AppointmentStatusService.name);

  constructor(
    @InjectModel('Appointment')
    private readonly appointmentModel: Model<Appointment>,
  ) {}

  /**
   * Task 7.4: Validate status-specific requirements
   * Requirements: 6.2, 6.3
   * 
   * - Require completionNotes for status "completed"
   * - Require cancellationReason for status "cancelled"
   * - Throw 400 with bilingual error if required fields missing
   */
  validateStatusSpecificRequirements(
    newStatus: AppointmentStatus,
    metadata?: {
      completionNotes?: string;
      cancellationReason?: string;
      notes?: string;
      reason?: string;
    },
  ): void {
    // Requirement 6.2: Completion requires notes
    if (newStatus === AppointmentStatus.COMPLETED) {
      const completionNotes = metadata?.completionNotes || metadata?.notes;
      if (!completionNotes || completionNotes.trim().length === 0) {
        throw new BadRequestException({
          message: {
            ar: 'ملاحظات الإكمال مطلوبة عند إكمال الموعد',
            en: 'Completion notes are required when marking appointment as completed',
          },
          code: 'COMPLETION_NOTES_REQUIRED',
        });
      }
    }

    // Requirement 6.3: Cancellation requires reason
    if (newStatus === AppointmentStatus.CANCELLED) {
      const cancellationReason =
        metadata?.cancellationReason || metadata?.reason;
      if (!cancellationReason || cancellationReason.trim().length === 0) {
        throw new BadRequestException({
          message: {
            ar: 'سبب الإلغاء مطلوب عند إلغاء الموعد',
            en: 'Cancellation reason is required when cancelling appointment',
          },
          code: 'CANCELLATION_REASON_REQUIRED',
        });
      }
    }
  }

  /**
   * Task 7.3: Change appointment status with validation
   * Requirements: 6.1-6.12
   * 
   * - Validate current status to new status transition using isValidStatusTransition
   * - Throw 400 with bilingual error if invalid transition
   * - Validate required metadata for specific statuses (call task 7.4 validation)
   * - Update appointment status
   * - Add entry to statusHistory array
   * - Record changedBy user and timestamp
   * - Save and return updated appointment
   */
  async changeStatus(
    appointmentId: string,
    newStatus: AppointmentStatus,
    userId: string,
    metadata?: {
      completionNotes?: string;
      cancellationReason?: string;
      notes?: string;
      reason?: string;
    },
  ): Promise<Appointment> {
    this.logger.log(
      `Changing status for appointment ${appointmentId} to ${newStatus}`,
    );

    // Validate appointment ID format
    if (!Types.ObjectId.isValid(appointmentId)) {
      throw new BadRequestException({
        message: {
          ar: 'معرف الموعد غير صالح',
          en: 'Invalid appointment ID format',
        },
        code: 'INVALID_APPOINTMENT_ID',
      });
    }

    // Get current appointment
    const appointment = await this.appointmentModel
      .findOne({
        _id: new Types.ObjectId(appointmentId),
        deletedAt: { $exists: false },
      })
      .exec();

    if (!appointment) {
      throw new BadRequestException({
        message: {
          ar: 'الموعد غير موجود',
          en: 'Appointment not found',
        },
        code: 'APPOINTMENT_NOT_FOUND',
      });
    }

    const currentStatus = appointment.status as AppointmentStatus;

    // Requirement 6.12: Validate status transition using isValidStatusTransition
    if (!isValidStatusTransition(currentStatus, newStatus)) {
      throw new BadRequestException({
        message: {
          ar: `لا يمكن تغيير حالة الموعد من "${currentStatus}" إلى "${newStatus}"`,
          en: `Cannot change appointment status from "${currentStatus}" to "${newStatus}"`,
        },
        code: 'INVALID_STATUS_TRANSITION',
        currentStatus,
        requestedStatus: newStatus,
      });
    }

    // Task 7.4: Validate status-specific requirements (Requirements 6.2, 6.3)
    this.validateStatusSpecificRequirements(newStatus, metadata);

    // Prepare status history entry (Requirements 6.5, 6.6)
    const statusHistoryEntry = {
      status: newStatus,
      changedAt: new Date(),
      changedBy: new Types.ObjectId(userId),
      reason: metadata?.reason || metadata?.cancellationReason || undefined,
    };

    // Prepare update data
    const updateData: any = {
      status: newStatus,
      updatedBy: new Types.ObjectId(userId),
      $push: { statusHistory: statusHistoryEntry },
    };

    // Add status-specific fields
    if (newStatus === AppointmentStatus.COMPLETED && metadata?.completionNotes) {
      updateData.completionNotes = metadata.completionNotes;
    }

    if (newStatus === AppointmentStatus.CANCELLED) {
      updateData.cancellationReason =
        metadata?.cancellationReason || metadata?.reason;
      updateData.cancelledAt = new Date();
      updateData.cancelledBy = new Types.ObjectId(userId);
    }

    // Update appointment
    const updatedAppointment = await this.appointmentModel
      .findByIdAndUpdate(appointmentId, updateData, {
        new: true,
        runValidators: true,
      })
      .populate('patientId', 'firstName lastName phone email')
      .populate('doctorId', 'firstName lastName email')
      .populate('clinicId', 'name address')
      .populate('serviceId', 'name durationMinutes price')
      .populate('departmentId', 'name')
      .exec();

    if (!updatedAppointment) {
      throw new BadRequestException({
        message: {
          ar: 'فشل تحديث حالة الموعد',
          en: 'Failed to update appointment status',
        },
        code: 'STATUS_UPDATE_FAILED',
      });
    }

    this.logger.log(
      `Appointment ${appointmentId} status changed from ${currentStatus} to ${newStatus}`,
    );

    return updatedAppointment;
  }
}
