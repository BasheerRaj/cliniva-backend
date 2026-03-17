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
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for a single session item within an invoice service
 * PART C — M7 redesign
 */
export class InvoiceSessionItemDto {
  @ApiPropertyOptional({ description: 'Session ID from service.sessions array' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiProperty({ description: 'Session display name', example: 'Session 1' })
  @IsNotEmpty()
  @IsString()
  sessionName: string;

  @ApiProperty({ description: 'Session order (1-based)', example: 1 })
  @IsInt()
  @Min(1)
  sessionOrder: number;

  @ApiPropertyOptional({ description: 'Doctor assigned to this session' })
  @IsOptional()
  @IsMongoId()
  doctorId?: string;

  @ApiProperty({ description: 'Unit price for this session', example: 100 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ description: 'Discount percent (0-100)', example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @ApiPropertyOptional({ description: 'Tax rate percent (0-100)', example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;
}

/**
 * DTO for a service within an invoice (can have multiple sessions)
 */
export class InvoiceServiceDto {
  @ApiProperty({ description: 'Service ID', example: '507f1f77bcf86cd799439013' })
  @IsMongoId()
  serviceId: string;

  @ApiProperty({ description: 'Sessions for this service', type: [InvoiceSessionItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceSessionItemDto)
  sessions: InvoiceSessionItemDto[];
}

/**
 * DTO for creating a new invoice
 * PART C — M7 redesign
 * Requirements: 1.2, 1.3, 13.1, 13.2, 13.3, 13.4, 13.5
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
  @IsString()
  @MaxLength(200)
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
  @IsDate()
  issueDate: Date;

  @ApiProperty({
    description: 'Patient ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty({
    message: '{"ar":"معرف المريض مطلوب","en":"Patient ID is required"}',
  })
  @IsMongoId()
  patientId: string;

  @ApiProperty({
    description: 'Clinic ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439012',
  })
  @IsNotEmpty({
    message: '{"ar":"معرف العيادة مطلوب","en":"Clinic ID is required"}',
  })
  @IsMongoId()
  clinicId: string;

  @ApiProperty({
    description: 'Services and their sessions',
    type: [InvoiceServiceDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceServiceDto)
  services: InvoiceServiceDto[];

  @ApiPropertyOptional({
    description: 'Invoice notes',
    example: 'First visit',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
