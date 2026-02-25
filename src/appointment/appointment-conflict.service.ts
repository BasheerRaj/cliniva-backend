import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Appointment } from '../database/schemas/appointment.schema';

/**
 * Service for appointment conflict detection
 * Task 4: Implement conflict detection algorithm
 * Requirements: 3.1-3.7
 */
@Injectable()
export class AppointmentConflictService {
  private readonly logger = new Logger(AppointmentConflictService.name);

  constructor(
    @InjectModel('Appointment')
    private readonly appointmentModel: Model<Appointment>,
  ) {}

  /**
   * Task 4.1: Check for conflicting appointments
   * Requirements: 3.1-3.7
   * 
   * Queries appointments for same doctor on same date
   * Excludes cancelled and no_show appointments
   * Excludes current appointment when updating (via excludeId)
   * Calculates appointment end time from start time + duration
   * Checks for three overlap scenarios: starts-during, ends-during, contains
   * Uses compound index (doctorId, appointmentDate, appointmentTime) for performance
   * Returns list of conflicting appointments
   */
  async checkConflicts(
    doctorId: string,
    appointmentDate: Date,
    appointmentTime: string,
    duration: number,
    excludeId?: string,
  ): Promise<Appointment[]> {
    this.logger.debug(
      `Checking conflicts for doctor ${doctorId} on ${appointmentDate.toISOString().split('T')[0]} at ${appointmentTime}`,
    );

    // Parse appointment time (HH:mm format)
    const [hours, minutes] = appointmentTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + duration;

    // Build query for same doctor on same date
    const query: any = {
      doctorId: new Types.ObjectId(doctorId),
      appointmentDate: {
        $gte: new Date(appointmentDate.toISOString().split('T')[0]),
        $lt: new Date(
          new Date(appointmentDate.toISOString().split('T')[0]).getTime() +
            24 * 60 * 60 * 1000,
        ),
      },
      isDeleted: { $ne: true },
      status: { $nin: ['cancelled', 'no_show'] }, // Requirement 3.3
    };

    // Exclude current appointment when updating (Requirement 3.7)
    if (excludeId && Types.ObjectId.isValid(excludeId)) {
      query._id = { $ne: new Types.ObjectId(excludeId) };
    }

    // Get all appointments for the doctor on that date
    const existingAppointments = await this.appointmentModel
      .find(query)
      .select('appointmentTime duration patientId doctorId serviceId')
      .populate('patientId', 'firstName lastName')
      .populate('serviceId', 'name')
      .exec();

    // Check for time overlaps (Requirements 3.2, 3.6, 3.7)
    const conflicts: Appointment[] = [];

    for (const existing of existingAppointments) {
      const [existingHours, existingMinutes] = existing.appointmentTime
        .split(':')
        .map(Number);
      const existingStartMinutes = existingHours * 60 + existingMinutes;
      const existingEndMinutes = existingStartMinutes + existing.durationMinutes;

      // Check for three overlap scenarios:
      // 1. New appointment starts during existing appointment
      const startsWithin =
        startMinutes >= existingStartMinutes && startMinutes < existingEndMinutes;

      // 2. New appointment ends during existing appointment
      const endsWithin =
        endMinutes > existingStartMinutes && endMinutes <= existingEndMinutes;

      // 3. New appointment completely contains existing appointment
      const contains =
        startMinutes <= existingStartMinutes && endMinutes >= existingEndMinutes;

      if (startsWithin || endsWithin || contains) {
        conflicts.push(existing);
      }
    }

    if (conflicts.length > 0) {
      this.logger.warn(
        `Found ${conflicts.length} conflicting appointment(s) for doctor ${doctorId}`,
      );
    }

    return conflicts;
  }

  /**
   * Task 4.2: Helper method to check if conflicts exist
   * Requirements: 3.1-3.7
   * 
   * Converts checkConflicts result to boolean
   * Returns true if any conflicts found
   */
  async hasConflict(
    doctorId: string,
    appointmentDate: Date,
    appointmentTime: string,
    duration: number,
    excludeId?: string,
  ): Promise<boolean> {
    const conflicts = await this.checkConflicts(
      doctorId,
      appointmentDate,
      appointmentTime,
      duration,
      excludeId,
    );
    return conflicts.length > 0;
  }

  /**
   * Helper method to throw conflict exception with bilingual error
   * Includes conflicting appointment details in error response
   */
  throwConflictError(conflicts: Appointment[]): never {
    const conflictDetails = conflicts.map((c) => ({
      appointmentId: (c._id as Types.ObjectId).toString(),
      time: c.appointmentTime,
      duration: c.durationMinutes,
      patientName: (c.patientId as any)?.firstName
        ? `${(c.patientId as any).firstName} ${(c.patientId as any).lastName}`
        : 'Unknown',
      serviceName: (c.serviceId as any)?.name || 'Unknown',
    }));

    throw new ConflictException({
      message: {
        ar: `يوجد تعارض مع موعد آخر. الطبيب لديه ${conflicts.length} موعد متداخل`,
        en: `Appointment conflict detected. Doctor has ${conflicts.length} overlapping appointment(s)`,
      },
      conflicts: conflictDetails,
    });
  }
}
