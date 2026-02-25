import { IsOptional, IsEnum, IsMongoId, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '../constants/appointment-status.enum';
import { CalendarView } from '../constants/calendar-view.enum';

/**
 * DTO for calendar view queries
 * Requirements: 5.1-5.8
 * 
 * All validation messages are bilingual (Arabic & English)
 */
export class CalendarQueryDto {
  @ApiPropertyOptional({
    description: 'Calendar view type',
    enum: CalendarView,
    example: CalendarView.WEEK,
    default: CalendarView.WEEK,
  })
  @IsOptional()
  @IsEnum(CalendarView, {
    message: '{"ar":"نوع العرض غير صالح. القيم المسموحة: day, week, month","en":"Invalid view type. Allowed values: day, week, month"}',
  })
  view?: CalendarView = CalendarView.WEEK;

  @ApiPropertyOptional({
    description: 'Date for calendar view (defaults to today)',
    example: '2024-03-15T00:00:00.000Z',
    type: Date,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({
    message: '{"ar":"التاريخ غير صالح","en":"Invalid date"}',
  })
  date?: Date;

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
    description: 'Filter by doctor ID',
    example: '507f1f77bcf86cd799439012',
  })
  @IsOptional()
  @IsMongoId({
    message: '{"ar":"معرف الطبيب غير صالح","en":"Invalid doctor ID"}',
  })
  doctorId?: string;

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
}
