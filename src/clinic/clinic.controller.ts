import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Put,
  Patch,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  HttpException,
  Logger,
  Request,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { ClinicService } from './clinic.service';
import { CreateClinicDto, UpdateClinicDto } from './dto/create-clinic.dto';
import { ClinicFilterDto } from './dto/clinic-filter.dto';
import { ValidateWorkingHoursDto } from './dto/validate-working-hours.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { AssignPICDto } from './dto/assign-pic.dto';
import { TransferStaffDto } from './dto/transfer-staff.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { ClinicCapacityService } from './services/clinic-capacity.service';
import { ClinicWorkingHoursService } from './services/clinic-working-hours.service';
import { ClinicStatusService } from './services/clinic-status.service';

@ApiTags('Clinics')
@Controller('clinics')
export class ClinicController {
  private readonly logger = new Logger(ClinicController.name);

  constructor(
    private readonly clinicService: ClinicService,
    private readonly capacityService: ClinicCapacityService,
    private readonly workingHoursService: ClinicWorkingHoursService,
    private readonly statusService: ClinicStatusService,
  ) {}

  /**
   * Get all clinics with optional capacity calculation
   * Task 10.1: Enhance GET /clinics endpoint
   * Requirements: 5.1 (Enhanced Endpoints)
   * Design: Section 5.1 (Enhanced Clinic List Endpoint)
   *
   * This endpoint returns a list of clinics with optional capacity calculations.
   * When includeCounts=true, the response includes:
   * - Capacity breakdown (doctors, staff, patients)
   * - Scheduled appointments count
   * - Exceeded capacity flags
   *
   * @param query - Query parameters including includeCounts, filters, pagination
   * @returns List of clinics with optional capacity information
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all clinics',
    description:
      'Get list of clinics with optional capacity calculations and scheduled appointments count',
  })
  @ApiResponse({
    status: 200,
    description: 'Clinics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              name: { type: 'string' },
              status: { type: 'string', example: 'active' },
              complexId: { type: 'string' },
              subscriptionId: { type: 'string' },
              capacity: {
                type: 'object',
                description: 'Included when includeCounts=true',
                properties: {
                  doctors: {
                    type: 'object',
                    properties: {
                      max: { type: 'number' },
                      current: { type: 'number' },
                      isExceeded: { type: 'boolean' },
                      percentage: { type: 'number' },
                    },
                  },
                  staff: { type: 'object' },
                  patients: { type: 'object' },
                },
              },
              scheduledAppointmentsCount: {
                type: 'number',
                description: 'Included when includeCounts=true',
              },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
        message: {
          type: 'object',
          properties: {
            ar: { type: 'string' },
            en: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @HttpCode(HttpStatus.OK)
  async getClinics(
    @Query('subscriptionId') subscriptionId?: string,
    @Query('complexId') complexId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('includeCounts') includeCounts?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    try {
      const includeCountsBoolean = includeCounts === 'true';
      const pageNumber = page ? parseInt(page, 10) : 1;
      const limitNumber = limit ? parseInt(limit, 10) : 10;

      const result = await this.clinicService.getClinics({
        subscriptionId,
        complexId,
        status,
        search,
        includeCounts: includeCountsBoolean,
        page: pageNumber,
        limit: limitNumber,
        sortBy,
        sortOrder: sortOrder as 'asc' | 'desc',
      });

      return {
        success: true,
        data: result.data,
        meta: result.meta,
        message: {
          ar: 'تم استرجاع قائمة العيادات بنجاح',
          en: 'Clinics list retrieved successfully',
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Get clinics failed: ${error.message}`,
        error.stack,
      );

      throw new HttpException(
        {
          success: false,
          error: {
            code: 'GET_CLINICS_FAILED',
            message: {
              ar: 'فشل استرجاع قائمة العيادات',
              en: 'Failed to retrieve clinics list',
            },
          },
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Create a new clinic
   * Requirements: 5 (API Endpoints)
   * Design: Section 6 (Controller Layer)
   *
   * This endpoint creates a new clinic with validation of plan limits,
   * business profile, and capacity settings.
   *
   * @param createClinicDto - Clinic creation data
   * @returns Created clinic object
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new clinic',
    description:
      'Create a new clinic with validation of plan limits, business profile, and capacity settings',
  })
  @ApiBody({
    type: CreateClinicDto,
    description: 'Clinic creation data',
    examples: {
      basic: {
        summary: 'Basic clinic creation',
        value: {
          name: 'Cardiology Clinic',
          complexId: '507f1f77bcf86cd799439011',
          subscriptionId: '507f1f77bcf86cd799439012',
          maxDoctors: 10,
          maxStaff: 15,
          maxPatients: 100,
          sessionDuration: 30,
          email: 'cardiology@example.com',
          phone: '+966501234567',
        },
      },
      withPIC: {
        summary: 'Clinic with person-in-charge',
        value: {
          name: 'Pediatrics Clinic',
          complexId: '507f1f77bcf86cd799439011',
          subscriptionId: '507f1f77bcf86cd799439012',
          personInChargeId: '507f1f77bcf86cd799439013',
          maxDoctors: 8,
          maxStaff: 12,
          maxPatients: 80,
          sessionDuration: 20,
          email: 'pediatrics@example.com',
          phone: '+966501234568',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Clinic created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Clinic created successfully' },
        data: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            status: { type: 'string', example: 'active' },
            complexId: { type: 'string' },
            subscriptionId: { type: 'string' },
            maxDoctors: { type: 'number' },
            maxStaff: { type: 'number' },
            maxPatients: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed or plan limit exceeded',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Failed to create clinic' },
        error: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @HttpCode(HttpStatus.CREATED)
  async createClinic(@Body() createClinicDto: CreateClinicDto) {
    try {
      const clinic = await this.clinicService.createClinic(createClinicDto);
      return {
        success: true,
        message: 'Clinic created successfully',
        data: clinic,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create clinic',
        error: error.message,
      };
    }
  }

  /**
   * Get clinic details with capacity calculation
   * Task 10.2: Enhance GET /clinics/:id endpoint
   * Requirements: 5.2 (Enhanced Endpoints)
   * Design: Section 5.2 (Enhanced Clinic Details Endpoint)
   *
   * This endpoint returns complete clinic details including:
   * - All clinic fields
   * - Populated personInCharge relationship
   * - Status information
   * - Capacity breakdown (doctors, staff, patients)
   * - Scheduled appointments count
   * - Recommendations when capacity is exceeded
   *
   * @param id - Clinic ID from route params
   * @returns Complete clinic details with capacity information
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get clinic details',
    description:
      'Get complete clinic details with capacity calculation, status information, and scheduled appointments count',
  })
  @ApiResponse({
    status: 200,
    description: 'Clinic details retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            status: { type: 'string', example: 'active' },
            complexId: { type: 'string' },
            subscriptionId: { type: 'string' },
            personInCharge: {
              type: 'object',
              properties: {
                _id: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' },
              },
            },
            capacity: {
              type: 'object',
              properties: {
                doctors: {
                  type: 'object',
                  properties: {
                    max: { type: 'number' },
                    current: { type: 'number' },
                    available: { type: 'number' },
                    percentage: { type: 'number' },
                    isExceeded: { type: 'boolean' },
                    list: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          role: { type: 'string' },
                          email: { type: 'string' },
                        },
                      },
                    },
                  },
                },
                staff: { type: 'object' },
                patients: { type: 'object' },
              },
            },
            scheduledAppointmentsCount: { type: 'number' },
            recommendations: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
        message: {
          type: 'object',
          properties: {
            ar: { type: 'string' },
            en: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Clinic not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @HttpCode(HttpStatus.OK)
  async getClinic(@Param('id') id: string) {
    try {
      const clinic = await this.clinicService.getClinicWithDetails(id);
      return {
        success: true,
        message: {
          ar: 'تم استرجاع تفاصيل العيادة بنجاح',
          en: 'Clinic details retrieved successfully',
        },
        data: clinic,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Get clinic failed for id ${id}: ${error.message}`,
        error.stack,
      );

      throw new HttpException(
        {
          success: false,
          error: {
            code: 'GET_CLINIC_FAILED',
            message: {
              ar: 'فشل استرجاع تفاصيل العيادة',
              en: 'Failed to retrieve clinic details',
            },
          },
        },
        error instanceof NotFoundException
          ? HttpStatus.NOT_FOUND
          : HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Update an existing clinic
   * Requirements: 5 (API Endpoints)
   * Design: Section 6 (Controller Layer)
   *
   * This endpoint updates clinic information including name, capacity,
   * working hours, and other settings.
   *
   * @param id - Clinic ID from route params
   * @param updateClinicDto - Clinic update data
   * @returns Updated clinic object
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update an existing clinic',
    description:
      'Update clinic information including name, capacity, working hours, and other settings',
  })
  @ApiBody({
    type: UpdateClinicDto,
    description: 'Clinic update data (all fields optional)',
    examples: {
      updateName: {
        summary: 'Update clinic name',
        value: {
          name: 'Advanced Cardiology Clinic',
        },
      },
      updateCapacity: {
        summary: 'Update capacity limits',
        value: {
          maxDoctors: 15,
          maxStaff: 20,
          maxPatients: 150,
        },
      },
      updateContact: {
        summary: 'Update contact information',
        value: {
          email: 'newemail@example.com',
          phone: '+966501234569',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Clinic updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Clinic updated successfully' },
        data: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            status: { type: 'string', example: 'active' },
            complexId: { type: 'string' },
            subscriptionId: { type: 'string' },
            maxDoctors: { type: 'number' },
            maxStaff: { type: 'number' },
            maxPatients: { type: 'number' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Failed to update clinic' },
        error: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Clinic not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @HttpCode(HttpStatus.OK)
  async updateClinic(
    @Param('id') id: string,
    @Body() updateClinicDto: UpdateClinicDto,
  ) {
    try {
      const clinic = await this.clinicService.updateClinic(id, updateClinicDto);
      return {
        success: true,
        message: 'Clinic updated successfully',
        data: clinic,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update clinic',
        error: error.message,
      };
    }
  }

  /**
   * Get clinic by subscription
   * Requirements: 5 (API Endpoints)
   * Design: Section 6 (Controller Layer)
   *
   * This endpoint retrieves the clinic associated with a specific subscription.
   * Used primarily for clinic plan subscriptions where one subscription = one clinic.
   *
   * @param subscriptionId - Subscription ID from route params
   * @returns Clinic object if found, null otherwise
   */
  @Get('subscription/:subscriptionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get clinic by subscription',
    description:
      'Retrieve the clinic associated with a specific subscription (primarily for clinic plan subscriptions)',
  })
  @ApiResponse({
    status: 200,
    description: 'Clinic retrieved successfully or not found',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Clinic found',
        },
        data: {
          type: 'object',
          nullable: true,
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            status: { type: 'string', example: 'active' },
            subscriptionId: { type: 'string' },
            complexId: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example: 'Failed to retrieve clinic by subscription',
        },
        error: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @HttpCode(HttpStatus.OK)
  async getClinicBySubscription(
    @Param('subscriptionId') subscriptionId: string,
  ) {
    try {
      const clinic =
        await this.clinicService.getClinicBySubscription(subscriptionId);
      return {
        success: true,
        message: clinic
          ? 'Clinic found'
          : 'No clinic found for this subscription',
        data: clinic,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve clinic by subscription',
        error: error.message,
      };
    }
  }

  /**
   * Get clinics by complex
   * BZR-g3e5c9a0: Complex-based clinic filtering endpoint
   *
   * Task 7.4: Add getClinicsByComplex endpoint to ClinicController
   * Requirements: 3.4
   * Design: Section 3.6.2
   *
   * This endpoint returns all clinics belonging to a specific complex,
   * with optional filtering by active status and sorting.
   *
   * @param complexId - Complex ID from route params
   * @param filters - Optional filters (isActive, sortBy, sortOrder)
   * @returns List of clinics for the complex
   */
  @Get('by-complex/:complexId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get clinics by complex',
    description:
      'Get all clinics belonging to a specific complex with optional filters',
  })
  @ApiResponse({ status: 200, description: 'Clinics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Complex not found' })
  @HttpCode(HttpStatus.OK)
  async getClinicsByComplex(
    @Param('complexId') complexId: string,
    @Query() filters: ClinicFilterDto,
  ) {
    try {
      return await this.clinicService.getClinicsByComplex(complexId, filters);
    } catch (error) {
      // Re-throw if already an HTTP exception
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Get clinics by complex failed: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        {
          message: {
            ar: 'فشل جلب العيادات حسب المجمع',
            en: 'Failed to retrieve clinics by complex',
          },
          code: 'CLINICS_BY_COMPLEX_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Get clinics for dropdown
   *
   * Task 7.5: Add getClinicsForDropdown endpoint to ClinicController
   * Requirements: 3.4
   * Design: Section 3.6.2
   *
   * This endpoint returns only active clinics for dropdown selection,
   * with optional filtering by complex.
   *
   * @param complexId - Optional complex ID filter
   * @returns List of active clinics
   */
  @Get('dropdown')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get clinics for dropdown',
    description:
      'Get active clinics for dropdown selection with optional complex filter',
  })
  @ApiResponse({ status: 200, description: 'Clinics retrieved successfully' })
  @HttpCode(HttpStatus.OK)
  async getClinicsForDropdown(@Query('complexId') complexId?: string) {
    try {
      return await this.clinicService.getClinicsForDropdown(
        complexId ? { complexId } : undefined,
      );
    } catch (error) {
      // Re-throw if already an HTTP exception
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Get clinics for dropdown failed: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        {
          message: {
            ar: 'فشل جلب قائمة العيادات',
            en: 'Failed to retrieve clinics list',
          },
          code: 'CLINICS_DROPDOWN_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Get clinic capacity status
   * BZR-39: Capacity highlighting when exceeded
   *
   * Task 9.2: Implement GET /clinics/:id/capacity endpoint
   * Requirements: 3.2 (BZR-39), 7.1 (ClinicCapacityService)
   * Design: Section 4.1 (ClinicCapacityService), Section 6 (Controller Layer)
   *
   * This endpoint returns detailed capacity status for a clinic including:
   * - Doctors capacity with personnel list
   * - Staff capacity with personnel list
   * - Patients capacity
   * - Exceeded capacity flags
   * - Recommendations when capacity is exceeded
   *
   * @param id - Clinic ID from route params
   * @returns Complete capacity breakdown with recommendations
   */
  @Get(':id/capacity')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get clinic capacity status',
    description:
      'Get detailed capacity status including doctors, staff, and patients with exceeded flags and recommendations',
  })
  @ApiResponse({
    status: 200,
    description: 'Capacity status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            clinicId: { type: 'string' },
            clinicName: { type: 'string' },
            capacity: {
              type: 'object',
              properties: {
                doctors: {
                  type: 'object',
                  properties: {
                    max: { type: 'number' },
                    current: { type: 'number' },
                    available: { type: 'number' },
                    percentage: { type: 'number' },
                    isExceeded: { type: 'boolean' },
                    list: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          role: { type: 'string' },
                          email: { type: 'string' },
                        },
                      },
                    },
                  },
                },
                staff: {
                  type: 'object',
                  properties: {
                    max: { type: 'number' },
                    current: { type: 'number' },
                    available: { type: 'number' },
                    percentage: { type: 'number' },
                    isExceeded: { type: 'boolean' },
                    list: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          role: { type: 'string' },
                          email: { type: 'string' },
                        },
                      },
                    },
                  },
                },
                patients: {
                  type: 'object',
                  properties: {
                    max: { type: 'number' },
                    current: { type: 'number' },
                    available: { type: 'number' },
                    percentage: { type: 'number' },
                    isExceeded: { type: 'boolean' },
                    count: { type: 'number' },
                  },
                },
              },
            },
            recommendations: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
        message: {
          type: 'object',
          properties: {
            ar: { type: 'string' },
            en: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Clinic not found',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'CLINIC_007' },
            message: {
              type: 'object',
              properties: {
                ar: { type: 'string', example: 'العيادة غير موجودة' },
                en: { type: 'string', example: 'Clinic not found' },
              },
            },
          },
        },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  async getCapacityStatus(@Param('id') id: string) {
    try {
      const capacityStatus = await this.capacityService.getCapacityStatus(id);

      return {
        success: true,
        data: capacityStatus,
        message: {
          ar: 'تم جلب حالة السعة بنجاح',
          en: 'Capacity status retrieved successfully',
        },
      };
    } catch (error) {
      // Re-throw if already an HTTP exception
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Get capacity status failed for clinic ${id}: ${error.message}`,
        error.stack,
      );

      throw new HttpException(
        {
          success: false,
          error: {
            code: 'CAPACITY_STATUS_FAILED',
            message: {
              ar: 'فشل جلب حالة السعة',
              en: 'Failed to retrieve capacity status',
            },
          },
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Validate clinic working hours
   * BZR-42: Working hours validation against complex hours
   * BZR-43: Conflict detection with appointments and staff
   *
   * Task 9.3: Implement POST /clinics/:id/validate-working-hours endpoint
   * Requirements: 3.5 (BZR-42), 3.6 (BZR-43), 7.3 (ClinicWorkingHoursService)
   * Design: Section 4.2 (ClinicWorkingHoursService), Section 6 (Controller Layer)
   *
   * This endpoint validates proposed working hours for a clinic by:
   * - Checking hours are within parent complex hours (BZR-42)
   * - Detecting conflicts with existing appointments (BZR-43)
   * - Detecting conflicts with doctor/staff schedules (BZR-43)
   * - Returning detailed validation errors and conflict information
   *
   * @param id - Clinic ID from route params
   * @param validateDto - Proposed working hours schedule
   * @returns Validation result with errors and conflicts
   */
  @Post(':id/validate-working-hours')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Validate clinic working hours',
    description:
      'Validate proposed working hours against complex hours and detect conflicts with appointments and staff schedules',
  })
  @ApiBody({
    type: ValidateWorkingHoursDto,
    description: 'Proposed working hours schedule to validate',
    examples: {
      fullWeek: {
        summary: 'Full week schedule',
        value: {
          workingHours: [
            {
              dayOfWeek: 'monday',
              isWorkingDay: true,
              openingTime: '09:00',
              closingTime: '17:00',
            },
            {
              dayOfWeek: 'tuesday',
              isWorkingDay: true,
              openingTime: '09:00',
              closingTime: '17:00',
              breakStartTime: '12:00',
              breakEndTime: '13:00',
            },
            {
              dayOfWeek: 'wednesday',
              isWorkingDay: true,
              openingTime: '09:00',
              closingTime: '17:00',
            },
            {
              dayOfWeek: 'thursday',
              isWorkingDay: true,
              openingTime: '09:00',
              closingTime: '17:00',
            },
            {
              dayOfWeek: 'friday',
              isWorkingDay: true,
              openingTime: '09:00',
              closingTime: '14:00',
            },
            {
              dayOfWeek: 'saturday',
              isWorkingDay: false,
            },
            {
              dayOfWeek: 'sunday',
              isWorkingDay: false,
            },
          ],
        },
      },
      partialWeek: {
        summary: 'Partial week schedule (weekdays only)',
        value: {
          workingHours: [
            {
              dayOfWeek: 'monday',
              isWorkingDay: true,
              openingTime: '08:00',
              closingTime: '16:00',
            },
            {
              dayOfWeek: 'tuesday',
              isWorkingDay: true,
              openingTime: '08:00',
              closingTime: '16:00',
            },
            {
              dayOfWeek: 'wednesday',
              isWorkingDay: true,
              openingTime: '08:00',
              closingTime: '16:00',
            },
            {
              dayOfWeek: 'thursday',
              isWorkingDay: true,
              openingTime: '08:00',
              closingTime: '16:00',
            },
            {
              dayOfWeek: 'friday',
              isWorkingDay: false,
            },
            {
              dayOfWeek: 'saturday',
              isWorkingDay: false,
            },
            {
              dayOfWeek: 'sunday',
              isWorkingDay: false,
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Validation completed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            isValid: {
              type: 'boolean',
              example: true,
              description: 'Whether the proposed hours are valid',
            },
            errors: {
              type: 'array',
              description: 'Validation errors if any',
              items: {
                type: 'object',
                properties: {
                  dayOfWeek: { type: 'string', example: 'monday' },
                  message: {
                    type: 'object',
                    properties: {
                      ar: {
                        type: 'string',
                        example: 'ساعات العيادة يجب أن تكون ضمن ساعات المجمع',
                      },
                      en: {
                        type: 'string',
                        example: 'Clinic hours must be within complex hours',
                      },
                    },
                  },
                  complexHours: {
                    type: 'object',
                    properties: {
                      openingTime: { type: 'string', example: '08:00' },
                      closingTime: { type: 'string', example: '18:00' },
                    },
                  },
                  clinicHours: {
                    type: 'object',
                    properties: {
                      openingTime: { type: 'string', example: '07:00' },
                      closingTime: { type: 'string', example: '19:00' },
                    },
                  },
                },
              },
            },
            conflicts: {
              type: 'object',
              properties: {
                appointments: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      type: { type: 'string', example: 'appointment' },
                      name: { type: 'string', example: 'John Doe' },
                      date: { type: 'string', example: '2026-02-10' },
                      time: { type: 'string', example: '19:00' },
                      reason: {
                        type: 'object',
                        properties: {
                          ar: {
                            type: 'string',
                            example: 'الموعد خارج ساعات العمل الجديدة',
                          },
                          en: {
                            type: 'string',
                            example: 'Appointment outside new working hours',
                          },
                        },
                      },
                    },
                  },
                },
                doctors: {
                  type: 'array',
                  items: { type: 'object' },
                },
                staff: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
            requiresRescheduling: {
              type: 'boolean',
              example: false,
              description: 'Whether appointments need rescheduling',
            },
            affectedAppointments: {
              type: 'number',
              example: 0,
              description: 'Number of appointments affected',
            },
          },
        },
        message: {
          type: 'object',
          properties: {
            ar: {
              type: 'string',
              example: 'تم التحقق من ساعات العمل بنجاح',
            },
            en: {
              type: 'string',
              example: 'Working hours validated successfully',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Clinic not found',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'CLINIC_007' },
            message: {
              type: 'object',
              properties: {
                ar: { type: 'string', example: 'العيادة غير موجودة' },
                en: { type: 'string', example: 'Clinic not found' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or bad request',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'VALIDATION_FAILED' },
            message: {
              type: 'object',
              properties: {
                ar: { type: 'string', example: 'فشل التحقق من ساعات العمل' },
                en: {
                  type: 'string',
                  example: 'Working hours validation failed',
                },
              },
            },
          },
        },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  async validateWorkingHours(
    @Param('id') id: string,
    @Body() validateDto: ValidateWorkingHoursDto,
  ) {
    try {
      const validationResult =
        await this.workingHoursService.validateWorkingHours(
          id,
          validateDto.workingHours,
        );

      return {
        success: true,
        data: validationResult,
        message: {
          ar: 'تم التحقق من ساعات العمل بنجاح',
          en: 'Working hours validated successfully',
        },
      };
    } catch (error) {
      // Re-throw if already an HTTP exception
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Validate working hours failed for clinic ${id}: ${error.message}`,
        error.stack,
      );

      throw new HttpException(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: {
              ar: 'فشل التحقق من ساعات العمل',
              en: 'Working hours validation failed',
            },
          },
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Change clinic status with optional staff transfer
   * BZR-44: Status change with staff transfer
   *
   * Task 9.4: Implement PATCH /clinics/:id/status endpoint
   * Requirements: 3.7 (BZR-44), 7.2 (ClinicStatusService)
   * Design: Section 4.3 (ClinicStatusService), Section 6 (Controller Layer)
   *
   * This endpoint changes clinic status with cascading effects including:
   * - Status change (active/inactive/suspended)
   * - Optional staff and doctor transfer to target clinic
   * - Appointment rescheduling for affected appointments
   * - Notification sending to affected parties
   * - Transaction safety for data consistency
   *
   * When deactivating a clinic with active appointments or assigned staff,
   * the system requires a transfer decision. If transfer is requested,
   * a target clinic must be specified.
   *
   * @param id - Clinic ID from route params
   * @param changeStatusDto - Status change options including transfer settings
   * @param req - Request object containing authenticated user
   * @returns Status change result with transfer counts and notifications
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Change clinic status',
    description:
      'Change clinic status with optional staff transfer, appointment rescheduling, and notifications. Requires transfer decision when deactivating with active resources. Restricted to owners and admins.',
  })
  @ApiBody({
    type: ChangeStatusDto,
    description: 'Status change options including transfer settings',
    examples: {
      deactivateWithTransfer: {
        summary: 'Deactivate clinic and transfer all staff',
        value: {
          status: 'inactive',
          reason: 'Temporary closure for renovation',
          transferDoctors: true,
          transferStaff: true,
          targetClinicId: '507f1f77bcf86cd799439011',
          notifyStaff: true,
          notifyPatients: true,
        },
      },
      activate: {
        summary: 'Activate clinic',
        value: {
          status: 'active',
        },
      },
      suspend: {
        summary: 'Suspend clinic without transfer',
        value: {
          status: 'suspended',
          reason: 'Pending license renewal',
        },
      },
      deactivateWithDepartment: {
        summary: 'Deactivate and transfer to specific department',
        value: {
          status: 'inactive',
          reason: 'Merging with main clinic',
          transferDoctors: true,
          transferStaff: true,
          targetClinicId: '507f1f77bcf86cd799439011',
          targetDepartmentId: '507f1f77bcf86cd799439012',
          notifyStaff: true,
          notifyPatients: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Status changed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            clinic: {
              type: 'object',
              description: 'Updated clinic object',
            },
            doctorsTransferred: {
              type: 'number',
              example: 5,
              description: 'Number of doctors transferred (if applicable)',
            },
            staffTransferred: {
              type: 'number',
              example: 3,
              description: 'Number of staff transferred (if applicable)',
            },
            appointmentsAffected: {
              type: 'number',
              example: 12,
              description: 'Number of appointments affected',
            },
            appointmentsRescheduled: {
              type: 'number',
              example: 12,
              description: 'Number of appointments marked for rescheduling',
            },
            notificationsSent: {
              type: 'object',
              properties: {
                staff: { type: 'number', example: 8 },
                patients: { type: 'number', example: 12 },
                doctors: { type: 'number', example: 5 },
              },
              description: 'Notification counts by recipient type',
            },
          },
        },
        message: {
          type: 'object',
          properties: {
            ar: {
              type: 'string',
              example: 'تم تغيير حالة العيادة بنجاح',
            },
            en: {
              type: 'string',
              example: 'Clinic status changed successfully',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Transfer required or validation failed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'CLINIC_004' },
            message: {
              type: 'object',
              properties: {
                ar: {
                  type: 'string',
                  example: 'يرجى اختيار ما إذا كنت تريد الاحتفاظ بالأطباء أو نقلهم',
                },
                en: {
                  type: 'string',
                  example: 'Please choose whether to keep or transfer doctors/staff',
                },
              },
            },
            requiresTransfer: { type: 'boolean', example: true },
            activeAppointments: { type: 'number', example: 12 },
            assignedDoctors: { type: 'number', example: 5 },
            assignedStaff: { type: 'number', example: 3 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Clinic not found',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'CLINIC_007' },
            message: {
              type: 'object',
              properties: {
                ar: { type: 'string', example: 'العيادة غير موجودة' },
                en: { type: 'string', example: 'Clinic not found' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires owner or admin role',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'INSUFFICIENT_PERMISSIONS' },
            message: {
              type: 'object',
              properties: {
                ar: {
                  type: 'string',
                  example: 'ليس لديك صلاحية للوصول إلى هذا المورد',
                },
                en: {
                  type: 'string',
                  example: 'You do not have permission to access this resource',
                },
              },
            },
          },
        },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  async changeStatus(
    @Param('id') id: string,
    @Body() changeStatusDto: ChangeStatusDto,
    @Request() req: any,
  ) {
    try {
      // Extract userId from JWT token
      const userId = req.user?.id || req.user?.userId || req.user?.sub;

      if (!userId) {
        throw new HttpException(
          {
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: {
                ar: 'غير مصرح - معرف المستخدم مطلوب',
                en: 'Unauthorized - User ID required',
              },
            },
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Call status service to change status
      const result = await this.statusService.changeStatus(
        id,
        changeStatusDto,
        userId,
      );

      return {
        success: true,
        data: result,
        message: {
          ar: 'تم تغيير حالة العيادة بنجاح',
          en: 'Clinic status changed successfully',
        },
      };
    } catch (error) {
      // Re-throw if already an HTTP exception
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Change status failed for clinic ${id}: ${error.message}`,
        error.stack,
      );

      throw new HttpException(
        {
          success: false,
          error: {
            code: 'STATUS_CHANGE_FAILED',
            message: {
              ar: 'فشل تغيير حالة العيادة',
              en: 'Failed to change clinic status',
            },
          },
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Assign person-in-charge to clinic
   * BZR-41: PIC selection from complex PICs
   *
   * Task 9.5: Implement PATCH /clinics/:id/pic endpoint
   * Requirements: 3.4 (BZR-41), 8.1 (assignPersonInCharge method)
   * Design: Section 4.1 (Service Layer), Section 6 (Controller Layer)
   *
   * This endpoint assigns a person-in-charge (PIC) to a clinic.
   * The PIC must be selected from users who are already assigned as PICs
   * for the parent complex to which the clinic belongs.
   *
   * Business Rules:
   * - The selected user must be the PIC of the clinic's parent complex
   * - System validates the PIC is from the parent complex
   * - Throws CLINIC_002 error if user is not a PIC of the parent complex
   * - Throws CLINIC_007 error if clinic not found
   *
   * @param id - Clinic ID from route params
   * @param assignPICDto - DTO containing personInChargeId
   * @returns Updated clinic with populated PIC information
   */
  @Patch(':id/pic')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Assign person-in-charge to clinic',
    description:
      'Assign a person-in-charge (PIC) to a clinic. The PIC must be selected from the parent complex PICs.',
  })
  @ApiBody({
    type: AssignPICDto,
    description: 'Person-in-charge assignment data',
    examples: {
      assignPIC: {
        summary: 'Assign PIC to clinic',
        value: {
          personInChargeId: '507f1f77bcf86cd799439011',
        },
      },
      updatePIC: {
        summary: 'Update existing PIC',
        value: {
          personInChargeId: '507f1f77bcf86cd799439012',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'PIC assigned successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          description: 'Updated clinic with populated PIC information',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439012' },
            name: { type: 'string', example: 'Cardiology Clinic' },
            complexId: { type: 'string', example: '507f1f77bcf86cd799439011' },
            personInChargeId: {
              type: 'object',
              properties: {
                _id: { type: 'string', example: '507f1f77bcf86cd799439013' },
                firstName: { type: 'string', example: 'John' },
                lastName: { type: 'string', example: 'Doe' },
                email: { type: 'string', example: 'john.doe@example.com' },
                role: { type: 'string', example: 'admin' },
              },
            },
          },
        },
        message: {
          type: 'object',
          properties: {
            ar: {
              type: 'string',
              example: 'تم تعيين الشخص المسؤول بنجاح',
            },
            en: {
              type: 'string',
              example: 'Person-in-charge assigned successfully',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid PIC - not from parent complex',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'CLINIC_002' },
            message: {
              type: 'object',
              properties: {
                ar: {
                  type: 'string',
                  example: 'يجب أن يكون الشخص المسؤول من المسؤولين عن المجمع',
                },
                en: {
                  type: 'string',
                  example: 'Person in charge must be from complex PICs',
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Clinic not found',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'CLINIC_007' },
            message: {
              type: 'object',
              properties: {
                ar: { type: 'string', example: 'العيادة غير موجودة' },
                en: { type: 'string', example: 'Clinic not found' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @HttpCode(HttpStatus.OK)
  async assignPersonInCharge(
    @Param('id') id: string,
    @Body() assignPICDto: AssignPICDto,
  ) {
    try {
      // Call clinic service to assign PIC
      const updatedClinic = await this.clinicService.assignPersonInCharge(
        id,
        assignPICDto,
      );

      return {
        success: true,
        data: updatedClinic,
        message: {
          ar: 'تم تعيين الشخص المسؤول بنجاح',
          en: 'Person-in-charge assigned successfully',
        },
      };
    } catch (error) {
      // Re-throw if already an HTTP exception
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Assign PIC failed for clinic ${id}: ${error.message}`,
        error.stack,
      );

      throw new HttpException(
        {
          success: false,
          error: {
            code: 'ASSIGN_PIC_FAILED',
            message: {
              ar: 'فشل تعيين الشخص المسؤول',
              en: 'Failed to assign person-in-charge',
            },
          },
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Transfer staff and doctors between clinics
   * BZR-44: Status change with staff transfer
   *
   * Task 9.6: Implement POST /clinics/:id/transfer-staff endpoint
   * Requirements: 3.7 (BZR-44), 7.2 (ClinicStatusService)
   * Design: Section 4.3 (ClinicStatusService), Section 6 (Controller Layer)
   *
   * This endpoint transfers doctors and staff from one clinic to another.
   * It can be used independently or as part of a status change operation.
   *
   * Features:
   * - Transfer all or specific doctors/staff
   * - Optional department assignment in target clinic
   * - Handles appointment conflicts with configurable strategy
   * - Transaction-based for data consistency
   * - Returns detailed transfer results
   *
   * Business Rules:
   * - Source clinic must exist (CLINIC_007)
   * - Target clinic must exist (CLINIC_008)
   * - Can transfer all or specific personnel
   * - Appointments are handled based on conflict strategy
   * - Transaction ensures atomicity
   *
   * @param id - Source clinic ID from route params
   * @param transferStaffDto - Transfer options including target clinic and personnel
   * @returns Transfer result with counts and any errors
   */
  @Post(':id/transfer-staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Transfer staff and doctors between clinics',
    description:
      'Transfer doctors and staff from one clinic to another with configurable conflict handling. Supports transferring all or specific personnel. Restricted to owners and admins.',
  })
  @ApiBody({
    type: TransferStaffDto,
    description: 'Staff transfer options including target clinic and personnel',
    examples: {
      transferAll: {
        summary: 'Transfer all doctors and staff',
        value: {
          targetClinicId: '507f1f77bcf86cd799439011',
          transferDoctors: true,
          transferStaff: true,
          handleConflicts: 'reschedule',
        },
      },
      transferSpecificDoctors: {
        summary: 'Transfer specific doctors only',
        value: {
          targetClinicId: '507f1f77bcf86cd799439011',
          targetDepartmentId: '507f1f77bcf86cd799439012',
          transferDoctors: true,
          transferStaff: false,
          doctorIds: ['507f1f77bcf86cd799439013', '507f1f77bcf86cd799439014'],
          handleConflicts: 'notify',
        },
      },
      transferStaffOnly: {
        summary: 'Transfer staff members only',
        value: {
          targetClinicId: '507f1f77bcf86cd799439011',
          transferDoctors: false,
          transferStaff: true,
          staffIds: ['507f1f77bcf86cd799439015', '507f1f77bcf86cd799439016'],
          handleConflicts: 'cancel',
        },
      },
      transferWithDepartment: {
        summary: 'Transfer all to specific department',
        value: {
          targetClinicId: '507f1f77bcf86cd799439011',
          targetDepartmentId: '507f1f77bcf86cd799439012',
          transferDoctors: true,
          transferStaff: true,
          handleConflicts: 'reschedule',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Staff transferred successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            doctorsTransferred: {
              type: 'number',
              example: 5,
              description: 'Number of doctors successfully transferred',
            },
            staffTransferred: {
              type: 'number',
              example: 3,
              description: 'Number of staff successfully transferred',
            },
            appointmentsAffected: {
              type: 'number',
              example: 12,
              description: 'Number of appointments affected by the transfer',
            },
            errors: {
              type: 'array',
              items: { type: 'string' },
              description: 'Any errors encountered during transfer',
              example: [],
            },
          },
        },
        message: {
          type: 'object',
          properties: {
            ar: {
              type: 'string',
              example: 'تم نقل الموظفين بنجاح',
            },
            en: {
              type: 'string',
              example: 'Staff transferred successfully',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'TRANSFER_FAILED' },
            message: {
              type: 'object',
              properties: {
                ar: {
                  type: 'string',
                  example: 'فشل نقل الموظفين',
                },
                en: {
                  type: 'string',
                  example: 'Failed to transfer staff',
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Clinic not found',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              example: 'CLINIC_007',
              description: 'CLINIC_007 for source clinic, CLINIC_008 for target clinic',
            },
            message: {
              type: 'object',
              properties: {
                ar: {
                  type: 'string',
                  example: 'العيادة غير موجودة',
                },
                en: {
                  type: 'string',
                  example: 'Clinic not found',
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires owner or admin role',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'INSUFFICIENT_PERMISSIONS' },
            message: {
              type: 'object',
              properties: {
                ar: {
                  type: 'string',
                  example: 'ليس لديك صلاحية للوصول إلى هذا المورد',
                },
                en: {
                  type: 'string',
                  example: 'You do not have permission to access this resource',
                },
              },
            },
          },
        },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  async transferStaff(
    @Param('id') id: string,
    @Body() transferStaffDto: TransferStaffDto,
  ) {
    try {
      // Call status service to transfer staff
      const result = await this.statusService.transferStaff(id, {
        targetClinicId: transferStaffDto.targetClinicId,
        targetDepartmentId: transferStaffDto.targetDepartmentId,
        transferDoctors: transferStaffDto.transferDoctors,
        transferStaff: transferStaffDto.transferStaff,
        doctorIds: transferStaffDto.doctorIds,
        staffIds: transferStaffDto.staffIds,
        handleConflicts: transferStaffDto.handleConflicts,
      });

      return {
        success: true,
        data: result,
        message: {
          ar: 'تم نقل الموظفين بنجاح',
          en: 'Staff transferred successfully',
        },
      };
    } catch (error) {
      // Re-throw if already an HTTP exception
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Transfer staff failed for clinic ${id}: ${error.message}`,
        error.stack,
      );

      throw new HttpException(
        {
          success: false,
          error: {
            code: 'TRANSFER_FAILED',
            message: {
              ar: 'فشل نقل الموظفين',
              en: 'Failed to transfer staff',
            },
          },
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Get clinics by complex (legacy endpoint)
   * Kept for backward compatibility
   *
   * @deprecated Use GET /clinics/by-complex/:complexId instead
   * @param complexId - Complex ID from route params
   * @returns List of clinics for the complex
   */
  @Get('complex/:complexId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get clinics by complex (legacy)',
    description:
      'Legacy endpoint for retrieving clinics by complex. Use GET /clinics/by-complex/:complexId instead.',
    deprecated: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Clinics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Clinics retrieved successfully',
        },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              name: { type: 'string' },
              status: { type: 'string', example: 'active' },
              complexId: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example: 'Failed to retrieve clinics by complex',
        },
        error: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @HttpCode(HttpStatus.OK)
  async getClinicsByComplexLegacy(@Param('complexId') complexId: string) {
    try {
      const clinics = await this.clinicService.getClinicsByComplex(complexId);
      return {
        success: true,
        message: 'Clinics retrieved successfully',
        data: clinics,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve clinics by complex',
        error: error.message,
      };
    }
  }
}
