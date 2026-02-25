import { Appointment } from '../../database/schemas/appointment.schema';

/**
 * Details of a single failed session booking within a batch.
 * Requirements: 7.4
 */
export interface BatchBookingFailure {
  sessionId: string;
  appointmentDate: Date;
  appointmentTime: string;
  error: {
    code: string;
    message: { ar: string; en: string };
  };
}

/**
 * Result of a successful batch session booking.
 * Requirements: 7.1, 7.5
 */
export interface BatchBookingResult {
  totalRequested: number;
  successCount: number;
  failureCount: number;
  appointments: Appointment[];
}
