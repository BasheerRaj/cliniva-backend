import {
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UpdateServiceDto } from './update-service.dto';
import { ServiceSessionDto } from './service-session.dto';

/**
 * DTO for updating a service with optional session management.
 * Requirements: 13.1-13.4, 14.2
 *
 * - sessions: complete replacement array for service.sessions (undefined = no change)
 * - removedSessionIds: explicit list of session _ids being removed (used to
 *   validate referential integrity before allowing removal)
 */
export class UpdateServiceWithSessionsDto extends UpdateServiceDto {
  @ApiPropertyOptional({
    description:
      'Complete new sessions array (replaces existing sessions). ' +
      'Omit this field entirely to leave sessions unchanged.',
    type: [ServiceSessionDto],
    maxItems: 50,
    example: [
      { name: 'Diagnosis', duration: 45, order: 1 },
      { name: 'Blood Test', duration: 15, order: 2 },
    ],
  })
  @IsOptional()
  @IsArray({
    message: '{"ar":"الجلسات يجب أن تكون مصفوفة","en":"Sessions must be an array"}',
  })
  @ValidateNested({ each: true })
  @Type(() => ServiceSessionDto)
  @ArrayMaxSize(50, {
    message:
      '{"ar":"لا يمكن أن يحتوي الخدمة على أكثر من 50 جلسة","en":"Service cannot have more than 50 sessions"}',
  })
  sessions?: ServiceSessionDto[];

  @ApiPropertyOptional({
    description:
      'Session IDs (_id values from service.sessions) that are being removed. ' +
      'Required when removing sessions to enable referential integrity checks.',
    type: [String],
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
  })
  @IsOptional()
  @IsArray({
    message:
      '{"ar":"معرفات الجلسات المحذوفة يجب أن تكون مصفوفة","en":"Removed session IDs must be an array"}',
  })
  @IsString({ each: true })
  removedSessionIds?: string[];
}
