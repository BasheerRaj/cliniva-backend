import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateAppointmentDto } from './create-appointment.dto';

/**
 * DTO for creating an appointment with optional session reference
 * Requirements: 3.1, 3.2
 * 
 * Extends CreateAppointmentDto to add support for session-specific appointments
 * SessionId is required if the service has sessions defined, optional otherwise
 */
export class CreateAppointmentWithSessionDto extends CreateAppointmentDto {
  @ApiPropertyOptional({
    description: 'Session ID (required if service has sessions defined, references session._id within service.sessions array)',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsString({
    message: '{"ar":"معرف الجلسة يجب أن يكون نصاً","en":"Session ID must be a string"}',
  })
  sessionId?: string;
}
