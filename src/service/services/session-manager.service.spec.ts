import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { SessionManagerService } from './session-manager.service';
import { SessionValidationService } from '../../appointment/services/session-validation.service';
import { ServiceSessionDto } from '../dto/service-session.dto';
import { ProcessedSession } from '../interfaces/processed-session.interface';
import { SESSION_ERROR_MESSAGES } from '../../appointment/constants/session-error-messages.constant';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildDto(
  order: number,
  name?: string,
  duration?: number,
): ServiceSessionDto {
  const dto = new ServiceSessionDto();
  dto.order = order;
  if (name !== undefined) dto.name = name;
  if (duration !== undefined) dto.duration = duration;
  return dto;
}

function buildProcessed(
  order: number,
  name: string,
  duration: number,
  id?: string,
): ProcessedSession {
  return {
    _id: id ?? new Types.ObjectId().toString(),
    name,
    duration,
    order,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('SessionManagerService', () => {
  let service: SessionManagerService;
  let sessionValidationService: SessionValidationService;
  let mockAppointmentModel: {
    findOne: jest.Mock;
  };

  beforeEach(async () => {
    mockAppointmentModel = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionManagerService,
        SessionValidationService, // real service — pure logic, no DB
        {
          provide: getModelToken('Appointment'),
          useValue: mockAppointmentModel,
        },
      ],
    }).compile();

    service = module.get<SessionManagerService>(SessionManagerService);
    sessionValidationService = module.get<SessionValidationService>(SessionValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // autoGenerateSessionNames
  // =========================================================================

  describe('autoGenerateSessionNames', () => {
    it('should return the provided name when name is set', () => {
      const result = service.autoGenerateSessionNames([buildDto(1, 'Diagnosis')]);
      expect(result[0].name).toBe('Diagnosis');
    });

    it('should generate "Session {order}" when name is undefined', () => {
      const result = service.autoGenerateSessionNames([buildDto(3)]);
      expect(result[0].name).toBe('Session 3');
    });

    it('should generate names for all unnamed sessions', () => {
      const result = service.autoGenerateSessionNames([buildDto(1), buildDto(2), buildDto(4)]);
      expect(result[0].name).toBe('Session 1');
      expect(result[1].name).toBe('Session 2');
      expect(result[2].name).toBe('Session 4');
    });

    it('should preserve named and generate for unnamed in a mixed array', () => {
      const sessions = [
        buildDto(1, 'Diagnosis'),
        buildDto(2),            // unnamed → "Session 2"
        buildDto(3, 'Surgery'),
        buildDto(4),            // unnamed → "Session 4"
      ];
      const result = service.autoGenerateSessionNames(sessions);
      expect(result[0].name).toBe('Diagnosis');
      expect(result[1].name).toBe('Session 2');
      expect(result[2].name).toBe('Surgery');
      expect(result[3].name).toBe('Session 4');
    });

    it('should not mutate the original session objects', () => {
      const original = buildDto(1);
      service.autoGenerateSessionNames([original]);
      expect(original.name).toBeUndefined();
    });

    it('should return an empty array for empty input', () => {
      expect(service.autoGenerateSessionNames([])).toEqual([]);
    });
  });

  // =========================================================================
  // normalizeSessions
  // =========================================================================

  describe('normalizeSessions', () => {
    const DEFAULT_DURATION = 30;

    it('should assign a non-empty _id string to every session', () => {
      const result = service.normalizeSessions([buildDto(1, 'Test', 60)], DEFAULT_DURATION);
      expect(result[0]._id).toBeTruthy();
      expect(typeof result[0]._id).toBe('string');
    });

    it('should generate unique _id values for each session', () => {
      const result = service.normalizeSessions(
        [buildDto(1, 'A', 30), buildDto(2, 'B', 30), buildDto(3, 'C', 30)],
        DEFAULT_DURATION,
      );
      const ids = result.map((s) => s._id);
      expect(new Set(ids).size).toBe(3);
    });

    it('should use the session-specific duration when provided', () => {
      const result = service.normalizeSessions([buildDto(1, 'Surgery', 120)], DEFAULT_DURATION);
      expect(result[0].duration).toBe(120);
    });

    it('should inherit serviceDefaultDuration when session duration is undefined', () => {
      const result = service.normalizeSessions([buildDto(1, 'Consult')], DEFAULT_DURATION);
      expect(result[0].duration).toBe(DEFAULT_DURATION);
    });

    it('should apply duration inheritance independently per session', () => {
      const sessions = [
        buildDto(1, 'A', 45),  // explicit
        buildDto(2, 'B'),       // inherits
        buildDto(3, 'C', 90),  // explicit
      ];
      const result = service.normalizeSessions(sessions, DEFAULT_DURATION);
      expect(result[0].duration).toBe(45);
      expect(result[1].duration).toBe(DEFAULT_DURATION);
      expect(result[2].duration).toBe(90);
    });

    it('should sort sessions by order ascending', () => {
      const sessions = [buildDto(3, 'C', 30), buildDto(1, 'A', 30), buildDto(2, 'B', 30)];
      const result = service.normalizeSessions(sessions, DEFAULT_DURATION);
      expect(result.map((s) => s.order)).toEqual([1, 2, 3]);
    });

    it('should sort when sessions are provided in reverse order', () => {
      const sessions = [buildDto(5, 'E'), buildDto(4, 'D'), buildDto(3, 'C'), buildDto(2, 'B'), buildDto(1, 'A')];
      const result = service.normalizeSessions(sessions, DEFAULT_DURATION);
      expect(result.map((s) => s.order)).toEqual([1, 2, 3, 4, 5]);
    });

    it('should preserve the session name', () => {
      const result = service.normalizeSessions([buildDto(1, 'Diagnosis', 30)], DEFAULT_DURATION);
      expect(result[0].name).toBe('Diagnosis');
    });

    it('should return an empty array for empty input', () => {
      expect(service.normalizeSessions([], DEFAULT_DURATION)).toEqual([]);
    });
  });

  // =========================================================================
  // validateAndProcessSessions
  // =========================================================================

  describe('validateAndProcessSessions', () => {
    const DEFAULT_DURATION = 30;

    it('should process valid sessions and return ProcessedSession array', () => {
      const sessions = [
        buildDto(1, 'Diagnosis', 30),
        buildDto(2, 'Blood Test', 15),
        buildDto(3, 'Surgery', 120),
      ];
      const result = service.validateAndProcessSessions(sessions, DEFAULT_DURATION);
      expect(result).toHaveLength(3);
      result.forEach((s) => {
        expect(s._id).toBeTruthy();
        expect(s.name).toBeTruthy();
        expect(typeof s.duration).toBe('number');
        expect(s.order).toBeGreaterThan(0);
      });
    });

    it('should auto-generate names for unnamed sessions', () => {
      const sessions = [buildDto(1), buildDto(2, 'Blood Test')];
      const result = service.validateAndProcessSessions(sessions, DEFAULT_DURATION);
      const ordered = result.sort((a, b) => a.order - b.order);
      expect(ordered[0].name).toBe('Session 1');
      expect(ordered[1].name).toBe('Blood Test');
    });

    it('should apply duration inheritance for sessions without duration', () => {
      const sessions = [buildDto(1), buildDto(2, 'Test', 60)];
      const result = service.validateAndProcessSessions(sessions, DEFAULT_DURATION);
      const ordered = result.sort((a, b) => a.order - b.order);
      expect(ordered[0].duration).toBe(DEFAULT_DURATION);
      expect(ordered[1].duration).toBe(60);
    });

    it('should return sessions sorted by order', () => {
      const sessions = [buildDto(3, 'C'), buildDto(1, 'A'), buildDto(2, 'B')];
      const result = service.validateAndProcessSessions(sessions, DEFAULT_DURATION);
      expect(result.map((s) => s.order)).toEqual([1, 2, 3]);
    });

    it('should process an empty sessions array without error', () => {
      expect(() =>
        service.validateAndProcessSessions([], DEFAULT_DURATION),
      ).not.toThrow();
    });

    it('should throw BadRequestException for duplicate order numbers', () => {
      const sessions = [buildDto(1, 'A'), buildDto(1, 'B')];
      expect(() =>
        service.validateAndProcessSessions(sessions, DEFAULT_DURATION),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException when more than 50 sessions are provided', () => {
      const sessions = Array.from({ length: 51 }, (_, i) => buildDto(i + 1, `S${i + 1}`));
      expect(() =>
        service.validateAndProcessSessions(sessions, DEFAULT_DURATION),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for a session with an empty name', () => {
      const sessions = [buildDto(1, '')];
      expect(() =>
        service.validateAndProcessSessions(sessions, DEFAULT_DURATION),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for duration outside allowed range', () => {
      const sessions = [buildDto(1, 'Test', 4)];
      expect(() =>
        service.validateAndProcessSessions(sessions, DEFAULT_DURATION),
      ).toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // validateSessionRemoval
  // =========================================================================

  describe('validateSessionRemoval', () => {
    const serviceId = new Types.ObjectId().toString();

    it('should not throw when sessionsToRemove is empty', async () => {
      await expect(
        service.validateSessionRemoval(serviceId, []),
      ).resolves.not.toThrow();
      expect(mockAppointmentModel.findOne).not.toHaveBeenCalled();
    });

    it('should not throw when removed sessions have no active appointments', async () => {
      mockAppointmentModel.findOne.mockResolvedValue(null);
      await expect(
        service.validateSessionRemoval(serviceId, ['session-1']),
      ).resolves.not.toThrow();
    });

    it('should throw ConflictException when a scheduled appointment exists', async () => {
      const sessionId = 'session-1';
      mockAppointmentModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(),
        sessionId,
        status: 'scheduled',
      });

      await expect(
        service.validateSessionRemoval(serviceId, [sessionId]),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when a confirmed appointment exists', async () => {
      mockAppointmentModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(),
        sessionId: 'session-1',
        status: 'confirmed',
      });

      await expect(
        service.validateSessionRemoval(serviceId, ['session-1']),
      ).rejects.toThrow(ConflictException);
    });

    it('should include the correct error code in the exception', async () => {
      const sessionId = 'session-abc';
      mockAppointmentModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(),
        sessionId,
        status: 'scheduled',
      });

      try {
        await service.validateSessionRemoval(serviceId, [sessionId]);
        fail('Expected ConflictException');
      } catch (e) {
        expect(e).toBeInstanceOf(ConflictException);
        expect(e.response.code).toBe('CANNOT_REMOVE_SESSION_WITH_ACTIVE_APPOINTMENTS');
        expect(e.response.message).toEqual(
          SESSION_ERROR_MESSAGES.CANNOT_REMOVE_SESSION_WITH_ACTIVE_APPOINTMENTS,
        );
      }
    });

    it('should not throw when only completed appointments exist (null returned)', async () => {
      // completed/cancelled appointments are excluded by the query filter — findOne returns null
      mockAppointmentModel.findOne.mockResolvedValue(null);
      await expect(
        service.validateSessionRemoval(serviceId, ['session-completed']),
      ).resolves.not.toThrow();
    });

    it('should query with the correct status filter', async () => {
      mockAppointmentModel.findOne.mockResolvedValue(null);
      const sessionsToRemove = ['s1', 's2'];
      await service.validateSessionRemoval(serviceId, sessionsToRemove);

      const callArg = mockAppointmentModel.findOne.mock.calls[0][0];
      expect(callArg.status).toEqual({ $in: ['scheduled', 'confirmed'] });
      expect(callArg.sessionId).toEqual({ $in: sessionsToRemove });
    });
  });

  // =========================================================================
  // findSessionById
  // =========================================================================

  describe('findSessionById', () => {
    const sessions: ProcessedSession[] = [
      buildProcessed(1, 'Diagnosis', 30, 'id-1'),
      buildProcessed(2, 'Blood Test', 15, 'id-2'),
      buildProcessed(3, 'Surgery', 120, 'id-3'),
    ];

    it('should return the session when the ID exists', () => {
      const result = service.findSessionById(sessions, 'id-2');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Blood Test');
      expect(result!.order).toBe(2);
    });

    it('should return the first session when searching for its ID', () => {
      expect(service.findSessionById(sessions, 'id-1')).toEqual(sessions[0]);
    });

    it('should return the last session when searching for its ID', () => {
      expect(service.findSessionById(sessions, 'id-3')).toEqual(sessions[2]);
    });

    it('should return null when the ID does not exist', () => {
      expect(service.findSessionById(sessions, 'non-existent')).toBeNull();
    });

    it('should return null for an empty sessions array', () => {
      expect(service.findSessionById([], 'id-1')).toBeNull();
    });

    it('should return null when session ID is an empty string', () => {
      expect(service.findSessionById(sessions, '')).toBeNull();
    });

    it('should perform an exact string match (no partial match)', () => {
      expect(service.findSessionById(sessions, 'id')).toBeNull();
    });
  });
});
