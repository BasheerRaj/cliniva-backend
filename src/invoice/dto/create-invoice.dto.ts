import {
  IsNotEmpty,
  IsString,
  IsDate,
  IsOptional,
  IsMongoId,
  IsNumber,
  IsInt,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a new invoice
 * Requirements: 1.2, 1.3, 13.1, 13.2, 13.3, 13.4, 13.5
 * 
 * All validation messages are bilingual (Arabic & English)
 */
export class CreateInvoiceDto {
  @ApiProperty({
    description: 'Invoice title',
    example: 'Initial Consultation',
    maxLength: 200,
  })
  @IsNotEmpty({
    message: '{"ar":"عنوان الفاتورة مطلوب","en":"Invoice title is required"}',
  })
  @IsString({
    message: '{"ar":"عنوان الفاتورة يجب أن يكون نصاً","en":"Invoice title must be a string"}',
  })
  @MaxLength(200, {
    message: '{"ar":"عنوان الفاتورة يجب ألا يتجاوز 200 حرف","en":"Invoice title must not exceed 200 characters"}',
  })
  invoiceTitle: string;

  @ApiProperty({
    description: 'Issue date of the invoice',
    example: '2024-01-15T00:00:00.000Z',
    type: Date,
  })
  @IsNotEmpty({
    message: '{"ar":"تاريخ الإصدار مطلوب","en":"Issue date is required"}',
  })
  @Type(() => Date)
  @IsDate({
    message: '{"ar":"تاريخ الإصدار غير صالح","en":"Invalid issue date"}',
  })
  issueDate: Date;

  @ApiProperty({
    description: 'Patient ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty({
    message: '{"ar":"معرف المريض مطلوب","en":"Patient ID is required"}',
  })
  @IsMongoId({
    message: '{"ar":"معرف المريض غير صالح","en":"Invalid patient ID"}',
  })
  patientId: string;

  @ApiProperty({
    description: 'Clinic ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439012',
  })
  @IsNotEmpty({
    message: '{"ar":"معرف العيادة مطلوب","en":"Clinic ID is required"}',
  })
  @IsMongoId({
    message: '{"ar":"معرف العيادة غير صالح","en":"Invalid clinic ID"}',
  })
  clinicId: string;

  @ApiProperty({
    description: 'Service ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439013',
  })
  @IsNotEmpty({
    message: '{"ar":"معرف الخدمة مطلوب","en":"Service ID is required"}',
  })
  @IsMongoId({
    message: '{"ar":"معرف الخدمة غير صالح","en":"Invalid service ID"}',
  })
  serviceId: string;

  @ApiPropertyOptional({
    description: 'Appointment ID (MongoDB ObjectId) - Optional',
    example: '507f1f77bcf86cd799439014',
  })
  @IsOptional()
  @IsMongoId({
    message: '{"ar":"معرف الموعد غير صالح","en":"Invalid appointment ID"}',
  })
  appointmentId?: string;

  @ApiPropertyOptional({
    description: 'Number of sessions',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({
    message: '{"ar":"عدد الجلسات يجب أن يكون رقماً صحيحاً","en":"Sessions must be an integer"}',
  })
  @Min(1, {
    message: '{"ar":"عدد الجلسات يجب أن يكون رقماً صحيحاً موجباً","en":"Sessions must be a positive integer"}',
  })
  sessions?: number;

  @ApiPropertyOptional({
    description: 'Discount amount',
    example: 50,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    {},
    {
      message: '{"ar":"الخصم يجب أن يكون رقماً","en":"Discount must be a number"}',
    },
  )
  @Min(0, {
    message: '{"ar":"الخصم يجب أن يكون رقماً غير سالب","en":"Discount must be a non-negative number"}',
  })
  discountAmount?: number;

  @ApiPropertyOptional({
    description: 'Tax amount',
    example: 15,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    {},
    {
      message: '{"ar":"الضريبة يجب أن تكون رقماً","en":"Tax must be a number"}',
    },
  )
  @Min(0, {
    message: '{"ar":"الضريبة يجب أن تكون رقماً غير سالب","en":"Tax must be a non-negative number"}',
  })
  taxAmount?: number;

  @ApiPropertyOptional({
    description: 'Invoice notes',
    example: 'First visit',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({
    message: '{"ar":"الملاحظات يجب أن تكون نصاً","en":"Notes must be a string"}',
  })
  @MaxLength(1000, {
    message: '{"ar":"الملاحظات يجب ألا تتجاوز 1000 حرف","en":"Notes must not exceed 1000 characters"}',
  })
  notes?: string;
}
