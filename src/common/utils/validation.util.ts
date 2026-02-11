import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { ERROR_MESSAGES } from './error-messages.constant';
import { BilingualMessage } from '../types/bilingual-message.type';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface EntityCounts {
  organizations: number;
  complexes: number;
  clinics: number;
}

export interface WorkingHoursData {
  dayOfWeek: string;
  isWorkingDay: boolean;
  openingTime?: string;
  closingTime?: string;
  breakStartTime?: string;
  breakEndTime?: string;
}

export interface BusinessProfileData {
  yearEstablished?: number;
  mission?: string;
  vision?: string;
  ceoName?: string;
  vatNumber?: string;
  crNumber?: string;
}

@Injectable()
export class ValidationUtil {
  static validatePlanLimits(
    planType: string,
    entityCounts: EntityCounts,
  ): boolean {
    const limits = {
      company: { organizations: 1, complexes: 50, clinics: 500 },
      complex: { organizations: 0, complexes: 1, clinics: 50 },
      clinic: { organizations: 0, complexes: 0, clinics: 1 },
    };

    const planLimits = limits[planType.toLowerCase()];
    if (!planLimits) return false;

    return (
      entityCounts.organizations <= planLimits.organizations &&
      entityCounts.complexes <= planLimits.complexes &&
      entityCounts.clinics <= planLimits.clinics
    );
  }

  static validateVATNumber(vatNumber: string, country = 'SA'): boolean {
    if (!vatNumber) return true; // Optional field

    // Saudi Arabia VAT number format: 15 digits
    if (country === 'SA') {
      return /^\d{15}$/.test(vatNumber);
    }

    // Generic validation for other countries
    return /^[A-Z0-9]{8,15}$/.test(vatNumber.toUpperCase());
  }

  static validateCRNumber(crNumber: string): boolean {
    if (!crNumber) return true; // Optional field

    // Saudi Arabia Commercial Registration: 10 digits
    return /^\d{10}$/.test(crNumber);
  }

  static validateWorkingHours(schedule: WorkingHoursData[]): ValidationResult {
    const errors: string[] = [];
    const validDays = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ];

    if (!schedule || schedule.length === 0) {
      return { isValid: true, errors: [] }; // Optional
    }

    // Check for duplicate days
    const days = schedule.map((s) => s.dayOfWeek.toLowerCase());
    const duplicateDays = days.filter(
      (day, index) => days.indexOf(day) !== index,
    );
    if (duplicateDays.length > 0) {
      errors.push(`Duplicate days found: ${duplicateDays.join(', ')}`);
    }

    // Validate each day
    for (const daySchedule of schedule) {
      if (!validDays.includes(daySchedule.dayOfWeek.toLowerCase())) {
        errors.push(`Invalid day: ${daySchedule.dayOfWeek}`);
        continue;
      }

      if (daySchedule.isWorkingDay) {
        if (!daySchedule.openingTime || !daySchedule.closingTime) {
          errors.push(
            `Opening and closing times required for working day: ${daySchedule.dayOfWeek}`,
          );
        } else {
          // Validate time format (HH:mm)
          const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
          if (!timeRegex.test(daySchedule.openingTime)) {
            errors.push(
              `Invalid opening time format for ${daySchedule.dayOfWeek}: ${daySchedule.openingTime}`,
            );
          }
          if (!timeRegex.test(daySchedule.closingTime)) {
            errors.push(
              `Invalid closing time format for ${daySchedule.dayOfWeek}: ${daySchedule.closingTime}`,
            );
          }

          // Validate break times if provided
          if (
            daySchedule.breakStartTime &&
            !timeRegex.test(daySchedule.breakStartTime)
          ) {
            errors.push(
              `Invalid break start time format for ${daySchedule.dayOfWeek}: ${daySchedule.breakStartTime}`,
            );
          }
          if (
            daySchedule.breakEndTime &&
            !timeRegex.test(daySchedule.breakEndTime)
          ) {
            errors.push(
              `Invalid break end time format for ${daySchedule.dayOfWeek}: ${daySchedule.breakEndTime}`,
            );
          }
        }
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  static validateSocialMediaUrl(platform: string, url: string): boolean {
    if (!url) return true; // Optional field

    const patterns = {
      facebook: /^https?:\/\/(www\.)?facebook\.com\/[\w.-]+\/?$/,
      instagram: /^https?:\/\/(www\.)?instagram\.com\/[\w.-]+\/?$/,
      twitter: /^https?:\/\/(www\.)?twitter\.com\/[\w.-]+\/?$/,
      linkedin: /^https?:\/\/(www\.)?linkedin\.com\/(in|company)\/[\w.-]+\/?$/,
      whatsapp: /^https?:\/\/(wa\.me|whatsapp\.com)\/[\d+]+$/,
      youtube:
        /^https?:\/\/(www\.)?youtube\.com\/(channel\/|c\/|user\/)?[\w.-]+\/?$/,
    };

    const pattern = patterns[platform.toLowerCase()];
    return pattern ? pattern.test(url) : /^https?:\/\/[\w.-]+/.test(url); // Generic URL validation
  }

  static validateBusinessProfile(
    profileData: BusinessProfileData,
  ): ValidationResult {
    const errors: string[] = [];

    if (profileData.yearEstablished) {
      const currentYear = new Date().getFullYear();
      if (
        profileData.yearEstablished < 1900 ||
        profileData.yearEstablished > currentYear
      ) {
        errors.push(`Year established must be between 1900 and ${currentYear}`);
      }
    }

    if (profileData.mission && profileData.mission.length > 1000) {
      errors.push('Mission statement cannot exceed 1000 characters');
    }

    if (profileData.vision && profileData.vision.length > 1000) {
      errors.push('Vision statement cannot exceed 1000 characters');
    }

    if (profileData.ceoName && profileData.ceoName.length > 255) {
      errors.push('CEO name cannot exceed 255 characters');
    }

    if (
      profileData.vatNumber &&
      !this.validateVATNumber(profileData.vatNumber)
    ) {
      errors.push('Invalid VAT number format');
    }

    if (profileData.crNumber && !this.validateCRNumber(profileData.crNumber)) {
      errors.push('Invalid Commercial Registration number format');
    }

    return { isValid: errors.length === 0, errors };
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validatePhone(phone: string): boolean {
    // Accept international phone numbers in E.164 format
    // Format: +[country code][number] (e.g., +1234567890, +966501234567, +31970102907)
    // - Must start with +
    // - Followed by 1-3 digit country code
    // - Followed by 4-14 digits for the phone number
    // - Total length: 8-18 characters (including +)
    const internationalPhoneRegex = /^\+[1-9]\d{1,14}$/;
    
    // Remove spaces and dashes for validation
    const cleanPhone = phone.replace(/[\s-]/g, '');
    
    return internationalPhoneRegex.test(cleanPhone);
  }

  static validateGoogleLocation(location: string): boolean {
    if (!location) return true; // Optional field

    // Basic validation for Google Maps location format
    // Can be coordinates, place ID, or formatted address
    const coordinatesRegex = /^-?\d+\.?\d*,-?\d+\.?\d*$/;
    const placeIdRegex = /^ChIJ[\w-]+$/;

    return (
      coordinatesRegex.test(location) ||
      placeIdRegex.test(location) ||
      location.length > 10
    ); // Minimum address length
  }

  static validateHierarchicalWorkingHours(
    parentSchedule: WorkingHoursData[],
    childSchedule: WorkingHoursData[],
    parentEntityName = 'parent',
    childEntityName = 'child',
  ): ValidationResult {
    const errors: string[] = [];

    // First validate both schedules individually
    const parentValidation = this.validateWorkingHours(parentSchedule);
    const childValidation = this.validateWorkingHours(childSchedule);

    if (!parentValidation.isValid) {
      errors.push(
        ...parentValidation.errors.map((e) => `${parentEntityName}: ${e}`),
      );
    }

    if (!childValidation.isValid) {
      errors.push(
        ...childValidation.errors.map((e) => `${childEntityName}: ${e}`),
      );
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    // Create maps for easier lookup
    const parentMap = new Map<string, WorkingHoursData>();
    const childMap = new Map<string, WorkingHoursData>();

    parentSchedule.forEach((schedule) => {
      parentMap.set(schedule.dayOfWeek.toLowerCase(), schedule);
    });

    childSchedule.forEach((schedule) => {
      childMap.set(schedule.dayOfWeek.toLowerCase(), schedule);
    });

    // Validate each day in child schedule
    for (const [day, childDay] of childMap) {
      const parentDay = parentMap.get(day);

      // If child is working but parent is not, that's invalid
      if (childDay.isWorkingDay && parentDay && !parentDay.isWorkingDay) {
        errors.push(
          `${childEntityName} cannot be open on ${day} when ${parentEntityName} is closed`,
        );
        continue;
      }

      // If both are working days, validate time constraints
      if (childDay.isWorkingDay && parentDay?.isWorkingDay) {
        const validation = this.validateChildWorkingHoursWithinParent(
          parentDay,
          childDay,
          day,
          parentEntityName,
          childEntityName,
        );
        errors.push(...validation.errors);
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  private static validateChildWorkingHoursWithinParent(
    parentDay: WorkingHoursData,
    childDay: WorkingHoursData,
    dayName: string,
    parentEntityName: string,
    childEntityName: string,
  ): ValidationResult {
    const errors: string[] = [];

    if (
      !parentDay.openingTime ||
      !parentDay.closingTime ||
      !childDay.openingTime ||
      !childDay.closingTime
    ) {
      return { isValid: true, errors }; // Skip if times are missing (handled by basic validation)
    }

    const parentOpen = this.parseTime(parentDay.openingTime);
    const parentClose = this.parseTime(parentDay.closingTime);
    const childOpen = this.parseTime(childDay.openingTime);
    const childClose = this.parseTime(childDay.closingTime);

    // Child opening time must be >= parent opening time
    if (childOpen < parentOpen) {
      errors.push(
        `${childEntityName} opening time (${childDay.openingTime}) on ${dayName} must be at or after ${parentEntityName} opening time (${parentDay.openingTime})`,
      );
    }

    // Child closing time must be <= parent closing time
    if (childClose > parentClose) {
      errors.push(
        `${childEntityName} closing time (${childDay.closingTime}) on ${dayName} must be at or before ${parentEntityName} closing time (${parentDay.closingTime})`,
      );
    }

    // Validate break times if present
    if (childDay.breakStartTime && childDay.breakEndTime) {
      const childBreakStart = this.parseTime(childDay.breakStartTime);
      const childBreakEnd = this.parseTime(childDay.breakEndTime);

      // Break must be within child working hours
      if (childBreakStart < childOpen || childBreakEnd > childClose) {
        errors.push(
          `${childEntityName} break time on ${dayName} must be within working hours`,
        );
      }

      // If parent has break times, child break should ideally align
      if (parentDay.breakStartTime && parentDay.breakEndTime) {
        const parentBreakStart = this.parseTime(parentDay.breakStartTime);
        const parentBreakEnd = this.parseTime(parentDay.breakEndTime);

        // Child break should overlap with parent break (optional constraint)
        if (
          childBreakEnd < parentBreakStart ||
          childBreakStart > parentBreakEnd
        ) {
          // This is a warning, not an error - clinic might have different break schedule
          // errors.push(`${childEntityName} break time on ${dayName} should overlap with ${parentEntityName} break time for operational efficiency`);
        }
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  private static parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes; // Convert to minutes for easy comparison
  }

  static formatTimeFromMinutes(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  static isTimeWithinRange(
    checkTime: string,
    startTime: string,
    endTime: string,
  ): boolean {
    const check = this.parseTime(checkTime);
    const start = this.parseTime(startTime);
    const end = this.parseTime(endTime);

    return check >= start && check <= end;
  }

  // ============================================================================
  // User Management M1 - New Validation Methods
  // ============================================================================

  /**
   * Validates that a string is a valid MongoDB ObjectId format.
   * Throws BadRequestException if the ID format is invalid.
   *
   * @static
   * @param {string} id - The ID string to validate
   * @param {BilingualMessage} entityName - The entity name for error message context
   * @throws {BadRequestException} When ID format is invalid
   *
   * @example
   * ValidationUtil.validateObjectId('507f1f77bcf86cd799439011', ERROR_MESSAGES.USER_NOT_FOUND);
   * // Passes validation
   *
   * @example
   * ValidationUtil.validateObjectId('invalid-id', ERROR_MESSAGES.USER_NOT_FOUND);
   * // Throws BadRequestException with bilingual error message
   */
  static validateObjectId(id: string, entityName: BilingualMessage): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException({
        message: ERROR_MESSAGES.INVALID_ID_FORMAT,
        code: 'INVALID_ID_FORMAT',
        details: { entityName, providedId: id },
      });
    }
  }

  /**
   * Validates that an entity exists in the database.
   * First validates the ID format, then queries the database.
   * Throws NotFoundException if the entity doesn't exist.
   *
   * @static
   * @template T - The type of the entity document
   * @param {Model<T>} model - Mongoose model to query
   * @param {string} id - The entity ID to find
   * @param {BilingualMessage} notFoundMessage - Error message if entity not found
   * @returns {Promise<T>} The found entity document
   * @throws {BadRequestException} When ID format is invalid
   * @throws {NotFoundException} When entity is not found
   *
   * @example
   * const user = await ValidationUtil.validateEntityExists(
   *   userModel,
   *   '507f1f77bcf86cd799439011',
   *   ERROR_MESSAGES.USER_NOT_FOUND
   * );
   * // Returns the user document if found
   *
   * @example
   * await ValidationUtil.validateEntityExists(
   *   userModel,
   *   'nonexistent-id',
   *   ERROR_MESSAGES.USER_NOT_FOUND
   * );
   * // Throws NotFoundException with bilingual error message
   */
  static async validateEntityExists<T>(
    model: Model<T>,
    id: string,
    notFoundMessage: BilingualMessage,
  ): Promise<T> {
    // First validate ID format
    this.validateObjectId(id, notFoundMessage);

    // Query database
    const entity = await model.findById(id);

    if (!entity) {
      throw new NotFoundException({
        message: notFoundMessage,
        code: 'ENTITY_NOT_FOUND',
        details: { id },
      });
    }

    return entity;
  }

  /**
   * Validates that a user is not attempting to modify their own account.
   * Prevents self-deactivation and self-deletion scenarios.
   * Throws ForbiddenException if user attempts self-modification.
   *
   * Business Rules: BZR-n0c4e9f2 (self-deactivation), BZR-m3d5a8b7 (self-deletion)
   *
   * @static
   * @param {string} targetUserId - The ID of the user being modified
   * @param {string} currentUserId - The ID of the user performing the action
   * @param {'deactivate' | 'delete'} action - The type of modification being attempted
   * @throws {ForbiddenException} When user attempts to modify their own account
   *
   * @example
   * ValidationUtil.validateNotSelfModification(
   *   'user123',
   *   'user456',
   *   'deactivate'
   * );
   * // Passes validation - different users
   *
   * @example
   * ValidationUtil.validateNotSelfModification(
   *   'user123',
   *   'user123',
   *   'deactivate'
   * );
   * // Throws ForbiddenException - same user attempting self-deactivation
   */
  static validateNotSelfModification(
    targetUserId: string,
    currentUserId: string,
    action: 'deactivate' | 'delete',
  ): void {
    if (targetUserId === currentUserId) {
      const message =
        action === 'deactivate'
          ? ERROR_MESSAGES.CANNOT_DEACTIVATE_SELF
          : ERROR_MESSAGES.CANNOT_DELETE_SELF;

      throw new ForbiddenException({
        message,
        code: 'SELF_MODIFICATION_FORBIDDEN',
        details: { action, userId: targetUserId },
      });
    }
  }

  /**
   * Validates that a user is active (not deactivated).
   * Prevents assignment of deactivated users to entities.
   * Throws BadRequestException if user is inactive.
   *
   * Business Rule: BZR-q4f3e1b8 (deactivated user restrictions)
   *
   * @static
   * @param {any} user - The user document to validate (must have isActive property)
   * @throws {BadRequestException} When user is inactive
   *
   * @example
   * const user = await userModel.findById(userId);
   * ValidationUtil.validateUserActive(user);
   * // Passes if user.isActive === true
   *
   * @example
   * const inactiveUser = { _id: '123', isActive: false };
   * ValidationUtil.validateUserActive(inactiveUser);
   * // Throws BadRequestException - user is inactive
   */
  static validateUserActive(user: any): void {
    if (!user.isActive) {
      throw new BadRequestException({
        message: ERROR_MESSAGES.DEACTIVATED_USER_ASSIGNMENT,
        code: 'USER_INACTIVE',
        details: { userId: user._id },
      });
    }
  }

  /**
   * Validates that all clinics belong to the same complex.
   * Enforces single complex assignment rule for employees.
   * Throws BadRequestException if clinics belong to different complexes.
   *
   * Business Rule: BZR-5e6f7a8b (single complex assignment validation)
   *
   * @static
   * @param {string[]} clinicIds - Array of clinic IDs to validate
   * @param {string} complexId - The expected complex ID
   * @param {Model<any>} clinicModel - Mongoose model for Clinic collection
   * @returns {Promise<void>}
   * @throws {BadRequestException} When clinics belong to different complexes
   *
   * @example
   * await ValidationUtil.validateSingleComplexAssignment(
   *   ['clinic1', 'clinic2'],
   *   'complex1',
   *   clinicModel
   * );
   * // Passes if all clinics belong to complex1
   *
   * @example
   * await ValidationUtil.validateSingleComplexAssignment(
   *   ['clinic1', 'clinic2'],
   *   'complex1',
   *   clinicModel
   * );
   * // Throws BadRequestException if any clinic belongs to a different complex
   */
  static async validateSingleComplexAssignment(
    clinicIds: string[],
    complexId: string,
    clinicModel: Model<any>,
  ): Promise<void> {
    // Skip validation if no clinics provided
    if (!clinicIds || clinicIds.length === 0) {
      return;
    }

    // Query all clinics and get their complex IDs
    const clinics = await clinicModel
      .find({
        _id: { $in: clinicIds },
      })
      .select('complexId');

    // Check if any clinic belongs to a different complex
    const differentComplexes = clinics.some(
      (clinic) => clinic.complexId.toString() !== complexId,
    );

    if (differentComplexes) {
      throw new BadRequestException({
        message: ERROR_MESSAGES.CLINICS_DIFFERENT_COMPLEXES,
        code: 'CLINICS_DIFFERENT_COMPLEXES',
        details: { complexId, clinicIds },
      });
    }
  }

  /**
   * Validates that an array is not empty.
   * Throws BadRequestException if array is null, undefined, or has zero length.
   *
   * @static
   * @template T - The type of items in the array
   * @param {T[]} array - The array to validate
   * @param {BilingualMessage} emptyMessage - Error message if array is empty
   * @throws {BadRequestException} When array is empty
   *
   * @example
   * ValidationUtil.validateNotEmpty(
   *   ['item1', 'item2'],
   *   ERROR_MESSAGES.EMPTY_ARRAY
   * );
   * // Passes validation
   *
   * @example
   * ValidationUtil.validateNotEmpty(
   *   [],
   *   ERROR_MESSAGES.EMPTY_ARRAY
   * );
   * // Throws BadRequestException - array is empty
   */
  static validateNotEmpty<T>(array: T[], emptyMessage: BilingualMessage): void {
    if (!array || array.length === 0) {
      throw new BadRequestException({
        message: emptyMessage,
        code: 'EMPTY_ARRAY',
      });
    }
  }
}
