import {
  IsArray,
  IsOptional,
  IsMongoId,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateServiceDto } from './create-service.dto';
import { ServiceSessionDto } from './service-session.dto';

export class DoctorClinicAssignmentDto {
  @ApiPropertyOptional({
    description: 'Doctor ID to assign',
    type: String,
    example: '507f1f77bcf86cd799439012',
  })
  @IsMongoId()
  doctorId: string;

  @ApiPropertyOptional({
    description: 'Clinic ID where doctor is assigned for this service',
    type: String,
    example: '507f1f77bcf86cd799439040',
  })
  @IsMongoId()
  clinicId: string;
}

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

  @ApiPropertyOptional({
    description:
      'Optional list of doctor IDs to assign to this service at creation time. ' +
      'Requires `clinicId` to be set on the service — the clinic ID is used as the ' +
      'scope for all assignments. Doctors are validated to ensure they work at that clinic.',
    type: [String],
    example: [
      '507f1f77bcf86cd799439012',
      '507f1f77bcf86cd799439016',
    ],
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  doctorIds?: string[];

  @ApiPropertyOptional({
    description:
      'Explicit doctor-clinic assignments. Use this for multi-clinic assignment during service creation.',
    type: [DoctorClinicAssignmentDto],
    example: [
      {
        doctorId: '507f1f77bcf86cd799439012',
        clinicId: '507f1f77bcf86cd799439040',
      },
      {
        doctorId: '507f1f77bcf86cd799439016',
        clinicId: '507f1f77bcf86cd799439041',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DoctorClinicAssignmentDto)
  doctorAssignments?: DoctorClinicAssignmentDto[];
}
