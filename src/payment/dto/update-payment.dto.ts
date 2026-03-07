import { PartialType, OmitType } from '@nestjs/swagger';
import { CreatePaymentDto } from './create-payment.dto';

/**
 * DTO for updating an existing payment
 * Requirements: 10.4, 10.5
 * 
 * Extends CreatePaymentDto with all fields optional
 * Omits patientId and invoiceId as they cannot be modified (Requirement 10.5)
 * All validation messages remain bilingual (Arabic & English)
 */
export class UpdatePaymentDto extends PartialType(
  OmitType(CreatePaymentDto, ['patientId', 'invoiceId'] as const),
) {}
