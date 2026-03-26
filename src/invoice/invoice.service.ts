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
import { Clinic } from '../database/schemas/clinic.schema';
import { Counter } from '../database/schemas/counter.schema';
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
    @InjectModel(Clinic.name) private clinicModel: Model<Clinic>,
    @InjectModel(Counter.name) private counterModel: Model<Counter>,
    private invoiceNumberService: InvoiceNumberService,
  ) {}

  /**
   * Create a new invoice
   * M7 redesign: supports multiple services, each with multiple sessions.
   * Requirements: 1.2, 1.3, 1.4, 1.5, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 1.13, 13.1, 13.2, 13.3, 13.6
   */
  async createInvoice(
    createInvoiceDto: CreateInvoiceDto,
    userId: string,
    userRole: string,
    userClinicId?: string,
  ): Promise<InvoiceResponseDto> {
    // Validate clinic access for Staff/Doctor roles
    if (userRole === 'staff' || userRole === 'doctor') {
      if (!userClinicId || (createInvoiceDto.clinicId && userClinicId !== createInvoiceDto.clinicId)) {
        throw new ForbiddenException({
          message: {
            ar: 'لا يمكنك إنشاء فاتورة لعيادة غير مخصصة لك',
            en: 'You cannot create an invoice for a clinic not assigned to you',
          },
          code: 'CLINIC_ACCESS_DENIED',
        });
      }
    }

    // 1. Resolve clinicId: prefer DTO, fall back to caller's assigned clinic
    const resolvedClinicId = createInvoiceDto.clinicId || userClinicId;

    if (!resolvedClinicId) {
      throw new BadRequestException({
        message: {
          ar: 'معرف العيادة مطلوب',
          en: 'clinicId is required',
        },
        code: 'CLINIC_ID_REQUIRED',
      });
    }

    // Find clinic (validate exists, not deleted)
    const clinic = await this.clinicModel.findOne({
      _id: new Types.ObjectId(resolvedClinicId),
      deletedAt: { $exists: false },
    });
    if (!clinic) {
      throw new NotFoundException(NOT_FOUND_ERRORS.CLINIC);
    }
    // 2. Derive organizationId from clinic
    const organizationId = clinic.organizationId;

    // 3. Find patient by dto.patientId (validate exists, not deleted)
    const patient = await this.patientModel.findOne({
      _id: new Types.ObjectId(createInvoiceDto.patientId),
      deletedAt: { $exists: false },
    });
    if (!patient) {
      throw new NotFoundException(NOT_FOUND_ERRORS.PATIENT);
    }

    // 4. Validate issue date is not in the future (compare date-only, not datetime)
    const issueDate = new Date(createInvoiceDto.issueDate);
    issueDate.setHours(0, 0, 0, 0); // Normalize to midnight local time
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (issueDate > today) {
      throw new BadRequestException(INVOICE_ERRORS.ISSUE_DATE_FUTURE);
    }

    // 5. For each serviceDto: validate service, compute per-session pricing.
    //    Sessions start EMPTY — they are auto-created when appointments are booked.
    const builtServices: Invoice['services'] = [];
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    for (const serviceDto of createInvoiceDto.services) {
      // Find service (validate isActive === true, not deleted)
      const service = await this.serviceModel.findOne({
        _id: new Types.ObjectId(serviceDto.serviceId),
        deletedAt: { $exists: false },
      });
      if (!service) {
        throw new NotFoundException(NOT_FOUND_ERRORS.SERVICE);
      }
      if (!service.isActive) {
        throw new BadRequestException(INVOICE_ERRORS.SERVICE_NOT_ACTIVE);
      }

      // Price comes directly from the service definition — no manual entry required
      const totalSessions = (service as any).sessions?.length || 1;
      const totalPrice = service.price ?? 0;
      if (totalPrice <= 0) {
        throw new BadRequestException({
          message: {
            ar: `الخدمة "${service.name}" لا تحتوي على سعر محدد. يرجى تحديث سعر الخدمة أولاً.`,
            en: `Service "${service.name}" has no price defined. Please update the service price first.`,
          },
          code: 'SERVICE_PRICE_NOT_DEFINED',
        });
      }

      const discountPercent = serviceDto.discountPercent ?? 0;
      const taxRate = serviceDto.taxRate ?? 0;

      // Price per session (before discount/tax) = service.price / totalSessions
      const pricePerSession = +(totalPrice / totalSessions).toFixed(2);

      // Per-session financials (for totals calculation)
      const discountAmountPerSession = +(pricePerSession * discountPercent / 100).toFixed(2);
      const priceAfterDiscount = pricePerSession - discountAmountPerSession;
      const taxAmountPerSession = +(priceAfterDiscount * taxRate / 100).toFixed(2);
      const lineTotalPerSession = +(priceAfterDiscount + taxAmountPerSession).toFixed(2);

      // Accumulate invoice-level totals
      subtotal += totalPrice;
      totalDiscount += +(discountAmountPerSession * totalSessions).toFixed(2);
      totalTax += +(taxAmountPerSession * totalSessions).toFixed(2);

      builtServices.push({
        serviceId: new Types.ObjectId(serviceDto.serviceId),
        serviceName: service.name,
        serviceCategory: service.description,
        paymentPlan: 'allocate_by_session',
        totalSessions,
        pricePerSession,
        discountPercent,
        taxRate,
        totalServicePrice: +(lineTotalPerSession * totalSessions).toFixed(2),
        sessions: [], // Auto-populated when appointments are booked
      } as any);
    }

    subtotal = +subtotal.toFixed(2);
    totalDiscount = +Math.min(totalDiscount, subtotal).toFixed(2); // Cap to prevent negative totalAmount from rounding
    totalTax = +totalTax.toFixed(2);
    const totalAmount = Math.max(0, +(subtotal - totalDiscount + totalTax).toFixed(2));

    // 6. Generate draft number via counterModel (atomic)
    const invoiceNumber = await this.invoiceNumberService.generateDraftNumber(
      organizationId ? organizationId.toString() : 'global',
    );

    // 7. Create invoice
    const invoice = new this.invoiceModel({
      invoiceNumber,
      invoiceTitle: createInvoiceDto.invoiceTitle,
      patientId: new Types.ObjectId(createInvoiceDto.patientId),
      clinicId: new Types.ObjectId(resolvedClinicId),
      organizationId: organizationId ?? undefined,
      services: builtServices,
      subtotal,
      discountAmount: totalDiscount,
      taxAmount: totalTax,
      totalAmount,
      paidAmount: 0,
      invoiceStatus: 'draft',
      paymentStatus: 'not_due',
      issueDate,
      notes: createInvoiceDto.notes,
      createdBy: new Types.ObjectId(userId),
    });

    await invoice.save();

    this.logger.log(
      `Invoice created: ${invoiceNumber} by user ${userId} for patient ${patient._id}`,
    );

    // 8. Return via ResponseBuilder.success shape
    return this.mapToResponseDto(
      await invoice.populate([
        { path: 'patientId', select: 'firstName lastName patientNumber' },
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
    userRole?: string,
    subscriptionId?: string,
    userClinicId?: string,
  ): Promise<{ data: InvoiceResponseDto[]; meta: any }> {
    // Build query filter
    const filter: any = { deletedAt: { $exists: false } };

    // Service-level scoping for clinic-bound roles (admin, manager, staff, doctor)
    // Applied directly from req.user to bypass guard→DTO validation chain issues
    if (
      (userRole === 'admin' || userRole === 'manager' || userRole === 'staff' || userRole === 'doctor') &&
      userClinicId && Types.ObjectId.isValid(userClinicId)
    ) {
      filter.clinicId = new Types.ObjectId(userClinicId);
    } else if (queryDto.clinicId) {
      // Fall back to query param (for owner/super_admin with explicit filter)
      filter.clinicId = new Types.ObjectId(queryDto.clinicId);
    }

    // Owner role scoping: owners see invoices for all their subscription's clinics
    if (userRole === 'owner' && subscriptionId && !filter.clinicId) {
      const ownerClinics = await this.clinicModel
        .find({ subscriptionId: new Types.ObjectId(subscriptionId), deletedAt: { $exists: false } })
        .select('_id')
        .lean();
      const ownerClinicIds = ownerClinics.map((c: any) => c._id);
      if (ownerClinicIds.length > 0) {
        filter.clinicId = { $in: ownerClinicIds };
      }
    }

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

    // Patient name search requires aggregation pipeline
    if (queryDto.search) {
      return this.getInvoicesWithSearch(queryDto, filter);
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
   * Escape special regex characters to prevent ReDoS attacks.
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Get invoices with patient name search using aggregation pipeline
   */
  private async getInvoicesWithSearch(
    queryDto: InvoiceQueryDto,
    baseFilter: any,
  ): Promise<{ data: InvoiceResponseDto[]; meta: any }> {
    if (!queryDto.search) {
      throw new BadRequestException({
        message: {
          ar: 'مصطلح البحث مطلوب',
          en: 'Search term is required',
        },
        code: 'SEARCH_TERM_REQUIRED',
      });
    }

    if (queryDto.search && queryDto.search.length > 100) {
      throw new BadRequestException({ message: { ar: 'النص المدخل طويل جداً', en: 'Search term too long' } });
    }

    const searchRegex = new RegExp(this.escapeRegex(queryDto.search), 'i');

    // Pagination
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 10;
    const skip = (page - 1) * limit;

    // Sorting
    const sortBy = queryDto.sortBy || 'createdAt';
    const sortOrder = queryDto.sortOrder === 'asc' ? 1 : -1;
    const sortStage: any = {};
    sortStage[sortBy] = sortOrder;

    const pipeline: any[] = [
      { $match: baseFilter },
      {
        $lookup: {
          from: 'patients',
          localField: 'patientId',
          foreignField: '_id',
          as: 'patient',
        },
      },
      { $unwind: { path: '$patient', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          $or: [
            { invoiceNumber: searchRegex },
            { invoiceTitle: searchRegex },
            { 'patient.firstName': searchRegex },
            { 'patient.lastName': searchRegex },
          ],
        },
      },
      {
        $lookup: {
          from: 'clinics',
          localField: 'clinicId',
          foreignField: '_id',
          as: 'clinic',
        },
      },
      { $unwind: { path: '$clinic', preserveNullAndEmptyArrays: true } },
      { $sort: sortStage },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          metadata: [{ $count: 'total' }],
        },
      },
    ];

    const result = await this.invoiceModel.aggregate(pipeline);

    const invoices = result[0]?.data || [];
    const total = result[0]?.metadata[0]?.total || 0;

    const transformedInvoices = invoices.map((invoice: any) => ({
      ...invoice,
      patientId: invoice.patient,
      clinicId: invoice.clinic,
    }));

    return {
      data: transformedInvoices.map((invoice: any) =>
        this.mapToResponseDto(invoice),
      ),
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
    const invoice = await this.invoiceModel
      .findById(id)
      .populate([
        { path: 'patientId', select: 'firstName lastName patientNumber' },
        { path: 'clinicId', select: 'name' },
        { path: 'createdBy', select: 'firstName lastName email' },
        { path: 'updatedBy', select: 'firstName lastName email' },
      ])
      .exec();

    if (!invoice || invoice.deletedAt) {
      throw new NotFoundException(NOT_FOUND_ERRORS.INVOICE);
    }

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
    userOrganizationId?: string,
  ): Promise<InvoiceResponseDto> {
    const query: any = {
      _id: new Types.ObjectId(id),
      deletedAt: { $exists: false },
    };
    if (userOrganizationId) {
      query.organizationId = new Types.ObjectId(userOrganizationId);
    }
    const invoice = await this.invoiceModel.findOne(query);

    if (!invoice || invoice.deletedAt) {
      throw new NotFoundException(NOT_FOUND_ERRORS.INVOICE);
    }

    if (invoice.invoiceStatus !== 'draft') {
      throw new BadRequestException(INVOICE_ERRORS.CANNOT_EDIT_NON_DRAFT);
    }

    if (userRole === 'staff' || userRole === 'doctor') {
      if (invoice.createdBy.toString() !== userId) {
        throw new ForbiddenException(AUTH_ERRORS.INSUFFICIENT_PERMISSIONS);
      }
    }

    if (updateInvoiceDto.invoiceTitle) {
      invoice.invoiceTitle = updateInvoiceDto.invoiceTitle;
    }
    if (updateInvoiceDto.issueDate) {
      const issueDate = new Date(updateInvoiceDto.issueDate);
      issueDate.setHours(0, 0, 0, 0); // Normalize to midnight local time
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

    // If new services array provided, rebuild and recalculate totals
    if (updateInvoiceDto.services && updateInvoiceDto.services.length > 0) {
      const builtServices: Invoice['services'] = [];
      let subtotal = 0;
      let totalDiscount = 0;
      let totalTax = 0;

      for (const serviceDto of updateInvoiceDto.services) {
        const service = await this.serviceModel.findOne({
          _id: new Types.ObjectId(serviceDto.serviceId),
          deletedAt: { $exists: false },
        });
        if (!service) {
          throw new NotFoundException(NOT_FOUND_ERRORS.SERVICE);
        }
        if (!service.isActive) {
          throw new BadRequestException(INVOICE_ERRORS.SERVICE_NOT_ACTIVE);
        }

        // Price comes from the service definition — no manual entry required
        const totalSessions = (service as any).sessions?.length || 1;
        const totalPrice = service.price ?? 0;
        const discountPercent = serviceDto.discountPercent ?? 0;
        const taxRate = serviceDto.taxRate ?? 0;

        const pricePerSession = +(totalPrice / totalSessions).toFixed(2);
        const discountAmountPerSession = +(pricePerSession * discountPercent / 100).toFixed(2);
        const priceAfterDiscount = pricePerSession - discountAmountPerSession;
        const taxAmountPerSession = +(priceAfterDiscount * taxRate / 100).toFixed(2);
        const lineTotalPerSession = +(priceAfterDiscount + taxAmountPerSession).toFixed(2);

        subtotal += totalPrice;
        totalDiscount += +(discountAmountPerSession * totalSessions).toFixed(2);
        totalTax += +(taxAmountPerSession * totalSessions).toFixed(2);

        builtServices.push({
          serviceId: new Types.ObjectId(serviceDto.serviceId),
          serviceName: service.name,
          serviceCategory: service.description,
          paymentPlan: 'allocate_by_session',
          totalSessions,
          pricePerSession,
          discountPercent,
          taxRate,
          totalServicePrice: +(lineTotalPerSession * totalSessions).toFixed(2),
          sessions: [], // Auto-populated when appointments are booked
        } as any);
      }

      invoice.services = builtServices;
      invoice.subtotal = +subtotal.toFixed(2);
      invoice.discountAmount = +Math.min(totalDiscount, subtotal).toFixed(2);
      invoice.taxAmount = +totalTax.toFixed(2);
      invoice.totalAmount = Math.max(0, +(subtotal - totalDiscount + totalTax).toFixed(2));
    }

    invoice.updatedBy = new Types.ObjectId(userId);
    await invoice.save();

    this.logger.log(
      `Invoice updated: ${invoice.invoiceNumber} by user ${userId}`,
    );

    return this.mapToResponseDto(
      await invoice.populate([
        { path: 'patientId', select: 'firstName lastName patientNumber' },
        { path: 'clinicId', select: 'name' },
        { path: 'createdBy', select: 'firstName lastName email' },
        { path: 'updatedBy', select: 'firstName lastName email' },
      ]),
    );
  }

  /**
   * Transition invoice from Draft to Posted (idempotent).
   * If already posted, returns the invoice as-is instead of throwing.
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 13.14, 15.1, 15.2, 15.3, 15.4
   */
  async transitionToPosted(invoiceId: string): Promise<InvoiceResponseDto> {
    const invoice = await this.invoiceModel.findById(invoiceId);

    if (!invoice || invoice.deletedAt) {
      throw new NotFoundException(NOT_FOUND_ERRORS.INVOICE);
    }

    // Idempotent: if already posted, return as-is
    if (invoice.invoiceStatus === 'posted') {
      return this.mapToResponseDto(
        await invoice.populate([
          { path: 'patientId', select: 'firstName lastName patientNumber' },
          { path: 'clinicId', select: 'name' },
          { path: 'createdBy', select: 'firstName lastName email' },
        ]),
      );
    }

    if (invoice.invoiceStatus !== 'draft') {
      throw new BadRequestException(INVOICE_ERRORS.ALREADY_POSTED);
    }

    // Preserve original DFT-xxxx as draftNumber
    invoice.draftNumber = invoice.invoiceNumber;

    // Generate official INV-xxxx number (atomic via Counter)
    const organizationId = invoice.organizationId
      ? invoice.organizationId.toString()
      : 'global';
    invoice.invoiceNumber =
      await this.invoiceNumberService.generatePostedNumber(organizationId);

    invoice.invoiceStatus = 'posted';
    // BZR-b3c4d5e6: Payment is "not_due" at booking time; transitions to "unpaid"
    // only after the first appointment is concluded (see concludeAppointment hook).
    invoice.paymentStatus = 'not_due';
    invoice.postedAt = new Date();

    await invoice.save();

    this.logger.log(
      `Invoice transitioned to Posted: ${invoice.invoiceNumber} (was ${invoice.draftNumber})`,
    );

    return this.mapToResponseDto(
      await invoice.populate([
        { path: 'patientId', select: 'firstName lastName patientNumber' },
        { path: 'clinicId', select: 'name' },
        { path: 'createdBy', select: 'firstName lastName email' },
      ]),
    );
  }

  /**
   * Transition invoice paymentStatus back to 'unpaid' from 'partially_paid'.
   * Used when a payment is refunded or removed.
   */
  async transitionPaymentToUnpaid(invoiceId: string): Promise<void> {
    const invoice = await this.invoiceModel.findById(invoiceId);

    if (!invoice || invoice.deletedAt) {
      throw new NotFoundException(NOT_FOUND_ERRORS.INVOICE);
    }

    if (invoice.invoiceStatus !== 'posted') {
      throw new BadRequestException({
        message: {
          ar: 'يجب أن تكون الفاتورة في حالة منشورة',
          en: 'Invoice must be in posted status',
        },
        code: 'INVOICE_NOT_POSTED',
      });
    }

    // Only transition if currently partially_paid
    if (invoice.paymentStatus === 'partially_paid') {
      invoice.paymentStatus = 'unpaid';
      await invoice.save();
      this.logger.log(
        `Invoice paymentStatus set to unpaid: ${invoice.invoiceNumber}`,
      );
    }
  }

  /**
   * Update the sessionStatus of a specific session within the invoice.
   * Used by appointment hooks (PART B) to keep invoice sessions in sync.
   * @param invoiceId - The invoice _id
   * @param invoiceItemId - The session's invoiceItemId (ObjectId string)
   * @param sessionStatus - New session status
   */
  async updateSessionStatus(
    invoiceId: string,
    invoiceItemId: string,
    sessionStatus: 'pending' | 'booked' | 'in_progress' | 'completed' | 'cancelled',
  ): Promise<void> {
    const result = await this.invoiceModel.updateOne(
      {
        _id: new Types.ObjectId(invoiceId),
        deletedAt: { $exists: false },
      },
      {
        $set: {
          'services.$[].sessions.$[item].sessionStatus': sessionStatus,
        },
      },
      {
        arrayFilters: [
          { 'item.invoiceItemId': new Types.ObjectId(invoiceItemId) },
        ],
      },
    );

    if (result.matchedCount === 0) {
      throw new NotFoundException(NOT_FOUND_ERRORS.INVOICE);
    }

    this.logger.log(
      `Invoice session status updated: invoiceId=${invoiceId}, invoiceItemId=${invoiceItemId}, status=${sessionStatus}`,
    );
  }

  /**
   * Get invoice for booking — returns a posted invoice for a patient with pending sessions.
   * Used by the appointment booking flow (PART I).
   * Returns the first posted invoice matching patientId + clinicId + invoiceId (if given).
   */
  async getInvoiceForBooking(
    patientId: string,
    clinicId: string,
    invoiceId?: string,
    userId?: string,
    userRole?: string,
    userClinicId?: string,
  ): Promise<any> {
    const filter: any = {
      patientId: new Types.ObjectId(patientId),
      clinicId: new Types.ObjectId(clinicId),
      invoiceStatus: 'posted',
      paymentStatus: { $ne: 'paid' },
      deletedAt: { $exists: false },
    };

    // For staff role: enforce clinic scope
    if (userRole && ['staff'].includes(userRole) && userClinicId) {
      if (clinicId && clinicId !== userClinicId) {
        throw new ForbiddenException({
          message: { ar: 'ليس لديك صلاحية الوصول إلى فواتير هذه العيادة', en: 'You do not have access to invoices for this clinic' },
          code: 'INVOICE_CLINIC_ACCESS_DENIED',
        });
      }
      // Force clinicId to staff's clinic
      filter.clinicId = new Types.ObjectId(userClinicId);
    }

    if (invoiceId) {
      filter._id = new Types.ObjectId(invoiceId);
    }

    const invoice = await this.invoiceModel
      .findOne(filter)
      .populate([
        { path: 'patientId', select: 'firstName lastName patientNumber' },
        { path: 'clinicId', select: 'name' },
      ])
      .exec();

    if (!invoice) {
      throw new NotFoundException({
        message: {
          ar: 'لا توجد فاتورة منشورة لهذا المريض',
          en: 'No posted invoice found for this patient',
        },
        code: 'INVOICE_NOT_FOUND_FOR_BOOKING',
      });
    }

    // Return full invoice with sessions flattened for the booking UI
    return this.mapToResponseDto(invoice);
  }

  /**
   * Get active patients who have at least one bookable invoice session for a clinic.
   * Used by the appointment booking form to populate the patient dropdown.
   * A session is "bookable" when activeSessionCount (booked/in_progress/completed) < totalSessions.
   */
  async getPatientsWithBookableInvoices(
    clinicId: string,
    search?: string,
  ): Promise<{ _id: string; patientNumber: string; firstName: string; lastName: string; phone?: string; profilePicture?: string }[]> {
    const invoices = await this.invoiceModel
      .find({
        clinicId: new Types.ObjectId(clinicId),
        invoiceStatus: { $in: ['draft', 'posted'] },
        paymentStatus: { $ne: 'paid' },
        deletedAt: { $exists: false },
      })
      .populate('patientId', 'firstName lastName patientNumber phone profilePicture status')
      .lean()
      .exec();

    // Keep only invoices that have at least one service with remaining capacity
    const bookable = invoices.filter((inv: any) =>
      (inv.services ?? []).some((svc: any) => {
        const active = (svc.sessions ?? []).filter((s: any) =>
          ['booked', 'in_progress', 'completed'].includes(s.sessionStatus),
        ).length;
        return active < (svc.totalSessions ?? 0);
      }),
    );

    // Deduplicate patients; skip inactive or unpopulated patients
    const patientMap = new Map<string, any>();
    for (const inv of bookable) {
      const p = inv.patientId as any;
      if (!p?._id) continue;
      if (p.status !== 'Active') continue;
      const pid = p._id.toString();
      if (!patientMap.has(pid)) {
        patientMap.set(pid, {
          _id: pid,
          firstName: p.firstName ?? '',
          lastName: p.lastName ?? '',
          patientNumber: p.patientNumber ?? '',
          phone: p.phone,
          profilePicture: p.profilePicture,
        });
      }
    }

    let patients = Array.from(patientMap.values());

    if (search?.trim()) {
      const s = search.trim().toLowerCase();
      patients = patients.filter((p) =>
        p.firstName.toLowerCase().includes(s) ||
        p.lastName.toLowerCase().includes(s) ||
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(s) ||
        p.patientNumber.toLowerCase().includes(s),
      );
    }

    return patients.sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
    );
  }

  /**
   * Get active patients who have at least one posted, unpaid/partially-paid invoice.
   * Used by the payment form patient dropdown.
   */
  async getPatientsWithPayableInvoices(
    search?: string,
    userRole?: string,
    userClinicId?: string,
    subscriptionId?: string,
  ): Promise<{ _id: string; patientNumber: string; firstName: string; lastName: string; phone?: string; profilePicture?: string }[]> {
    const invoiceFilter: any = {
      invoiceStatus: 'posted',
      paymentStatus: { $ne: 'paid' },
      deletedAt: { $exists: false },
    };

    // Scope to clinic for clinic-bound roles
    if (
      (userRole === 'admin' || userRole === 'manager' || userRole === 'staff' || userRole === 'doctor') &&
      userClinicId && Types.ObjectId.isValid(userClinicId)
    ) {
      invoiceFilter.clinicId = new Types.ObjectId(userClinicId);
    } else if (userRole === 'owner' && subscriptionId && Types.ObjectId.isValid(subscriptionId)) {
      const ownerClinics = await this.clinicModel
        .find({ subscriptionId: new Types.ObjectId(subscriptionId), deletedAt: { $exists: false } })
        .select('_id').lean();
      const ownerClinicIds = ownerClinics.map((c: any) => c._id);
      if (ownerClinicIds.length > 0) {
        invoiceFilter.clinicId = { $in: ownerClinicIds };
      }
    }

    const invoices = await this.invoiceModel
      .find(invoiceFilter)
      .populate('patientId', 'firstName lastName patientNumber phone profilePicture status')
      .lean()
      .exec();

    // Deduplicate patients; skip inactive or unpopulated patients
    const patientMap = new Map<string, any>();
    for (const inv of invoices) {
      const p = (inv as any).patientId as any;
      if (!p?._id) continue;
      if (p.status !== 'Active') continue;
      const pid = p._id.toString();
      if (!patientMap.has(pid)) {
        patientMap.set(pid, {
          _id: pid,
          firstName: p.firstName ?? '',
          lastName: p.lastName ?? '',
          patientNumber: p.patientNumber ?? '',
          phone: p.phone,
          profilePicture: p.profilePicture,
        });
      }
    }

    let patients = Array.from(patientMap.values());

    if (search?.trim()) {
      const s = search.trim().toLowerCase();
      patients = patients.filter((p) =>
        p.firstName.toLowerCase().includes(s) ||
        p.lastName.toLowerCase().includes(s) ||
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(s) ||
        p.patientNumber.toLowerCase().includes(s),
      );
    }

    return patients.sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
    );
  }

  /**
   * Get ALL posted, unpaid/partially-paid invoices for a patient+clinic.
   * Used by the appointment booking flow to display the invoice list.
   */
  async getInvoicesListForBooking(
    patientId: string,
    clinicId: string,
    userRole?: string,
    userClinicId?: string,
  ): Promise<any[]> {
    // For staff/doctor role: enforce clinic scope
    const effectiveClinicId =
      userRole && ['staff', 'doctor'].includes(userRole) && userClinicId
        ? userClinicId
        : clinicId;

    // Include 'draft' invoices so first-time booking auto-posts them;
    // exclude fully paid and cancelled invoices
    const filter: any = {
      patientId: new Types.ObjectId(patientId),
      clinicId: new Types.ObjectId(effectiveClinicId),
      invoiceStatus: { $in: ['draft', 'posted'] },
      paymentStatus: { $ne: 'paid' },
      deletedAt: { $exists: false },
    };

    const invoices = await this.invoiceModel
      .find(filter)
      .sort({ createdAt: -1 })
      .populate([
        { path: 'patientId', select: 'firstName lastName patientNumber' },
        { path: 'clinicId', select: 'name' },
      ])
      .exec();

    return invoices.map((inv) => this.mapToResponseDto(inv));
  }

  /**
   * Soft delete invoice
   */
  async deleteInvoice(
    id: string,
    userId: string,
    userRole: string,
    userOrganizationId?: string,
  ): Promise<void> {
    const query: any = {
      _id: new Types.ObjectId(id),
      deletedAt: { $exists: false },
    };
    if (userOrganizationId) {
      query.organizationId = new Types.ObjectId(userOrganizationId);
    }
    const invoice = await this.invoiceModel.findOne(query);

    if (!invoice || invoice.deletedAt) {
      throw new NotFoundException(NOT_FOUND_ERRORS.INVOICE);
    }

    if (invoice.paidAmount > 0) {
      throw new BadRequestException(INVOICE_ERRORS.HAS_PAYMENTS);
    }

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
   * Cancel an invoice.
   * Rule BZR-0e1f2a3b: If all appointments for a patient are deleted, the associated invoice will be marked as Cancelled.
   * Also cancels all embedded sessions.
   */
  async cancelInvoice(id: string, userId: string): Promise<InvoiceResponseDto> {
    const invoice = await this.invoiceModel.findById(id);

    if (!invoice || invoice.deletedAt) {
      throw new NotFoundException(NOT_FOUND_ERRORS.INVOICE);
    }

    // Only Draft or Posted invoices with no paidAmount can be cancelled
    if (invoice.paidAmount > 0) {
      throw new BadRequestException({
        message: {
          ar: 'لا يمكن إلغاء فاتورة تحتوي على مدفوعات',
          en: 'Cannot cancel an invoice that has associated payments',
        },
        code: 'INVOICE_HAS_PAYMENTS',
      });
    }

    invoice.invoiceStatus = 'cancelled';
    invoice.updatedBy = new Types.ObjectId(userId);

    // Cancel all embedded sessions
    for (const svc of invoice.services) {
      for (const sess of svc.sessions) {
        sess.sessionStatus = 'cancelled';
      }
    }

    await invoice.save();

    this.logger.log(
      `Invoice cancelled: ${invoice.invoiceNumber} by user ${userId}`,
    );

    return this.mapToResponseDto(
      await invoice.populate([
        { path: 'patientId', select: 'firstName lastName patientNumber' },
        { path: 'clinicId', select: 'name' },
      ]),
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
            _id: invoice.patientId._id
              ? invoice.patientId._id.toString()
              : invoice.patientId.toString(),
            firstName: invoice.patientId.firstName,
            lastName: invoice.patientId.lastName,
            patientNumber: invoice.patientId.patientNumber,
          }
        : undefined,
      clinic: invoice.clinicId
        ? {
            _id: invoice.clinicId._id
              ? invoice.clinicId._id.toString()
              : invoice.clinicId.toString(),
            name: invoice.clinicId.name,
          }
        : undefined,
      services: invoice.services,
      subtotal: invoice.subtotal,
      discountAmount: invoice.discountAmount,
      taxAmount: invoice.taxAmount,
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      balanceDue: outstandingBalance,
      outstandingBalance,
      status: invoice.invoiceStatus,
      invoiceStatus: invoice.invoiceStatus,
      paymentStatus: invoice.paymentStatus,
      issueDate: invoice.issueDate,
      lastPaymentDate: invoice.lastPaymentDate,
      postedAt: invoice.postedAt,
      notes: invoice.notes,
      createdBy:
        invoice.createdBy && invoice.createdBy._id
          ? {
              _id:
                invoice.createdBy._id?.toString() ||
                invoice.createdBy.toString(),
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
            _id:
              invoice.updatedBy._id?.toString() ||
              invoice.updatedBy.toString(),
            firstName: invoice.updatedBy.firstName,
            lastName: invoice.updatedBy.lastName,
            email: invoice.updatedBy.email,
          }
        : undefined,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    } as any;
  }
}
