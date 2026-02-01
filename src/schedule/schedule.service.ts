import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Schedule } from '../database/schemas/schedule.schema';
import { User } from '../database/schemas/user.schema';
import { Clinic } from '../database/schemas/clinic.schema';
import { Complex } from '../database/schemas/complex.schema';
import { Organization } from '../database/schemas/organization.schema';
import { Appointment } from '../database/schemas/appointment.schema';
import { WorkingHours } from '../database/schemas/working-hours.schema';
import { EmployeeShift } from '../database/schemas/employee-shift.schema';
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
  ScheduleStatsDto,
} from './dto';

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(
    @InjectModel('Schedule') private readonly scheduleModel: Model<Schedule>,
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('Clinic') private readonly clinicModel: Model<Clinic>,
    @InjectModel('Complex') private readonly complexModel: Model<Complex>,
    @InjectModel('Organization')
    private readonly organizationModel: Model<Organization>,
    @InjectModel('Appointment')
    private readonly appointmentModel: Model<Appointment>,
    @InjectModel('WorkingHours')
    private readonly workingHoursModel: Model<WorkingHours>,
    @InjectModel('EmployeeShift')
    private readonly employeeShiftModel: Model<EmployeeShift>,
  ) {}

  /**
   * Validate schedule data and check for conflicts
   */
  private async validateScheduleData(
    scheduleDto: CreateScheduleDto | UpdateScheduleDto,
    isUpdate = false,
    scheduleId?: string,
  ): Promise<void> {
    const createDto = scheduleDto as CreateScheduleDto;

    // Validate date and time logic
    if (createDto.startDate && createDto.endDate) {
      const startDate = new Date(createDto.startDate);
      const endDate = new Date(createDto.endDate);

      if (startDate > endDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    if (createDto.startTime && createDto.endTime) {
      const startTime = this.timeToMinutes(createDto.startTime);
      const endTime = this.timeToMinutes(createDto.endTime);

      if (startTime >= endTime) {
        throw new BadRequestException('End time must be after start time');
      }
    }

    // Validate entity references exist
    if (createDto.userId) {
      const user = await this.userModel.findById(createDto.userId);
      if (!user || !user.isActive) {
        throw new NotFoundException('User not found or inactive');
      }
    }

    if (createDto.clinicId) {
      const clinic = await this.clinicModel.findById(createDto.clinicId);
      if (!clinic) {
        throw new NotFoundException('Clinic not found');
      }
    }

    if (createDto.complexId) {
      const complex = await this.complexModel.findById(createDto.complexId);
      if (!complex) {
        throw new NotFoundException('Complex not found');
      }
    }

    if (createDto.organizationId) {
      const organization = await this.organizationModel.findById(
        createDto.organizationId,
      );
      if (!organization) {
        throw new NotFoundException('Organization not found');
      }
    }

    // For new schedules, check for conflicts (unless allowOverlap is true)
    if (!isUpdate && createDto.allowOverlap !== true) {
      const conflictDto: CheckScheduleConflictDto = {
        scheduleType: createDto.scheduleType,
        userId: createDto.userId,
        clinicId: createDto.clinicId,
        roomId: createDto.roomId,
        equipmentId: createDto.equipmentId,
        startDate: createDto.startDate,
        endDate: createDto.endDate,
        startTime: createDto.startTime,
        endTime: createDto.endTime,
      };

      const conflicts = await this.checkScheduleConflicts(conflictDto);
      if (conflicts.hasConflicts) {
        throw new ConflictException(
          `Schedule conflicts detected: ${conflicts.conflicts.length} overlapping schedule(s)`,
        );
      }
    }

    // Validate recurrence settings
    if (createDto.isRecurring) {
      if (!createDto.recurrenceType) {
        throw new BadRequestException(
          'Recurrence type is required for recurring schedules',
        );
      }

      if (
        createDto.recurrenceType === 'custom' &&
        (!createDto.recurrenceInterval || createDto.recurrenceInterval < 1)
      ) {
        throw new BadRequestException(
          'Recurrence interval is required for custom recurrence',
        );
      }

      if (createDto.recurrenceEndDate && createDto.maxOccurrences) {
        throw new BadRequestException(
          'Cannot specify both recurrence end date and max occurrences',
        );
      }
    }
  }

  /**
   * Create a new schedule
   */
  async createSchedule(
    createScheduleDto: CreateScheduleDto,
    createdByUserId?: string,
  ): Promise<Schedule> {
    this.logger.log(`Creating schedule: ${createScheduleDto.title}`);

    await this.validateScheduleData(createScheduleDto);

    const scheduleData = {
      ...createScheduleDto,
      userId: createScheduleDto.userId
        ? new Types.ObjectId(createScheduleDto.userId)
        : undefined,
      clinicId: createScheduleDto.clinicId
        ? new Types.ObjectId(createScheduleDto.clinicId)
        : undefined,
      complexId: createScheduleDto.complexId
        ? new Types.ObjectId(createScheduleDto.complexId)
        : undefined,
      organizationId: createScheduleDto.organizationId
        ? new Types.ObjectId(createScheduleDto.organizationId)
        : undefined,
      startDate: new Date(createScheduleDto.startDate),
      endDate: new Date(createScheduleDto.endDate),
      recurrenceEndDate: createScheduleDto.recurrenceEndDate
        ? new Date(createScheduleDto.recurrenceEndDate)
        : undefined,
      createdBy: createdByUserId
        ? new Types.ObjectId(createdByUserId)
        : undefined,
      isAvailable:
        createScheduleDto.isAvailable !== undefined
          ? createScheduleDto.isAvailable
          : true,
      isBlocked:
        createScheduleDto.isBlocked !== undefined
          ? createScheduleDto.isBlocked
          : false,
      priority: createScheduleDto.priority || 'medium',
      status: createScheduleDto.status || 'active',
      requiresApproval: createScheduleDto.requiresApproval || false,
      approvalStatus: createScheduleDto.requiresApproval
        ? 'pending'
        : 'auto_approved',
      sendReminders: createScheduleDto.sendReminders || false,
      allowOverlap: createScheduleDto.allowOverlap || false,
      isActive: true,
    };

    const schedule = new this.scheduleModel(scheduleData);
    const savedSchedule = await schedule.save();

    // If recurring, generate recurring instances
    if (createScheduleDto.isRecurring) {
      await this.generateRecurringSchedules(savedSchedule);
    }

    this.logger.log(
      `Schedule created successfully with ID: ${savedSchedule._id}`,
    );
    return savedSchedule;
  }

  /**
   * Generate recurring schedule instances
   */
  private async generateRecurringSchedules(
    masterSchedule: Schedule,
  ): Promise<void> {
    if (!masterSchedule.isRecurring || !masterSchedule.recurrenceType) {
      return;
    }

    const instances: any[] = [];
    const startDate = new Date(masterSchedule.startDate);
    const endDate = new Date(masterSchedule.endDate);
    const duration = endDate.getTime() - startDate.getTime();

    let currentDate = new Date(startDate);
    const endRecurrence =
      masterSchedule.recurrenceEndDate ||
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
    const maxOccurrences = masterSchedule.maxOccurrences || 365; // Default max
    let occurrences = 0;

    while (currentDate <= endRecurrence && occurrences < maxOccurrences) {
      // Calculate next occurrence based on recurrence type
      const nextDate = this.calculateNextRecurrence(
        currentDate,
        masterSchedule,
      );

      if (nextDate > endRecurrence) {
        break;
      }

      // Create instance data
      const instanceEndDate = new Date(nextDate.getTime() + duration);

      const instanceData = {
        ...masterSchedule.toObject(),
        _id: undefined,
        startDate: nextDate,
        endDate: instanceEndDate,
        isRecurring: false, // Instances are not recurring
        recurrenceType: undefined,
        recurrenceInterval: undefined,
        recurrenceDays: undefined,
        recurrenceEndDate: undefined,
        maxOccurrences: undefined,
        metadata: new Map([
          ['parentScheduleId', (masterSchedule._id as any).toString()],
          ['instanceNumber', (occurrences + 1).toString()],
        ]),
      };

      instances.push(instanceData);
      currentDate = nextDate;
      occurrences++;
    }

    if (instances.length > 0) {
      await this.scheduleModel.insertMany(instances);
      this.logger.log(
        `Generated ${instances.length} recurring schedule instances for ${masterSchedule._id}`,
      );
    }
  }

  /**
   * Calculate next recurrence date
   */
  private calculateNextRecurrence(currentDate: Date, schedule: Schedule): Date {
    const nextDate = new Date(currentDate);
    const interval = schedule.recurrenceInterval || 1;

    switch (schedule.recurrenceType) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + interval);
        break;
      case 'weekly':
        if (schedule.recurrenceDays && schedule.recurrenceDays.length > 0) {
          // Find next day in recurrence days
          const dayMap = {
            sunday: 0,
            monday: 1,
            tuesday: 2,
            wednesday: 3,
            thursday: 4,
            friday: 5,
            saturday: 6,
          };
          const recurrenceDayNumbers = schedule.recurrenceDays
            .map((day) => dayMap[day.toLowerCase()])
            .sort();
          const currentDay = nextDate.getDay();

          let nextDay = recurrenceDayNumbers.find((day) => day > currentDay);
          if (!nextDay) {
            // Go to next week
            nextDay = recurrenceDayNumbers[0];
            nextDate.setDate(nextDate.getDate() + (7 - currentDay + nextDay));
          } else {
            nextDate.setDate(nextDate.getDate() + (nextDay - currentDay));
          }
        } else {
          nextDate.setDate(nextDate.getDate() + 7 * interval);
        }
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + interval);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + interval);
        break;
      default:
        nextDate.setDate(nextDate.getDate() + interval);
    }

    return nextDate;
  }

  /**
   * Get schedules with filtering and pagination
   */
  async getSchedules(query: ScheduleSearchQueryDto): Promise<{
    schedules: Schedule[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      search,
      scheduleType,
      userId,
      clinicId,
      complexId,
      organizationId,
      roomId,
      equipmentId,
      startDate,
      endDate,
      status,
      priority,
      isRecurring,
      isAvailable,
      isBlocked,
      tags,
      page = '1',
      limit = '10',
      sortBy = 'startDate',
      sortOrder = 'asc',
    } = query;

    // Build filter object
    const filter: any = {
      deletedAt: { $exists: false },
      isActive: true,
    };

    // Individual field filters
    if (scheduleType) filter.scheduleType = scheduleType;
    if (userId) filter.userId = new Types.ObjectId(userId);
    if (clinicId) filter.clinicId = new Types.ObjectId(clinicId);
    if (complexId) filter.complexId = new Types.ObjectId(complexId);
    if (organizationId)
      filter.organizationId = new Types.ObjectId(organizationId);
    if (roomId) filter.roomId = roomId;
    if (equipmentId) filter.equipmentId = equipmentId;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (isRecurring !== undefined) filter.isRecurring = isRecurring;
    if (isAvailable !== undefined) filter.isAvailable = isAvailable;
    if (isBlocked !== undefined) filter.isBlocked = isBlocked;

    // Date filtering
    if (startDate || endDate) {
      filter.$and = filter.$and || [];

      if (startDate && endDate) {
        // Schedules that overlap with the given date range
        filter.$and.push({
          $or: [
            {
              startDate: { $lte: new Date(endDate) },
              endDate: { $gte: new Date(startDate) },
            },
          ],
        });
      } else if (startDate) {
        filter.endDate = { $gte: new Date(startDate) };
      } else if (endDate) {
        filter.startDate = { $lte: new Date(endDate) };
      }
    }

    // Tags filtering
    if (tags && tags.length > 0) {
      filter.tags = { $in: tags };
    }

    // Search across text fields
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.max(1, Math.min(100, parseInt(limit)));
    const skip = (pageNum - 1) * pageSize;

    // Sorting
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [schedules, total] = await Promise.all([
      this.scheduleModel
        .find(filter)
        .populate('userId', 'firstName lastName email')
        .populate('clinicId', 'name address')
        .populate('complexId', 'name address')
        .populate('organizationId', 'name')
        .populate('createdBy', 'firstName lastName')
        .populate('approvedBy', 'firstName lastName')
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .exec(),
      this.scheduleModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      schedules,
      total,
      page: pageNum,
      totalPages,
    };
  }

  /**
   * Get schedule by ID
   */
  async getScheduleById(scheduleId: string): Promise<Schedule> {
    if (!Types.ObjectId.isValid(scheduleId)) {
      throw new BadRequestException('Invalid schedule ID format');
    }

    const schedule = await this.scheduleModel
      .findOne({
        _id: new Types.ObjectId(scheduleId),
        deletedAt: { $exists: false },
      })
      .populate('userId', 'firstName lastName email')
      .populate('clinicId', 'name address phone')
      .populate('complexId', 'name address phone')
      .populate('organizationId', 'name')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .exec();

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    return schedule;
  }

  /**
   * Update schedule
   */
  async updateSchedule(
    scheduleId: string,
    updateScheduleDto: UpdateScheduleDto,
    updatedByUserId?: string,
  ): Promise<Schedule> {
    if (!Types.ObjectId.isValid(scheduleId)) {
      throw new BadRequestException('Invalid schedule ID format');
    }

    this.logger.log(`Updating schedule: ${scheduleId}`);

    await this.validateScheduleData(updateScheduleDto, true, scheduleId);

    const updateData: any = {
      ...updateScheduleDto,
      updatedBy: updatedByUserId
        ? new Types.ObjectId(updatedByUserId)
        : undefined,
      startDate: updateScheduleDto.startDate
        ? new Date(updateScheduleDto.startDate)
        : undefined,
      endDate: updateScheduleDto.endDate
        ? new Date(updateScheduleDto.endDate)
        : undefined,
    };

    const schedule = await this.scheduleModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(scheduleId),
          deletedAt: { $exists: false },
        },
        { $set: updateData },
        { new: true, runValidators: true },
      )
      .exec();

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    this.logger.log(`Schedule updated successfully: ${scheduleId}`);
    return schedule;
  }

  /**
   * Delete schedule
   */
  async deleteSchedule(
    scheduleId: string,
    deletedByUserId?: string,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(scheduleId)) {
      throw new BadRequestException('Invalid schedule ID format');
    }

    this.logger.log(`Deleting schedule: ${scheduleId}`);

    const result = await this.scheduleModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(scheduleId),
          deletedAt: { $exists: false },
        },
        {
          $set: {
            deletedAt: new Date(),
            updatedBy: deletedByUserId
              ? new Types.ObjectId(deletedByUserId)
              : undefined,
            isActive: false,
          },
        },
      )
      .exec();

    if (!result) {
      throw new NotFoundException('Schedule not found');
    }

    this.logger.log(`Schedule deleted successfully: ${scheduleId}`);
  }

  /**
   * Create doctor availability schedule
   */
  async createDoctorAvailability(
    createAvailabilityDto: CreateDoctorAvailabilityDto,
    createdByUserId?: string,
  ): Promise<Schedule> {
    const scheduleDto: CreateScheduleDto = {
      scheduleType: 'doctor_availability',
      title: createAvailabilityDto.title,
      userId: createAvailabilityDto.doctorId,
      clinicId: createAvailabilityDto.clinicId,
      startDate: createAvailabilityDto.startDate,
      endDate: createAvailabilityDto.endDate,
      startTime: createAvailabilityDto.startTime,
      endTime: createAvailabilityDto.endTime,
      slotDuration: createAvailabilityDto.slotDuration || 30,
      breakDuration: createAvailabilityDto.breakDuration || 0,
      isRecurring: createAvailabilityDto.isRecurring || false,
      recurrenceType: createAvailabilityDto.recurrenceType,
      recurrenceDays: createAvailabilityDto.recurrenceDays,
      recurrenceEndDate: createAvailabilityDto.recurrenceEndDate,
      isAvailable: true,
      status: 'active',
      tags: createAvailabilityDto.specialties || [],
    };

    return await this.createSchedule(scheduleDto, createdByUserId);
  }

  /**
   * Create room booking
   */
  async createRoomBooking(
    createBookingDto: CreateRoomBookingDto,
    createdByUserId?: string,
  ): Promise<Schedule> {
    const scheduleDto: CreateScheduleDto = {
      scheduleType: 'room_booking',
      title: createBookingDto.title,
      description: createBookingDto.description,
      roomId: createBookingDto.roomId,
      clinicId: createBookingDto.clinicId,
      startDate: createBookingDto.startDate,
      endDate: createBookingDto.endDate,
      startTime: createBookingDto.startTime,
      endTime: createBookingDto.endTime,
      maxCapacity: createBookingDto.expectedAttendees,
      priority: createBookingDto.priority || 'medium',
      requiresApproval: createBookingDto.requiresApproval || false,
      status: 'active',
      tags: [createBookingDto.purpose],
    };

    return await this.createSchedule(scheduleDto, createdByUserId);
  }

  /**
   * Create equipment schedule
   */
  async createEquipmentSchedule(
    createEquipmentDto: CreateEquipmentScheduleDto,
    createdByUserId?: string,
  ): Promise<Schedule> {
    const scheduleDto: CreateScheduleDto = {
      scheduleType: 'equipment_schedule',
      title: createEquipmentDto.title,
      equipmentId: createEquipmentDto.equipmentId,
      clinicId: createEquipmentDto.clinicId,
      startDate: createEquipmentDto.startDate,
      endDate: createEquipmentDto.endDate,
      startTime: createEquipmentDto.startTime,
      endTime: createEquipmentDto.endTime,
      userId: createEquipmentDto.assignedTechnicianId,
      isRecurring: createEquipmentDto.isRecurring || false,
      recurrenceType: createEquipmentDto.recurrenceType,
      recurrenceInterval: createEquipmentDto.recurrenceInterval,
      status: 'active',
      tags: [createEquipmentDto.scheduleType],
    };

    return await this.createSchedule(scheduleDto, createdByUserId);
  }

  /**
   * Check for schedule conflicts
   */
  async checkScheduleConflicts(conflictDto: CheckScheduleConflictDto): Promise<{
    hasConflicts: boolean;
    conflicts: Schedule[];
  }> {
    const filter: any = {
      deletedAt: { $exists: false },
      isActive: true,
      status: { $in: ['active', 'draft'] },
      scheduleType: conflictDto.scheduleType,
    };

    // Add resource-specific filters
    if (conflictDto.userId)
      filter.userId = new Types.ObjectId(conflictDto.userId);
    if (conflictDto.clinicId)
      filter.clinicId = new Types.ObjectId(conflictDto.clinicId);
    if (conflictDto.roomId) filter.roomId = conflictDto.roomId;
    if (conflictDto.equipmentId) filter.equipmentId = conflictDto.equipmentId;

    // Exclude specific schedule from conflict check
    if (conflictDto.excludeScheduleId) {
      filter._id = { $ne: new Types.ObjectId(conflictDto.excludeScheduleId) };
    }

    // Time overlap check
    const startTime = this.timeToMinutes(conflictDto.startTime);
    const endTime = this.timeToMinutes(conflictDto.endTime);
    const startDate = new Date(conflictDto.startDate);
    const endDate = new Date(conflictDto.endDate);

    // Find overlapping schedules
    const conflicts = await this.scheduleModel
      .find({
        ...filter,
        // Date overlap
        startDate: { $lte: endDate },
        endDate: { $gte: startDate },
        // Time overlap check will be done in memory for simplicity
      })
      .populate('userId', 'firstName lastName')
      .exec();

    // Filter by time overlap
    const timeConflicts = conflicts.filter((schedule) => {
      const schedStartTime = this.timeToMinutes(schedule.startTime);
      const schedEndTime = this.timeToMinutes(schedule.endTime);

      return !(endTime <= schedStartTime || startTime >= schedEndTime);
    });

    return {
      hasConflicts: timeConflicts.length > 0,
      conflicts: timeConflicts,
    };
  }

  /**
   * Get available time slots for a doctor on a specific date
   */
  async getAvailableTimeSlots(slotsDto: GetAvailableTimeSlotsDto): Promise<{
    date: string;
    availableSlots: Array<{
      startTime: string;
      endTime: string;
      duration: number;
      isAvailable: boolean;
    }>;
    totalSlots: number;
    availableCount: number;
  }> {
    const date = new Date(slotsDto.date);
    const slotDuration = slotsDto.slotDuration || 30;

    // Get doctor's availability schedule for this date
    const availability = await this.scheduleModel
      .findOne({
        scheduleType: 'doctor_availability',
        userId: new Types.ObjectId(slotsDto.userId),
        clinicId: new Types.ObjectId(slotsDto.clinicId),
        startDate: { $lte: date },
        endDate: { $gte: date },
        isAvailable: true,
        status: 'active',
        isActive: true,
        deletedAt: { $exists: false },
      })
      .exec();

    if (!availability) {
      return {
        date: slotsDto.date,
        availableSlots: [],
        totalSlots: 0,
        availableCount: 0,
      };
    }

    // Generate time slots
    const slots = this.generateTimeSlots(
      availability.startTime,
      availability.endTime,
      slotDuration,
      availability.breakDuration || 0,
    );

    // Get existing appointments for this doctor on this date
    const appointments = await this.appointmentModel
      .find({
        doctorId: new Types.ObjectId(slotsDto.userId),
        clinicId: new Types.ObjectId(slotsDto.clinicId),
        appointmentDate: {
          $gte: new Date(date.setHours(0, 0, 0, 0)),
          $lt: new Date(date.setHours(23, 59, 59, 999)),
        },
        status: { $in: ['scheduled', 'confirmed', 'in_progress'] },
        deletedAt: { $exists: false },
      })
      .exec();

    // Mark slots as unavailable if they conflict with appointments
    const appointmentTimes = appointments.map((apt) => ({
      startTime: this.timeToMinutes(apt.appointmentTime),
      endTime:
        this.timeToMinutes(apt.appointmentTime) + (apt.durationMinutes || 30),
    }));

    const availableSlots = slots.map((slot) => {
      const slotStartTime = this.timeToMinutes(slot.startTime);
      const slotEndTime = this.timeToMinutes(slot.endTime);

      const isConflict = appointmentTimes.some(
        (apt) =>
          !(slotEndTime <= apt.startTime || slotStartTime >= apt.endTime),
      );

      return {
        ...slot,
        isAvailable: !isConflict,
      };
    });

    return {
      date: slotsDto.date,
      availableSlots,
      totalSlots: slots.length,
      availableCount: availableSlots.filter((slot) => slot.isAvailable).length,
    };
  }

  /**
   * Generate time slots within a time range
   */
  private generateTimeSlots(
    startTime: string,
    endTime: string,
    slotDuration: number,
    breakDuration: number = 0,
  ): Array<{ startTime: string; endTime: string; duration: number }> {
    const slots: Array<{
      startTime: string;
      endTime: string;
      duration: number;
    }> = [];
    let currentTime = this.timeToMinutes(startTime);
    const endTimeMinutes = this.timeToMinutes(endTime);

    while (currentTime + slotDuration <= endTimeMinutes) {
      const slotEndTime = currentTime + slotDuration;

      slots.push({
        startTime: this.minutesToTime(currentTime),
        endTime: this.minutesToTime(slotEndTime),
        duration: slotDuration,
      });

      currentTime = slotEndTime + breakDuration;
    }

    return slots;
  }

  /**
   * Convert time string (HH:mm) to minutes from midnight
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Convert minutes from midnight to time string (HH:mm)
   */
  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Get calendar view of schedules
   */
  async getCalendarView(calendarDto: CalendarViewDto): Promise<{
    viewType: string;
    startDate: string;
    endDate: string;
    schedules: any[];
    summary: {
      totalSchedules: number;
      schedulesByType: { [key: string]: number };
    };
  }> {
    const filter: any = {
      deletedAt: { $exists: false },
      isActive: true,
      startDate: { $lte: new Date(calendarDto.endDate) },
      endDate: { $gte: new Date(calendarDto.startDate) },
    };

    // Apply filters
    if (calendarDto.scheduleTypes && calendarDto.scheduleTypes.length > 0) {
      filter.scheduleType = { $in: calendarDto.scheduleTypes };
    }

    if (calendarDto.userIds && calendarDto.userIds.length > 0) {
      filter.userId = {
        $in: calendarDto.userIds.map((id) => new Types.ObjectId(id)),
      };
    }

    if (calendarDto.clinicIds && calendarDto.clinicIds.length > 0) {
      filter.clinicId = {
        $in: calendarDto.clinicIds.map((id) => new Types.ObjectId(id)),
      };
    }

    if (calendarDto.roomIds && calendarDto.roomIds.length > 0) {
      filter.roomId = { $in: calendarDto.roomIds };
    }

    const schedules = await this.scheduleModel
      .find(filter)
      .populate('userId', 'firstName lastName')
      .populate('clinicId', 'name')
      .sort({ startDate: 1, startTime: 1 })
      .exec();

    // Group schedules by type for summary
    const schedulesByType = schedules.reduce((acc, schedule) => {
      acc[schedule.scheduleType] = (acc[schedule.scheduleType] || 0) + 1;
      return acc;
    }, {});

    return {
      viewType: calendarDto.viewType,
      startDate: calendarDto.startDate,
      endDate: calendarDto.endDate,
      schedules: schedules.map((schedule) => ({
        id: schedule._id,
        title: schedule.title,
        scheduleType: schedule.scheduleType,
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        status: schedule.status,
        priority: schedule.priority,
        color: schedule.color,
        user: schedule.userId,
        clinic: schedule.clinicId,
        roomId: schedule.roomId,
        equipmentId: schedule.equipmentId,
        isRecurring: schedule.isRecurring,
        isAvailable: schedule.isAvailable,
        isBlocked: schedule.isBlocked,
        tags: schedule.tags,
      })),
      summary: {
        totalSchedules: schedules.length,
        schedulesByType,
      },
    };
  }

  /**
   * Get schedule statistics
   */
  async getScheduleStats(): Promise<ScheduleStatsDto> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(
      now.getTime() - now.getDay() * 24 * 60 * 60 * 1000,
    );
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalSchedules,
      activeSchedules,
      schedulesToday,
      schedulesThisWeek,
      schedulesThisMonth,
      schedulesByType,
      upcomingSchedules,
      monthlyTrend,
    ] = await Promise.all([
      this.scheduleModel.countDocuments({ deletedAt: { $exists: false } }),
      this.scheduleModel.countDocuments({
        deletedAt: { $exists: false },
        isActive: true,
        status: 'active',
      }),
      this.scheduleModel.countDocuments({
        deletedAt: { $exists: false },
        startDate: { $lte: today },
        endDate: { $gte: today },
        isActive: true,
      }),
      this.scheduleModel.countDocuments({
        deletedAt: { $exists: false },
        startDate: { $gte: startOfWeek },
        isActive: true,
      }),
      this.scheduleModel.countDocuments({
        deletedAt: { $exists: false },
        startDate: { $gte: startOfMonth },
        isActive: true,
      }),

      // Aggregate by schedule type
      this.scheduleModel.aggregate([
        {
          $match: {
            deletedAt: { $exists: false },
            isActive: true,
          },
        },
        {
          $group: {
            _id: '$scheduleType',
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
      ]),

      // Upcoming schedules (next 7 days)
      this.scheduleModel
        .find({
          deletedAt: { $exists: false },
          startDate: {
            $gte: today,
            $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
          isActive: true,
          status: 'active',
        })
        .select('title startDate startTime scheduleType')
        .sort({ startDate: 1, startTime: 1 })
        .limit(10)
        .exec(),

      // Monthly trend (last 6 months)
      this.scheduleModel.aggregate([
        {
          $match: {
            deletedAt: { $exists: false },
            startDate: {
              $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1),
            },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$startDate' },
              month: { $month: '$startDate' },
            },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 },
        },
      ]),
    ]);

    // Process results
    const typeStats = schedulesByType.map((item) => ({
      type: item._id,
      count: item.count,
      percentage:
        totalSchedules > 0
          ? Math.round((item.count / totalSchedules) * 100)
          : 0,
    }));

    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const trend = monthlyTrend.map((item) => ({
      month: `${monthNames[item._id.month - 1]} ${item._id.year}`,
      count: item.count,
    }));

    const upcoming = upcomingSchedules.map((schedule) => ({
      scheduleId: (schedule._id as any).toString(),
      title: schedule.title,
      startDate: schedule.startDate,
      startTime: schedule.startTime,
      scheduleType: schedule.scheduleType,
    }));

    return {
      totalSchedules,
      activeSchedules,
      schedulesToday,
      schedulesThisWeek,
      schedulesThisMonth,
      schedulesByType: typeStats,
      doctorUtilization: [], // Would implement doctor utilization calculation
      roomUtilization: [], // Would implement room utilization calculation
      conflictingSchedules: 0, // Would implement conflict detection
      pendingApprovals: 0, // Would implement approval tracking
      recurringSchedules: 0, // Would implement recurring count
      oneTimeSchedules: 0, // Would implement one-time count
      averageSlotDuration: 30, // Would calculate from actual data
      upcomingSchedules: upcoming,
      monthlyTrend: trend,
    };
  }

  /**
   * Bulk schedule actions
   */
  async bulkScheduleAction(
    bulkActionDto: BulkScheduleActionDto,
    actionByUserId?: string,
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const { scheduleIds, action, reason, effectiveDate } = bulkActionDto;
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const scheduleId of scheduleIds) {
      try {
        switch (action) {
          case 'activate':
            await this.updateSchedule(
              scheduleId,
              { status: 'active' },
              actionByUserId,
            );
            break;
          case 'deactivate':
            await this.updateSchedule(
              scheduleId,
              { status: 'inactive' },
              actionByUserId,
            );
            break;
          case 'cancel':
            await this.updateSchedule(
              scheduleId,
              { status: 'cancelled' },
              actionByUserId,
            );
            break;
          case 'approve':
            await this.approveSchedule(scheduleId, actionByUserId);
            break;
          case 'reject':
            await this.rejectSchedule(
              scheduleId,
              reason || 'No reason provided',
              actionByUserId,
            );
            break;
        }
        success++;
      } catch (error) {
        failed++;
        errors.push(`Schedule ${scheduleId}: ${error.message}`);
      }
    }

    return { success, failed, errors };
  }

  /**
   * Approve schedule
   */
  private async approveSchedule(
    scheduleId: string,
    approvedByUserId?: string,
  ): Promise<void> {
    await this.scheduleModel.findByIdAndUpdate(scheduleId, {
      $set: {
        approvalStatus: 'approved',
        approvedBy: approvedByUserId
          ? new Types.ObjectId(approvedByUserId)
          : undefined,
        approvedAt: new Date(),
        status: 'active',
      },
    });
  }

  /**
   * Reject schedule
   */
  private async rejectSchedule(
    scheduleId: string,
    reason: string,
    rejectedByUserId?: string,
  ): Promise<void> {
    await this.scheduleModel.findByIdAndUpdate(scheduleId, {
      $set: {
        approvalStatus: 'rejected',
        rejectionReason: reason,
        approvedBy: rejectedByUserId
          ? new Types.ObjectId(rejectedByUserId)
          : undefined,
        approvedAt: new Date(),
        status: 'cancelled',
      },
    });
  }
}
