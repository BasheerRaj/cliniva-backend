import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
  Min,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateServiceDto {
  @ApiPropertyOptional({
    description: 'Complex department ID that owns this service',
    example: '507f1f77bcf86cd799439020',
    type: String,
  })
  @IsString()
  @IsOptional()
  complexDepartmentId?: string;

  @ApiPropertyOptional({
    description:
      'Clinic ID that owns this service (for clinic-specific services)',
    example: '507f1f77bcf86cd799439040',
    type: String,
  })
  @IsString()
  @IsOptional()
  clinicId?: string;

  @ApiProperty({
    description: 'Service name (2-100 characters)',
    example: 'General Consultation',
    type: String,
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the service',
    example: 'Standard medical consultation with a general practitioner',
    type: String,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Service duration in minutes',
    example: 30,
    type: Number,
    default: 30,
    minimum: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  durationMinutes?: number = 30;

  @ApiPropertyOptional({
    description: 'Service price in local currency',
    example: 150,
    type: Number,
    minimum: 0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;
}

export class ServiceAssignmentDto {
  @ApiProperty({
    description: 'Service ID to assign to the clinic',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @ApiPropertyOptional({
    description: 'Custom price override for this clinic (optional)',
    example: 160,
    type: Number,
    minimum: 0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  priceOverride?: number;

  @ApiPropertyOptional({
    description: 'Whether the service is active for this clinic',
    example: true,
    type: Boolean,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}

export class AssignServicesDto {
  @ApiProperty({
    description: 'Array of service assignments',
    type: [ServiceAssignmentDto],
    example: [
      {
        serviceId: '507f1f77bcf86cd799439011',
        priceOverride: 160,
        isActive: true,
      },
      {
        serviceId: '507f1f77bcf86cd799439012',
        priceOverride: 260,
        isActive: true,
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceAssignmentDto)
  serviceAssignments: ServiceAssignmentDto[];
}
