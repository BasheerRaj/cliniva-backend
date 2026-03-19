import {
  Injectable,
  NotFoundException,
  BadRequestException,
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
import { EmployeeShift } from '../database/schemas/employee-shift.schema';
import { CreateServiceDto, AssignServicesDto } from './dto/create-service.dto';
import { CreateServiceWithSessionsDto } from './dto/create-service-with-sessions.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { UpdateServiceWithSessionsDto } from './dto/update-service-with-sessions.dto';
import { ChangeServiceStatusDto } from './dto/change-service-status.dto';
import { BulkStatusChangeDto } from './dto/bulk-status-change.dto';
import { ServiceOfferService } from '../service-offer/service-offer.service';
import { CalculateServicePriceDto } from '../service-offer/dto/calculate-service-price.dto';
import { PriceCalculation } from '../service-offer/interfaces/price-calculation.interface';
import { SessionManagerService } from './services/session-manager.service';

@Injectable()
export class ServiceService {
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
    @InjectModel('EmployeeShift')
    private readonly employeeShiftModel: Model<EmployeeShift>,
    private readonly serviceOfferService: ServiceOfferService,
    private readonly sessionManagerService: SessionManagerService,
  ) {}

  async createService(createDto: CreateServiceWithSessionsDto): Promise<Service> {
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

    // Check for duplicates only within the same clinic or complex department
    const duplicateValidationQuery: any = {
      name: { $regex: new RegExp(`^${createDto.name.trim()}$`, 'i') }, // Case-insensitive exact match
      deletedAt: { $exists: false },
    };

    // If this is for a specific complex department, check within that department only
    if (createDto.complexDepartmentId) {
      duplicateValidationQuery.complexDepartmentId = new Types.ObjectId(
        createDto.complexDepartmentId,
      );
      duplicateValidationQuery.clinicId = { $exists: false }; // Ensure it's not a clinic-specific service

      // Check if service already exists in this complex department
      const existing = await this.serviceModel.findOne(
        duplicateValidationQuery,
      );
      if (existing) {
        throw new BadRequestException(
          `Service "${createDto.name}" already exists in this department. Please choose a different name.`,
        );
      }
    }

    // If this is for a specific clinic, check within that clinic only
    if (createDto.clinicId) {
      duplicateValidationQuery.clinicId = new Types.ObjectId(
        createDto.clinicId,
      );
      duplicateValidationQuery.complexDepartmentId = { $exists: false }; // Ensure it's not a department service

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
    };

    // Add complex department ID only if provided
    if (createDto.complexDepartmentId) {
      serviceData.complexDepartmentId = new Types.ObjectId(
        createDto.complexDepartmentId,
      );
    }

    // Add clinic ID only if provided (for clinic-specific services)
    if (createDto.clinicId) {
      serviceData.clinicId = new Types.ObjectId(createDto.clinicId);
    }

    // Process sessions if provided (Requirements: 1.1-1.7)
    if (createDto.sessions && createDto.sessions.length > 0) {
      serviceData.sessions = this.sessionManagerService.validateAndProcessSessions(
        createDto.sessions,
        serviceData.durationMinutes,
      );
    }

    if (serviceData.serviceCategory) {
      await this.ensureServiceCategoryExists(serviceData.serviceCategory);
    }

    // doctorIds requires clinicId — reject early before any DB writes
    if (createDto.doctorIds && createDto.doctorIds.length > 0) {
      if (!createDto.clinicId) {
        throw new BadRequestException({
          message: {
            ar: 'يجب تحديد معرّف العيادة (clinicId) عند إرسال قائمة الأطباء',
            en: 'clinicId is required when doctorIds are provided',
          },
        });
      }
      await this.validateDoctorAssignments(createDto.doctorIds, createDto.clinicId);
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
    if (createDto.doctorIds && createDto.doctorIds.length > 0) {
      const assignmentResults = await this.processDoctorAssignments(
        (savedService._id as Types.ObjectId).toString(),
        createDto.doctorIds,
        createDto.clinicId!,
      );
      return {
        ...savedService.toObject(),
        doctorAssignments: assignmentResults,
      };
    }

    return savedService;
  }

  /**
   * Validates all doctor IDs upfront (before any DB write) using the
   * service-level clinicId as the scope for every assignment.
   */
  private async validateDoctorAssignments(
    doctorIds: string[],
    clinicId: string,
  ): Promise<void> {
    // --- Clinic must exist ---
    const clinic = await this.clinicModel.findById(clinicId);
    if (!clinic) {
      throw new BadRequestException({
        message: {
          ar: `العيادة ${clinicId} غير موجودة`,
          en: `Clinic ${clinicId} not found`,
        },
        clinicId,
      });
    }

    for (const doctorId of doctorIds) {
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
   * Ensures the ClinicService junction record exists and creates a
   * DoctorService assignment for each doctor ID under the same clinicId.
   */
  private async processDoctorAssignments(
    serviceId: string,
    doctorIds: string[],
    clinicId: string,
  ): Promise<any[]> {
    // Ensure ClinicService junction record exists once for this clinic
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

    const results: any[] = [];
    for (const doctorId of doctorIds) {
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

  async getServicesByComplexDepartment(
    complexDepartmentId: string,
  ): Promise<Service[]> {
    return this.serviceModel
      .find({
        complexDepartmentId: new Types.ObjectId(complexDepartmentId),
        deletedAt: { $exists: false },
      })
      .exec();
  }

  async getAllServices(complexDepartmentId?: string): Promise<Service[]> {
    const query: any = {
      deletedAt: { $exists: false },
    };

    if (complexDepartmentId) {
      query.complexDepartmentId = new Types.ObjectId(complexDepartmentId);
    }

    return this.serviceModel.find(query).exec();
  }

  // New method: Validate service names for clinic onboarding to prevent duplicates across forms
  async validateServiceNamesForClinic(
    serviceNames: string[],
    complexDepartmentId?: string,
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

      if (complexDepartmentId) {
        query.complexDepartmentId = new Types.ObjectId(complexDepartmentId);
      } else {
        query.complexDepartmentId = { $exists: false };
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

  // New method: Get all services for a clinic (including complex department services)
  async getServicesForClinic(complexDepartmentId?: string): Promise<Service[]> {
    try {
      const query: any = {};

      if (complexDepartmentId) {
        query.complexDepartmentId = new Types.ObjectId(complexDepartmentId);
      } else {
        query.complexDepartmentId = { $exists: false };
      }

      return await this.serviceModel.find(query).exec();
    } catch (error) {
      console.error('Error getting services for clinic:', error);
      return [];
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
      .populate('serviceId')
      .exec();

    return clinicServices.map((cs) => cs.serviceId as unknown as Service);
  }

  async getServicesOwnedByClinic(clinicId: string): Promise<Service[]> {
    // Get services that are directly owned by this clinic
    return this.serviceModel
      .find({
        clinicId: new Types.ObjectId(clinicId),
      })
      .exec();
  }

  async getService(serviceId: string): Promise<Service> {
    const service = await this.serviceModel
      .findOne({
        _id: new Types.ObjectId(serviceId),
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
        isActive: true,
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
      };
    });
  }

  async updateService(
    serviceId: string,
    updateDto: UpdateServiceWithSessionsDto,
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

      if (service.complexDepartmentId) {
        duplicateValidationQuery.complexDepartmentId =
          service.complexDepartmentId;
        duplicateValidationQuery.clinicId = { $exists: false };
      } else if (service.clinicId) {
        duplicateValidationQuery.clinicId = service.clinicId;
        duplicateValidationQuery.complexDepartmentId = { $exists: false };
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

    // Handle complexDepartmentId change
    if (updateDto.complexDepartmentId !== undefined) {
      if (updateDto.complexDepartmentId) {
        service.complexDepartmentId = new Types.ObjectId(
          updateDto.complexDepartmentId,
        );
        service.clinicId = undefined; // Clear clinicId if setting complexDepartmentId
      } else {
        service.complexDepartmentId = undefined;
      }
    }

    // Handle clinicId change
    if (updateDto.clinicId !== undefined) {
      if (updateDto.clinicId) {
        service.clinicId = new Types.ObjectId(updateDto.clinicId);
        service.complexDepartmentId = undefined; // Clear complexDepartmentId if setting clinicId
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
        service.sessions = this.sessionManagerService.validateAndProcessSessions(
          updateDto.sessions,
          effectiveDuration,
        ) as any;
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
    const usedCategories = await this.serviceModel.distinct('serviceCategory', {
      deletedAt: { $exists: false },
      serviceCategory: { $exists: true, $nin: ['', null] },
    });

    const normalizedUsedNames = Array.from(
      new Set(
        usedCategories
          .map((value) => (typeof value === 'string' ? value.trim() : ''))
          .filter((value) => value.length > 0),
      ),
    );

    if (normalizedUsedNames.length > 0) {
      const existing = await this.serviceCategoryModel
        .find()
        .select('name')
        .lean();

      const existingNames = new Set(
        existing.map((item) => item.name.trim().toLowerCase()),
      );

      const missingNames = normalizedUsedNames.filter(
        (name) => !existingNames.has(name.toLowerCase()),
      );

      if (missingNames.length > 0) {
        try {
          await this.serviceCategoryModel.insertMany(
            missingNames.map((name) => ({ name })),
            { ordered: false },
          );
        } catch {
          // Ignore duplicate key races; final list is fetched below.
        }
      }
    }

    const categories = await this.serviceCategoryModel
      .find()
      .sort({ name: 1 })
      .exec();

    return categories.map((category) => ({
      id: (category._id as Types.ObjectId).toString(),
      name: category.name,
    }));
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

  async deleteService(serviceId: string, userId?: string): Promise<void> {
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
      updateDto.complexDepartmentId !== undefined &&
      updateDto.complexDepartmentId !== service.complexDepartmentId?.toString()
    ) {
      changes.push('complexDepartmentId');
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
    complexDepartmentId?: string,
    clinicId?: string,
  ): Promise<Service[]> {
    const query: any = {
      isActive: true,
      deletedAt: { $exists: false },
    };

    if (complexDepartmentId) {
      query.complexDepartmentId = new Types.ObjectId(complexDepartmentId);
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
  async getStatusHistory(serviceId: string): Promise<any[]> {
    const service = await this.serviceModel.findById(serviceId).exec();

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
  async getServiceStats(serviceId: string): Promise<any> {
    const service = await this.serviceModel.findById(serviceId);
    if (!service) {
      throw new NotFoundException({
        message: {
          ar: 'الخدمة غير موجودة',
          en: 'Service not found',
        },
      });
    }

    const serviceObjectId = new Types.ObjectId(serviceId);

    const statsResult = await this.appointmentModel.aggregate([
      {
        $match: {
          serviceId: serviceObjectId,
          isDeleted: { $ne: true },
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
                completedPatients: {
                  $addToSet: {
                    $cond: [
                      { $eq: ['$status', 'completed'] },
                      '$patientId',
                      '$$REMOVE',
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
    ]);

    const data = statsResult[0];
    const utilization = data.utilization[0] || {};
    const patientStats = data.patientGroups[0] || {};
    const frequentDoctor = data.frequentDoctor[0] || null;
    const frequentClinic = data.frequentClinic[0] || null;

    const totalPatientsServed = utilization.completedPatients?.length || 0;
    const completedSessions = utilization.completedCount || 0;
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
