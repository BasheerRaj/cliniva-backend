import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { WorkingHoursIntegrationService } from './working-hours-integration.service';

/**
 * Service for validating appointment times against working hours
 * Task 5: Working Hours Validation for M6 Appointments Management Module
 */
@Injectable()
export class AppointmentWorkingHoursService {
  private readonly logger = new Logger(AppointmentWorkingHoursService.name);

  constructor(
    private readonly workingHoursIntegrationService: WorkingHoursIntegrationService,
  ) {}

  /**
   * Task 5.1: Validate appointment time falls within working hours
   * Requirements: 2.1-2.6
   * 
   * Validates that the appointment time and duration fall within both
   * clinic and doctor working hours, considering hierarchical constraints.
   * 
   * @param clinicId - The clinic ID
   * @param doctorId - The doctor ID
   * @param date - The appointment date
   * @param time - The appointment time in HH:mm format
   * @param duration - The appointment duration in minutes
   * @throws ConflictException if appointment is outside working hours
   */
  async validateWorkingHours(
    clinicId: string,
    doctorId: string,
    date: Date,
    time: string,
    duration: number,
  ): Promise<void> {
    this.logger.log(
      `Validating working hours for clinic ${clinicId}, doctor ${doctorId}, date ${date.toISOString()}, time ${time}, duration ${duration}`,
    );

    // Get effective working hours (considers clinic, doctor, and holidays)
    const effectiveHours =
      await this.workingHoursIntegrationService.getEffectiveWorkingHours(
        doctorId,
        clinicId,
        date,
      );

    // If no working hours found (holiday or non-working day)
    if (!effectiveHours) {
      throw new ConflictException({
        message: {
          ar: 'لا توجد ساعات عمل متاحة في هذا التاريخ (عطلة أو يوم غير عمل)',
          en: 'No working hours available on this date (holiday or non-working day)',
        },
      });
    }

    // Convert appointment time to minutes since midnight
    const [hours, minutes] = time.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + duration;

    // Convert working hours to minutes
    const openingMinutes = this.timeToMinutes(effectiveHours.openingTime);
    const closingMinutes = this.timeToMinutes(effectiveHours.closingTime);

    // Check if appointment start time is within working hours
    if (startMinutes < openingMinutes || startMinutes >= closingMinutes) {
      throw new ConflictException({
        message: {
          ar: `وقت بداية الموعد (${time}) خارج ساعات العمل (${effectiveHours.openingTime} - ${effectiveHours.closingTime})`,
          en: `Appointment start time (${time}) is outside working hours (${effectiveHours.openingTime} - ${effectiveHours.closingTime})`,
        },
      });
    }

    // Check if appointment end time is within working hours
    if (endMinutes > closingMinutes) {
      const endTime = this.minutesToTime(endMinutes);
      throw new ConflictException({
        message: {
          ar: `وقت انتهاء الموعد (${endTime}) خارج ساعات العمل (${effectiveHours.openingTime} - ${effectiveHours.closingTime})`,
          en: `Appointment end time (${endTime}) is outside working hours (${effectiveHours.openingTime} - ${effectiveHours.closingTime})`,
        },
      });
    }

    // Check if appointment falls during break time
    if (effectiveHours.breakStartTime && effectiveHours.breakEndTime) {
      const breakStartMinutes = this.timeToMinutes(
        effectiveHours.breakStartTime,
      );
      const breakEndMinutes = this.timeToMinutes(effectiveHours.breakEndTime);

      // Check if appointment overlaps with break time
      const overlapsBreak =
        (startMinutes >= breakStartMinutes && startMinutes < breakEndMinutes) ||
        (endMinutes > breakStartMinutes && endMinutes <= breakEndMinutes) ||
        (startMinutes <= breakStartMinutes && endMinutes >= breakEndMinutes);

      if (overlapsBreak) {
        throw new ConflictException({
          message: {
            ar: `الموعد يتعارض مع وقت الاستراحة (${effectiveHours.breakStartTime} - ${effectiveHours.breakEndTime})`,
            en: `Appointment conflicts with break time (${effectiveHours.breakStartTime} - ${effectiveHours.breakEndTime})`,
          },
        });
      }
    }

    // Check if time is blocked (e.g., special leave, maintenance)
    const isBlocked =
      await this.workingHoursIntegrationService.isTimeBlocked(
        doctorId,
        date,
        time,
        this.minutesToTime(endMinutes),
      );

    if (isBlocked) {
      throw new ConflictException({
        message: {
          ar: 'هذا الوقت محجوز أو غير متاح',
          en: 'This time slot is blocked or unavailable',
        },
      });
    }

    this.logger.log('Working hours validation passed');
  }

  /**
   * Task 5.2: Check if appointment is within clinic working hours
   * Requirements: 2.1, 2.3, 2.4
   * 
   * @param clinicId - The clinic ID
   * @param date - The appointment date
   * @param time - The appointment time in HH:mm format
   * @param duration - The appointment duration in minutes
   * @returns true if within clinic hours, false otherwise
   */
  async isWithinClinicWorkingHours(
    clinicId: string,
    date: Date,
    time: string,
    duration: number,
  ): Promise<boolean> {
    try {
      const clinicHours =
        await this.workingHoursIntegrationService.getClinicWorkingHours(
          clinicId,
        );

      if (!clinicHours || clinicHours.length === 0) {
        return false;
      }

      const days = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ];
      const dayOfWeek = days[date.getDay()];

      const dayHours = clinicHours.find(
        (h: any) => h.dayOfWeek === dayOfWeek && h.isWorkingDay,
      );

      if (!dayHours || !dayHours.openingTime || !dayHours.closingTime) {
        return false;
      }

      const [hours, minutes] = time.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + duration;

      const openingMinutes = this.timeToMinutes(dayHours.openingTime);
      const closingMinutes = this.timeToMinutes(dayHours.closingTime);

      return (
        startMinutes >= openingMinutes &&
        endMinutes <= closingMinutes &&
        startMinutes < closingMinutes
      );
    } catch (error) {
      this.logger.error(
        `Error checking clinic working hours: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Task 5.3: Check if appointment is within doctor working hours
   * Requirements: 2.2, 2.3, 2.5
   * 
   * @param doctorId - The doctor ID
   * @param date - The appointment date
   * @param time - The appointment time in HH:mm format
   * @param duration - The appointment duration in minutes
   * @returns true if within doctor hours, false otherwise
   */
  async isWithinDoctorWorkingHours(
    doctorId: string,
    date: Date,
    time: string,
    duration: number,
  ): Promise<boolean> {
    try {
      const doctorHours =
        await this.workingHoursIntegrationService.getDoctorWorkingHours(
          doctorId,
        );

      if (!doctorHours || doctorHours.length === 0) {
        return false;
      }

      const days = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ];
      const dayOfWeek = days[date.getDay()];

      const dayHours = doctorHours.find(
        (h: any) => h.dayOfWeek === dayOfWeek && h.isWorkingDay,
      );

      if (!dayHours || !dayHours.openingTime || !dayHours.closingTime) {
        return false;
      }

      const [hours, minutes] = time.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + duration;

      const openingMinutes = this.timeToMinutes(dayHours.openingTime);
      const closingMinutes = this.timeToMinutes(dayHours.closingTime);

      return (
        startMinutes >= openingMinutes &&
        endMinutes <= closingMinutes &&
        startMinutes < closingMinutes
      );
    } catch (error) {
      this.logger.error(
        `Error checking doctor working hours: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Convert time string (HH:mm) to minutes since midnight
   * @param time - Time in HH:mm format
   * @returns Minutes since midnight
   */
  private timeToMinutes(time: string): number {
    if (!time) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Convert minutes since midnight to time string (HH:mm)
   * @param minutes - Minutes since midnight
   * @returns Time in HH:mm format
   */
  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
}
