import {
  Injectable,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Appointment } from '../../database/schemas/appointment.schema';
import { ServiceSessionDto } from '../dto/service-session.dto';
import { ProcessedSession } from '../interfaces/processed-session.interface';
import { SessionValidationService } from '../../appointment/services/session-validation.service';
import { SESSION_ERROR_MESSAGES } from '../../appointment/constants/session-error-messages.constant';

/**
 * SessionManagerService
 *
 * Manages session lifecycle within the Service domain:
 *  - Validates and processes raw session input during service create/update
 *  - Auto-generates names for unnamed sessions
 *  - Normalises sessions (duration inheritance, sort by order, assign _id)
 *  - Guards against removing sessions that have active appointments
 *  - Provides a simple session lookup helper
 *
 * Requirements: 1.1-1.7, 2.2, 3.4, 6.1-6.3, 13.1-13.4, 14.1
 */
@Injectable()
export class SessionManagerService {
  private readonly logger = new Logger(SessionManagerService.name);

  constructor(
    private readonly sessionValidationService: SessionValidationService,
    @InjectModel('Appointment')
    private readonly appointmentModel: Model<Appointment>,
  ) {}

  // =========================================================================
  // 4.1 – validateAndProcessSessions
  // =========================================================================

  /**
   * Full pipeline for session input received during service create/update:
   *  1. Validate structure (delegates to SessionValidationService)
   *  2. Auto-generate names for sessions that have none
   *  3. Normalise (resolve duration inheritance, sort by order, assign _id)
   *
   * Returns the array of ProcessedSession objects ready for persistence.
   *
   * Requirements: 1.1-1.7, 6.1-6.3
   */
  validateAndProcessSessions(
    sessions: ServiceSessionDto[],
    serviceDefaultDuration: number,
  ): ProcessedSession[] {
    this.logger.debug(
      `Processing ${sessions.length} sessions (default duration: ${serviceDefaultDuration}min)`,
    );

    // Step 1 – structural validation (throws on any violation)
    this.sessionValidationService.validateSessionStructure(sessions);

    // Step 2 – ensure every session has a name
    const namedSessions = this.autoGenerateSessionNames(sessions);

    // Step 3 – normalise and return
    const processed = this.normalizeSessions(namedSessions, serviceDefaultDuration);

    this.logger.debug(`Sessions processed successfully: ${processed.length} sessions`);
    return processed;
  }

  // =========================================================================
  // 4.2 – autoGenerateSessionNames
  // =========================================================================

  /**
   * Returns a new array where every session is guaranteed to have a name.
   * Sessions with name === undefined receive the auto-generated name
   * "Session {order}" (Requirement 1.6).
   * Sessions that already have a name are returned unchanged.
   *
   * Requirement: 1.6
   */
  autoGenerateSessionNames(sessions: ServiceSessionDto[]): ServiceSessionDto[] {
    return sessions.map((session) => ({
      ...session,
      name: session.name ?? `Session ${session.order}`,
    }));
  }

  // =========================================================================
  // 4.3 – normalizeSessions
  // =========================================================================

  /**
   * Transforms validated + named ServiceSessionDto array into ProcessedSession array:
   *  - Assigns a unique MongoDB ObjectId string to each session's _id
   *  - Resolves duration: uses session-specific duration when provided,
   *    falls back to serviceDefaultDuration otherwise (Requirement 2.2)
   *  - Sorts the result by order in ascending order (Requirement 14.1)
   *
   * Requirements: 2.2, 14.1
   */
  normalizeSessions(
    sessions: ServiceSessionDto[],
    serviceDefaultDuration: number,
  ): ProcessedSession[] {
    return sessions
      .map((session) => ({
        _id: new Types.ObjectId().toString(),
        name: session.name!,
        duration: session.duration ?? serviceDefaultDuration,
        order: session.order,
      }))
      .sort((a, b) => a.order - b.order);
  }

  // =========================================================================
  // 4.4 – validateSessionRemoval
  // =========================================================================

  /**
   * Prevents removal of sessions that still have active appointments.
   *
   * Active is defined as status IN ['scheduled', 'confirmed'].
   * Completed, cancelled, and no-show appointments do NOT block removal.
   *
   * Throws ConflictException with bilingual error if any active appointment
   * references one of the sessions being removed.
   *
   * Requirements: 13.1, 13.2, 13.3, 13.4
   */
  async validateSessionRemoval(
    serviceId: string,
    sessionsToRemove: string[],
  ): Promise<void> {
    if (!sessionsToRemove.length) {
      return;
    }

    this.logger.debug(
      `Checking removal eligibility for ${sessionsToRemove.length} session(s) in service ${serviceId}`,
    );

    const activeAppointment = await this.appointmentModel.findOne({
      serviceId: new Types.ObjectId(serviceId),
      sessionId: { $in: sessionsToRemove },
      status: { $in: ['scheduled', 'confirmed'] },
      isDeleted: { $ne: true },
    });

    if (activeAppointment) {
      throw new ConflictException({
        message: SESSION_ERROR_MESSAGES.CANNOT_REMOVE_SESSION_WITH_ACTIVE_APPOINTMENTS,
        code: 'CANNOT_REMOVE_SESSION_WITH_ACTIVE_APPOINTMENTS',
        details: {
          sessionId: activeAppointment.sessionId,
          existingAppointmentId: (activeAppointment._id as Types.ObjectId).toString(),
          existingAppointmentStatus: activeAppointment.status,
        },
      });
    }

    this.logger.debug('Session removal validation passed — no active appointments found');
  }

  // =========================================================================
  // 4.5 – findSessionById
  // =========================================================================

  /**
   * Searches a ProcessedSession array for the session with the given _id.
   * Returns the session object when found, or null when not found.
   *
   * Requirement: 3.4
   */
  findSessionById(
    sessions: ProcessedSession[],
    sessionId: string,
  ): ProcessedSession | null {
    return sessions.find((s) => s._id === sessionId) ?? null;
  }
}
