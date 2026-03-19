import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsMongoId,
  Min,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateServiceDto {
  @ApiPropertyOptional({
    description: 'Service name (2-100 characters)',
    example: 'General Consultation - Updated',
    type: String,
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the service',
    example: 'Updated description for general consultation',
    type: String,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Service duration in minutes',
    example: 45,
    type: Number,
    minimum: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional({
    description: 'Service price in local currency',
    example: 200,
    type: Number,
    minimum: 0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    description: 'Service category label',
    example: 'Consultation',
    type: String,
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  serviceCategory?: string;

  @ApiPropertyOptional({
    description: 'Complex ID that owns this service',
    example: '507f1f77bcf86cd799439020',
    type: String,
  })
  @IsString()
  @IsOptional()
  @IsMongoId()
  complexId?: string;

  @ApiPropertyOptional({
    description:
      'Clinic ID that owns this service (for clinic-specific services)',
    example: '507f1f77bcf86cd799439040',
    type: String,
  })
  @IsString()
  @IsOptional()
  @IsMongoId()
  clinicId?: string;

  @ApiPropertyOptional({
    description:
      'Confirmation flag required when changes affect active appointments',
    example: true,
    type: Boolean,
  })
  @IsBoolean()
  @IsOptional()
  confirmRescheduling?: boolean;

  @ApiPropertyOptional({
    description: 'Required medical equipment for this service',
    example: 'ECG machine',
    type: String,
    maxLength: 300,
  })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  requiredEquipment?: string;

  @ApiPropertyOptional({
    description:
      'Multiple clinics where this service can be assigned/used for doctor assignments',
    type: [String],
    example: ['507f1f77bcf86cd799439040', '507f1f77bcf86cd799439041'],
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  clinicIds?: string[];
}
