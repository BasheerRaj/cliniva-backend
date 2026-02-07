import { BilingualMessage } from './bilingual-message.interface';

/**
 * Validation Error Interface
 * 
 * Represents a single validation error with field, code, and bilingual message.
 */
export interface ValidationError {
  field: string;
  code: string;
  message: BilingualMessage;
}

/**
 * Validation Result Interface
 * 
 * Result of validation operations in OnboardingValidationService.
 * Contains validation status and any errors found.
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}
