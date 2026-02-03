import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty } from 'class-validator';

/**
 * @fileoverview DTO for assigning person-in-charge to a clinic
 *
 * This module provides the DTO for the PATCH /clinics/:id/pic endpoint
 * which handles person-in-charge (PIC) assignment for clinics.
 *
 * Business Rules:
 * - BZR-41: PIC selection from complex PICs
 * - The person-in-charge must be selected from those previously assigned
 *   as PICs for the complex to which the clinic belongs
 * - System validates that the selected user is a PIC of the parent complex
 * - Throws CLINIC_002 error if user is not a PIC of the parent complex
 *
 * @example
 * // Assign PIC to clinic
 * const assignPICDto: AssignPICDto = {
 *   personInChargeId: '507f1f77bcf86cd799439011'
 * };
 *
 * @example
 * // Update existing PIC
 * const assignPICDto: AssignPICDto = {
 *   personInChargeId: '507f1f77bcf86cd799439012'
 * };
 *
 * @module clinic/dto/assign-pic
 */

/**
 * DTO for assigning person-in-charge to a clinic
 * Used by PATCH /clinics/:id/pic endpoint
 *
 * This DTO handles the assignment of a person-in-charge (PIC) to a clinic.
 * The PIC must be selected from users who are already assigned as PICs
 * for the parent complex.
 *
 * Validation Rules:
 * - personInChargeId: Required, must be a valid MongoDB ObjectId
 * - The user must exist in the system
 * - The user must be a PIC of the clinic's parent complex
 *
 * Error Codes:
 * - CLINIC_002: Person in charge must be from complex PICs
 * - CLINIC_007: Clinic not found
 *
 * @class AssignPICDto
 */
export class AssignPICDto {
  @ApiProperty({
    description: 'User ID of person-in-charge (must be PIC of parent complex)',
    example: '507f1f77bcf86cd799439011',
    required: true,
    type: String,
  })
  @IsNotEmpty({
    message: 'personInChargeId is required',
  })
  @IsMongoId({
    message: 'personInChargeId must be a valid MongoDB ObjectId',
  })
  personInChargeId: string;
}
