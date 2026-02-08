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
import { Service } from '../database/schemas/service.schema';
import { ClinicService } from '../database/schemas/clinic-service.schema';
import { SERVICE_SWAGGER_EXAMPLES } from './constants/swagger-examples';

@ApiTags('Services')
@Controller('services')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  /**
   * Create a new service
   */
  @ApiOperation({
    summary: 'Create new service',
    description:
      'Creates a new medical service with pricing and duration. Services can be created at the complex department level or clinic level. Service names must be unique within their scope (department or clinic).',
  })
  @ApiResponse({
    status: 201,
    description: 'Service created successfully',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.CREATE_SERVICE_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - Invalid input data or duplicate service name',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.SERVICE_NAME_EXISTS,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @ApiBearerAuth()
  @ApiBody({ type: CreateServiceDto })
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
  @ApiOperation({
    summary: 'Get service by ID',
    description:
      'Retrieves detailed information about a specific medical service including name, description, duration, and pricing.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service retrieved successfully',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.GET_SERVICE_SUCCESS,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Service not found',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.SERVICE_NOT_FOUND,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'Service ID',
    type: String,
    example: '507f1f77bcf86cd799439011',
  })
  @Get(':id')
  async getServiceById(@Param('id') id: string): Promise<Service> {
    return this.serviceService.getService(id);
  }

  /**
   * Validate service names for clinic onboarding (prevents duplicates across forms)
   */
  @ApiOperation({
    summary: 'Validate service names',
    description:
      'Validates service names to prevent duplicates during clinic onboarding. Checks for conflicts within the same complex department or clinic scope and provides suggestions for alternative names if conflicts are found.',
  })
  @ApiResponse({
    status: 200,
    description: 'Validation completed - Returns validation result with conflicts and suggestions',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.VALIDATE_NAMES_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - Invalid input data',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiBearerAuth()
  @ApiBody({
    description: 'Service names to validate',
    schema: {
      type: 'object',
      properties: {
        serviceNames: {
          type: 'array',
          items: { type: 'string' },
          example: ['General Consultation', 'Blood Test', 'X-Ray'],
        },
        complexDepartmentId: {
          type: 'string',
          example: '507f1f77bcf86cd799439020',
        },
      },
      required: ['serviceNames'],
    },
  })
  @Post('validate-names')
  @HttpCode(HttpStatus.OK)
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
  @ApiOperation({
    summary: 'Get services by complex department',
    description:
      'Retrieves all medical services associated with a specific complex department. Returns services that are available at the department level.',
  })
  @ApiResponse({
    status: 200,
    description: 'Services retrieved successfully',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.SERVICES_BY_DEPARTMENT,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Complex department not found',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.NOT_FOUND,
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'complexDepartmentId',
    description: 'Complex department ID',
    type: String,
    example: '507f1f77bcf86cd799439020',
  })
  @Get('complex-departments/:complexDepartmentId')
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
  @ApiOperation({
    summary: 'Assign services to clinic',
    description:
      'Assigns one or more services to a specific clinic. Allows setting custom price overrides for each service at the clinic level. Creates or updates service assignments in the ClinicService junction table.',
  })
  @ApiResponse({
    status: 201,
    description: 'Services assigned successfully',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.ASSIGN_SERVICES_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - Invalid service or clinic ID',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Clinic or service not found',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.NOT_FOUND,
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'clinicId',
    description: 'Clinic ID',
    type: String,
    example: '507f1f77bcf86cd799439040',
  })
  @ApiBody({ type: AssignServicesDto })
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
   * Get services for a specific clinic (via ClinicService junction table)
   */
  @ApiOperation({
    summary: 'Get services by clinic',
    description:
      'Retrieves all active services assigned to a specific clinic through the ClinicService junction table. Returns services with any clinic-specific price overrides applied.',
  })
  @ApiResponse({
    status: 200,
    description: 'Services retrieved successfully',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.SERVICES_BY_CLINIC,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Clinic not found',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.NOT_FOUND,
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'clinicId',
    description: 'Clinic ID',
    type: String,
    example: '507f1f77bcf86cd799439040',
  })
  @Get('clinics/:clinicId')
  async getServicesByClinic(
    @Param('clinicId') clinicId: string,
  ): Promise<Service[]> {
    return this.serviceService.getServicesByClinic(clinicId);
  }

  /**
   * Get services directly owned by a specific clinic
   */
  @ApiOperation({
    summary: 'Get services owned by clinic',
    description:
      'Retrieves services that are directly owned and created by a specific clinic (not inherited from complex department). These are clinic-specific services.',
  })
  @ApiResponse({
    status: 200,
    description: 'Services retrieved successfully',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.SERVICES_OWNED_BY_CLINIC,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Clinic not found',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.NOT_FOUND,
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'clinicId',
    description: 'Clinic ID',
    type: String,
    example: '507f1f77bcf86cd799439040',
  })
  @Get('clinics/:clinicId/owned')
  async getServicesOwnedByClinic(
    @Param('clinicId') clinicId: string,
  ): Promise<Service[]> {
    return this.serviceService.getServicesOwnedByClinic(clinicId);
  }

  /**
   * Get all services for a clinic context
   */
  @ApiOperation({
    summary: 'Get services for clinic context',
    description:
      'Retrieves all services available in a clinic context. If complexDepartmentId is provided, returns services for that department. Otherwise returns services without department association.',
  })
  @ApiResponse({
    status: 200,
    description: 'Services retrieved successfully',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.LIST_SERVICES_SUCCESS,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiBearerAuth()
  @ApiQuery({
    name: 'complexDepartmentId',
    required: false,
    description: 'Complex department ID to filter services',
    type: String,
    example: '507f1f77bcf86cd799439020',
  })
  @Get('clinic')
  async getServicesForClinic(
    @Query('complexDepartmentId') complexDepartmentId?: string,
  ): Promise<Service[]> {
    return this.serviceService.getServicesForClinic(complexDepartmentId);
  }

  /**
   * Get all services for a clinic context with complex department
   */
  @ApiOperation({
    summary: 'Get services for clinic with department',
    description:
      'Retrieves all services available for a clinic within a specific complex department context.',
  })
  @ApiResponse({
    status: 200,
    description: 'Services retrieved successfully',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.SERVICES_BY_DEPARTMENT,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Complex department not found',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.NOT_FOUND,
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'complexDepartmentId',
    description: 'Complex department ID',
    type: String,
    example: '507f1f77bcf86cd799439020',
  })
  @Get('clinic/:complexDepartmentId')
  async getServicesForClinicWithDepartment(
    @Param('complexDepartmentId') complexDepartmentId: string,
  ): Promise<Service[]> {
    return this.serviceService.getServicesForClinic(complexDepartmentId);
  }

  /**
   * Get all services (with optional filtering)
   */
  @ApiOperation({
    summary: 'Get all services',
    description:
      'Retrieves all medical services with optional filtering by complex department. Returns a list of services with their details including pricing, duration, and descriptions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Services retrieved successfully',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.LIST_SERVICES_SUCCESS,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiBearerAuth()
  @ApiQuery({
    name: 'complexDepartmentId',
    required: false,
    description: 'Filter services by complex department ID',
    type: String,
    example: '507f1f77bcf86cd799439020',
  })
  @Get()
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
}
