/**
 * Appointment Messages Constants Tests
 *
 * Unit tests to verify appointment message constants structure and completeness.
 *
 * @module appointment/constants/appointment-messages.spec
 */

import { APPOINTMENT_MESSAGES } from './appointment-messages.constant';
import { BilingualMessage } from '../../common/types/bilingual-message.type';

describe('Appointment Messages Constants', () => {
  describe('Message Structure', () => {
    it('should have all messages as BilingualMessage objects', () => {
      Object.entries(APPOINTMENT_MESSAGES).forEach(([key, message]) => {
        expect(message).toHaveProperty('ar');
        expect(message).toHaveProperty('en');
        expect(typeof message.ar).toBe('string');
        expect(typeof message.en).toBe('string');
        expect(message.ar.length).toBeGreaterThan(0);
        expect(message.en.length).toBeGreaterThan(0);
      });
    });

    it('should have non-empty Arabic messages', () => {
      Object.entries(APPOINTMENT_MESSAGES).forEach(([key, message]) => {
        expect(message.ar.trim()).not.toBe('');
      });
    });

    it('should have non-empty English messages', () => {
      Object.entries(APPOINTMENT_MESSAGES).forEach(([key, message]) => {
        expect(message.en.trim()).not.toBe('');
      });
    });
  });

  describe('Validation Error Messages', () => {
    it('should have APPOINTMENT_DATE_IN_PAST message', () => {
      expect(APPOINTMENT_MESSAGES.APPOINTMENT_DATE_IN_PAST).toBeDefined();
      expect(APPOINTMENT_MESSAGES.APPOINTMENT_DATE_IN_PAST.ar).toContain('تاريخ');
      expect(APPOINTMENT_MESSAGES.APPOINTMENT_DATE_IN_PAST.en).toContain('past');
    });

    it('should have INVALID_APPOINTMENT_TIME message', () => {
      expect(APPOINTMENT_MESSAGES.INVALID_APPOINTMENT_TIME).toBeDefined();
    });

    it('should have INVALID_DURATION message', () => {
      expect(APPOINTMENT_MESSAGES.INVALID_DURATION).toBeDefined();
    });

    it('should have REQUIRED_FIELD_MISSING message with placeholder', () => {
      expect(APPOINTMENT_MESSAGES.REQUIRED_FIELD_MISSING).toBeDefined();
      expect(APPOINTMENT_MESSAGES.REQUIRED_FIELD_MISSING.ar).toContain('{field}');
      expect(APPOINTMENT_MESSAGES.REQUIRED_FIELD_MISSING.en).toContain('{field}');
    });
  });

  describe('Entity Not Found Messages', () => {
    it('should have APPOINTMENT_NOT_FOUND message', () => {
      expect(APPOINTMENT_MESSAGES.APPOINTMENT_NOT_FOUND).toBeDefined();
    });

    it('should have PATIENT_NOT_FOUND_OR_INACTIVE message', () => {
      expect(APPOINTMENT_MESSAGES.PATIENT_NOT_FOUND_OR_INACTIVE).toBeDefined();
    });

    it('should have DOCTOR_NOT_FOUND_OR_INACTIVE message', () => {
      expect(APPOINTMENT_MESSAGES.DOCTOR_NOT_FOUND_OR_INACTIVE).toBeDefined();
    });

    it('should have SERVICE_NOT_FOUND_OR_INACTIVE message', () => {
      expect(APPOINTMENT_MESSAGES.SERVICE_NOT_FOUND_OR_INACTIVE).toBeDefined();
    });

    it('should have CLINIC_NOT_FOUND_OR_INACTIVE message', () => {
      expect(APPOINTMENT_MESSAGES.CLINIC_NOT_FOUND_OR_INACTIVE).toBeDefined();
    });

    it('should have DEPARTMENT_NOT_FOUND message', () => {
      expect(APPOINTMENT_MESSAGES.DEPARTMENT_NOT_FOUND).toBeDefined();
    });
  });

  describe('Business Rule Error Messages', () => {
    it('should have SERVICE_NOT_PROVIDED_BY_CLINIC message', () => {
      expect(APPOINTMENT_MESSAGES.SERVICE_NOT_PROVIDED_BY_CLINIC).toBeDefined();
    });

    it('should have DOCTOR_NOT_AUTHORIZED_FOR_SERVICE message', () => {
      expect(APPOINTMENT_MESSAGES.DOCTOR_NOT_AUTHORIZED_FOR_SERVICE).toBeDefined();
    });

    it('should have OUTSIDE_CLINIC_WORKING_HOURS message with placeholders', () => {
      expect(APPOINTMENT_MESSAGES.OUTSIDE_CLINIC_WORKING_HOURS).toBeDefined();
      expect(APPOINTMENT_MESSAGES.OUTSIDE_CLINIC_WORKING_HOURS.ar).toContain('{openingTime}');
      expect(APPOINTMENT_MESSAGES.OUTSIDE_CLINIC_WORKING_HOURS.ar).toContain('{closingTime}');
      expect(APPOINTMENT_MESSAGES.OUTSIDE_CLINIC_WORKING_HOURS.en).toContain('{openingTime}');
      expect(APPOINTMENT_MESSAGES.OUTSIDE_CLINIC_WORKING_HOURS.en).toContain('{closingTime}');
    });

    it('should have OUTSIDE_DOCTOR_WORKING_HOURS message with placeholders', () => {
      expect(APPOINTMENT_MESSAGES.OUTSIDE_DOCTOR_WORKING_HOURS).toBeDefined();
      expect(APPOINTMENT_MESSAGES.OUTSIDE_DOCTOR_WORKING_HOURS.ar).toContain('{openingTime}');
      expect(APPOINTMENT_MESSAGES.OUTSIDE_DOCTOR_WORKING_HOURS.ar).toContain('{closingTime}');
    });

    it('should have APPOINTMENT_END_TIME_EXCEEDS_HOURS message with placeholder', () => {
      expect(APPOINTMENT_MESSAGES.APPOINTMENT_END_TIME_EXCEEDS_HOURS).toBeDefined();
      expect(APPOINTMENT_MESSAGES.APPOINTMENT_END_TIME_EXCEEDS_HOURS.ar).toContain('{endTime}');
      expect(APPOINTMENT_MESSAGES.APPOINTMENT_END_TIME_EXCEEDS_HOURS.en).toContain('{endTime}');
    });

    it('should have DOCTOR_CONFLICT message', () => {
      expect(APPOINTMENT_MESSAGES.DOCTOR_CONFLICT).toBeDefined();
    });

    it('should have DOCTOR_CONFLICT_WITH_DETAILS message with placeholders', () => {
      expect(APPOINTMENT_MESSAGES.DOCTOR_CONFLICT_WITH_DETAILS).toBeDefined();
      expect(APPOINTMENT_MESSAGES.DOCTOR_CONFLICT_WITH_DETAILS.ar).toContain('{startTime}');
      expect(APPOINTMENT_MESSAGES.DOCTOR_CONFLICT_WITH_DETAILS.ar).toContain('{endTime}');
    });
  });

  describe('Status Transition Error Messages', () => {
    it('should have INVALID_STATUS_TRANSITION message with placeholders', () => {
      expect(APPOINTMENT_MESSAGES.INVALID_STATUS_TRANSITION).toBeDefined();
      expect(APPOINTMENT_MESSAGES.INVALID_STATUS_TRANSITION.ar).toContain('{currentStatus}');
      expect(APPOINTMENT_MESSAGES.INVALID_STATUS_TRANSITION.ar).toContain('{newStatus}');
    });

    it('should have CANNOT_CANCEL_COMPLETED message', () => {
      expect(APPOINTMENT_MESSAGES.CANNOT_CANCEL_COMPLETED).toBeDefined();
    });

    it('should have CANNOT_CANCEL_IN_PROGRESS message', () => {
      expect(APPOINTMENT_MESSAGES.CANNOT_CANCEL_IN_PROGRESS).toBeDefined();
    });

    it('should have CANNOT_START_COMPLETED message', () => {
      expect(APPOINTMENT_MESSAGES.CANNOT_START_COMPLETED).toBeDefined();
    });

    it('should have CANNOT_START_CANCELLED message', () => {
      expect(APPOINTMENT_MESSAGES.CANNOT_START_CANCELLED).toBeDefined();
    });

    it('should have CANNOT_COMPLETE_NOT_IN_PROGRESS message', () => {
      expect(APPOINTMENT_MESSAGES.CANNOT_COMPLETE_NOT_IN_PROGRESS).toBeDefined();
    });

    it('should have CANNOT_UPDATE_COMPLETED message', () => {
      expect(APPOINTMENT_MESSAGES.CANNOT_UPDATE_COMPLETED).toBeDefined();
    });

    it('should have CANNOT_RESCHEDULE_COMPLETED message', () => {
      expect(APPOINTMENT_MESSAGES.CANNOT_RESCHEDULE_COMPLETED).toBeDefined();
    });

    it('should have CANNOT_DELETE_IN_PROGRESS message', () => {
      expect(APPOINTMENT_MESSAGES.CANNOT_DELETE_IN_PROGRESS).toBeDefined();
    });

    it('should have CANNOT_DELETE_COMPLETED message', () => {
      expect(APPOINTMENT_MESSAGES.CANNOT_DELETE_COMPLETED).toBeDefined();
    });
  });

  describe('Required Field Error Messages', () => {
    it('should have COMPLETION_NOTES_REQUIRED message', () => {
      expect(APPOINTMENT_MESSAGES.COMPLETION_NOTES_REQUIRED).toBeDefined();
    });

    it('should have CANCELLATION_REASON_REQUIRED message', () => {
      expect(APPOINTMENT_MESSAGES.CANCELLATION_REASON_REQUIRED).toBeDefined();
    });

    it('should have NEW_DATE_TIME_REQUIRED message', () => {
      expect(APPOINTMENT_MESSAGES.NEW_DATE_TIME_REQUIRED).toBeDefined();
    });

    it('should have DOCTOR_NOTES_REQUIRED message', () => {
      expect(APPOINTMENT_MESSAGES.DOCTOR_NOTES_REQUIRED).toBeDefined();
    });
  });

  describe('Authorization Error Messages', () => {
    it('should have UNAUTHORIZED_ACTION message', () => {
      expect(APPOINTMENT_MESSAGES.UNAUTHORIZED_ACTION).toBeDefined();
    });

    it('should have INSUFFICIENT_PERMISSIONS message', () => {
      expect(APPOINTMENT_MESSAGES.INSUFFICIENT_PERMISSIONS).toBeDefined();
    });
  });

  describe('Success Messages', () => {
    it('should have APPOINTMENT_CREATED message', () => {
      expect(APPOINTMENT_MESSAGES.APPOINTMENT_CREATED).toBeDefined();
    });

    it('should have APPOINTMENT_UPDATED message', () => {
      expect(APPOINTMENT_MESSAGES.APPOINTMENT_UPDATED).toBeDefined();
    });

    it('should have APPOINTMENT_CANCELLED message', () => {
      expect(APPOINTMENT_MESSAGES.APPOINTMENT_CANCELLED).toBeDefined();
    });

    it('should have APPOINTMENT_RESCHEDULED message', () => {
      expect(APPOINTMENT_MESSAGES.APPOINTMENT_RESCHEDULED).toBeDefined();
    });

    it('should have APPOINTMENT_STARTED message', () => {
      expect(APPOINTMENT_MESSAGES.APPOINTMENT_STARTED).toBeDefined();
    });

    it('should have APPOINTMENT_COMPLETED message', () => {
      expect(APPOINTMENT_MESSAGES.APPOINTMENT_COMPLETED).toBeDefined();
    });

    it('should have APPOINTMENT_CONFIRMED message', () => {
      expect(APPOINTMENT_MESSAGES.APPOINTMENT_CONFIRMED).toBeDefined();
    });

    it('should have APPOINTMENT_DELETED message', () => {
      expect(APPOINTMENT_MESSAGES.APPOINTMENT_DELETED).toBeDefined();
    });

    it('should have APPOINTMENT_RESTORED message', () => {
      expect(APPOINTMENT_MESSAGES.APPOINTMENT_RESTORED).toBeDefined();
    });

    it('should have PATIENT_AND_APPOINTMENT_CREATED message', () => {
      expect(APPOINTMENT_MESSAGES.PATIENT_AND_APPOINTMENT_CREATED).toBeDefined();
    });

    it('should have STATUS_UPDATED message', () => {
      expect(APPOINTMENT_MESSAGES.STATUS_UPDATED).toBeDefined();
    });
  });

  describe('Message Count', () => {
    it('should have at least 50 messages defined', () => {
      const messageCount = Object.keys(APPOINTMENT_MESSAGES).length;
      expect(messageCount).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Placeholder Consistency', () => {
    it('should have matching placeholders in Arabic and English', () => {
      Object.entries(APPOINTMENT_MESSAGES).forEach(([key, message]) => {
        const arPlaceholders = message.ar.match(/\{[^}]+\}/g) || [];
        const enPlaceholders = message.en.match(/\{[^}]+\}/g) || [];
        
        // Sort to compare regardless of order
        const arSorted = arPlaceholders.sort();
        const enSorted = enPlaceholders.sort();
        
        expect(arSorted).toEqual(enSorted);
      });
    });
  });
});
