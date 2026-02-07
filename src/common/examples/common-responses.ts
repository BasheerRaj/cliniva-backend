/**
 * Common Swagger Response Examples
 * 
 * Reusable example objects for Swagger documentation.
 * These examples demonstrate standard response formats across all modules.
 * 
 * @module common/examples/common-responses
 */

import { ErrorCode } from '../constants/error-codes';

/**
 * Success Response Examples
 */
export const SUCCESS_EXAMPLES = {
  /**
   * Generic success response
   */
  GENERIC_SUCCESS: {
    success: true,
    data: {
      id: '507f1f77bcf86cd799439011',
      createdAt: '2026-02-07T10:00:00.000Z',
      updatedAt: '2026-02-07T10:00:00.000Z',
    },
    message: {
      ar: 'تمت العملية بنجاح',
      en: 'Operation completed successfully',
    },
  },

  /**
   * Resource created successfully (201)
   */
  CREATED: {
    success: true,
    data: {
      id: '507f1f77bcf86cd799439011',
      createdAt: '2026-02-07T10:00:00.000Z',
    },
    message: {
      ar: 'تم إنشاء العنصر بنجاح',
      en: 'Item created successfully',
    },
  },

  /**
   * Resource updated successfully (200)
   */
  UPDATED: {
    success: true,
    data: {
      id: '507f1f77bcf86cd799439011',
      updatedAt: '2026-02-07T10:00:00.000Z',
    },
    message: {
      ar: 'تم تحديث العنصر بنجاح',
      en: 'Item updated successfully',
    },
  },

  /**
   * Resource deleted successfully (200)
   */
  DELETED: {
    success: true,
    message: {
      ar: 'تم حذف العنصر بنجاح',
      en: 'Item deleted successfully',
    },
  },

  /**
   * Operation completed with no content (204)
   */
  NO_CONTENT: {
    success: true,
  },
};

/**
 * List Response Examples
 */
export const LIST_EXAMPLES = {
  /**
   * Paginated list response
   */
  PAGINATED_LIST: {
    success: true,
    data: [
      {
        id: '507f1f77bcf86cd799439011',
        name: 'Item 1',
        createdAt: '2026-02-07T10:00:00.000Z',
      },
      {
        id: '507f1f77bcf86cd799439012',
        name: 'Item 2',
        createdAt: '2026-02-07T10:05:00.000Z',
      },
    ],
    meta: {
      page: 1,
      limit: 10,
      total: 25,
      totalPages: 3,
    },
  },

  /**
   * Empty list response
   */
  EMPTY_LIST: {
    success: true,
    data: [],
    meta: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    },
  },
};

/**
 * Error Response Examples
 */
export const ERROR_EXAMPLES = {
  /**
   * Validation error (400)
   */
  VALIDATION_ERROR: {
    success: false,
    error: {
      code: ErrorCode.VALIDATION_ERROR,
      message: {
        ar: 'خطأ في التحقق من البيانات',
        en: 'Validation error',
      },
      details: {
        field: 'email',
        constraint: 'isEmail',
        value: 'invalid-email',
      },
    },
  },

  /**
   * Required field missing (400)
   */
  REQUIRED_FIELD: {
    success: false,
    error: {
      code: ErrorCode.REQUIRED_FIELD,
      message: {
        ar: 'هذا الحقل مطلوب',
        en: 'This field is required',
      },
      details: {
        field: 'name',
      },
    },
  },

  /**
   * Invalid format (400)
   */
  INVALID_FORMAT: {
    success: false,
    error: {
      code: ErrorCode.INVALID_FORMAT,
      message: {
        ar: 'تنسيق غير صالح',
        en: 'Invalid format',
      },
      details: {
        field: 'phoneNumber',
        expectedFormat: '+966XXXXXXXXX',
      },
    },
  },

  /**
   * Unauthorized access (401)
   */
  UNAUTHORIZED: {
    success: false,
    error: {
      code: ErrorCode.UNAUTHORIZED,
      message: {
        ar: 'غير مصرح لك بالوصول',
        en: 'Unauthorized access',
      },
    },
  },

  /**
   * Invalid credentials (401)
   */
  INVALID_CREDENTIALS: {
    success: false,
    error: {
      code: ErrorCode.INVALID_CREDENTIALS,
      message: {
        ar: 'بيانات الاعتماد غير صحيحة',
        en: 'Invalid credentials',
      },
    },
  },

  /**
   * Token expired (401)
   */
  TOKEN_EXPIRED: {
    success: false,
    error: {
      code: ErrorCode.TOKEN_EXPIRED,
      message: {
        ar: 'انتهت صلاحية الرمز',
        en: 'Token expired',
      },
    },
  },

  /**
   * Insufficient permissions (403)
   */
  FORBIDDEN: {
    success: false,
    error: {
      code: ErrorCode.INSUFFICIENT_PERMISSIONS,
      message: {
        ar: 'ليس لديك الصلاحيات الكافية',
        en: 'Insufficient permissions',
      },
    },
  },

  /**
   * Resource not found (404)
   */
  NOT_FOUND: {
    success: false,
    error: {
      code: ErrorCode.NOT_FOUND,
      message: {
        ar: 'العنصر غير موجود',
        en: 'Item not found',
      },
      details: {
        resourceId: '507f1f77bcf86cd799439011',
      },
    },
  },

  /**
   * Resource already exists (409)
   */
  ALREADY_EXISTS: {
    success: false,
    error: {
      code: ErrorCode.ALREADY_EXISTS,
      message: {
        ar: 'العنصر موجود بالفعل',
        en: 'Item already exists',
      },
      details: {
        field: 'email',
        value: 'user@example.com',
      },
    },
  },

  /**
   * Duplicate entry (409)
   */
  DUPLICATE_ENTRY: {
    success: false,
    error: {
      code: ErrorCode.DUPLICATE_ENTRY,
      message: {
        ar: 'إدخال مكرر',
        en: 'Duplicate entry',
      },
      details: {
        field: 'email',
      },
    },
  },

  /**
   * Business rule violation (422)
   */
  BUSINESS_RULE_VIOLATION: {
    success: false,
    error: {
      code: ErrorCode.BUSINESS_RULE_VIOLATION,
      message: {
        ar: 'انتهاك قاعدة عمل',
        en: 'Business rule violation',
      },
      details: {
        rule: 'Cannot delete entity with active dependencies',
      },
    },
  },

  /**
   * Rate limit exceeded (429)
   */
  RATE_LIMIT_EXCEEDED: {
    success: false,
    error: {
      code: ErrorCode.RATE_LIMIT_EXCEEDED,
      message: {
        ar: 'تم تجاوز الحد المسموح من المحاولات',
        en: 'Rate limit exceeded',
      },
      details: {
        retryAfter: 60,
      },
    },
  },

  /**
   * Internal server error (500)
   */
  INTERNAL_ERROR: {
    success: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: {
        ar: 'حدث خطأ داخلي في الخادم',
        en: 'Internal server error',
      },
    },
  },

  /**
   * Database error (500)
   */
  DATABASE_ERROR: {
    success: false,
    error: {
      code: ErrorCode.DATABASE_ERROR,
      message: {
        ar: 'خطأ في قاعدة البيانات',
        en: 'Database error',
      },
    },
  },

  /**
   * Service unavailable (503)
   */
  SERVICE_UNAVAILABLE: {
    success: false,
    error: {
      code: ErrorCode.SERVICE_UNAVAILABLE,
      message: {
        ar: 'الخدمة غير متاحة',
        en: 'Service unavailable',
      },
    },
  },
};

/**
 * Combined examples object for easy import
 */
export const COMMON_SWAGGER_EXAMPLES = {
  ...SUCCESS_EXAMPLES,
  ...LIST_EXAMPLES,
  ...ERROR_EXAMPLES,
};

/**
 * Helper function to create custom success example
 */
export function createSuccessExample(data: any, messageAr: string, messageEn: string) {
  return {
    success: true,
    data,
    message: {
      ar: messageAr,
      en: messageEn,
    },
  };
}

/**
 * Helper function to create custom error example
 */
export function createErrorExample(
  code: ErrorCode,
  messageAr: string,
  messageEn: string,
  details?: any,
) {
  return {
    success: false,
    error: {
      code,
      message: {
        ar: messageAr,
        en: messageEn,
      },
      details,
    },
  };
}

/**
 * Helper function to create paginated list example
 */
export function createPaginatedExample(items: any[], page = 1, limit = 10, total?: number) {
  const actualTotal = total ?? items.length;
  return {
    success: true,
    data: items,
    meta: {
      page,
      limit,
      total: actualTotal,
      totalPages: Math.ceil(actualTotal / limit),
    },
  };
}
