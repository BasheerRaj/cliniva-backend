import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Counter } from '../database/schemas/counter.schema';

/**
 * Service responsible for generating unique invoice numbers
 * Uses an atomic Counter collection to prevent race conditions.
 *
 * Draft numbers:  DFT-xxxx  (keyed by "DFT:{organizationId}")
 * Posted numbers: INV-xxxx  (keyed by "INV:{organizationId}")
 */
@Injectable()
export class InvoiceNumberService {
  private readonly logger = new Logger(InvoiceNumberService.name);

  constructor(
    @InjectModel(Counter.name)
    private readonly counterModel: Model<Counter>,
  ) {}

  /**
   * Generates a unique draft invoice number in format DFT-xxxx.
   * Uses atomic findOneAndUpdate with $inc to prevent collisions.
   *
   * @param organizationId - Organization scope key (or 'global' for single-clinic plans)
   * @returns Promise<string> Draft invoice number (e.g., "DFT-0001")
   */
  async generateDraftNumber(organizationId: string = 'global'): Promise<string> {
    const key = `DFT:${organizationId}`;
    const counter = await this.counterModel.findOneAndUpdate(
      { key },
      { $inc: { seq: 1 } },
      { upsert: true, new: true },
    );

    const draftNumber = `DFT-${this.padNumber(counter.seq)}`;
    this.logger.log(`Generated draft invoice number: ${draftNumber}`);
    return draftNumber;
  }

  /**
   * Generates a unique posted invoice number in format INV-xxxx.
   * Uses atomic findOneAndUpdate with $inc to prevent collisions.
   *
   * @param organizationId - Organization scope key (or 'global' for single-clinic plans)
   * @returns Promise<string> Posted invoice number (e.g., "INV-0001")
   */
  async generatePostedNumber(organizationId: string = 'global'): Promise<string> {
    const key = `INV:${organizationId}`;
    const counter = await this.counterModel.findOneAndUpdate(
      { key },
      { $inc: { seq: 1 } },
      { upsert: true, new: true },
    );

    const postedNumber = `INV-${this.padNumber(counter.seq)}`;
    this.logger.log(`Generated posted invoice number: ${postedNumber}`);
    return postedNumber;
  }

  /**
   * Pads a number with leading zeros to 4 digits.
   *
   * @param num - The number to pad
   * @returns Padded string (e.g., 1 -> "0001", 42 -> "0042")
   */
  private padNumber(num: number): string {
    return num.toString().padStart(4, '0');
  }

  /**
   * Validates if an invoice number follows the correct format.
   *
   * @param invoiceNumber - The invoice number to validate
   * @returns boolean indicating if the format is valid
   */
  validateInvoiceNumberFormat(invoiceNumber: string): boolean {
    const draftPattern = /^DFT-\d{4}$/;
    const postedPattern = /^INV-\d{4}$/;
    return draftPattern.test(invoiceNumber) || postedPattern.test(invoiceNumber);
  }

  /**
   * Checks if an invoice number is a draft number.
   */
  isDraftNumber(invoiceNumber: string): boolean {
    return /^DFT-\d{4}$/.test(invoiceNumber);
  }

  /**
   * Checks if an invoice number is a posted number.
   */
  isPostedNumber(invoiceNumber: string): boolean {
    return /^INV-\d{4}$/.test(invoiceNumber);
  }
}
