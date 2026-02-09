import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsMongoId,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateServiceDto {
  @ApiPropertyOptional({
    description: 'Complex Department MongoDB ObjectId (required if clinicId not provided)',
    example: '507f1f77bcf86cd799439012',
  })
  @IsString()
  @IsOptional()
  @IsMongoId()
  complexDepartmentId?: string;

  @ApiPropertyOptional({
    description: 'Clinic MongoDB ObjectId (required if complexDepartmentId not provided)',
    example: '507f1f77bcf86cd799439014',
  })
  @IsString()
  @IsOptional()
  @IsMongoId()
  clinicId?: string;

  @ApiProperty({
    description: 'Service name (2-100 characters)',
    example: 'General Consultation',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Service description',
    example: 'Standard medical consultation with a doctor',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Service duration in minutes (default: 30)',
    example: 30,
    minimum: 5,
    maximum: 480,
    default: 30,
  })
  @IsNumber()
  @IsOptional()
  @Min(5)
  @Max(480)
  durationMinutes?: number = 30;

  @ApiPropertyOptional({
    description: 'Service price (default: 0)',
    example: 150,
    minimum: 0,
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;
}

export class ServiceAssignmentDto {
  @ApiProperty({
    description: 'Service MongoDB ObjectId',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  serviceId: string;

  @ApiPropertyOptional({
    description: 'Optional price override for this clinic',
    example: 200,
    minimum: 0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  priceOverride?: number;

  @ApiPropertyOptional({
    description: 'Whether the service is active at this clinic (default: true)',
    example: true,
    default: true,
  })
  @IsOptional()
  isActive?: boolean = true;
}

export class AssignServicesDto {
  @ApiProperty({
    description: 'Array of service assignments',
    type: () => [ServiceAssignmentDto],
  })
  @IsArray()
  serviceAssignments: ServiceAssignmentDto[];
}
