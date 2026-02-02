import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsMongoId,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { WorkingHourDto } from './create-working-hours.dto';
import { BilingualMessage } from '../../common/types/bilingual-message.type';

/**
 * @fileoverview Conflict Detection DTOs for working hours conflict checking
 *
 * This module provides DTOs and interfaces for checking appointment conflicts
 * when updating doctor working hours. Used by the POST /working-hours/check-conflicts endpoint.
 *
 * Business Rules:
 * - BZR-l9e0f1c4: Detect appointments outside new working hours
 * - BZR-43: Identify appointments requiring rescheduling
 *
 * @example
 * // Check conflicts for doctor working hours update
 * const checkDto: CheckConflictsDto = {
 *   userId: '507f1f77bcf86cd799439011',
 *   schedule: [
 *     {
 *       dayOfWeek: 'monday',
 *       isWorkingDay: true,
 *       openingTime: '09:00',
 *       closingTime: '17:00'
 *     },
 *     {
 *       dayOfWeek: 'tuesday',
 *       isWorkingDay: false
 *     }
 *   ]
 * };
 *
 * @module working-hours/dto/check-conflicts
 */

/**
 * DTO for checking appointment conflicts when updating working hours
 * Used by POST /working-hours/check-conflicts endpoint
 *
 * This DTO validates the request to check for appointment conflicts
 * when a doctor's working hours are being updated. It identifies
 * appointments that would fall outside the new working hours.
 *
 * Business Rules:
 * - BZR-l9e0f1c4: Detect appointments outside new working hours
 * - BZR-43: Identify appointments requiring rescheduling
 *
 * @class CheckConflictsDto
 */
export class CheckConflictsDto {
  @ApiProperty({
    description: 'User ID of the doctor whose working hours are being updated',
    example: '507f1f77bcf86cd799439011',
    required: true,
  })
  @IsString({ message: 'userId must be a string' })
  @IsNotEmpty({ message: 'userId is required' })
  @IsMongoId({ message: 'userId must be a valid MongoDB ObjectId' })
  userId: string;

  @ApiProperty({
    description: 'New working hours schedule to check for conflicts',
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
      {
        dayOfWeek: 'thursday',
        isWorkingDay: true,
        openingTime: '10:00',
        closingTime: '18:00',
      },
      {
        dayOfWeek: 'friday',
        isWorkingDay: false,
      },
      {
        dayOfWeek: 'saturday',
        isWorkingDay: true,
        openingTime: '08:00',
        closingTime: '14:00',
      },
      {
        dayOfWeek: 'sunday',
        isWorkingDay: false,
      },
    ],
  })
  @IsArray({ message: 'schedule must be an array' })
  @ArrayMinSize(1, { message: 'schedule must contain at least one day' })
  @ValidateNested({ each: true })
  @Type(() => WorkingHourDto)
  schedule: WorkingHourDto[];
}

/**
 * Detailed information about a conflicting appointment
 *
 * Contains all necessary information to identify and handle
 * an appointment that conflicts with new working hours.
 */
export interface AppointmentConflictDetail {
  /**
   * Unique identifier of the conflicting appointment
   */
  appointmentId: string;

  /**
   * Full name of the patient with the appointment
   */
  patientName: string;

  /**
   * Date of the appointment in ISO format (YYYY-MM-DD)
   */
  appointmentDate: string;

  /**
   * Time of the appointment in HH:mm format
   */
  appointmentTime: string;

  /**
   * Bilingual explanation of why this appointment conflicts
   * with the new working hours
   */
  conflictReason: BilingualMessage;
}

/**
 * Response data for conflict detection endpoint
 *
 * Contains the results of checking for appointment conflicts
 * when updating doctor working hours.
 */
export interface CheckConflictsResponseData {
  /**
   * Whether any conflicts were detected
   */
  hasConflicts: boolean;

  /**
   * Array of detailed conflict information for each conflicting appointment
   */
  conflicts: AppointmentConflictDetail[];

  /**
   * Total number of appointments affected by the working hours change
   */
  affectedAppointments: number;

  /**
   * Whether the conflicts require rescheduling action
   */
  requiresRescheduling: boolean;
}

/**
 * Complete response for conflict detection endpoint
 *
 * Standard API response format for the check-conflicts endpoint.
 */
export interface CheckConflictsResponse {
  /**
   * Whether the request was successful
   */
  success: boolean;

  /**
   * Conflict detection results
   */
  data: CheckConflictsResponseData;

  /**
   * Optional bilingual message about the operation
   */
  message?: BilingualMessage;
}

