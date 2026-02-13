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
    @InjectModel('User')
    private readonly userModel: Model<any>,
    @InjectModel('Clinic')
    private readonly clinicModel: Model<any>,
    @InjectModel('Complex')
    private readonly complexModel: Model<any>,
  ) {}

  /**
   * Validates working hours against parent entity automatically.
   *
   * This method automatically determines the parent entity based on the entity type
   * and validates the schedule against parent working hours:
   * - User → Clinic
   * - Clinic → Complex
   * - Complex → Organization
   *
   * @param {string} entityType - Entity type ('user', 'clinic', 'complex', 'organization')
   * @param {string} entityId - Entity ID
   * @param {WorkingHoursSchedule[]} schedule - Working hours schedule to validate
   * @returns {Promise<ValidationResult>} Validation result with errors and suggestions
   *
   * @example
   * const result = await validationService.validateAgainstParent(
   *   'user',
   *   'user123',
   *   userSchedule
   * );
   * if (!result.isValid) {
   *   console.log(result.errors);
   * }
   */
  async validateAgainstParent(
    entityType: string,
    entityId: string,
    schedule: WorkingHoursSchedule[],
  ): Promise<ValidationResult> {
    // Determine parent entity
    const parentInfo = await this.getParentEntity(entityType, entityId);

    // If no parent entity exists, validation passes
    if (!parentInfo) {
      return { isValid: true, errors: [] };
    }

    // Get entity name for error messages
    const entityName = await this.getEntityName(entityType, entityId);

    // Validate against parent
    return this.validateHierarchical(
      schedule,
      parentInfo.parentEntityType,
      parentInfo.parentEntityId,
      entityName,
    );
  }

  /**
   * Determines the parent entity for a given entity type and ID.
   *
   * Hierarchy:
   * - User → Clinic (via clinicId)
   * - Clinic → Complex (via complexId)
   * - Complex → Organization (via organizationId)
   * - Organization → null (top level)
   *
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @returns {Promise<{parentEntityType: string, parentEntityId: string} | null>} Parent entity info or null
   * @private
   */
  private async getParentEntity(
    entityType: string,
    entityId: string,
  ): Promise<{ parentEntityType: string; parentEntityId: string } | null> {
    try {
      switch (entityType.toLowerCase()) {
        case 'user': {
          // User → Clinic
          const user = await this.userModel
            .findById(entityId)
            .select('clinicId')
            .lean()
            .exec();

          if ((user as any)?.clinicId) {
            return {
              parentEntityType: 'clinic',
              parentEntityId: (user as any).clinicId.toString(),
            };
          }
          return null;
        }

        case 'clinic': {
          // Clinic → Complex
          const clinic = await this.clinicModel
            .findById(entityId)
            .select('complexId')
            .lean()
            .exec();

          if ((clinic as any)?.complexId) {
            return {
              parentEntityType: 'complex',
              parentEntityId: (clinic as any).complexId.toString(),
            };
          }
          return null;
        }

        case 'complex': {
          // Complex → Organization
          const complex = await this.complexModel
            .findById(entityId)
            .select('organizationId')
            .lean()
            .exec();

          if ((complex as any)?.organizationId) {
            return {
              parentEntityType: 'organization',
              parentEntityId: (complex as any).organizationId.toString(),
            };
          }
          return null;
        }

        case 'organization': {
          // Organization is top level, no parent
          return null;
        }

        default:
          throw new BadRequestException({
            message: {
              ar: `نوع الكيان غير صالح: ${entityType}`,
              en: `Invalid entity type: ${entityType}`,
            },
          });
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Log error and return null to allow validation to proceed
      console.error(
        `Error determining parent entity for ${entityType}:${entityId}`,
        error,
      );
      return null;
    }
  }

  /**
   * Gets the entity name for error messages.
   *
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @returns {Promise<string>} Entity name
   * @private
   */
  private async getEntityName(
    entityType: string,
    entityId: string,
  ): Promise<string> {
    try {
      switch (entityType.toLowerCase()) {
        case 'user': {
          const user = await this.userModel
            .findById(entityId)
            .select('firstName lastName')
            .lean()
            .exec();
          return user
            ? `${(user as any).firstName} ${(user as any).lastName}`
            : `User ${entityId}`;
        }

        case 'clinic': {
          const clinic = await this.clinicModel
            .findById(entityId)
            .select('name')
            .lean()
            .exec();
          return clinic ? (clinic as any).name : `Clinic ${entityId}`;
        }

        case 'complex': {
          const complex = await this.complexModel
            .findById(entityId)
            .select('name')
            .lean()
            .exec();
          return complex ? (complex as any).name : `Complex ${entityId}`;
        }

        case 'organization': {
          // Organization model not injected, return generic name
          return `Organization ${entityId}`;
        }

        default:
          return `Entity ${entityId}`;
      }
    } catch (error) {
      console.error(
        `Error getting entity name for ${entityType}:${entityId}`,
        error,
      );
      return `Entity ${entityId}`;
    }
  }

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

    console.log('🔍 [Validation] Starting hierarchical validation');
    console.log('📋 [Validation] Child schedule:', JSON.stringify(childSchedule, null, 2));
    console.log('🏢 [Validation] Parent entity:', parentEntityType, parentEntityId);

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

    console.log('📅 [Validation] Parent schedule:', JSON.stringify(parentSchedule, null, 2));

    // If parent has no working hours set, allow any child hours
    if (parentSchedule.length === 0) {
      console.log('⚠️ [Validation] No parent working hours found - allowing any child hours');
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

      console.log(`🔍 [Validation] Checking ${childDay.dayOfWeek}:`, {
        childWorking: childDay.isWorkingDay,
        parentWorking: parentDay?.isWorkingDay,
        childHours: childDay.isWorkingDay ? `${childDay.openingTime}-${childDay.closingTime}` : 'closed',
        parentHours: parentDay?.isWorkingDay ? `${parentDay.openingTime}-${parentDay.closingTime}` : 'closed',
      });

      // If child is working but parent day doesn't exist or parent is not working, that's invalid
      if (childDay.isWorkingDay && (!parentDay || !parentDay.isWorkingDay)) {
        console.log(`❌ [Validation] ${childDay.dayOfWeek}: Child working but parent closed or not defined`);
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
        if (dayErrors.length > 0) {
          console.log(`❌ [Validation] ${childDay.dayOfWeek}: Time constraint violations:`, dayErrors);
        }
        errors.push(...dayErrors);
      }
    }

    const result = { isValid: errors.length === 0, errors };
    console.log('✅ [Validation] Final result:', result.isValid ? 'VALID' : 'INVALID', `(${errors.length} errors)`);
    
    return result;
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
