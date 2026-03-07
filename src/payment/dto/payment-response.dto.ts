import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from './create-payment.dto';

/**
 * Simplified reference DTOs for populated fields
 */
class PatientReference {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  _id: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: 'P-0001' })
  patientNumber: string;
}

class InvoiceReference {
  @ApiProperty({ example: '507f1f77bcf86cd799439014' })
  _id: string;

  @ApiProperty({ example: 'INV-0001' })
  invoiceNumber: string;

  @ApiProperty({ example: 'Initial Consultation' })
  invoiceTitle: string;

  @ApiProperty({ example: 165 })
  totalAmount: number;

  @ApiProperty({ example: 100 })
  paidAmount: number;

  @ApiProperty({ example: 65 })
  outstandingBalance: number;

  @ApiProperty({ example: 'partially_paid' })
  paymentStatus: string;
}

class ClinicReference {
  @ApiProperty({ example: '507f1f77bcf86cd799439012' })
  _id: string;

  @ApiProperty({ example: 'Main Clinic' })
  name: string;
}

class UserReference {
  @ApiProperty({ example: '507f1f77bcf86cd799439015' })
  _id: string;

  @ApiProperty({ example: 'admin@example.com' })
  email: string;

  @ApiProperty({ example: 'Admin' })
  firstName: string;

  @ApiProperty({ example: 'User' })
  lastName: string;
}

/**
 * DTO for payment API responses
 * Requirements: 6.12, 8.2, 9.2
 * 
 * Includes all payment fields with populated references
 */
export class PaymentResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439016' })
  _id: string;

  @ApiProperty({ example: 'PAY-0001' })
  paymentId: string;

  @ApiPropertyOptional({ type: InvoiceReference })
  invoice?: InvoiceReference;

  @ApiPropertyOptional({ type: PatientReference })
  patient?: PatientReference;

  @ApiPropertyOptional({ type: ClinicReference })
  clinic?: ClinicReference;

  @ApiProperty({ example: 100 })
  amount: number;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CASH })
  paymentMethod: PaymentMethod;

  @ApiProperty({ example: '2024-01-16T00:00:00.000Z' })
  paymentDate: Date;

  @ApiPropertyOptional({ example: 'Partial payment' })
  notes?: string;

  @ApiProperty({ type: UserReference })
  addedBy: UserReference;

  @ApiPropertyOptional({ type: UserReference })
  updatedBy?: UserReference;

  @ApiProperty({ example: '2024-01-16T14:20:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-16T14:20:00.000Z' })
  updatedAt: Date;
}

/**
 * Paginated payment list response
 * Requirements: 8.1, 8.8
 */
export class PaginatedPaymentResponseDto {
  @ApiProperty({ type: [PaymentResponseDto] })
  data: PaymentResponseDto[];

  @ApiProperty({
    example: {
      page: 1,
      limit: 10,
      total: 100,
      totalPages: 10,
    },
  })
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Success response wrapper for payment operations
 */
export class PaymentSuccessResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({
    example: {
      ar: 'تم حفظ الدفعة بنجاح وتحديث أرصدة الفاتورة',
      en: 'Payment saved successfully and invoice balances updated',
    },
  })
  message: {
    ar: string;
    en: string;
  };

  @ApiProperty({ type: PaymentResponseDto })
  data: PaymentResponseDto;
}
