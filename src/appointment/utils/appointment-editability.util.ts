import { AppointmentStatus } from '../constants/appointment-status.enum';

const TERMINAL_APPOINTMENT_STATUSES = new Set<string>([
  AppointmentStatus.CANCELLED,
  AppointmentStatus.COMPLETED,
  AppointmentStatus.NO_SHOW,
]);

const APPOINTMENT_EDIT_LOCK_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

type EditableAppointmentLike = {
  status?: AppointmentStatus | string | null;
  appointmentDate?: Date | string | null;
  appointmentTime?: string | null;
  datetime?: Date | string | null;
};

const toDate = (value?: Date | string | null): Date | null => {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const isAppointmentInTerminalStatus = (
  status?: AppointmentStatus | string | null,
): boolean => !!status && TERMINAL_APPOINTMENT_STATUSES.has(status);

export const getAppointmentDateTime = (
  appointment?: EditableAppointmentLike | null,
): Date | null => {
  if (!appointment) return null;

  if (appointment.datetime) {
    return toDate(appointment.datetime);
  }

  const appointmentDate = toDate(appointment.appointmentDate);
  if (!appointmentDate || !appointment.appointmentTime) return appointmentDate;

  const datePart = appointmentDate.toISOString().split('T')[0];
  const combined = new Date(`${datePart}T${appointment.appointmentTime}:00`);
  return Number.isNaN(combined.getTime()) ? null : combined;
};

export const isAppointmentOlderThanTwoDays = (
  appointment?: EditableAppointmentLike | null,
  now: Date = new Date(),
): boolean => {
  const appointmentDateTime = getAppointmentDateTime(appointment);
  if (!appointmentDateTime) return false;

  return now.getTime() - appointmentDateTime.getTime() >= APPOINTMENT_EDIT_LOCK_WINDOW_MS;
};

export const getAppointmentEditLockReason = (
  appointment?: EditableAppointmentLike | null,
  now: Date = new Date(),
): 'terminal_status' | 'past_two_days' | null => {
  if (!appointment) return null;
  if (isAppointmentInTerminalStatus(appointment.status)) return 'terminal_status';
  if (isAppointmentOlderThanTwoDays(appointment, now)) return 'past_two_days';
  return null;
};
