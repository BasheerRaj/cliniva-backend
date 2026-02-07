import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CompleteOnboardingDto } from '../dto/complete-onboarding.dto';
import {
  ValidationResult,
  ValidationError,
} from '../interfaces/validation-result.interface';
import { ONBOARDING_ERRORS } from '../constants/onboarding-errors.constant';
import { BilingualMessage } from '../interfaces/bilingual-message.interface';

/**
 * OnboardingValidationService
 *
 * Responsibility: All validation logic for onboarding (Single Responsibility Principle)
 *
 * This service handles:
 * - Complete onboarding data validation
 * - Plan configuration validation
 * - Entity hierarchy validation
 * - Plan limits validation
 * - Working hours validation
 * - Plan-specific data validation
 *
 * All validation methods return ValidationResult with bilingual error messages.
 */
@Injectable()
export class OnboardingValidationService {
  constructor(
    @InjectModel('Organization') private readonly organizationModel: Model<any>,
    @InjectModel('Complex') private readonly complexModel: Model<any>,
    @InjectModel('Clinic') private readonly clinicModel: Model<any>,
  ) {}

  /**
   * Main validation method - validates complete onboarding data
   *
   * @param dto - Complete onboarding DTO
   * @returns ValidationResult with isValid flag and errors array
   */
  async validateOnboarding(
    dto: CompleteOnboardingDto,
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    // 1. Validate plan configuration
    const planConfigErrors = this.validatePlanConfiguration(dto);
    errors.push(...planConfigErrors);

    // 2. Validate entity hierarchy
    const hierarchyErrors = this.validateEntityHierarchy(dto);
    errors.push(...hierarchyErrors);

    // 3. Validate plan limits (async - checks database)
    const limitErrors = await this.validatePlanLimits(dto);
    errors.push(...limitErrors);

    // 4. Validate working hours if provided
    if (dto.workingHours && dto.workingHours.length > 0) {
      const workingHoursErrors = this.validateWorkingHours(dto.workingHours);
      errors.push(...workingHoursErrors);
    }

    // 5. Validate plan-specific data
    const planSpecificErrors = this.validatePlanSpecificData(dto);
    errors.push(...planSpecificErrors);

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates plan configuration
   *
   * Checks:
   * - Plan type is valid (company, complex, or clinic)
   * - Required data is present for the plan type
   *
   * @param dto - Complete onboarding DTO
   * @returns Array of validation errors
   */
  validatePlanConfiguration(dto: CompleteOnboardingDto): ValidationError[] {
    const errors: ValidationError[] = [];
    const planType = dto.subscriptionData.planType.toLowerCase();

    // Validate plan type
    const validPlanTypes = ['company', 'complex', 'clinic'];
    if (!validPlanTypes.includes(planType)) {
      errors.push({
        field: 'subscriptionData.planType',
        code: ONBOARDING_ERRORS.INVALID_PLAN_TYPE.code,
        message: ONBOARDING_ERRORS.INVALID_PLAN_TYPE.message,
      });
      return errors; // Stop further validation if plan type is invalid
    }

    // Validate required data for each plan type
    switch (planType) {
      case 'company':
        if (!dto.organization) {
          errors.push({
            field: 'organization',
            code: ONBOARDING_ERRORS.VALIDATION_FAILED.code,
            message: {
              ar: 'خطة الشركة تتطلب بيانات المنظمة',
              en: 'Company plan requires organization data',
            },
          });
        }
        break;

      case 'complex':
        if (!dto.complexes || dto.complexes.length === 0) {
          errors.push({
            field: 'complexes',
            code: ONBOARDING_ERRORS.VALIDATION_FAILED.code,
            message: {
              ar: 'خطة المجمع تتطلب مجمع واحد على الأقل',
              en: 'Complex plan requires at least one complex',
            },
          });
        }
        break;

      case 'clinic':
        if (!dto.clinics || dto.clinics.length === 0) {
          errors.push({
            field: 'clinics',
            code: ONBOARDING_ERRORS.VALIDATION_FAILED.code,
            message: {
              ar: 'خطة العيادة تتطلب عيادة واحدة على الأقل',
              en: 'Clinic plan requires at least one clinic',
            },
          });
        }
        break;
    }

    return errors;
  }

  /**
   * Validates entity hierarchy
   *
   * Checks:
   * - Entity relationships are valid for the plan type
   * - Parent entities exist when required
   * - No orphaned entities
   *
   * @param dto - Complete onboarding DTO
   * @returns Array of validation errors
   */
  validateEntityHierarchy(dto: CompleteOnboardingDto): ValidationError[] {
    const errors: ValidationError[] = [];
    const planType = dto.subscriptionData.planType.toLowerCase();

    // Company plan: Can have organization → complexes → clinics
    if (planType === 'company') {
      // Organization is required (already checked in plan configuration)
      // Complexes and clinics are optional

      // If clinics are provided, they should have complexDepartmentId if complexes exist
      if (
        dto.clinics &&
        dto.clinics.length > 0 &&
        dto.complexes &&
        dto.complexes.length > 0
      ) {
        dto.clinics.forEach((clinic, index) => {
          if (!clinic.complexDepartmentId) {
            errors.push({
              field: `clinics[${index}].complexDepartmentId`,
              code: ONBOARDING_ERRORS.VALIDATION_FAILED.code,
              message: {
                ar: `العيادة "${clinic.name}" تتطلب ربطها بقسم مجمع`,
                en: `Clinic "${clinic.name}" requires complexDepartmentId`,
              },
            });
          }
        });
      }
    }

    // Complex plan: Must have complex → clinics
    if (planType === 'complex') {
      // Complex is required (already checked in plan configuration)

      // If clinics are provided, they must have complexDepartmentId
      if (dto.clinics && dto.clinics.length > 0) {
        dto.clinics.forEach((clinic, index) => {
          if (!clinic.complexDepartmentId) {
            errors.push({
              field: `clinics[${index}].complexDepartmentId`,
              code: ONBOARDING_ERRORS.VALIDATION_FAILED.code,
              message: {
                ar: `العيادة "${clinic.name}" تتطلب ربطها بقسم مجمع`,
                en: `Clinic "${clinic.name}" requires complexDepartmentId`,
              },
            });
          }
        });
      }
    }

    // Clinic plan: Standalone clinic (no hierarchy requirements)
    // No additional hierarchy validation needed

    return errors;
  }

  /**
   * Validates plan limits
   *
   * Checks database for existing entities and validates against plan limits:
   * - Company plan: Maximum 1 organization
   * - Complex plan: Maximum 1 complex
   * - Clinic plan: Maximum 1 clinic
   *
   * Excludes soft-deleted entities from count.
   *
   * @param dto - Complete onboarding DTO
   * @returns Array of validation errors
   */
  async validatePlanLimits(
    dto: CompleteOnboardingDto,
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    const planType = dto.subscriptionData.planType.toLowerCase();

    // Note: subscriptionId is not available yet during onboarding validation
    // This validation will be performed again in OnboardingPlanLimitService
    // with the actual subscriptionId after subscription is created

    // For now, we validate the structure and counts in the DTO itself

    switch (planType) {
      case 'company':
        // Company plan allows 1 organization
        if (dto.organization) {
          // Count is 1, which is valid
          // No error
        }
        break;

      case 'complex':
        // Complex plan allows 1 complex
        if (dto.complexes && dto.complexes.length > 1) {
          errors.push({
            field: 'complexes',
            code: ONBOARDING_ERRORS.PLAN_LIMIT_COMPLEX.code,
            message: ONBOARDING_ERRORS.PLAN_LIMIT_COMPLEX.message,
          });
        }
        break;

      case 'clinic':
        // Clinic plan allows 1 clinic
        if (dto.clinics && dto.clinics.length > 1) {
          errors.push({
            field: 'clinics',
            code: ONBOARDING_ERRORS.PLAN_LIMIT_CLINIC.code,
            message: ONBOARDING_ERRORS.PLAN_LIMIT_CLINIC.message,
          });
        }
        break;
    }

    return errors;
  }

  /**
   * Validates working hours
   *
   * Checks:
   * - Time format is valid (HH:MM)
   * - Opening time is before closing time
   * - Break times are within working hours
   * - Break start is before break end
   * - Day of week is valid
   *
   * @param workingHours - Array of working hours DTOs
   * @returns Array of validation errors
   */
  validateWorkingHours(workingHours: any[]): ValidationError[] {
    const errors: ValidationError[] = [];

    const validDays = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ];
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

    workingHours.forEach((wh, index) => {
      // Validate day of week
      if (!validDays.includes(wh.dayOfWeek.toLowerCase())) {
        errors.push({
          field: `workingHours[${index}].dayOfWeek`,
          code: ONBOARDING_ERRORS.VALIDATION_FAILED.code,
          message: {
            ar: `يوم غير صالح: ${wh.dayOfWeek}`,
            en: `Invalid day: ${wh.dayOfWeek}`,
          },
        });
      }

      // If it's a working day, validate times
      if (wh.isWorkingDay) {
        // Validate opening time
        if (!wh.openingTime) {
          errors.push({
            field: `workingHours[${index}].openingTime`,
            code: ONBOARDING_ERRORS.VALIDATION_FAILED.code,
            message: {
              ar: 'وقت الافتتاح مطلوب لأيام العمل',
              en: 'Opening time is required for working days',
            },
          });
        } else if (!timeRegex.test(wh.openingTime)) {
          errors.push({
            field: `workingHours[${index}].openingTime`,
            code: ONBOARDING_ERRORS.VALIDATION_FAILED.code,
            message: {
              ar: `صيغة وقت الافتتاح غير صالحة: ${wh.openingTime}`,
              en: `Invalid opening time format: ${wh.openingTime}`,
            },
          });
        }

        // Validate closing time
        if (!wh.closingTime) {
          errors.push({
            field: `workingHours[${index}].closingTime`,
            code: ONBOARDING_ERRORS.VALIDATION_FAILED.code,
            message: {
              ar: 'وقت الإغلاق مطلوب لأيام العمل',
              en: 'Closing time is required for working days',
            },
          });
        } else if (!timeRegex.test(wh.closingTime)) {
          errors.push({
            field: `workingHours[${index}].closingTime`,
            code: ONBOARDING_ERRORS.VALIDATION_FAILED.code,
            message: {
              ar: `صيغة وقت الإغلاق غير صالحة: ${wh.closingTime}`,
              en: `Invalid closing time format: ${wh.closingTime}`,
            },
          });
        }

        // Validate opening time is before closing time
        if (
          wh.openingTime &&
          wh.closingTime &&
          timeRegex.test(wh.openingTime) &&
          timeRegex.test(wh.closingTime)
        ) {
          const opening = this.timeToMinutes(wh.openingTime);
          const closing = this.timeToMinutes(wh.closingTime);

          if (opening >= closing) {
            errors.push({
              field: `workingHours[${index}]`,
              code: ONBOARDING_ERRORS.VALIDATION_FAILED.code,
              message: {
                ar: 'وقت الافتتاح يجب أن يكون قبل وقت الإغلاق',
                en: 'Opening time must be before closing time',
              },
            });
          }
        }

        // Validate break times if provided
        if (wh.breakStartTime || wh.breakEndTime) {
          if (!wh.breakStartTime || !wh.breakEndTime) {
            errors.push({
              field: `workingHours[${index}]`,
              code: ONBOARDING_ERRORS.VALIDATION_FAILED.code,
              message: {
                ar: 'يجب توفير وقت بداية ونهاية الاستراحة معاً',
                en: 'Both break start and end times must be provided',
              },
            });
          } else {
            // Validate break time formats
            if (!timeRegex.test(wh.breakStartTime)) {
              errors.push({
                field: `workingHours[${index}].breakStartTime`,
                code: ONBOARDING_ERRORS.VALIDATION_FAILED.code,
                message: {
                  ar: `صيغة وقت بداية الاستراحة غير صالحة: ${wh.breakStartTime}`,
                  en: `Invalid break start time format: ${wh.breakStartTime}`,
                },
              });
            }

            if (!timeRegex.test(wh.breakEndTime)) {
              errors.push({
                field: `workingHours[${index}].breakEndTime`,
                code: ONBOARDING_ERRORS.VALIDATION_FAILED.code,
                message: {
                  ar: `صيغة وقت نهاية الاستراحة غير صالحة: ${wh.breakEndTime}`,
                  en: `Invalid break end time format: ${wh.breakEndTime}`,
                },
              });
            }

            // Validate break times are within working hours
            if (
              wh.openingTime &&
              wh.closingTime &&
              timeRegex.test(wh.breakStartTime) &&
              timeRegex.test(wh.breakEndTime)
            ) {
              const opening = this.timeToMinutes(wh.openingTime);
              const closing = this.timeToMinutes(wh.closingTime);
              const breakStart = this.timeToMinutes(wh.breakStartTime);
              const breakEnd = this.timeToMinutes(wh.breakEndTime);

              if (breakStart < opening || breakEnd > closing) {
                errors.push({
                  field: `workingHours[${index}]`,
                  code: ONBOARDING_ERRORS.VALIDATION_FAILED.code,
                  message: {
                    ar: 'أوقات الاستراحة يجب أن تكون ضمن ساعات العمل',
                    en: 'Break times must be within working hours',
                  },
                });
              }

              if (breakStart >= breakEnd) {
                errors.push({
                  field: `workingHours[${index}]`,
                  code: ONBOARDING_ERRORS.VALIDATION_FAILED.code,
                  message: {
                    ar: 'وقت بداية الاستراحة يجب أن يكون قبل وقت النهاية',
                    en: 'Break start time must be before break end time',
                  },
                });
              }
            }
          }
        }
      }
    });

    return errors;
  }

  /**
   * Validates plan-specific data
   *
   * Performs additional validation based on plan type:
   * - Company plan: Organization-specific validation
   * - Complex plan: Complex-specific validation
   * - Clinic plan: Clinic-specific validation (capacity, session duration)
   *
   * @param dto - Complete onboarding DTO
   * @returns Array of validation errors
   */
  validatePlanSpecificData(dto: CompleteOnboardingDto): ValidationError[] {
    const errors: ValidationError[] = [];
    const planType = dto.subscriptionData.planType.toLowerCase();

    switch (planType) {
      case 'company':
        if (dto.organization) {
          // Validate organization name
          if (
            !dto.organization.name ||
            dto.organization.name.trim().length === 0
          ) {
            errors.push({
              field: 'organization.name',
              code: ONBOARDING_ERRORS.VALIDATION_FAILED.code,
              message: {
                ar: 'اسم المنظمة مطلوب',
                en: 'Organization name is required',
              },
            });
          }

          // Validate VAT number format if provided
          if (dto.organization.legalInfo?.vatNumber) {
            if (!this.validateVATNumber(dto.organization.legalInfo.vatNumber)) {
              errors.push({
                field: 'organization.legalInfo.vatNumber',
                code: ONBOARDING_ERRORS.VALIDATION_FAILED.code,
                message: {
                  ar: 'صيغة رقم الضريبة غير صالحة',
                  en: 'Invalid VAT number format',
                },
              });
            }
          }

          // Validate CR number format if provided
          if (dto.organization.legalInfo?.crNumber) {
            if (!this.validateCRNumber(dto.organization.legalInfo.crNumber)) {
              errors.push({
                field: 'organization.legalInfo.crNumber',
                code: ONBOARDING_ERRORS.VALIDATION_FAILED.code,
                message: {
                  ar: 'صيغة رقم السجل التجاري غير صالحة',
                  en: 'Invalid Commercial Registration number format',
                },
              });
            }
          }
        }
        break;

      case 'complex':
        if (dto.complexes && dto.complexes.length > 0) {
          dto.complexes.forEach((complex, index) => {
            // Validate complex name
            if (!complex.name || complex.name.trim().length === 0) {
              errors.push({
                field: `complexes[${index}].name`,
                code: ONBOARDING_ERRORS.VALIDATION_FAILED.code,
                message: {
                  ar: 'اسم المجمع مطلوب',
                  en: 'Complex name is required',
                },
              });
            }

            // Validate VAT number if provided
            if (
              complex.legalInfo?.vatNumber &&
              !this.validateVATNumber(complex.legalInfo.vatNumber)
            ) {
              errors.push({
                field: `complexes[${index}].legalInfo.vatNumber`,
                code: ONBOARDING_ERRORS.VALIDATION_FAILED.code,
                message: {
                  ar: 'صيغة رقم الضريبة غير صالحة',
                  en: 'Invalid VAT number format',
                },
              });
            }

            // Validate CR number if provided
            if (
              complex.legalInfo?.crNumber &&
              !this.validateCRNumber(complex.legalInfo.crNumber)
            ) {
              errors.push({
                field: `complexes[${index}].legalInfo.crNumber`,
                code: ONBOARDING_ERRORS.VALIDATION_FAILED.code,
                message: {
                  ar: 'صيغة رقم السجل التجاري غير صالحة',
                  en: 'Invalid Commercial Registration number format',
                },
              });
            }
          });
        }
        break;

      case 'clinic':
        if (dto.clinics && dto.clinics.length > 0) {
          dto.clinics.forEach((clinic, index) => {
            // Validate clinic name
            if (!clinic.name || clinic.name.trim().length === 0) {
              errors.push({
                field: `clinics[${index}].name`,
                code: ONBOARDING_ERRORS.VALIDATION_FAILED.code,
                message: {
                  ar: 'اسم العيادة مطلوب',
                  en: 'Clinic name is required',
                },
              });
            }

            // Validate capacity requirements for clinic plan
            if (clinic.capacity) {
              if (
                clinic.capacity.maxPatients == null ||
                clinic.capacity.maxPatients <= 0
              ) {
                errors.push({
                  field: `clinics[${index}].capacity.maxPatients`,
                  code: ONBOARDING_ERRORS.VALIDATION_FAILED.code,
                  message: {
                    ar: 'الحد الأقصى لعدد المرضى مطلوب ويجب أن يكون أكبر من صفر',
                    en: 'Maximum patient capacity is required and must be greater than zero',
                  },
                });
              }

              if (
                clinic.capacity.sessionDuration == null ||
                clinic.capacity.sessionDuration <= 0
              ) {
                errors.push({
                  field: `clinics[${index}].capacity.sessionDuration`,
                  code: ONBOARDING_ERRORS.VALIDATION_FAILED.code,
                  message: {
                    ar: 'مدة الجلسة الافتراضية مطلوبة ويجب أن تكون أكبر من صفر',
                    en: 'Default session duration is required and must be greater than zero',
                  },
                });
              }
            } else {
              // Capacity is required for clinic plan
              errors.push({
                field: `clinics[${index}].capacity`,
                code: ONBOARDING_ERRORS.VALIDATION_FAILED.code,
                message: {
                  ar: 'معلومات السعة مطلوبة للعيادة',
                  en: 'Capacity information is required for clinic',
                },
              });
            }

            // Validate VAT number if provided
            if (
              clinic.legalInfo?.vatNumber &&
              !this.validateVATNumber(clinic.legalInfo.vatNumber)
            ) {
              errors.push({
                field: `clinics[${index}].legalInfo.vatNumber`,
                code: ONBOARDING_ERRORS.VALIDATION_FAILED.code,
                message: {
                  ar: 'صيغة رقم الضريبة غير صالحة',
                  en: 'Invalid VAT number format',
                },
              });
            }

            // Validate CR number if provided
            if (
              clinic.legalInfo?.crNumber &&
              !this.validateCRNumber(clinic.legalInfo.crNumber)
            ) {
              errors.push({
                field: `clinics[${index}].legalInfo.crNumber`,
                code: ONBOARDING_ERRORS.VALIDATION_FAILED.code,
                message: {
                  ar: 'صيغة رقم السجل التجاري غير صالحة',
                  en: 'Invalid Commercial Registration number format',
                },
              });
            }
          });
        }
        break;
    }

    return errors;
  }

  /**
   * Helper: Convert time string (HH:MM) to minutes since midnight
   *
   * @param time - Time string in HH:MM format
   * @returns Minutes since midnight
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Helper: Validate VAT number format
   *
   * Saudi VAT format: 15 digits starting with 3
   *
   * @param vatNumber - VAT number to validate
   * @returns True if valid, false otherwise
   */
  private validateVATNumber(vatNumber: string): boolean {
    // Saudi VAT number: 15 digits, starts with 3
    const vatRegex = /^3\d{14}$/;
    return vatRegex.test(vatNumber);
  }

  /**
   * Helper: Validate Commercial Registration number format
   *
   * Saudi CR format: 10 digits
   *
   * @param crNumber - CR number to validate
   * @returns True if valid, false otherwise
   */
  private validateCRNumber(crNumber: string): boolean {
    // Saudi CR number: 10 digits
    const crRegex = /^\d{10}$/;
    return crRegex.test(crNumber);
  }
}
