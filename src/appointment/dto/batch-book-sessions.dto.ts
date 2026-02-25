import {
  IsNotEmpty,
  IsString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  IsMongoId,
  IsDate,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for individual session booking within a batch
 * Requirements: 7.1, 7.6
 */
export class SessionBookingDto {
  @ApiProperty({
    description: 'Session ID to book (references session._id within service.sessions array)',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty({
    message: '{"ar":"معرف الجلسة مطلوب","en":"Session ID is required"}',
  })
  @IsString({
    message: '{"ar":"معرف الجلسة يجب أن يكون نصاً","en":"Session ID must be a string"}',
  })
  sessionId: string;

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
}

/**
 * DTO for batch booking multiple sessions
 * Requirements: 7.1, 7.6
 * 
 * Allows booking 1-10 sessions at once for a patient with a specific doctor and service
 * All bookings in the batch must be for the same patient and service
 * Uses MongoDB transactions to ensure atomicity (all or nothing)
 */
export class BatchBookSessionsDto {
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

  @ApiProperty({
    description: 'Array of session bookings (1-10 sessions per batch)',
    type: [SessionBookingDto],
    minItems: 1,
    maxItems: 10,
    example: [
      {
        sessionId: '507f1f77bcf86cd799439011',
        appointmentDate: '2024-03-15T00:00:00.000Z',
        appointmentTime: '09:00',
      },
      {
        sessionId: '507f1f77bcf86cd799439012',
        appointmentDate: '2024-03-22T00:00:00.000Z',
        appointmentTime: '10:00',
      },
    ],
  })
  @IsArray({
    message: '{"ar":"حجوزات الجلسات يجب أن تكون مصفوفة","en":"Session bookings must be an array"}',
  })
  @ValidateNested({ each: true })
  @Type(() => SessionBookingDto)
  @ArrayMinSize(1, {
    message: '{"ar":"يجب حجز جلسة واحدة على الأقل","en":"At least one session must be booked"}',
  })
  @ArrayMaxSize(10, {
    message: '{"ar":"لا يمكن حجز أكثر من 10 جلسات في وقت واحد","en":"Cannot book more than 10 sessions at once"}',
  })
  sessionBookings: SessionBookingDto[];
}
