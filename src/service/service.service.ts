import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Service } from '../database/schemas/service.schema';
import { ClinicService } from '../database/schemas/clinic-service.schema';
import { Appointment } from '../database/schemas/appointment.schema';
import { Notification } from '../database/schemas/notification.schema';
import { CreateServiceDto, AssignServicesDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServiceService {
  private readonly logger = new Logger(ServiceService.name);

  constructor(
    @InjectModel('Service') private readonly serviceModel: Model<Service>,
    @InjectModel('ClinicService')
    private readonly clinicServiceModel: Model<ClinicService>,
    @InjectModel('Appointment')
    private readonly appointmentModel: Model<Appointment>,
    @InjectModel('Notification')
    private readonly notificationModel: Model<Notification>,
  ) {}

  async createService(createDto: CreateServiceDto): Promise<Service> {
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

    const service = new this.serviceModel(serviceData);
    return await service.save();
  }

  async getServicesByComplexDepartment(
    complexDepartmentId: string,
  ): Promise<Service[]> {
    return this.serviceModel
      .find({
        complexDepartmentId: new Types.ObjectId(complexDepartmentId),
      })
      .exec();
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
    const service = await this.serviceModel.findById(serviceId);
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    return service;
  }

  async updateService(
    serviceId: string,
    updateDto: UpdateServiceDto,
    userId?: string,
  ): Promise<Service & { affectedAppointments?: any }> {
    const service = await this.serviceModel.findById(serviceId);
    if (!service) {
      throw new NotFoundException({
        message: {
          ar: 'الخدمة غير موجودة',
          en: 'Service not found',
        },
      });
    }

    // Detect critical changes that require rescheduling
    const criticalChanges = this.detectCriticalChanges(service, updateDto);

    let affectedAppointments: Appointment[] = [];
    if (criticalChanges.length > 0) {
      // Find affected appointments
      affectedAppointments = await this.findAffectedAppointments(serviceId);

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
        await this.markAppointmentsForRescheduling(
          affectedAppointments,
          userId,
          'Service details changed - requires rescheduling',
        );

        // Send notifications
        await this.notifyAffectedParties(affectedAppointments);
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

      const duplicateValidationQuery: any = {
        name: { $regex: new RegExp(`^${updateDto.name.trim()}$`, 'i') },
        _id: { $ne: new Types.ObjectId(serviceId) },
      };

      // Check uniqueness within the same scope
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
          `Service "${updateDto.name}" already exists in this scope. Please choose a different name.`,
        );
      }
    }

    // Validate that we're not changing from one scope to another incorrectly
    if (updateDto.complexDepartmentId || updateDto.clinicId) {
      const newComplexDeptId = updateDto.complexDepartmentId
        ? new Types.ObjectId(updateDto.complexDepartmentId)
        : service.complexDepartmentId;
      const newClinicId = updateDto.clinicId
        ? new Types.ObjectId(updateDto.clinicId)
        : service.clinicId;

      if (newComplexDeptId && newClinicId) {
        throw new BadRequestException(
          'Cannot assign service to both complex department and clinic',
        );
      }
    }

    // Update service fields
    const updateData: any = {};
    if (updateDto.name !== undefined) {
      updateData.name = updateDto.name.trim();
    }
    if (updateDto.description !== undefined) {
      updateData.description = updateDto.description?.trim() || undefined;
    }
    if (updateDto.durationMinutes !== undefined) {
      updateData.durationMinutes = updateDto.durationMinutes;
    }
    if (updateDto.price !== undefined) {
      updateData.price = updateDto.price;
    }
    if (updateDto.complexDepartmentId !== undefined) {
      updateData.complexDepartmentId = updateDto.complexDepartmentId
        ? new Types.ObjectId(updateDto.complexDepartmentId)
        : undefined;
    }
    if (updateDto.clinicId !== undefined) {
      updateData.clinicId = updateDto.clinicId
        ? new Types.ObjectId(updateDto.clinicId)
        : undefined;
    }

    const updatedService = await this.serviceModel.findByIdAndUpdate(
      serviceId,
      updateData,
      { new: true },
    );

    if (!updatedService) {
      throw new NotFoundException({
        message: {
          ar: 'الخدمة غير موجودة',
          en: 'Service not found',
        },
      });
    }

    this.logger.log(`Service updated: ${serviceId}`);

    // Add affected appointments info to the response
    const result = updatedService.toObject() as any;
    if (affectedAppointments.length > 0) {
      result.affectedAppointments = {
        count: affectedAppointments.length,
        status: updateDto.confirmRescheduling
          ? 'needs_rescheduling'
          : 'pending_confirmation',
        notificationsSent: updateDto.confirmRescheduling || false,
      };
    }

    return result;
  }

  async deleteService(serviceId: string, userId?: string): Promise<void> {
    const service = await this.serviceModel.findById(serviceId);
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
      status: { $in: ['scheduled', 'confirmed', 'in_progress'] },
      appointmentDate: { $gte: new Date() },
      deletedAt: { $exists: false },
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

    // Soft delete
    await this.serviceModel.findByIdAndUpdate(serviceId, {
      deletedAt: new Date(),
      deletedBy: userId ? new Types.ObjectId(userId) : undefined,
      isActive: false,
    });

    this.logger.log(`Service deleted: ${serviceId}`);
  }

  private detectCriticalChanges(
    service: Service,
    updateDto: UpdateServiceDto,
  ): string[] {
    const changes: string[] = [];

    if (
      updateDto.complexDepartmentId &&
      updateDto.complexDepartmentId !== service.complexDepartmentId?.toString()
    ) {
      changes.push('complexDepartmentId');
    }

    if (
      updateDto.clinicId &&
      updateDto.clinicId !== service.clinicId?.toString()
    ) {
      changes.push('clinicId');
    }

    // Duration changes might affect scheduling
    if (
      updateDto.durationMinutes &&
      updateDto.durationMinutes !== service.durationMinutes
    ) {
      changes.push('durationMinutes');
    }

    return changes;
  }

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

  private async markAppointmentsForRescheduling(
    appointments: Appointment[],
    userId?: string,
    reason?: string,
  ): Promise<void> {
    const updateData: any = {
      status: 'scheduled', // Keep as scheduled but mark for rescheduling
      markedForReschedulingAt: new Date(),
      reschedulingReason: reason || 'Service details changed - requires rescheduling',
    };

    if (userId) {
      updateData.markedBy = new Types.ObjectId(userId);
    }

    await this.appointmentModel.updateMany(
      { _id: { $in: appointments.map((a) => a._id) } },
      updateData,
    );

    this.logger.log(
      `Marked ${appointments.length} appointments for rescheduling`,
    );
  }

  private async notifyAffectedParties(
    appointments: Appointment[],
  ): Promise<void> {
    const notifications: any[] = [];

    for (const appointment of appointments) {
      const { title, message } = this.getNotificationContent(appointment);

      notifications.push({
        recipientId: appointment.patientId,
        title,
        message,
        notificationType: 'appointment_cancelled', // Using existing enum value
        priority: 'high',
        relatedEntityType: 'appointment',
        relatedEntityId: appointment._id,
        deliveryMethod: 'in_app',
        deliveryStatus: 'pending',
      });
    }

    if (notifications.length > 0) {
      await this.notificationModel.insertMany(notifications);
      this.logger.log(`Created ${notifications.length} patient notifications`);
    }
  }

  private getNotificationContent(appointment: Appointment): {
    title: string;
    message: string;
  } {
    return {
      title: 'Service Update Requires Rescheduling / تحديث الخدمة يتطلب إعادة الجدولة',
      message: `Your appointment for service "${appointment.serviceId}" needs to be rescheduled due to service changes. Please contact the clinic to reschedule. / موعدك للخدمة "${appointment.serviceId}" يحتاج إلى إعادة جدولة بسبب تغييرات الخدمة. يرجى الاتصال بالعيادة لإعادة الجدولة.`,
    };
  }
}
