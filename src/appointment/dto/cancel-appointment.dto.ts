import { IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for cancelling an appointment
 * Requirements: 10.1-10.7
 * 
 * All validation messages are bilingual (Arabic & English)
 */
export class CancelAppointmentDto {
  @ApiProperty({
    description: 'Cancellation reason (required)',
    example: 'Patient unable to attend due to emergency',
    minLength: 5,
    maxLength: 500,
  })
  @IsNotEmpty({
    message: '{"ar":"سبب الإلغاء مطلوب","en":"Cancellation reason is required"}',
  })
  @IsString({
    message: '{"ar":"سبب الإلغاء يجب أن يكون نصاً","en":"Cancellation reason must be a string"}',
  })
  cancellationReason: string;

  @ApiPropertyOptional({
    description: 'Whether patient wants to reschedule',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean({
    message: '{"ar":"طلب إعادة الجدولة يجب أن يكون قيمة منطقية","en":"Reschedule requested must be a boolean"}',
  })
  rescheduleRequested?: boolean;

  @ApiPropertyOptional({
    description: 'Additional notes about cancellation',
    example: 'Patient will call back to reschedule',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({
    message: '{"ar":"الملاحظات يجب أن تكون نصاً","en":"Notes must be a string"}',
  })
  notes?: string;
}
