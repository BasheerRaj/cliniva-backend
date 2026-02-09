import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsMongoId,
  MinLength,
  MaxLength,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateServiceDto {
  @ApiPropertyOptional({
    description: 'Service name (2-100 characters)',
    example: 'General Consultation - Updated',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Service description',
    example: 'Updated description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Service duration in minutes',
    example: 45,
    minimum: 5,
    maximum: 480,
  })
  @IsNumber()
  @IsOptional()
  @Min(5)
  @Max(480)
  durationMinutes?: number;

  @ApiPropertyOptional({
    description: 'Service price',
    example: 200,
    minimum: 0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    description: 'Complex Department MongoDB ObjectId (triggers rescheduling if changed)',
    example: '507f1f77bcf86cd799439012',
  })
  @IsString()
  @IsOptional()
  @IsMongoId()
  complexDepartmentId?: string;

  @ApiPropertyOptional({
    description: 'Clinic MongoDB ObjectId (triggers rescheduling if changed)',
    example: '507f1f77bcf86cd799439014',
  })
  @IsString()
  @IsOptional()
  @IsMongoId()
  clinicId?: string;

  @ApiPropertyOptional({
    description: 'Required if changes affect active appointments. Set to true to confirm rescheduling.',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  confirmRescheduling?: boolean;
}

