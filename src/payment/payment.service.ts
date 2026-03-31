import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payment } from '../database/schemas/payment.schema';
import { Invoice } from '../database/schemas/invoice.schema';
import { Patient } from '../database/schemas/patient.schema';
import { Clinic } from '../database/schemas/clinic.schema';
import { Counter } from '../database/schemas/counter.schema';
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
 * Handles payment recording, balance updates, and payment management.
 * Supports both single-invoice and multi-invoice payment modes.
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    @InjectModel(Invoice.name) private invoiceModel: Model<Invoice>,
    @InjectModel(Patient.name) private patientModel: Model<Patient>,
    @InjectModel(Clinic.name) private clinicModel: Model<Clinic>,
    @InjectModel(Counter.name) private counterModel: Model<Counter>,
    private paymentBalanceService: PaymentBalanceService,
  ) {}

  /**
   * Create a new payment (single-invoice or multi-invoice)
   * Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 6.12, 7.7, 7.8, 13.7, 13.8
   */
  async createPayment(
    createPaymentDto: CreatePaymentDto,
    userId: string,
  ): Promise<PaymentResponseDto> {
    const isMultiInvoice =
      createPaymentDto.invoiceAllocations &&
      createPaymentDto.invoiceAllocations.length > 0;

    if (isMultiInvoice) {
      return this.createMultiInvoicePayment(createPaymentDto, userId);
    }
    return this.createSingleInvoicePayment(createPaymentDto, userId);
  }

  /**
   * Multi-invoice payment: payment spans multiple invoices.
   * Each allocation specifies how much goes to each invoice.
   */
  private async createMultiInvoicePayment(
    createPaymentDto: CreatePaymentDto,
    userId: string,
  ): Promise<PaymentResponseDto> {
    const allocations = createPaymentDto.invoiceAllocations!;

    // Validate patient exists
    const patient = await this.patientModel.findById(createPaymentDto.patientId);
    if (!patient || patient.deletedAt) {
      throw new NotFoundException(NOT_FOUND_ERRORS.PATIENT);
    }

    // Validate each invoice allocation
    const invoiceDocs: any[] = [];
    for (const alloc of allocations) {
      const invoice = await this.invoiceModel.findById(alloc.invoiceId);
      if (!invoice || invoice.deletedAt) {
        throw new NotFoundException(NOT_FOUND_ERRORS.INVOICE);
      }
      if (invoice.invoiceStatus !== 'posted') {
        throw new BadRequestException(PAYMENT_ERRORS.INVOICE_NOT_POSTED);
      }
      if (invoice.paymentStatus === 'paid') {
        throw new BadRequestException(PAYMENT_ERRORS.INVOICE_ALREADY_PAID);
      }
      if (invoice.patientId.toString() !== createPaymentDto.patientId) {
        throw new BadRequestException(PAYMENT_ERRORS.PATIENT_MISMATCH);
      }
      const outstanding = Math.max(0, invoice.totalAmount - invoice.paidAmount);
      if (alloc.amount > outstanding + 0.001) {
        throw new BadRequestException(PAYMENT_ERRORS.AMOUNT_EXCEEDS_BALANCE);
      }
      invoiceDocs.push(invoice);
    }

    // Validate total matches
    const allocTotal = allocations.reduce((s, a) => s + a.amount, 0);
    if (Math.abs(allocTotal - createPaymentDto.amount) > 0.01) {
      throw new BadRequestException({
        message: {
          ar: 'مجموع مبالغ الفواتير لا يساوي المبلغ الإجمالي للدفعة',
          en: 'Invoice allocations total must equal the payment amount',
        },
        code: 'ALLOCATION_SUM_MISMATCH',
      });
    }

    // Validate payment date not in future
    const paymentDate = new Date(createPaymentDto.paymentDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (paymentDate > today) {
      throw new BadRequestException(PAYMENT_ERRORS.DATE_FUTURE);
    }

    const firstInvoice = invoiceDocs[0];
    const organizationId = (firstInvoice as any).organizationId?.toString();
    const paymentId = await this.generatePaymentId(organizationId);

    const payment = new this.paymentModel({
      paymentId,
      invoiceId: new Types.ObjectId(allocations[0].invoiceId),
      invoiceIds: allocations.map((a) => new Types.ObjectId(a.invoiceId)),
      invoiceAllocations: allocations.map((a) => ({
        invoiceId: new Types.ObjectId(a.invoiceId),
        amount: a.amount,
      })),
      patientId: new Types.ObjectId(createPaymentDto.patientId),
      clinicId: firstInvoice.clinicId,
      organizationId: (firstInvoice as any).organizationId,
      amount: createPaymentDto.amount,
      paymentMethod: createPaymentDto.paymentMethod,
      paymentDate,
      notes: createPaymentDto.notes,
      addedBy: new Types.ObjectId(userId),
    });

    let savedMulti = false;
    let retriesMulti = 0;
    while (!savedMulti) {
      try {
        await payment.save();
        savedMulti = true;
      } catch (err: any) {
        if (err.code === 11000 && err.keyPattern?.paymentId && retriesMulti < 10) {
          retriesMulti++;
          payment.paymentId = await this.generatePaymentId(organizationId);
          this.logger.warn(`Payment ID collision, retrying with ${payment.paymentId} (attempt ${retriesMulti})`);
        } else {
          throw err;
        }
      }
    }

    // Apply per-session allocations if provided (cross-invoice allowed)
    if (
      createPaymentDto.sessionAllocations &&
      createPaymentDto.sessionAllocations.length > 0
    ) {
      const allocTotal = createPaymentDto.sessionAllocations.reduce(
        (sum, a) => sum + a.amount,
        0,
      );
      if (Math.abs(allocTotal - createPaymentDto.amount) > 0.01) {
        throw new BadRequestException({
          message: {
            ar: 'مجموع التوزيعات يجب أن يساوي المبلغ الإجمالي للدفعة',
            en: 'Session allocations total must equal the payment amount',
          },
          code: 'ALLOCATION_SUM_MISMATCH',
        });
      }

      for (const alloc of createPaymentDto.sessionAllocations) {
        if (alloc.amount <= 0) continue;
        await this.invoiceModel.updateOne(
          {
            _id: new Types.ObjectId(alloc.invoiceId),
            deletedAt: { $exists: false },
          },
          {
            $inc: {
              'services.$[].sessions.$[item].paidAmount': alloc.amount,
            },
          },
          {
            arrayFilters: [
              { 'item.invoiceItemId': new Types.ObjectId(alloc.invoiceItemId) },
            ],
          },
        );
      }
    }

    // Update balance per invoice allocation
    for (const alloc of allocations) {
      await this.paymentBalanceService.updateInvoiceBalances(
        alloc.invoiceId,
        alloc.amount,
      );
      // Update lastPaymentDate
      const inv = await this.invoiceModel.findById(alloc.invoiceId);
      if (inv) {
        inv.lastPaymentDate = paymentDate;
        await inv.save();
      }
    }

    this.logger.log(
      `Multi-invoice payment created: ${paymentId} by user ${userId}, invoices: ${allocations.map((a) => a.invoiceId).join(', ')}, total: ${createPaymentDto.amount}`,
    );

    const populatedPayment = await this.paymentModel
      .findById(payment._id)
      .populate([
        { path: 'patientId', select: 'firstName lastName patientNumber' },
        {
          path: 'invoiceId',
          select: 'invoiceNumber invoiceTitle totalAmount paidAmount paymentStatus',
        },
        {
          path: 'invoiceIds',
          select: 'invoiceNumber invoiceTitle totalAmount paidAmount paymentStatus',
        },
        { path: 'clinicId', select: 'name' },
        { path: 'addedBy', select: 'firstName lastName email' },
      ]);

    return this.mapToResponseDto(populatedPayment);
  }

  /**
   * Single-invoice payment (original logic, backward-compatible)
   */
  private async createSingleInvoicePayment(
    createPaymentDto: CreatePaymentDto,
    userId: string,
  ): Promise<PaymentResponseDto> {
    if (!createPaymentDto.invoiceId) {
      throw new BadRequestException({
        message: {
          ar: 'معرف الفاتورة مطلوب لدفعة فاتورة واحدة',
          en: 'Invoice ID is required for single-invoice payment',
        },
        code: 'INVOICE_ID_REQUIRED',
      });
    }

    // Validate invoice exists and is Posted
    const invoice = await this.invoiceModel.findById(createPaymentDto.invoiceId);
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
    today.setHours(23, 59, 59, 999);
    if (paymentDate > today) {
      throw new BadRequestException(PAYMENT_ERRORS.DATE_FUTURE);
    }

    // Validate invoice paymentStatus is not 'paid'
    if (invoice.paymentStatus === 'paid') {
      throw new BadRequestException(PAYMENT_ERRORS.INVOICE_ALREADY_PAID);
    }

    // Validate patient exists
    const patient = await this.patientModel.findById(createPaymentDto.patientId);
    if (!patient || patient.deletedAt) {
      throw new NotFoundException(NOT_FOUND_ERRORS.PATIENT);
    }

    // Validate patient matches invoice
    if (invoice.patientId.toString() !== createPaymentDto.patientId) {
      throw new BadRequestException(PAYMENT_ERRORS.PATIENT_MISMATCH);
    }

    // Validate sessionAllocations if provided
    if (
      createPaymentDto.sessionAllocations &&
      createPaymentDto.sessionAllocations.length > 0
    ) {
      const allocTotal = createPaymentDto.sessionAllocations.reduce(
        (sum, a) => sum + a.amount,
        0,
      );
      if (Math.abs(allocTotal - createPaymentDto.amount) > 0.01) {
        throw new BadRequestException({
          message: {
            ar: 'مجموع التوزيعات يجب أن يساوي المبلغ الإجمالي للدفعة',
            en: 'Session allocations total must equal the payment amount',
          },
          code: 'ALLOCATION_SUM_MISMATCH',
        });
      }
    }

    // Generate unique Payment ID (atomic via counter)
    const organizationId = (invoice as any).organizationId?.toString();
    const paymentId = await this.generatePaymentId(organizationId);

    // Create payment record
    const payment = new this.paymentModel({
      paymentId,
      invoiceId: new Types.ObjectId(createPaymentDto.invoiceId),
      invoiceIds: [new Types.ObjectId(createPaymentDto.invoiceId)],
      invoiceAllocations: [
        { invoiceId: new Types.ObjectId(createPaymentDto.invoiceId), amount: createPaymentDto.amount },
      ],
      patientId: new Types.ObjectId(createPaymentDto.patientId),
      clinicId: invoice.clinicId,
      organizationId: (invoice as any).organizationId,
      amount: createPaymentDto.amount,
      paymentMethod: createPaymentDto.paymentMethod,
      paymentDate,
      notes: createPaymentDto.notes,
      addedBy: new Types.ObjectId(userId),
    });

    let savedSingle = false;
    let retriesSingle = 0;
    while (!savedSingle) {
      try {
        await payment.save();
        savedSingle = true;
      } catch (err: any) {
        if (err.code === 11000 && err.keyPattern?.paymentId && retriesSingle < 10) {
          retriesSingle++;
          payment.paymentId = await this.generatePaymentId(organizationId);
          this.logger.warn(`Payment ID collision, retrying with ${payment.paymentId} (attempt ${retriesSingle})`);
        } else {
          throw err;
        }
      }
    }

    try {

      // Apply per-session payment allocations if provided
      if (
        createPaymentDto.sessionAllocations &&
        createPaymentDto.sessionAllocations.length > 0
      ) {
        // S-4: Load invoice for per-session balance validation
        const invoiceForValidation = await this.invoiceModel
          .findOne({ _id: new Types.ObjectId(createPaymentDto.invoiceId), deletedAt: { $exists: false } })
          .lean();

        for (const alloc of createPaymentDto.sessionAllocations) {
          if (alloc.amount <= 0) continue;

          // Find the session to validate balance
          let sessionFound = false;
          for (const svc of (invoiceForValidation as any).services || []) {
            const sess = (svc.sessions || []).find(
              (s: any) => s.invoiceItemId?.toString() === alloc.invoiceItemId
            );
            if (sess) {
              sessionFound = true;
              const remaining = sess.lineTotal - (sess.paidAmount || 0);
              if (alloc.amount > remaining + 0.001) {
                throw new BadRequestException({
                  message: { ar: 'مبلغ التخصيص يتجاوز الرصيد المتبقي للجلسة', en: 'Allocation amount exceeds remaining session balance' },
                  code: 'ALLOCATION_EXCEEDS_SESSION_BALANCE',
                  invoiceItemId: alloc.invoiceItemId,
                  remaining,
                  requested: alloc.amount,
                });
              }
              break;
            }
          }
          if (!sessionFound) {
            throw new BadRequestException({
              message: { ar: 'معرف عنصر الفاتورة غير موجود', en: 'Invoice item not found in invoice' },
              code: 'INVOICE_ITEM_NOT_FOUND',
            });
          }
        }

        for (const alloc of createPaymentDto.sessionAllocations) {
          if (alloc.amount <= 0) continue;
          await this.invoiceModel.updateOne(
            {
              _id: new Types.ObjectId(alloc.invoiceId),
              deletedAt: { $exists: false },
            },
            {
              $inc: {
                'services.$[].sessions.$[item].paidAmount': alloc.amount,
              },
            },
            {
              arrayFilters: [
                {
                  'item.invoiceItemId': new Types.ObjectId(alloc.invoiceItemId),
                },
              ],
            },
          );
        }
      }

      // Call balance service to update invoice-level paidAmount and paymentStatus
      await this.paymentBalanceService.updateInvoiceBalances(
        createPaymentDto.invoiceId,
        createPaymentDto.amount,
      );

      // Update lastPaymentDate on invoice
      invoice.lastPaymentDate = paymentDate;
      await invoice.save();

      this.logger.log(
        `Payment created: ${paymentId} for invoice ${invoice.invoiceNumber} by user ${userId}, amount: ${createPaymentDto.amount}`,
      );

      const populatedPayment = await this.paymentModel
        .findById(payment._id)
        .populate([
          { path: 'patientId', select: 'firstName lastName patientNumber' },
          {
            path: 'invoiceId',
            select: 'invoiceNumber invoiceTitle totalAmount paidAmount paymentStatus',
          },
          {
            path: 'invoiceIds',
            select: 'invoiceNumber invoiceTitle totalAmount paidAmount paymentStatus',
          },
          { path: 'clinicId', select: 'name' },
          { path: 'addedBy', select: 'firstName lastName email' },
        ]);

      return this.mapToResponseDto(populatedPayment);
    } catch (error) {
      this.logger.error(
        `Payment creation failed for invoice ${createPaymentDto.invoiceId}: ${error.message}`,
        error.stack,
      );
      throw error;
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
    userClinicId: string | null,
    userOrganizationId: string | null,
  ): Promise<{ data: PaymentResponseDto[]; meta: any }> {
    const filter: any = { deletedAt: { $exists: false } };

    // Clinic scoping — applied directly from req.user, not from query params,
    // to prevent privilege escalation via query param injection.
    if (
      (userRole === 'staff' || userRole === 'doctor' || userRole === 'admin' || userRole === 'manager') &&
      userClinicId && Types.ObjectId.isValid(userClinicId)
    ) {
      // Hard-lock to user's assigned clinic
      filter.clinicId = new Types.ObjectId(userClinicId);
    } else if (userRole === 'staff' || userRole === 'doctor' || userRole === 'admin' || userRole === 'manager') {
      // Scoped role with no clinic assigned — deny all
      filter._id = new Types.ObjectId('000000000000000000000000');
    } else if (userRole === 'owner' && userOrganizationId && Types.ObjectId.isValid(userOrganizationId)) {
      // Owner: always scope to their organization to prevent cross-tenant data leak
      filter.organizationId = new Types.ObjectId(userOrganizationId);
      // Then optionally narrow to a specific clinic
      if (queryDto.clinicId && Types.ObjectId.isValid(queryDto.clinicId)) {
        filter.clinicId = new Types.ObjectId(queryDto.clinicId);
      }
    } else if (userRole === 'super_admin' && queryDto.clinicId && Types.ObjectId.isValid(queryDto.clinicId)) {
      // super_admin: can optionally filter by clinicId; otherwise sees all tenants (intentional)
      filter.clinicId = new Types.ObjectId(queryDto.clinicId);
    }

    if (queryDto.paymentMethod) {
      filter.paymentMethod = queryDto.paymentMethod;
    }

    if (queryDto.dateFrom || queryDto.dateTo) {
      filter.paymentDate = {};
      if (queryDto.dateFrom) filter.paymentDate.$gte = new Date(queryDto.dateFrom);
      if (queryDto.dateTo) filter.paymentDate.$lte = new Date(queryDto.dateTo);
    }

    if (queryDto.invoiceId) {
      filter.invoiceId = new Types.ObjectId(queryDto.invoiceId);
    }

    if (queryDto.patientId) {
      filter.patientId = new Types.ObjectId(queryDto.patientId);
    }

    if (queryDto.search) {
      if (queryDto.search.length > 100) {
        throw new BadRequestException({ message: { ar: 'النص المدخل طويل جداً', en: 'Search term too long' } });
      }
      const searchRegex = new RegExp(this.escapeRegex(queryDto.search), 'i');
      filter.$or = [{ paymentId: searchRegex }];
    }

    const page = queryDto.page || 1;
    const limit = queryDto.limit || 10;
    const skip = (page - 1) * limit;
    const sortBy = queryDto.sortBy || 'paymentDate';
    const sortOrder = queryDto.sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortBy]: sortOrder };

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
            select: 'invoiceNumber invoiceTitle totalAmount paidAmount paymentStatus',
          },
          {
            path: 'invoiceIds',
            select: 'invoiceNumber invoiceTitle totalAmount paidAmount paymentStatus',
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
    const payment = await this.paymentModel
      .findById(id)
      .populate([
        { path: 'patientId', select: 'firstName lastName patientNumber' },
        {
          path: 'invoiceId',
          select: 'invoiceNumber invoiceTitle totalAmount paidAmount paymentStatus',
        },
        {
          path: 'invoiceIds',
          select: 'invoiceNumber invoiceTitle totalAmount paidAmount paymentStatus',
        },
        { path: 'clinicId', select: 'name' },
        { path: 'addedBy', select: 'firstName lastName email' },
        { path: 'updatedBy', select: 'firstName lastName email' },
      ])
      .exec();

    if (!payment) {
      throw new NotFoundException(NOT_FOUND_ERRORS.PAYMENT);
    }

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
    const payment = await this.paymentModel.findById(id);

    if (!payment) {
      throw new NotFoundException(NOT_FOUND_ERRORS.PAYMENT);
    }

    if (userRole === 'staff' || userRole === 'doctor') {
      if (payment.addedBy.toString() !== userId) {
        throw new ForbiddenException(AUTH_ERRORS.INSUFFICIENT_PERMISSIONS);
      }
    }

    const invoice = await this.invoiceModel.findById(payment.invoiceId);
    if (!invoice || invoice.deletedAt) {
      throw new NotFoundException(NOT_FOUND_ERRORS.INVOICE);
    }

    if (updatePaymentDto.amount !== undefined) {
      if (updatePaymentDto.amount <= 0) {
        throw new BadRequestException(PAYMENT_ERRORS.AMOUNT_ZERO);
      }
      const currentOutstanding = Math.max(0, invoice.totalAmount - invoice.paidAmount);
      const maxAllowedAmount = currentOutstanding + payment.amount;
      if (updatePaymentDto.amount > maxAllowedAmount) {
        throw new BadRequestException(PAYMENT_ERRORS.AMOUNT_EXCEEDS_BALANCE);
      }
    }

    if (updatePaymentDto.paymentDate) {
      const newPaymentDate = new Date(updatePaymentDto.paymentDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (newPaymentDate > today) {
        throw new BadRequestException(PAYMENT_ERRORS.DATE_FUTURE);
      }
    }

    const oldAmount = payment.amount;
    const newAmount = updatePaymentDto.amount ?? oldAmount;
    const amountDifference = newAmount - oldAmount;

    if (updatePaymentDto.amount !== undefined) payment.amount = updatePaymentDto.amount;
    if (updatePaymentDto.paymentMethod) payment.paymentMethod = updatePaymentDto.paymentMethod;
    if (updatePaymentDto.paymentDate) payment.paymentDate = new Date(updatePaymentDto.paymentDate);
    if (updatePaymentDto.notes !== undefined) payment.notes = updatePaymentDto.notes;

    payment.updatedBy = new Types.ObjectId(userId);
    await payment.save();

    if (amountDifference !== 0) {
      const totalPaid = invoice.paidAmount + amountDifference;
      await this.paymentBalanceService.recalculateInvoiceBalances(
        payment.invoiceId.toString(),
        totalPaid,
      );
    }

    if (updatePaymentDto.paymentDate) {
      const latestPayment = await this.paymentModel
        .findOne({ invoiceId: payment.invoiceId })
        .sort({ paymentDate: -1 });
      if (latestPayment) {
        invoice.lastPaymentDate = latestPayment.paymentDate;
        await invoice.save();
      }
    }

    this.logger.log(
      `Payment updated: ${payment.paymentId} by user ${userId}, amount changed from ${oldAmount} to ${newAmount}`,
    );

    const populatedPayment = await this.paymentModel
      .findById(payment._id)
      .populate([
        { path: 'patientId', select: 'firstName lastName patientNumber' },
        {
          path: 'invoiceId',
          select: 'invoiceNumber invoiceTitle totalAmount paidAmount paymentStatus',
        },
        {
          path: 'invoiceIds',
          select: 'invoiceNumber invoiceTitle totalAmount paidAmount paymentStatus',
        },
        { path: 'clinicId', select: 'name' },
        { path: 'addedBy', select: 'firstName lastName email' },
        { path: 'updatedBy', select: 'firstName lastName email' },
      ]);

    return this.mapToResponseDto(populatedPayment);
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

    if (userRole === 'staff' || userRole === 'doctor') {
      throw new ForbiddenException(AUTH_ERRORS.INSUFFICIENT_PERMISSIONS);
    }

    await this.paymentModel.findByIdAndDelete(id);

    // Recalculate balances for each affected invoice.
    // Use stored invoiceAllocations for multi-invoice payments (precise per-invoice amounts).
    // Fall back to treating the whole amount against the primary invoice for legacy payments.
    const hasAllocations =
      payment.invoiceAllocations && payment.invoiceAllocations.length > 0;

    if (hasAllocations) {
      for (const alloc of payment.invoiceAllocations!) {
        const inv = await this.invoiceModel.findById(alloc.invoiceId);
        if (inv) {
          const newPaid = Math.max(0, inv.paidAmount - alloc.amount);
          await this.paymentBalanceService.recalculateInvoiceBalances(
            alloc.invoiceId.toString(),
            newPaid,
          );
        }
      }
    } else {
      // Legacy single-invoice path
      const invoice = await this.invoiceModel.findById(payment.invoiceId);
      if (invoice) {
        const newTotalPaid = Math.max(0, invoice.paidAmount - payment.amount);
        await this.paymentBalanceService.recalculateInvoiceBalances(
          payment.invoiceId.toString(),
          newTotalPaid,
        );
      }
    }

    this.logger.log(`Payment deleted: ${payment.paymentId} by user ${userId}`);
  }

  /**
   * Escape special regex characters to prevent ReDoS attacks (S-6).
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Generate unique payment ID using atomic counter (S-5: prevents race conditions).
   */
  private async generatePaymentId(organizationId?: string): Promise<string> {
    const key = `PAY:${organizationId || 'global'}`;
    const counter = await this.counterModel.findOneAndUpdate(
      { key },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    return `PAY-${String(counter.seq).padStart(4, '0')}`;
  }

  /**
   * Map payment document to response DTO
   */
  private mapToResponseDto(payment: any): PaymentResponseDto {
    const outstandingBalance = payment.invoiceId
      ? Math.max(0, payment.invoiceId.totalAmount - payment.invoiceId.paidAmount)
      : 0;

    const invoicesArray = (payment.invoiceIds || [])
      .map((inv: any) => {
        if (!inv || !inv._id) return null;
        return {
          _id: inv._id.toString(),
          invoiceNumber: inv.invoiceNumber,
          invoiceTitle: inv.invoiceTitle,
          totalAmount: inv.totalAmount,
          paidAmount: inv.paidAmount,
          outstandingBalance: Math.max(0, (inv.totalAmount || 0) - (inv.paidAmount || 0)),
          paymentStatus: inv.paymentStatus,
        };
      })
      .filter(Boolean);

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
      invoices: invoicesArray.length > 0 ? invoicesArray : undefined,
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
            _id: payment.addedBy._id?.toString() || payment.addedBy.toString(),
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
            _id: payment.updatedBy._id?.toString() || payment.updatedBy.toString(),
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
