/**
 * Bilingual Message Generator Tests
 *
 * Unit tests for bilingual message generation utilities.
 *
 * @module appointment/utils/message-generator.spec
 */

import {
  generateBilingualMessage,
  interpolateMessage,
} from './message-generator';
import { BilingualMessage } from '../../common/types/bilingual-message.type';

describe('Bilingual Message Generator', () => {
  describe('generateBilingualMessage', () => {
    it('should generate message without parameters', () => {
      const result = generateBilingualMessage(
        'تم إنشاء الموعد بنجاح',
        'Appointment created successfully',
      );

      expect(result).toEqual({
        ar: 'تم إنشاء الموعد بنجاح',
        en: 'Appointment created successfully',
      });
    });

    it('should generate message with single parameter', () => {
      const result = generateBilingualMessage(
        'الموعد في {date}',
        'Appointment on {date}',
        { date: '2024-01-15' },
      );

      expect(result).toEqual({
        ar: 'الموعد في 2024-01-15',
        en: 'Appointment on 2024-01-15',
      });
    });

    it('should generate message with multiple parameters', () => {
      const result = generateBilingualMessage(
        'الموعد مع الدكتور {doctorName} في {time}',
        'Appointment with Dr. {doctorName} at {time}',
        { doctorName: 'Ahmed', time: '10:00' },
      );

      expect(result).toEqual({
        ar: 'الموعد مع الدكتور Ahmed في 10:00',
        en: 'Appointment with Dr. Ahmed at 10:00',
      });
    });

    it('should handle numeric parameters', () => {
      const result = generateBilingualMessage(
        'تم العثور على {count} موعد',
        'Found {count} appointments',
        { count: 5 },
      );

      expect(result).toEqual({
        ar: 'تم العثور على 5 موعد',
        en: 'Found 5 appointments',
      });
    });

    it('should handle mixed string and numeric parameters', () => {
      const result = generateBilingualMessage(
        'الطبيب {doctorName} لديه {count} موعد',
        'Dr. {doctorName} has {count} appointments',
        { doctorName: 'Ahmed', count: 3 },
      );

      expect(result).toEqual({
        ar: 'الطبيب Ahmed لديه 3 موعد',
        en: 'Dr. Ahmed has 3 appointments',
      });
    });

    it('should handle empty parameters object', () => {
      const result = generateBilingualMessage(
        'رسالة بسيطة',
        'Simple message',
        {},
      );

      expect(result).toEqual({
        ar: 'رسالة بسيطة',
        en: 'Simple message',
      });
    });

    it('should handle undefined parameters', () => {
      const result = generateBilingualMessage(
        'رسالة بسيطة',
        'Simple message',
        undefined,
      );

      expect(result).toEqual({
        ar: 'رسالة بسيطة',
        en: 'Simple message',
      });
    });

    it('should handle multiple occurrences of same parameter', () => {
      const result = generateBilingualMessage(
        'الموعد {time} تم تأكيده للساعة {time}',
        'Appointment {time} confirmed for {time}',
        { time: '10:00' },
      );

      expect(result).toEqual({
        ar: 'الموعد 10:00 تم تأكيده للساعة 10:00',
        en: 'Appointment 10:00 confirmed for 10:00',
      });
    });

    it('should handle special characters in parameters', () => {
      const result = generateBilingualMessage(
        'الموعد في {location}',
        'Appointment at {location}',
        { location: 'Clinic #1 (Building A)' },
      );

      expect(result).toEqual({
        ar: 'الموعد في Clinic #1 (Building A)',
        en: 'Appointment at Clinic #1 (Building A)',
      });
    });

    it('should convert zero to string', () => {
      const result = generateBilingualMessage(
        'عدد المواعيد: {count}',
        'Appointments count: {count}',
        { count: 0 },
      );

      expect(result).toEqual({
        ar: 'عدد المواعيد: 0',
        en: 'Appointments count: 0',
      });
    });
  });

  describe('interpolateMessage', () => {
    it('should interpolate message from template without parameters', () => {
      const template: BilingualMessage = {
        ar: 'تم إنشاء الموعد بنجاح',
        en: 'Appointment created successfully',
      };

      const result = interpolateMessage(template);

      expect(result).toEqual(template);
    });

    it('should interpolate message from template with parameters', () => {
      const template: BilingualMessage = {
        ar: 'الموعد في {date} الساعة {time}',
        en: 'Appointment on {date} at {time}',
      };

      const result = interpolateMessage(template, {
        date: '2024-01-15',
        time: '10:00',
      });

      expect(result).toEqual({
        ar: 'الموعد في 2024-01-15 الساعة 10:00',
        en: 'Appointment on 2024-01-15 at 10:00',
      });
    });

    it('should handle template with numeric parameters', () => {
      const template: BilingualMessage = {
        ar: 'تم إلغاء {count} موعد',
        en: '{count} appointments cancelled',
      };

      const result = interpolateMessage(template, { count: 3 });

      expect(result).toEqual({
        ar: 'تم إلغاء 3 موعد',
        en: '3 appointments cancelled',
      });
    });

    it('should handle empty parameters', () => {
      const template: BilingualMessage = {
        ar: 'رسالة ثابتة',
        en: 'Static message',
      };

      const result = interpolateMessage(template, {});

      expect(result).toEqual(template);
    });
  });

  describe('Edge cases', () => {
    it('should handle Arabic text with diacritics', () => {
      const result = generateBilingualMessage(
        'المَوعِد في {date}',
        'Appointment on {date}',
        { date: '2024-01-15' },
      );

      expect(result.ar).toContain('2024-01-15');
      expect(result.en).toContain('2024-01-15');
    });

    it('should handle long parameter values', () => {
      const longName = 'Dr. Ahmed Mohamed Ali Hassan';
      const result = generateBilingualMessage(
        'الموعد مع {doctorName}',
        'Appointment with {doctorName}',
        { doctorName: longName },
      );

      expect(result.ar).toContain(longName);
      expect(result.en).toContain(longName);
    });

    it('should handle date and time formats', () => {
      const result = generateBilingualMessage(
        'الموعد في {date} الساعة {time}',
        'Appointment on {date} at {time}',
        { date: '2024-01-15', time: '14:30' },
      );

      expect(result).toEqual({
        ar: 'الموعد في 2024-01-15 الساعة 14:30',
        en: 'Appointment on 2024-01-15 at 14:30',
      });
    });
  });
});
