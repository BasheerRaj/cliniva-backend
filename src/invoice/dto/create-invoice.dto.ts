import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for a service within an invoice.
 *
 * Price comes from the Service definition — no manual entry required.
 * Sessions are auto-created when appointments are booked.
 *
 * Requirements: 1.2, 1.3, 13.1-13.5
 */
export class InvoiceServiceDto {
  @ApiProperty({ description: 'Service ID', example: '507f1f77bcf86cd799439013' })
  @IsMongoId({ message: '{"ar":"معرف الخدمة غير صالح","en":"Invalid service ID"}' })
  serviceId: string;

  @ApiPropertyOptional({ description: 'Discount percent applied per session (0-100)', example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @ApiPropertyOptional({ description: 'Tax rate percent applied per session (0-100)', example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;
}

/**
 * DTO for creating a new invoice.
 * Each invoice contains exactly one service.
 * Requirements: 1.2, 1.3, 13.1, 13.2, 13.3, 13.4, 13.5
 */
export class CreateInvoiceDto {
  @ApiProperty({
    description: 'Invoice title',
    example: 'Initial Consultation',
    maxLength: 200,
  })
  @IsNotEmpty({ message: '{"ar":"عنوان الفاتورة مطلوب","en":"Invoice title is required"}' })
  @IsString()
  @MaxLength(200)
  invoiceTitle: string;

  @ApiProperty({
    description: 'Issue date of the invoice',
    example: '2024-01-15T00:00:00.000Z',
    type: Date,
  })
  @IsNotEmpty({ message: '{"ar":"تاريخ الإصدار مطلوب","en":"Issue date is required"}' })
  @Type(() => Date)
  @IsDate()
  issueDate: Date;

  @ApiProperty({ description: 'Patient ID (MongoDB ObjectId)', example: '507f1f77bcf86cd799439011' })
  @IsNotEmpty({ message: '{"ar":"معرف المريض مطلوب","en":"Patient ID is required"}' })
  @IsMongoId()
  patientId: string;

  @ApiProperty({ description: 'Clinic ID (MongoDB ObjectId)', example: '507f1f77bcf86cd799439012' })
  @IsNotEmpty({ message: '{"ar":"معرف العيادة مطلوب","en":"Clinic ID is required"}' })
  @IsMongoId()
  clinicId: string;

  @ApiProperty({ description: 'The single service included in this invoice', type: [InvoiceServiceDto] })
  @IsArray()
  @ArrayMinSize(1, { message: '{"ar":"يجب إضافة خدمة واحدة على الأقل","en":"At least one service is required"}' })
  @ArrayMaxSize(1, { message: '{"ar":"يمكن إضافة خدمة واحدة فقط لكل فاتورة","en":"Each invoice can contain only one service"}' })
  @ValidateNested({ each: true })
  @Type(() => InvoiceServiceDto)
  services: InvoiceServiceDto[];

  @ApiPropertyOptional({
    description: 'Extra info shown on invoice printout (UC-3h4i5j6k)',
    example: 'Referred by Dr. Smith',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  extraInfo?: string;

  @ApiPropertyOptional({ description: 'Invoice notes', example: 'First visit', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
