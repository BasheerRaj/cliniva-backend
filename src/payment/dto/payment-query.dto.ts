import {
  IsOptional,
  IsString,
  IsMongoId,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from './create-payment.dto';

/**
 * Sort field enumeration for payment queries
 */
export enum PaymentSortField {
  PAYMENT_DATE = 'paymentDate',
  AMOUNT = 'amount',
  PATIENT_NAME = 'patientName',
  CREATED_AT = 'createdAt',
  ID = '_id',
}

/**
 * Sort order enumeration
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * DTO for querying payments with filtering, sorting, and pagination
 * Requirements: 8.5, 8.6, 8.7
 * 
 * All validation messages are bilingual (Arabic & English)
 */
export class PaymentQueryDto {
  @ApiPropertyOptional({
    description: 'Search term for payment ID, patient name, or invoice number',
    example: 'PAY-0001',
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
    description: 'Filter by invoice ID',
    example: '507f1f77bcf86cd799439014',
  })
  @IsOptional()
  @IsMongoId({
    message: '{"ar":"معرف الفاتورة غير صالح","en":"Invalid invoice ID"}',
  })
  invoiceId?: string;

  @ApiPropertyOptional({
    description: 'Filter by payment method',
    enum: PaymentMethod,
    example: PaymentMethod.CASH,
  })
  @IsOptional()
  @IsEnum(PaymentMethod, {
    message: '{"ar":"طريقة الدفع غير صالحة","en":"Invalid payment method"}',
  })
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Filter by date from (ISO 8601 format)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsString({
    message: '{"ar":"تاريخ البداية غير صالح","en":"Invalid date from"}',
  })
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by date to (ISO 8601 format)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsString({
    message: '{"ar":"تاريخ النهاية غير صالح","en":"Invalid date to"}',
  })
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({
    message: '{"ar":"رقم الصفحة يجب أن يكون رقماً صحيحاً","en":"Page must be an integer"}',
  })
  @Min(1, {
    message: '{"ar":"رقم الصفحة يجب أن يكون 1 على الأقل","en":"Page must be at least 1"}',
  })
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({
    message: '{"ar":"الحد يجب أن يكون رقماً صحيحاً","en":"Limit must be an integer"}',
  })
  @Min(1, {
    message: '{"ar":"الحد يجب أن يكون 1 على الأقل","en":"Limit must be at least 1"}',
  })
  @Max(100, {
    message: '{"ar":"الحد يجب ألا يتجاوز 100","en":"Limit must not exceed 100"}',
  })
  limit?: number;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: PaymentSortField,
    example: PaymentSortField.PAYMENT_DATE,
    default: PaymentSortField.PAYMENT_DATE,
  })
  @IsOptional()
  @IsEnum(PaymentSortField, {
    message: '{"ar":"حقل الترتيب غير صالح","en":"Invalid sort field"}',
  })
  sortBy?: PaymentSortField;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortOrder,
    example: SortOrder.DESC,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder, {
    message: '{"ar":"ترتيب الفرز غير صالح","en":"Invalid sort order"}',
  })
  sortOrder?: SortOrder;
}
