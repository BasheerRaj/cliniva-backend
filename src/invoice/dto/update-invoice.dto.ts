import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateInvoiceDto } from './create-invoice.dto';

/**
 * DTO for updating an existing invoice
 * Requirements: 4.3, 4.4
 * 
 * Extends CreateInvoiceDto with all fields optional
 * Omits patientId as it cannot be modified (Requirement 4.4)
 * All validation messages remain bilingual (Arabic & English)
 */
export class UpdateInvoiceDto extends PartialType(
  OmitType(CreateInvoiceDto, ['patientId'] as const),
) {}
