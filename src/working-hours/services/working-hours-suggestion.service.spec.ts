import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { WorkingHoursSuggestionService } from './working-hours-suggestion.service';
import { Types } from 'mongoose';

/**
 * Unit Tests for WorkingHoursSuggestionService
 *
 * Tests the auto-fill suggestion logic for working hours based on role and entity assignment.
 *
 * Business Rules Tested:
 * - BZR-h5e4c7a0: Doctors auto-fill from assigned clinic
 * - BZR-r2b4e5c7: Staff auto-fill from assigned complex
 * - Auto-filled hours are editable within constraints
 *
 * Test Coverage:
 * - getSuggestedHours() method for doctor role
 * - getSuggestedHours() method for staff role
 * - getEntityDetails() method for clinic and complex
 * - Error handling for missing parent hours
 * - Error handling for invalid roles
 * - Error handling for missing entity IDs
 */
describe('WorkingHoursSuggestionService', () => {
  let service: WorkingHoursSuggestionService;
  let mockWorkingHoursModel: any;
  let mockClinicModel: any;
  let mockComplexModel: any;

  const clinicId = new Types.ObjectId();
  const complexId = new Types.ObjectId();

  beforeEach(async () => {
    // Mock the WorkingHours model
    mockWorkingHoursModel = {
      find: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    // Mock the Clinic model
    mockClinicModel = {
      findById: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    // Mock the Complex model
    mockComplexModel = {
      findById: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkingHoursSuggestionService,
        {
          provide: getModelToken('WorkingHours'),
          useValue: mockWorkingHoursModel,
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

    service = module.get<WorkingHoursSuggestionService>(
      WorkingHoursSuggestionService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSuggestedHours - Doctor Role', () => {
    it('should return suggested hours from clinic for doctor role', async () => {
      const mockClinicHours = [
        {
          entityType: 'clinic',
          entityId: clinicId,
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '08:00',
          closingTime: '17:00',
          breakStartTime: '12:00',
          breakEndTime: '13:00',
          isActive: true,
        },
        {
          entityType: 'clinic',
          entityId: clinicId,
          dayOfWeek: 'tuesday',
          isWorkingDay: true,
          openingTime: '08:00',
          closingTime: '17:00',
          isActive: true,
        },
        {
          entityType: 'clinic',
          entityId: clinicId,
          dayOfWeek: 'wednesday',
          isWorkingDay: false,
          isActive: true,
        },
      ];

      const mockClinic = {
        _id: clinicId,
        name: 'Test Clinic',
      };

      mockWorkingHoursModel.exec.mockResolvedValue(mockClinicHours);
      mockClinicModel.exec.mockResolvedValue(mockClinic);

      const result = await service.getSuggestedHours(
        'doctor',
        clinicId.toString(),
        undefined,
      );

      expect(result).toBeDefined();
      expect(result.suggestedSchedule).toHaveLength(3);
      expect(result.suggestedSchedule[0]).toEqual({
        dayOfWeek: 'monday',
        isWorkingDay: true,
        openingTime: '08:00',
        closingTime: '17:00',
        breakStartTime: '12:00',
        breakEndTime: '13:00',
      });
      expect(result.suggestedSchedule[1]).toEqual({
        dayOfWeek: 'tuesday',
        isWorkingDay: true,
        openingTime: '08:00',
        closingTime: '17:00',
        breakStartTime: undefined,
        breakEndTime: undefined,
      });
      expect(result.suggestedSchedule[2]).toEqual({
        dayOfWeek: 'wednesday',
        isWorkingDay: false,
        openingTime: undefined,
        closingTime: undefined,
        breakStartTime: undefined,
        breakEndTime: undefined,
      });
      expect(result.source).toEqual({
        entityType: 'clinic',
        entityId: clinicId.toString(),
        entityName: 'Test Clinic',
      });
      expect(result.canModify).toBe(true);

      expect(mockWorkingHoursModel.find).toHaveBeenCalledWith({
        entityType: 'clinic',
        entityId: expect.any(Types.ObjectId),
        isActive: true,
      });
    });

    it('should throw NotFoundException when clinicId is missing for doctor role', async () => {
      await expect(
        service.getSuggestedHours('doctor', undefined, undefined),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when clinic has no working hours', async () => {
      mockWorkingHoursModel.exec.mockResolvedValue([]);

      await expect(
        service.getSuggestedHours('doctor', clinicId.toString(), undefined),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when clinic does not exist', async () => {
      const mockClinicHours = [
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

      mockWorkingHoursModel.exec.mockResolvedValue(mockClinicHours);
      mockClinicModel.exec.mockResolvedValue(null);

      await expect(
        service.getSuggestedHours('doctor', clinicId.toString(), undefined),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSuggestedHours - Staff Role', () => {
    it('should return suggested hours from complex for staff role', async () => {
      const mockComplexHours = [
        {
          entityType: 'complex',
          entityId: complexId,
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '07:00',
          closingTime: '18:00',
          isActive: true,
        },
        {
          entityType: 'complex',
          entityId: complexId,
          dayOfWeek: 'tuesday',
          isWorkingDay: true,
          openingTime: '07:00',
          closingTime: '18:00',
          breakStartTime: '12:00',
          breakEndTime: '13:00',
          isActive: true,
        },
      ];

      const mockComplex = {
        _id: complexId,
        name: 'Test Complex',
      };

      mockWorkingHoursModel.exec.mockResolvedValue(mockComplexHours);
      mockComplexModel.exec.mockResolvedValue(mockComplex);

      const result = await service.getSuggestedHours(
        'staff',
        undefined,
        complexId.toString(),
      );

      expect(result).toBeDefined();
      expect(result.suggestedSchedule).toHaveLength(2);
      expect(result.suggestedSchedule[0]).toEqual({
        dayOfWeek: 'monday',
        isWorkingDay: true,
        openingTime: '07:00',
        closingTime: '18:00',
        breakStartTime: undefined,
        breakEndTime: undefined,
      });
      expect(result.suggestedSchedule[1]).toEqual({
        dayOfWeek: 'tuesday',
        isWorkingDay: true,
        openingTime: '07:00',
        closingTime: '18:00',
        breakStartTime: '12:00',
        breakEndTime: '13:00',
      });
      expect(result.source).toEqual({
        entityType: 'complex',
        entityId: complexId.toString(),
        entityName: 'Test Complex',
      });
      expect(result.canModify).toBe(true);

      expect(mockWorkingHoursModel.find).toHaveBeenCalledWith({
        entityType: 'complex',
        entityId: expect.any(Types.ObjectId),
        isActive: true,
      });
    });

    it('should throw NotFoundException when complexId is missing for staff role', async () => {
      await expect(
        service.getSuggestedHours('staff', undefined, undefined),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when complex has no working hours', async () => {
      mockWorkingHoursModel.exec.mockResolvedValue([]);

      await expect(
        service.getSuggestedHours('staff', undefined, complexId.toString()),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when complex does not exist', async () => {
      const mockComplexHours = [
        {
          entityType: 'complex',
          entityId: complexId,
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '07:00',
          closingTime: '18:00',
          isActive: true,
        },
      ];

      mockWorkingHoursModel.exec.mockResolvedValue(mockComplexHours);
      mockComplexModel.exec.mockResolvedValue(null);

      await expect(
        service.getSuggestedHours('staff', undefined, complexId.toString()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSuggestedHours - Invalid Role', () => {
    it('should throw NotFoundException for invalid role', async () => {
      await expect(
        service.getSuggestedHours('invalid' as any, clinicId.toString(), undefined),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getEntityDetails', () => {
    it('should return clinic details', async () => {
      const mockClinic = {
        _id: clinicId,
        name: 'Test Clinic',
      };

      mockClinicModel.exec.mockResolvedValue(mockClinic);

      const result = await service.getEntityDetails('clinic', clinicId.toString());

      expect(result).toEqual({
        entityType: 'clinic',
        entityId: clinicId.toString(),
        entityName: 'Test Clinic',
      });

      expect(mockClinicModel.findById).toHaveBeenCalledWith(
        expect.any(Types.ObjectId),
      );
      expect(mockClinicModel.select).toHaveBeenCalledWith('name');
    });

    it('should return complex details', async () => {
      const mockComplex = {
        _id: complexId,
        name: 'Test Complex',
      };

      mockComplexModel.exec.mockResolvedValue(mockComplex);

      const result = await service.getEntityDetails('complex', complexId.toString());

      expect(result).toEqual({
        entityType: 'complex',
        entityId: complexId.toString(),
        entityName: 'Test Complex',
      });

      expect(mockComplexModel.findById).toHaveBeenCalledWith(
        expect.any(Types.ObjectId),
      );
      expect(mockComplexModel.select).toHaveBeenCalledWith('name');
    });

    it('should throw NotFoundException when clinic does not exist', async () => {
      mockClinicModel.exec.mockResolvedValue(null);

      await expect(
        service.getEntityDetails('clinic', clinicId.toString()),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when complex does not exist', async () => {
      mockComplexModel.exec.mockResolvedValue(null);

      await expect(
        service.getEntityDetails('complex', complexId.toString()),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for invalid entity type', async () => {
      await expect(
        service.getEntityDetails('invalid', clinicId.toString()),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
