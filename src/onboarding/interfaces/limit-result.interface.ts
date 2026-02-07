import { BilingualMessage } from './bilingual-message.interface';

/**
 * Limit Result Interface
 *
 * Result of plan limit validation.
 * Used by OnboardingPlanLimitService to enforce entity creation limits.
 *
 * BZR-26: Company plan - 1 company limit
 * BZR-28: Complex plan - 1 complex limit
 * BZR-30: Clinic plan - 1 clinic limit
 */
export interface LimitResult {
  canCreate: boolean;
  currentCount: number;
  maxAllowed: number;
  planType: string;
  message?: BilingualMessage;
}
