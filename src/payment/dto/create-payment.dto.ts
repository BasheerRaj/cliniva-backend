import {
  IsNotEmpty,
  IsString,
  IsDate,
  IsOptional,
  IsMongoId,
  IsNumber,
  IsEnum,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Payment method enumeration
 * Requirements: 6.2, 13.9
 */
export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  INSURANCE = 'insurance',
  CHECK = 'check',
  DIGITAL_WALLET = 'digital_wallet',
}

/**
 * DTO for creating a new payment
 * Requirements: 6.2, 6.4, 6.5, 6.6, 13.7, 13.8, 13.9
 * 
 * All validation messages are bilingual (Arabic & English)
 */
export class CreatePaymentDto {
  @ApiProperty({
    description: 'Invoice ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439014',
  })
  @IsNotEmpty({
    message: '{"ar":"معرف الفاتورة مطلوب","en":"Invoice ID is required"}',
  })
  @IsMongoId({
    message: '{"ar":"معرف الفاتورة غير صالح","en":"Invalid invoice ID"}',
  })
  invoiceId: string;

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
    description: 'Payment amount (must be positive and not zero)',
    example: 100,
    minimum: 0.01,
  })
  @IsNotEmpty({
    message: '{"ar":"مبلغ الدفع مطلوب","en":"Payment amount is required"}',
  })
  @Type(() => Number)
  @IsNumber(
    {},
    {
      message: '{"ar":"مبلغ الدفع يجب أن يكون رقماً","en":"Payment amount must be a number"}',
    },
  )
  @Min(0.01, {
    message: '{"ar":"مبلغ الدفع لا يمكن أن يكون صفراً","en":"The Payment Amount cannot be zero"}',
  })
  amount: number;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: PaymentMethod.CASH,
  })
  @IsNotEmpty({
    message: '{"ar":"طريقة الدفع مطلوبة","en":"Payment method is required"}',
  })
  @IsEnum(PaymentMethod, {
    message: '{"ar":"طريقة الدفع غير صالحة","en":"Invalid payment method"}',
  })
  paymentMethod: PaymentMethod;

  @ApiProperty({
    description: 'Payment date (cannot be in the future)',
    example: '2024-01-16T00:00:00.000Z',
    type: Date,
  })
  @IsNotEmpty({
    message: '{"ar":"تاريخ الدفع مطلوب","en":"Payment date is required"}',
  })
  @Type(() => Date)
  @IsDate({
    message: '{"ar":"تاريخ الدفع غير صالح","en":"Invalid payment date"}',
  })
  paymentDate: Date;

  @ApiPropertyOptional({
    description: 'Payment notes',
    example: 'Partial payment',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({
    message: '{"ar":"الملاحظات يجب أن تكون نصاً","en":"Notes must be a string"}',
  })
  @MaxLength(500, {
    message: '{"ar":"الملاحظات يجب ألا تتجاوز 500 حرف","en":"Notes must not exceed 500 characters"}',
  })
  notes?: string;
}
