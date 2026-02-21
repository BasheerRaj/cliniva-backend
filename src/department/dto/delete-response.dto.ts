import { ApiProperty } from '@nestjs/swagger';
import type { BilingualMessage } from '../../common/types/bilingual-message.type';

/**
 * Linked clinic information for deletion validation
 */
export class LinkedClinicDto {
  @ApiProperty({
    description: 'Clinic ID',
    example: '507f1f77bcf86cd799439011',
  })
  clinicId: string;

  @ApiProperty({
    description: 'Clinic name',
    example: 'Cardiology Clinic A',
  })
  clinicName: string;

  @ApiProperty({
    description: 'Parent complex name',
    example: 'Medical Complex 1',
  })
  complexName: string;

  @ApiProperty({
    description: 'Parent complex ID',
    example: '507f1f77bcf86cd799439012',
    required: false,
  })
  complexId?: string;
}

/**
 * Response for successful department deletion
 */
export class DeleteResult {
  @ApiProperty({
    description: 'Operation success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Bilingual success message',
    example: {
      ar: 'تم حذف القسم بنجاح',
      en: 'Department deleted successfully',
    },
  })
  message: BilingualMessage;
}

/**
 * Data structure for can-delete check result
 */
export class CanDeleteData {
  @ApiProperty({
    description: 'Whether the department can be safely deleted',
    example: false,
  })
  canDelete: boolean;

  @ApiProperty({
    description:
      'Bilingual reason why deletion is blocked (if canDelete is false)',
    example: { ar: 'القسم مرتبط بعيادات', en: 'Department has linked clinics' },
    required: false,
  })
  reason?: BilingualMessage;

  @ApiProperty({
    description: 'Array of clinics linked to this department',
    type: [LinkedClinicDto],
    required: false,
  })
  linkedClinics?: LinkedClinicDto[];

  @ApiProperty({
    description: 'Count of services using this department',
    example: 5,
    required: false,
  })
  linkedServices?: number;

  @ApiProperty({
    description: 'Bilingual recommendations for user action',
    example: {
      ar: 'يرجى حذف العيادات المرتبطة أولاً',
      en: 'Please delete linked clinics first',
    },
    required: false,
  })
  recommendations?: BilingualMessage;
}

/**
 * Response for can-delete check endpoint
 */
export class CanDeleteResult {
  @ApiProperty({
    description: 'Operation success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Deletion eligibility data',
    type: CanDeleteData,
  })
  data: CanDeleteData;
}

/**
 * Error details structure
 */
export class DeleteErrorDetails {
  @ApiProperty({
    description: 'Error code',
    example: 'DEPARTMENT_001',
  })
  code: string;

  @ApiProperty({
    description: 'Bilingual error message',
    example: { ar: 'فشل حذف القسم', en: 'Failed to delete department' },
  })
  message: BilingualMessage;

  @ApiProperty({
    description: 'Array of linked clinics (if applicable)',
    type: [LinkedClinicDto],
    required: false,
  })
  linkedClinics?: LinkedClinicDto[];

  @ApiProperty({
    description: 'Count of linked clinics (if applicable)',
    example: 3,
    required: false,
  })
  linkedClinicsCount?: number;

  @ApiProperty({
    description: 'Count of linked services (if applicable)',
    example: 5,
    required: false,
  })
  linkedServices?: number;
}

/**
 * Error response structure for deletion failures
 */
export class DeleteErrorResponse {
  @ApiProperty({
    description: 'Operation success status (always false for errors)',
    example: false,
  })
  success: false;

  @ApiProperty({
    description: 'Error details',
    type: DeleteErrorDetails,
  })
  error: DeleteErrorDetails;
}

/**
 * Data structure for check-dependencies endpoint
 */
export class CheckDependenciesData {
  @ApiProperty({
    description: 'Whether department has active clinics',
    example: true,
  })
  hasActiveClinics: boolean;

  @ApiProperty({
    description: 'Number of active clinics using this department',
    example: 3,
  })
  count: number;

  @ApiProperty({
    description: 'Array of clinics using this department',
    type: [LinkedClinicDto],
  })
  clinics: LinkedClinicDto[];
}

/**
 * Response for check-dependencies endpoint
 */
export class CheckDependenciesResult {
  @ApiProperty({
    description: 'Operation success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Dependencies data',
    type: CheckDependenciesData,
  })
  data: CheckDependenciesData;

  @ApiProperty({
    description: 'Bilingual success message',
    example: {
      ar: 'تم التحقق من التبعيات بنجاح',
      en: 'Dependencies checked successfully',
    },
  })
  message: BilingualMessage;
}

/**
 * Response for deactivate-with-transfer endpoint
 */
export class DeactivateWithTransferResult {
  @ApiProperty({
    description: 'Operation success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Bilingual success message',
    example: {
      ar: 'تم إلغاء تفعيل القسم ونقل العيادات بنجاح',
      en: 'Department deactivated and clinics transferred successfully',
    },
  })
  message: BilingualMessage;

  @ApiProperty({
    description: 'Number of clinics transferred',
    example: 3,
  })
  clinicsTransferred: number;
}
