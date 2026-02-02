import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsOptional,
  IsMongoId,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { WorkingHourDto } from './create-working-hours.dto';
import { BilingualMessage } from '../../common/types/bilingual-message.type';

/**
 * @fileoverview Rescheduling DTOs for working hours update with appointment rescheduling
 *
 * This module provides DTOs and interfaces for updating working hours with
 * automatic appointment rescheduling. Used by the PUT /working-hours/:entityType/:entityId/with-rescheduling endpoint.
 *
 * Business Rules:
 * - BZR-l9e0f1c4: Reschedule appointments after modification date
 * - BZR-43: Only reschedule appointments on modified days
 * - Mark appointments as "needs_rescheduling" until staff confirms
 * - Send notifications to affected patients
 * - Log all rescheduling actions for audit
 *
 * @example
 * // Update doctor working hours with automatic rescheduling
 * const updateDto: UpdateWithReschedulingDto = {
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
 *   ],
 *   handleConflicts: 'reschedule',
 *   notifyPatients: true,
 *   reschedulingReason: 'Doctor schedule change'
 * };
 *
 * @module working-hours/dto/update-with-rescheduling
 */

/**
 * DTO for updating working hours with appointment rescheduling
 * Used by PUT /working-hours/:entityType/:entityId/with-rescheduling endpoint
 *
 * This DTO validates the request to update working hours and handle
 * conflicting appointments according to the specified strategy.
 *
 * Business Rules:
 * - BZR-l9e0f1c4: Reschedule appointments after modification date
 * - BZR-43: Only reschedule appointments on modified days
 *
 * @class UpdateWithReschedulingDto
 */
export class UpdateWithReschedulingDto {
  @ApiProperty({
    description: 'New working hours schedule',
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

  @ApiProperty({
    description: 'Strategy for handling conflicting appointments',
    enum: ['reschedule', 'notify', 'cancel'],
    example: 'reschedule',
    required: true,
  })
  @IsString({ message: 'handleConflicts must be a string' })
  @IsNotEmpty({ message: 'handleConflicts is required' })
  @IsEnum(['reschedule', 'notify', 'cancel'], {
    message: 'handleConflicts must be one of: reschedule, notify, cancel',
  })
  handleConflicts: 'reschedule' | 'notify' | 'cancel';

  @ApiProperty({
    description: 'Whether to send notifications to affected patients',
    example: true,
    required: false,
    default: true,
  })
  @IsBoolean({ message: 'notifyPatients must be a boolean' })
  @IsOptional()
  notifyPatients?: boolean;

  @ApiProperty({
    description: 'Reason for rescheduling (optional)',
    example: 'Doctor schedule change',
    required: false,
  })
  @IsString({ message: 'reschedulingReason must be a string' })
  @IsOptional()
  reschedulingReason?: string;
}

/**
 * Details of a rescheduled appointment
 *
 * Contains information about an appointment that was affected by
 * the working hours change and how it was handled.
 */
export interface RescheduledAppointmentDetail {
  /**
   * Unique identifier of the appointment
   */
  appointmentId: string;

  /**
   * Original appointment date in ISO format (YYYY-MM-DD)
   */
  oldDate: string;

  /**
   * Original appointment time in HH:mm format
   */
  oldTime: string;

  /**
   * New appointment date in ISO format (YYYY-MM-DD)
   * Only present if appointment was successfully rescheduled
   */
  newDate?: string;

  /**
   * New appointment time in HH:mm format
   * Only present if appointment was successfully rescheduled
   */
  newTime?: string;

  /**
   * Status of the rescheduling action
   * - rescheduled: Appointment was automatically rescheduled to a new time
   * - marked_for_rescheduling: Appointment needs manual rescheduling by staff
   * - cancelled: Appointment was cancelled
   */
  status: 'rescheduled' | 'marked_for_rescheduling' | 'cancelled';
}

/**
 * Response data for update with rescheduling endpoint
 *
 * Contains the results of updating working hours and handling
 * conflicting appointments.
 */
export interface UpdateWithReschedulingResponseData {
  /**
   * Updated working hours records
   */
  workingHours: any[]; // Using any[] to avoid circular dependency with WorkingHours schema

  /**
   * Number of appointments that were automatically rescheduled
   */
  appointmentsRescheduled: number;

  /**
   * Number of appointments marked for manual rescheduling
   */
  appointmentsMarkedForRescheduling: number;

  /**
   * Number of appointments that were cancelled
   */
  appointmentsCancelled: number;

  /**
   * Number of notifications sent to patients
   */
  notificationsSent: number;

  /**
   * Detailed information about each affected appointment
   */
  rescheduledAppointments: RescheduledAppointmentDetail[];
}

/**
 * Complete response for update with rescheduling endpoint
 *
 * Standard API response format for the update-with-rescheduling endpoint.
 */
export interface UpdateWithReschedulingResponse {
  /**
   * Whether the request was successful
   */
  success: boolean;

  /**
   * Update and rescheduling results
   */
  data: UpdateWithReschedulingResponseData;

  /**
   * Bilingual message about the operation
   */
  message: BilingualMessage;
}
