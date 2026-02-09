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
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ServiceService } from './service.service';
import { CreateServiceDto, AssignServicesDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Service } from '../database/schemas/service.schema';
import { ClinicService } from '../database/schemas/clinic-service.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CREATE_SERVICE_REQUEST_EXAMPLE,
  CREATE_SERVICE_CLINIC_REQUEST_EXAMPLE,
  CREATE_SERVICE_RESPONSE_EXAMPLE,
  UPDATE_SERVICE_REQUEST_EXAMPLE,
  UPDATE_SERVICE_RESPONSE_EXAMPLE,
  DELETE_SERVICE_RESPONSE_EXAMPLE,
  GET_SERVICE_RESPONSE_EXAMPLE,
  GET_SERVICES_LIST_RESPONSE_EXAMPLE,
  VALIDATE_SERVICE_NAMES_REQUEST_EXAMPLE,
  VALIDATE_SERVICE_NAMES_VALID_RESPONSE_EXAMPLE,
  VALIDATE_SERVICE_NAMES_CONFLICT_RESPONSE_EXAMPLE,
  ASSIGN_SERVICES_REQUEST_EXAMPLE,
  ASSIGN_SERVICES_RESPONSE_EXAMPLE,
  ERROR_SERVICE_NOT_FOUND_EXAMPLE,
  ERROR_SERVICE_DUPLICATE_NAME_EXAMPLE,
  ERROR_SERVICE_VALIDATION_EXAMPLE,
  ERROR_SERVICE_UPDATE_REQUIRES_CONFIRMATION_EXAMPLE,
  ERROR_SERVICE_DELETE_HAS_APPOINTMENTS_EXAMPLE,
  ERROR_UNAUTHORIZED_EXAMPLE,
} from './examples/swagger-examples';

@ApiTags('Services')
@Controller('services')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  /**
   * Create a new service
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new service',
    description: `
      Creates a new medical service for a complex department or clinic.
      
      **Business Rules:**
      - Service must belong to one and only one complex department OR clinic
      - Service name must be 2-100 characters
      - Service name must be unique within the same complex department or clinic
      - Duration defaults to 30 minutes if not provided
      - Price defaults to 0 if not provided
    `,
  })
  @ApiBody({
    description: 'Service creation data',
    schema: {
      example: CREATE_SERVICE_REQUEST_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Service created successfully',
    schema: {
      example: CREATE_SERVICE_RESPONSE_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or duplicate service name',
    schema: {
      example: ERROR_SERVICE_DUPLICATE_NAME_EXAMPLE,
    },
  })
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
  @ApiOperation({
    summary: 'Get service by ID',
    description: 'Retrieves a single service by its MongoDB ObjectId',
  })
  @ApiParam({
    name: 'id',
    description: 'Service MongoDB ObjectId',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Service retrieved successfully',
    schema: {
      example: GET_SERVICE_RESPONSE_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Service not found',
    schema: {
      example: ERROR_SERVICE_NOT_FOUND_EXAMPLE,
    },
  })
  async getServiceById(@Param('id') id: string): Promise<Service> {
    return this.serviceService.getService(id);
  }

  /**
   * Validate service names for clinic onboarding (prevents duplicates across forms)
   */
  @Post('validate-names')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate service names',
    description:
      'Validates multiple service names for uniqueness within a complex department. Used during onboarding to prevent duplicates across forms.',
  })
  @ApiBody({
    description: 'Service names to validate',
    schema: {
      example: VALIDATE_SERVICE_NAMES_REQUEST_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Validation result',
    schema: {
      examples: {
        valid: {
          summary: 'All names are valid',
          value: VALIDATE_SERVICE_NAMES_VALID_RESPONSE_EXAMPLE,
        },
        conflict: {
          summary: 'Conflicts detected',
          value: VALIDATE_SERVICE_NAMES_CONFLICT_RESPONSE_EXAMPLE,
        },
      },
    },
  })
  async validateServiceNames(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    body: {
      serviceNames: string[];
      complexDepartmentId?: string;
    },
  ): Promise<{
    isValid: boolean;
    conflicts: string[];
    suggestions: string[];
    message: string;
  }> {
    const { serviceNames, complexDepartmentId } = body;

    if (!serviceNames || serviceNames.length === 0) {
      return {
        isValid: true,
        conflicts: [],
        suggestions: [],
        message: 'No services to validate',
      };
    }

    const validation = await this.serviceService.validateServiceNamesForClinic(
      serviceNames,
      complexDepartmentId,
    );

    let message = '';
    if (validation.isValid) {
      message = 'All service names are valid and available';
    } else if (validation.conflicts.length > 0) {
      message = `Service name conflicts detected: ${validation.conflicts.join(', ')}`;
    }

    return {
      ...validation,
      message,
    };
  }

  /**
   * Get services by complex department
   */
  @Get('complex-departments/:complexDepartmentId')
  @ApiOperation({
    summary: 'Get services by complex department',
    description: 'Retrieves all services for a specific complex department',
  })
  @ApiParam({
    name: 'complexDepartmentId',
    description: 'Complex Department MongoDB ObjectId',
    example: '507f1f77bcf86cd799439012',
  })
  @ApiResponse({
    status: 200,
    description: 'List of services',
    schema: {
      example: GET_SERVICES_LIST_RESPONSE_EXAMPLE,
    },
  })
  async getServicesByComplexDepartment(
    @Param('complexDepartmentId') complexDepartmentId: string,
  ): Promise<Service[]> {
    return this.serviceService.getServicesByComplexDepartment(
      complexDepartmentId,
    );
  }

  /**
   * Assign services to a clinic
   */
  @Post('clinics/:clinicId/assign')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Assign services to a clinic',
    description:
      'Assigns one or more services to a clinic with optional price overrides and activation status',
  })
  @ApiParam({
    name: 'clinicId',
    description: 'Clinic MongoDB ObjectId',
    example: '507f1f77bcf86cd799439014',
  })
  @ApiBody({
    description: 'Service assignments',
    schema: {
      example: ASSIGN_SERVICES_REQUEST_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Services assigned successfully',
    schema: {
      example: ASSIGN_SERVICES_RESPONSE_EXAMPLE,
    },
  })
  async assignServicesToClinic(
    @Param('clinicId') clinicId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    assignDto: AssignServicesDto,
  ): Promise<ClinicService[]> {
    return this.serviceService.assignServicesToClinic(clinicId, assignDto);
  }

  /**
   * Get services for a specific clinic (via ClinicService junction table)
   */
  @Get('clinics/:clinicId')
  @ApiOperation({
    summary: 'Get services assigned to a clinic',
    description:
      'Retrieves all services assigned to a specific clinic via the ClinicService junction table',
  })
  @ApiParam({
    name: 'clinicId',
    description: 'Clinic MongoDB ObjectId',
    example: '507f1f77bcf86cd799439014',
  })
  @ApiResponse({
    status: 200,
    description: 'List of services assigned to the clinic',
    schema: {
      example: GET_SERVICES_LIST_RESPONSE_EXAMPLE,
    },
  })
  async getServicesByClinic(
    @Param('clinicId') clinicId: string,
  ): Promise<Service[]> {
    return this.serviceService.getServicesByClinic(clinicId);
  }

  /**
   * Get services directly owned by a specific clinic
   */
  @Get('clinics/:clinicId/owned')
  @ApiOperation({
    summary: 'Get services owned by a clinic',
    description:
      'Retrieves services that are directly owned by a clinic (not inherited from complex department)',
  })
  @ApiParam({
    name: 'clinicId',
    description: 'Clinic MongoDB ObjectId',
    example: '507f1f77bcf86cd799439014',
  })
  @ApiResponse({
    status: 200,
    description: 'List of services owned by the clinic',
    schema: {
      example: GET_SERVICES_LIST_RESPONSE_EXAMPLE,
    },
  })
  async getServicesOwnedByClinic(
    @Param('clinicId') clinicId: string,
  ): Promise<Service[]> {
    return this.serviceService.getServicesOwnedByClinic(clinicId);
  }

  /**
   * Get all services for a clinic context
   */
  @Get('clinic')
  @ApiOperation({
    summary: 'Get services for clinic context',
    description:
      'Retrieves all services available for a clinic context, optionally filtered by complex department',
  })
  @ApiQuery({
    name: 'complexDepartmentId',
    required: false,
    description: 'Optional complex department ID to filter services',
    example: '507f1f77bcf86cd799439012',
  })
  @ApiResponse({
    status: 200,
    description: 'List of services',
    schema: {
      example: GET_SERVICES_LIST_RESPONSE_EXAMPLE,
    },
  })
  async getServicesForClinic(
    @Query('complexDepartmentId') complexDepartmentId?: string,
  ): Promise<Service[]> {
    return this.serviceService.getServicesForClinic(complexDepartmentId);
  }

  /**
   * Get all services for a clinic context with complex department
   */
  @Get('clinic/:complexDepartmentId')
  @ApiOperation({
    summary: 'Get services for clinic context by department',
    description:
      'Retrieves all services available for a clinic context filtered by complex department',
  })
  @ApiParam({
    name: 'complexDepartmentId',
    description: 'Complex Department MongoDB ObjectId',
    example: '507f1f77bcf86cd799439012',
  })
  @ApiResponse({
    status: 200,
    description: 'List of services',
    schema: {
      example: GET_SERVICES_LIST_RESPONSE_EXAMPLE,
    },
  })
  async getServicesForClinicWithDepartment(
    @Param('complexDepartmentId') complexDepartmentId: string,
  ): Promise<Service[]> {
    return this.serviceService.getServicesForClinic(complexDepartmentId);
  }

  /**
   * Get all services (with optional filtering)
   */
  @Get()
  @ApiOperation({
    summary: 'Get all services',
    description:
      'Retrieves all services with optional filtering by complex department',
  })
  @ApiQuery({
    name: 'complexDepartmentId',
    required: false,
    description: 'Optional complex department ID to filter services',
    example: '507f1f77bcf86cd799439012',
  })
  @ApiResponse({
    status: 200,
    description: 'List of services',
    schema: {
      example: GET_SERVICES_LIST_RESPONSE_EXAMPLE,
    },
  })
  async getAllServices(
    @Query('complexDepartmentId') complexDepartmentId?: string,
  ): Promise<Service[]> {
    if (complexDepartmentId) {
      return this.serviceService.getServicesByComplexDepartment(
        complexDepartmentId,
      );
    }
    // If no specific filtering is needed, you could implement a general getAll method
    // For now, returning empty array as base service doesn't have getAll
    return [];
  }

  /**
   * Update an existing service
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update an existing service',
    description: `
      Updates an existing service. Must detect changes and trigger appointment rescheduling if necessary.
      
      **Business Rules:**
      - If complex department, clinic, or duration are changed, all affected appointments must be rescheduled
      - Cannot change service if it has active appointments without confirmation
      - Must track change history
      
      **Rescheduling:**
      - If changes affect active appointments, set \`confirmRescheduling: true\` to proceed
      - Appointments will be marked for rescheduling and notifications will be sent to patients
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'Service MongoDB ObjectId',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({
    description: 'Service update data',
    schema: {
      example: UPDATE_SERVICE_REQUEST_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Service updated successfully',
    schema: {
      example: UPDATE_SERVICE_RESPONSE_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or requires confirmation for rescheduling',
    schema: {
      examples: {
        requiresConfirmation: {
          summary: 'Requires confirmation for rescheduling',
          value: ERROR_SERVICE_UPDATE_REQUIRES_CONFIRMATION_EXAMPLE,
        },
        validation: {
          summary: 'Validation error',
          value: ERROR_SERVICE_VALIDATION_EXAMPLE,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    schema: {
      example: ERROR_UNAUTHORIZED_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Service not found',
    schema: {
      example: ERROR_SERVICE_NOT_FOUND_EXAMPLE,
    },
  })
  async updateService(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    updateServiceDto: UpdateServiceDto,
    @Request() req?: any,
  ): Promise<Service & { affectedAppointments?: any }> {
    const userId = req?.user?.id;
    return this.serviceService.updateService(id, updateServiceDto, userId);
  }

  /**
   * Delete a service (soft delete)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a service (soft delete)',
    description: `
      Soft deletes a service. Cannot delete if service has active appointments.
      
      **Business Rules:**
      - Cannot delete service with active appointments (scheduled, confirmed, or in_progress)
      - Uses soft delete (adds deletedAt timestamp)
      - Tracks who deleted the service
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'Service MongoDB ObjectId',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Service deleted successfully',
    schema: {
      example: DELETE_SERVICE_RESPONSE_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete service with active appointments',
    schema: {
      example: ERROR_SERVICE_DELETE_HAS_APPOINTMENTS_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    schema: {
      example: ERROR_UNAUTHORIZED_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Service not found',
    schema: {
      example: ERROR_SERVICE_NOT_FOUND_EXAMPLE,
    },
  })
  async deleteService(
    @Param('id') id: string,
    @Request() req?: any,
  ): Promise<{
    success: boolean;
    message: { ar: string; en: string };
    deletedAt: Date;
  }> {
    const userId = req?.user?.id;
    await this.serviceService.deleteService(id, userId);
    return {
      success: true,
      message: {
        ar: 'تم حذف الخدمة بنجاح',
        en: 'Service deleted successfully',
      },
      deletedAt: new Date(),
    };
  }
}
