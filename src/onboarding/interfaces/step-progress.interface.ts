/**
 * Step Progress Interface
 * 
 * Tracks user progress through the onboarding flow.
 * Used by OnboardingProgressService to manage step completion and navigation.
 */
export interface StepProgress {
  userId: string;
  subscriptionId: string;
  planType: 'company' | 'complex' | 'clinic';
  currentStep: string;
  completedSteps: string[];
  skippedSteps: string[];
  stepData: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
