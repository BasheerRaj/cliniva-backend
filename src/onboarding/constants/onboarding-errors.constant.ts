/**
 * Onboarding Error Constants
 * 
 * All error messages are bilingual (Arabic & English) to support
 * the platform's internationalization requirements.
 * 
 * Each error has:
 * - code: Unique error identifier (ONBOARDING_XXX format)
 * - message: Bilingual error message with 'ar' and 'en' properties
 */

export interface BilingualMessage {
  ar: string;
  en: string;
}

export interface OnboardingError {
  code: string;
  message: BilingualMessage;
}

export const ONBOARDING_ERRORS = {
  /**
   * Error: Skip complex not allowed for non-company plans
   * BZR-25: Only company plan can skip complex step
   */
  SKIP_COMPLEX_NOT_ALLOWED: {
    code: 'ONBOARDING_001',
    message: {
      ar: 'يمكن تخطي المجمع فقط في خطة الشركة',
      en: 'Can only skip complex in company plan',
    },
  },

  /**
   * Error: Company plan limit reached
   * BZR-26: Maximum 1 organization per company plan
   */
  PLAN_LIMIT_COMPANY: {
    code: 'ONBOARDING_002',
    message: {
      ar: 'الخطة تسمح بإنشاء شركة واحدة فقط',
      en: 'Plan allows maximum 1 company',
    },
  },

  /**
   * Error: Complex plan limit reached
   * BZR-28: Maximum 1 complex per complex plan
   */
  PLAN_LIMIT_COMPLEX: {
    code: 'ONBOARDING_003',
    message: {
      ar: 'الخطة تسمح بإنشاء مجمع واحد فقط',
      en: 'Plan allows maximum 1 complex',
    },
  },

  /**
   * Error: Clinic plan limit reached
   * BZR-30: Maximum 1 clinic per clinic plan
   */
  PLAN_LIMIT_CLINIC: {
    code: 'ONBOARDING_004',
    message: {
      ar: 'الخطة تسمح بإنشاء عيادة واحدة فقط',
      en: 'Plan allows maximum 1 clinic',
    },
  },

  /**
   * Error: Step dependency not met
   * BZR-27: Clinic details require complex details first
   */
  STEP_DEPENDENCY_NOT_MET: {
    code: 'ONBOARDING_005',
    message: {
      ar: 'يجب إكمال تفاصيل المجمع قبل تعبئة تفاصيل العيادة',
      en: 'Must complete complex details before filling clinic details',
    },
  },

  /**
   * Error: Invalid plan type provided
   */
  INVALID_PLAN_TYPE: {
    code: 'ONBOARDING_006',
    message: {
      ar: 'نوع الخطة غير صالح',
      en: 'Invalid plan type',
    },
  },

  /**
   * Error: User not found in database
   */
  USER_NOT_FOUND: {
    code: 'ONBOARDING_007',
    message: {
      ar: 'المستخدم غير موجود',
      en: 'User not found',
    },
  },

  /**
   * Error: Subscription not found in database
   */
  SUBSCRIPTION_NOT_FOUND: {
    code: 'ONBOARDING_008',
    message: {
      ar: 'الاشتراك غير موجود',
      en: 'Subscription not found',
    },
  },

  /**
   * Error: Validation failed for onboarding data
   */
  VALIDATION_FAILED: {
    code: 'ONBOARDING_009',
    message: {
      ar: 'فشل التحقق من البيانات',
      en: 'Validation failed',
    },
  },

  /**
   * Error: Entity creation failed
   */
  ENTITY_CREATION_FAILED: {
    code: 'ONBOARDING_010',
    message: {
      ar: 'فشل إنشاء الكيان',
      en: 'Entity creation failed',
    },
  },

  /**
   * Error: Parent entity not found
   * Used when trying to inherit working hours or validate hierarchy
   */
  PARENT_ENTITY_NOT_FOUND: {
    code: 'ONBOARDING_011',
    message: {
      ar: 'الكيان الأصلي غير موجود',
      en: 'Parent entity not found',
    },
  },

  /**
   * Error: Working hours not found for inheritance
   * BZR-29: Working hours inheritance from parent entities
   */
  WORKING_HOURS_NOT_FOUND: {
    code: 'ONBOARDING_012',
    message: {
      ar: 'ساعات العمل غير موجودة',
      en: 'Working hours not found',
    },
  },
} as const;

/**
 * Type for error codes
 */
export type OnboardingErrorCode = keyof typeof ONBOARDING_ERRORS;
