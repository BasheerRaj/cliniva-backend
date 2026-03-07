import {
  IsOptional,
  IsEnum,
  IsMongoId,
  IsDate,
  IsNumber,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Invoice status enum
 */
export enum InvoiceStatus {
  DRAFT = 'draft',
  POSTED = 'posted',
  CANCELLED = 'cancelled',
}

/**
 * Payment status enum
 */
export enum PaymentStatus {
  NOT_DUE = 'not_due',
  UNPAID = 'unpaid',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
}

/**
 * DTO for filtering and paginating invoice lists
 * Requirements: 2.5, 2.6, 2.7
 * 
 * All validation messages are bilingual (Arabic & English)
 */
export class InvoiceQueryDto {
  @ApiPropertyOptional({
    description: 'Search term for invoice number, patient name, or invoice title',
    example: 'INV-0001',
  })
  @IsOptional()
  @IsString({
    message: '{"ar":"مصطلح البحث يجب أن يكون نصاً","en":"Search term must be a string"}',
  })
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by patient ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsMongoId({
    message: '{"ar":"معرف المريض غير صالح","en":"Invalid patient ID"}',
  })
  patientId?: string;

  @ApiPropertyOptional({
    description: 'Filter by clinic ID',
    example: '507f1f77bcf86cd799439012',
  })
  @IsOptional()
  @IsMongoId({
    message: '{"ar":"معرف العيادة غير صالح","en":"Invalid clinic ID"}',
  })
  clinicId?: string;

  @ApiPropertyOptional({
    description: 'Filter by invoice status',
    enum: InvoiceStatus,
    example: InvoiceStatus.POSTED,
  })
  @IsOptional()
  @IsEnum(InvoiceStatus, {
    message: '{"ar":"حالة الفاتورة غير صالحة. القيم المسموحة: draft, posted, cancelled","en":"Invalid invoice status. Allowed values: draft, posted, cancelled"}',
  })
  invoiceStatus?: InvoiceStatus;

  @ApiPropertyOptional({
    description: 'Filter by payment status',
    enum: PaymentStatus,
    example: PaymentStatus.UNPAID,
  })
  @IsOptional()
  @IsEnum(PaymentStatus, {
    message: '{"ar":"حالة الدفع غير صالحة. القيم المسموحة: not_due, unpaid, partially_paid, paid","en":"Invalid payment status. Allowed values: not_due, unpaid, partially_paid, paid"}',
  })
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({
    description: 'Filter by start date (inclusive)',
    example: '2024-01-01T00:00:00.000Z',
    type: Date,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({
    message: '{"ar":"تاريخ البداية غير صالح","en":"Invalid start date"}',
  })
  dateFrom?: Date;

  @ApiPropertyOptional({
    description: 'Filter by end date (inclusive)',
    example: '2024-12-31T23:59:59.999Z',
    type: Date,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({
    message: '{"ar":"تاريخ النهاية غير صالح","en":"Invalid end date"}',
  })
  dateTo?: Date;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    {},
    {
      message: '{"ar":"رقم الصفحة يجب أن يكون رقماً","en":"Page number must be a number"}',
    },
  )
  @Min(1, {
    message: '{"ar":"رقم الصفحة يجب أن يكون 1 على الأقل","en":"Page number must be at least 1"}',
  })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    {},
    {
      message: '{"ar":"عدد العناصر يجب أن يكون رقماً","en":"Limit must be a number"}',
    },
  )
  @Min(1, {
    message: '{"ar":"عدد العناصر يجب أن يكون 1 على الأقل","en":"Limit must be at least 1"}',
  })
  @Max(100, {
    message: '{"ar":"عدد العناصر يجب ألا يتجاوز 100","en":"Limit must not exceed 100"}',
  })
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    example: 'createdAt',
    enum: ['invoiceNumber', 'patientName', 'issueDate', 'totalAmount', 'paymentStatus', 'createdAt'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsString({
    message: '{"ar":"حقل الترتيب يجب أن يكون نصاً","en":"Sort field must be a string"}',
  })
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'], {
    message: '{"ar":"ترتيب الفرز يجب أن يكون asc أو desc","en":"Sort order must be asc or desc"}',
  })
  sortOrder?: 'asc' | 'desc' = 'desc';
}
