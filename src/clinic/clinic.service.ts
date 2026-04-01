import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Clinic } from '../database/schemas/clinic.schema';
import { Complex } from '../database/schemas/complex.schema';
import { WorkingHours } from '../database/schemas/working-hours.schema';
import { UserAccess } from '../database/schemas/user-access.schema';
import {
  CreateClinicDto,
  UpdateClinicDto,
  SetupCapacityDto,
  SetupBusinessProfileDto,
} from './dto/create-clinic.dto';
import { ClinicFilterDto } from './dto/clinic-filter.dto';
import { AssignClinicPICDto } from './dto/assign-pic.dto';
import { ValidationUtil } from '../common/utils/validation.util';
import { ResponseBuilder } from '../common/utils/response-builder.util';
import { ERROR_MESSAGES } from '../common/utils/error-messages.constant';
import { ERROR_CODES } from './constants/error-codes.constant';
import { SubscriptionService } from '../subscription/subscription.service';
import { buildTenantFilter, TenantUser } from '../common/utils/tenant-scope.util';

@Injectable()
export class ClinicService {
  constructor(
    @InjectModel('Clinic') private readonly clinicModel: Model<Clinic>,
    @InjectModel('Complex') private readonly complexModel: Model<Complex>,
    @InjectModel('User') private readonly userModel: Model<any>,
    @InjectModel('Appointment')
    private readonly appointmentModel: Model<any>,
    @InjectModel('WorkingHours')
    private readonly workingHoursModel: Model<WorkingHours>,
    @InjectModel('UserAccess')
    private readonly userAccessModel: Model<UserAccess>,
    private readonly subscriptionService: SubscriptionService,
  ) { }

  async findClinicBySubscription(
    subscriptionId: string,
  ): Promise<Clinic | null> {
    try {
      return await this.clinicModel
        .findOne({
          subscriptionId: new Types.ObjectId(subscriptionId),
        })
        .exec();
    } catch (error) {
      console.error('Error finding clinic by subscription:', error);
      return null;
    }
  }

  /**
   * Get clinics with optional capacity calculation
   * Task 10.1: Enhance GET /clinics endpoint
   * Requirements: 5.1 (Enhanced Endpoints)
   * Design: Section 5.1 (Enhanced Clinic List Endpoint)
   *
   * This method returns a paginated list of clinics with optional capacity calculations.
   * When includeCounts=true, it calculates:
   * - Doctors capacity (current vs max)
   * - Staff capacity (current vs max)
   * - Patients capacity (current vs max)
   * - Scheduled appointments count
   * - Exceeded capacity flags
   *
   * @param options - Query options including filters, pagination, and includeCounts flag
   * @param requestingUser - The authenticated user making the request
   * @returns Paginated list of clinics with optional capacity information
   */
  async getClinics(
    options: {
      subscriptionId?: string;
      complexId?: string;
      status?: string;
      search?: string;
      includeCounts?: boolean;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
    requestingUser?: any,
  ): Promise<{
    data: any[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const {
      subscriptionId,
      complexId,
      status,
      search,
      includeCounts = false,
      page = 1,
      limit = 10,
      sortBy = 'name',
      sortOrder = 'asc',
    } = options;

    let targetSubscriptionId = subscriptionId;
    let targetComplexId = complexId;
    let targetClinicId: string | undefined;
    let permittedClinicIds: Types.ObjectId[] | null = null; // null = no restriction

    // PERMISSION-AWARE SCOPING: Resolve all clinics the user has access to
    if (requestingUser && requestingUser.role !== 'super_admin') {
      // Enforce subscription-level tenant boundary
      if (requestingUser.subscriptionId) {
        targetSubscriptionId = requestingUser.subscriptionId;
      }

      // Try to resolve permitted clinics from UserAccess records
      // Owners have subscription-level access — skip UserAccess scoping for them
      const userId = requestingUser.role !== 'owner'
        ? (requestingUser.userId || requestingUser.id)
        : null;
      if (userId) {
        const now = new Date();
        const accessRecords = await this.userAccessModel
          .find({
            userId: new Types.ObjectId(userId),
            isActive: true,
            $or: [
              { expiresAt: { $gt: now } },
              { expiresAt: { $exists: false } },
              { expiresAt: null },
            ],
          })
          .lean()
          .exec();

        if (accessRecords.length > 0) {
          // Direct clinic-level grants
          const directClinicIds = accessRecords
            .filter((a) => a.scopeType === 'clinic')
            .map((a) => new Types.ObjectId(a.scopeId));

          // Complex-level grants → expand to all clinics in those complexes
          const accessComplexIds = accessRecords
            .filter((a) => a.scopeType === 'complex')
            .map((a) => new Types.ObjectId(a.scopeId));

          let complexClinicIds: Types.ObjectId[] = [];
          if (accessComplexIds.length > 0) {
            const complexClinics = await this.clinicModel
              .find({ complexId: { $in: accessComplexIds } }, { _id: 1 })
              .lean()
              .exec();
            complexClinicIds = complexClinics.map(
              (c) => new Types.ObjectId((c._id as any).toString()),
            );
          }

          const allPermitted = [...directClinicIds, ...complexClinicIds];
          if (allPermitted.length > 0) {
            permittedClinicIds = allPermitted;
          }
        }
      }

      // Fallback: use single-clinic / complex / subscription from user profile
      // Owners see all clinics in their subscription regardless of complexId on their profile
      if (permittedClinicIds === null && requestingUser.role !== 'owner') {
        if (requestingUser.complexId) {
          targetComplexId = requestingUser.complexId;
        }
        if (requestingUser.clinicId) {
          targetClinicId = requestingUser.clinicId.toString();
        }
      }
    }

    // Build query
    const query: any = {};

    if (permittedClinicIds !== null) {
      // Use the explicit permission set (may be combined with subscription filter below)
      query._id = { $in: permittedClinicIds };
      if (targetSubscriptionId) {
        query.subscriptionId = new Types.ObjectId(targetSubscriptionId);
      }
    } else if (targetClinicId) {
      // Filtering by exact clinic _id — no need for subscriptionId/complexId on top
      query._id = new Types.ObjectId(targetClinicId);
    } else {
      if (targetSubscriptionId) {
        query.subscriptionId = new Types.ObjectId(targetSubscriptionId);
      }

      if (targetComplexId) {
        query.complexId = new Types.ObjectId(targetComplexId);
      }
    }

    query.deletedAt = { $exists: false };

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { licenseNumber: { $regex: search, $options: 'i' } },
      ];
    }

    // Build sort
    const sort: any = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query
    const [clinics, total] = await Promise.all([
      this.clinicModel
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('personInChargeId', 'firstName lastName email role')
        .lean()
        .exec(),
      this.clinicModel.countDocuments(query).exec(),
    ]);

    // Enrich clinics with complexName when a linked complex exists.
    const complexIds = Array.from(
      new Set(
        clinics
          .map((clinic) => clinic?.complexId?.toString())
          .filter((id): id is string => Boolean(id)),
      ),
    );

    let complexNameById = new Map<string, string>();
    if (complexIds.length > 0) {
      const complexes = await this.complexModel
        .find(
          {
            _id: {
              $in: complexIds.map((id) => new Types.ObjectId(id)),
            },
          },
          { name: 1 },
        )
        .lean()
        .exec();

      complexNameById = new Map(
        complexes
          .filter((complex) => Boolean(complex?.name))
          .map((complex: any) => [complex._id.toString(), complex.name]),
      );
    }

    const withComplexName = (clinic: any) => {
      const complexId = clinic?.complexId?.toString();
      const complexName = complexId
        ? complexNameById.get(complexId)
        : undefined;

      if (!complexName) {
        return clinic;
      }

      return {
        ...clinic,
        complexName,
      };
    };

    // Add capacity calculations if requested
    let enrichedClinics = clinics;
    if (includeCounts) {
      enrichedClinics = await Promise.all(
        clinics.map(async (clinic) => {
          // Calculate doctors capacity
          const doctorsCount = await this.userModel.countDocuments({
            clinicId: clinic._id,
            role: 'doctor',
            isActive: true,
          });

          const doctorsCapacity = {
            max: clinic.maxDoctors || 0,
            current: doctorsCount,
            isExceeded: doctorsCount > (clinic.maxDoctors || 0),
            percentage:
              (clinic.maxDoctors || 0) > 0
                ? Math.round((doctorsCount / (clinic.maxDoctors || 0)) * 100)
                : 0,
          };

          // Calculate staff capacity (exclude owners/super_admins — they are not clinic staff)
          const staffCount = await this.userModel.countDocuments({
            clinicId: clinic._id,
            role: { $nin: ['doctor', 'patient', 'owner', 'super_admin'] },
            isActive: true,
          });

          const staffCapacity = {
            max: clinic.maxStaff || 0,
            current: staffCount,
            isExceeded: staffCount > (clinic.maxStaff || 0),
            percentage:
              (clinic.maxStaff || 0) > 0
                ? Math.round((staffCount / (clinic.maxStaff || 0)) * 100)
                : 0,
          };

          // Calculate patients capacity
          const patientsAggregation = await this.appointmentModel.aggregate([
            {
              $match: {
                clinicId: clinic._id,
                deletedAt: null,
              },
            },
            {
              $group: {
                _id: '$patientId',
              },
            },
            {
              $count: 'total',
            },
          ]);

          const patientsCount =
            patientsAggregation.length > 0 ? patientsAggregation[0].total : 0;

          const patientsCapacity = {
            max: clinic.maxPatients || 0,
            current: patientsCount,
            isExceeded: patientsCount > (clinic.maxPatients || 0),
            percentage:
              (clinic.maxPatients || 0) > 0
                ? Math.round((patientsCount / (clinic.maxPatients || 0)) * 100)
                : 0,
          };

          // Calculate scheduled appointments count
          const scheduledAppointmentsCount =
            await this.appointmentModel.countDocuments({
              clinicId: clinic._id,
              status: { $in: ['scheduled', 'confirmed'] },
              appointmentDate: { $gte: new Date() },
              deletedAt: null,
            });

          return {
            ...clinic,
            capacity: {
              doctors: doctorsCapacity,
              staff: staffCapacity,
              patients: patientsCapacity,
            },
            scheduledAppointmentsCount,
          };
        }),
      );

      enrichedClinics = enrichedClinics.map(withComplexName);
    } else {
      enrichedClinics = clinics.map(withComplexName);
    }

    // Calculate meta
    const totalPages = Math.ceil(total / limit);

    return {
      data: enrichedClinics,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async findClinicByUser(userId: string): Promise<Clinic | null> {
    try {
      // First get user's subscription
      const subscription =
        await this.subscriptionService.getSubscriptionByUser(userId);
      if (!subscription) {
        return null;
      }
      return await this.findClinicBySubscription(
        (subscription._id as any).toString(),
      );
    } catch (error) {
      console.error('Error finding clinic by user:', error);
      return null;
    }
  }

  async createClinic(createClinicDto: CreateClinicDto): Promise<Clinic> {
    // Validate subscription is active
    const isActive = await this.subscriptionService.isSubscriptionActive(
      createClinicDto.subscriptionId,
    );
    if (!isActive) {
      throw new BadRequestException('Subscription is not active');
    }

    // Validate subscription limits
    const currentClinics = await this.clinicModel.countDocuments({
      subscriptionId: new Types.ObjectId(createClinicDto.subscriptionId),
    });

    const { plan } = await this.subscriptionService.getSubscriptionWithPlan(
      createClinicDto.subscriptionId,
    );
    if (
      plan.maxClinics &&
      plan.maxClinics > 0 &&
      currentClinics >= plan.maxClinics
    ) {
      throw new BadRequestException(
        `Plan allows maximum ${plan.maxClinics} clinic(s)`,
      );
    }

    // Validate business profile for clinic-only plans
    if (
      !createClinicDto.complexDepartmentId &&
      plan.name.toLowerCase() === 'clinic'
    ) {
      const businessProfileValidation = ValidationUtil.validateBusinessProfile({
        yearEstablished: createClinicDto.yearEstablished,
        mission: createClinicDto.mission,
        vision: createClinicDto.vision,
        ceoName: createClinicDto.ceoName,
        vatNumber: createClinicDto.vatNumber,
        crNumber: createClinicDto.crNumber,
      });

      if (!businessProfileValidation.isValid) {
        throw new BadRequestException(
          `Validation failed: ${businessProfileValidation.errors.join(', ')}`,
        );
      }

      // Apply schema defaults for capacity when not provided (e.g. from onboarding clinic/overview)
      // ClinicOverviewDto intentionally omits capacity; schema defaults: maxPatients=1000, sessionDuration=30
      if (createClinicDto.maxPatients == null || createClinicDto.maxPatients <= 0) {
        createClinicDto.maxPatients = 1000;
      }
      if (createClinicDto.sessionDuration == null || createClinicDto.sessionDuration <= 0) {
        createClinicDto.sessionDuration = 30;
      }
    }

    // Validate contact information
    if (
      createClinicDto.email &&
      !ValidationUtil.validateEmail(createClinicDto.email)
    ) {
      throw new BadRequestException('Invalid email format');
    }

    if (
      createClinicDto.phone &&
      !ValidationUtil.validatePhone(createClinicDto.phone)
    ) {
      throw new BadRequestException('Invalid phone number format');
    }

    const clinicData = {
      ...createClinicDto,
      complexDepartmentId: createClinicDto.complexDepartmentId
        ? new Types.ObjectId(createClinicDto.complexDepartmentId)
        : null,
      complexId: createClinicDto.complexId
        ? new Types.ObjectId(createClinicDto.complexId)
        : null,
      subscriptionId: new Types.ObjectId(createClinicDto.subscriptionId),
      ownerId: new Types.ObjectId(createClinicDto.ownerId),
    };

    const clinic = new this.clinicModel(clinicData);
    return await clinic.save();
  }

  async getClinic(clinicId: string): Promise<Clinic> {
    const clinic = await this.clinicModel.findById(clinicId).exec();
    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }
    return clinic;
  }

  /**
   * Get clinic with complete details including capacity
   * Task 10.2: Enhance GET /clinics/:id endpoint
   * Requirements: 5.2 (Enhanced Endpoints)
   * Design: Section 5.2 (Enhanced Clinic Details Endpoint)
   *
   * This method returns complete clinic details including:
   * - All clinic fields
   * - Populated personInCharge relationship
   * - Capacity breakdown with personnel lists
   * - Scheduled appointments count
   * - Recommendations when capacity is exceeded
   *
   * @param clinicId - The clinic ID
   * @param requestingUser - The authenticated user making the request
   * @returns Complete clinic details with capacity information
   * @throws NotFoundException if clinic not found
   */
  async getClinicWithDetails(clinicId: string, requestingUser?: any): Promise<any> {
    // Guard: reject malformed IDs before hitting Mongoose to avoid CastError 500
    if (!Types.ObjectId.isValid(clinicId)) {
      throw new NotFoundException({
        message: {
          ar: 'العيادة غير موجودة',
          en: 'Clinic not found',
        },
        code: 'CLINIC_007',
      });
    }

    // 1. Get clinic with populated relationships
    const clinic = await this.clinicModel
      .findById(clinicId)
      .populate('personInChargeId', 'firstName lastName email role')
      .lean()
      .exec();

    if (!clinic) {
      throw new NotFoundException({
        message: {
          ar: 'العيادة غير موجودة',
          en: 'Clinic not found',
        },
        code: 'CLINIC_007',
      });
    }

    // TENANT ISOLATION: Verify clinic belongs to user's subscription (ISSUE-010)
    if (requestingUser && requestingUser.role !== 'super_admin') {
      if (requestingUser.subscriptionId &&
        clinic.subscriptionId.toString() !== requestingUser.subscriptionId) {
        throw new ForbiddenException({
          message: {
            ar: 'ليس لديك صلاحية للوصول إلى هذه العيادة',
            en: 'You do not have permission to access this clinic',
          },
          code: 'INSUFFICIENT_PERMISSIONS',
        });
      }
    }

    // 2. Calculate doctors capacity with personnel list
    const doctorsList = await this.userModel
      .find({
        clinicId: new Types.ObjectId(clinicId),
        role: 'doctor',
        isActive: true,
      })
      .select('_id firstName lastName email role')
      .lean();

    const doctorsCount = doctorsList.length;
    const maxDoctors = clinic.maxDoctors || 0;
    const doctorsCapacity = {
      max: maxDoctors,
      current: doctorsCount,
      available: maxDoctors - doctorsCount,
      percentage:
        maxDoctors > 0 ? Math.round((doctorsCount / maxDoctors) * 100) : 0,
      isExceeded: doctorsCount > maxDoctors,
      list: doctorsList.map((doc: any) => ({
        id: doc._id.toString(),
        name: `${doc.firstName} ${doc.lastName}`,
        role: doc.role,
        email: doc.email,
      })),
    };

    // 3. Calculate staff capacity with personnel list (exclude owners/super_admins)
    const staffList = await this.userModel
      .find({
        clinicId: new Types.ObjectId(clinicId),
        role: { $nin: ['doctor', 'patient', 'owner', 'super_admin'] },
        isActive: true,
      })
      .select('_id firstName lastName email role')
      .lean();

    const staffCount = staffList.length;
    const maxStaff = clinic.maxStaff || 0;
    const staffCapacity = {
      max: maxStaff,
      current: staffCount,
      available: maxStaff - staffCount,
      percentage: maxStaff > 0 ? Math.round((staffCount / maxStaff) * 100) : 0,
      isExceeded: staffCount > maxStaff,
      list: staffList.map((staff: any) => ({
        id: staff._id.toString(),
        name: `${staff.firstName} ${staff.lastName}`,
        role: staff.role,
        email: staff.email,
      })),
    };

    // 4. Calculate patients capacity
    const patientsAggregation = await this.appointmentModel.aggregate([
      {
        $match: {
          clinicId: new Types.ObjectId(clinicId),
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: '$patientId',
        },
      },
      {
        $count: 'total',
      },
    ]);

    const patientsCount =
      patientsAggregation.length > 0 ? patientsAggregation[0].total : 0;
    const maxPatients = clinic.maxPatients || 0;
    const patientsCapacity = {
      max: maxPatients,
      current: patientsCount,
      available: maxPatients - patientsCount,
      percentage:
        maxPatients > 0 ? Math.round((patientsCount / maxPatients) * 100) : 0,
      isExceeded: patientsCount > maxPatients,
      count: patientsCount,
    };

    // 5. Calculate scheduled appointments count
    const scheduledAppointmentsCount =
      await this.appointmentModel.countDocuments({
        clinicId: new Types.ObjectId(clinicId),
        status: { $in: ['scheduled', 'confirmed'] },
        appointmentDate: { $gte: new Date() },
        deletedAt: null,
      });

    // 6. Get clinic working schedule
    const dayOrder: Record<string, number> = {
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
      sunday: 7,
    };

    const workingHours = await this.workingHoursModel
      .find({
        entityType: 'clinic',
        entityId: new Types.ObjectId(clinicId),
        isActive: true,
      })
      .lean()
      .exec();

    const workingSchedule = workingHours
      .map((item: any) => ({
        dayOfWeek: item.dayOfWeek,
        isWorkingDay: item.isWorkingDay,
        openingTime: item.openingTime,
        closingTime: item.closingTime,
        breakStartTime: item.breakStartTime,
        breakEndTime: item.breakEndTime,
      }))
      .sort(
        (a, b) =>
          (dayOrder[a.dayOfWeek] || 99) - (dayOrder[b.dayOfWeek] || 99),
      );

    // 7. Generate recommendations
    const recommendations: string[] = [];
    if (doctorsCapacity.isExceeded) {
      recommendations.push(
        'Doctor capacity exceeded. Consider increasing maxDoctors or redistributing workload.',
      );
    }
    if (staffCapacity.isExceeded) {
      recommendations.push(
        'Staff capacity exceeded. Consider hiring more staff or increasing maxStaff limit.',
      );
    }
    if (patientsCapacity.isExceeded) {
      recommendations.push(
        'Patient capacity exceeded. Consider expanding facilities or limiting patient intake.',
      );
    }

    // 8. Return complete clinic details
    return {
      ...clinic,
      personInCharge: clinic.personInChargeId || null,
      workingHours: workingSchedule,
      workingSchedule,
      capacity: {
        doctors: doctorsCapacity,
        staff: staffCapacity,
        patients: patientsCapacity,
      },
      scheduledAppointmentsCount,
      recommendations,
    };
  }

  /**
   * Get clinics by complex with filtering and sorting
   * BZR-g3e5c9a0: Complex-based clinic filtering endpoint
   *
   * @param complexId - The complex ID to filter clinics by
   * @param filters - Optional filters (isActive, sortBy, sortOrder)
   * @returns Standardized response with clinics array
   */
  async getClinicsByComplex(complexId: string, filters?: ClinicFilterDto, requestingUser?: TenantUser) {
    // Validate complex exists
    await ValidationUtil.validateEntityExists(
      this.complexModel,
      complexId,
      ERROR_MESSAGES.COMPLEX_NOT_FOUND,
    );

    // Build query with tenant scope
    const tenantFilter = requestingUser ? buildTenantFilter(requestingUser) : {};
    const query: any = { ...tenantFilter, complexId: new Types.ObjectId(complexId), deletedAt: { $exists: false } };

    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    // Build sort
    const sortBy = filters?.sortBy || 'name';
    const sortOrder = filters?.sortOrder === 'desc' ? -1 : 1;
    const sort: any = { [sortBy]: sortOrder };

    // Execute query
    const clinics = await this.clinicModel
      .find(query)
      .sort(sort)
      .select(
        '_id name address phoneNumbers email isActive specialization licenseNumber',
      )
      .lean();

    return ResponseBuilder.success(clinics);
  }

  /**
   * Get clinics for dropdown (only active, by complex)
   * BZR-g3e5c9a0: Complex-based clinic filtering endpoint
   * BZR-q4f3e1b8: Deactivated user restrictions in dropdowns
   *
   * @param filters - Optional filters (complexId)
   * @returns Standardized response with active clinics
   */
  async getClinicsForDropdown(filters?: { complexId?: string }) {
    const query: any = { isActive: true, deletedAt: { $exists: false } };

    if (filters?.complexId) {
      query.complexId = new Types.ObjectId(filters.complexId);
    }

    const clinics = await this.clinicModel
      .find(query)
      .select('_id name specialization')
      .sort({ name: 1 })
      .lean();

    return ResponseBuilder.success(clinics);
  }

  async getClinicBySubscription(
    subscriptionId: string,
  ): Promise<Clinic | null> {
    return await this.clinicModel
      .findOne({ subscriptionId: new Types.ObjectId(subscriptionId) })
      .exec();
  }

  async updateClinic(
    clinicId: string,
    updateClinicDto: UpdateClinicDto,
  ): Promise<Clinic> {
    const clinic = await this.getClinic(clinicId);

    // Validate business profile data if provided
    if (this.hasBusinessProfileData(updateClinicDto)) {
      const businessProfileValidation = ValidationUtil.validateBusinessProfile({
        yearEstablished: updateClinicDto.yearEstablished,
        mission: updateClinicDto.mission,
        vision: updateClinicDto.vision,
        ceoName: updateClinicDto.ceoName,
        vatNumber: updateClinicDto.vatNumber,
        crNumber: updateClinicDto.crNumber,
      });

      if (!businessProfileValidation.isValid) {
        throw new BadRequestException(
          `Validation failed: ${businessProfileValidation.errors.join(', ')}`,
        );
      }
    }

    // Handle phoneNumbers array (preferred) or legacy single phone string
    if (Array.isArray((updateClinicDto as any).phoneNumbers)) {
      const phones: string[] = (updateClinicDto as any).phoneNumbers;
      clinic.phoneNumbers = phones
        .filter(Boolean)
        .map((n) => ({ number: n, type: 'primary' }) as any);
      delete (updateClinicDto as any).phoneNumbers;
    } else if ((updateClinicDto as any).phone !== undefined) {
      const phoneStr = (updateClinicDto as any).phone;
      clinic.phoneNumbers = phoneStr
        ? [{ number: phoneStr, type: 'primary' } as any]
        : [];
      delete (updateClinicDto as any).phone;
    }

    // Only assign defined values to prevent clearing existing fields with undefined
    const safeUpdates = Object.fromEntries(
      Object.entries(updateClinicDto).filter(([, v]) => v !== undefined),
    );
    Object.assign(clinic, safeUpdates);
    return await clinic.save();
  }

  async setupCapacity(
    clinicId: string,
    capacityDto: SetupCapacityDto,
  ): Promise<Clinic> {
    const clinic = await this.getClinic(clinicId);

    // Validate capacity limits
    if (capacityDto.maxStaff && capacityDto.maxStaff < 1) {
      throw new BadRequestException('Maximum staff must be at least 1');
    }

    if (capacityDto.maxDoctors && capacityDto.maxDoctors < 1) {
      throw new BadRequestException('Maximum doctors must be at least 1');
    }

    if (capacityDto.maxPatients && capacityDto.maxPatients < 1) {
      throw new BadRequestException('Maximum patients must be at least 1');
    }

    if (
      capacityDto.sessionDuration &&
      (capacityDto.sessionDuration < 15 || capacityDto.sessionDuration > 480)
    ) {
      throw new BadRequestException(
        'Session duration must be between 15 and 480 minutes',
      );
    }

    Object.assign(clinic, capacityDto);
    return await clinic.save();
  }

  async setupBusinessProfile(
    clinicId: string,
    businessProfileDto: SetupBusinessProfileDto,
  ): Promise<Clinic> {
    const clinic = await this.getClinic(clinicId);

    // Validate business profile
    const validation =
      ValidationUtil.validateBusinessProfile(businessProfileDto);
    if (!validation.isValid) {
      throw new BadRequestException(
        `Validation failed: ${validation.errors.join(', ')}`,
      );
    }

    Object.assign(clinic, businessProfileDto);
    return await clinic.save();
  }

  private hasBusinessProfileData(data: any): boolean {
    return !!(
      data.yearEstablished ||
      data.mission ||
      data.vision ||
      data.ceoName ||
      data.vatNumber ||
      data.crNumber
    );
  }

  /**
   * Assign person-in-charge to a clinic
   * BZR-41: PIC selection from complex PICs
   *
   * Business Rule:
   * - The person-in-charge must be selected from those previously assigned
   *   as PICs for the complex to which the clinic belongs
   * - System validates that the selected user is a PIC of the parent complex
   * - Throws CLINIC_002 error if user is not a PIC of the parent complex
   *
   * @param clinicId - The clinic ID
   * @param assignPICDto - DTO containing personInChargeId
   * @returns Updated clinic with populated PIC
   * @throws NotFoundException if clinic not found (CLINIC_007)
   * @throws BadRequestException if clinic has no parent complex
   * @throws BadRequestException if PIC is not from parent complex (CLINIC_002)
   */
  async assignPersonInCharge(
    clinicId: string,
    assignPICDto: AssignClinicPICDto,
  ): Promise<Clinic> {
    // 1. Validate clinic exists
    const clinic = await this.clinicModel.findById(clinicId).exec();
    if (!clinic) {
      throw new NotFoundException({
        code: ERROR_CODES.CLINIC_007.code,
        message: ERROR_CODES.CLINIC_007.message,
      });
    }

    // 2. Check if clinic has a parent complex
    if (!clinic.complexId) {
      throw new BadRequestException({
        message: {
          ar: 'العيادة غير مرتبطة بمجمع',
          en: 'Clinic is not associated with a complex',
        },
        code: 'CLINIC_NO_COMPLEX',
      });
    }

    // 3. Get complex and validate PIC is from parent complex
    const complex = await this.complexModel
      .findById(clinic.complexId)
      .select('personInChargeId')
      .exec();

    if (!complex) {
      throw new NotFoundException({
        message: {
          ar: 'المجمع غير موجود',
          en: 'Complex not found',
        },
        code: 'COMPLEX_NOT_FOUND',
      });
    }

    // 4. Validate that the selected PIC is the PIC of the parent complex
    if (
      !complex.personInChargeId ||
      complex.personInChargeId.toString() !== assignPICDto.personInChargeId
    ) {
      throw new BadRequestException({
        code: ERROR_CODES.CLINIC_002.code,
        message: ERROR_CODES.CLINIC_002.message,
      });
    }

    // 5. Update clinic with personInChargeId
    clinic.personInChargeId = new Types.ObjectId(assignPICDto.personInChargeId);
    await clinic.save();

    // 6. Return updated clinic with populated PIC
    const updatedClinic = await this.clinicModel
      .findById(clinicId)
      .populate('personInChargeId', 'firstName lastName email role')
      .exec();

    if (!updatedClinic) {
      throw new NotFoundException({
        code: ERROR_CODES.CLINIC_007.code,
        message: ERROR_CODES.CLINIC_007.message,
      });
    }

    return updatedClinic;
  }

  // ======== VALIDATION METHODS ========

  async isNameAvailable(
    name: string,
    complexId?: string,
    organizationId?: string,
  ): Promise<boolean> {
    try {
      const trimmedName = name.trim().toLowerCase();
      if (!trimmedName) return false;

      const query: any = {
        name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
      };

      // Check within complex scope if provided
      if (complexId) {
        query.complexId = new Types.ObjectId(complexId);
      }
      // Otherwise check within organization scope if provided
      else if (organizationId) {
        query.organizationId = new Types.ObjectId(organizationId);
      }

      const existingClinic = await this.clinicModel.findOne(query).exec();
      return !existingClinic;
    } catch (error) {
      console.error('Error checking clinic name availability:', error);
      return false;
    }
  }

  async isEmailAvailable(email: string): Promise<boolean> {
    try {
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail) return false;

      const existingClinic = await this.clinicModel
        .findOne({
          email: { $regex: new RegExp(`^${trimmedEmail}$`, 'i') },
        })
        .exec();

      return !existingClinic;
    } catch (error) {
      console.error('Error checking email availability:', error);
      return false;
    }
  }

  async isLicenseNumberAvailable(licenseNumber: string): Promise<boolean> {
    try {
      const trimmedLicense = licenseNumber.trim();
      if (!trimmedLicense) return false;

      const existingClinic = await this.clinicModel
        .findOne({
          licenseNumber: trimmedLicense,
        })
        .exec();

      return !existingClinic;
    } catch (error) {
      console.error('Error checking license number availability:', error);
      return false;
    }
  }

  /**
   * Delete clinic (soft delete)
   *
   * Performs a soft delete by setting the deletedAt timestamp.
   * This allows data recovery if needed and maintains referential integrity.
   *
   * @param id - Clinic ID to delete
   * @returns Success response with bilingual message
   * @throws NotFoundException if clinic not found
   * @throws BadRequestException for unexpected errors
   *
   * @example
   * const result = await service.deleteClinic('507f1f77bcf86cd799439011');
   * // Returns: { success: true, message: { ar: '...', en: '...' } }
   */
  async deleteClinic(id: string): Promise<{
    success: boolean;
    message: { ar: string; en: string };
  }> {
    try {
      // Validate ObjectId format
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException({
          message: {
            ar: 'معرف العيادة غير صالح',
            en: 'Invalid clinic ID format',
          },
          code: 'INVALID_ID',
        });
      }

      // Find the clinic
      const clinic = await this.clinicModel.findById(id);

      if (!clinic) {
        throw new NotFoundException({
          message: {
            ar: 'العيادة غير موجودة',
            en: 'Clinic not found',
          },
          code: 'CLINIC_007',
        });
      }

      // Check if already deleted
      if (clinic.deletedAt) {
        throw new BadRequestException({
          message: {
            ar: 'العيادة محذوفة بالفعل',
            en: 'Clinic is already deleted',
          },
          code: 'CLINIC_ALREADY_DELETED',
        });
      }

      // Perform soft delete
      await this.clinicModel.findByIdAndUpdate(id, {
        deletedAt: new Date(),
      });

      return {
        success: true,
        message: {
          ar: 'تم حذف العيادة بنجاح',
          en: 'Clinic deleted successfully',
        },
      };
    } catch (error) {
      // Re-throw known exceptions
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // Handle unexpected errors
      throw new BadRequestException({
        message: {
          ar: 'حدث خطأ أثناء حذف العيادة',
          en: 'An error occurred while deleting the clinic',
        },
      });
    }
  }
}
