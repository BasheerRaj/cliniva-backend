import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { CheckConflictsDto } from './check-conflicts.dto';

describe('CheckConflictsDto', () => {
  describe('Valid DTO', () => {
    it('should pass validation with valid data', async () => {
      const dto = plainToClass(CheckConflictsDto, {
        userId: '507f1f77bcf86cd799439011',
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
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with complete weekly schedule', async () => {
      const dto = plainToClass(CheckConflictsDto, {
        userId: '507f1f77bcf86cd799439011',
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
            openingTime: '10:00',
            closingTime: '18:00',
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
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with schedule including break times', async () => {
      const dto = plainToClass(CheckConflictsDto, {
        userId: '507f1f77bcf86cd799439011',
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
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Invalid userId', () => {
    it('should fail validation with empty userId', async () => {
      const dto = plainToClass(CheckConflictsDto, {
        userId: '',
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
      expect(errors[0].property).toBe('userId');
    });

    it('should fail validation with missing userId', async () => {
      const dto = plainToClass(CheckConflictsDto, {
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
      const userIdError = errors.find((e) => e.property === 'userId');
      expect(userIdError).toBeDefined();
    });

    it('should fail validation with invalid MongoDB ObjectId format', async () => {
      const dto = plainToClass(CheckConflictsDto, {
        userId: 'invalid-id-format',
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
      expect(errors[0].property).toBe('userId');
    });

    it('should fail validation with non-string userId', async () => {
      const dto = plainToClass(CheckConflictsDto, {
        userId: 12345,
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
      expect(errors[0].property).toBe('userId');
    });
  });

  describe('Invalid schedule', () => {
    it('should fail validation with missing schedule', async () => {
      const dto = plainToClass(CheckConflictsDto, {
        userId: '507f1f77bcf86cd799439011',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const scheduleError = errors.find((e) => e.property === 'schedule');
      expect(scheduleError).toBeDefined();
    });

    it('should fail validation with non-array schedule', async () => {
      const dto = plainToClass(CheckConflictsDto, {
        userId: '507f1f77bcf86cd799439011',
        schedule: 'not-an-array',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('schedule');
    });

    it('should fail validation with invalid schedule items', async () => {
      const dto = plainToClass(CheckConflictsDto, {
        userId: '507f1f77bcf86cd799439011',
        schedule: [
          {
            dayOfWeek: 'invalid-day', // Invalid day
            isWorkingDay: true,
            openingTime: '09:00',
            closingTime: '17:00',
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation with schedule missing required fields', async () => {
      const dto = plainToClass(CheckConflictsDto, {
        userId: '507f1f77bcf86cd799439011',
        schedule: [
          {
            dayOfWeek: 'monday',
            // Missing isWorkingDay
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should fail validation with empty schedule array', async () => {
      const dto = plainToClass(CheckConflictsDto, {
        userId: '507f1f77bcf86cd799439011',
        schedule: [],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('schedule');
      expect(errors[0].constraints).toHaveProperty('arrayMinSize');
    });

    it('should pass validation with all non-working days', async () => {
      const dto = plainToClass(CheckConflictsDto, {
        userId: '507f1f77bcf86cd799439011',
        schedule: [
          {
            dayOfWeek: 'monday',
            isWorkingDay: false,
          },
          {
            dayOfWeek: 'tuesday',
            isWorkingDay: false,
          },
          {
            dayOfWeek: 'wednesday',
            isWorkingDay: false,
          },
          {
            dayOfWeek: 'thursday',
            isWorkingDay: false,
          },
          {
            dayOfWeek: 'friday',
            isWorkingDay: false,
          },
          {
            dayOfWeek: 'saturday',
            isWorkingDay: false,
          },
          {
            dayOfWeek: 'sunday',
            isWorkingDay: false,
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with single working day', async () => {
      const dto = plainToClass(CheckConflictsDto, {
        userId: '507f1f77bcf86cd799439011',
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
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with different working hours per day', async () => {
      const dto = plainToClass(CheckConflictsDto, {
        userId: '507f1f77bcf86cd799439011',
        schedule: [
          {
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '08:00',
            closingTime: '16:00',
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
            openingTime: '10:00',
            closingTime: '18:00',
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Business Logic Scenarios', () => {
    it('should pass validation for doctor reducing working hours', async () => {
      const dto = plainToClass(CheckConflictsDto, {
        userId: '507f1f77bcf86cd799439011',
        schedule: [
          {
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '10:00', // Later opening
            closingTime: '16:00', // Earlier closing
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation for doctor extending working hours', async () => {
      const dto = plainToClass(CheckConflictsDto, {
        userId: '507f1f77bcf86cd799439011',
        schedule: [
          {
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '07:00', // Earlier opening
            closingTime: '20:00', // Later closing
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation for doctor changing working days', async () => {
      const dto = plainToClass(CheckConflictsDto, {
        userId: '507f1f77bcf86cd799439011',
        schedule: [
          {
            dayOfWeek: 'monday',
            isWorkingDay: false, // No longer working
          },
          {
            dayOfWeek: 'sunday',
            isWorkingDay: true, // Now working
            openingTime: '09:00',
            closingTime: '17:00',
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});

