// src/patient/dto/patient-list-item.dto.ts
// UC-3at2c5 (M5 Patients Management) — restricted response DTO for the patient list endpoint.
//
// Deliberately excludes PHI fields that are only needed in the detail view:
//   cardNumber, medicalHistory, allergies, documents, emergencyContact*,
//   insuranceMemberNumber, insurancePolicyId, insuranceClass, etc.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PatientListItemDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  _id: string;

  @ApiProperty({ example: 'PAT2024001' })
  patientNumber: string;

  /**
   * Derived: `${firstName} ${lastName}`.
   * Computed in the service's toListItem() map step.
   */
  @ApiProperty({ example: 'Ahmed Hassan' })
  fullName: string;

  /**
   * Calculated from dateOfBirth at response time (server-side).
   * Not stored in the database.
   */
  @ApiProperty({ example: 35 })
  age: number;

  @ApiProperty({ enum: ['male', 'female', 'other'], example: 'male' })
  gender: string;

  @ApiPropertyOptional({ example: 'Bupa Arabia' })
  insuranceCompany?: string;

  @ApiProperty({
    enum: ['Active', 'Expired', 'Pending', 'None'],
    example: 'Active',
  })
  insuranceStatus: string;

  @ApiProperty({ enum: ['Active', 'Inactive'], example: 'Active' })
  status: string;

  @ApiPropertyOptional({ example: '+966501234567' })
  phone?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.cliniva.com/profiles/abc.jpg',
  })
  profilePicture?: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439022' })
  clinicId?: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439033' })
  complexId?: string;

  @ApiProperty({ example: '2024-01-15T08:30:00.000Z' })
  createdAt: Date;
}
