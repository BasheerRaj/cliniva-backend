import { BilingualMessage } from './bilingual-message.interface';

/**
 * Working Hours Interface
 *
 * Represents working hours for a single day.
 */
export interface WorkingHours {
  day: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  breakStartTime?: string;
  breakEndTime?: string;
}

/**
 * Inheritance Source Interface
 *
 * Information about the source entity for working hours inheritance.
 */
export interface InheritanceSource {
  entityType: 'organization' | 'complex';
  entityId: string;
  entityName: string;
}

/**
 * Inheritance Result Interface
 *
 * Result of working hours inheritance operation.
 * Used by OnboardingWorkingHoursService to provide inherited working hours.
 *
 * BZR-29: Working hours inheritance from parent entities
 */
export interface InheritanceResult {
  workingHours: WorkingHours[];
  source: InheritanceSource;
  canModify: boolean;
  message: BilingualMessage;
}
