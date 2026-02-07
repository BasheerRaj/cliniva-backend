import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../../database/schemas/user.schema';
import { SkipResult } from '../interfaces';
import { ONBOARDING_ERRORS } from '../constants/onboarding-errors.constant';
import { OnboardingException } from '../exceptions/onboarding.exception';
import { OnboardingProgressService } from './onboarding-progress.service';

/**
 * Onboarding Skip Logic Service
 *
 * Responsibility: Skip logic implementation (Single Responsibility Principle)
 *
 * This service handles all skip-related operations during onboarding:
 * - Skipping complex step (BZR-25)
 * - Validating skip permissions based on plan type
 * - Determining which steps to skip
 * - Integrating with progress service for updates
 *
 * Requirements: US-1.1, US-1.2, US-1.3, US-1.4, US-1.6, US-1.7
 * Business Rules: BZR-25 (Skip complex → skip clinic, company plan only)
 */
@Injectable()
export class OnboardingSkipLogicService {
  private readonly logger = new Logger(OnboardingSkipLogicService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    private readonly progressService: OnboardingProgressService,
  ) {}

  /**
   * Skip complex step
   *
   * Allows company plan users to skip the complex and clinic setup steps.
   * When complex is skipped, clinic is automatically skipped as well (BZR-25).
   *
   * Process:
   * 1. Validate user exists
   * 2. Check plan type is 'company'
   * 3. Mark complex and clinic steps as skipped
   * 4. Update current step to 'dashboard'
   * 5. Return success result with bilingual message
   *
   * @param userId - User ID to skip complex for
   * @param subscriptionId - Subscription ID for validation
   * @returns SkipResult with updated progress and bilingual message
   *
   * @throws OnboardingException if user not found
   * @throws OnboardingException if plan type is not 'company'
   *
   * Requirements: US-1.1, US-1.2, US-1.3, US-1.4, US-1.6, US-1.7
   * Business Rules: BZR-25
   */
  async skipComplexStep(
    userId: string,
    subscriptionId: string,
  ): Promise<SkipResult> {
    this.logger.log(`Skip complex requested for user: ${userId}`);

    // Validate userId format
    if (!Types.ObjectId.isValid(userId)) {
      throw OnboardingException.notFound(ONBOARDING_ERRORS.USER_NOT_FOUND, {
        userId,
      });
    }

    // Get user to check plan type
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      this.logger.warn(`User not found: ${userId}`);
      throw OnboardingException.notFound(ONBOARDING_ERRORS.USER_NOT_FOUND, {
        userId,
      });
    }

    // Check if user can skip complex (only company plan)
    const planType = user.planType || this.determinePlanType(user);

    if (!this.canSkipComplex(planType)) {
      this.logger.warn(
        `Skip complex not allowed for plan type: ${planType}, user: ${userId}`,
      );
      throw OnboardingException.forbidden(
        ONBOARDING_ERRORS.SKIP_COMPLEX_NOT_ALLOWED,
        {
          userId,
          planType,
        },
      );
    }

    // Get steps to skip
    const stepsToSkip = this.getSkippedSteps('complex-overview');

    // Mark each step as skipped
    for (const step of stepsToSkip) {
      await this.progressService.markStepSkipped(userId, step);
    }

    // Update current step to dashboard
    const updatedProgress = await this.progressService.updateProgress(
      userId,
      'dashboard',
    );

    this.logger.log(
      `Complex step skipped successfully for user ${userId}. Skipped steps: ${stepsToSkip.join(', ')}`,
    );

    // Return success result with bilingual message
    return {
      success: true,
      currentStep: 'dashboard',
      skippedSteps: stepsToSkip,
      progress: updatedProgress,
      message: {
        ar: 'تم تخطي إعداد المجمع والعيادة بنجاح. يمكنك إضافتهم لاحقاً من لوحة التحكم',
        en: 'Complex and clinic setup skipped successfully. You can add them later from the dashboard',
      },
    };
  }

  /**
   * Check if complex can be skipped
   *
   * Validates if the given plan type allows skipping the complex step.
   * Only company plan users can skip complex (BZR-25).
   *
   * @param planType - Plan type to check ('company', 'complex', or 'clinic')
   * @returns true if complex can be skipped, false otherwise
   *
   * Requirements: US-1.1, US-1.7
   * Business Rules: BZR-25
   */
  canSkipComplex(planType: string): boolean {
    return planType === 'company';
  }

  /**
   * Get skipped steps
   *
   * Returns the list of steps that should be skipped when a given step is skipped.
   * When complex is skipped, clinic is automatically skipped as well (BZR-25).
   *
   * Step hierarchy:
   * - complex-overview → complex-details → complex-working-hours
   * - clinic-overview → clinic-details → clinic-working-hours
   *
   * @param step - Step being skipped
   * @returns Array of step names to skip
   *
   * Requirements: US-1.2, US-1.3, US-1.4, US-1.6
   * Business Rules: BZR-25
   */
  getSkippedSteps(step: string): string[] {
    // Define step groups that should be skipped together
    const skipGroups: Record<string, string[]> = {
      'complex-overview': [
        'complex-overview',
        'complex-details',
        'complex-working-hours',
        'clinic-overview',
        'clinic-details',
        'clinic-working-hours',
      ],
    };

    // Return the skip group for the given step, or just the step itself
    return skipGroups[step] || [step];
  }

  /**
   * Determine plan type from user data
   *
   * Helper method to determine the plan type based on user's
   * organization, complex, and clinic associations.
   *
   * This is a fallback for when planType is not explicitly set.
   *
   * @param user - User document
   * @returns Plan type ('company', 'complex', or 'clinic')
   */
  private determinePlanType(user: any): 'company' | 'complex' | 'clinic' {
    // Infer from entity associations
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
