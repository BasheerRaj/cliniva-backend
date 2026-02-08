/**
 * Subscription Module Swagger Examples
 * 
 * Example objects for Swagger documentation in the subscription module.
 * Demonstrates subscription management, plan types, and feature restrictions.
 * 
 * @module subscription/constants/swagger-examples
 */

import { COMMON_SWAGGER_EXAMPLES } from '../../common/examples/common-responses';

/**
 * Subscription Success Response Examples
 */
export const SUBSCRIPTION_SUCCESS_EXAMPLES = {
  /**
   * Subscription created successfully
   */
  CREATE_SUBSCRIPTION_SUCCESS: {
    success: true,
    data: {
      _id: '507f1f77bcf86cd799439011',
      userId: '507f1f77bcf86cd799439012',
      planId: '507f1f77bcf86cd799439013',
      status: 'active',
      startedAt: '2026-02-07T10:00:00.000Z',
      expiresAt: null,
      createdAt: '2026-02-07T10:00:00.000Z',
      updatedAt: '2026-02-07T10:00:00.000Z',
    },
    message: {
      ar: 'تم إنشاء الاشتراك بنجاح',
      en: 'Subscription created successfully',
    },
  },

  /**
   * Get user subscription success
   */
  GET_USER_SUBSCRIPTION_SUCCESS: {
    success: true,
    data: {
      _id: '507f1f77bcf86cd799439011',
      userId: '507f1f77bcf86cd799439012',
      planId: {
        _id: '507f1f77bcf86cd799439013',
        name: 'complex',
        price: 299.99,
        maxClinics: 10,
        maxComplexes: 1,
        maxOrganizations: 0,
        features: ['Department management', 'Multiple clinics', 'Advanced reporting'],
        isActive: true,
      },
      status: 'active',
      startedAt: '2026-02-07T10:00:00.000Z',
      expiresAt: null,
      createdAt: '2026-02-07T10:00:00.000Z',
      updatedAt: '2026-02-07T10:00:00.000Z',
    },
    message: {
      ar: 'تم العثور على الاشتراك',
      en: 'Subscription found',
    },
  },

  /**
   * No subscription found for user
   */
  NO_SUBSCRIPTION_FOUND: {
    success: true,
    data: null,
    message: {
      ar: 'لم يتم العثور على اشتراك',
      en: 'No subscription found',
    },
  },

  /**
   * Subscription status updated successfully
   */
  UPDATE_STATUS_SUCCESS: {
    success: true,
    data: {
      _id: '507f1f77bcf86cd799439011',
      userId: '507f1f77bcf86cd799439012',
      planId: '507f1f77bcf86cd799439013',
      status: 'cancelled',
      startedAt: '2026-02-07T10:00:00.000Z',
      expiresAt: '2026-02-07T15:30:00.000Z',
      createdAt: '2026-02-07T10:00:00.000Z',
      updatedAt: '2026-02-07T15:30:00.000Z',
    },
    message: {
      ar: 'تم تحديث حالة الاشتراك بنجاح',
      en: 'Subscription status updated successfully',
    },
  },

  /**
   * Get all subscription plans
   */
  GET_PLANS_SUCCESS: [
    {
      _id: '507f1f77bcf86cd799439013',
      name: 'Single Clinic Plan',
      type: 'clinic',
      price: 99.99,
      currency: 'USD',
      billingPeriod: 'monthly',
      features: [
        'Minimal setup',
        'Quick onboarding',
        'Direct management by the clinic owner or manager',
      ],
      limitations: ['Up to 1 clinics'],
      maxClinics: 1,
      maxComplexes: 0,
      maxOrganizations: 0,
      isActive: true,
      isPopular: false,
      description: 'Simple and affordable solution for independent clinics and small practices',
    },
    {
      _id: '507f1f77bcf86cd799439014',
      name: 'Complex Plan',
      type: 'complex',
      price: 299.99,
      currency: 'USD',
      billingPeriod: 'monthly',
      features: [
        'Localized administration',
        'Department-based control',
        'Full visibility over all clinics',
      ],
      limitations: ['Up to 10 clinics', 'Up to 1 complexes'],
      maxClinics: 10,
      maxComplexes: 1,
      maxOrganizations: 0,
      isActive: true,
      isPopular: true,
      description: 'Ideal for medical complexes with multiple departments and clinics under one roof',
    },
    {
      _id: '507f1f77bcf86cd799439015',
      name: 'Company Plan',
      type: 'company',
      price: 999.99,
      currency: 'USD',
      billingPeriod: 'monthly',
      features: [
        'Centralized admin and reporting',
        'Multi-location support',
        'Role hierarchy across all levels',
      ],
      limitations: ['Up to 1 organizations'],
      maxClinics: null,
      maxComplexes: null,
      maxOrganizations: 1,
      isActive: true,
      isPopular: false,
      description: 'Perfect for large healthcare networks managing multiple complexes and locations',
    },
  ],
};

/**
 * Subscription Error Response Examples
 */
export const SUBSCRIPTION_ERROR_EXAMPLES = {
  /**
   * Subscription plan not found
   */
  PLAN_NOT_FOUND: {
    success: false,
    error: {
      code: 'SUBSCRIPTION_PLAN_NOT_FOUND',
      message: {
        ar: 'خطة الاشتراك غير موجودة',
        en: 'Subscription plan not found',
      },
      details: {
        planType: 'invalid-plan',
      },
    },
  },

  /**
   * Plan type mismatch
   */
  PLAN_TYPE_MISMATCH: {
    success: false,
    error: {
      code: 'PLAN_TYPE_MISMATCH',
      message: {
        ar: 'نوع الخطة غير متطابق',
        en: 'Plan type mismatch',
      },
      details: {
        expectedPlanType: 'complex',
        providedPlanType: 'clinic',
      },
    },
  },

  /**
   * Active subscription already exists
   */
  ACTIVE_SUBSCRIPTION_EXISTS: {
    success: false,
    error: {
      code: 'ACTIVE_SUBSCRIPTION_EXISTS',
      message: {
        ar: 'يوجد اشتراك نشط بالفعل',
        en: 'Active subscription already exists',
      },
    },
  },

  /**
   * Subscription not found
   */
  SUBSCRIPTION_NOT_FOUND: {
    success: false,
    error: {
      code: 'SUBSCRIPTION_NOT_FOUND',
      message: {
        ar: 'الاشتراك غير موجود',
        en: 'Subscription not found',
      },
    },
  },

  /**
   * Invalid subscription status
   */
  INVALID_STATUS: {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: {
        ar: 'حالة الاشتراك غير صالحة',
        en: 'Invalid subscription status',
      },
      details: {
        field: 'status',
        allowedValues: ['active', 'inactive', 'cancelled'],
      },
    },
  },

  /**
   * Subscription limit exceeded
   */
  SUBSCRIPTION_LIMIT_EXCEEDED: {
    success: false,
    error: {
      code: 'SUBSCRIPTION_LIMIT_EXCEEDED',
      message: {
        ar: 'تم تجاوز حد الاشتراك',
        en: 'Subscription limit exceeded',
      },
      details: {
        limit: 10,
        current: 10,
        entity: 'clinics',
      },
    },
  },

  /**
   * Subscription expired
   */
  SUBSCRIPTION_EXPIRED: {
    success: false,
    error: {
      code: 'SUBSCRIPTION_EXPIRED',
      message: {
        ar: 'انتهت صلاحية الاشتراك',
        en: 'Subscription expired',
      },
      details: {
        expiresAt: '2026-01-01T00:00:00.000Z',
      },
    },
  },
};

/**
 * Plan Type Documentation
 */
export const PLAN_TYPE_DESCRIPTIONS = {
  clinic: {
    name: 'Single Clinic Plan',
    description: 'Simple and affordable solution for independent clinics and small practices',
    hierarchy: 'Clinic only',
    features: [
      'Minimal setup',
      'Quick onboarding',
      'Direct management by the clinic owner or manager',
      'Patient management',
      'Appointment scheduling',
      'Basic reporting',
    ],
    limitations: {
      maxClinics: 1,
      maxComplexes: 0,
      maxOrganizations: 0,
    },
    idealFor: 'Independent clinics, small practices, single-location healthcare providers',
  },
  complex: {
    name: 'Complex Plan',
    description: 'Ideal for medical complexes with multiple departments and clinics under one roof',
    hierarchy: 'Complex → Departments → Clinics',
    features: [
      'Localized administration',
      'Department-based control',
      'Full visibility over all clinics',
      'Multi-clinic management',
      'Department organization',
      'Advanced reporting',
      'Resource sharing',
    ],
    limitations: {
      maxClinics: 10,
      maxComplexes: 1,
      maxOrganizations: 0,
    },
    idealFor: 'Medical complexes, multi-specialty centers, healthcare facilities with multiple departments',
  },
  company: {
    name: 'Company Plan',
    description: 'Perfect for large healthcare networks managing multiple complexes and locations',
    hierarchy: 'Organization → Complexes → Departments → Clinics',
    features: [
      'Centralized admin and reporting',
      'Multi-location support',
      'Role hierarchy across all levels',
      'Unlimited complexes and clinics',
      'Enterprise-level features',
      'Advanced analytics',
      'Custom integrations',
    ],
    limitations: {
      maxClinics: null, // Unlimited
      maxComplexes: null, // Unlimited
      maxOrganizations: 1,
    },
    idealFor: 'Healthcare networks, hospital chains, large medical organizations with multiple locations',
  },
};

/**
 * Combined Swagger Examples
 */
export const SUBSCRIPTION_SWAGGER_EXAMPLES = {
  ...SUBSCRIPTION_SUCCESS_EXAMPLES,
  ...SUBSCRIPTION_ERROR_EXAMPLES,
  ...COMMON_SWAGGER_EXAMPLES,
};
