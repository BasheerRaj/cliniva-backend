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
import { ScheduleService } from './schedule.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateScheduleDto,
  UpdateScheduleDto,
  ScheduleSearchQueryDto,
  CreateDoctorAvailabilityDto,
  CreateRoomBookingDto,
  CreateEquipmentScheduleDto,
  CheckScheduleConflictDto,
  GetAvailableTimeSlotsDto,
  BulkScheduleActionDto,
  CalendarViewDto,
  CreateScheduleTemplateDto,
} from './dto';

@Controller('schedules')
@UseGuards(JwtAuthGuard)
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  /**
   * Create a new schedule
   * POST /schedules
   */
  @Post()
  async createSchedule(
    @Body(new ValidationPipe()) createScheduleDto: CreateScheduleDto,
    @Request() req: any
  ) {
    try {
      const schedule = await this.scheduleService.createSchedule(
        createScheduleDto,
        req.user?.userId
      );
      return {
        success: true,
        message: 'Schedule created successfully',
        data: schedule
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create schedule',
        error: error.message
      };
    }
  }

  /**
   * Get all schedules with filtering and pagination
   * GET /schedules
   */
  @Get()
  async getSchedules(@Query(new ValidationPipe()) query: ScheduleSearchQueryDto) {
    try {
      const result = await this.scheduleService.getSchedules(query);
      return {
        success: true,
        message: 'Schedules retrieved successfully',
        data: result.schedules,
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
        message: 'Failed to retrieve schedules',
        error: error.message
      };
    }
  }

  /**
   * Get schedule by ID
   * GET /schedules/:id
   */
  @Get(':id')
  async getSchedule(@Param('id') id: string) {
    try {
      const schedule = await this.scheduleService.getScheduleById(id);
      return {
        success: true,
        message: 'Schedule retrieved successfully',
        data: schedule
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve schedule',
        error: error.message
      };
    }
  }

  /**
   * Update schedule
   * PUT /schedules/:id
   */
  @Put(':id')
  async updateSchedule(
    @Param('id') id: string,
    @Body(new ValidationPipe()) updateScheduleDto: UpdateScheduleDto,
    @Request() req: any
  ) {
    try {
      const schedule = await this.scheduleService.updateSchedule(
        id,
        updateScheduleDto,
        req.user?.userId
      );
      return {
        success: true,
        message: 'Schedule updated successfully',
        data: schedule
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update schedule',
        error: error.message
      };
    }
  }

  /**
   * Delete schedule
   * DELETE /schedules/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteSchedule(@Param('id') id: string, @Request() req: any) {
    try {
      await this.scheduleService.deleteSchedule(id, req.user?.userId);
      return {
        success: true,
        message: 'Schedule deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to delete schedule',
        error: error.message
      };
    }
  }

  /**
   * Create doctor availability schedule
   * POST /schedules/doctor-availability
   */
  @Post('doctor-availability')
  async createDoctorAvailability(
    @Body(new ValidationPipe()) createAvailabilityDto: CreateDoctorAvailabilityDto,
    @Request() req: any
  ) {
    try {
      const schedule = await this.scheduleService.createDoctorAvailability(
        createAvailabilityDto,
        req.user?.userId
      );
      return {
        success: true,
        message: 'Doctor availability created successfully',
        data: schedule
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create doctor availability',
        error: error.message
      };
    }
  }

  /**
   * Create room booking
   * POST /schedules/room-booking
   */
  @Post('room-booking')
  async createRoomBooking(
    @Body(new ValidationPipe()) createBookingDto: CreateRoomBookingDto,
    @Request() req: any
  ) {
    try {
      const schedule = await this.scheduleService.createRoomBooking(
        createBookingDto,
        req.user?.userId
      );
      return {
        success: true,
        message: 'Room booking created successfully',
        data: schedule
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create room booking',
        error: error.message
      };
    }
  }

  /**
   * Create equipment schedule
   * POST /schedules/equipment
   */
  @Post('equipment')
  async createEquipmentSchedule(
    @Body(new ValidationPipe()) createEquipmentDto: CreateEquipmentScheduleDto,
    @Request() req: any
  ) {
    try {
      const schedule = await this.scheduleService.createEquipmentSchedule(
        createEquipmentDto,
        req.user?.userId
      );
      return {
        success: true,
        message: 'Equipment schedule created successfully',
        data: schedule
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create equipment schedule',
        error: error.message
      };
    }
  }

  /**
   * Check for schedule conflicts
   * POST /schedules/check-conflicts
   */
  @Post('check-conflicts')
  async checkScheduleConflicts(
    @Body(new ValidationPipe()) conflictDto: CheckScheduleConflictDto
  ) {
    try {
      const result = await this.scheduleService.checkScheduleConflicts(conflictDto);
      return {
        success: true,
        message: 'Conflict check completed',
        data: {
          hasConflicts: result.hasConflicts,
          conflictCount: result.conflicts.length,
          conflicts: result.conflicts.map(conflict => ({
            id: conflict._id,
            title: conflict.title,
            scheduleType: conflict.scheduleType,
            startDate: conflict.startDate,
            endDate: conflict.endDate,
            startTime: conflict.startTime,
            endTime: conflict.endTime,
            user: conflict.userId
          }))
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
   * Get available time slots for a doctor
   * POST /schedules/available-slots
   */
  @Post('available-slots')
  async getAvailableTimeSlots(
    @Body(new ValidationPipe()) slotsDto: GetAvailableTimeSlotsDto
  ) {
    try {
      const result = await this.scheduleService.getAvailableTimeSlots(slotsDto);
      return {
        success: true,
        message: 'Available time slots retrieved successfully',
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve available time slots',
        error: error.message
      };
    }
  }

  /**
   * Get calendar view of schedules
   * POST /schedules/calendar-view
   */
  @Post('calendar-view')
  async getCalendarView(
    @Body(new ValidationPipe()) calendarDto: CalendarViewDto
  ) {
    try {
      const result = await this.scheduleService.getCalendarView(calendarDto);
      return {
        success: true,
        message: 'Calendar view retrieved successfully',
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve calendar view',
        error: error.message
      };
    }
  }

  /**
   * Get schedule statistics
   * GET /schedules/stats/overview
   */
  @Get('stats/overview')
  async getScheduleStats() {
    try {
      const stats = await this.scheduleService.getScheduleStats();
      return {
        success: true,
        message: 'Schedule statistics retrieved successfully',
        data: stats
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve schedule statistics',
        error: error.message
      };
    }
  }

  /**
   * Bulk schedule actions
   * POST /schedules/bulk-action
   */
  @Post('bulk-action')
  async bulkScheduleAction(
    @Body(new ValidationPipe()) bulkActionDto: BulkScheduleActionDto,
    @Request() req: any
  ) {
    try {
      const result = await this.scheduleService.bulkScheduleAction(
        bulkActionDto,
        req.user?.userId
      );
      return {
        success: true,
        message: 'Bulk action completed',
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: 'Bulk action failed',
        error: error.message
      };
    }
  }

  /**
   * Get schedules by type
   * GET /schedules/type/:scheduleType
   */
  @Get('type/:scheduleType')
  async getSchedulesByType(
    @Param('scheduleType') scheduleType: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      const query: ScheduleSearchQueryDto = {
        scheduleType,
        startDate,
        endDate,
        page: page || '1',
        limit: limit || '10'
      };

      const result = await this.scheduleService.getSchedules(query);
      return {
        success: true,
        message: `Schedules of type '${scheduleType}' retrieved successfully`,
        data: result.schedules,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve schedules by type',
        error: error.message
      };
    }
  }

  /**
   * Get doctor availability schedules
   * GET /schedules/doctor/:doctorId/availability
   */
  @Get('doctor/:doctorId/availability')
  async getDoctorAvailability(
    @Param('doctorId') doctorId: string,
    @Query('clinicId') clinicId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      const query: ScheduleSearchQueryDto = {
        scheduleType: 'doctor_availability',
        userId: doctorId,
        clinicId,
        startDate,
        endDate,
        isAvailable: true,
        status: 'active'
      };

      const result = await this.scheduleService.getSchedules(query);
      return {
        success: true,
        message: 'Doctor availability retrieved successfully',
        data: result.schedules,
        count: result.total
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
   * Get room bookings
   * GET /schedules/room/:roomId/bookings
   */
  @Get('room/:roomId/bookings')
  async getRoomBookings(
    @Param('roomId') roomId: string,
    @Query('clinicId') clinicId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      const query: ScheduleSearchQueryDto = {
        scheduleType: 'room_booking',
        roomId,
        clinicId,
        startDate,
        endDate,
        status: 'active'
      };

      const result = await this.scheduleService.getSchedules(query);
      return {
        success: true,
        message: 'Room bookings retrieved successfully',
        data: result.schedules,
        count: result.total
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve room bookings',
        error: error.message
      };
    }
  }

  /**
   * Get equipment schedules
   * GET /schedules/equipment/:equipmentId
   */
  @Get('equipment/:equipmentId')
  async getEquipmentSchedules(
    @Param('equipmentId') equipmentId: string,
    @Query('clinicId') clinicId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('scheduleType') scheduleSubType?: string
  ) {
    try {
      const query: ScheduleSearchQueryDto = {
        scheduleType: 'equipment_schedule',
        equipmentId,
        clinicId,
        startDate,
        endDate,
        status: 'active'
      };

      const result = await this.scheduleService.getSchedules(query);
      return {
        success: true,
        message: 'Equipment schedules retrieved successfully',
        data: result.schedules,
        count: result.total
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve equipment schedules',
        error: error.message
      };
    }
  }

  /**
   * Get schedules by clinic
   * GET /schedules/clinic/:clinicId
   */
  @Get('clinic/:clinicId')
  async getSchedulesByClinic(
    @Param('clinicId') clinicId: string,
    @Query('scheduleType') scheduleType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    try {
      const query: ScheduleSearchQueryDto = {
        clinicId,
        scheduleType,
        startDate,
        endDate,
        page: page || '1',
        limit: limit || '20'
      };

      const result = await this.scheduleService.getSchedules(query);
      return {
        success: true,
        message: 'Clinic schedules retrieved successfully',
        data: result.schedules,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve clinic schedules',
        error: error.message
      };
    }
  }

  /**
   * Get schedules by user (employee/doctor)
   * GET /schedules/user/:userId
   */
  @Get('user/:userId')
  async getSchedulesByUser(
    @Param('userId') userId: string,
    @Query('scheduleType') scheduleType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    try {
      const query: ScheduleSearchQueryDto = {
        userId,
        scheduleType,
        startDate,
        endDate,
        page: page || '1',
        limit: limit || '20'
      };

      const result = await this.scheduleService.getSchedules(query);
      return {
        success: true,
        message: 'User schedules retrieved successfully',
        data: result.schedules,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve user schedules',
        error: error.message
      };
    }
  }

  /**
   * Get today's schedules
   * GET /schedules/today/all
   */
  @Get('today/all')
  async getTodaySchedules(
    @Query('scheduleType') scheduleType?: string,
    @Query('clinicId') clinicId?: string,
    @Query('userId') userId?: string
  ) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const query: ScheduleSearchQueryDto = {
        scheduleType,
        clinicId,
        userId,
        startDate: today,
        endDate: today,
        status: 'active',
        limit: '100',
        sortBy: 'startTime',
        sortOrder: 'asc'
      };

      const result = await this.scheduleService.getSchedules(query);
      return {
        success: true,
        message: "Today's schedules retrieved successfully",
        data: result.schedules,
        count: result.total,
        date: today
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve today's schedules",
        error: error.message
      };
    }
  }

  /**
   * Get upcoming schedules (next 7 days)
   * GET /schedules/upcoming/week
   */
  @Get('upcoming/week')
  async getUpcomingSchedules(
    @Query('scheduleType') scheduleType?: string,
    @Query('clinicId') clinicId?: string,
    @Query('userId') userId?: string,
    @Query('days', new ParseIntPipe({ optional: true })) days?: number
  ) {
    try {
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(today.getDate() + (days || 7));

      const query: ScheduleSearchQueryDto = {
        scheduleType,
        clinicId,
        userId,
        startDate: today.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        status: 'active',
        limit: '100',
        sortBy: 'startDate',
        sortOrder: 'asc'
      };

      const result = await this.scheduleService.getSchedules(query);
      return {
        success: true,
        message: 'Upcoming schedules retrieved successfully',
        data: result.schedules,
        count: result.total,
        dateRange: {
          from: today.toISOString().split('T')[0],
          to: endDate.toISOString().split('T')[0],
          days: days || 7
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve upcoming schedules',
        error: error.message
      };
    }
  }

  /**
   * Get recurring schedules
   * GET /schedules/recurring/templates
   */
  @Get('recurring/templates')
  async getRecurringSchedules(
    @Query('scheduleType') scheduleType?: string,
    @Query('clinicId') clinicId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    try {
      const query: ScheduleSearchQueryDto = {
        scheduleType,
        clinicId,
        isRecurring: true,
        page: page || '1',
        limit: limit || '20'
      };

      const result = await this.scheduleService.getSchedules(query);
      return {
        success: true,
        message: 'Recurring schedule templates retrieved successfully',
        data: result.schedules,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve recurring schedules',
        error: error.message
      };
    }
  }

  /**
   * Get blocked time slots
   * GET /schedules/blocked/times
   */
  @Get('blocked/times')
  async getBlockedTimes(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('clinicId') clinicId?: string,
    @Query('userId') userId?: string
  ) {
    try {
      if (!startDate || !endDate) {
        throw new BadRequestException('Start date and end date are required');
      }

      const query: ScheduleSearchQueryDto = {
        scheduleType: 'block_time',
        startDate,
        endDate,
        clinicId,
        userId,
        isBlocked: true,
        status: 'active'
      };

      const result = await this.scheduleService.getSchedules(query);
      return {
        success: true,
        message: 'Blocked time slots retrieved successfully',
        data: result.schedules,
        count: result.total
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve blocked time slots',
        error: error.message
      };
    }
  }

  /**
   * Get schedule analytics by type
   * GET /schedules/analytics/types
   */
  @Get('analytics/types')
  async getScheduleTypeAnalytics() {
    try {
      const stats = await this.scheduleService.getScheduleStats();
      
      return {
        success: true,
        message: 'Schedule type analytics retrieved successfully',
        data: {
          schedulesByType: stats.schedulesByType,
          totalSchedules: stats.totalSchedules,
          analysisDate: new Date()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve schedule analytics',
        error: error.message
      };
    }
  }

  /**
   * Get schedule utilization analytics
   * GET /schedules/analytics/utilization
   */
  @Get('analytics/utilization')
  async getScheduleUtilization() {
    try {
      const stats = await this.scheduleService.getScheduleStats();
      
      return {
        success: true,
        message: 'Schedule utilization analytics retrieved successfully',
        data: {
          doctorUtilization: stats.doctorUtilization,
          roomUtilization: stats.roomUtilization,
          averageSlotDuration: stats.averageSlotDuration,
          analysisDate: new Date()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve utilization analytics',
        error: error.message
      };
    }
  }

  /**
   * Get schedule trends
   * GET /schedules/analytics/trends
   */
  @Get('analytics/trends')
  async getScheduleTrends() {
    try {
      const stats = await this.scheduleService.getScheduleStats();
      
      return {
        success: true,
        message: 'Schedule trends retrieved successfully',
        data: {
          monthlyTrend: stats.monthlyTrend,
          schedulesToday: stats.schedulesToday,
          schedulesThisWeek: stats.schedulesThisWeek,
          schedulesThisMonth: stats.schedulesThisMonth,
          analysisDate: new Date()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve schedule trends',
        error: error.message
      };
    }
  }

  /**
   * Get schedules requiring approval
   * GET /schedules/pending-approval
   */
  @Get('pending-approval')
  async getPendingApprovalSchedules(
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    try {
      // This would be implemented by filtering schedules with pending approval status
      return {
        success: true,
        message: 'Pending approval schedules retrieved successfully',
        data: [],
        count: 0,
        message_note: 'Approval workflow would be implemented here'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve pending approval schedules',
        error: error.message
      };
    }
  }

  /**
   * Search schedules
   * GET /schedules/search/query?q=searchTerm
   */
  @Get('search/query')
  async searchSchedules(
    @Query('q') searchTerm: string,
    @Query('scheduleType') scheduleType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number
  ) {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        throw new BadRequestException('Search term is required');
      }

      const query: ScheduleSearchQueryDto = {
        search: searchTerm,
        scheduleType,
        startDate,
        endDate,
        limit: (limit || 20).toString()
      };

      const result = await this.scheduleService.getSchedules(query);
      return {
        success: true,
        message: 'Search completed successfully',
        data: result.schedules,
        count: result.total
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
   * Export schedules
   * GET /schedules/export/data
   */
  @Get('export/data')
  async exportSchedules(
    @Query('format') format?: string,
    @Query() filters?: ScheduleSearchQueryDto
  ) {
    try {
      const result = await this.scheduleService.getSchedules({
        ...filters,
        limit: '1000' // Export more records
      });
      
      return {
        success: true,
        message: 'Schedule export prepared successfully',
        data: {
          schedules: result.schedules,
          totalExported: result.total,
          format: format || 'json',
          exportDate: new Date(),
          message: 'Export functionality would generate CSV/Excel file here'
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to export schedules',
        error: error.message
      };
    }
  }
} 