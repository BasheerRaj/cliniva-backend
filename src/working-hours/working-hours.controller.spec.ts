import { Test, TestingModule } from '@nestjs/testing';
import { WorkingHoursController } from './working-hours.controller';
import { WorkingHoursService } from './working-hours.service';
import { WorkingHoursValidationService } from './services/working-hours-validation.service';
import { WorkingHoursSuggestionService } from './services/working-hours-suggestion.service';
import { AppointmentConflictService } from './services/appointment-conflict.service';
import { WorkingHoursReschedulingService } from './services/working-hours-rescheduling.service';
import { ValidateWorkingHoursDto } from './dto/validate-working-hours.dto';
import {
  CreateWorkingHoursDto,
  UpdateWorkingHoursDto,
} from './dto/create-working-hours.dto';
import { UnprocessableEntityException } from '@nestjs/common';

describe('WorkingHoursController - Validation Endpoint', () => {
  let controller: WorkingHoursController;
  let validationService: WorkingHoursValidationService;
  let workingHoursService: WorkingHoursService;

  const mockValidationService = {
    validateHierarchical: jest.fn(),
    validateAgainstParent: jest.fn(),
  };

  const mockSuggestionService = {
    getSuggestedHours: jest.fn(),
    getEntityDetails: jest.fn(),
  };

  const mockConflictService = {
    checkConflicts: jest.fn(),
    getAppointmentsByDay: jest.fn(),
    isAppointmentWithinHours: jest.fn(),
  };

  const mockReschedulingService = {
    updateWithRescheduling: jest.fn(),
    rescheduleAppointments: jest.fn(),
    markForRescheduling: jest.fn(),
    notifyPatients: jest.fn(),
  };

  const mockWorkingHoursService = {
    createWorkingHours: jest.fn(),
    updateWorkingHours: jest.fn(),
    getWorkingHours: jest.fn(),
    validateClinicHoursWithinComplex: jest.fn(),
    createWorkingHoursWithParentValidation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkingHoursController],
      providers: [
        {
          provide: WorkingHoursService,
          useValue: mockWorkingHoursService,
        },
        {
          provide: WorkingHoursValidationService,
          useValue: mockValidationService,
        },
        {
          provide: WorkingHoursSuggestionService,
          useValue: mockSuggestionService,
        },
        {
          provide: AppointmentConflictService,
          useValue: mockConflictService,
        },
        {
          provide: WorkingHoursReschedulingService,
          useValue: mockReschedulingService,
        },
      ],
    }).compile();

    controller = module.get<WorkingHoursController>(WorkingHoursController);
    validationService = module.get<WorkingHoursValidationService>(
      WorkingHoursValidationService,
    );
    workingHoursService = module.get<WorkingHoursService>(WorkingHoursService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /working-hours/validate', () => {
    it('should validate working hours successfully when valid', async () => {
      const validateDto: ValidateWorkingHoursDto = {
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
        ],
      };

      const mockValidationResult = {
        isValid: true,
        errors: [],
      };

      mockValidationService.validateHierarchical.mockResolvedValue(
        mockValidationResult,
      );

      const result = await controller.validateWorkingHours(validateDto);

      expect(result).toEqual({
        success: true,
        data: {
          isValid: true,
          errors: [],
        },
      });

      expect(validationService.validateHierarchical).toHaveBeenCalledWith(
        validateDto.schedule,
        validateDto.parentEntityType,
        validateDto.parentEntityId,
        `${validateDto.entityType} ${validateDto.entityId}`,
      );
    });

    it('should return validation errors when hours are invalid', async () => {
      const validateDto: ValidateWorkingHoursDto = {
        entityType: 'user',
        entityId: '507f1f77bcf86cd799439011',
        parentEntityType: 'clinic',
        parentEntityId: '507f1f77bcf86cd799439012',
        schedule: [
          {
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '07:00', // Before parent opening time
            closingTime: '17:00',
          },
        ],
      };

      const mockValidationResult = {
        isValid: false,
        errors: [
          {
            dayOfWeek: 'monday',
            message: {
              ar: 'ساعات العمل يجب أن تكون ضمن ساعات clinic',
              en: 'Working hours must be within clinic hours',
            },
            suggestedRange: {
              openingTime: '08:00',
              closingTime: '17:00',
            },
          },
        ],
      };

      mockValidationService.validateHierarchical.mockResolvedValue(
        mockValidationResult,
      );

      const result = await controller.validateWorkingHours(validateDto);

      expect(result).toEqual({
        success: true,
        data: {
          isValid: false,
          errors: mockValidationResult.errors,
        },
      });
    });

    it('should handle validation service errors gracefully', async () => {
      const validateDto: ValidateWorkingHoursDto = {
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
        ],
      };

      mockValidationService.validateHierarchical.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const result = await controller.validateWorkingHours(validateDto);

      expect(result).toEqual({
        success: false,
        data: {
          isValid: false,
          errors: [
            {
              dayOfWeek: 'general',
              message: {
                ar: 'فشل التحقق من صحة ساعات العمل',
                en: 'Failed to validate working hours',
              },
            },
          ],
        },
      });
    });

    it('should validate clinic hours against complex', async () => {
      const validateDto: ValidateWorkingHoursDto = {
        entityType: 'clinic',
        entityId: '507f1f77bcf86cd799439013',
        parentEntityType: 'complex',
        parentEntityId: '507f1f77bcf86cd799439014',
        schedule: [
          {
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '08:00',
            closingTime: '16:00',
          },
          {
            dayOfWeek: 'tuesday',
            isWorkingDay: false,
          },
        ],
      };

      const mockValidationResult = {
        isValid: true,
        errors: [],
      };

      mockValidationService.validateHierarchical.mockResolvedValue(
        mockValidationResult,
      );

      const result = await controller.validateWorkingHours(validateDto);

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(true);
      expect(result.data.errors).toHaveLength(0);
    });

    it('should return errors with suggested ranges', async () => {
      const validateDto: ValidateWorkingHoursDto = {
        entityType: 'user',
        entityId: '507f1f77bcf86cd799439011',
        parentEntityType: 'clinic',
        parentEntityId: '507f1f77bcf86cd799439012',
        schedule: [
          {
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '06:00',
            closingTime: '20:00',
          },
        ],
      };

      const mockValidationResult = {
        isValid: false,
        errors: [
          {
            dayOfWeek: 'monday',
            message: {
              ar: 'وقت الفتح يجب أن يكون في أو بعد 08:00',
              en: 'Opening time must be at or after 08:00',
            },
            suggestedRange: {
              openingTime: '08:00',
              closingTime: '18:00',
            },
          },
          {
            dayOfWeek: 'monday',
            message: {
              ar: 'وقت الإغلاق يجب أن يكون في أو قبل 18:00',
              en: 'Closing time must be at or before 18:00',
            },
            suggestedRange: {
              openingTime: '08:00',
              closingTime: '18:00',
            },
          },
        ],
      };

      mockValidationService.validateHierarchical.mockResolvedValue(
        mockValidationResult,
      );

      const result = await controller.validateWorkingHours(validateDto);

      expect(result.data.isValid).toBe(false);
      expect(result.data.errors).toHaveLength(2);
      expect(result.data.errors[0].suggestedRange).toBeDefined();
      expect(result.data.errors[0].suggestedRange?.openingTime).toBe('08:00');
      expect(result.data.errors[0].suggestedRange?.closingTime).toBe('18:00');
    });
  });

  describe('POST /working-hours - Create with Validation', () => {
    it('should create working hours successfully when validation passes', async () => {
      const createDto: CreateWorkingHoursDto = {
        entityType: 'user',
        entityId: '507f1f77bcf86cd799439011',
        schedule: [
          {
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '09:00',
            closingTime: '17:00',
          },
        ],
      };

      const mockValidationResult = {
        isValid: true,
        errors: [],
      };

      const mockCreatedHours = [
        {
          _id: '507f1f77bcf86cd799439020',
          entityType: 'user',
          entityId: '507f1f77bcf86cd799439011',
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
      ];

      mockValidationService.validateAgainstParent.mockResolvedValue(
        mockValidationResult,
      );
      mockWorkingHoursService.createWorkingHours.mockResolvedValue(
        mockCreatedHours,
      );

      const result = await controller.createWorkingHours(createDto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCreatedHours);
      expect(validationService.validateAgainstParent).toHaveBeenCalledWith(
        createDto.entityType,
        createDto.entityId,
        createDto.schedule,
      );
      expect(workingHoursService.createWorkingHours).toHaveBeenCalledWith(
        createDto,
      );
    });

    it('should throw UnprocessableEntityException when validation fails', async () => {
      const createDto: CreateWorkingHoursDto = {
        entityType: 'user',
        entityId: '507f1f77bcf86cd799439011',
        schedule: [
          {
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '07:00', // Before parent opening time
            closingTime: '17:00',
          },
        ],
      };

      const mockValidationResult = {
        isValid: false,
        errors: [
          {
            dayOfWeek: 'monday',
            message: {
              ar: 'ساعات العمل يجب أن تكون ضمن ساعات clinic',
              en: 'Working hours must be within clinic hours',
            },
            suggestedRange: {
              openingTime: '08:00',
              closingTime: '17:00',
            },
          },
        ],
      };

      mockValidationService.validateAgainstParent.mockResolvedValue(
        mockValidationResult,
      );

      await expect(controller.createWorkingHours(createDto)).rejects.toThrow(
        UnprocessableEntityException,
      );

      expect(validationService.validateAgainstParent).toHaveBeenCalledWith(
        createDto.entityType,
        createDto.entityId,
        createDto.schedule,
      );
      expect(workingHoursService.createWorkingHours).not.toHaveBeenCalled();
    });

    it('should include bilingual error messages in validation failure', async () => {
      const createDto: CreateWorkingHoursDto = {
        entityType: 'user',
        entityId: '507f1f77bcf86cd799439011',
        schedule: [
          {
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '07:00',
            closingTime: '17:00',
          },
        ],
      };

      const mockValidationResult = {
        isValid: false,
        errors: [
          {
            dayOfWeek: 'monday',
            message: {
              ar: 'ساعات العمل يجب أن تكون ضمن ساعات clinic',
              en: 'Working hours must be within clinic hours',
            },
          },
        ],
      };

      mockValidationService.validateAgainstParent.mockResolvedValue(
        mockValidationResult,
      );

      try {
        await controller.createWorkingHours(createDto);
        fail('Should have thrown UnprocessableEntityException');
      } catch (error) {
        expect(error).toBeInstanceOf(UnprocessableEntityException);
        const response = error.getResponse();
        expect(response.message).toHaveProperty('ar');
        expect(response.message).toHaveProperty('en');
        expect(response.code).toBe('HIERARCHICAL_VALIDATION_FAILED');
        expect(response.details.errors).toEqual(mockValidationResult.errors);
      }
    });
  });

  describe('PUT /working-hours/:entityType/:entityId - Update with Validation', () => {
    it('should update working hours successfully when validation passes', async () => {
      const updateDto: UpdateWorkingHoursDto = {
        schedule: [
          {
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '09:00',
            closingTime: '17:00',
          },
        ],
      };

      const mockValidationResult = {
        isValid: true,
        errors: [],
      };

      const mockUpdatedHours = [
        {
          _id: '507f1f77bcf86cd799439020',
          entityType: 'user',
          entityId: '507f1f77bcf86cd799439011',
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
      ];

      mockValidationService.validateAgainstParent.mockResolvedValue(
        mockValidationResult,
      );
      mockWorkingHoursService.updateWorkingHours.mockResolvedValue(
        mockUpdatedHours,
      );

      const result = await controller.updateWorkingHours(
        'user',
        '507f1f77bcf86cd799439011',
        updateDto,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdatedHours);
      expect(validationService.validateAgainstParent).toHaveBeenCalledWith(
        'user',
        '507f1f77bcf86cd799439011',
        updateDto.schedule,
      );
      expect(workingHoursService.updateWorkingHours).toHaveBeenCalledWith(
        'user',
        '507f1f77bcf86cd799439011',
        updateDto,
      );
    });

    it('should throw UnprocessableEntityException when validation fails', async () => {
      const updateDto: UpdateWorkingHoursDto = {
        schedule: [
          {
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '07:00', // Before parent opening time
            closingTime: '17:00',
          },
        ],
      };

      const mockValidationResult = {
        isValid: false,
        errors: [
          {
            dayOfWeek: 'monday',
            message: {
              ar: 'ساعات العمل يجب أن تكون ضمن ساعات clinic',
              en: 'Working hours must be within clinic hours',
            },
            suggestedRange: {
              openingTime: '08:00',
              closingTime: '17:00',
            },
          },
        ],
      };

      mockValidationService.validateAgainstParent.mockResolvedValue(
        mockValidationResult,
      );

      await expect(
        controller.updateWorkingHours(
          'user',
          '507f1f77bcf86cd799439011',
          updateDto,
        ),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(validationService.validateAgainstParent).toHaveBeenCalledWith(
        'user',
        '507f1f77bcf86cd799439011',
        updateDto.schedule,
      );
      expect(workingHoursService.updateWorkingHours).not.toHaveBeenCalled();
    });

    it('should validate even when validateWithParent query param is not provided', async () => {
      const updateDto: UpdateWorkingHoursDto = {
        schedule: [
          {
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '09:00',
            closingTime: '17:00',
          },
        ],
      };

      const mockValidationResult = {
        isValid: true,
        errors: [],
      };

      const mockUpdatedHours = [
        {
          _id: '507f1f77bcf86cd799439020',
          entityType: 'user',
          entityId: '507f1f77bcf86cd799439011',
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
      ];

      mockValidationService.validateAgainstParent.mockResolvedValue(
        mockValidationResult,
      );
      mockWorkingHoursService.updateWorkingHours.mockResolvedValue(
        mockUpdatedHours,
      );

      const result = await controller.updateWorkingHours(
        'user',
        '507f1f77bcf86cd799439011',
        updateDto,
        undefined, // No validateWithParent param
        undefined,
        undefined,
      );

      expect(result.success).toBe(true);
      expect(validationService.validateAgainstParent).toHaveBeenCalled();
    });
  });
});
