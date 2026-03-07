import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Invoice } from '../database/schemas/invoice.schema';
import { Patient } from '../database/schemas/patient.schema';
import { Service } from '../database/schemas/service.schema';
import { InvoiceNumberService } from './invoice-number.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceQueryDto } from './dto/invoice-query.dto';
import { InvoiceResponseDto } from './dto/invoice-response.dto';
import {
  INVOICE_ERRORS,
  SUCCESS_MESSAGES,
  NOT_FOUND_ERRORS,
  AUTH_ERRORS,
} from './constants/invoice-messages';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<Invoice>,
    @InjectModel(Patient.name) private patientModel: Model<Patient>,
    @InjectModel(Service.name) private serviceModel: Model<Service>,
    private invoiceNumberService: InvoiceNumberService,
  ) {}

  /**
   * Create a new invoice
   * Requirements: 1.2, 1.3, 1.4, 1.5, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 1.13, 13.1, 13.2, 13.3, 13.6
   */
  async createInvoice(
    createInvoiceDto: CreateInvoiceDto,
    userId: string,
  ): Promise<InvoiceResponseDto> {
    // Validate patient exists
    const patient = await this.patientModel.findById(
      createInvoiceDto.patientId,
    );
    if (!patient || patient.deletedAt) {
      throw new NotFoundException(NOT_FOUND_ERRORS.PATIENT);
    }

    // Validate service exists and isActive=true
    const service = await this.serviceModel.findById(
      createInvoiceDto.serviceId,
    );
    if (!service || service.deletedAt) {
      throw new NotFoundException(NOT_FOUND_ERRORS.SERVICE);
    }
    if (!service.isActive) {
      throw new BadRequestException(INVOICE_ERRORS.SERVICE_NOT_ACTIVE);
    }

    // Validate issue date is not in future
    const issueDate = new Date(createInvoiceDto.issueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (issueDate > today) {
      throw new BadRequestException(INVOICE_ERRORS.ISSUE_DATE_FUTURE);
    }

    // Generate DFT-xxxx invoice number
    const invoiceNumber =
      await this.invoiceNumberService.generateDraftNumber();

    // Calculate subtotal (service price × sessions)
    const sessions = createInvoiceDto.sessions || 1;
    const servicePrice = service.price || 0;
    const subtotal = servicePrice * sessions;

    // Calculate totalAmount (subtotal - discount + tax)
    const discountAmount = createInvoiceDto.discountAmount || 0;
    const taxAmount = createInvoiceDto.taxAmount || 0;
    const totalAmount = subtotal - discountAmount + taxAmount;

    // Create invoice
    const invoice = new this.invoiceModel({
      invoiceNumber,
      invoiceTitle: createInvoiceDto.invoiceTitle,
      patientId: createInvoiceDto.patientId,
      clinicId: createInvoiceDto.clinicId,
      serviceId: createInvoiceDto.serviceId,
      appointmentId: createInvoiceDto.appointmentId,
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
      paidAmount: 0,
      invoiceStatus: 'draft',
      paymentStatus: 'not_due',
      issueDate,
      sessions,
      notes: createInvoiceDto.notes,
      createdBy: new Types.ObjectId(userId),
    });

    await invoice.save();

    // Log audit event
    this.logger.log(
      `Invoice created: ${invoiceNumber} by user ${userId} for patient ${patient.patientNumber}`,
    );

    // Return invoice with populated references
    return this.mapToResponseDto(
      await invoice.populate([
        { path: 'patientId', select: 'firstName lastName patientNumber' },
        { path: 'serviceId', select: 'name price' },
        { path: 'clinicId', select: 'name' },
        { path: 'createdBy', select: 'firstName lastName email' },
      ]),
    );
  }

  /**
   * Get invoices with filtering, sorting, and pagination
   * Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 11.1, 11.3
   */
  async getInvoices(
    queryDto: InvoiceQueryDto,
    userId: string,
    userRole: string,
    userClinicIds: string[],
  ): Promise<{ data: InvoiceResponseDto[]; meta: any }> {
    // Build query filter
    const filter: any = { deletedAt: { $exists: false } };

    // Apply role-based clinic filtering
    if (userRole === 'staff' || userRole === 'doctor') {
      // Staff sees only their clinic
      filter.clinicId = { $in: userClinicIds.map((id) => new Types.ObjectId(id)) };
    } else if (userRole === 'admin' || userRole === 'manager') {
      // Admin sees clinics they have access to
      if (userClinicIds.length > 0) {
        filter.clinicId = { $in: userClinicIds.map((id) => new Types.ObjectId(id)) };
      }
    }
    // Super admin and owner see all

    // Support filtering by invoiceStatus
    if (queryDto.invoiceStatus) {
      filter.invoiceStatus = queryDto.invoiceStatus;
    }

    // Support filtering by paymentStatus
    if (queryDto.paymentStatus) {
      filter.paymentStatus = queryDto.paymentStatus;
    }

    // Support filtering by date range
    if (queryDto.dateFrom || queryDto.dateTo) {
      filter.issueDate = {};
      if (queryDto.dateFrom) {
        filter.issueDate.$gte = new Date(queryDto.dateFrom);
      }
      if (queryDto.dateTo) {
        filter.issueDate.$lte = new Date(queryDto.dateTo);
      }
    }

    // Support filtering by patientId
    if (queryDto.patientId) {
      filter.patientId = new Types.ObjectId(queryDto.patientId);
    }

    // Support filtering by clinicId (additional filter)
    if (queryDto.clinicId) {
      filter.clinicId = new Types.ObjectId(queryDto.clinicId);
    }

    // Support search by invoiceNumber, patientName, invoiceTitle
    if (queryDto.search) {
      const searchRegex = new RegExp(queryDto.search, 'i');
      filter.$or = [
        { invoiceNumber: searchRegex },
        { invoiceTitle: searchRegex },
      ];
      // Note: Patient name search requires aggregation pipeline
    }

    // Pagination
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 10;
    const skip = (page - 1) * limit;

    // Sorting
    const sortBy = queryDto.sortBy || 'createdAt';
    const sortOrder = queryDto.sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortBy]: sortOrder };

    // Execute query
    const [invoices, total] = await Promise.all([
      this.invoiceModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate([
          { path: 'patientId', select: 'firstName lastName patientNumber' },
          { path: 'serviceId', select: 'name price' },
          { path: 'clinicId', select: 'name' },
        ])
        .exec(),
      this.invoiceModel.countDocuments(filter),
    ]);

    return {
      data: invoices.map((invoice) => this.mapToResponseDto(invoice)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get invoice by ID
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 11.5
   */
  async getInvoiceById(
    id: string,
    userId: string,
    userRole: string,
    userClinicIds: string[],
  ): Promise<InvoiceResponseDto> {
    // Find invoice by ID
    const invoice = await this.invoiceModel
      .findById(id)
      .populate([
        { path: 'patientId', select: 'firstName lastName patientNumber' },
        { path: 'serviceId', select: 'name price' },
        { path: 'clinicId', select: 'name' },
        { path: 'createdBy', select: 'firstName lastName email' },
        { path: 'updatedBy', select: 'firstName lastName email' },
      ])
      .exec();

    // Return 404 if not found
    if (!invoice || invoice.deletedAt) {
      throw new NotFoundException(NOT_FOUND_ERRORS.INVOICE);
    }

    // Check role-based access permissions
    if (userRole === 'staff' || userRole === 'doctor') {
      const hasAccess = userClinicIds.some(
        (clinicId) => clinicId === invoice.clinicId.toString(),
      );
      if (!hasAccess) {
        throw new ForbiddenException(AUTH_ERRORS.INSUFFICIENT_PERMISSIONS);
      }
    }

    return this.mapToResponseDto(invoice);
  }

  /**
   * Update invoice (Draft only)
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 11.7, 11.9
   */
  async updateInvoice(
    id: string,
    updateInvoiceDto: UpdateInvoiceDto,
    userId: string,
    userRole: string,
  ): Promise<InvoiceResponseDto> {
    // Find invoice by ID
    const invoice = await this.invoiceModel.findById(id);

    if (!invoice || invoice.deletedAt) {
      throw new NotFoundException(NOT_FOUND_ERRORS.INVOICE);
    }

    // Check if invoiceStatus is 'draft' (reject if not)
    if (invoice.invoiceStatus !== 'draft') {
      throw new BadRequestException(INVOICE_ERRORS.CANNOT_EDIT_NON_DRAFT);
    }

    // Check edit permissions
    if (userRole === 'staff' || userRole === 'doctor') {
      // Staff can only edit own invoices
      if (invoice.createdBy.toString() !== userId) {
        throw new ForbiddenException(AUTH_ERRORS.INSUFFICIENT_PERMISSIONS);
      }
    }
    // Admin can edit any Draft invoice

    // Patient field cannot be modified (already omitted from UpdateInvoiceDto)

    // Update fields
    if (updateInvoiceDto.invoiceTitle) {
      invoice.invoiceTitle = updateInvoiceDto.invoiceTitle;
    }
    if (updateInvoiceDto.issueDate) {
      const issueDate = new Date(updateInvoiceDto.issueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (issueDate > today) {
        throw new BadRequestException(INVOICE_ERRORS.ISSUE_DATE_FUTURE);
      }
      invoice.issueDate = issueDate;
    }
    if (updateInvoiceDto.notes !== undefined) {
      invoice.notes = updateInvoiceDto.notes;
    }

    // Recalculate if service, sessions, discount, or tax changed
    let needsRecalculation = false;
    if (updateInvoiceDto.serviceId) {
      const service = await this.serviceModel.findById(
        updateInvoiceDto.serviceId,
      );
      if (!service || service.deletedAt) {
        throw new NotFoundException(NOT_FOUND_ERRORS.SERVICE);
      }
      if (!service.isActive) {
        throw new BadRequestException(INVOICE_ERRORS.SERVICE_NOT_ACTIVE);
      }
      invoice.serviceId = new Types.ObjectId(updateInvoiceDto.serviceId);
      needsRecalculation = true;
    }
    if (updateInvoiceDto.sessions !== undefined) {
      invoice.sessions = updateInvoiceDto.sessions;
      needsRecalculation = true;
    }
    if (updateInvoiceDto.discountAmount !== undefined) {
      invoice.discountAmount = updateInvoiceDto.discountAmount;
      needsRecalculation = true;
    }
    if (updateInvoiceDto.taxAmount !== undefined) {
      invoice.taxAmount = updateInvoiceDto.taxAmount;
      needsRecalculation = true;
    }

    // Recalculate subtotal, totalAmount, outstandingBalance
    if (needsRecalculation) {
      const service = await this.serviceModel.findById(invoice.serviceId);
      const servicePrice = service?.price || 0;
      invoice.subtotal = servicePrice * invoice.sessions;
      invoice.totalAmount =
        invoice.subtotal - invoice.discountAmount + invoice.taxAmount;
      // Outstanding balance = totalAmount - paidAmount (should be totalAmount for draft)
    }

    // Update updatedBy and updatedAt timestamps
    invoice.updatedBy = new Types.ObjectId(userId);

    await invoice.save();

    // Log audit event
    this.logger.log(
      `Invoice updated: ${invoice.invoiceNumber} by user ${userId}`,
    );

    // Return updated invoice
    return this.mapToResponseDto(
      await invoice.populate([
        { path: 'patientId', select: 'firstName lastName patientNumber' },
        { path: 'serviceId', select: 'name price' },
        { path: 'clinicId', select: 'name' },
        { path: 'createdBy', select: 'firstName lastName email' },
        { path: 'updatedBy', select: 'firstName lastName email' },
      ]),
    );
  }

  /**
   * Transition invoice from Draft to Posted
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 13.14, 15.1, 15.2, 15.3, 15.4
   */
  async transitionToPosted(invoiceId: string): Promise<InvoiceResponseDto> {
    // Find invoice by ID
    const invoice = await this.invoiceModel.findById(invoiceId);

    if (!invoice || invoice.deletedAt) {
      throw new NotFoundException(NOT_FOUND_ERRORS.INVOICE);
    }

    // Check if invoiceStatus is 'draft'
    if (invoice.invoiceStatus !== 'draft') {
      throw new BadRequestException(INVOICE_ERRORS.ALREADY_POSTED);
    }

    // Preserve original DFT-xxxx as draftNumber
    invoice.draftNumber = invoice.invoiceNumber;

    // Generate official INV-xxxx number
    invoice.invoiceNumber =
      await this.invoiceNumberService.generatePostedNumber();

    // Update invoiceStatus to 'posted'
    invoice.invoiceStatus = 'posted';

    // Update paymentStatus from 'not_due' to 'unpaid'
    invoice.paymentStatus = 'unpaid';

    // Set postedAt timestamp
    invoice.postedAt = new Date();

    await invoice.save();

    // Log status transition
    this.logger.log(
      `Invoice transitioned to Posted: ${invoice.invoiceNumber} (was ${invoice.draftNumber})`,
    );

    return this.mapToResponseDto(
      await invoice.populate([
        { path: 'patientId', select: 'firstName lastName patientNumber' },
        { path: 'serviceId', select: 'name price' },
        { path: 'clinicId', select: 'name' },
        { path: 'createdBy', select: 'firstName lastName email' },
      ]),
    );
  }

  /**
   * Soft delete invoice
   */
  async deleteInvoice(
    id: string,
    userId: string,
    userRole: string,
  ): Promise<void> {
    const invoice = await this.invoiceModel.findById(id);

    if (!invoice || invoice.deletedAt) {
      throw new NotFoundException(NOT_FOUND_ERRORS.INVOICE);
    }

    // Check if invoice has payments (prevent deletion)
    if (invoice.paidAmount > 0) {
      throw new BadRequestException(INVOICE_ERRORS.HAS_PAYMENTS);
    }

    // Only admin and above can delete
    if (userRole === 'staff' || userRole === 'doctor') {
      throw new ForbiddenException(AUTH_ERRORS.INSUFFICIENT_PERMISSIONS);
    }

    invoice.deletedAt = new Date();
    await invoice.save();

    this.logger.log(
      `Invoice soft deleted: ${invoice.invoiceNumber} by user ${userId}`,
    );
  }

  /**
   * Map invoice document to response DTO
   */
  private mapToResponseDto(invoice: any): InvoiceResponseDto {
    const outstandingBalance = Math.max(
      0,
      invoice.totalAmount - invoice.paidAmount,
    );

    return {
      _id: invoice._id.toString(),
      invoiceNumber: invoice.invoiceNumber,
      draftNumber: invoice.draftNumber,
      invoiceTitle: invoice.invoiceTitle,
      patient: invoice.patientId
        ? {
            _id: invoice.patientId._id.toString(),
            firstName: invoice.patientId.firstName,
            lastName: invoice.patientId.lastName,
            patientNumber: invoice.patientId.patientNumber,
          }
        : undefined,
      service: invoice.serviceId
        ? {
            _id: invoice.serviceId._id.toString(),
            name: invoice.serviceId.name,
            price: invoice.serviceId.price,
          }
        : undefined,
      clinic: invoice.clinicId
        ? {
            _id: invoice.clinicId._id.toString(),
            name: invoice.clinicId.name,
          }
        : undefined,
      subtotal: invoice.subtotal,
      discountAmount: invoice.discountAmount,
      taxAmount: invoice.taxAmount,
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      outstandingBalance,
      invoiceStatus: invoice.invoiceStatus,
      paymentStatus: invoice.paymentStatus,
      issueDate: invoice.issueDate,
      lastPaymentDate: invoice.lastPaymentDate,
      postedAt: invoice.postedAt,
      sessions: invoice.sessions,
      notes: invoice.notes,
      createdBy: invoice.createdBy && invoice.createdBy._id
        ? {
            _id: invoice.createdBy._id?.toString() || invoice.createdBy.toString(),
            firstName: invoice.createdBy.firstName,
            lastName: invoice.createdBy.lastName,
            email: invoice.createdBy.email,
          }
        : {
            _id: invoice.createdBy?.toString() || '',
            firstName: '',
            lastName: '',
            email: '',
          },
      updatedBy: invoice.updatedBy
        ? {
            _id: invoice.updatedBy._id?.toString() || invoice.updatedBy.toString(),
            firstName: invoice.updatedBy.firstName,
            lastName: invoice.updatedBy.lastName,
            email: invoice.updatedBy.email,
          }
        : undefined,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    };
  }
}
