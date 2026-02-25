import { IsNotEmpty, IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '../constants/appointment-status.enum';

/**
 * DTO for updating appointment status
 * Requirements: 6.1-6.12
 * 
 * All validation messages are bilingual (Arabic & English)
 */
export class StatusUpdateDto {
  @ApiProperty({
    description: 'New appointment status',
    enum: AppointmentStatus,
    example: AppointmentStatus.CONFIRMED,
  })
  @IsNotEmpty({
    message: '{"ar":"الحالة مطلوبة","en":"Status is required"}',
  })
  @IsEnum(AppointmentStatus, {
    message: '{"ar":"الحالة غير صالحة. القيم المسموحة: scheduled, confirmed, in_progress, completed, cancelled, no_show","en":"Invalid status. Allowed values: scheduled, confirmed, in_progress, completed, cancelled, no_show"}',
  })
  status: AppointmentStatus;

  @ApiPropertyOptional({
    description: 'Reason for status change',
    example: 'Patient confirmed via phone',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({
    message: '{"ar":"السبب يجب أن يكون نصاً","en":"Reason must be a string"}',
  })
  reason?: string;

  @ApiPropertyOptional({
    description: 'Additional notes for status change',
    example: 'Patient requested confirmation',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({
    message: '{"ar":"الملاحظات يجب أن تكون نصاً","en":"Notes must be a string"}',
  })
  notes?: string;
}
