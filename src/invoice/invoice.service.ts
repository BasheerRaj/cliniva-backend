import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Invoice } from '../database/schemas/invoice.schema';
import { Patient } from '../database/schemas/patient.schema';
import { Service } from '../database/schemas/service.schema';
import { Clinic } from '../database/schemas/clinic.schema';
import { Counter } from '../database/schemas/counter.schema';
import { Payment } from '../database/schemas/payment.schema';
import { ResponseBuilder } from '../common/utils/response-builder.util';
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
import { assertSameTenant, TenantUser } from '../common/utils/tenant-scope.util';

@Injectable()
export class InvoiceService implements OnModuleInit {
  private readonly logger = new Logger(InvoiceService.name);

  private async sanitizeDeletedAppointmentSessions(invoice: any): Promise<any> {
    const appointmentIds = Array.from(
      new Set(
        (invoice?.services || []).flatMap((svc: any) =>
          (svc?.sessions || [])
            .map((sess: any) => sess?.appointmentId?.toString?.() ?? sess?.appointmentId)
            .filter((id: any) => !!id && Types.ObjectId.isValid(String(id))),
        ),
      ),
    );

    if (appointmentIds.length === 0) {
      return invoice;
    }

    const activeAppointments = await this.invoiceModel.db
      .collection('appointments')
      .find(
        {
          _id: { $in: appointmentIds.map((id) => new Types.ObjectId(String(id))) },
          deletedAt: { $exists: false },
        },
        { projection: { _id: 1 } },
      )
      .toArray();

    const activeAppointmentIds = new Set(
      activeAppointments.map((appointment: any) => appointment._id.toString()),
    );

    let hasChanges = false;
    const sanitizedServices = (invoice.services || []).map((svc: any) => ({
      ...svc,
      sessions: (svc.sessions || []).map((sess: any) => {
        const appointmentId =
          sess?.appointmentId?.toString?.() ?? sess?.appointmentId ?? null;

        if (!appointmentId || activeAppointmentIds.has(String(appointmentId))) {
          return sess;
        }

        hasChanges = true;
        return {
          ...sess,
          appointmentId: null,
          sessionStatus:
            sess?.sessionStatus === 'completed' ? 'completed' : 'pending',
        };
      }),
    }));

    if (!hasChanges) {
      return invoice;
    }

    return {
      ...invoice.toObject(),
      services: sanitizedServices,
    };
  }

  async onModuleInit(): Promise<void> {
    try {
      const indexes = await this.invoiceModel.collection.indexes();
      const legacyUniqueIdx = indexes.find(
        (idx: any) =>
          idx?.name === 'organizationId_1_invoiceNumber_1' && idx?.unique === true,
      );

      if (legacyUniqueIdx) {
        await this.invoiceModel.collection.dropIndex('organizationId_1_invoiceNumber_1');
        this.logger.warn(
          'Dropped legacy unique index organizationId_1_invoiceNumber_1 from invoices collection',
        );
      }
    } catch (error: any) {
      this.logger.warn(
        `Invoice index migration check skipped: ${error?.message ?? 'unknown error'}`,
      );
    }
  }

  private async assertClinicTenantAccess(
    clinicId: string | Types.ObjectId,
    requestingUser?: TenantUser,
  ): Promise<void> {
    if (!requestingUser || requestingUser.role === 'super_admin') {
      return;
    }

    const clinic = await this.clinicModel
      .findById(clinicId)
      .select('_id subscriptionId')
      .lean()
      .exec();

    if (!clinic) {
      throw new NotFoundException(NOT_FOUND_ERRORS.CLINIC);
    }

    assertSameTenant((clinic as any).subscriptionId, requestingUser);
  }

  private async assertInvoiceTenantAccess(
    invoice: any,
    requestingUser?: TenantUser,
  ): Promise<void> {
    if (!requestingUser || requestingUser.role === 'super_admin') {
      return;
    }
    if (!invoice?.clinicId) {
      if ((invoice as any)?.subscriptionId) {
        assertSameTenant((invoice as any).subscriptionId, requestingUser);
        return;
      }
      throw new ForbiddenException(AUTH_ERRORS.INSUFFICIENT_PERMISSIONS);
    }
    const clinicId =
      (invoice.clinicId as any)?._id?.toString() ??
      (invoice.clinicId as any)?.toString();
    await this.assertClinicTenantAccess(clinicId, requestingUser);
  }

  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<Invoice>,
    @InjectModel(Patient.name) private patientModel: Model<Patient>,
    @InjectModel(Service.name) private serviceModel: Model<Service>,
    @InjectModel(Clinic.name) private clinicModel: Model<Clinic>,
    @InjectModel(Counter.name) private counterModel: Model<Counter>,
    @InjectModel(Payment.name) private readonly paymentModel: Model<Payment>,
    private invoiceNumberService: InvoiceNumberService,
  ) {}

  private assertServiceMatchesClinic(service: any, clinicId: string): void {
    const clinicIds = Array.isArray(service?.clinicIds)
      ? service.clinicIds.map((id: any) => id?.toString?.() ?? String(id))
      : [];

    // If service has explicit clinic assignments, enforce clinic match.
    if (clinicIds.length > 0 && !clinicIds.includes(clinicId)) {
      throw new BadRequestException({
        message: {
          ar: `الخدمة "${service?.name ?? ''}" غير متوفرة في هذه العيادة`,
          en: `Service "${service?.name ?? ''}" is not provided by this clinic`,
        },
        code: 'SERVICE_CLINIC_MISMATCH',
        serviceId: service?._id?.toString?.(),
        clinicId,
      });
    }
  }

  private getAssignedClinicIds(
    userClinicId?: string,
    requestingUser?: TenantUser,
  ): string[] {
    const fromUser = Array.isArray((requestingUser as any)?.clinicIds)
      ? (requestingUser as any).clinicIds.map(String).filter(Boolean)
      : [];
    if (fromUser.length > 0) return Array.from(new Set(fromUser));
    return userClinicId ? [String(userClinicId)] : [];
  }

  private getScopedClinicObjectIds(
    userClinicId?: string,
    userClinicIds?: string[],
  ): Types.ObjectId[] {
    const fromArray = Array.isArray(userClinicIds)
      ? userClinicIds.map(String).filter(Boolean)
      : [];
    const merged = fromArray.length > 0
      ? fromArray
      : userClinicId
      ? [String(userClinicId)]
      : [];

    return Array.from(new Set(merged))
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
  }

  private buildLegacyCliniclessInvoiceClause(
    subscriptionId?: string,
  ): Record<string, any> | null {
    if (!subscriptionId || !Types.ObjectId.isValid(subscriptionId)) {
      return null;
    }

    return {
      clinicId: { $exists: false },
      subscriptionId: new Types.ObjectId(subscriptionId),
    };
  }

  private buildClinicScopedInvoiceFilter(
    clinicCondition: Record<string, any> | Types.ObjectId,
    subscriptionId?: string,
  ): Record<string, any>[] {
    const clauses: Record<string, any>[] = [{ clinicId: clinicCondition }];
    const legacyCliniclessClause =
      this.buildLegacyCliniclessInvoiceClause(subscriptionId);

    if (legacyCliniclessClause) {
      clauses.push(legacyCliniclessClause);
    }

    return clauses;
  }

  private isServiceAvailableInClinic(service: any, clinicId: string): boolean {
    const clinicIds = Array.isArray(service?.clinicIds)
      ? service.clinicIds.map((id: any) => id?.toString?.() ?? String(id))
      : [];
    if (clinicIds.length === 0) return true;
    return clinicIds.includes(clinicId);
  }

  private async filterInvoicesCompatibleWithClinic<T extends { clinicId?: any; services?: any[] }>(
    invoices: T[],
    clinicId: string,
  ): Promise<T[]> {
    if (!clinicId || invoices.length === 0) return invoices;

    const explicit: T[] = [];
    const withoutClinic: T[] = [];

    for (const inv of invoices) {
      const invoiceClinicId =
        (inv as any).clinicId?._id?.toString?.() ??
        (inv as any).clinicId?.toString?.();
      if (invoiceClinicId) {
        if (invoiceClinicId === clinicId) explicit.push(inv);
      } else {
        withoutClinic.push(inv);
      }
    }

    if (withoutClinic.length === 0) return explicit;

    const serviceIds = Array.from(
      new Set(
        withoutClinic.flatMap((inv: any) =>
          (inv.services ?? [])
            .map((svc: any) => svc?.serviceId?.toString?.() ?? String(svc?.serviceId))
            .filter((id: string) => Types.ObjectId.isValid(id)),
        ),
      ),
    );

    if (serviceIds.length === 0) return explicit;

    const services = await this.serviceModel
      .find({
        _id: { $in: serviceIds.map((id) => new Types.ObjectId(id)) },
        deletedAt: { $exists: false },
      })
      .select('_id clinicIds')
      .lean();

    const serviceMap = new Map<string, any>(
      services.map((s: any) => [s._id.toString(), s]),
    );

    const compatible: T[] = [];
    for (const inv of withoutClinic as any[]) {
      const ok = (inv.services ?? []).some((svc: any) => {
        const sid = svc?.serviceId?.toString?.() ?? String(svc?.serviceId);
        const service = serviceMap.get(sid);
        return service ? this.isServiceAvailableInClinic(service, clinicId) : false;
      });
      if (ok) compatible.push(inv);
    }

    return [...explicit, ...compatible];
  }

  private async hasInvoiceAccessByClinicScope(
    invoice: any,
    clinicIds: string[],
  ): Promise<boolean> {
    const uniqueClinicIds = Array.from(new Set((clinicIds ?? []).map(String).filter(Boolean)));
    if (uniqueClinicIds.length === 0) return false;

    const invoiceClinicIdStr =
      (invoice?.clinicId as any)?._id?.toString?.() ??
      (invoice?.clinicId as any)?.toString?.();
    if (invoiceClinicIdStr) {
      return uniqueClinicIds.includes(invoiceClinicIdStr);
    }

    for (const clinicId of uniqueClinicIds) {
      const compatible = await this.filterInvoicesCompatibleWithClinic([invoice], clinicId);
      if (compatible.length > 0) return true;
    }
    return false;
  }

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
    requestingUser?: TenantUser,
  ): Promise<InvoiceResponseDto> {
    const assignedClinicIds = this.getAssignedClinicIds(userClinicId, requestingUser);

    // Validate clinic access for Staff/Doctor roles
    if (userRole === 'staff' || userRole === 'doctor') {
      if (
        assignedClinicIds.length === 0 ||
        (createInvoiceDto.clinicId &&
          !assignedClinicIds.includes(createInvoiceDto.clinicId))
      ) {
        throw new ForbiddenException({
          message: {
            ar: 'لا يمكنك إنشاء فاتورة لعيادة غير مخصصة لك',
            en: 'You cannot create an invoice for a clinic not assigned to you',
          },
          code: 'CLINIC_ACCESS_DENIED',
        });
      }
    }

    // 1. Resolve clinicId: only use what was explicitly provided in the request.
    // Clinic association is deferred until the first appointment is booked.
    let resolvedClinicId = createInvoiceDto.clinicId;

    let clinic: any = null;
    if (resolvedClinicId) {
      clinic = await this.clinicModel.findOne({
        _id: new Types.ObjectId(resolvedClinicId),
        deletedAt: { $exists: false },
      });
      if (!clinic) {
        throw new NotFoundException(NOT_FOUND_ERRORS.CLINIC);
      }
      await this.assertClinicTenantAccess((clinic as any)._id, requestingUser);
    }
    // 2. Derive organization/subscription context
    const organizationId = clinic?.organizationId || requestingUser?.organizationId;
    let subscriptionId =
      clinic?.subscriptionId?.toString?.() ||
      requestingUser?.subscriptionId;


    // 3. Find patient by dto.patientId (validate exists, not deleted)
    const patient = await this.patientModel.findOne({
      _id: new Types.ObjectId(createInvoiceDto.patientId),
      deletedAt: { $exists: false },
    });
    if (!patient) {
      throw new NotFoundException(NOT_FOUND_ERRORS.PATIENT);
    }
    if (requestingUser && (patient as any).subscriptionId) {
      assertSameTenant((patient as any).subscriptionId, requestingUser);
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
      if (resolvedClinicId) {
        this.assertServiceMatchesClinic(service, resolvedClinicId);
      } else if (userRole === 'staff' || userRole === 'doctor') {
        const serviceClinicIds = Array.isArray((service as any).clinicIds)
          ? (service as any).clinicIds
              .map((id: any) => id?.toString?.() ?? String(id))
              .filter(Boolean)
          : [];

        const hasAssignedClinicAccess =
          serviceClinicIds.length === 0 ||
          serviceClinicIds.some((id: string) => assignedClinicIds.includes(id));

        if (!hasAssignedClinicAccess) {
          throw new ForbiddenException({
            message: {
              ar: 'لا يمكنك إنشاء فاتورة لخدمة خارج عياداتك المخصصة',
              en: 'You cannot create an invoice for a service outside your assigned clinics',
            },
            code: 'INVOICE_SERVICE_CLINIC_ACCESS_DENIED',
          });
        }
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

      // Pre-populate sessions from service definition
      const invoiceSessions = ((service as any).sessions || []).map((s: any) => ({
        invoiceItemId: new Types.ObjectId(),
        sessionId: s._id,
        sessionName: s.name,
        sessionOrder: s.order,
        unitPrice: pricePerSession,
        discountPercent,
        discountAmount: discountAmountPerSession,
        taxRate,
        taxAmount: taxAmountPerSession,
        lineTotal: lineTotalPerSession,
        paidAmount: 0,
        sessionStatus: 'pending',
        appointmentRequired: s.appointmentRequired ?? s.apptRequired ?? true,
      }));

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
        sessions: invoiceSessions,
      } as any);
    }

    // Clinic association is deferred — only set if explicitly provided in the DTO.
    // It will be attached to the invoice when the first appointment is booked.
    if (!clinic && resolvedClinicId) {
      clinic = await this.clinicModel.findOne({
        _id: new Types.ObjectId(resolvedClinicId),
        deletedAt: { $exists: false },
      });
      if (!clinic) {
        throw new NotFoundException(NOT_FOUND_ERRORS.CLINIC);
      }
      await this.assertClinicTenantAccess((clinic as any)._id, requestingUser);
      if (!subscriptionId) {
        subscriptionId = (clinic as any).subscriptionId?.toString?.();
      }
    }

    if (!subscriptionId && builtServices.length > 0) {
      const firstServiceId = (builtServices[0] as any).serviceId?.toString?.();
      if (firstServiceId) {
        const firstService = await this.serviceModel
          .findById(firstServiceId)
          .select('subscriptionId')
          .lean();
        subscriptionId =
          (firstService as any)?.subscriptionId?.toString?.() || subscriptionId;
      }
    }
    if (!subscriptionId) {
      throw new BadRequestException({
        message: {
          ar: 'لا يمكن تحديد الاشتراك المرتبط بالفاتورة',
          en: 'Unable to resolve invoice subscription',
        },
        code: 'SUBSCRIPTION_REQUIRED',
      });
    }
    subtotal = +subtotal.toFixed(2);
    totalDiscount = +Math.min(totalDiscount, subtotal).toFixed(2); // Cap to prevent negative totalAmount from rounding
    totalTax = +totalTax.toFixed(2);
    const totalAmount = Math.max(0, +(subtotal - totalDiscount + totalTax).toFixed(2));

    // 6. Generate draft number via counterModel (atomic)
    const invoiceNumber = await this.invoiceNumberService.generateDraftNumber(
      organizationId ? organizationId.toString() : resolvedClinicId || subscriptionId,
    );

    // 7. Create invoice (retry on invoice number collision)
    const invoiceBase: any = {
      invoiceTitle: createInvoiceDto.invoiceTitle,
      patientId: new Types.ObjectId(createInvoiceDto.patientId),
      ...(resolvedClinicId
        ? { clinicId: new Types.ObjectId(resolvedClinicId) }
        : {}),
      organizationId: organizationId ?? undefined,
      subscriptionId: new Types.ObjectId(subscriptionId),
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
    };

    let invoice = new this.invoiceModel({
      ...invoiceBase,
      invoiceNumber,
    });

    let saved = false;
    let retries = 0;
    while (!saved) {
      try {
        await invoice.save();
        saved = true;
      } catch (err: any) {
        if (err.code === 11000 && err.keyPattern?.invoiceNumber && retries < 10) {
          retries++;
          const nextInvoiceNumber = await this.invoiceNumberService.generateDraftNumber(
            organizationId ? organizationId.toString() : resolvedClinicId || subscriptionId,
          );
          invoice = new this.invoiceModel({
            ...invoiceBase,
            invoiceNumber: nextInvoiceNumber,
          });
          this.logger.warn(
            `Draft invoice number collision, retrying with ${nextInvoiceNumber} (attempt ${retries})`,
          );
        } else {
          throw err;
        }
      }
    }

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
    userClinicIds?: string[],
    userOrganizationId?: string,
  ): Promise<{ data: InvoiceResponseDto[]; meta: any }> {
    // Build query filter
    const filter: any = { deletedAt: { $exists: false } };

    // Service-level scoping for clinic-bound roles (admin, manager, staff, doctor)
    // Applied directly from req.user to bypass guard→DTO validation chain issues
    const isClinicBoundRole =
      userRole === 'admin' ||
      userRole === 'manager' ||
      userRole === 'staff' ||
      userRole === 'doctor';
    const scopedClinicIds = this.getScopedClinicObjectIds(
      userClinicId,
      userClinicIds,
    );
    if (isClinicBoundRole) {
      if (queryDto.clinicId) {
        const requestedClinicId = new Types.ObjectId(queryDto.clinicId);
        const hasAccess = scopedClinicIds.some(
          (clinicObjectId) =>
            clinicObjectId.toString() === requestedClinicId.toString(),
        );
        if (!hasAccess) {
          filter._id = new Types.ObjectId('000000000000000000000000');
        } else {
          filter.clinicId = requestedClinicId;
        }
      } else if (scopedClinicIds.length >= 1) {
        // Only include clinic-less invoices when they still belong to the same tenant.
        filter.$or = this.buildClinicScopedInvoiceFilter(
          { $in: scopedClinicIds },
          subscriptionId,
        );
      } else {
        filter._id = new Types.ObjectId('000000000000000000000000');
      }
    } else if (queryDto.clinicId) {
      // Fall back to query param (for owner/super_admin with explicit filter)
      filter.clinicId = new Types.ObjectId(queryDto.clinicId);
    }

    // Owner role scoping: scope to tenant subscription first, with organization/clinic
    // fallbacks for legacy data that may have incomplete linkage.
    if (userRole === 'owner') {
      if (subscriptionId && Types.ObjectId.isValid(subscriptionId)) {
        const ownerScopeOr: any[] = [
          { subscriptionId: new Types.ObjectId(subscriptionId) },
        ];

        // Derive all clinics for this owner via subscriptionId (covers clinics missing organizationId)
        const ownerClinics = await this.clinicModel
          .find({ subscriptionId: new Types.ObjectId(subscriptionId), deletedAt: { $exists: false } })
          .select('_id')
          .lean();
        const ownerClinicIds = ownerClinics.map((c: any) => c._id);

        if (userOrganizationId && Types.ObjectId.isValid(userOrganizationId)) {
          ownerScopeOr.push({ organizationId: new Types.ObjectId(userOrganizationId) });
        }

        if (ownerClinicIds.length > 0) {
          ownerScopeOr.push({ clinicId: { $in: ownerClinicIds } });
        }

        if (filter.$or) {
          filter.$and = [{ $or: filter.$or }, { $or: ownerScopeOr }];
          delete filter.$or;
        } else {
          filter.$or = ownerScopeOr;
        }
      } else if (userOrganizationId && Types.ObjectId.isValid(userOrganizationId)) {
        // No valid subscriptionId — use org scope directly
        filter.organizationId = new Types.ObjectId(userOrganizationId);
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
    requestingUser?: TenantUser,
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
    await this.assertInvoiceTenantAccess(invoice, requestingUser);

    if (userRole === 'staff' || userRole === 'doctor') {
      const hasAccess = await this.hasInvoiceAccessByClinicScope(invoice, userClinicIds);
      if (!hasAccess) {
        throw new ForbiddenException(AUTH_ERRORS.INSUFFICIENT_PERMISSIONS);
      }
    }

    const sanitizedInvoice = await this.sanitizeDeletedAppointmentSessions(invoice);
    return this.mapToResponseDto(sanitizedInvoice);
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
    subscriptionId?: string,
    requestingUser?: TenantUser,
  ): Promise<InvoiceResponseDto> {
    const query: any = {
      _id: new Types.ObjectId(id),
      deletedAt: { $exists: false },
    };
    if (userOrganizationId && subscriptionId) {
      const ownerClinics = await this.clinicModel
        .find({ subscriptionId: new Types.ObjectId(subscriptionId), deletedAt: { $exists: false } })
        .select('_id').lean();
      const ownerClinicIds = ownerClinics.map((c: any) => c._id);
      if (ownerClinicIds.length > 0) {
        query.$or = [{ organizationId: new Types.ObjectId(userOrganizationId) }, { clinicId: { $in: ownerClinicIds } }];
      } else {
        query.organizationId = new Types.ObjectId(userOrganizationId);
      }
    } else if (userOrganizationId) {
      query.organizationId = new Types.ObjectId(userOrganizationId);
    }
    const invoice = await this.invoiceModel.findOne(query);

    if (!invoice || invoice.deletedAt) {
      throw new NotFoundException(NOT_FOUND_ERRORS.INVOICE);
    }
    await this.assertInvoiceTenantAccess(invoice, requestingUser);

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
        if (invoice.clinicId) {
          this.assertServiceMatchesClinic(service, invoice.clinicId.toString());
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

    // Retry loop: if the generated number collides with an existing invoice
    // (e.g. counter is behind seeded data), advance the counter and try again.
    let saved = false;
    let retries = 0;
    while (!saved) {
      try {
        await invoice.save();
        saved = true;
      } catch (err: any) {
        if (err.code === 11000 && err.keyPattern?.invoiceNumber && retries < 10) {
          retries++;
          invoice.invoiceNumber =
            await this.invoiceNumberService.generatePostedNumber(organizationId);
          this.logger.warn(
            `Invoice number collision, retrying with ${invoice.invoiceNumber} (attempt ${retries})`,
          );
        } else {
          throw err;
        }
      }
    }

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
    requestingUser?: TenantUser,
  ): Promise<any> {
    const assignedClinicIds = this.getAssignedClinicIds(userClinicId, requestingUser);
    const isClinicBoundRole = userRole && ['staff', 'doctor'].includes(userRole);
    let effectiveClinicId = clinicId;

    if (isClinicBoundRole) {
      if (assignedClinicIds.length === 0) {
        throw new ForbiddenException({
          message: { ar: 'لا تملك صلاحية الوصول إلى أي عيادة', en: 'No assigned clinic access' },
          code: 'INVOICE_CLINIC_ACCESS_DENIED',
        });
      }
      if (clinicId && !assignedClinicIds.includes(clinicId)) {
        throw new ForbiddenException({
          message: { ar: 'ليس لديك صلاحية الوصول إلى فواتير هذه العيادة', en: 'You do not have access to invoices for this clinic' },
          code: 'INVOICE_CLINIC_ACCESS_DENIED',
        });
      }
      if (!effectiveClinicId && assignedClinicIds.length === 1) {
        effectiveClinicId = assignedClinicIds[0];
      }
    }

    if (!effectiveClinicId) {
      throw new BadRequestException({
        message: { ar: 'معرف العيادة مطلوب', en: 'clinicId is required' },
        code: 'CLINIC_ID_REQUIRED',
      });
    }

    await this.assertClinicTenantAccess(effectiveClinicId, requestingUser);

    const filter: any = {
      patientId: new Types.ObjectId(patientId),
      invoiceStatus: 'posted',
      paymentStatus: { $ne: 'paid' },
      deletedAt: { $exists: false },
      $or: this.buildClinicScopedInvoiceFilter(
        new Types.ObjectId(effectiveClinicId),
        requestingUser?.subscriptionId,
      ),
    };


    if (invoiceId) {
      filter._id = new Types.ObjectId(invoiceId);
    }

    const invoices = await this.invoiceModel
      .find(filter)
      .sort({ createdAt: -1 })
      .populate([
        { path: 'patientId', select: 'firstName lastName patientNumber' },
        { path: 'clinicId', select: 'name' },
      ])
      .exec();

    const compatible = await this.filterInvoicesCompatibleWithClinic(
      invoices as any[],
      effectiveClinicId,
    );
    const invoice = compatible[0];

    if (!invoice) {
      throw new NotFoundException({
        message: {
          ar: 'لا توجد فاتورة منشورة لهذا المريض',
          en: 'No posted invoice found for this patient',
        },
        code: 'INVOICE_NOT_FOUND_FOR_BOOKING',
      });
    }
    await this.assertInvoiceTenantAccess(invoice, requestingUser);

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
    requestingUser?: TenantUser,
  ): Promise<{ _id: string; patientNumber: string; firstName: string; lastName: string; phone?: string; profilePicture?: string }[]> {
    await this.assertClinicTenantAccess(clinicId, requestingUser);

    const invoices = await this.invoiceModel
      .find({
        invoiceStatus: { $in: ['draft', 'posted'] },
        paymentStatus: { $ne: 'paid' },
        deletedAt: { $exists: false },
        $or: this.buildClinicScopedInvoiceFilter(
          new Types.ObjectId(clinicId),
          requestingUser?.subscriptionId,
        ),
      })
      .populate('patientId', 'firstName lastName patientNumber phone profilePicture status')
      .lean()
      .exec();

    const clinicCompatible = await this.filterInvoicesCompatibleWithClinic(
      invoices as any[],
      clinicId,
    );

    // Keep only invoices that have at least one service with remaining capacity
    const bookable = clinicCompatible.filter((inv: any) =>
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
    userClinicIds?: string[],
    subscriptionId?: string,
  ): Promise<{ _id: string; patientNumber: string; firstName: string; lastName: string; phone?: string; profilePicture?: string }[]> {
    const invoiceFilter: any = {
      invoiceStatus: 'posted',
      paymentStatus: { $ne: 'paid' },
      deletedAt: { $exists: false },
    };

    // Scope to clinic(s) for clinic-bound roles
    const isClinicBoundRole =
      userRole === 'admin' ||
      userRole === 'manager' ||
      userRole === 'staff' ||
      userRole === 'doctor';
    const scopedClinicIds = this.getScopedClinicObjectIds(
      userClinicId,
      userClinicIds,
    );
    if (isClinicBoundRole) {
      if (scopedClinicIds.length >= 1) {
        invoiceFilter.$or = this.buildClinicScopedInvoiceFilter(
          { $in: scopedClinicIds },
          subscriptionId,
        );
      } else {
        invoiceFilter._id = new Types.ObjectId('000000000000000000000000');
      }
    } else if (userRole === 'owner' && subscriptionId && Types.ObjectId.isValid(subscriptionId)) {
      const ownerScopeOr: any[] = [
        { subscriptionId: new Types.ObjectId(subscriptionId) },
      ];

      const ownerClinics = await this.clinicModel
        .find({ subscriptionId: new Types.ObjectId(subscriptionId), deletedAt: { $exists: false } })
        .select('_id').lean();
      const ownerClinicIds = ownerClinics.map((c: any) => c._id);

      if (ownerClinicIds.length > 0) {
        ownerScopeOr.push({ clinicId: { $in: ownerClinicIds } });
      }

      if (invoiceFilter.$or) {
        invoiceFilter.$and = [{ $or: invoiceFilter.$or }, { $or: ownerScopeOr }];
        delete invoiceFilter.$or;
      } else {
        invoiceFilter.$or = ownerScopeOr;
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
    clinicId: string | undefined,
    userRole?: string,
    userClinicId?: string,
    requestingUser?: TenantUser,
  ): Promise<any[]> {
    const assignedClinicIds = this.getAssignedClinicIds(userClinicId, requestingUser);
    const isClinicBoundRole = userRole && ['staff', 'doctor'].includes(userRole);
    let effectiveClinicId = clinicId;
    let scopedClinicIds: string[] = [];

    if (isClinicBoundRole) {
      if (assignedClinicIds.length === 0) {
        throw new ForbiddenException({
          message: { ar: 'لا تملك صلاحية الوصول إلى أي عيادة', en: 'No assigned clinic access' },
          code: 'INVOICE_CLINIC_ACCESS_DENIED',
        });
      }
      if (clinicId && !assignedClinicIds.includes(clinicId)) {
        throw new ForbiddenException({
          message: { ar: 'ليس لديك صلاحية الوصول إلى فواتير هذه العيادة', en: 'You do not have access to invoices for this clinic' },
          code: 'INVOICE_CLINIC_ACCESS_DENIED',
        });
      }
      if (!clinicId && assignedClinicIds.length === 1) {
        effectiveClinicId = assignedClinicIds[0];
      } else if (!clinicId && assignedClinicIds.length > 1) {
        scopedClinicIds = assignedClinicIds;
      }
    }

    // Include 'draft' invoices so first-time booking auto-posts them;
    // exclude fully paid and cancelled invoices
    const filter: any = {
      patientId: new Types.ObjectId(patientId),
      invoiceStatus: { $in: ['draft', 'posted'] },
      paymentStatus: { $ne: 'paid' },
      deletedAt: { $exists: false },
    };

    // Only filter by clinic when known (allows admin/owner to see all clinics)
    if (effectiveClinicId) {
      await this.assertClinicTenantAccess(effectiveClinicId, requestingUser);
      filter.$or = this.buildClinicScopedInvoiceFilter(
        new Types.ObjectId(effectiveClinicId),
        requestingUser?.subscriptionId,
      );
    } else if (scopedClinicIds.length > 0) {
      const scopedClinicObjectIds = scopedClinicIds
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id));

      if (scopedClinicObjectIds.length === 0) {
        throw new ForbiddenException({
          message: { ar: 'لا تملك صلاحية الوصول إلى أي عيادة', en: 'No assigned clinic access' },
          code: 'INVOICE_CLINIC_ACCESS_DENIED',
        });
      }

      filter.$or = this.buildClinicScopedInvoiceFilter(
        { $in: scopedClinicObjectIds },
        requestingUser?.subscriptionId,
      );
    }

    const invoices = await this.invoiceModel
      .find(filter)
      .sort({ createdAt: -1 })
      .populate([
        { path: 'patientId', select: 'firstName lastName patientNumber' },
        { path: 'clinicId', select: 'name' },
      ])
      .exec();

    // Filter to only return invoices that have at least one bookable session.
    // A session is bookable if:
    // 1. There are already populated sessions with status 'pending' or 'cancelled'.
    // 2. OR the service has not yet reached its totalSessions limit (meaning new sessions can be created).
    const clinicCompatible = effectiveClinicId
      ? await this.filterInvoicesCompatibleWithClinic(
          invoices as any[],
          effectiveClinicId,
        )
      : invoices;

    const bookableInvoices = clinicCompatible.filter((inv: any) =>
      (inv.services ?? []).some((svc: any) => {
        // Condition 1: existing available sessions
        const hasExistingAvailable = (svc.sessions ?? []).some((sess: any) =>
          ['pending', 'cancelled'].includes(sess.sessionStatus),
        );
        if (hasExistingAvailable) return true;

        // Condition 2: room for new sessions
        const activeSessions = (svc.sessions ?? []).filter(
          (s: any) => s.sessionStatus !== 'cancelled',
        );
        return activeSessions.length < (svc.totalSessions ?? 1);
      }),
    );

    return bookableInvoices.map((inv) => this.mapToResponseDto(inv));
  }

  /**
   * Soft delete invoice
   */
  async deleteInvoice(
    id: string,
    userId: string,
    userRole: string,
    userOrganizationId?: string,
    subscriptionId?: string,
    requestingUser?: TenantUser,
  ): Promise<void> {
    const query: any = {
      _id: new Types.ObjectId(id),
      deletedAt: { $exists: false },
    };
    if (userOrganizationId && subscriptionId) {
      const ownerClinics = await this.clinicModel
        .find({ subscriptionId: new Types.ObjectId(subscriptionId), deletedAt: { $exists: false } })
        .select('_id').lean();
      const ownerClinicIds = ownerClinics.map((c: any) => c._id);
      if (ownerClinicIds.length > 0) {
        query.$or = [{ organizationId: new Types.ObjectId(userOrganizationId) }, { clinicId: { $in: ownerClinicIds } }];
      } else {
        query.organizationId = new Types.ObjectId(userOrganizationId);
      }
    } else if (userOrganizationId) {
      query.organizationId = new Types.ObjectId(userOrganizationId);
    }
    const invoice = await this.invoiceModel.findOne(query);

    if (!invoice || invoice.deletedAt) {
      throw new NotFoundException(NOT_FOUND_ERRORS.INVOICE);
    }
    await this.assertInvoiceTenantAccess(invoice, requestingUser);

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
  async cancelInvoice(
    id: string,
    userId: string,
    requestingUser?: TenantUser,
  ): Promise<InvoiceResponseDto> {
    const invoice = await this.invoiceModel.findById(id);

    if (!invoice || invoice.deletedAt) {
      throw new NotFoundException(NOT_FOUND_ERRORS.INVOICE);
    }
    await this.assertInvoiceTenantAccess(invoice, requestingUser);

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
   * Get all payments for a specific invoice, paginated, sorted newest first.
   */
  async getInvoicePayments(
    invoiceId: string,
    page = 1,
    limit = 20,
    requestingUser?: TenantUser,
  ) {
    const invoice = await this.invoiceModel.findOne({
      _id: invoiceId,
      deletedAt: { $exists: false },
    });
    if (!invoice) {
      throw new NotFoundException(NOT_FOUND_ERRORS.INVOICE);
    }
    await this.assertInvoiceTenantAccess(invoice, requestingUser);

    const objectId = new Types.ObjectId(invoiceId);
    const filter = {
      $or: [{ invoiceId: objectId }, { invoiceIds: objectId }],
      deletedAt: { $exists: false },
    };

    const [rawPayments, total] = await Promise.all([
      this.paymentModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('addedBy', 'firstName lastName')
        .lean(),
      this.paymentModel.countDocuments(filter),
    ]);

    const payments = rawPayments.map((payment: any) => {
      const allocations: Array<{ invoiceId: any; amount: number }> =
        payment.invoiceAllocations || [];
      const isMultiInvoice = allocations.length > 1;
      let allocatedAmount = payment.amount;
      if (isMultiInvoice) {
        const match = allocations.find(
          (a) => a.invoiceId?.toString() === invoiceId,
        );
        allocatedAmount = match ? match.amount : 0;
      }
      return {
        ...payment,
        allocatedAmount,
        totalPaymentAmount: payment.amount,
        isMultiInvoice,
      };
    });

    return ResponseBuilder.paginated(
      payments,
      page,
      limit,
      total,
      { ar: 'تم جلب سجل المدفوعات بنجاح', en: 'Payment history fetched successfully' },
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
      totalDiscount: invoice.discountAmount,
      taxAmount: invoice.taxAmount,
      totalTax: invoice.taxAmount,
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      balanceDue: outstandingBalance,
      outstandingBalance,
      businessName: invoice.clinicId?.name ?? null,
      status: invoice.invoiceStatus,
      invoiceStatus: invoice.invoiceStatus,
      paymentStatus: invoice.paymentStatus,
      issueDate: invoice.issueDate,
      lastPaymentDate: invoice.lastPaymentDate,
      postedAt: invoice.postedAt,
      notes: invoice.notes,
      bookableSessions: (invoice.services || []).flatMap((svc: any) => {
        const sessions = svc.sessions || [];
        const bookable = sessions
          .filter((sess: any) => ['pending', 'cancelled'].includes(sess.sessionStatus))
          .map((sess: any) => ({
            ...sess,
            serviceId: svc.serviceId,
            serviceName: svc.serviceName,
            isVirtual: false,
          }));

        // If no pre-populated sessions exist (legacy invoice) but there's room for new ones,
        // add virtual sessions based on remaining capacity.
        const activeSessions = sessions.filter(
          (s: any) => s.sessionStatus !== 'cancelled',
        );
        const remainingCount = (svc.totalSessions || 1) - activeSessions.length;
        
        if (bookable.length === 0 && remainingCount > 0) {
          const usedOrders = new Set(
            sessions
              .map((sess: any) => sess.sessionOrder)
              .filter((order: any) => Number.isFinite(order)),
          );
          const missingOrders: number[] = [];
          for (let order = 1; order <= (svc.totalSessions || 1); order += 1) {
            if (!usedOrders.has(order)) {
              missingOrders.push(order);
            }
          }

          for (let i = 1; i <= remainingCount; i++) {
            const nextOrder =
              missingOrders[i - 1] ||
              sessions.length + i;
            bookable.push({
              sessionName: `Session ${nextOrder} (New)`,
              sessionOrder: nextOrder,
              sessionStatus: 'pending',
              serviceId: svc.serviceId,
              serviceName: svc.serviceName,
              unitPrice: svc.pricePerSession || 0,
              lineTotal: svc.pricePerSession || 0,
              isVirtual: true,
              appointmentRequired: true,
            });
          }
        }
        return bookable;
      }),
      createdBy:
        invoice.createdBy && invoice.createdBy._id          ? {
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
