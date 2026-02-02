import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { SuggestWorkingHoursQueryDto } from './suggest-working-hours.dto';

describe('SuggestWorkingHoursQueryDto', () => {
  describe('role validation', () => {
    it('should accept valid doctor role', async () => {
      const dto = plainToClass(SuggestWorkingHoursQueryDto, {
        role: 'doctor',
        clinicId: '507f1f77bcf86cd799439011',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept valid staff role', async () => {
      const dto = plainToClass(SuggestWorkingHoursQueryDto, {
        role: 'staff',
        complexId: '507f1f77bcf86cd799439012',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject invalid role', async () => {
      const dto = plainToClass(SuggestWorkingHoursQueryDto, {
        role: 'invalid',
        clinicId: '507f1f77bcf86cd799439011',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('role');
      expect(errors[0].constraints?.isEnum).toContain(
        'role must be either doctor or staff',
      );
    });

    it('should reject missing role', async () => {
      const dto = plainToClass(SuggestWorkingHoursQueryDto, {
        clinicId: '507f1f77bcf86cd799439011',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('role');
    });
  });

  describe('clinicId validation', () => {
    it('should accept valid clinicId for doctor role', async () => {
      const dto = plainToClass(SuggestWorkingHoursQueryDto, {
        role: 'doctor',
        clinicId: '507f1f77bcf86cd799439011',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept missing clinicId (optional)', async () => {
      const dto = plainToClass(SuggestWorkingHoursQueryDto, {
        role: 'doctor',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject empty clinicId when provided', async () => {
      const dto = plainToClass(SuggestWorkingHoursQueryDto, {
        role: 'doctor',
        clinicId: '',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('clinicId');
      expect(errors[0].constraints?.isNotEmpty).toContain(
        'clinicId cannot be empty when provided',
      );
    });
  });

  describe('complexId validation', () => {
    it('should accept valid complexId for staff role', async () => {
      const dto = plainToClass(SuggestWorkingHoursQueryDto, {
        role: 'staff',
        complexId: '507f1f77bcf86cd799439012',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept missing complexId (optional)', async () => {
      const dto = plainToClass(SuggestWorkingHoursQueryDto, {
        role: 'staff',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject empty complexId when provided', async () => {
      const dto = plainToClass(SuggestWorkingHoursQueryDto, {
        role: 'staff',
        complexId: '',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('complexId');
      expect(errors[0].constraints?.isNotEmpty).toContain(
        'complexId cannot be empty when provided',
      );
    });
  });

  describe('combined validation', () => {
    it('should accept doctor role with clinicId', async () => {
      const dto = plainToClass(SuggestWorkingHoursQueryDto, {
        role: 'doctor',
        clinicId: '507f1f77bcf86cd799439011',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept staff role with complexId', async () => {
      const dto = plainToClass(SuggestWorkingHoursQueryDto, {
        role: 'staff',
        complexId: '507f1f77bcf86cd799439012',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept doctor role with both clinicId and complexId', async () => {
      const dto = plainToClass(SuggestWorkingHoursQueryDto, {
        role: 'doctor',
        clinicId: '507f1f77bcf86cd799439011',
        complexId: '507f1f77bcf86cd799439012',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('type safety', () => {
    it('should maintain type information', () => {
      const dto = new SuggestWorkingHoursQueryDto();
      dto.role = 'doctor';
      dto.clinicId = '507f1f77bcf86cd799439011';

      expect(dto.role).toBe('doctor');
      expect(dto.clinicId).toBe('507f1f77bcf86cd799439011');
    });

    it('should allow optional fields to be undefined', () => {
      const dto = new SuggestWorkingHoursQueryDto();
      dto.role = 'staff';

      expect(dto.role).toBe('staff');
      expect(dto.clinicId).toBeUndefined();
      expect(dto.complexId).toBeUndefined();
    });
  });
});
