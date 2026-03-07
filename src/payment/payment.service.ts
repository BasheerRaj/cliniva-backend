import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { Payment } from '../database/schemas/payment.schema';
import { Invoice } from '../database/schemas/invoice.schema';
import { Patient } from '../database/schemas/patient.schema';
import { Clinic } from '../database/schemas/clinic.schema';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { PaymentBalanceService } from './payment-balance.service';
import {
  PAYMENT_ERRORS,
  SUCCESS_MESSAGES,
  NOT_FOUND_ERRORS,
  AUTH_ERRORS,
} from './constants/payment-messages';

/**
 * Payment Service - M7 Billing & Payments MVP
 * Handles payment recording, balance updates, and payment management
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    @InjectModel(Invoice.name) private invoiceModel: Model<Invoice>,
    @InjectModel(Patient.name) private patientModel: Model<Patient>,
    @InjectModel(Clinic.name) private clinicModel: Model<Clinic>,
    @InjectConnection() private connection: Connection,
    private paymentBalanceService: PaymentBalanceService,
  ) {}

  /**
   * Create a new payment
   * Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 6.12, 7.7, 7.8, 13.7, 13.8
   */
  async createPayment(
    createPaymentDto: CreatePaymentDto,
    userId: string,
  ): Promise<PaymentResponseDto> {
    // Validate invoice exists and is Posted
    const invoice = await this.invoiceModel.findById(
      createPaymentDto.invoiceId,
    );
    if (!invoice || invoice.deletedAt) {
      throw new NotFoundException(NOT_FOUND_ERRORS.INVOICE);
    }
    if (invoice.invoiceStatus !== 'posted') {
      throw new BadRequestException(PAYMENT_ERRORS.INVOICE_NOT_POSTED);
    }

    // Validate payment amount > 0
    if (createPaymentDto.amount <= 0) {
      throw new BadRequestException(PAYMENT_ERRORS.AMOUNT_ZERO);
    }

    // Calculate outstanding balance
    const outstandingBalance = Math.max(
      0,
      invoice.totalAmount - invoice.paidAmount,
    );

    // Validate payment amount <= outstanding balance
    if (createPaymentDto.amount > outstandingBalance) {
      throw new BadRequestException(PAYMENT_ERRORS.AMOUNT_EXCEEDS_BALANCE);
    }

    // Validate payment date is not in future
    const paymentDate = new Date(createPaymentDto.paymentDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    if (paymentDate > today) {
      throw new BadRequestException(PAYMENT_ERRORS.DATE_FUTURE);
    }

    // Validate invoice paymentStatus is not 'paid'
    if (invoice.paymentStatus === 'paid') {
      throw new BadRequestException(PAYMENT_ERRORS.INVOICE_ALREADY_PAID);
    }
    // Note: Invoice schema doesn't have 'cancelled' status, only 'draft' and 'posted'

    // Validate patient exists
    const patient = await this.patientModel.findById(
      createPaymentDto.patientId,
    );
    if (!patient || patient.deletedAt) {
      throw new NotFoundException(NOT_FOUND_ERRORS.PATIENT);
    }

    // Validate patient matches invoice
    if (invoice.patientId.toString() !== createPaymentDto.patientId) {
      throw new BadRequestException(PAYMENT_ERRORS.PATIENT_MISMATCH);
    }

    // Generate unique Payment ID
    const paymentId = await this.generatePaymentId();

    // Start database transaction
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // Create payment record with addedBy and timestamps
      const payment = new this.paymentModel({
        paymentId,
        invoiceId: new Types.ObjectId(createPaymentDto.invoiceId),
        patientId: new Types.ObjectId(createPaymentDto.patientId),
        clinicId: invoice.clinicId,
        amount: createPaymentDto.amount,
        paymentMethod: createPaymentDto.paymentMethod,
        paymentDate,
        notes: createPaymentDto.notes,
        addedBy: new Types.ObjectId(userId),
      });

      await payment.save({ session });

      // Call balance service to update invoice
      await this.paymentBalanceService.updateInvoiceBalances(
        createPaymentDto.invoiceId,
        createPaymentDto.amount,
        session,
      );

      // Update lastPaymentDate on invoice
      invoice.lastPaymentDate = paymentDate;
      await invoice.save({ session });

      // Commit transaction
      await session.commitTransaction();

      // Log audit event
      this.logger.log(
        `Payment created: ${paymentId} for invoice ${invoice.invoiceNumber} by user ${userId}, amount: ${createPaymentDto.amount}`,
      );

      // Return payment with populated references
      const populatedPayment = await this.paymentModel
        .findById(payment._id)
        .populate([
          { path: 'patientId', select: 'firstName lastName patientNumber' },
          {
            path: 'invoiceId',
            select:
              'invoiceNumber invoiceTitle totalAmount paidAmount paymentStatus',
          },
          { path: 'clinicId', select: 'name' },
          { path: 'addedBy', select: 'firstName lastName email' },
        ])
        .session(null);

      return this.mapToResponseDto(populatedPayment);
    } catch (error) {
      // Rollback on any error
      await session.abortTransaction();
      this.logger.error(
        `Payment creation failed for invoice ${createPaymentDto.invoiceId}: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get payments with filtering, sorting, and pagination
   * Requirements: 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 11.2, 11.4
   */
  async getPayments(
    queryDto: PaymentQueryDto,
    userId: string,
    userRole: string,
    userClinicIds: string[],
  ): Promise<{ data: PaymentResponseDto[]; meta: any }> {
    // Build query filter
    const filter: any = {};

    // Apply role-based clinic filtering
    if (userRole === 'staff' || userRole === 'doctor') {
      // Staff sees only their clinic
      filter.clinicId = {
        $in: userClinicIds.map((id) => new Types.ObjectId(id)),
      };
    } else if (userRole === 'admin' || userRole === 'manager') {
      // Admin sees clinics they have access to
      if (userClinicIds.length > 0) {
        filter.clinicId = {
          $in: userClinicIds.map((id) => new Types.ObjectId(id)),
        };
      }
    }
    // Super admin and owner see all

    // Support filtering by paymentMethod
    if (queryDto.paymentMethod) {
      filter.paymentMethod = queryDto.paymentMethod;
    }

    // Support filtering by date range
    if (queryDto.dateFrom || queryDto.dateTo) {
      filter.paymentDate = {};
      if (queryDto.dateFrom) {
        filter.paymentDate.$gte = new Date(queryDto.dateFrom);
      }
      if (queryDto.dateTo) {
        filter.paymentDate.$lte = new Date(queryDto.dateTo);
      }
    }

    // Support filtering by invoiceId
    if (queryDto.invoiceId) {
      filter.invoiceId = new Types.ObjectId(queryDto.invoiceId);
    }

    // Support filtering by patientId
    if (queryDto.patientId) {
      filter.patientId = new Types.ObjectId(queryDto.patientId);
    }

    // Support filtering by clinicId (additional filter)
    if (queryDto.clinicId) {
      filter.clinicId = new Types.ObjectId(queryDto.clinicId);
    }

    // Support search by paymentId, patientName, invoiceNumber
    if (queryDto.search) {
      const searchRegex = new RegExp(queryDto.search, 'i');
      filter.$or = [{ paymentId: searchRegex }];
      // Note: Patient name and invoice number search requires aggregation pipeline
    }

    // Pagination
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 10;
    const skip = (page - 1) * limit;

    // Sorting
    const sortBy = queryDto.sortBy || 'paymentDate';
    const sortOrder = queryDto.sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortBy]: sortOrder };

    // Execute query
    const [payments, total] = await Promise.all([
      this.paymentModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate([
          { path: 'patientId', select: 'firstName lastName patientNumber' },
          {
            path: 'invoiceId',
            select:
              'invoiceNumber invoiceTitle totalAmount paidAmount paymentStatus',
          },
          { path: 'clinicId', select: 'name' },
          { path: 'addedBy', select: 'firstName lastName email' },
        ])
        .exec(),
      this.paymentModel.countDocuments(filter),
    ]);

    return {
      data: payments.map((payment) => this.mapToResponseDto(payment)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get payment by ID
   * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 11.6
   */
  async getPaymentById(
    id: string,
    userId: string,
    userRole: string,
    userClinicIds: string[],
  ): Promise<PaymentResponseDto> {
    // Find payment by ID
    const payment = await this.paymentModel
      .findById(id)
      .populate([
        { path: 'patientId', select: 'firstName lastName patientNumber' },
        {
          path: 'invoiceId',
          select:
            'invoiceNumber invoiceTitle totalAmount paidAmount paymentStatus',
        },
        { path: 'clinicId', select: 'name' },
        { path: 'addedBy', select: 'firstName lastName email' },
        { path: 'updatedBy', select: 'firstName lastName email' },
      ])
      .exec();

    // Return 404 if not found
    if (!payment) {
      throw new NotFoundException(NOT_FOUND_ERRORS.PAYMENT);
    }

    // Check role-based access permissions
    if (userRole === 'staff' || userRole === 'doctor') {
      const hasAccess = userClinicIds.some(
        (clinicId) => clinicId === payment.clinicId.toString(),
      );
      if (!hasAccess) {
        throw new ForbiddenException(AUTH_ERRORS.INSUFFICIENT_PERMISSIONS);
      }
    }

    return this.mapToResponseDto(payment);
  }

  /**
   * Update payment
   * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10, 10.11, 11.8, 11.10
   */
  async updatePayment(
    id: string,
    updatePaymentDto: UpdatePaymentDto,
    userId: string,
    userRole: string,
  ): Promise<PaymentResponseDto> {
    // Find payment by ID
    const payment = await this.paymentModel.findById(id);

    if (!payment) {
      throw new NotFoundException(NOT_FOUND_ERRORS.PAYMENT);
    }

    // Check edit permissions
    if (userRole === 'staff' || userRole === 'doctor') {
      // Staff can only edit own payments
      if (payment.addedBy.toString() !== userId) {
        throw new ForbiddenException(AUTH_ERRORS.INSUFFICIENT_PERMISSIONS);
      }
    }
    // Admin can edit any payment

    // Get the invoice for validation
    const invoice = await this.invoiceModel.findById(payment.invoiceId);
    if (!invoice || invoice.deletedAt) {
      throw new NotFoundException(NOT_FOUND_ERRORS.INVOICE);
    }

    // Validate new amount if provided
    if (updatePaymentDto.amount !== undefined) {
      // Validate new amount > 0
      if (updatePaymentDto.amount <= 0) {
        throw new BadRequestException(PAYMENT_ERRORS.AMOUNT_ZERO);
      }

      // Calculate outstanding balance considering the current payment
      const currentOutstanding = Math.max(
        0,
        invoice.totalAmount - invoice.paidAmount,
      );
      const maxAllowedAmount = currentOutstanding + payment.amount;

      // Validate new amount <= outstanding balance + current payment amount
      if (updatePaymentDto.amount > maxAllowedAmount) {
        throw new BadRequestException(PAYMENT_ERRORS.AMOUNT_EXCEEDS_BALANCE);
      }
    }

    // Validate new date if provided
    if (updatePaymentDto.paymentDate) {
      const newPaymentDate = new Date(updatePaymentDto.paymentDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (newPaymentDate > today) {
        throw new BadRequestException(PAYMENT_ERRORS.DATE_FUTURE);
      }
    }

    // Start database transaction
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // Calculate difference in payment amount
      const oldAmount = payment.amount;
      const newAmount = updatePaymentDto.amount ?? oldAmount;
      const amountDifference = newAmount - oldAmount;

      // Update payment record
      if (updatePaymentDto.amount !== undefined) {
        payment.amount = updatePaymentDto.amount;
      }
      if (updatePaymentDto.paymentMethod) {
        payment.paymentMethod = updatePaymentDto.paymentMethod;
      }
      if (updatePaymentDto.paymentDate) {
        payment.paymentDate = new Date(updatePaymentDto.paymentDate);
      }
      if (updatePaymentDto.notes !== undefined) {
        payment.notes = updatePaymentDto.notes;
      }

      payment.updatedBy = new Types.ObjectId(userId);

      await payment.save({ session });

      // Recalculate invoice balances if amount changed
      if (amountDifference !== 0) {
        // Calculate total paid amount for the invoice
        const totalPaid = invoice.paidAmount + amountDifference;
        await this.paymentBalanceService.recalculateInvoiceBalances(
          payment.invoiceId.toString(),
          totalPaid,
          session,
        );
      }

      // Update lastPaymentDate if date changed
      if (updatePaymentDto.paymentDate) {
        // Find the most recent payment date for this invoice
        const latestPayment = await this.paymentModel
          .findOne({ invoiceId: payment.invoiceId })
          .sort({ paymentDate: -1 })
          .session(session);

        if (latestPayment) {
          invoice.lastPaymentDate = latestPayment.paymentDate;
          await invoice.save({ session });
        }
      }

      // Commit transaction
      await session.commitTransaction();

      // Log audit event
      this.logger.log(
        `Payment updated: ${payment.paymentId} by user ${userId}, amount changed from ${oldAmount} to ${newAmount}`,
      );

      // Return updated payment
      const populatedPayment = await this.paymentModel
        .findById(payment._id)
        .populate([
          { path: 'patientId', select: 'firstName lastName patientNumber' },
          {
            path: 'invoiceId',
            select:
              'invoiceNumber invoiceTitle totalAmount paidAmount paymentStatus',
          },
          { path: 'clinicId', select: 'name' },
          { path: 'addedBy', select: 'firstName lastName email' },
          { path: 'updatedBy', select: 'firstName lastName email' },
        ])
        .session(null);

      return this.mapToResponseDto(populatedPayment);
    } catch (error) {
      // Rollback on error
      await session.abortTransaction();
      this.logger.error(
        `Payment update failed for ${payment.paymentId}: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Soft delete payment (Admin only)
   */
  async deletePayment(
    id: string,
    userId: string,
    userRole: string,
  ): Promise<void> {
    const payment = await this.paymentModel.findById(id);

    if (!payment) {
      throw new NotFoundException(NOT_FOUND_ERRORS.PAYMENT);
    }

    // Only admin and above can delete
    if (userRole === 'staff' || userRole === 'doctor') {
      throw new ForbiddenException(AUTH_ERRORS.INSUFFICIENT_PERMISSIONS);
    }

    // Start transaction to recalculate invoice balances
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // Get invoice to calculate new total
      const invoice = await this.invoiceModel.findById(payment.invoiceId).session(session);
      if (!invoice) {
        throw new NotFoundException(NOT_FOUND_ERRORS.INVOICE);
      }

      // Remove payment
      await this.paymentModel.findByIdAndDelete(id).session(session);

      // Recalculate invoice balances
      const newTotalPaid = Math.max(0, invoice.paidAmount - payment.amount);
      await this.paymentBalanceService.recalculateInvoiceBalances(
        payment.invoiceId.toString(),
        newTotalPaid,
        session,
      );

      await session.commitTransaction();

      this.logger.log(
        `Payment deleted: ${payment.paymentId} by user ${userId}`,
      );
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Generate unique payment ID
   */
  private async generatePaymentId(): Promise<string> {
    const count = await this.paymentModel.countDocuments();
    const paddedNumber = String(count + 1).padStart(4, '0');
    const paymentId = `PAY-${paddedNumber}`;

    // Check for uniqueness (in case of concurrent creation)
    const existing = await this.paymentModel.findOne({ paymentId });
    if (existing) {
      // Retry with timestamp suffix
      return `PAY-${paddedNumber}-${Date.now()}`;
    }

    return paymentId;
  }

  /**
   * Map payment document to response DTO
   */
  private mapToResponseDto(payment: any): PaymentResponseDto {
    const outstandingBalance = payment.invoiceId
      ? Math.max(
          0,
          payment.invoiceId.totalAmount - payment.invoiceId.paidAmount,
        )
      : 0;

    return {
      _id: payment._id.toString(),
      paymentId: payment.paymentId,
      patient: payment.patientId
        ? {
            _id: payment.patientId._id.toString(),
            firstName: payment.patientId.firstName,
            lastName: payment.patientId.lastName,
            patientNumber: payment.patientId.patientNumber,
          }
        : undefined,
      invoice: payment.invoiceId
        ? {
            _id: payment.invoiceId._id.toString(),
            invoiceNumber: payment.invoiceId.invoiceNumber,
            invoiceTitle: payment.invoiceId.invoiceTitle,
            totalAmount: payment.invoiceId.totalAmount,
            paidAmount: payment.invoiceId.paidAmount,
            outstandingBalance,
            paymentStatus: payment.invoiceId.paymentStatus,
          }
        : undefined,
      clinic: payment.clinicId
        ? {
            _id: payment.clinicId._id.toString(),
            name: payment.clinicId.name,
          }
        : undefined,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      paymentDate: payment.paymentDate,
      notes: payment.notes,
      addedBy: payment.addedBy && payment.addedBy._id
        ? {
            _id:
              payment.addedBy._id?.toString() ||
              payment.addedBy.toString(),
            firstName: payment.addedBy.firstName,
            lastName: payment.addedBy.lastName,
            email: payment.addedBy.email,
          }
        : {
            _id: payment.addedBy?.toString() || '',
            firstName: '',
            lastName: '',
            email: '',
          },
      updatedBy: payment.updatedBy
        ? {
            _id:
              payment.updatedBy._id?.toString() ||
              payment.updatedBy.toString(),
            firstName: payment.updatedBy.firstName,
            lastName: payment.updatedBy.lastName,
            email: payment.updatedBy.email,
          }
        : undefined,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }
}
