import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for individual session progress item
 * Requirements: 10.1, 10.2, 10.4
 * 
 * Represents the status and details of a single session within a patient's treatment plan
 */
export class SessionProgressItemDto {
  @ApiProperty({
    description: 'Session ID (references session._id within service.sessions array)',
    example: '507f1f77bcf86cd799439011',
  })
  sessionId: string;

  @ApiProperty({
    description: 'Session name',
    example: 'Diagnosis',
  })
  sessionName: string;

  @ApiProperty({
    description: 'Session order number',
    example: 1,
  })
  sessionOrder: number;

  @ApiProperty({
    description: 'Appointment ID (if session has been booked)',
    example: '507f1f77bcf86cd799439020',
    required: false,
  })
  appointmentId?: string;

  @ApiProperty({
    description: 'Appointment status',
    example: 'completed',
    enum: ['not_booked', 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
  })
  status: string;

  @ApiProperty({
    description: 'Appointment date (if session has been booked)',
    example: '2024-03-15T00:00:00.000Z',
    required: false,
  })
  appointmentDate?: Date;

  @ApiProperty({
    description: 'Appointment time (if session has been booked)',
    example: '14:30',
    required: false,
  })
  appointmentTime?: string;

  @ApiProperty({
    description: 'Appointment duration in minutes',
    example: 45,
    required: false,
  })
  durationMinutes?: number;

  @ApiProperty({
    description: 'Completion notes saved on the appointment',
    example: 'Patient tolerated the session well.',
    required: false,
  })
  completionNotes?: string;

  @ApiProperty({
    description: 'Whether the session is completed',
    example: true,
  })
  isCompleted: boolean;
}

export class SessionAttemptHistoryItemDto {
  @ApiProperty({
    description: 'Appointment ID for this session attempt',
    example: '507f1f77bcf86cd799439020',
  })
  appointmentId: string;

  @ApiProperty({
    description: 'Session ID when available from the service or invoice session record',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  sessionId?: string;

  @ApiProperty({
    description: 'Session name for this attempt',
    example: 'Diagnosis',
  })
  sessionName: string;

  @ApiProperty({
    description: 'Session order number for this attempt',
    example: 1,
  })
  sessionOrder: number;

  @ApiProperty({
    description: 'Appointment status for this attempt',
    example: 'cancelled',
    enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
  })
  status: string;

  @ApiProperty({
    description: 'Appointment date for this attempt',
    example: '2024-03-15T00:00:00.000Z',
  })
  appointmentDate: Date;

  @ApiProperty({
    description: 'Appointment time for this attempt',
    example: '14:30',
    required: false,
  })
  appointmentTime?: string;

  @ApiProperty({
    description: 'Appointment duration in minutes',
    example: 45,
    required: false,
  })
  durationMinutes?: number;

  @ApiProperty({
    description: 'Appointment creation timestamp',
    example: '2024-03-15T09:00:00.000Z',
    required: false,
  })
  createdAt?: Date;

  @ApiProperty({
    description: 'Completion notes or doctor notes saved on the appointment',
    example: 'Patient tolerated the session well.',
    required: false,
  })
  completionNotes?: string;

  @ApiProperty({
    description: 'Whether this attempt ended as completed',
    example: false,
  })
  isCompleted: boolean;
}

/**
 * DTO for session progress tracking
 * Requirements: 10.1, 10.2, 10.3, 10.4
 * 
 * Provides a comprehensive view of a patient's progress through a multi-step service
 * Includes completion percentage and detailed status for each session
 */
export class SessionProgressDto {
  @ApiProperty({
    description: 'Patient ID',
    example: '507f1f77bcf86cd799439011',
  })
  patientId: string;

  @ApiProperty({
    description: 'Service ID',
    example: '507f1f77bcf86cd799439013',
  })
  serviceId: string;

  @ApiProperty({
    description: 'Service name',
    example: 'Multi-Step Treatment',
  })
  serviceName: string;

  @ApiProperty({
    description: 'Total number of sessions in the service',
    example: 4,
  })
  totalSessions: number;

  @ApiProperty({
    description: 'Number of completed sessions',
    example: 2,
  })
  completedSessions: number;

  @ApiProperty({
    description: 'Completion percentage (rounded to nearest integer)',
    example: 50,
    minimum: 0,
    maximum: 100,
  })
  completionPercentage: number;

  @ApiProperty({
    description: 'Detailed progress for each session (ordered by session.order)',
    type: [SessionProgressItemDto],
  })
  sessions: SessionProgressItemDto[];

  @ApiProperty({
    description: 'All booked appointment attempts mapped to service session order, including repeated attempts of the same session',
    type: [SessionAttemptHistoryItemDto],
  })
  appointmentHistory: SessionAttemptHistoryItemDto[];
}
