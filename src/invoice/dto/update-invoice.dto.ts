import { PartialType } from '@nestjs/mapped-types';
import { CreateInvoiceDto } from './create-invoice.dto';

/**
 * DTO for updating an existing invoice
 * PART C — M7 redesign
 * All fields optional via PartialType
 */
export class UpdateInvoiceDto extends PartialType(CreateInvoiceDto) {}
