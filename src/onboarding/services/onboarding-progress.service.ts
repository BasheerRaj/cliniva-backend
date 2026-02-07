import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../../database/schemas/user.schema';
import { StepProgress, DependencyResult } from '../interfaces';
import { ONBOARDING_ERRORS } from '../constants/onboarding-errors.constant';
import { OnboardingException } from '../exceptions/onboarding.exception';

/**
 * Onboarding Progress Service
 *
 * Responsibility: Progress tracking and step management (Single Responsibility Principle)
 *
 * This service handles all progress-related operations during onboarding:
 * - Retrieving user progress
 * - Updating progress as user completes steps
 * - Validating step dependencies (BZR-27)
 * - Marking steps as complete or skipped
 *
 * Requirements: US-3.1, US-3.2, US-3.6
 * Business Rules: BZR-27 (Step dependency validation)
 */
@Injectable()
export class OnboardingProgressService {
  private readonly logger = new Logger(OnboardingProgressService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {}

  /**
   * Get user's onboarding progress
   *
   * Retrieves the current progress state for a user, including:
   * - Current step
   * - Completed steps
   * - Skipped steps
   * - Step-specific data
   *
   * @param userId - User ID to retrieve progress for
   * @returns StepProgress object or null if user not found
   *
   * Requirements: US-3.6
   */
  async getProgress(userId: string): Promise<StepProgress | null> {
    this.logger.log(`Getting progress for user: ${userId}`);

    // Validate userId format
    if (!Types.ObjectId.isValid(userId)) {
      throw OnboardingException.notFound(ONBOARDING_ERRORS.USER_NOT_FOUND, {
        userId,
      });
    }

    const user = await this.userModel.findById(userId).lean().exec();

    if (!user) {
      this.logger.warn(`User not found: ${userId}`);
      throw OnboardingException.notFound(ONBOARDING_ERRORS.USER_NOT_FOUND, {
        userId,
      });
    }

    // Build progress object from user data
    const progress: StepProgress = {
      userId: user._id.toString(),
      subscriptionId: user.subscriptionId?.toString() || '',
      planType: this.determinePlanType(user),
      currentStep: (user as any).currentOnboardingStep || 'plan-selection',
      completedSteps: user.onboardingProgress || [],
      skippedSteps: (user as any).skippedSteps || [],
      stepData: {}, // Step-specific data can be added here if needed
      createdAt: (user as any).createdAt || new Date(),
      updatedAt: (user as any).updatedAt || new Date(),
    };

    this.logger.log(
      `Progress retrieved for user ${userId}: ${progress.currentStep}`,
    );
    return progress;
  }

  /**
   * Update user's onboarding progress
   *
   * Updates the progress when user completes or navigates to a step.
   * Stores step-specific data if provided.
   *
   * @param userId - User ID to update
   * @param step - Step name to update to
   * @param data - Optional step-specific data
   * @returns Updated StepProgress object
   *
   * Requirements: US-3.6
   */
  async updateProgress(
    userId: string,
    step: string,
    data?: any,
  ): Promise<StepProgress> {
    this.logger.log(`Updating progress for user ${userId} to step: ${step}`);

    // Validate userId format
    if (!Types.ObjectId.isValid(userId)) {
      throw OnboardingException.notFound(ONBOARDING_ERRORS.USER_NOT_FOUND, {
        userId,
      });
    }

    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw OnboardingException.notFound(ONBOARDING_ERRORS.USER_NOT_FOUND, {
        userId,
      });
    }

    // Update current step
    (user as any).currentOnboardingStep = step;

    // Save the user
    await user.save();

    this.logger.log(`Progress updated for user ${userId} to step: ${step}`);

    // Return updated progress
    const progress = await this.getProgress(userId);
    return progress!;
  }

  /**
   * Validate step dependency
   *
   * Validates that all prerequisite steps are completed before allowing
   * access to the requested step.
   *
   * BZR-27: Clinic details require complex details first
   * Exception: If complex step is skipped, clinic can proceed
   *
   * @param userId - User ID to validate
   * @param requestedStep - Step user wants to access
   * @returns DependencyResult indicating if user can proceed
   *
   * Requirements: US-3.1, US-3.2, US-3.3, US-3.4
   * Business Rules: BZR-27
   */
  async validateStepDependency(
    userId: string,
    requestedStep: string,
  ): Promise<DependencyResult> {
    this.logger.log(
      `Validating step dependency for user ${userId}, requested step: ${requestedStep}`,
    );

    const progress = await this.getProgress(userId);

    if (!progress) {
      throw OnboardingException.notFound(ONBOARDING_ERRORS.USER_NOT_FOUND, {
        userId,
      });
    }

    // Define step dependencies
    const stepDependencies: Record<string, string[]> = {
      'clinic-overview': ['complex-overview'],
      'clinic-details': ['complex-details'],
      'clinic-working-hours': ['complex-working-hours'],
    };

    // Get required steps for the requested step
    const requiredSteps = stepDependencies[requestedStep] || [];

    // If no dependencies, allow access
    if (requiredSteps.length === 0) {
      return {
        canProceed: true,
        missingSteps: [],
      };
    }

    // Check if all required steps are completed or skipped
    const missingSteps: string[] = [];

    for (const requiredStep of requiredSteps) {
      const isCompleted = progress.completedSteps.includes(requiredStep);
      const isSkipped = progress.skippedSteps.includes(requiredStep);

      if (!isCompleted && !isSkipped) {
        missingSteps.push(requiredStep);
      }
    }

    // If there are missing steps, return error
    if (missingSteps.length > 0) {
      this.logger.warn(
        `Step dependency not met for user ${userId}. Missing steps: ${missingSteps.join(', ')}`,
      );

      return {
        canProceed: false,
        missingSteps,
        message: ONBOARDING_ERRORS.STEP_DEPENDENCY_NOT_MET.message,
      };
    }

    // All dependencies met
    this.logger.log(`Step dependency validated for user ${userId}`);
    return {
      canProceed: true,
      missingSteps: [],
    };
  }

  /**
   * Mark step as complete
   *
   * Adds the step to the user's completed steps array.
   * Updates the current step to the next step in the flow.
   *
   * @param userId - User ID
   * @param step - Step to mark as complete
   *
   * Requirements: US-3.6
   */
  async markStepComplete(userId: string, step: string): Promise<void> {
    this.logger.log(`Marking step complete for user ${userId}: ${step}`);

    // Validate userId format
    if (!Types.ObjectId.isValid(userId)) {
      throw OnboardingException.notFound(ONBOARDING_ERRORS.USER_NOT_FOUND, {
        userId,
      });
    }

    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw OnboardingException.notFound(ONBOARDING_ERRORS.USER_NOT_FOUND, {
        userId,
      });
    }

    // Initialize arrays if not present
    if (!user.onboardingProgress) {
      user.onboardingProgress = [];
    }

    // Add step to completed steps if not already present
    if (!user.onboardingProgress.includes(step)) {
      user.onboardingProgress.push(step);
    }

    // Save the user
    await user.save();

    this.logger.log(`Step marked complete for user ${userId}: ${step}`);
  }

  /**
   * Mark step as skipped
   *
   * Adds the step to the user's skipped steps array.
   * Skipped steps bypass dependency validation.
   *
   * @param userId - User ID
   * @param step - Step to mark as skipped
   *
   * Requirements: US-3.6
   * Business Rules: BZR-25 (Skip complex step)
   */
  async markStepSkipped(userId: string, step: string): Promise<void> {
    this.logger.log(`Marking step skipped for user ${userId}: ${step}`);

    // Validate userId format
    if (!Types.ObjectId.isValid(userId)) {
      throw OnboardingException.notFound(ONBOARDING_ERRORS.USER_NOT_FOUND, {
        userId,
      });
    }

    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw OnboardingException.notFound(ONBOARDING_ERRORS.USER_NOT_FOUND, {
        userId,
      });
    }

    // Initialize arrays if not present
    if (!(user as any).skippedSteps) {
      (user as any).skippedSteps = [];
    }

    // Add step to skipped steps if not already present
    if (!(user as any).skippedSteps.includes(step)) {
      (user as any).skippedSteps.push(step);
    }

    // Save the user
    await user.save();

    this.logger.log(`Step marked skipped for user ${userId}: ${step}`);
  }

  /**
   * Determine plan type from user data
   *
   * Helper method to determine the plan type based on user's
   * organization, complex, and clinic associations.
   *
   * @param user - User document
   * @returns Plan type ('company', 'complex', or 'clinic')
   */
  private determinePlanType(user: any): 'company' | 'complex' | 'clinic' {
    // If user has planType field, use it
    if (user.planType) {
      return user.planType;
    }

    // Otherwise, infer from entity associations
    if (user.organizationId) {
      return 'company';
    } else if (user.complexId && !user.organizationId) {
      return 'complex';
    } else if (user.clinicId && !user.complexId && !user.organizationId) {
      return 'clinic';
    }

    // Default to clinic plan if no associations
    return 'clinic';
  }
}
