import {
  IsNotEmpty,
  IsString,
  IsDate,
  IsOptional,
  IsEnum,
  IsMongoId,
  Matches,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '../constants/appointment-status.enum';
import { UrgencyLevel } from '../constants/urgency-level.enum';
import { BookingChannel } from '../constants/booking-channel.enum';

/**
 * DTO for creating a new appointment
 * Requirements: 1.1-1.10, 15.1-15.6
 * 
 * All validation messages are bilingual (Arabic & English) as per requirement 15.1-15.6
 */
export class CreateAppointmentDto {
  @ApiProperty({
    description: 'Patient ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty({
    message: '{"ar":"معرف المريض مطلوب","en":"Patient ID is required"}',
  })
  @IsMongoId({
    message: '{"ar":"معرف المريض غير صالح","en":"Invalid patient ID"}',
  })
  patientId: string;

  @ApiProperty({
    description: 'Doctor ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439012',
  })
  @IsNotEmpty({
    message: '{"ar":"معرف الطبيب مطلوب","en":"Doctor ID is required"}',
  })
  @IsMongoId({
    message: '{"ar":"معرف الطبيب غير صالح","en":"Invalid doctor ID"}',
  })
  doctorId: string;

  @ApiProperty({
    description: 'Service ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439013',
  })
  @IsNotEmpty({
    message: '{"ar":"معرف الخدمة مطلوب","en":"Service ID is required"}',
  })
  @IsMongoId({
    message: '{"ar":"معرف الخدمة غير صالح","en":"Invalid service ID"}',
  })
  serviceId: string;

  @ApiProperty({
    description: 'Clinic ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439014',
  })
  @IsNotEmpty({
    message: '{"ar":"معرف العيادة مطلوب","en":"Clinic ID is required"}',
  })
  @IsMongoId({
    message: '{"ar":"معرف العيادة غير صالح","en":"Invalid clinic ID"}',
  })
  clinicId: string;

  @ApiPropertyOptional({
    description: 'Department ID (MongoDB ObjectId) - Optional',
    example: '507f1f77bcf86cd799439015',
  })
  @IsOptional()
  @IsMongoId({
    message: '{"ar":"معرف القسم غير صالح","en":"Invalid department ID"}',
  })
  departmentId?: string;

  @ApiProperty({
    description: 'Appointment date',
    example: '2024-03-15T00:00:00.000Z',
    type: Date,
  })
  @IsNotEmpty({
    message: '{"ar":"تاريخ الموعد مطلوب","en":"Appointment date is required"}',
  })
  @Type(() => Date)
  @IsDate({
    message: '{"ar":"تاريخ الموعد غير صالح","en":"Invalid appointment date"}',
  })
  appointmentDate: Date;

  @ApiProperty({
    description: 'Appointment time in HH:mm format (24-hour)',
    example: '14:30',
    pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsNotEmpty({
    message: '{"ar":"وقت الموعد مطلوب","en":"Appointment time is required"}',
  })
  @IsString({
    message: '{"ar":"وقت الموعد يجب أن يكون نصاً","en":"Appointment time must be a string"}',
  })
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: '{"ar":"صيغة الوقت غير صالحة. استخدم الصيغة HH:mm (مثال: 14:30)","en":"Invalid time format. Use HH:mm format (e.g., 14:30)"}',
  })
  appointmentTime: string;

  @ApiPropertyOptional({
    description: 'Urgency level of the appointment',
    enum: UrgencyLevel,
    example: UrgencyLevel.MEDIUM,
    default: UrgencyLevel.MEDIUM,
  })
  @IsOptional()
  @IsEnum(UrgencyLevel, {
    message: '{"ar":"مستوى الأولوية غير صالح. القيم المسموحة: low, medium, high, urgent","en":"Invalid urgency level. Allowed values: low, medium, high, urgent"}',
  })
  urgency?: UrgencyLevel;

  @ApiPropertyOptional({
    description: 'Appointment notes',
    example: 'Patient has mild symptoms',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({
    message: '{"ar":"الملاحظات يجب أن تكون نصاً","en":"Notes must be a string"}',
  })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Internal notes (staff only)',
    example: 'VIP patient',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({
    message: '{"ar":"الملاحظات الداخلية يجب أن تكون نصاً","en":"Internal notes must be a string"}',
  })
  internalNotes?: string;

  @ApiPropertyOptional({
    description: 'Booking channel',
    enum: BookingChannel,
    example: BookingChannel.WEB,
    default: BookingChannel.WEB,
  })
  @IsOptional()
  @IsEnum(BookingChannel, {
    message: '{"ar":"قناة الحجز غير صالحة. القيم المسموحة: web, phone, walk-in","en":"Invalid booking channel. Allowed values: web, phone, walk-in"}',
  })
  bookingChannel?: BookingChannel;

  @ApiPropertyOptional({
    description: 'Reason for appointment',
    example: 'Regular checkup',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({
    message: '{"ar":"سبب الموعد يجب أن يكون نصاً","en":"Reason must be a string"}',
  })
  reason?: string;
}
