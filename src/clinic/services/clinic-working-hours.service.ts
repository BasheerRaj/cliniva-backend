import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Clinic } from '../../database/schemas/clinic.schema';
import { Complex } from '../../database/schemas/complex.schema';
import { WorkingHours } from '../../database/schemas/working-hours.schema';
import { Appointment } from '../../database/schemas/appointment.schema';
import { User } from '../../database/schemas/user.schema';
import { ERROR_CODES } from '../constants/error-codes.constant';

/**
 * Interface for working hours schedule (simplified for validation)
 */
export interface WorkingHoursSchedule {
  dayOfWeek: string;
  isWorkingDay: boolean;
  openingTime?: string;
  closingTime?: string;
  breakStartTime?: string;
  breakEndTime?: string;
}

/**
 * Interface for working hours validation errors
 */
export interface WorkingHoursValidationError {
  dayOfWeek: string;
  message: {
    ar: string;
    en: string;
  };
  complexHours?: {
    openingTime: string;
    closingTime: string;
  };
  clinicHours?: {
    openingTime: string;
    closingTime: string;
  };
}

/**
 * Interface for conflict details
 */
export interface ConflictDetail {
  id: string;
  type: 'appointment' | 'doctor' | 'staff';
  name: string;
  date?: string;
  time?: string;
  reason: {
    ar: string;
    en: string;
  };
}

/**
 * Interface for working hours validation result
 */
export interface WorkingHoursValidationResult {
  isValid: boolean;
  errors: WorkingHoursValidationError[];
  conflicts: {
    appointments: ConflictDetail[];
    doctors: ConflictDetail[];
    staff: ConflictDetail[];
  };
  requiresRescheduling: boolean;
  affectedAppointments: number;
}

/**
 * Service for validating clinic working hours against complex hours
 * and detecting conflicts with appointments and staff schedules
 *
 * Business Rules:
 * - BZR-42: Clinic hours must be within complex hours
 * - BZR-43: Detect conflicts with appointments and staff
 */
@Injectable()
export class ClinicWorkingHoursService {
  constructor(
    @InjectModel('Clinic') private clinicModel: Model<Clinic>,
    @InjectModel('Complex') private complexModel: Model<Complex>,
    @InjectModel('WorkingHours') private workingHoursModel: Model<WorkingHours>,
    @InjectModel('Appointment') private appointmentModel: Model<Appointment>,
    @InjectModel('User') private userModel: Model<User>,
  ) {}

  /**
   * Validate clinic working hours against complex hours
   * BZR-42: Working hours validation
   * BZR-43: Conflict detection
   *
   * @param clinicId - Clinic ID
   * @param proposedHours - Proposed working hours schedule
   * @returns Validation result with errors and conflicts
   */
  async validateWorkingHours(
    clinicId: string,
    proposedHours: WorkingHoursSchedule[],
  ): Promise<WorkingHoursValidationResult> {
    // 1. Get clinic and validate it exists
    const clinic = await this.clinicModel.findById(clinicId);
    if (!clinic) {
      throw new NotFoundException({
        code: 'CLINIC_007',
        message: ERROR_CODES.CLINIC_007.message,
      });
    }

    // 2. Get complex working hours
    if (!clinic.complexId) {
      throw new BadRequestException({
        message: {
          ar: 'العيادة غير مرتبطة بمجمع',
          en: 'Clinic is not associated with a complex',
        },
        code: 'CLINIC_NO_COMPLEX',
      });
    }

    const complexHours = await this.workingHoursModel
      .find({
        entityType: 'complex',
        entityId: clinic.complexId,
        isActive: true,
      })
      .lean();

    // 3. Validate hours against complex hours
    const errors = this.validateAgainstComplexHours(
      proposedHours,
      complexHours,
    );

    // 4. Detect conflicts with appointments and staff
    const conflicts = await this.detectConflicts(clinicId, proposedHours);

    // 5. Calculate affected appointments
    const affectedAppointments = conflicts.appointments.length;

    return {
      isValid: errors.length === 0,
      errors,
      conflicts,
      requiresRescheduling: affectedAppointments > 0,
      affectedAppointments,
    };
  }

  /**
   * Validate proposed hours against complex hours
   * BZR-42: Working hours validation
   */
  private validateAgainstComplexHours(
    clinicHours: WorkingHoursSchedule[],
    complexHours: WorkingHours[],
  ): WorkingHoursValidationError[] {
    const errors: WorkingHoursValidationError[] = [];

    // Create a map of complex hours by day for O(1) lookup
    const complexHoursMap = new Map<string, WorkingHours>();
    complexHours.forEach((ch) => {
      complexHoursMap.set(ch.dayOfWeek, ch);
    });

    for (const clinicDay of clinicHours) {
      const complexDay = complexHoursMap.get(clinicDay.dayOfWeek);

      // Rule 1: Clinic cannot be open when complex is closed
      if (clinicDay.isWorkingDay && complexDay && !complexDay.isWorkingDay) {
        errors.push({
          dayOfWeek: clinicDay.dayOfWeek,
          message: {
            ar: `لا يمكن فتح العيادة يوم ${this.translateDay(clinicDay.dayOfWeek, 'ar')} عندما يكون المجمع مغلقاً`,
            en: `Clinic cannot be open on ${clinicDay.dayOfWeek} when complex is closed`,
          },
        });
        continue;
      }

      // Rule 2: Clinic hours must be within complex hours
      if (clinicDay.isWorkingDay && complexDay && complexDay.isWorkingDay) {
        // Ensure both clinic and complex have opening/closing times
        if (
          !clinicDay.openingTime ||
          !clinicDay.closingTime ||
          !complexDay.openingTime ||
          !complexDay.closingTime
        ) {
          continue;
        }

        const clinicOpen = this.parseTime(clinicDay.openingTime);
        const clinicClose = this.parseTime(clinicDay.closingTime);
        const complexOpen = this.parseTime(complexDay.openingTime);
        const complexClose = this.parseTime(complexDay.closingTime);

        if (clinicOpen < complexOpen || clinicClose > complexClose) {
          errors.push({
            dayOfWeek: clinicDay.dayOfWeek,
            message: {
              ar: `ساعات العيادة يجب أن تكون ضمن ساعات المجمع (${complexDay.openingTime} - ${complexDay.closingTime})`,
              en: `Clinic hours must be within complex hours (${complexDay.openingTime} - ${complexDay.closingTime})`,
            },
            complexHours: {
              openingTime: complexDay.openingTime,
              closingTime: complexDay.closingTime,
            },
            clinicHours: {
              openingTime: clinicDay.openingTime,
              closingTime: clinicDay.closingTime,
            },
          });
        }
      }
    }

    return errors;
  }

  /**
   * Detect conflicts with appointments and staff schedules
   * BZR-43: Conflict detection
   */
  private async detectConflicts(
    clinicId: string,
    proposedHours: WorkingHoursSchedule[],
  ): Promise<{
    appointments: ConflictDetail[];
    doctors: ConflictDetail[];
    staff: ConflictDetail[];
  }> {
    const appointmentConflicts: ConflictDetail[] = [];
    const doctorConflicts: ConflictDetail[] = [];
    const staffConflicts: ConflictDetail[] = [];

    // Create a map of proposed hours by day
    const hoursMap = new Map<string, WorkingHoursSchedule>();
    proposedHours.forEach((h) => {
      hoursMap.set(h.dayOfWeek, h);
    });

    // Check appointment conflicts
    const appointments = await this.appointmentModel
      .find({
        clinicId: new Types.ObjectId(clinicId),
        status: { $in: ['scheduled', 'confirmed'] },
        appointmentDate: { $gte: new Date() },
        deletedAt: null,
      })
      .populate('patientId', 'firstName lastName')
      .populate('doctorId', 'firstName lastName')
      .lean();

    for (const appointment of appointments) {
      const dayOfWeek = this.getDayOfWeek(appointment.appointmentDate);
      const proposedDay = hoursMap.get(dayOfWeek);

      // Type guard for populated fields
      const patientId = appointment.patientId as any;
      const patientName =
        patientId?.firstName && patientId?.lastName
          ? `${patientId.firstName} ${patientId.lastName}`
          : 'Unknown Patient';

      // Check if clinic is closed on this day
      if (!proposedDay || !proposedDay.isWorkingDay) {
        appointmentConflicts.push({
          id: appointment._id.toString(),
          type: 'appointment',
          name: patientName,
          date: appointment.appointmentDate.toISOString().split('T')[0],
          time: appointment.appointmentTime,
          reason: {
            ar: 'الموعد في يوم غير عمل',
            en: 'Appointment on non-working day',
          },
        });
        continue;
      }

      // Check if appointment time is outside working hours
      if (!proposedDay.openingTime || !proposedDay.closingTime) {
        continue;
      }

      const appointmentTime = this.parseTime(appointment.appointmentTime);
      const openingTime = this.parseTime(proposedDay.openingTime);
      const closingTime = this.parseTime(proposedDay.closingTime);

      if (appointmentTime < openingTime || appointmentTime >= closingTime) {
        appointmentConflicts.push({
          id: appointment._id.toString(),
          type: 'appointment',
          name: patientName,
          date: appointment.appointmentDate.toISOString().split('T')[0],
          time: appointment.appointmentTime,
          reason: {
            ar: 'الموعد خارج ساعات العمل الجديدة',
            en: 'Appointment outside new working hours',
          },
        });
      }
    }

    // TODO: Check doctor/staff schedule conflicts if needed
    // This would require a staff schedule system

    return {
      appointments: appointmentConflicts,
      doctors: doctorConflicts,
      staff: staffConflicts,
    };
  }

  /**
   * Parse time string (HH:mm) to minutes since midnight
   */
  private parseTime(timeStr: string): number {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Get day of week from date
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
   * Translate day name to Arabic or English
   */
  private translateDay(day: string, lang: 'ar' | 'en'): string {
    const translations = {
      monday: { ar: 'الاثنين', en: 'Monday' },
      tuesday: { ar: 'الثلاثاء', en: 'Tuesday' },
      wednesday: { ar: 'الأربعاء', en: 'Wednesday' },
      thursday: { ar: 'الخميس', en: 'Thursday' },
      friday: { ar: 'الجمعة', en: 'Friday' },
      saturday: { ar: 'السبت', en: 'Saturday' },
      sunday: { ar: 'الأحد', en: 'Sunday' },
    };
    return translations[day]?.[lang] || day;
  }
}
