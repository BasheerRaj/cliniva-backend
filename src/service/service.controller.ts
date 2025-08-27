import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ServiceService } from './service.service';
import { CreateServiceDto, AssignServicesDto } from './dto/create-service.dto';
import { Service } from '../database/schemas/service.schema';
import { ClinicService } from '../database/schemas/clinic-service.schema';

@Controller('services')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  /**
   * Create a new service
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createService(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    createServiceDto: CreateServiceDto,
  ): Promise<Service> {
    return this.serviceService.createService(createServiceDto);
  }

  /**
   * Get service by ID
   */
  @Get(':id')
  async getServiceById(@Param('id') id: string): Promise<Service> {
    return this.serviceService.getService(id);
  }

  /**
   * Validate service names for clinic onboarding (prevents duplicates across forms)
   */
  @Post('validate-names')
  @HttpCode(HttpStatus.OK)
  async validateServiceNames(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    body: { serviceNames: string[]; complexDepartmentId?: string }
  ): Promise<{ isValid: boolean; conflicts: string[]; suggestions: string[]; message: string }> {
    const { serviceNames, complexDepartmentId } = body;
    
    if (!serviceNames || serviceNames.length === 0) {
      return {
        isValid: true,
        conflicts: [],
        suggestions: [],
        message: 'No services to validate'
      };
    }

    const validation = await this.serviceService.validateServiceNamesForClinic(serviceNames, complexDepartmentId);
    
    let message = '';
    if (validation.isValid) {
      message = 'All service names are valid and available';
    } else if (validation.conflicts.length > 0) {
      message = `Service name conflicts detected: ${validation.conflicts.join(', ')}`;
    }

    return {
      ...validation,
      message
    };
  }

  /**
   * Get services by complex department
   */
  @Get('complex-departments/:complexDepartmentId')
  async getServicesByComplexDepartment(
    @Param('complexDepartmentId') complexDepartmentId: string,
  ): Promise<Service[]> {
    return this.serviceService.getServicesByComplexDepartment(complexDepartmentId);
  }

  /**
   * Assign services to a clinic
   */
  @Post('clinics/:clinicId/assign')
  @HttpCode(HttpStatus.CREATED)
  async assignServicesToClinic(
    @Param('clinicId') clinicId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    assignDto: AssignServicesDto,
  ): Promise<ClinicService[]> {
    return this.serviceService.assignServicesToClinic(clinicId, assignDto);
  }

  /**
   * Get services for a specific clinic
   */
  @Get('clinics/:clinicId')
  async getServicesByClinic(
    @Param('clinicId') clinicId: string,
  ): Promise<Service[]> {
    return this.serviceService.getServicesByClinic(clinicId);
  }

  /**
   * Get all services for a clinic context
   */
  @Get('clinic/:complexDepartmentId?')
  async getServicesForClinic(
    @Param('complexDepartmentId') complexDepartmentId?: string
  ): Promise<Service[]> {
    return this.serviceService.getServicesForClinic(complexDepartmentId);
  }

  /**
   * Get all services (with optional filtering)
   */
  @Get()
  async getAllServices(
    @Query('complexDepartmentId') complexDepartmentId?: string,
  ): Promise<Service[]> {
    if (complexDepartmentId) {
      return this.serviceService.getServicesByComplexDepartment(complexDepartmentId);
    }
    // If no specific filtering is needed, you could implement a general getAll method
    // For now, returning empty array as base service doesn't have getAll
    return [];
  }
}
