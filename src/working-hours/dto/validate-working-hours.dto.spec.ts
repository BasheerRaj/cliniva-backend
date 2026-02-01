import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { ValidateWorkingHoursDto } from './validate-working-hours.dto';

describe('ValidateWorkingHoursDto', () => {
  describe('Valid DTO', () => {
    it('should pass validation with valid data', async () => {
      const dto = plainToClass(ValidateWorkingHoursDto, {
        entityType: 'user',
        entityId: '507f1f77bcf86cd799439011',
        parentEntityType: 'clinic',
        parentEntityId: '507f1f77bcf86cd799439012',
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

    it('should pass validation with clinic entity type', async () => {
      const dto = plainToClass(ValidateWorkingHoursDto, {
        entityType: 'clinic',
        entityId: '507f1f77bcf86cd799439011',
        parentEntityType: 'complex',
        parentEntityId: '507f1f77bcf86cd799439012',
        schedule: [
          {
            dayOfWeek: 'wednesday',
            isWorkingDay: true,
            openingTime: '08:00',
            closingTime: '16:00',
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Invalid entityType', () => {
    it('should fail validation with invalid entityType', async () => {
      const dto = plainToClass(ValidateWorkingHoursDto, {
        entityType: 'organization', // Not allowed for validation
        entityId: '507f1f77bcf86cd799439011',
        parentEntityType: 'clinic',
        parentEntityId: '507f1f77bcf86cd799439012',
        schedule: [],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('entityType');
    });

    it('should fail validation with missing entityType', async () => {
      const dto = plainToClass(ValidateWorkingHoursDto, {
        entityId: '507f1f77bcf86cd799439011',
        parentEntityType: 'clinic',
        parentEntityId: '507f1f77bcf86cd799439012',
        schedule: [],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const entityTypeError = errors.find((e) => e.property === 'entityType');
      expect(entityTypeError).toBeDefined();
    });
  });

  describe('Invalid entityId', () => {
    it('should fail validation with empty entityId', async () => {
      const dto = plainToClass(ValidateWorkingHoursDto, {
        entityType: 'user',
        entityId: '',
        parentEntityType: 'clinic',
        parentEntityId: '507f1f77bcf86cd799439012',
        schedule: [],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('entityId');
    });

    it('should fail validation with missing entityId', async () => {
      const dto = plainToClass(ValidateWorkingHoursDto, {
        entityType: 'user',
        parentEntityType: 'clinic',
        parentEntityId: '507f1f77bcf86cd799439012',
        schedule: [],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const entityIdError = errors.find((e) => e.property === 'entityId');
      expect(entityIdError).toBeDefined();
    });
  });

  describe('Invalid parentEntityType', () => {
    it('should fail validation with invalid parentEntityType', async () => {
      const dto = plainToClass(ValidateWorkingHoursDto, {
        entityType: 'user',
        entityId: '507f1f77bcf86cd799439011',
        parentEntityType: 'organization', // Not allowed
        parentEntityId: '507f1f77bcf86cd799439012',
        schedule: [],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('parentEntityType');
    });

    it('should fail validation with missing parentEntityType', async () => {
      const dto = plainToClass(ValidateWorkingHoursDto, {
        entityType: 'user',
        entityId: '507f1f77bcf86cd799439011',
        parentEntityId: '507f1f77bcf86cd799439012',
        schedule: [],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const parentEntityTypeError = errors.find(
        (e) => e.property === 'parentEntityType',
      );
      expect(parentEntityTypeError).toBeDefined();
    });
  });

  describe('Invalid parentEntityId', () => {
    it('should fail validation with empty parentEntityId', async () => {
      const dto = plainToClass(ValidateWorkingHoursDto, {
        entityType: 'user',
        entityId: '507f1f77bcf86cd799439011',
        parentEntityType: 'clinic',
        parentEntityId: '',
        schedule: [],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('parentEntityId');
    });

    it('should fail validation with missing parentEntityId', async () => {
      const dto = plainToClass(ValidateWorkingHoursDto, {
        entityType: 'user',
        entityId: '507f1f77bcf86cd799439011',
        parentEntityType: 'clinic',
        schedule: [],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const parentEntityIdError = errors.find(
        (e) => e.property === 'parentEntityId',
      );
      expect(parentEntityIdError).toBeDefined();
    });
  });

  describe('Invalid schedule', () => {
    it('should fail validation with missing schedule', async () => {
      const dto = plainToClass(ValidateWorkingHoursDto, {
        entityType: 'user',
        entityId: '507f1f77bcf86cd799439011',
        parentEntityType: 'clinic',
        parentEntityId: '507f1f77bcf86cd799439012',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const scheduleError = errors.find((e) => e.property === 'schedule');
      expect(scheduleError).toBeDefined();
    });

    it('should fail validation with non-array schedule', async () => {
      const dto = plainToClass(ValidateWorkingHoursDto, {
        entityType: 'user',
        entityId: '507f1f77bcf86cd799439011',
        parentEntityType: 'clinic',
        parentEntityId: '507f1f77bcf86cd799439012',
        schedule: 'not-an-array',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('schedule');
    });

    it('should fail validation with invalid schedule items', async () => {
      const dto = plainToClass(ValidateWorkingHoursDto, {
        entityType: 'user',
        entityId: '507f1f77bcf86cd799439011',
        parentEntityType: 'clinic',
        parentEntityId: '507f1f77bcf86cd799439012',
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
  });

  describe('Edge Cases', () => {
    it('should pass validation with empty schedule array', async () => {
      const dto = plainToClass(ValidateWorkingHoursDto, {
        entityType: 'user',
        entityId: '507f1f77bcf86cd799439011',
        parentEntityType: 'clinic',
        parentEntityId: '507f1f77bcf86cd799439012',
        schedule: [],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with all days in schedule', async () => {
      const dto = plainToClass(ValidateWorkingHoursDto, {
        entityType: 'user',
        entityId: '507f1f77bcf86cd799439011',
        parentEntityType: 'clinic',
        parentEntityId: '507f1f77bcf86cd799439012',
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
            isWorkingDay: true,
            openingTime: '09:00',
            closingTime: '17:00',
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
  });
});
