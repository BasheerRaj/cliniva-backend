/**
 * Appointment Status Enumeration
 * Defines all possible states of an appointment in the system
 */
export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

/**
 * Valid Status Transitions Map
 * Defines which status transitions are allowed in the appointment lifecycle
 * 
 * State Machine Rules:
 * - scheduled → confirmed, cancelled, no_show
 * - confirmed → in_progress, cancelled, no_show
 * - in_progress → completed
 * - completed, cancelled, no_show → [] (terminal states)
 */
export const VALID_STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  [AppointmentStatus.SCHEDULED]: [
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.NO_SHOW,
  ],
  [AppointmentStatus.CONFIRMED]: [
    AppointmentStatus.IN_PROGRESS,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.NO_SHOW,
  ],
  [AppointmentStatus.IN_PROGRESS]: [
    AppointmentStatus.COMPLETED,
  ],
  [AppointmentStatus.COMPLETED]: [],
  [AppointmentStatus.CANCELLED]: [],
  [AppointmentStatus.NO_SHOW]: [],
};

/**
 * Check if a status transition is valid
 * @param currentStatus - The current appointment status
 * @param newStatus - The desired new status
 * @returns true if the transition is allowed, false otherwise
 */
export function isValidStatusTransition(
  currentStatus: AppointmentStatus,
  newStatus: AppointmentStatus,
): boolean {
  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions.includes(newStatus);
}
