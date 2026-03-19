import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for service session data
 * Requirements: 1.2, 2.3, 6.1, 6.2
 * 
 * Represents a single session within a multi-step service (e.g., "Diagnosis", "Blood Test", "Surgery")
 * Sessions can have optional names (auto-generated if not provided) and optional durations (inherit from service if not provided)
 */
export class ServiceSessionDto {
  @ApiPropertyOptional({
    description: 'Session name (auto-generated as "Session {order}" if not provided)',
    example: 'Diagnosis',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({
    message: '{"ar":"اسم الجلسة يجب أن يكون نصاً","en":"Session name must be a string"}',
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'Session duration in minutes (inherits from service.durationMinutes if not provided)',
    example: 45,
    minimum: 5,
    maximum: 480,
  })
  @IsOptional()
  @IsNumber(
    {},
    {
      message: '{"ar":"مدة الجلسة يجب أن تكون رقماً","en":"Session duration must be a number"}',
    }
  )
  @Min(5, {
    message: '{"ar":"مدة الجلسة يجب أن تكون 5 دقائق على الأقل","en":"Session duration must be at least 5 minutes"}',
  })
  @Max(480, {
    message: '{"ar":"مدة الجلسة يجب ألا تتجاوز 480 دقيقة (8 ساعات)","en":"Session duration must not exceed 480 minutes (8 hours)"}',
  })
  duration?: number;

  @ApiProperty({
    description: 'Session order number (must be unique within service, positive integer)',
    example: 1,
    minimum: 1,
  })
  @IsNumber(
    {},
    {
      message: '{"ar":"ترتيب الجلسة يجب أن يكون رقماً","en":"Session order must be a number"}',
    }
  )
  @Min(1, {
    message: '{"ar":"ترتيب الجلسة يجب أن يكون رقماً موجباً","en":"Session order must be a positive number"}',
  })
  order: number;

  @ApiPropertyOptional({
    description: 'Optional session description',
    example: 'Patient evaluation and symptom history collection',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({
    message:
      '{"ar":"وصف الجلسة يجب أن يكون نصاً","en":"Session description must be a string"}',
  })
  @MaxLength(500, {
    message:
      '{"ar":"وصف الجلسة يجب ألا يتجاوز 500 حرف","en":"Session description must not exceed 500 characters"}',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether appointment is required for this session',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean({
    message:
      '{"ar":"حقل طلب الموعد يجب أن يكون true أو false","en":"Appointment required must be a boolean"}',
  })
  appointmentRequired?: boolean;
}
