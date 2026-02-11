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
import { DoctorServiceService } from './doctor-service.service';
import { CreateServiceDto, AssignServicesDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import {
  AssignDoctorToServiceDto,
  DeactivateDoctorFromServiceDto,
  UpdateDoctorServiceNotesDto,
} from './dto/doctor-service.dto';
import { Service } from '../database/schemas/service.schema';
import { ClinicService } from '../database/schemas/clinic-service.schema';
import { SERVICE_SWAGGER_EXAMPLES } from './constants/swagger-examples';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
@ApiTags('Services')
@Controller('services')
@UseGuards(JwtAuthGuard)
export class ServiceController {
  constructor(
    private readonly serviceService: ServiceService,
    private readonly doctorServiceService: DoctorServiceService,
  ) {}

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
   * Get available doctors for service
   * GET /services/:serviceId/available-doctors
   */
  @ApiOperation({
    summary: 'Get available doctors for service',
    description:
      'Returns list of active doctors who can be assigned to this service. Only shows doctors who work at clinics where this service is offered and are not already assigned.',
  })
  @ApiResponse({
    status: 200,
    description: 'Available doctors retrieved successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم استرجاع الأطباء المتاحين بنجاح',
          en: 'Available doctors retrieved successfully',
        },
        data: [
          {
            _id: '507f1f77bcf86cd799439012',
            firstName: 'Ahmed',
            lastName: 'Hassan',
            email: 'ahmed.hassan@clinic.com',
            role: 'doctor',
            status: 'active',
            isAlreadyAssigned: false,
            canBeAssigned: true,
          },
        ],
        count: 1,
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
    name: 'serviceId',
    description: 'Service ID (MongoDB ObjectId)',
    type: String,
    example: '507f1f77bcf86cd799439013',
  })
  @ApiQuery({
    name: 'clinicId',
    required: false,
    type: String,
    description: 'Filter by specific clinic',
  })
  /**
   * Get doctors assigned to service
   * GET /services/:serviceId/doctors
   */
  @ApiOperation({
    summary: 'Get doctors assigned to service',
    description:
      'Retrieves all doctors assigned to a service, optionally filtered by clinic and active status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Doctors retrieved successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم استرجاع الأطباء بنجاح',
          en: 'Doctors retrieved successfully',
        },
        data: [
          {
            _id: '507f1f77bcf86cd799439011',
            doctorId: {
              _id: '507f1f77bcf86cd799439012',
              firstName: 'Ahmed',
              lastName: 'Hassan',
              email: 'ahmed.hassan@clinic.com',
              role: 'doctor',
            },
            serviceId: '507f1f77bcf86cd799439013',
            clinicId: {
              _id: '507f1f77bcf86cd799439014',
              name: 'Main Clinic',
            },
            isActive: true,
            activeAppointmentsCount: 5,
            totalAppointmentsCount: 25,
            notes: 'Specialized in this service',
          },
        ],
        count: 1,
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
    name: 'serviceId',
    description: 'Service ID (MongoDB ObjectId)',
    type: String,
    example: '507f1f77bcf86cd799439013',
  })
  @ApiQuery({
    name: 'clinicId',
    required: false,
    type: String,
    description: 'Filter by clinic ID',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status (default: true)',
  })
  @ApiQuery({
    name: 'includeStats',
    required: false,
    type: Boolean,
    description: 'Include appointment statistics',
  })
  @Get(':serviceId/doctors')
  async getDoctorsForService(
    @Param('serviceId') serviceId: string,
    @Query('clinicId') clinicId?: string,
    @Query('isActive') isActive?: string,
    @Query('includeStats') includeStats?: string,
  ) {
    const doctors = await this.doctorServiceService.getDoctorsForService(
      serviceId,
      {
        clinicId,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        includeStats: includeStats === 'true',
      },
    );
    return {
      success: true,
      message: {
        ar: 'تم استرجاع الأطباء بنجاح',
        en: 'Doctors retrieved successfully',
      },
      data: doctors,
      count: doctors.length,
    };
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
   * Update service
   */
  @ApiOperation({
    summary: 'Update service',
    description:
      'Updates an existing medical service. If changes affect active appointments (e.g., department/clinic change, duration change), confirmation is required to proceed with rescheduling.',
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
  @ApiBody({ type: UpdateServiceDto })
  @Put(':id')
  async updateService(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    updateServiceDto: UpdateServiceDto,
  ): Promise<Service> {
    return this.serviceService.updateService(id, updateServiceDto);
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
      'Validates service names to prevent duplicates during clinic onboarding. Checks for conflicts within the same complex department or clinic scope and provides suggestions for alternative names if conflicts are found.',
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

  /**
   * Assign doctor to service
   * POST /services/:serviceId/doctors
   */
  @ApiOperation({
    summary: 'Assign doctor to service',
    description:
      'Assigns a doctor to a service at a specific clinic. The doctor must work at the clinic where the service is offered.',
  })
  @ApiResponse({
    status: 201,
    description: 'Doctor assigned to service successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم إسناد الطبيب للخدمة بنجاح',
          en: 'Doctor assigned to service successfully',
        },
        data: {
          _id: '507f1f77bcf86cd799439011',
          doctorId: '507f1f77bcf86cd799439012',
          serviceId: '507f1f77bcf86cd799439013',
          clinicId: '507f1f77bcf86cd799439014',
          isActive: true,
          activeAppointmentsCount: 0,
          totalAppointmentsCount: 0,
          notes: 'Specialized in this service',
          createdAt: '2026-01-31T10:00:00.000Z',
          updatedAt: '2026-01-31T10:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or business rule violation',
    schema: {
      example: {
        statusCode: 400,
        message: {
          ar: 'الطبيب لا يعمل في هذه العيادة',
          en: 'Doctor does not work at this clinic',
        },
        error: 'Bad Request',
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
    name: 'serviceId',
    description: 'Service ID (MongoDB ObjectId)',
    type: String,
    example: '507f1f77bcf86cd799439013',
  })
  @ApiBody({ type: AssignDoctorToServiceDto })
  @Post(':serviceId/doctors')
  @HttpCode(HttpStatus.CREATED)
  async assignDoctorToService(
    @Param('serviceId') serviceId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: AssignDoctorToServiceDto,
  ) {
    const result = await this.doctorServiceService.assignDoctorToService(
      serviceId,
      dto,
    );
    return {
      success: true,
      message: {
        ar: 'تم إسناد الطبيب للخدمة بنجاح',
        en: 'Doctor assigned to service successfully',
      },
      data: result,
    };
  }

  /**
   * Deactivate doctor from service
   * PATCH /services/:serviceId/doctors/:doctorId/deactivate
   */
  @ApiOperation({
    summary: 'Deactivate doctor from service',
    description:
      'Deactivates a doctor from a service while preserving historical data. No new appointments can be scheduled, but existing data remains.',
  })
  @ApiResponse({
    status: 200,
    description: 'Doctor deactivated successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم إلغاء تنشيط الطبيب من الخدمة بنجاح',
          en: 'Doctor deactivated from service successfully',
        },
        data: {
          _id: '507f1f77bcf86cd799439011',
          doctorId: '507f1f77bcf86cd799439012',
          serviceId: '507f1f77bcf86cd799439013',
          clinicId: '507f1f77bcf86cd799439014',
          isActive: false,
          deactivatedAt: '2026-01-31T12:00:00.000Z',
          deactivationReason: 'Doctor transferred to another department',
          appointmentsTransferred: {
            count: 5,
            toDoctor: '507f1f77bcf86cd799439016',
            notificationsSent: true,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Has active appointments without transfer',
    schema: {
      example: {
        statusCode: 400,
        message: {
          ar: 'الطبيب لديه 5 مواعيد نشطة. يرجى نقل المواعيد أو إلغاؤها أولاً',
          en: 'Doctor has 5 active appointments. Please transfer or cancel appointments first',
        },
        error: 'Bad Request',
        activeAppointmentsCount: 5,
        requiresTransfer: true,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Assignment not found',
    schema: {
      example: {
        statusCode: 404,
        message: {
          ar: 'الطبيب غير مسند لهذه الخدمة',
          en: 'Doctor is not assigned to this service',
        },
        error: 'Not Found',
      },
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'serviceId',
    description: 'Service ID (MongoDB ObjectId)',
    type: String,
    example: '507f1f77bcf86cd799439013',
  })
  @ApiParam({
    name: 'doctorId',
    description: 'Doctor User ID (MongoDB ObjectId)',
    type: String,
    example: '507f1f77bcf86cd799439012',
  })
  @ApiBody({ type: DeactivateDoctorFromServiceDto })
  @Patch(':serviceId/doctors/:doctorId/deactivate')
  async deactivateDoctorFromService(
    @Param('serviceId') serviceId: string,
    @Param('doctorId') doctorId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: DeactivateDoctorFromServiceDto,
    @Request() req: any,
  ) {
    const userId = req?.user?.id || req?.user?.userId;
    const result = await this.doctorServiceService.deactivateDoctorFromService(
      serviceId,
      doctorId,
      dto,
      userId,
    );
    return {
      success: true,
      message: {
        ar: 'تم إلغاء تنشيط الطبيب من الخدمة بنجاح',
        en: 'Doctor deactivated from service successfully',
      },
      data: result,
    };
  }

  /**
   * Remove doctor from service
   * DELETE /services/:serviceId/doctors/:doctorId
   */
  @ApiOperation({
    summary: 'Remove doctor from service',
    description:
      'Permanently removes a doctor from a service. Can only be done if doctor has NO appointments (active or historical).',
  })
  @ApiResponse({
    status: 200,
    description: 'Doctor removed successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم إزالة الطبيب من الخدمة بنجاح',
          en: 'Doctor removed from service successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete - has appointments',
    schema: {
      example: {
        statusCode: 400,
        message: {
          ar: 'لا يمكن حذف الطبيب لأنه لديه مواعيد مرتبطة بهذه الخدمة. استخدم إلغاء التنشيط بدلاً من ذلك',
          en: 'Cannot delete doctor because they have appointments for this service. Use deactivate instead',
        },
        error: 'Bad Request',
        totalAppointmentsCount: 10,
        useDeactivateInstead: true,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Assignment not found',
    schema: {
      example: {
        statusCode: 404,
        message: {
          ar: 'الطبيب غير مسند لهذه الخدمة',
          en: 'Doctor is not assigned to this service',
        },
        error: 'Not Found',
      },
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'serviceId',
    description: 'Service ID (MongoDB ObjectId)',
    type: String,
    example: '507f1f77bcf86cd799439013',
  })
  @ApiParam({
    name: 'doctorId',
    description: 'Doctor User ID (MongoDB ObjectId)',
    type: String,
    example: '507f1f77bcf86cd799439012',
  })
  @ApiQuery({
    name: 'clinicId',
    required: true,
    type: String,
    description: 'Clinic ID (MongoDB ObjectId)',
  })
  @Delete(':serviceId/doctors/:doctorId')
  async removeDoctorFromService(
    @Param('serviceId') serviceId: string,
    @Param('doctorId') doctorId: string,
    @Query('clinicId') clinicId: string,
  ) {
    await this.doctorServiceService.removeDoctorFromService(
      serviceId,
      doctorId,
      clinicId,
    );
    return {
      success: true,
      message: {
        ar: 'تم إزالة الطبيب من الخدمة بنجاح',
        en: 'Doctor removed from service successfully',
      },
    };
  }

  /**
   * Get available doctors for service
   * GET /services/:serviceId/available-doctors
   */
  @ApiOperation({
    summary: 'Get available doctors for service',
    description:
      'Returns list of active doctors who can be assigned to this service. Only shows doctors who work at clinics where this service is offered and are not already assigned.',
  })
  @ApiResponse({
    status: 200,
    description: 'Available doctors retrieved successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم استرجاع الأطباء المتاحين بنجاح',
          en: 'Available doctors retrieved successfully',
        },
        data: [
          {
            _id: '507f1f77bcf86cd799439012',
            firstName: 'Ahmed',
            lastName: 'Hassan',
            email: 'ahmed.hassan@clinic.com',
            role: 'doctor',
            status: 'active',
            isAlreadyAssigned: false,
            canBeAssigned: true,
          },
        ],
        count: 1,
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
    name: 'serviceId',
    description: 'Service ID (MongoDB ObjectId)',
    type: String,
    example: '507f1f77bcf86cd799439013',
  })
  @ApiQuery({
    name: 'clinicId',
    required: false,
    type: String,
    description: 'Filter by specific clinic',
  })
  @Get(':serviceId/available-doctors')
  async getAvailableDoctorsForService(
    @Param('serviceId') serviceId: string,
    @Query('clinicId') clinicId?: string,
  ) {
    const doctors = await this.doctorServiceService.getAvailableDoctorsForService(
      serviceId,
      clinicId,
    );
    return {
      success: true,
      message: {
        ar: 'تم استرجاع الأطباء المتاحين بنجاح',
        en: 'Available doctors retrieved successfully',
      },
      data: doctors,
      count: doctors.length,
    };
  }

  /**
   * Update doctor assignment notes
   * PATCH /services/:serviceId/doctors/:doctorId
   */
  @ApiOperation({
    summary: 'Update doctor assignment notes',
    description:
      'Updates notes for a doctor-service assignment. Cannot change doctor or service - only metadata.',
  })
  @ApiResponse({
    status: 200,
    description: 'Assignment notes updated successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم تحديث ملاحظات الإسناد بنجاح',
          en: 'Assignment notes updated successfully',
        },
        data: {
          _id: '507f1f77bcf86cd799439011',
          doctorId: '507f1f77bcf86cd799439012',
          serviceId: '507f1f77bcf86cd799439013',
          clinicId: '507f1f77bcf86cd799439014',
          isActive: true,
          notes: 'Updated notes',
          updatedAt: '2026-01-31T13:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Assignment not found',
    schema: {
      example: {
        statusCode: 404,
        message: {
          ar: 'الطبيب غير مسند لهذه الخدمة',
          en: 'Doctor is not assigned to this service',
        },
        error: 'Not Found',
      },
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'serviceId',
    description: 'Service ID (MongoDB ObjectId)',
    type: String,
    example: '507f1f77bcf86cd799439013',
  })
  @ApiParam({
    name: 'doctorId',
    description: 'Doctor User ID (MongoDB ObjectId)',
    type: String,
    example: '507f1f77bcf86cd799439012',
  })
  @ApiBody({ type: UpdateDoctorServiceNotesDto })
  @Patch(':serviceId/doctors/:doctorId')
  async updateDoctorServiceNotes(
    @Param('serviceId') serviceId: string,
    @Param('doctorId') doctorId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UpdateDoctorServiceNotesDto,
  ) {
    const result = await this.doctorServiceService.updateDoctorServiceNotes(
      serviceId,
      doctorId,
      dto,
    );
    return {
      success: true,
      message: {
        ar: 'تم تحديث ملاحظات الإسناد بنجاح',
        en: 'Assignment notes updated successfully',
      },
      data: result,
    };
  }
}
