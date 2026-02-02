import { Injectable, Logger } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection, ClientSession } from 'mongoose';
import { Appointment } from '../../database/schemas/appointment.schema';
import { WorkingHours } from '../../database/schemas/working-hours.schema';
import { Notification } from '../../database/schemas/notification.schema';
import { WorkingHoursSchedule } from './working-hours-validation.service';
import { BilingualMessage } from '../../common/types/bilingual-message.type';
import { createDynamicMessage } from '../../common/utils/error-messages.constant';

/**
 * Interface for rescheduling options
 */
export interface ReschedulingOptions {
  handleConflicts: 'reschedule' | 'notify' | 'cancel';
  notifyPatients?: boolean;
  reschedulingReason?: string;
}

/**
 * Interface for rescheduled appointment details
 */
export interface RescheduledAppointment {
  appointmentId: string;
  oldDate: string;
  oldTime: string;
  newDate?: string;
  newTime?: string;
  status: 'rescheduled' | 'marked_for_rescheduling' | 'cancelled';
}

/**
 * Interface for rescheduling result
 */
export interface ReschedulingResult {
  workingHours: WorkingHours[];
  appointmentsRescheduled: number;
  appointmentsMarkedForRescheduling: number;
  appointmentsCancelled: number;
  notificationsSent: number;
  rescheduledAppointments: RescheduledAppointment[];
}

/**
 * WorkingHoursReschedulingService
 *
 * Service for handling working hours updates with automatic appointment rescheduling.
 * Provides transaction support to ensure data consistency during complex operations.
 *
 * Business Rules:
 * - BZR-l9e0f1c4: Reschedule appointments after modification date
 * - BZR-43: Only reschedule appointments on modified days
 * - Mark appointments as "needs_rescheduling" until staff confirms
 * - Send notifications to affected patients
 * - Log all rescheduling actions for audit
 *
 * @class WorkingHoursReschedulingService
 */
@Injectable()
export class WorkingHoursReschedulingService {
  private readonly logger = new Logger(WorkingHoursReschedulingService.name);

  constructor(
    @InjectModel('Appointment')
    private readonly appointmentModel: Model<Appointment>,
    @InjectModel('WorkingHours')
    private readonly workingHoursModel: Model<WorkingHours>,
    @InjectModel('Notification')
    private readonly notificationModel: Model<Notification>,
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  /**
   * Updates working hours with automatic appointment rescheduling.
   *
   * This method performs a transactional update of working hours and handles
   * conflicting appointments according to the specified strategy. It ensures
   * data consistency by using MongoDB sessions and provides rollback capability.
   *
   * @param {string} entityType - Entity type ('user' for doctors)
   * @param {string} entityId - Entity ID (user ID for doctors)
   * @param {WorkingHoursSchedule[]} schedule - New working hours schedule
   * @param {ReschedulingOptions} options - Rescheduling options
   * @returns {Promise<ReschedulingResult>} Result with updated hours and rescheduling details
   *
   * @example
   * const result = await reschedulingService.updateWithRescheduling(
   *   'user',
   *   'doctor123',
   *   newSchedule,
   *   {
   *     handleConflicts: 'reschedule',
   *     notifyPatients: true,
   *     reschedulingReason: 'Doctor schedule change'
   *   }
   * );
   */
  async updateWithRescheduling(
    entityType: string,
    entityId: string,
    schedule: WorkingHoursSchedule[],
    options: ReschedulingOptions,
  ): Promise<ReschedulingResult> {
    const session: ClientSession = await this.connection.startSession();
    session.startTransaction();

    try {
      this.logger.log(
        `Starting working hours update with rescheduling for ${entityType}:${entityId}`,
      );

      // Step 1: Delete existing working hours
      await this.workingHoursModel.deleteMany(
        {
          entityType,
          entityId: new Types.ObjectId(entityId),
        },
        { session },
      );

      // Step 2: Create new working hours
      const workingHoursData = schedule.map((item) => ({
        entityType,
        entityId: new Types.ObjectId(entityId),
        dayOfWeek: item.dayOfWeek,
        isWorkingDay: item.isWorkingDay,
        openingTime: item.openingTime,
        closingTime: item.closingTime,
        breakStartTime: item.breakStartTime,
        breakEndTime: item.breakEndTime,
      }));

      const createdWorkingHours = await this.workingHoursModel.insertMany(
        workingHoursData,
        { session },
      );

      this.logger.log(
        `Created ${createdWorkingHours.length} working hours records`,
      );

      // Step 3: Handle appointments based on strategy
      let appointmentsRescheduled = 0;
      let appointmentsMarkedForRescheduling = 0;
      let appointmentsCancelled = 0;
      let notificationsSent = 0;
      const rescheduledAppointments: RescheduledAppointment[] = [];

      if (entityType === 'user') {
        // Get conflicting appointments
        const conflictingAppointments =
          await this.getConflictingAppointments(entityId, schedule);

        this.logger.log(
          `Found ${conflictingAppointments.length} conflicting appointments`,
        );

        if (conflictingAppointments.length > 0) {
          switch (options.handleConflicts) {
            case 'reschedule':
              // Attempt automatic rescheduling
              const rescheduled = await this.rescheduleAppointments(
                conflictingAppointments,
                schedule,
                session,
              );
              appointmentsRescheduled = rescheduled.length;
              rescheduledAppointments.push(...rescheduled);
              break;

            case 'notify':
              // Mark appointments for manual rescheduling
              const marked = await this.markForRescheduling(
                conflictingAppointments,
                options.reschedulingReason ||
                  'Working hours changed - requires rescheduling',
                session,
              );
              appointmentsMarkedForRescheduling = marked.length;
              rescheduledAppointments.push(...marked);
              break;

            case 'cancel':
              // Cancel conflicting appointments
              const cancelled = await this.cancelAppointments(
                conflictingAppointments,
                options.reschedulingReason || 'Working hours changed',
                session,
              );
              appointmentsCancelled = cancelled.length;
              rescheduledAppointments.push(...cancelled);
              break;
          }

          // Send notifications to patients if requested
          if (options.notifyPatients !== false) {
            notificationsSent = await this.notifyPatients(
              conflictingAppointments,
              options.handleConflicts,
              session,
            );
          }
        }
      }

      // Commit transaction
      await session.commitTransaction();

      this.logger.log(
        `Successfully updated working hours. Rescheduled: ${appointmentsRescheduled}, Marked: ${appointmentsMarkedForRescheduling}, Cancelled: ${appointmentsCancelled}, Notifications: ${notificationsSent}`,
      );

      return {
        workingHours: createdWorkingHours,
        appointmentsRescheduled,
        appointmentsMarkedForRescheduling,
        appointmentsCancelled,
        notificationsSent,
        rescheduledAppointments,
      };
    } catch (error) {
      // Rollback transaction on error
      await session.abortTransaction();
      this.logger.error(
        `Failed to update working hours with rescheduling: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Reschedules appointments to fit within new working hours.
   *
   * This method attempts to automatically reschedule appointments to the nearest
   * available time slot within the new working hours. If automatic rescheduling
   * is not possible, appointments are marked for manual rescheduling.
   *
   * @param {Appointment[]} appointments - Appointments to reschedule
   * @param {WorkingHoursSchedule[]} newSchedule - New working hours schedule
   * @param {ClientSession} session - MongoDB session for transaction
   * @returns {Promise<RescheduledAppointment[]>} Array of rescheduled appointment details
   *
   * @example
   * const rescheduled = await reschedulingService.rescheduleAppointments(
   *   conflictingAppointments,
   *   newSchedule,
   *   session
   * );
   */
  async rescheduleAppointments(
    appointments: Appointment[],
    newSchedule: WorkingHoursSchedule[],
    session: ClientSession,
  ): Promise<RescheduledAppointment[]> {
    const rescheduled: RescheduledAppointment[] = [];

    // Create a map of working hours by day for quick lookup
    const scheduleMap = new Map<string, WorkingHoursSchedule>();
    newSchedule.forEach((schedule) => {
      scheduleMap.set(schedule.dayOfWeek.toLowerCase(), schedule);
    });

    for (const appointment of appointments) {
      const appointmentDate = new Date(appointment.appointmentDate);
      const dayOfWeek = this.getDayOfWeek(appointmentDate);
      const workingHours = scheduleMap.get(dayOfWeek);

      // Try to find a suitable time within the same day
      if (workingHours && workingHours.isWorkingDay) {
        const newTime = this.findSuitableTime(
          appointment,
          workingHours,
        );

        if (newTime) {
          // Update appointment with new time
          await this.appointmentModel.updateOne(
            { _id: appointment._id },
            {
              $set: {
                appointmentTime: newTime,
                reschedulingReason: 'Automatically rescheduled due to working hours change',
                updatedAt: new Date(),
              },
            },
            { session },
          );

          rescheduled.push({
            appointmentId: (appointment._id as Types.ObjectId).toString(),
            oldDate: appointmentDate.toISOString().split('T')[0],
            oldTime: appointment.appointmentTime,
            newDate: appointmentDate.toISOString().split('T')[0],
            newTime,
            status: 'rescheduled',
          });

          this.logger.log(
            `Rescheduled appointment ${appointment._id} from ${appointment.appointmentTime} to ${newTime}`,
          );
        } else {
          // Mark for manual rescheduling if no suitable time found
          await this.appointmentModel.updateOne(
            { _id: appointment._id },
            {
              $set: {
                status: 'needs_rescheduling',
                reschedulingReason: 'No suitable time slot available - requires manual rescheduling',
                markedForReschedulingAt: new Date(),
                updatedAt: new Date(),
              },
            },
            { session },
          );

          rescheduled.push({
            appointmentId: (appointment._id as Types.ObjectId).toString(),
            oldDate: appointmentDate.toISOString().split('T')[0],
            oldTime: appointment.appointmentTime,
            status: 'marked_for_rescheduling',
          });
        }
      } else {
        // Day is no longer a working day - mark for manual rescheduling
        await this.appointmentModel.updateOne(
          { _id: appointment._id },
          {
            $set: {
              status: 'needs_rescheduling',
              reschedulingReason: 'Day is no longer a working day',
              markedForReschedulingAt: new Date(),
              updatedAt: new Date(),
            },
          },
          { session },
        );

        rescheduled.push({
          appointmentId: (appointment._id as Types.ObjectId).toString(),
          oldDate: appointmentDate.toISOString().split('T')[0],
          oldTime: appointment.appointmentTime,
          status: 'marked_for_rescheduling',
        });
      }
    }

    return rescheduled;
  }

  /**
   * Marks appointments for manual rescheduling.
   *
   * This method updates appointment status to indicate they need manual
   * rescheduling by staff. It records the reason and timestamp for audit purposes.
   *
   * @param {Appointment[]} appointments - Appointments to mark
   * @param {string} reason - Reason for rescheduling
   * @param {ClientSession} session - MongoDB session for transaction
   * @returns {Promise<RescheduledAppointment[]>} Array of marked appointment details
   *
   * @example
   * const marked = await reschedulingService.markForRescheduling(
   *   conflictingAppointments,
   *   'Working hours changed',
   *   session
   * );
   */
  async markForRescheduling(
    appointments: Appointment[],
    reason: string,
    session: ClientSession,
  ): Promise<RescheduledAppointment[]> {
    const marked: RescheduledAppointment[] = [];

    for (const appointment of appointments) {
      await this.appointmentModel.updateOne(
        { _id: appointment._id },
        {
          $set: {
            status: 'needs_rescheduling',
            reschedulingReason: reason,
            markedForReschedulingAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { session },
      );

      const appointmentDate = new Date(appointment.appointmentDate);
      marked.push({
        appointmentId: (appointment._id as Types.ObjectId).toString(),
        oldDate: appointmentDate.toISOString().split('T')[0],
        oldTime: appointment.appointmentTime,
        status: 'marked_for_rescheduling',
      });

      this.logger.log(
        `Marked appointment ${appointment._id} for rescheduling: ${reason}`,
      );
    }

    return marked;
  }

  /**
   * Sends notifications to patients about appointment changes.
   *
   * This method creates notification records for affected patients to inform
   * them about appointment rescheduling or cancellation. Notifications are
   * created with appropriate priority and delivery method.
   *
   * @param {Appointment[]} appointments - Appointments with changes
   * @param {string} notificationType - Type of notification ('rescheduled' | 'notify' | 'cancel')
   * @param {ClientSession} session - MongoDB session for transaction
   * @returns {Promise<number>} Number of notifications sent
   *
   * @example
   * const count = await reschedulingService.notifyPatients(
   *   appointments,
   *   'rescheduled',
   *   session
   * );
   */
  async notifyPatients(
    appointments: Appointment[],
    notificationType: 'reschedule' | 'notify' | 'cancel',
    session: ClientSession,
  ): Promise<number> {
    const notifications: any[] = [];

    for (const appointment of appointments) {
      const { title, message } = this.getNotificationContent(
        notificationType,
        appointment,
      );

      notifications.push({
        recipientId: appointment.patientId,
        title,
        message,
        notificationType: 'appointment_cancelled', // Using existing enum value
        priority: 'high',
        relatedEntityType: 'appointment',
        relatedEntityId: appointment._id,
        deliveryMethod: 'in_app',
        deliveryStatus: 'pending',
      });
    }

    if (notifications.length > 0) {
      await this.notificationModel.insertMany(notifications, { session });
      this.logger.log(`Created ${notifications.length} patient notifications`);
    }

    return notifications.length;
  }

  /**
   * Gets conflicting appointments for a doctor based on new schedule.
   *
   * @private
   * @param {string} userId - Doctor's user ID
   * @param {WorkingHoursSchedule[]} newSchedule - New working hours schedule
   * @returns {Promise<Appointment[]>} Array of conflicting appointments
   */
  private async getConflictingAppointments(
    userId: string,
    newSchedule: WorkingHoursSchedule[],
  ): Promise<Appointment[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all future appointments
    const futureAppointments = await this.appointmentModel
      .find({
        doctorId: new Types.ObjectId(userId),
        appointmentDate: { $gte: today },
        status: { $in: ['scheduled', 'confirmed'] },
        deletedAt: null,
      })
      .populate('patientId', 'firstName lastName')
      .exec();

    // Create schedule map
    const scheduleMap = new Map<string, WorkingHoursSchedule>();
    newSchedule.forEach((schedule) => {
      scheduleMap.set(schedule.dayOfWeek.toLowerCase(), schedule);
    });

    // Filter conflicting appointments
    const conflicting: Appointment[] = [];
    for (const appointment of futureAppointments) {
      const appointmentDate = new Date(appointment.appointmentDate);
      const dayOfWeek = this.getDayOfWeek(appointmentDate);
      const workingHours = scheduleMap.get(dayOfWeek);

      if (!this.isAppointmentWithinHours(appointment, workingHours)) {
        conflicting.push(appointment);
      }
    }

    return conflicting;
  }

  /**
   * Cancels appointments with a specified reason.
   *
   * @private
   * @param {Appointment[]} appointments - Appointments to cancel
   * @param {string} reason - Cancellation reason
   * @param {ClientSession} session - MongoDB session for transaction
   * @returns {Promise<RescheduledAppointment[]>} Array of cancelled appointment details
   */
  private async cancelAppointments(
    appointments: Appointment[],
    reason: string,
    session: ClientSession,
  ): Promise<RescheduledAppointment[]> {
    const cancelled: RescheduledAppointment[] = [];

    for (const appointment of appointments) {
      await this.appointmentModel.updateOne(
        { _id: appointment._id },
        {
          $set: {
            status: 'cancelled',
            cancellationReason: reason,
            updatedAt: new Date(),
          },
        },
        { session },
      );

      const appointmentDate = new Date(appointment.appointmentDate);
      cancelled.push({
        appointmentId: (appointment._id as Types.ObjectId).toString(),
        oldDate: appointmentDate.toISOString().split('T')[0],
        oldTime: appointment.appointmentTime,
        status: 'cancelled',
      });

      this.logger.log(`Cancelled appointment ${appointment._id}: ${reason}`);
    }

    return cancelled;
  }

  /**
   * Checks if an appointment falls within working hours.
   *
   * @private
   * @param {Appointment} appointment - Appointment to check
   * @param {WorkingHoursSchedule | undefined} workingHours - Working hours for the day
   * @returns {boolean} True if appointment is within working hours
   */
  private isAppointmentWithinHours(
    appointment: Appointment,
    workingHours: WorkingHoursSchedule | undefined,
  ): boolean {
    if (!workingHours || !workingHours.isWorkingDay) {
      return false;
    }

    if (!workingHours.openingTime || !workingHours.closingTime) {
      return true;
    }

    const appointmentTime = this.parseTime(appointment.appointmentTime);
    const openingTime = this.parseTime(workingHours.openingTime);
    const closingTime = this.parseTime(workingHours.closingTime);
    const appointmentEndTime =
      appointmentTime + (appointment.durationMinutes || 30);

    if (appointmentTime < openingTime || appointmentEndTime > closingTime) {
      return false;
    }

    // Check break time
    if (workingHours.breakStartTime && workingHours.breakEndTime) {
      const breakStart = this.parseTime(workingHours.breakStartTime);
      const breakEnd = this.parseTime(workingHours.breakEndTime);

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
   * Finds a suitable time slot for an appointment within working hours.
   *
   * @private
   * @param {Appointment} appointment - Appointment to reschedule
   * @param {WorkingHoursSchedule} workingHours - Working hours for the day
   * @returns {string | null} New time in HH:mm format, or null if no suitable time found
   */
  private findSuitableTime(
    appointment: Appointment,
    workingHours: WorkingHoursSchedule,
  ): string | null {
    if (!workingHours.openingTime || !workingHours.closingTime) {
      return null;
    }

    const openingTime = this.parseTime(workingHours.openingTime);
    const closingTime = this.parseTime(workingHours.closingTime);
    const duration = appointment.durationMinutes || 30;

    // Try to keep the appointment at the same time if possible
    const currentTime = this.parseTime(appointment.appointmentTime);
    if (
      currentTime >= openingTime &&
      currentTime + duration <= closingTime
    ) {
      // Check if it conflicts with break time
      if (workingHours.breakStartTime && workingHours.breakEndTime) {
        const breakStart = this.parseTime(workingHours.breakStartTime);
        const breakEnd = this.parseTime(workingHours.breakEndTime);

        if (
          !(
            (currentTime >= breakStart && currentTime < breakEnd) ||
            (currentTime + duration > breakStart &&
              currentTime + duration <= breakEnd) ||
            (currentTime < breakStart && currentTime + duration > breakEnd)
          )
        ) {
          return appointment.appointmentTime;
        }
      } else {
        return appointment.appointmentTime;
      }
    }

    // Try to find the nearest available time slot
    // Start from opening time and check every 15 minutes
    for (
      let time = openingTime;
      time + duration <= closingTime;
      time += 15
    ) {
      // Skip break time
      if (workingHours.breakStartTime && workingHours.breakEndTime) {
        const breakStart = this.parseTime(workingHours.breakStartTime);
        const breakEnd = this.parseTime(workingHours.breakEndTime);

        if (
          (time >= breakStart && time < breakEnd) ||
          (time + duration > breakStart && time + duration <= breakEnd) ||
          (time < breakStart && time + duration > breakEnd)
        ) {
          continue;
        }
      }

      return this.formatTime(time);
    }

    return null;
  }

  /**
   * Gets notification content based on notification type.
   *
   * @private
   * @param {string} notificationType - Type of notification
   * @param {Appointment} appointment - Appointment details
   * @returns {{ title: string; message: string }} Notification title and message
   */
  private getNotificationContent(
    notificationType: 'reschedule' | 'notify' | 'cancel',
    appointment: Appointment,
  ): { title: string; message: string } {
    const appointmentDate = new Date(appointment.appointmentDate);
    const dateStr = appointmentDate.toISOString().split('T')[0];

    switch (notificationType) {
      case 'reschedule':
        return {
          title: 'Appointment Rescheduled / تم إعادة جدولة الموعد',
          message: `Your appointment on ${dateStr} at ${appointment.appointmentTime} has been rescheduled due to doctor schedule changes. Please check the new time. / تم إعادة جدولة موعدك في ${dateStr} الساعة ${appointment.appointmentTime} بسبب تغيير جدول الطبيب. يرجى التحقق من الوقت الجديد.`,
        };
      case 'notify':
        return {
          title: 'Appointment Requires Rescheduling / الموعد يحتاج إعادة جدولة',
          message: `Your appointment on ${dateStr} at ${appointment.appointmentTime} needs to be rescheduled due to doctor schedule changes. Please contact us to reschedule. / موعدك في ${dateStr} الساعة ${appointment.appointmentTime} يحتاج إعادة جدولة بسبب تغيير جدول الطبيب. يرجى الاتصال بنا لإعادة الجدولة.`,
        };
      case 'cancel':
        return {
          title: 'Appointment Cancelled / تم إلغاء الموعد',
          message: `Your appointment on ${dateStr} at ${appointment.appointmentTime} has been cancelled due to doctor schedule changes. Please contact us to book a new appointment. / تم إلغاء موعدك في ${dateStr} الساعة ${appointment.appointmentTime} بسبب تغيير جدول الطبيب. يرجى الاتصال بنا لحجز موعد جديد.`,
        };
      default:
        return {
          title: 'Appointment Update / تحديث الموعد',
          message: `Your appointment on ${dateStr} at ${appointment.appointmentTime} has been updated. / تم تحديث موعدك في ${dateStr} الساعة ${appointment.appointmentTime}.`,
        };
    }
  }

  /**
   * Gets the day of week from a date.
   *
   * @private
   * @param {Date} date - Date to get day of week from
   * @returns {string} Day of week in lowercase
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
   * Parses time string (HH:mm) to minutes.
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
   * Formats minutes to time string (HH:mm).
   *
   * @private
   * @param {number} minutes - Time in minutes since midnight
   * @returns {string} Time in HH:mm format
   */
  private formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
}
