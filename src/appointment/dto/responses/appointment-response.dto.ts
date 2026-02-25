import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '../../constants/appointment-status.enum';
import { UrgencyLevel } from '../../constants/urgency-level.enum';
import { BookingChannel } from '../../constants/booking-channel.enum';

/**
 * Bilingual message structure
 * Requirements: 15.1-15.6
 */
export class BilingualMessage {
  @ApiProperty({ description: 'Arabic message', example: 'تم إنشاء الموعد بنجاح' })
  ar: string;

  @ApiProperty({ description: 'English message', example: 'Appointment created successfully' })
  en: string;
}

/**
 * Populated patient data in response
 */
export class AppointmentPatientDto {
  @ApiProperty({ description: 'Patient ID', example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ description: 'Patient full name', example: 'Ahmed Hassan' })
  name: string;

  @ApiProperty({ description: 'Patient contact number', example: '+966501234567' })
  contactNumber: string;

  @ApiPropertyOptional({ description: 'Patient email', example: 'ahmed@example.com' })
  email?: string;
}

/**
 * Populated doctor data in response
 */
export class AppointmentDoctorDto {
  @ApiProperty({ description: 'Doctor ID', example: '507f1f77bcf86cd799439012' })
  id: string;

  @ApiProperty({ description: 'Doctor full name', example: 'Dr. Fatima Al-Rashid' })
  name: string;

  @ApiProperty({ description: 'Doctor specialty', example: 'Cardiology' })
  specialty: string;

  @ApiPropertyOptional({ description: 'Doctor email', example: 'fatima@clinic.com' })
  email?: string;
}

/**
 * Populated service data in response
 */
export class AppointmentServiceDto {
  @ApiProperty({ description: 'Service ID', example: '507f1f77bcf86cd799439013' })
  id: string;

  @ApiProperty({ description: 'Service name', example: 'General Consultation' })
  name: string;

  @ApiProperty({ description: 'Service duration in minutes', example: 30 })
  duration: number;

  @ApiPropertyOptional({ description: 'Service price', example: 150.0 })
  price?: number;
}

/**
 * Populated clinic data in response
 */
export class AppointmentClinicDto {
  @ApiProperty({ description: 'Clinic ID', example: '507f1f77bcf86cd799439014' })
  id: string;

  @ApiProperty({ description: 'Clinic name', example: 'Main Clinic' })
  name: string;

  @ApiPropertyOptional({ description: 'Clinic address', example: '123 Medical Street, Riyadh' })
  address?: string;
}

/**
 * Populated department data in response
 */
export class AppointmentDepartmentDto {
  @ApiProperty({ description: 'Department ID', example: '507f1f77bcf86cd799439015' })
  id: string;

  @ApiProperty({ description: 'Department name', example: 'Cardiology Department' })
  name: string;
}

/**
 * Appointment data structure
 */
export class AppointmentDataDto {
  @ApiProperty({ description: 'Appointment ID', example: '507f1f77bcf86cd799439016' })
  id: string;

  @ApiProperty({ description: 'Patient information', type: AppointmentPatientDto })
  patient: AppointmentPatientDto;

  @ApiProperty({ description: 'Doctor information', type: AppointmentDoctorDto })
  doctor: AppointmentDoctorDto;

  @ApiProperty({ description: 'Service information', type: AppointmentServiceDto })
  service: AppointmentServiceDto;

  @ApiProperty({ description: 'Clinic information', type: AppointmentClinicDto })
  clinic: AppointmentClinicDto;

  @ApiPropertyOptional({ description: 'Department information', type: AppointmentDepartmentDto })
  department?: AppointmentDepartmentDto;

  @ApiProperty({ description: 'Appointment date', example: '2024-03-15T00:00:00.000Z', type: Date })
  appointmentDate: Date;

  @ApiProperty({ description: 'Appointment time', example: '14:30' })
  appointmentTime: string;

  @ApiProperty({ description: 'Appointment duration in minutes', example: 30 })
  duration: number;

  @ApiProperty({ description: 'Appointment status', enum: AppointmentStatus, example: AppointmentStatus.SCHEDULED })
  status: AppointmentStatus;

  @ApiPropertyOptional({ description: 'Urgency level', enum: UrgencyLevel, example: UrgencyLevel.MEDIUM })
  urgency?: UrgencyLevel;

  @ApiPropertyOptional({ description: 'Booking channel', enum: BookingChannel, example: BookingChannel.WEB })
  bookingChannel?: BookingChannel;

  @ApiPropertyOptional({ description: 'Appointment notes', example: 'Patient has mild symptoms' })
  notes?: string;

  @ApiPropertyOptional({ description: 'Internal notes', example: 'VIP patient' })
  internalNotes?: string;

  @ApiPropertyOptional({ description: 'Reason for appointment', example: 'Regular checkup' })
  reason?: string;

  @ApiPropertyOptional({ description: 'Actual start time', example: '2024-03-15T14:32:00.000Z', type: Date })
  actualStartTime?: Date;

  @ApiPropertyOptional({ description: 'Actual end time', example: '2024-03-15T15:05:00.000Z', type: Date })
  actualEndTime?: Date;

  @ApiPropertyOptional({ description: 'Completion notes', example: 'Patient responded well to treatment' })
  completionNotes?: string;

  @ApiPropertyOptional({ description: 'Cancellation reason', example: 'Patient unable to attend' })
  cancellationReason?: string;

  @ApiPropertyOptional({ description: 'Medical report ID', example: '507f1f77bcf86cd799439017' })
  medicalReportId?: string;

  @ApiPropertyOptional({ description: 'Is documented', example: true })
  isDocumented?: boolean;

  @ApiProperty({ description: 'Created at', example: '2024-03-10T10:00:00.000Z', type: Date })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at', example: '2024-03-10T10:00:00.000Z', type: Date })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Created by user ID', example: '507f1f77bcf86cd799439018' })
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Updated by user ID', example: '507f1f77bcf86cd799439019' })
  updatedBy?: string;
}

/**
 * Single appointment response DTO
 * Requirements: 15.1-15.6
 */
export class AppointmentResponseDto {
  @ApiProperty({ description: 'Success status', example: true })
  success: boolean;

  @ApiProperty({ description: 'Appointment data', type: AppointmentDataDto })
  data: AppointmentDataDto;

  @ApiProperty({ description: 'Bilingual message', type: BilingualMessage })
  message: BilingualMessage;
}
