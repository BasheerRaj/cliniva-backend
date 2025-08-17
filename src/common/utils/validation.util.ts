import { Injectable } from '@nestjs/common';

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
  static validatePlanLimits(planType: string, entityCounts: EntityCounts): boolean {
    const limits = {
      company: { organizations: 1, complexes: 50, clinics: 500 },
      complex: { organizations: 0, complexes: 1, clinics: 50 },
      clinic: { organizations: 0, complexes: 0, clinics: 1 }
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
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    if (!schedule || schedule.length === 0) {
      return { isValid: true, errors: [] }; // Optional
    }

    // Check for duplicate days
    const days = schedule.map(s => s.dayOfWeek.toLowerCase());
    const duplicateDays = days.filter((day, index) => days.indexOf(day) !== index);
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
          errors.push(`Opening and closing times required for working day: ${daySchedule.dayOfWeek}`);
        } else {
          // Validate time format (HH:mm)
          const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
          if (!timeRegex.test(daySchedule.openingTime)) {
            errors.push(`Invalid opening time format for ${daySchedule.dayOfWeek}: ${daySchedule.openingTime}`);
          }
          if (!timeRegex.test(daySchedule.closingTime)) {
            errors.push(`Invalid closing time format for ${daySchedule.dayOfWeek}: ${daySchedule.closingTime}`);
          }

          // Validate break times if provided
          if (daySchedule.breakStartTime && !timeRegex.test(daySchedule.breakStartTime)) {
            errors.push(`Invalid break start time format for ${daySchedule.dayOfWeek}: ${daySchedule.breakStartTime}`);
          }
          if (daySchedule.breakEndTime && !timeRegex.test(daySchedule.breakEndTime)) {
            errors.push(`Invalid break end time format for ${daySchedule.dayOfWeek}: ${daySchedule.breakEndTime}`);
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
      youtube: /^https?:\/\/(www\.)?youtube\.com\/(channel\/|c\/|user\/)?[\w.-]+\/?$/
    };

    const pattern = patterns[platform.toLowerCase()];
    return pattern ? pattern.test(url) : /^https?:\/\/[\w.-]+/.test(url); // Generic URL validation
  }

  static validateBusinessProfile(profileData: BusinessProfileData): ValidationResult {
    const errors: string[] = [];

    if (profileData.yearEstablished) {
      const currentYear = new Date().getFullYear();
      if (profileData.yearEstablished < 1900 || profileData.yearEstablished > currentYear) {
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

    if (profileData.vatNumber && !this.validateVATNumber(profileData.vatNumber)) {
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
    // Saudi Arabia phone number format: +966XXXXXXXXX or 05XXXXXXXX
    const phoneRegex = /^(\+966|0)?[5-9]\d{8}$/;
    return phoneRegex.test(phone.replace(/[\s-]/g, ''));
  }

  static validateGoogleLocation(location: string): boolean {
    if (!location) return true; // Optional field
    
    // Basic validation for Google Maps location format
    // Can be coordinates, place ID, or formatted address
    const coordinatesRegex = /^-?\d+\.?\d*,-?\d+\.?\d*$/;
    const placeIdRegex = /^ChIJ[\w-]+$/;
    
    return coordinatesRegex.test(location) || 
           placeIdRegex.test(location) || 
           location.length > 10; // Minimum address length
  }

  static validateHierarchicalWorkingHours(
    parentSchedule: WorkingHoursData[],
    childSchedule: WorkingHoursData[],
    parentEntityName = 'parent',
    childEntityName = 'child'
  ): ValidationResult {
    const errors: string[] = [];

    // First validate both schedules individually
    const parentValidation = this.validateWorkingHours(parentSchedule);
    const childValidation = this.validateWorkingHours(childSchedule);

    if (!parentValidation.isValid) {
      errors.push(...parentValidation.errors.map(e => `${parentEntityName}: ${e}`));
    }

    if (!childValidation.isValid) {
      errors.push(...childValidation.errors.map(e => `${childEntityName}: ${e}`));
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    // Create maps for easier lookup
    const parentMap = new Map<string, WorkingHoursData>();
    const childMap = new Map<string, WorkingHoursData>();

    parentSchedule.forEach(schedule => {
      parentMap.set(schedule.dayOfWeek.toLowerCase(), schedule);
    });

    childSchedule.forEach(schedule => {
      childMap.set(schedule.dayOfWeek.toLowerCase(), schedule);
    });

    // Validate each day in child schedule
    for (const [day, childDay] of childMap) {
      const parentDay = parentMap.get(day);

      // If child is working but parent is not, that's invalid
      if (childDay.isWorkingDay && parentDay && !parentDay.isWorkingDay) {
        errors.push(`${childEntityName} cannot be open on ${day} when ${parentEntityName} is closed`);
        continue;
      }

      // If both are working days, validate time constraints
      if (childDay.isWorkingDay && parentDay?.isWorkingDay) {
        const validation = this.validateChildWorkingHoursWithinParent(
          parentDay,
          childDay,
          day,
          parentEntityName,
          childEntityName
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
    childEntityName: string
  ): ValidationResult {
    const errors: string[] = [];

    if (!parentDay.openingTime || !parentDay.closingTime || !childDay.openingTime || !childDay.closingTime) {
      return { isValid: true, errors }; // Skip if times are missing (handled by basic validation)
    }

    const parentOpen = this.parseTime(parentDay.openingTime);
    const parentClose = this.parseTime(parentDay.closingTime);
    const childOpen = this.parseTime(childDay.openingTime);
    const childClose = this.parseTime(childDay.closingTime);

    // Child opening time must be >= parent opening time
    if (childOpen < parentOpen) {
      errors.push(
        `${childEntityName} opening time (${childDay.openingTime}) on ${dayName} must be at or after ${parentEntityName} opening time (${parentDay.openingTime})`
      );
    }

    // Child closing time must be <= parent closing time
    if (childClose > parentClose) {
      errors.push(
        `${childEntityName} closing time (${childDay.closingTime}) on ${dayName} must be at or before ${parentEntityName} closing time (${parentDay.closingTime})`
      );
    }

    // Validate break times if present
    if (childDay.breakStartTime && childDay.breakEndTime) {
      const childBreakStart = this.parseTime(childDay.breakStartTime);
      const childBreakEnd = this.parseTime(childDay.breakEndTime);

      // Break must be within child working hours
      if (childBreakStart < childOpen || childBreakEnd > childClose) {
        errors.push(`${childEntityName} break time on ${dayName} must be within working hours`);
      }

      // If parent has break times, child break should ideally align
      if (parentDay.breakStartTime && parentDay.breakEndTime) {
        const parentBreakStart = this.parseTime(parentDay.breakStartTime);
        const parentBreakEnd = this.parseTime(parentDay.breakEndTime);

        // Child break should overlap with parent break (optional constraint)
        if (childBreakEnd < parentBreakStart || childBreakStart > parentBreakEnd) {
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
    endTime: string
  ): boolean {
    const check = this.parseTime(checkTime);
    const start = this.parseTime(startTime);
    const end = this.parseTime(endTime);
    
    return check >= start && check <= end;
  }
}
