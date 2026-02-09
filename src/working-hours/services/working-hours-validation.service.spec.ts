import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { WorkingHoursValidationService } from './working-hours-validation.service';
import { WorkingHours } from '../../database/schemas/working-hours.schema';
import { Types } from 'mongoose';

describe('WorkingHoursValidationService', () => {
  let service: WorkingHoursValidationService;
  let mockWorkingHoursModel: any;
  let mockUserModel: any;
  let mockClinicModel: any;
  let mockComplexModel: any;

  beforeEach(async () => {
    // Mock the WorkingHours model
    mockWorkingHoursModel = {
      find: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    // Mock the User model
    mockUserModel = {
      findById: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    // Mock the Clinic model
    mockClinicModel = {
      findById: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    // Mock the Complex model
    mockComplexModel = {
      findById: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkingHoursValidationService,
        {
          provide: getModelToken('WorkingHours'),
          useValue: mockWorkingHoursModel,
        },
        {
          provide: getModelToken('User'),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken('Clinic'),
          useValue: mockClinicModel,
        },
        {
          provide: getModelToken('Complex'),
          useValue: mockComplexModel,
        },
      ],
    }).compile();

    service = module.get<WorkingHoursValidationService>(
      WorkingHoursValidationService,
    );

    // Reset all mocks before each test
    jest.clearAllMocks();
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

      mockWorkingHoursModel.select.mockReturnThis();
      mockWorkingHoursModel.lean.mockReturnThis();
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

      mockWorkingHoursModel.select.mockReturnThis();
      mockWorkingHoursModel.lean.mockReturnThis();
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

      mockWorkingHoursModel.select.mockReturnThis();
      mockWorkingHoursModel.lean.mockReturnThis();
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

      mockWorkingHoursModel.select.mockReturnThis();
      mockWorkingHoursModel.lean.mockReturnThis();
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

      // Mock the chain properly
      mockWorkingHoursModel.select.mockReturnThis();
      mockWorkingHoursModel.lean.mockReturnThis();
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

      mockWorkingHoursModel.select.mockReturnThis();
      mockWorkingHoursModel.lean.mockReturnThis();
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

  describe('validateAgainstParent', () => {
    it('should validate user hours against clinic hours', async () => {
      const userId = new Types.ObjectId();
      const clinicId = new Types.ObjectId();

      // Mock user with clinicId
      mockUserModel.exec.mockResolvedValue({
        _id: userId,
        clinicId: clinicId,
        firstName: 'John',
        lastName: 'Doe',
      });

      // Mock clinic working hours
      const clinicHours = [
        {
          entityType: 'clinic',
          entityId: clinicId,
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '08:00',
          closingTime: '17:00',
          isActive: true,
        },
      ];

      mockWorkingHoursModel.select.mockReturnThis();
      mockWorkingHoursModel.lean.mockReturnThis();
      mockWorkingHoursModel.exec.mockResolvedValue(clinicHours);

      const userSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '16:00',
        },
      ];

      const result = await service.validateAgainstParent(
        'user',
        userId.toString(),
        userSchedule,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockUserModel.findById).toHaveBeenCalledWith(userId.toString());
    });

    it('should validate clinic hours against complex hours', async () => {
      const clinicId = new Types.ObjectId();
      const complexId = new Types.ObjectId();

      // Mock clinic with complexId
      mockClinicModel.exec.mockResolvedValue({
        _id: clinicId,
        complexId: complexId,
        name: 'Test Clinic',
      });

      // Mock complex working hours
      const complexHours = [
        {
          entityType: 'complex',
          entityId: complexId,
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '08:00',
          closingTime: '18:00',
          isActive: true,
        },
      ];

      mockWorkingHoursModel.select.mockReturnThis();
      mockWorkingHoursModel.lean.mockReturnThis();
      mockWorkingHoursModel.exec.mockResolvedValue(complexHours);

      const clinicSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
      ];

      const result = await service.validateAgainstParent(
        'clinic',
        clinicId.toString(),
        clinicSchedule,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockClinicModel.findById).toHaveBeenCalledWith(
        clinicId.toString(),
      );
    });

    it('should validate complex hours against organization hours', async () => {
      const complexId = new Types.ObjectId();
      const organizationId = new Types.ObjectId();

      // Mock complex with organizationId
      mockComplexModel.exec.mockResolvedValue({
        _id: complexId,
        organizationId: organizationId,
        name: 'Test Complex',
      });

      // Mock organization working hours
      const organizationHours = [
        {
          entityType: 'organization',
          entityId: organizationId,
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '07:00',
          closingTime: '19:00',
          isActive: true,
        },
      ];

      mockWorkingHoursModel.select.mockReturnThis();
      mockWorkingHoursModel.lean.mockReturnThis();
      mockWorkingHoursModel.exec.mockResolvedValue(organizationHours);

      const complexSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '08:00',
          closingTime: '18:00',
        },
      ];

      const result = await service.validateAgainstParent(
        'complex',
        complexId.toString(),
        complexSchedule,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockComplexModel.findById).toHaveBeenCalledWith(
        complexId.toString(),
      );
    });

    it('should pass validation when entity has no parent', async () => {
      const userId = new Types.ObjectId();

      // Mock user without clinicId
      mockUserModel.exec.mockResolvedValue({
        _id: userId,
        clinicId: null,
        firstName: 'John',
        lastName: 'Doe',
      });

      const userSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
      ];

      const result = await service.validateAgainstParent(
        'user',
        userId.toString(),
        userSchedule,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation for organization (top level)', async () => {
      const organizationId = new Types.ObjectId();

      const organizationSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '08:00',
          closingTime: '18:00',
        },
      ];

      const result = await service.validateAgainstParent(
        'organization',
        organizationId.toString(),
        organizationSchedule,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when user hours exceed clinic hours', async () => {
      const userId = new Types.ObjectId();
      const clinicId = new Types.ObjectId();

      // Mock user with clinicId
      mockUserModel.exec.mockResolvedValue({
        _id: userId,
        clinicId: clinicId,
        firstName: 'John',
        lastName: 'Doe',
      });

      // Mock clinic working hours
      const clinicHours = [
        {
          entityType: 'clinic',
          entityId: clinicId,
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '08:00',
          closingTime: '17:00',
          isActive: true,
        },
      ];

      mockWorkingHoursModel.select.mockReturnThis();
      mockWorkingHoursModel.lean.mockReturnThis();
      mockWorkingHoursModel.exec.mockResolvedValue(clinicHours);

      const userSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '07:00', // Before clinic opening
          closingTime: '18:00', // After clinic closing
        },
      ];

      const result = await service.validateAgainstParent(
        'user',
        userId.toString(),
        userSchedule,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
