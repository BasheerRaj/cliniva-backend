import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Appointment } from '../../database/schemas/appointment.schema';
import { AppointmentStatus } from '../constants/appointment-status.enum';
import { CompleteAppointmentDto } from '../dto/complete-appointment.dto';
import { RescheduleDto } from '../dto/reschedule.dto';
import { AppointmentConflictService } from '../appointment-conflict.service';
import { AppointmentWorkingHoursService } from './appointment-working-hours.service';

/**
 * Service for managing appointment lifecycle operations
 * Implements tasks 8.2, 8.3, 8.4 from the appointments management spec
 * 
 * Handles:
 * - Completing appointments with doctor notes
 * - Cancelling appointments with reason tracking
 * - Rescheduling appointments with conflict detection
 */
@Injectable()
export class AppointmentLifecycleService {
  private readonly logger = new Logger(AppointmentLifecycleService.name);

  constructor(
    @InjectModel('Appointment')
    private readonly appointmentModel: Model<Appointment>,
    private readonly conflictService: AppointmentConflictService,
    private readonly workingHoursService: AppointmentWorkingHoursService,
  ) {}

  /**
   * Task 8.2: Complete an appointment
   * Requirements: 8.1-8.4, 8.10
   * 
   * - Validate appointment status is "in_progress"
   * - Throw 400 with bilingual error if invalid status
   * - Validate doctorNotes are provided
   * - Change status to "completed"
   * - Record actualEndTime as current timestamp
   * - Store completion notes
   * - Record user who completed the appointment
   * - Add entry to statusHistory
   * - Return updated appointment
   */
  async completeAppointment(
    appointmentId: string,
    dto: CompleteAppointmentDto,
    userId: string,
  ): Promise<Appointment> {
    this.logger.log(`Completing appointment ${appointmentId}`);

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

    // Requirement 8.1: Validate appointment status is "in_progress"
    if (appointment.status !== AppointmentStatus.IN_PROGRESS) {
      throw new BadRequestException({
        message: {
          ar: `لا يمكن إكمال الموعد. الحالة الحالية: "${appointment.status}". يجب أن تكون الحالة "in_progress"`,
          en: `Cannot complete appointment. Current status: "${appointment.status}". Status must be "in_progress"`,
        },
        code: 'INVALID_STATUS_FOR_COMPLETION',
        currentStatus: appointment.status,
      });
    }

    // Requirement 8.2: Validate doctorNotes are provided (already validated by DTO)
    if (!dto.doctorNotes || dto.doctorNotes.trim().length === 0) {
      throw new BadRequestException({
        message: {
          ar: 'ملاحظات الطبيب مطلوبة لإكمال الموعد',
          en: 'Doctor notes are required to complete appointment',
        },
        code: 'DOCTOR_NOTES_REQUIRED',
      });
    }

    // Prepare status history entry
    const statusHistoryEntry = {
      status: AppointmentStatus.COMPLETED,
      changedAt: new Date(),
      changedBy: new Types.ObjectId(userId),
      reason: 'Appointment completed',
    };

    // Requirement 8.3, 8.4: Update appointment with completion data
    const updateData: any = {
      status: AppointmentStatus.COMPLETED,
      actualEndTime: new Date(), // Requirement 8.4
      completionNotes: dto.doctorNotes,
      updatedBy: new Types.ObjectId(userId),
      $push: { statusHistory: statusHistoryEntry },
    };

    // Store additional medical data if provided
    if (dto.diagnosis) {
      updateData.diagnosis = dto.diagnosis;
    }
    if (dto.symptoms) {
      updateData.symptoms = dto.symptoms;
    }
    if (dto.findings) {
      updateData.findings = dto.findings;
    }
    if (dto.procedures) {
      updateData.procedures = dto.procedures;
    }
    if (dto.prescriptions) {
      updateData.prescriptions = dto.prescriptions;
    }
    if (dto.treatmentPlan) {
      updateData.treatmentPlan = dto.treatmentPlan;
    }
    if (dto.followUpRequired !== undefined) {
      updateData.followUpRequired = dto.followUpRequired;
    }
    if (dto.followUpNotes) {
      updateData.followUpNotes = dto.followUpNotes;
    }
    if (dto.followUpDuration) {
      updateData.followUpDuration = dto.followUpDuration;
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
          ar: 'فشل إكمال الموعد',
          en: 'Failed to complete appointment',
        },
        code: 'COMPLETION_FAILED',
      });
    }

    this.logger.log(`Appointment ${appointmentId} completed successfully`);

    return updatedAppointment;
  }

  /**
   * Task 8.3: Cancel an appointment
   * Requirements: 10.1-10.7
   * 
   * - Validate appointment status is not "completed"
   * - Throw 400 with bilingual error if trying to cancel completed appointment
   * - Validate cancellationReason is provided
   * - Change status to "cancelled"
   * - Record cancellationReason
   * - Record cancelledAt timestamp
   * - Record cancelledBy user
   * - Store rescheduleRequested flag if provided
   * - Add entry to statusHistory
   * - Return updated appointment
   */
  async cancelAppointment(
    appointmentId: string,
    reason: string,
    userId: string,
    rescheduleRequested?: boolean,
  ): Promise<Appointment> {
    this.logger.log(`Cancelling appointment ${appointmentId}`);

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

    // Requirement 10.7: Validate appointment status is not "completed"
    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException({
        message: {
          ar: 'لا يمكن إلغاء موعد مكتمل',
          en: 'Cannot cancel a completed appointment',
        },
        code: 'CANNOT_CANCEL_COMPLETED',
        currentStatus: appointment.status,
      });
    }

    // Requirement 10.1: Validate cancellationReason is provided
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException({
        message: {
          ar: 'سبب الإلغاء مطلوب',
          en: 'Cancellation reason is required',
        },
        code: 'CANCELLATION_REASON_REQUIRED',
      });
    }

    // Prepare status history entry
    const statusHistoryEntry = {
      status: AppointmentStatus.CANCELLED,
      changedAt: new Date(),
      changedBy: new Types.ObjectId(userId),
      reason: reason,
    };

    // Requirements 10.2-10.6: Update appointment with cancellation data
    const updateData: any = {
      status: AppointmentStatus.CANCELLED, // Requirement 10.2
      cancellationReason: reason, // Requirement 10.5
      cancelledAt: new Date(), // Requirement 10.3
      cancelledBy: new Types.ObjectId(userId), // Requirement 10.4
      updatedBy: new Types.ObjectId(userId),
      $push: { statusHistory: statusHistoryEntry },
    };

    // Requirement 10.6: Store reschedule preference if provided
    if (rescheduleRequested !== undefined) {
      updateData.rescheduleRequested = rescheduleRequested;
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
          ar: 'فشل إلغاء الموعد',
          en: 'Failed to cancel appointment',
        },
        code: 'CANCELLATION_FAILED',
      });
    }

    this.logger.log(`Appointment ${appointmentId} cancelled successfully`);

    return updatedAppointment;
  }

  /**
   * Task 8.4: Reschedule an appointment
   * Requirements: 11.1-11.9
   * 
   * - Validate appointment status is not "completed"
   * - Throw 400 with bilingual error if trying to reschedule completed appointment
   * - Validate new date and time are provided
   * - Validate new time against working hours
   * - Check for conflicts at new time
   * - Throw 409 with bilingual error if conflicts found
   * - Save original date/time to rescheduleHistory array
   * - Update appointmentDate and appointmentTime
   * - Store reschedule reason if provided
   * - Record rescheduledBy user and timestamp
   * - Return updated appointment
   */
  async rescheduleAppointment(
    appointmentId: string,
    dto: RescheduleDto,
    userId: string,
  ): Promise<Appointment> {
    this.logger.log(`Rescheduling appointment ${appointmentId}`);

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

    // Requirement 11.1, 11.9: Validate appointment status is not "completed"
    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException({
        message: {
          ar: 'لا يمكن إعادة جدولة موعد مكتمل',
          en: 'Cannot reschedule a completed appointment',
        },
        code: 'CANNOT_RESCHEDULE_COMPLETED',
        currentStatus: appointment.status,
      });
    }

    // Requirement 11.2: Validate new date and time are provided (already validated by DTO)
    if (!dto.newDate || !dto.newTime) {
      throw new BadRequestException({
        message: {
          ar: 'التاريخ والوقت الجديدان مطلوبان',
          en: 'New date and time are required',
        },
        code: 'NEW_DATE_TIME_REQUIRED',
      });
    }

    // Validate new date is not in the past
    const now = new Date();
    const newDateTime = new Date(dto.newDate);
    newDateTime.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (newDateTime < today) {
      throw new BadRequestException({
        message: {
          ar: 'لا يمكن إعادة جدولة الموعد إلى تاريخ في الماضي',
          en: 'Cannot reschedule appointment to a past date',
        },
        code: 'PAST_DATE_NOT_ALLOWED',
      });
    }

    // Requirement 11.3: Validate new time against working hours
    try {
      await this.workingHoursService.validateWorkingHours(
        appointment.clinicId.toString(),
        appointment.doctorId.toString(),
        dto.newDate,
        dto.newTime,
        appointment.durationMinutes,
      );
    } catch (error) {
      // Re-throw working hours validation errors
      throw error;
    }

    // Requirement 11.4, 11.5: Check for conflicts at new time
    const conflicts = await this.conflictService.checkConflicts(
      appointment.doctorId.toString(),
      dto.newDate,
      dto.newTime,
      appointment.durationMinutes,
      appointmentId, // Exclude current appointment
    );

    if (conflicts.length > 0) {
      this.conflictService.throwConflictError(conflicts);
    }

    // Requirement 11.6: Save original date/time to rescheduleHistory
    const rescheduleHistoryEntry = {
      previousDate: appointment.appointmentDate,
      previousTime: appointment.appointmentTime,
      newDate: dto.newDate,
      newTime: dto.newTime,
      reason: dto.reason || 'Rescheduled',
      rescheduledAt: new Date(),
      rescheduledBy: new Types.ObjectId(userId),
    };

    // Requirements 11.7, 11.8: Update appointment with new date/time
    const updateData: any = {
      appointmentDate: dto.newDate, // Requirement 11.7
      appointmentTime: dto.newTime, // Requirement 11.7
      updatedBy: new Types.ObjectId(userId),
      $push: { rescheduleHistory: rescheduleHistoryEntry }, // Requirement 11.6
    };

    // Requirement 11.8: Store reschedule reason if provided
    if (dto.reason) {
      updateData.rescheduleReason = dto.reason;
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
          ar: 'فشلت إعادة جدولة الموعد',
          en: 'Failed to reschedule appointment',
        },
        code: 'RESCHEDULE_FAILED',
      });
    }

    this.logger.log(
      `Appointment ${appointmentId} rescheduled from ${appointment.appointmentDate.toISOString().split('T')[0]} ${appointment.appointmentTime} to ${dto.newDate.toISOString().split('T')[0]} ${dto.newTime}`,
    );

    return updatedAppointment;
  }
}
