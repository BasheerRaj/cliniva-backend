import { IsNotEmpty, IsOptional, IsString, IsDate, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for rescheduling an appointment
 * Requirements: 11.1-11.9
 * 
 * All validation messages are bilingual (Arabic & English)
 */
export class RescheduleDto {
  @ApiProperty({
    description: 'New appointment date',
    example: '2024-03-20T00:00:00.000Z',
    type: Date,
  })
  @IsNotEmpty({
    message: '{"ar":"التاريخ الجديد مطلوب","en":"New date is required"}',
  })
  @Type(() => Date)
  @IsDate({
    message: '{"ar":"التاريخ الجديد غير صالح","en":"Invalid new date"}',
  })
  newDate: Date;

  @ApiProperty({
    description: 'New appointment time in HH:mm format (24-hour)',
    example: '09:00',
    pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsNotEmpty({
    message: '{"ar":"الوقت الجديد مطلوب","en":"New time is required"}',
  })
  @IsString({
    message: '{"ar":"الوقت الجديد يجب أن يكون نصاً","en":"New time must be a string"}',
  })
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: '{"ar":"صيغة الوقت غير صالحة. استخدم الصيغة HH:mm (مثال: 09:00)","en":"Invalid time format. Use HH:mm format (e.g., 09:00)"}',
  })
  newTime: string;

  @ApiPropertyOptional({
    description: 'Reason for rescheduling',
    example: 'Patient requested earlier time',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({
    message: '{"ar":"سبب إعادة الجدولة يجب أن يكون نصاً","en":"Reschedule reason must be a string"}',
  })
  reason?: string;

  @ApiPropertyOptional({
    description: 'Additional notes about rescheduling',
    example: 'Patient prefers morning appointments',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({
    message: '{"ar":"الملاحظات يجب أن تكون نصاً","en":"Notes must be a string"}',
  })
  notes?: string;
}
