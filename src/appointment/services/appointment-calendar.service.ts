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
import {
  transformAppointment,
  TransformedAppointment,
} from '../utils/appointment-transformer.util';

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
   * Routes to appropriate view method based on view parameter.
   * @param userId  Authenticated user ID (for doctor scoping)
   * @param userRole Authenticated user role (doctor → own appointments only)
   */
  async getCalendarView(
    query: CalendarQueryDto,
    userId?: string,
    userRole?: string,
  ): Promise<CalendarData> {
    this.logger.log(`Getting calendar view: ${query.view}`);

    const view = query.view || CalendarView.WEEK;
    const date = query.date || new Date();

    switch (view) {
      case CalendarView.DAY:
        return this.getDayView(date, query, userId, userRole);
      case CalendarView.WEEK:
        return this.getWeekView(date, query, userId, userRole);
      case CalendarView.MONTH:
        return this.getMonthView(date, query, userId, userRole);
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
    userId?: string,
    userRole?: string,
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

    // Build query filter with doctor scoping
    const filter = this.buildFilter(query, startOfDay, endOfDay, userId, userRole);

    // Fetch appointments with populated relationships
    const appointments = await this.appointmentModel
      .find(filter)
      .populate('patientId', 'firstName lastName phone email profilePicture')
      .populate('doctorId', 'firstName lastName specialty email phone')
      .populate('clinicId', 'name')
      .populate('serviceId', 'name durationMinutes price description')
      .sort({ appointmentTime: 1 })
      .lean()
      .exec();

    // Transform and group by date
    const transformed = appointments.map(transformAppointment);
    const groupedAppointments = this.groupTransformedByDate(transformed);
    const summary = this.calculateSummary(appointments);

    return {
      view: CalendarView.DAY,
      dateRange,
      appointments: groupedAppointments as any,
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
    userId?: string,
    userRole?: string,
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

    // Build query filter with doctor scoping
    const filter = this.buildFilter(query, startOfWeek, endOfWeek, userId, userRole);

    // Fetch appointments with populated relationships
    const appointments = await this.appointmentModel
      .find(filter)
      .populate('patientId', 'firstName lastName phone email profilePicture')
      .populate('doctorId', 'firstName lastName specialty email phone')
      .populate('clinicId', 'name')
      .populate('serviceId', 'name durationMinutes price description')
      .sort({ appointmentDate: 1, appointmentTime: 1 })
      .lean()
      .exec();

    // Transform and group by date
    const transformed = appointments.map(transformAppointment);
    const groupedAppointments = this.groupTransformedByDate(transformed);

    // Calculate summary statistics
    const summary = this.calculateSummary(appointments);

    return {
      view: CalendarView.WEEK,
      dateRange,
      appointments: groupedAppointments as any,
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
    userId?: string,
    userRole?: string,
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

    // Build query filter with doctor scoping
    const filter = this.buildFilter(query, startOfMonth, endOfMonth, userId, userRole);

    // Fetch appointments with populated relationships
    const appointments = await this.appointmentModel
      .find(filter)
      .populate('patientId', 'firstName lastName phone email profilePicture')
      .populate('doctorId', 'firstName lastName specialty email phone')
      .populate('clinicId', 'name')
      .populate('serviceId', 'name durationMinutes price description')
      .sort({ appointmentDate: 1, appointmentTime: 1 })
      .lean()
      .exec();

    // Transform and group by date
    const transformed = appointments.map(transformAppointment);
    const groupedAppointments = this.groupTransformedByDate(transformed);

    // Calculate summary statistics
    const summary = this.calculateSummary(appointments);

    return {
      view: CalendarView.MONTH,
      dateRange,
      appointments: groupedAppointments as any,
      summary,
    };
  }

  /**
   * Build query filter based on calendar query parameters
   * Requirements: 5.4, 5.5, 5.6, 5.8
   *
   * @param userId  Authenticated user ID (for doctor role scoping)
   * @param userRole  Authenticated user role
   */
  private buildFilter(
    query: CalendarQueryDto,
    startDate: Date,
    endDate: Date,
    userId?: string,
    userRole?: string,
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
    // Multi-select clinic filter (overrides single clinicId)
    if (query.clinicIds) {
      const ids = String(query.clinicIds).split(',').filter(Boolean);
      if (ids.length === 1) {
        filter.clinicId = new Types.ObjectId(ids[0]);
      } else if (ids.length > 1) {
        filter.clinicId = { $in: ids.map((id) => new Types.ObjectId(id)) };
      }
    }

    // Requirement 5.5: Filter by doctor if specified
    if (query.doctorId) {
      filter.doctorId = new Types.ObjectId(query.doctorId);
    }
    // Multi-select doctor filter (overrides single doctorId)
    if (query.doctorIds) {
      const ids = String(query.doctorIds).split(',').filter(Boolean);
      if (ids.length === 1) {
        filter.doctorId = new Types.ObjectId(ids[0]);
      } else if (ids.length > 1) {
        filter.doctorId = { $in: ids.map((id) => new Types.ObjectId(id)) };
      }
    }

    // Requirement 5.6: Filter by department if specified
    if (query.departmentId) {
      filter.departmentId = new Types.ObjectId(query.departmentId);
    }

    // Optional: Filter by status if specified
    if (query.status) {
      filter.status = query.status;
    }

    // Doctor role scoping: doctors can only see their own appointments (UC-d2e3f4c)
    // This OVERRIDES any doctorId from the query params
    if (userRole === 'doctor' && userId) {
      filter.doctorId = new Types.ObjectId(userId);
    }

    return filter;
  }

  /**
   * Group already-transformed appointments by date.
   * Uses apt.datetime (ISO local string) to derive the YYYY-MM-DD key.
   */
  private groupTransformedByDate(
    appointments: TransformedAppointment[],
  ): Record<string, TransformedAppointment[]> {
    const grouped: Record<string, TransformedAppointment[]> = {};

    for (const appointment of appointments) {
      // datetime is "YYYY-MM-DDThh:mm:00.000" (local time, no Z)
      const dateKey = appointment.datetime
        ? appointment.datetime.split('T')[0]
        : new Date().toISOString().split('T')[0];

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(appointment);
    }

    return grouped;
  }

  /**
   * Group raw appointments by date (legacy — kept for calculateSummary compatibility)
   * Requirement 5.7: Format data in calendar-friendly structure with date groupings
   */
  private groupAppointmentsByDate(
    appointments: any[],
  ): Record<string, AppointmentDataDto[]> {
    const grouped: Record<string, AppointmentDataDto[]> = {};

    for (const appointment of appointments) {
      const dateKey = new Date(appointment.appointmentDate)
        .toISOString()
        .split('T')[0];

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
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
