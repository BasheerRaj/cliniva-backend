import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Appointment } from '../database/schemas/appointment.schema';
import { Patient } from '../database/schemas/patient.schema';
import { User } from '../database/schemas/user.schema';
import { Clinic } from '../database/schemas/clinic.schema';
import { Service } from '../database/schemas/service.schema';
import { WorkingHoursIntegrationService } from './services/working-hours-integration.service';
import { NotificationService } from '../notification/notification.service';
import { AuditService } from '../auth/audit.service';
import { ERROR_MESSAGES } from '../common/utils/error-messages.constant';
import {
  CreateAppointmentDto,
  UpdateAppointmentDto,
  RescheduleAppointmentDto,
  CancelAppointmentDto,
  AppointmentSearchQueryDto,
  BulkCreateAppointmentDto,
  AppointmentAvailabilityQueryDto,
  AppointmentStatsDto,
  TimeSlotDto,
  DayScheduleDto,
  AppointmentConflictDto,
  ConfirmAppointmentDto,
} from './dto';

@Injectable()
export class AppointmentService {
  private readonly logger = new Logger(AppointmentService.name);

  constructor(
    @InjectModel('Appointment')
    private readonly appointmentModel: Model<Appointment>,
    @InjectModel('Patient') private readonly patientModel: Model<Patient>,
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('Clinic') private readonly clinicModel: Model<Clinic>,
    @InjectModel('Service') private readonly serviceModel: Model<Service>,
    private readonly workingHoursIntegrationService: WorkingHoursIntegrationService,
    private readonly notificationService: NotificationService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Validate appointment data and check for conflicts
   */
  private async validateAppointmentData(
    appointmentDto: CreateAppointmentDto | UpdateAppointmentDto,
    excludeAppointmentId?: string,
  ): Promise<void> {
    const {
      patientId,
      doctorId,
      clinicId,
      serviceId,
      appointmentDate,
      appointmentTime,
    } = appointmentDto;

    // Validate patient exists
    if (patientId) {
      const patient = await this.patientModel.findOne({
        _id: new Types.ObjectId(patientId),
        deletedAt: { $exists: false },
      });
      if (!patient) {
        throw new NotFoundException('Patient not found');
      }
    }

    // Validate doctor exists and is active
    if (doctorId) {
      const doctor = await this.userModel.findOne({
        _id: new Types.ObjectId(doctorId),
        role: { $in: ['doctor', 'admin', 'owner'] },
        isActive: true,
      });
      if (!doctor) {
        throw new NotFoundException('Doctor not found or inactive');
      }
    }

    // Validate clinic exists and is active
    if (clinicId) {
      const clinic = await this.clinicModel.findById(clinicId);
      if (!clinic) {
        throw new NotFoundException('Clinic not found or inactive');
      }
    }

    // Validate service exists and is active
    if (serviceId) {
      const service = await this.serviceModel.findById(serviceId);
      if (!service) {
        throw new NotFoundException({
          message: {
            ar: 'الخدمة غير موجودة',
            en: 'Service not found',
          },
        });
      }

      if (!service.isActive) {
        throw new BadRequestException({
          message: {
            ar: 'الخدمة غير نشطة حالياً. لا يمكن حجز مواعيد',
            en: 'Service is currently inactive. Cannot book appointments',
          },
          serviceId: service._id,
          serviceName: service.name,
          deactivationReason: service.deactivationReason,
        });
      }
    }

    // Validate appointment date and time
    if (appointmentDate && appointmentTime) {
      const appointmentDateTime = new Date(
        `${appointmentDate}T${appointmentTime}:00`,
      );
      const now = new Date();

      // Check if appointment is in the past
      if (appointmentDateTime < now) {
        throw new BadRequestException(
          'Cannot schedule appointments in the past',
        );
      }

      // Check if appointment is too far in the future (1 year)
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(now.getFullYear() + 1);
      if (appointmentDateTime > oneYearFromNow) {
        throw new BadRequestException(
          'Cannot schedule appointments more than 1 year in advance',
        );
      }

      // Working Hours and Holiday Validation
      if (doctorId && clinicId) {
        const effectiveHours =
          await this.workingHoursIntegrationService.getEffectiveWorkingHours(
            doctorId,
            clinicId.toString(),
            new Date(appointmentDate),
          );

        if (!effectiveHours) {
          throw new BadRequestException({
            message: ERROR_MESSAGES.FACILITY_CLOSED_OR_HOLIDAY,
          });
        }

        const duration = (appointmentDto as any).durationMinutes || 30;
        const appointmentEndTime = this.addMinutesToTime(
          appointmentTime,
          duration,
        );

        // Check if within opening/closing hours
        if (
          appointmentTime < effectiveHours.openingTime ||
          appointmentEndTime > effectiveHours.closingTime
        ) {
          throw new BadRequestException({
            message: ERROR_MESSAGES.APPOINTMENT_OUTSIDE_WORKING_HOURS,
            details: {
              openingTime: effectiveHours.openingTime,
              closingTime: effectiveHours.closingTime,
            },
          });
        }

        // Check for break time overlap
        if (effectiveHours.breakStartTime && effectiveHours.breakEndTime) {
          if (
            appointmentTime < effectiveHours.breakEndTime &&
            appointmentEndTime > effectiveHours.breakStartTime
          ) {
            throw new BadRequestException({
              message: ERROR_MESSAGES.APPOINTMENT_OVERLAPS_BREAK,
            });
          }
        }

        // Check for blocked time
        const isBlocked =
          await this.workingHoursIntegrationService.isTimeBlocked(
            doctorId,
            new Date(appointmentDate),
            appointmentTime,
            appointmentEndTime,
          );

        if (isBlocked) {
          throw new BadRequestException({
            message: ERROR_MESSAGES.TIME_SLOT_BLOCKED,
          });
        }
      }

      // Check for conflicts
      if (patientId && doctorId) {
        const conflicts = await this.checkAppointmentConflicts(
          patientId,
          doctorId,
          appointmentDate,
          appointmentTime,
          (appointmentDto as any).durationMinutes || 30,
          excludeAppointmentId,
        );

        if (conflicts.length > 0) {
          throw new ConflictException(
            `Appointment conflicts detected: ${conflicts.map((c) => c.message).join(', ')}`,
          );
        }
      }
    }
  }

  /**
   * Check for appointment conflicts
   */
  async checkAppointmentConflicts(
    patientId: string,
    doctorId: string,
    appointmentDate: string,
    appointmentTime: string,
    durationMinutes: number = 30,
    excludeAppointmentId?: string,
  ): Promise<AppointmentConflictDto[]> {
    const conflicts: AppointmentConflictDto[] = [];

    const appointmentStart = new Date(
      `${appointmentDate}T${appointmentTime}:00`,
    );
    const appointmentEnd = new Date(
      appointmentStart.getTime() + durationMinutes * 60000,
    );

    // Build query to find overlapping appointments
    const overlapQuery: any = {
      $or: [
        {
          $and: [
            {
              $expr: {
                $lte: [
                  {
                    $dateFromString: {
                      dateString: {
                        $concat: [
                          {
                            $dateToString: {
                              format: '%Y-%m-%d',
                              date: '$appointmentDate',
                            },
                          },
                          'T',
                          '$appointmentTime',
                          ':00',
                        ],
                      },
                    },
                  },
                  appointmentStart,
                ],
              },
            },
            {
              $expr: {
                $gt: [
                  {
                    $add: [
                      {
                        $dateFromString: {
                          dateString: {
                            $concat: [
                              {
                                $dateToString: {
                                  format: '%Y-%m-%d',
                                  date: '$appointmentDate',
                                },
                              },
                              'T',
                              '$appointmentTime',
                              ':00',
                            ],
                          },
                        },
                      },
                      { $multiply: ['$durationMinutes', 60000] },
                    ],
                  },
                  appointmentStart,
                ],
              },
            },
          ],
        },
      ],
      status: { $nin: ['cancelled', 'no_show'] },
      deletedAt: { $exists: false },
    };

    if (excludeAppointmentId) {
      overlapQuery._id = { $ne: new Types.ObjectId(excludeAppointmentId) };
    }

    // Check doctor conflicts
    const doctorConflicts = await this.appointmentModel.find({
      ...overlapQuery,
      doctorId: new Types.ObjectId(doctorId),
    });

    if (doctorConflicts.length > 0) {
      conflicts.push({
        conflictType: 'doctor_busy',
        message: 'Doctor has another appointment at this time',
        conflictingAppointmentId: (doctorConflicts[0] as any)._id.toString(),
      });
    }

    // Check patient conflicts
    const patientConflicts = await this.appointmentModel.find({
      ...overlapQuery,
      patientId: new Types.ObjectId(patientId),
    });

    if (patientConflicts.length > 0) {
      conflicts.push({
        conflictType: 'patient_busy',
        message: 'Patient has another appointment at this time',
        conflictingAppointmentId: (patientConflicts[0] as any)._id.toString(),
      });
    }

    return conflicts;
  }

  /**
   * Create a new appointment
   */
  async createAppointment(
    createAppointmentDto: CreateAppointmentDto,
    createdByUserId?: string,
  ): Promise<Appointment> {
    this.logger.log(
      `Creating appointment for patient ${createAppointmentDto.patientId}`,
    );

    await this.validateAppointmentData(createAppointmentDto);

    // Get service details for default duration if not provided
    // Note: Service validation already checked in validateAppointmentData
    let durationMinutes = createAppointmentDto.durationMinutes;
    if (!durationMinutes) {
      const service = await this.serviceModel.findById(
        createAppointmentDto.serviceId,
      );
      durationMinutes = service?.durationMinutes || 30;
    }

    const appointmentData = {
      ...createAppointmentDto,
      patientId: new Types.ObjectId(createAppointmentDto.patientId),
      doctorId: new Types.ObjectId(createAppointmentDto.doctorId),
      clinicId: new Types.ObjectId(createAppointmentDto.clinicId),
      serviceId: new Types.ObjectId(createAppointmentDto.serviceId),
      appointmentDate: new Date(createAppointmentDto.appointmentDate),
      durationMinutes,
      status: createAppointmentDto.status || 'scheduled',
      urgencyLevel: createAppointmentDto.urgencyLevel || 'medium',
      createdBy: createdByUserId
        ? new Types.ObjectId(createdByUserId)
        : undefined,
    };

    const appointment = new this.appointmentModel(appointmentData);
    const savedAppointment = await appointment.save();

    this.logger.log(
      `Appointment created successfully with ID: ${savedAppointment._id}`,
    );

    // Send notification to patient
    await this.notificationService.create({
      recipientId: createAppointmentDto.patientId,
      title: 'Appointment Booked',
      message: `Your appointment has been scheduled for ${createAppointmentDto.appointmentDate} at ${createAppointmentDto.appointmentTime}`,
      notificationType: 'appointment_booked',
      priority: 'normal',
      relatedEntityType: 'appointment',
      relatedEntityId: (savedAppointment as any)._id.toString(),
      deliveryMethod: 'in_app',
    });

    // Send notification to doctor
    await this.notificationService.create({
      recipientId: createAppointmentDto.doctorId,
      title: 'New Appointment Booked',
      message: `A new appointment has been scheduled for ${createAppointmentDto.appointmentDate} at ${createAppointmentDto.appointmentTime}`,
      notificationType: 'appointment_booked',
      priority: 'normal',
      relatedEntityType: 'appointment',
      relatedEntityId: (savedAppointment as any)._id.toString(),
      deliveryMethod: 'in_app',
    });

    if (createdByUserId) {
      await this.auditService.logSecurityEvent({
        eventType: 'APPOINTMENT_CREATED',
        userId: createdByUserId,
        actorId: createdByUserId,
        ipAddress: '0.0.0.0',
        userAgent: 'System',
        timestamp: new Date(),
        metadata: {
          appointmentId: (savedAppointment as any)._id.toString(),
          patientId: createAppointmentDto.patientId,
          doctorId: createAppointmentDto.doctorId,
        },
      });
    }

    return savedAppointment;
  }

  /**
   * Get appointments with filtering and pagination
   */
  async getAppointments(query: AppointmentSearchQueryDto): Promise<{
    appointments: Appointment[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      search,
      patientId,
      doctorId,
      clinicId,
      serviceId,
      appointmentDate,
      dateFrom,
      dateTo,
      status,
      urgencyLevel,
      page = '1',
      limit = '10',
      sortBy = 'appointmentDate',
      sortOrder = 'desc',
    } = query;

    // Build filter object
    const filter: any = {
      deletedAt: { $exists: false },
    };

    // Individual field filters
    if (patientId) filter.patientId = new Types.ObjectId(patientId);
    if (doctorId) filter.doctorId = new Types.ObjectId(doctorId);
    if (clinicId) filter.clinicId = new Types.ObjectId(clinicId);
    if (serviceId) filter.serviceId = new Types.ObjectId(serviceId);
    if (status) filter.status = status;
    if (urgencyLevel) filter.urgencyLevel = urgencyLevel;

    // Date filtering
    if (appointmentDate) {
      filter.appointmentDate = new Date(appointmentDate);
    } else if (dateFrom || dateTo) {
      filter.appointmentDate = {};
      if (dateFrom) filter.appointmentDate.$gte = new Date(dateFrom);
      if (dateTo) filter.appointmentDate.$lte = new Date(dateTo);
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.max(1, Math.min(100, parseInt(limit)));
    const skip = (pageNum - 1) * pageSize;

    // Sorting
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [appointments, total] = await Promise.all([
      this.appointmentModel
        .find(filter)
        .populate('patientId', 'firstName lastName phone email')
        .populate('doctorId', 'firstName lastName email')
        .populate('clinicId', 'name address')
        .populate('serviceId', 'name durationMinutes price')
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .exec(),
      this.appointmentModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      appointments,
      total,
      page: pageNum,
      totalPages,
    };
  }

  /**
   * Get appointment by ID
   */
  async getAppointmentById(appointmentId: string): Promise<Appointment> {
    if (!Types.ObjectId.isValid(appointmentId)) {
      throw new BadRequestException('Invalid appointment ID format');
    }

    const appointment = await this.appointmentModel
      .findOne({
        _id: new Types.ObjectId(appointmentId),
        deletedAt: { $exists: false },
      })
      .populate('patientId', 'firstName lastName phone email dateOfBirth')
      .populate('doctorId', 'firstName lastName email phone')
      .populate('clinicId', 'name address phone')
      .populate('serviceId', 'name description durationMinutes price')
      .exec();

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return appointment;
  }

  /**
   * Update appointment
   */
  async updateAppointment(
    appointmentId: string,
    updateAppointmentDto: UpdateAppointmentDto,
    updatedByUserId?: string,
  ): Promise<Appointment> {
    if (!Types.ObjectId.isValid(appointmentId)) {
      throw new BadRequestException('Invalid appointment ID format');
    }

    this.logger.log(`Updating appointment: ${appointmentId}`);

    await this.validateAppointmentData(updateAppointmentDto, appointmentId);

    const updateData: any = {
      ...updateAppointmentDto,
      updatedBy: updatedByUserId
        ? new Types.ObjectId(updatedByUserId)
        : undefined,
    };

    // Convert IDs to ObjectId if provided
    if (updateAppointmentDto.patientId) {
      updateData.patientId = new Types.ObjectId(updateAppointmentDto.patientId);
    }
    if (updateAppointmentDto.doctorId) {
      updateData.doctorId = new Types.ObjectId(updateAppointmentDto.doctorId);
    }
    if (updateAppointmentDto.clinicId) {
      updateData.clinicId = new Types.ObjectId(updateAppointmentDto.clinicId);
    }
    if (updateAppointmentDto.serviceId) {
      updateData.serviceId = new Types.ObjectId(updateAppointmentDto.serviceId);
    }
    if (updateAppointmentDto.appointmentDate) {
      updateData.appointmentDate = new Date(
        updateAppointmentDto.appointmentDate,
      );
    }

    const appointment = await this.appointmentModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(appointmentId),
          deletedAt: { $exists: false },
        },
        { $set: updateData },
        { new: true, runValidators: true },
      )
      .exec();

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    this.logger.log(`Appointment updated successfully: ${appointmentId}`);
    return appointment;
  }

  /**
   * Reschedule appointment
   */
  async rescheduleAppointment(
    appointmentId: string,
    rescheduleDto: RescheduleAppointmentDto,
    updatedByUserId?: string,
  ): Promise<Appointment> {
    if (!Types.ObjectId.isValid(appointmentId)) {
      throw new BadRequestException('Invalid appointment ID format');
    }

    const appointment = await this.getAppointmentById(appointmentId);

    // Check if appointment can be rescheduled
    if (['completed', 'cancelled', 'no_show'].includes(appointment.status)) {
      throw new BadRequestException(
        'Cannot reschedule appointment with current status',
      );
    }

    // Validate new date/time and check conflicts
    const conflicts = await this.checkAppointmentConflicts(
      appointment.patientId.toString(),
      appointment.doctorId.toString(),
      rescheduleDto.newAppointmentDate,
      rescheduleDto.newAppointmentTime,
      appointment.durationMinutes,
      appointmentId,
    );

    if (conflicts.length > 0) {
      throw new ConflictException(
        `Cannot reschedule: ${conflicts.map((c) => c.message).join(', ')}`,
      );
    }

    const updateData: any = {
      appointmentDate: new Date(rescheduleDto.newAppointmentDate),
      appointmentTime: rescheduleDto.newAppointmentTime,
      notes: rescheduleDto.rescheduleReason
        ? `${appointment.notes || ''}\nRescheduled: ${rescheduleDto.rescheduleReason}`.trim()
        : appointment.notes,
      updatedBy: updatedByUserId
        ? new Types.ObjectId(updatedByUserId)
        : undefined,
    };

    const updatedAppointment = await this.appointmentModel
      .findByIdAndUpdate(appointmentId, updateData, { new: true })
      .exec();

    this.logger.log(`Appointment rescheduled: ${appointmentId}`);

    // Send notification to patient
    await this.notificationService.create({
      recipientId: appointment.patientId.toString(),
      title: 'Appointment Rescheduled',
      message: `Your appointment has been rescheduled to ${rescheduleDto.newAppointmentDate} at ${rescheduleDto.newAppointmentTime}`,
      notificationType: 'appointment_rescheduled',
      priority: 'high',
      relatedEntityType: 'appointment',
      relatedEntityId: appointmentId,
      deliveryMethod: 'in_app',
    });

    // Send notification to doctor
    await this.notificationService.create({
      recipientId: appointment.doctorId.toString(),
      title: 'Appointment Rescheduled',
      message: `An appointment has been rescheduled to ${rescheduleDto.newAppointmentDate} at ${rescheduleDto.newAppointmentTime}`,
      notificationType: 'appointment_rescheduled',
      priority: 'normal',
      relatedEntityType: 'appointment',
      relatedEntityId: appointmentId,
      deliveryMethod: 'in_app',
    });

    if (updatedByUserId) {
      await this.auditService.logSecurityEvent({
        eventType: 'APPOINTMENT_RESCHEDULED',
        userId: updatedByUserId,
        actorId: updatedByUserId,
        ipAddress: '0.0.0.0',
        userAgent: 'System',
        timestamp: new Date(),
        metadata: {
          appointmentId,
          newDate: rescheduleDto.newAppointmentDate,
          newTime: rescheduleDto.newAppointmentTime,
        },
      });
    }

    return updatedAppointment!;
  }

  /**
   * Cancel appointment
   */
  async cancelAppointment(
    appointmentId: string,
    cancelDto: CancelAppointmentDto,
    updatedByUserId?: string,
  ): Promise<Appointment> {
    if (!Types.ObjectId.isValid(appointmentId)) {
      throw new BadRequestException('Invalid appointment ID format');
    }

    const appointment = await this.getAppointmentById(appointmentId);

    // Check if appointment can be cancelled
    if (['completed', 'cancelled'].includes(appointment.status)) {
      throw new BadRequestException(
        'Cannot cancel appointment with current status',
      );
    }

    const updateData: any = {
      status: 'cancelled',
      cancellationReason: cancelDto.cancellationReason,
      updatedBy: updatedByUserId
        ? new Types.ObjectId(updatedByUserId)
        : undefined,
    };

    const updatedAppointment = await this.appointmentModel
      .findByIdAndUpdate(appointmentId, updateData, { new: true })
      .exec();

    this.logger.log(`Appointment cancelled: ${appointmentId}`);

    // Send notification to patient
    await this.notificationService.create({
      recipientId: appointment.patientId.toString(),
      title: 'Appointment Cancelled',
      message: `Your appointment has been cancelled. Reason: ${cancelDto.cancellationReason || 'No reason provided'}`,
      notificationType: 'appointment_cancelled',
      priority: 'high',
      relatedEntityType: 'appointment',
      relatedEntityId: appointmentId,
      deliveryMethod: 'in_app',
    });

    // Send notification to doctor
    await this.notificationService.create({
      recipientId: appointment.doctorId.toString(),
      title: 'Appointment Cancelled',
      message: `An appointment has been cancelled. Reason: ${cancelDto.cancellationReason || 'No reason provided'}`,
      notificationType: 'appointment_cancelled',
      priority: 'normal',
      relatedEntityType: 'appointment',
      relatedEntityId: appointmentId,
      deliveryMethod: 'in_app',
    });

    if (updatedByUserId) {
      await this.auditService.logSecurityEvent({
        eventType: 'APPOINTMENT_CANCELLED',
        userId: updatedByUserId,
        actorId: updatedByUserId,
        ipAddress: '0.0.0.0',
        userAgent: 'System',
        timestamp: new Date(),
        metadata: {
          appointmentId,
          reason: cancelDto.cancellationReason,
        },
      });
    }

    return updatedAppointment!;
  }

  /**
   * Confirm appointment
   */
  async confirmAppointment(
    appointmentId: string,
    confirmDto: ConfirmAppointmentDto,
    updatedByUserId?: string,
  ): Promise<Appointment> {
    if (!Types.ObjectId.isValid(appointmentId)) {
      throw new BadRequestException('Invalid appointment ID format');
    }

    const appointment = await this.getAppointmentById(appointmentId);

    if (appointment.status !== 'scheduled') {
      throw new BadRequestException(
        'Only scheduled appointments can be confirmed',
      );
    }

    const updateData: any = {
      status: 'confirmed',
      notes: confirmDto.confirmationNotes
        ? `${appointment.notes || ''}\nConfirmation: ${confirmDto.confirmationNotes}`.trim()
        : appointment.notes,
      updatedBy: updatedByUserId
        ? new Types.ObjectId(updatedByUserId)
        : undefined,
    };

    const updatedAppointment = await this.appointmentModel
      .findByIdAndUpdate(appointmentId, updateData, { new: true })
      .exec();

    this.logger.log(`Appointment confirmed: ${appointmentId}`);

    // Send notification to patient
    await this.notificationService.create({
      recipientId: appointment.patientId.toString(),
      title: 'Appointment Confirmed',
      message: `Your appointment has been confirmed for ${appointment.appointmentDate.toISOString().split('T')[0]} at ${appointment.appointmentTime}. ${confirmDto.confirmationNotes || ''}`,
      notificationType: 'appointment_confirmed',
      priority: 'high',
      relatedEntityType: 'appointment',
      relatedEntityId: appointmentId,
      deliveryMethod: 'in_app',
    });

    if (updatedByUserId) {
      await this.auditService.logSecurityEvent({
        eventType: 'APPOINTMENT_CONFIRMED',
        userId: updatedByUserId,
        actorId: updatedByUserId,
        ipAddress: '0.0.0.0',
        userAgent: 'System',
        timestamp: new Date(),
        metadata: {
          appointmentId,
          notes: confirmDto.confirmationNotes,
        },
      });
    }

    return updatedAppointment!;
  }

  /**
   * Soft delete appointment
   */
  async deleteAppointment(
    appointmentId: string,
    deletedByUserId?: string,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(appointmentId)) {
      throw new BadRequestException('Invalid appointment ID format');
    }

    this.logger.log(`Soft deleting appointment: ${appointmentId}`);

    const result = await this.appointmentModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(appointmentId),
          deletedAt: { $exists: false },
        },
        {
          $set: {
            deletedAt: new Date(),
            updatedBy: deletedByUserId
              ? new Types.ObjectId(deletedByUserId)
              : undefined,
          },
        },
      )
      .exec();

    if (!result) {
      throw new NotFoundException('Appointment not found');
    }

    this.logger.log(`Appointment soft deleted successfully: ${appointmentId}`);
  }

  /**
   * Get doctor availability for a specific date
   */
  async getDoctorAvailability(
    query: AppointmentAvailabilityQueryDto,
  ): Promise<DayScheduleDto> {
    const { doctorId, date, clinicId, durationMinutes = 30 } = query;
    const bookingDate = new Date(date);

    // Clinic ID is required for working hours integration
    if (!clinicId) {
      return {
        date,
        doctorId,
        clinicId: '',
        workingHours: { start: '00:00', end: '00:00', breaks: [] },
        timeSlots: [],
        totalSlots: 0,
        availableSlots: 0,
        bookedSlots: 0,
      };
    }

    // Get effective working hours for this day
    const effectiveHours =
      await this.workingHoursIntegrationService.getEffectiveWorkingHours(
        doctorId,
        clinicId,
        bookingDate,
      );

    if (!effectiveHours) {
      return {
        date,
        doctorId,
        clinicId: clinicId || '',
        workingHours: { start: '00:00', end: '00:00', breaks: [] },
        timeSlots: [],
        totalSlots: 0,
        availableSlots: 0,
        bookedSlots: 0,
      };
    }

    // Get existing appointments for the doctor on this date
    const existingAppointments = await this.appointmentModel
      .find({
        doctorId: new Types.ObjectId(doctorId),
        appointmentDate: {
          $gte: new Date(bookingDate.setHours(0, 0, 0, 0)),
          $lte: new Date(bookingDate.setHours(23, 59, 59, 999)),
        },
        status: { $nin: ['cancelled', 'no_show'] },
        deletedAt: { $exists: false },
      })
      .sort({ appointmentTime: 1 })
      .exec();

    const timeSlots: TimeSlotDto[] = [];

    // Parse times
    const [startHour, startMin] = effectiveHours.openingTime
      .split(':')
      .map(Number);
    const [endHour, endMin] = effectiveHours.closingTime.split(':').map(Number);

    let currentHour = startHour;
    let currentMin = startMin;

    while (
      currentHour < endHour ||
      (currentHour === endHour && currentMin < endMin)
    ) {
      const timeStr = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
      const nextTime = this.addMinutesToTime(timeStr, durationMinutes);

      // Stop if next slot exceeds closing time
      if (nextTime > effectiveHours.closingTime) break;

      // Check if slot is in break time
      const isBreak = !!(
        effectiveHours.breakStartTime &&
        effectiveHours.breakEndTime &&
        timeStr >= effectiveHours.breakStartTime &&
        timeStr < effectiveHours.breakEndTime
      );

      // Check if slot is blocked
      const isBlocked = await this.workingHoursIntegrationService.isTimeBlocked(
        doctorId,
        bookingDate,
        timeStr,
        nextTime,
      );

      // Check if slot is already booked
      const isBooked = existingAppointments.some((apt) => {
        const aptStartTime = apt.appointmentTime;
        const aptEndTime = this.addMinutesToTime(
          aptStartTime,
          apt.durationMinutes,
        );
        // Overlap check: (StartA < EndB) and (EndA > StartB)
        return timeStr < aptEndTime && nextTime > aptStartTime;
      });

      const existingAppointment = existingAppointments.find(
        (apt) => apt.appointmentTime === timeStr,
      );

      let reason: string | undefined = undefined;
      if (isBreak) reason = 'Break time';
      else if (isBlocked) reason = 'Time blocked';
      else if (isBooked) reason = 'Already booked';

      timeSlots.push({
        time: timeStr,
        isAvailable: !isBreak && !isBlocked && !isBooked,
        reason,
        existingAppointmentId: existingAppointment
          ? (existingAppointment as any)._id.toString()
          : undefined,
      });

      // Increment time
      currentMin += durationMinutes;
      while (currentMin >= 60) {
        currentMin -= 60;
        currentHour += 1;
      }
    }

    const totalSlots = timeSlots.length;
    const availableSlots = timeSlots.filter((slot) => slot.isAvailable).length;
    const bookedSlots = totalSlots - availableSlots;

    return {
      date,
      doctorId,
      clinicId: clinicId || '',
      workingHours: {
        start: effectiveHours.openingTime,
        end: effectiveHours.closingTime,
        breaks:
          effectiveHours.breakStartTime && effectiveHours.breakEndTime
            ? [
                {
                  start: effectiveHours.breakStartTime,
                  end: effectiveHours.breakEndTime,
                },
              ]
            : [],
      },
      timeSlots,
      totalSlots,
      availableSlots,
      bookedSlots,
    };
  }

  /**
   * Helper method to add minutes to time string
   */
  private addMinutesToTime(timeStr: string, minutes: number): string {
    const [hours, mins] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  }

  /**
   * Get appointment statistics
   */
  async getAppointmentStats(): Promise<AppointmentStatsDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const [
      totalAppointments,
      scheduledAppointments,
      confirmedAppointments,
      completedAppointments,
      cancelledAppointments,
      noShowAppointments,
      todayAppointments,
      upcomingAppointments,
      avgDurationResult,
      topServicesResult,
      topDoctorsResult,
      urgencyDistributionResult,
    ] = await Promise.all([
      // Total appointments
      this.appointmentModel.countDocuments({ deletedAt: { $exists: false } }),

      // Status counts
      this.appointmentModel.countDocuments({
        status: 'scheduled',
        deletedAt: { $exists: false },
      }),
      this.appointmentModel.countDocuments({
        status: 'confirmed',
        deletedAt: { $exists: false },
      }),
      this.appointmentModel.countDocuments({
        status: 'completed',
        deletedAt: { $exists: false },
      }),
      this.appointmentModel.countDocuments({
        status: 'cancelled',
        deletedAt: { $exists: false },
      }),
      this.appointmentModel.countDocuments({
        status: 'no_show',
        deletedAt: { $exists: false },
      }),

      // Today's appointments
      this.appointmentModel.countDocuments({
        appointmentDate: { $gte: today, $lt: tomorrow },
        deletedAt: { $exists: false },
      }),

      // Upcoming appointments
      this.appointmentModel.countDocuments({
        appointmentDate: { $gte: today },
        status: { $in: ['scheduled', 'confirmed'] },
        deletedAt: { $exists: false },
      }),

      // Average duration
      this.appointmentModel.aggregate([
        { $match: { deletedAt: { $exists: false } } },
        { $group: { _id: null, avgDuration: { $avg: '$durationMinutes' } } },
      ]),

      // Top services
      this.appointmentModel.aggregate([
        { $match: { deletedAt: { $exists: false } } },
        { $group: { _id: '$serviceId', count: { $sum: 1 } } },
        {
          $lookup: {
            from: 'services',
            localField: '_id',
            foreignField: '_id',
            as: 'service',
          },
        },
        { $unwind: '$service' },
        {
          $project: {
            serviceId: '$_id',
            serviceName: '$service.name',
            count: 1,
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),

      // Top doctors
      this.appointmentModel.aggregate([
        { $match: { deletedAt: { $exists: false } } },
        { $group: { _id: '$doctorId', count: { $sum: 1 } } },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'doctor',
          },
        },
        { $unwind: '$doctor' },
        {
          $project: {
            doctorId: '$_id',
            doctorName: {
              $concat: ['$doctor.firstName', ' ', '$doctor.lastName'],
            },
            count: 1,
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),

      // Urgency distribution
      this.appointmentModel.aggregate([
        { $match: { deletedAt: { $exists: false } } },
        { $group: { _id: '$urgencyLevel', count: { $sum: 1 } } },
      ]),
    ]);

    // Process urgency distribution
    const urgencyDistribution = { low: 0, medium: 0, high: 0, urgent: 0 };
    urgencyDistributionResult.forEach((item) => {
      urgencyDistribution[item._id as keyof typeof urgencyDistribution] =
        item.count;
    });

    return {
      totalAppointments,
      scheduledAppointments,
      confirmedAppointments,
      completedAppointments,
      cancelledAppointments,
      noShowAppointments,
      todayAppointments,
      upcomingAppointments,
      overdueAppointments: 0, // TODO: Implement overdue logic
      averageDuration: avgDurationResult[0]?.avgDuration || 0,
      topServices: topServicesResult.map((item) => ({
        serviceId: item.serviceId.toString(),
        serviceName: item.serviceName,
        count: item.count,
      })),
      topDoctors: topDoctorsResult.map((item) => ({
        doctorId: item.doctorId.toString(),
        doctorName: item.doctorName,
        count: item.count,
      })),
      urgencyDistribution,
    };
  }

  /**
   * Get today's appointments
   */
  async getTodayAppointments(): Promise<Appointment[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    return await this.appointmentModel
      .find({
        appointmentDate: { $gte: today, $lt: tomorrow },
        deletedAt: { $exists: false },
      })
      .populate('patientId', 'firstName lastName phone')
      .populate('doctorId', 'firstName lastName')
      .populate('clinicId', 'name')
      .populate('serviceId', 'name durationMinutes')
      .sort({ appointmentTime: 1 })
      .exec();
  }

  /**
   * Get appointments for a specific patient
   */
  async getPatientAppointments(patientId: string): Promise<Appointment[]> {
    if (!Types.ObjectId.isValid(patientId)) {
      throw new BadRequestException('Invalid patient ID format');
    }

    return await this.appointmentModel
      .find({
        patientId: new Types.ObjectId(patientId),
        deletedAt: { $exists: false },
      })
      .populate('doctorId', 'firstName lastName')
      .populate('clinicId', 'name address')
      .populate('serviceId', 'name description price')
      .sort({ appointmentDate: -1, appointmentTime: -1 })
      .exec();
  }

  /**
   * Get appointments for a specific doctor
   */
  async getDoctorAppointments(
    doctorId: string,
    date?: string,
  ): Promise<Appointment[]> {
    if (!Types.ObjectId.isValid(doctorId)) {
      throw new BadRequestException('Invalid doctor ID format');
    }

    const filter: any = {
      doctorId: new Types.ObjectId(doctorId),
      deletedAt: { $exists: false },
    };

    if (date) {
      filter.appointmentDate = new Date(date);
    }

    return await this.appointmentModel
      .find(filter)
      .populate('patientId', 'firstName lastName phone email')
      .populate('clinicId', 'name')
      .populate('serviceId', 'name durationMinutes')
      .sort({ appointmentDate: 1, appointmentTime: 1 })
      .exec();
  }

  /**
   * Get upcoming appointments (next 7 days)
   */
  async getUpcomingAppointments(limit: number = 20): Promise<Appointment[]> {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    return await this.appointmentModel
      .find({
        appointmentDate: { $gte: today, $lte: nextWeek },
        status: { $in: ['scheduled', 'confirmed'] },
        deletedAt: { $exists: false },
      })
      .populate('patientId', 'firstName lastName phone')
      .populate('doctorId', 'firstName lastName')
      .populate('clinicId', 'name')
      .sort({ appointmentDate: 1, appointmentTime: 1 })
      .limit(limit)
      .exec();
  }
}
