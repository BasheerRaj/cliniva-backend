import { Appointment } from '../../database/schemas/appointment.schema';

/**
 * Session information populated from the parent service's sessions array.
 * Requirement: 3.5
 */
export interface SessionInfo {
  sessionId: string;
  name: string;
  duration: number;
  order: number;
}

/**
 * Appointment document enriched with resolved session information.
 * sessionInfo is undefined when the appointment has no sessionId or
 * when the referenced session is no longer present in the service.
 */
export interface AppointmentWithSession {
  appointment: Appointment;
  sessionInfo?: SessionInfo;
}
