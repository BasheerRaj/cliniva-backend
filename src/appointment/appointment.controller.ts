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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
  ChangeStatusDto,
  StartAppointmentDto,
  EndAppointmentDto,
  ConcludeAppointmentDto,
  CalendarQueryDto,
} from './dto';
import { SWAGGER_EXAMPLES } from './constants/swagger-examples';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';


@ApiTags('Appointments')
@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) { }

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
  @ApiBody({ type: CreateAppointmentDto })
  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.DOCTOR, UserRole.STAFF)
  async createAppointment(
    @Body(new ValidationPipe()) createAppointmentDto: CreateAppointmentDto,
    @Request() req: any,
  ) {
    try {
      const appointment = await this.appointmentService.createAppointment(
        createAppointmentDto,
        req.user?.userId,
      );
      return {
        success: true,
        message: 'Appointment created successfully',
        data: appointment,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create appointment',
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
  @Get()
  async getAppointments(
    @Query(new ValidationPipe()) query: AppointmentSearchQueryDto,
  ) {
    try {
      const result = await this.appointmentService.getAppointments(query);
      return {
        success: true,
        message: 'Appointments retrieved successfully',
        data: result.appointments,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit: parseInt(query.limit || '10'),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve appointments',
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
  @Get(':id')
  async getAppointment(@Param('id') id: string) {
    try {
      const appointment = await this.appointmentService.getAppointmentById(id);
      return {
        success: true,
        message: 'Appointment retrieved successfully',
        data: appointment,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve appointment',
        error: error.message,
      };
    }
  }

  // =========================================================================
  // M6 – GET /appointments/calendar  (UC-d2e3f4c)
  // Must be declared BEFORE ':id' routes
  // =========================================================================
  @ApiOperation({
    summary: 'Get appointments calendar',
    description:
      'Returns appointments grouped by date for calendar views. Supports day, week, and month views with optional filtering by clinic, doctor, and status.',
  })
  @ApiQuery({ name: 'view', required: false, enum: ['day', 'week', 'month'], description: 'Calendar view mode (default: week)' })
  @ApiQuery({ name: 'date', required: false, type: String, description: 'Anchor date YYYY-MM-DD (default: today)' })
  @ApiQuery({ name: 'clinicId', required: false, type: String })
  @ApiQuery({ name: 'doctorId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'] })
  @ApiResponse({ status: 200, description: 'Calendar data retrieved successfully' })
  @Get('calendar')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.DOCTOR, UserRole.STAFF)
  async getAppointmentsCalendar(
    @Query(new ValidationPipe({ transform: true })) query: CalendarQueryDto,
  ) {
    try {
      const result = await this.appointmentService.getAppointmentsCalendar(query);
      return {
        success: true,
        message: 'Calendar retrieved successfully',
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve calendar',
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
  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async updateAppointment(
    @Param('id') id: string,
    @Body(new ValidationPipe()) updateAppointmentDto: UpdateAppointmentDto,
    @Request() req: any,
  ) {
    try {
      const appointment = await this.appointmentService.updateAppointment(
        id,
        updateAppointmentDto,
        req.user?.userId,
      );
      return {
        success: true,
        message: 'Appointment updated successfully',
        data: appointment,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update appointment',
        error: error.message,
      };
    }
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
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteAppointment(@Param('id') id: string, @Request() req: any) {
    try {
      await this.appointmentService.deleteAppointment(id, req.user?.userId);
      return {
        success: true,
        message: 'Appointment deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to delete appointment',
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
        message: 'Appointment rescheduled successfully',
        data: appointment,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to reschedule appointment',
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
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.DOCTOR, UserRole.STAFF)
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
        message: 'Appointment cancelled successfully',
        data: appointment,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to cancel appointment',
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
        message: 'Appointment confirmed successfully',
        data: appointment,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to confirm appointment',
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
  @ApiBody({ type: ChangeStatusDto })
  @ApiResponse({ status: 200, description: 'Status changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid transition or missing required fields' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.DOCTOR, UserRole.STAFF)
  async changeAppointmentStatus(
    @Param('id') id: string,
    @Body(new ValidationPipe()) changeStatusDto: ChangeStatusDto,
    @Request() req: any,
  ) {
    try {
      const appointment = await this.appointmentService.changeAppointmentStatus(
        id,
        changeStatusDto,
        req.user?.userId,
      );
      return {
        success: true,
        message: 'Appointment status updated successfully',
        data: appointment,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update appointment status',
        error: error.message,
      };
    }
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
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.DOCTOR, UserRole.STAFF)
  async startAppointment(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    try {
      const result = await this.appointmentService.startAppointment(id, req.user?.userId);
      return {
        success: true,
        message: 'Appointment started successfully',
        data: result.appointment,
        redirectTo: result.redirectTo,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to start appointment',
        error: error.message,
      };
    }
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
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.DOCTOR)
  async endAppointment(
    @Param('id') id: string,
    @Body(new ValidationPipe()) endDto: EndAppointmentDto,
    @Request() req: any,
  ) {
    try {
      const appointment = await this.appointmentService.endAppointment(id, endDto, req.user?.userId);
      return {
        success: true,
        message: 'Appointment ended successfully',
        data: appointment,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to end appointment',
        error: error.message,
      };
    }
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
  @Post(':id/conclude')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.DOCTOR)
  async concludeAppointment(
    @Param('id') id: string,
    @Body(new ValidationPipe()) concludeDto: ConcludeAppointmentDto,
    @Request() req: any,
  ) {
    try {
      const appointment = await this.appointmentService.concludeAppointment(id, concludeDto, req.user?.userId);
      return {
        success: true,
        message: 'Appointment concluded successfully',
        data: appointment,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to conclude appointment',
        error: error.message,
      };
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
  @Get('availability/:doctorId')
  async getDoctorAvailability(
    @Param('doctorId') doctorId: string,
    @Query('date') date: string,
    @Query('clinicId') clinicId?: string,
    @Query('durationMinutes', new ParseIntPipe({ optional: true }))
    durationMinutes?: number,
  ) {
    try {
      if (!date) {
        throw new BadRequestException('Date parameter is required');
      }

      const availabilityQuery: AppointmentAvailabilityQueryDto = {
        doctorId,
        date,
        clinicId,
        durationMinutes,
      };

      const availability =
        await this.appointmentService.getDoctorAvailability(availabilityQuery);
      return {
        success: true,
        message: 'Doctor availability retrieved successfully',
        data: availability,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve doctor availability',
        error: error.message,
      };
    }
  }

  /**
   * Get today's appointments
   * GET /appointments/today
   */
  @Get('schedule/today')
  async getTodayAppointments() {
    try {
      const appointments = await this.appointmentService.getTodayAppointments();
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
  async getUpcomingAppointments(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    try {
      const appointments =
        await this.appointmentService.getUpcomingAppointments(limit || 20);
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
  async getClinicAppointments(
    @Param('clinicId') clinicId: string,
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

      const result = await this.appointmentService.getAppointments(query);
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
  async getAppointmentStats() {
    try {
      const stats = await this.appointmentService.getAppointmentStats();
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
  async searchAppointments(
    @Query('q') searchTerm: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
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

      const result = await this.appointmentService.getAppointments(query);
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
  async getAppointmentsByStatus(
    @Param('status') status: string,
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

      const result = await this.appointmentService.getAppointments(query);
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
  async getAppointmentsByDateRange(
    @Query('from') dateFrom: string,
    @Query('to') dateTo: string,
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

      const result = await this.appointmentService.getAppointments(query);
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
  async getAppointmentsByUrgency(
    @Param('urgencyLevel') urgencyLevel: string,
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

      const result = await this.appointmentService.getAppointments(query);
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
}
