import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus, PaymentStatus } from './invoice-query.dto';

/**
 * Patient information in invoice response
 */
export class InvoicePatientDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  _id: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiPropertyOptional({ example: 'P-0001' })
  patientNumber?: string;
}

/**
 * Service information in invoice response
 */
export class InvoiceServiceDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439013' })
  _id: string;

  @ApiProperty({ example: 'Initial Consultation' })
  name: string;

  @ApiProperty({ example: 200 })
  price: number;

  @ApiPropertyOptional({ example: true })
  isActive?: boolean;
}

/**
 * Clinic information in invoice response
 */
export class InvoiceClinicDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439012' })
  _id: string;

  @ApiProperty({ example: 'Main Clinic' })
  name: string;
}

/**
 * User information in invoice response
 */
export class InvoiceUserDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439015' })
  _id: string;

  @ApiProperty({ example: 'admin@cliniva.com' })
  email: string;

  @ApiPropertyOptional({ example: 'Admin' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'User' })
  lastName?: string;
}

/**
 * DTO for invoice API responses
 * Requirements: 1.2, 1.3, 2.2, 3.2
 * 
 * Includes all invoice fields with populated references
 */
export class InvoiceResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439014' })
  _id: string;

  @ApiProperty({ example: 'DFT-0001' })
  invoiceNumber: string;

  @ApiPropertyOptional({ example: 'DFT-0001' })
  draftNumber?: string;

  @ApiProperty({ example: 'Initial Consultation' })
  invoiceTitle: string;

  @ApiPropertyOptional({ type: InvoicePatientDto })
  patient?: InvoicePatientDto;

  @ApiPropertyOptional({ type: InvoiceClinicDto })
  clinic?: InvoiceClinicDto;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439016' })
  appointmentId?: string;

  @ApiPropertyOptional({ type: InvoiceServiceDto })
  service?: InvoiceServiceDto;

  @ApiProperty({ example: 200 })
  subtotal: number;

  @ApiProperty({ example: 50 })
  discountAmount: number;

  @ApiProperty({ example: 15 })
  taxAmount: number;

  @ApiProperty({ example: 165 })
  totalAmount: number;

  @ApiProperty({ example: 0 })
  paidAmount: number;

  @ApiProperty({ example: 165 })
  outstandingBalance: number;

  @ApiProperty({ enum: InvoiceStatus, example: InvoiceStatus.DRAFT })
  invoiceStatus: InvoiceStatus;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.NOT_DUE })
  paymentStatus: PaymentStatus;

  @ApiProperty({ example: '2024-01-15T00:00:00.000Z' })
  issueDate: Date;

  @ApiPropertyOptional({ example: '2024-01-16T14:20:00.000Z' })
  lastPaymentDate?: Date;

  @ApiPropertyOptional({ example: '2024-01-16T10:00:00.000Z' })
  postedAt?: Date;

  @ApiPropertyOptional({ example: 'First visit' })
  notes?: string;

  @ApiProperty({ example: 1 })
  sessions: number;

  @ApiProperty({ type: InvoiceUserDto })
  createdBy: InvoiceUserDto;

  @ApiPropertyOptional({ type: InvoiceUserDto })
  updatedBy?: InvoiceUserDto;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ example: null })
  deletedAt?: Date;
}

/**
 * Paginated invoice list response
 */
export class PaginatedInvoiceResponseDto {
  @ApiProperty({ type: [InvoiceResponseDto] })
  data: InvoiceResponseDto[];

  @ApiProperty({
    example: {
      page: 1,
      limit: 20,
      total: 100,
      totalPages: 5,
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
 * Success response with bilingual message
 */
export class InvoiceSuccessResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({
    example: {
      ar: 'تم إنشاء الفاتورة بنجاح',
      en: 'Invoice created successfully',
    },
  })
  message: {
    ar: string;
    en: string;
  };

  @ApiProperty({ type: InvoiceResponseDto })
  data: InvoiceResponseDto;
}
