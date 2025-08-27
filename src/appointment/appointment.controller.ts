import {
  Controller,
  Post,
  Get,
  Body,
  Param,
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
} from './dto';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  /**
   * Create a new appointment
   * POST /appointments
   */
  @Post()
  async createAppointment(
    @Body(new ValidationPipe()) createAppointmentDto: CreateAppointmentDto,
    @Request() req: any
  ) {
    try {
      const appointment = await this.appointmentService.createAppointment(
        createAppointmentDto,
        req.user?.userId
      );
      return {
        success: true,
        message: 'Appointment created successfully',
        data: appointment
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create appointment',
        error: error.message
      };
    }
  }

  /**
   * Get all appointments with filtering and pagination
   * GET /appointments
   */
  @Get()
  async getAppointments(@Query(new ValidationPipe()) query: AppointmentSearchQueryDto) {
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
          limit: parseInt(query.limit || '10')
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve appointments',
        error: error.message
      };
    }
  }

  /**
   * Get appointment by ID
   * GET /appointments/:id
   */
  @Get(':id')
  async getAppointment(@Param('id') id: string) {
    try {
      const appointment = await this.appointmentService.getAppointmentById(id);
      return {
        success: true,
        message: 'Appointment retrieved successfully',
        data: appointment
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve appointment',
        error: error.message
      };
    }
  }

  /**
   * Update appointment information
   * PUT /appointments/:id
   */
  @Put(':id')
  async updateAppointment(
    @Param('id') id: string,
    @Body(new ValidationPipe()) updateAppointmentDto: UpdateAppointmentDto,
    @Request() req: any
  ) {
    try {
      const appointment = await this.appointmentService.updateAppointment(
        id,
        updateAppointmentDto,
        req.user?.userId
      );
      return {
        success: true,
        message: 'Appointment updated successfully',
        data: appointment
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update appointment',
        error: error.message
      };
    }
  }

  /**
   * Soft delete appointment
   * DELETE /appointments/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteAppointment(@Param('id') id: string, @Request() req: any) {
    try {
      await this.appointmentService.deleteAppointment(id, req.user?.userId);
      return {
        success: true,
        message: 'Appointment deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to delete appointment',
        error: error.message
      };
    }
  }

  /**
   * Reschedule appointment
   * POST /appointments/:id/reschedule
   */
  @Post(':id/reschedule')
  async rescheduleAppointment(
    @Param('id') id: string,
    @Body(new ValidationPipe()) rescheduleDto: RescheduleAppointmentDto,
    @Request() req: any
  ) {
    try {
      const appointment = await this.appointmentService.rescheduleAppointment(
        id,
        rescheduleDto,
        req.user?.userId
      );
      return {
        success: true,
        message: 'Appointment rescheduled successfully',
        data: appointment
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to reschedule appointment',
        error: error.message
      };
    }
  }

  /**
   * Cancel appointment
   * POST /appointments/:id/cancel
   */
  @Post(':id/cancel')
  async cancelAppointment(
    @Param('id') id: string,
    @Body(new ValidationPipe()) cancelDto: CancelAppointmentDto,
    @Request() req: any
  ) {
    try {
      const appointment = await this.appointmentService.cancelAppointment(
        id,
        cancelDto,
        req.user?.userId
      );
      return {
        success: true,
        message: 'Appointment cancelled successfully',
        data: appointment
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to cancel appointment',
        error: error.message
      };
    }
  }

  /**
   * Confirm appointment
   * POST /appointments/:id/confirm
   */
  @Post(':id/confirm')
  async confirmAppointment(
    @Param('id') id: string,
    @Body(new ValidationPipe()) confirmDto: ConfirmAppointmentDto,
    @Request() req: any
  ) {
    try {
      const appointment = await this.appointmentService.confirmAppointment(
        id,
        confirmDto,
        req.user?.userId
      );
      return {
        success: true,
        message: 'Appointment confirmed successfully',
        data: appointment
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to confirm appointment',
        error: error.message
      };
    }
  }

  /**
   * Get doctor availability for a specific date
   * GET /appointments/availability/:doctorId?date=YYYY-MM-DD
   */
  @Get('availability/:doctorId')
  async getDoctorAvailability(
    @Param('doctorId') doctorId: string,
    @Query('date') date: string,
    @Query('clinicId') clinicId?: string,
    @Query('durationMinutes', new ParseIntPipe({ optional: true })) durationMinutes?: number
  ) {
    try {
      if (!date) {
        throw new BadRequestException('Date parameter is required');
      }

      const availabilityQuery: AppointmentAvailabilityQueryDto = {
        doctorId,
        date,
        clinicId,
        durationMinutes
      };

      const availability = await this.appointmentService.getDoctorAvailability(availabilityQuery);
      return {
        success: true,
        message: 'Doctor availability retrieved successfully',
        data: availability
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve doctor availability',
        error: error.message
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
        count: appointments.length
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve today's appointments",
        error: error.message
      };
    }
  }

  /**
   * Get upcoming appointments (next 7 days)
   * GET /appointments/upcoming?limit=20
   */
  @Get('schedule/upcoming')
  async getUpcomingAppointments(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number
  ) {
    try {
      const appointments = await this.appointmentService.getUpcomingAppointments(limit || 20);
      return {
        success: true,
        message: 'Upcoming appointments retrieved successfully',
        data: appointments,
        count: appointments.length
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve upcoming appointments',
        error: error.message
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
      const appointments = await this.appointmentService.getPatientAppointments(patientId);
      return {
        success: true,
        message: 'Patient appointments retrieved successfully',
        data: appointments,
        count: appointments.length
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve patient appointments',
        error: error.message
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
    @Query('date') date?: string
  ) {
    try {
      const appointments = await this.appointmentService.getDoctorAppointments(doctorId, date);
      return {
        success: true,
        message: 'Doctor appointments retrieved successfully',
        data: appointments,
        count: appointments.length
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve doctor appointments',
        error: error.message
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
    @Query('limit') limit?: string
  ) {
    try {
      const query: AppointmentSearchQueryDto = {
        clinicId,
        appointmentDate: date,
        page: page || '1',
        limit: limit || '10'
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
          limit: parseInt(limit || '10')
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve clinic appointments',
        error: error.message
      };
    }
  }

  /**
   * Get appointment statistics
   * GET /appointments/stats/overview
   */
  @Get('stats/overview')
  async getAppointmentStats() {
    try {
      const stats = await this.appointmentService.getAppointmentStats();
      return {
        success: true,
        message: 'Appointment statistics retrieved successfully',
        data: stats
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve appointment statistics',
        error: error.message
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
    @Query('limit') limit?: string
  ) {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        throw new BadRequestException('Search term is required');
      }

      const query: AppointmentSearchQueryDto = {
        search: searchTerm,
        page: page || '1',
        limit: limit || '20'
      };

      const result = await this.appointmentService.getAppointments(query);
      return {
        success: true,
        message: 'Search completed successfully',
        data: result.appointments,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Search failed',
        error: error.message
      };
    }
  }

  /**
   * Check for appointment conflicts
   * POST /appointments/check-conflicts
   */
  @Post('check-conflicts')
  async checkConflicts(
    @Body() conflictQuery: {
      patientId: string;
      doctorId: string;
      appointmentDate: string;
      appointmentTime: string;
      durationMinutes?: number;
      excludeAppointmentId?: string;
    }
  ) {
    try {
      const conflicts = await this.appointmentService.checkAppointmentConflicts(
        conflictQuery.patientId,
        conflictQuery.doctorId,
        conflictQuery.appointmentDate,
        conflictQuery.appointmentTime,
        conflictQuery.durationMinutes || 30,
        conflictQuery.excludeAppointmentId
      );

      return {
        success: true,
        message: 'Conflict check completed',
        data: {
          hasConflicts: conflicts.length > 0,
          conflicts: conflicts,
          conflictCount: conflicts.length
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Conflict check failed',
        error: error.message
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
    @Query('limit') limit?: string
  ) {
    try {
      const validStatuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];
      if (!validStatuses.includes(status)) {
        throw new BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      const query: AppointmentSearchQueryDto = {
        status,
        page: page || '1',
        limit: limit || '10'
      };

      const result = await this.appointmentService.getAppointments(query);
      return {
        success: true,
        message: `Appointments with status '${status}' retrieved successfully`,
        data: result.appointments,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve appointments by status',
        error: error.message
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
    @Query('limit') limit?: string
  ) {
    try {
      if (!dateFrom || !dateTo) {
        throw new BadRequestException('Both from and to date parameters are required');
      }

      const query: AppointmentSearchQueryDto = {
        dateFrom,
        dateTo,
        page: page || '1',
        limit: limit || '20'
      };

      const result = await this.appointmentService.getAppointments(query);
      return {
        success: true,
        message: 'Appointments in date range retrieved successfully',
        data: result.appointments,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages
        },
        dateRange: {
          from: dateFrom,
          to: dateTo
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve appointments by date range',
        error: error.message
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
    @Query('limit') limit?: string
  ) {
    try {
      const validUrgencyLevels = ['low', 'medium', 'high', 'urgent'];
      if (!validUrgencyLevels.includes(urgencyLevel)) {
        throw new BadRequestException(`Invalid urgency level. Must be one of: ${validUrgencyLevels.join(', ')}`);
      }

      const query: AppointmentSearchQueryDto = {
        urgencyLevel,
        page: page || '1',
        limit: limit || '10'
      };

      const result = await this.appointmentService.getAppointments(query);
      return {
        success: true,
        message: `Appointments with urgency level '${urgencyLevel}' retrieved successfully`,
        data: result.appointments,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve appointments by urgency',
        error: error.message
      };
    }
  }
} 