import { IsArray, IsOptional, ValidateNested, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateServiceDto } from './create-service.dto';
import { ServiceSessionDto } from './service-session.dto';

/**
 * DTO for creating a service with optional sessions
 * Requirements: 1.4, 1.7
 * 
 * Extends CreateServiceDto to add support for multi-step services with sessions
 * Maximum 50 sessions per service as per requirement 1.4
 */
export class CreateServiceWithSessionsDto extends CreateServiceDto {
  @ApiPropertyOptional({
    description: 'Array of sessions for multi-step services (max 50 sessions)',
    type: [ServiceSessionDto],
    maxItems: 50,
    example: [
      { name: 'Diagnosis', duration: 30, order: 1 },
      { name: 'Blood Test', duration: 15, order: 2 },
      { name: 'Surgery', duration: 120, order: 3 },
      { order: 4 }, // Inherits service duration, name auto-generated as "Session 4"
    ],
  })
  @IsOptional()
  @IsArray({
    message: '{"ar":"الجلسات يجب أن تكون مصفوفة","en":"Sessions must be an array"}',
  })
  @ValidateNested({ each: true })
  @Type(() => ServiceSessionDto)
  @ArrayMaxSize(50, {
    message: '{"ar":"لا يمكن أن يحتوي الخدمة على أكثر من 50 جلسة","en":"Service cannot have more than 50 sessions"}',
  })
  sessions?: ServiceSessionDto[];
}
