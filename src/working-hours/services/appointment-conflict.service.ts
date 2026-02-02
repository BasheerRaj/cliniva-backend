import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Appointment } from '../../database/schemas/appointment.schema';
import { WorkingHoursSchedule } from './working-hours-validation.service';
import { BilingualMessage } from '../../common/types/bilingual-message.type';
import { createDynamicMessage } from '../../common/utils/error-messages.constant';

/**
 * Interface for appointment conflict details
 */
export interface AppointmentConflict {
  appointmentId: string;
  patientName: string;
  appointmentDate: string;
  appointmentTime: string;
  conflictReason: BilingualMessage;
}

/**
 * Interface for conflict detection result
 */
export interface ConflictResult {
  hasConflicts: boolean;
  conflicts: AppointmentConflict[];
  affectedAppointments: number;
  requiresRescheduling: boolean;
}

/**
 * AppointmentConflictService
 *
 * Service for detecting appointment conflicts when updating doctor working hours.
 * Identifies appointments that fall outside new working hours and provides
 * detailed conflict information for rescheduling decisions.
 *
 * Business Rules:
 * - BZR-l9e0f1c4: Detect appointments outside new working hours
 * - BZR-43: Identify appointments requiring rescheduling
 *
 * @class AppointmentConflictService
 */
@Injectable()
export class AppointmentConflictService {
  constructor(
    @InjectModel('Appointment')
    private readonly appointmentModel: Model<Appointment>,
  ) {}

  /**
   * Checks for appointment conflicts when updating doctor working hours.
   *
   * This method identifies all future appointments that would fall outside
   * the new working hours schedule. It provides detailed information about
   * each conflicting appointment to support rescheduling decisions.
   *
   * Uses aggregation pipeline for optimized performance with large datasets.
   *
   * @param {string} userId - Doctor's user ID
   * @param {WorkingHoursSchedule[]} newSchedule - New working hours schedule
   * @returns {Promise<ConflictResult>} Conflict detection result with details
   *
   * @example
   * const result = await conflictService.checkConflicts(
   *   'doctor123',
   *   [
   *     {
   *       dayOfWeek: 'monday',
   *       isWorkingDay: true,
   *       openingTime: '09:00',
   *       closingTime: '17:00'
   *     }
   *   ]
   * );
   * if (result.hasConflicts) {
   *   console.log(`Found ${result.affectedAppointments} conflicting appointments`);
   * }
   */
  async checkConflicts(
    userId: string,
    newSchedule: WorkingHoursSchedule[],
  ): Promise<ConflictResult> {
    const conflicts: AppointmentConflict[] = [];

    // Create a map of working hours by day for quick lookup
    const scheduleMap = new Map<string, WorkingHoursSchedule>();
    newSchedule.forEach((schedule) => {
      scheduleMap.set(schedule.dayOfWeek.toLowerCase(), schedule);
    });

    // Get all future appointments for this doctor using aggregation pipeline
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Use aggregation pipeline for optimized query
    const futureAppointments = await this.appointmentModel
      .aggregate([
        {
          $match: {
            doctorId: new Types.ObjectId(userId),
            appointmentDate: { $gte: today },
            status: { $in: ['scheduled', 'confirmed'] },
            deletedAt: null,
          },
        },
        {
          $lookup: {
            from: 'patients',
            localField: 'patientId',
            foreignField: '_id',
            as: 'patient',
          },
        },
        {
          $unwind: {
            path: '$patient',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            appointmentDate: 1,
            appointmentTime: 1,
            durationMinutes: 1,
            'patient.firstName': 1,
            'patient.lastName': 1,
          },
        },
        {
          $sort: { appointmentDate: 1, appointmentTime: 1 },
        },
      ])
      .exec();

    // Check each appointment against the new schedule
    for (const appointment of futureAppointments) {
      const appointmentDate = new Date(appointment.appointmentDate);
      const dayOfWeek = this.getDayOfWeek(appointmentDate);
      const workingHours = scheduleMap.get(dayOfWeek);

      // Check if appointment conflicts with new schedule
      if (!this.isAppointmentWithinHours(appointment, workingHours)) {
        const patient = appointment.patient;
        const patientName = patient
          ? `${patient.firstName} ${patient.lastName}`
          : 'Unknown Patient';

        conflicts.push({
          appointmentId: appointment._id.toString(),
          patientName,
          appointmentDate: appointmentDate.toISOString().split('T')[0],
          appointmentTime: appointment.appointmentTime,
          conflictReason: this.getConflictReason(
            appointment,
            workingHours,
            dayOfWeek,
          ),
        });
      }
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      affectedAppointments: conflicts.length,
      requiresRescheduling: conflicts.length > 0,
    };
  }

  /**
   * Retrieves appointments for a specific doctor on a given day of the week.
   *
   * This method fetches all future appointments for a doctor that fall on
   * a specific day of the week (e.g., all Mondays). Useful for analyzing
   * day-specific conflicts. Uses aggregation pipeline for optimized performance.
   *
   * @param {string} userId - Doctor's user ID
   * @param {string} dayOfWeek - Day of week (e.g., 'monday', 'tuesday')
   * @param {Date} fromDate - Start date for appointment search
   * @returns {Promise<Appointment[]>} Array of appointments on that day
   *
   * @example
   * const mondayAppointments = await conflictService.getAppointmentsByDay(
   *   'doctor123',
   *   'monday',
   *   new Date()
   * );
   */
  async getAppointmentsByDay(
    userId: string,
    dayOfWeek: string,
    fromDate: Date,
  ): Promise<Appointment[]> {
    const targetDay = dayOfWeek.toLowerCase();
    const dayIndex = this.getDayIndex(targetDay);

    // Use aggregation pipeline to filter by day of week efficiently
    const appointments = await this.appointmentModel
      .aggregate([
        {
          $match: {
            doctorId: new Types.ObjectId(userId),
            appointmentDate: { $gte: fromDate },
            status: { $in: ['scheduled', 'confirmed'] },
            deletedAt: null,
          },
        },
        {
          $addFields: {
            dayOfWeek: { $dayOfWeek: '$appointmentDate' },
          },
        },
        {
          $match: {
            dayOfWeek: dayIndex,
          },
        },
        {
          $lookup: {
            from: 'patients',
            localField: 'patientId',
            foreignField: '_id',
            as: 'patientId',
          },
        },
        {
          $unwind: {
            path: '$patientId',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $sort: { appointmentDate: 1, appointmentTime: 1 },
        },
      ])
      .exec();

    return appointments as Appointment[];
  }

  /**
   * Checks if an appointment falls within the specified working hours.
   *
   * This method validates whether an appointment's time is within the
   * working hours for that day. Returns false if:
   * - The day is not a working day
   * - The appointment time is before opening time
   * - The appointment time is after closing time
   * - The appointment falls during break time
   *
   * @param {Appointment} appointment - Appointment to check
   * @param {WorkingHoursSchedule | undefined} workingHours - Working hours for the day
   * @returns {boolean} True if appointment is within working hours, false otherwise
   *
   * @example
   * const isValid = conflictService.isAppointmentWithinHours(
   *   appointment,
   *   { dayOfWeek: 'monday', isWorkingDay: true, openingTime: '09:00', closingTime: '17:00' }
   * );
   */
  isAppointmentWithinHours(
    appointment: Appointment,
    workingHours: WorkingHoursSchedule | undefined,
  ): boolean {
    // If no working hours defined for this day, consider it a conflict
    if (!workingHours) {
      return false;
    }

    // If it's not a working day, appointment conflicts
    if (!workingHours.isWorkingDay) {
      return false;
    }

    // If working hours don't have opening/closing times, consider it valid
    if (!workingHours.openingTime || !workingHours.closingTime) {
      return true;
    }

    const appointmentTime = this.parseTime(appointment.appointmentTime);
    const openingTime = this.parseTime(workingHours.openingTime);
    const closingTime = this.parseTime(workingHours.closingTime);

    // Calculate appointment end time
    const appointmentEndTime =
      appointmentTime + (appointment.durationMinutes || 30);

    // Check if appointment starts before opening time
    if (appointmentTime < openingTime) {
      return false;
    }

    // Check if appointment ends after closing time
    if (appointmentEndTime > closingTime) {
      return false;
    }

    // Check if appointment conflicts with break time
    if (workingHours.breakStartTime && workingHours.breakEndTime) {
      const breakStart = this.parseTime(workingHours.breakStartTime);
      const breakEnd = this.parseTime(workingHours.breakEndTime);

      // Check if appointment overlaps with break time
      if (
        (appointmentTime >= breakStart && appointmentTime < breakEnd) ||
        (appointmentEndTime > breakStart && appointmentEndTime <= breakEnd) ||
        (appointmentTime < breakStart && appointmentEndTime > breakEnd)
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Gets the day of week from a date.
   *
   * @private
   * @param {Date} date - Date to get day of week from
   * @returns {string} Day of week in lowercase (e.g., 'monday', 'tuesday')
   */
  private getDayOfWeek(date: Date): string {
    const days = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    return days[date.getDay()];
  }

  /**
   * Gets the day index (1-7) for MongoDB $dayOfWeek operator.
   * MongoDB uses 1 for Sunday, 2 for Monday, etc.
   *
   * @private
   * @param {string} dayName - Day name in lowercase (e.g., 'monday', 'tuesday')
   * @returns {number} Day index (1-7)
   */
  private getDayIndex(dayName: string): number {
    const days = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    return days.indexOf(dayName.toLowerCase()) + 1;
  }

  /**
   * Parses time string (HH:mm) to minutes for comparison.
   *
   * @private
   * @param {string} timeString - Time in HH:mm format
   * @returns {number} Time in minutes since midnight
   */
  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Generates a bilingual conflict reason message.
   *
   * @private
   * @param {Appointment} appointment - Conflicting appointment
   * @param {WorkingHoursSchedule | undefined} workingHours - Working hours for the day
   * @param {string} dayOfWeek - Day of week
   * @returns {BilingualMessage} Bilingual conflict reason
   */
  private getConflictReason(
    appointment: Appointment,
    workingHours: WorkingHoursSchedule | undefined,
    dayOfWeek: string,
  ): BilingualMessage {
    if (!workingHours || !workingHours.isWorkingDay) {
      return createDynamicMessage(
        `الموعد في يوم ${this.translateDay(dayOfWeek, 'ar')} والذي لم يعد يوم عمل`,
        `Appointment is on ${this.translateDay(dayOfWeek, 'en')} which is no longer a working day`,
        {},
      );
    }

    if (!workingHours.openingTime || !workingHours.closingTime) {
      return createDynamicMessage(
        'الموعد خارج ساعات العمل الجديدة',
        'Appointment is outside new working hours',
        {},
      );
    }

    const appointmentTime = this.parseTime(appointment.appointmentTime);
    const openingTime = this.parseTime(workingHours.openingTime);
    const closingTime = this.parseTime(workingHours.closingTime);
    const appointmentEndTime =
      appointmentTime + (appointment.durationMinutes || 30);

    if (appointmentTime < openingTime) {
      return createDynamicMessage(
        `الموعد في ${appointment.appointmentTime} قبل وقت الفتح الجديد ${workingHours.openingTime}`,
        `Appointment at ${appointment.appointmentTime} is before new opening time ${workingHours.openingTime}`,
        {},
      );
    }

    if (appointmentEndTime > closingTime) {
      return createDynamicMessage(
        `الموعد ينتهي بعد وقت الإغلاق الجديد ${workingHours.closingTime}`,
        `Appointment ends after new closing time ${workingHours.closingTime}`,
        {},
      );
    }

    if (workingHours.breakStartTime && workingHours.breakEndTime) {
      const breakStart = this.parseTime(workingHours.breakStartTime);
      const breakEnd = this.parseTime(workingHours.breakEndTime);

      if (
        (appointmentTime >= breakStart && appointmentTime < breakEnd) ||
        (appointmentEndTime > breakStart && appointmentEndTime <= breakEnd) ||
        (appointmentTime < breakStart && appointmentEndTime > breakEnd)
      ) {
        return createDynamicMessage(
          `الموعد يتعارض مع وقت الاستراحة (${workingHours.breakStartTime} - ${workingHours.breakEndTime})`,
          `Appointment conflicts with break time (${workingHours.breakStartTime} - ${workingHours.breakEndTime})`,
          {},
        );
      }
    }

    return createDynamicMessage(
      'الموعد خارج ساعات العمل الجديدة',
      'Appointment is outside new working hours',
      {},
    );
  }

  /**
   * Translates day of week to Arabic or English.
   *
   * @private
   * @param {string} day - Day of week in English
   * @param {string} language - Target language ('ar' or 'en')
   * @returns {string} Translated day name
   */
  private translateDay(day: string, language: string): string {
    const translations: Record<string, { ar: string; en: string }> = {
      sunday: { ar: 'الأحد', en: 'Sunday' },
      monday: { ar: 'الاثنين', en: 'Monday' },
      tuesday: { ar: 'الثلاثاء', en: 'Tuesday' },
      wednesday: { ar: 'الأربعاء', en: 'Wednesday' },
      thursday: { ar: 'الخميس', en: 'Thursday' },
      friday: { ar: 'الجمعة', en: 'Friday' },
      saturday: { ar: 'السبت', en: 'Saturday' },
    };

    return translations[day.toLowerCase()]?.[language] || day;
  }
}
