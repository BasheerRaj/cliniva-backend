import {
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsString,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum ComplexStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

/**
 * DTO for updating complex status with cascading effects
 * Subtask 1.3.11: Update all complex DTOs with @ApiProperty decorators
 * Subtask 1.3.10: Document PATCH /complexes/:id/status endpoint
 */
export class UpdateComplexStatusDto {
  @ApiProperty({
    description:
      'New status for the complex. Changing to inactive/suspended triggers cascading effects on clinics, services, and appointments.',
    enum: ComplexStatus,
    example: ComplexStatus.INACTIVE,
  })
  @IsNotEmpty()
  @IsEnum(ComplexStatus)
  status: ComplexStatus;

  @ApiPropertyOptional({
    description:
      'Target complex ID for transferring clinics (required when status is inactive/suspended and transferClinics is true)',
    example: '507f1f77bcf86cd799439020',
    type: String,
  })
  @ValidateIf((o) => o.status === 'inactive' || o.status === 'suspended')
  @IsOptional()
  @IsString()
  targetComplexId?: string;

  @ApiPropertyOptional({
    description: 'Reason for deactivation or suspension',
    example: 'Temporary closure for renovation',
    type: String,
  })
  @IsOptional()
  @IsString()
  deactivationReason?: string;

  @ApiPropertyOptional({
    description:
      'Whether to transfer clinics to target complex when deactivating',
    example: false,
    type: Boolean,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  transferClinics?: boolean = false;
}
