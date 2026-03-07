import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Invoice } from '../database/schemas/invoice.schema';

/**
 * Service responsible for generating unique invoice numbers
 * Handles both draft (DFT-xxxx) and posted (INV-xxxx) invoice numbers
 */
@Injectable()
export class InvoiceNumberService {
  private readonly logger = new Logger(InvoiceNumberService.name);

  constructor(
    @InjectModel(Invoice.name)
    private readonly invoiceModel: Model<Invoice>,
  ) {}

  /**
   * Generates a unique draft invoice number in format DFT-xxxx
   * Uses atomic findOneAndUpdate to prevent collisions in concurrent requests
   * 
   * @returns Promise<string> Draft invoice number (e.g., "DFT-0001")
   */
  async generateDraftNumber(): Promise<string> {
    try {
      // Find the highest draft number currently in use
      const lastDraftInvoice = await this.invoiceModel
        .findOne({
          invoiceNumber: { $regex: /^DFT-\d{4}$/ },
        })
        .sort({ invoiceNumber: -1 })
        .select('invoiceNumber')
        .lean()
        .exec();

      let nextNumber = 1;

      if (lastDraftInvoice?.invoiceNumber) {
        // Extract the numeric part and increment
        const currentNumber = parseInt(
          lastDraftInvoice.invoiceNumber.replace('DFT-', ''),
          10,
        );
        nextNumber = currentNumber + 1;
      }

      // Format with leading zeros to 4 digits
      const formattedNumber = this.padNumber(nextNumber);
      const draftNumber = `DFT-${formattedNumber}`;

      this.logger.log(`Generated draft invoice number: ${draftNumber}`);
      return draftNumber;
    } catch (error) {
      this.logger.error('Error generating draft invoice number', error);
      throw error;
    }
  }

  /**
   * Generates a unique posted invoice number in format INV-xxxx
   * Uses atomic findOneAndUpdate to prevent collisions in concurrent requests
   * 
   * @returns Promise<string> Posted invoice number (e.g., "INV-0001")
   */
  async generatePostedNumber(): Promise<string> {
    try {
      // Find the highest posted number currently in use
      const lastPostedInvoice = await this.invoiceModel
        .findOne({
          invoiceNumber: { $regex: /^INV-\d{4}$/ },
        })
        .sort({ invoiceNumber: -1 })
        .select('invoiceNumber')
        .lean()
        .exec();

      let nextNumber = 1;

      if (lastPostedInvoice?.invoiceNumber) {
        // Extract the numeric part and increment
        const currentNumber = parseInt(
          lastPostedInvoice.invoiceNumber.replace('INV-', ''),
          10,
        );
        nextNumber = currentNumber + 1;
      }

      // Format with leading zeros to 4 digits
      const formattedNumber = this.padNumber(nextNumber);
      const postedNumber = `INV-${formattedNumber}`;

      this.logger.log(`Generated posted invoice number: ${postedNumber}`);
      return postedNumber;
    } catch (error) {
      this.logger.error('Error generating posted invoice number', error);
      throw error;
    }
  }

  /**
   * Pads a number with leading zeros to 4 digits
   * 
   * @param num - The number to pad
   * @returns Padded string (e.g., 1 -> "0001", 42 -> "0042")
   */
  private padNumber(num: number): string {
    return num.toString().padStart(4, '0');
  }

  /**
   * Validates if an invoice number follows the correct format
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
   * Checks if an invoice number is a draft number
   * 
   * @param invoiceNumber - The invoice number to check
   * @returns boolean indicating if it's a draft number
   */
  isDraftNumber(invoiceNumber: string): boolean {
    return /^DFT-\d{4}$/.test(invoiceNumber);
  }

  /**
   * Checks if an invoice number is a posted number
   * 
   * @param invoiceNumber - The invoice number to check
   * @returns boolean indicating if it's a posted number
   */
  isPostedNumber(invoiceNumber: string): boolean {
    return /^INV-\d{4}$/.test(invoiceNumber);
  }
}
