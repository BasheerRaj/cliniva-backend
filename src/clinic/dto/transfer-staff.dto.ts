import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';

/**
 * @fileoverview DTO for transferring staff and doctors between clinics
 *
 * This module provides the DTO for the POST /clinics/:id/transfer-staff endpoint
 * which handles the transfer of doctors and staff from one clinic to another.
 *
 * Business Rules:
 * - Target clinic must exist and be active
 * - Can transfer all or specific doctors/staff
 * - Handles conflicts with appointments (reschedule, notify, or cancel)
 * - Optional department assignment for transferred staff
 * - Transaction-based for data consistency
 *
 * @example
 * // Transfer all doctors and staff to another clinic
 * const transferDto: TransferStaffDto = {
 *   targetClinicId: '507f1f77bcf86cd799439011',
 *   transferDoctors: true,
 *   transferStaff: true,
 *   handleConflicts: 'reschedule'
 * };
 *
 * @example
 * // Transfer specific doctors to another clinic with department
 * const transferDto: TransferStaffDto = {
 *   targetClinicId: '507f1f77bcf86cd799439011',
 *   targetDepartmentId: '507f1f77bcf86cd799439012',
 *   transferDoctors: true,
 *   transferStaff: false,
 *   doctorIds: ['507f1f77bcf86cd799439013', '507f1f77bcf86cd799439014'],
 *   handleConflicts: 'notify'
 * };
 *
 * @example
 * // Transfer only staff members
 * const transferDto: TransferStaffDto = {
 *   targetClinicId: '507f1f77bcf86cd799439011',
 *   transferDoctors: false,
 *   transferStaff: true,
 *   staffIds: ['507f1f77bcf86cd799439015', '507f1f77bcf86cd799439016'],
 *   handleConflicts: 'cancel'
 * };
 *
 * @module clinic/dto/transfer-staff
 */

/**
 * DTO for transferring staff and doctors between clinics
 * Used by POST /clinics/:id/transfer-staff endpoint
 *
 * This DTO handles the transfer of doctors and staff from one clinic to another.
 * The source clinic ID is provided as a route parameter (:id), while this DTO
 * specifies the target clinic and transfer options.
 *
 * Transfer Options:
 * - Can transfer all doctors/staff or specific individuals
 * - Can assign to a specific department in target clinic
 * - Handles appointment conflicts with configurable strategy
 *
 * Validation Rules:
 * - targetClinicId: Required, must be a valid MongoDB ObjectId
 * - targetDepartmentId: Optional, must be a valid MongoDB ObjectId if provided
 * - transferDoctors: Required boolean indicating whether to transfer doctors
 * - transferStaff: Required boolean indicating whether to transfer staff
 * - doctorIds: Optional array of doctor IDs to transfer (if empty, transfers all)
 * - staffIds: Optional array of staff IDs to transfer (if empty, transfers all)
 * - handleConflicts: Required enum for conflict resolution strategy
 *
 * Conflict Handling Strategies:
 * - 'reschedule': Mark appointments for rescheduling
 * - 'notify': Send notifications to affected parties
 * - 'cancel': Cancel conflicting appointments
 *
 * Error Codes:
 * - CLINIC_007: Source clinic not found
 * - CLINIC_008: Target clinic not found
 *
 * @class TransferStaffDto
 */
export class TransferStaffDto {
  @ApiProperty({
    description: 'Target clinic ID where staff will be transferred',
    example: '507f1f77bcf86cd799439011',
    required: true,
    type: String,
  })
  @IsNotEmpty({
    message: 'targetClinicId is required',
  })
  @IsMongoId({
    message: 'targetClinicId must be a valid MongoDB ObjectId',
  })
  targetClinicId: string;

  @ApiProperty({
    description:
      'Target department ID for transferred staff (optional, assigns to specific department)',
    example: '507f1f77bcf86cd799439012',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsMongoId({
    message: 'targetDepartmentId must be a valid MongoDB ObjectId',
  })
  targetDepartmentId?: string;

  @ApiProperty({
    description:
      'Whether to transfer doctors from source clinic to target clinic',
    example: true,
    required: true,
    type: Boolean,
  })
  @IsNotEmpty({
    message: 'transferDoctors is required',
  })
  @IsBoolean({
    message: 'transferDoctors must be a boolean',
  })
  transferDoctors: boolean;

  @ApiProperty({
    description:
      'Whether to transfer staff (non-doctor personnel) from source clinic to target clinic',
    example: true,
    required: true,
    type: Boolean,
  })
  @IsNotEmpty({
    message: 'transferStaff is required',
  })
  @IsBoolean({
    message: 'transferStaff must be a boolean',
  })
  transferStaff: boolean;

  @ApiProperty({
    description:
      'Specific doctor IDs to transfer (optional, if not provided transfers all doctors)',
    example: ['507f1f77bcf86cd799439013', '507f1f77bcf86cd799439014'],
    required: false,
    type: [String],
    isArray: true,
  })
  @IsOptional()
  @IsArray({
    message: 'doctorIds must be an array',
  })
  @IsMongoId({
    each: true,
    message: 'Each doctorId must be a valid MongoDB ObjectId',
  })
  doctorIds?: string[];

  @ApiProperty({
    description:
      'Specific staff IDs to transfer (optional, if not provided transfers all staff)',
    example: ['507f1f77bcf86cd799439015', '507f1f77bcf86cd799439016'],
    required: false,
    type: [String],
    isArray: true,
  })
  @IsOptional()
  @IsArray({
    message: 'staffIds must be an array',
  })
  @IsMongoId({
    each: true,
    message: 'Each staffId must be a valid MongoDB ObjectId',
  })
  staffIds?: string[];

  @ApiProperty({
    description: 'Strategy for handling appointment conflicts during transfer',
    enum: ['reschedule', 'notify', 'cancel'],
    example: 'reschedule',
    required: true,
    enumName: 'ConflictHandlingStrategy',
  })
  @IsNotEmpty({
    message: 'handleConflicts is required',
  })
  @IsEnum(['reschedule', 'notify', 'cancel'], {
    message: 'handleConflicts must be one of: reschedule, notify, cancel',
  })
  handleConflicts: 'reschedule' | 'notify' | 'cancel';
}
