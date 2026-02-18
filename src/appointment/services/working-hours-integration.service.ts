import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WorkingHours } from '../../database/schemas/working-hours.schema';
import { Schedule } from '../../database/schemas/schedule.schema';
import { WorkingHoursService } from '../../working-hours/working-hours.service';

@Injectable()
export class WorkingHoursIntegrationService {
  private readonly logger = new Logger(WorkingHoursIntegrationService.name);

  constructor(
    private readonly workingHoursService: WorkingHoursService,
    @InjectModel('Schedule') private readonly scheduleModel: Model<Schedule>,
  ) {}

  /**
   * Get working hours for a doctor
   */
  async getDoctorWorkingHours(doctorId: string) {
    return this.workingHoursService.getWorkingHours('user', doctorId);
  }

  /**
   * Get working hours for a clinic
   */
  async getClinicWorkingHours(clinicId: string) {
    return this.workingHoursService.getWorkingHours('clinic', clinicId);
  }

  /**
   * Check if a specific date is a holiday for a clinic or organization
   */
  async checkHoliday(
    date: Date,
    clinicId?: string,
    organizationId?: string,
  ): Promise<boolean> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const filter: any = {
      scheduleType: 'holiday',
      status: 'active',
      isActive: true,
      deletedAt: { $exists: false },
      $or: [{ startDate: { $lte: endOfDay }, endDate: { $gte: startOfDay } }],
    };

    if (clinicId) {
      filter.clinicId = new Types.ObjectId(clinicId);
    } else if (organizationId) {
      filter.organizationId = new Types.ObjectId(organizationId);
    }

    const holiday = await this.scheduleModel.findOne(filter).exec();
    return !!holiday;
  }

  /**
   * Check if a time slot is blocked (e.g., for maintenance or special leave)
   */
  async isTimeBlocked(
    doctorId: string,
    date: Date,
    startTime: string,
    endTime: string,
  ): Promise<boolean> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const filter: any = {
      scheduleType: 'block_time',
      userId: new Types.ObjectId(doctorId),
      status: 'active',
      isActive: true,
      deletedAt: { $exists: false },
      startDate: { $lte: endOfDay },
      endDate: { $gte: startOfDay },
      // Check for time overlap
      $or: [
        {
          $and: [
            { startTime: { $lte: startTime } },
            { endTime: { $gt: startTime } },
          ],
        },
        {
          $and: [
            { startTime: { $lt: endTime } },
            { endTime: { $gte: endTime } },
          ],
        },
        {
          $and: [
            { startTime: { $gte: startTime } },
            { endTime: { $lte: endTime } },
          ],
        },
      ],
    };

    const block = await this.scheduleModel.findOne(filter).exec();
    return !!block;
  }

  /**
   * Get effective working hours for a doctor on a specific day
   * This considers doctor hours, clinic hours, and holidays
   */
  async getEffectiveWorkingHours(
    doctorId: string,
    clinicId: string,
    date: Date,
  ) {
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

    // 1. Check if it's a holiday
    const isHoliday = await this.checkHoliday(date, clinicId);
    if (isHoliday) {
      return null;
    }

    // 2. Get doctor working hours for this day
    const doctorHours = await this.workingHoursService.getWorkingHours(
      'user',
      doctorId,
    );
    const doctorDayHours = doctorHours.find(
      (h) => h.dayOfWeek === dayOfWeek && h.isWorkingDay,
    );

    if (!doctorDayHours) {
      return null;
    }

    // 3. Get clinic working hours for this day
    const clinicHours = await this.workingHoursService.getWorkingHours(
      'clinic',
      clinicId,
    );
    const clinicDayHours = clinicHours.find(
      (h) => h.dayOfWeek === dayOfWeek && h.isWorkingDay,
    );

    if (!clinicDayHours) {
      return null;
    }

    // 4. Intersect hours (Doctor must be within Clinic hours)
    // We assume doctor's hours are already validated against clinic hours during setup,
    // but we'll use the most restrictive ones just in case.
    const openingTime = this.maxTime(
      doctorDayHours.openingTime || '',
      clinicDayHours.openingTime || '',
    );
    const closingTime = this.minTime(
      doctorDayHours.closingTime || '',
      clinicDayHours.closingTime || '',
    );

    if (openingTime >= closingTime) {
      return null;
    }

    return {
      openingTime,
      closingTime,
      breakStartTime: doctorDayHours.breakStartTime,
      breakEndTime: doctorDayHours.breakEndTime,
    };
  }

  private maxTime(t1: string, t2: string): string {
    if (!t1) return t2;
    if (!t2) return t1;
    return t1 > t2 ? t1 : t2;
  }

  private minTime(t1: string, t2: string): string {
    if (!t1) return t2;
    if (!t2) return t1;
    return t1 < t2 ? t1 : t2;
  }
}
