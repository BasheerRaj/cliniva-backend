import { 
  IsString, 
  IsNotEmpty, 
  IsOptional, 
  IsBoolean,
  IsMongoId,
  IsDateString,
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  Max,
  Matches,
  Length,
  IsHexColor
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// Base Schedule DTOs
export class CreateScheduleDto {
  @IsEnum(['doctor_availability', 'room_booking', 'equipment_schedule', 'facility_hours', 'maintenance', 'recurring_template', 'block_time', 'holiday'])
  @IsNotEmpty()
  scheduleType: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 200)
  title: string;

  @IsString()
  @IsOptional()
  @Length(0, 1000)
  description?: string;

  // Entity references
  @IsMongoId()
  @IsOptional()
  userId?: string; // Doctor/Employee

  @IsMongoId()
  @IsOptional()
  clinicId?: string;

  @IsMongoId()
  @IsOptional()
  complexId?: string;

  @IsMongoId()
  @IsOptional()
  organizationId?: string;

  @IsString()
  @IsOptional()
  @Length(1, 50)
  roomId?: string;

  @IsString()
  @IsOptional()
  @Length(1, 50)
  equipmentId?: string;

  // Date and time
  @IsDateString()
  @IsNotEmpty()
  startDate: string; // YYYY-MM-DD

  @IsDateString()
  @IsNotEmpty()
  endDate: string; // YYYY-MM-DD

  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Start time must be in HH:mm format (e.g., 09:00)'
  })
  startTime: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'End time must be in HH:mm format (e.g., 17:00)'
  })
  endTime: string;

  @IsString()
  @IsOptional()
  @Length(1, 50)
  timezone?: string;

  // Recurrence
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isRecurring?: boolean;

  @IsEnum(['daily', 'weekly', 'monthly', 'yearly', 'custom'])
  @IsOptional()
  recurrenceType?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(365)
  recurrenceInterval?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  recurrenceDays?: string[]; // ['monday', 'tuesday', ...]

  @IsDateString()
  @IsOptional()
  recurrenceEndDate?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(1000)
  maxOccurrences?: number;

  // Availability and capacity
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isAvailable?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isBlocked?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(1000)
  maxCapacity?: number;

  @IsNumber()
  @IsOptional()
  @Min(5)
  @Max(480) // 5 minutes to 8 hours
  slotDuration?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(60)
  breakDuration?: number;

  // Priority and status
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  @IsOptional()
  priority?: string;

  @IsEnum(['draft', 'active', 'inactive', 'completed', 'cancelled'])
  @IsOptional()
  status?: string;

  // Approval
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  requiresApproval?: boolean;

  // Notifications
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  sendReminders?: boolean;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  reminderMinutes?: number[]; // [60, 30, 15]

  // Metadata
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsHexColor()
  @IsOptional()
  color?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  allowOverlap?: boolean;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  conflictResolution?: string;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  externalId?: string;
}

export class UpdateScheduleDto {
  @IsString()
  @IsOptional()
  @Length(2, 200)
  title?: string;

  @IsString()
  @IsOptional()
  @Length(0, 1000)
  description?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  startTime?: string;

  @IsString()
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  endTime?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isAvailable?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isBlocked?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(1000)
  maxCapacity?: number;

  @IsEnum(['low', 'medium', 'high', 'urgent'])
  @IsOptional()
  priority?: string;

  @IsEnum(['draft', 'active', 'inactive', 'completed', 'cancelled'])
  @IsOptional()
  status?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsHexColor()
  @IsOptional()
  color?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  allowOverlap?: boolean;
}

// Doctor Availability DTOs
export class CreateDoctorAvailabilityDto {
  @IsMongoId()
  @IsNotEmpty()
  doctorId: string;

  @IsMongoId()
  @IsNotEmpty()
  clinicId: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 200)
  title: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  startTime: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  endTime: string;

  @IsNumber()
  @IsOptional()
  @Min(15)
  @Max(120)
  slotDuration?: number; // Default appointment slot duration

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(30)
  breakDuration?: number;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isRecurring?: boolean;

  @IsEnum(['weekly', 'monthly'])
  @IsOptional()
  recurrenceType?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  recurrenceDays?: string[];

  @IsDateString()
  @IsOptional()
  recurrenceEndDate?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  specialties?: string[]; // Services this availability is for

  @IsString()
  @IsOptional()
  @Length(0, 500)
  notes?: string;
}

// Room Booking DTOs
export class CreateRoomBookingDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  roomId: string;

  @IsMongoId()
  @IsNotEmpty()
  clinicId: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 200)
  title: string;

  @IsString()
  @IsOptional()
  @Length(0, 500)
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  startTime: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  endTime: string;

  @IsEnum(['meeting', 'surgery', 'consultation', 'maintenance', 'other'])
  @IsNotEmpty()
  purpose: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  expectedAttendees?: number;

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  attendeeIds?: string[];

  @IsEnum(['low', 'medium', 'high', 'urgent'])
  @IsOptional()
  priority?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  requiresApproval?: boolean;

  @IsString()
  @IsOptional()
  @Length(0, 1000)
  specialRequirements?: string;
}

// Equipment Schedule DTOs
export class CreateEquipmentScheduleDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  equipmentId: string;

  @IsMongoId()
  @IsNotEmpty()
  clinicId: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 200)
  title: string;

  @IsEnum(['usage', 'maintenance', 'calibration', 'repair', 'inspection'])
  @IsNotEmpty()
  scheduleType: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  startTime: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  endTime: string;

  @IsMongoId()
  @IsOptional()
  assignedTechnicianId?: string;

  @IsString()
  @IsOptional()
  @Length(0, 1000)
  maintenanceNotes?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isRecurring?: boolean;

  @IsEnum(['daily', 'weekly', 'monthly', 'yearly'])
  @IsOptional()
  recurrenceType?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(365)
  recurrenceInterval?: number;
}

// Search and Filter DTOs
export class ScheduleSearchQueryDto {
  @IsString()
  @IsOptional()
  search?: string; // Search title and description

  @IsEnum(['doctor_availability', 'room_booking', 'equipment_schedule', 'facility_hours', 'maintenance', 'recurring_template', 'block_time', 'holiday'])
  @IsOptional()
  scheduleType?: string;

  @IsMongoId()
  @IsOptional()
  userId?: string;

  @IsMongoId()
  @IsOptional()
  clinicId?: string;

  @IsMongoId()
  @IsOptional()
  complexId?: string;

  @IsMongoId()
  @IsOptional()
  organizationId?: string;

  @IsString()
  @IsOptional()
  roomId?: string;

  @IsString()
  @IsOptional()
  equipmentId?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsEnum(['draft', 'active', 'inactive', 'completed', 'cancelled'])
  @IsOptional()
  status?: string;

  @IsEnum(['low', 'medium', 'high', 'urgent'])
  @IsOptional()
  priority?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isRecurring?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isAvailable?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isBlocked?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

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

// Conflict Detection DTOs
export class CheckScheduleConflictDto {
  @IsEnum(['doctor_availability', 'room_booking', 'equipment_schedule', 'facility_hours', 'maintenance', 'recurring_template', 'block_time', 'holiday'])
  @IsNotEmpty()
  scheduleType: string;

  @IsMongoId()
  @IsOptional()
  userId?: string;

  @IsMongoId()
  @IsOptional()
  clinicId?: string;

  @IsString()
  @IsOptional()
  roomId?: string;

  @IsString()
  @IsOptional()
  equipmentId?: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  startTime: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  endTime: string;

  @IsString()
  @IsOptional()
  excludeScheduleId?: string; // Exclude this schedule from conflict check
}

// Time Slot DTOs
export class GetAvailableTimeSlotsDto {
  @IsMongoId()
  @IsNotEmpty()
  userId: string; // Doctor ID

  @IsMongoId()
  @IsNotEmpty()
  clinicId: string;

  @IsDateString()
  @IsNotEmpty()
  date: string; // YYYY-MM-DD

  @IsNumber()
  @IsOptional()
  @Min(15)
  @Max(240)
  slotDuration?: number; // Minutes

  @IsMongoId()
  @IsOptional()
  serviceId?: string; // Service being booked
}

// Bulk Operations DTOs
export class BulkScheduleActionDto {
  @IsArray()
  @IsMongoId({ each: true })
  @IsNotEmpty()
  scheduleIds: string[];

  @IsEnum(['activate', 'deactivate', 'cancel', 'approve', 'reject'])
  @IsNotEmpty()
  action: string;

  @IsString()
  @IsOptional()
  @Length(0, 500)
  reason?: string;

  @IsDateString()
  @IsOptional()
  effectiveDate?: string;
}

// Calendar View DTOs
export class CalendarViewDto {
  @IsEnum(['day', 'week', 'month', 'agenda'])
  @IsNotEmpty()
  viewType: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsArray()
  @IsEnum(['doctor_availability', 'room_booking', 'equipment_schedule', 'facility_hours', 'maintenance', 'recurring_template', 'block_time', 'holiday'], { each: true })
  @IsOptional()
  scheduleTypes?: string[];

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  userIds?: string[];

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  clinicIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  roomIds?: string[];
}

// Schedule Template DTOs
export class CreateScheduleTemplateDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  templateName: string;

  @IsString()
  @IsOptional()
  @Length(0, 500)
  description?: string;

  @IsEnum(['doctor_availability', 'room_booking', 'equipment_schedule', 'facility_hours'])
  @IsNotEmpty()
  scheduleType: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  defaultStartTime: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  defaultEndTime: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  defaultDays?: string[]; // ['monday', 'tuesday', ...]

  @IsNumber()
  @IsOptional()
  @Min(15)
  @Max(240)
  defaultSlotDuration?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(60)
  defaultBreakDuration?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;
}

// Schedule Statistics DTOs
export class ScheduleStatsDto {
  totalSchedules: number;
  activeSchedules: number;
  schedulesToday: number;
  schedulesThisWeek: number;
  schedulesThisMonth: number;
  
  schedulesByType: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;

  doctorUtilization: Array<{
    doctorId: string;
    doctorName: string;
    totalHours: number;
    bookedHours: number;
    utilizationRate: number;
  }>;

  roomUtilization: Array<{
    roomId: string;
    roomName: string;
    totalHours: number;
    bookedHours: number;
    utilizationRate: number;
  }>;

  conflictingSchedules: number;
  pendingApprovals: number;
  
  recurringSchedules: number;
  oneTimeSchedules: number;
  
  averageSlotDuration: number;
  
  upcomingSchedules: Array<{
    scheduleId: string;
    title: string;
    startDate: Date;
    startTime: string;
    scheduleType: string;
  }>;

  monthlyTrend: Array<{
    month: string;
    count: number;
  }>;
} 