import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { AppointmentSessionService } from './appointment-session.service';
import { SESSION_ERROR_MESSAGES } from '../constants/session-error-messages.constant';
import { ProcessedSession } from '../../service/interfaces/processed-session.interface';
import { SessionProgressDto } from '../dto/session-progress.dto';
import { BatchBookSessionsDto } from '../dto/batch-book-sessions.dto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const id = () => new Types.ObjectId().toString();

function buildService(sessions: any[] = []) {
  return {
    _id: new Types.ObjectId(),
    durationMinutes: 30,
    sessions,
  };
}

function buildSession(
  sessionId: string,
  name = 'Test Session',
  order = 1,
  duration?: number,
) {
  return { _id: sessionId, name, order, duration };
}

function buildAppointment(overrides: Record<string, any> = {}) {
  return {
    _id: new Types.ObjectId(),
    patientId: new Types.ObjectId(),
    serviceId: new Types.ObjectId(),
    sessionId: undefined as string | undefined,
    status: 'scheduled',
    appointmentDate: new Date('2024-03-15'),
    appointmentTime: '10:00',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('AppointmentSessionService', () => {
  let service: AppointmentSessionService;
  let mockAppointmentModel: {
    findOne: jest.Mock;
    find: jest.Mock;
    insertMany: jest.Mock;
    db: { startSession: jest.Mock };
  };
  let mockServiceModel: { findById: jest.Mock };

  beforeEach(async () => {
    mockAppointmentModel = {
      findOne: jest.fn(),
      find: jest.fn(),
      insertMany: jest.fn(),
      db: { startSession: jest.fn() },
    };
    mockServiceModel = { findById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentSessionService,
        { provide: getModelToken('Appointment'), useValue: mockAppointmentModel },
        { provide: getModelToken('Service'), useValue: mockServiceModel },
      ],
    }).compile();

    service = module.get<AppointmentSessionService>(AppointmentSessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // validateSessionReference
  // =========================================================================

  describe('validateSessionReference', () => {
    const serviceId = id();
    const sessionId = id();

    it('should resolve without error when sessionId exists in service sessions', async () => {
      mockServiceModel.findById.mockResolvedValue(
        buildService([buildSession(sessionId)]),
      );
      await expect(
        service.validateSessionReference(serviceId, sessionId),
      ).resolves.not.toThrow();
    });

    it('should throw NotFoundException when the service does not exist', async () => {
      mockServiceModel.findById.mockResolvedValue(null);
      await expect(
        service.validateSessionReference(serviceId, sessionId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include SERVICE_NOT_FOUND code when service is missing', async () => {
      mockServiceModel.findById.mockResolvedValue(null);
      try {
        await service.validateSessionReference(serviceId, sessionId);
        fail('Expected NotFoundException');
      } catch (e) {
        expect(e.response.code).toBe('SERVICE_NOT_FOUND');
        expect(e.response.message).toEqual(SESSION_ERROR_MESSAGES.SERVICE_NOT_FOUND);
      }
    });

    it('should throw BadRequestException when service has an empty sessions array', async () => {
      mockServiceModel.findById.mockResolvedValue(buildService([]));
      await expect(
        service.validateSessionReference(serviceId, sessionId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when service has no sessions field', async () => {
      mockServiceModel.findById.mockResolvedValue({ _id: new Types.ObjectId(), durationMinutes: 30 });
      await expect(
        service.validateSessionReference(serviceId, sessionId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should include SERVICE_HAS_NO_SESSIONS code for sessionless service', async () => {
      mockServiceModel.findById.mockResolvedValue(buildService([]));
      try {
        await service.validateSessionReference(serviceId, sessionId);
        fail('Expected BadRequestException');
      } catch (e) {
        expect(e.response.code).toBe('SERVICE_HAS_NO_SESSIONS');
        expect(e.response.message).toEqual(SESSION_ERROR_MESSAGES.SERVICE_HAS_NO_SESSIONS);
      }
    });

    it('should throw BadRequestException when sessionId is not in the sessions array', async () => {
      mockServiceModel.findById.mockResolvedValue(
        buildService([buildSession(id(), 'Other Session')]),
      );
      await expect(
        service.validateSessionReference(serviceId, sessionId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should include INVALID_SESSION_ID code and available sessions when sessionId is wrong', async () => {
      const validSession = buildSession(id(), 'Diagnosis', 1);
      mockServiceModel.findById.mockResolvedValue(buildService([validSession]));

      try {
        await service.validateSessionReference(serviceId, sessionId);
        fail('Expected BadRequestException');
      } catch (e) {
        expect(e.response.code).toBe('INVALID_SESSION_ID');
        expect(e.response.message).toEqual(SESSION_ERROR_MESSAGES.INVALID_SESSION_ID);
        expect(e.response.details.sessionId).toBe(sessionId);
        expect(e.response.details.availableSessions).toHaveLength(1);
        expect(e.response.details.availableSessions[0].id).toBe(validSession._id);
      }
    });

    it('should pass when the service has multiple sessions and the correct one is given', async () => {
      const target = buildSession(sessionId, 'Blood Test', 2);
      mockServiceModel.findById.mockResolvedValue(
        buildService([buildSession(id(), 'Diagnosis', 1), target, buildSession(id(), 'Surgery', 3)]),
      );
      await expect(
        service.validateSessionReference(serviceId, sessionId),
      ).resolves.not.toThrow();
    });
  });

  // =========================================================================
  // checkDuplicateSessionBooking
  // =========================================================================

  describe('checkDuplicateSessionBooking', () => {
    const patientId = id();
    const serviceId = id();
    const sessionId = id();

    it('should resolve when no existing appointment is found', async () => {
      mockAppointmentModel.findOne.mockResolvedValue(null);
      await expect(
        service.checkDuplicateSessionBooking(patientId, serviceId, sessionId),
      ).resolves.not.toThrow();
    });

    it('should throw ConflictException when a scheduled appointment exists', async () => {
      mockAppointmentModel.findOne.mockResolvedValue(
        buildAppointment({ sessionId, status: 'scheduled' }),
      );
      await expect(
        service.checkDuplicateSessionBooking(patientId, serviceId, sessionId),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when a confirmed appointment exists', async () => {
      mockAppointmentModel.findOne.mockResolvedValue(
        buildAppointment({ sessionId, status: 'confirmed' }),
      );
      await expect(
        service.checkDuplicateSessionBooking(patientId, serviceId, sessionId),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when an in_progress appointment exists', async () => {
      mockAppointmentModel.findOne.mockResolvedValue(
        buildAppointment({ sessionId, status: 'in_progress' }),
      );
      await expect(
        service.checkDuplicateSessionBooking(patientId, serviceId, sessionId),
      ).rejects.toThrow(ConflictException);
    });

    it('should include DUPLICATE_SESSION_BOOKING code and details in the exception', async () => {
      const existing = buildAppointment({ sessionId, status: 'scheduled' });
      mockAppointmentModel.findOne.mockResolvedValue(existing);

      try {
        await service.checkDuplicateSessionBooking(patientId, serviceId, sessionId);
        fail('Expected ConflictException');
      } catch (e) {
        expect(e.response.code).toBe('DUPLICATE_SESSION_BOOKING');
        expect(e.response.message).toEqual(SESSION_ERROR_MESSAGES.DUPLICATE_SESSION_BOOKING);
        expect(e.response.details.patientId).toBe(patientId);
        expect(e.response.details.sessionId).toBe(sessionId);
        expect(e.response.details.existingAppointmentStatus).toBe('scheduled');
      }
    });

    it('should use $nin filter excluding cancelled and no_show from the query', async () => {
      mockAppointmentModel.findOne.mockResolvedValue(null);
      await service.checkDuplicateSessionBooking(patientId, serviceId, sessionId);

      const query = mockAppointmentModel.findOne.mock.calls[0][0];
      expect(query.status).toEqual({ $nin: ['cancelled', 'no_show'] });
    });

    it('should allow booking when only a cancelled appointment exists (returns null from DB)', async () => {
      // Cancelled appointments are excluded by $nin — DB returns null
      mockAppointmentModel.findOne.mockResolvedValue(null);
      await expect(
        service.checkDuplicateSessionBooking(patientId, serviceId, sessionId),
      ).resolves.not.toThrow();
    });

    it('should allow booking when only a no_show appointment exists (returns null from DB)', async () => {
      mockAppointmentModel.findOne.mockResolvedValue(null);
      await expect(
        service.checkDuplicateSessionBooking(patientId, serviceId, sessionId),
      ).resolves.not.toThrow();
    });

    it('should allow the same patient to book a different session of the same service', async () => {
      // Different sessionId — DB query returns null for the new session
      mockAppointmentModel.findOne.mockResolvedValue(null);
      const differentSessionId = id();
      await expect(
        service.checkDuplicateSessionBooking(patientId, serviceId, differentSessionId),
      ).resolves.not.toThrow();
    });

    it('should allow a different patient to book the same session', async () => {
      // Different patientId — DB query returns null for the new patient
      mockAppointmentModel.findOne.mockResolvedValue(null);
      const differentPatientId = id();
      await expect(
        service.checkDuplicateSessionBooking(differentPatientId, serviceId, sessionId),
      ).resolves.not.toThrow();
    });

    it('should query with the correct sessionId field', async () => {
      mockAppointmentModel.findOne.mockResolvedValue(null);
      await service.checkDuplicateSessionBooking(patientId, serviceId, sessionId);

      const query = mockAppointmentModel.findOne.mock.calls[0][0];
      expect(query.sessionId).toBe(sessionId);
    });
  });

  // =========================================================================
  // checkCompletedSessionRebooking
  // =========================================================================

  describe('checkCompletedSessionRebooking', () => {
    const patientId = id();
    const serviceId = id();
    const sessionId = id();

    it('should resolve when no completed appointment exists', async () => {
      mockAppointmentModel.findOne.mockResolvedValue(null);
      await expect(
        service.checkCompletedSessionRebooking(patientId, serviceId, sessionId),
      ).resolves.not.toThrow();
    });

    it('should throw ConflictException when a completed appointment exists', async () => {
      mockAppointmentModel.findOne.mockResolvedValue(
        buildAppointment({ sessionId, status: 'completed' }),
      );
      await expect(
        service.checkCompletedSessionRebooking(patientId, serviceId, sessionId),
      ).rejects.toThrow(ConflictException);
    });

    it('should include COMPLETED_SESSION_REBOOKING code and details', async () => {
      const completed = buildAppointment({ sessionId, status: 'completed' });
      mockAppointmentModel.findOne.mockResolvedValue(completed);

      try {
        await service.checkCompletedSessionRebooking(patientId, serviceId, sessionId);
        fail('Expected ConflictException');
      } catch (e) {
        expect(e.response.code).toBe('COMPLETED_SESSION_REBOOKING');
        expect(e.response.message).toEqual(SESSION_ERROR_MESSAGES.COMPLETED_SESSION_REBOOKING);
        expect(e.response.details.patientId).toBe(patientId);
        expect(e.response.details.sessionId).toBe(sessionId);
        expect(e.response.details.completedAppointmentId).toBeTruthy();
      }
    });

    it('should query with status = "completed"', async () => {
      mockAppointmentModel.findOne.mockResolvedValue(null);
      await service.checkCompletedSessionRebooking(patientId, serviceId, sessionId);

      const query = mockAppointmentModel.findOne.mock.calls[0][0];
      expect(query.status).toBe('completed');
    });

    it('should allow rebooking when only cancelled appointments exist (DB returns null)', async () => {
      mockAppointmentModel.findOne.mockResolvedValue(null);
      await expect(
        service.checkCompletedSessionRebooking(patientId, serviceId, sessionId),
      ).resolves.not.toThrow();
    });

    it('should allow a different patient to book a session another patient completed', async () => {
      mockAppointmentModel.findOne.mockResolvedValue(null);
      const differentPatientId = id();
      await expect(
        service.checkCompletedSessionRebooking(differentPatientId, serviceId, sessionId),
      ).resolves.not.toThrow();
    });
  });

  // =========================================================================
  // getSessionDuration
  // =========================================================================

  describe('getSessionDuration', () => {
    const makeSession = (duration?: number): ProcessedSession => ({
      _id: id(),
      name: 'Test',
      order: 1,
      duration: duration ?? 30,
    });

    it('should return the session-specific duration when set', () => {
      expect(service.getSessionDuration(makeSession(45), 30)).toBe(45);
    });

    it('should return the service default when session duration falls back', () => {
      // ProcessedSession always has a number, but test the || fallback path
      const session = makeSession(0) as any; // 0 triggers ||
      expect(service.getSessionDuration(session, 30)).toBe(30);
    });

    it('should return the service default duration when session duration matches service', () => {
      expect(service.getSessionDuration(makeSession(30), 30)).toBe(30);
    });

    it('should return 480 for a maximum-length session', () => {
      expect(service.getSessionDuration(makeSession(480), 30)).toBe(480);
    });

    it('should return 5 for a minimum-length session', () => {
      expect(service.getSessionDuration(makeSession(5), 30)).toBe(5);
    });
  });

  // =========================================================================
  // batchBookSessions
  // =========================================================================

  describe('batchBookSessions', () => {
    const patientId = id();
    const doctorId = id();
    const serviceId = id();
    const clinicId = id();
    const createdByUserId = id();

    let mockDbSession: {
      startTransaction: jest.Mock;
      commitTransaction: jest.Mock;
      abortTransaction: jest.Mock;
      endSession: jest.Mock;
    };

    function buildBatchDto(sessionBookings: any[]): BatchBookSessionsDto {
      return { patientId, doctorId, serviceId, clinicId, sessionBookings } as BatchBookSessionsDto;
    }

    function buildBooking(sessionId: string, date = '2024-03-15', time = '09:00') {
      return { sessionId, appointmentDate: new Date(date), appointmentTime: time };
    }

    function buildServiceForBatch(sessions: any[]) {
      return { _id: new Types.ObjectId(), name: 'Treatment', durationMinutes: 30, sessions };
    }

    beforeEach(() => {
      mockDbSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn(),
      };
      mockAppointmentModel.db.startSession.mockResolvedValue(mockDbSession);
      mockAppointmentModel.insertMany.mockResolvedValue([]);

      jest.spyOn(service, 'validateSessionReference').mockResolvedValue(undefined);
      jest.spyOn(service, 'checkDuplicateSessionBooking').mockResolvedValue(undefined);
      jest.spyOn(service, 'checkCompletedSessionRebooking').mockResolvedValue(undefined);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should throw NotFoundException when service does not exist', async () => {
      mockServiceModel.findById.mockResolvedValue(null);
      await expect(
        service.batchBookSessions(buildBatchDto([buildBooking(id())]), createdByUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include SERVICE_NOT_FOUND code when service is missing', async () => {
      mockServiceModel.findById.mockResolvedValue(null);
      try {
        await service.batchBookSessions(buildBatchDto([buildBooking(id())]), createdByUserId);
        fail('Expected NotFoundException');
      } catch (e) {
        expect(e.response.code).toBe('SERVICE_NOT_FOUND');
      }
    });

    it('should throw BadRequestException when service has no sessions', async () => {
      mockServiceModel.findById.mockResolvedValue(buildServiceForBatch([]));
      await expect(
        service.batchBookSessions(buildBatchDto([buildBooking(id())]), createdByUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should include SERVICE_HAS_NO_SESSIONS code when service has no sessions', async () => {
      mockServiceModel.findById.mockResolvedValue(buildServiceForBatch([]));
      try {
        await service.batchBookSessions(buildBatchDto([buildBooking(id())]), createdByUserId);
        fail('Expected BadRequestException');
      } catch (e) {
        expect(e.response.code).toBe('SERVICE_HAS_NO_SESSIONS');
      }
    });

    it('should create all appointments when all bookings are valid', async () => {
      const s1Id = id();
      const s2Id = id();
      const sessions = [buildSession(s1Id, 'Diagnosis', 1, 45), buildSession(s2Id, 'Blood Test', 2, 15)];
      mockServiceModel.findById.mockResolvedValue(buildServiceForBatch(sessions));

      const createdAppts = [
        buildAppointment({ sessionId: s1Id }),
        buildAppointment({ sessionId: s2Id }),
      ];
      mockAppointmentModel.insertMany.mockResolvedValue(createdAppts);

      const result = await service.batchBookSessions(
        buildBatchDto([buildBooking(s1Id), buildBooking(s2Id, '2024-03-22', '10:00')]),
        createdByUserId,
      );

      expect(result.totalRequested).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(result.appointments).toHaveLength(2);
    });

    it('should call validateSessionReference once per booking', async () => {
      const s1Id = id();
      const s2Id = id();
      mockServiceModel.findById.mockResolvedValue(
        buildServiceForBatch([buildSession(s1Id, 'A', 1), buildSession(s2Id, 'B', 2)]),
      );

      await service.batchBookSessions(
        buildBatchDto([buildBooking(s1Id), buildBooking(s2Id)]),
        createdByUserId,
      );

      // validateSessionReference is mocked in beforeEach via jest.spyOn
      expect(service.validateSessionReference).toHaveBeenCalledTimes(2);
      expect(service.validateSessionReference).toHaveBeenCalledWith(serviceId, s1Id);
      expect(service.validateSessionReference).toHaveBeenCalledWith(serviceId, s2Id);
    });

    it('should call validateSessionReference, checkDuplicate, and checkCompleted for each booking', async () => {
      const s1Id = id();
      mockServiceModel.findById.mockResolvedValue(
        buildServiceForBatch([buildSession(s1Id, 'Diagnosis', 1)]),
      );

      const validateSpy = service.validateSessionReference as jest.Mock;
      const duplicateSpy = service.checkDuplicateSessionBooking as jest.Mock;
      const completedSpy = service.checkCompletedSessionRebooking as jest.Mock;

      await service.batchBookSessions(buildBatchDto([buildBooking(s1Id)]), createdByUserId);

      expect(validateSpy).toHaveBeenCalledWith(serviceId, s1Id);
      expect(duplicateSpy).toHaveBeenCalledWith(patientId, serviceId, s1Id);
      expect(completedSpy).toHaveBeenCalledWith(patientId, serviceId, s1Id);
    });

    it('should throw BATCH_BOOKING_FAILED when one session has an invalid sessionId', async () => {
      const s1Id = id();
      mockServiceModel.findById.mockResolvedValue(
        buildServiceForBatch([buildSession(s1Id, 'Diagnosis', 1)]),
      );
      (service.validateSessionReference as jest.Mock).mockRejectedValueOnce(
        new BadRequestException({
          code: 'INVALID_SESSION_ID',
          message: SESSION_ERROR_MESSAGES.INVALID_SESSION_ID,
        }),
      );

      try {
        await service.batchBookSessions(buildBatchDto([buildBooking(id())]), createdByUserId);
        fail('Expected BadRequestException');
      } catch (e) {
        expect(e.response.code).toBe('BATCH_BOOKING_FAILED');
        expect(e.response.message).toEqual(SESSION_ERROR_MESSAGES.BATCH_BOOKING_FAILED);
      }
    });

    it('should throw BATCH_BOOKING_FAILED when a duplicate booking is detected', async () => {
      const s1Id = id();
      mockServiceModel.findById.mockResolvedValue(
        buildServiceForBatch([buildSession(s1Id, 'Diagnosis', 1)]),
      );
      (service.checkDuplicateSessionBooking as jest.Mock).mockRejectedValueOnce(
        new ConflictException({
          code: 'DUPLICATE_SESSION_BOOKING',
          message: SESSION_ERROR_MESSAGES.DUPLICATE_SESSION_BOOKING,
        }),
      );

      await expect(
        service.batchBookSessions(buildBatchDto([buildBooking(s1Id)]), createdByUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BATCH_BOOKING_FAILED when a completed session is rebooked', async () => {
      const s1Id = id();
      mockServiceModel.findById.mockResolvedValue(
        buildServiceForBatch([buildSession(s1Id, 'Diagnosis', 1)]),
      );
      (service.checkCompletedSessionRebooking as jest.Mock).mockRejectedValueOnce(
        new ConflictException({
          code: 'COMPLETED_SESSION_REBOOKING',
          message: SESSION_ERROR_MESSAGES.COMPLETED_SESSION_REBOOKING,
        }),
      );

      await expect(
        service.batchBookSessions(buildBatchDto([buildBooking(s1Id)]), createdByUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should NOT call insertMany when any booking validation fails (atomicity)', async () => {
      const s1Id = id();
      mockServiceModel.findById.mockResolvedValue(
        buildServiceForBatch([buildSession(s1Id, 'Diagnosis', 1)]),
      );
      (service.validateSessionReference as jest.Mock).mockRejectedValueOnce(
        new BadRequestException({ code: 'INVALID_SESSION_ID', message: SESSION_ERROR_MESSAGES.INVALID_SESSION_ID }),
      );

      await expect(
        service.batchBookSessions(buildBatchDto([buildBooking(s1Id)]), createdByUserId),
      ).rejects.toThrow();

      expect(mockAppointmentModel.insertMany).not.toHaveBeenCalled();
    });

    it('should NOT start a transaction when validation fails', async () => {
      const s1Id = id();
      mockServiceModel.findById.mockResolvedValue(
        buildServiceForBatch([buildSession(s1Id, 'Diagnosis', 1)]),
      );
      (service.validateSessionReference as jest.Mock).mockRejectedValueOnce(
        new BadRequestException({ code: 'INVALID_SESSION_ID', message: SESSION_ERROR_MESSAGES.INVALID_SESSION_ID }),
      );

      await expect(
        service.batchBookSessions(buildBatchDto([buildBooking(s1Id)]), createdByUserId),
      ).rejects.toThrow();

      expect(mockAppointmentModel.db.startSession).not.toHaveBeenCalled();
    });

    it('should collect failures from ALL bookings, not just the first', async () => {
      const s1Id = id();
      const s2Id = id();
      const s3Id = id();
      mockServiceModel.findById.mockResolvedValue(
        buildServiceForBatch([
          buildSession(s1Id, 'Diagnosis', 1),
          buildSession(s2Id, 'Blood Test', 2),
          buildSession(s3Id, 'Surgery', 3),
        ]),
      );

      // All three fail
      (service.validateSessionReference as jest.Mock)
        .mockRejectedValueOnce(new BadRequestException({ code: 'INVALID_SESSION_ID', message: SESSION_ERROR_MESSAGES.INVALID_SESSION_ID }))
        .mockRejectedValueOnce(new BadRequestException({ code: 'INVALID_SESSION_ID', message: SESSION_ERROR_MESSAGES.INVALID_SESSION_ID }))
        .mockRejectedValueOnce(new BadRequestException({ code: 'INVALID_SESSION_ID', message: SESSION_ERROR_MESSAGES.INVALID_SESSION_ID }));

      try {
        await service.batchBookSessions(
          buildBatchDto([buildBooking(s1Id), buildBooking(s2Id), buildBooking(s3Id)]),
          createdByUserId,
        );
        fail('Expected BadRequestException');
      } catch (e) {
        expect(e.response.details.failureCount).toBe(3);
        expect(e.response.details.failures).toHaveLength(3);
        expect(e.response.details.totalRequested).toBe(3);
        expect(e.response.details.successCount).toBe(0);
      }
    });

    it('should include per-session error details in BATCH_BOOKING_FAILED', async () => {
      const s1Id = id();
      mockServiceModel.findById.mockResolvedValue(
        buildServiceForBatch([buildSession(s1Id, 'Diagnosis', 1)]),
      );
      (service.validateSessionReference as jest.Mock).mockRejectedValueOnce(
        new BadRequestException({ code: 'INVALID_SESSION_ID', message: SESSION_ERROR_MESSAGES.INVALID_SESSION_ID }),
      );

      try {
        await service.batchBookSessions(
          buildBatchDto([buildBooking(s1Id, '2024-04-01', '14:00')]),
          createdByUserId,
        );
        fail('Expected BadRequestException');
      } catch (e) {
        const failure = e.response.details.failures[0];
        expect(failure.sessionId).toBe(s1Id);
        expect(failure.appointmentTime).toBe('14:00');
        expect(failure.error.code).toBe('INVALID_SESSION_ID');
        expect(failure.error.message).toEqual(SESSION_ERROR_MESSAGES.INVALID_SESSION_ID);
      }
    });

    it('should commit the transaction on successful bulk insert', async () => {
      const s1Id = id();
      mockServiceModel.findById.mockResolvedValue(
        buildServiceForBatch([buildSession(s1Id, 'Diagnosis', 1, 45)]),
      );
      mockAppointmentModel.insertMany.mockResolvedValue([buildAppointment({ sessionId: s1Id })]);

      await service.batchBookSessions(buildBatchDto([buildBooking(s1Id)]), createdByUserId);

      expect(mockDbSession.startTransaction).toHaveBeenCalled();
      expect(mockDbSession.commitTransaction).toHaveBeenCalled();
      expect(mockDbSession.abortTransaction).not.toHaveBeenCalled();
    });

    it('should call endSession in finally block on success', async () => {
      const s1Id = id();
      mockServiceModel.findById.mockResolvedValue(
        buildServiceForBatch([buildSession(s1Id, 'Diagnosis', 1)]),
      );

      await service.batchBookSessions(buildBatchDto([buildBooking(s1Id)]), createdByUserId);

      expect(mockDbSession.endSession).toHaveBeenCalled();
    });

    it('should abort transaction and call endSession when insertMany throws', async () => {
      const s1Id = id();
      mockServiceModel.findById.mockResolvedValue(
        buildServiceForBatch([buildSession(s1Id, 'Diagnosis', 1)]),
      );
      mockAppointmentModel.insertMany.mockRejectedValue(new Error('DB error'));

      await expect(
        service.batchBookSessions(buildBatchDto([buildBooking(s1Id)]), createdByUserId),
      ).rejects.toThrow('DB error');

      expect(mockDbSession.abortTransaction).toHaveBeenCalled();
      expect(mockDbSession.commitTransaction).not.toHaveBeenCalled();
      expect(mockDbSession.endSession).toHaveBeenCalled();
    });

    it('should use session-specific duration when building appointment docs', async () => {
      const s1Id = id();
      mockServiceModel.findById.mockResolvedValue(
        buildServiceForBatch([buildSession(s1Id, 'Diagnosis', 1, 45)]),
      );
      mockAppointmentModel.insertMany.mockResolvedValue([buildAppointment({ sessionId: s1Id })]);

      await service.batchBookSessions(buildBatchDto([buildBooking(s1Id)]), createdByUserId);

      const insertArgs = mockAppointmentModel.insertMany.mock.calls[0][0];
      expect(insertArgs[0].duration).toBe(45);
    });

    it('should fall back to service durationMinutes when session has no explicit duration', async () => {
      const s1Id = id();
      // session without duration
      const sessionNoDuration = { _id: s1Id, name: 'Diagnosis', order: 1 };
      mockServiceModel.findById.mockResolvedValue(
        buildServiceForBatch([sessionNoDuration]),
      );
      mockAppointmentModel.insertMany.mockResolvedValue([buildAppointment({ sessionId: s1Id })]);

      await service.batchBookSessions(buildBatchDto([buildBooking(s1Id)]), createdByUserId);

      const insertArgs = mockAppointmentModel.insertMany.mock.calls[0][0];
      expect(insertArgs[0].duration).toBe(30); // service.durationMinutes
    });

    it('should set status = scheduled on all created appointments', async () => {
      const s1Id = id();
      const s2Id = id();
      mockServiceModel.findById.mockResolvedValue(
        buildServiceForBatch([buildSession(s1Id, 'A', 1), buildSession(s2Id, 'B', 2)]),
      );
      mockAppointmentModel.insertMany.mockResolvedValue([
        buildAppointment({ sessionId: s1Id }),
        buildAppointment({ sessionId: s2Id }),
      ]);

      await service.batchBookSessions(
        buildBatchDto([buildBooking(s1Id), buildBooking(s2Id)]),
        createdByUserId,
      );

      const insertArgs = mockAppointmentModel.insertMany.mock.calls[0][0];
      expect(insertArgs.every((a: any) => a.status === 'scheduled')).toBe(true);
    });

    it('should pass the db session to insertMany', async () => {
      const s1Id = id();
      mockServiceModel.findById.mockResolvedValue(
        buildServiceForBatch([buildSession(s1Id, 'Diagnosis', 1)]),
      );

      await service.batchBookSessions(buildBatchDto([buildBooking(s1Id)]), createdByUserId);

      const insertOptions = mockAppointmentModel.insertMany.mock.calls[0][1];
      expect(insertOptions.session).toBe(mockDbSession);
    });

    it('should partially fail batch: 1 success validation, 1 failure → rejects whole batch', async () => {
      const s1Id = id();
      const s2Id = id();
      mockServiceModel.findById.mockResolvedValue(
        buildServiceForBatch([buildSession(s1Id, 'A', 1), buildSession(s2Id, 'B', 2)]),
      );

      // s2 booking fails
      (service.validateSessionReference as jest.Mock)
        .mockResolvedValueOnce(undefined)        // s1 passes
        .mockRejectedValueOnce(new BadRequestException({ code: 'INVALID_SESSION_ID', message: SESSION_ERROR_MESSAGES.INVALID_SESSION_ID })); // s2 fails

      try {
        await service.batchBookSessions(
          buildBatchDto([buildBooking(s1Id), buildBooking(s2Id)]),
          createdByUserId,
        );
        fail('Expected BadRequestException');
      } catch (e) {
        expect(e.response.code).toBe('BATCH_BOOKING_FAILED');
        expect(e.response.details.failureCount).toBe(1);
        expect(e.response.details.failures[0].sessionId).toBe(s2Id);
      }

      expect(mockAppointmentModel.insertMany).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // getSessionProgress
  // =========================================================================

  describe('getSessionProgress', () => {
    const patientId = id();
    const serviceId = id();

    function buildServiceWithSessions(sessions: any[]) {
      return {
        _id: new Types.ObjectId(),
        name: 'Multi-Step Treatment',
        durationMinutes: 30,
        sessions,
      };
    }

    function buildApptForSession(
      sessionId: string,
      status: string,
      overrides: Record<string, any> = {},
    ) {
      return buildAppointment({
        sessionId,
        status,
        appointmentDate: new Date('2024-03-15'),
        appointmentTime: '10:00',
        ...overrides,
      });
    }

    it('should throw NotFoundException when service is not found', async () => {
      mockServiceModel.findById.mockResolvedValue(null);
      await expect(
        service.getSessionProgress(patientId, serviceId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include SERVICE_NOT_FOUND code when service is missing', async () => {
      mockServiceModel.findById.mockResolvedValue(null);
      try {
        await service.getSessionProgress(patientId, serviceId);
        fail('Expected NotFoundException');
      } catch (e) {
        expect(e.response.code).toBe('SERVICE_NOT_FOUND');
        expect(e.response.message).toEqual(SESSION_ERROR_MESSAGES.SERVICE_NOT_FOUND);
      }
    });

    it('should throw BadRequestException when service has no sessions', async () => {
      mockServiceModel.findById.mockResolvedValue(buildServiceWithSessions([]));
      await expect(
        service.getSessionProgress(patientId, serviceId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should include SERVICE_HAS_NO_SESSIONS code when service has empty sessions', async () => {
      mockServiceModel.findById.mockResolvedValue(buildServiceWithSessions([]));
      try {
        await service.getSessionProgress(patientId, serviceId);
        fail('Expected BadRequestException');
      } catch (e) {
        expect(e.response.code).toBe('SERVICE_HAS_NO_SESSIONS');
        expect(e.response.message).toEqual(SESSION_ERROR_MESSAGES.SERVICE_HAS_NO_SESSIONS);
      }
    });

    it('should return 0% completion when no appointments exist', async () => {
      const s1 = buildSession(id(), 'Diagnosis', 1);
      const s2 = buildSession(id(), 'Treatment', 2);
      mockServiceModel.findById.mockResolvedValue(buildServiceWithSessions([s1, s2]));
      mockAppointmentModel.find.mockResolvedValue([]);

      const result: SessionProgressDto = await service.getSessionProgress(patientId, serviceId);

      expect(result.completedSessions).toBe(0);
      expect(result.totalSessions).toBe(2);
      expect(result.completionPercentage).toBe(0);
      expect(result.sessions.every((s) => s.status === 'not_booked')).toBe(true);
      expect(result.sessions.every((s) => s.isCompleted === false)).toBe(true);
    });

    it('should return 100% completion when all sessions are completed', async () => {
      const s1Id = id();
      const s2Id = id();
      const s1 = buildSession(s1Id, 'Diagnosis', 1);
      const s2 = buildSession(s2Id, 'Treatment', 2);
      mockServiceModel.findById.mockResolvedValue(buildServiceWithSessions([s1, s2]));
      mockAppointmentModel.find.mockResolvedValue([
        buildApptForSession(s1Id, 'completed'),
        buildApptForSession(s2Id, 'completed'),
      ]);

      const result = await service.getSessionProgress(patientId, serviceId);

      expect(result.completedSessions).toBe(2);
      expect(result.totalSessions).toBe(2);
      expect(result.completionPercentage).toBe(100);
      expect(result.sessions.every((s) => s.isCompleted)).toBe(true);
    });

    it('should return 50% completion when 1 of 2 sessions is completed', async () => {
      const s1Id = id();
      const s2Id = id();
      const s1 = buildSession(s1Id, 'Diagnosis', 1);
      const s2 = buildSession(s2Id, 'Treatment', 2);
      mockServiceModel.findById.mockResolvedValue(buildServiceWithSessions([s1, s2]));
      mockAppointmentModel.find.mockResolvedValue([
        buildApptForSession(s1Id, 'completed'),
        buildApptForSession(s2Id, 'scheduled'),
      ]);

      const result = await service.getSessionProgress(patientId, serviceId);

      expect(result.completedSessions).toBe(1);
      expect(result.completionPercentage).toBe(50);
    });

    it('should return 25% completion when 1 of 4 sessions is completed', async () => {
      const ids = [id(), id(), id(), id()];
      const sessions = ids.map((sid, i) => buildSession(sid, `Session ${i + 1}`, i + 1));
      mockServiceModel.findById.mockResolvedValue(buildServiceWithSessions(sessions));
      mockAppointmentModel.find.mockResolvedValue([
        buildApptForSession(ids[0], 'completed'),
      ]);

      const result = await service.getSessionProgress(patientId, serviceId);

      expect(result.completedSessions).toBe(1);
      expect(result.totalSessions).toBe(4);
      expect(result.completionPercentage).toBe(25);
    });

    it('should mark unbooked sessions as not_booked with isCompleted=false', async () => {
      const s1Id = id();
      const s2Id = id();
      const s1 = buildSession(s1Id, 'Diagnosis', 1);
      const s2 = buildSession(s2Id, 'Treatment', 2);
      mockServiceModel.findById.mockResolvedValue(buildServiceWithSessions([s1, s2]));
      mockAppointmentModel.find.mockResolvedValue([
        buildApptForSession(s1Id, 'completed'),
      ]);

      const result = await service.getSessionProgress(patientId, serviceId);

      const unbooked = result.sessions.find((s) => s.sessionId === s2Id);
      expect(unbooked!.status).toBe('not_booked');
      expect(unbooked!.isCompleted).toBe(false);
      expect(unbooked!.appointmentId).toBeUndefined();
    });

    it('should not count cancelled appointment as completed', async () => {
      const s1Id = id();
      const s1 = buildSession(s1Id, 'Diagnosis', 1);
      mockServiceModel.findById.mockResolvedValue(buildServiceWithSessions([s1]));
      mockAppointmentModel.find.mockResolvedValue([
        buildApptForSession(s1Id, 'cancelled'),
      ]);

      const result = await service.getSessionProgress(patientId, serviceId);

      expect(result.completedSessions).toBe(0);
      expect(result.completionPercentage).toBe(0);
      expect(result.sessions[0].isCompleted).toBe(false);
      expect(result.sessions[0].status).toBe('cancelled');
    });

    it('should not count no_show appointment as completed', async () => {
      const s1Id = id();
      const s1 = buildSession(s1Id, 'Diagnosis', 1);
      mockServiceModel.findById.mockResolvedValue(buildServiceWithSessions([s1]));
      mockAppointmentModel.find.mockResolvedValue([
        buildApptForSession(s1Id, 'no_show'),
      ]);

      const result = await service.getSessionProgress(patientId, serviceId);

      expect(result.completedSessions).toBe(0);
      expect(result.completionPercentage).toBe(0);
      expect(result.sessions[0].isCompleted).toBe(false);
      expect(result.sessions[0].status).toBe('no_show');
    });

    it('should order sessions by order field ascending regardless of definition order', async () => {
      const s1Id = id();
      const s2Id = id();
      const s3Id = id();
      // Define sessions out of order
      const sessions = [
        buildSession(s3Id, 'Surgery', 3),
        buildSession(s1Id, 'Diagnosis', 1),
        buildSession(s2Id, 'Blood Test', 2),
      ];
      mockServiceModel.findById.mockResolvedValue(buildServiceWithSessions(sessions));
      mockAppointmentModel.find.mockResolvedValue([]);

      const result = await service.getSessionProgress(patientId, serviceId);

      expect(result.sessions[0].sessionOrder).toBe(1);
      expect(result.sessions[1].sessionOrder).toBe(2);
      expect(result.sessions[2].sessionOrder).toBe(3);
      expect(result.sessions[0].sessionName).toBe('Diagnosis');
      expect(result.sessions[1].sessionName).toBe('Blood Test');
      expect(result.sessions[2].sessionName).toBe('Surgery');
    });

    it('should populate appointmentId and dates when session is booked', async () => {
      const s1Id = id();
      const s1 = buildSession(s1Id, 'Diagnosis', 1);
      const appt = buildApptForSession(s1Id, 'scheduled', {
        appointmentDate: new Date('2024-04-01'),
        appointmentTime: '09:00',
      });
      mockServiceModel.findById.mockResolvedValue(buildServiceWithSessions([s1]));
      mockAppointmentModel.find.mockResolvedValue([appt]);

      const result = await service.getSessionProgress(patientId, serviceId);

      const item = result.sessions[0];
      expect(item.appointmentId).toBeTruthy();
      expect(item.appointmentDate).toEqual(new Date('2024-04-01'));
      expect(item.appointmentTime).toBe('09:00');
      expect(item.status).toBe('scheduled');
    });

    it('should include patientId, serviceId, and serviceName in response', async () => {
      const s1 = buildSession(id(), 'Diagnosis', 1);
      mockServiceModel.findById.mockResolvedValue(buildServiceWithSessions([s1]));
      mockAppointmentModel.find.mockResolvedValue([]);

      const result = await service.getSessionProgress(patientId, serviceId);

      expect(result.patientId).toBe(patientId);
      expect(result.serviceId).toBe(serviceId);
      expect(result.serviceName).toBe('Multi-Step Treatment');
    });

    it('should prefer completed over scheduled when patient has two appointments for same session', async () => {
      const s1Id = id();
      const s1 = buildSession(s1Id, 'Diagnosis', 1);
      const completedAppt = buildApptForSession(s1Id, 'completed');
      const scheduledAppt = buildApptForSession(s1Id, 'scheduled');
      mockServiceModel.findById.mockResolvedValue(buildServiceWithSessions([s1]));
      mockAppointmentModel.find.mockResolvedValue([scheduledAppt, completedAppt]);

      const result = await service.getSessionProgress(patientId, serviceId);

      expect(result.sessions[0].status).toBe('completed');
      expect(result.sessions[0].isCompleted).toBe(true);
    });

    it('should correctly round completion percentage to nearest integer', async () => {
      // 1 of 3 = 33.33... → rounds to 33
      const ids = [id(), id(), id()];
      const sessions = ids.map((sid, i) => buildSession(sid, `Session ${i + 1}`, i + 1));
      mockServiceModel.findById.mockResolvedValue(buildServiceWithSessions(sessions));
      mockAppointmentModel.find.mockResolvedValue([
        buildApptForSession(ids[0], 'completed'),
      ]);

      const result = await service.getSessionProgress(patientId, serviceId);

      expect(result.completionPercentage).toBe(33);
    });
  });

  // =========================================================================
  // populateSessionInfo
  // =========================================================================

  describe('populateSessionInfo', () => {
    it('should return appointment without sessionInfo when appointment has no sessionId', async () => {
      const appt = buildAppointment({ sessionId: undefined }) as any;
      const svc = buildService([buildSession(id())]) as any;
      const result = await service.populateSessionInfo(appt, svc);
      expect(result.appointment).toBe(appt);
      expect(result.sessionInfo).toBeUndefined();
    });

    it('should return appointment without sessionInfo when sessionId is not found in service', async () => {
      const appt = buildAppointment({ sessionId: 'ghost-id' }) as any;
      const svc = buildService([buildSession(id(), 'Other')]) as any;
      const result = await service.populateSessionInfo(appt, svc);
      expect(result.sessionInfo).toBeUndefined();
    });

    it('should populate sessionInfo with correct fields when sessionId matches', async () => {
      const sessionId = id();
      const appt = buildAppointment({ sessionId }) as any;
      const session = buildSession(sessionId, 'Diagnosis', 1, 45);
      const svc = buildService([session]) as any;

      const result = await service.populateSessionInfo(appt, svc);
      expect(result.sessionInfo).toBeDefined();
      expect(result.sessionInfo!.sessionId).toBe(sessionId);
      expect(result.sessionInfo!.name).toBe('Diagnosis');
      expect(result.sessionInfo!.duration).toBe(45);
      expect(result.sessionInfo!.order).toBe(1);
    });

    it('should inherit service durationMinutes when session has no explicit duration', async () => {
      const sessionId = id();
      const appt = buildAppointment({ sessionId }) as any;
      const session = { _id: sessionId, name: 'Follow-up', order: 4 }; // no duration
      const svc = { ...buildService([session]), durationMinutes: 30 } as any;

      const result = await service.populateSessionInfo(appt, svc);
      expect(result.sessionInfo!.duration).toBe(30);
    });

    it('should return the original appointment reference unchanged', async () => {
      const appt = buildAppointment({ sessionId: undefined }) as any;
      const svc = buildService([]) as any;
      const result = await service.populateSessionInfo(appt, svc);
      expect(result.appointment).toBe(appt);
    });

    it('should find the correct session among multiple sessions in the service', async () => {
      const targetId = id();
      const appt = buildAppointment({ sessionId: targetId }) as any;
      const sessions = [
        buildSession(id(), 'Diagnosis', 1, 30),
        buildSession(targetId, 'Blood Test', 2, 15),
        buildSession(id(), 'Surgery', 3, 120),
      ];
      const svc = buildService(sessions) as any;

      const result = await service.populateSessionInfo(appt, svc);
      expect(result.sessionInfo!.name).toBe('Blood Test');
      expect(result.sessionInfo!.duration).toBe(15);
      expect(result.sessionInfo!.order).toBe(2);
    });
  });
});
