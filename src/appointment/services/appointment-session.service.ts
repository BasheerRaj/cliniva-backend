import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Appointment } from '../../database/schemas/appointment.schema';
import { Service } from '../../database/schemas/service.schema';
import { ProcessedSession } from '../../service/interfaces/processed-session.interface';
import {
  AppointmentWithSession,
  SessionInfo,
} from '../interfaces/appointment-with-session.interface';
import { SESSION_ERROR_MESSAGES } from '../constants/session-error-messages.constant';
import {
  SessionProgressDto,
  SessionProgressItemDto,
} from '../dto/session-progress.dto';
import { BatchBookSessionsDto } from '../dto/batch-book-sessions.dto';
import {
  BatchBookingFailure,
  BatchBookingResult,
} from '../interfaces/batch-booking-result.interface';

/**
 * AppointmentSessionService
 *
 * Handles all session-specific appointment logic:
 *  - Validates that a sessionId references a real session in the service
 *  - Prevents duplicate active bookings for the same patient-session pair
 *  - Prevents rebooking of completed sessions
 *  - Resolves the effective duration for a session (explicit or inherited)
 *  - Populates session info onto appointment responses
 *
 * Requirements: 2.1, 2.2, 3.4, 3.5, 4.1-4.4, 5.1-5.4, 6.4, 6.5
 */
@Injectable()
export class AppointmentSessionService {
  private readonly logger = new Logger(AppointmentSessionService.name);

  constructor(
    @InjectModel('Appointment')
    private readonly appointmentModel: Model<Appointment>,
    @InjectModel('Service')
    private readonly serviceModel: Model<Service>,
  ) {}

  // =========================================================================
  // 5.1 – validateSessionReference
  // =========================================================================

  /**
   * Verifies that the given sessionId exists inside the service's sessions array.
   *
   * Throws:
   *  - NotFoundException   → service does not exist
   *  - BadRequestException → service has no sessions
   *  - BadRequestException → sessionId not found in service sessions
   *
   * Requirements: 3.4, 6.4, 6.5
   */
  async validateSessionReference(
    serviceId: string,
    sessionId: string,
  ): Promise<void> {
    this.logger.debug(
      `Validating session reference: service=${serviceId}, session=${sessionId}`,
    );

    const service = await this.serviceModel.findById(serviceId);

    if (!service) {
      throw new NotFoundException({
        message: SESSION_ERROR_MESSAGES.SERVICE_NOT_FOUND,
        code: 'SERVICE_NOT_FOUND',
      });
    }

    if (!service.sessions || service.sessions.length === 0) {
      throw new BadRequestException({
        message: SESSION_ERROR_MESSAGES.SERVICE_HAS_NO_SESSIONS,
        code: 'SERVICE_HAS_NO_SESSIONS',
      });
    }

    const session = service.sessions.find((s) => s._id === sessionId);

    if (!session) {
      throw new BadRequestException({
        message: SESSION_ERROR_MESSAGES.INVALID_SESSION_ID,
        code: 'INVALID_SESSION_ID',
        details: {
          serviceId,
          sessionId,
          availableSessions: service.sessions.map((s) => ({
            id: s._id,
            name: s.name,
            order: s.order,
          })),
        },
      });
    }

    this.logger.debug(`Session reference validated: session "${session.name}" (order ${session.order})`);
  }

  // =========================================================================
  // 5.2 – checkDuplicateSessionBooking
  // =========================================================================

  /**
   * Ensures the patient does not already have an active appointment for this
   * specific session.  Active = status NOT IN ['cancelled', 'no_show'].
   *
   * Throws ConflictException with bilingual error and appointment details if
   * a duplicate is found.
   *
   * Requirements: 4.1, 4.2, 4.3, 4.4
   */
  async checkDuplicateSessionBooking(
    patientId: string,
    serviceId: string,
    sessionId: string,
  ): Promise<void> {
    this.logger.debug(
      `Checking duplicate session booking: patient=${patientId}, service=${serviceId}, session=${sessionId}`,
    );

    const existing = await this.appointmentModel.findOne({
      patientId: new Types.ObjectId(patientId),
      serviceId: new Types.ObjectId(serviceId),
      sessionId,
      status: { $nin: ['cancelled', 'no_show'] },
      isDeleted: { $ne: true },
    });

    if (existing) {
      throw new ConflictException({
        message: SESSION_ERROR_MESSAGES.DUPLICATE_SESSION_BOOKING,
        code: 'DUPLICATE_SESSION_BOOKING',
        details: {
          patientId,
          serviceId,
          sessionId,
          existingAppointmentId: (existing._id as Types.ObjectId).toString(),
          existingAppointmentStatus: existing.status,
          existingAppointmentDate: existing.appointmentDate,
          existingAppointmentTime: existing.appointmentTime,
        },
      });
    }

    this.logger.debug('No duplicate session booking found');
  }

  // =========================================================================
  // 5.3 – checkCompletedSessionRebooking
  // =========================================================================

  /**
   * Prevents a patient from rebooking a session they have already completed.
   *
   * Throws ConflictException with bilingual error and completed-appointment
   * details if the patient has a 'completed' appointment for this session.
   *
   * Requirements: 5.1, 5.2, 5.3, 5.4
   */
  async checkCompletedSessionRebooking(
    patientId: string,
    serviceId: string,
    sessionId: string,
  ): Promise<void> {
    this.logger.debug(
      `Checking completed session rebooking: patient=${patientId}, service=${serviceId}, session=${sessionId}`,
    );

    const completed = await this.appointmentModel.findOne({
      patientId: new Types.ObjectId(patientId),
      serviceId: new Types.ObjectId(serviceId),
      sessionId,
      status: 'completed',
      isDeleted: { $ne: true },
    });

    if (completed) {
      throw new ConflictException({
        message: SESSION_ERROR_MESSAGES.COMPLETED_SESSION_REBOOKING,
        code: 'COMPLETED_SESSION_REBOOKING',
        details: {
          patientId,
          serviceId,
          sessionId,
          completedAppointmentId: (completed._id as Types.ObjectId).toString(),
          completedDate: completed.appointmentDate,
        },
      });
    }

    this.logger.debug('No completed session found — rebooking allowed');
  }

  // =========================================================================
  // 5.4 – getSessionDuration
  // =========================================================================

  /**
   * Returns the effective duration for an appointment booking:
   *  - Uses session.duration when explicitly set
   *  - Falls back to serviceDefaultDuration when session duration is absent
   *
   * Requirements: 2.1, 2.2
   */
  getSessionDuration(
    session: ProcessedSession,
    serviceDefaultDuration: number,
  ): number {
    return session.duration || serviceDefaultDuration;
  }

  // =========================================================================
  // 5.6 – batchBookSessions
  // =========================================================================

  /**
   * Atomically books multiple sessions for a patient in a single request.
   *
   * Flow:
   *  1. Validate service exists and has sessions
   *  2. Validate each session booking independently (reference, duplicate, completed)
   *  3. If ANY validation fails → throw BatchBookingFailed with per-session details
   *  4. If ALL pass → bulk-insert appointments inside a MongoDB transaction
   *
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
   */
  async batchBookSessions(
    dto: BatchBookSessionsDto,
    createdByUserId: string,
  ): Promise<BatchBookingResult> {
    const { patientId, doctorId, serviceId, clinicId, sessionBookings } = dto;

    this.logger.debug(
      `Batch booking: patient=${patientId}, service=${serviceId}, sessions=${sessionBookings.length}`,
    );

    const service = await this.serviceModel.findById(serviceId);

    if (!service) {
      throw new NotFoundException({
        message: SESSION_ERROR_MESSAGES.SERVICE_NOT_FOUND,
        code: 'SERVICE_NOT_FOUND',
      });
    }

    if (!service.sessions || service.sessions.length === 0) {
      throw new BadRequestException({
        message: SESSION_ERROR_MESSAGES.SERVICE_HAS_NO_SESSIONS,
        code: 'SERVICE_HAS_NO_SESSIONS',
      });
    }

    // Validate each booking independently, collecting all failures before deciding
    const failures: BatchBookingFailure[] = [];

    for (const booking of sessionBookings) {
      try {
        await this.validateSessionReference(serviceId, booking.sessionId);
        await this.checkDuplicateSessionBooking(
          patientId,
          serviceId,
          booking.sessionId,
        );
        await this.checkCompletedSessionRebooking(
          patientId,
          serviceId,
          booking.sessionId,
        );
      } catch (err) {
        failures.push({
          sessionId: booking.sessionId,
          appointmentDate: booking.appointmentDate,
          appointmentTime: booking.appointmentTime,
          error: {
            code: err.response?.code || 'VALIDATION_ERROR',
            message: err.response?.message || {
              ar: 'خطأ في التحقق',
              en: 'Validation error',
            },
          },
        });
      }
    }

    if (failures.length > 0) {
      throw new BadRequestException({
        message: SESSION_ERROR_MESSAGES.BATCH_BOOKING_FAILED,
        code: 'BATCH_BOOKING_FAILED',
        details: {
          totalRequested: sessionBookings.length,
          successCount: 0,
          failureCount: failures.length,
          failures,
        },
      });
    }

    // All validations passed — bulk-insert within a transaction
    const dbSession = await this.appointmentModel.db.startSession();
    dbSession.startTransaction();

    try {
      const appointmentDocs = sessionBookings.map((booking) => {
        const sess = service.sessions!.find((s) => s._id === booking.sessionId);
        const duration = sess?.duration ?? service.durationMinutes;

        return {
          patientId: new Types.ObjectId(patientId),
          doctorId: new Types.ObjectId(doctorId),
          serviceId: new Types.ObjectId(serviceId),
          clinicId: new Types.ObjectId(clinicId),
          sessionId: booking.sessionId,
          appointmentDate: booking.appointmentDate,
          appointmentTime: booking.appointmentTime,
          durationMinutes: duration,
          status: 'scheduled',
          createdBy: new Types.ObjectId(createdByUserId),
        };
      });

      const created = await this.appointmentModel.insertMany(appointmentDocs, {
        session: dbSession,
      });

      await dbSession.commitTransaction();

      this.logger.debug(
        `Batch booking committed: ${created.length} appointments created`,
      );

      return {
        totalRequested: sessionBookings.length,
        successCount: created.length,
        failureCount: 0,
        appointments: created as unknown as Appointment[],
      };
    } catch (err) {
      await dbSession.abortTransaction();
      this.logger.error(
        'Batch booking insert failed — transaction rolled back',
        err,
      );
      throw err;
    } finally {
      await dbSession.endSession();
    }
  }

  // =========================================================================
  // 5.6 – getSessionProgress
  // =========================================================================

  /**
   * Returns a patient's progress through all sessions of a service.
   *
   * - Sessions with no appointment are included with status 'not_booked'
   * - Cancelled / no_show appointments are NOT counted as completed
   * - Sessions are ordered by their order field ascending
   * - completionPercentage = round((completedSessions / totalSessions) * 100)
   *
   * Requirements: 10.1, 10.2, 10.3, 10.4, 14.4
   */
  async getSessionProgress(
    patientId: string,
    serviceId: string,
  ): Promise<SessionProgressDto> {
    this.logger.debug(
      `Getting session progress: patient=${patientId}, service=${serviceId}`,
    );

    const service = await this.serviceModel.findById(serviceId);

    if (!service) {
      throw new NotFoundException({
        message: SESSION_ERROR_MESSAGES.SERVICE_NOT_FOUND,
        code: 'SERVICE_NOT_FOUND',
      });
    }

    if (!service.sessions || service.sessions.length === 0) {
      throw new BadRequestException({
        message: SESSION_ERROR_MESSAGES.SERVICE_HAS_NO_SESSIONS,
        code: 'SERVICE_HAS_NO_SESSIONS',
      });
    }

    const appointments = await this.appointmentModel.find({
      patientId: new Types.ObjectId(patientId),
      serviceId: new Types.ObjectId(serviceId),
      isDeleted: { $ne: true },
    });

    // Status priority: higher number wins when a session has multiple appointments
    const STATUS_PRIORITY: Record<string, number> = {
      completed: 6,
      in_progress: 5,
      confirmed: 4,
      scheduled: 3,
      no_show: 2,
      cancelled: 1,
    };

    const appointmentMap = new Map<string, Appointment>();
    for (const appt of appointments) {
      if (!appt.sessionId) continue;
      const existing = appointmentMap.get(appt.sessionId);
      if (!existing) {
        appointmentMap.set(appt.sessionId, appt);
      } else {
        const newPriority = STATUS_PRIORITY[appt.status] ?? 0;
        const existingPriority = STATUS_PRIORITY[existing.status] ?? 0;
        if (newPriority > existingPriority) {
          appointmentMap.set(appt.sessionId, appt);
        }
      }
    }

    const sortedSessions = [...service.sessions].sort(
      (a, b) => a.order - b.order,
    );

    const sessionItems: SessionProgressItemDto[] = sortedSessions.map(
      (session) => {
        const appt = appointmentMap.get(session._id);
        return {
          sessionId: session._id,
          sessionName: session.name,
          sessionOrder: session.order,
          appointmentId: appt
            ? (appt._id as Types.ObjectId).toString()
            : undefined,
          status: appt ? appt.status : 'not_booked',
          appointmentDate: appt?.appointmentDate,
          appointmentTime: appt?.appointmentTime,
          isCompleted: appt?.status === 'completed',
        };
      },
    );

    const completedSessions = sessionItems.filter((s) => s.isCompleted).length;
    const totalSessions = sortedSessions.length;
    const completionPercentage =
      totalSessions > 0
        ? Math.round((completedSessions / totalSessions) * 100)
        : 0;

    this.logger.debug(
      `Session progress: ${completedSessions}/${totalSessions} (${completionPercentage}%)`,
    );

    return {
      patientId,
      serviceId,
      serviceName: service.name,
      totalSessions,
      completedSessions,
      completionPercentage,
      sessions: sessionItems,
    };
  }

  // =========================================================================
  // 5.5 – populateSessionInfo / enrichAppointmentWithSession
  // =========================================================================

  /**
   * Controller-friendly helper: fetches the service by ID from the appointment
   * and delegates to populateSessionInfo.  Returns { appointment } unchanged
   * when the appointment has no sessionId or when the service is not found.
   *
   * Requirement: 3.5
   */
  async enrichAppointmentWithSession(
    appointment: Appointment,
  ): Promise<AppointmentWithSession> {
    if (!appointment.sessionId) {
      return { appointment };
    }
    const serviceId = (appointment as any).serviceId;
    if (!serviceId) {
      return { appointment };
    }
    const service = await this.serviceModel.findById(serviceId);
    if (!service) {
      return { appointment };
    }
    return this.populateSessionInfo(appointment, service);
  }

  /**
   * Enriches an appointment document with session metadata from the service.
   *
   * Returns an AppointmentWithSession where:
   *  - sessionInfo is populated when the appointment has a valid sessionId
   *  - sessionInfo is undefined for appointments without sessionId (backward
   *    compatibility) or when the session is no longer present in the service
   *
   * Requirement: 3.5
   */
  async populateSessionInfo(
    appointment: Appointment,
    service: Service,
  ): Promise<AppointmentWithSession> {
    if (!appointment.sessionId) {
      this.logger.debug('Appointment has no sessionId — skipping session population');
      return { appointment };
    }

    const session = service.sessions?.find((s) => s._id === appointment.sessionId);

    if (!session) {
      this.logger.warn(
        `Session ${appointment.sessionId} not found in service ${service._id} — returning appointment without session info`,
      );
      return { appointment };
    }

    const sessionInfo: SessionInfo = {
      sessionId: session._id,
      name: session.name,
      duration: session.duration ?? service.durationMinutes,
      order: session.order,
    };

    this.logger.debug(`Session info populated: "${session.name}" (order ${session.order})`);
    return { appointment, sessionInfo };
  }
}
