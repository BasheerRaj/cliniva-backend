import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { WorkingHourDto } from './create-working-hours.dto';
import { BilingualMessage } from '../../common/types/bilingual-message.type';

/**
 * @fileoverview Validation DTOs for working hours validation endpoint
 *
 * This module provides DTOs and interfaces for validating working hours
 * against parent entity constraints. Used by the POST /working-hours/validate endpoint.
 *
 * Business Rules:
 * - BZR-f1c0a9e4: Hierarchical validation (complex→clinic, clinic→user)
 * - BZR-u5a0f7d3: Child hours must be within parent hours
 * - BZR-42: Child cannot be open when parent is closed
 *
 * @example
 * // Validate user working hours against clinic hours
 * const validateDto: ValidateWorkingHoursDto = {
 *   entityType: 'user',
 *   entityId: '507f1f77bcf86cd799439011',
 *   parentEntityType: 'clinic',
 *   parentEntityId: '507f1f77bcf86cd799439012',
 *   schedule: [
 *     {
 *       dayOfWeek: 'monday',
 *       isWorkingDay: true,
 *       openingTime: '09:00',
 *       closingTime: '17:00'
 *     }
 *   ]
 * };
 *
 * @example
 * // Validate clinic working hours against complex hours
 * const validateDto: ValidateWorkingHoursDto = {
 *   entityType: 'clinic',
 *   entityId: '507f1f77bcf86cd799439013',
 *   parentEntityType: 'complex',
 *   parentEntityId: '507f1f77bcf86cd799439014',
 *   schedule: [
 *     {
 *       dayOfWeek: 'tuesday',
 *       isWorkingDay: true,
 *       openingTime: '08:00',
 *       closingTime: '16:00'
 *     }
 *   ]
 * };
 *
 * @module working-hours/dto/validate-working-hours
 */

/**
 * DTO for validating working hours against parent entity hours
 * Used by POST /working-hours/validate endpoint
 *
 * This DTO validates that child entity working hours comply with
 * parent entity constraints according to business rules:
 * - BZR-f1c0a9e4: Hierarchical validation
 * - BZR-u5a0f7d3: Child hours within parent hours
 * - BZR-42: Child cannot be open when parent is closed
 *
 * @class ValidateWorkingHoursDto
 */
export class ValidateWorkingHoursDto {
  @ApiProperty({
    description: 'Type of the child entity being validated',
    enum: ['clinic', 'user'],
    example: 'user',
    required: true,
  })
  @IsString()
  @IsEnum(['clinic', 'user'], {
    message: 'entityType must be either clinic or user',
  })
  entityType: string;

  @ApiProperty({
    description: 'ID of the child entity being validated',
    example: '507f1f77bcf86cd799439011',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'entityId is required' })
  entityId: string;

  @ApiProperty({
    description: 'Type of the parent entity to validate against',
    enum: ['complex', 'clinic'],
    example: 'clinic',
    required: true,
  })
  @IsString()
  @IsEnum(['complex', 'clinic'], {
    message: 'parentEntityType must be either complex or clinic',
  })
  parentEntityType: string;

  @ApiProperty({
    description: 'ID of the parent entity to validate against',
    example: '507f1f77bcf86cd799439012',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'parentEntityId is required' })
  parentEntityId: string;

  @ApiProperty({
    description: 'Working hours schedule to validate',
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
      },
      {
        dayOfWeek: 'wednesday',
        isWorkingDay: false,
      },
    ],
  })
  @IsArray({ message: 'schedule must be an array' })
  @ValidateNested({ each: true })
  @Type(() => WorkingHourDto)
  schedule: WorkingHourDto[];
}

/**
 * Suggested time range for a working day
 */
export interface SuggestedRange {
  openingTime: string;
  closingTime: string;
}

/**
 * Validation error for a specific day
 */
export interface ValidationError {
  dayOfWeek: string;
  message: BilingualMessage;
  suggestedRange?: SuggestedRange;
}

/**
 * Conflict information (appointments or shifts)
 */
export interface ConflictInfo {
  type: 'appointment' | 'shift';
  count: number;
  affectedIds: string[];
}

/**
 * Response data for validation endpoint
 */
export interface ValidateWorkingHoursResponseData {
  isValid: boolean;
  errors: ValidationError[];
  conflicts?: ConflictInfo[];
}

/**
 * Complete response for validation endpoint
 */
export interface ValidateWorkingHoursResponse {
  success: boolean;
  data: ValidateWorkingHoursResponseData;
}
