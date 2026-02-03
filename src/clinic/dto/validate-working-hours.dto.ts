import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * @fileoverview DTOs for clinic working hours validation endpoint
 *
 * This module provides DTOs for validating clinic working hours against
 * complex hours and detecting conflicts with appointments and staff schedules.
 *
 * Business Rules:
 * - BZR-42: Clinic hours must be within complex hours
 * - BZR-43: Detect conflicts with appointments and staff
 *
 * @example
 * // Validate clinic working hours
 * const validateDto: ValidateWorkingHoursDto = {
 *   workingHours: [
 *     {
 *       dayOfWeek: 'monday',
 *       isWorkingDay: true,
 *       openingTime: '09:00',
 *       closingTime: '17:00'
 *     },
 *     {
 *       dayOfWeek: 'tuesday',
 *       isWorkingDay: true,
 *       openingTime: '09:00',
 *       closingTime: '17:00',
 *       breakStartTime: '12:00',
 *       breakEndTime: '13:00'
 *     },
 *     {
 *       dayOfWeek: 'wednesday',
 *       isWorkingDay: false
 *     }
 *   ]
 * };
 *
 * @module clinic/dto/validate-working-hours
 */

/**
 * DTO for a single working hour entry
 * Represents working hours for one day of the week
 *
 * @class WorkingHourDto
 */
export class WorkingHourDto {
  @ApiProperty({
    description: 'Day of the week',
    enum: [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ],
    example: 'monday',
    required: true,
  })
  @IsString()
  @IsEnum(
    [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ],
    {
      message: 'dayOfWeek must be a valid day of the week',
    },
  )
  dayOfWeek: string;

  @ApiProperty({
    description: 'Whether this is a working day',
    example: true,
    required: true,
  })
  @IsBoolean({
    message: 'isWorkingDay must be a boolean',
  })
  isWorkingDay: boolean;

  @ApiProperty({
    description:
      'Opening time in HH:mm format (required if isWorkingDay is true)',
    example: '09:00',
    required: false,
  })
  @IsString()
  @IsOptional()
  openingTime?: string;

  @ApiProperty({
    description:
      'Closing time in HH:mm format (required if isWorkingDay is true)',
    example: '17:00',
    required: false,
  })
  @IsString()
  @IsOptional()
  closingTime?: string;

  @ApiProperty({
    description: 'Break start time in HH:mm format (optional)',
    example: '12:00',
    required: false,
  })
  @IsString()
  @IsOptional()
  breakStartTime?: string;

  @ApiProperty({
    description: 'Break end time in HH:mm format (optional)',
    example: '13:00',
    required: false,
  })
  @IsString()
  @IsOptional()
  breakEndTime?: string;
}

/**
 * DTO for validating clinic working hours
 * Used by POST /clinics/:id/validate-working-hours endpoint
 *
 * This DTO validates that clinic working hours comply with complex
 * constraints and detects conflicts with existing appointments and staff:
 * - BZR-42: Clinic hours must be within complex hours
 * - BZR-43: Detect conflicts with appointments and staff schedules
 *
 * The clinic ID is provided as a route parameter, so only the working
 * hours schedule needs to be included in the request body.
 *
 * @class ValidateWorkingHoursDto
 */
export class ValidateWorkingHoursDto {
  @ApiProperty({
    description: 'Working hours schedule to validate for the clinic',
    type: [WorkingHourDto],
    required: true,
    example: [
      {
        dayOfWeek: 'monday',
        isWorkingDay: true,
        openingTime: '09:00',
        closingTime: '17:00',
      },
      {
        dayOfWeek: 'tuesday',
        isWorkingDay: true,
        openingTime: '09:00',
        closingTime: '17:00',
        breakStartTime: '12:00',
        breakEndTime: '13:00',
      },
      {
        dayOfWeek: 'wednesday',
        isWorkingDay: false,
      },
      {
        dayOfWeek: 'thursday',
        isWorkingDay: true,
        openingTime: '09:00',
        closingTime: '17:00',
      },
      {
        dayOfWeek: 'friday',
        isWorkingDay: true,
        openingTime: '09:00',
        closingTime: '14:00',
      },
      {
        dayOfWeek: 'saturday',
        isWorkingDay: false,
      },
      {
        dayOfWeek: 'sunday',
        isWorkingDay: false,
      },
    ],
  })
  @IsArray({ message: 'workingHours must be an array' })
  @ValidateNested({ each: true })
  @Type(() => WorkingHourDto)
  workingHours: WorkingHourDto[];
}
