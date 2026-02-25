import { IsOptional, IsEnum, IsMongoId, IsDate, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '../constants/appointment-status.enum';

/**
 * DTO for filtering and paginating appointment lists
 * Requirements: 4.1-4.10
 * 
 * All validation messages are bilingual (Arabic & English)
 */
export class AppointmentFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by patient ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsMongoId({
    message: '{"ar":"معرف المريض غير صالح","en":"Invalid patient ID"}',
  })
  patientId?: string;

  @ApiPropertyOptional({
    description: 'Filter by doctor ID',
    example: '507f1f77bcf86cd799439012',
  })
  @IsOptional()
  @IsMongoId({
    message: '{"ar":"معرف الطبيب غير صالح","en":"Invalid doctor ID"}',
  })
  doctorId?: string;

  @ApiPropertyOptional({
    description: 'Filter by clinic ID',
    example: '507f1f77bcf86cd799439014',
  })
  @IsOptional()
  @IsMongoId({
    message: '{"ar":"معرف العيادة غير صالح","en":"Invalid clinic ID"}',
  })
  clinicId?: string;

  @ApiPropertyOptional({
    description: 'Filter by department ID',
    example: '507f1f77bcf86cd799439015',
  })
  @IsOptional()
  @IsMongoId({
    message: '{"ar":"معرف القسم غير صالح","en":"Invalid department ID"}',
  })
  departmentId?: string;

  @ApiPropertyOptional({
    description: 'Filter by appointment status',
    enum: AppointmentStatus,
    example: AppointmentStatus.SCHEDULED,
  })
  @IsOptional()
  @IsEnum(AppointmentStatus, {
    message: '{"ar":"حالة الموعد غير صالحة","en":"Invalid appointment status"}',
  })
  status?: AppointmentStatus;

  @ApiPropertyOptional({
    description: 'Filter by start date (inclusive)',
    example: '2024-03-01T00:00:00.000Z',
    type: Date,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({
    message: '{"ar":"تاريخ البداية غير صالح","en":"Invalid start date"}',
  })
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'Filter by end date (inclusive)',
    example: '2024-03-31T23:59:59.999Z',
    type: Date,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({
    message: '{"ar":"تاريخ النهاية غير صالح","en":"Invalid end date"}',
  })
  endDate?: Date;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    {},
    {
      message: '{"ar":"رقم الصفحة يجب أن يكون رقماً","en":"Page number must be a number"}',
    },
  )
  @Min(1, {
    message: '{"ar":"رقم الصفحة يجب أن يكون 1 على الأقل","en":"Page number must be at least 1"}',
  })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    {},
    {
      message: '{"ar":"عدد العناصر يجب أن يكون رقماً","en":"Limit must be a number"}',
    },
  )
  @Min(1, {
    message: '{"ar":"عدد العناصر يجب أن يكون 1 على الأقل","en":"Limit must be at least 1"}',
  })
  @Max(100, {
    message: '{"ar":"عدد العناصر يجب ألا يتجاوز 100","en":"Limit must not exceed 100"}',
  })
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    example: 'appointmentDate',
    enum: ['appointmentDate', 'appointmentTime', 'status', 'createdAt'],
    default: 'appointmentDate',
  })
  @IsOptional()
  sortBy?: string = 'appointmentDate';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'asc',
    enum: ['asc', 'desc'],
    default: 'asc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'], {
    message: '{"ar":"ترتيب الفرز يجب أن يكون asc أو desc","en":"Sort order must be asc or desc"}',
  })
  sortOrder?: 'asc' | 'desc' = 'asc';
}
