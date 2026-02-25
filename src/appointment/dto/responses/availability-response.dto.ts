import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BilingualMessage } from './appointment-response.dto';

/**
 * Time slot information
 */
export class TimeSlot {
  @ApiProperty({ description: 'Time in HH:mm format', example: '14:30' })
  time: string;

  @ApiProperty({ description: 'Is slot available', example: true })
  available: boolean;

  @ApiPropertyOptional({ description: 'Reason if not available', example: 'Doctor has another appointment' })
  reason?: string;

  @ApiPropertyOptional({ description: 'Existing appointment ID if occupied', example: '507f1f77bcf86cd799439016' })
  existingAppointmentId?: string;
}

/**
 * Daily availability information
 */
export class DayAvailability {
  @ApiProperty({ description: 'Date', example: '2024-03-15T00:00:00.000Z', type: Date })
  date: Date;

  @ApiProperty({ description: 'Available time slots', type: [TimeSlot] })
  slots: TimeSlot[];

  @ApiProperty({ description: 'Total slots in the day', example: 16 })
  totalSlots: number;

  @ApiProperty({ description: 'Available slots count', example: 10 })
  availableSlots: number;

  @ApiProperty({ description: 'Booked slots count', example: 6 })
  bookedSlots: number;
}

/**
 * Availability data structure
 */
export class AvailabilityData {
  @ApiProperty({ description: 'Doctor ID', example: '507f1f77bcf86cd799439012' })
  doctorId: string;

  @ApiProperty({ description: 'Doctor name', example: 'Dr. Fatima Al-Rashid' })
  doctorName: string;

  @ApiPropertyOptional({ description: 'Service ID', example: '507f1f77bcf86cd799439013' })
  serviceId?: string;

  @ApiPropertyOptional({ description: 'Service name', example: 'General Consultation' })
  serviceName?: string;

  @ApiPropertyOptional({ description: 'Clinic ID', example: '507f1f77bcf86cd799439014' })
  clinicId?: string;

  @ApiPropertyOptional({ description: 'Clinic name', example: 'Main Clinic' })
  clinicName?: string;

  @ApiProperty({ description: 'Duration in minutes', example: 30 })
  duration: number;

  @ApiProperty({ description: 'Availability by date', type: [DayAvailability] })
  availableSlots: DayAvailability[];
}

/**
 * Availability response DTO
 * Requirements: 15.1-15.6
 */
export class AvailabilityResponseDto {
  @ApiProperty({ description: 'Success status', example: true })
  success: boolean;

  @ApiProperty({ description: 'Availability data', type: AvailabilityData })
  data: AvailabilityData;

  @ApiProperty({ description: 'Bilingual message', type: BilingualMessage })
  message: BilingualMessage;
}
