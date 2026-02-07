import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { OnboardingSkipLogicService } from '../../../src/onboarding/services/onboarding-skip-logic.service';
import { OnboardingProgressService } from '../../../src/onboarding/services/onboarding-progress.service';
import { User } from '../../../src/database/schemas/user.schema';
import { ONBOARDING_ERRORS } from '../../../src/onboarding/constants/onboarding-errors.constant';
import { OnboardingException } from '../../../src/onboarding/exceptions/onboarding.exception';

describe('OnboardingSkipLogicService', () => {
  let service: OnboardingSkipLogicService;
  let progressService: OnboardingProgressService;
  let userModel: any;

  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    planType: 'company',
    subscriptionId: '507f1f77bcf86cd799439012',
    save: jest.fn().mockResolvedValue(true),
  };

  const mockUserModel = {
    findById: jest.fn(),
    exec: jest.fn(),
  };

  const mockProgressService = {
    markStepSkipped: jest.fn(),
    updateProgress: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingSkipLogicService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: OnboardingProgressService,
          useValue: mockProgressService,
        },
      ],
    }).compile();

    service = module.get<OnboardingSkipLogicService>(
      OnboardingSkipLogicService,
    );
    progressService = module.get<OnboardingProgressService>(
      OnboardingProgressService,
    );
    userModel = module.get(getModelToken(User.name));

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('canSkipComplex', () => {
    it('should return true for company plan', () => {
      expect(service.canSkipComplex('company')).toBe(true);
    });

    it('should return false for complex plan', () => {
      expect(service.canSkipComplex('complex')).toBe(false);
    });

    it('should return false for clinic plan', () => {
      expect(service.canSkipComplex('clinic')).toBe(false);
    });
  });

  describe('getSkippedSteps', () => {
    it('should return all complex and clinic steps when skipping complex-overview', () => {
      const steps = service.getSkippedSteps('complex-overview');

      expect(steps).toEqual([
        'complex-overview',
        'complex-details',
        'complex-working-hours',
        'clinic-overview',
        'clinic-details',
        'clinic-working-hours',
      ]);
    });

    it('should return only the step itself for unknown steps', () => {
      const steps = service.getSkippedSteps('unknown-step');

      expect(steps).toEqual(['unknown-step']);
    });
  });

  describe('skipComplexStep', () => {
    it('should successfully skip complex for company plan user', async () => {
      // Arrange
      const userId = '507f1f77bcf86cd799439011';
      const subscriptionId = '507f1f77bcf86cd799439012';

      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const mockProgress = {
        userId,
        subscriptionId,
        planType: 'company',
        currentStep: 'dashboard',
        completedSteps: [],
        skippedSteps: [
          'complex-overview',
          'complex-details',
          'complex-working-hours',
          'clinic-overview',
          'clinic-details',
          'clinic-working-hours',
        ],
        stepData: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProgressService.updateProgress.mockResolvedValue(mockProgress);

      // Act
      const result = await service.skipComplexStep(userId, subscriptionId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.currentStep).toBe('dashboard');
      expect(result.skippedSteps).toHaveLength(6);
      expect(result.message.ar).toBeDefined();
      expect(result.message.en).toBeDefined();
      expect(mockProgressService.markStepSkipped).toHaveBeenCalledTimes(6);
      expect(mockProgressService.updateProgress).toHaveBeenCalledWith(
        userId,
        'dashboard',
      );
    });

    it('should throw error for non-company plan', async () => {
      // Arrange
      const userId = '507f1f77bcf86cd799439011';
      const subscriptionId = '507f1f77bcf86cd799439012';

      const complexPlanUser = {
        ...mockUser,
        planType: 'complex',
      };

      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(complexPlanUser),
      });

      // Act & Assert
      await expect(
        service.skipComplexStep(userId, subscriptionId),
      ).rejects.toThrow(OnboardingException);
    });

    it('should throw error for non-existent user', async () => {
      // Arrange
      const userId = '507f1f77bcf86cd799439011';
      const subscriptionId = '507f1f77bcf86cd799439012';

      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      // Act & Assert
      await expect(
        service.skipComplexStep(userId, subscriptionId),
      ).rejects.toThrow(OnboardingException);
    });

    it('should throw error for invalid userId format', async () => {
      // Arrange
      const invalidUserId = 'invalid-id';
      const subscriptionId = '507f1f77bcf86cd799439012';

      // Act & Assert
      await expect(
        service.skipComplexStep(invalidUserId, subscriptionId),
      ).rejects.toThrow(OnboardingException);
    });
  });
});
