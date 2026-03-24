import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Patch,
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
import { CreateServiceWithSessionsDto } from './dto/create-service-with-sessions.dto';
import { UpdateServiceWithSessionsDto } from './dto/update-service-with-sessions.dto';
import { ChangeServiceStatusDto } from './dto/change-service-status.dto';
import { BulkStatusChangeDto } from './dto/bulk-status-change.dto';
import { UpdateServiceCategoryDto } from './dto/update-service-category.dto';
import { CreateDoctorAssignmentDto } from './dto/doctor-assignment.dto';
import { Service } from '../database/schemas/service.schema';
import { ClinicService } from '../database/schemas/clinic-service.schema';
import { SERVICE_SWAGGER_EXAMPLES } from './constants/swagger-examples';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { ResponseBuilder } from '../common/utils/response-builder.util';

type ServicePaginationQuery = {
  page?: string;
  limit?: string;
};

type ServicePaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type PaginatedServiceResponse<T = any> = {
  data: T[];
  pagination: ServicePaginationMeta;
};

@ApiTags('Services')
@Controller('services')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  /**
   * Create a new service
   */
  @ApiOperation({
    summary: 'Create new service',
    description:
      'Creates a new medical service with pricing and duration. Services can be created at the complex level or clinic level. Service names must be unique within their scope (complex or clinic).',
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
    description:
      'Validation error - Invalid input data or duplicate service name',
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
  @ApiBody({ type: CreateServiceWithSessionsDto })
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createService(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    createServiceDto: CreateServiceWithSessionsDto,
  ): Promise<any> {
    const service = await this.serviceService.createService(createServiceDto);
    return this.enrichServiceResponse(service);
  }

  /**
   * Add or update service category for a service
   */
  @ApiOperation({
    summary: 'Add or update service category',
    description:
      'Adds a category for a service when missing, or updates it when already set.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service category saved successfully',
    schema: {
      example: {
        _id: '507f1f77bcf86cd799439011',
        name: 'General Consultation',
        serviceCategory: 'Consultation',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Service not found',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.SERVICE_NOT_FOUND,
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'Service ID',
    type: String,
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({ type: UpdateServiceCategoryDto })
  @Patch(':id/category')
  async updateServiceCategory(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UpdateServiceCategoryDto,
  ): Promise<Service> {
    return this.serviceService.updateServiceCategory(id, dto.serviceCategory);
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
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.STAFF, UserRole.DOCTOR, UserRole.MANAGER)
  @ApiParam({
    name: 'id',
    description: 'Service ID',
    type: String,
    example: '507f1f77bcf86cd799439011',
  })
  @Get(':id')
  async getServiceById(@Param('id') id: string): Promise<any> {
    const [service, assignedDoctors, { bySession, byDoctor }] = await Promise.all([
      this.serviceService.getService(id),
      this.serviceService.getAssignedDoctors(id),
      this.serviceService.getActiveAppointmentMaps(id),
    ]);

    const enriched = await this.enrichServiceResponse(service);

    // Attach activeAppointments to each session
    const sessionsWithAppts = (enriched.sessions ?? []).map((session: any) => ({
      ...session,
      activeAppointments: bySession.get(session._id?.toString() ?? '') ?? [],
    }));

    // Attach activeAppointments to each assigned doctor
    const doctorsWithAppts = assignedDoctors.map((entry: any) => {
      const doctorId = entry.doctor?._id?.toString() ?? '';
      return {
        ...entry,
        activeAppointments: byDoctor.get(doctorId) ?? [],
      };
    });

    return {
      ...enriched,
      sessions: sessionsWithAppts,
      assignedDoctors: doctorsWithAppts,
    };
  }

  /**
   * Update service
   */
  @ApiOperation({
    summary: 'Update service',
    description:
      'Updates an existing medical service. If changes affect active appointments (e.g., complex/clinic change, duration change), confirmation is required to proceed with rescheduling.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service updated successfully',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.UPDATE_SERVICE_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation error or requires confirmation for appointment rescheduling',
    schema: {
      example: {
        statusCode: 400,
        message: {
          ar: 'هذا التعديل سيؤثر على 5 مواعيد نشطة. يرجى التأكيد لإعادة الجدولة',
          en: 'This change will affect 5 active appointments. Please confirm to reschedule',
        },
        requiresConfirmation: true,
        affectedAppointmentsCount: 5,
      },
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
  @ApiResponse({
    status: 409,
    description: 'Conflict - Cannot remove session with active appointments',
    schema: {
      example: {
        statusCode: 409,
        message: {
          ar: 'لا يمكن حذف الجلسة لأنها تحتوي على مواعيد نشطة',
          en: 'Cannot remove session with active appointments',
        },
        code: 'CANNOT_REMOVE_SESSION_WITH_ACTIVE_APPOINTMENTS',
      },
    },
  })
  @ApiBody({ type: UpdateServiceWithSessionsDto })
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @Put(':id')
  async updateService(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    updateServiceDto: UpdateServiceWithSessionsDto,
  ): Promise<any> {
    const service = await this.serviceService.updateService(id, updateServiceDto);
    return this.enrichServiceResponse(service);
  }

  /**
   * Delete service
   */
  // @ApiOperation({
  //   summary: 'Delete service',
  //   description:
  //     'Soft deletes a medical service. Cannot delete if service has active appointments (scheduled or confirmed). The service is marked as deleted with a timestamp.',
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Service deleted successfully',
  //   schema: {
  //     example: SERVICE_SWAGGER_EXAMPLES.DELETE_SERVICE_SUCCESS,
  //   },
  // })
  // @ApiResponse({
  //   status: 400,
  //   description: 'Cannot delete service with active appointments',
  //   schema: {
  //     example: {
  //       statusCode: 400,
  //       message: {
  //         ar: 'لا يمكن حذف الخدمة لأنها تحتوي على 3 مواعيد نشطة',
  //         en: 'Cannot delete service because it has 3 active appointments',
  //       },
  //       activeAppointmentsCount: 3,
  //     },
  //   },
  // })
  // @ApiResponse({
  //   status: 404,
  //   description: 'Service not found',
  //   schema: {
  //     example: SERVICE_SWAGGER_EXAMPLES.SERVICE_NOT_FOUND,
  //   },
  // })
  // @ApiResponse({
  //   status: 401,
  //   description: 'Unauthorized - Authentication required',
  //   schema: {
  //     example: SERVICE_SWAGGER_EXAMPLES.UNAUTHORIZED,
  //   },
  // })
  // @ApiBearerAuth()
  // @ApiParam({
  //   name: 'id',
  //   description: 'Service ID',
  //   type: String,
  //   example: '507f1f77bcf86cd799439011',
  // })
  // @Delete(':id')
  // @HttpCode(HttpStatus.OK)
  // async deleteService(
  //   @Param('id') id: string,
  //   @Request() req: any,
  // ): Promise<{
  //   success: boolean;
  //   message: { ar: string; en: string };
  //   deletedAt: Date;
  // }> {
  //   const userId = req.user?.id;
  //   const userId2 = req.user?.userId;
  //   ;

  //   console.log('userId__consolecheck', userId);
  //   console.log('userid2__consolecheck', userId2);
  //   await this.serviceService.deleteService(id, userId2);

  //   return {
  //     success: true,
  //     message: {
  //       ar: 'تم حذف الخدمة بنجاح',
  //       en: 'Service deleted successfully',
  //     },
  //     deletedAt: new Date(),
  //   };
  // }

  /**
   * Delete a service (soft delete)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.MANAGER)
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
      example: SERVICE_SWAGGER_EXAMPLES.DELETE_SERVICE_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete service with active appointments',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.BUSINESS_RULE_VIOLATION,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Service not found',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.SERVICE_NOT_FOUND,
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

  /**
   * Validate service names for clinic onboarding (prevents duplicates across forms)
   */
  @ApiOperation({
    summary: 'Validate service names',
    description:
      'Validates service names to prevent duplicates during clinic onboarding. Checks for conflicts within the same complex or clinic scope and provides suggestions for alternative names if conflicts are found.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Validation completed - Returns validation result with conflicts and suggestions',
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
        complexId: {
          type: 'string',
          example: '507f1f77bcf86cd799439020',
        },
      },
      required: ['serviceNames'],
    },
  })
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @Post('validate-names')
  @HttpCode(HttpStatus.OK)
  async validateServiceNames(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    body: {
      serviceNames: string[];
      complexId?: string;
    },
  ): Promise<{
    isValid: boolean;
    conflicts: string[];
    suggestions: string[];
    message: string;
  }> {
    const { serviceNames, complexId } = body;

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
      complexId,
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
   * Get services by complex
   */
  @ApiOperation({
    summary: 'Get services by complex',
    description:
      'Retrieves all medical services associated with a specific complex.',
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
    description: 'Complex not found',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.NOT_FOUND,
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'complexId',
    description: 'Complex ID',
    type: String,
    example: '507f1f77bcf86cd799439020',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 10, max: 100)',
    type: Number,
    example: 10,
  })
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.STAFF, UserRole.DOCTOR, UserRole.MANAGER)
  @Get('complexes/:complexId')
  async getServicesByComplex(
    @Param('complexId') complexId: string,
    @Query() paginationQuery: ServicePaginationQuery,
  ): Promise<PaginatedServiceResponse> {
    const pagination = this.parsePaginationQuery(paginationQuery);
    const services = await this.serviceService.getServicesByComplexPaginated(
      complexId,
      pagination,
    );

    return this.enrichPaginatedServiceResponse(services);
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
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.MANAGER)
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
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 10, max: 100)',
    type: Number,
    example: 10,
  })
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.STAFF, UserRole.DOCTOR, UserRole.MANAGER)
  @Get('clinics/:clinicId')
  async getServicesByClinic(
    @Param('clinicId') clinicId: string,
    @Query() paginationQuery: ServicePaginationQuery,
  ): Promise<PaginatedServiceResponse> {
    const pagination = this.parsePaginationQuery(paginationQuery);
    const services = await this.serviceService.getServicesByClinicPaginated(
      clinicId,
      pagination,
    );

    return this.enrichPaginatedServiceResponse(services);
  }

  /**
   * Get services directly owned by a specific clinic
   */
  @ApiOperation({
    summary: 'Get services owned by clinic',
    description:
      'Retrieves services that are directly owned and created by a specific clinic (not inherited from complex). These are clinic-specific services.',
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
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 10, max: 100)',
    type: Number,
    example: 10,
  })
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.STAFF, UserRole.DOCTOR, UserRole.MANAGER)
  @Get('clinics/:clinicId/owned')
  async getServicesOwnedByClinic(
    @Param('clinicId') clinicId: string,
    @Query() paginationQuery: ServicePaginationQuery,
  ): Promise<PaginatedServiceResponse> {
    const pagination = this.parsePaginationQuery(paginationQuery);
    const services = await this.serviceService.getServicesOwnedByClinicPaginated(
      clinicId,
      pagination,
    );

    return this.enrichPaginatedServiceResponse(services);
  }

  /**
   * Get all services for a clinic context
   */
  @ApiOperation({
    summary: 'Get services for clinic context',
    description:
      'Retrieves all services available in a clinic context. If complexId is provided, returns services for that complex. Otherwise returns services without complex association.',
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
    name: 'complexId',
    required: false,
    description: 'Complex ID to filter services',
    type: String,
    example: '507f1f77bcf86cd799439020',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 10, max: 100)',
    type: Number,
    example: 10,
  })
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.STAFF, UserRole.DOCTOR, UserRole.MANAGER)
  @Get('clinic')
  async getServicesForClinic(
    @Query('complexId') complexId?: string,
    @Query() paginationQuery?: ServicePaginationQuery,
  ): Promise<PaginatedServiceResponse> {
    const pagination = this.parsePaginationQuery(paginationQuery);
    const services = await this.serviceService.getServicesForClinicPaginated(
      complexId,
      pagination,
    );

    return this.enrichPaginatedServiceResponse(services);
  }

  /**
   * Get all services for a clinic context with complex
   */
  @ApiOperation({
    summary: 'Get services for clinic with complex',
    description:
      'Retrieves all services available for a clinic within a specific complex context.',
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
    description: 'Complex not found',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.NOT_FOUND,
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'complexId',
    description: 'Complex ID',
    type: String,
    example: '507f1f77bcf86cd799439020',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 10, max: 100)',
    type: Number,
    example: 10,
  })
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.STAFF, UserRole.DOCTOR, UserRole.MANAGER)
  @Get('clinic/:complexId')
  async getServicesForClinicWithComplex(
    @Param('complexId') complexId: string,
    @Query() paginationQuery: ServicePaginationQuery,
  ): Promise<PaginatedServiceResponse> {
    const pagination = this.parsePaginationQuery(paginationQuery);
    const services = await this.serviceService.getServicesForClinicPaginated(
      complexId,
      pagination,
    );

    return this.enrichPaginatedServiceResponse(services);
  }

  /**
   * Get all services (with optional filtering)
   */
  @ApiOperation({
    summary: 'Get all services',
    description:
      'Retrieves all medical services with optional filtering by complex. Returns a list of services with their details including pricing, duration, and descriptions.',
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
    name: 'complexId',
    required: false,
    description: 'Filter services by complex ID',
    type: String,
    example: '507f1f77bcf86cd799439020',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 10, max: 100)',
    type: Number,
    example: 10,
  })
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.STAFF, UserRole.DOCTOR, UserRole.MANAGER)
  @Get()
  async getAllServices(
    @Query('complexId') complexId?: string,
    @Query() paginationQuery?: ServicePaginationQuery,
  ): Promise<PaginatedServiceResponse> {
    const pagination = this.parsePaginationQuery(paginationQuery);
    const services = await this.serviceService.getAllServicesPaginated(
      complexId,
      pagination,
    );

    return this.enrichPaginatedServiceResponse(services);
  }

  private parsePaginationQuery(query?: ServicePaginationQuery): {
    page: number;
    limit: number;
  } {
    const pageValue = Number(query?.page);
    const limitValue = Number(query?.limit);

    const page = Number.isFinite(pageValue)
      ? Math.max(1, Math.floor(pageValue))
      : 1;
    const limit = Number.isFinite(limitValue)
      ? Math.max(1, Math.min(100, Math.floor(limitValue)))
      : 10;

    return { page, limit };
  }

  private async enrichPaginatedServiceResponse(
    result: { data: any[]; pagination: ServicePaginationMeta },
  ): Promise<PaginatedServiceResponse> {
    return {
      data: await Promise.all(
        result.data.map((service) => this.enrichServiceResponse(service)),
      ),
      pagination: result.pagination,
    };
  }

  private async enrichServiceResponse(service: any): Promise<any> {
    const enriched = await this.serviceService.buildEnrichedServiceResponse(service);
    const sessions = Array.isArray(enriched.sessions)
      ? [...enriched.sessions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      : [];

    return {
      ...enriched,
      sessions,
      sessionCount: sessions.length,
      categoryName: enriched.serviceCategory ?? null,
    };
  }

  /**
   * Change service status (activate/deactivate)
   */
  @ApiOperation({
    summary: 'Change service status',
    description:
      'Changes service active status. If deactivating with active appointments, marks them for rescheduling. Requires confirmation if service has active appointments.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service status changed successfully',
    schema: {
      example: {
        _id: '507f1f77bcf86cd799439011',
        name: 'General Consultation',
        isActive: false,
        deactivatedAt: '2026-01-31T12:00:00.000Z',
        deactivatedBy: '507f1f77bcf86cd799439015',
        deactivationReason: 'Service temporarily unavailable',
        affectedAppointments: {
          count: 8,
          status: 'needs_rescheduling',
          notificationsSent: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Requires confirmation or missing reason',
    schema: {
      example: {
        statusCode: 400,
        message: {
          ar: 'الخدمة لديها 8 مواعيد نشطة. يرجى التأكيد لإعادة الجدولة',
          en: 'Service has 8 active appointments. Please confirm to reschedule',
        },
        requiresConfirmation: true,
        activeAppointmentsCount: 8,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Service not found',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.SERVICE_NOT_FOUND,
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'Service ID',
    type: String,
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({ type: ChangeServiceStatusDto })
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @Patch(':id/status')
  async changeServiceStatus(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: ChangeServiceStatusDto,
    @Request() req: any,
  ): Promise<any> {
    const userId = req?.user?.id || req?.user?.userId;
    return this.serviceService.changeServiceStatus(id, dto, userId);
  }

  /**
   * Get service status history
   */
  @ApiOperation({
    summary: 'Get service status history',
    description:
      'Returns history of status changes for audit purposes. Note: Full implementation requires a separate StatusHistory schema.',
  })
  @ApiResponse({
    status: 200,
    description: 'Status history retrieved successfully',
    schema: {
      example: [
        {
          changedAt: '2026-01-31T12:00:00.000Z',
          changedBy: {
            _id: '507f1f77bcf86cd799439015',
            firstName: 'Admin',
            lastName: 'User',
          },
          previousStatus: true,
          newStatus: false,
          reason: 'Service temporarily unavailable',
          affectedAppointmentsCount: 8,
        },
      ],
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Service not found',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.SERVICE_NOT_FOUND,
    },
  })
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.STAFF, UserRole.DOCTOR, UserRole.MANAGER)
  @ApiParam({
    name: 'id',
    description: 'Service ID',
    type: String,
    example: '507f1f77bcf86cd799439011',
  })
  @Get(':id/status-history')
  async getStatusHistory(@Param('id') id: string): Promise<any[]> {
    return this.serviceService.getStatusHistory(id);
  }

  /**
   * Get active services only
   */
  @ApiOperation({
    summary: 'Get active services',
    description:
      'Returns only active services. Used for appointment booking dropdowns. Can be filtered by complex or clinic.',
  })
  @ApiResponse({
    status: 200,
    description: 'Active services retrieved successfully',
    schema: {
      example: [
        {
          _id: '507f1f77bcf86cd799439011',
          name: 'General Consultation',
          description: 'Standard medical consultation',
          durationMinutes: 30,
          price: 150,
          isActive: true,
          activeAppointmentsCount: 5,
          totalAppointmentsCount: 120,
        },
      ],
    },
  })
  @ApiBearerAuth()
  @ApiQuery({
    name: 'complexId',
    required: false,
    description: 'Filter by complex ID',
    type: String,
    example: '507f1f77bcf86cd799439020',
  })
  @ApiQuery({
    name: 'clinicId',
    required: false,
    description: 'Filter by clinic ID',
    type: String,
    example: '507f1f77bcf86cd799439040',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 10, max: 100)',
    type: Number,
    example: 10,
  })
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.STAFF, UserRole.DOCTOR, UserRole.MANAGER)
  @Get('active')
  async getActiveServices(
    @Query('complexId') complexId?: string,
    @Query('clinicId') clinicId?: string,
    @Query() paginationQuery?: ServicePaginationQuery,
  ): Promise<PaginatedServiceResponse> {
    const pagination = this.parsePaginationQuery(paginationQuery);
    const services = await this.serviceService.getActiveServicesPaginated(
      complexId,
      clinicId,
      pagination,
    );

    return this.enrichPaginatedServiceResponse(services);
  }

  /**
   * Bulk status change for multiple services
   */
  @ApiOperation({
    summary: 'Bulk status change',
    description:
      'Changes status for multiple services at once. Useful for temporary closures. Requires confirmation if services have active appointments.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk status change completed',
    schema: {
      example: {
        success: true,
        updated: 5,
        failed: 0,
        totalAffectedAppointments: 23,
        results: [
          {
            serviceId: '507f1f77bcf86cd799439011',
            success: true,
            affectedAppointments: 8,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBody({ type: BulkStatusChangeDto })
  @Patch('bulk-status')
  async bulkStatusChange(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: BulkStatusChangeDto,
    @Request() req: any,
  ): Promise<any> {
    const userId = req?.user?.id || req?.user?.userId;
    return this.serviceService.bulkStatusChange(dto, userId);
  }

  // ==================== Doctor Assignment Endpoints (PART H) ====================

  /**
   * Assign a doctor to a service with a custom price.
   * POST /services/:id/doctor-assignments
   * PART H
   */
  @Post(':id/doctor-assignments')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Assign a doctor to a service with a custom price',
    description:
      'Assigns a doctor to a service with a custom price. ' +
      'If the doctor is already assigned (even inactive), reactivates the assignment and updates the price.',
  })
  @ApiParam({ name: 'id', description: 'Service ID', example: '507f1f77bcf86cd799439013' })
  @ApiBody({ type: CreateDoctorAssignmentDto })
  @ApiResponse({ status: 200, description: 'Doctor assigned successfully' })
  @ApiResponse({ status: 404, description: 'Service or doctor not found' })
  async addDoctorAssignment(
    @Param('id') serviceId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: CreateDoctorAssignmentDto,
  ): Promise<any> {
    const service = await this.serviceService.addDoctorAssignment(
      serviceId,
      dto.doctorId,
      dto.price,
    );
    return ResponseBuilder.success(service, {
      ar: 'تم تعيين الطبيب بنجاح',
      en: 'Doctor assigned successfully',
    });
  }

  /**
   * Deactivate a doctor assignment for a service.
   * PATCH /services/:id/doctor-assignments/:doctorId/deactivate
   * PART H
   */
  @Patch(':id/doctor-assignments/:doctorId/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Deactivate a doctor assignment for a service',
    description: 'Soft-deactivates the doctor assignment (sets status to inactive).',
  })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiParam({ name: 'doctorId', description: 'Doctor user ID' })
  @ApiResponse({ status: 200, description: 'Doctor assignment deactivated' })
  @ApiResponse({ status: 404, description: 'Service or assignment not found' })
  async deactivateDoctorAssignment(
    @Param('id') serviceId: string,
    @Param('doctorId') doctorId: string,
  ): Promise<any> {
    const service = await this.serviceService.deactivateDoctorAssignment(
      serviceId,
      doctorId,
    );
    return ResponseBuilder.success(service, {
      ar: 'تم تعطيل تعيين الطبيب بنجاح',
      en: 'Doctor assignment deactivated successfully',
    });
  }

  /**
   * Get the effective price for a specific doctor on this service.
   * GET /services/:id/doctor-price/:doctorId
   * PART H
   */
  @Get(':id/doctor-price/:doctorId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.STAFF, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Get effective price for a doctor on a service',
    description:
      'Returns the doctor\'s custom assignment price if active, or the service base price as fallback.',
  })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiParam({ name: 'doctorId', description: 'Doctor user ID' })
  @ApiResponse({ status: 200, description: 'Price retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async getDoctorPrice(
    @Param('id') serviceId: string,
    @Param('doctorId') doctorId: string,
  ): Promise<any> {
    const result = await this.serviceService.getDoctorPrice(serviceId, doctorId);
    return ResponseBuilder.success(result, {
      ar: 'تم استرجاع السعر بنجاح',
      en: 'Price retrieved successfully',
    });
  }

  /**
   * Get statistics for a specific service
   * GET /services/:id/stats
   */
  @Get(':id/stats')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(
    UserRole.ADMIN,
    UserRole.OWNER,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  @ApiOperation({
    summary: 'Get statistics for a specific service',
    description:
      'Calculates and returns utilization metrics and operational details for a service based on appointment history.',
  })
  @ApiParam({
    name: 'id',
    description: 'Service ID',
    example: '507f1f77bcf86cd799439013',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async getServiceStats(@Param('id') serviceId: string): Promise<any> {
    const stats = await this.serviceService.getServiceStats(serviceId);
    return ResponseBuilder.success(stats, {
      ar: 'تم استرجاع إحصائيات الخدمة بنجاح',
      en: 'Service statistics retrieved successfully',
    });
  }
}
