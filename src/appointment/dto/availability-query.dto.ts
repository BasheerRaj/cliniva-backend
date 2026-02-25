import { IsNotEmpty, IsOptional, IsMongoId, IsDate, IsNumber, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for checking doctor availability
 * Requirements: 12.1-12.8
 * 
 * All validation messages are bilingual (Arabic & English)
 */
export class AvailabilityQueryDto {
  @ApiProperty({
    description: 'Doctor ID to check availability for',
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
    description: 'Start date for availability check',
    example: '2024-03-15T00:00:00.000Z',
    type: Date,
  })
  @IsNotEmpty({
    message: '{"ar":"تاريخ البداية مطلوب","en":"Start date is required"}',
  })
  @Type(() => Date)
  @IsDate({
    message: '{"ar":"تاريخ البداية غير صالح","en":"Invalid start date"}',
  })
  startDate: Date;

  @ApiPropertyOptional({
    description: 'End date for availability check (defaults to start date)',
    example: '2024-03-15T23:59:59.999Z',
    type: Date,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({
    message: '{"ar":"تاريخ النهاية غير صالح","en":"Invalid end date"}',
  })
  endDate?: Date;

  @ApiPropertyOptional({
    description: 'Service ID to get service duration',
    example: '507f1f77bcf86cd799439013',
  })
  @IsOptional()
  @IsMongoId({
    message: '{"ar":"معرف الخدمة غير صالح","en":"Invalid service ID"}',
  })
  serviceId?: string;

  @ApiPropertyOptional({
    description: 'Clinic ID to check clinic working hours',
    example: '507f1f77bcf86cd799439014',
  })
  @IsOptional()
  @IsMongoId({
    message: '{"ar":"معرف العيادة غير صالح","en":"Invalid clinic ID"}',
  })
  clinicId?: string;

  @ApiPropertyOptional({
    description: 'Duration in minutes (if service not specified)',
    example: 30,
    default: 30,
    minimum: 15,
    maximum: 240,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    {},
    {
      message: '{"ar":"المدة يجب أن تكون رقماً","en":"Duration must be a number"}',
    },
  )
  @Min(15, {
    message: '{"ar":"المدة يجب أن تكون 15 دقيقة على الأقل","en":"Duration must be at least 15 minutes"}',
  })
  @Max(240, {
    message: '{"ar":"المدة يجب ألا تتجاوز 240 دقيقة","en":"Duration must not exceed 240 minutes"}',
  })
  duration?: number = 30;

  @ApiPropertyOptional({
    description: 'Session ID — when provided, availability is calculated using session-specific duration',
    example: '507f1f77bcf86cd799439015',
  })
  @IsOptional()
  @IsString({
    message: '{"ar":"معرف الجلسة يجب أن يكون نصاً","en":"Session ID must be a string"}',
  })
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Number of available slots to suggest',
    example: 5,
    default: 5,
    minimum: 1,
    maximum: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    {},
    {
      message: '{"ar":"عدد الفترات يجب أن يكون رقماً","en":"Slot count must be a number"}',
    },
  )
  @Min(1, {
    message: '{"ar":"عدد الفترات يجب أن يكون 1 على الأقل","en":"Slot count must be at least 1"}',
  })
  @Max(20, {
    message: '{"ar":"عدد الفترات يجب ألا يتجاوز 20","en":"Slot count must not exceed 20"}',
  })
  slotCount?: number = 5;
}
