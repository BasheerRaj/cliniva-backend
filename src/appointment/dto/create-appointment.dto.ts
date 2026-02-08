import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsMongoId,
  Matches,
  Length,
  IsArray,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAppointmentDto {
  @ApiProperty({
    description: 'Patient ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439012',
    type: String,
  })
  @IsMongoId()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({
    description: 'Doctor ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439013',
    type: String,
  })
  @IsMongoId()
  @IsNotEmpty()
  doctorId: string;

  @ApiProperty({
    description: 'Clinic ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439014',
    type: String,
  })
  @IsMongoId()
  @IsNotEmpty()
  clinicId: string;

  @ApiProperty({
    description: 'Service ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439015',
    type: String,
  })
  @IsMongoId()
  @IsNotEmpty()
  serviceId: string;

  @ApiProperty({
    description: 'Appointment date in YYYY-MM-DD format',
    example: '2026-02-15',
    type: String,
  })
  @IsDateString()
  @IsNotEmpty()
  appointmentDate: string; // YYYY-MM-DD format

  @ApiProperty({
    description: 'Appointment time in HH:mm format (24-hour)',
    example: '14:30',
    type: String,
    pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Time must be in HH:mm format (e.g., 14:30)',
  })
  appointmentTime: string; // HH:mm format

  @ApiPropertyOptional({
    description: 'Appointment duration in minutes (15-240 minutes)',
    example: 30,
    type: Number,
    minimum: 15,
    maximum: 240,
  })
  @IsNumber()
  @IsOptional()
  @Min(15)
  @Max(240)
  durationMinutes?: number; // 15 minutes to 4 hours

  @ApiPropertyOptional({
    description: 'Appointment status',
    example: 'scheduled',
    enum: [
      'scheduled',
      'confirmed',
      'in_progress',
      'completed',
      'cancelled',
      'no_show',
    ],
    default: 'scheduled',
  })
  @IsEnum(
    [
      'scheduled',
      'confirmed',
      'in_progress',
      'completed',
      'cancelled',
      'no_show',
    ],
    {
      message:
        'Status must be one of: scheduled, confirmed, in_progress, completed, cancelled, no_show',
    },
  )
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description:
      'Urgency level of the appointment (low: routine, medium: standard, high: priority, urgent: emergency)',
    example: 'medium',
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  })
  @IsEnum(['low', 'medium', 'high', 'urgent'], {
    message: 'Urgency level must be one of: low, medium, high, urgent',
  })
  @IsOptional()
  urgencyLevel?: string;

  @ApiPropertyOptional({
    description: 'Additional notes or special instructions for the appointment',
    example: 'Patient has mild symptoms, follow-up required',
    type: String,
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @Length(0, 500)
  notes?: string;
}

export class UpdateAppointmentDto {
  @ApiPropertyOptional({
    description: 'Patient ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439012',
    type: String,
  })
  @IsMongoId()
  @IsOptional()
  patientId?: string;

  @ApiPropertyOptional({
    description: 'Doctor ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439013',
    type: String,
  })
  @IsMongoId()
  @IsOptional()
  doctorId?: string;

  @ApiPropertyOptional({
    description: 'Clinic ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439014',
    type: String,
  })
  @IsMongoId()
  @IsOptional()
  clinicId?: string;

  @ApiPropertyOptional({
    description: 'Service ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439015',
    type: String,
  })
  @IsMongoId()
  @IsOptional()
  serviceId?: string;

  @ApiPropertyOptional({
    description: 'Appointment date in YYYY-MM-DD format',
    example: '2026-02-16',
    type: String,
  })
  @IsDateString()
  @IsOptional()
  appointmentDate?: string;

  @ApiPropertyOptional({
    description: 'Appointment time in HH:mm format (24-hour)',
    example: '10:00',
    type: String,
    pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsString()
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Time must be in HH:mm format (e.g., 14:30)',
  })
  appointmentTime?: string;

  @ApiPropertyOptional({
    description: 'Appointment duration in minutes (15-240 minutes)',
    example: 45,
    type: Number,
    minimum: 15,
    maximum: 240,
  })
  @IsNumber()
  @IsOptional()
  @Min(15)
  @Max(240)
  durationMinutes?: number;

  @ApiPropertyOptional({
    description: 'Appointment status',
    example: 'confirmed',
    enum: [
      'scheduled',
      'confirmed',
      'in_progress',
      'completed',
      'cancelled',
      'no_show',
    ],
  })
  @IsEnum([
    'scheduled',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
    'no_show',
  ])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description: 'Urgency level of the appointment',
    example: 'high',
    enum: ['low', 'medium', 'high', 'urgent'],
  })
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  @IsOptional()
  urgencyLevel?: string;

  @ApiPropertyOptional({
    description: 'Additional notes or special instructions',
    example: 'Updated appointment details',
    type: String,
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @Length(0, 500)
  notes?: string;
}

export class RescheduleAppointmentDto {
  @ApiProperty({
    description: 'New appointment date in YYYY-MM-DD format',
    example: '2026-02-20',
    type: String,
  })
  @IsDateString()
  @IsNotEmpty()
  newAppointmentDate: string;

  @ApiProperty({
    description: 'New appointment time in HH:mm format (24-hour)',
    example: '09:00',
    type: String,
    pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  newAppointmentTime: string;

  @ApiPropertyOptional({
    description: 'Reason for rescheduling the appointment',
    example: 'Patient requested earlier time',
    type: String,
    maxLength: 200,
  })
  @IsString()
  @IsOptional()
  @Length(0, 200)
  rescheduleReason?: string;

  @ApiPropertyOptional({
    description: 'Whether to notify the patient about the reschedule',
    example: true,
    type: Boolean,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  notifyPatient?: boolean;
}

export class CancelAppointmentDto {
  @ApiProperty({
    description: 'Reason for cancelling the appointment (5-200 characters)',
    example: 'Patient unable to attend',
    type: String,
    minLength: 5,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @Length(5, 200)
  cancellationReason: string;

  @ApiPropertyOptional({
    description: 'Whether to notify the patient about the cancellation',
    example: true,
    type: Boolean,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  notifyPatient?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to allow the patient to reschedule',
    example: true,
    type: Boolean,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  allowReschedule?: boolean;
}

export class AppointmentSearchQueryDto {
  @ApiPropertyOptional({
    description: 'Search term for patient name or doctor name',
    example: 'Ahmed',
    type: String,
  })
  @IsString()
  @IsOptional()
  search?: string; // Search across patient name, doctor name

  @ApiPropertyOptional({
    description: 'Filter by patient ID',
    example: '507f1f77bcf86cd799439012',
    type: String,
  })
  @IsMongoId()
  @IsOptional()
  patientId?: string;

  @ApiPropertyOptional({
    description: 'Filter by doctor ID',
    example: '507f1f77bcf86cd799439013',
    type: String,
  })
  @IsMongoId()
  @IsOptional()
  doctorId?: string;

  @ApiPropertyOptional({
    description: 'Filter by clinic ID',
    example: '507f1f77bcf86cd799439014',
    type: String,
  })
  @IsMongoId()
  @IsOptional()
  clinicId?: string;

  @ApiPropertyOptional({
    description: 'Filter by service ID',
    example: '507f1f77bcf86cd799439015',
    type: String,
  })
  @IsMongoId()
  @IsOptional()
  serviceId?: string;

  @ApiPropertyOptional({
    description: 'Filter by specific appointment date (YYYY-MM-DD)',
    example: '2026-02-15',
    type: String,
  })
  @IsDateString()
  @IsOptional()
  appointmentDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by date range start (YYYY-MM-DD)',
    example: '2026-02-01',
    type: String,
  })
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by date range end (YYYY-MM-DD)',
    example: '2026-02-28',
    type: String,
  })
  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Filter by appointment status',
    example: 'scheduled',
    enum: [
      'scheduled',
      'confirmed',
      'in_progress',
      'completed',
      'cancelled',
      'no_show',
    ],
  })
  @IsEnum([
    'scheduled',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
    'no_show',
  ])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by urgency level',
    example: 'medium',
    enum: ['low', 'medium', 'high', 'urgent'],
  })
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  @IsOptional()
  urgencyLevel?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: '1',
    type: String,
    default: '1',
  })
  @IsString()
  @IsOptional()
  page?: string;

  @ApiPropertyOptional({
    description: 'Number of items per page (max: 100)',
    example: '10',
    type: String,
    default: '10',
  })
  @IsString()
  @IsOptional()
  limit?: string;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    example: 'appointmentDate',
    type: String,
    default: 'appointmentDate',
  })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order (ascending or descending)',
    example: 'desc',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}

export class BulkCreateAppointmentDto {
  @ApiProperty({
    description: 'Array of appointments to create',
    type: [CreateAppointmentDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAppointmentDto)
  appointments: CreateAppointmentDto[];

  @ApiPropertyOptional({
    description: 'Skip appointments that have scheduling conflicts',
    example: false,
    type: Boolean,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  skipConflicts?: boolean; // Skip appointments that have conflicts

  @ApiPropertyOptional({
    description: 'Automatically confirm all created appointments',
    example: false,
    type: Boolean,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  autoConfirm?: boolean;
}

export class AppointmentAvailabilityQueryDto {
  @ApiProperty({
    description: 'Doctor ID to check availability for',
    example: '507f1f77bcf86cd799439013',
    type: String,
  })
  @IsMongoId()
  @IsNotEmpty()
  doctorId: string;

  @ApiProperty({
    description: 'Date to check availability (YYYY-MM-DD)',
    example: '2026-02-15',
    type: String,
  })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiPropertyOptional({
    description: 'Filter by specific clinic',
    example: '507f1f77bcf86cd799439014',
    type: String,
  })
  @IsMongoId()
  @IsOptional()
  clinicId?: string;

  @ApiPropertyOptional({
    description: 'Appointment duration in minutes (15-240 minutes)',
    example: 30,
    type: Number,
    minimum: 15,
    maximum: 240,
  })
  @IsNumber()
  @IsOptional()
  @Min(15)
  @Max(240)
  durationMinutes?: number;
}

export class AppointmentStatsDto {
  @ApiProperty({
    description: 'Total number of appointments',
    example: 1250,
    type: Number,
  })
  totalAppointments: number;

  @ApiProperty({
    description: 'Number of scheduled appointments',
    example: 180,
    type: Number,
  })
  scheduledAppointments: number;

  @ApiProperty({
    description: 'Number of confirmed appointments',
    example: 95,
    type: Number,
  })
  confirmedAppointments: number;

  @ApiProperty({
    description: 'Number of completed appointments',
    example: 850,
    type: Number,
  })
  completedAppointments: number;

  @ApiProperty({
    description: 'Number of cancelled appointments',
    example: 100,
    type: Number,
  })
  cancelledAppointments: number;

  @ApiProperty({
    description: 'Number of no-show appointments',
    example: 25,
    type: Number,
  })
  noShowAppointments: number;

  @ApiProperty({
    description: "Number of today's appointments",
    example: 15,
    type: Number,
  })
  todayAppointments: number;

  @ApiProperty({
    description: 'Number of upcoming appointments',
    example: 275,
    type: Number,
  })
  upcomingAppointments: number;

  @ApiProperty({
    description: 'Number of overdue appointments',
    example: 0,
    type: Number,
  })
  overdueAppointments: number;

  @ApiProperty({
    description: 'Average appointment duration in minutes',
    example: 32.5,
    type: Number,
  })
  averageDuration: number;

  @ApiProperty({
    description: 'Top 5 most booked services',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        serviceId: { type: 'string', example: '507f1f77bcf86cd799439015' },
        serviceName: { type: 'string', example: 'General Consultation' },
        count: { type: 'number', example: 450 },
      },
    },
  })
  topServices: Array<{
    serviceId: string;
    serviceName: string;
    count: number;
  }>;

  @ApiProperty({
    description: 'Top 5 doctors by appointment count',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        doctorId: { type: 'string', example: '507f1f77bcf86cd799439013' },
        doctorName: { type: 'string', example: 'Dr. Fatima Al-Rashid' },
        count: { type: 'number', example: 380 },
      },
    },
  })
  topDoctors: Array<{
    doctorId: string;
    doctorName: string;
    count: number;
  }>;

  @ApiProperty({
    description: 'Distribution of appointments by urgency level',
    type: 'object',
    properties: {
      low: { type: 'number', example: 450 },
      medium: { type: 'number', example: 620 },
      high: { type: 'number', example: 150 },
      urgent: { type: 'number', example: 30 },
    },
  })
  urgencyDistribution: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
}

export class AppointmentResponseDto {
  _id: string;
  patientId: string;
  doctorId: string;
  clinicId: string;
  serviceId: string;
  appointmentDate: Date;
  appointmentTime: string;
  durationMinutes: number;
  status: string;
  urgencyLevel: string;
  notes?: string;
  cancellationReason?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;

  // Populated fields (optional)
  patient?: {
    _id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  };
  doctor?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  clinic?: {
    _id: string;
    name: string;
    address: string;
  };
  service?: {
    _id: string;
    name: string;
    durationMinutes: number;
    price: number;
  };
}

export class TimeSlotDto {
  time: string; // HH:mm format
  isAvailable: boolean;
  reason?: string; // Why not available
  existingAppointmentId?: string;
}

export class DayScheduleDto {
  date: string; // YYYY-MM-DD
  doctorId: string;
  clinicId: string;
  workingHours: {
    start: string; // HH:mm
    end: string; // HH:mm
    breaks: Array<{
      start: string;
      end: string;
    }>;
  };
  timeSlots: TimeSlotDto[];
  totalSlots: number;
  availableSlots: number;
  bookedSlots: number;
}

export class AppointmentConflictDto {
  conflictType:
    | 'doctor_busy'
    | 'patient_busy'
    | 'clinic_closed'
    | 'service_unavailable';
  message: string;
  conflictingAppointmentId?: string;
  suggestedTimes?: string[]; // Alternative time suggestions
}

export class ConfirmAppointmentDto {
  @ApiPropertyOptional({
    description: 'Notes about the confirmation',
    example: 'Patient confirmed attendance via phone',
    type: String,
    maxLength: 200,
  })
  @IsString()
  @IsOptional()
  @Length(0, 200)
  confirmationNotes?: string;

  @ApiPropertyOptional({
    description: 'Whether to send confirmation email to patient',
    example: true,
    type: Boolean,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  sendConfirmationEmail?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to send reminder SMS to patient',
    example: true,
    type: Boolean,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  sendReminderSms?: boolean;
}
