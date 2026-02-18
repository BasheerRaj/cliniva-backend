import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsMongoId,
  MaxLength,
  MinLength,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignDoctorToServiceDto {
  @ApiProperty({
    description: 'Doctor User ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439012',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  doctorId: string;

  @ApiProperty({
    description: 'Clinic ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439014',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  clinicId: string;

  @ApiPropertyOptional({
    description: 'Optional notes about this assignment',
    example: 'Specialized in this service',
    type: String,
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}

export class DeactivateDoctorFromServiceDto {
  @ApiProperty({
    description: 'Clinic ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439014',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  clinicId: string;

  @ApiProperty({
    description: 'Reason for deactivation',
    example: 'Doctor transferred to another department',
    type: String,
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(500)
  reason: string;

  @ApiPropertyOptional({
    description: 'Doctor ID to transfer appointments to',
    example: '507f1f77bcf86cd799439016',
    type: String,
  })
  @IsString()
  @IsOptional()
  @IsMongoId()
  transferAppointmentsTo?: string;

  @ApiPropertyOptional({
    description: 'Whether to notify patients about the change',
    example: true,
    type: Boolean,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  notifyPatients?: boolean;
}

export class UpdateDoctorServiceNotesDto {
  @ApiProperty({
    description: 'Clinic ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439014',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  clinicId: string;

  @ApiPropertyOptional({
    description: 'Notes about this assignment',
    example: 'Updated notes',
    type: String,
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}
