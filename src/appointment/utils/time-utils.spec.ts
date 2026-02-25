/**
 * Time Conversion Utilities Tests
 *
 * Unit tests for time conversion utilities used in the Appointment module.
 *
 * @module appointment/utils/time-utils.spec
 */

import {
  timeToMinutes,
  minutesToTime,
  calculateEndTime,
} from './time-utils';

describe('Time Conversion Utilities', () => {
  describe('timeToMinutes', () => {
    it('should convert midnight to 0 minutes', () => {
      expect(timeToMinutes('00:00')).toBe(0);
    });

    it('should convert morning time correctly', () => {
      expect(timeToMinutes('09:30')).toBe(570); // 9 * 60 + 30
    });

    it('should convert afternoon time correctly', () => {
      expect(timeToMinutes('14:00')).toBe(840); // 14 * 60
    });

    it('should convert end of day correctly', () => {
      expect(timeToMinutes('23:59')).toBe(1439); // 23 * 60 + 59
    });

    it('should handle noon correctly', () => {
      expect(timeToMinutes('12:00')).toBe(720); // 12 * 60
    });

    it('should return 0 for empty string', () => {
      expect(timeToMinutes('')).toBe(0);
    });

    it('should return 0 for null/undefined', () => {
      expect(timeToMinutes(null as any)).toBe(0);
      expect(timeToMinutes(undefined as any)).toBe(0);
    });
  });

  describe('minutesToTime', () => {
    it('should convert 0 minutes to midnight', () => {
      expect(minutesToTime(0)).toBe('00:00');
    });

    it('should convert morning minutes correctly', () => {
      expect(minutesToTime(570)).toBe('09:30'); // 570 = 9 * 60 + 30
    });

    it('should convert afternoon minutes correctly', () => {
      expect(minutesToTime(840)).toBe('14:00'); // 840 = 14 * 60
    });

    it('should convert end of day correctly', () => {
      expect(minutesToTime(1439)).toBe('23:59'); // 1439 = 23 * 60 + 59
    });

    it('should convert noon correctly', () => {
      expect(minutesToTime(720)).toBe('12:00'); // 720 = 12 * 60
    });

    it('should pad single digit hours and minutes with zeros', () => {
      expect(minutesToTime(65)).toBe('01:05'); // 1 hour 5 minutes
      expect(minutesToTime(9)).toBe('00:09'); // 9 minutes
    });
  });

  describe('calculateEndTime', () => {
    it('should calculate end time within same hour', () => {
      expect(calculateEndTime('09:30', 15)).toBe('09:45');
    });

    it('should calculate end time crossing hour boundary', () => {
      expect(calculateEndTime('09:30', 45)).toBe('10:15');
    });

    it('should calculate end time for exact hour duration', () => {
      expect(calculateEndTime('09:00', 60)).toBe('10:00');
    });

    it('should calculate end time for multiple hours', () => {
      expect(calculateEndTime('09:00', 150)).toBe('11:30'); // 2.5 hours
    });

    it('should handle end time crossing midnight', () => {
      expect(calculateEndTime('23:30', 45)).toBe('00:15'); // Next day
    });

    it('should handle end time at exactly midnight', () => {
      expect(calculateEndTime('22:00', 120)).toBe('00:00'); // 2 hours later
    });

    it('should handle zero duration', () => {
      expect(calculateEndTime('09:30', 0)).toBe('09:30');
    });

    it('should handle full day duration', () => {
      expect(calculateEndTime('09:00', 1440)).toBe('09:00'); // 24 hours wraps around
    });
  });

  describe('Round-trip conversion', () => {
    it('should maintain consistency when converting back and forth', () => {
      const originalTime = '14:30';
      const minutes = timeToMinutes(originalTime);
      const convertedBack = minutesToTime(minutes);
      expect(convertedBack).toBe(originalTime);
    });

    it('should maintain consistency for multiple times', () => {
      const times = ['00:00', '06:15', '12:00', '18:45', '23:59'];
      times.forEach((time) => {
        const minutes = timeToMinutes(time);
        const convertedBack = minutesToTime(minutes);
        expect(convertedBack).toBe(time);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle start of business hours', () => {
      expect(timeToMinutes('08:00')).toBe(480);
      expect(minutesToTime(480)).toBe('08:00');
    });

    it('should handle end of business hours', () => {
      expect(timeToMinutes('17:00')).toBe(1020);
      expect(minutesToTime(1020)).toBe('17:00');
    });

    it('should calculate typical appointment durations', () => {
      expect(calculateEndTime('09:00', 30)).toBe('09:30'); // 30-min appointment
      expect(calculateEndTime('10:00', 45)).toBe('10:45'); // 45-min appointment
      expect(calculateEndTime('14:00', 60)).toBe('15:00'); // 1-hour appointment
    });
  });
});
