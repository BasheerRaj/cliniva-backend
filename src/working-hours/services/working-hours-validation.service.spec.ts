import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { WorkingHoursValidationService } from './working-hours-validation.service';
import { WorkingHours } from '../../database/schemas/working-hours.schema';
import { Types } from 'mongoose';

describe('WorkingHoursValidationService', () => {
  let service: WorkingHoursValidationService;
  let mockWorkingHoursModel: any;

  beforeEach(async () => {
    // Mock the WorkingHours model
    mockWorkingHoursModel = {
      find: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkingHoursValidationService,
        {
          provide: getModelToken('WorkingHours'),
          useValue: mockWorkingHoursModel,
        },
      ],
    }).compile();

    service = module.get<WorkingHoursValidationService>(
      WorkingHoursValidationService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getParentWorkingHours', () => {
    it('should retrieve parent working hours from database', async () => {
      const mockParentHours = [
        {
          entityType: 'complex',
          entityId: new Types.ObjectId(),
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '08:00',
          closingTime: '17:00',
          isActive: true,
        },
      ];

      mockWorkingHoursModel.exec.mockResolvedValue(mockParentHours);

      const result = await service.getParentWorkingHours(
        'complex',
        '507f1f77bcf86cd799439011',
      );

      expect(result).toEqual(mockParentHours);
      expect(mockWorkingHoursModel.find).toHaveBeenCalledWith({
        entityType: 'complex',
        entityId: expect.any(Types.ObjectId),
        isActive: true,
      });
    });
  });

  describe('validateHierarchical', () => {
    it('should pass validation when child hours are within parent hours', async () => {
      const parentHours = [
        {
          entityType: 'complex',
          entityId: new Types.ObjectId(),
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '08:00',
          closingTime: '17:00',
          isActive: true,
        },
      ];

      const childSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '16:00',
        },
      ];

      mockWorkingHoursModel.exec.mockResolvedValue(parentHours);

      const result = await service.validateHierarchical(
        childSchedule,
        'complex',
        '507f1f77bcf86cd799439011',
        'Clinic ABC',
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when child opens before parent', async () => {
      const parentHours = [
        {
          entityType: 'complex',
          entityId: new Types.ObjectId(),
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '08:00',
          closingTime: '17:00',
          isActive: true,
        },
      ];

      const childSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '07:00', // Before parent opening
          closingTime: '16:00',
        },
      ];

      mockWorkingHoursModel.exec.mockResolvedValue(parentHours);

      const result = await service.validateHierarchical(
        childSchedule,
        'complex',
        '507f1f77bcf86cd799439011',
        'Clinic ABC',
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].dayOfWeek).toBe('monday');
      expect(result.errors[0].suggestedRange).toBeDefined();
    });

    it('should fail validation when child closes after parent', async () => {
      const parentHours = [
        {
          entityType: 'complex',
          entityId: new Types.ObjectId(),
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '08:00',
          closingTime: '17:00',
          isActive: true,
        },
      ];

      const childSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '18:00', // After parent closing
        },
      ];

      mockWorkingHoursModel.exec.mockResolvedValue(parentHours);

      const result = await service.validateHierarchical(
        childSchedule,
        'complex',
        '507f1f77bcf86cd799439011',
        'Clinic ABC',
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].dayOfWeek).toBe('monday');
    });

    it('should fail validation when child is open but parent is closed', async () => {
      const parentHours = [
        {
          entityType: 'complex',
          entityId: new Types.ObjectId(),
          dayOfWeek: 'monday',
          isWorkingDay: false, // Parent closed
          isActive: true,
        },
      ];

      const childSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true, // Child open
          openingTime: '09:00',
          closingTime: '16:00',
        },
      ];

      mockWorkingHoursModel.exec.mockResolvedValue(parentHours);

      const result = await service.validateHierarchical(
        childSchedule,
        'complex',
        '507f1f77bcf86cd799439011',
        'Clinic ABC',
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message.en).toContain('closed');
    });

    it('should pass validation when parent has no working hours', async () => {
      const childSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '16:00',
        },
      ];

      mockWorkingHoursModel.exec.mockResolvedValue([]); // No parent hours

      const result = await service.validateHierarchical(
        childSchedule,
        'complex',
        '507f1f77bcf86cd799439011',
        'Clinic ABC',
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('generateSuggestions', () => {
    it('should generate suggestions based on parent hours', () => {
      const parentSchedule = [
        {
          entityType: 'complex',
          entityId: new Types.ObjectId(),
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '08:00',
          closingTime: '17:00',
          isActive: true,
        } as WorkingHours,
        {
          entityType: 'complex',
          entityId: new Types.ObjectId(),
          dayOfWeek: 'tuesday',
          isWorkingDay: true,
          openingTime: '08:00',
          closingTime: '17:00',
          isActive: true,
        } as WorkingHours,
      ];

      const childSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '16:00',
        },
        {
          dayOfWeek: 'tuesday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '16:00',
        },
      ];

      const suggestions = service.generateSuggestions(
        parentSchedule,
        childSchedule,
      );

      expect(suggestions.size).toBe(2);
      expect(suggestions.get('monday')).toEqual({
        openingTime: '08:00',
        closingTime: '17:00',
      });
      expect(suggestions.get('tuesday')).toEqual({
        openingTime: '08:00',
        closingTime: '17:00',
      });
    });

    it('should not generate suggestions for non-working days', () => {
      const parentSchedule = [
        {
          entityType: 'complex',
          entityId: new Types.ObjectId(),
          dayOfWeek: 'monday',
          isWorkingDay: false, // Not working
          isActive: true,
        } as WorkingHours,
      ];

      const childSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: false,
        },
      ];

      const suggestions = service.generateSuggestions(
        parentSchedule,
        childSchedule,
      );

      expect(suggestions.size).toBe(0);
    });
  });
});
