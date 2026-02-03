import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';

/**
 * @fileoverview DTO for changing clinic status with optional staff transfer
 *
 * This module provides the DTO for the PATCH /clinics/:id/status endpoint
 * which handles clinic status changes with cascading effects including:
 * - Status change (active/inactive/suspended)
 * - Optional staff and doctor transfer
 * - Appointment rescheduling
 * - Notification sending
 *
 * Business Rules:
 * - BZR-44: Status change with staff transfer
 * - When deactivating a clinic with active appointments/staff, transfer decision required
 * - Target clinic must be specified if transferring staff
 * - Notifications can be sent to affected parties
 *
 * @example
 * // Deactivate clinic and transfer staff
 * const changeStatusDto: ChangeStatusDto = {
 *   status: 'inactive',
 *   reason: 'Temporary closure for renovation',
 *   transferDoctors: true,
 *   transferStaff: true,
 *   targetClinicId: '507f1f77bcf86cd799439011',
 *   notifyStaff: true,
 *   notifyPatients: true
 * };
 *
 * @example
 * // Activate clinic
 * const changeStatusDto: ChangeStatusDto = {
 *   status: 'active'
 * };
 *
 * @example
 * // Suspend clinic without transfer
 * const changeStatusDto: ChangeStatusDto = {
 *   status: 'suspended',
 *   reason: 'Pending license renewal'
 * };
 *
 * @module clinic/dto/change-status
 */

/**
 * DTO for changing clinic status
 * Used by PATCH /clinics/:id/status endpoint
 *
 * This DTO handles clinic status changes with optional staff transfer
 * and notification capabilities. When changing status to 'inactive' or
 * 'suspended', the system checks for active appointments and assigned
 * staff, requiring transfer decisions if any exist.
 *
 * Validation Rules:
 * - status: Must be one of 'active', 'inactive', 'suspended'
 * - reason: Optional string explaining the status change
 * - transferDoctors: Optional boolean to transfer doctors
 * - transferStaff: Optional boolean to transfer staff
 * - targetClinicId: Required if transferDoctors or transferStaff is true
 * - targetDepartmentId: Optional department for transferred staff
 * - notifyStaff: Optional boolean to send notifications to staff
 * - notifyPatients: Optional boolean to send notifications to patients
 *
 * @class ChangeStatusDto
 */
export class ChangeStatusDto {
  @ApiProperty({
    description: 'New clinic status',
    enum: ['active', 'inactive', 'suspended'],
    example: 'inactive',
    required: true,
  })
  @IsEnum(['active', 'inactive', 'suspended'], {
    message: 'status must be one of: active, inactive, suspended',
  })
  status: 'active' | 'inactive' | 'suspended';

  @ApiProperty({
    description:
      'Reason for status change (recommended for inactive/suspended)',
    example: 'Temporary closure for renovation',
    required: false,
  })
  @IsOptional()
  @IsString({
    message: 'reason must be a string',
  })
  reason?: string;

  @ApiProperty({
    description:
      'Transfer doctors to target clinic (required if deactivating with assigned doctors)',
    example: true,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({
    message: 'transferDoctors must be a boolean',
  })
  transferDoctors?: boolean;

  @ApiProperty({
    description:
      'Transfer staff to target clinic (required if deactivating with assigned staff)',
    example: true,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({
    message: 'transferStaff must be a boolean',
  })
  transferStaff?: boolean;

  @ApiProperty({
    description:
      'Target clinic ID for staff transfer (required if transferDoctors or transferStaff is true)',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @IsOptional()
  @IsMongoId({
    message: 'targetClinicId must be a valid MongoDB ObjectId',
  })
  targetClinicId?: string;

  @ApiProperty({
    description: 'Target department ID for staff transfer (optional)',
    example: '507f1f77bcf86cd799439012',
    required: false,
  })
  @IsOptional()
  @IsMongoId({
    message: 'targetDepartmentId must be a valid MongoDB ObjectId',
  })
  targetDepartmentId?: string;

  @ApiProperty({
    description: 'Send notifications to affected staff members',
    example: true,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({
    message: 'notifyStaff must be a boolean',
  })
  notifyStaff?: boolean;

  @ApiProperty({
    description: 'Send notifications to patients with appointments',
    example: true,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({
    message: 'notifyPatients must be a boolean',
  })
  notifyPatients?: boolean;
}
