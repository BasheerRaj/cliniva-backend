import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Appointment } from '../database/schemas/appointment.schema';
import { Patient } from '../database/schemas/patient.schema';
import { User } from '../database/schemas/user.schema';
import { Clinic } from '../database/schemas/clinic.schema';
import { Complex } from '../database/schemas/complex.schema';
import { Service } from '../database/schemas/service.schema';
import { Invoice } from '../database/schemas/invoice.schema';
import { Payment } from '../database/schemas/payment.schema';
import { MedicalReport } from '../database/schemas/medical-report.schema';
import { WorkingHoursIntegrationService } from './services/working-hours-integration.service';
import { AppointmentWorkingHoursService } from './services/appointment-working-hours.service';
import { AppointmentValidationService } from './services/appointment-validation.service';
import { AppointmentStatusService } from './services/appointment-status.service';
import { AppointmentCalendarService } from './services/appointment-calendar.service';
import { NotificationService } from '../notification/notification.service';
import { AuditService } from '../auth/audit.service';
import {
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
  ChangeAppointmentStatusDto,
  StartAppointmentDto,
  EndAppointmentDto,
  ConcludeAppointmentDto,
  CalendarQueryDto,
  UnifiedAvailabilityQueryDto,
  AppointmentPageContextResponseDto,
} from './dto';
import { CreateAppointmentWithSessionDto } from './dto/create-appointment-with-session.dto';
import { AppointmentSessionService } from './services/appointment-session.service';
import { SESSION_ERROR_MESSAGES } from './constants/session-error-messages.constant';
import { InvoiceService } from '../invoice/invoice.service';
import { ClinicService } from '../database/schemas/clinic-service.schema';
import { DoctorService } from '../database/schemas/doctor-service.schema';
import { EmployeeShift } from '../database/schemas/employee-shift.schema';
import { WorkingHours } from '../database/schemas/working-hours.schema';
import {
  transformAppointment,
  transformAppointmentList,
  TransformedAppointment,
} from './utils/appointment-transformer.util';
import { getAppointmentEditLockReason } from './utils/appointment-editability.util';
import { UserRole } from '../common/enums/user-role.enum';
import { AppointmentStatus } from './constants/appointment-status.enum';

@Injectable()
export class AppointmentService {
  private readonly logger = new Logger(AppointmentService.name);

  constructor(
    @InjectModel('Appointment')
    private readonly appointmentModel: Model<Appointment>,
    @InjectModel('Patient') private readonly patientModel: Model<Patient>,
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('Clinic') private readonly clinicModel: Model<Clinic>,
    @InjectModel('Complex') private readonly complexModel: Model<Complex>,
    @InjectModel('Service') private readonly serviceModel: Model<Service>,
    @InjectModel('Invoice') private readonly invoiceModel: Model<Invoice>,
    @InjectModel('Payment') private readonly paymentModel: Model<Payment>,
    @InjectModel('MedicalReport') private readonly medicalReportModel: Model<MedicalReport>,
    @InjectModel('ClinicService') private readonly clinicServiceModel: Model<ClinicService>,
    @InjectModel('DoctorService') private readonly doctorServiceModel: Model<DoctorService>,
    @InjectModel(EmployeeShift.name) private readonly employeeShiftModel: Model<EmployeeShift>,
    @InjectModel(WorkingHours.name) private readonly workingHoursModel: Model<WorkingHours>,
    private readonly workingHoursIntegrationService: WorkingHoursIntegrationService,
    private readonly appointmentValidationService: AppointmentValidationService,
    private readonly appointmentStatusService: AppointmentStatusService,
    private readonly appointmentCalendarService: AppointmentCalendarService,
    private readonly notificationService: NotificationService,
    private readonly auditService: AuditService,
    private readonly appointmentSessionService: AppointmentSessionService,
    private readonly invoiceService: InvoiceService,
    private readonly appointmentWorkingHoursService: AppointmentWorkingHoursService,
  ) { }

  private getAppointmentStartDateTime(appointment: {
    appointmentDate?: Date | string | null;
    appointmentTime?: string | null;
  }): Date | null {
    if (!appointment.appointmentDate || !appointment.appointmentTime) {
      return null;
    }

    const appointmentDate = new Date(appointment.appointmentDate);
    if (Number.isNaN(appointmentDate.getTime())) {
      return null;
    }

    const [hours, minutes] = String(appointment.appointmentTime)
      .split(':')
      .map((value) => Number(value));

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return null;
    }

    return new Date(
      appointmentDate.getFullYear(),
      appointmentDate.getMonth(),
      appointmentDate.getDate(),
      hours,
      minutes,
      0,
      0,
    );
  }

  private isAppointmentEffectivelyInProgress(
    appointment: {
      status?: string | null;
      appointmentDate?: Date | string | null;
      appointmentTime?: string | null;
      durationMinutes?: number | null;
    },
    now: Date = new Date(),
  ): boolean {
    if (appointment.status === 'in_progress') {
      return true;
    }

    if (['completed', 'cancelled', 'no_show'].includes(String(appointment.status || ''))) {
      return false;
    }

    const start = this.getAppointmentStartDateTime(appointment);
    if (!start) {
      return false;
    }

    const durationMinutes =
      typeof appointment.durationMinutes === 'number' && appointment.durationMinutes > 0
        ? appointment.durationMinutes
        : 30;
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    return now >= start && now < end;
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
    clinicId?: string,
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

    // Build query to find overlapping appointments using proper time-range intersection:
    // overlap when: existingStart < newEnd AND existingEnd > newStart
    // BUG 6 FIX: replaced single-arm $or with two-condition $and expression
    const overlapQuery: any = {
      $and: [
        // Condition 1: existingStart < newEnd
        {
          $expr: {
            $lt: [
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
              appointmentEnd,
            ],
          },
        },
        // Condition 2: existingEnd > newStart
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
      status: { $nin: ['cancelled', 'deleted', 'no_show'] },
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

    // Check patient conflicts — BUG 6 FIX: throw immediately with specific message
    const patientConflicts = await this.appointmentModel.find({
      ...overlapQuery,
      patientId: new Types.ObjectId(patientId),
    });

    if (patientConflicts.length > 0) {
      throw new ConflictException(
        'This patient already has another appointment at the selected time. Please choose a different slot.',
      );
    }

    // Check clinic conflicts (Strict: 1 Appointment/Clinic)
    if (clinicId && Types.ObjectId.isValid(clinicId)) {
      const clinicConflicts = await this.appointmentModel.find({
        ...overlapQuery,
        clinicId: new Types.ObjectId(clinicId),
      });

      if (clinicConflicts.length > 0) {
        conflicts.push({
          conflictType: 'clinic_busy',
          message: 'Clinic has another appointment at this time',
          conflictingAppointmentId: (clinicConflicts[0] as any)._id.toString(),
        });
      }
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

    // UC-7b6a5c3 Requirement: Validate invoice precondition
    // Invoice must exist with status Unpaid or Partially Paid
    let validatedInvoice: Invoice | null = null;
    if ((createAppointmentDto as any).invoiceId) {
      const invoiceId = (createAppointmentDto as any).invoiceId;
      
      // Find invoice
      const invoice = await this.invoiceModel.findById(invoiceId);
      
      if (!invoice || invoice.deletedAt) {
        throw new NotFoundException({
          message: {
            ar: 'الفاتورة غير موجودة',
            en: 'Invoice not found',
          },
          code: 'INVOICE_NOT_FOUND',
        });
      }
      
      // Validate invoice belongs to patient
      if (invoice.patientId.toString() !== createAppointmentDto.patientId) {
        throw new BadRequestException({
          message: {
            ar: 'الفاتورة لا تنتمي للمريض المحدد',
            en: 'Invoice does not belong to the specified patient',
          },
          code: 'INVOICE_PATIENT_MISMATCH',
        });
      }
      
      // Payment status does NOT block booking — a fully-paid invoice still has
      // remaining sessions the patient is entitled to use.
      // Only a cancelled invoice should block booking.
      // (The session-count check below prevents overbooking regardless of payment.)
      if ((invoice as any).invoiceStatus === 'cancelled') {
        throw new BadRequestException({
          message: {
            ar: 'لا يمكن الحجز على فاتورة ملغاة',
            en: 'Cannot book an appointment on a cancelled invoice',
          },
          code: 'INVOICE_CANCELLED',
        });
      }

      // Check the service in the invoice has remaining sessions
      const appointmentServiceId = createAppointmentDto.serviceId;
      const matchingService = invoice.services.find(
        (s: any) => s.serviceId.toString() === appointmentServiceId,
      );
      if (!matchingService) {
        throw new BadRequestException({
          message: {
            ar: 'الخدمة المحددة غير موجودة في هذه الفاتورة',
            en: 'Selected service is not found in this invoice',
          },
          code: 'SERVICE_NOT_IN_INVOICE',
        });
      }
      // Count only sessions that have actually been booked (have an appointment).
      // 'pending' sessions are pre-created placeholder slots — they are NOT bookings.
      // Only 'booked', 'in_progress', and 'completed' sessions consume a slot.
      const bookedSessions = ((matchingService as any).sessions || []).filter(
        (s: any) => ['booked', 'in_progress', 'completed'].includes(s.sessionStatus),
      ).length;
      const totalSessions = (matchingService as any).totalSessions || 1;
      if (bookedSessions >= totalSessions) {
        throw new BadRequestException({
          message: {
            ar: 'تم حجز جميع جلسات هذه الخدمة بالفعل',
            en: 'All sessions for this service have already been booked',
          },
          code: 'ALL_SESSIONS_BOOKED',
        });
      }
      
      validatedInvoice = invoice;
      this.logger.log(
        `Invoice ${invoiceId} validated for appointment booking (status: ${invoice.paymentStatus})`,
      );
    }

    const { sessionId: dtoSessionId } = createAppointmentDto;
    const hasInvoice = !!(createAppointmentDto as any).invoiceId;

    // When booking via invoice, resolve sessionId from the invoice session record
    let resolvedSessionId: string | undefined;
    if (hasInvoice && validatedInvoice) {
      const invoiceItemId = (createAppointmentDto as any).invoiceItemId;
      const svc = (validatedInvoice.services as any[]).find(
        (s: any) => s.serviceId.toString() === createAppointmentDto.serviceId,
      );
      if (svc) {
        let invoiceSess: any = invoiceItemId
          ? (svc.sessions || []).find((s: any) => s.invoiceItemId?.toString() === invoiceItemId)
          : null;
        if (!invoiceSess) {
          invoiceSess = (svc.sessions || []).find((s: any) =>
            ['pending', 'cancelled'].includes(s.sessionStatus),
          );
        }
        if (invoiceSess?.sessionId) {
          resolvedSessionId = invoiceSess.sessionId.toString();
        }
      }
    }

    const sessionId = dtoSessionId || resolvedSessionId;

    if (!hasInvoice && service.sessions && service.sessions.length > 0 && !sessionId) {
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
    // When dto.durationMinutes is provided, it overrides the service/session default.
    const session = sessionId
      ? service.sessions?.find((s) => (s as any)._id === sessionId)
      : undefined;
    const computedDuration = session
      ? this.appointmentSessionService.getSessionDuration(
          session as any,
          service.durationMinutes || 30,
        )
      : service.durationMinutes || 30;
    const duration = (createAppointmentDto as any).durationMinutes ?? computedDuration;

    // 8b. Validate working hours when BOTH clinic and doctor have WH configured
    // Only enforced when both entities have working hours set up — prevents
    // blocking appointments for clinics/doctors that haven't configured WH yet.
    const [clinicWH, doctorWH] = await Promise.all([
      this.workingHoursIntegrationService.getClinicWorkingHours(
        createAppointmentDto.clinicId,
      ),
      this.workingHoursIntegrationService.getDoctorWorkingHours(
        createAppointmentDto.doctorId,
      ),
    ]);
    if (clinicWH.length > 0 && doctorWH.length > 0) {
      await this.appointmentWorkingHoursService.validateWorkingHours(
        createAppointmentDto.clinicId,
        createAppointmentDto.doctorId,
        new Date(createAppointmentDto.appointmentDate),
        createAppointmentDto.appointmentTime,
        duration,
      );
    }

    // 8c. Check for scheduling conflicts — doctor + clinic double-booking prevention
    const conflictDateStr = createAppointmentDto.appointmentDate instanceof Date
      ? createAppointmentDto.appointmentDate.toISOString().split('T')[0]
      : String(createAppointmentDto.appointmentDate).split('T')[0];
    const schedulingConflicts = await this.checkAppointmentConflicts(
      createAppointmentDto.patientId,
      createAppointmentDto.doctorId,
      conflictDateStr,
      createAppointmentDto.appointmentTime,
      duration,
      undefined,
      undefined,
      undefined,
      createAppointmentDto.clinicId,
    );
    if (schedulingConflicts.length > 0) {
      throw new ConflictException({
        message: {
          ar: 'يوجد تعارض في المواعيد المحددة',
          en: 'Scheduling conflict: the selected time slot is already booked',
        },
        conflicts: schedulingConflicts,
      });
    }

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
      subscriptionId: clinic.subscriptionId, // M1 Fix: Inherit subscription from clinic
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
      invoiceId: (createAppointmentDto as any).invoiceId
        ? new Types.ObjectId((createAppointmentDto as any).invoiceId)
        : undefined,
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

    // Auto-create invoice session when appointment is booked (M7 Integration)
    // Sessions are no longer pre-created; they are auto-pushed here on booking
    if (validatedInvoice) {
      try {
        const services = validatedInvoice.services as any[];
        const serviceIndex = services.findIndex(
          (s: any) => s.serviceId.toString() === createAppointmentDto.serviceId,
        );
        if (serviceIndex >= 0) {
          const svcItem = services[serviceIndex];
          const unitPrice = +(svcItem.pricePerSession || 0);
          const discountPercent = svcItem.discountPercent || 0;
          const discountAmount = +(unitPrice * discountPercent / 100).toFixed(2);
          const priceAfterDiscount = +(unitPrice - discountAmount).toFixed(2);
          const taxRate = svcItem.taxRate || 0;
          const taxAmount = +(priceAfterDiscount * taxRate / 100).toFixed(2);
          const lineTotal = +(priceAfterDiscount + taxAmount).toFixed(2);

          // Find the specific session if requested, otherwise find the first bookable one
          let targetSession: any = null;
          const invoiceItemId = (createAppointmentDto as any).invoiceItemId;

          if (invoiceItemId) {
            targetSession = (svcItem.sessions || []).find(
              (s: any) =>
                s.invoiceItemId.toString() === invoiceItemId &&
                ['pending', 'cancelled'].includes(s.sessionStatus),
            );
          }

          if (!targetSession) {
            // Fallback: first available
            targetSession = (svcItem.sessions || []).find(
              (s: any) => ['pending', 'cancelled'].includes(s.sessionStatus),
            );
          }

          if (targetSession) {
            await this.invoiceModel.updateOne(
              { _id: validatedInvoice._id, deletedAt: { $exists: false } },
              {
                $set: {
                  [`services.${serviceIndex}.sessions.$[item].sessionStatus`]: 'booked',
                  [`services.${serviceIndex}.sessions.$[item].appointmentId`]: savedAppointment._id,
                  [`services.${serviceIndex}.sessions.$[item].doctorId`]: new Types.ObjectId(createAppointmentDto.doctorId),
                  [`services.${serviceIndex}.sessions.$[item].unitPrice`]: unitPrice,
                  [`services.${serviceIndex}.sessions.$[item].discountPercent`]: discountPercent,
                  [`services.${serviceIndex}.sessions.$[item].discountAmount`]: discountAmount,
                  [`services.${serviceIndex}.sessions.$[item].taxRate`]: taxRate,
                  [`services.${serviceIndex}.sessions.$[item].taxAmount`]: taxAmount,
                  [`services.${serviceIndex}.sessions.$[item].lineTotal`]: lineTotal,
                },
              },
              { arrayFilters: [{ 'item.invoiceItemId': targetSession.invoiceItemId }] },
            );
            this.logger.log(
              `Booked existing session ${targetSession.invoiceItemId} on invoice ${validatedInvoice._id} for appointment ${savedAppointment._id}`,
            );
          } else {
            // No sessions or all already booked/completed? 
            // Check if we can add a new one (only for legacy invoices where sessions weren't pre-populated)
            const existingSessionKeys = new Set(
              (svcItem.sessions || []).map((s: any) => s.sessionId?.toString() || `order:${s.sessionOrder}`),
            );
            const nextServiceSession = (service.sessions || [])
              .slice()
              .sort((a: any, b: any) => a.order - b.order)
              .find((session: any) => !existingSessionKeys.has(session._id?.toString()));

            const activeSessions = (svcItem.sessions || []).filter(
              (s: any) => s.sessionStatus !== 'cancelled',
            );
            if (activeSessions.length < (svcItem.totalSessions || 1)) {
              const sessionNumber = nextServiceSession?.order || (activeSessions.length + 1);
              await this.invoiceModel.updateOne(
                { _id: validatedInvoice._id, deletedAt: { $exists: false } },
                {
                  $push: {
                    [`services.${serviceIndex}.sessions`]: {
                      invoiceItemId: new Types.ObjectId(),
                      sessionId: nextServiceSession?._id,
                      sessionStatus: 'booked',
                      sessionOrder: sessionNumber,
                      sessionName: nextServiceSession?.name || `Session ${sessionNumber}`,
                      doctorId: new Types.ObjectId(createAppointmentDto.doctorId),
                      unitPrice,
                      discountPercent,
                      discountAmount,
                      taxRate,
                      taxAmount,
                      lineTotal,
                      paidAmount: 0,
                      appointmentId: savedAppointment._id,
                    },
                  },
                },
              );
              this.logger.log(
                `Created and booked new session on invoice ${validatedInvoice._id} for appointment ${savedAppointment._id}`,
              );
            }
          }
        }
      } catch (err) {
        this.logger.error(`Failed to update invoice session: ${err.message}`);
      }
    }

    // UC-7b6a5c3 Postcondition & BZR-9d0a1b2c: Transition invoice to Posted when appointment booked
    // M7 Integration: Transition linked invoice to Posted status
    if (validatedInvoice) {
      try {
        const invoiceIdStr = (validatedInvoice._id as any).toString();
        this.logger.log(
          `Transitioning linked invoice ${invoiceIdStr} to Posted status (UC-7b6a5c3)`,
        );
        
        await this.invoiceService.transitionToPosted(invoiceIdStr);
        
        this.logger.log(
          `Invoice ${invoiceIdStr} successfully transitioned to Posted`,
        );

        // Audit log for M6-M7 integration event
        await this.auditService.logSecurityEvent({
          eventType: 'INVOICE_TRANSITIONED_ON_APPOINTMENT_BOOKING',
          userId: createdByUserId,
          actorId: createdByUserId,
          ipAddress: '0.0.0.0',
          userAgent: 'System',
          timestamp: new Date(),
          metadata: {
            appointmentId: (savedAppointment._id as any).toString(),
            invoiceId: invoiceIdStr,
            action: 'invoice_transition_to_posted',
            trigger: 'appointment_booking',
          },
        });
      } catch (error) {
        // Log error but don't fail appointment creation
        // This maintains appointment booking even if invoice transition fails
        const invoiceIdStr = (validatedInvoice._id as any).toString();
        this.logger.error(
          `Failed to transition invoice ${invoiceIdStr} to Posted: ${error.message}`,
          error.stack,
        );

        // Log the error for monitoring
        await this.auditService.logSecurityEvent({
          eventType: 'INVOICE_TRANSITION_FAILED',
          userId: createdByUserId,
          actorId: createdByUserId,
          ipAddress: '0.0.0.0',
          userAgent: 'System',
          timestamp: new Date(),
          metadata: {
            appointmentId: (savedAppointment._id as any).toString(),
            invoiceId: invoiceIdStr,
            error: error.message,
            trigger: 'appointment_booking',
          },
        });

        // Note: We continue with appointment creation despite invoice transition failure
        // This is a business decision to prioritize appointment booking
        this.logger.warn(
          `Appointment ${savedAppointment._id} created successfully, but invoice transition failed`,
        );
      }
    }

    return populatedAppointment!;
  }

  /**
   * Get appointments with filtering and pagination
   * UC-e1f2d3c: View list of Appointments
   */
  async getAppointments(
    query: AppointmentSearchQueryDto,
    userId?: string,
    userRole?: string,
    userClinicId?: string,
    subscriptionId?: string,
    complexId?: string,
    userClinicIds?: string[],
  ): Promise<{
    appointments: TransformedAppointment[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      search,
      patientId,
      doctorId,
      clinicId,
      clinicIds,
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
    } = query as any;

    // Build filter object
    const filter: any = {
      deletedAt: { $exists: false },
    };

    // 1. Mandatory subscription-level tenant isolation (M1 Fix)
    if (userRole !== 'super_admin' && subscriptionId) {
      filter.subscriptionId = new Types.ObjectId(subscriptionId);
    }

    // Individual field filters
    if (patientId) filter.patientId = new Types.ObjectId(patientId);
    if (doctorId) filter.doctorId = new Types.ObjectId(doctorId);
    if (clinicId) filter.clinicId = new Types.ObjectId(clinicId);
    if (serviceId) filter.serviceId = new Types.ObjectId(serviceId);

    // Multi-select filters (comma-separated IDs override single ID filters)
    if (clinicIds) {
      const ids = String(clinicIds).split(',').filter(Boolean);
      if (ids.length === 1) {
        filter.clinicId = new Types.ObjectId(ids[0]);
      } else if (ids.length > 1) {
        filter.clinicId = { $in: ids.map((id) => new Types.ObjectId(id)) };
      }
    }
    const doctorIds = (query as any).doctorIds;
    if (doctorIds) {
      const ids = String(doctorIds).split(',').filter(Boolean);
      if (ids.length === 1) {
        filter.doctorId = new Types.ObjectId(ids[0]);
      } else if (ids.length > 1) {
        filter.doctorId = { $in: ids.map((id) => new Types.ObjectId(id)) };
      }
    }

    // Staff multi-clinic scoping: validate provided clinicIds against JWT clinicIds,
    // then drop the subscriptionId appointment filter (clinic ownership is sufficient for isolation).
    if (userRole === 'staff' && clinicIds) {
      const allowedIds = Array.isArray(userClinicIds)
        ? userClinicIds.map(String)
        : userClinicId
        ? [userClinicId]
        : [];
      const requestedIds = String(clinicIds).split(',').filter(Boolean);
      const intersected = allowedIds.length > 0
        ? requestedIds.filter((id) => allowedIds.includes(id))
        : requestedIds; // no allowedIds on JWT → pass through (subscription filter still active)
      if (intersected.length > 0) {
        filter.clinicId = intersected.length === 1
          ? new Types.ObjectId(intersected[0])
          : { $in: intersected.map((id) => new Types.ObjectId(id)) };
        delete filter.subscriptionId; // clinic-level scope is sufficient tenant isolation
      } else {
        filter.clinicId = { $in: [] };
        delete filter.subscriptionId;
      }
    }

    // Role-based scoping (Priority: Roles > subscription/complex)
    if (userRole === 'doctor' && userId) {
      filter.doctorId = new Types.ObjectId(userId);
    } else if (userRole === 'staff' && userClinicId && !clinicIds) {
      filter.clinicId = new Types.ObjectId(userClinicId);
    } else if (userRole === 'admin' && !clinicIds) {
      const adminClinicIds = Array.isArray(userClinicIds)
        ? userClinicIds.filter((id: string) => Types.ObjectId.isValid(String(id)))
        : userClinicId
        ? [String(userClinicId)]
        : [];
      if (adminClinicIds.length > 1) {
        filter.clinicId = { $in: adminClinicIds.map((id: string) => new Types.ObjectId(id)) };
      } else if (adminClinicIds.length === 1) {
        filter.clinicId = new Types.ObjectId(adminClinicIds[0]);
      } else if (userClinicId) {
        filter.clinicId = new Types.ObjectId(userClinicId);
      }
    } else if (userRole === 'owner' || userRole === 'manager') {
      // Owner/Manager scoping: must be restricted to their subscription/complex
      const queryComplexId = (query as any).complexId || complexId;
      
      if (queryComplexId && Types.ObjectId.isValid(queryComplexId)) {
        const complexClinics = await this.clinicModel
          .find({ complexId: new Types.ObjectId(queryComplexId), deletedAt: { $exists: false } })
          .select('_id')
          .lean();
        const complexClinicIds = complexClinics.map((c: any) => c._id);
        
        if (filter.clinicId) {
            // If specific clinic(s) requested, intersect with complex clinics
            const requested = filter.clinicId['$in'] ? filter.clinicId['$in'] : [filter.clinicId];
            const allowed = requested.filter(rid => complexClinicIds.some(cid => cid.toString() === rid.toString()));
            filter.clinicId = { $in: allowed };
        } else {
            filter.clinicId = { $in: complexClinicIds };
        }
      } else if (subscriptionId && Types.ObjectId.isValid(subscriptionId)) {
        const ownerClinics = await this.clinicModel
          .find({ subscriptionId: new Types.ObjectId(subscriptionId), deletedAt: { $exists: false } })
          .select('_id')
          .lean();
        const ownerClinicIds = ownerClinics.map((c: any) => c._id);
        
        if (filter.clinicId) {
            const requested = filter.clinicId['$in'] ? filter.clinicId['$in'] : [filter.clinicId];
            const allowed = requested.filter(rid => ownerClinicIds.some(cid => cid.toString() === rid.toString()));
            filter.clinicId = { $in: allowed };
        } else {
            filter.clinicId = { $in: ownerClinicIds };
        }
      }
    } else if (userRole !== 'super_admin') {
        // Fallback for any other non-super-admin roles: ensure some form of scoping
        if (filter.clinicId) {
            // Already scoped from explicit/multi clinic filters
        } else if (userClinicId) {
            filter.clinicId = new Types.ObjectId(userClinicId);
        } else {
            // If no identifier available and not super_admin, return nothing (safety)
            filter.clinicId = { $in: [] };
        }
    }

    // Complex filter explicitly from query (already handled for owners above, but keeping for others)
    const explicitComplexId = (query as any).complexId;
    if (explicitComplexId && Types.ObjectId.isValid(explicitComplexId) && userRole === 'super_admin') {
      const complexClinics = await this.clinicModel
        .find({ complexId: new Types.ObjectId(explicitComplexId), deletedAt: { $exists: false } })
        .select('_id')
        .lean();
      const complexClinicIds = complexClinics.map((c: any) => c._id);
      filter.clinicId = { $in: complexClinicIds };
    }

    // Status validation (P2 - MEDIUM)
    if (status) {
      const validStatuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];
      if (!validStatuses.includes(status)) {
        throw new BadRequestException({
          message: {
            ar: `حالة الموعد غير صالحة. القيم المسموحة: ${validStatuses.join(', ')}`,
            en: `Invalid appointment status. Allowed values: ${validStatuses.join(', ')}`,
          },
          code: 'INVALID_STATUS',
          providedStatus: status,
          validStatuses,
        });
      }
      filter.status = status;
    }
    
    if (urgencyLevel) filter.urgency = urgencyLevel;

    // Date filtering with range limit validation (P2 - MEDIUM)
    if (appointmentDate) {
      filter.appointmentDate = new Date(appointmentDate);
    } else if (dateFrom || dateTo) {
      filter.appointmentDate = {};
      if (dateFrom) filter.appointmentDate.$gte = new Date(dateFrom);
      if (dateTo) filter.appointmentDate.$lte = new Date(dateTo);
      
      // Validate date range limit (max 365 days)
      if (dateFrom && dateTo) {
        const fromDate = new Date(dateFrom);
        const toDate = new Date(dateTo);
        const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff > 365) {
          throw new BadRequestException({
            message: {
              ar: 'نطاق التاريخ كبير جداً. الحد الأقصى المسموح به هو 365 يوماً',
              en: 'Date range too large. Maximum allowed is 365 days',
            },
            code: 'DATE_RANGE_TOO_LARGE',
            requestedDays: daysDiff,
            maxDays: 365,
          });
        }
      }
    }

    // Search functionality (P1 - HIGH)
    // Text search on patient name, doctor name, appointment notes
    if (search && search.trim()) {
      if (search.trim().length > 100) {
        throw new BadRequestException({ message: { ar: 'النص المدخل طويل جداً', en: 'Search term too long' } });
      }
      const searchRegex = new RegExp(this.escapeRegex(search.trim()), 'i');

      // Pre-query patients and doctors matching the search term (BUG-011)
      const matchingPatients = await this.patientModel
        .find({ $or: [{ firstName: searchRegex }, { lastName: searchRegex }], deletedAt: { $exists: false } })
        .select('_id').lean();
      const patientIds = matchingPatients.map((p: any) => p._id);
      const matchingDoctors = await this.userModel
        .find({ $or: [{ firstName: searchRegex }, { lastName: searchRegex }], role: 'doctor', deletedAt: { $exists: false } })
        .select('_id').lean();
      const doctorIds = matchingDoctors.map((d: any) => d._id);

      filter.$or = [
        { patientId: { $in: patientIds } },
        { doctorId: { $in: doctorIds } },
        { notes: searchRegex },
        { reason: searchRegex },
        { internalNotes: searchRegex },
      ];
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(String(page)));
    const pageSize = Math.max(1, Math.min(100, parseInt(String(limit))));
    const skip = (pageNum - 1) * pageSize;

    // Sort field validation (P1 - HIGH)
    const validSortFields = ['appointmentDate', 'appointmentTime', 'status', 'createdAt', 'urgencyLevel', 'updatedAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'appointmentDate';
    
    if (sortBy && !validSortFields.includes(sortBy)) {
      this.logger.warn(
        `Invalid sort field "${sortBy}" provided. Defaulting to "appointmentDate". Valid fields: ${validSortFields.join(', ')}`,
      );
    }

    // Sorting
    const sort: any = {};
    sort[sortField] = sortOrder === 'asc' ? 1 : -1;

    const [rawAppointments, total] = await Promise.all([
      this.appointmentModel
        .find(filter)
        .populate('patientId', 'firstName lastName phone email profilePicture')
        .populate('doctorId', 'firstName lastName specialty phone email')
        .populate('clinicId', 'name')
        .populate('serviceId', 'name durationMinutes price description sessions._id sessions.name sessions.order')
        .populate(
          'invoiceId',
          'paymentStatus services.serviceId services.sessions.appointmentId services.sessions.sessionName services.sessions.sessionOrder',
        )
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .lean()
        .exec(),
      this.appointmentModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      appointments: transformAppointmentList(rawAppointments),
      total,
      page: pageNum,
      totalPages,
    };
  }

  /**
   * Get appointment by ID
   * UC-1c3a2b0 & UC-6e5f4d3: View Appointment Details
   * 
   * Returns complete appointment information including:
   * - Core appointment data
   * - Populated patient, doctor, clinic, service, department
   * - Invoice details (number, title, status, amount)
   * - Medical report (for completed appointments with prescriptions)
   * - Audit trail (created/updated/cancelled by users)
   */
  async getAppointmentById(appointmentId: string): Promise<any> {
    if (!Types.ObjectId.isValid(appointmentId)) {
      throw new BadRequestException({
        message: {
          ar: 'معرف الموعد غير صالح',
          en: 'Invalid appointment ID format',
        },
        code: 'INVALID_APPOINTMENT_ID',
      });
    }

    const appointment = await this.appointmentModel
      .findOne({
        _id: new Types.ObjectId(appointmentId),
        deletedAt: { $exists: false },
      })
      // Core entities with enhanced fields
      .populate('patientId', 'firstName lastName phone email profilePicture dateOfBirth gender bloodType')
      .populate('doctorId', 'firstName lastName specialty email phone')
      .populate('clinicId', 'name address phone email')
      .populate('serviceId', 'name description durationMinutes price sessions')
      .populate('departmentId', 'name description')
      // Invoice details (UC-1c3a2b0 requirement)
      .populate('invoiceId', 'invoiceNumber title status totalAmount paidAmount dueAmount paymentStatus')
      // Medical report for completed appointments (prescriptions)
      .populate('medicalReportId', 'diagnosis symptoms medications treatmentPlan followUpInstructions')
      // Audit trail
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email')
      .populate('cancelledBy', 'firstName lastName email')
      .lean()
      .exec();

    if (!appointment) {
      throw new NotFoundException({
        message: {
          ar: 'الموعد غير موجود',
          en: 'Appointment not found',
        },
        code: 'APPOINTMENT_NOT_FOUND',
      });
    }

    return transformAppointment(appointment);
  }

  /**
   * M7 Integration: Get available sessions for an invoice.
   * Returns sessions that are 'pending' or 'cancelled'.
   * 
   * Requirement: 15.1, 15.2 (Available sessions for booking)
   */
  async getAvailableSessionsForInvoice(invoiceId: string): Promise<any[]> {
    if (!Types.ObjectId.isValid(invoiceId)) {
      throw new BadRequestException({
        message: {
          ar: 'معرف الفاتورة غير صالح',
          en: 'Invalid invoice ID format',
        },
        code: 'INVALID_INVOICE_ID',
      });
    }

    const invoice = await this.invoiceModel.findOne({
      _id: new Types.ObjectId(invoiceId),
      deletedAt: { $exists: false },
    });

    if (!invoice) {
      throw new NotFoundException({
        message: {
          ar: 'الفاتورة غير موجودة',
          en: 'Invoice not found',
        },
        code: 'INVOICE_NOT_FOUND',
      });
    }

    const availableSessions: any[] = [];
    const services = invoice.services as any[];

    for (const service of services) {
      const sessions = service.sessions || [];
      for (const session of sessions) {
        // A session is available if it's pending or cancelled
        // cancelled sessions are available for rebooking (e.g. if the previous booking was no_show or cancelled)
        if (['pending', 'cancelled'].includes(session.sessionStatus)) {
          availableSessions.push({
            serviceId: service.serviceId,
            serviceName: service.serviceName,
            ...session,
          });
        }
      }
    }

    return availableSessions;
  }

  /**
   * Update appointment
   * UC-b6d5c4e: Edit Appointment details
   * 
   * Task 6.9: Re-validate when doctor or service changes (Requirement 9.3)
   * Precondition: Appointment status must not be 'completed'
   */
  async updateAppointment(
    appointmentId: string,
    updateAppointmentDto: UpdateAppointmentDto,
    updatedByUserId?: string,
    userRole?: string,
  ): Promise<Appointment> {
    if (!Types.ObjectId.isValid(appointmentId)) {
      throw new BadRequestException({
        message: {
          ar: 'معرف الموعد غير صالح',
          en: 'Invalid appointment ID format',
        },
        code: 'INVALID_APPOINTMENT_ID',
      });
    }

    this.logger.log(`Updating appointment: ${appointmentId}`);

    // Get existing appointment to check what's changing
    const existingAppointment = await this.appointmentModel.findOne({
      _id: new Types.ObjectId(appointmentId),
      deletedAt: { $exists: false },
    });

    if (!existingAppointment) {
      throw new NotFoundException({
        message: {
          ar: 'الموعد غير موجود',
          en: 'Appointment not found',
        },
        code: 'APPOINTMENT_NOT_FOUND',
      });
    }

    // BZR-perm75: Doctor can only edit their own assigned appointments
    if (userRole === 'doctor' && updatedByUserId && existingAppointment.doctorId) {
      if (existingAppointment.doctorId.toString() !== updatedByUserId.toString()) {
        throw new ForbiddenException({
          message: {
            ar: 'يمكن للطبيب تعديل مواعيده المخصصة له فقط',
            en: 'Doctor can only edit their own assigned appointments',
          },
          code: 'DOCTOR_NOT_ASSIGNED',
        });
      }
    }

    const editLockReason = getAppointmentEditLockReason(existingAppointment);

    if (editLockReason === 'terminal_status') {
      throw new BadRequestException({
        message: {
          ar: 'لا يمكن تعديل الموعد إذا كانت حالته ملغاة أو مكتملة أو فائتة',
          en: 'Cannot edit cancelled, completed, or missed appointments',
        },
        code: 'APPOINTMENT_READ_ONLY_STATUS',
        appointmentId,
        currentStatus: existingAppointment.status,
      });
    }

    if (editLockReason === 'past_two_days') {
      throw new BadRequestException({
        message: {
          ar: 'لا يمكن تعديل الموعد بعد مرور أكثر من يومين على موعده',
          en: 'Cannot edit appointment more than 2 days after its scheduled time',
        },
        code: 'APPOINTMENT_EDIT_WINDOW_EXPIRED',
        appointmentId,
        currentStatus: existingAppointment.status,
      });
    }

    // UC-b6d5c4e Precondition: Cannot edit completed appointments
    if (existingAppointment.status === 'completed') {
      throw new BadRequestException({
        message: {
          ar: 'لا يمكن تعديل موعد مكتمل',
          en: 'Cannot edit completed appointment',
        },
        code: 'APPOINTMENT_COMPLETED',
        appointmentId,
        currentStatus: existingAppointment.status,
      });
    }

    // N1: Reject past dates when updating appointment date/time
    if (updateAppointmentDto.appointmentDate) {
      const newDate = new Date(updateAppointmentDto.appointmentDate);
      const newDateStr = newDate.toISOString().split('T')[0];
      const timeStr =
        updateAppointmentDto.appointmentTime ||
        (existingAppointment.appointmentTime as string) ||
        '00:00';
      const [h, m] = timeStr.split(':').map(Number);
      const appointmentDateTime = new Date(
        `${newDateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`,
      );
      const now = new Date();
      if (appointmentDateTime < now) {
        throw new BadRequestException({
          message: {
            ar: 'لا يمكن تحديث موعد إلى تاريخ أو وقت في الماضي',
            en: 'Cannot update appointment to a past date or time',
          },
          code: 'PAST_DATE_NOT_ALLOWED',
        });
      }
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
      throw new NotFoundException({
        message: {
          ar: 'الموعد غير موجود',
          en: 'Appointment not found',
        },
        code: 'APPOINTMENT_NOT_FOUND',
      });
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
    // BUG-001: appointment is TransformedAppointment; use .patient._id and .doctor._id
    const conflicts = await this.checkAppointmentConflicts(
      appointment.patient._id.toString(),
      appointment.doctor._id.toString(),
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

    // BUG-007: populate rescheduleHistory instead of appending to notes
    const updateData: any = {
      appointmentDate: new Date(rescheduleDto.newAppointmentDate),
      appointmentTime: rescheduleDto.newAppointmentTime,
      rescheduledReason: rescheduleDto.reason,
      rescheduledAt: new Date(),
      rescheduleRequested: true,
      updatedBy: updatedByUserId
        ? new Types.ObjectId(updatedByUserId)
        : undefined,
      $push: {
        rescheduleHistory: {
          previousDate: appointment.datetime ? new Date(appointment.datetime) : undefined,
          previousTime: appointment.datetime ? appointment.datetime.substring(11, 16) : undefined,
          newDate: new Date(rescheduleDto.newAppointmentDate),
          newTime: rescheduleDto.newAppointmentTime,
          reason: rescheduleDto.reason,
          rescheduledAt: new Date(),
          rescheduledBy: updatedByUserId ? new Types.ObjectId(updatedByUserId) : undefined,
        },
      },
    };

    const updatedAppointment = await this.appointmentModel
      .findByIdAndUpdate(appointmentId, updateData, { new: true })
      .exec();

    this.logger.log(`Appointment rescheduled: ${appointmentId}`);

    // Send notification to patient (BUG-001: use appointment.patient._id)
    await this.notificationService.create({
      recipientId: appointment.patient._id.toString(),
      title: 'Appointment Rescheduled',
      message: `Your appointment has been rescheduled to ${rescheduleDto.newAppointmentDate} at ${rescheduleDto.newAppointmentTime}`,
      notificationType: 'appointment_rescheduled',
      priority: 'high',
      relatedEntityType: 'appointment',
      relatedEntityId: appointmentId,
      deliveryMethod: 'in_app',
    });

    // Send notification to doctor (BUG-001: use appointment.doctor._id)
    await this.notificationService.create({
      recipientId: appointment.doctor._id.toString(),
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

    // Check if appointment can be cancelled (BUG-005: also block in_progress)
    if (['completed', 'cancelled', 'in_progress'].includes(appointment.status)) {
      throw new BadRequestException(
        'Cannot cancel appointment with current status',
      );
    }

    const updateData: any = {
      status: 'cancelled',
      cancellationReason: cancelDto.cancellationReason,
      // BUG-006: set cancelledAt and cancelledBy
      cancelledAt: new Date(),
      cancelledBy: updatedByUserId ? new Types.ObjectId(updatedByUserId) : undefined,
      updatedBy: updatedByUserId
        ? new Types.ObjectId(updatedByUserId)
        : undefined,
    };

    const updatedAppointment = await this.appointmentModel
      .findByIdAndUpdate(appointmentId, updateData, { new: true })
      .exec();

    this.logger.log(`Appointment cancelled: ${appointmentId}`);

    // Hook 4 (PART B): Update linked invoice session status to 'cancelled'
    if (appointment.invoiceId) {
      try {
        const linkedInvoice = await this.invoiceModel.findById(appointment.invoiceId);
        if (linkedInvoice) {
          // Find the session linked to this appointment and set it to cancelled
          const invoiceItemId = await this._findInvoiceItemId(linkedInvoice, appointmentId);
          if (invoiceItemId) {
            await this.invoiceModel.updateOne(
              { _id: appointment.invoiceId },
              { $set: { 'services.$[].sessions.$[item].sessionStatus': 'cancelled' } },
              { arrayFilters: [{ 'item.invoiceItemId': new Types.ObjectId(invoiceItemId) }] },
            );
          } else {
            // Fallback: match by appointmentId when invoiceItemId is not set on the session
            await this.invoiceModel.updateOne(
              { _id: appointment.invoiceId },
              { $set: { 'services.$[].sessions.$[item].sessionStatus': 'cancelled' } },
              { arrayFilters: [{ 'item.appointmentId': new Types.ObjectId(appointmentId) }] },
            );
          }
        }
      } catch (err) {
        this.logger.error(`Failed to update invoice session on cancel: ${err.message}`);
      }
    }

    // Send notification to patient (BUG-001: use appointment.patient._id)
    await this.notificationService.create({
      recipientId: appointment.patient._id.toString(),
      title: 'Appointment Cancelled',
      message: `Your appointment has been cancelled. Reason: ${cancelDto.cancellationReason || 'No reason provided'}`,
      notificationType: 'appointment_cancelled',
      priority: 'high',
      relatedEntityType: 'appointment',
      relatedEntityId: appointmentId,
      deliveryMethod: 'in_app',
    });

    // Send notification to doctor (BUG-001: use appointment.doctor._id)
    await this.notificationService.create({
      recipientId: appointment.doctor._id.toString(),
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
   * M7 Integration: Transitions linked draft invoices to Posted status
   * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7
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

    // M7 Integration: Transition linked invoice to Posted status (BUG-012: guard against double transition)
    // Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7
    if (appointment.invoiceId) {
      try {
        const linkedInvoice = await this.invoiceModel.findById(appointment.invoiceId);
        if (linkedInvoice && linkedInvoice.invoiceStatus !== 'posted') {
          this.logger.log(
            `Transitioning linked invoice ${appointment.invoiceId} to Posted status`,
          );
          await this.invoiceService.transitionToPosted(
            appointment.invoiceId.toString(),
          );
          this.logger.log(
            `Invoice ${appointment.invoiceId} successfully transitioned to Posted`,
          );

          // Audit log for integration event
          if (updatedByUserId) {
            await this.auditService.logSecurityEvent({
              eventType: 'INVOICE_TRANSITIONED_ON_APPOINTMENT_CONFIRMATION',
              userId: updatedByUserId,
              actorId: updatedByUserId,
              ipAddress: '0.0.0.0',
              userAgent: 'System',
              timestamp: new Date(),
              metadata: {
                appointmentId,
                invoiceId: appointment.invoiceId.toString(),
                action: 'invoice_transition_to_posted',
              },
            });
          }
        }
      } catch (error) {
        // Handle errors gracefully - log but don't fail appointment confirmation
        // Requirement: 15.7
        this.logger.error(
          `Failed to transition invoice ${appointment.invoiceId} to Posted: ${error.message}`,
          error.stack,
        );

        // Log the error for monitoring
        if (updatedByUserId) {
          await this.auditService.logSecurityEvent({
            eventType: 'INVOICE_TRANSITION_FAILED',
            userId: updatedByUserId,
            actorId: updatedByUserId,
            ipAddress: '0.0.0.0',
            userAgent: 'System',
            timestamp: new Date(),
            metadata: {
              appointmentId,
              invoiceId: appointment.invoiceId.toString(),
              error: error.message,
            },
          });
        }

        // Continue with appointment confirmation despite invoice transition failure
        this.logger.warn(
          `Appointment ${appointmentId} confirmed successfully, but invoice transition failed`,
        );
      }
    }

    // Send notification to patient (BUG-001: use appointment.patient._id)
    await this.notificationService.create({
      recipientId: appointment.patient._id.toString(),
      title: 'Appointment Confirmed',
      message: `Your appointment has been confirmed for ${appointment.datetime?.split('T')[0] ?? ''} at ${appointment.datetime?.substring(11, 16) ?? ''}. ${confirmDto.confirmationNotes || ''}`,
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
   * Rule BZR-0e1f2a3b: If all appointments for a patient are deleted, the associated invoice will be marked as Cancelled.
   */
  async deleteAppointment(
    appointmentId: string,
    deletedByUserId?: string,
    requestingUser?: any,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(appointmentId)) {
      throw new BadRequestException({
        message: {
          ar: 'تنسيق معرف الموعد غير صالح',
          en: 'Invalid appointment ID format',
        },
        code: 'INVALID_APPOINTMENT_ID',
      });
    }

    this.logger.log(`Soft deleting appointment: ${appointmentId}`);

    const appointment = await this.appointmentModel.findOne({
      _id: new Types.ObjectId(appointmentId),
      deletedAt: { $exists: false },
    });

    if (!appointment) {
      throw new NotFoundException({
        message: {
          ar: 'الموعد غير موجود',
          en: 'Appointment not found',
        },
        code: 'APPOINTMENT_NOT_FOUND',
      });
    }

    // Precondition: Cannot delete completed or effectively in-progress appointments
    if (
      appointment.status === 'completed' ||
      this.isAppointmentEffectivelyInProgress(appointment)
    ) {
      throw new BadRequestException({
        message: {
          ar: 'لا يمكن حذف المواعيد المكتملة أو الجارية',
          en: 'You cannot delete an appointment that is in progress or completed.',
        },
        code: 'APPOINTMENT_CANNOT_DELETE',
      });
    }

    // Perform soft delete
    appointment.deletedAt = new Date();
    appointment.isDeleted = true;
    if (deletedByUserId) {
      appointment.deletedBy = new Types.ObjectId(deletedByUserId);
      appointment.updatedBy = new Types.ObjectId(deletedByUserId);
    }
    await appointment.save();

    this.logger.log(`Appointment soft deleted successfully: ${appointmentId}`);

    if (appointment.invoiceId) {
      await this.invoiceModel.updateOne(
        {
          _id: appointment.invoiceId,
          'services.sessions.appointmentId': appointment._id,
        },
        {
          $set: {
            'services.$[].sessions.$[session].appointmentId': null,
            'services.$[].sessions.$[session].sessionStatus': 'pending',
          },
        },
        {
          arrayFilters: [
            {
              'session.appointmentId': appointment._id,
            },
          ],
        },
      );
    }

    // Rule BZR-0e1f2a3b:
    // If all appointments for the patient are deleted, mark the associated invoice as cancelled.
    if (appointment.invoiceId && appointment.patientId) {
      const remainingPatientAppointments =
        await this.appointmentModel.countDocuments({
          patientId: appointment.patientId,
          deletedAt: { $exists: false },
        });

      if (remainingPatientAppointments === 0) {
        this.logger.log(
          `No undeleted appointments remain for patient ${appointment.patientId}. Cancelling invoice ${appointment.invoiceId} per rule BZR-0e1f2a3b.`,
        );
        try {
          await this.invoiceService.cancelInvoice(
            appointment.invoiceId.toString(),
            deletedByUserId || appointment.createdBy.toString(),
            requestingUser,
          );
        } catch (error) {
          // Log error but don't fail the appointment deletion
          this.logger.error(
            `Failed to auto-cancel invoice ${appointment.invoiceId} after deleting last appointment: ${error.message}`,
          );
        }
      }
    }
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
          $unset: { deletedAt: '' },
          $set: { isDeleted: false },
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
  async getAppointmentStats(
    userId?: string,
    userRole?: string,
    userClinicId?: string,
    subscriptionId?: string,
    complexId?: string,
  ): Promise<AppointmentStatsDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Build base filter for scoping
    const filter: any = { deletedAt: { $exists: false } };
    
    // Role-based scoping logic (shared with getAppointments)
    if (userRole === 'doctor' && userId) {
      filter.doctorId = new Types.ObjectId(userId);
    } else if (userRole === 'staff' && userClinicId) {
      filter.clinicId = new Types.ObjectId(userClinicId);
    } else if (userRole === 'admin' && userClinicId) {
      filter.clinicId = new Types.ObjectId(userClinicId);
    } else if (userRole === 'owner' || userRole === 'manager') {
      if (complexId && Types.ObjectId.isValid(complexId)) {
        const complexClinics = await this.clinicModel
          .find({ complexId: new Types.ObjectId(complexId), deletedAt: { $exists: false } })
          .select('_id')
          .lean();
        filter.clinicId = { $in: complexClinics.map((c: any) => c._id) };
      } else if (subscriptionId && Types.ObjectId.isValid(subscriptionId)) {
        const ownerClinics = await this.clinicModel
          .find({ subscriptionId: new Types.ObjectId(subscriptionId), deletedAt: { $exists: false } })
          .select('_id')
          .lean();
        filter.clinicId = { $in: ownerClinics.map((c: any) => c._id) };
      }
    } else if (userRole !== 'super_admin') {
      if (userClinicId) filter.clinicId = new Types.ObjectId(userClinicId);
      else filter.clinicId = { $in: [] };
    }

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
      this.appointmentModel.countDocuments(filter),

      // Status counts
      this.appointmentModel.countDocuments({ ...filter, status: 'scheduled' }),
      this.appointmentModel.countDocuments({ ...filter, status: 'confirmed' }),
      this.appointmentModel.countDocuments({ ...filter, status: 'completed' }),
      this.appointmentModel.countDocuments({ ...filter, status: 'cancelled' }),
      this.appointmentModel.countDocuments({ ...filter, status: 'no_show' }),

      // Today's appointments
      this.appointmentModel.countDocuments({
        ...filter,
        appointmentDate: { $gte: today, $lt: tomorrow },
      }),

      // Upcoming appointments
      this.appointmentModel.countDocuments({
        ...filter,
        appointmentDate: { $gte: today },
        status: { $in: ['scheduled', 'confirmed'] },
      }),

      // Average duration
      this.appointmentModel.aggregate([
        { $match: filter },
        { $group: { _id: null, avgDuration: { $avg: '$durationMinutes' } } },
      ]),

      // Top services
      this.appointmentModel.aggregate([
        { $match: filter },
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
        { $match: filter },
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
        { $match: filter },
        { $group: { _id: '$urgency', count: { $sum: 1 } } },
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

  async getDoctorDashboardStats(
    userId: string | undefined,
    userRole: string | undefined,
    dateFrom: string,
    dateTo: string,
    requestedDoctorId?: string,
    requestedClinicId?: string,
  ): Promise<{
    total: number;
    scheduled: number;
    completed: number;
    cancelled: number;
    missed: number;
  }> {
    const from = new Date(`${dateFrom}T00:00:00.000Z`);
    const to = new Date(`${dateTo}T23:59:59.999Z`);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid dateFrom/dateTo format. Expected YYYY-MM-DD');
    }

    const match: any = {
      appointmentDate: { $gte: from, $lte: to },
      deletedAt: { $exists: false },
      isDeleted: { $ne: true },
    };

    // Doctors can only see their own stats regardless of doctorId query.
    if (userRole === 'doctor') {
      if (!userId || !Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('Invalid authenticated doctor ID');
      }
      match.doctorId = new Types.ObjectId(userId);
    } else if (requestedDoctorId && Types.ObjectId.isValid(requestedDoctorId)) {
      match.doctorId = new Types.ObjectId(requestedDoctorId);
    }

    if (requestedClinicId && Types.ObjectId.isValid(requestedClinicId)) {
      match.clinicId = new Types.ObjectId(requestedClinicId);
    }

    const grouped = await this.appointmentModel.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    let total = 0;
    let scheduled = 0;
    let completed = 0;
    let cancelled = 0;
    let missed = 0;

    for (const item of grouped) {
      total += item.count;
      if (item._id === 'scheduled' || item._id === 'confirmed') {
        scheduled += item.count;
      } else if (item._id === 'completed') {
        completed += item.count;
      } else if (item._id === 'cancelled') {
        cancelled += item.count;
      } else if (item._id === 'no_show') {
        missed += item.count;
      }
    }

    return {
      total,
      scheduled,
      completed,
      cancelled,
      missed,
    };
  }

  private async resolveDashboardClinicScope(params: {
    userRole?: string;
    userPlanType?: string;
    userClinicId?: string;
    userClinicIds?: string[];
    userComplexId?: string;
    userSubscriptionId?: string;
    userOrganizationId?: string;
    clinicIds?: string[];
  }): Promise<Types.ObjectId[]> {
    const {
      userRole,
      userPlanType,
      userClinicId,
      userClinicIds,
      userComplexId,
      userSubscriptionId,
      userOrganizationId,
      clinicIds,
    } = params;

    const requestedIds = (clinicIds ?? []).filter((id) => Types.ObjectId.isValid(id));
    let effectiveIds = [...requestedIds];

    // Staff is restricted to assigned clinicIds only; requested clinicIds must be intersected.
    if (userRole === 'staff') {
      const scopedIds = Array.isArray(userClinicIds)
        ? userClinicIds.filter((id) => Types.ObjectId.isValid(id))
        : [];

      if (scopedIds.length === 0 && userClinicId && Types.ObjectId.isValid(userClinicId)) {
        scopedIds.push(userClinicId);
      }

      effectiveIds = requestedIds.length > 0
        ? scopedIds.filter((id) => requestedIds.includes(id))
        : scopedIds;
    } else if (userRole === 'admin') {
      const scopedIds = Array.isArray(userClinicIds)
        ? userClinicIds.filter((id) => Types.ObjectId.isValid(id))
        : [];

      if (scopedIds.length === 0 && userClinicId && Types.ObjectId.isValid(userClinicId)) {
        scopedIds.push(userClinicId);
      }

      effectiveIds = requestedIds.length > 0
        ? scopedIds.filter((id) => requestedIds.includes(id))
        : scopedIds;
    } else if (
      userRole === 'doctor' &&
      userClinicId &&
      Types.ObjectId.isValid(userClinicId)
    ) {
      effectiveIds = requestedIds.length > 0
        ? requestedIds.filter((id) => id === userClinicId)
        : [userClinicId];
    }

    const clinicFilter: any = {
      deletedAt: { $exists: false },
      isActive: true,
    };

    const normalizedPlanType = String(userPlanType ?? '').toLowerCase();
    const shouldScopeByComplex =
      !!userComplexId &&
      Types.ObjectId.isValid(userComplexId) &&
      // Company-plan users must see all clinics in tenant unless they explicitly filter by complex.
      normalizedPlanType !== 'company';

    if (shouldScopeByComplex) {
      clinicFilter.complexId = new Types.ObjectId(userComplexId);
    }

    // Mandatory tenant boundary for non-super-admin users.
    if (userRole !== 'super_admin') {
      if (userSubscriptionId && Types.ObjectId.isValid(userSubscriptionId)) {
        clinicFilter.subscriptionId = new Types.ObjectId(userSubscriptionId);
      } else if (userOrganizationId && Types.ObjectId.isValid(userOrganizationId)) {
        clinicFilter.organizationId = new Types.ObjectId(userOrganizationId);
      } else {
        return [];
      }
    }

    if (effectiveIds.length > 0) {
      clinicFilter._id = { $in: effectiveIds.map((id) => new Types.ObjectId(id)) };
    }

    const clinics = await this.clinicModel.find(clinicFilter).select('_id').lean();
    return clinics.map((clinic: any) => clinic._id as Types.ObjectId);
  }

  /**
   * Get staff dashboard statistics
   */
  async getStaffDashboardStats(
    userId: string | undefined,
    userRole: string | undefined,
    userPlanType: string | undefined,
    userClinicId: string | undefined,
    userClinicIds: string[] | undefined,
    userComplexId: string | undefined,
    userSubscriptionId: string | undefined,
    userOrganizationId: string | undefined,
    dateFrom: string,
    dateTo: string,
    clinicIds?: string[],
  ): Promise<{
    stats: { total: number; scheduled: number; completed: number; cancelled: number; missed: number };
    clinicBreakdown: Array<{
      clinicId: string;
      clinicName: string;
      total: number;
      completed: number;
      cancelled: number;
      appointmentHours: number;
      workingHoursInRange: number;
      isCurrentlyBusy: boolean;
    }>;
    peakHours: Array<{ hour: string; count: number }>;
  }> {
    const from = new Date(`${dateFrom}T00:00:00.000Z`);
    const to = new Date(`${dateTo}T23:59:59.999Z`);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid dateFrom/dateTo format. Expected YYYY-MM-DD');
    }

    const match: any = {
      appointmentDate: { $gte: from, $lte: to },
      deletedAt: { $exists: false },
      isDeleted: { $ne: true },
    };

    const effectiveClinicObjectIds = await this.resolveDashboardClinicScope({
      userRole,
      userPlanType,
      userClinicId,
      userClinicIds,
      userComplexId,
      userSubscriptionId,
      userOrganizationId,
      clinicIds,
    });

    if (effectiveClinicObjectIds.length > 0) {
      match.clinicId = { $in: effectiveClinicObjectIds };
    } else if (userRole !== 'super_admin') {
      // Non-super-admin users must never escape clinic scope.
      match.clinicId = { $in: [] };
    }

    const doctorScopeQuery: any = {
      role: 'doctor',
      isActive: true,
      deletedAt: { $exists: false },
    };
    if (userRole !== 'super_admin') {
      if (userSubscriptionId && Types.ObjectId.isValid(userSubscriptionId)) {
        doctorScopeQuery.subscriptionId = new Types.ObjectId(userSubscriptionId);
      } else if (userOrganizationId && Types.ObjectId.isValid(userOrganizationId)) {
        doctorScopeQuery.organizationId = new Types.ObjectId(userOrganizationId);
      } else {
        doctorScopeQuery._id = { $in: [] };
      }
    }
    if (effectiveClinicObjectIds.length > 0) {
      doctorScopeQuery.$or = [
        { clinicId: { $in: effectiveClinicObjectIds } },
        { clinicIds: { $in: effectiveClinicObjectIds } },
      ];
    }
    const activeDoctors = await this.userModel.find(doctorScopeQuery).select('_id').lean();
    const activeDoctorIds = activeDoctors.map((doctor: any) => doctor._id);
    match.doctorId = { $in: activeDoctorIds };

    // Stats aggregate
    const grouped = await this.appointmentModel.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    let total = 0;
    let scheduled = 0;
    let completed = 0;
    let cancelled = 0;
    let missed = 0;

    for (const item of grouped) {
      total += item.count;
      if (item._id === 'scheduled' || item._id === 'confirmed') {
        scheduled += item.count;
      } else if (item._id === 'completed') {
        completed += item.count;
      } else if (item._id === 'cancelled') {
        cancelled += item.count;
      } else if (item._id === 'no_show') {
        missed += item.count;
      }
    }

    // Fetch ALL clinics in scope (not just those with appointments in range)
    const allClinicDocs = await this.clinicModel
      .find({ _id: { $in: effectiveClinicObjectIds }, deletedAt: { $exists: false }, isActive: true })
      .select('_id name')
      .lean();

    // Aggregate appointment stats per clinic for the date range only
    const clinicAgg = await this.appointmentModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$clinicId',
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
          },
          appointmentHours: {
            $sum: {
              $cond: [
                { $ne: ['$status', 'cancelled'] },
                { $divide: [{ $ifNull: ['$durationMinutes', 0] }, 60] },
                0,
              ],
            },
          },
        },
      },
    ]);

    const clinicStatsMap = new Map(clinicAgg.map((item) => [String(item._id), item]));

    const clinicBreakdownBase = allClinicDocs.map((clinic: any) => {
      const s = clinicStatsMap.get(String(clinic._id));
      return {
        clinicId: String(clinic._id),
        clinicName: clinic.name,
        total: s?.total ?? 0,
        completed: s?.completed ?? 0,
        cancelled: s?.cancelled ?? 0,
        appointmentHours: Math.round((s?.appointmentHours ?? 0) * 10) / 10,
      };
    });

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const todayStart = new Date(`${todayStr}T00:00:00.000Z`);
    const todayEnd = new Date(`${todayStr}T23:59:59.999Z`);

    const liveClinicAppointments = await this.appointmentModel
      .find({
        clinicId: { $in: effectiveClinicObjectIds },
        appointmentDate: { $gte: todayStart, $lte: todayEnd },
        status: { $in: ['scheduled', 'confirmed', 'in_progress'] },
        deletedAt: { $exists: false },
        isDeleted: { $ne: true },
      })
      .select('clinicId appointmentDate appointmentTime status durationMinutes serviceId')
      .populate('serviceId', 'duration')
      .lean();

    const busyClinicIds = new Set<string>();
    for (const appt of liveClinicAppointments as any[]) {
      const apptStart = this.getAppointmentStartDateTime(appt);
      if (!apptStart) continue;

      const serviceDuration =
        typeof appt.serviceId?.duration === 'number' && appt.serviceId.duration > 0
          ? appt.serviceId.duration
          : null;
      const durationMinutes =
        serviceDuration ??
        (typeof appt.durationMinutes === 'number' && appt.durationMinutes > 0
          ? appt.durationMinutes
          : 30);
      const apptEnd = new Date(apptStart.getTime() + durationMinutes * 60 * 1000);

      if (now >= apptStart && now < apptEnd) {
        busyClinicIds.add(String(appt.clinicId));
      }
    }

    const clinicBreakdown = await Promise.all(
      clinicBreakdownBase.map(async (clinicEntry) => ({
        ...clinicEntry,
        workingHoursInRange: await this.calculateWorkingHoursInRange(
          dateFrom,
          dateTo,
          clinicEntry.clinicId,
          'clinic',
        ),
        isCurrentlyBusy: busyClinicIds.has(String(clinicEntry.clinicId)),
      })),
    );

    // Peak hours (08-20) — use appointmentTime "HH:mm" string since appointmentDate stores midnight only
    const peakAgg = await this.appointmentModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $toInt: { $substr: ['$appointmentTime', 0, 2] } },
          count: { $sum: 1 },
        },
      },
    ]);

    const peakMap = new Map<number, number>(peakAgg.map((item) => [item._id, item.count]));
    const peakHours: Array<{ hour: string; count: number }> = [];
    for (let h = 8; h <= 20; h++) {
      peakHours.push({ hour: `${String(h).padStart(2, '0')}:00`, count: peakMap.get(h) ?? 0 });
    }

    return { stats: { total, scheduled, completed, cancelled, missed }, clinicBreakdown, peakHours };
  }

  /**
   * Get owner/admin dashboard statistics.
   * Revenue basis:
   * - Actual: sum of payments in selected range
   * - Expected: sum of invoice totals in selected range
   */
  async getAdminOwnerDashboardStats(
    _userId: string | undefined,
    userRole: string | undefined,
    userPlanType: string | undefined,
    userClinicId: string | undefined,
    userClinicIds: string[] | undefined,
    userComplexId: string | undefined,
    userSubscriptionId: string | undefined,
    userOrganizationId: string | undefined,
    dateFrom: string,
    dateTo: string,
    complexIds?: string[],
    clinicIds?: string[],
  ): Promise<{
    stats: {
      newPatients: { current: number; previous: number; trendPercent: number };
      services: { activeCount: number };
      revenue: { actual: number; expected: number };
      occupancy: { percent: number; bookedHours: number; availableHours: number };
    };
    clinicRevenueRanking: Array<{
      clinicId: string;
      clinicName: string;
      actual: number;
      expected: number;
      occupancy: number;
      bookedHours: number;
      availableHours: number;
    }>;
  }> {
    const from = new Date(`${dateFrom}T00:00:00.000Z`);
    const to = new Date(`${dateTo}T23:59:59.999Z`);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid dateFrom/dateTo format. Expected YYYY-MM-DD');
    }

    const requestedComplexIds = (complexIds ?? []).filter((id) => Types.ObjectId.isValid(id));
    const requestedClinicIds = (clinicIds ?? []).filter((id) => Types.ObjectId.isValid(id));
    const hasExplicitClinicFilter = requestedClinicIds.length > 0;
    const effectiveClinicObjectIdsRaw = await this.resolveDashboardClinicScope({
      userRole,
      userPlanType,
      userClinicId,
      userClinicIds,
      userComplexId,
      userSubscriptionId,
      userOrganizationId,
      clinicIds,
    });

    let effectiveClinicObjectIds = effectiveClinicObjectIdsRaw;
    if (requestedComplexIds.length > 0 && effectiveClinicObjectIdsRaw.length > 0) {
      const scopedClinicsByComplex = await this.clinicModel
        .find({
          _id: { $in: effectiveClinicObjectIdsRaw },
          complexId: { $in: requestedComplexIds.map((id) => new Types.ObjectId(id)) },
          deletedAt: { $exists: false },
          isActive: true,
        })
        .select('_id')
        .lean();

      effectiveClinicObjectIds = scopedClinicsByComplex.map((clinic: any) => clinic._id as Types.ObjectId);
    }

    if (effectiveClinicObjectIds.length === 0 && userRole !== 'super_admin') {
      return {
        stats: {
          newPatients: { current: 0, previous: 0, trendPercent: 0 },
          services: { activeCount: 0 },
          revenue: { actual: 0, expected: 0 },
          occupancy: { percent: 0, bookedHours: 0, availableHours: 0 },
        },
        clinicRevenueRanking: [],
      };
    }

    const clinicDocs = await this.clinicModel
      .find({
        _id: { $in: effectiveClinicObjectIds },
        deletedAt: { $exists: false },
        isActive: true,
      })
      .select('_id name complexId')
      .lean();
    const scopedClinicIds = clinicDocs.map((clinic: any) => clinic._id as Types.ObjectId);

    if (scopedClinicIds.length === 0) {
      return {
        stats: {
          newPatients: { current: 0, previous: 0, trendPercent: 0 },
          services: { activeCount: 0 },
          revenue: { actual: 0, expected: 0 },
          occupancy: { percent: 0, bookedHours: 0, availableHours: 0 },
        },
        clinicRevenueRanking: [],
      };
    }

    const selectedDays = Math.max(
      Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1,
      1,
    );
    const previousTo = new Date(from.getTime() - 1);
    const previousFrom = new Date(previousTo);
    previousFrom.setUTCDate(previousFrom.getUTCDate() - (selectedDays - 1));

    const countNewPatientsInRange = async (
      rangeFrom: Date,
      rangeTo: Date,
    ): Promise<number> => {
      const patientsInRangeAgg = await this.appointmentModel.aggregate([
        {
          $match: {
            appointmentDate: { $gte: rangeFrom, $lte: rangeTo },
            clinicId: { $in: scopedClinicIds },
            deletedAt: { $exists: false },
            isDeleted: { $ne: true },
          },
        },
        { $group: { _id: '$patientId' } },
      ]);

      const patientIds = patientsInRangeAgg
        .map((row: any) => row._id)
        .filter((id: unknown) => id instanceof Types.ObjectId);

      if (patientIds.length === 0) return 0;

      const firstAppointments = await this.appointmentModel.aggregate([
        {
          $match: {
            patientId: { $in: patientIds },
            clinicId: { $in: scopedClinicIds },
            deletedAt: { $exists: false },
            isDeleted: { $ne: true },
          },
        },
        { $group: { _id: '$patientId', firstAppointmentDate: { $min: '$appointmentDate' } } },
        { $match: { firstAppointmentDate: { $gte: rangeFrom, $lte: rangeTo } } },
        { $count: 'count' },
      ]);

      return Number(firstAppointments[0]?.count ?? 0);
    };

    const [currentNewPatients, previousNewPatients] = await Promise.all([
      countNewPatientsInRange(from, to),
      countNewPatientsInRange(previousFrom, previousTo),
    ]);

    const newPatientsTrend =
      previousNewPatients === 0
        ? currentNewPatients === 0
          ? 0
          : 100
        : ((currentNewPatients - previousNewPatients) / previousNewPatients) * 100;

    const activeServicesScopeQuery: any = {
      isActive: true,
      deletedAt: { $exists: false },
      $or: [
        { clinicId: { $in: scopedClinicIds } },
        { clinicIds: { $in: scopedClinicIds } },
        { complexId: { $in: clinicDocs.map((clinic: any) => clinic.complexId).filter(Boolean) } },
      ],
    };
    if (userRole !== 'super_admin') {
      if (userSubscriptionId && Types.ObjectId.isValid(userSubscriptionId)) {
        activeServicesScopeQuery.subscriptionId = new Types.ObjectId(userSubscriptionId);
      } else if (userOrganizationId && Types.ObjectId.isValid(userOrganizationId)) {
        activeServicesScopeQuery.organizationId = new Types.ObjectId(userOrganizationId);
      } else {
        activeServicesScopeQuery._id = { $in: [] };
      }
    }

    const activeServicesCount = await this.serviceModel.countDocuments(activeServicesScopeQuery);

    // Remaining-capacity window: ignore past time in selected range.
    const now = new Date();
    const effectiveWindowStart = from > now ? from : now;
    const hasRemainingWindow = effectiveWindowStart < to;

    // Total remaining working capacity by clinic from now/rangeStart to rangeEnd.
    const clinicRemainingCapacityEntries = await Promise.all(
      clinicDocs.map(async (clinic: any) => {
        const remainingCapacityHours = hasRemainingWindow
          ? await this.calculateClinicWorkingHoursInWindow(
              effectiveWindowStart,
              to,
              String(clinic._id),
            )
          : 0;

        return {
          clinicId: String(clinic._id),
          remainingCapacityHours,
        };
      }),
    );
    const clinicRemainingCapacityMap = new Map<string, number>(
      clinicRemainingCapacityEntries.map((entry) => [entry.clinicId, entry.remainingCapacityHours]),
    );

    // Future reserved hours by clinic (appointments consuming future capacity only).
    const bookedHoursByClinic = new Map<string, number>();
    if (hasRemainingWindow) {
      const futureAppointments = await this.appointmentModel
        .find({
          appointmentDate: {
            $gte: new Date(`${effectiveWindowStart.toISOString().split('T')[0]}T00:00:00.000Z`),
            $lte: to,
          },
          clinicId: { $in: scopedClinicIds },
          status: { $in: ['scheduled', 'confirmed', 'in_progress'] },
          deletedAt: { $exists: false },
          isDeleted: { $ne: true },
        })
        .select('_id clinicId appointmentDate appointmentTime durationMinutes status')
        .lean();

      for (const appointment of futureAppointments as any[]) {
        const appointmentStart = this.getAppointmentStartDateTime(appointment);
        if (!appointmentStart) continue;

        const durationMinutes =
          typeof appointment.durationMinutes === 'number' && appointment.durationMinutes > 0
            ? appointment.durationMinutes
            : 0;
        if (durationMinutes <= 0) continue;

        const appointmentEnd = new Date(appointmentStart.getTime() + durationMinutes * 60 * 1000);
        const overlapStart = appointmentStart > effectiveWindowStart ? appointmentStart : effectiveWindowStart;
        const overlapEnd = appointmentEnd < to ? appointmentEnd : to;
        const overlapMs = overlapEnd.getTime() - overlapStart.getTime();
        if (overlapMs <= 0) continue;

        const bookedHours = overlapMs / (60 * 60 * 1000);
        const clinicId = String(appointment.clinicId);
        bookedHoursByClinic.set(clinicId, (bookedHoursByClinic.get(clinicId) ?? 0) + bookedHours);
      }
    }

    // Remaining available = remaining capacity - future booked
    const clinicAvailableHoursMap = new Map<string, number>();
    for (const clinic of clinicDocs as any[]) {
      const clinicId = String(clinic._id);
      const capacityHours = clinicRemainingCapacityMap.get(clinicId) ?? 0;
      const bookedHours = bookedHoursByClinic.get(clinicId) ?? 0;
      clinicAvailableHoursMap.set(clinicId, Math.max(0, capacityHours - bookedHours));
    }

    let actualRevenue = 0;
    let expectedRevenue = 0;
    const clinicActualRevenue = new Map<string, number>();
    const clinicExpectedRevenue = new Map<string, number>();

    const paymentsMatch: any = {
      paymentDate: { $gte: from, $lte: to },
      clinicId: { $in: scopedClinicIds },
    };
    // clinicId already scopes payments to the user's tenant (scopedClinicIds is filtered
    // by subscriptionId), so no extra organizationId filter is needed — and adding one
    // would silently drop payments that were created without organizationId set.
    const paymentTotals = await this.paymentModel.aggregate([
      { $match: paymentsMatch },
      {
        $group: {
          _id: '$clinicId',
          amount: { $sum: { $ifNull: ['$amount', 0] } },
        },
      },
    ]);
    for (const row of paymentTotals) {
      const clinicId = String(row._id);
      const amount = Number(row.amount ?? 0);
      if (!Number.isFinite(amount)) continue;
      actualRevenue += amount;
      clinicActualRevenue.set(clinicId, (clinicActualRevenue.get(clinicId) ?? 0) + amount);
    }

    const invoicesMatch: any = {
      issueDate: { $gte: from, $lte: to },
      deletedAt: { $exists: false },
      invoiceStatus: { $ne: 'cancelled' },
    };
    const applyClinicConstraintForInvoices =
      hasExplicitClinicFilter ||
      !['owner', 'manager', 'super_admin'].includes(String(userRole ?? ''));
    if (userRole !== 'super_admin') {
      if (userSubscriptionId && Types.ObjectId.isValid(userSubscriptionId)) {
        invoicesMatch.subscriptionId = new Types.ObjectId(userSubscriptionId);
      } else if (userOrganizationId && Types.ObjectId.isValid(userOrganizationId)) {
        invoicesMatch.organizationId = new Types.ObjectId(userOrganizationId);
      } else {
        invoicesMatch._id = { $in: [] };
      }
    }
    const invoicesInRange = await this.invoiceModel
      .find(invoicesMatch)
      .select('_id clinicId totalAmount services.sessions.appointmentId')
      .lean();
    const scopedClinicIdSet = new Set(scopedClinicIds.map((id) => String(id)));

    const invoiceAppointmentIds: Types.ObjectId[] = [];
    for (const invoice of invoicesInRange as any[]) {
      for (const service of invoice.services ?? []) {
        for (const session of service.sessions ?? []) {
          if (session?.appointmentId && Types.ObjectId.isValid(String(session.appointmentId))) {
            invoiceAppointmentIds.push(new Types.ObjectId(String(session.appointmentId)));
          }
        }
      }
    }

    const appointmentClinicMap = new Map<string, string>();
    if (invoiceAppointmentIds.length > 0) {
      const linkedAppointments = await this.appointmentModel
        .find({
          _id: { $in: invoiceAppointmentIds },
          deletedAt: { $exists: false },
          isDeleted: { $ne: true },
        })
        .select('_id clinicId')
        .lean();

      for (const appt of linkedAppointments as any[]) {
        appointmentClinicMap.set(String(appt._id), String(appt.clinicId));
      }
    }

    for (const invoice of invoicesInRange as any[]) {
      const amount = Number(invoice.totalAmount ?? 0);
      if (!Number.isFinite(amount) || amount <= 0) continue;

      const clinicCandidates = new Set<string>();
      if (invoice.clinicId && Types.ObjectId.isValid(String(invoice.clinicId))) {
        clinicCandidates.add(String(invoice.clinicId));
      }
      for (const service of invoice.services ?? []) {
        for (const session of service.sessions ?? []) {
          const appointmentId = session?.appointmentId ? String(session.appointmentId) : '';
          if (!appointmentId) continue;
          const linkedClinicId = appointmentClinicMap.get(appointmentId);
          if (linkedClinicId) clinicCandidates.add(linkedClinicId);
        }
      }

      const inScopeClinics = Array.from(clinicCandidates).filter((id) => scopedClinicIdSet.has(id));
      const includeInvoice = applyClinicConstraintForInvoices
        ? inScopeClinics.length > 0
        : true;
      if (!includeInvoice) continue;

      expectedRevenue += amount;

      if (inScopeClinics.length > 0) {
        const share = amount / inScopeClinics.length;
        for (const clinicId of inScopeClinics) {
          clinicExpectedRevenue.set(clinicId, (clinicExpectedRevenue.get(clinicId) ?? 0) + share);
        }
      }
    }

    const totalBookedHours = Array.from(bookedHoursByClinic.values()).reduce((sum, hours) => sum + hours, 0);
    const totalAvailableHours = Array.from(clinicAvailableHoursMap.values()).reduce((sum, hours) => sum + hours, 0);
    const totalRemainingCapacityHours = Array.from(clinicRemainingCapacityMap.values()).reduce((sum, hours) => sum + hours, 0);
    const occupancyPercent = totalRemainingCapacityHours > 0 ? (totalBookedHours / totalRemainingCapacityHours) * 100 : 0;

    const clinicRevenueRanking = clinicDocs
      .map((clinic: any) => {
        const clinicId = String(clinic._id);
        const bookedHours = bookedHoursByClinic.get(clinicId) ?? 0;
        const remainingCapacityHours = clinicRemainingCapacityMap.get(clinicId) ?? 0;
        const availableHours = clinicAvailableHoursMap.get(clinicId) ?? 0;
        return {
          clinicId,
          clinicName: String(clinic.name ?? 'Unknown Clinic'),
          actual: Math.round((clinicActualRevenue.get(clinicId) ?? 0) * 100) / 100,
          expected: Math.round((clinicExpectedRevenue.get(clinicId) ?? 0) * 100) / 100,
          bookedHours: Math.round(bookedHours * 10) / 10,
          availableHours: Math.round(availableHours * 10) / 10,
          occupancy: remainingCapacityHours > 0
            ? Math.round(((bookedHours / remainingCapacityHours) * 100) * 10) / 10
            : 0,
        };
      })
      .sort((a, b) => b.actual - a.actual);

    return {
      stats: {
        newPatients: {
          current: currentNewPatients,
          previous: previousNewPatients,
          trendPercent: Math.round(newPatientsTrend * 10) / 10,
        },
        services: { activeCount: activeServicesCount },
        revenue: {
          actual: Math.round(actualRevenue * 100) / 100,
          expected: Math.round(expectedRevenue * 100) / 100,
        },
        occupancy: {
          percent: Math.round(occupancyPercent * 10) / 10,
          bookedHours: Math.round(totalBookedHours * 10) / 10,
          availableHours: Math.round(totalAvailableHours * 10) / 10,
        },
      },
      clinicRevenueRanking,
    };
  }

  /**
   * Get doctors overview for staff dashboard
   * Shows ALL doctors in the clinic/complex scope (not limited to those with appointments in date range).
   * Appointment hours/status are computed for the selected date range.
   */
  private async calculateClinicWorkingHoursInWindow(
    windowStart: Date,
    windowEnd: Date,
    clinicId: string,
  ): Promise<number> {
    if (!Types.ObjectId.isValid(clinicId)) return 0;
    if (Number.isNaN(windowStart.getTime()) || Number.isNaN(windowEnd.getTime())) return 0;
    if (windowStart >= windowEnd) return 0;

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    const entries = await this.workingHoursModel
      .find({
        entityType: 'clinic',
        entityId: new Types.ObjectId(clinicId),
        isWorkingDay: true,
        isActive: true,
      })
      .select('dayOfWeek openingTime closingTime breakStartTime breakEndTime')
      .lean();

    const entriesByDay = new Map<string, any[]>();
    for (const entry of entries as any[]) {
      const day = String(entry.dayOfWeek ?? '').toLowerCase();
      if (!entriesByDay.has(day)) entriesByDay.set(day, []);
      entriesByDay.get(day)!.push(entry);
    }

    const overlapMinutes = (start: Date, end: Date): number => {
      const left = start > windowStart ? start : windowStart;
      const right = end < windowEnd ? end : windowEnd;
      const ms = right.getTime() - left.getTime();
      return ms > 0 ? ms / (60 * 1000) : 0;
    };

    const startDay = new Date(`${windowStart.toISOString().split('T')[0]}T00:00:00.000Z`);
    const endDay = new Date(`${windowEnd.toISOString().split('T')[0]}T00:00:00.000Z`);

    let totalMinutes = 0;
    for (let cursor = new Date(startDay); cursor <= endDay; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      const dayName = dayNames[cursor.getUTCDay()];
      const dayEntries = entriesByDay.get(dayName) ?? [];
      const dayStr = cursor.toISOString().split('T')[0];

      for (const entry of dayEntries) {
        if (!entry.openingTime || !entry.closingTime) continue;
        const workStart = new Date(`${dayStr}T${String(entry.openingTime)}:00.000Z`);
        const workEnd = new Date(`${dayStr}T${String(entry.closingTime)}:00.000Z`);
        if (Number.isNaN(workStart.getTime()) || Number.isNaN(workEnd.getTime()) || workEnd <= workStart) {
          continue;
        }

        // Handle break by splitting into two effective working intervals.
        if (entry.breakStartTime && entry.breakEndTime) {
          const breakStart = new Date(`${dayStr}T${String(entry.breakStartTime)}:00.000Z`);
          const breakEnd = new Date(`${dayStr}T${String(entry.breakEndTime)}:00.000Z`);

          if (
            !Number.isNaN(breakStart.getTime()) &&
            !Number.isNaN(breakEnd.getTime()) &&
            breakEnd > breakStart
          ) {
            if (breakStart > workStart) {
              totalMinutes += overlapMinutes(workStart, breakStart < workEnd ? breakStart : workEnd);
            }
            if (breakEnd < workEnd) {
              totalMinutes += overlapMinutes(breakEnd > workStart ? breakEnd : workStart, workEnd);
            }
            continue;
          }
        }

        totalMinutes += overlapMinutes(workStart, workEnd);
      }
    }

    return Math.round((totalMinutes / 60) * 10) / 10;
  }

  private async calculateWorkingHoursInRange(
    dateFrom: string,
    dateTo: string,
    entityId: string,
    entityType: string,
  ): Promise<number> {
    const from = new Date(`${dateFrom}T00:00:00.000Z`);
    const to = new Date(`${dateTo}T23:59:59.999Z`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
    if (!Types.ObjectId.isValid(entityId)) return 0;

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayCount = new Map<string, number>();

    const cursor = new Date(from);
    while (cursor <= to) {
      const dayName = dayNames[cursor.getUTCDay()];
      dayCount.set(dayName, (dayCount.get(dayName) ?? 0) + 1);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    const daysPresent = Array.from(dayCount.keys());
    if (daysPresent.length === 0) return 0;

    let totalMinutes = 0;

    if (entityType === 'user') {
      // Try employee shifts first
      const shifts = await this.employeeShiftModel
        .find({
          userId: new Types.ObjectId(entityId),
          dayOfWeek: { $in: daysPresent },
          isActive: true,
        })
        .select('dayOfWeek startTime endTime breakDurationMinutes')
        .lean();

      for (const shift of shifts as any[]) {
        if (!shift.startTime || !shift.endTime) continue;
        const [startH, startM] = String(shift.startTime).split(':').map(Number);
        const [endH, endM] = String(shift.endTime).split(':').map(Number);
        if ([startH, startM, endH, endM].some((value) => Number.isNaN(value))) continue;

        const shiftMinutes = (endH * 60 + endM) - (startH * 60 + startM) - (shift.breakDurationMinutes ?? 0);
        if (shiftMinutes <= 0) continue;
        totalMinutes += shiftMinutes * (dayCount.get(shift.dayOfWeek) ?? 0);
      }

      // Fall back to working_hours collection with entityType='user'
      if (totalMinutes === 0) {
        const entries = await this.workingHoursModel
          .find({
            entityType: 'user',
            entityId: new Types.ObjectId(entityId),
            dayOfWeek: { $in: daysPresent },
            isWorkingDay: true,
            isActive: true,
          })
          .select('dayOfWeek openingTime closingTime breakStartTime breakEndTime')
          .lean();

        for (const entry of entries as any[]) {
          if (!entry.openingTime || !entry.closingTime) continue;
          const [openH, openM] = String(entry.openingTime).split(':').map(Number);
          const [closeH, closeM] = String(entry.closingTime).split(':').map(Number);
          if ([openH, openM, closeH, closeM].some((v) => Number.isNaN(v))) continue;

          let breakMins = 0;
          if (entry.breakStartTime && entry.breakEndTime) {
            const [bsh, bsm] = String(entry.breakStartTime).split(':').map(Number);
            const [beh, bem] = String(entry.breakEndTime).split(':').map(Number);
            if (![bsh, bsm, beh, bem].some((v) => Number.isNaN(v))) {
              breakMins = Math.max(0, (beh * 60 + bem) - (bsh * 60 + bsm));
            }
          }

          const entryMinutes = (closeH * 60 + closeM) - (openH * 60 + openM) - breakMins;
          if (entryMinutes <= 0) continue;
          totalMinutes += entryMinutes * (dayCount.get(entry.dayOfWeek) ?? 0);
        }
      }
    } else {
      const entries = await this.workingHoursModel
        .find({
          entityType: 'clinic',
          entityId: new Types.ObjectId(entityId),
          dayOfWeek: { $in: daysPresent },
          isWorkingDay: true,
          isActive: true,
        })
        .select('dayOfWeek openingTime closingTime breakStartTime breakEndTime')
        .lean();

      for (const entry of entries as any[]) {
        if (!entry.openingTime || !entry.closingTime) continue;
        const [openH, openM] = String(entry.openingTime).split(':').map(Number);
        const [closeH, closeM] = String(entry.closingTime).split(':').map(Number);
        if ([openH, openM, closeH, closeM].some((value) => Number.isNaN(value))) continue;

        let breakMinutes = 0;
        if (entry.breakStartTime && entry.breakEndTime) {
          const [breakStartH, breakStartM] = String(entry.breakStartTime).split(':').map(Number);
          const [breakEndH, breakEndM] = String(entry.breakEndTime).split(':').map(Number);
          if (![breakStartH, breakStartM, breakEndH, breakEndM].some((value) => Number.isNaN(value))) {
            breakMinutes = (breakEndH * 60 + breakEndM) - (breakStartH * 60 + breakStartM);
            if (breakMinutes < 0) breakMinutes = 0;
          }
        }

        const entryMinutes = (closeH * 60 + closeM) - (openH * 60 + openM) - breakMinutes;
        if (entryMinutes <= 0) continue;
        totalMinutes += entryMinutes * (dayCount.get(entry.dayOfWeek) ?? 0);
      }
    }

    return Math.round((totalMinutes / 60) * 10) / 10;
  }

  async getDoctorsOverview(
    userId: string | undefined,
    userRole: string | undefined,
    userPlanType: string | undefined,
    userClinicId: string | undefined,
    userClinicIds: string[] | undefined,
    userComplexId: string | undefined,
    userSubscriptionId: string | undefined,
    userOrganizationId: string | undefined,
    dateFrom: string,
    dateTo: string,
    clinicIds?: string[],
  ): Promise<Array<{
    doctorId: string;
    doctorName: string;
    status: 'Busy' | 'Available' | 'Unavailable';
    completedHours: number;
    totalHours: number;
    workingHoursInRange: number;
    nextAppointment: {
      service: string;
      sessionName: string | null;
      sessionNumber: number | null;
      totalSessions: number | null;
      datetime: string;
      clinic: string;
      patient: string;
    } | null;
    total: number;
    completed: number;
    cancelled: number;
    missed: number;
    scheduled: number;
  }>> {
    const from = new Date(`${dateFrom}T00:00:00.000Z`);
    const to = new Date(`${dateTo}T23:59:59.999Z`);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid dateFrom/dateTo format. Expected YYYY-MM-DD');
    }

    // Compute effective clinic ObjectIds
    const effectiveClinicObjectIds = await this.resolveDashboardClinicScope({
      userRole,
      userPlanType,
      userClinicId,
      userClinicIds,
      userComplexId,
      userSubscriptionId,
      userOrganizationId,
      clinicIds,
    });

    // Fetch ALL doctors assigned to any of the effective clinics (not just those with appointments)
    const doctorQuery: any = { role: 'doctor', isActive: true, deletedAt: { $exists: false } };
    if (userRole !== 'super_admin') {
      if (userSubscriptionId && Types.ObjectId.isValid(userSubscriptionId)) {
        doctorQuery.subscriptionId = new Types.ObjectId(userSubscriptionId);
      } else if (userOrganizationId && Types.ObjectId.isValid(userOrganizationId)) {
        doctorQuery.organizationId = new Types.ObjectId(userOrganizationId);
      } else {
        return [];
      }
    }
    if (effectiveClinicObjectIds.length > 0) {
      doctorQuery.$or = [
        { clinicId: { $in: effectiveClinicObjectIds } },
        { clinicIds: { $in: effectiveClinicObjectIds } },
      ];
    } else if (userRole !== 'super_admin') {
      return [];
    }

    const allDoctors = await this.userModel
      .find(doctorQuery)
      .select('_id firstName lastName clinicId clinicIds')
      .lean();

    if (allDoctors.length === 0) return [];

    const allDoctorIds = allDoctors.map((d: any) => d._id);

    // Build appointment match for the date range (to compute stats)
    const appointmentMatch: any = {
      appointmentDate: { $gte: from, $lte: to },
      deletedAt: { $exists: false },
      isDeleted: { $ne: true },
      doctorId: { $in: allDoctorIds },
    };
    if (effectiveClinicObjectIds.length > 0) {
      appointmentMatch.clinicId = { $in: effectiveClinicObjectIds };
    }

    // Aggregate appointment stats per doctor for the selected date range
    const hoursAgg = await this.appointmentModel.aggregate([
      { $match: appointmentMatch },
      {
        $group: {
          _id: '$doctorId',
          completedHours: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'completed'] },
                { $divide: [{ $ifNull: ['$durationMinutes', 0] }, 60] },
                0,
              ],
            },
          },
          totalHours: {
            $sum: {
              $cond: [
                { $in: ['$status', ['completed', 'scheduled']] },
                { $divide: [{ $ifNull: ['$durationMinutes', 0] }, 60] },
                0,
              ],
            },
          },
          total: { $sum: 1 },
          completed_count: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          cancelled_count: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          missed_count: { $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] } },
          scheduled_count: { $sum: { $cond: [{ $in: ['$status', ['scheduled', 'confirmed']] }, 1, 0] } },
        },
      },
    ]);

    const statsMap = new Map(hoursAgg.map((item) => [String(item._id), item]));

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const todayStart = new Date(`${todayStr}T00:00:00.000Z`);
    const todayEnd   = new Date(`${todayStr}T23:59:59.999Z`);

    // Live status: fetch today's non-terminal appointments and check time overlap
    const todayActiveMatch: any = {
      deletedAt: { $exists: false },
      isDeleted: { $ne: true },
      appointmentDate: { $gte: todayStart, $lte: todayEnd },
      status: { $in: ['scheduled', 'confirmed', 'in_progress'] },
    };
    if (effectiveClinicObjectIds.length > 0) todayActiveMatch.clinicId = { $in: effectiveClinicObjectIds };

    const todayActiveAppts = await this.appointmentModel
      .find(todayActiveMatch)
      .select('doctorId appointmentDate appointmentTime durationMinutes status')
      .lean();

    // Unavailable = current time is between appointment start and end
    const unavailableSet = new Set<string>();
    for (const appt of todayActiveAppts) {
      if (this.isAppointmentEffectivelyInProgress(appt as any, now)) {
        unavailableSet.add(String(appt.doctorId));
      }
    }

    const results = await Promise.all(
      allDoctors.map(async (doctor: any) => {
        const doctorId = doctor._id;
        const doctorName = [doctor.firstName, doctor.lastName].filter(Boolean).join(' ') || 'Unknown Doctor';
        const stats = statsMap.get(String(doctorId));

        const doctorIdStr = String(doctorId);
        let liveStatus: 'Busy' | 'Available' | 'Unavailable' = 'Available';
        if (unavailableSet.has(doctorIdStr)) {
          liveStatus = 'Unavailable';
        }

        const workingHoursInRange = await this.calculateWorkingHoursInRange(
          dateFrom,
          dateTo,
          doctorId.toString(),
          'user',
        );

        // Find next upcoming appointment (not limited by date range — find the actual next one)
        const nextApptFilter: any = {
          doctorId,
          status: { $in: ['scheduled', 'confirmed'] },
          appointmentDate: { $gte: now },
          deletedAt: { $exists: false },
          isDeleted: { $ne: true },
        };
        if (effectiveClinicObjectIds.length > 0) {
          nextApptFilter.clinicId = { $in: effectiveClinicObjectIds };
        }

        const nextAppt = await this.appointmentModel
          .findOne(nextApptFilter)
          .sort({ appointmentDate: 1 })
          .populate('clinicId', 'name')
          .populate('patientId', 'firstName lastName')
          .populate('serviceId', 'name')
          .lean();

        let nextAppointment: any = null;
        if (nextAppt) {
          const clinic: any = nextAppt.clinicId;
          const patient: any = nextAppt.patientId;
          const service: any = nextAppt.serviceId;
          const apptDateTime = this.getAppointmentStartDateTime(nextAppt as any);
          nextAppointment = {
            service: service?.name ?? 'Unknown Service',
            sessionName: null,
            sessionNumber: null,
            totalSessions: null,
            datetime: apptDateTime ? apptDateTime.toISOString() : String(nextAppt.appointmentDate),
            clinic: clinic?.name ?? 'Unknown Clinic',
            patient: patient ? [patient.firstName, patient.lastName].filter(Boolean).join(' ') : 'Unknown Patient',
          };
        }

        return {
          doctorId: String(doctorId),
          doctorName,
          status: liveStatus,
          completedHours: Math.round((stats?.completedHours ?? 0) * 10) / 10,
          totalHours: Math.round((stats?.totalHours ?? 0) * 10) / 10,
          workingHoursInRange,
          total: stats?.total ?? 0,
          completed: stats?.completed_count ?? 0,
          cancelled: stats?.cancelled_count ?? 0,
          missed: stats?.missed_count ?? 0,
          scheduled: stats?.scheduled_count ?? 0,
          nextAppointment,
        };
      }),
    );

    return results;
  }

  /**
   * Get today's appointments
   */
  async getTodayAppointments(
    userId?: string,
    userRole?: string,
    userClinicId?: string,
    subscriptionId?: string,
    complexId?: string,
  ): Promise<Appointment[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Build base filter for scoping
    const filter: any = { 
        deletedAt: { $exists: false },
        appointmentDate: { $gte: today, $lt: tomorrow }
    };
    
    // Role-based scoping logic (shared with getAppointments)
    if (userRole === 'doctor' && userId) {
      filter.doctorId = new Types.ObjectId(userId);
    } else if (userRole === 'staff' && userClinicId) {
      filter.clinicId = new Types.ObjectId(userClinicId);
    } else if (userRole === 'admin' && userClinicId) {
      filter.clinicId = new Types.ObjectId(userClinicId);
    } else if (userRole === 'owner' || userRole === 'manager') {
      if (complexId && Types.ObjectId.isValid(complexId)) {
        const complexClinics = await this.clinicModel
          .find({ complexId: new Types.ObjectId(complexId), deletedAt: { $exists: false } })
          .select('_id')
          .lean();
        filter.clinicId = { $in: complexClinics.map((c: any) => c._id) };
      } else if (subscriptionId && Types.ObjectId.isValid(subscriptionId)) {
        const ownerClinics = await this.clinicModel
          .find({ subscriptionId: new Types.ObjectId(subscriptionId), deletedAt: { $exists: false } })
          .select('_id')
          .lean();
        filter.clinicId = { $in: ownerClinics.map((c: any) => c._id) };
      }
    } else if (userRole !== 'super_admin') {
      if (userClinicId) filter.clinicId = new Types.ObjectId(userClinicId);
      else filter.clinicId = { $in: [] };
    }

    return await this.appointmentModel
      .find(filter)
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
  async getUpcomingAppointments(
    limit: number = 20,
    userId?: string,
    userRole?: string,
    userClinicId?: string,
    subscriptionId?: string,
    complexId?: string,
  ): Promise<Appointment[]> {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    // Build base filter for scoping
    const filter: any = { 
        deletedAt: { $exists: false },
        appointmentDate: { $gte: today, $lte: nextWeek },
        status: { $in: ['scheduled', 'confirmed'] }
    };
    
    // Role-based scoping logic (shared with getAppointments)
    if (userRole === 'doctor' && userId) {
      filter.doctorId = new Types.ObjectId(userId);
    } else if (userRole === 'staff' && userClinicId) {
      filter.clinicId = new Types.ObjectId(userClinicId);
    } else if (userRole === 'admin' && userClinicId) {
      filter.clinicId = new Types.ObjectId(userClinicId);
    } else if (userRole === 'owner' || userRole === 'manager') {
      if (complexId && Types.ObjectId.isValid(complexId)) {
        const complexClinics = await this.clinicModel
          .find({ complexId: new Types.ObjectId(complexId), deletedAt: { $exists: false } })
          .select('_id')
          .lean();
        filter.clinicId = { $in: complexClinics.map((c: any) => c._id) };
      } else if (subscriptionId && Types.ObjectId.isValid(subscriptionId)) {
        const ownerClinics = await this.clinicModel
          .find({ subscriptionId: new Types.ObjectId(subscriptionId), deletedAt: { $exists: false } })
          .select('_id')
          .lean();
        filter.clinicId = { $in: ownerClinics.map((c: any) => c._id) };
      }
    } else if (userRole !== 'super_admin') {
      if (userClinicId) filter.clinicId = new Types.ObjectId(userClinicId);
      else filter.clinicId = { $in: [] };
    }

    return await this.appointmentModel
      .find(filter)
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
   * 
   * UC-6b5a4c3: Change Appointment Status by Staff
   * UC-6b5a4c9: Change Appointment Status by Doctor
   * Requirements: 6.1-6.12
   * 
   * Note: UC-6b5a4c9 mentions invoice status update postcondition.
   * This is handled by the invoice module when appointment is completed.
   * See invoice.service.ts for invoice status transition logic.
   */
  async changeAppointmentStatus(
    appointmentId: string,
    statusDto: { status: string; notes?: string; reason?: string; newDate?: string; newTime?: string },
    userId?: string,
    requestingUserRole?: string,
  ): Promise<Appointment> {
    if (!Types.ObjectId.isValid(appointmentId)) {
      throw new BadRequestException({
        message: {
          ar: 'معرف الموعد غير صالح',
          en: 'Invalid appointment ID format',
        },
        code: 'INVALID_APPOINTMENT_ID',
      });
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

    // Doctor role restriction: doctors may ONLY mark appointments as completed
    if (requestingUserRole === UserRole.DOCTOR) {
      if (statusDto.status !== AppointmentStatus.COMPLETED) {
        throw new ForbiddenException({
          message: {
            en: 'Doctors can only mark appointments as Completed',
            ar: 'يمكن للأطباء فقط تحديد حالة المواعيد كـ "مكتمل"',
          },
          code: 'APT_ROLE_RESTRICT',
        });
      }
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

    this.logger.log(`Appointment ${appointmentId} status changed to ${statusDto.status} by user ${userId}`);

    // M7 Integration: When appointment is completed, update invoice session paidAmount
    if (statusDto.status === 'completed' && (updatedAppointment as any).invoiceId) {
      try {
        await this.updateInvoiceOnAppointmentCompletion(
          (updatedAppointment as any).invoiceId.toString(),
          appointmentId,
        );
      } catch (err) {
        this.logger.error(`Failed to update invoice on appointment completion: ${err.message}`);
      }
    }

    // M7 Integration: When appointment is cancelled or missed (no_show), update invoice session to 'cancelled'
    if (['cancelled', 'no_show'].includes(statusDto.status) && (updatedAppointment as any).invoiceId) {
      try {
        await this.updateInvoiceOnAppointmentCancellation(
          (updatedAppointment as any).invoiceId.toString(),
          appointmentId,
        );
      } catch (err) {
        this.logger.error(`Failed to update invoice on appointment cancellation: ${err.message}`);
      }
    }

    return updatedAppointment;
  }

  /**
   * M7 Integration: Mark invoice session as completed and update paidAmount.
   * Called when an appointment transitions to 'completed'.
   */
  private async updateInvoiceOnAppointmentCompletion(
    invoiceId: string,
    appointmentId: string,
  ): Promise<void> {
    const invoice = await this.invoiceModel.findOne({
      _id: new Types.ObjectId(invoiceId),
      deletedAt: { $exists: false },
    });
    if (!invoice) {
      this.logger.warn(`Invoice ${invoiceId} not found for completion update`);
      return;
    }

    // Find the session that was linked to this appointment
    let sessionLineTotal = 0;
    let serviceIndex = -1;
    let sessionIndex = -1;
    const services = invoice.services as any[];
    for (let si = 0; si < services.length; si++) {
      const sessions = services[si].sessions || [];
      for (let idx = 0; idx < sessions.length; idx++) {
        if (sessions[idx].appointmentId?.toString() === appointmentId) {
          serviceIndex = si;
          sessionIndex = idx;
          sessionLineTotal = sessions[idx].lineTotal || 0;
          break;
        }
      }
      if (serviceIndex >= 0) break;
    }

    if (serviceIndex < 0) {
      this.logger.warn(`No invoice session found for appointment ${appointmentId} in invoice ${invoiceId}`);
      return;
    }

    const newPaidAmount = +((invoice.paidAmount || 0) + sessionLineTotal).toFixed(2);
    let newPaymentStatus = invoice.paymentStatus;
    if (newPaidAmount >= invoice.totalAmount) {
      newPaymentStatus = 'paid';
    } else if (newPaidAmount > 0) {
      newPaymentStatus = 'partially_paid';
    }

    await this.invoiceModel.updateOne(
      { _id: invoice._id },
      {
        $set: {
          [`services.${serviceIndex}.sessions.${sessionIndex}.sessionStatus`]: 'completed',
          [`services.${serviceIndex}.sessions.${sessionIndex}.paidAmount`]: sessionLineTotal,
          paidAmount: newPaidAmount,
          paymentStatus: newPaymentStatus,
          lastPaymentDate: new Date(),
        },
      },
    );

    this.logger.log(
      `Invoice ${invoiceId}: session completed, paidAmount=${newPaidAmount}, paymentStatus=${newPaymentStatus}`,
    );
  }

  /**
   * M7 Integration: Mark invoice session as cancelled.
   * Called when an appointment transitions to 'cancelled' via the status endpoint.
   */
  private async updateInvoiceOnAppointmentCancellation(
    invoiceId: string,
    appointmentId: string,
  ): Promise<void> {
    const invoice = await this.invoiceModel.findOne({
      _id: new Types.ObjectId(invoiceId),
      deletedAt: { $exists: false },
    });
    if (!invoice) {
      this.logger.warn(`Invoice ${invoiceId} not found for cancellation update`);
      return;
    }

    let serviceIndex = -1;
    let sessionIndex = -1;
    const services = invoice.services as any[];
    for (let si = 0; si < services.length; si++) {
      const sessions = services[si].sessions || [];
      for (let idx = 0; idx < sessions.length; idx++) {
        if (sessions[idx].appointmentId?.toString() === appointmentId) {
          serviceIndex = si;
          sessionIndex = idx;
          break;
        }
      }
      if (serviceIndex >= 0) break;
    }

    if (serviceIndex < 0) {
      this.logger.warn(`No invoice session found for appointment ${appointmentId} in invoice ${invoiceId}`);
      return;
    }

    await this.invoiceModel.updateOne(
      { _id: invoice._id },
      {
        $set: {
          [`services.${serviceIndex}.sessions.${sessionIndex}.sessionStatus`]: 'cancelled',
        },
      },
    );

    this.logger.log(`Invoice ${invoiceId}: session set to available/cancelled for appointment ${appointmentId} (cancelled or missed)`);
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
      throw new BadRequestException({
        message: {
          ar: 'تنسيق معرف الموعد غير صالح',
          en: 'Invalid appointment ID format',
        },
        code: 'INVALID_APPOINTMENT_ID',
      });
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

    // Hook 5 (PART B): Update linked invoice session status to 'in_progress'
    if (appointment.invoiceId) {
      try {
        const linkedInvoice = await this.invoiceModel.findById(appointment.invoiceId);
        if (linkedInvoice) {
          const invoiceItemId = await this._findInvoiceItemId(linkedInvoice, appointmentId);
          if (invoiceItemId) {
            await this.invoiceModel.updateOne(
              { _id: appointment.invoiceId },
              { $set: { 'services.$[].sessions.$[item].sessionStatus': 'in_progress' } },
              { arrayFilters: [{ 'item.invoiceItemId': new Types.ObjectId(invoiceItemId) }] },
            );
          }
        }
      } catch (err) {
        this.logger.error(`Failed to update invoice session on start: ${err.message}`);
      }
    }

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
      throw new BadRequestException({
        message: {
          ar: 'تنسيق معرف الموعد غير صالح',
          en: 'Invalid appointment ID format',
        },
        code: 'INVALID_APPOINTMENT_ID',
      });
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
          // BUG-013: use completionNotes instead of notes
          ...(internalNotes && { completionNotes: typeof internalNotes === 'string' ? internalNotes : JSON.stringify(internalNotes) }),
          $push: { statusHistory: historyEntry },
        },
        { new: true },
      )
      .exec();

    this.logger.log(`Appointment ${appointmentId} ended at ${now.toISOString()}`);

    // Hook 2 (PART B): Update linked invoice session status to 'completed' and payment to 'unpaid'
    if (appointment.invoiceId) {
      try {
        const linkedInvoice = await this.invoiceModel.findById(appointment.invoiceId);
        if (linkedInvoice) {
          const invoiceItemId = await this._findInvoiceItemId(linkedInvoice, appointmentId);
          if (invoiceItemId) {
            await this.invoiceModel.updateOne(
              { _id: appointment.invoiceId },
              { $set: { 'services.$[].sessions.$[item].sessionStatus': 'completed' } },
              { arrayFilters: [{ 'item.invoiceItemId': new Types.ObjectId(invoiceItemId) }] },
            );
          }
          if (linkedInvoice.paymentStatus === 'not_due') {
            await this.invoiceModel.findByIdAndUpdate(appointment.invoiceId, { paymentStatus: 'unpaid' });
          }
        }
      } catch (err) {
        this.logger.error(`Failed to update invoice session on end: ${err.message}`);
      }
    }

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
    userRole?: string,
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

    // BZR-perm75: Doctor can only conclude their own assigned appointments
    if (
      userRole === 'doctor' &&
      userId &&
      appointment.doctor?._id &&
      appointment.doctor._id.toString() !== userId.toString()
    ) {
      throw new ForbiddenException({
        message: {
          ar: 'يمكن للطبيب إتمام مواعيده المخصصة له فقط',
          en: 'Doctor can only conclude their own assigned appointments',
        },
        code: 'DOCTOR_NOT_ASSIGNED',
      });
    }

    // if (appointment.status !== 'in_progress' && appointment.status !== 'confirmed') {
    //   throw new BadRequestException({
    //     message: {
    //       ar: 'يمكن إتمام المواعيد المؤكدة أو قيد التقدم فقط',
    //       en: 'Can only conclude appointments that are confirmed or in progress',
    //     },
    //     code: 'APPOINTMENT_NOT_CONCLUDABLE',
    //     currentStatus: appointment.status,
    //   });
    // }

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

    // Build prescriptions/medications string from structured data
    const medicationsText = conclusionData.prescriptions?.length
      ? conclusionData.prescriptions
          .map((p) => [p.medication, p.dosage, p.frequency, p.duration].filter(Boolean).join(' - '))
          .join('\n')
      : undefined;

    // Create MedicalReport document
    // NOTE: getAppointmentById uses transformAppointment() which maps
    //   doc.patientId → appointment.patient (string _id)
    //   doc.doctorId  → appointment.doctor  (string _id)
    const patientObjId = appointment.patient?._id ? new Types.ObjectId(appointment.patient._id) : undefined;
    const doctorObjId  = appointment.doctor?._id  ? new Types.ObjectId(appointment.doctor._id)  : undefined;
    let medicalReportId: Types.ObjectId | undefined;
    try {
      const report = await this.medicalReportModel.create({
        appointmentId: new Types.ObjectId(appointmentId),
        patientId: patientObjId,
        doctorId: doctorObjId,
        createdBy: userId ? new Types.ObjectId(userId) : doctorObjId,
        diagnosis: conclusionData.sessionNotes?.diagnosis,
        symptoms: conclusionData.sessionNotes?.symptoms,
        treatmentPlan: conclusionData.treatmentPlan?.steps,
        medications: medicationsText,
        followUpInstructions: conclusionData.followUp?.doctorNotes,
        nextAppointmentRecommended: conclusionData.followUp?.required ?? false,
        isVisibleToPatient: true,
      });
      medicalReportId = report._id as Types.ObjectId;
      this.logger.log(`MedicalReport ${medicalReportId} created for appointment ${appointmentId}`);
    } catch (err) {
      this.logger.error(`Failed to create MedicalReport for appointment ${appointmentId}: ${err.message}`);
    }

    const updated = await this.appointmentModel
      .findByIdAndUpdate(
        appointmentId,
        {
          status: 'completed',
          actualEndTime: now,
          completedBy: userId ? new Types.ObjectId(userId) : undefined,
          updatedBy: userId ? new Types.ObjectId(userId) : undefined,
          completionNotes: typeof conclusionPayload === 'string' ? conclusionPayload : JSON.stringify(conclusionPayload),
          ...(medicalReportId && { medicalReportId, isDocumented: true }),
          $push: { statusHistory: historyEntry },
        },
        { new: true },
      )
      .exec();

    this.logger.log(`Appointment ${appointmentId} concluded at ${now.toISOString()}`);

    // Hook 2 (PART B): Update linked invoice session status to 'completed' and payment to 'unpaid'
    if (appointment.invoiceId) {
      try {
        const linkedInvoice = await this.invoiceModel.findById(appointment.invoiceId);
        if (linkedInvoice) {
          const invoiceItemId = await this._findInvoiceItemId(linkedInvoice, appointmentId);
          if (invoiceItemId) {
            await this.invoiceModel.updateOne(
              { _id: appointment.invoiceId },
              { $set: { 'services.$[].sessions.$[item].sessionStatus': 'completed' } },
              { arrayFilters: [{ 'item.invoiceItemId': new Types.ObjectId(invoiceItemId) }] },
            );
          }
          if (linkedInvoice.paymentStatus === 'not_due') {
            await this.invoiceModel.findByIdAndUpdate(appointment.invoiceId, { paymentStatus: 'unpaid' });
          }
        }
      } catch (err) {
        this.logger.error(`Failed to update invoice session on conclude: ${err.message}`);
      }
    }

    // Schedule follow-up reminder if needed
    if (conclusionData.followUp?.required) {
      try {
        const doctorRecipientId = appointment.doctor?._id;
        if (doctorRecipientId) {
          await this.notificationService.create({
            recipientId: doctorRecipientId,
            title: 'Follow-up Required',
            message: `Follow-up needed for appointment ${appointmentId}. Recommended duration: ${conclusionData.followUp.recommendedDuration || 'Not specified'}`,
            notificationType: 'general',
            priority: 'normal',
            relatedEntityType: 'appointment',
            relatedEntityId: appointmentId,
            deliveryMethod: 'in_app',
          });
        }
      } catch (err) {
        this.logger.error(`Failed to create follow-up notification for appointment ${appointmentId}: ${err.message}`);
      }
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
   * Send manual reminder for appointment
   * Requirements: UC-405a92ak
   */
  async sendManualReminder(id: string, userId?: string): Promise<void> {
    const appointment = await this.appointmentModel
      .findOne({ _id: new Types.ObjectId(id), deletedAt: { $exists: false } })
      .populate('patientId')
      .exec();

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const patient: any = appointment.patientId;
    
    await this.notificationService.create({
      recipientId: patient._id.toString(),
      title: 'Appointment Reminder',
      message: `Friendly reminder for your appointment on ${new Date(appointment.appointmentDate).toLocaleDateString()} at ${appointment.appointmentTime}.`,
      notificationType: 'appointment_reminder',
      priority: 'high',
      relatedEntityType: 'appointment',
      relatedEntityId: id,
      deliveryMethod: 'sms', // Default to SMS for reminders
    });

    this.logger.log(`Manual reminder sent for appointment ${id} by user ${userId}`);
  }

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
  async getAppointmentsCalendar(
    query: CalendarQueryDto,
    userId?: string,
    userRole?: string,
  ): Promise<{
    view: string;
    startDate: string;
    endDate: string;
    groupedByDate: Record<string, any[]>;
  }> {
    this.logger.log('Getting appointments calendar view');

    // Delegate to calendar service, passing user context for role-scoping
    const calendarData = await this.appointmentCalendarService.getCalendarView(
      query,
      userId,
      userRole,
    );

    // BUG-015: Return shape matching frontend expectation
    return {
      view: calendarData.view,
      dateRange: {
        start: calendarData.dateRange.start.toISOString().split('T')[0],
        end: calendarData.dateRange.end.toISOString().split('T')[0],
      },
      appointments: calendarData.appointments,
    } as any;
  }

  /**
   * M6 UC-d2e3f4c – GET /appointments/available-clinics
   *
   * Returns clinics that are open at a given date + time so the
   * QuickAddDrawer can show only valid choices when the user is
   * viewing "All Clinics".
   *
   * @param date             - "YYYY-MM-DD"
   * @param time             - "HH:mm"
   * @param clinicCollectionId - optional complexId to filter clinics
   */
  async getAvailableClinics(
    date: string,
    time: string,
    clinicCollectionId?: string,
    userClinicId?: string,
    userClinicIds?: string[],
    userOrganizationId?: string,
    userRole?: string,
    serviceId?: string,
    userSubscriptionId?: string,
    userComplexId?: string,
    serviceIds?: string[], // multi-service: union of clinics that offer ANY of these services
    doctorId?: string, // if pre-filled from calendar, intersect with doctor's assigned clinics
  ): Promise<{ _id: string; name: string }[]> {
    // 1. Build clinic filter with scope enforcement (IDOR protection)
    const clinicFilter: any = {
      isActive: true,
      deletedAt: { $exists: false },
    };

    // Staff, doctors, admins, and managers are scoped to their assigned clinic (clinicId from JWT).
    // Owners see all clinics within their subscription (+ complex if set).
    // super_admin sees everything.
    const clinicScopedRoles = ['staff', 'doctor', 'admin', 'manager'];
    if (clinicScopedRoles.includes(userRole ?? '')) {
      const scopedClinicIds = Array.isArray(userClinicIds)
        ? Array.from(
            new Set(
              userClinicIds.filter((id) => Types.ObjectId.isValid(id)).map(String),
            ),
          )
        : [];

      if (scopedClinicIds.length > 0) {
        clinicFilter._id = {
          $in: scopedClinicIds.map((id) => new Types.ObjectId(id)),
        };
      } else if (userClinicId && Types.ObjectId.isValid(userClinicId)) {
        clinicFilter._id = new Types.ObjectId(userClinicId);
      }
    } else if (userRole && !['super_admin'].includes(userRole)) {
      // Owner: scope by subscriptionId (primary tenant boundary) + complexId if set
      if (userSubscriptionId) {
        clinicFilter.subscriptionId = new Types.ObjectId(userSubscriptionId);
      }
      if (userComplexId) {
        clinicFilter.complexId = new Types.ObjectId(userComplexId);
      } else if (userOrganizationId) {
        // Fallback: organizationId scope for company-plan owners without complexId
        clinicFilter.organizationId = new Types.ObjectId(userOrganizationId);
      }
    }

    if (clinicCollectionId) {
      clinicFilter.complexId = new Types.ObjectId(clinicCollectionId);
    }

    // Filter by service(s) if provided — uses ClinicService junction table.
    // Supports both single serviceId and multi-service union (serviceIds[]).
    // FALLBACK: if no clinic_services records exist for the service(s), we do NOT
    // return empty — instead we skip the junction filter and return clinics based
    // on working hours only. This handles org-level services not yet assigned to
    // specific clinics, preventing a blank clinic dropdown in the booking form.
    const effectiveServiceIds = [
      ...(serviceId ? [serviceId] : []),
      ...(serviceIds ?? []),
    ].filter(Boolean);

    if (effectiveServiceIds.length > 0) {
      const validClinicIds = await this.clinicServiceModel
        .find({
          serviceId: { $in: effectiveServiceIds.map((id) => new Types.ObjectId(id)) },
          isActive: true,
        })
        .distinct('clinicId');

      if (validClinicIds.length > 0) {
        // Apply junction intersection with any existing clinic scope
        if (clinicFilter._id) {
          const existingId = clinicFilter._id instanceof Types.ObjectId
            ? clinicFilter._id.toString()
            : clinicFilter._id.$in
              ? null // already an $in array — handled below
              : clinicFilter._id.toString();

          if (existingId) {
            // Single-clinic scope: check it's in the valid set
            if (!validClinicIds.some((id: any) => id.toString() === existingId)) return [];
          } else if (clinicFilter._id.$in) {
            // Multi-clinic scope: intersect
            const scopeSet = new Set(clinicFilter._id.$in.map((id: any) => id.toString()));
            const intersection = validClinicIds.filter((id: any) => scopeSet.has(id.toString()));
            if (intersection.length === 0) return [];
            clinicFilter._id = { $in: intersection };
          }
        } else {
          clinicFilter._id = { $in: validClinicIds };
        }
      }
      // If validClinicIds.length === 0: service not in junction table →
      // skip filter (service available everywhere) — permissive default.
    }

    // 2. Fetch matching clinics
    const clinics = await this.clinicModel
      .find(clinicFilter)
      .select('_id name')
      .lean()
      .exec();

    if (!clinics.length) return [];

    // 3. Determine day-of-week from date string (avoid timezone shifts)
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = dayNames[dateObj.getDay()];

    const [slotH, slotM] = time.split(':').map(Number);
    const slotMinutes = slotH * 60 + slotM;

    // 4. Filter clinics whose working hours cover the requested slot.
    //    Mirrors createAppointment logic: clinics with NO working hours configured
    //    are always considered available (same permissive default used on creation).
    const available: { _id: string; name: string }[] = [];

    for (const clinic of clinics) {
      const wh = await this.workingHoursIntegrationService.getClinicWorkingHours(
        clinic._id.toString(),
      );

      // No WH configured → always available (consistent with createAppointment behaviour)
      if (!wh || wh.length === 0) {
        available.push({ _id: (clinic._id as any).toString(), name: clinic.name });
        continue;
      }

      const dayWh = wh.find(
        (w: any) => w.dayOfWeek === dayOfWeek && w.isWorkingDay && w.isActive,
      );
      if (!dayWh) continue;

      const [oh, om] = (dayWh.openingTime as string).split(':').map(Number);
      const [ch, cm] = (dayWh.closingTime as string).split(':').map(Number);
      const openMin = oh * 60 + om;
      const closeMin = ch * 60 + cm;

      if (slotMinutes < openMin || slotMinutes >= closeMin) continue;

      // Note: break-time filtering is intentionally omitted here.
      // getAvailableClinics only gates on opening/closing hours so the clinic
      // appears in the dropdown. The actual break-time conflict is validated
      // later in createAppointment (appointment-working-hours.service.ts).
      // Filtering by break time here caused clinics to vanish at 12:00 even
      // when a cancelled appointment at that time proved they were bookable.

      available.push({ _id: (clinic._id as any).toString(), name: clinic.name });
    }

    // If a doctor was pre-filled from the calendar, restrict to clinics where that doctor works.
    // This prevents the clinic list from showing clinics incompatible with the pre-selected doctor.
    if (doctorId && Types.ObjectId.isValid(doctorId)) {
      const doctor = await this.userModel
        .findOne({ _id: new Types.ObjectId(doctorId) }, { clinicId: 1, clinicIds: 1 })
        .lean();
      if (doctor) {
        const doctorClinicSet = new Set<string>();
        if ((doctor as any).clinicIds?.length) {
          (doctor as any).clinicIds.forEach((id: any) => doctorClinicSet.add(id.toString()));
        }
        if ((doctor as any).clinicId) {
          doctorClinicSet.add((doctor as any).clinicId.toString());
        }
        return available.filter((c) => doctorClinicSet.has(c._id.toString()));
      }
    }

    return available;
  }

  /**
   * M6 UC – GET /appointments/available-doctors
   *
   * Returns doctors at a given clinic who are NOT busy (have no overlapping
   * appointments) at the requested date + time + duration slot.
   *
   * @param clinicId - clinic to scope doctors to
   * @param date     - "YYYY-MM-DD"
   * @param time     - "HH:mm"
   * @param duration - appointment duration in minutes (default 30)
   */
  async getAvailableDoctors(
    clinicId: string,
    date: string,
    time: string,
    duration: number,
    serviceId?: string,
    userId?: string,
    userRole?: string,
    serviceIds?: string[],
  ): Promise<{ _id: string; name: string }[]> {
    // 0. If serviceId or serviceIds provided, filter to doctors authorized for those services via DoctorService junction.
    //    FALLBACK: if no records exist (service has no assigned doctors yet), skip the filter —
    //    any doctor at the clinic is returned. Consistent with validateDoctorServiceAuthorization.
    let authorizedDoctorIds: Types.ObjectId[] | null = null;

    // Use union of serviceId and serviceIds
    const effectiveServiceIds = [...(serviceIds || [])];
    if (serviceId && !effectiveServiceIds.includes(serviceId)) {
      effectiveServiceIds.push(serviceId);
    }

    if (effectiveServiceIds.length > 0) {
      // Check each service individually. If ANY service is permissive (has 0 assignments in this clinic),
      // then ALL doctors at the clinic are authorized for that service, so they should be in the union.
      let isAnyServicePermissive = false;
      const allAuthorizedInUnion = new Set<string>();

      for (const sId of effectiveServiceIds) {
        const doctorServiceEntries = await this.doctorServiceModel
          .find({
            serviceId: new Types.ObjectId(sId),
            clinicId: new Types.ObjectId(clinicId),
            isActive: true,
          })
          .distinct('doctorId');

        if (doctorServiceEntries.length === 0) {
          isAnyServicePermissive = true;
          break; // Optimization: once one is permissive, the whole union allows all doctors
        } else {
          doctorServiceEntries.forEach(id => allAuthorizedInUnion.add(id.toString()));
        }
      }

      if (isAnyServicePermissive) {
        authorizedDoctorIds = null; // null triggers the permissive default later
      } else if (allAuthorizedInUnion.size > 0) {
        authorizedDoctorIds = Array.from(allAuthorizedInUnion).map(id => new Types.ObjectId(id));
      }
    }

    // 1. Get all active doctors/staff assigned to this specific clinic.
    // BUG 5 FIX: check BOTH clinicId (single) and clinicIds (array) so staff
    // whose primary or secondary assignment includes the requested clinicId are
    // returned — but staff assigned to OTHER clinics are NOT returned.
    // Admin/super_admin are not affected (they bypass this method entirely
    // and are excluded from the 'doctor' role filter below).
    const requestedClinicObjId = new Types.ObjectId(clinicId);
    const doctorQuery: any = {
      $or: [
        { clinicId: requestedClinicObjId },
        { clinicIds: requestedClinicObjId },
      ],
      role: 'doctor',
      isActive: true,
      deletedAt: { $exists: false },
    };

    // ROLE-BASED RESTRICTION: Doctors can only see themselves as available
    if (userRole === 'doctor' && userId) {
      doctorQuery._id = new Types.ObjectId(userId);
    } else if (authorizedDoctorIds !== null) {
      doctorQuery._id = { $in: authorizedDoctorIds };
    }
    const doctors = await this.userModel
      .find(doctorQuery)
      .select('_id firstName lastName name')
      .lean()
      .exec();

    if (!doctors.length) return [];

    // 2. Fetch all non-cancelled appointments for THIS CLINIC on this date
    // ROOT CAUSE FIX: Strict Clinic Overlap (1 appointment per clinic at a time)
    // To enforce this, we check for ANY appointment in the clinic, not just the current doctors.
    const [year, month, day] = date.split('-').map(Number);
    const dayStart = new Date(year, month - 1, day, 0, 0, 0);
    const dayEnd = new Date(year, month - 1, day, 23, 59, 59);

    const clinicAppts = await this.appointmentModel
      .find({
        clinicId: new Types.ObjectId(clinicId),
        appointmentDate: { $gte: dayStart, $lte: dayEnd },
        status: { $nin: ['cancelled', 'no_show'] },
        deletedAt: { $exists: false },
      })
      .select('doctorId appointmentTime durationMinutes')
      .lean()
      .exec();

    // 3. Compute slot window in minutes-since-midnight
    const [slotH, slotM] = time.split(':').map(Number);
    const slotStart = slotH * 60 + slotM;
    const slotEnd = slotStart + duration;

    // 4. Check if the entire clinic is busy at this time
    let isClinicBusy = false;
    for (const appt of clinicAppts) {
      const [aH, aM] = ((appt as any).appointmentTime as string).split(':').map(Number);
      const aStart = aH * 60 + aM;
      const aEnd = aStart + ((appt as any).durationMinutes || 30);
      
      // Overlap when: slotStart < aEnd AND slotEnd > aStart
      if (slotStart < aEnd && slotEnd > aStart) {
        isClinicBusy = true;
        break;
      }
    }

    // If the clinic is busy, no doctor can be available
    if (isClinicBusy) return [];

    // 5. If clinic is not busy, all candidates from step 1 are potentially available
    const nonBusyDoctors = doctors;

    // 6. Mirror the working-hours gate used in createAppointment:
    //    Only filter by WH when BOTH clinic and doctor have WH configured.
    const dateObj = new Date(year, month - 1, day);
    const clinicWH = await this.workingHoursIntegrationService.getClinicWorkingHours(clinicId);
    const clinicHasWH = clinicWH.length > 0;

    const results = await Promise.all(
      nonBusyDoctors.map(async (dr) => {
        const drId = dr._id.toString();
        if (clinicHasWH) {
          const doctorWH = await this.workingHoursIntegrationService.getDoctorWorkingHours(drId);
          if (doctorWH.length > 0) {
            // Both have WH — validate effective hours just like createAppointment does
            const effectiveHours =
              await this.workingHoursIntegrationService.getEffectiveWorkingHours(
                drId,
                clinicId,
                dateObj,
              );
            if (!effectiveHours) return null; // holiday or non-working day

            const openMin = this.timeToMinutes(effectiveHours.openingTime);
            const closeMin = this.timeToMinutes(effectiveHours.closingTime);

            // Slot must fit within working hours
            if (slotStart < openMin || slotEnd > closeMin) return null;

            // Slot must not overlap break
            if (effectiveHours.breakStartTime && effectiveHours.breakEndTime) {
              const brkStart = this.timeToMinutes(effectiveHours.breakStartTime);
              const brkEnd = this.timeToMinutes(effectiveHours.breakEndTime);
              const overlapsBreak =
                (slotStart >= brkStart && slotStart < brkEnd) ||
                (slotEnd > brkStart && slotEnd <= brkEnd) ||
                (slotStart <= brkStart && slotEnd >= brkEnd);
              if (overlapsBreak) return null;
            }
          }
        }

        return {
          _id: drId,
          name:
            (dr as any).name ||
            `${(dr as any).firstName || ''} ${(dr as any).lastName || ''}`.trim() ||
            drId,
        };
      }),
    );

    return results.filter((d): d is { _id: string; name: string } => d !== null);
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  /**
   * Helper: Find the invoiceItemId in the invoice that is linked to a given appointmentId.
   * Returns the invoiceItemId string or null if not found.
   */
  private async _findInvoiceItemId(invoice: any, appointmentId: string): Promise<string | null> {
    if (!invoice || !invoice.services) return null;
    for (const svc of invoice.services) {
      if (!svc.sessions) continue;
      for (const session of svc.sessions) {
        if (session.appointmentId && session.appointmentId.toString() === appointmentId) {
          return session.invoiceItemId ? session.invoiceItemId.toString() : null;
        }
      }
    }
    return null;
  }

  /**
   * Escape special regex characters to prevent ReDoS attacks (S-6).
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Returns the context needed for the appointments page filters based on the user's plan type.
   */
  async getAppointmentPageContext(
    requestingUser: any,
  ): Promise<AppointmentPageContextResponseDto> {
    const inferredPlanType =
      requestingUser.planType ||
      (requestingUser.organizationId
        ? 'company'
        : requestingUser.complexId
          ? 'complex'
          : Array.isArray(requestingUser.clinicIds) && requestingUser.clinicIds.length > 1
            ? 'company'
            : 'clinic');
    const planType = ['company', 'complex', 'clinic'].includes(inferredPlanType)
      ? inferredPlanType
      : 'clinic';
    const context: AppointmentPageContextResponseDto = {
      planType,
      role: requestingUser.role,
      clinics: [],
      doctors: [],
      services: [],
    };
    let contextDoctorSource: any[] = [];

    const organizationId = requestingUser.organizationId;
    const subscriptionId = requestingUser.subscriptionId;
    const complexId = requestingUser.complexId;
    const clinicId = requestingUser.clinicId;
    const assignedClinicIds = Array.isArray(requestingUser.clinicIds)
      ? requestingUser.clinicIds.filter((id: any) => Types.ObjectId.isValid(String(id)))
      : [];
    const userId = requestingUser.userId;
    const userRole = requestingUser.role;
    const tenantScopeFilter: any = { deletedAt: { $exists: false } };

    if (subscriptionId && Types.ObjectId.isValid(subscriptionId)) {
      tenantScopeFilter.subscriptionId = new Types.ObjectId(subscriptionId);
    } else if (organizationId && Types.ObjectId.isValid(organizationId)) {
      tenantScopeFilter.organizationId = new Types.ObjectId(organizationId);
    }

    const buildDoctorClinicIds = (doctor: any): string[] => {
      const clinicIdsSet = new Set<string>();
      if (Array.isArray(doctor?.clinicIds)) {
        for (const assignedClinicId of doctor.clinicIds) {
          if (assignedClinicId) {
            clinicIdsSet.add(assignedClinicId.toString());
          }
        }
      }
      if (doctor?.clinicId) {
        clinicIdsSet.add(doctor.clinicId.toString());
      }
      return Array.from(clinicIdsSet);
    };

    const mapWorkingHoursDay = (workingHour: any) => ({
      dayOfWeek: workingHour.dayOfWeek,
      isWorkingDay: workingHour.isWorkingDay,
      openingTime: workingHour.openingTime,
      closingTime: workingHour.closingTime,
      breakStartTime: workingHour.breakStartTime,
      breakEndTime: workingHour.breakEndTime,
    });

    const enrichContextWithRelations = async (doctorSource: any[]): Promise<void> => {
      const clinicObjIds = context.clinics
        .map((clinic) => clinic._id)
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id));
      const doctorObjIds = doctorSource
        .map((doctor) => doctor?._id)
        .filter((id) => Types.ObjectId.isValid(String(id)))
        .map((id) => new Types.ObjectId(id.toString()));

      const [
        clinicServiceRecords,
        clinicWorkingHoursRecords,
        doctorServiceRecords,
        doctorWorkingHoursRecords,
      ] = await Promise.all([
        clinicObjIds.length > 0
          ? this.clinicServiceModel
              .find({ clinicId: { $in: clinicObjIds } })
              .select('clinicId serviceId')
              .lean()
              .exec()
          : Promise.resolve([]),
        clinicObjIds.length > 0
          ? this.workingHoursModel
              .find({
                entityType: 'clinic',
                entityId: { $in: clinicObjIds },
                isActive: { $ne: false },
              })
              .select(
                'entityId dayOfWeek isWorkingDay openingTime closingTime breakStartTime breakEndTime',
              )
              .lean()
              .exec()
          : Promise.resolve([]),
        doctorObjIds.length > 0
          ? this.doctorServiceModel
              .find({
                doctorId: { $in: doctorObjIds },
                isActive: true,
              })
              .select('doctorId serviceId')
              .lean()
              .exec()
          : Promise.resolve([]),
        doctorObjIds.length > 0
          ? this.workingHoursModel
              .find({
                entityType: 'doctor',
                entityId: { $in: doctorObjIds },
                isActive: { $ne: false },
              })
              .select(
                'entityId dayOfWeek isWorkingDay openingTime closingTime breakStartTime breakEndTime',
              )
              .lean()
              .exec()
          : Promise.resolve([]),
      ]);

      const clinicServicesMap = new Map<string, Set<string>>();
      for (const record of clinicServiceRecords as any[]) {
        const recordClinicId = record.clinicId?.toString();
        const recordServiceId = record.serviceId?.toString();
        if (!recordClinicId || !recordServiceId) continue;
        if (!clinicServicesMap.has(recordClinicId)) {
          clinicServicesMap.set(recordClinicId, new Set<string>());
        }
        clinicServicesMap.get(recordClinicId)!.add(recordServiceId);
      }

      const clinicWorkingHoursMap = new Map<string, any[]>();
      for (const record of clinicWorkingHoursRecords as any[]) {
        const recordClinicId = record.entityId?.toString();
        if (!recordClinicId) continue;
        if (!clinicWorkingHoursMap.has(recordClinicId)) {
          clinicWorkingHoursMap.set(recordClinicId, []);
        }
        clinicWorkingHoursMap.get(recordClinicId)!.push(mapWorkingHoursDay(record));
      }

      context.clinics = context.clinics.map((clinic) => ({
        ...clinic,
        services: Array.from(clinicServicesMap.get(clinic._id) || []),
        workingHours: clinicWorkingHoursMap.get(clinic._id) || [],
      }));

      const doctorServicesMap = new Map<string, Set<string>>();
      for (const record of doctorServiceRecords as any[]) {
        const recordDoctorId = record.doctorId?.toString();
        const recordServiceId = record.serviceId?.toString();
        if (!recordDoctorId || !recordServiceId) continue;
        if (!doctorServicesMap.has(recordDoctorId)) {
          doctorServicesMap.set(recordDoctorId, new Set<string>());
        }
        doctorServicesMap.get(recordDoctorId)!.add(recordServiceId);
      }

      const doctorWorkingHoursMap = new Map<string, any[]>();
      for (const record of doctorWorkingHoursRecords as any[]) {
        const recordDoctorId = record.entityId?.toString();
        if (!recordDoctorId) continue;
        if (!doctorWorkingHoursMap.has(recordDoctorId)) {
          doctorWorkingHoursMap.set(recordDoctorId, []);
        }
        doctorWorkingHoursMap.get(recordDoctorId)!.push(mapWorkingHoursDay(record));
      }

      context.doctors = doctorSource.map((doctor: any) => {
        const doctorId = doctor._id.toString();
        const doctorName = `${doctor?.firstName || ''} ${doctor?.lastName || ''}`.trim();
        return {
          _id: doctorId,
          name: doctorName,
          clinicIds: buildDoctorClinicIds(doctor),
          serviceIds: Array.from(doctorServicesMap.get(doctorId) || []),
          workingHours: doctorWorkingHoursMap.get(doctorId) || [],
        };
      });

      const uniqueServiceIds = Array.from(
        new Set(
          (clinicServiceRecords as any[])
            .map((record) => record.serviceId?.toString())
            .filter((id): id is string => Boolean(id)),
        ),
      );
      const serviceObjIds = uniqueServiceIds
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id));

      const serviceDocs =
        serviceObjIds.length > 0
          ? await this.serviceModel
              .find({ _id: { $in: serviceObjIds } })
              .select('_id name duration durationMinutes clinicIds')
              .lean()
              .exec()
          : [];

      // Allowed clinic IDs (already role-scoped) for filtering Service.clinicIds field.
      const allowedClinicIdSet = new Set(
        (context.clinics as any[]).map((c) => c._id?.toString()).filter(Boolean),
      );

      context.services = (serviceDocs as any[]).map((serviceDoc) => {
        const serviceId = serviceDoc._id.toString();
        const clinicIdSet = new Set(
          (clinicServiceRecords as any[])
            .filter((record) => record.serviceId?.toString() === serviceId)
            .map((record) => record.clinicId?.toString())
            .filter((id): id is string => Boolean(id)),
        );
        // Union with Service.clinicIds field (filtered by user's allowed scope) so
        // services assigned via the document field but missing junction records
        // still appear with their full clinic list.
        if (Array.isArray(serviceDoc.clinicIds)) {
          for (const cid of serviceDoc.clinicIds) {
            const cidStr = cid?.toString();
            if (cidStr && allowedClinicIdSet.has(cidStr)) {
              clinicIdSet.add(cidStr);
            }
          }
        }
        const clinicIds = Array.from(clinicIdSet);
        const doctorIds = Array.from(
          new Set(
            (doctorServiceRecords as any[])
              .filter((record) => record.serviceId?.toString() === serviceId)
              .map((record) => record.doctorId?.toString())
              .filter((id): id is string => Boolean(id)),
          ),
        );
        return {
          _id: serviceId,
          name: serviceDoc.name,
          duration: serviceDoc.durationMinutes ?? serviceDoc.duration,
          clinicIds,
          doctorIds,
        };
      });

      // Include permissive services (0 junction records) — all clinics can use them.
      // The /services/filter-header endpoint already returns these correctly; the context
      // must mirror that so the frontend can pre-fill slot duration on click.
      if (subscriptionId && Types.ObjectId.isValid(subscriptionId)) {
        const junctionServiceIdSet = new Set(context.services.map((s: any) => s._id));
        const allScopeServices = await this.serviceModel
          .find({
            subscriptionId: new Types.ObjectId(subscriptionId),
            deletedAt: { $exists: false },
          })
          .select('_id name duration durationMinutes')
          .lean()
          .exec();

        for (const svc of allScopeServices as any[]) {
          const svcId = svc._id.toString();
          if (!junctionServiceIdSet.has(svcId)) {
            context.services.push({
              _id: svcId,
              name: svc.name,
              duration: svc.durationMinutes ?? svc.duration,
              clinicIds: context.clinics.map((c: any) => c._id),
              doctorIds: context.doctors.map((d: any) => d._id),
            });
          }
        }
      }
    };

    // Strict UI restriction: Doctors should only see themselves in the doctor filter
    if (userRole === 'doctor' && userId) {
      const doctor = await this.userModel
        .findOne({
          _id: new Types.ObjectId(userId),
          role: 'doctor',
          isActive: true,
          deletedAt: { $exists: false },
          ...tenantScopeFilter,
        })
        .select('_id firstName lastName clinicId clinicIds organizationId complexId')
        .lean()
        .exec();
      
      if (doctor) {
        contextDoctorSource = [doctor];
        context.doctors = [
          {
            _id: doctor._id.toString(),
            name: `${(doctor as any).firstName || ''} ${(doctor as any).lastName || ''}`.trim(),
            clinicIds: buildDoctorClinicIds(doctor),
            serviceIds: [],
            workingHours: [],
          },
        ];

        // Still need to populate clinics context for the doctor's dropdown
        if (doctor.clinicId) {
          const clinic = await this.clinicModel
            .findOne({
              _id: doctor.clinicId,
              isActive: true,
              ...tenantScopeFilter,
            })
            .select('_id name complexId')
            .lean();
          if (clinic) {
            context.clinics = [
              {
                _id: clinic._id.toString(),
                name: clinic.name,
                complexId: (clinic as any).complexId?.toString(),
                services: [],
                workingHours: [],
              },
            ];
          }
        }
        await enrichContextWithRelations(contextDoctorSource);
        return context;
      }
    }

    if (planType === 'company' && organizationId) {
      const orgObjId = new Types.ObjectId(organizationId);
      
      const complexes = await this.complexModel
        .find({ ...tenantScopeFilter, organizationId: orgObjId, deletedAt: { $exists: false } })
        .select('_id name')
        .lean()
        .exec();
      context.complexes = complexes.map((c: any) => ({ _id: c._id.toString(), name: c.name }));
      const companyComplexObjectIds = complexes.map((complex: any) => complex._id);

      const companyClinicFilter: any = {
        ...tenantScopeFilter,
        deletedAt: { $exists: false },
        isActive: true,
      };
      if (companyComplexObjectIds.length > 0) {
        companyClinicFilter.$or = [
          { organizationId: orgObjId },
          { complexId: { $in: companyComplexObjectIds } },
        ];
      } else {
        companyClinicFilter.organizationId = orgObjId;
      }

      const clinics = await this.clinicModel
        .find(companyClinicFilter)
        .select('_id name complexId')
        .lean()
        .exec();
      context.clinics = clinics.map((c: any) => ({
        _id: c._id.toString(),
        name: c.name,
        complexId: c.complexId?.toString(),
        services: [],
        workingHours: [],
      }));

      const contextClinicObjectIds = clinics.map((c: any) => c._id);
      const doctors = await this.userModel
        .find({
          ...tenantScopeFilter,
          role: 'doctor',
          isActive: true,
          deletedAt: { $exists: false },
          $or: [
            { clinicId: { $in: contextClinicObjectIds } },
            { clinicIds: { $in: contextClinicObjectIds } },
          ],
        })
        .select('_id firstName lastName clinicId clinicIds')
        .lean()
        .exec();
      contextDoctorSource = doctors;
      context.doctors = doctors.map((d: any) => ({
        _id: d._id.toString(),
        name: `${d.firstName || ''} ${d.lastName || ''}`.trim(),
        clinicIds: buildDoctorClinicIds(d),
        serviceIds: [],
        workingHours: [],
      }));
    } else if (planType === 'complex' && complexId) {
      const compObjId = new Types.ObjectId(complexId);
      
      const clinics = await this.clinicModel
        .find({
          ...tenantScopeFilter,
          complexId: compObjId,
          deletedAt: { $exists: false },
          isActive: true,
        })
        .select('_id name complexId')
        .lean()
        .exec();
      context.clinics = clinics.map((c: any) => ({
        _id: c._id.toString(),
        name: c.name,
        complexId: c.complexId?.toString(),
        services: [],
        workingHours: [],
      }));

      const contextClinicObjectIds = clinics.map((c: any) => c._id);
      const doctors = await this.userModel
        .find({
          ...tenantScopeFilter,
          complexId: compObjId,
          role: 'doctor',
          isActive: true,
          deletedAt: { $exists: false },
          $or: [
            { clinicId: { $in: contextClinicObjectIds } },
            { clinicIds: { $in: contextClinicObjectIds } },
          ],
        })
        .select('_id firstName lastName clinicId clinicIds')
        .lean()
        .exec();
      contextDoctorSource = doctors;
      context.doctors = doctors.map((d: any) => ({
        _id: d._id.toString(),
        name: `${d.firstName || ''} ${d.lastName || ''}`.trim(),
        clinicIds: buildDoctorClinicIds(d),
        serviceIds: [],
        workingHours: [],
      }));
    } else if (assignedClinicIds.length > 0) {
      // Prefer explicit multi-clinic assignments when present.
      const clinicObjectIds = assignedClinicIds.map((id: string) => new Types.ObjectId(id));
      const clinics = await this.clinicModel
        .find({
          ...tenantScopeFilter,
          _id: { $in: clinicObjectIds },
          deletedAt: { $exists: false },
          isActive: true,
        })
        .select('_id name complexId')
        .lean()
        .exec();
      context.clinics = clinics.map((c: any) => ({
        _id: c._id.toString(),
        name: c.name,
        complexId: c.complexId?.toString(),
        services: [],
        workingHours: [],
      }));

      const doctors = await this.userModel
        .find({
          ...tenantScopeFilter,
          role: 'doctor',
          isActive: true,
          deletedAt: { $exists: false },
          $or: [
            { clinicId: { $in: clinicObjectIds } },
            { clinicIds: { $in: clinicObjectIds } },
          ],
        })
        .select('_id firstName lastName clinicId clinicIds')
        .lean()
        .exec();
      contextDoctorSource = doctors;
      context.doctors = doctors.map((d: any) => ({
        _id: d._id.toString(),
        name: `${d.firstName || ''} ${d.lastName || ''}`.trim(),
        clinicIds: buildDoctorClinicIds(d),
        serviceIds: [],
        workingHours: [],
      }));
    } else if (clinicId) {
      const clObjId = new Types.ObjectId(clinicId);
      
      const clinic = await this.clinicModel
        .findOne({
          _id: clObjId,
          isActive: true,
          ...tenantScopeFilter,
        })
        .select('_id name complexId')
        .lean()
        .exec();
      if (clinic) {
        context.clinics = [
          {
            _id: clinic._id.toString(),
            name: clinic.name,
            complexId: (clinic as any).complexId?.toString(),
            services: [],
            workingHours: [],
          },
        ];
      }

      const doctors = await this.userModel
        .find({
          ...tenantScopeFilter,
          role: 'doctor',
          isActive: true,
          deletedAt: { $exists: false },
          $or: [
            { clinicId: clObjId },
            { clinicIds: { $in: [clObjId] } },
          ],
        })
        .select('_id firstName lastName clinicId clinicIds')
        .lean()
        .exec();
      contextDoctorSource = doctors;
      context.doctors = doctors.map((d: any) => ({
        _id: d._id.toString(),
        name: `${d.firstName || ''} ${d.lastName || ''}`.trim(),
        clinicIds: buildDoctorClinicIds(d),
        serviceIds: [],
        workingHours: [],
      }));
    }

    await enrichContextWithRelations(contextDoctorSource);
    return context;
  }

  /**
   * Returns availability across multiple clinics and optionally multiple doctors.
   */
  async getUnifiedAvailability(
    query: UnifiedAvailabilityQueryDto,
  ): Promise<any> {
    const { clinicIds, doctorIds, date, duration = 30 } = query;
    const bookingDate = new Date(date);
    
    // 1. Fetch clinics and their working hours
    const clinics = await this.clinicModel
      .find({ _id: { $in: clinicIds.map(id => new Types.ObjectId(id)) }, isActive: true, deletedAt: null })
      .select('_id name')
      .lean()
      .exec();

    if (!clinics.length) return { date, slots: [] };

    // 2. Resolve doctors
    let targetDoctorIds = doctorIds;
    if (!targetDoctorIds || targetDoctorIds.length === 0) {
      const doctors = await this.userModel
        .find({ clinicId: { $in: clinics.map(c => c._id) }, role: 'doctor', isActive: true })
        .select('_id')
        .lean()
        .exec();
      targetDoctorIds = doctors.map(d => d._id.toString());
    }

    if (!targetDoctorIds.length) return { date, slots: [] };

    // 3. Fetch all effective working hours for all clinic-doctor combinations
    const allEffectiveHours: any[] = [];
    for (const cId of clinicIds) {
      for (const dId of targetDoctorIds) {
        const wh = await this.workingHoursIntegrationService.getEffectiveWorkingHours(dId, cId, bookingDate);
        if (wh) {
          allEffectiveHours.push({ clinicId: cId, doctorId: dId, ...wh });
        }
      }
    }

    if (!allEffectiveHours.length) return { date, slots: [] };

    // 4. Determine overall start and end time (union of all working hours)
    let minStart = '23:59';
    let maxEnd = '00:00';
    for (const wh of allEffectiveHours) {
      if (wh.openingTime < minStart) minStart = wh.openingTime;
      if (wh.closingTime > maxEnd) maxEnd = wh.closingTime;
    }

    // 5. Fetch all appointments for these doctors on this date
    const appointments = await this.appointmentModel
      .find({
        doctorId: { $in: targetDoctorIds.map(id => new Types.ObjectId(id)) },
        appointmentDate: {
          $gte: new Date(new Date(bookingDate).setHours(0, 0, 0, 0)),
          $lte: new Date(new Date(bookingDate).setHours(23, 59, 59, 999)),
        },
        status: { $nin: ['cancelled', 'no_show'] },
        deletedAt: { $exists: false },
      })
      .select('doctorId clinicId appointmentTime durationMinutes')
      .lean()
      .exec();

    // 6. Generate slots
    const slots: any[] = [];
    const [startH, startM] = minStart.split(':').map(Number);
    const [endH, endM] = maxEnd.split(':').map(Number);

    let currentH = startH;
    let currentM = startM;

    const now = new Date();

    while (currentH < endH || (currentH === endH && currentM < endM)) {
      const timeStr = `${currentH.toString().padStart(2, '0')}:${currentM.toString().padStart(2, '0')}`;
      const slotEndTime = this.addMinutesToTime(timeStr, duration);
      
      // Check if slot is in the past
      const slotDateTime = new Date(date);
      const [h, m] = timeStr.split(':').map(Number);
      slotDateTime.setHours(h, m, 0, 0);
      const isPast = slotDateTime < now;

      const availablePairs: any[] = [];

      for (const wh of allEffectiveHours) {
        // Is clinic/doctor open at this time?
        if (timeStr < wh.openingTime || slotEndTime > wh.closingTime) continue;

        // Is it break time?
        if (wh.breakStartTime && wh.breakEndTime && timeStr >= wh.breakStartTime && timeStr < wh.breakEndTime) continue;

        // Is doctor busy?
        const isBusy = appointments.some(apt => {
          if (apt.doctorId.toString() !== wh.doctorId) return false;
          const aptEnd = this.addMinutesToTime(apt.appointmentTime, apt.durationMinutes);
          return timeStr < aptEnd && slotEndTime > apt.appointmentTime;
        });

        if (!isBusy) {
          availablePairs.push({ clinicId: wh.clinicId, doctorId: wh.doctorId });
        }
      }

      slots.push({
        time: timeStr,
        available: !isPast && availablePairs.length > 0,
        isPast,
        availablePairs,
      });

      // Increment
      currentM += duration;
      while (currentM >= 60) {
        currentM -= 60;
        currentH += 1;
      }
    }

    return {
      date,
      slots,
    };
  }
}
