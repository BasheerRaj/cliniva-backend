import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WorkingHours } from '../../database/schemas/working-hours.schema';
import { ValidationUtil } from '../../common/utils/validation.util';
import {
  ERROR_MESSAGES,
  createDynamicMessage,
} from '../../common/utils/error-messages.constant';
import { BilingualMessage } from '../../common/types/bilingual-message.type';
import { queryCache, WorkingHoursCacheKeys } from '../utils/query-cache.util';

/**
 * Interface for working hours schedule data
 */
export interface WorkingHoursSchedule {
  dayOfWeek: string;
  isWorkingDay: boolean;
  openingTime?: string;
  closingTime?: string;
  breakStartTime?: string;
  breakEndTime?: string;
}

/**
 * Interface for validation error with suggestions
 */
export interface ValidationError {
  dayOfWeek: string;
  message: BilingualMessage;
  suggestedRange?: {
    openingTime: string;
    closingTime: string;
  };
}

/**
 * Interface for validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * WorkingHoursValidationService
 *
 * Centralized service for all working hours validation logic.
 * Handles hierarchical validation, parent-child relationships,
 * and suggestion generation for working hours.
 *
 * Business Rules:
 * - BZR-f1c0a9e4: Hierarchical validation (complex→clinic, clinic→user)
 * - BZR-u5a0f7d3: Child hours must be within parent hours
 * - BZR-42: Child cannot be open when parent is closed
 *
 * @class WorkingHoursValidationService
 */
@Injectable()
export class WorkingHoursValidationService {
  constructor(
    @InjectModel('WorkingHours')
    private readonly workingHoursModel: Model<WorkingHours>,
  ) {}

  /**
   * Validates child working hours against parent working hours hierarchically.
   *
   * This method performs comprehensive validation to ensure child entity
   * working hours comply with parent entity constraints:
   * - Child cannot be open when parent is closed
   * - Child opening time must be >= parent opening time
   * - Child closing time must be <= parent closing time
   *
   * @param {WorkingHoursSchedule[]} childSchedule - Child entity schedule to validate
   * @param {string} parentEntityType - Parent entity type (e.g., 'complex', 'clinic')
   * @param {string} parentEntityId - Parent entity ID
   * @param {string} childEntityName - Child entity name for error messages
   * @returns {Promise<ValidationResult>} Validation result with errors and suggestions
   *
   * @example
   * const result = await validationService.validateHierarchical(
   *   clinicSchedule,
   *   'complex',
   *   'complex123',
   *   'Clinic ABC'
   * );
   * if (!result.isValid) {
   *   console.log(result.errors);
   * }
   */
  async validateHierarchical(
    childSchedule: WorkingHoursSchedule[],
    parentEntityType: string,
    parentEntityId: string,
    childEntityName: string,
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    // First validate the child schedule format
    const basicValidation = ValidationUtil.validateWorkingHours(childSchedule);
    if (!basicValidation.isValid) {
      // Convert basic validation errors to ValidationError format
      basicValidation.errors.forEach((error) => {
        errors.push({
          dayOfWeek: 'general',
          message: {
            ar: error,
            en: error,
          },
        });
      });
      return { isValid: false, errors };
    }

    // Get parent working hours
    const parentSchedule = await this.getParentWorkingHours(
      parentEntityType,
      parentEntityId,
    );

    // If parent has no working hours set, allow any child hours
    if (parentSchedule.length === 0) {
      return { isValid: true, errors: [] };
    }

    // Create map for easier lookup
    const parentMap = new Map<string, WorkingHours>();
    parentSchedule.forEach((schedule) => {
      parentMap.set(schedule.dayOfWeek.toLowerCase(), schedule);
    });

    // Validate each day in child schedule
    for (const childDay of childSchedule) {
      const dayKey = childDay.dayOfWeek.toLowerCase();
      const parentDay = parentMap.get(dayKey);

      // If child is working but parent is not, that's invalid
      if (childDay.isWorkingDay && parentDay && !parentDay.isWorkingDay) {
        errors.push({
          dayOfWeek: childDay.dayOfWeek,
          message: createDynamicMessage(
            ERROR_MESSAGES.CHILD_OPEN_PARENT_CLOSED.ar,
            ERROR_MESSAGES.CHILD_OPEN_PARENT_CLOSED.en,
            {
              childEntity: childEntityName,
              parentEntity: parentEntityType,
            },
          ),
        });
        continue;
      }

      // If both are working days, validate time constraints
      if (childDay.isWorkingDay && parentDay?.isWorkingDay) {
        const dayErrors = this.validateDayHours(
          parentDay,
          childDay,
          childEntityName,
          parentEntityType,
        );
        errors.push(...dayErrors);
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Retrieves parent entity working hours from the database.
   * Uses projection to fetch only required fields for performance.
   * Results are cached for 5 minutes to reduce database load.
   *
   * @param {string} entityType - Entity type (e.g., 'complex', 'clinic', 'user')
   * @param {string} entityId - Entity ID
   * @returns {Promise<WorkingHours[]>} Array of working hours for the entity
   *
   * @example
   * const complexHours = await validationService.getParentWorkingHours(
   *   'complex',
   *   'complex123'
   * );
   */
  async getParentWorkingHours(
    entityType: string,
    entityId: string,
  ): Promise<WorkingHours[]> {
    // Check cache first
    const cacheKey = WorkingHoursCacheKeys.parentHours(entityType, entityId);
    const cached = queryCache.get<WorkingHours[]>(cacheKey);

    if (cached) {
      return cached;
    }

    // Fetch from database
    const hours = await this.workingHoursModel
      .find({
        entityType,
        entityId: new Types.ObjectId(entityId),
        isActive: true,
      })
      .select(
        'dayOfWeek isWorkingDay openingTime closingTime breakStartTime breakEndTime',
      )
      .lean()
      .exec();

    // Cache the result (5 minutes TTL)
    queryCache.set(cacheKey, hours, 5 * 60 * 1000);

    return hours;
  }

  /**
   * Generates suggested time ranges for child entity based on parent hours.
   *
   * This method analyzes parent working hours and generates appropriate
   * suggestions for child entity hours, ensuring compliance with
   * hierarchical constraints.
   *
   * @param {WorkingHours[]} parentSchedule - Parent entity working hours
   * @param {WorkingHoursSchedule[]} childSchedule - Child entity schedule (for context)
   * @returns {Map<string, { openingTime: string; closingTime: string }>} Suggested ranges by day
   *
   * @example
   * const suggestions = validationService.generateSuggestions(
   *   complexHours,
   *   clinicSchedule
   * );
   * console.log(suggestions.get('monday')); // { openingTime: '08:00', closingTime: '17:00' }
   */
  generateSuggestions(
    parentSchedule: WorkingHours[],
    childSchedule: WorkingHoursSchedule[],
  ): Map<string, { openingTime: string; closingTime: string }> {
    const suggestions = new Map<
      string,
      { openingTime: string; closingTime: string }
    >();

    // Create map of parent hours
    const parentMap = new Map<string, WorkingHours>();
    parentSchedule.forEach((schedule) => {
      parentMap.set(schedule.dayOfWeek.toLowerCase(), schedule);
    });

    // Generate suggestions for each day in child schedule
    for (const childDay of childSchedule) {
      const dayKey = childDay.dayOfWeek.toLowerCase();
      const parentDay = parentMap.get(dayKey);

      if (parentDay && parentDay.isWorkingDay && childDay.isWorkingDay) {
        // Suggest parent hours as the valid range
        if (parentDay.openingTime && parentDay.closingTime) {
          suggestions.set(childDay.dayOfWeek, {
            openingTime: parentDay.openingTime,
            closingTime: parentDay.closingTime,
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Validates working hours for a specific day against parent hours.
   *
   * @private
   * @param {WorkingHours} parentDay - Parent entity hours for the day
   * @param {WorkingHoursSchedule} childDay - Child entity hours for the day
   * @param {string} childEntityName - Child entity name for error messages
   * @param {string} parentEntityType - Parent entity type for error messages
   * @returns {ValidationError[]} Array of validation errors
   */
  private validateDayHours(
    parentDay: WorkingHours,
    childDay: WorkingHoursSchedule,
    childEntityName: string,
    parentEntityType: string,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (
      !parentDay.openingTime ||
      !parentDay.closingTime ||
      !childDay.openingTime ||
      !childDay.closingTime
    ) {
      return errors; // Skip if times are missing
    }

    const parentOpen = this.parseTime(parentDay.openingTime);
    const parentClose = this.parseTime(parentDay.closingTime);
    const childOpen = this.parseTime(childDay.openingTime);
    const childClose = this.parseTime(childDay.closingTime);

    // Child opening time must be >= parent opening time
    if (childOpen < parentOpen) {
      errors.push({
        dayOfWeek: childDay.dayOfWeek,
        message: createDynamicMessage(
          `ساعات العمل يجب أن تكون ضمن ساعات ${parentEntityType}. وقت الفتح (${childDay.openingTime}) يجب أن يكون في أو بعد ${parentDay.openingTime}`,
          `Working hours must be within ${parentEntityType} hours. Opening time (${childDay.openingTime}) must be at or after ${parentDay.openingTime}`,
          {},
        ),
        suggestedRange: {
          openingTime: parentDay.openingTime,
          closingTime: parentDay.closingTime,
        },
      });
    }

    // Child closing time must be <= parent closing time
    if (childClose > parentClose) {
      errors.push({
        dayOfWeek: childDay.dayOfWeek,
        message: createDynamicMessage(
          `ساعات العمل يجب أن تكون ضمن ساعات ${parentEntityType}. وقت الإغلاق (${childDay.closingTime}) يجب أن يكون في أو قبل ${parentDay.closingTime}`,
          `Working hours must be within ${parentEntityType} hours. Closing time (${childDay.closingTime}) must be at or before ${parentDay.closingTime}`,
          {},
        ),
        suggestedRange: {
          openingTime: parentDay.openingTime,
          closingTime: parentDay.closingTime,
        },
      });
    }

    return errors;
  }

  /**
   * Parses time string (HH:mm) to minutes for comparison.
   *
   * @private
   * @param {string} timeString - Time in HH:mm format
   * @returns {number} Time in minutes since midnight
   */
  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
