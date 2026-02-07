import { BilingualMessage } from './bilingual-message.interface';
import { StepProgress } from './step-progress.interface';

/**
 * Skip Result Interface
 * 
 * Result of skip complex operation.
 * Used by OnboardingSkipLogicService to handle complex step skipping.
 * 
 * BZR-25: Skip complex → skip clinic (company plan only)
 */
export interface SkipResult {
  success: boolean;
  currentStep: string;
  skippedSteps: string[];
  progress: StepProgress;
  message: BilingualMessage;
}
