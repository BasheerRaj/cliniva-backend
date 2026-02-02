import { IsString, IsEnum, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WorkingHourDto } from './create-working-hours.dto';

/**
 * @fileoverview Suggestion DTOs for working hours auto-fill endpoint
 *
 * This module provides DTOs and interfaces for suggesting working hours
 * based on parent entity hours. Used by the GET /working-hours/suggest/:entityType/:entityId endpoint.
 *
 * Business Rules:
 * - BZR-h5e4c7a0: Doctors auto-fill from assigned clinic
 * - BZR-r2b4e5c7: Staff auto-fill from assigned complex
 * - Auto-filled hours are editable within constraints
 *
 * @example
 * // Get suggestions for doctor from clinic
 * const queryDto: SuggestWorkingHoursQueryDto = {
 *   role: 'doctor',
 *   clinicId: '507f1f77bcf86cd799439011'
 * };
 *
 * @example
 * // Get suggestions for staff from complex
 * const queryDto: SuggestWorkingHoursQueryDto = {
 *   role: 'staff',
 *   complexId: '507f1f77bcf86cd799439012'
 * };
 *
 * @module working-hours/dto/suggest-working-hours
 */

/**
 * Query parameters for suggestion endpoint
 * Used by GET /working-hours/suggest/:entityType/:entityId
 *
 * This DTO validates query parameters for retrieving suggested working hours
 * based on user role and entity assignment according to business rules:
 * - BZR-h5e4c7a0: Doctors get suggestions from clinic
 * - BZR-r2b4e5c7: Staff get suggestions from complex
 *
 * @class SuggestWorkingHoursQueryDto
 */
export class SuggestWorkingHoursQueryDto {
  @ApiProperty({
    description: 'User role to determine suggestion source',
    enum: ['doctor', 'staff'],
    example: 'doctor',
    required: true,
  })
  @IsString()
  @IsEnum(['doctor', 'staff'], {
    message: 'role must be either doctor or staff',
  })
  role: 'doctor' | 'staff';

  @ApiProperty({
    description: 'Clinic ID for doctor role (required for doctors)',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'clinicId cannot be empty when provided' })
  clinicId?: string;

  @ApiProperty({
    description: 'Complex ID for staff role (required for staff)',
    example: '507f1f77bcf86cd799439012',
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'complexId cannot be empty when provided' })
  complexId?: string;
}

/**
 * Suggested working hours schedule item
 */
export interface SuggestedSchedule {
  dayOfWeek: string;
  isWorkingDay: boolean;
  openingTime?: string;
  closingTime?: string;
  breakStartTime?: string;
  breakEndTime?: string;
}

/**
 * Source entity information
 */
export interface EntityInfo {
  entityType: 'clinic' | 'complex';
  entityId: string;
  entityName: string;
}

/**
 * Response data for suggestion endpoint
 */
export interface SuggestWorkingHoursResponseData {
  suggestedSchedule: SuggestedSchedule[];
  source: EntityInfo;
  canModify: boolean;
}

/**
 * Complete response for suggestion endpoint
 */
export interface SuggestWorkingHoursResponse {
  success: boolean;
  data: SuggestWorkingHoursResponseData;
}
