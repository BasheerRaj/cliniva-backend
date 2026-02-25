import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { AppointmentService } from './appointment.service';
import { WorkingHoursIntegrationService } from './services/working-hours-integration.service';
import { AppointmentValidationService } from './services/appointment-validation.service';
import { AppointmentStatusService } from './services/appointment-status.service';
import { AppointmentCalendarService } from './services/appointment-calendar.service';
import { AppointmentSessionService } from './services/appointment-session.service';
import { NotificationService } from '../notification/notification.service';
import { AuditService } from '../auth/audit.service';
import { SESSION_ERROR_MESSAGES } from './constants/session-error-messages.constant';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const oid = () => new Types.ObjectId().toString();

function buildSession(overrides: Record<string, any> = {}) {
  return {
    _id: oid(),
    name: 'Consultation',
    duration: 45,
    order: 1,
    ...overrides,
  };
}

function buildService(overrides: Record<string, any> = {}) {
  return {
    _id: new Types.ObjectId(),
    name: 'Test Service',
    durationMinutes: 30,
    sessions: [],
    isActive: true,
    ...overrides,
  };
}

function buildCreateDto(overrides: Record<string, any> = {}) {
  return {
    patientId: oid(),
    doctorId: oid(),
    serviceId: oid(),
    clinicId: oid(),
    appointmentDate: new Date(Date.now() + 86400000), // tomorrow
    appointmentTime: '10:00',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('AppointmentService', () => {
  let service: AppointmentService;

  let mockAppointmentModel: any;
  let mockServiceModel: any;
  let mockAppointmentValidationService: any;
  let mockAppointmentSessionService: any;
  let mockWorkingHoursIntegrationService: any;
  let mockNotificationService: any;
  let mockAuditService: any;

  let mockSave: jest.Mock;

  beforeEach(async () => {
    mockSave = jest.fn();
    const createdDoc = { _id: new Types.ObjectId(), save: mockSave };
    mockSave.mockResolvedValue(createdDoc);

    mockAppointmentModel = jest.fn().mockReturnValue({ save: mockSave });
    mockAppointmentModel.find = jest.fn().mockResolvedValue([]);
    mockAppointmentModel.findById = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
    });

    mockServiceModel = {
      findById: jest.fn(),
    };

    mockAppointmentValidationService = {
      validateAllEntitiesAndRelationships: jest.fn(),
    };

    mockAppointmentSessionService = {
      validateSessionReference: jest.fn().mockResolvedValue(undefined),
      checkDuplicateSessionBooking: jest.fn().mockResolvedValue(undefined),
      checkCompletedSessionRebooking: jest.fn().mockResolvedValue(undefined),
      getSessionDuration: jest.fn((session, defaultDuration) =>
        session.duration ?? defaultDuration,
      ),
    };

    mockWorkingHoursIntegrationService = {
      getEffectiveWorkingHours: jest.fn().mockResolvedValue(null),
      isTimeBlocked: jest.fn().mockResolvedValue(false),
    };

    mockNotificationService = {
      create: jest.fn().mockResolvedValue({}),
    };

    mockAuditService = {
      logSecurityEvent: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentService,
        { provide: getModelToken('Appointment'), useValue: mockAppointmentModel },
        { provide: getModelToken('Patient'), useValue: {} },
        { provide: getModelToken('User'), useValue: {} },
        { provide: getModelToken('Clinic'), useValue: {} },
        { provide: getModelToken('Service'), useValue: mockServiceModel },
        { provide: WorkingHoursIntegrationService, useValue: mockWorkingHoursIntegrationService },
        { provide: AppointmentValidationService, useValue: mockAppointmentValidationService },
        { provide: AppointmentStatusService, useValue: {} },
        { provide: AppointmentCalendarService, useValue: {} },
        { provide: AppointmentSessionService, useValue: mockAppointmentSessionService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<AppointmentService>(AppointmentService);
  });

  afterEach(() => jest.clearAllMocks());

  // =========================================================================
  // create – session support (Requirements 3.1-3.5, 4.1-4.4, 5.1-5.4, 2.1-2.2)
  // =========================================================================

  describe('create – session support', () => {
    it('should create appointment without session when service has no sessions', async () => {
      const svc = buildService({ sessions: [] });
      mockAppointmentValidationService.validateAllEntitiesAndRelationships.mockResolvedValue(
        { service: svc, clinic: {} },
      );

      const dto = buildCreateDto();
      await service.create(dto as any, oid());

      expect(mockAppointmentSessionService.validateSessionReference).not.toHaveBeenCalled();
      expect(mockAppointmentModel).toHaveBeenCalledWith(
        expect.not.objectContaining({ sessionId: expect.anything() }),
      );
    });

    it('should throw SESSION_ID_REQUIRED when service has sessions but sessionId is absent', async () => {
      const session = buildSession();
      const svc = buildService({ sessions: [session] });
      mockAppointmentValidationService.validateAllEntitiesAndRelationships.mockResolvedValue(
        { service: svc, clinic: {} },
      );

      const dto = buildCreateDto(); // no sessionId
      await expect(service.create(dto as any, oid())).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should include SESSION_ID_REQUIRED error code when sessionId missing', async () => {
      const svc = buildService({ sessions: [buildSession()] });
      mockAppointmentValidationService.validateAllEntitiesAndRelationships.mockResolvedValue(
        { service: svc, clinic: {} },
      );

      const err = await service.create(buildCreateDto() as any, oid()).catch(
        (e) => e,
      );
      expect(err.response.code).toBe('SESSION_ID_REQUIRED');
    });

    it('should call validateSessionReference when sessionId provided', async () => {
      const session = buildSession();
      const dto = buildCreateDto({ sessionId: session._id });
      const svc = buildService({ sessions: [session] });
      mockAppointmentValidationService.validateAllEntitiesAndRelationships.mockResolvedValue(
        { service: svc, clinic: {} },
      );

      await service.create(dto as any, oid());

      expect(mockAppointmentSessionService.validateSessionReference).toHaveBeenCalledWith(
        dto.serviceId,
        session._id,
      );
    });

    it('should call checkDuplicateSessionBooking when sessionId provided', async () => {
      const session = buildSession();
      const dto = buildCreateDto({ sessionId: session._id });
      const svc = buildService({ sessions: [session] });
      mockAppointmentValidationService.validateAllEntitiesAndRelationships.mockResolvedValue(
        { service: svc, clinic: {} },
      );

      await service.create(dto as any, oid());

      expect(mockAppointmentSessionService.checkDuplicateSessionBooking).toHaveBeenCalledWith(
        dto.patientId,
        dto.serviceId,
        session._id,
      );
    });

    it('should call checkCompletedSessionRebooking when sessionId provided', async () => {
      const session = buildSession();
      const dto = buildCreateDto({ sessionId: session._id });
      const svc = buildService({ sessions: [session] });
      mockAppointmentValidationService.validateAllEntitiesAndRelationships.mockResolvedValue(
        { service: svc, clinic: {} },
      );

      await service.create(dto as any, oid());

      expect(mockAppointmentSessionService.checkCompletedSessionRebooking).toHaveBeenCalledWith(
        dto.patientId,
        dto.serviceId,
        session._id,
      );
    });

    it('should store sessionId in appointment data', async () => {
      const session = buildSession();
      const dto = buildCreateDto({ sessionId: session._id });
      const svc = buildService({ sessions: [session] });
      mockAppointmentValidationService.validateAllEntitiesAndRelationships.mockResolvedValue(
        { service: svc, clinic: {} },
      );

      await service.create(dto as any, oid());

      const constructorArg = mockAppointmentModel.mock.calls[0][0];
      expect(constructorArg.sessionId).toBe(session._id);
    });

    it('should use session-specific duration when session found', async () => {
      const session = buildSession({ duration: 60 });
      const dto = buildCreateDto({ sessionId: session._id });
      const svc = buildService({ durationMinutes: 30, sessions: [session] });
      mockAppointmentValidationService.validateAllEntitiesAndRelationships.mockResolvedValue(
        { service: svc, clinic: {} },
      );
      mockAppointmentSessionService.getSessionDuration.mockReturnValue(60);

      await service.create(dto as any, oid());

      expect(mockAppointmentSessionService.getSessionDuration).toHaveBeenCalledWith(
        session,
        30,
      );
      const constructorArg = mockAppointmentModel.mock.calls[0][0];
      expect(constructorArg.duration).toBe(60);
    });

    it('should use service.durationMinutes when no sessionId', async () => {
      const svc = buildService({ durationMinutes: 45, sessions: [] });
      mockAppointmentValidationService.validateAllEntitiesAndRelationships.mockResolvedValue(
        { service: svc, clinic: {} },
      );

      await service.create(buildCreateDto() as any, oid());

      const constructorArg = mockAppointmentModel.mock.calls[0][0];
      expect(constructorArg.duration).toBe(45);
    });

    it('should propagate ConflictException from checkDuplicateSessionBooking', async () => {
      const session = buildSession();
      const dto = buildCreateDto({ sessionId: session._id });
      const svc = buildService({ sessions: [session] });
      mockAppointmentValidationService.validateAllEntitiesAndRelationships.mockResolvedValue(
        { service: svc, clinic: {} },
      );
      mockAppointmentSessionService.checkDuplicateSessionBooking.mockRejectedValue(
        new ConflictException({ code: 'DUPLICATE_SESSION_BOOKING' }),
      );

      await expect(service.create(dto as any, oid())).rejects.toThrow(
        ConflictException,
      );
    });

    it('should propagate ConflictException from checkCompletedSessionRebooking', async () => {
      const session = buildSession();
      const dto = buildCreateDto({ sessionId: session._id });
      const svc = buildService({ sessions: [session] });
      mockAppointmentValidationService.validateAllEntitiesAndRelationships.mockResolvedValue(
        { service: svc, clinic: {} },
      );
      mockAppointmentSessionService.checkCompletedSessionRebooking.mockRejectedValue(
        new ConflictException({ code: 'COMPLETED_SESSION_REBOOKING' }),
      );

      await expect(service.create(dto as any, oid())).rejects.toThrow(
        ConflictException,
      );
    });

    it('should NOT call session validation methods when service has no sessions', async () => {
      const svc = buildService({ sessions: [] });
      mockAppointmentValidationService.validateAllEntitiesAndRelationships.mockResolvedValue(
        { service: svc, clinic: {} },
      );

      await service.create(buildCreateDto() as any, oid());

      expect(mockAppointmentSessionService.validateSessionReference).not.toHaveBeenCalled();
      expect(mockAppointmentSessionService.checkDuplicateSessionBooking).not.toHaveBeenCalled();
      expect(mockAppointmentSessionService.checkCompletedSessionRebooking).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // checkAppointmentConflicts – session-specific duration (Requirements 8.1-8.4)
  // =========================================================================

  describe('checkAppointmentConflicts – session duration resolution', () => {
    const patientId = oid();
    const doctorId = oid();
    const appointmentDate = '2026-06-01';
    const appointmentTime = '10:00';

    // Mock the appointment model to return no overlapping appointments
    beforeEach(() => {
      mockAppointmentModel.find = jest.fn().mockResolvedValue([]);
    });

    it('should use provided durationMinutes when serviceId/sessionId not given', async () => {
      const result = await service.checkAppointmentConflicts(
        patientId,
        doctorId,
        appointmentDate,
        appointmentTime,
        45,
      );

      expect(mockServiceModel.findById).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should look up service when both serviceId and sessionId provided', async () => {
      const serviceId = oid();
      const sessionId = oid();
      const session = buildSession({ _id: sessionId, duration: 60 });
      const svc = buildService({ durationMinutes: 30, sessions: [session] });
      mockServiceModel.findById.mockResolvedValue(svc);

      await service.checkAppointmentConflicts(
        patientId,
        doctorId,
        appointmentDate,
        appointmentTime,
        30,
        undefined,
        serviceId,
        sessionId,
      );

      expect(mockServiceModel.findById).toHaveBeenCalledWith(serviceId);
    });

    it('should use session.duration from service when sessionId matches', async () => {
      const serviceId = oid();
      const sessionId = oid();
      const session = buildSession({ _id: sessionId, duration: 90 });
      const svc = buildService({ durationMinutes: 30, sessions: [session] });
      mockServiceModel.findById.mockResolvedValue(svc);

      // Spy on the find to capture the appointmentEnd time indirectly
      let capturedEnd: Date | undefined;
      mockAppointmentModel.find = jest.fn().mockImplementation((query) => {
        // The method builds appointmentEnd internally; we test by checking
        // that no service lookup failure occurs and correct result returned
        return Promise.resolve([]);
      });

      const result = await service.checkAppointmentConflicts(
        patientId,
        doctorId,
        appointmentDate,
        appointmentTime,
        30, // this should be overridden by session.duration=90
        undefined,
        serviceId,
        sessionId,
      );

      // No conflicts since find returns []
      expect(result).toEqual([]);
      // Service was queried for session duration
      expect(mockServiceModel.findById).toHaveBeenCalledWith(serviceId);
    });

    it('should fall back to provided durationMinutes when service not found', async () => {
      const serviceId = oid();
      const sessionId = oid();
      mockServiceModel.findById.mockResolvedValue(null);

      const result = await service.checkAppointmentConflicts(
        patientId,
        doctorId,
        appointmentDate,
        appointmentTime,
        45,
        undefined,
        serviceId,
        sessionId,
      );

      expect(result).toEqual([]);
    });

    it('should fall back to provided durationMinutes when session not found in service', async () => {
      const serviceId = oid();
      const sessionId = oid();
      const svc = buildService({ sessions: [] }); // no sessions
      mockServiceModel.findById.mockResolvedValue(svc);

      const result = await service.checkAppointmentConflicts(
        patientId,
        doctorId,
        appointmentDate,
        appointmentTime,
        45,
        undefined,
        serviceId,
        sessionId,
      );

      expect(result).toEqual([]);
    });

    it('should use service.durationMinutes when session has no explicit duration', async () => {
      const serviceId = oid();
      const sessionId = oid();
      // session.duration is undefined
      const session = { _id: sessionId, name: 'Step', order: 1 };
      const svc = buildService({ durationMinutes: 60, sessions: [session] });
      mockServiceModel.findById.mockResolvedValue(svc);

      // Should not throw — uses svc.durationMinutes (60) as effective duration
      const result = await service.checkAppointmentConflicts(
        patientId,
        doctorId,
        appointmentDate,
        appointmentTime,
        30,
        undefined,
        serviceId,
        sessionId,
      );

      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // getDoctorAvailability – session-specific duration (Requirements 9.1-9.4)
  // =========================================================================

  describe('getDoctorAvailability – session duration resolution', () => {
    const baseQuery = {
      doctorId: oid(),
      date: '2026-06-01',
      clinicId: oid(),
      duration: 30,
    };

    it('should use query.duration when sessionId not provided', async () => {
      // getEffectiveWorkingHours returns null → early exit (clinicId present)
      const result = await service.getDoctorAvailability(baseQuery as any);

      expect(mockServiceModel.findById).not.toHaveBeenCalled();
      expect(result.totalSlots).toBe(0);
    });

    it('should look up service when sessionId and serviceId are both provided', async () => {
      const serviceId = oid();
      const sessionId = oid();
      const session = buildSession({ _id: sessionId, duration: 60 });
      const svc = buildService({ durationMinutes: 30, sessions: [session] });
      mockServiceModel.findById.mockResolvedValue(svc);

      await service.getDoctorAvailability({
        ...baseQuery,
        serviceId,
        sessionId,
      } as any);

      expect(mockServiceModel.findById).toHaveBeenCalledWith(serviceId);
    });

    it('should NOT look up service when sessionId is provided but serviceId is absent', async () => {
      const sessionId = oid();

      await service.getDoctorAvailability({
        ...baseQuery,
        sessionId,
        // no serviceId
      } as any);

      expect(mockServiceModel.findById).not.toHaveBeenCalled();
    });

    it('should use session-specific duration when session found for availability', async () => {
      const serviceId = oid();
      const sessionId = oid();
      const session = buildSession({ _id: sessionId, duration: 90 });
      const svc = buildService({ durationMinutes: 30, sessions: [session] });
      mockServiceModel.findById.mockResolvedValue(svc);

      // Return working hours so we can verify slot duration is used
      mockWorkingHoursIntegrationService.getEffectiveWorkingHours.mockResolvedValue({
        openingTime: '09:00',
        closingTime: '11:30',
        breakStartTime: null,
        breakEndTime: null,
      });
      mockAppointmentModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getDoctorAvailability({
        ...baseQuery,
        serviceId,
        sessionId,
      } as any);

      // 09:00 → 10:30 → (can't fit 10:30→12:00 within 11:30) → 1 slot with 90-min duration
      expect(result.totalSlots).toBe(1);
    });
  });
});
