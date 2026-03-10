// src/patient/dto/patient-list-query.dto.ts
// UC-3at2c5 (M5 Patients Management) — query DTO for the complex-scoped patient list endpoint.

import {
  IsString,
  IsOptional,
  IsIn,
  IsInt,
  Min,
  Max,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const PATIENT_LIST_SORTABLE_FIELDS = [
  'patientNumber',
  'firstName',
  'lastName',
  'age',           // maps to dateOfBirth in the query layer (inverted sort)
  'gender',
  'insuranceCompany',
  'insuranceStatus',
  'status',
  'createdAt',
] as const;

export type PatientListSortField = typeof PATIENT_LIST_SORTABLE_FIELDS[number];

export class PatientListQueryDto {
  /**
   * Free-text search against firstName, lastName, full-name concat,
   * and patientNumber (case-insensitive regex).
   */
  @ApiPropertyOptional({
    description: 'Search by patient name or patient number',
    example: 'Ahmed',
  })
  @IsString()
  @IsOptional()
  search?: string;

  /** Filter by patient status. */
  @ApiPropertyOptional({
    enum: ['Active', 'Inactive'],
    description: 'Filter by patient status',
  })
  @IsIn(['Active', 'Inactive'])
  @IsOptional()
  status?: 'Active' | 'Inactive';

  /** Filter by insurance status. */
  @ApiPropertyOptional({
    enum: ['Active', 'Expired', 'Pending', 'None'],
    description: 'Filter by insurance status',
  })
  @IsIn(['Active', 'Expired', 'Pending', 'None'])
  @IsOptional()
  insuranceStatus?: 'Active' | 'Expired' | 'Pending' | 'None';

  /** Filter by gender. */
  @ApiPropertyOptional({
    enum: ['male', 'female', 'other'],
    description: 'Filter by gender',
  })
  @IsIn(['male', 'female', 'other'])
  @IsOptional()
  gender?: 'male' | 'female' | 'other';

  /**
   * Optional complexId.
   * - super_admin: REQUIRED (no complexId in JWT)
   * - owner: optional narrowing within their organization
   * - admin/manager/doctor/staff: IGNORED — JWT complexId is always used instead (IDOR prevention)
   */
  @ApiPropertyOptional({
    description:
      'MongoDB ObjectId of the complex (required for super_admin, optional narrowing for owner)',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId({
    message: JSON.stringify({
      ar: 'معرف المجمع غير صالح',
      en: 'Invalid complex ID format',
    }),
  })
  @IsOptional()
  complexId?: string;

  /**
   * Optional clinicId — narrows scope to a single clinic within the complex.
   * Ignored for staff/doctor/manager (their JWT clinicId is always enforced instead).
   */
  @ApiPropertyOptional({
    description:
      'MongoDB ObjectId of the clinic — further filters to a single clinic within the complex',
    example: '507f1f77bcf86cd799439022',
  })
  @IsMongoId({
    message: JSON.stringify({
      ar: 'معرف العيادة غير صالح',
      en: 'Invalid clinic ID format',
    }),
  })
  @IsOptional()
  clinicId?: string;

  /** Page number (1-indexed). */
  @ApiPropertyOptional({ description: 'Page number (1-indexed)', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  /** Items per page. Capped at 50 by the service regardless of this value. */
  @ApiPropertyOptional({
    description: 'Items per page (max 50)',
    example: 10,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number = 10;

  /** Field to sort by. 'age' is translated to 'dateOfBirth' in the service. */
  @ApiPropertyOptional({
    description: `Sort field. Allowed: ${PATIENT_LIST_SORTABLE_FIELDS.join(', ')}`,
    example: 'createdAt',
  })
  @IsIn(PATIENT_LIST_SORTABLE_FIELDS, {
    message: JSON.stringify({
      ar: 'حقل الترتيب غير مدعوم',
      en: 'Invalid sort field',
    }),
  })
  @IsOptional()
  sortBy?: PatientListSortField = 'createdAt';

  /** Sort direction. */
  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    description: 'Sort direction',
    example: 'desc',
  })
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
