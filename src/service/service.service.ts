import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Service } from '../database/schemas/service.schema';
import { ServiceCategory } from '../database/schemas/service-category.schema';
import { ClinicService } from '../database/schemas/clinic-service.schema';
import { Appointment } from '../database/schemas/appointment.schema';
import { Notification } from '../database/schemas/notification.schema';
import { User } from '../database/schemas/user.schema';
import { DoctorService } from '../database/schemas/doctor-service.schema';
import { Clinic } from '../database/schemas/clinic.schema';
import { Complex } from '../database/schemas/complex.schema';
import { EmployeeShift } from '../database/schemas/employee-shift.schema';
import { Invoice } from '../database/schemas/invoice.schema';
import { CreateServiceDto, AssignServicesDto } from './dto/create-service.dto';
import {
  CreateServiceWithSessionsDto,
  DoctorClinicAssignmentDto,
} from './dto/create-service-with-sessions.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { UpdateServiceWithSessionsDto } from './dto/update-service-with-sessions.dto';
import { ChangeServiceStatusDto } from './dto/change-service-status.dto';
import { BulkStatusChangeDto } from './dto/bulk-status-change.dto';
import { ServiceOfferService } from '../service-offer/service-offer.service';
import { CalculateServicePriceDto } from '../service-offer/dto/calculate-service-price.dto';
import { PriceCalculation } from '../service-offer/interfaces/price-calculation.interface';
import { SessionManagerService } from './services/session-manager.service';
import { buildTenantFilter, TenantUser } from '../common/utils/tenant-scope.util';

type PaginationOptions = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type PaginatedResult<T> = {
  data: T[];
  pagination: PaginationMeta;
};

@Injectable()
export class ServiceService {
  private readonly defaultServiceCategories = [
    'Consultation',
    'Medical Examination',
    'Therapy Session',
    'Dental Session',
    'Laboratory Test',
    'Radiology',
    'Vaccination',
    'Cosmetic Procedure',
    'Wellness or Counseling',
    'Follow-up / Reevaluation',
  ];

  constructor(
    @InjectModel('Service') private readonly serviceModel: Model<Service>,
    @InjectModel('ServiceCategory')
    private readonly serviceCategoryModel: Model<ServiceCategory>,
    @InjectModel('ClinicService')
    private readonly clinicServiceModel: Model<ClinicService>,
    @InjectModel('Appointment')
    private readonly appointmentModel: Model<Appointment>,
    @InjectModel('Notification')
    private readonly notificationModel: Model<Notification>,
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('DoctorService')
    private readonly doctorServiceModel: Model<DoctorService>,
    @InjectModel('Clinic') private readonly clinicModel: Model<Clinic>,
    @InjectModel('Complex') private readonly complexModel: Model<Complex>,
    @InjectModel('EmployeeShift')
    private readonly employeeShiftModel: Model<EmployeeShift>,
    @InjectModel('Invoice') private readonly invoiceModel: Model<Invoice>,
    private readonly serviceOfferService: ServiceOfferService,
    private readonly sessionManagerService: SessionManagerService,
  ) {}

  private canSeeInactiveByDefault(requestingUser?: TenantUser): boolean {
    return ['super_admin', 'owner', 'admin'].includes(
      String((requestingUser as any)?.role || '').toLowerCase(),
    );
  }

  async createService(createDto: CreateServiceWithSessionsDto, creatingUser?: TenantUser): Promise<Service> {
    // Validate service name length
    if (createDto.name.trim().length < 2) {
      throw new BadRequestException(
        'Service name must be at least 2 characters long',
      );
    }

    if (createDto.name.length > 100) {
      throw new BadRequestException(
        'Service name cannot exceed 100 characters',
      );
    }

    // Check for duplicates only within the same clinic or complex
    const duplicateValidationQuery: any = {
      name: { $regex: new RegExp(`^${createDto.name.trim()}$`, 'i') }, // Case-insensitive exact match
      deletedAt: { $exists: false },
    };

    // If this is for a specific complex, check within that complex only
    if (createDto.complexId) {
      duplicateValidationQuery.complexId = new Types.ObjectId(
        createDto.complexId,
      );
      duplicateValidationQuery.clinicId = { $exists: false }; // Ensure it's not a clinic-specific service

      // Check if service already exists in this complex
      const existing = await this.serviceModel.findOne(
        duplicateValidationQuery,
      );
      if (existing) {
        throw new BadRequestException(
          `Service "${createDto.name}" already exists in this complex. Please choose a different name.`,
        );
      }
    }

    // If this is for a specific clinic, check within that clinic only
    if (createDto.clinicId) {
      duplicateValidationQuery.clinicId = new Types.ObjectId(
        createDto.clinicId,
      );
      duplicateValidationQuery.complexId = { $exists: false }; // Ensure it's not a complex service

      // Check if service already exists for this clinic
      const existing = await this.serviceModel.findOne(
        duplicateValidationQuery,
      );
      if (existing) {
        throw new BadRequestException(
          `Service "${createDto.name}" already exists for this clinic. Please choose a different name.`,
        );
      }
    }

    // Create service data
    const serviceData: any = {
      name: createDto.name.trim(),
      description: createDto.description?.trim() || undefined,
      durationMinutes: createDto.durationMinutes || 30,
      price: createDto.price || 0,
      serviceCategory: createDto.serviceCategory?.trim() || undefined,
      requiredEquipment: createDto.requiredEquipment?.trim() || undefined,
      ...(creatingUser?.subscriptionId
        ? { subscriptionId: new Types.ObjectId(creatingUser.subscriptionId) }
        : {}),
    };

    // Add complex ID only if provided
    if (createDto.complexId) {
      serviceData.complexId = new Types.ObjectId(
        createDto.complexId,
      );
    }

    // Add clinic ID only if provided (for clinic-specific services)
    if (createDto.clinicId) {
      serviceData.clinicId = new Types.ObjectId(createDto.clinicId);
    }

    const effectiveClinicIds = this.buildEffectiveClinicIds(
      createDto.clinicId,
      createDto.clinicIds,
    );
    if (effectiveClinicIds.length > 0) {
      serviceData.clinicIds = effectiveClinicIds.map(
        (clinicId) => new Types.ObjectId(clinicId),
      );
    }

    // Process sessions if provided (Requirements: 1.1-1.7)
    if (createDto.sessions && createDto.sessions.length > 0) {
      serviceData.sessions = this.sessionManagerService
        .validateAndProcessSessions(createDto.sessions, serviceData.durationMinutes)
        .map((session) => this.withLegacySessionAppointmentRequired(session));
    }

    if (serviceData.serviceCategory) {
      await this.ensureServiceCategoryExists(serviceData.serviceCategory);
    }

    const doctorAssignmentEntries =
      this.resolveDoctorAssignmentEntries(createDto);
    if (doctorAssignmentEntries.length > 0) {
      await this.validateDoctorAssignments(doctorAssignmentEntries);
    }

    const service = new this.serviceModel(serviceData);
    let savedService: Service;
    try {
      savedService = await service.save();
    } catch (error) {
      this.handleServiceDuplicateNameError(error, createDto.name);
      throw error;
    }

    // Create doctor assignments after service is persisted
    if (doctorAssignmentEntries.length > 0) {
      const assignmentResults = await this.processDoctorAssignments(
        (savedService._id as Types.ObjectId).toString(),
        doctorAssignmentEntries,
      );
      return {
        ...savedService.toObject(),
        doctorAssignments: assignmentResults,
      };
    }

    return savedService;
  }

  /**
   * Validates all doctor assignments upfront (before any DB write).
   */
  private async validateDoctorAssignments(
    assignments: Array<{ doctorId: string; clinicId: string }>,
  ): Promise<void> {
    const clinicIds = [...new Set(assignments.map((a) => a.clinicId))];

    const clinics = await this.clinicModel
      .find({ _id: { $in: clinicIds.map((id) => new Types.ObjectId(id)) } })
      .select('_id')
      .lean();
    const existingClinicIds = new Set(clinics.map((clinic) => clinic._id.toString()));

    for (const clinicId of clinicIds) {
      if (!existingClinicIds.has(clinicId)) {
        throw new BadRequestException({
          message: {
            ar: `العيادة ${clinicId} غير موجودة`,
            en: `Clinic ${clinicId} not found`,
          },
          clinicId,
        });
      }
    }

    for (const { doctorId, clinicId } of assignments) {
      // --- Doctor must exist and be active with role 'doctor' ---
      const doctor = await this.userModel.findOne({
        _id: new Types.ObjectId(doctorId),
        role: 'doctor',
        isActive: true,
      });
      if (!doctor) {
        throw new BadRequestException({
          message: {
            ar: `الطبيب ${doctorId} غير موجود أو غير نشط`,
            en: `Doctor ${doctorId} not found or inactive`,
          },
          doctorId,
        });
      }

      // --- Doctor must work at the clinic ---
      const doctorWorksAtClinic =
        doctor.clinicId?.toString() === clinicId ||
        (await this.employeeShiftModel.exists({
          userId: new Types.ObjectId(doctorId),
          entityType: 'clinic',
          entityId: new Types.ObjectId(clinicId),
          isActive: true,
        }));

      if (!doctorWorksAtClinic) {
        throw new BadRequestException({
          message: {
            ar: `الطبيب ${doctorId} لا يعمل في العيادة ${clinicId}`,
            en: `Doctor ${doctorId} does not work at clinic ${clinicId}`,
          },
          doctorId,
          clinicId,
        });
      }
    }
  }

  /**
   * Ensures ClinicService junction records exist and creates DoctorService
   * assignments for each doctor/clinic pair.
   */
  private async processDoctorAssignments(
    serviceId: string,
    assignments: Array<{ doctorId: string; clinicId: string }>,
  ): Promise<any[]> {
    const clinicIds = [...new Set(assignments.map((assignment) => assignment.clinicId))];
    for (const clinicId of clinicIds) {
      const existing = await this.clinicServiceModel.findOne({
        clinicId: new Types.ObjectId(clinicId),
        serviceId: new Types.ObjectId(serviceId),
      });
      if (!existing) {
        await this.clinicServiceModel.create({
          clinicId: new Types.ObjectId(clinicId),
          serviceId: new Types.ObjectId(serviceId),
          isActive: true,
        });
      } else if (!existing.isActive) {
        existing.isActive = true;
        await existing.save();
      }
    }

    const results: any[] = [];
    for (const { doctorId, clinicId } of assignments) {
      const doctorService = new this.doctorServiceModel({
        doctorId: new Types.ObjectId(doctorId),
        serviceId: new Types.ObjectId(serviceId),
        clinicId: new Types.ObjectId(clinicId),
        isActive: true,
      });
      results.push(await doctorService.save());
    }

    return results;
  }

  private resolveDoctorAssignmentEntries(
    createDto: CreateServiceWithSessionsDto,
  ): Array<{ doctorId: string; clinicId: string }> {
    const normalizedEntries: Array<{ doctorId: string; clinicId: string }> = [];

    const explicitAssignments = (createDto.doctorAssignments || []).filter(
      (assignment): assignment is DoctorClinicAssignmentDto =>
        !!assignment?.doctorId && !!assignment?.clinicId,
    );

    for (const assignment of explicitAssignments) {
      normalizedEntries.push({
        doctorId: assignment.doctorId,
        clinicId: assignment.clinicId,
      });
    }

    if (createDto.doctorIds && createDto.doctorIds.length > 0) {
      const effectiveClinicIds = this.buildEffectiveClinicIds(
        createDto.clinicId,
        createDto.clinicIds,
      );
      const fallbackClinicId =
        createDto.clinicId ||
        (effectiveClinicIds.length === 1 ? effectiveClinicIds[0] : undefined);

      if (!fallbackClinicId) {
        throw new BadRequestException({
          message: {
            ar: 'يجب تحديد معرّف عيادة واحد (clinicId) عند إرسال doctorIds أو استخدام doctorAssignments مع clinicId لكل طبيب',
            en: 'A single clinicId is required when doctorIds are provided, or use doctorAssignments with clinicId per doctor',
          },
        });
      }

      for (const doctorId of createDto.doctorIds) {
        normalizedEntries.push({
          doctorId,
          clinicId: fallbackClinicId,
        });
      }
    }

    const uniqueEntries = new Map<string, { doctorId: string; clinicId: string }>();
    for (const entry of normalizedEntries) {
      uniqueEntries.set(`${entry.doctorId}:${entry.clinicId}`, entry);
    }

    return [...uniqueEntries.values()];
  }

  private buildEffectiveClinicIds(
    clinicId?: string,
    clinicIds?: string[],
  ): string[] {
    const allClinicIds = [clinicId, ...(clinicIds || [])].filter(
      (value): value is string => !!value,
    );
    return [...new Set(allClinicIds)];
  }

  private withLegacySessionAppointmentRequired<T extends { appointmentRequired?: boolean }>(
    session: T,
  ): T & { apptRequired: boolean } {
    const appointmentRequired = session.appointmentRequired ?? true;
    return {
      ...session,
      appointmentRequired,
      apptRequired: appointmentRequired,
    };
  }

  private normalizePaginationOptions(options?: PaginationOptions): {
    page: number;
    limit: number;
    skip: number;
  } {
    const page = Math.max(1, Number(options?.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options?.limit) || 10));

    return {
      page,
      limit,
      skip: (page - 1) * limit,
    };
  }

  private buildPaginationMeta(
    total: number,
    page: number,
    limit: number,
  ): PaginationMeta {
    return {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  private async getPaginatedServicesByQuery(
    query: any,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Service>> {
    const { page, limit, skip } = this.normalizePaginationOptions(options);
    const allowedSortFields = new Set([
      'createdAt',
      'updatedAt',
      'name',
      'serviceCategory',
      'isActive',
      'price',
    ]);
    const sortField = allowedSortFields.has(options?.sortBy || '')
      ? String(options?.sortBy)
      : 'createdAt';
    const sortDirection = options?.sortOrder === 'asc' ? 1 : -1;

    const [data, total] = await Promise.all([
      this.serviceModel
        .find(query)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.serviceModel.countDocuments(query),
    ]);

    return {
      data,
      pagination: this.buildPaginationMeta(total, page, limit),
    };
  }

  async getServicesByComplex(
    complexId: string,
    requestingUser?: TenantUser,
  ): Promise<Service[]> {
    const tenantFilter = requestingUser ? buildTenantFilter(requestingUser) : {};
    const canSeeInactive = this.canSeeInactiveByDefault(requestingUser);
    return this.serviceModel
      .find({
        ...tenantFilter,
        complexId: new Types.ObjectId(complexId),
        ...(canSeeInactive ? {} : { isActive: true }),
        deletedAt: { $exists: false },
      })
      .exec();
  }

  async getServicesByComplexPaginated(
    complexId: string,
    options?: PaginationOptions,
    requestingUser?: TenantUser,
  ): Promise<PaginatedResult<Service>> {
    const canSeeInactive = this.canSeeInactiveByDefault(requestingUser);
    return this.getPaginatedServicesByQuery(
      {
        complexId: new Types.ObjectId(complexId),
        ...(canSeeInactive ? {} : { isActive: true }),
        deletedAt: { $exists: false },
      },
      options,
    );
  }

  async getAllServices(complexId?: string): Promise<Service[]> {
    const query: any = {
      isActive: true,
      deletedAt: { $exists: false },
    };

    if (complexId) {
      query.complexId = new Types.ObjectId(complexId);
    }

    return this.serviceModel.find(query).exec();
  }

  async getAllServicesPaginated(
    complexIdParam?: string,
    options?: PaginationOptions,
    userRole?: string,
    userComplexId?: string,
    userClinicId?: string,
    subscriptionId?: string,
    requestingUser?: TenantUser,
  ): Promise<PaginatedResult<Service>> {
    const tenantFilter = requestingUser ? buildTenantFilter(requestingUser) : {};
    const canSeeInactive = this.canSeeInactiveByDefault(requestingUser);
    const query: any = {
      ...tenantFilter,
      deletedAt: { $exists: false },
      ...(canSeeInactive ? {} : { isActive: true }),
    };

    if (typeof options?.isActive === 'boolean') {
      query.isActive = options.isActive;
    }

    if (complexIdParam && Types.ObjectId.isValid(complexIdParam)) {
      // Explicit complexId filter (e.g., owner narrowing to a specific complex)
      query.complexId = new Types.ObjectId(complexIdParam);
    } else if (
      userRole === 'admin' || userRole === 'manager' ||
      userRole === 'staff' || userRole === 'doctor'
    ) {
      // Resolve the complex for this user: prefer direct complexId, fallback to clinic lookup
      let effectiveComplexId = userComplexId && Types.ObjectId.isValid(userComplexId)
        ? userComplexId
        : null;

      if (!effectiveComplexId && userClinicId && Types.ObjectId.isValid(userClinicId)) {
        const clinic = await this.clinicModel
          .findById(new Types.ObjectId(userClinicId))
          .select('complexId')
          .lean();
        effectiveComplexId = (clinic as any)?.complexId?.toString() || null;
      }

      if (effectiveComplexId) {
        // { complexId: null } matches both absent-field and explicitly-null docs (global services)
        query.$or = [
          { complexId: new Types.ObjectId(effectiveComplexId) },
          { complexId: null },
        ];
      } else if (userClinicId && Types.ObjectId.isValid(userClinicId)) {
        // Standalone clinic plan (no complex) — return services assigned to this clinic
        const assignedServiceIds = await this.clinicServiceModel
          .find({ clinicId: new Types.ObjectId(userClinicId), isActive: true })
          .distinct('serviceId');
        if (assignedServiceIds.length > 0) {
          query._id = { $in: assignedServiceIds };
        } else {
          query._id = new Types.ObjectId('000000000000000000000000');
        }
      } else {
        // Scoped role but no complex or clinic found — deny all
        query._id = new Types.ObjectId('000000000000000000000000');
      }
    } else if (userRole === 'owner' && subscriptionId && Types.ObjectId.isValid(subscriptionId)) {
      // Owner: services for all complexes under their subscription + global
      const ownerComplexes = await this.complexModel
        .find({ subscriptionId: new Types.ObjectId(subscriptionId), deletedAt: { $exists: false } })
        .select('_id').lean();
      const ownerComplexIds = ownerComplexes.map((c: any) => c._id);
      if (ownerComplexIds.length > 0) {
        query.$or = [
          { complexId: { $in: ownerComplexIds } },
          { complexId: null },
        ];
      }
    }
    // super_admin / owner without subscription → unrestricted

    if (options?.search?.trim()) {
      const q = options.search.trim();
      // Strip display-ID prefix so "SER-A1B2" → "A1B2" matches the raw ObjectId string
      const idTerm = q.replace(/^SER-?/i, '').trim();

      const searchOr: any[] = [
        { name: { $regex: q, $options: 'i' } },
        { serviceCategory: { $regex: q, $options: 'i' } },
        // Partial match on ObjectId string (powers "SER-XXXX" and raw suffix searches)
        ...(idTerm.length > 0
          ? [{ $expr: { $regexMatch: { input: { $toString: '$_id' }, regex: idTerm, options: 'i' } } }]
          : []),
      ];

      if (Array.isArray(query.$or) && query.$or.length > 0) {
        query.$and = [...(query.$and || []), { $or: query.$or }, { $or: searchOr }];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    return this.getPaginatedServicesByQuery(query, options);
  }

  // New method: Validate service names for clinic onboarding to prevent duplicates across forms
  async validateServiceNamesForClinic(
    serviceNames: string[],
    complexId?: string,
  ): Promise<{ isValid: boolean; conflicts: string[]; suggestions: string[] }> {
    try {
      if (!serviceNames || serviceNames.length === 0) {
        return { isValid: true, conflicts: [], suggestions: [] };
      }

      // Clean and normalize service names
      const cleanedNames = serviceNames
        .map((name) => name.trim())
        .filter((name) => name.length > 0)
        .map((name) => name.toLowerCase());

      // Check for duplicates within the provided list
      const duplicatesInList = cleanedNames.filter(
        (name, index) => cleanedNames.indexOf(name) !== index,
      );

      if (duplicatesInList.length > 0) {
        return {
          isValid: false,
          conflicts: [...new Set(duplicatesInList)],
          suggestions: duplicatesInList.map((name) => `${name}-v2`),
        };
      }

      // Build query to check against existing services
      const query: any = {
        name: { $in: cleanedNames.map((name) => new RegExp(`^${name}$`, 'i')) },
        deletedAt: { $exists: false },
      };

      if (complexId) {
        query.complexId = new Types.ObjectId(complexId);
      } else {
        query.complexId = { $exists: false };
      }

      // Find existing services that conflict
      const existingServices = await this.serviceModel.find(query).exec();

      if (existingServices.length > 0) {
        const conflicts = existingServices.map((service) =>
          service.name.toLowerCase(),
        );
        const suggestions = conflicts.map(
          (name) => `${name}-${Date.now().toString().slice(-4)}`,
        );

        return {
          isValid: false,
          conflicts,
          suggestions,
        };
      }

      return { isValid: true, conflicts: [], suggestions: [] };
    } catch (error) {
      console.error('Error validating service names:', error);
      return { isValid: false, conflicts: [], suggestions: [] };
    }
  }

  // New method: Get all services for a clinic (including complex services)
  async getServicesForClinic(complexId?: string): Promise<Service[]> {
    try {
      const query: any = {
        isActive: true,
        deletedAt: { $exists: false },
      };

      if (complexId) {
        query.complexId = new Types.ObjectId(complexId);
      } else {
        query.complexId = { $exists: false };
      }

      return await this.serviceModel.find(query).exec();
    } catch (error) {
      console.error('Error getting services for clinic:', error);
      return [];
    }
  }

  async getServicesForClinicPaginated(
    complexId?: string,
    options?: PaginationOptions,
    requestingUser?: TenantUser,
  ): Promise<PaginatedResult<Service>> {
    try {
      const tenantFilter = requestingUser ? buildTenantFilter(requestingUser) : {};
      const canSeeInactive = this.canSeeInactiveByDefault(requestingUser);
      const query: any = {
        ...tenantFilter,
        deletedAt: { $exists: false },
        ...(canSeeInactive ? {} : { isActive: true }),
      };

      if (complexId) {
        query.complexId = new Types.ObjectId(complexId);
      } else {
        query.complexId = { $exists: false };
      }

      return this.getPaginatedServicesByQuery(query, options);
    } catch (error) {
      console.error('Error getting paginated services for clinic:', error);
      const { page, limit } = this.normalizePaginationOptions(options);
      return {
        data: [],
        pagination: this.buildPaginationMeta(0, page, limit),
      };
    }
  }

  async assignServicesToClinic(
    clinicId: string,
    assignDto: AssignServicesDto,
  ): Promise<ClinicService[]> {
    const results: ClinicService[] = [];

    for (const assignment of assignDto.serviceAssignments) {
      // Check if already assigned
      const existing = await this.clinicServiceModel.findOne({
        clinicId: new Types.ObjectId(clinicId),
        serviceId: new Types.ObjectId(assignment.serviceId),
      });

      if (existing) {
        // Update existing assignment
        existing.priceOverride = assignment.priceOverride;
        existing.isActive = assignment.isActive !== false;
        results.push(await existing.save());
      } else {
        // Create new assignment
        const clinicService = new this.clinicServiceModel({
          clinicId: new Types.ObjectId(clinicId),
          serviceId: new Types.ObjectId(assignment.serviceId),
          priceOverride: assignment.priceOverride,
          isActive: assignment.isActive !== false,
        });
        results.push(await clinicService.save());
      }
    }

    return results;
  }

  async getServicesByClinic(clinicId: string): Promise<Service[]> {
    // Get services linked via ClinicService junction table
    const clinicServices = await this.clinicServiceModel
      .find({
        clinicId: new Types.ObjectId(clinicId),
        isActive: true,
      })
      .populate({
        path: 'serviceId',
        select: 'name serviceCategory price isActive description',
        match: { isActive: true, deletedAt: { $exists: false } },
      })
      .exec();

    return clinicServices
      .map((cs) => cs.serviceId as unknown as Service)
      .filter(Boolean);
  }

  async getServicesByClinicPaginated(
    clinicId: string,
    options?: PaginationOptions,
    subscriptionId?: string,
    requestingUser?: TenantUser,
  ): Promise<PaginatedResult<Service>> {
    const { page, limit, skip } = this.normalizePaginationOptions(options);
    const canSeeInactive = this.canSeeInactiveByDefault(requestingUser);

    const clinicQuery: any = {
      clinicId: new Types.ObjectId(clinicId),
      isActive: true,
    };

    const [clinicServices, total] = await Promise.all([
      this.clinicServiceModel
        .find(clinicQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'serviceId',
          select: 'name serviceCategory price isActive description subscriptionId',
          match: canSeeInactive
            ? { deletedAt: { $exists: false } }
            : { isActive: true, deletedAt: { $exists: false } },
        })
        .exec(),
      this.clinicServiceModel.countDocuments(clinicQuery),
    ]);

    let data = clinicServices
      .map((cs) => cs.serviceId as unknown as Service)
      .filter(Boolean);

    // Tenant isolation: filter out services that don't belong to the requesting subscription
    if (subscriptionId) {
      data = data.filter(
        (s) => !s.subscriptionId || s.subscriptionId.toString() === subscriptionId,
      );
    }

    return {
      data,
      pagination: this.buildPaginationMeta(total, page, limit),
    };
  }

  async getServicesOwnedByClinic(clinicId: string): Promise<Service[]> {
    // Get services that are directly owned by this clinic
    return this.serviceModel
      .find({
        clinicId: new Types.ObjectId(clinicId),
        isActive: true,
        deletedAt: { $exists: false },
      })
      .exec();
  }

  async getServicesOwnedByClinicPaginated(
    clinicId: string,
    options?: PaginationOptions,
    requestingUser?: TenantUser,
  ): Promise<PaginatedResult<Service>> {
    const tenantFilter = requestingUser ? buildTenantFilter(requestingUser) : {};
    const canSeeInactive = this.canSeeInactiveByDefault(requestingUser);
    return this.getPaginatedServicesByQuery(
      {
        ...tenantFilter,
        clinicId: new Types.ObjectId(clinicId),
        ...(canSeeInactive ? {} : { isActive: true }),
        deletedAt: { $exists: false },
      },
      options,
    );
  }

  async getService(serviceId: string, requestingUser?: TenantUser): Promise<Service> {
    const tenantFilter = requestingUser ? buildTenantFilter(requestingUser) : {};
    const service = await this.serviceModel
      .findOne({
        ...tenantFilter,
        _id: new Types.ObjectId(serviceId),
        deletedAt: { $exists: false },
      })
      .exec();
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    return service;
  }

  async getAssignedDoctors(serviceId: string): Promise<any[]> {
    const doctorServices = await this.doctorServiceModel
      .find({
        serviceId: new Types.ObjectId(serviceId),
      })
      .populate('doctorId', 'firstName lastName email role profilePicture')
      .populate('clinicId', 'name')
      .sort({ createdAt: -1 })
      .exec();

    return doctorServices.map((ds: any) => {
      const plain = ds?.toObject ? ds.toObject() : { ...ds };
      return {
        assignmentId: plain._id,
        doctor: plain.doctorId,
        clinic: plain.clinicId,
        isActive: plain.isActive,
        assignedAt: plain.createdAt,
        deactivatedAt: plain.deactivatedAt ?? null,
      };
    });
  }

  /**
   * Fetch active (scheduled/confirmed/in_progress) and completed appointments for a service.
   * Returns separate Maps for O(1) lookup when enriching sessions and doctors:
   *   - bySession: { active: Map<sessionId, appt[]>, completed: Map<sessionId, appt[]> }
   *   - byDoctor:  { active: Map<doctorId, appt[]>, completed: Map<doctorId, appt[]> }
   */
  async getAppointmentMaps(serviceId: string): Promise<{
    bySession: { active: Map<string, any[]>; completed: Map<string, any[]> };
    byDoctor: { active: Map<string, any[]>; completed: Map<string, any[]> };
  }> {
    const appointments = await this.appointmentModel
      .find({
        serviceId: new Types.ObjectId(serviceId),
        status: { $in: ['scheduled', 'confirmed', 'in_progress', 'completed'] },
        deletedAt: { $exists: false },
      })
      .populate('patientId', 'firstName lastName patientNumber phone')
      .populate('doctorId', 'firstName lastName')
      .select(
        '_id sessionId doctorId patientId appointmentDate appointmentTime durationMinutes status urgency clinicId updatedAt',
      )
      .lean()
      .exec();

    const bySessionActive = new Map<string, any[]>();
    const bySessionCompleted = new Map<string, any[]>();
    const byDoctorActive = new Map<string, any[]>();
    const byDoctorCompleted = new Map<string, any[]>();

    for (const appt of appointments) {
      const shape = this.shapeAppointment(appt);
      const isCompleted = appt.status === 'completed';

      // Group by sessionId
      if (appt.sessionId) {
        const key = appt.sessionId.toString();
        if (isCompleted) {
          const list = bySessionCompleted.get(key) ?? [];
          list.push(shape);
          bySessionCompleted.set(key, list);
        } else {
          const list = bySessionActive.get(key) ?? [];
          list.push(shape);
          bySessionActive.set(key, list);
        }
      }

      // Group by doctorId
      const doctorKey = appt.doctorId?._id?.toString() ?? appt.doctorId?.toString();
      if (doctorKey) {
        if (isCompleted) {
          const list = byDoctorCompleted.get(doctorKey) ?? [];
          list.push(shape);
          byDoctorCompleted.set(doctorKey, list);
        } else {
          const list = byDoctorActive.get(doctorKey) ?? [];
          list.push(shape);
          byDoctorActive.set(doctorKey, list);
        }
      }
    }

    // Limit completed to last 10 per session/doctor (sorted by date desc)
    for (const [key, list] of bySessionCompleted) {
      bySessionCompleted.set(key, list.slice(0, 10));
    }
    for (const [key, list] of byDoctorCompleted) {
      byDoctorCompleted.set(key, list.slice(0, 10));
    }

    return {
      bySession: { active: bySessionActive, completed: bySessionCompleted },
      byDoctor: { active: byDoctorActive, completed: byDoctorCompleted },
    };
  }

  private shapeAppointment(appt: any): any {
    const patient = appt.patientId as any;
    const doctor = appt.doctorId as any;
    return {
      _id: appt._id,
      status: appt.status,
      urgency: appt.urgency ?? null,
      appointmentDate: appt.appointmentDate,
      appointmentTime: appt.appointmentTime,
      durationMinutes: appt.durationMinutes,
      clinicId: appt.clinicId,
      sessionId: appt.sessionId ?? null,
      patient: patient
        ? {
            _id: patient._id,
            name: `${patient.firstName ?? ''} ${patient.lastName ?? ''}`.trim(),
            patientNumber: patient.patientNumber ?? null,
            phone: patient.phone ?? null,
          }
        : null,
      doctor: doctor
        ? {
            _id: doctor._id,
            name: `${doctor.firstName ?? ''} ${doctor.lastName ?? ''}`.trim(),
          }
        : null,
    };
  }

  async buildEnrichedServiceResponse(service: any): Promise<any> {
    const plain = service?.toObject ? service.toObject() : { ...service };

    const clinicIdSet = new Set<string>();
    if (plain?.clinicId) {
      clinicIdSet.add(plain.clinicId.toString());
    }
    if (Array.isArray(plain?.clinicIds)) {
      for (const clinicId of plain.clinicIds) {
        if (clinicId) {
          clinicIdSet.add(clinicId.toString());
        }
      }
    }

    // Resolve serviceCategory: if stored as ObjectId, look up the name
    let serviceCategoryName: string | null = plain?.serviceCategory ?? null;
    if (serviceCategoryName && /^[a-f\d]{24}$/i.test(serviceCategoryName)) {
      const cat = await this.serviceCategoryModel
        .findById(serviceCategoryName)
        .select('name')
        .lean();
      if (cat) serviceCategoryName = (cat as any).name;
    }

    const [complexName, clinicsNames, doctorsNames] = await Promise.all([
      this.getComplexNameById(plain?.complexId),
      this.getClinicNamesByIds([...clinicIdSet]),
      this.getDoctorNamesByServiceId(plain?._id),
    ]);

    return {
      ...plain,
      serviceCategory: serviceCategoryName,
      description: plain?.description ?? null,
      requiredEquipment: plain?.requiredEquipment ?? null,
      complexName,
      clinicsNames,
      doctorsNames,
      category: serviceCategoryName,
    };
  }

  private async getComplexNameById(
    complexId?: Types.ObjectId | string,
  ): Promise<string | null> {
    if (!complexId) {
      return null;
    }

    const complex = await this.complexModel
      .findById(complexId)
      .select('name')
      .lean();

    return complex?.name ?? null;
  }

  private async getClinicNamesByIds(clinicIds: string[]): Promise<string[]> {
    if (!clinicIds.length) {
      return [];
    }

    const clinics = await this.clinicModel
      .find({ _id: { $in: clinicIds.map((id) => new Types.ObjectId(id)) } })
      .select('name')
      .lean();

    return clinics
      .map((clinic) => clinic?.name)
      .filter((name): name is string => !!name);
  }

  private async getDoctorNamesByServiceId(
    serviceId?: Types.ObjectId | string,
  ): Promise<string[]> {
    if (!serviceId || !Types.ObjectId.isValid(serviceId.toString())) {
      return [];
    }

    const assignments = await this.doctorServiceModel
      .find({
        serviceId: new Types.ObjectId(serviceId.toString()),
        isActive: true,
      })
      .populate('doctorId', 'firstName lastName')
      .lean();

    const names = new Set<string>();
    for (const assignment of assignments as any[]) {
      const doctor = assignment?.doctorId;
      const fullName = [doctor?.firstName, doctor?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();
      if (fullName) {
        names.add(fullName);
      }
    }

    return [...names];
  }

  async updateService(
    serviceId: string,
    updateDto: UpdateServiceWithSessionsDto,
    requestingUser?: TenantUser,
  ): Promise<Service> {
    const tenantFilter = requestingUser ? buildTenantFilter(requestingUser) : {};
    const service = await this.serviceModel.findOne({
      ...tenantFilter,
      _id: new Types.ObjectId(serviceId),
      deletedAt: { $exists: false },
    });
    if (!service) {
      throw new NotFoundException({
        message: {
          ar: 'الخدمة غير موجودة',
          en: 'Service not found',
        },
      });
    }

    // Detect critical changes that affect appointments
    const criticalChanges = this.detectCriticalChanges(service, updateDto);

    // If there are critical changes, check for active appointments
    if (criticalChanges.length > 0) {
      const affectedAppointments =
        await this.findAffectedAppointments(serviceId);

      if (affectedAppointments.length > 0 && !updateDto.confirmRescheduling) {
        throw new BadRequestException({
          message: {
            ar: `هذا التعديل سيؤثر على ${affectedAppointments.length} مواعيد نشطة. يرجى التأكيد لإعادة الجدولة`,
            en: `This change will affect ${affectedAppointments.length} active appointments. Please confirm to reschedule`,
          },
          requiresConfirmation: true,
          affectedAppointmentsCount: affectedAppointments.length,
          affectedAppointmentIds: affectedAppointments.map((a) =>
            (a._id as Types.ObjectId).toString(),
          ),
        });
      }

      // Mark appointments for rescheduling if confirmed
      if (updateDto.confirmRescheduling && affectedAppointments.length > 0) {
        await this.markAppointmentsForRescheduling(affectedAppointments);
      }
    }

    // Validate name uniqueness if name is being changed
    if (updateDto.name && updateDto.name.trim() !== service.name) {
      if (updateDto.name.trim().length < 2) {
        throw new BadRequestException(
          'Service name must be at least 2 characters long',
        );
      }

      if (updateDto.name.length > 100) {
        throw new BadRequestException(
          'Service name cannot exceed 100 characters',
        );
      }

      // Check for duplicate name
      const duplicateValidationQuery: any = {
        name: { $regex: new RegExp(`^${updateDto.name.trim()}$`, 'i') },
        _id: { $ne: new Types.ObjectId(serviceId) },
        deletedAt: { $exists: false },
      };

      if (service.complexId) {
        duplicateValidationQuery.complexId =
          service.complexId;
        duplicateValidationQuery.clinicId = { $exists: false };
      } else if (service.clinicId) {
        duplicateValidationQuery.clinicId = service.clinicId;
        duplicateValidationQuery.complexId = { $exists: false };
      }

      const existing = await this.serviceModel.findOne(
        duplicateValidationQuery,
      );
      if (existing) {
        throw new BadRequestException(
          `Service "${updateDto.name}" already exists. Please choose a different name.`,
        );
      }
    }

    // Update service fields
    if (updateDto.name !== undefined) {
      service.name = updateDto.name.trim();
    }
    if (updateDto.description !== undefined) {
      service.description = updateDto.description?.trim() || undefined;
    }
    if (updateDto.durationMinutes !== undefined) {
      service.durationMinutes = updateDto.durationMinutes;
    }
    if (updateDto.price !== undefined) {
      service.price = updateDto.price;
    }
    if (updateDto.serviceCategory !== undefined) {
      service.serviceCategory = updateDto.serviceCategory?.trim() || undefined;
      if (service.serviceCategory) {
        await this.ensureServiceCategoryExists(service.serviceCategory);
      }
    }
    if (updateDto.requiredEquipment !== undefined) {
      service.requiredEquipment = updateDto.requiredEquipment?.trim() || undefined;
    }

    if (updateDto.clinicIds !== undefined) {
      const clinicIds = this.buildEffectiveClinicIds(
        service.clinicId?.toString(),
        updateDto.clinicIds,
      );
      service.clinicIds = clinicIds.map((id) => new Types.ObjectId(id));
    }

    // Handle complexId change
    if (updateDto.complexId !== undefined) {
      if (updateDto.complexId) {
        service.complexId = new Types.ObjectId(
          updateDto.complexId,
        );
        service.clinicId = undefined; // Clear clinicId if setting complexId
      } else {
        service.complexId = undefined;
      }
    }

    // Handle clinicId change
    if (updateDto.clinicId !== undefined) {
      if (updateDto.clinicId) {
        service.clinicId = new Types.ObjectId(updateDto.clinicId);
        service.complexId = undefined; // Clear complexId if setting clinicId

        const clinicIds = this.buildEffectiveClinicIds(
          updateDto.clinicId,
          updateDto.clinicIds ?? service.clinicIds?.map((id) => id.toString()),
        );
        service.clinicIds = clinicIds.map((id) => new Types.ObjectId(id));
      } else {
        service.clinicId = undefined;
      }
    }

    // Handle session management (Requirements: 13.1-13.4, 14.2)
    if (updateDto.sessions !== undefined) {
      const effectiveDuration =
        updateDto.durationMinutes ?? service.durationMinutes;

      // Validate that removed sessions have no active appointments
      if (updateDto.removedSessionIds && updateDto.removedSessionIds.length > 0) {
        await this.sessionManagerService.validateSessionRemoval(
          serviceId,
          updateDto.removedSessionIds,
        );
      }

      // Replace sessions array (empty array = clear all sessions)
      if (updateDto.sessions.length > 0) {
        service.sessions = this.sessionManagerService
          .validateAndProcessSessions(updateDto.sessions, effectiveDuration)
          .map((session) => this.withLegacySessionAppointmentRequired(session)) as any;
      } else {
        service.sessions = [];
      }
    }

    try {
      const savedService = await service.save();
      return savedService;
    } catch (error) {
      this.handleServiceDuplicateNameError(error, updateDto.name ?? service.name);
      throw error;
    }
  }

  private handleServiceDuplicateNameError(
    error: any,
    serviceName?: string,
  ): never | void {
    if (error?.code !== 11000) {
      return;
    }

    const duplicateName =
      serviceName?.trim() ||
      error?.keyValue?.name ||
      'This service name';

    throw new BadRequestException({
      message: {
        ar: `اسم الخدمة "${duplicateName}" مستخدم بالفعل في نفس النطاق. يرجى اختيار اسم آخر`,
        en: `Service name "${duplicateName}" already exists in this scope. Please choose a different name.`,
      },
      code: 'SERVICE_NAME_ALREADY_EXISTS',
    });
  }

  async updateServiceCategory(
    serviceId: string,
    serviceCategory: string,
  ): Promise<Service> {
    const service = await this.serviceModel.findOne({
      _id: new Types.ObjectId(serviceId),
      deletedAt: { $exists: false },
    });

    if (!service) {
      throw new NotFoundException({
        message: {
          ar: 'الخدمة غير موجودة',
          en: 'Service not found',
        },
      });
    }

    service.serviceCategory = serviceCategory.trim();
    if (service.serviceCategory) {
      await this.ensureServiceCategoryExists(service.serviceCategory);
    }
    return service.save();
  }

  async getServiceCategoryList(): Promise<Array<{ id: string; name: string }>> {
    const configuredCategories = this.defaultServiceCategories;

    const existing = await this.serviceCategoryModel
      .find()
      .select('_id name')
      .lean();

    const existingNames = new Set(
      existing.map((item) => item.name.trim().toLowerCase()),
    );

    const missingNames = configuredCategories.filter(
      (name) => !existingNames.has(name.toLowerCase()),
    );

    if (missingNames.length > 0) {
      try {
        await this.serviceCategoryModel.insertMany(
          missingNames.map((name) => ({ name })),
          { ordered: false },
        );
      } catch {
        // Ignore duplicate key races; categories are fetched again below.
      }
    }

    const categories = await this.serviceCategoryModel
      .find()
      .select('_id name')
      .lean();

    const categoriesByName = new Map(
      categories.map((category) => [category.name.trim().toLowerCase(), category]),
    );

    return configuredCategories.map((name) => {
      const matched = categoriesByName.get(name.toLowerCase());
      return {
        id:
          matched?._id?.toString() ??
          name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
        name,
      };
    });
  }

  async createServiceCategory(name: string): Promise<{ name: string }> {
    const normalizedName = name.trim();

    if (!normalizedName) {
      throw new BadRequestException('Service category name is required');
    }

    if (normalizedName.length > 100) {
      throw new BadRequestException(
        'Service category name cannot exceed 100 characters',
      );
    }

    const existing = await this.serviceCategoryModel.findOne({
      name: { $regex: new RegExp(`^${normalizedName}$`, 'i') },
    });

    if (existing) {
      throw new BadRequestException(
        `Service category "${normalizedName}" already exists`,
      );
    }

    const created = await this.serviceCategoryModel.create({
      name: normalizedName,
    });

    return { name: created.name };
  }

  async updateServiceCategoryById(
    id: string,
    name: string,
  ): Promise<{ _id: string; name: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid service category ID');
    }

    const normalizedName = name.trim();

    if (!normalizedName) {
      throw new BadRequestException('Service category name is required');
    }

    if (normalizedName.length > 100) {
      throw new BadRequestException(
        'Service category name cannot exceed 100 characters',
      );
    }

    const existingWithSameName = await this.serviceCategoryModel.findOne({
      _id: { $ne: new Types.ObjectId(id) },
      name: { $regex: new RegExp(`^${normalizedName}$`, 'i') },
    });

    if (existingWithSameName) {
      throw new BadRequestException(
        `Service category "${normalizedName}" already exists`,
      );
    }

    const updated = await this.serviceCategoryModel.findByIdAndUpdate(
      id,
      { name: normalizedName },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Service category not found');
    }

    return {
      _id: (updated._id as Types.ObjectId).toString(),
      name: updated.name,
    };
  }

  private async ensureServiceCategoryExists(categoryName: string): Promise<void> {
    const normalizedName = categoryName.trim();
    if (!normalizedName) {
      return;
    }

    const existing = await this.serviceCategoryModel.findOne({
      name: { $regex: new RegExp(`^${normalizedName}$`, 'i') },
    });

    if (!existing) {
      try {
        await this.serviceCategoryModel.create({ name: normalizedName });
      } catch {
        // Ignore duplicate key races.
      }
    }
  }

  /**
   * Delete a single session from a service.
   * Blocks deletion if ANY appointment (any status) references this session.
   */
  async deleteSession(serviceId: string, sessionId: string): Promise<void> {
    const service = await this.serviceModel.findOne({
      _id: new Types.ObjectId(serviceId),
      deletedAt: { $exists: false },
    });
    if (!service) {
      throw new NotFoundException({
        message: { ar: 'الخدمة غير موجودة', en: 'Service not found' },
      });
    }

    const sessionExists = (service as any).sessions?.some(
      (s: any) => s._id?.toString() === sessionId,
    );
    if (!sessionExists) {
      throw new NotFoundException({
        message: { ar: 'الجلسة غير موجودة', en: 'Session not found' },
      });
    }

    const appointmentCount = await this.appointmentModel.countDocuments({
      serviceId: new Types.ObjectId(serviceId),
      sessionId: new Types.ObjectId(sessionId),
      isDeleted: { $ne: true },
    });

    if (appointmentCount > 0) {
      throw new ConflictException({
        message: {
          ar: 'لا يمكن حذف الجلسة — توجد سجلات مواعيد مرتبطة بها',
          en: 'Cannot delete session — it has existing appointment records',
        },
        code: 'CANNOT_DELETE_SESSION_WITH_APPOINTMENTS',
      });
    }

    // Remove the session and unset any nextSessionId references pointing to it
    await this.serviceModel.updateOne(
      { _id: new Types.ObjectId(serviceId) },
      {
        $pull: { sessions: { _id: new Types.ObjectId(sessionId) } } as any,
      },
    );

    // Clear nextSessionId references pointing to deleted session
    await this.serviceModel.updateOne(
      { _id: new Types.ObjectId(serviceId), 'sessions.nextSessionId': sessionId },
      { $unset: { 'sessions.$[elem].nextSessionId': '' } } as any,
      { arrayFilters: [{ 'elem.nextSessionId': sessionId }] },
    );
  }

  async deleteService(
    serviceId: string,
    userId?: string,
    requestingUser?: TenantUser,
  ): Promise<void> {
    const tenantFilter = requestingUser ? buildTenantFilter(requestingUser) : {};
    const service = await this.serviceModel.findOne({
      ...tenantFilter,
      _id: new Types.ObjectId(serviceId),
      deletedAt: { $exists: false },
    });
    if (!service) {
      throw new NotFoundException({
        message: {
          ar: 'الخدمة غير موجودة',
          en: 'Service not found',
        },
      });
    }

    // Check for active appointments
    const activeAppointments = await this.appointmentModel.countDocuments({
      serviceId: new Types.ObjectId(serviceId),
      status: { $in: ['scheduled', 'confirmed'] },
      isDeleted: { $ne: true },
    });

    if (activeAppointments > 0) {
      throw new BadRequestException({
        message: {
          ar: `لا يمكن حذف الخدمة لأنها تحتوي على ${activeAppointments} مواعيد نشطة`,
          en: `Cannot delete service because it has ${activeAppointments} active appointments`,
        },
        activeAppointmentsCount: activeAppointments,
      });
    }

    const linkedInvoices = await this.invoiceModel.countDocuments({
      ...tenantFilter,
      'services.serviceId': new Types.ObjectId(serviceId),
    });

    if (linkedInvoices > 0) {
      throw new BadRequestException({
        message: {
          ar: `لا يمكن حذف الخدمة لأنها مرتبطة بـ ${linkedInvoices} فاتورة`,
          en: `Cannot delete service because it is linked to ${linkedInvoices} invoice records`,
        },
        linkedInvoicesCount: linkedInvoices,
      });
    }

    await this.serviceModel.findByIdAndUpdate(serviceId, {
      deletedAt: new Date(),
      deletedBy: userId ? new Types.ObjectId(userId) : undefined,
      isActive: false,
    });
  }

  /**
   * Detects critical changes that would affect appointments
   */
  private detectCriticalChanges(
    service: Service,
    updateDto: UpdateServiceDto,
  ): string[] {
    const changes: string[] = [];

    if (
      updateDto.complexId !== undefined &&
      updateDto.complexId !== service.complexId?.toString()
    ) {
      changes.push('complexId');
    }

    if (
      updateDto.clinicId !== undefined &&
      updateDto.clinicId !== service.clinicId?.toString()
    ) {
      changes.push('clinicId');
    }

    // Duration changes might affect appointment scheduling
    if (
      updateDto.durationMinutes !== undefined &&
      updateDto.durationMinutes !== service.durationMinutes
    ) {
      changes.push('durationMinutes');
    }

    return changes;
  }

  /**
   * Finds appointments that would be affected by service changes
   */
  private async findAffectedAppointments(
    serviceId: string,
  ): Promise<Appointment[]> {
    return await this.appointmentModel
      .find({
        serviceId: new Types.ObjectId(serviceId),
        status: { $in: ['scheduled', 'confirmed'] },
        appointmentDate: { $gte: new Date() },
        deletedAt: { $exists: false },
      })
      .exec();
  }

  /**
   * Marks appointments for rescheduling
   */
  private async markAppointmentsForRescheduling(
    appointments: Appointment[],
  ): Promise<void> {
    if (appointments.length === 0) {
      return;
    }

    await this.appointmentModel.updateMany(
      { _id: { $in: appointments.map((a) => a._id) } },
      {
        $set: {
          status: 'scheduled', // Keep as scheduled but mark for rescheduling
          markedForReschedulingAt: new Date(),
          rescheduledReason: 'Service details changed - requires rescheduling',
        },
      },
    );
  }

  /**
   * Calculate service price with discount
   * Delegates to ServiceOfferService for discount calculation
   */
  async calculateServicePrice(
    serviceId: string,
    dto: CalculateServicePriceDto,
  ): Promise<PriceCalculation> {
    return this.serviceOfferService.calculateServicePrice(serviceId, dto);
  }

  /**
   * Change service status (activate/deactivate)
   * BZR-c3d4e5f6: When service status changes to inactive with active appointments,
   * all appointments must be marked for rescheduling.
   */
  async changeServiceStatus(
    serviceId: string,
    dto: ChangeServiceStatusDto,
    userId: string,
  ): Promise<any> {
    const service = await this.serviceModel.findById(serviceId);
    if (!service) {
      throw new NotFoundException({
        message: {
          ar: 'الخدمة غير موجودة',
          en: 'Service not found',
        },
      });
    }

    // Track active appointments for response
    let activeAppointments: Appointment[] = [];

    // If deactivating
    if (!dto.isActive) {
      // Validate reason is provided
      if (!dto.reason || dto.reason.trim().length < 10) {
        throw new BadRequestException({
          message: {
            ar: 'يجب تقديم سبب عند إلغاء تفعيل الخدمة (10 أحرف على الأقل)',
            en: 'Reason is required when deactivating service (minimum 10 characters)',
          },
        });
      }

      // Find active appointments
      activeAppointments = await this.appointmentModel.find({
        serviceId: new Types.ObjectId(serviceId),
        status: { $in: ['scheduled', 'confirmed'] },
        appointmentDate: { $gte: new Date() },
        deletedAt: { $exists: false },
      });

      if (activeAppointments.length > 0 && !dto.confirmRescheduling) {
        throw new BadRequestException({
          message: {
            ar: `الخدمة لديها ${activeAppointments.length} مواعيد نشطة. يرجى التأكيد لإعادة الجدولة`,
            en: `Service has ${activeAppointments.length} active appointments. Please confirm to reschedule`,
          },
          requiresConfirmation: true,
          activeAppointmentsCount: activeAppointments.length,
          affectedAppointmentIds: activeAppointments.map((a) =>
            (a._id as Types.ObjectId).toString(),
          ),
        });
      }

      // Mark appointments for rescheduling
      if (activeAppointments.length > 0 && dto.confirmRescheduling) {
        await this.appointmentModel.updateMany(
          { _id: { $in: activeAppointments.map((a) => a._id) } },
          {
            $set: {
              status: 'needs_rescheduling',
              notes: `Service deactivated: ${dto.reason}`,
              markedForReschedulingAt: new Date(),
              rescheduledReason: `Service deactivated: ${dto.reason}`,
            },
          },
        );

        // Send notifications
        if (dto.notifyPatients !== false) {
          const notifications = activeAppointments.map((appointment) => ({
            recipientId: appointment.patientId,
            title: {
              ar: 'إعادة جدولة موعد',
              en: 'Appointment Rescheduling Required',
            },
            message: {
              ar: `تم إلغاء تفعيل الخدمة "${service.name}". يرجى إعادة جدولة موعدك. السبب: ${dto.reason}`,
              en: `Service "${service.name}" has been deactivated. Please reschedule your appointment. Reason: ${dto.reason}`,
            },
            notificationType: 'appointment_cancelled',
            priority: 'high',
            relatedEntityType: 'appointment',
            relatedEntityId: appointment._id,
            deliveryMethod: 'in_app',
            deliveryStatus: 'pending',
          }));

          // Create notifications (using a simplified structure for now)
          for (const notif of notifications) {
            await this.notificationModel.create({
              recipientId: notif.recipientId,
              title:
                typeof notif.title === 'string' ? notif.title : notif.title.en,
              message:
                typeof notif.message === 'string'
                  ? notif.message
                  : notif.message.en,
              notificationType: notif.notificationType,
              priority: notif.priority,
              relatedEntityType: notif.relatedEntityType,
              relatedEntityId: notif.relatedEntityId,
              deliveryMethod: notif.deliveryMethod,
              deliveryStatus: notif.deliveryStatus,
            });
          }
        }
      }

      // Deactivate service
      service.isActive = false;
      service.deactivatedAt = new Date();
      service.deactivatedBy = new Types.ObjectId(userId);
      service.deactivationReason = dto.reason;
    } else {
      // Activate service
      service.isActive = true;
      service.deactivatedAt = undefined;
      service.deactivatedBy = undefined;
      service.deactivationReason = undefined;
    }

    const savedService = await service.save();

    // Return response based on status change
    if (!dto.isActive) {
      return {
        ...savedService.toObject(),
        affectedAppointments: {
          count: activeAppointments.length,
          status: 'needs_rescheduling',
          notificationsSent: dto.notifyPatients !== false,
        },
      };
    } else {
      return {
        ...savedService.toObject(),
        message: {
          ar: 'تم تفعيل الخدمة بنجاح',
          en: 'Service activated successfully',
        },
      };
    }
  }

  /**
   * Get active services only
   * Used for appointment booking dropdowns
   */
  async getActiveServices(
    complexId?: string,
    clinicId?: string,
  ): Promise<Service[]> {
    const query: any = {
      isActive: true,
      deletedAt: { $exists: false },
    };

    if (complexId) {
      query.complexId = new Types.ObjectId(complexId);
    }

    if (clinicId) {
      query.clinicId = new Types.ObjectId(clinicId);
    }

    const services = await this.serviceModel.find(query).exec();

    // Calculate appointment counts for each service
    const servicesWithCounts = await Promise.all(
      services.map(async (service) => {
        const [activeCount, totalCount] = await Promise.all([
          this.appointmentModel.countDocuments({
            serviceId: service._id,
            status: { $in: ['scheduled', 'confirmed'] },
            appointmentDate: { $gte: new Date() },
            deletedAt: { $exists: false },
          }),
          this.appointmentModel.countDocuments({
            serviceId: service._id,
            deletedAt: { $exists: false },
          }),
        ]);

        return {
          ...service.toObject(),
          activeAppointmentsCount: activeCount,
          totalAppointmentsCount: totalCount,
        };
      }),
    );

    return servicesWithCounts as any;
  }

  async getActiveServicesPaginated(
    complexId?: string,
    clinicId?: string,
    options?: PaginationOptions,
    requestingUser?: TenantUser,
  ): Promise<PaginatedResult<any>> {
    const tenantFilter = requestingUser ? buildTenantFilter(requestingUser) : {};
    const query: any = {
      ...tenantFilter,
      isActive: true,
      deletedAt: { $exists: false },
    };

    if (complexId) {
      query.complexId = new Types.ObjectId(complexId);
    }

    if (clinicId) {
      query.clinicId = new Types.ObjectId(clinicId);
    }

    const { page, limit, skip } = this.normalizePaginationOptions(options);

    const [services, total] = await Promise.all([
      this.serviceModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.serviceModel.countDocuments(query),
    ]);

    const servicesWithCounts = await Promise.all(
      services.map(async (service) => {
        const [activeCount, totalCount] = await Promise.all([
          this.appointmentModel.countDocuments({
            serviceId: service._id,
            status: { $in: ['scheduled', 'confirmed'] },
            appointmentDate: { $gte: new Date() },
            deletedAt: { $exists: false },
          }),
          this.appointmentModel.countDocuments({
            serviceId: service._id,
            deletedAt: { $exists: false },
          }),
        ]);

        return {
          ...service.toObject(),
          activeAppointmentsCount: activeCount,
          totalAppointmentsCount: totalCount,
        };
      }),
    );

    return {
      data: servicesWithCounts,
      pagination: this.buildPaginationMeta(total, page, limit),
    };
  }

  /**
   * Bulk status change for multiple services
   */
  async bulkStatusChange(
    dto: BulkStatusChangeDto,
    userId: string,
  ): Promise<{
    success: boolean;
    updated: number;
    failed: number;
    totalAffectedAppointments: number;
    results: Array<{
      serviceId: string;
      success: boolean;
      affectedAppointments: number;
      error?: string;
    }>;
  }> {
    const results: Array<{
      serviceId: string;
      success: boolean;
      affectedAppointments: number;
      error?: string;
    }> = [];

    let totalAffectedAppointments = 0;
    let updated = 0;
    let failed = 0;

    for (const serviceId of dto.serviceIds) {
      try {
        const service = await this.serviceModel.findById(serviceId);
        if (!service) {
          results.push({
            serviceId,
            success: false,
            affectedAppointments: 0,
            error: 'Service not found',
          });
          failed++;
          continue;
        }

        // If deactivating, check for active appointments
        let affectedCount = 0;
        if (!dto.isActive) {
          if (!dto.reason || dto.reason.trim().length < 10) {
            results.push({
              serviceId,
              success: false,
              affectedAppointments: 0,
              error:
                'Reason is required when deactivating (minimum 10 characters)',
            });
            failed++;
            continue;
          }

          const activeAppointments = await this.appointmentModel.find({
            serviceId: new Types.ObjectId(serviceId),
            status: { $in: ['scheduled', 'confirmed'] },
            appointmentDate: { $gte: new Date() },
            deletedAt: { $exists: false },
          });

          affectedCount = activeAppointments.length;

          if (affectedCount > 0 && !dto.confirmRescheduling) {
            results.push({
              serviceId,
              success: false,
              affectedAppointments: affectedCount,
              error: 'Confirmation required for rescheduling',
            });
            failed++;
            continue;
          }

          // Mark appointments for rescheduling
          if (affectedCount > 0 && dto.confirmRescheduling) {
            await this.appointmentModel.updateMany(
              { _id: { $in: activeAppointments.map((a) => a._id) } },
              {
                $set: {
                  status: 'needs_rescheduling',
                  notes: `Service deactivated: ${dto.reason}`,
                  markedForReschedulingAt: new Date(),
                  rescheduledReason: `Service deactivated: ${dto.reason}`,
                },
              },
            );

            // Send notifications
            if (dto.notifyPatients !== false) {
              const notifications = activeAppointments.map((appointment) => ({
                recipientId: appointment.patientId,
                title: `Service "${service.name}" Deactivated`,
                message: `Service "${service.name}" has been deactivated. Please reschedule your appointment. Reason: ${dto.reason}`,
                notificationType: 'appointment_cancelled',
                priority: 'high',
                relatedEntityType: 'appointment',
                relatedEntityId: appointment._id,
                deliveryMethod: 'in_app',
                deliveryStatus: 'pending',
              }));

              for (const notif of notifications) {
                await this.notificationModel.create(notif);
              }
            }
          }

          // Deactivate service
          service.isActive = false;
          service.deactivatedAt = new Date();
          service.deactivatedBy = new Types.ObjectId(userId);
          service.deactivationReason = dto.reason;
        } else {
          // Activate service
          service.isActive = true;
          service.deactivatedAt = undefined;
          service.deactivatedBy = undefined;
          service.deactivationReason = undefined;
        }

        await service.save();
        totalAffectedAppointments += affectedCount;
        updated++;
        results.push({
          serviceId,
          success: true,
          affectedAppointments: affectedCount,
        });
      } catch (error) {
        results.push({
          serviceId,
          success: false,
          affectedAppointments: 0,
          error: error.message || 'Unknown error',
        });
        failed++;
      }
    }

    return {
      success: true,
      updated,
      failed,
      totalAffectedAppointments,
      results,
    };
  }

  /**
   * Get clinic and doctor IDs from junction tables for a given set of service IDs.
   * Scoped to the authenticated user's subscription to prevent cross-tenant data leakage.
   */
  async getHeaderFilter(
    serviceIds: string[],
    userScope: {
      subscriptionId?: string;
      complexId?: string;
      clinicId?: string;
      clinicIds?: string[];
      role?: string;
      userId?: string;
      id?: string;
    },
    clinicIdParam?: string,
  ): Promise<{ clinicIds: Types.ObjectId[]; doctorIds: Types.ObjectId[] }> {
    if (!serviceIds.length) {
      return { clinicIds: [], doctorIds: [] };
    }

    // Build a clinic filter scoped to the user's actual access level.
    // Priority mirrors the /clinics endpoint: most-specific scope wins.
    const clinicScopeFilter: any = { deletedAt: { $exists: false } };
    const role = userScope.role;
    if (role === 'super_admin') {
      // no restriction
    } else if (role === 'owner') {
      if (userScope.subscriptionId && Types.ObjectId.isValid(userScope.subscriptionId)) {
        clinicScopeFilter.subscriptionId = new Types.ObjectId(userScope.subscriptionId);
      }
    } else {
      // admin, manager, doctor, staff — scope to the most specific identifier available
      const scopedClinicIds = Array.isArray(userScope.clinicIds)
        ? userScope.clinicIds.filter((id) => Types.ObjectId.isValid(id))
        : [];
      if (scopedClinicIds.length > 0) {
        clinicScopeFilter._id = {
          $in: scopedClinicIds.map((id) => new Types.ObjectId(id)),
        };
      } else if (userScope.clinicId && Types.ObjectId.isValid(userScope.clinicId)) {
        clinicScopeFilter._id = new Types.ObjectId(userScope.clinicId);
      } else if (userScope.complexId && Types.ObjectId.isValid(userScope.complexId)) {
        clinicScopeFilter.complexId = new Types.ObjectId(userScope.complexId);
      } else if (userScope.subscriptionId && Types.ObjectId.isValid(userScope.subscriptionId)) {
        clinicScopeFilter.subscriptionId = new Types.ObjectId(userScope.subscriptionId);
      }
    }

    // If a specific clinicId is requested from the frontend, ensure it's within the allowed scope
    if (clinicIdParam && Types.ObjectId.isValid(clinicIdParam)) {
      const requestedClinicId = new Types.ObjectId(clinicIdParam);
      if (clinicScopeFilter._id && clinicScopeFilter._id.$in) {
        const allowed = clinicScopeFilter._id.$in.some(
          (id: any) => id.toString() === requestedClinicId.toString(),
        );
        if (!allowed) {
          return { clinicIds: [], doctorIds: [] };
        }
        clinicScopeFilter._id = requestedClinicId;
      } else if (clinicScopeFilter._id) {
        // If already scoped to a clinic, it MUST match
        if (clinicScopeFilter._id.toString() !== requestedClinicId.toString()) {
          return { clinicIds: [], doctorIds: [] };
        }
      } else {
        // Narrow the scope to this specific clinic
        clinicScopeFilter._id = requestedClinicId;
      }
    }

    // Get the clinic IDs accessible to this user
    const allowedClinics = (await this.clinicModel
      .find(clinicScopeFilter)
      .distinct('_id')) as any[];

    if (allowedClinics.length === 0) {
      return { clinicIds: [], doctorIds: [] };
    }

    const validServiceIds = serviceIds.filter((id) => Types.ObjectId.isValid(id));
    if (validServiceIds.length === 0) {
      return { clinicIds: [], doctorIds: [] };
    }

    const serviceObjectIds = validServiceIds.map((id) => new Types.ObjectId(id));

    const junctionFilter = {
      serviceId: { $in: serviceObjectIds },
      clinicId: { $in: allowedClinics },
      isActive: true,
    };

    const [mappedClinicIds, mappedDoctorIds] = (await Promise.all([
      this.clinicServiceModel.find(junctionFilter).distinct('clinicId'),
      this.doctorServiceModel.find(junctionFilter).distinct('doctorId'),
    ])) as [any[], any[]];

    // Root-Cause Fix: Permission Defaults
    // getHeaderFilter only returned items from junction tables.
    // AppointmentValidationService is permissive if 0 records exist.
    // We must mirror that logic here so the UI (calendar) shows all doctors
    // when a service is selected but has no specific assignments.

    let finalClinicIds = mappedClinicIds;
    let finalDoctorIds = mappedDoctorIds;

    // Also union the Service.clinicIds field on the service document itself.
    // The service document carries its own clinicIds list (the source of truth used
    // by the service-details UI). When a clinic was assigned via this field but no
    // ClinicService junction record was created, the calendar filter would otherwise
    // miss it. Filter to user's allowed scope so role boundaries are preserved.
    const serviceDocsForClinicUnion = (await this.serviceModel
      .find({ _id: { $in: serviceObjectIds }, deletedAt: { $exists: false } })
      .select('clinicIds')
      .lean()
      .exec()) as any[];
    const allowedClinicStringSet = new Set(
      (allowedClinics as any[]).map((id) => id.toString()),
    );
    const finalClinicIdStringSet = new Set(
      (finalClinicIds as any[]).map((id) => id.toString()),
    );
    for (const svc of serviceDocsForClinicUnion) {
      if (!Array.isArray(svc.clinicIds)) continue;
      for (const cid of svc.clinicIds) {
        const cidStr = cid?.toString();
        if (
          cidStr &&
          allowedClinicStringSet.has(cidStr) &&
          !finalClinicIdStringSet.has(cidStr)
        ) {
          finalClinicIds.push(new Types.ObjectId(cidStr));
          finalClinicIdStringSet.add(cidStr);
        }
      }
    }

    // For each service, check if it has explicit assignments in our clinics.
    // If ANY service in the set has 0 assignments, then ALL doctors in those clinics
    // are authorized for that specific service, so they MUST be in the union.
    
    let isAnyServicePermissive = false;
    for (const sId of serviceObjectIds) {
      const count = await this.doctorServiceModel.countDocuments({
        serviceId: sId,
        clinicId: { $in: allowedClinics },
        isActive: true,
      });
      if (count === 0) {
        isAnyServicePermissive = true;
        break;
      }
    }

    if (isAnyServicePermissive) {
      // PERMISSIVE: At least one selected service allows all doctors in these clinics
      const doctorMatch: any = {
        role: 'doctor',
        isActive: true,
        $or: [
          { clinicId: { $in: allowedClinics } },
          { clinicIds: { $in: allowedClinics } },
        ],
        deletedAt: { $exists: false },
      };

      // ROLE-BASED RESTRICTION: Doctors can ONLY see themselves
      if (userScope.role === 'doctor') {
        doctorMatch._id = new Types.ObjectId(userScope.userId || userScope.id);
      }

      finalDoctorIds = (await this.userModel.find(doctorMatch).distinct('_id')) as any[];
    }

    // ROLE-BASED RESTRICTION: Even for non-permissive services, a doctor should only see themselves
    if (userScope.role === 'doctor') {
      const selfId = new Types.ObjectId(userScope.userId || userScope.id);
      finalDoctorIds = finalDoctorIds.filter(id => id.toString() === selfId.toString());
      // If the doctor is not in the assigned list for a non-permissive service, 
      // they effectively see no doctors (themselves included) for that service union.
    }

    // Similarly for clinics
    let isAnyServiceClinicPermissive = false;
    for (const sId of serviceObjectIds) {
      // Must be global per service (not limited to allowedClinics) to stay
      // consistent with appointment validation logic.
      const count = await this.clinicServiceModel.countDocuments({
        serviceId: sId,
        isActive: true,
      });
      if (count === 0) {
        isAnyServiceClinicPermissive = true;
        break;
      }
    }

    if (isAnyServiceClinicPermissive) {
      finalClinicIds = allowedClinics;
    }

    // If no clinics are valid for selected services, doctors list must also be empty.
    if (!finalClinicIds.length) {
      finalDoctorIds = [];
    }

    return { clinicIds: finalClinicIds, doctorIds: finalDoctorIds };
  }

  // ==================== Doctor Assignment Methods (PART H) ====================

  /**
   * Assign a doctor to a service with a custom price.
   * If the doctor is already assigned (even inactive), reactivates and updates the price.
   * PART H
   */
  async addDoctorAssignment(
    serviceId: string,
    doctorId: string,
    price: number,
  ): Promise<Service> {
    const service = await this.serviceModel
      .findOne({ _id: new Types.ObjectId(serviceId), deletedAt: { $exists: false } })
      .exec();
    if (!service) {
      throw new NotFoundException({
        message: { ar: 'الخدمة غير موجودة', en: 'Service not found' },
      });
    }

    // Check if doctor exists
    const doctor = await this.userModel
      .findOne({ _id: new Types.ObjectId(doctorId), deletedAt: { $exists: false } })
      .exec();
    if (!doctor) {
      throw new NotFoundException({
        message: { ar: 'الطبيب غير موجود', en: 'Doctor not found' },
      });
    }

    const doctorObjectId = new Types.ObjectId(doctorId);
    const existing = service.doctorAssignments?.find(
      (a) => a.doctorId.toString() === doctorId,
    );

    if (existing) {
      // Reactivate and update price via arrayFilter
      await this.serviceModel.updateOne(
        { _id: service._id },
        {
          $set: {
            'doctorAssignments.$[item].price': price,
            'doctorAssignments.$[item].status': 'active',
          },
        },
        { arrayFilters: [{ 'item.doctorId': doctorObjectId }] },
      );
    } else {
      // Push new assignment
      await this.serviceModel.updateOne(
        { _id: service._id },
        {
          $push: {
            doctorAssignments: { doctorId: doctorObjectId, price, status: 'active' },
          },
        },
      );
    }

    return this.serviceModel.findById(service._id).exec() as Promise<Service>;
  }

  /**
   * Deactivate a doctor assignment for a service (soft-deactivate).
   * PART H
   */
  async deactivateDoctorAssignment(
    serviceId: string,
    doctorId: string,
  ): Promise<Service> {
    const service = await this.serviceModel
      .findOne({ _id: new Types.ObjectId(serviceId), deletedAt: { $exists: false } })
      .exec();
    if (!service) {
      throw new NotFoundException({
        message: { ar: 'الخدمة غير موجودة', en: 'Service not found' },
      });
    }

    const doctorObjectId = new Types.ObjectId(doctorId);
    const existing = service.doctorAssignments?.find(
      (a) => a.doctorId.toString() === doctorId && a.status === 'active',
    );
    if (!existing) {
      throw new NotFoundException({
        message: {
          ar: 'تعيين الطبيب غير موجود أو غير نشط',
          en: 'Doctor assignment not found or already inactive',
        },
      });
    }

    await this.serviceModel.updateOne(
      { _id: service._id },
      { $set: { 'doctorAssignments.$[item].status': 'inactive' } },
      { arrayFilters: [{ 'item.doctorId': doctorObjectId }] },
    );

    return this.serviceModel.findById(service._id).exec() as Promise<Service>;
  }

  /**
   * Get the effective price for a specific doctor on this service.
   * Returns the doctor's custom price if active, or the service base price as fallback.
   * PART H
   */
  async getDoctorPrice(
    serviceId: string,
    doctorId: string,
  ): Promise<{ price: number; source: 'doctor_assignment' | 'service_base' }> {
    const service = await this.serviceModel
      .findOne({ _id: new Types.ObjectId(serviceId), deletedAt: { $exists: false } })
      .exec();
    if (!service) {
      throw new NotFoundException({
        message: { ar: 'الخدمة غير موجودة', en: 'Service not found' },
      });
    }

    const assignment = service.doctorAssignments?.find(
      (a) => a.doctorId.toString() === doctorId && a.status === 'active',
    );

    if (assignment) {
      return { price: assignment.price, source: 'doctor_assignment' };
    }

    return { price: service.price ?? 0, source: 'service_base' };
  }

  /**
   * Get service status history
   * Note: This requires a separate StatusHistory schema for full audit trail.
   * For now, returns basic information from service document.
   */
  async getStatusHistory(
    serviceId: string,
    requestingUser?: TenantUser,
  ): Promise<any[]> {
    const tenantFilter = requestingUser ? buildTenantFilter(requestingUser) : {};
    const service = await this.serviceModel
      .findOne({
        ...tenantFilter,
        _id: new Types.ObjectId(serviceId),
      })
      .exec();

    if (!service) {
      throw new NotFoundException({
        message: {
          ar: 'الخدمة غير موجودة',
          en: 'Service not found',
        },
      });
    }

    // For now, return basic status information
    // In a full implementation, this would query a separate StatusHistory collection
    const history: any[] = [];

    if (service.deactivatedAt && service.deactivatedBy) {
      // Populate user information
      const user = await this.userModel
        .findById(service.deactivatedBy)
        .select('firstName lastName')
        .exec();

      history.push({
        changedAt: service.deactivatedAt,
        changedBy: user
          ? {
              _id: user._id,
              firstName: user.firstName,
              lastName: user.lastName,
            }
          : null,
        previousStatus: true,
        newStatus: false,
        reason: service.deactivationReason,
        affectedAppointmentsCount: 0, // Would need to calculate from history
      });
    }

    // Note: Full implementation would require a StatusHistory schema
    // that tracks all status changes with timestamps

    return history;
  }

  /**
   * Get comprehensive statistics for a specific service based on appointment history
   * Requirements: Utilization metrics, Operational details
   */
  async getServiceStats(serviceId: string, requestingUser?: TenantUser): Promise<any> {
    const tenantFilter = requestingUser ? buildTenantFilter(requestingUser) : {};
    const service = await this.serviceModel.findOne({
      ...tenantFilter,
      _id: new Types.ObjectId(serviceId),
    });
    if (!service) {
      throw new NotFoundException({
        message: {
          ar: 'الخدمة غير موجودة',
          en: 'Service not found',
        },
      });
    }

    const serviceObjectId = new Types.ObjectId(serviceId);
    const appointmentTenantFilter =
      tenantFilter.subscriptionId && Types.ObjectId.isValid(tenantFilter.subscriptionId)
        ? { subscriptionId: new Types.ObjectId(tenantFilter.subscriptionId) }
        : {};

    const statsResult = await this.appointmentModel.aggregate([
      {
        $match: {
          serviceId: serviceObjectId,
          isDeleted: { $ne: true },
          ...appointmentTenantFilter,
        },
      },
      {
        $facet: {
          utilization: [
            {
              $group: {
                _id: null,
                totalCount: { $sum: 1 },
                noShowCount: {
                  $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] },
                },
                completedCount: {
                  $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
                },
                activeCount: {
                  $sum: {
                    $cond: [
                      {
                        $in: [
                          '$status',
                          ['scheduled', 'confirmed', 'in_progress'],
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                totalDuration: {
                  $sum: {
                    $cond: [
                      { $eq: ['$status', 'completed'] },
                      '$durationMinutes',
                      0,
                    ],
                  },
                },
                lastPerformedDate: {
                  $max: {
                    $cond: [
                      { $eq: ['$status', 'completed'] },
                      '$appointmentDate',
                      null,
                    ],
                  },
                },
              },
            },
          ],
          patientGroups: [
            {
              $group: {
                _id: '$patientId',
                appointmentCount: { $sum: 1 },
              },
            },
            {
              $group: {
                _id: null,
                totalDistinctPatients: { $sum: 1 },
                rebookedPatientsCount: {
                  $sum: { $cond: [{ $gt: ['$appointmentCount', 1] }, 1, 0] },
                },
              },
            },
          ],
          frequentDoctor: [
            { $group: { _id: '$doctorId', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 1 },
            {
              $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'doctor',
              },
            },
            { $unwind: { path: '$doctor', preserveNullAndEmptyArrays: true } },
            {
              $project: {
                doctor_id: '$_id',
                doctor_name: {
                  $concat: ['$doctor.firstName', ' ', '$doctor.lastName'],
                },
              },
            },
          ],
          frequentClinic: [
            { $group: { _id: '$clinicId', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 1 },
            {
              $lookup: {
                from: 'clinics',
                localField: '_id',
                foreignField: '_id',
                as: 'clinic',
              },
            },
            { $unwind: { path: '$clinic', preserveNullAndEmptyArrays: true } },
            {
              $project: {
                clinic_id: '$_id',
                clinic_name: '$clinic.name',
              },
            },
          ],
        },
      },
    ]).option({ maxTimeMS: 10000 });

    const data = statsResult[0];
    const utilization = data.utilization[0] || {};
    const patientStats = data.patientGroups[0] || {};
    const frequentDoctor = data.frequentDoctor[0] || null;
    const frequentClinic = data.frequentClinic[0] || null;

    const totalPatientsServed = patientStats.totalDistinctPatients || 0;
    const completedSessions = utilization.completedCount || 0;
    const activeAppointments = utilization.activeCount || 0;
    const avgDuration =
      completedSessions > 0
        ? Math.round(utilization.totalDuration / completedSessions)
        : 0;

    const noShowRate =
      utilization.totalCount > 0
        ? parseFloat(
            ((utilization.noShowCount / utilization.totalCount) * 100).toFixed(
              1,
            ),
          )
        : 0;

    const rebookingRate =
      patientStats.totalDistinctPatients > 0
        ? parseFloat(
            (
              (patientStats.rebookedPatientsCount /
                patientStats.totalDistinctPatients) *
              100
            ).toFixed(1),
          )
        : 0;

    return {
      service_id: serviceId,
      utilization_metrics: {
        total_patients_served: totalPatientsServed,
        active_appointments: activeAppointments,
        completed_sessions: completedSessions,
        average_duration_mins: avgDuration,
        no_show_rate: noShowRate,
        rebooking_rate: rebookingRate,
      },
      operational_details: {
        last_performed_date: utilization.lastPerformedDate || null,
        most_frequent_doctor: frequentDoctor,
        most_frequent_clinic: frequentClinic,
      },
    };
  }
}
