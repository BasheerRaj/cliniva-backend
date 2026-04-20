import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Patch,
  Put,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  ValidationPipe,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AppointmentService } from './appointment.service';
import { AppointmentSessionService } from './services/appointment-session.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleScopeGuard } from '../auth/guards/role-scope.guard';
import {
  CreateAppointmentDto,
  UpdateAppointmentDto,
  RescheduleAppointmentDto,
  CancelAppointmentDto,
  AppointmentSearchQueryDto,
  BulkCreateAppointmentDto,
  AppointmentAvailabilityQueryDto,
  ConfirmAppointmentDto,
  AppointmentStatsDto,
  ChangeAppointmentStatusDto,
  StartAppointmentDto,
  EndAppointmentDto,
  ConcludeAppointmentDto,
  CalendarQueryDto,
  UnifiedAvailabilityQueryDto,
  AppointmentPageContextResponseDto,
} from './dto';
import { CreateAppointmentWithSessionDto } from './dto/create-appointment-with-session.dto';
import { BatchBookSessionsDto } from './dto/batch-book-sessions.dto';
import { SWAGGER_EXAMPLES } from './constants/swagger-examples';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';


@ApiTags('Appointments')
@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AppointmentController {
  constructor(
    private readonly appointmentService: AppointmentService,
    private readonly appointmentSessionService: AppointmentSessionService,
  ) { }

  /**
   * Create a new appointment
   * POST /appointments
   */
  @ApiOperation({
    summary: 'Create new appointment',
    description:
      'Creates a new appointment for a patient with a doctor at a specific clinic. Validates appointment time, checks for conflicts, and ensures all referenced entities exist. Appointments can have different urgency levels (low, medium, high, urgent) and will be created with "scheduled" status by default.',
  })
  @ApiResponse({
    status: 201,
    description: 'Appointment created successfully',
    schema: {
      example: SWAGGER_EXAMPLES.CREATE_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Validation error, past date, or appointment conflicts',
    schema: {
      example: SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: SWAGGER_EXAMPLES.UNAUTHORIZED_ERROR,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Patient, doctor, clinic, or service not found',
    schema: {
      example: SWAGGER_EXAMPLES.NOT_FOUND_ERROR,
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Doctor or patient has conflicting appointment',
    schema: {
      example: SWAGGER_EXAMPLES.CONFLICT_ERROR,
    },
  })
  @ApiBody({ type: CreateAppointmentWithSessionDto })
  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.DOCTOR, UserRole.STAFF)
  async createAppointment(
    @Body(new ValidationPipe()) createAppointmentDto: CreateAppointmentWithSessionDto,
    @Request() req: any,
  ) {
    try {
      const appointment = await this.appointmentService.createAppointment(
        createAppointmentDto,
        req.user?.userId,
      );
      const enriched = await this.appointmentSessionService.enrichAppointmentWithSession(appointment);
      return {
        success: true,
        message: {
          ar: 'تم إنشاء الموعد بنجاح',
          en: 'Appointment created successfully',
        },
        data: enriched,
      };
    } catch (error) {
      return {
        success: false,
        message: {
          ar: 'فشل إنشاء الموعد',
          en: 'Failed to create appointment',
        },
        error: error.response?.message || error.message,
      };
    }
  }

  /**
   * Batch book multiple sessions for a patient
   * POST /appointments/batch-book-sessions
   * Requirements: 7.1–7.6
   */
  @ApiOperation({
    summary: 'Batch book multiple sessions',
    description:
      'Atomically books multiple sessions for a patient in a single request. All session bookings must pass validation (reference, duplicate, completed checks). If any validation fails, the entire batch is rejected. Uses MongoDB transactions for atomicity.',
  })
  @ApiResponse({
    status: 201,
    description: 'All sessions booked successfully',
    schema: {
      example: {
        success: true,
        message: { ar: 'تم حجز الجلسات بنجاح', en: 'Sessions booked successfully' },
        data: { totalRequested: 2, successCount: 2, failureCount: 0, appointments: [] },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Batch booking failed — per-session error details returned',
    schema: {
      example: {
        success: false,
        message: { ar: 'فشل حجز بعض الجلسات', en: 'Batch booking failed' },
        error: 'BATCH_BOOKING_FAILED',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBody({ type: BatchBookSessionsDto })
  @Post('batch-book-sessions')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.DOCTOR, UserRole.STAFF)
  async batchBookSessions(
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: BatchBookSessionsDto,
    @Request() req: any,
  ) {
    try {
      const result = await this.appointmentSessionService.batchBookSessions(
        dto,
        req.user?.userId,
      );
      return {
        success: true,
        message: {
          ar: 'تم حجز الجلسات بنجاح',
          en: 'Sessions booked successfully',
        },
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: {
          ar: 'فشل حجز الجلسات',
          en: 'Failed to book sessions',
        },
        error: error.message,
      };
    }
  }

  /**
   * Get session progress for a patient within a service
   * GET /appointments/session-progress/:patientId/:serviceId
   * Requirements: 10.1–10.4
   */
  @ApiOperation({
    summary: 'Get patient session progress',
    description:
      "Returns a patient's progress through all sessions of a multi-step service. Each session is listed with its status (not_booked, scheduled, confirmed, in_progress, completed, cancelled, no_show). Includes completion percentage.",
  })
  @ApiResponse({
    status: 200,
    description: 'Session progress retrieved successfully',
    schema: {
      example: {
        success: true,
        message: { ar: 'تم استرجاع تقدم الجلسات بنجاح', en: 'Session progress retrieved successfully' },
        data: {
          patientId: '507f1f77bcf86cd799439011',
          serviceId: '507f1f77bcf86cd799439013',
          serviceName: 'Multi-Step Treatment',
          totalSessions: 4,
          completedSessions: 2,
          completionPercentage: 50,
          sessions: [],
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Service has no sessions defined' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  @ApiParam({ name: 'patientId', type: String, description: 'Patient ID (MongoDB ObjectId)', example: '507f1f77bcf86cd799439011' })
  @ApiParam({ name: 'serviceId', type: String, description: 'Service ID (MongoDB ObjectId)', example: '507f1f77bcf86cd799439013' })
  @Get('session-progress/:patientId/:serviceId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.DOCTOR, UserRole.STAFF)
  async getSessionProgress(
    @Param('patientId') patientId: string,
    @Param('serviceId') serviceId: string,
    @Query('invoiceId') invoiceId?: string,
  ) {
    try {
      const progress = await this.appointmentSessionService.getSessionProgress(
        patientId,
        serviceId,
        invoiceId,
      );
      return {
        success: true,
        message: {
          ar: 'تم استرجاع تقدم الجلسات بنجاح',
          en: 'Session progress retrieved successfully',
        },
        data: progress,
      };
    } catch (error) {
      return {
        success: false,
        message: {
          ar: 'فشل استرجاع تقدم الجلسات',
          en: 'Failed to retrieve session progress',
        },
        error: error.message,
      };
    }
  }

  /**
   * Get available sessions for a specific invoice
   * GET /appointments/invoice/:invoiceId/available-sessions
   */
  @ApiOperation({
    summary: 'Get available sessions for an invoice',
    description:
      'Returns all sessions within an invoice that are still available for booking (status is pending or cancelled).',
  })
  @ApiResponse({
    status: 200,
    description: 'Available sessions retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  @ApiParam({ name: 'invoiceId', type: String, description: 'Invoice ID (MongoDB ObjectId)' })
  @Get('invoice/:invoiceId/available-sessions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.DOCTOR, UserRole.STAFF)
  async getAvailableSessionsForInvoice(
    @Param('invoiceId') invoiceId: string,
  ) {
    try {
      const sessions = await this.appointmentService.getAvailableSessionsForInvoice(
        invoiceId,
      );
      return {
        success: true,
        message: {
          ar: 'تم استرجاع الجلسات المتاحة بنجاح',
          en: 'Available sessions retrieved successfully',
        },
        data: sessions,
      };
    } catch (error) {
      return {
        success: false,
        message: {
          ar: 'فشل استرجاع الجلسات المتاحة',
          en: 'Failed to retrieve available sessions',
        },
        error: error.message,
      };
    }
  }

  /**
   * Get all appointments with filtering and pagination
   * GET /appointments
   */
  @ApiOperation({
    summary: 'List appointments with filtering',
    description:
      'Retrieves a paginated list of appointments with optional filtering by patient, doctor, clinic, service, date range, status, and urgency level. Supports search across patient and doctor names. Results include populated patient, doctor, clinic, and service details.',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointments retrieved successfully with pagination',
    schema: {
      example: SWAGGER_EXAMPLES.LIST_SUCCESS,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: SWAGGER_EXAMPLES.UNAUTHORIZED_ERROR,
    },
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term for patient or doctor name',
  })
  @ApiQuery({
    name: 'patientId',
    required: false,
    type: String,
    description: 'Filter by patient ID',
  })
  @ApiQuery({
    name: 'doctorId',
    required: false,
    type: String,
    description: 'Filter by doctor ID',
  })
  @ApiQuery({
    name: 'clinicId',
    required: false,
    type: String,
    description: 'Filter by clinic ID',
  })
  @ApiQuery({
    name: 'serviceId',
    required: false,
    type: String,
    description: 'Filter by service ID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [
      'scheduled',
      'confirmed',
      'in_progress',
      'completed',
      'cancelled',
      'no_show',
    ],
    description: 'Filter by appointment status',
  })
  @ApiQuery({
    name: 'urgencyLevel',
    required: false,
    enum: ['low', 'medium', 'high', 'urgent'],
    description: 'Filter by urgency level',
  })
  @ApiQuery({
    name: 'appointmentDate',
    required: false,
    type: String,
    description: 'Filter by specific date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    type: String,
    description: 'Filter by date range start (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    type: String,
    description: 'Filter by date range end (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 100)',
    example: 10,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    description: 'Sort field (default: appointmentDate)',
    example: 'appointmentDate',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order (default: desc)',
    example: 'desc',
  })
  @UseGuards(RoleScopeGuard) // UC-e1f2d3c: Apply role-based filtering
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
    UserRole.DOCTOR,
  )
  @Get()
  async getAppointments(
    @Query(new ValidationPipe()) query: AppointmentSearchQueryDto,
    @Request() req: any, // UC-e1f2d3c: Get user from request for role filtering
  ) {
    try {
      const result = await this.appointmentService.getAppointments(
        query,
        req.user?.userId,
        req.user?.role,
        req.user?.clinicId,
        req.user?.subscriptionId,
        req.user?.complexId,
        Array.isArray(req.user?.clinicIds) ? req.user.clinicIds.map(String) : undefined,
      );
      return {
        success: true,
        message: {
          ar: 'تم استرجاع المواعيد بنجاح',
          en: 'Appointments retrieved successfully',
        },
        data: result.appointments,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit: parseInt(String(query.limit) || '10'),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: {
          ar: 'فشل استرجاع المواعيد',
          en: 'Failed to retrieve appointments',
        },
        error: error.message,
      };
    }
  }

  /**
   * Get appointment by ID
   * GET /appointments/:id
   */
  @ApiOperation({
    summary: 'Get appointment by ID',
    description:
      'Retrieves detailed information about a specific appointment including populated patient, doctor, clinic, and service details. Returns full appointment data with all related entity information.',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment retrieved successfully',
    schema: {
      example: SWAGGER_EXAMPLES.GET_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid appointment ID format',
    schema: {
      example: SWAGGER_EXAMPLES.INVALID_ID_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: SWAGGER_EXAMPLES.UNAUTHORIZED_ERROR,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Appointment does not exist',
    schema: {
      example: SWAGGER_EXAMPLES.NOT_FOUND_ERROR,
    },
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Appointment ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439011',
  })
  // =========================================================================
  // M6 – GET /appointments/available-clinics (UC-d2e3f4c QuickAdd drawer)
  // MUST be declared BEFORE ':id' route so the literal path is not captured as ID
  // =========================================================================
  @ApiOperation({
    summary: 'Get clinics available at a specific date and time',
    description:
      'Returns clinics that are open at the given date and time slot. Used by the QuickAddDrawer when "All Clinics" is selected.',
  })
  @ApiQuery({ name: 'date', required: true, type: String, description: 'Date in YYYY-MM-DD format' })
  @ApiQuery({ name: 'time', required: true, type: String, description: 'Time in HH:mm (24-hour)' })
  @ApiQuery({ name: 'clinicCollectionId', required: false, type: String, description: 'Optional complex ID filter' })
  @ApiQuery({ name: 'serviceId', required: false, type: String, description: 'Single service ID filter (ClinicService junction)' })
  @ApiQuery({ name: 'serviceIds', required: false, type: String, description: 'Comma-separated service IDs — returns UNION of clinics that offer any service' })
  @ApiQuery({ name: 'doctorId', required: false, type: String, description: 'Pre-selected doctor ID — filters to clinics where that doctor is assigned' })
  @ApiResponse({ status: 200, description: 'Available clinics returned successfully' })
  @Get('available-clinics')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.DOCTOR, UserRole.STAFF)
  async getAvailableClinics(
    @Request() req: any,
    @Query('date') date: string,
    @Query('time') time: string,
    @Query('clinicCollectionId') clinicCollectionId?: string,
    @Query('serviceId') serviceId?: string,
    @Query('serviceIds') serviceIdsParam?: string,
    @Query('doctorId') doctorId?: string,
  ) {
    if (!date || !time) {
      throw new BadRequestException('date and time query parameters are required');
    }
    // Parse comma-separated serviceIds into array
    const serviceIds = serviceIdsParam
      ? serviceIdsParam.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;
    try {
      const clinics = await this.appointmentService.getAvailableClinics(
        date,
        time,
        clinicCollectionId,
        req.user?.clinicId,
        Array.isArray(req.user?.clinicIds)
          ? req.user.clinicIds.map(String)
          : undefined,
        req.user?.organizationId,
        req.user?.role,
        serviceId,
        req.user?.subscriptionId,
        req.user?.complexId,
        serviceIds,
        doctorId,
      );
      return {
        success: true,
        message: {
          ar: 'تم استرجاع العيادات المتاحة بنجاح',
          en: 'Available clinics retrieved successfully',
        },
        data: clinics,
      };
    } catch (error) {
      return {
        success: false,
        message: {
          ar: 'فشل استرجاع العيادات المتاحة',
          en: 'Failed to retrieve available clinics',
        },
        error: error.message,
      };
    }
  }

  // =========================================================================
  // M6 – GET /appointments/available-doctors (UC-d2e3f4c QuickAdd drawer)
  // MUST be declared BEFORE ':id' route so the literal path is not captured as ID
  // =========================================================================
  @ApiOperation({
    summary: 'Get doctors available at a specific date and time',
    description:
      'Returns doctors at the given clinic who are NOT busy at the requested date/time slot. Used by the QuickAddDrawer to show only bookable doctors. Supports filtering by multiple service IDs from the sidebar.',
  })
  @ApiQuery({ name: 'date', required: true, type: String, description: 'Date in YYYY-MM-DD format' })
  @ApiQuery({ name: 'time', required: true, type: String, description: 'Time in HH:mm (24-hour)' })
  @ApiQuery({ name: 'clinicId', required: true, type: String, description: 'Clinic ID to scope doctors' })
  @ApiQuery({ name: 'duration', required: false, type: Number, description: 'Appointment duration in minutes (default 30)' })
  @ApiQuery({ name: 'serviceId', required: false, type: String, description: 'Single service ID to filter authorized doctors' })
  @ApiQuery({ name: 'serviceIds', required: false, type: String, description: 'Comma-separated service IDs to filter authorized doctors' })
  @ApiResponse({ status: 200, description: 'Available doctors returned successfully' })
  @Get('available-doctors')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.DOCTOR, UserRole.STAFF)
  async getAvailableDoctors(
    @Request() req: any,
    @Query('date') date: string,
    @Query('time') time: string,
    @Query('clinicId') clinicId: string,
    @Query('duration') duration?: string,
    @Query('serviceId') serviceId?: string,
    @Query('serviceIds') serviceIds?: string,
  ) {
    if (!date || !time || !clinicId) {
      throw new BadRequestException('date, time, and clinicId query parameters are required');
    }
    try {
      const parsedServiceIds = serviceIds ? serviceIds.split(',').filter(Boolean) : undefined;
      const doctors = await this.appointmentService.getAvailableDoctors(
        clinicId,
        date,
        time,
        duration ? parseInt(duration, 10) : 30,
        serviceId,
        req.user?.userId,
        req.user?.role,
        parsedServiceIds,
      );
      return {
        success: true,
        message: {
          ar: 'تم استرجاع الأطباء المتاحين بنجاح',
          en: 'Available doctors retrieved successfully',
        },
        data: doctors,
      };
    } catch (error) {
      return {
        success: false,
        message: {
          ar: 'فشل استرجاع الأطباء المتاحين',
          en: 'Failed to retrieve available doctors',
        },
        error: error.message,
      };
    }
  }

  // =========================================================================
  // M6 – GET /appointments/calendar  (UC-d2e3f4c)
  // MUST be declared BEFORE ':id' route so "calendar" is not captured as an ID
  // =========================================================================
  @ApiOperation({
    summary: 'Get appointments calendar',
    description:
      'Returns appointments grouped by date for calendar views. Supports day, week, and month views with optional filtering by clinic, doctor, and status. Doctors only see their own appointments.',
  })
  @ApiQuery({ name: 'view', required: false, enum: ['day', 'week', 'month'], description: 'Calendar view mode (default: week)' })
  @ApiQuery({ name: 'date', required: false, type: String, description: 'Anchor date YYYY-MM-DD (default: today)' })
  @ApiQuery({ name: 'clinicId', required: false, type: String, description: 'Filter by clinic (auto-restricted for Staff role)' })
  @ApiQuery({ name: 'doctorId', required: false, type: String, description: 'Filter by doctor (auto-restricted for Doctor role)' })
  @ApiQuery({ name: 'status', required: false, enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'] })
  @ApiResponse({ status: 200, description: 'Calendar data retrieved successfully' })
  @Get('calendar')
  @UseGuards(RoleScopeGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.DOCTOR, UserRole.STAFF)
  async getAppointmentsCalendar(
    @Query(new ValidationPipe({ transform: true })) query: CalendarQueryDto,
    @Request() req: any,
  ) {
    try {
      const result = await this.appointmentService.getAppointmentsCalendar(
        query,
        req.user?.userId,
        req.user?.role,
      );
      return {
        success: true,
        message: {
          ar: 'تم استرجاع التقويم بنجاح',
          en: 'Calendar retrieved successfully',
        },
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: {
          ar: 'فشل استرجاع التقويم',
          en: 'Failed to retrieve calendar',
        },
        error: error.message,
      };
    }
  }

  /**
   * Get appointment page context (filters based on plan)
   * GET /appointments/context
   */
  @ApiOperation({
    summary: 'Get appointment page context',
    description: 'Returns available complexes, clinics, and doctors based on the organization plan type for the appointments page filters.',
  })
  @ApiResponse({ status: 200, type: AppointmentPageContextResponseDto })
  @Get('context')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.DOCTOR, UserRole.STAFF)
  async getAppointmentPageContext(@Request() req: any) {
    try {
      const result = await this.appointmentService.getAppointmentPageContext(req.user);
      return {
        success: true,
        message: {
          ar: 'تم استرجاع سياق الصفحة بنجاح',
          en: 'Page context retrieved successfully',
        },
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: {
          ar: 'فشل استرجاع سياق الصفحة',
          en: 'Failed to retrieve page context',
        },
        error: error.message,
      };
    }
  }

  /**
   * Get unified availability across multiple clinics/doctors
   * POST /appointments/unified-availability
   */
  @ApiOperation({
    summary: 'Get unified availability',
    description: 'Returns combined availability slots across multiple selected clinics and doctors.',
  })
  @ApiResponse({ status: 200, description: 'Unified availability retrieved successfully' })
  @ApiBody({ type: UnifiedAvailabilityQueryDto })
  @Post('unified-availability')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.DOCTOR, UserRole.STAFF)
  async getUnifiedAvailability(
    @Body(new ValidationPipe({ transform: true })) query: UnifiedAvailabilityQueryDto,
  ) {
    try {
      const result = await this.appointmentService.getUnifiedAvailability(query);
      return {
        success: true,
        message: {
          ar: 'تم استرجاع التوفر الموحد بنجاح',
          en: 'Unified availability retrieved successfully',
        },
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: {
          ar: 'فشل استرجاع التوفر الموحد',
          en: 'Failed to retrieve unified availability',
        },
        error: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Get doctor dashboard statistics',
    description:
      'Returns lightweight status counts for doctor dashboard cards within a date range.',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: true,
    type: String,
    description: 'Start date (YYYY-MM-DD)',
    example: '2026-04-01',
  })
  @ApiQuery({
    name: 'dateTo',
    required: true,
    type: String,
    description: 'End date (YYYY-MM-DD)',
    example: '2026-04-30',
  })
  @ApiQuery({
    name: 'doctorId',
    required: false,
    type: String,
    description: 'Optional doctorId for admin roles',
  })
  @ApiQuery({
    name: 'clinicId',
    required: false,
    type: String,
    description: 'Optional clinic filter',
  })
  @Get('stats/doctor')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.DOCTOR,
  )
  async getDoctorDashboardStats(
    @Request() req: any,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('doctorId') doctorId?: string,
    @Query('clinicId') clinicId?: string,
  ) {
    try {
      if (!dateFrom || !dateTo) {
        throw new BadRequestException('dateFrom and dateTo are required');
      }

      const stats = await this.appointmentService.getDoctorDashboardStats(
        req.user?.userId,
        req.user?.role,
        dateFrom,
        dateTo,
        doctorId,
        clinicId,
      );

      return {
        success: true,
        message: 'Doctor dashboard statistics retrieved successfully',
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve doctor dashboard statistics',
        error: error.message,
      };
    }
  }

  /**
   * Get staff dashboard statistics
   * GET /appointments/stats/staff
   */
  @Get('stats/staff')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  async getStaffDashboardStats(
    @Request() req: any,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('clinicIds') clinicIdsRaw?: string,
  ) {
    try {
      if (!dateFrom || !dateTo) {
        throw new BadRequestException('dateFrom and dateTo are required');
      }
      const clinicIds = clinicIdsRaw?.split(',').filter(Boolean) ?? [];
      const data = await this.appointmentService.getStaffDashboardStats(
        req.user?.userId,
        req.user?.role,
        req.user?.planType ? String(req.user.planType) : undefined,
        req.user?.clinicId,
        Array.isArray(req.user?.clinicIds) ? req.user.clinicIds.map(String) : undefined,
        req.user?.complexId ? String(req.user.complexId) : undefined,
        req.user?.subscriptionId ? String(req.user.subscriptionId) : undefined,
        req.user?.organizationId ? String(req.user.organizationId) : undefined,
        dateFrom,
        dateTo,
        clinicIds,
      );
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Failed to retrieve staff dashboard statistics', error: error.message };
    }
  }

  /**
   * Get doctors overview for staff dashboard
   * GET /appointments/stats/doctors-overview
   */
  @Get('stats/doctors-overview')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  async getDoctorsOverview(
    @Request() req: any,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('clinicIds') clinicIdsRaw?: string,
  ) {
    try {
      if (!dateFrom || !dateTo) {
        throw new BadRequestException('dateFrom and dateTo are required');
      }
      const clinicIds = clinicIdsRaw?.split(',').filter(Boolean) ?? [];
      const data = await this.appointmentService.getDoctorsOverview(
        req.user?.userId,
        req.user?.role,
        req.user?.planType ? String(req.user.planType) : undefined,
        req.user?.clinicId,
        Array.isArray(req.user?.clinicIds) ? req.user.clinicIds.map(String) : undefined,
        req.user?.complexId ? String(req.user.complexId) : undefined,
        req.user?.subscriptionId ? String(req.user.subscriptionId) : undefined,
        req.user?.organizationId ? String(req.user.organizationId) : undefined,
        dateFrom,
        dateTo,
        clinicIds,
      );
      return { success: true, data };
    } catch (error) {
      return { success: false, message: 'Failed to retrieve doctors overview', error: error.message };
    }
  }

  /**
   * Get admin/owner dashboard statistics
   * GET /appointments/stats/admin-owner
   */
  @Get('stats/admin-owner')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
  )
  async getAdminOwnerDashboardStats(
    @Request() req: any,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('complexIds') complexIdsRaw?: string,
    @Query('clinicIds') clinicIdsRaw?: string,
  ) {
    try {
      if (!dateFrom || !dateTo) {
        throw new BadRequestException('dateFrom and dateTo are required');
      }

      const complexIds = complexIdsRaw?.split(',').filter(Boolean) ?? [];
      const clinicIds = clinicIdsRaw?.split(',').filter(Boolean) ?? [];

      const data = await this.appointmentService.getAdminOwnerDashboardStats(
        req.user?.userId,
        req.user?.role,
        req.user?.planType ? String(req.user.planType) : undefined,
        req.user?.clinicId,
        Array.isArray(req.user?.clinicIds) ? req.user.clinicIds.map(String) : undefined,
        req.user?.complexId ? String(req.user.complexId) : undefined,
        req.user?.subscriptionId ? String(req.user.subscriptionId) : undefined,
        req.user?.organizationId ? String(req.user.organizationId) : undefined,
        dateFrom,
        dateTo,
        complexIds,
        clinicIds,
      );

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve admin/owner dashboard statistics',
        error: error.message,
      };
    }
  }

  /**
   * Get appointment by ID
   * GET /appointments/:id
   */
  @ApiOperation({
    summary: 'Get appointment by ID',
    description:
      'Retrieves detailed information about a specific appointment including populated patient, doctor, clinic, and service details. Returns full appointment data with all related entity information.',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment retrieved successfully',
    schema: {
      example: SWAGGER_EXAMPLES.GET_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid appointment ID format',
    schema: {
      example: SWAGGER_EXAMPLES.INVALID_ID_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: SWAGGER_EXAMPLES.UNAUTHORIZED_ERROR,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Appointment does not exist',
    schema: {
      example: SWAGGER_EXAMPLES.NOT_FOUND_ERROR,
    },
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Appointment ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439011',
  })
  @UseGuards(RoleScopeGuard) // UC-1c3a2b0: Apply role-based filtering
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
    UserRole.DOCTOR,
  )
  @Get(':id')
  async getAppointment(
    @Param('id') id: string,
    @Request() req: any, // UC-1c3a2b0: Get user for role-based access
  ) {
    try {
      const appointment = await this.appointmentService.getAppointmentById(id);
      const enriched = await this.appointmentSessionService.enrichAppointmentWithSession(appointment);
      return {
        success: true,
        message: {
          ar: 'تم استرجاع الموعد بنجاح',
          en: 'Appointment retrieved successfully',
        },
        data: enriched,
      };
    } catch (error) {
      return {
        success: false,
        message: {
          ar: 'فشل استرجاع الموعد',
          en: 'Failed to retrieve appointment',
        },
        error: error.message,
      };
    }
  }


  /**
   * Update appointment information
   * PUT /appointments/:id
   */
  @ApiOperation({
    summary: 'Update appointment',
    description:
      'Updates appointment information including patient, doctor, clinic, service, date, time, status, urgency level, and notes. Validates new appointment time and checks for conflicts if date/time is changed. Cannot update completed, cancelled, or no-show appointments.',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment updated successfully',
    schema: {
      example: SWAGGER_EXAMPLES.UPDATE_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Invalid data, past date, or appointment conflicts',
    schema: {
      example: SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: SWAGGER_EXAMPLES.UNAUTHORIZED_ERROR,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Appointment or related entity not found',
    schema: {
      example: SWAGGER_EXAMPLES.NOT_FOUND_ERROR,
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - New time conflicts with existing appointment',
    schema: {
      example: SWAGGER_EXAMPLES.CONFLICT_ERROR,
    },
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Appointment ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({ type: UpdateAppointmentDto })
  @UseGuards(RoleScopeGuard) // UC-b6d5c4e: Apply role-based filtering
  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.DOCTOR, UserRole.STAFF)
  async updateAppointment(
    @Param('id') id: string,
    @Body(new ValidationPipe()) updateAppointmentDto: UpdateAppointmentDto,
    @Request() req: any, // UC-b6d5c4e: Get user for role-based access
  ) {
    const appointment = await this.appointmentService.updateAppointment(
      id,
      updateAppointmentDto,
      req.user?.userId,
      req.user?.role,
    );
    return {
      success: true,
      message: {
        ar: 'تم تحديث الموعد بنجاح',
        en: 'Appointment updated successfully',
      },
      data: appointment,
    };
  }

  /**
   * Soft delete appointment
   * DELETE /appointments/:id
   */
  @ApiOperation({
    summary: 'Delete appointment',
    description:
      'Soft deletes an appointment by setting deletedAt timestamp. The appointment is not permanently removed from the database and can be recovered if needed. Deleted appointments are excluded from all queries by default.',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment deleted successfully',
    schema: {
      example: SWAGGER_EXAMPLES.DELETE_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid appointment ID format',
    schema: {
      example: SWAGGER_EXAMPLES.INVALID_ID_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: SWAGGER_EXAMPLES.UNAUTHORIZED_ERROR,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Appointment does not exist',
    schema: {
      example: SWAGGER_EXAMPLES.NOT_FOUND_ERROR,
    },
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Appointment ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439011',
  })
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, RoleScopeGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  @HttpCode(HttpStatus.OK)
  async deleteAppointment(@Param('id') id: string, @Request() req: any) {
    await this.appointmentService.deleteAppointment(
      id,
      req.user?.userId,
      req.user,
    );
    return {
      success: true,
      message: {
        ar: 'تم حذف الموعد بنجاح',
        en: 'Appointment deleted successfully',
      },
    };
  }

  /**
   * Restore deleted appointment
   * POST /appointments/:id/restore
   * Task 13.6 - Requirements: 13.6, 13.7
   */
  @ApiOperation({
    summary: 'Restore deleted appointment',
    description:
      'Restores a soft-deleted appointment by clearing the deletion markers. Only Admin users can restore appointments. The appointment will be available in all queries after restoration.',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment restored successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم استعادة الموعد بنجاح',
          en: 'Appointment restored successfully',
        },
        data: {
          id: '507f1f77bcf86cd799439011',
          status: 'scheduled',
          appointmentDate: '2024-03-15',
          appointmentTime: '14:30',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid appointment ID format',
    schema: {
      example: {
        success: false,
        message: {
          ar: 'معرف الموعد غير صالح',
          en: 'Invalid appointment ID format',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: SWAGGER_EXAMPLES.UNAUTHORIZED_ERROR,
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Deleted appointment does not exist',
    schema: {
      example: {
        success: false,
        message: {
          ar: 'الموعد المحذوف غير موجود',
          en: 'Deleted appointment not found',
        },
      },
    },
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Appointment ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439011',
  })
  @Post(':id/restore')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async restoreAppointment(@Param('id') id: string) {
    try {
      const appointment = await this.appointmentService.restoreAppointment(id);
      return {
        success: true,
        message: {
          ar: 'تم استعادة الموعد بنجاح',
          en: 'Appointment restored successfully',
        },
        data: appointment,
      };
    } catch (error) {
      return {
        success: false,
        message: {
          ar: 'فشل استعادة الموعد',
          en: 'Failed to restore appointment',
        },
        error: error.message,
      };
    }
  }

  /**
   * Reschedule appointment
   * POST /appointments/:id/reschedule
   */
  @ApiOperation({
    summary: 'Reschedule appointment',
    description:
      'Reschedules an existing appointment to a new date and time. Validates the new time slot, checks for conflicts with doctor and patient schedules. Cannot reschedule completed, cancelled, or no-show appointments. Optionally notifies the patient of the change.',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment rescheduled successfully',
    schema: {
      example: SWAGGER_EXAMPLES.RESCHEDULE_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Invalid status for rescheduling or invalid new time',
    schema: {
      example: SWAGGER_EXAMPLES.INVALID_STATUS_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: SWAGGER_EXAMPLES.UNAUTHORIZED_ERROR,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Appointment does not exist',
    schema: {
      example: SWAGGER_EXAMPLES.NOT_FOUND_ERROR,
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - New time conflicts with existing appointment',
    schema: {
      example: SWAGGER_EXAMPLES.CONFLICT_ERROR,
    },
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Appointment ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({ type: RescheduleAppointmentDto })
  @Post(':id/reschedule')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.DOCTOR, UserRole.STAFF)
  async rescheduleAppointment(
    @Param('id') id: string,
    @Body(new ValidationPipe()) rescheduleDto: RescheduleAppointmentDto,
    @Request() req: any,
  ) {
    try {
      const appointment = await this.appointmentService.rescheduleAppointment(
        id,
        rescheduleDto,
        req.user?.userId,
      );
      return {
        success: true,
        message: {
          ar: 'تم إعادة جدولة الموعد بنجاح',
          en: 'Appointment rescheduled successfully',
        },
        data: appointment,
      };
    } catch (error) {
      return {
        success: false,
        message: {
          ar: 'فشل إعادة جدولة الموعد',
          en: 'Failed to reschedule appointment',
        },
        error: error.message,
      };
    }
  }

  /**
   * Cancel appointment
   * POST /appointments/:id/cancel
   */
  @ApiOperation({
    summary: 'Cancel appointment',
    description:
      'Cancels an existing appointment and records the cancellation reason. Updates appointment status to "cancelled". Cannot cancel already completed or cancelled appointments. Optionally notifies the patient and allows rescheduling.',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment cancelled successfully',
    schema: {
      example: SWAGGER_EXAMPLES.CANCEL_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Cannot cancel appointment with current status',
    schema: {
      example: SWAGGER_EXAMPLES.INVALID_STATUS_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: SWAGGER_EXAMPLES.UNAUTHORIZED_ERROR,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Appointment does not exist',
    schema: {
      example: SWAGGER_EXAMPLES.NOT_FOUND_ERROR,
    },
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Appointment ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({ type: CancelAppointmentDto })
  @Post(':id/cancel')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async cancelAppointment(
    @Param('id') id: string,
    @Body(new ValidationPipe()) cancelDto: CancelAppointmentDto,
    @Request() req: any,
  ) {
    try {
      const appointment = await this.appointmentService.cancelAppointment(
        id,
        cancelDto,
        req.user?.userId,
      );
      return {
        success: true,
        message: {
          ar: 'تم إلغاء الموعد بنجاح',
          en: 'Appointment cancelled successfully',
        },
        data: appointment,
      };
    } catch (error) {
      return {
        success: false,
        message: {
          ar: 'فشل إلغاء الموعد',
          en: 'Failed to cancel appointment',
        },
        error: error.message,
      };
    }
  }

  /**
   * Confirm appointment
   * POST /appointments/:id/confirm
   */
  @ApiOperation({
    summary: 'Confirm appointment',
    description:
      'Confirms a scheduled appointment by updating its status to "confirmed". Only scheduled appointments can be confirmed. Optionally sends confirmation email and reminder SMS to the patient. Records confirmation notes for audit trail.',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment confirmed successfully',
    schema: {
      example: SWAGGER_EXAMPLES.CONFIRM_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Only scheduled appointments can be confirmed',
    schema: {
      example: SWAGGER_EXAMPLES.INVALID_STATUS_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: SWAGGER_EXAMPLES.UNAUTHORIZED_ERROR,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Appointment does not exist',
    schema: {
      example: SWAGGER_EXAMPLES.NOT_FOUND_ERROR,
    },
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Appointment ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({ type: ConfirmAppointmentDto })
  @Post(':id/confirm')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async confirmAppointment(
    @Param('id') id: string,
    @Body(new ValidationPipe()) confirmDto: ConfirmAppointmentDto,
    @Request() req: any,
  ) {
    try {
      const appointment = await this.appointmentService.confirmAppointment(
        id,
        confirmDto,
        req.user?.userId,
      );
      return {
        success: true,
        message: {
          ar: 'تم تأكيد الموعد بنجاح',
          en: 'Appointment confirmed successfully',
        },
        data: appointment,
      };
    } catch (error) {
      return {
        success: false,
        message: {
          ar: 'فشل تأكيد الموعد',
          en: 'Failed to confirm appointment',
        },
        error: error.message,
      };
    }
  }

  // =========================================================================
  // M6 – PATCH /appointments/:id/status  (UC-6b5a4c3)
  // =========================================================================
  @ApiOperation({
    summary: 'Change appointment status',
    description:
      'Changes the appointment status with business-rule validation. Completed and cancelled are final states. Cancelled requires reason, completed requires notes, rescheduled requires new date/time.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Appointment ID', example: '507f1f77bcf86cd799439011' })
  @ApiBody({ type: ChangeAppointmentStatusDto })
  @ApiResponse({ status: 200, description: 'Status changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid transition or missing required fields' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  @UseGuards(RoleScopeGuard) // UC-6b5a4c3 & UC-6b5a4c9: Apply role-based filtering
  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.DOCTOR, UserRole.STAFF)
  async changeAppointmentStatus(
    @Param('id') id: string,
    @Body(new ValidationPipe()) changeStatusDto: ChangeAppointmentStatusDto,
    @Request() req: any, // UC-6b5a4c3 & UC-6b5a4c9: Get user for role-based access
  ) {
    const appointment = await this.appointmentService.changeAppointmentStatus(
      id,
      changeStatusDto,
      req.user?.userId,
      req.user?.role,
    );
    return {
      success: true,
      message: {
        ar: 'تم تحديث حالة الموعد بنجاح',
        en: 'Appointment status updated successfully',
      },
      data: appointment,
    };
  }

  // =========================================================================
  // M6 – POST /appointments/:id/start  (UC-9a8c7b6)
  // =========================================================================
  @ApiOperation({
    summary: 'Start appointment',
    description:
      'Marks a scheduled/confirmed appointment as in progress. Records the actual start time and the user who started it. Returns a redirect URL to the medical entry form.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Appointment ID', example: '507f1f77bcf86cd799439011' })
  @ApiBody({ type: StartAppointmentDto, required: false })
  @ApiResponse({ status: 200, description: 'Appointment started – returns appointment + redirectTo URL' })
  @ApiResponse({ status: 400, description: 'Appointment is not in scheduled/confirmed status' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  @Post(':id/start')
  @UseGuards(JwtAuthGuard, RolesGuard, RoleScopeGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.DOCTOR, UserRole.STAFF)
  async startAppointment(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const result = await this.appointmentService.startAppointment(id, req.user?.userId);
    return {
      success: true,
      message: {
        ar: 'تم بدء الموعد بنجاح',
        en: 'Appointment started successfully',
      },
      data: result.appointment,
      redirectTo: result.redirectTo,
    };
  }

  // =========================================================================
  // M6 – POST /appointments/:id/end  (UC-b4c3a2d)
  // =========================================================================
  @ApiOperation({
    summary: 'End appointment',
    description:
      'Completes an in-progress appointment and saves medical entry data (session notes, prescriptions, treatment plan, follow-up). Records actual end time.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Appointment ID', example: '507f1f77bcf86cd799439011' })
  @ApiBody({ type: EndAppointmentDto })
  @ApiResponse({ status: 200, description: 'Appointment ended – status set to completed' })
  @ApiResponse({ status: 400, description: 'Appointment is not in_progress' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  @Post(':id/end')
  @UseGuards(JwtAuthGuard, RolesGuard, RoleScopeGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.DOCTOR)
  async endAppointment(
    @Param('id') id: string,
    @Body(new ValidationPipe()) endDto: EndAppointmentDto,
    @Request() req: any,
  ) {
    const appointment = await this.appointmentService.endAppointment(id, endDto, req.user?.userId);
    return {
      success: true,
      message: {
        ar: 'تم إنهاء الموعد بنجاح',
        en: 'Appointment ended successfully',
      },
      data: appointment,
    };
  }

  // =========================================================================
  // M6 – POST /appointments/:id/conclude  (UC-f1d3e2c)
  // =========================================================================
  @ApiOperation({
    summary: 'Conclude appointment',
    description:
      'Comprehensively concludes an in-progress appointment. Requires doctorNotes (BR-f1d3e2c). Saves diagnosis, prescriptions, treatment plan, and schedules follow-up reminders if needed.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Appointment ID', example: '507f1f77bcf86cd799439011' })
  @ApiBody({ type: ConcludeAppointmentDto })
  @ApiResponse({ status: 200, description: 'Appointment concluded – status set to completed' })
  @ApiResponse({ status: 400, description: 'doctorNotes missing or appointment not in_progress' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  @UseGuards(RoleScopeGuard)
  @Post(':id/conclude')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.DOCTOR)
  async concludeAppointment(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true, transformOptions: { enableImplicitConversion: true } })) concludeDto: ConcludeAppointmentDto,
    @Request() req: any,
  ) {
    try {
      const userId = req.user?.id || req.user?.userId || req.user?.sub;
      const appointment = await this.appointmentService.concludeAppointment(
        id,
        concludeDto,
        userId,
        req.user?.role,
      );
      return {
        success: true,
        message: {
          ar: 'تم إتمام الموعد بنجاح',
          en: 'Appointment concluded successfully',
        },
        data: appointment,
      };
    } catch (error) {
      throw error;
    }
  }


  /**
   * Get doctor availability for a specific date
   * GET /appointments/availability/:doctorId?date=YYYY-MM-DD
   */
  @ApiOperation({
    summary: 'Get doctor availability',
    description:
      'Retrieves available time slots for a doctor on a specific date. Shows working hours, breaks, and which time slots are already booked. Useful for appointment scheduling UI to display available times. Returns 30-minute time slots by default.',
  })
  @ApiResponse({
    status: 200,
    description: 'Doctor availability retrieved successfully',
    schema: {
      example: SWAGGER_EXAMPLES.AVAILABILITY_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Date parameter is required',
    schema: {
      example: SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: SWAGGER_EXAMPLES.UNAUTHORIZED_ERROR,
    },
  })
  @ApiParam({
    name: 'doctorId',
    type: String,
    description: 'Doctor ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439013',
  })
  @ApiQuery({
    name: 'date',
    required: true,
    type: String,
    description: 'Date to check availability (YYYY-MM-DD)',
    example: '2026-02-15',
  })
  @ApiQuery({
    name: 'clinicId',
    required: false,
    type: String,
    description: 'Filter by specific clinic',
  })
  @ApiQuery({
    name: 'durationMinutes',
    required: false,
    type: Number,
    description: 'Appointment duration in minutes (default: 30)',
    example: 30,
  })
  @ApiQuery({
    name: 'sessionId',
    required: false,
    type: String,
    description: 'Session ID — when provided, availability is calculated using the session-specific duration',
    example: '507f1f77bcf86cd799439015',
  })
  @Get('availability/:doctorId')
  async getDoctorAvailability(
    @Param('doctorId') doctorId: string,
    @Query('date') date: string,
    @Query('clinicId') clinicId?: string,
    @Query('durationMinutes', new ParseIntPipe({ optional: true }))
    durationMinutes?: number,
    @Query('sessionId') sessionId?: string,
  ) {
    try {
      if (!date) {
        throw new BadRequestException('Date parameter is required');
      }

      const availabilityQuery: AppointmentAvailabilityQueryDto & { sessionId?: string } = {
        doctorId,
        date,
        clinicId,
        durationMinutes,
        sessionId,
      };

      const availability =
        await this.appointmentService.getDoctorAvailability(availabilityQuery);
      return {
        success: true,
        message: {
          ar: 'تم استرجاع توفر الطبيب بنجاح',
          en: 'Doctor availability retrieved successfully',
        },
        data: availability,
      };
    } catch (error) {
      return {
        success: false,
        message: {
          ar: 'فشل استرجاع توفر الطبيب',
          en: 'Failed to retrieve doctor availability',
        },
        error: error.message,
      };
    }
  }

  /**
   * Get today's appointments
   * GET /appointments/today
   */
  @Get('schedule/today')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.DOCTOR, UserRole.STAFF)
  async getTodayAppointments(@Request() req: any) {
    try {
      const appointments = await this.appointmentService.getTodayAppointments(
        req.user?.userId,
        req.user?.role,
        req.user?.clinicId,
        req.user?.subscriptionId,
        req.user?.complexId,
      );
      return {
        success: true,
        message: "Today's appointments retrieved successfully",
        data: appointments,
        count: appointments.length,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve today's appointments",
        error: error.message,
      };
    }
  }

  /**
   * Get upcoming appointments (next 7 days)
   * GET /appointments/upcoming?limit=20
   */
  @Get('schedule/upcoming')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.DOCTOR, UserRole.STAFF)
  async getUpcomingAppointments(
    @Request() req: any,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    try {
      const appointments =
        await this.appointmentService.getUpcomingAppointments(
          limit || 20,
          req.user?.userId,
          req.user?.role,
          req.user?.clinicId,
          req.user?.subscriptionId,
          req.user?.complexId,
        );
      return {
        success: true,
        message: 'Upcoming appointments retrieved successfully',
        data: appointments,
        count: appointments.length,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve upcoming appointments',
        error: error.message,
      };
    }
  }

  /**
   * Get appointments for a specific patient
   * GET /appointments/patient/:patientId
   */
  @Get('patient/:patientId')
  async getPatientAppointments(@Param('patientId') patientId: string) {
    try {
      const appointments =
        await this.appointmentService.getPatientAppointments(patientId);
      return {
        success: true,
        message: 'Patient appointments retrieved successfully',
        data: appointments,
        count: appointments.length,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve patient appointments',
        error: error.message,
      };
    }
  }

  /**
   * Get appointments for a specific doctor
   * GET /appointments/doctor/:doctorId?date=YYYY-MM-DD
   */
  @Get('doctor/:doctorId')
  async getDoctorAppointments(
    @Param('doctorId') doctorId: string,
    @Query('date') date?: string,
  ) {
    try {
      const appointments = await this.appointmentService.getDoctorAppointments(
        doctorId,
        date,
      );
      return {
        success: true,
        message: 'Doctor appointments retrieved successfully',
        data: appointments,
        count: appointments.length,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve doctor appointments',
        error: error.message,
      };
    }
  }

  /**
   * Get appointments for a specific clinic
   * GET /appointments/clinic/:clinicId
   */
  @Get('clinic/:clinicId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.DOCTOR, UserRole.STAFF)
  async getClinicAppointments(
    @Param('clinicId') clinicId: string,
    @Request() req: any,
    @Query('date') date?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const query: AppointmentSearchQueryDto = {
        clinicId,
        appointmentDate: date,
        page: page || '1',
        limit: limit || '10',
      };

      const result = await this.appointmentService.getAppointments(
        query,
        req.user?.userId,
        req.user?.role,
        req.user?.clinicId,
        req.user?.subscriptionId,
        req.user?.complexId,
      );
      return {
        success: true,
        message: 'Clinic appointments retrieved successfully',
        data: result.appointments,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit: parseInt(limit || '10'),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve clinic appointments',
        error: error.message,
      };
    }
  }

  /**
   * Get appointment statistics
   * GET /appointments/stats/overview
   */
  @ApiOperation({
    summary: 'Get appointment statistics',
    description:
      "Retrieves comprehensive appointment statistics including total counts by status, today's appointments, upcoming appointments, average duration, top services, top doctors, and urgency level distribution. Useful for dashboard and reporting.",
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment statistics retrieved successfully',
    schema: {
      example: SWAGGER_EXAMPLES.STATS_SUCCESS,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: SWAGGER_EXAMPLES.UNAUTHORIZED_ERROR,
    },
  })
  @Get('stats/overview')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN)
  async getAppointmentStats(@Request() req: any) {
    try {
      const stats = await this.appointmentService.getAppointmentStats(
        req.user?.userId,
        req.user?.role,
        req.user?.clinicId,
        req.user?.subscriptionId,
        req.user?.complexId,
      );
      return {
        success: true,
        message: 'Appointment statistics retrieved successfully',
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve appointment statistics',
        error: error.message,
      };
    }
  }

  /**
   * Search appointments
   * GET /appointments/search/query?q=searchTerm
   */
  @Get('search/query')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.DOCTOR, UserRole.STAFF)
  async searchAppointments(
    @Query('q') searchTerm: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        throw new BadRequestException('Search term is required');
      }

      const query: AppointmentSearchQueryDto = {
        search: searchTerm,
        page: page || '1',
        limit: limit || '20',
      };

      const result = await this.appointmentService.getAppointments(
        query,
        req?.user?.userId,
        req?.user?.role,
        req?.user?.clinicId,
        req?.user?.subscriptionId,
        req?.user?.complexId,
      );
      return {
        success: true,
        message: 'Search completed successfully',
        data: result.appointments,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Search failed',
        error: error.message,
      };
    }
  }

  /**
   * Check for appointment conflicts
   * POST /appointments/check-conflicts
   */
  @ApiOperation({
    summary: 'Check appointment conflicts',
    description:
      'Checks if a proposed appointment time conflicts with existing appointments for the doctor or patient. Returns conflict details including conflict type (doctor_busy, patient_busy) and conflicting appointment IDs. Use before creating or rescheduling appointments.',
  })
  @ApiResponse({
    status: 200,
    description: 'Conflict check completed',
    schema: {
      example: SWAGGER_EXAMPLES.CONFLICT_CHECK_SUCCESS,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: SWAGGER_EXAMPLES.UNAUTHORIZED_ERROR,
    },
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        patientId: {
          type: 'string',
          description: 'Patient ID',
          example: '507f1f77bcf86cd799439012',
        },
        doctorId: {
          type: 'string',
          description: 'Doctor ID',
          example: '507f1f77bcf86cd799439013',
        },
        appointmentDate: {
          type: 'string',
          description: 'Appointment date (YYYY-MM-DD)',
          example: '2026-02-15',
        },
        appointmentTime: {
          type: 'string',
          description: 'Appointment time (HH:mm)',
          example: '14:30',
        },
        durationMinutes: {
          type: 'number',
          description: 'Duration in minutes (default: 30)',
          example: 30,
        },
        excludeAppointmentId: {
          type: 'string',
          description:
            'Exclude this appointment from conflict check (for rescheduling)',
          example: '507f1f77bcf86cd799439011',
        },
      },
      required: ['patientId', 'doctorId', 'appointmentDate', 'appointmentTime'],
    },
  })
  @Post('check-conflicts')
  async checkConflicts(
    @Body()
    conflictQuery: {
      patientId: string;
      doctorId: string;
      appointmentDate: string;
      appointmentTime: string;
      durationMinutes?: number;
      excludeAppointmentId?: string;
    },
  ) {
    try {
      const conflicts = await this.appointmentService.checkAppointmentConflicts(
        conflictQuery.patientId,
        conflictQuery.doctorId,
        conflictQuery.appointmentDate,
        conflictQuery.appointmentTime,
        conflictQuery.durationMinutes || 30,
        conflictQuery.excludeAppointmentId,
      );

      return {
        success: true,
        message: 'Conflict check completed',
        data: {
          hasConflicts: conflicts.length > 0,
          conflicts: conflicts,
          conflictCount: conflicts.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Conflict check failed',
        error: error.message,
      };
    }
  }

  /**
   * Get appointments by status
   * GET /appointments/status/:status
   */
  @Get('status/:status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.DOCTOR, UserRole.STAFF)
  async getAppointmentsByStatus(
    @Param('status') status: string,
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const validStatuses = [
        'scheduled',
        'confirmed',
        'in_progress',
        'completed',
        'cancelled',
        'no_show',
      ];
      if (!validStatuses.includes(status)) {
        throw new BadRequestException(
          `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        );
      }

      const query: AppointmentSearchQueryDto = {
        status,
        page: page || '1',
        limit: limit || '10',
      };

      const result = await this.appointmentService.getAppointments(
        query,
        req.user?.userId,
        req.user?.role,
        req.user?.clinicId,
        req.user?.subscriptionId,
        req.user?.complexId,
      );
      return {
        success: true,
        message: `Appointments with status '${status}' retrieved successfully`,
        data: result.appointments,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve appointments by status',
        error: error.message,
      };
    }
  }

  /**
   * Get appointments by date range
   * GET /appointments/date-range?from=YYYY-MM-DD&to=YYYY-MM-DD
   */
  @Get('reports/date-range')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.DOCTOR, UserRole.STAFF)
  async getAppointmentsByDateRange(
    @Query('from') dateFrom: string,
    @Query('to') dateTo: string,
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      if (!dateFrom || !dateTo) {
        throw new BadRequestException(
          'Both from and to date parameters are required',
        );
      }

      const query: AppointmentSearchQueryDto = {
        dateFrom,
        dateTo,
        page: page || '1',
        limit: limit || '20',
      };

      const result = await this.appointmentService.getAppointments(
        query,
        req.user?.userId,
        req.user?.role,
        req.user?.clinicId,
        req.user?.subscriptionId,
        req.user?.complexId,
      );
      return {
        success: true,
        message: 'Appointments in date range retrieved successfully',
        data: result.appointments,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
        },
        dateRange: {
          from: dateFrom,
          to: dateTo,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve appointments by date range',
        error: error.message,
      };
    }
  }

  /**
   * Get appointments by urgency level
   * GET /appointments/urgency/:urgencyLevel
   */
  @Get('urgency/:urgencyLevel')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.DOCTOR, UserRole.STAFF)
  async getAppointmentsByUrgency(
    @Param('urgencyLevel') urgencyLevel: string,
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const validUrgencyLevels = ['low', 'medium', 'high', 'urgent'];
      if (!validUrgencyLevels.includes(urgencyLevel)) {
        throw new BadRequestException(
          `Invalid urgency level. Must be one of: ${validUrgencyLevels.join(', ')}`,
        );
      }

      const query: AppointmentSearchQueryDto = {
        urgencyLevel,
        page: page || '1',
        limit: limit || '10',
      };

      const result = await this.appointmentService.getAppointments(
        query,
        req.user?.userId,
        req.user?.role,
        req.user?.clinicId,
        req.user?.subscriptionId,
        req.user?.complexId,
      );
      return {
        success: true,
        message: `Appointments with urgency level '${urgencyLevel}' retrieved successfully`,
        data: result.appointments,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve appointments by urgency',
        error: error.message,
      };
    }
  }

  /**
   * Send manual reminder for appointment
   * Requirements: UC-405a92ak
   */
  @Post(':id/reminder')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  @ApiOperation({
    summary: 'Send manual reminder',
    description: 'Triggers a manual reminder notification (SMS/Email) to the patient for an upcoming appointment.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Appointment ID' })
  @ApiResponse({ status: 200, description: 'Reminder sent successfully' })
  async sendManualReminder(@Param('id') id: string, @Request() req: any) {
    try {
      await this.appointmentService.sendManualReminder(id, req.user?.userId);
      return {
        success: true,
        message: {
          ar: 'تم إرسال التذكير بنجاح',
          en: 'Reminder sent successfully',
        },
      };
    } catch (error) {
      return {
        success: false,
        message: {
          ar: 'فشل إرسال التذكير',
          en: 'Failed to send reminder',
        },
        error: error.message,
      };
    }
  }
}
