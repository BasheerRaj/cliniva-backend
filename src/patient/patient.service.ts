import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import { Patient } from '../database/schemas/patient.schema';
import { Appointment } from '../database/schemas/appointment.schema';
import { Invoice } from '../database/schemas/invoice.schema';
import { AuditService } from '../auth/audit.service';
import { ERROR_MESSAGES } from '../common/utils/error-messages.constant';
import {
  CreatePatientDto,
  UpdatePatientDto,
  PatientSearchQueryDto,
  UpdateMedicalHistoryDto,
  CreateEmergencyContactDto,
  PatientStatsDto,
  PatientResponseDto,
  PatientListQueryDto,
  PatientListItemDto,
} from './dto';
import { PatientScopeContext } from './types/patient-scope-context.interface';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class PatientService {
  private readonly logger = new Logger(PatientService.name);

  constructor(
    @InjectModel('Patient') private readonly patientModel: Model<Patient>,
    @InjectModel('Appointment')
    private readonly appointmentModel: Model<Appointment>,
    @InjectModel('Invoice') private readonly invoiceModel: Model<Invoice>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Generate a patient number derived from a pre-generated MongoDB ObjectId.
   * Format: PAT-{last 5 hex chars of _id}  e.g. PAT-a3f9c
   */
  private generatePatientNumber(): { patientNumber: string; _id: Types.ObjectId } {
    const _id = new Types.ObjectId();
    const patientNumber = `PAT-${_id.toString().slice(-5)}`;
    return { patientNumber, _id };
  }

  /**
   * Validate patient data
   */
  private async validatePatientData(
    patientDto: CreatePatientDto | UpdatePatientDto,
    isUpdate = false,
    patientId?: string,
  ): Promise<void> {
    // Check if cardNumber is being updated (not allowed per business rules)
    if (isUpdate && 'cardNumber' in patientDto) {
      throw new BadRequestException(ERROR_MESSAGES.CARD_NUMBER_NOT_EDITABLE);
    }

    // Check for duplicate card number (m5.json business rule)
    if ('cardNumber' in patientDto && patientDto.cardNumber) {
      const cardNumberQuery: any = {
        cardNumber: patientDto.cardNumber,
        deletedAt: { $exists: false },
      };

      if (isUpdate && patientId) {
        cardNumberQuery._id = { $ne: new Types.ObjectId(patientId) };
      }

      const existingPatientByCard =
        await this.patientModel.findOne(cardNumberQuery);
      if (existingPatientByCard) {
        throw new ConflictException(ERROR_MESSAGES.PATIENT_ALREADY_EXISTS_CARD);
      }
    }

    // Check for duplicate email
    if (patientDto.email) {
      const emailQuery: any = {
        email: patientDto.email,
        deletedAt: { $exists: false },
      };

      if (isUpdate && patientId) {
        emailQuery._id = { $ne: new Types.ObjectId(patientId) };
      }

      const existingPatientByEmail =
        await this.patientModel.findOne(emailQuery);
      if (existingPatientByEmail) {
        throw new ConflictException(ERROR_MESSAGES.DUPLICATE_EMAIL);
      }
    }

    // Check for duplicate phone
    if (patientDto.phone) {
      const phoneQuery: any = {
        phone: patientDto.phone,
        deletedAt: { $exists: false },
      };

      if (isUpdate && patientId) {
        phoneQuery._id = { $ne: new Types.ObjectId(patientId) };
      }

      const existingPatientByPhone =
        await this.patientModel.findOne(phoneQuery);
      if (existingPatientByPhone) {
        throw new ConflictException(ERROR_MESSAGES.DUPLICATE_PHONE);
      }
    }

    // Validate date of birth (not in future)
    if (patientDto.dateOfBirth) {
      const dob = new Date(patientDto.dateOfBirth);
      const today = new Date();

      if (dob > today) {
        throw new BadRequestException(ERROR_MESSAGES.DATE_OF_BIRTH_FUTURE);
      }

      // Check if age is reasonable (not older than 150 years)
      const age = today.getFullYear() - dob.getFullYear();
      if (age > 150) {
        throw new BadRequestException(ERROR_MESSAGES.DATE_OF_BIRTH_TOO_OLD);
      }
    }

    // Validate emergency contact
    if (patientDto.emergencyContactName && !patientDto.emergencyContactPhone) {
      throw new BadRequestException(
        ERROR_MESSAGES.EMERGENCY_CONTACT_PHONE_REQUIRED,
      );
    }

    if (patientDto.emergencyContactPhone && !patientDto.emergencyContactName) {
      throw new BadRequestException(
        ERROR_MESSAGES.EMERGENCY_CONTACT_NAME_REQUIRED,
      );
    }
  }

  /**
   * Create a new patient
   */
  async createPatient(
    createPatientDto: CreatePatientDto,
    createdByUserId?: string,
    scope?: PatientScopeContext,
  ): Promise<Patient> {
    this.logger.log(
      `Creating patient: ${createPatientDto.firstName} ${createPatientDto.lastName}`,
    );

    await this.validatePatientData(createPatientDto);

    const { patientNumber, _id } = this.generatePatientNumber();

    const patientData = {
      _id,
      ...createPatientDto,
      patientNumber,
      dateOfBirth: new Date(createPatientDto.dateOfBirth),
      preferredLanguage: createPatientDto.preferredLanguage || 'english',
      status: 'Active',
      insuranceStartDate: createPatientDto.insuranceStartDate
        ? new Date(createPatientDto.insuranceStartDate)
        : undefined,
      insuranceEndDate: createPatientDto.insuranceEndDate
        ? new Date(createPatientDto.insuranceEndDate)
        : undefined,
      createdBy: createdByUserId
        ? new Types.ObjectId(createdByUserId)
        : undefined,
      ...(scope?.clinicId ? { clinicId: new Types.ObjectId(scope.clinicId) } : {}),
      ...(scope?.complexId ? { complexId: new Types.ObjectId(scope.complexId) } : {}),
      ...(scope?.organizationId ? { organizationId: new Types.ObjectId(scope.organizationId) } : {}),
      ...(scope?.subscriptionId ? { subscriptionId: new Types.ObjectId(scope.subscriptionId) } : {}),
    };

    const patient = new this.patientModel(patientData);
    const savedPatient = await patient.save();

    if (createdByUserId) {
      await this.auditService.logSecurityEvent({
        eventType: 'patient_created',
        userId: createdByUserId,
        actorId: createdByUserId,
        ipAddress: '0.0.0.0',
        userAgent: 'System',
        timestamp: new Date(),
        metadata: {
          patientId: (savedPatient as any)._id.toString(),
          patientNumber,
        },
      });
    }

    this.logger.log(
      `Patient created successfully with ID: ${savedPatient._id}`,
    );
    return savedPatient;
  }

  /**
   * Map a raw Patient document to PatientListItemDto.
   * Strips PHI fields and computes derived fields (fullName, age).
   * UC-3at2c5
   */
  private toListItem(patient: Patient): PatientListItemDto {
    return {
      _id: (patient._id as any).toString(),
      patientNumber: patient.patientNumber,
      fullName: `${patient.firstName} ${patient.lastName}`,
      age: this.calculateAge(patient.dateOfBirth),
      gender: patient.gender,
      insuranceCompany: patient.insuranceCompany,
      insuranceStatus: patient.insuranceStatus ?? 'None',
      status: patient.status,
      phone: patient.phone,
      profilePicture: patient.profilePicture,
      clinicId: (patient as any).clinicId?.toString(),
      complexId: (patient as any).complexId?.toString(),
      createdAt: (patient as any).createdAt,
    };
  }

  /**
   * Resolve the effective complexId from scope context and query params.
   *
   * Resolution rules:
   *   - super_admin: must supply query.complexId — throws 400 if absent
   *   - owner: uses query.complexId if provided; falls back to organizationId scope
   *   - admin/manager/doctor/staff: always use JWT complexId; query.complexId is IGNORED (IDOR prevention)
   * UC-3at2c5
   */
  private resolveComplexId(
    scope: PatientScopeContext,
    query: PatientListQueryDto,
  ): string | null {
    const { role, complexId: jwtComplexId } = scope;

    if (role === UserRole.SUPER_ADMIN) {
      if (!query.complexId) {
        throw new BadRequestException({
          message: {
            ar: 'يجب تحديد معرف المجمع للمشرف العام',
            en: 'complexId query parameter is required for super_admin',
          },
          code: 'COMPLEX_ID_REQUIRED',
        });
      }
      return query.complexId;
    }

    if (role === UserRole.OWNER) {
      // Owner can optionally narrow to a specific complex via query param.
      // If not provided, the caller falls back to organizationId scoping.
      return query.complexId ?? null;
    }

    // admin, manager, doctor, staff — enforced from JWT when set; null = clinic-plan scope
    return jwtComplexId ?? null;
  }

  /**
   * Get a paginated, filtered, sorted list of patients scoped to a complex.
   * UC-3at2c5 (M5 Patients Management)
   *
   * @param query - Validated query parameters from the HTTP request
   * @param scope - User identity and role context extracted from JWT.
   *               When absent, delegates to getPatientsLegacy() for backward compat.
   */
  async getPatients(
    query: PatientListQueryDto,
    scope?: PatientScopeContext,
  ): Promise<{
    patients: PatientListItemDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // Backward-compatibility: callers without scope get the legacy unscoped result.
    // Remove once all callers pass scope.
    if (!scope) {
      const legacyResult = await this.getPatientsLegacy(query as any);
      return {
        patients: legacyResult.patients.map((p) => this.toListItem(p)),
        total: legacyResult.total,
        page: legacyResult.page,
        limit: legacyResult.limit,
        totalPages: legacyResult.totalPages,
      };
    }

    const {
      search,
      status,
      insuranceStatus,
      gender,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    // Scope resolution
    const resolvedComplexId = this.resolveComplexId(scope, query);

    // Build filter
    const filter: FilterQuery<Patient> = {
      deletedAt: { $exists: false },
    };

    // 1. Mandatory subscription-level tenant isolation (M1 Fix)
    if (scope.role !== UserRole.SUPER_ADMIN && scope.subscriptionId) {
      filter.subscriptionId = new Types.ObjectId(scope.subscriptionId);
    }

    // 2. Apply complexId scope — mandatory for all except owner without explicit complexId
    if (resolvedComplexId) {
      filter.complexId = new Types.ObjectId(resolvedComplexId);
    } else if (scope.role === UserRole.OWNER) {
      if (scope.organizationId) {
        filter.organizationId = new Types.ObjectId(scope.organizationId);
      } else if (scope.clinicId) {
        // clinic-plan owner: scope to their single clinic
        filter.clinicId = new Types.ObjectId(scope.clinicId);
      }
    }

    // Clinic sub-scope: staff/doctor/manager/admin are locked to JWT clinic scope
    if (
      scope.role === UserRole.STAFF ||
      scope.role === UserRole.DOCTOR ||
      scope.role === UserRole.MANAGER ||
      scope.role === UserRole.ADMIN
    ) {
      const scopedClinicIds = this.getScopedClinicIds(scope);
      if (scopedClinicIds.length === 1) {
        filter.clinicId = scopedClinicIds[0];
      } else if (scopedClinicIds.length > 1) {
        filter.clinicId = { $in: scopedClinicIds };
      }
    } else if (
      query.clinicId &&
      (scope.role === UserRole.OWNER ||
        scope.role === UserRole.SUPER_ADMIN)
    ) {
      filter.clinicId = new Types.ObjectId(query.clinicId);
    }

    // Optional filters
    const canSeeInactiveByDefault = [
      UserRole.SUPER_ADMIN,
      UserRole.OWNER,
      UserRole.ADMIN,
    ].includes(scope.role as UserRole);
    // Status visibility:
    // - explicit status always wins
    // - admin/owner/super_admin can see both by default
    // - other roles default to Active only
    if (status) {
      filter.status = status;
    } else if (!canSeeInactiveByDefault) {
      filter.status = 'Active';
    }
    if (insuranceStatus) filter.insuranceStatus = insuranceStatus;
    if (gender)          filter.gender = gender;

    // Search: name (full or partial) or patientNumber
    if (search && search.trim().length > 0) {
      const searchTerm = search.trim();
      filter.$or = [
        { firstName: { $regex: searchTerm, $options: 'i' } },
        { lastName: { $regex: searchTerm, $options: 'i' } },
        { patientNumber: { $regex: searchTerm, $options: 'i' } },
        {
          $expr: {
            $regexMatch: {
              input: { $concat: ['$firstName', ' ', '$lastName'] },
              regex: searchTerm,
              options: 'i',
            },
          },
        },
      ];
    }

    // Pagination
    const pageNum  = Math.max(1, page);
    const pageSize = Math.max(1, Math.min(50, limit));
    const skip     = (pageNum - 1) * pageSize;

    // Sorting — 'age' sorts by dateOfBirth inverted
    const sort: Record<string, 1 | -1> = {};
    if (sortBy === 'age') {
      sort['dateOfBirth'] = sortOrder === 'asc' ? -1 : 1;
    } else {
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }

    // Projection: only fields needed for the list DTO — excludes PHI
    const projection = {
      patientNumber: 1,
      firstName: 1,
      lastName: 1,
      dateOfBirth: 1,
      gender: 1,
      insuranceCompany: 1,
      insuranceStatus: 1,
      status: 1,
      phone: 1,
      profilePicture: 1,
      clinicId: 1,
      complexId: 1,
      createdAt: 1,
    };

    // Execute find and count in parallel
    const [rawPatients, total] = await Promise.all([
      this.patientModel
        .find(filter, projection)
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .lean()
        .exec(),
      this.patientModel.countDocuments(filter).exec(),
    ]);

    const patients = rawPatients.map((p) => this.toListItem(p as unknown as Patient));
    const totalPages = Math.ceil(total / pageSize);

    return { patients, total, page: pageNum, limit: pageSize, totalPages };
  }

  /**
   * Get a lightweight list of all patients for dropdown/select components.
   * No pagination — returns every non-deleted patient in the caller's scope.
   * Only returns minimal fields needed for display.
   */
  async getPatientsForDropdown(
    scope: PatientScopeContext,
    search?: string,
    hasOutstandingInvoice?: boolean,
    hasBookableSession?: boolean,
  ): Promise<{ _id: string; patientNumber: string; firstName: string; lastName: string; phone?: string; profilePicture?: string }[]> {
    const filter: FilterQuery<Patient> = { deletedAt: { $exists: false }, status: 'Active' };

    // Scope resolution (reuse same logic as getPatients)
    const { role, complexId: jwtComplexId, organizationId, clinicId, subscriptionId } = scope;
    const scopedClinicIds = this.getScopedClinicIds(scope);

    // 1. Mandatory subscription-level tenant isolation (M1 Fix)
    if (role !== UserRole.SUPER_ADMIN && subscriptionId) {
      filter.subscriptionId = new Types.ObjectId(subscriptionId);
    }

    if (role === UserRole.SUPER_ADMIN) {
      // super_admin without a complexId → return empty to avoid unbounded scan
    } else if (role === UserRole.OWNER) {
      if (organizationId) {
        filter.organizationId = new Types.ObjectId(organizationId);
      } else if (clinicId) {
        // clinic-plan owner: scope to their single clinic
        filter.clinicId = new Types.ObjectId(clinicId);
      } else if (!subscriptionId) {
        // owner with no scope — safety net
        return [];
      }
    } else {
      // admin / manager / doctor / staff — scoped to JWT complexId, then clinic
      if (jwtComplexId) filter.complexId = new Types.ObjectId(jwtComplexId);
      if (role === UserRole.STAFF || role === UserRole.DOCTOR || role === UserRole.MANAGER || role === UserRole.ADMIN) {
        if (scopedClinicIds.length === 1) {
          filter.clinicId = scopedClinicIds[0];
        } else if (scopedClinicIds.length > 1) {
          filter.clinicId = { $in: scopedClinicIds };
        }
      }
    }

    // If hasOutstandingInvoice=true, restrict to patients who have at least one
    // posted invoice with unpaid or partially_paid status in the same clinic scope.
    if (hasOutstandingInvoice) {
      const invoiceFilter: any = {
        deletedAt: { $exists: false },
        invoiceStatus: 'posted',
        paymentStatus: { $in: ['unpaid', 'partially_paid'] },
      };
      if (scopedClinicIds.length === 1) {
        invoiceFilter.clinicId = scopedClinicIds[0];
      } else if (scopedClinicIds.length > 1) {
        invoiceFilter.clinicId = { $in: scopedClinicIds };
      } else if (clinicId && Types.ObjectId.isValid(clinicId)) {
        invoiceFilter.clinicId = new Types.ObjectId(clinicId);
      }
      const invoiceDocs = await this.invoiceModel
        .find(invoiceFilter, { patientId: 1 })
        .lean();
      const eligiblePatientIds = [...new Set(invoiceDocs.map((inv: any) => inv.patientId.toString()))];
      if (eligiblePatientIds.length === 0) return [];
      filter._id = { $in: eligiblePatientIds.map((id) => new Types.ObjectId(id)) };
    }

    // If hasBookableSession=true, restrict to patients who have at least one
    // draft or posted invoice with remaining (unboooked) sessions in the same clinic.
    if (hasBookableSession) {
      const invoiceFilter: any = {
        deletedAt: { $exists: false },
        invoiceStatus: { $in: ['draft', 'posted'] },
        paymentStatus: { $ne: 'paid' },
      };
      if (scopedClinicIds.length === 1) {
        invoiceFilter.clinicId = scopedClinicIds[0];
      } else if (scopedClinicIds.length > 1) {
        invoiceFilter.clinicId = { $in: scopedClinicIds };
      } else if (clinicId && Types.ObjectId.isValid(clinicId)) {
        invoiceFilter.clinicId = new Types.ObjectId(clinicId);
      }
      const invoiceDocs = await this.invoiceModel.find(invoiceFilter).lean();

      // Keep only invoices that have at least one service with remaining capacity
      const bookable = invoiceDocs.filter((inv: any) =>
        (inv.services ?? []).some((svc: any) => {
          const active = (svc.sessions ?? []).filter((s: any) =>
            ['booked', 'in_progress', 'completed'].includes(s.sessionStatus),
          ).length;
          return active < (svc.totalSessions ?? 0);
        }),
      );

      const eligiblePatientIds = [...new Set(bookable.map((inv: any) => inv.patientId.toString()))];
      if (eligiblePatientIds.length === 0) return [];
      filter._id = { $in: eligiblePatientIds.map((id) => new Types.ObjectId(id)) };
    }

    if (search && search.trim().length > 0) {
      const s = search.trim();
      filter.$or = [
        { firstName:     { $regex: s, $options: 'i' } },
        { lastName:      { $regex: s, $options: 'i' } },
        { patientNumber: { $regex: s, $options: 'i' } },
        {
          $expr: {
            $regexMatch: {
              input: { $concat: ['$firstName', ' ', '$lastName'] },
              regex: s,
              options: 'i',
            },
          },
        },
      ];
    }

    const raw = await this.patientModel
      .find(filter, { patientNumber: 1, firstName: 1, lastName: 1, phone: 1, profilePicture: 1 })
      .sort({ firstName: 1, lastName: 1 })
      .lean()
      .exec();

    return raw.map((p: any) => ({
      _id: p._id.toString(),
      patientNumber: p.patientNumber ?? '',
      firstName: p.firstName ?? '',
      lastName: p.lastName ?? '',
      phone: p.phone,
      profilePicture: p.profilePicture,
    }));
  }

  /**
   * Legacy getPatients — backward-compatible wrapper preserving the original
   * unscoped behavior. Used when no PatientScopeContext is provided.
   * Remove once all callers pass a scope.
   */
  private async getPatientsLegacy(query: PatientSearchQueryDto): Promise<{
    patients: Patient[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      search,
      firstName,
      lastName,
      phone,
      email,
      gender,
      status,
      bloodType,
      insuranceCompany,
      nationality,
      isPortalEnabled,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter: any = {
      deletedAt: { $exists: false },
    };

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { patientNumber: { $regex: search, $options: 'i' } },
        { cardNumber: { $regex: search, $options: 'i' } },
      ];
    }

    if (firstName) filter.firstName = { $regex: firstName, $options: 'i' };
    if (lastName) filter.lastName = { $regex: lastName, $options: 'i' };
    if (phone) filter.phone = { $regex: phone, $options: 'i' };
    if (email) filter.email = { $regex: email, $options: 'i' };
    if (gender) filter.gender = gender;
    // Default list visibility: return active patients unless explicitly filtered
    filter.status = status || 'Active';
    if (bloodType) filter.bloodType = bloodType;
    if (insuranceCompany)
      filter.insuranceCompany = { $regex: insuranceCompany, $options: 'i' };
    if (nationality)
      filter.nationality = { $regex: nationality, $options: 'i' };
    if (isPortalEnabled !== undefined) filter.isPortalEnabled = isPortalEnabled;

    const pageNum  = Math.max(1, parseInt(page));
    const pageSize = Math.max(1, Math.min(50, parseInt(limit)));
    const skip     = (pageNum - 1) * pageSize;

    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [patients, total] = await Promise.all([
      this.patientModel.find(filter).sort(sort).skip(skip).limit(pageSize).exec(),
      this.patientModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / pageSize);
    return { patients, total, page: pageNum, limit: pageSize, totalPages };
  }

  /**
   * Calculate patient age from date of birth
   */
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  }

  private getScopedClinicIds(scope?: PatientScopeContext): Types.ObjectId[] {
    if (!scope) {
      return [];
    }

    const ids = new Set<string>();
    if (scope.clinicId && Types.ObjectId.isValid(scope.clinicId)) {
      ids.add(scope.clinicId);
    }
    if (Array.isArray(scope.clinicIds)) {
      for (const clinicId of scope.clinicIds) {
        if (clinicId && Types.ObjectId.isValid(clinicId)) {
          ids.add(clinicId);
        }
      }
    }

    return Array.from(ids).map((clinicId) => new Types.ObjectId(clinicId));
  }

  private applyScopeFilter(
    filter: FilterQuery<Patient>,
    scope?: PatientScopeContext,
  ): FilterQuery<Patient> {
    if (!scope || scope.role === UserRole.SUPER_ADMIN) {
      return filter;
    }

    if (scope.subscriptionId) {
      filter.subscriptionId = new Types.ObjectId(scope.subscriptionId);
    }

    if (scope.role === UserRole.OWNER) {
      if (scope.organizationId) {
        filter.organizationId = new Types.ObjectId(scope.organizationId);
      } else {
        const scopedClinicIds = this.getScopedClinicIds(scope);
        if (scopedClinicIds.length === 1) {
          filter.clinicId = scopedClinicIds[0];
        } else if (scopedClinicIds.length > 1) {
          filter.clinicId = { $in: scopedClinicIds };
        } else if (scope.clinicId) {
          filter.clinicId = new Types.ObjectId(scope.clinicId);
        } else if (scope.complexId) {
          filter.complexId = new Types.ObjectId(scope.complexId);
        }
      }
      return filter;
    }

    const scopedClinicIds = this.getScopedClinicIds(scope);
    if (scopedClinicIds.length === 1) {
      filter.clinicId = scopedClinicIds[0];
    } else if (scopedClinicIds.length > 1) {
      filter.clinicId = { $in: scopedClinicIds };
    } else if (scope.clinicId) {
      filter.clinicId = new Types.ObjectId(scope.clinicId);
    } else if (scope.complexId) {
      filter.complexId = new Types.ObjectId(scope.complexId);
    } else if (scope.organizationId) {
      filter.organizationId = new Types.ObjectId(scope.organizationId);
    }

    return filter;
  }

  /**
   * Get patient by ID
   */
  async getPatientById(patientId: string, scope?: PatientScopeContext): Promise<Patient> {
    if (!Types.ObjectId.isValid(patientId)) {
      throw new BadRequestException(ERROR_MESSAGES.INVALID_PATIENT_ID);
    }

    const query: FilterQuery<Patient> = {
      _id: new Types.ObjectId(patientId),
      deletedAt: { $exists: false },
    };

    // Tenant isolation: scope patient lookup when caller context is provided
    this.applyScopeFilter(query, scope);

    const patient = await this.patientModel
      .findOne(query)
      .exec();

    if (!patient) {
      throw new NotFoundException(ERROR_MESSAGES.PATIENT_NOT_FOUND);
    }

    return patient;
  }

  /**
   * Get patient by patient number
   */
  async getPatientByNumber(
    patientNumber: string,
    scope?: PatientScopeContext,
  ): Promise<Patient> {
    const filter: FilterQuery<Patient> = {
      patientNumber,
      deletedAt: { $exists: false },
    };
    this.applyScopeFilter(filter, scope);

    const patient = await this.patientModel.findOne(filter).exec();

    if (!patient) {
      throw new NotFoundException(ERROR_MESSAGES.PATIENT_NOT_FOUND);
    }

    return patient;
  }

  /**
   * Update patient
   */
  async updatePatient(
    patientId: string,
    updatePatientDto: UpdatePatientDto,
    updatedByUserId?: string,
  ): Promise<Patient> {
    if (!Types.ObjectId.isValid(patientId)) {
      throw new BadRequestException(ERROR_MESSAGES.INVALID_PATIENT_ID);
    }

    this.logger.log(`Updating patient: ${patientId}`);

    await this.validatePatientData(updatePatientDto, true, patientId);

    const updateData: any = {
      ...updatePatientDto,
      updatedBy: updatedByUserId
        ? new Types.ObjectId(updatedByUserId)
        : undefined,
    };

    // Convert date strings to Date objects if provided
    if (updatePatientDto.dateOfBirth) {
      updateData.dateOfBirth = new Date(updatePatientDto.dateOfBirth);
    }
    if (updatePatientDto.insuranceStartDate) {
      updateData.insuranceStartDate = new Date(
        updatePatientDto.insuranceStartDate,
      );
    }
    if (updatePatientDto.insuranceEndDate) {
      updateData.insuranceEndDate = new Date(updatePatientDto.insuranceEndDate);
    }

    const patient = await this.patientModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(patientId),
          deletedAt: { $exists: false },
        },
        { $set: updateData },
        { new: true, runValidators: true },
      )
      .exec();

    if (!patient) {
      throw new NotFoundException(ERROR_MESSAGES.PATIENT_NOT_FOUND);
    }

    if (updatedByUserId) {
      await this.auditService.logSecurityEvent({
        eventType: 'patient_updated',
        userId: patientId,
        actorId: updatedByUserId,
        ipAddress: '0.0.0.0',
        userAgent: 'System',
        timestamp: new Date(),
        metadata: { changes: Object.keys(updatePatientDto) },
      });
    }

    this.logger.log(`Patient updated successfully: ${patientId}`);
    return patient;
  }

  /**
   * Deactivate patient and cancel appointments with transaction support
   */
  async deactivatePatient(
    patientId: string,
    updatedByUserId?: string,
  ): Promise<Patient> {
    if (!Types.ObjectId.isValid(patientId)) {
      throw new BadRequestException(ERROR_MESSAGES.INVALID_PATIENT_ID);
    }

    this.logger.log(
      `Deactivating patient and cancelling appointments: ${patientId}`,
    );

    // Check if patient exists first
    const existingPatient = await this.patientModel
      .findOne({
        _id: new Types.ObjectId(patientId),
        deletedAt: { $exists: false },
      })
      .exec();

    if (!existingPatient) {
      throw new NotFoundException(ERROR_MESSAGES.PATIENT_NOT_FOUND);
    }

    // Handle idempotent deactivation (Requirement 5.6)
    if (existingPatient.status === 'Inactive') {
      this.logger.log(
        `Patient ${patientId} is already inactive, returning without changes`,
      );
      return existingPatient;
    }

    try {
      // Update patient status to "Inactive"
      const patient = await this.patientModel
        .findOneAndUpdate(
          { _id: new Types.ObjectId(patientId), deletedAt: { $exists: false } },
          {
            $set: {
              status: 'Inactive',
              updatedBy: updatedByUserId
                ? new Types.ObjectId(updatedByUserId)
                : undefined,
            },
          },
          { new: true },
        )
        .exec();

      if (!patient) {
        throw new NotFoundException(ERROR_MESSAGES.PATIENT_NOT_FOUND);
      }

      // Cancel all active appointments (status 'scheduled' or 'confirmed')
      const result = await this.appointmentModel.updateMany(
        {
          patientId: new Types.ObjectId(patientId),
          status: { $in: ['scheduled', 'confirmed'] },
          deletedAt: { $exists: false },
        },
        {
          $set: {
            status: 'cancelled',
            cancellationReason: 'Patient deactivated',
            updatedBy: updatedByUserId
              ? new Types.ObjectId(updatedByUserId)
              : undefined,
          },
        },
      );

      // Log deactivation event with cancelled appointment count
      if (updatedByUserId) {
        await this.auditService.logSecurityEvent({
          eventType: 'user_status_change',
          userId: patientId,
          actorId: updatedByUserId,
          ipAddress: '0.0.0.0',
          userAgent: 'System',
          timestamp: new Date(),
          metadata: { cancelledAppointments: result.modifiedCount },
        });
      }

      this.logger.log(
        `Patient ${patientId} deactivated successfully. Cancelled ${result.modifiedCount} appointments.`,
      );

      return patient;
    } catch (error) {
      this.logger.error(`Failed to deactivate patient ${patientId}:`, error);

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException({
        message: {
          ar: 'فشل في تعطيل المريض',
          en: 'Failed to deactivate patient',
        },
      });
    }
  }

  /**
   * Activate patient
   */
  async activatePatient(
    patientId: string,
    updatedByUserId?: string,
  ): Promise<Patient> {
    if (!Types.ObjectId.isValid(patientId)) {
      throw new BadRequestException(ERROR_MESSAGES.INVALID_PATIENT_ID);
    }

    this.logger.log(`Activating patient: ${patientId}`);

    // Check if patient exists first
    const existingPatient = await this.patientModel
      .findOne({
        _id: new Types.ObjectId(patientId),
        deletedAt: { $exists: false },
      })
      .exec();

    if (!existingPatient) {
      throw new NotFoundException(ERROR_MESSAGES.PATIENT_NOT_FOUND);
    }

    // Handle idempotent activation (Requirement 6.4)
    if (existingPatient.status === 'Active') {
      this.logger.log(
        `Patient ${patientId} is already active, returning without changes`,
      );
      return existingPatient;
    }

    const patient = await this.patientModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(patientId), deletedAt: { $exists: false } },
        {
          $set: {
            status: 'Active',
            updatedBy: updatedByUserId
              ? new Types.ObjectId(updatedByUserId)
              : undefined,
          },
        },
        { new: true },
      )
      .exec();

    if (!patient) {
      throw new NotFoundException(ERROR_MESSAGES.PATIENT_NOT_FOUND);
    }

    if (updatedByUserId) {
      await this.auditService.logSecurityEvent({
        eventType: 'user_status_change',
        userId: patientId,
        actorId: updatedByUserId,
        ipAddress: '0.0.0.0',
        userAgent: 'System',
        timestamp: new Date(),
        metadata: { action: 'Patient account activated' },
      });
    }

    this.logger.log(`Patient ${patientId} activated successfully`);

    return patient;
  }

  /**
   * Soft delete patient
   */
  async deletePatient(
    patientId: string,
    deletedByUserId?: string,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(patientId)) {
      throw new BadRequestException(ERROR_MESSAGES.INVALID_PATIENT_ID);
    }

    // Check if patient is deactivated first (m5.json requirement)
    const patient = await this.getPatientById(patientId);
    if (patient.status !== 'Inactive') {
      throw new BadRequestException(ERROR_MESSAGES.PATIENT_MUST_BE_DEACTIVATED);
    }

    this.logger.log(`Soft deleting patient: ${patientId}`);

    const result = await this.patientModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(patientId),
          deletedAt: { $exists: false },
        },
        {
          $set: {
            deletedAt: new Date(),
            updatedBy: deletedByUserId
              ? new Types.ObjectId(deletedByUserId)
              : undefined,
          },
        },
      )
      .exec();

    if (!result) {
      throw new NotFoundException(ERROR_MESSAGES.PATIENT_NOT_FOUND);
    }

    if (deletedByUserId) {
      await this.auditService.logSecurityEvent({
        eventType: 'patient_deleted',
        userId: patientId,
        actorId: deletedByUserId,
        ipAddress: '0.0.0.0',
        userAgent: 'System',
        timestamp: new Date(),
        metadata: { action: 'Patient record soft deleted' },
      });
    }

    this.logger.log(`Patient soft deleted successfully: ${patientId}`);
  }

  /**
   * Update medical history
   */
  async updateMedicalHistory(
    patientId: string,
    updateMedicalHistoryDto: UpdateMedicalHistoryDto,
    updatedByUserId?: string,
  ): Promise<Patient> {
    if (!Types.ObjectId.isValid(patientId)) {
      throw new BadRequestException(ERROR_MESSAGES.INVALID_PATIENT_ID);
    }

    const updateData: any = {
      ...updateMedicalHistoryDto,
      updatedBy: updatedByUserId
        ? new Types.ObjectId(updatedByUserId)
        : undefined,
    };

    const patient = await this.patientModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(patientId),
          deletedAt: { $exists: false },
        },
        { $set: updateData },
        { new: true },
      )
      .exec();

    if (!patient) {
      throw new NotFoundException(ERROR_MESSAGES.PATIENT_NOT_FOUND);
    }

    return patient;
  }

  /**
   * Get patient statistics
   * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
   */
  async getPatientStats(scope?: PatientScopeContext): Promise<PatientStatsDto> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Base filter to exclude soft-deleted patients (Requirement 10.6)
    const baseFilter: FilterQuery<Patient> = { deletedAt: { $exists: false } };
    this.applyScopeFilter(baseFilter, scope);

    const [
      totalPatients,
      activePatients,
      malePatients,
      femalePatients,
      otherGenderPatients,
      patientsWithInsurance,
      patientsWithPortalAccess,
      recentPatients,
      avgAgeResult,
    ] = await Promise.all([
      // Total patients (Requirement 10.1)
      this.patientModel.countDocuments(baseFilter),

      // Active patients (not deleted)
      this.patientModel.countDocuments(baseFilter),

      // Male patients (Requirement 10.2)
      this.patientModel.countDocuments({
        ...baseFilter,
        gender: 'male',
      }),

      // Female patients (Requirement 10.2)
      this.patientModel.countDocuments({
        ...baseFilter,
        gender: 'female',
      }),

      // Other gender patients (Requirement 10.2)
      this.patientModel.countDocuments({
        ...baseFilter,
        gender: 'other',
      }),

      // Patients with active insurance (Requirement 10.4)
      this.patientModel.countDocuments({
        ...baseFilter,
        insuranceStatus: 'Active',
      }),

      // Patients with portal access
      this.patientModel.countDocuments({
        ...baseFilter,
        isPortalEnabled: true,
      }),

      // Recent patients - registered in last 30 days (Requirement 10.5)
      this.patientModel.countDocuments({
        ...baseFilter,
        createdAt: { $gte: thirtyDaysAgo },
      }),

      // Average age calculation (Requirement 10.3)
      this.patientModel.aggregate([
        {
          $match: {
            ...baseFilter,
            dateOfBirth: { $exists: true },
          },
        },
        {
          $project: {
            age: {
              $floor: {
                $divide: [
                  { $subtract: [new Date(), '$dateOfBirth'] },
                  365.25 * 24 * 60 * 60 * 1000,
                ],
              },
            },
          },
        },
        {
          $group: {
            _id: null,
            avgAge: { $avg: '$age' },
          },
        },
      ]),
    ]);

    // Verify that total equals sum of gender counts (Requirement 10.1, 10.2)
    const genderSum = malePatients + femalePatients + otherGenderPatients;
    if (totalPatients !== genderSum) {
      this.logger.warn(
        `Statistics mismatch: total (${totalPatients}) != gender sum (${genderSum})`,
      );
    }

    return {
      totalPatients,
      activePatients,
      malePatients,
      femalePatients,
      avgAge: Math.round((avgAgeResult[0]?.avgAge || 0) * 10) / 10, // Round to 1 decimal place
      patientsWithInsurance,
      patientsWithPortalAccess,
      recentPatients,
    };
  }

  /**
   * Search patients by term (advanced search)
   */
  async searchPatients(
    searchTerm: string,
    limit: number = 20,
    scope?: PatientScopeContext,
  ): Promise<Patient[]> {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return [];
    }

    const searchRegex = new RegExp(searchTerm.trim(), 'i');

    const filter: FilterQuery<Patient> = {
      deletedAt: { $exists: false },
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { patientNumber: searchRegex },
        {
          $expr: {
            $regexMatch: {
              input: { $concat: ['$firstName', ' ', '$lastName'] },
              regex: searchTerm.trim(),
              options: 'i',
            },
          },
        },
      ],
    };
    this.applyScopeFilter(filter, scope);

    return await this.patientModel
      .find(filter)
      .sort({ firstName: 1, lastName: 1 })
      .limit(Math.min(limit, 50)) // Max 50 results
      .exec();
  }

  /**
   * Get recent patients
   */
  async getRecentPatients(
    limit: number = 10,
    scope?: PatientScopeContext,
  ): Promise<Patient[]> {
    const filter: FilterQuery<Patient> = { deletedAt: { $exists: false } };
    this.applyScopeFilter(filter, scope);

    return await this.patientModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 50))
      .exec();
  }

  /**
   * Check if patient exists by email
   */
  async patientExistsByEmail(email: string): Promise<boolean> {
    const patient = await this.patientModel
      .findOne({
        email,
        deletedAt: { $exists: false },
      })
      .exec();

    return !!patient;
  }

  /**
   * Check if patient exists by phone
   */
  async patientExistsByPhone(phone: string): Promise<boolean> {
    const patient = await this.patientModel
      .findOne({
        phone,
        deletedAt: { $exists: false },
      })
      .exec();

    return !!patient;
  }

  /**
   * Get patients with upcoming birthdays (within next 30 days)
   */
  async getUpcomingBirthdays(
    days: number = 30,
    scope?: PatientScopeContext,
  ): Promise<Patient[]> {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    // This is a simplified version - for production, you'd need more complex date logic
    const filter: FilterQuery<Patient> = {
      deletedAt: { $exists: false },
      dateOfBirth: { $exists: true },
    };
    this.applyScopeFilter(filter, scope);

    return await this.patientModel
      .find(filter)
      .exec()
      .then((patients) => {
        return patients.filter((patient) => {
          const dob = new Date(patient.dateOfBirth);
          const birthMonth = dob.getMonth() + 1;
          const birthDay = dob.getDate();

          // Simple check for same month and day within range
          if (birthMonth === currentMonth) {
            return birthDay >= currentDay && birthDay <= currentDay + days;
          }

          return false;
        });
      });
  }
}
