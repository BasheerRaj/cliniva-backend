import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { Invoice } from '../database/schemas/invoice.schema';
import { NOT_FOUND_ERRORS } from '../invoice/constants/invoice-messages';

/**
 * Payment Balance Service - M7 Billing & Payments MVP
 * 
 * Handles invoice balance calculations and payment status updates.
 * All operations are performed within database transactions to ensure atomicity.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */
@Injectable()
export class PaymentBalanceService {
  private readonly logger = new Logger(PaymentBalanceService.name);

  constructor(
    @InjectModel(Invoice.name)
    private readonly invoiceModel: Model<Invoice>,
  ) {}

  /**
   * Update invoice balances after a payment is recorded
   * 
   * This method:
   * 1. Adds payment amount to invoice's paidAmount
   * 2. Recalculates outstandingBalance (totalAmount - paidAmount, min 0)
   * 3. Updates paymentStatus based on balance:
   *    - 'paid' if outstandingBalance = 0
   *    - 'partially_paid' if outstandingBalance > 0 and paidAmount > 0
   * 4. Validates balance never goes negative
   * 
   * @param invoiceId - The invoice to update
   * @param paymentAmount - The payment amount to add
   * @param session - MongoDB session for transaction support
   * @returns Updated invoice document
   * @throws BadRequestException if balance would go negative
   * 
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
   */
  async updateInvoiceBalances(
    invoiceId: string,
    paymentAmount: number,
    session: ClientSession,
  ): Promise<Invoice> {
    this.logger.log(`Updating invoice balances for invoice ${invoiceId}, payment amount: ${paymentAmount}`);

    // Fetch the invoice within the transaction
    const invoice = await this.invoiceModel
      .findById(invoiceId)
      .session(session)
      .exec();

    if (!invoice) {
      this.logger.error(`Invoice not found: ${invoiceId}`);
      throw new BadRequestException(NOT_FOUND_ERRORS.INVOICE);
    }

    // Calculate new paidAmount (Requirement 7.1)
    const newPaidAmount = invoice.paidAmount + paymentAmount;

    // Calculate new outstandingBalance (Requirement 7.2)
    // outstandingBalance = totalAmount - paidAmount, minimum 0
    const newOutstandingBalance = Math.max(0, invoice.totalAmount - newPaidAmount);

    // Validate balance never goes negative (Requirement 7.6)
    if (newOutstandingBalance < 0) {
      this.logger.error(
        `Balance would go negative for invoice ${invoiceId}. ` +
        `Total: ${invoice.totalAmount}, New Paid: ${newPaidAmount}`
      );
      throw new BadRequestException({
        message: {
          ar: 'المبلغ المدفوع يتجاوز المبلغ الإجمالي للفاتورة',
          en: 'Payment amount exceeds invoice total amount',
        },
        code: 'PAYMENT_EXCEEDS_TOTAL',
      });
    }

    // Determine new payment status (Requirements 7.3, 7.4)
    let newPaymentStatus: string;
    
    if (newOutstandingBalance === 0) {
      // Requirement 7.3: When outstanding balance becomes zero, status = 'paid'
      newPaymentStatus = 'paid';
      this.logger.log(`Invoice ${invoiceId} is now fully paid`);
    } else if (newPaidAmount > 0 && newOutstandingBalance > 0) {
      // Requirement 7.4: When balance > 0 and paid > 0, status = 'partially_paid'
      newPaymentStatus = 'partially_paid';
      this.logger.log(
        `Invoice ${invoiceId} is partially paid. ` +
        `Paid: ${newPaidAmount}, Outstanding: ${newOutstandingBalance}`
      );
    } else {
      // Keep current status if neither condition is met
      newPaymentStatus = invoice.paymentStatus;
    }

    // Update invoice within transaction (Requirement 7.5)
    invoice.paidAmount = newPaidAmount;
    invoice.paymentStatus = newPaymentStatus;

    // Save changes within the transaction
    const updatedInvoice = await invoice.save({ session });

    this.logger.log(
      `Invoice ${invoiceId} balances updated successfully. ` +
      `Status: ${newPaymentStatus}, Paid: ${newPaidAmount}, Outstanding: ${newOutstandingBalance}`
    );

    return updatedInvoice;
  }

  /**
   * Recalculate invoice balances after a payment is updated or deleted
   * 
   * This method recalculates the invoice's paidAmount by summing all payments
   * and updates the payment status accordingly.
   * 
   * @param invoiceId - The invoice to recalculate
   * @param session - MongoDB session for transaction support
   * @returns Updated invoice document
   * 
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.6
   */
  async recalculateInvoiceBalances(
    invoiceId: string,
    totalPaidAmount: number,
    session: ClientSession,
  ): Promise<Invoice> {
    this.logger.log(`Recalculating invoice balances for invoice ${invoiceId}`);

    // Fetch the invoice within the transaction
    const invoice = await this.invoiceModel
      .findById(invoiceId)
      .session(session)
      .exec();

    if (!invoice) {
      this.logger.error(`Invoice not found: ${invoiceId}`);
      throw new BadRequestException(NOT_FOUND_ERRORS.INVOICE);
    }

    // Calculate new outstandingBalance (Requirement 7.2)
    const newOutstandingBalance = Math.max(0, invoice.totalAmount - totalPaidAmount);

    // Validate balance never goes negative (Requirement 7.6)
    if (newOutstandingBalance < 0) {
      this.logger.error(
        `Balance would go negative for invoice ${invoiceId}. ` +
        `Total: ${invoice.totalAmount}, Paid: ${totalPaidAmount}`
      );
      throw new BadRequestException({
        message: {
          ar: 'المبلغ المدفوع يتجاوز المبلغ الإجمالي للفاتورة',
          en: 'Payment amount exceeds invoice total amount',
        },
        code: 'PAYMENT_EXCEEDS_TOTAL',
      });
    }

    // Determine new payment status (Requirements 7.3, 7.4)
    let newPaymentStatus: string;
    
    if (newOutstandingBalance === 0 && totalPaidAmount > 0) {
      // Requirement 7.3: When outstanding balance becomes zero, status = 'paid'
      newPaymentStatus = 'paid';
    } else if (totalPaidAmount > 0 && newOutstandingBalance > 0) {
      // Requirement 7.4: When balance > 0 and paid > 0, status = 'partially_paid'
      newPaymentStatus = 'partially_paid';
    } else if (totalPaidAmount === 0) {
      // No payments, revert to unpaid (assuming invoice is posted)
      newPaymentStatus = invoice.invoiceStatus === 'posted' ? 'unpaid' : 'not_due';
    } else {
      // Keep current status
      newPaymentStatus = invoice.paymentStatus;
    }

    // Update invoice within transaction
    invoice.paidAmount = totalPaidAmount;
    invoice.paymentStatus = newPaymentStatus;

    // Save changes within the transaction
    const updatedInvoice = await invoice.save({ session });

    this.logger.log(
      `Invoice ${invoiceId} balances recalculated successfully. ` +
      `Status: ${newPaymentStatus}, Paid: ${totalPaidAmount}, Outstanding: ${newOutstandingBalance}`
    );

    return updatedInvoice;
  }
}
