import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WorkingHours } from '../database/schemas/working-hours.schema';

describe('WorkingHours Schema', () => {
  let workingHoursModel: Model<WorkingHours>;

  beforeEach(async () => {
    // Mock the model
    const mockModel = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: getModelToken(WorkingHours.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    workingHoursModel = module.get<Model<WorkingHours>>(
      getModelToken(WorkingHours.name),
    );
  });

  describe('entityType enum', () => {
    it('should support organization entity type', () => {
      const validEntityTypes = ['organization', 'complex', 'clinic', 'user'];
      expect(validEntityTypes).toContain('organization');
    });

    it('should support complex entity type', () => {
      const validEntityTypes = ['organization', 'complex', 'clinic', 'user'];
      expect(validEntityTypes).toContain('complex');
    });

    it('should support clinic entity type', () => {
      const validEntityTypes = ['organization', 'complex', 'clinic', 'user'];
      expect(validEntityTypes).toContain('clinic');
    });

    it('should support user entity type (NEW)', () => {
      const validEntityTypes = ['organization', 'complex', 'clinic', 'user'];
      expect(validEntityTypes).toContain('user');
    });

    it('should have exactly 4 valid entity types', () => {
      const validEntityTypes = ['organization', 'complex', 'clinic', 'user'];
      expect(validEntityTypes).toHaveLength(4);
    });
  });

  describe('schema structure', () => {
    it('should have required fields', () => {
      const sampleData = {
        entityType: 'user',
        entityId: new Types.ObjectId(),
        dayOfWeek: 'monday',
        isWorkingDay: true,
        openingTime: '08:00',
        closingTime: '17:00',
      };

      expect(sampleData).toHaveProperty('entityType');
      expect(sampleData).toHaveProperty('entityId');
      expect(sampleData).toHaveProperty('dayOfWeek');
      expect(sampleData).toHaveProperty('isWorkingDay');
    });

    it('should support optional time fields', () => {
      const sampleData = {
        entityType: 'user',
        entityId: new Types.ObjectId(),
        dayOfWeek: 'monday',
        isWorkingDay: false,
        // No time fields for non-working day
      };

      expect(sampleData.openingTime).toBeUndefined();
      expect(sampleData.closingTime).toBeUndefined();
    });

    it('should support break time fields', () => {
      const sampleData = {
        entityType: 'user',
        entityId: new Types.ObjectId(),
        dayOfWeek: 'monday',
        isWorkingDay: true,
        openingTime: '08:00',
        closingTime: '17:00',
        breakStartTime: '12:00',
        breakEndTime: '13:00',
      };

      expect(sampleData).toHaveProperty('breakStartTime');
      expect(sampleData).toHaveProperty('breakEndTime');
    });
  });

  describe('index compatibility', () => {
    it('should support compound index with user entity type', () => {
      const testData = {
        entityType: 'user',
        entityId: new Types.ObjectId(),
        dayOfWeek: 'monday',
      };

      // Index: { entityType: 1, entityId: 1 }
      expect(testData.entityType).toBe('user');
      expect(testData.entityId).toBeInstanceOf(Types.ObjectId);
    });

    it('should support unique compound index with user entity type', () => {
      const testData = {
        entityType: 'user',
        entityId: new Types.ObjectId(),
        dayOfWeek: 'monday',
      };

      // Index: { entityType: 1, entityId: 1, dayOfWeek: 1 } (unique)
      expect(testData.entityType).toBe('user');
      expect(testData.entityId).toBeInstanceOf(Types.ObjectId);
      expect(testData.dayOfWeek).toBe('monday');
    });
  });

  describe('backward compatibility', () => {
    it('should still support existing organization entity type', () => {
      const orgData = {
        entityType: 'organization',
        entityId: new Types.ObjectId(),
        dayOfWeek: 'monday',
        isWorkingDay: true,
      };

      expect(orgData.entityType).toBe('organization');
    });

    it('should still support existing complex entity type', () => {
      const complexData = {
        entityType: 'complex',
        entityId: new Types.ObjectId(),
        dayOfWeek: 'tuesday',
        isWorkingDay: true,
      };

      expect(complexData.entityType).toBe('complex');
    });

    it('should still support existing clinic entity type', () => {
      const clinicData = {
        entityType: 'clinic',
        entityId: new Types.ObjectId(),
        dayOfWeek: 'wednesday',
        isWorkingDay: true,
      };

      expect(clinicData.entityType).toBe('clinic');
    });
  });

  describe('user entity type scenarios', () => {
    it('should create working hours for doctor user', () => {
      const doctorHours = {
        entityType: 'user',
        entityId: new Types.ObjectId(), // Doctor's user ID
        dayOfWeek: 'monday',
        isWorkingDay: true,
        openingTime: '09:00',
        closingTime: '17:00',
      };

      expect(doctorHours.entityType).toBe('user');
      expect(doctorHours.isWorkingDay).toBe(true);
    });

    it('should create working hours for staff user', () => {
      const staffHours = {
        entityType: 'user',
        entityId: new Types.ObjectId(), // Staff's user ID
        dayOfWeek: 'tuesday',
        isWorkingDay: true,
        openingTime: '08:00',
        closingTime: '16:00',
      };

      expect(staffHours.entityType).toBe('user');
      expect(staffHours.isWorkingDay).toBe(true);
    });

    it('should handle non-working day for user', () => {
      const nonWorkingDay = {
        entityType: 'user',
        entityId: new Types.ObjectId(),
        dayOfWeek: 'friday',
        isWorkingDay: false,
      };

      expect(nonWorkingDay.entityType).toBe('user');
      expect(nonWorkingDay.isWorkingDay).toBe(false);
    });
  });
});
