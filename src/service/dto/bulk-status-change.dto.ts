import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  ValidateIf,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkStatusChangeDto {
  @ApiProperty({
    description: 'Array of service IDs to change status',
    example: [
      '507f1f77bcf86cd799439011',
      '507f1f77bcf86cd799439012',
      '507f1f77bcf86cd799439013',
    ],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty()
  serviceIds: string[];

  @ApiProperty({
    description: 'Whether the services should be active or inactive',
    example: false,
    type: Boolean,
  })
  @IsBoolean()
  @IsNotEmpty()
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'Reason for status change (required when deactivating)',
    example: 'Temporary closure due to maintenance',
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
      'Confirmation flag required when services have active appointments',
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

