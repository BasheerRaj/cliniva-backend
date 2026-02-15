import {
  IsBoolean,
  IsNotEmpty,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChangeServiceStatusDto {
  @ApiProperty({
    description: 'Whether the service should be active or inactive',
    example: false,
    type: Boolean,
  })
  @IsBoolean()
  @IsNotEmpty()
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'Reason for deactivation (required when deactivating)',
    example: 'Service temporarily unavailable due to maintenance',
    type: String,
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @ValidateIf((o) => !o.isActive)
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({
    description:
      'Confirmation flag required when service has active appointments',
    example: true,
    type: Boolean,
  })
  @IsBoolean()
  @IsOptional()
  confirmRescheduling?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to notify patients about the status change',
    example: true,
    type: Boolean,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  notifyPatients?: boolean;
}


