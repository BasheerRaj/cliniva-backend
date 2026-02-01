import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { CreateWorkingHoursDto, WorkingHourDto } from './create-working-hours.dto';

describe('CreateWorkingHoursDto', () => {
  describe('entityType validation', () => {
    it('should accept organization entity type', async () => {
      const dto = plainToClass(CreateWorkingHoursDto, {
        entityType: 'organization',
        entityId: '507f1f77bcf86cd799439011',
        schedule: [
          {
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '08:00',
            closingTime: '17:00',
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept complex entity type', async () => {
      const dto = plainToClass(CreateWorkingHoursDto, {
        entityType: 'complex',
        entityId: '507f1f77bcf86cd799439011',
        schedule: [
          {
            dayOfWeek: 'tuesday',
            isWorkingDay: true,
            openingTime: '09:00',
            closingTime: '18:00',
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept clinic entity type', async () => {
      const dto = plainToClass(CreateWorkingHoursDto, {
        entityType: 'clinic',
        entityId: '507f1f77bcf86cd799439011',
        schedule: [
          {
            dayOfWeek: 'wednesday',
            isWorkingDay: true,
            openingTime: '10:00',
            closingTime: '16:00',
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept user entity type (NEW)', async () => {
      const dto = plainToClass(CreateWorkingHoursDto, {
        entityType: 'user',
        entityId: '507f1f77bcf86cd799439011',
        schedule: [
          {
            dayOfWeek: 'thursday',
            isWorkingDay: true,
            openingTime: '08:30',
            closingTime: '17:30',
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject invalid entity type', async () => {
      const dto = plainToClass(CreateWorkingHoursDto, {
        entityType: 'invalid',
        entityId: '507f1f77bcf86cd799439011',
        schedule: [
          {
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '08:00',
            closingTime: '17:00',
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('entityType');
    });
  });

  describe('user entity type scenarios', () => {
    it('should validate working hours for doctor user', async () => {
      const dto = plainToClass(CreateWorkingHoursDto, {
        entityType: 'user',
        entityId: '507f1f77bcf86cd799439011', // Doctor's user ID
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
        ],
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.entityType).toBe('user');
      expect(dto.schedule).toHaveLength(2);
    });

    it('should validate working hours for staff user', async () => {
      const dto = plainToClass(CreateWorkingHoursDto, {
        entityType: 'user',
        entityId: '507f1f77bcf86cd799439012', // Staff's user ID
        schedule: [
          {
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '08:00',
            closingTime: '16:00',
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.entityType).toBe('user');
    });

    it('should validate non-working day for user', async () => {
      const dto = plainToClass(CreateWorkingHoursDto, {
        entityType: 'user',
        entityId: '507f1f77bcf86cd799439011',
        schedule: [
          {
            dayOfWeek: 'friday',
            isWorkingDay: false,
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.schedule[0].isWorkingDay).toBe(false);
    });

    it('should validate user working hours with break times', async () => {
      const dto = plainToClass(CreateWorkingHoursDto, {
        entityType: 'user',
        entityId: '507f1f77bcf86cd799439011',
        schedule: [
          {
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '08:00',
            closingTime: '17:00',
            breakStartTime: '12:00',
            breakEndTime: '13:00',
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.schedule[0].breakStartTime).toBe('12:00');
      expect(dto.schedule[0].breakEndTime).toBe('13:00');
    });
  });

  describe('required fields', () => {
    it('should require entityType', async () => {
      const dto = plainToClass(CreateWorkingHoursDto, {
        entityId: '507f1f77bcf86cd799439011',
        schedule: [],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const entityTypeError = errors.find((e) => e.property === 'entityType');
      expect(entityTypeError).toBeDefined();
    });

    it('should require entityId', async () => {
      const dto = plainToClass(CreateWorkingHoursDto, {
        entityType: 'user',
        schedule: [],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const entityIdError = errors.find((e) => e.property === 'entityId');
      expect(entityIdError).toBeDefined();
    });

    it('should require schedule array', async () => {
      const dto = plainToClass(CreateWorkingHoursDto, {
        entityType: 'user',
        entityId: '507f1f77bcf86cd799439011',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const scheduleError = errors.find((e) => e.property === 'schedule');
      expect(scheduleError).toBeDefined();
    });
  });

  describe('backward compatibility', () => {
    it('should still work with existing organization data', async () => {
      const dto = plainToClass(CreateWorkingHoursDto, {
        entityType: 'organization',
        entityId: '507f1f77bcf86cd799439011',
        schedule: [
          {
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '08:00',
            closingTime: '17:00',
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should still work with existing complex data', async () => {
      const dto = plainToClass(CreateWorkingHoursDto, {
        entityType: 'complex',
        entityId: '507f1f77bcf86cd799439011',
        schedule: [
          {
            dayOfWeek: 'tuesday',
            isWorkingDay: true,
            openingTime: '09:00',
            closingTime: '18:00',
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should still work with existing clinic data', async () => {
      const dto = plainToClass(CreateWorkingHoursDto, {
        entityType: 'clinic',
        entityId: '507f1f77bcf86cd799439011',
        schedule: [
          {
            dayOfWeek: 'wednesday',
            isWorkingDay: true,
            openingTime: '10:00',
            closingTime: '16:00',
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
