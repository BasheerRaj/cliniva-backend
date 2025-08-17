import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Service } from '../database/schemas/service.schema';
import { ClinicService } from '../database/schemas/clinic-service.schema';
import { CreateServiceDto, AssignServicesDto } from './dto/create-service.dto';

@Injectable()
export class ServiceService {
  constructor(
    @InjectModel('Service') private readonly serviceModel: Model<Service>,
    @InjectModel('ClinicService') private readonly clinicServiceModel: Model<ClinicService>,
  ) {}

  async createService(createDto: CreateServiceDto): Promise<Service> {
    // Check if service already exists for this complex department
    const existing = await this.serviceModel.findOne({
      complexDepartmentId: new Types.ObjectId(createDto.complexDepartmentId),
      name: createDto.name
    });

    if (existing) {
      throw new BadRequestException('Service with this name already exists for this department');
    }

    const service = new this.serviceModel({
      ...createDto,
      complexDepartmentId: new Types.ObjectId(createDto.complexDepartmentId)
    });

    return await service.save();
  }

  async getServicesByComplexDepartment(complexDepartmentId: string): Promise<Service[]> {
    return await this.serviceModel.find({
      complexDepartmentId: new Types.ObjectId(complexDepartmentId)
    }).exec();
  }

  async assignServicesToClinic(clinicId: string, assignDto: AssignServicesDto): Promise<ClinicService[]> {
    const results: ClinicService[] = [];

    for (const assignment of assignDto.serviceAssignments) {
      // Check if already assigned
      const existing = await this.clinicServiceModel.findOne({
        clinicId: new Types.ObjectId(clinicId),
        serviceId: new Types.ObjectId(assignment.serviceId)
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
          isActive: assignment.isActive !== false
        });
        results.push(await clinicService.save());
      }
    }

    return results;
  }

  async getServicesByClinic(clinicId: string): Promise<Service[]> {
    const clinicServices = await this.clinicServiceModel
      .find({ 
        clinicId: new Types.ObjectId(clinicId),
        isActive: true 
      })
      .populate('serviceId')
      .exec();

    return clinicServices.map(cs => cs.serviceId as unknown as Service);
  }

  async getService(serviceId: string): Promise<Service> {
    const service = await this.serviceModel.findById(serviceId);
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    return service;
  }
}
