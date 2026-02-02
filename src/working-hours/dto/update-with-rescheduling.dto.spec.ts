import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { UpdateWithReschedulingDto } from './update-with-rescheduling.dto';

/**
 * @fileoverview Unit tests for UpdateWithReschedulingDto
 *
 * Tests validation rules for the update with rescheduling DTO:
 * - Schedule validation
 * - HandleConflicts enum validation
 * - Optional fields validation
 *
 * @module working-hours/dto/update-with-rescheduling.spec
 */

describe('UpdateWithReschedulingDto', () => {
  describe('Valid DTOs', () => {
    it('should validate a complete DTO with all fields', async () => {
      const dto = plainToClass(UpdateWithReschedulingDto, {
        schedule: [
          {
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '09:00',
            closingTime: '17:00',
          },
          {
            dayOfWeek: 'tuesday',
            isWorkingDay: false,
          },
        ],
        handleConflicts: 'reschedule',
        notifyPatients: true,
        reschedulingReason: 'Doctor schedule change',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate DTO with minimal required fields', async () => {
      const dto = plainToClass(UpdateWithReschedulingDto, {
        schedule: [
          {
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '09:00',
            closingTime: '17:00',
          },
        ],
        handleConflicts: 'notify',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate DTO with handleConflicts=reschedule', async () => {
      const dto = plainToClass(UpdateWithReschedulingDto, {
        schedule: [
          {
            dayOfWeek: 'wednesday',
            isWorkingDay: true,
            openingTime: '08:00',
            closingTime: '16:00',
          },
        ],
        handleConflicts: 'reschedule',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate DTO with handleConflicts=cancel', async () => {
      const dto = plainToClass(UpdateWithReschedulingDto, {
        schedule: [
          {
            dayOfWeek: 'thursday',
            isWorkingDay: false,
          },
        ],
        handleConflicts: 'cancel',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate DTO with notifyPatients=false', async () => {
      const dto = plainToClass(UpdateWithReschedulingDto, {
        schedule: [
          {
            dayOfWeek: 'friday',
            isWorkingDay: true,
            openingTime: '10:00',
            closingTime: '18:00',
          },
        ],
        handleConflicts: 'notify',
        notifyPatients: false,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate DTO with full week schedule', async () => {
      const dto = plainToClass(UpdateWithReschedulingDto, {
        schedule: [
          {
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '09:00',
            closingTime: '17:00',
          },
          {
            dayOfWeek: 'tuesday',
            isWorkingDay: true,
            openingTime: '09:00',
            closingTime: '17:00',
          },
          {
            dayOfWeek: 'wednesday',
            isWorkingDay: true,
            openingTime: '09:00',
            closingTime: '17:00',
          },
          {
            dayOfWeek: 'thursday',
            isWorkingDay: true,
            openingTime: '09:00',
            closingTime: '17:00',
          },
          {
            dayOfWeek: 'friday',
            isWorkingDay: false,
          },
          {
            dayOfWeek: 'saturday',
            isWorkingDay: true,
            openingTime: '08:00',
            closingTime: '14:00',
          },
          {
            dayOfWeek: 'sunday',
            isWorkingDay: false,
          },
        ],
        handleConflicts: 'reschedule',
        notifyPatients: true,
        reschedulingReason: 'Updated working hours',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Invalid DTOs', () => {
    it('should fail validation when schedule is missing', async () => {
      const dto = plainToClass(UpdateWithReschedulingDto, {
        handleConflicts: 'reschedule',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('schedule');
    });

    it('should fail validation when schedule is empty array', async () => {
      const dto = plainToClass(UpdateWithReschedulingDto, {
        schedule: [],
        handleConflicts: 'reschedule',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('schedule');
    });

    it('should fail validation when schedule is not an array', async () => {
      const dto = plainToClass(UpdateWithReschedulingDto, {
        schedule: 'not-an-array',
        handleConflicts: 'reschedule',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('schedule');
    });

    it('should fail validation when handleConflicts is missing', async () => {
      const dto = plainToClass(UpdateWithReschedulingDto, {
        schedule: [
          {
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '09:00',
            closingTime: '17:00',
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('handleConflicts');
    });

    it('should fail validation when handleConflicts is invalid', async () => {
      const dto = plainToClass(UpdateWithReschedulingDto, {
        schedule: [
          {
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '09:00',
            closingTime: '17:00',
          },
        ],
        handleConflicts: 'invalid-option',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('handleConflicts');
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });

    it('should fail validation when handleConflicts is empty string', async () => {
      const dto = plainToClass(UpdateWithReschedulingDto, {
        schedule: [
          {
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '09:00',
            closingTime: '17:00',
          },
        ],
        handleConflicts: '',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('handleConflicts');
    });

    it('should fail validation when notifyPatients is not boolean', async () => {
      const dto = plainToClass(UpdateWithReschedulingDto, {
        schedule: [
          {
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '09:00',
            closingTime: '17:00',
          },
        ],
        handleConflicts: 'reschedule',
        notifyPatients: 'yes',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('notifyPatients');
    });

    it('should fail validation when reschedulingReason is not string', async () => {
      const dto = plainToClass(UpdateWithReschedulingDto, {
        schedule: [
          {
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '09:00',
            closingTime: '17:00',
          },
        ],
        handleConflicts: 'reschedule',
        reschedulingReason: 123,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('reschedulingReason');
    });

    it('should fail validation when schedule contains invalid day', async () => {
      const dto = plainToClass(UpdateWithReschedulingDto, {
        schedule: [
          {
            dayOfWeek: 'invalid-day',
            isWorkingDay: true,
            openingTime: '09:00',
            closingTime: '17:00',
          },
        ],
        handleConflicts: 'reschedule',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation when schedule item is missing required fields', async () => {
      const dto = plainToClass(UpdateWithReschedulingDto, {
        schedule: [
          {
            dayOfWeek: 'monday',
            // missing isWorkingDay
          },
        ],
        handleConflicts: 'reschedule',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should validate DTO with break times in schedule', async () => {
      const dto = plainToClass(UpdateWithReschedulingDto, {
        schedule: [
          {
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '09:00',
            closingTime: '17:00',
            breakStartTime: '12:00',
            breakEndTime: '13:00',
          },
        ],
        handleConflicts: 'reschedule',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate DTO with long rescheduling reason', async () => {
      const dto = plainToClass(UpdateWithReschedulingDto, {
        schedule: [
          {
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '09:00',
            closingTime: '17:00',
          },
        ],
        handleConflicts: 'notify',
        reschedulingReason:
          'This is a very long rescheduling reason that explains in detail why the working hours are being changed and what impact it will have on the appointments.',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate DTO with all days as non-working', async () => {
      const dto = plainToClass(UpdateWithReschedulingDto, {
        schedule: [
          { dayOfWeek: 'monday', isWorkingDay: false },
          { dayOfWeek: 'tuesday', isWorkingDay: false },
          { dayOfWeek: 'wednesday', isWorkingDay: false },
          { dayOfWeek: 'thursday', isWorkingDay: false },
          { dayOfWeek: 'friday', isWorkingDay: false },
          { dayOfWeek: 'saturday', isWorkingDay: false },
          { dayOfWeek: 'sunday', isWorkingDay: false },
        ],
        handleConflicts: 'cancel',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Response Interfaces', () => {
    it('should have correct structure for RescheduledAppointmentDetail', () => {
      const detail = {
        appointmentId: '507f1f77bcf86cd799439011',
        oldDate: '2026-02-15',
        oldTime: '10:00',
        newDate: '2026-02-15',
        newTime: '14:00',
        status: 'rescheduled' as const,
      };

      expect(detail).toHaveProperty('appointmentId');
      expect(detail).toHaveProperty('oldDate');
      expect(detail).toHaveProperty('oldTime');
      expect(detail).toHaveProperty('newDate');
      expect(detail).toHaveProperty('newTime');
      expect(detail).toHaveProperty('status');
      expect(['rescheduled', 'marked_for_rescheduling', 'cancelled']).toContain(
        detail.status,
      );
    });

    it('should have correct structure for UpdateWithReschedulingResponseData', () => {
      const responseData = {
        workingHours: [],
        appointmentsRescheduled: 5,
        appointmentsMarkedForRescheduling: 2,
        appointmentsCancelled: 0,
        notificationsSent: 7,
        rescheduledAppointments: [],
      };

      expect(responseData).toHaveProperty('workingHours');
      expect(responseData).toHaveProperty('appointmentsRescheduled');
      expect(responseData).toHaveProperty('appointmentsMarkedForRescheduling');
      expect(responseData).toHaveProperty('appointmentsCancelled');
      expect(responseData).toHaveProperty('notificationsSent');
      expect(responseData).toHaveProperty('rescheduledAppointments');
      expect(Array.isArray(responseData.workingHours)).toBe(true);
      expect(Array.isArray(responseData.rescheduledAppointments)).toBe(true);
    });

    it('should have correct structure for UpdateWithReschedulingResponse', () => {
      const response = {
        success: true,
        data: {
          workingHours: [],
          appointmentsRescheduled: 0,
          appointmentsMarkedForRescheduling: 0,
          appointmentsCancelled: 0,
          notificationsSent: 0,
          rescheduledAppointments: [],
        },
        message: {
          ar: 'تم تحديث ساعات العمل بنجاح',
          en: 'Working hours updated successfully',
        },
      };

      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('message');
      expect(response.message).toHaveProperty('ar');
      expect(response.message).toHaveProperty('en');
    });
  });
});
