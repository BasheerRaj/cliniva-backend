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
import { AppointmentValidationService } from './services/appointment-validation.service';
import { AppointmentStatusService } from './services/appointment-status.service';
import { AppointmentCalendarService } from './services/appointment-calendar.service';
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
  ChangeStatusDto,
  StartAppointmentDto,
  EndAppointmentDto,
  ConcludeAppointmentDto,
  CalendarQueryDto,
} from './dto';
import { CreateAppointmentWithSessionDto } from './dto/create-appointment-with-session.dto';
import { AppointmentSessionService } from './services/appointment-session.service';
import { SESSION_ERROR_MESSAGES } from './constants/session-error-messages.constant';

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
    private readonly appointmentValidationService: AppointmentValidationService,
    private readonly appointmentStatusService: AppointmentStatusService,
    private readonly appointmentCalendarService: AppointmentCalendarService,
    private readonly notificationService: NotificationService,
    private readonly auditService: AuditService,
    private readonly appointmentSessionService: AppointmentSessionService,
  ) { }

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
          appointmentDate instanceof Date ? appointmentDate.toISOString().split('T')[0] : String(appointmentDate),
          appointmentTime,
          (appointmentDto as any).durationMinutes || 30,
          excludeAppointmentId,
          (appointmentDto as any).serviceId,
          (appointmentDto as any).sessionId,
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
   * Check for appointment conflicts.
   *
   * When both serviceId and sessionId are provided the method resolves the
   * session-specific duration from the service document and uses that for
   * the time-range calculation (Requirements: 8.1-8.4).
   */
  async checkAppointmentConflicts(
    patientId: string,
    doctorId: string,
    appointmentDate: string,
    appointmentTime: string,
    durationMinutes: number = 30,
    excludeAppointmentId?: string,
    serviceId?: string,
    sessionId?: string,
  ): Promise<AppointmentConflictDto[]> {
    // Resolve session-specific duration when both serviceId and sessionId are known
    if (serviceId && sessionId) {
      const svc = await this.serviceModel.findById(serviceId);
      if (svc) {
        const sess = svc.sessions?.find((s) => (s as any)._id === sessionId);
        if (sess) {
          durationMinutes =
            (sess as any).duration ?? svc.durationMinutes ?? durationMinutes;
        }
      }
    }

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
   * Task 3.1: Create a new appointment
   * Requirements: 1.1-1.12
   * 
   * Validates all required entities exist (Patient, Doctor, Service, Clinic)
   * Validates optional entities (Department) if provided
   * Verifies service is provided by clinic
   * Verifies doctor is authorized for service
   * Gets service duration and sets appointment duration
   * Sets initial status to "scheduled"
   * Rejects past dates with bilingual error
   * Records createdBy user and timestamp
   * Returns complete appointment with populated relationships
   */
  async createAppointment(
    createAppointmentDto: CreateAppointmentWithSessionDto,
    createdByUserId: string,
  ): Promise<Appointment> {
    this.logger.log(
      `Creating appointment for patient ${createAppointmentDto.patientId}`,
    );

    // Task 6.8: Validate all entities and relationships (Requirements 1.1-1.7)
    const { service, clinic } =
      await this.appointmentValidationService.validateAllEntitiesAndRelationships(
        createAppointmentDto.patientId,
        createAppointmentDto.doctorId,
        createAppointmentDto.serviceId,
        createAppointmentDto.clinicId,
        createAppointmentDto.departmentId,
      );

    const { sessionId } = createAppointmentDto;

    // Enforce sessionId when service has sessions (Requirement 3.1)
    if (service.sessions && service.sessions.length > 0 && !sessionId) {
      throw new BadRequestException({
        message: SESSION_ERROR_MESSAGES.SESSION_ID_REQUIRED,
        code: 'SESSION_ID_REQUIRED',
      });
    }

    // Session-specific validations (Requirements 3.4, 4.1-4.4, 5.1-5.4)
    if (sessionId) {
      await this.appointmentSessionService.validateSessionReference(
        createAppointmentDto.serviceId,
        sessionId,
      );
      await this.appointmentSessionService.checkDuplicateSessionBooking(
        createAppointmentDto.patientId,
        createAppointmentDto.serviceId,
        sessionId,
      );
      await this.appointmentSessionService.checkCompletedSessionRebooking(
        createAppointmentDto.patientId,
        createAppointmentDto.serviceId,
        sessionId,
      );
    }

    // 8. Get session-specific or service duration (Requirements 2.1, 2.2)
    const session = sessionId
      ? service.sessions?.find((s) => (s as any)._id === sessionId)
      : undefined;
    const duration = session
      ? this.appointmentSessionService.getSessionDuration(
          session as any,
          service.durationMinutes || 30,
        )
      : service.durationMinutes || 30;

    // 9. Reject past dates (Requirement 1.10)
    const appointmentDateTime = new Date(
      `${createAppointmentDto.appointmentDate.toISOString().split('T')[0]}T${createAppointmentDto.appointmentTime}:00`,
    );
    const now = new Date();
    if (appointmentDateTime < now) {
      throw new BadRequestException({
        message: {
          ar: 'لا يمكن حجز مواعيد في الماضي',
          en: 'Cannot schedule appointments in the past',
        },
      });
    }

    // 10. Create appointment with initial status "scheduled" (Requirement 1.9)
    const appointmentData = {
      patientId: new Types.ObjectId(createAppointmentDto.patientId),
      doctorId: new Types.ObjectId(createAppointmentDto.doctorId),
      clinicId: new Types.ObjectId(createAppointmentDto.clinicId),
      serviceId: new Types.ObjectId(createAppointmentDto.serviceId),
      departmentId: createAppointmentDto.departmentId
        ? new Types.ObjectId(createAppointmentDto.departmentId)
        : undefined,
      sessionId: sessionId || undefined,
      appointmentDate: new Date(createAppointmentDto.appointmentDate),
      appointmentTime: createAppointmentDto.appointmentTime,
      durationMinutes: duration,
      status: 'scheduled', // Requirement 1.9
      urgency: createAppointmentDto.urgency || 'medium',
      notes: createAppointmentDto.notes,
      internalNotes: createAppointmentDto.internalNotes,
      bookingChannel: createAppointmentDto.bookingChannel || 'web',
      reason: createAppointmentDto.reason,
      createdBy: new Types.ObjectId(createdByUserId), // Requirement 1.12
    };

    const appointment = new this.appointmentModel(appointmentData);
    const savedAppointment = await appointment.save();

    this.logger.log(
      `Appointment created successfully with ID: ${savedAppointment._id}`,
    );

    // 11. Return complete appointment with populated relationships (Requirement 1.11)
    const populatedAppointment = await this.appointmentModel
      .findById(savedAppointment._id)
      .populate('patientId', 'firstName lastName phone email')
      .populate('doctorId', 'firstName lastName email')
      .populate('clinicId', 'name address')
      .populate('serviceId', 'name durationMinutes price')
      .populate('departmentId', 'name')
      .exec();

    // Send notifications
    await this.notificationService.create({
      recipientId: createAppointmentDto.patientId,
      title: 'Appointment Booked',
      message: `Your appointment has been scheduled for ${createAppointmentDto.appointmentDate} at ${createAppointmentDto.appointmentTime}`,
      notificationType: 'appointment_booked',
      priority: 'normal',
      relatedEntityType: 'appointment',
      relatedEntityId: (savedAppointment._id as any).toString(),
      deliveryMethod: 'in_app',
    });

    await this.notificationService.create({
      recipientId: createAppointmentDto.doctorId,
      title: 'New Appointment Booked',
      message: `A new appointment has been scheduled for ${createAppointmentDto.appointmentDate} at ${createAppointmentDto.appointmentTime}`,
      notificationType: 'appointment_booked',
      priority: 'normal',
      relatedEntityType: 'appointment',
      relatedEntityId: (savedAppointment._id as any).toString(),
      deliveryMethod: 'in_app',
    });

    // Audit log
    await this.auditService.logSecurityEvent({
      eventType: 'APPOINTMENT_CREATED',
      userId: createdByUserId,
      actorId: createdByUserId,
      ipAddress: '0.0.0.0',
      userAgent: 'System',
      timestamp: new Date(),
      metadata: {
        appointmentId: (savedAppointment._id as any).toString(),
        patientId: createAppointmentDto.patientId,
        doctorId: createAppointmentDto.doctorId,
      },
    });

    return populatedAppointment!;
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
    const pageNum = Math.max(1, parseInt(String(page)));
    const pageSize = Math.max(1, Math.min(100, parseInt(String(limit))));
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
   * Task 6.9: Re-validate when doctor or service changes (Requirement 9.3)
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

    // Get existing appointment to check what's changing
    const existingAppointment = await this.appointmentModel.findOne({
      _id: new Types.ObjectId(appointmentId),
      deletedAt: { $exists: false },
    });

    if (!existingAppointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Task 6.9: Re-validate entities and relationships when they change
    const doctorChanged =
      updateAppointmentDto.doctorId &&
      updateAppointmentDto.doctorId !== existingAppointment.doctorId.toString();
    const serviceChanged =
      updateAppointmentDto.serviceId &&
      updateAppointmentDto.serviceId !==
        existingAppointment.serviceId.toString();
    const clinicChanged =
      updateAppointmentDto.clinicId &&
      updateAppointmentDto.clinicId !== existingAppointment.clinicId.toString();
    const patientChanged =
      updateAppointmentDto.patientId &&
      updateAppointmentDto.patientId !==
        existingAppointment.patientId.toString();

    // If any critical entity changes, re-validate all relationships
    if (doctorChanged || serviceChanged || clinicChanged || patientChanged) {
      const patientId =
        updateAppointmentDto.patientId ||
        existingAppointment.patientId.toString();
      const doctorId =
        updateAppointmentDto.doctorId ||
        existingAppointment.doctorId.toString();
      const serviceId =
        updateAppointmentDto.serviceId ||
        existingAppointment.serviceId.toString();
      const clinicId =
        updateAppointmentDto.clinicId ||
        existingAppointment.clinicId.toString();
      const departmentId =
        updateAppointmentDto.departmentId ||
        existingAppointment.departmentId?.toString();

      await this.appointmentValidationService.validateAllEntitiesAndRelationships(
        patientId,
        doctorId,
        serviceId,
        clinicId,
        departmentId,
      );
    }

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
      notes: rescheduleDto.reason
        ? `${appointment.notes || ''}\nRescheduled: ${rescheduleDto.reason}`.trim()
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
   * Restore deleted appointment
   * Task 13.6 - Requirements: 13.6, 13.7
   */
  async restoreAppointment(appointmentId: string): Promise<Appointment> {
    if (!Types.ObjectId.isValid(appointmentId)) {
      throw new BadRequestException({
        message: {
          ar: 'معرف الموعد غير صالح',
          en: 'Invalid appointment ID format',
        },
      });
    }

    this.logger.log(`Restoring appointment: ${appointmentId}`);

    const restoredAppointment = await this.appointmentModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(appointmentId),
          deletedAt: { $exists: true },
        },
        {
          $unset: {
            deletedAt: '',
          },
        },
        { new: true },
      )
      .populate('patientId', 'firstName lastName phone email')
      .populate('doctorId', 'firstName lastName email')
      .populate('clinicId', 'name address')
      .populate('serviceId', 'name durationMinutes price')
      .populate('departmentId', 'name')
      .exec();

    if (!restoredAppointment) {
      throw new NotFoundException({
        message: {
          ar: 'الموعد المحذوف غير موجود',
          en: 'Deleted appointment not found',
        },
      });
    }

    this.logger.log(`Appointment restored successfully: ${appointmentId}`);

    return restoredAppointment;
  }

  /**
   * Get doctor availability for a specific date
   */
  async getDoctorAvailability(
    query: AppointmentAvailabilityQueryDto,
  ): Promise<DayScheduleDto> {
    const { doctorId, date, clinicId } = query as any;
    // Resolve session-specific duration when sessionId is provided (Requirement 9.1-9.4)
    let durationMinutes: number = (query as any).durationMinutes ?? (query as any).duration ?? 30;
    const { sessionId, serviceId } = query as any;
    if (sessionId && serviceId) {
      const svc = await this.serviceModel.findById(serviceId);
      if (svc) {
        const sess = svc.sessions?.find((s) => (s as any)._id === sessionId);
        if (sess) {
          durationMinutes =
            (sess as any).duration ?? svc.durationMinutes ?? durationMinutes;
        }
      }
    }
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
        available: !isBreak && !isBlocked && !isBooked,
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
    const availableSlots = timeSlots.filter((slot) => slot.available).length;
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

  // =========================================================================
  // M6 – Change Appointment Status (UC-6b5a4c3)
  // =========================================================================
  /**
   * Change appointment status with business-rule validation.
   * Final states: completed, cancelled (cannot be changed).
   */
  /**
   * Change appointment status with proper validation
   * Uses AppointmentStatusService for status transition validation
   * Requirements: 6.1-6.12
   */
  async changeAppointmentStatus(
    appointmentId: string,
    statusDto: { status: string; notes?: string; reason?: string; newDate?: string; newTime?: string },
    userId?: string,
  ): Promise<Appointment> {
    if (!Types.ObjectId.isValid(appointmentId)) {
      throw new BadRequestException('Invalid appointment ID format');
    }

    if (!userId) {
      throw new BadRequestException({
        message: {
          ar: 'معرف المستخدم مطلوب',
          en: 'User ID is required',
        },
        code: 'USER_ID_REQUIRED',
      });
    }

    // Use the new AppointmentStatusService for proper status transition validation
    const updatedAppointment = await this.appointmentStatusService.changeStatus(
      appointmentId,
      statusDto.status as any,
      userId,
      {
        completionNotes: statusDto.notes,
        cancellationReason: statusDto.reason,
        notes: statusDto.notes,
        reason: statusDto.reason,
      },
    );

    // Handle rescheduling if new date/time provided
    if (statusDto.status === 'rescheduled' && statusDto.newDate && statusDto.newTime) {
      const rescheduledAppointment = await this.appointmentModel
        .findByIdAndUpdate(
          appointmentId,
          {
            appointmentDate: new Date(statusDto.newDate),
            appointmentTime: statusDto.newTime,
          },
          { new: true },
        )
        .exec();
      
      if (rescheduledAppointment) {
        return rescheduledAppointment;
      }
    }

    this.logger.log(`Appointment ${appointmentId} status changed to ${statusDto.status}`);
    return updatedAppointment;
  }

  // =========================================================================
  // M6 – Start Appointment (UC-9a8c7b6)
  // =========================================================================
  /**
   * Mark appointment as in_progress and record actual start time.
   * Precondition: status must be 'scheduled' or 'confirmed'.
   */
  async startAppointment(
    appointmentId: string,
    userId?: string,
  ): Promise<{ appointment: Appointment; redirectTo: string }> {
    if (!Types.ObjectId.isValid(appointmentId)) {
      throw new BadRequestException('Invalid appointment ID format');
    }

    const appointment = await this.getAppointmentById(appointmentId);

    if (!['scheduled', 'confirmed'].includes(appointment.status)) {
      throw new BadRequestException({
        message: {
          ar: 'يمكن بدء المواعيد المجدولة أو المؤكدة فقط',
          en: 'Can only start scheduled or confirmed appointments',
        },
        code: 'INVALID_STATUS_FOR_START',
        currentStatus: appointment.status,
      });
    }

    const now = new Date();
    const historyEntry = {
      status: 'in_progress',
      changedAt: now,
      changedBy: userId ? new Types.ObjectId(userId) : undefined,
    };

    const updated = await this.appointmentModel
      .findByIdAndUpdate(
        appointmentId,
        {
          status: 'in_progress',
          actualStartTime: now,
          startedBy: userId ? new Types.ObjectId(userId) : undefined,
          updatedBy: userId ? new Types.ObjectId(userId) : undefined,
          $push: { statusHistory: historyEntry },
        },
        { new: true },
      )
      .exec();

    this.logger.log(`Appointment ${appointmentId} started at ${now.toISOString()}`);

    // Audit log
    if (userId) {
      await this.auditService.logSecurityEvent({
        eventType: 'APPOINTMENT_STARTED',
        userId,
        actorId: userId,
        ipAddress: '0.0.0.0',
        userAgent: 'System',
        timestamp: now,
        metadata: { appointmentId, startedAt: now },
      });
    }

    return {
      appointment: updated!,
      redirectTo: `/medical-entry/${appointmentId}`,
    };
  }

  // =========================================================================
  // M6 – End Appointment (UC-b4c3a2d)
  // =========================================================================
  /**
   * Complete an in-progress appointment and save medical entry data.
   * Precondition: status must be 'in_progress'.
   */
  async endAppointment(
    appointmentId: string,
    medicalEntryData: {
      sessionNotes?: { diagnosis?: string; symptoms?: string; findings?: string; procedures?: string };
      prescriptions?: Array<{ medication?: string; dosage?: string; frequency?: string; duration?: string }>;
      treatmentPlan?: { steps?: string; tests?: string; lifestyle?: string };
      followUp?: { required?: boolean; recommendedDuration?: string; doctorNotes?: string };
    },
    userId?: string,
  ): Promise<Appointment> {
    if (!Types.ObjectId.isValid(appointmentId)) {
      throw new BadRequestException('Invalid appointment ID format');
    }

    const appointment = await this.getAppointmentById(appointmentId);

    if (appointment.status !== 'in_progress') {
      throw new BadRequestException({
        message: {
          ar: 'يمكن إنهاء المواعيد قيد التقدم فقط',
          en: 'Can only end appointments that are in progress',
        },
        code: 'APPOINTMENT_NOT_IN_PROGRESS',
        currentStatus: appointment.status,
      });
    }

    const now = new Date();
    const historyEntry = {
      status: 'completed',
      changedAt: now,
      changedBy: userId ? new Types.ObjectId(userId) : undefined,
    };

    // Store medical entry data inline (M7 will extract to separate collection)
    const internalNotes = medicalEntryData
      ? JSON.stringify(medicalEntryData)
      : undefined;

    const updated = await this.appointmentModel
      .findByIdAndUpdate(
        appointmentId,
        {
          status: 'completed',
          actualEndTime: now,
          completedBy: userId ? new Types.ObjectId(userId) : undefined,
          updatedBy: userId ? new Types.ObjectId(userId) : undefined,
          ...(internalNotes && { notes: internalNotes }),
          $push: { statusHistory: historyEntry },
        },
        { new: true },
      )
      .exec();

    this.logger.log(`Appointment ${appointmentId} ended at ${now.toISOString()}`);

    if (userId) {
      await this.auditService.logSecurityEvent({
        eventType: 'APPOINTMENT_COMPLETED',
        userId,
        actorId: userId,
        ipAddress: '0.0.0.0',
        userAgent: 'System',
        timestamp: now,
        metadata: {
          appointmentId,
          completedAt: now,
          hasFollowUp: medicalEntryData?.followUp?.required,
        },
      });
    }

    return updated!;
  }

  // =========================================================================
  // M6 – Conclude Appointment (UC-f1d3e2c)
  // =========================================================================
  /**
   * Comprehensive appointment conclusion. Requires doctorNotes (BR-f1d3e2c).
   * Precondition: status must be 'in_progress'.
   */
  async concludeAppointment(
    appointmentId: string,
    conclusionData: {
      doctorNotes: string;
      sessionNotes?: { diagnosis?: string; symptoms?: string; findings?: string; procedures?: string };
      prescriptions?: Array<{ medication?: string; dosage?: string; frequency?: string; duration?: string }>;
      treatmentPlan?: { steps?: string; tests?: string; lifestyle?: string };
      followUp?: { required?: boolean; recommendedDuration?: string; doctorNotes?: string };
    },
    userId?: string,
  ): Promise<Appointment> {
    if (!Types.ObjectId.isValid(appointmentId)) {
      throw new BadRequestException('Invalid appointment ID format');
    }

    // Business rule: doctorNotes required (BR-f1d3e2c)
    if (!conclusionData.doctorNotes || conclusionData.doctorNotes.trim().length < 10) {
      throw new BadRequestException({
        message: {
          ar: 'ملاحظات الطبيب مطلوبة لإتمام الموعد (BR-f1d3e2c)',
          en: 'Doctor notes are required to conclude an appointment (BR-f1d3e2c)',
        },
        code: 'DOCTOR_NOTES_REQUIRED',
      });
    }

    const appointment = await this.getAppointmentById(appointmentId);

    if (appointment.status !== 'in_progress') {
      throw new BadRequestException({
        message: {
          ar: 'يمكن إتمام المواعيد قيد التقدم فقط',
          en: 'Can only conclude appointments that are in progress',
        },
        code: 'APPOINTMENT_NOT_IN_PROGRESS',
        currentStatus: appointment.status,
      });
    }

    const now = new Date();
    const historyEntry = {
      status: 'completed',
      changedAt: now,
      changedBy: userId ? new Types.ObjectId(userId) : undefined,
      reason: 'Appointment concluded with doctor notes',
    };

    const conclusionPayload = {
      ...conclusionData,
      concludedAt: now,
    };

    const updated = await this.appointmentModel
      .findByIdAndUpdate(
        appointmentId,
        {
          status: 'completed',
          actualEndTime: now,
          completedBy: userId ? new Types.ObjectId(userId) : undefined,
          updatedBy: userId ? new Types.ObjectId(userId) : undefined,
          notes: JSON.stringify(conclusionPayload),
          $push: { statusHistory: historyEntry },
        },
        { new: true },
      )
      .exec();

    this.logger.log(`Appointment ${appointmentId} concluded at ${now.toISOString()}`);

    // Schedule follow-up reminder if needed
    if (conclusionData.followUp?.required) {
      await this.notificationService.create({
        recipientId: appointment.doctorId.toString(),
        title: 'Follow-up Required',
        message: `Follow-up needed for appointment ${appointmentId}. Recommended duration: ${conclusionData.followUp.recommendedDuration || 'Not specified'}`,
        notificationType: 'follow_up_reminder',
        priority: 'normal',
        relatedEntityType: 'appointment',
        relatedEntityId: appointmentId,
        deliveryMethod: 'in_app',
      });
    }

    if (userId) {
      await this.auditService.logSecurityEvent({
        eventType: 'APPOINTMENT_CONCLUDED',
        userId,
        actorId: userId,
        ipAddress: '0.0.0.0',
        userAgent: 'System',
        timestamp: now,
        metadata: {
          appointmentId,
          concludedAt: now,
          hasFollowUp: conclusionData.followUp?.required,
        },
      });
    }

    return updated!;
  }

  // =========================================================================
  // M6 – Get Appointments Calendar (UC-d2e3f4c)
  // Tasks: 9.1, 9.2, 9.3, 9.4
  // =========================================================================
  /**
   * Return appointments grouped for calendar views (day / week / month).
   * 
   * This method delegates to AppointmentCalendarService which implements:
   * - Task 9.1: getDayView - Day view showing all appointments for a specific date
   * - Task 9.2: getWeekView - Week view showing appointments grouped by day for 7-day period
   * - Task 9.3: getMonthView - Month view showing appointment counts per day for calendar month
   * - Task 9.4: getCalendarView - Dispatcher method routing to appropriate view
   * 
   * Requirements: 5.1-5.8
   */
  async getAppointmentsCalendar(query: CalendarQueryDto): Promise<{
    view: string;
    startDate: string;
    endDate: string;
    appointments: Appointment[];
    groupedByDate: Record<string, Appointment[]>;
  }> {
    this.logger.log('Getting appointments calendar view');

    // Delegate to calendar service (Tasks 9.1-9.4)
    const calendarData = await this.appointmentCalendarService.getCalendarView(query);

    // Transform to legacy format for backward compatibility
    const appointments: Appointment[] = [];
    for (const dateKey in calendarData.appointments) {
      for (const appt of calendarData.appointments[dateKey]) {
        // Convert AppointmentDataDto back to Appointment for legacy response
        appointments.push(appt as any);
      }
    }

    return {
      view: calendarData.view,
      startDate: calendarData.dateRange.start.toISOString().split('T')[0],
      endDate: calendarData.dateRange.end.toISOString().split('T')[0],
      appointments,
      groupedByDate: calendarData.appointments as any,
    };
  }
}
