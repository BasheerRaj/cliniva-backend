import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Service } from '../database/schemas/service.schema';
import { ClinicService } from '../database/schemas/clinic-service.schema';
import { CreateServiceDto, AssignServicesDto } from './dto/create-service.dto';

@Injectable()
export class ServiceService {
  constructor(
    @InjectModel('Service') private readonly serviceModel: Model<Service>,
    @InjectModel('ClinicService')
    private readonly clinicServiceModel: Model<ClinicService>,
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
}
