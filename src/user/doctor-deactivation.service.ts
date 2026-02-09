import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection, ClientSession } from 'mongoose';
import { Appointment } from '../database/schemas/appointment.schema';
import { User } from '../database/schemas/user.schema';
import { EmailService } from '../auth/email.service';
import { AuditService } from '../auth/audit.service';
import { ERROR_MESSAGES } from '../common/utils/error-messages.constant';

/**
 * Options for doctor deactivation
 */
export interface DeactivationOptions {
  transferAppointments: boolean;
  targetDoctorId?: string;
  skipTransfer?: boolean;
  reason: string;
  actorId: string;
}

/**
 * Result of doctor deactivation
 */
export interface DeactivationResult {
  deactivatedDoctor: User;
  appointmentsTransferred: number;
  appointmentsRescheduled: number;
  targetDoctor?: User;
}

/**
 * Result of appointment transfer
 */
export interface TransferResult {
  transferred: number;
  failed: number;
  errors: string[];
}

/**
 * Service for handling doctor deactivation with appointment transfer or rescheduling
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */
@Injectable()
export class DoctorDeactivationService {
  private readonly logger = new Logger(DoctorDeactivationService.name);

  constructor(
    @InjectModel(Appointment.name)
    private appointmentModel: Model<Appointment>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectConnection() private connection: Connection,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get future appointments for a doctor
   * Requirement 7.1: Identify all appointments with appointmentDate >= today
   */
  async getFutureAppointments(doctorId: string): Promise<Appointment[]> {
    try {
      this.logger.log(`Getting future appointments for doctor: ${doctorId}`);

      // Validate doctorId
      if (!Types.ObjectId.isValid(doctorId)) {
        throw new BadRequestException({
          message: {
            ar: 'معرف الطبيب غير صالح',
            en: 'Invalid doctor ID',
          },
          code: 'INVALID_DOCTOR_ID',
        });
      }

      // Get today's date at midnight
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Query future appointments
      const appointments = await this.appointmentModel
        .find({
          doctorId: new Types.ObjectId(doctorId),
          appointmentDate: { $gte: today },
          status: { $in: ['scheduled', 'confirmed'] },
          deletedAt: null,
        })
        .populate('patientId', 'firstName lastName email preferredLanguage')
        .populate('serviceId', 'name')
        .sort({ appointmentDate: 1, appointmentTime: 1 })
        .exec();

      this.logger.log(
        `Found ${appointments.length} future appointments for doctor ${doctorId}`,
      );

      return appointments;
    } catch (error) {
      this.logger.error(
        `Error getting future appointments for doctor ${doctorId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Transfer appointments from one doctor to another
   * Requirements: 7.2, 7.3, 7.4, 7.6
   */
  async transferAppointments(
    fromDoctorId: string,
    toDoctorId: string,
    appointmentIds: string[],
    actorId: string,
  ): Promise<TransferResult> {
    const session: ClientSession = await this.connection.startSession();
    session.startTransaction();

    try {
      this.logger.log(
        `Transferring ${appointmentIds.length} appointments from doctor ${fromDoctorId} to ${toDoctorId}`,
      );

      // Validate IDs
      if (!Types.ObjectId.isValid(fromDoctorId)) {
        throw new BadRequestException({
          message: {
            ar: 'معرف الطبيب المصدر غير صالح',
            en: 'Invalid source doctor ID',
          },
          code: 'INVALID_SOURCE_DOCTOR_ID',
        });
      }

      if (!Types.ObjectId.isValid(toDoctorId)) {
        throw new BadRequestException({
          message: {
            ar: 'معرف الطبيب الهدف غير صالح',
            en: 'Invalid target doctor ID',
          },
          code: 'INVALID_TARGET_DOCTOR_ID',
        });
      }

      // Validate target doctor exists and is active
      const targetDoctor = await this.userModel
        .findById(toDoctorId)
        .session(session)
        .exec();

      if (!targetDoctor) {
        throw new NotFoundException({
          message: {
            ar: 'الطبيب الهدف غير موجود',
            en: 'Target doctor not found',
          },
          code: 'TARGET_DOCTOR_NOT_FOUND',
        });
      }

      if (!targetDoctor.isActive) {
        throw new BadRequestException({
          message: {
            ar: 'الطبيب الهدف غير نشط',
            en: 'Target doctor is not active',
          },
          code: 'TARGET_DOCTOR_INACTIVE',
        });
      }

      const result: TransferResult = {
        transferred: 0,
        failed: 0,
        errors: [],
      };

      // Transfer each appointment
      for (const appointmentId of appointmentIds) {
        try {
          if (!Types.ObjectId.isValid(appointmentId)) {
            result.failed++;
            result.errors.push(`Invalid appointment ID: ${appointmentId}`);
            continue;
          }

          const appointment = await this.appointmentModel
            .findById(appointmentId)
            .populate('patientId', 'firstName lastName email preferredLanguage')
            .session(session)
            .exec();

          if (!appointment) {
            result.failed++;
            result.errors.push(`Appointment not found: ${appointmentId}`);
            continue;
          }

          // Update appointment with transfer details
          appointment.transferredFrom = new Types.ObjectId(fromDoctorId);
          appointment.doctorId = new Types.ObjectId(toDoctorId);
          appointment.transferredAt = new Date();
          appointment.transferredBy = new Types.ObjectId(actorId);
          appointment.updatedBy = new Types.ObjectId(actorId);

          await appointment.save({ session });

          // Send email notification to patient
          await this.sendTransferNotification(
            appointment,
            targetDoctor,
            session,
          );

          result.transferred++;
        } catch (error) {
          this.logger.error(
            `Error transferring appointment ${appointmentId}:`,
            error,
          );
          result.failed++;
          result.errors.push(
            `Failed to transfer appointment ${appointmentId}: ${error.message}`,
          );
        }
      }

      // Log audit trail
      await this.auditService.logSecurityEvent(
        {
          eventType: 'appointments_transferred',
          userId: fromDoctorId,
          actorId,
          ipAddress: 'system',
          userAgent: 'system',
          metadata: {
            fromDoctorId,
            toDoctorId,
            appointmentIds,
            transferred: result.transferred,
            failed: result.failed,
          },
          timestamp: new Date(),
        },
        session,
      );

      await session.commitTransaction();

      this.logger.log(
        `Transfer complete: ${result.transferred} succeeded, ${result.failed} failed`,
      );

      return result;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error('Error transferring appointments:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Mark appointments for rescheduling
   * Requirements: 7.2, 7.4
   */
  async markForRescheduling(
    doctorId: string,
    appointmentIds: string[],
    reason: string,
    actorId: string,
  ): Promise<void> {
    const session: ClientSession = await this.connection.startSession();
    session.startTransaction();

    try {
      this.logger.log(
        `Marking ${appointmentIds.length} appointments for rescheduling for doctor ${doctorId}`,
      );

      // Validate doctorId
      if (!Types.ObjectId.isValid(doctorId)) {
        throw new BadRequestException({
          message: {
            ar: 'معرف الطبيب غير صالح',
            en: 'Invalid doctor ID',
          },
          code: 'INVALID_DOCTOR_ID',
        });
      }

      for (const appointmentId of appointmentIds) {
        if (!Types.ObjectId.isValid(appointmentId)) {
          this.logger.warn(`Invalid appointment ID: ${appointmentId}`);
          continue;
        }

        const appointment = await this.appointmentModel
          .findById(appointmentId)
          .populate('patientId', 'firstName lastName email preferredLanguage')
          .session(session)
          .exec();

        if (!appointment) {
          this.logger.warn(`Appointment not found: ${appointmentId}`);
          continue;
        }

        // Update appointment with rescheduling details
        appointment.rescheduledReason = reason;
        appointment.rescheduledAt = new Date();
        appointment.updatedBy = new Types.ObjectId(actorId);

        await appointment.save({ session });

        // Send email notification to patient
        await this.sendReschedulingNotification(appointment, reason, session);
      }

      // Log audit trail
      await this.auditService.logSecurityEvent(
        {
          eventType: 'appointments_marked_for_rescheduling',
          userId: doctorId,
          actorId,
          ipAddress: 'system',
          userAgent: 'system',
          metadata: {
            doctorId,
            appointmentIds,
            reason,
          },
          timestamp: new Date(),
        },
        session,
      );

      await session.commitTransaction();

      this.logger.log(
        `Marked ${appointmentIds.length} appointments for rescheduling`,
      );
    } catch (error) {
      await session.abortTransaction();
      this.logger.error('Error marking appointments for rescheduling:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Deactivate doctor with appointment handling
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
   */
  async deactivateDoctor(
    doctorId: string,
    options: DeactivationOptions,
  ): Promise<DeactivationResult> {
    const session: ClientSession = await this.connection.startSession();
    session.startTransaction();

    try {
      this.logger.log(`Deactivating doctor ${doctorId} with options:`, options);

      // Validate doctorId
      if (!Types.ObjectId.isValid(doctorId)) {
        throw new BadRequestException({
          message: {
            ar: 'معرف الطبيب غير صالح',
            en: 'Invalid doctor ID',
          },
          code: 'INVALID_DOCTOR_ID',
        });
      }

      // Get doctor
      const doctor = await this.userModel
        .findById(doctorId)
        .session(session)
        .exec();

      if (!doctor) {
        throw new NotFoundException({
          message: ERROR_MESSAGES.USER_NOT_FOUND,
          code: 'USER_NOT_FOUND',
        });
      }

      // Check if doctor has future appointments
      const futureAppointments = await this.getFutureAppointments(doctorId);

      if (futureAppointments.length > 0 && !options.skipTransfer) {
        // Requirement 7.5: Prevent deactivation if appointments not handled
        throw new BadRequestException({
          message: {
            ar: 'لا يمكن إلغاء تنشيط الطبيب الذي لديه مواعيد مستقبلية. يرجى نقل أو إعادة جدولة المواعيد أولاً.',
            en: 'Cannot deactivate doctor with future appointments. Please transfer or reschedule appointments first.',
          },
          code: 'DOCTOR_HAS_FUTURE_APPOINTMENTS',
          details: {
            appointmentCount: futureAppointments.length,
            appointments: futureAppointments.map((apt) => ({
              id: apt._id,
              date: apt.appointmentDate,
              time: apt.appointmentTime,
            })),
          },
        });
      }

      const result: DeactivationResult = {
        deactivatedDoctor: doctor,
        appointmentsTransferred: 0,
        appointmentsRescheduled: 0,
      };

      // Handle appointments if requested
      if (futureAppointments.length > 0) {
        const appointmentIds = futureAppointments.map((apt) =>
          (apt._id as Types.ObjectId).toString(),
        );

        if (options.transferAppointments && options.targetDoctorId) {
          // Transfer appointments to target doctor
          const transferResult = await this.transferAppointments(
            doctorId,
            options.targetDoctorId,
            appointmentIds,
            options.actorId,
          );

          result.appointmentsTransferred = transferResult.transferred;

          // Get target doctor for result
          const targetDoctor = await this.userModel
            .findById(options.targetDoctorId)
            .session(session)
            .exec();
          if (targetDoctor) {
            result.targetDoctor = targetDoctor;
          }
        } else {
          // Mark appointments for rescheduling
          await this.markForRescheduling(
            doctorId,
            appointmentIds,
            options.reason,
            options.actorId,
          );

          result.appointmentsRescheduled = appointmentIds.length;
        }
      }

      // Deactivate doctor
      doctor.isActive = false;
      doctor.deactivatedAt = new Date();
      doctor.deactivatedBy = new Types.ObjectId(options.actorId);

      await doctor.save({ session });

      // Log audit trail
      await this.auditService.logSecurityEvent(
        {
          eventType: 'user_deactivated',
          userId: doctorId,
          actorId: options.actorId,
          ipAddress: 'system',
          userAgent: 'system',
          metadata: {
            reason: options.reason,
            appointmentsTransferred: result.appointmentsTransferred,
            appointmentsRescheduled: result.appointmentsRescheduled,
            targetDoctorId: options.targetDoctorId,
          },
          timestamp: new Date(),
        },
        session,
      );

      await session.commitTransaction();

      this.logger.log(`Doctor ${doctorId} deactivated successfully`);

      return result;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error(`Error deactivating doctor ${doctorId}:`, error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Send transfer notification email to patient
   * Requirement 7.4: Notify affected patients via email
   */
  private async sendTransferNotification(
    appointment: Appointment,
    targetDoctor: User,
    session: ClientSession,
  ): Promise<void> {
    try {
      const patient = appointment.patientId as any;
      const language = patient.preferredLanguage || 'en';

      await this.emailService.sendAppointmentNotification(
        patient.email,
        {
          patientName: `${patient.firstName} ${patient.lastName}`,
          doctorName: `${targetDoctor.firstName} ${targetDoctor.lastName}`,
          appointmentDate: appointment.appointmentDate,
          appointmentTime: appointment.appointmentTime,
          serviceName: (appointment.serviceId as any)?.name || 'N/A',
        },
        'transferred',
        language,
        session,
      );
    } catch (error) {
      this.logger.error(
        `Error sending transfer notification for appointment ${appointment._id}:`,
        error,
      );
      // Don't throw - email failure shouldn't block the transfer
    }
  }

  /**
   * Send rescheduling notification email to patient
   * Requirement 7.4: Notify affected patients via email
   */
  private async sendReschedulingNotification(
    appointment: Appointment,
    reason: string,
    session: ClientSession,
  ): Promise<void> {
    try {
      const patient = appointment.patientId as any;
      const language = patient.preferredLanguage || 'en';

      await this.emailService.sendAppointmentNotification(
        patient.email,
        {
          patientName: `${patient.firstName} ${patient.lastName}`,
          appointmentDate: appointment.appointmentDate,
          appointmentTime: appointment.appointmentTime,
          serviceName: (appointment.serviceId as any)?.name || 'N/A',
          reason,
        },
        'rescheduled',
        language,
        session,
      );
    } catch (error) {
      this.logger.error(
        `Error sending rescheduling notification for appointment ${appointment._id}:`,
        error,
      );
      // Don't throw - email failure shouldn't block the marking
    }
  }
}
