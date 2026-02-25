import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SessionValidationService } from './session-validation.service';
import { ServiceSessionDto } from '../../service/dto/service-session.dto';
import { SESSION_ERROR_MESSAGES } from '../constants/session-error-messages.constant';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function buildSession(
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SessionValidationService', () => {
  let service: SessionValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionValidationService],
    }).compile();

    service = module.get<SessionValidationService>(SessionValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // validateSessionStructure
  // =========================================================================

  describe('validateSessionStructure', () => {
    it('should pass for a valid session array with all fields', () => {
      const sessions = [
        buildSession(1, 'Diagnosis', 30),
        buildSession(2, 'Blood Test', 15),
        buildSession(3, 'Surgery', 120),
      ];
      expect(() => service.validateSessionStructure(sessions)).not.toThrow();
    });

    it('should pass for sessions without optional name and duration', () => {
      const sessions = [buildSession(1), buildSession(2), buildSession(3)];
      expect(() => service.validateSessionStructure(sessions)).not.toThrow();
    });

    it('should pass for an empty sessions array', () => {
      expect(() => service.validateSessionStructure([])).not.toThrow();
    });

    it('should pass for a single valid session', () => {
      expect(() =>
        service.validateSessionStructure([buildSession(1, 'Initial Consult', 60)]),
      ).not.toThrow();
    });

    // --- name validation ---

    it('should throw EMPTY_SESSION_NAME when name is an empty string', () => {
      const sessions = [buildSession(1, '')];
      expect(() => service.validateSessionStructure(sessions)).toThrow(
        BadRequestException,
      );
    });

    it('should throw EMPTY_SESSION_NAME when name is only whitespace', () => {
      const sessions = [buildSession(1, '   ')];
      try {
        service.validateSessionStructure(sessions);
        fail('Expected BadRequestException to be thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(e.response.code).toBe('EMPTY_SESSION_NAME');
        expect(e.response.message).toEqual(SESSION_ERROR_MESSAGES.EMPTY_SESSION_NAME);
        expect(e.response.details.sessionOrder).toBe(1);
      }
    });

    it('should not throw when name is undefined (auto-generated later)', () => {
      const sessions = [buildSession(1)];
      expect(() => service.validateSessionStructure(sessions)).not.toThrow();
    });

    // --- order validation ---

    it('should throw INVALID_SESSION_ORDER when order is 0', () => {
      try {
        service.validateSessionStructure([buildSession(0)]);
        fail('Expected BadRequestException');
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(e.response.code).toBe('INVALID_SESSION_ORDER');
      }
    });

    it('should throw INVALID_SESSION_ORDER when order is negative', () => {
      expect(() =>
        service.validateSessionStructure([buildSession(-1)]),
      ).toThrow(BadRequestException);
    });

    it('should throw INVALID_SESSION_ORDER when order is a float', () => {
      const session = { order: 1.5 } as ServiceSessionDto;
      expect(() => service.validateSessionStructure([session])).toThrow(
        BadRequestException,
      );
    });

    // --- duration validation within structure ---

    it('should throw INVALID_SESSION_DURATION when duration is below minimum', () => {
      const sessions = [buildSession(1, 'Test', 4)];
      expect(() => service.validateSessionStructure(sessions)).toThrow(
        BadRequestException,
      );
    });

    it('should throw INVALID_SESSION_DURATION when duration is above maximum', () => {
      const sessions = [buildSession(1, 'Test', 481)];
      expect(() => service.validateSessionStructure(sessions)).toThrow(
        BadRequestException,
      );
    });

    it('should pass when duration is at the lower boundary (5)', () => {
      expect(() =>
        service.validateSessionStructure([buildSession(1, 'Test', 5)]),
      ).not.toThrow();
    });

    it('should pass when duration is at the upper boundary (480)', () => {
      expect(() =>
        service.validateSessionStructure([buildSession(1, 'Test', 480)]),
      ).not.toThrow();
    });

    // --- duplicate order validation ---

    it('should throw DUPLICATE_SESSION_ORDER for two sessions with the same order', () => {
      const sessions = [buildSession(1, 'A'), buildSession(1, 'B')];
      expect(() => service.validateSessionStructure(sessions)).toThrow(
        BadRequestException,
      );
    });

    it('should throw with correct code and duplicate values in details', () => {
      const sessions = [
        buildSession(1),
        buildSession(2),
        buildSession(1),
      ];
      try {
        service.validateSessionStructure(sessions);
        fail('Expected BadRequestException');
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(e.response.code).toBe('DUPLICATE_SESSION_ORDER');
        expect(e.response.message).toEqual(SESSION_ERROR_MESSAGES.DUPLICATE_SESSION_ORDER);
        expect(e.response.details.duplicateOrders).toContain(1);
      }
    });

    // --- max count validation ---

    it('should throw MAX_SESSIONS_EXCEEDED for 51 sessions', () => {
      const sessions = Array.from({ length: 51 }, (_, i) => buildSession(i + 1));
      expect(() => service.validateSessionStructure(sessions)).toThrow(
        BadRequestException,
      );
    });

    it('should throw with MAX_SESSIONS_EXCEEDED code for 51 sessions', () => {
      const sessions = Array.from({ length: 51 }, (_, i) => buildSession(i + 1));
      try {
        service.validateSessionStructure(sessions);
        fail('Expected BadRequestException');
      } catch (e) {
        expect(e.response.code).toBe('MAX_SESSIONS_EXCEEDED');
      }
    });

    it('should pass for exactly 50 sessions (upper boundary)', () => {
      const sessions = Array.from({ length: 50 }, (_, i) => buildSession(i + 1));
      expect(() => service.validateSessionStructure(sessions)).not.toThrow();
    });

    // --- max count is checked before per-session validation ---

    it('should throw MAX_SESSIONS_EXCEEDED before checking individual session errors', () => {
      // 51 sessions where several also have invalid orders — max count should fire first
      const sessions = Array.from({ length: 51 }, (_, i) => ({
        order: 0,
      } as ServiceSessionDto));
      try {
        service.validateSessionStructure(sessions);
        fail('Expected BadRequestException');
      } catch (e) {
        expect(e.response.code).toBe('MAX_SESSIONS_EXCEEDED');
      }
    });
  });

  // =========================================================================
  // validateSessionDuration
  // =========================================================================

  describe('validateSessionDuration', () => {
    it('should pass for the lower boundary (5 minutes)', () => {
      expect(() => service.validateSessionDuration(5)).not.toThrow();
    });

    it('should pass for the upper boundary (480 minutes)', () => {
      expect(() => service.validateSessionDuration(480)).not.toThrow();
    });

    it('should pass for a typical duration within range', () => {
      expect(() => service.validateSessionDuration(60)).not.toThrow();
    });

    it('should throw for duration below minimum (4 minutes)', () => {
      expect(() => service.validateSessionDuration(4)).toThrow(BadRequestException);
    });

    it('should throw for duration above maximum (481 minutes)', () => {
      expect(() => service.validateSessionDuration(481)).toThrow(BadRequestException);
    });

    it('should throw for duration of 0', () => {
      expect(() => service.validateSessionDuration(0)).toThrow(BadRequestException);
    });

    it('should throw for a negative duration', () => {
      expect(() => service.validateSessionDuration(-10)).toThrow(BadRequestException);
    });

    it('should include correct code, message and details in the exception', () => {
      try {
        service.validateSessionDuration(3);
        fail('Expected BadRequestException');
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(e.response.code).toBe('INVALID_SESSION_DURATION');
        expect(e.response.message).toEqual(SESSION_ERROR_MESSAGES.INVALID_SESSION_DURATION);
        expect(e.response.details).toEqual({ duration: 3, min: 5, max: 480 });
      }
    });
  });

  // =========================================================================
  // validateUniqueOrderNumbers
  // =========================================================================

  describe('validateUniqueOrderNumbers', () => {
    it('should pass for all unique order numbers', () => {
      const sessions = [buildSession(1), buildSession(2), buildSession(3)];
      expect(() => service.validateUniqueOrderNumbers(sessions)).not.toThrow();
    });

    it('should pass for an empty array', () => {
      expect(() => service.validateUniqueOrderNumbers([])).not.toThrow();
    });

    it('should pass for a single session', () => {
      expect(() =>
        service.validateUniqueOrderNumbers([buildSession(5)]),
      ).not.toThrow();
    });

    it('should throw for two sessions with the same order number', () => {
      const sessions = [buildSession(1), buildSession(1)];
      expect(() => service.validateUniqueOrderNumbers(sessions)).toThrow(
        BadRequestException,
      );
    });

    it('should include the duplicated order value in error details', () => {
      const sessions = [buildSession(2), buildSession(3), buildSession(2)];
      try {
        service.validateUniqueOrderNumbers(sessions);
        fail('Expected BadRequestException');
      } catch (e) {
        expect(e.response.details.duplicateOrders).toContain(2);
      }
    });

    it('should detect multiple sets of duplicates and include all in details', () => {
      const sessions = [
        buildSession(1),
        buildSession(1),
        buildSession(2),
        buildSession(2),
      ];
      try {
        service.validateUniqueOrderNumbers(sessions);
        fail('Expected BadRequestException');
      } catch (e) {
        const { duplicateOrders } = e.response.details;
        expect(duplicateOrders).toContain(1);
        expect(duplicateOrders).toContain(2);
      }
    });

    it('should throw with DUPLICATE_SESSION_ORDER code', () => {
      const sessions = [buildSession(10), buildSession(10)];
      try {
        service.validateUniqueOrderNumbers(sessions);
        fail('Expected BadRequestException');
      } catch (e) {
        expect(e.response.code).toBe('DUPLICATE_SESSION_ORDER');
        expect(e.response.message).toEqual(SESSION_ERROR_MESSAGES.DUPLICATE_SESSION_ORDER);
      }
    });
  });

  // =========================================================================
  // validateMaxSessionCount
  // =========================================================================

  describe('validateMaxSessionCount', () => {
    it('should pass for 0 sessions', () => {
      expect(() => service.validateMaxSessionCount([])).not.toThrow();
    });

    it('should pass for exactly 50 sessions (boundary)', () => {
      const sessions = Array.from({ length: 50 }, (_, i) => buildSession(i + 1));
      expect(() => service.validateMaxSessionCount(sessions)).not.toThrow();
    });

    it('should throw for 51 sessions', () => {
      const sessions = Array.from({ length: 51 }, (_, i) => buildSession(i + 1));
      expect(() => service.validateMaxSessionCount(sessions)).toThrow(
        BadRequestException,
      );
    });

    it('should throw with MAX_SESSIONS_EXCEEDED code, correct message and details', () => {
      const sessions = Array.from({ length: 55 }, (_, i) => buildSession(i + 1));
      try {
        service.validateMaxSessionCount(sessions);
        fail('Expected BadRequestException');
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(e.response.code).toBe('MAX_SESSIONS_EXCEEDED');
        expect(e.response.message).toEqual(SESSION_ERROR_MESSAGES.MAX_SESSIONS_EXCEEDED);
        expect(e.response.details.count).toBe(55);
        expect(e.response.details.max).toBe(50);
      }
    });

    it('should throw for a large number of sessions', () => {
      const sessions = Array.from({ length: 100 }, (_, i) => buildSession(i + 1));
      expect(() => service.validateMaxSessionCount(sessions)).toThrow(
        BadRequestException,
      );
    });
  });
});
