import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Appointment } from '../../database/schemas/appointment.schema';
import { CalendarQueryDto } from '../dto/calendar-query.dto';
import {
  CalendarData,
  DateRange,
  CalendarSummary,
  StatusCount,
} from '../dto/responses/calendar-response.dto';
import { AppointmentDataDto } from '../dto/responses/appointment-response.dto';
import { CalendarView } from '../constants/calendar-view.enum';

/**
 * Appointment Calendar Service
 * 
 * Handles calendar view generation for appointments
 * Tasks: 9.1, 9.2, 9.3, 9.4
 * Requirements: 5.1-5.8
 */
@Injectable()
export class AppointmentCalendarService {
  private readonly logger = new Logger(AppointmentCalendarService.name);

  constructor(
    @InjectModel('Appointment')
    private readonly appointmentModel: Model<Appointment>,
  ) {}

  /**
   * Task 9.4: Dispatcher method for calendar views
   * Requirements: 5.1-5.8
   * 
   * Routes to appropriate view method based on view parameter
   */
  async getCalendarView(query: CalendarQueryDto): Promise<CalendarData> {
    this.logger.log(`Getting calendar view: ${query.view}`);

    const view = query.view || CalendarView.WEEK;
    const date = query.date || new Date();

    switch (view) {
      case CalendarView.DAY:
        return this.getDayView(date, query);
      case CalendarView.WEEK:
        return this.getWeekView(date, query);
      case CalendarView.MONTH:
        return this.getMonthView(date, query);
      default:
        throw new BadRequestException({
          message: {
            ar: 'نوع العرض غير صالح. القيم المسموحة: day, week, month',
            en: 'Invalid view type. Allowed values: day, week, month',
          },
        });
    }
  }

  /**
   * Task 9.1: Get day view
   * Requirements: 5.1, 5.4, 5.5, 5.6, 5.7, 5.8
   * 
   * Shows all appointments for a specific date
   */
  async getDayView(
    date: Date,
    query: CalendarQueryDto,
  ): Promise<CalendarData> {
    this.logger.log(`Getting day view for date: ${date.toISOString()}`);

    // Calculate date range for the day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const dateRange: DateRange = {
      start: startOfDay,
      end: endOfDay,
    };

    // Build query filter
    const filter = this.buildFilter(query, startOfDay, endOfDay);

    // Fetch appointments with populated relationships
    const appointments = await this.appointmentModel
      .find(filter)
      .populate('patientId', 'firstName lastName phone email')
      .populate('doctorId', 'firstName lastName email')
      .populate('clinicId', 'name address')
      .populate('serviceId', 'name durationMinutes price')
      .populate('departmentId', 'name')
      .sort({ appointmentTime: 1 })
      .lean()
      .exec();

    // Group appointments by date
    const groupedAppointments = this.groupAppointmentsByDate(appointments);

    // Calculate summary statistics
    const summary = this.calculateSummary(appointments);

    return {
      view: CalendarView.DAY,
      dateRange,
      appointments: groupedAppointments,
      summary,
    };
  }

  /**
   * Task 9.2: Get week view
   * Requirements: 5.2, 5.4, 5.5, 5.6, 5.7, 5.8
   * 
   * Shows appointments grouped by day for a 7-day period
   */
  async getWeekView(
    date: Date,
    query: CalendarQueryDto,
  ): Promise<CalendarData> {
    this.logger.log(`Getting week view for date: ${date.toISOString()}`);

    // Calculate start and end of week (Sunday to Saturday)
    const startOfWeek = new Date(date);
    const dayOfWeek = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const dateRange: DateRange = {
      start: startOfWeek,
      end: endOfWeek,
    };

    // Build query filter
    const filter = this.buildFilter(query, startOfWeek, endOfWeek);

    // Fetch appointments with populated relationships
    const appointments = await this.appointmentModel
      .find(filter)
      .populate('patientId', 'firstName lastName phone email')
      .populate('doctorId', 'firstName lastName email')
      .populate('clinicId', 'name address')
      .populate('serviceId', 'name durationMinutes price')
      .populate('departmentId', 'name')
      .sort({ appointmentDate: 1, appointmentTime: 1 })
      .lean()
      .exec();

    // Group appointments by date
    const groupedAppointments = this.groupAppointmentsByDate(appointments);

    // Calculate summary statistics
    const summary = this.calculateSummary(appointments);

    return {
      view: CalendarView.WEEK,
      dateRange,
      appointments: groupedAppointments,
      summary,
    };
  }

  /**
   * Task 9.3: Get month view
   * Requirements: 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
   * 
   * Shows appointment counts per day for a calendar month
   */
  async getMonthView(
    date: Date,
    query: CalendarQueryDto,
  ): Promise<CalendarData> {
    this.logger.log(`Getting month view for date: ${date.toISOString()}`);

    // Calculate start and end of month
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    const dateRange: DateRange = {
      start: startOfMonth,
      end: endOfMonth,
    };

    // Build query filter
    const filter = this.buildFilter(query, startOfMonth, endOfMonth);

    // Fetch appointments with populated relationships
    const appointments = await this.appointmentModel
      .find(filter)
      .populate('patientId', 'firstName lastName phone email')
      .populate('doctorId', 'firstName lastName email')
      .populate('clinicId', 'name address')
      .populate('serviceId', 'name durationMinutes price')
      .populate('departmentId', 'name')
      .sort({ appointmentDate: 1, appointmentTime: 1 })
      .lean()
      .exec();

    // Group appointments by date
    const groupedAppointments = this.groupAppointmentsByDate(appointments);

    // Calculate summary statistics
    const summary = this.calculateSummary(appointments);

    return {
      view: CalendarView.MONTH,
      dateRange,
      appointments: groupedAppointments,
      summary,
    };
  }

  /**
   * Build query filter based on calendar query parameters
   * Requirements: 5.4, 5.5, 5.6, 5.8
   */
  private buildFilter(
    query: CalendarQueryDto,
    startDate: Date,
    endDate: Date,
  ): any {
    const filter: any = {
      // Requirement 5.8: Exclude soft-deleted appointments
      deletedAt: { $exists: false },
      // Date range filter
      appointmentDate: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    // Requirement 5.4: Filter by clinic if specified
    if (query.clinicId) {
      filter.clinicId = new Types.ObjectId(query.clinicId);
    }

    // Requirement 5.5: Filter by doctor if specified
    if (query.doctorId) {
      filter.doctorId = new Types.ObjectId(query.doctorId);
    }

    // Requirement 5.6: Filter by department if specified
    if (query.departmentId) {
      filter.departmentId = new Types.ObjectId(query.departmentId);
    }

    // Optional: Filter by status if specified
    if (query.status) {
      filter.status = query.status;
    }

    return filter;
  }

  /**
   * Group appointments by date
   * Requirement 5.7: Format data in calendar-friendly structure with date groupings
   */
  private groupAppointmentsByDate(
    appointments: any[],
  ): Record<string, AppointmentDataDto[]> {
    const grouped: Record<string, AppointmentDataDto[]> = {};

    for (const appointment of appointments) {
      // Format date as ISO date string (YYYY-MM-DD)
      const dateKey = new Date(appointment.appointmentDate)
        .toISOString()
        .split('T')[0];

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }

      // Transform to AppointmentDataDto format
      grouped[dateKey].push(this.transformToAppointmentData(appointment));
    }

    return grouped;
  }

  /**
   * Transform appointment document to AppointmentDataDto
   */
  private transformToAppointmentData(appointment: any): AppointmentDataDto {
    return {
      id: appointment._id.toString(),
      patient: (appointment.patientId
        ? {
            id: appointment.patientId._id?.toString() || appointment.patientId.toString(),
            name: appointment.patientId.firstName && appointment.patientId.lastName
              ? `${appointment.patientId.firstName} ${appointment.patientId.lastName}`
              : 'Unknown Patient',
            phone: appointment.patientId.phone || '',
            email: appointment.patientId.email || '',
          }
        : { id: '', name: 'Unknown', phone: '', email: '' }) as any,
      doctor: (appointment.doctorId
        ? {
            id: appointment.doctorId._id?.toString() || appointment.doctorId.toString(),
            name: appointment.doctorId.firstName && appointment.doctorId.lastName
              ? `${appointment.doctorId.firstName} ${appointment.doctorId.lastName}`
              : 'Unknown Doctor',
            email: appointment.doctorId.email || '',
          }
        : { id: '', name: 'Unknown', email: '' }) as any,
      service: (appointment.serviceId
        ? {
            id: appointment.serviceId._id?.toString() || appointment.serviceId.toString(),
            name: appointment.serviceId.name || 'Unknown Service',
            duration: appointment.serviceId.durationMinutes || appointment.durationMinutes || 30,
            price: appointment.serviceId.price,
          }
        : { id: '', name: 'Unknown', duration: 30, price: 0 }) as any,
      clinic: (appointment.clinicId
        ? {
            id: appointment.clinicId._id?.toString() || appointment.clinicId.toString(),
            name: appointment.clinicId.name || 'Unknown Clinic',
            address: appointment.clinicId.address,
          }
        : { id: '', name: 'Unknown' }) as any,
      department: appointment.departmentId
        ? {
            id: appointment.departmentId._id?.toString() || appointment.departmentId.toString(),
            name: appointment.departmentId.name || 'Unknown Department',
          }
        : undefined,
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime,
      duration: appointment.duration || 30,
      status: appointment.status,
      urgency: appointment.urgency,
      notes: appointment.notes,
      actualStartTime: appointment.actualStartTime,
      actualEndTime: appointment.actualEndTime,
      medicalReportId: appointment.medicalReportId?.toString(),
      isDocumented: appointment.isDocumented,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    };
  }

  /**
   * Calculate summary statistics for appointments
   */
  private calculateSummary(appointments: any[]): CalendarSummary {
    const statusCount: StatusCount = {
      scheduled: 0,
      confirmed: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
      no_show: 0,
    };

    for (const appointment of appointments) {
      const status = appointment.status;
      if (status in statusCount) {
        statusCount[status as keyof StatusCount]++;
      }
    }

    return {
      totalAppointments: appointments.length,
      byStatus: statusCount,
    };
  }
}
