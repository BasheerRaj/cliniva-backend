import { BilingualMessage } from './bilingual-message.interface';

/**
 * Dependency Result Interface
 *
 * Result of step dependency validation.
 * Used by OnboardingProgressService to validate step prerequisites.
 *
 * BZR-27: Validates that clinic details cannot be filled before complex details.
 */
export interface DependencyResult {
  canProceed: boolean;
  missingSteps: string[];
  message?: BilingualMessage;
}
