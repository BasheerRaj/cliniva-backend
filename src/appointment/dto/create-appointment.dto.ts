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
  IsBoolean
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateAppointmentDto {
  @IsMongoId()
  @IsNotEmpty()
  patientId: string;

  @IsMongoId()
  @IsNotEmpty()
  doctorId: string;

  @IsMongoId()
  @IsNotEmpty()
  clinicId: string;

  @IsMongoId()
  @IsNotEmpty()
  serviceId: string;

  @IsDateString()
  @IsNotEmpty()
  appointmentDate: string; // YYYY-MM-DD format

  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Time must be in HH:mm format (e.g., 14:30)'
  })
  appointmentTime: string; // HH:mm format

  @IsNumber()
  @IsOptional()
  @Min(15)
  @Max(240)
  durationMinutes?: number; // 15 minutes to 4 hours

  @IsEnum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'], {
    message: 'Status must be one of: scheduled, confirmed, in_progress, completed, cancelled, no_show'
  })
  @IsOptional()
  status?: string;

  @IsEnum(['low', 'medium', 'high', 'urgent'], {
    message: 'Urgency level must be one of: low, medium, high, urgent'
  })
  @IsOptional()
  urgencyLevel?: string;

  @IsString()
  @IsOptional()
  @Length(0, 500)
  notes?: string;
}

export class UpdateAppointmentDto {
  @IsMongoId()
  @IsOptional()
  patientId?: string;

  @IsMongoId()
  @IsOptional()
  doctorId?: string;

  @IsMongoId()
  @IsOptional()
  clinicId?: string;

  @IsMongoId()
  @IsOptional()
  serviceId?: string;

  @IsDateString()
  @IsOptional()
  appointmentDate?: string;

  @IsString()
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Time must be in HH:mm format (e.g., 14:30)'
  })
  appointmentTime?: string;

  @IsNumber()
  @IsOptional()
  @Min(15)
  @Max(240)
  durationMinutes?: number;

  @IsEnum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'])
  @IsOptional()
  status?: string;

  @IsEnum(['low', 'medium', 'high', 'urgent'])
  @IsOptional()
  urgencyLevel?: string;

  @IsString()
  @IsOptional()
  @Length(0, 500)
  notes?: string;
}

export class RescheduleAppointmentDto {
  @IsDateString()
  @IsNotEmpty()
  newAppointmentDate: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  newAppointmentTime: string;

  @IsString()
  @IsOptional()
  @Length(0, 200)
  rescheduleReason?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  notifyPatient?: boolean;
}

export class CancelAppointmentDto {
  @IsString()
  @IsNotEmpty()
  @Length(5, 200)
  cancellationReason: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  notifyPatient?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  allowReschedule?: boolean;
}

export class AppointmentSearchQueryDto {
  @IsString()
  @IsOptional()
  search?: string; // Search across patient name, doctor name

  @IsMongoId()
  @IsOptional()
  patientId?: string;

  @IsMongoId()
  @IsOptional()
  doctorId?: string;

  @IsMongoId()
  @IsOptional()
  clinicId?: string;

  @IsMongoId()
  @IsOptional()
  serviceId?: string;

  @IsDateString()
  @IsOptional()
  appointmentDate?: string;

  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @IsEnum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'])
  @IsOptional()
  status?: string;

  @IsEnum(['low', 'medium', 'high', 'urgent'])
  @IsOptional()
  urgencyLevel?: string;

  @IsString()
  @IsOptional()
  page?: string;

  @IsString()
  @IsOptional()
  limit?: string;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}

export class BulkCreateAppointmentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAppointmentDto)
  appointments: CreateAppointmentDto[];

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  skipConflicts?: boolean; // Skip appointments that have conflicts

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  autoConfirm?: boolean;
}

export class AppointmentAvailabilityQueryDto {
  @IsMongoId()
  @IsNotEmpty()
  doctorId: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsMongoId()
  @IsOptional()
  clinicId?: string;

  @IsNumber()
  @IsOptional()
  @Min(15)
  @Max(240)
  durationMinutes?: number;
}

export class AppointmentStatsDto {
  totalAppointments: number;
  scheduledAppointments: number;
  confirmedAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  todayAppointments: number;
  upcomingAppointments: number;
  overdueAppointments: number;
  averageDuration: number;
  topServices: Array<{
    serviceId: string;
    serviceName: string;
    count: number;
  }>;
  topDoctors: Array<{
    doctorId: string;
    doctorName: string;
    count: number;
  }>;
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
    end: string;   // HH:mm
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
  conflictType: 'doctor_busy' | 'patient_busy' | 'clinic_closed' | 'service_unavailable';
  message: string;
  conflictingAppointmentId?: string;
  suggestedTimes?: string[]; // Alternative time suggestions
}

export class ConfirmAppointmentDto {
  @IsString()
  @IsOptional()
  @Length(0, 200)
  confirmationNotes?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  sendConfirmationEmail?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  sendReminderSms?: boolean;
} 