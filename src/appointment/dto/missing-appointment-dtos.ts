/**
 * Missing appointment DTOs
 * These DTOs fill gaps referenced in appointment.service.ts and appointment.controller.ts
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TimeSlot } from './responses/availability-response.dto';
import { CreateAppointmentDto } from './create-appointment.dto';

// ---------------------------------------------------------------------------
// AppointmentSearchQueryDto (flat query DTO used by getAppointments)
// ---------------------------------------------------------------------------

/**
 * Flat query DTO matching the destructuring pattern in AppointmentService.getAppointments.
 * Uses string page/limit (parsed with parseInt in the service).
 */
export class AppointmentSearchQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() patientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() doctorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() clinicId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serviceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() appointmentDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dateTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() urgencyLevel?: string;
  @ApiPropertyOptional() @IsOptional() page?: string | number;
  @ApiPropertyOptional() @IsOptional() limit?: string | number;
  @ApiPropertyOptional() @IsOptional() @IsString() sortBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sortOrder?: string;
}

/**
 * Extended availability query DTO.
 * Accepts either `date` (single day) or `startDate`/`endDate` range.
 * `durationMinutes` and `duration` are both accepted (service uses either).
 */
export class AppointmentAvailabilityQueryDto {
  @ApiProperty({ description: 'Doctor ID', example: '507f1f77bcf86cd799439012' })
  @IsString()
  doctorId: string;

  @ApiPropertyOptional({ description: 'Single date string (YYYY-MM-DD)', example: '2024-04-01' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ description: 'Start date for range queries', example: '2024-04-01' })
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional({ description: 'End date for range queries', example: '2024-04-30' })
  @IsOptional()
  endDate?: Date;

  @ApiPropertyOptional({ description: 'Clinic ID', example: '507f1f77bcf86cd799439014' })
  @IsOptional()
  @IsString()
  clinicId?: string;

  @ApiPropertyOptional({ description: 'Service ID', example: '507f1f77bcf86cd799439013' })
  @IsOptional()
  @IsString()
  serviceId?: string;

  @ApiPropertyOptional({ description: 'Duration in minutes', example: 30 })
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional({ description: 'Duration in minutes (alias)', example: 30 })
  @IsOptional()
  durationMinutes?: number;

  @ApiPropertyOptional({ description: 'Session ID', example: '507f1f77bcf86cd799439015' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Number of slots to return', example: 5 })
  @IsOptional()
  slotCount?: number;
}

/** Alias for TimeSlot response — used in controller/service return types */
export { TimeSlot as TimeSlotDto };

// ---------------------------------------------------------------------------
// RescheduleAppointmentDto
// ---------------------------------------------------------------------------

/** DTO for rescheduling an appointment — uses newAppointmentDate/Time field names */
export class RescheduleAppointmentDto {
  @ApiProperty({ description: 'New appointment date (ISO string)', example: '2024-04-01' })
  @IsDateString()
  newAppointmentDate: string;

  @ApiProperty({ description: 'New appointment time (HH:mm)', example: '10:30' })
  @IsString()
  newAppointmentTime: string;

  @ApiPropertyOptional({ description: 'Reason for rescheduling' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

// ---------------------------------------------------------------------------
// ConfirmAppointmentDto
// ---------------------------------------------------------------------------

/** DTO for confirming an appointment */
export class ConfirmAppointmentDto {
  @ApiPropertyOptional({ description: 'Optional confirmation notes' })
  @IsString()
  @IsOptional()
  confirmationNotes?: string;
}

// ---------------------------------------------------------------------------
// ChangeStatusDto
// ---------------------------------------------------------------------------

/** DTO for changing appointment status */
export class ChangeStatusDto {
  @ApiProperty({ description: 'New status', example: 'confirmed' })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiPropertyOptional({ description: 'Optional notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Optional reason' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ description: 'New date when rescheduling' })
  @IsString()
  @IsOptional()
  newDate?: string;

  @ApiPropertyOptional({ description: 'New time when rescheduling' })
  @IsString()
  @IsOptional()
  newTime?: string;
}

// ---------------------------------------------------------------------------
// AppointmentConflictDto
// ---------------------------------------------------------------------------

/** DTO representing a scheduling conflict */
export class AppointmentConflictDto {
  @ApiProperty({ description: 'Type of conflict', example: 'doctor_busy' })
  conflictType: 'doctor_busy' | 'patient_busy';

  @ApiProperty({ description: 'Human-readable conflict message' })
  message: string;

  @ApiProperty({ description: 'ID of the conflicting appointment' })
  conflictingAppointmentId: string;
}

// ---------------------------------------------------------------------------
// DayScheduleDto
// ---------------------------------------------------------------------------

/** Working hours window for a day */
export class DayWorkingHoursDto {
  @ApiProperty({ description: 'Start time HH:mm', example: '08:00' })
  start: string;

  @ApiProperty({ description: 'End time HH:mm', example: '17:00' })
  end: string;

  @ApiProperty({ description: 'Break periods', type: Array })
  breaks: any[];
}

/** Doctor schedule for a single day — returned by getDoctorAvailability */
export class DayScheduleDto {
  @ApiProperty({ description: 'Date string', example: '2024-04-01' })
  date: string;

  @ApiProperty({ description: 'Doctor ID' })
  doctorId: string;

  @ApiProperty({ description: 'Clinic ID' })
  clinicId: string;

  @ApiProperty({ description: 'Working hours', type: DayWorkingHoursDto })
  workingHours: DayWorkingHoursDto;

  @ApiProperty({ description: 'Available time slots', type: [TimeSlot] })
  timeSlots: TimeSlot[];

  @ApiProperty({ description: 'Total time slots', example: 16 })
  totalSlots: number;

  @ApiProperty({ description: 'Available slots count', example: 10 })
  availableSlots: number;

  @ApiProperty({ description: 'Booked slots count', example: 6 })
  bookedSlots: number;
}

// ---------------------------------------------------------------------------
// AppointmentStatsDto
// ---------------------------------------------------------------------------

/** DTO for appointment statistics */
export class AppointmentStatsDto {
  @ApiProperty() totalAppointments: number;
  @ApiProperty() scheduledAppointments: number;
  @ApiProperty() confirmedAppointments: number;
  @ApiProperty() completedAppointments: number;
  @ApiProperty() cancelledAppointments: number;
  @ApiProperty() noShowAppointments: number;
  @ApiProperty() todayAppointments: number;
  @ApiProperty() upcomingAppointments: number;
  @ApiProperty() overdueAppointments: number;
  @ApiProperty() averageDuration: number;
  @ApiProperty({ type: Array }) topServices: Array<{ serviceId: string; serviceName: string; count: number }>;
  @ApiProperty({ type: Array }) topDoctors: Array<{ doctorId: string; doctorName: string; count: number }>;
  @ApiProperty() urgencyDistribution: { low: number; medium: number; high: number; urgent: number };
}

// ---------------------------------------------------------------------------
// StartAppointmentDto / EndAppointmentDto / ConcludeAppointmentDto
// ---------------------------------------------------------------------------

/** DTO for starting an appointment (no body required — userId comes from auth) */
export class StartAppointmentDto {}

/** Session notes sub-object */
export class SessionNotesDto {
  @ApiPropertyOptional() @IsString() @IsOptional() diagnosis?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() symptoms?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() findings?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() procedures?: string;
}

/** Prescription item */
export class PrescriptionItemDto {
  @ApiPropertyOptional() @IsString() @IsOptional() medication?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() dosage?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() frequency?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() duration?: string;
}

/** Treatment plan sub-object */
export class TreatmentPlanDto {
  @ApiPropertyOptional() @IsString() @IsOptional() steps?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() tests?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() lifestyle?: string;
}

/** Follow-up sub-object */
export class FollowUpDto {
  @ApiPropertyOptional() @IsBoolean() @IsOptional() required?: boolean;
  @ApiPropertyOptional() @IsString() @IsOptional() recommendedDuration?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() doctorNotes?: string;
}

/** DTO for ending an in-progress appointment with medical entry data */
export class EndAppointmentDto {
  @ApiPropertyOptional({ type: SessionNotesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SessionNotesDto)
  sessionNotes?: SessionNotesDto;

  @ApiPropertyOptional({ type: [PrescriptionItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemDto)
  prescriptions?: PrescriptionItemDto[];

  @ApiPropertyOptional({ type: TreatmentPlanDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TreatmentPlanDto)
  treatmentPlan?: TreatmentPlanDto;

  @ApiPropertyOptional({ type: FollowUpDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FollowUpDto)
  followUp?: FollowUpDto;
}

/** DTO for concluding an appointment — doctorNotes is required */
export class ConcludeAppointmentDto {
  @ApiProperty({ description: 'Doctor notes (required, min 10 chars)' })
  @IsString()
  @IsNotEmpty()
  doctorNotes: string;

  @ApiPropertyOptional({ type: SessionNotesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SessionNotesDto)
  sessionNotes?: SessionNotesDto;

  @ApiPropertyOptional({ type: [PrescriptionItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemDto)
  prescriptions?: PrescriptionItemDto[];

  @ApiPropertyOptional({ type: TreatmentPlanDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TreatmentPlanDto)
  treatmentPlan?: TreatmentPlanDto;

  @ApiPropertyOptional({ type: FollowUpDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FollowUpDto)
  followUp?: FollowUpDto;
}

// ---------------------------------------------------------------------------
// BulkCreateAppointmentDto
// ---------------------------------------------------------------------------

/** DTO for bulk-creating appointments */
export class BulkCreateAppointmentDto {
  @ApiProperty({ description: 'Array of appointment create requests', type: [CreateAppointmentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAppointmentDto)
  appointments: CreateAppointmentDto[];
}
