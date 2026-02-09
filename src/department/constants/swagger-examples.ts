/**
 * Department Module Swagger Examples
 *
 * Reusable example objects for Swagger documentation in the Department module.
 * These examples demonstrate department-specific response formats and data structures.
 *
 * @module department/constants/swagger-examples
 */

import {
  DEPARTMENT_ERROR_CODES,
  DEPARTMENT_ERROR_MESSAGES,
  DEPARTMENT_SUCCESS_MESSAGES,
} from './error-messages';

/**
 * Department Success Response Examples
 */
export const DEPARTMENT_SUCCESS_EXAMPLES = {
  /**
   * Department created successfully
   */
  CREATE_DEPARTMENT_SUCCESS: {
    success: true,
    data: {
      _id: '507f1f77bcf86cd799439011',
      name: 'Cardiology',
      description: 'Heart and cardiovascular system department',
      createdAt: '2026-02-07T10:00:00.000Z',
      updatedAt: '2026-02-07T10:00:00.000Z',
    },
    message: DEPARTMENT_SUCCESS_MESSAGES.CREATED,
  },

  /**
   * Department details retrieved successfully
   */
  GET_DEPARTMENT_SUCCESS: {
    success: true,
    data: {
      _id: '507f1f77bcf86cd799439011',
      name: 'Cardiology',
      description: 'Heart and cardiovascular system department',
      createdAt: '2026-02-07T10:00:00.000Z',
      updatedAt: '2026-02-07T10:00:00.000Z',
    },
    message: DEPARTMENT_SUCCESS_MESSAGES.RETRIEVED,
  },

  /**
   * Department updated successfully
   */
  UPDATE_DEPARTMENT_SUCCESS: {
    success: true,
    data: {
      _id: '507f1f77bcf86cd799439011',
      name: 'Cardiology & Vascular',
      description:
        'Heart, cardiovascular system, and vascular surgery department',
      createdAt: '2026-02-07T10:00:00.000Z',
      updatedAt: '2026-02-07T12:30:00.000Z',
    },
    message: {
      ar: 'تم تحديث القسم بنجاح',
      en: 'Department updated successfully',
    },
  },

  /**
   * Departments list retrieved successfully
   */
  LIST_DEPARTMENTS_SUCCESS: {
    success: true,
    data: [
      {
        _id: '507f1f77bcf86cd799439011',
        name: 'Cardiology',
        description: 'Heart and cardiovascular system department',
        createdAt: '2026-02-07T10:00:00.000Z',
        updatedAt: '2026-02-07T10:00:00.000Z',
      },
      {
        _id: '507f1f77bcf86cd799439012',
        name: 'Pediatrics',
        description: 'Children healthcare department',
        createdAt: '2026-02-07T09:00:00.000Z',
        updatedAt: '2026-02-07T09:00:00.000Z',
      },
      {
        _id: '507f1f77bcf86cd799439013',
        name: 'Orthopedics',
        description: 'Bone and joint care department',
        createdAt: '2026-02-07T08:00:00.000Z',
        updatedAt: '2026-02-07T08:00:00.000Z',
      },
    ],
    message: DEPARTMENT_SUCCESS_MESSAGES.LIST_RETRIEVED,
  },

  /**
   * Departments assigned to complex successfully
   */
  ASSIGN_DEPARTMENTS_SUCCESS: {
    success: true,
    data: [
      {
        _id: '507f1f77bcf86cd799439020',
        complexId: '507f1f77bcf86cd799439015',
        departmentId: {
          _id: '507f1f77bcf86cd799439011',
          name: 'Cardiology',
          description: 'Heart and cardiovascular system department',
        },
        isActive: true,
        createdAt: '2026-02-07T10:00:00.000Z',
        updatedAt: '2026-02-07T10:00:00.000Z',
      },
      {
        _id: '507f1f77bcf86cd799439021',
        complexId: '507f1f77bcf86cd799439015',
        departmentId: {
          _id: '507f1f77bcf86cd799439012',
          name: 'Pediatrics',
          description: 'Children healthcare department',
        },
        isActive: true,
        createdAt: '2026-02-07T10:00:00.000Z',
        updatedAt: '2026-02-07T10:00:00.000Z',
      },
    ],
    message: {
      ar: 'تم تعيين الأقسام للمجمع بنجاح',
      en: 'Departments assigned to complex successfully',
    },
  },

  /**
   * Departments by complex retrieved successfully
   */
  GET_DEPARTMENTS_BY_COMPLEX_SUCCESS: {
    success: true,
    data: [
      {
        _id: '507f1f77bcf86cd799439011',
        name: 'Cardiology',
        description: 'Heart and cardiovascular system department',
        createdAt: '2026-02-07T10:00:00.000Z',
        updatedAt: '2026-02-07T10:00:00.000Z',
      },
      {
        _id: '507f1f77bcf86cd799439012',
        name: 'Pediatrics',
        description: 'Children healthcare department',
        createdAt: '2026-02-07T09:00:00.000Z',
        updatedAt: '2026-02-07T09:00:00.000Z',
      },
    ],
    message: {
      ar: 'تم استرجاع أقسام المجمع بنجاح',
      en: 'Complex departments retrieved successfully',
    },
  },

  /**
   * Complex-department relationships retrieved successfully
   */
  GET_COMPLEX_DEPARTMENTS_SUCCESS: {
    success: true,
    data: [
      {
        _id: '507f1f77bcf86cd799439020',
        complexId: '507f1f77bcf86cd799439015',
        departmentId: {
          _id: '507f1f77bcf86cd799439011',
          name: 'Cardiology',
          description: 'Heart and cardiovascular system department',
        },
        isActive: true,
        createdAt: '2026-02-07T10:00:00.000Z',
        updatedAt: '2026-02-07T10:00:00.000Z',
      },
      {
        _id: '507f1f77bcf86cd799439021',
        complexId: '507f1f77bcf86cd799439015',
        departmentId: {
          _id: '507f1f77bcf86cd799439012',
          name: 'Pediatrics',
          description: 'Children healthcare department',
        },
        isActive: true,
        createdAt: '2026-02-07T10:00:00.000Z',
        updatedAt: '2026-02-07T10:00:00.000Z',
      },
    ],
    message: {
      ar: 'تم استرجاع علاقات المجمع والأقسام بنجاح',
      en: 'Complex-department relationships retrieved successfully',
    },
  },

  /**
   * Complex-department relationship created successfully
   */
  CREATE_COMPLEX_DEPARTMENT_SUCCESS: {
    success: true,
    data: {
      _id: '507f1f77bcf86cd799439020',
      complexId: '507f1f77bcf86cd799439015',
      departmentId: '507f1f77bcf86cd799439011',
      isActive: true,
      createdAt: '2026-02-07T10:00:00.000Z',
      updatedAt: '2026-02-07T10:00:00.000Z',
    },
    message: {
      ar: 'تم ربط القسم بالمجمع بنجاح',
      en: 'Department linked to complex successfully',
    },
  },

  /**
   * Department deleted successfully
   */
  DELETE_DEPARTMENT_SUCCESS: {
    success: true,
    message: DEPARTMENT_SUCCESS_MESSAGES.DELETED,
  },

  /**
   * Can delete department - no linkages
   */
  CAN_DELETE_SUCCESS: {
    success: true,
    data: {
      canDelete: true,
    },
  },

  /**
   * Cannot delete department - linked to clinics
   */
  CANNOT_DELETE_LINKED_CLINICS: {
    success: true,
    data: {
      canDelete: false,
      reason: {
        ar: 'لا يمكن حذف القسم لأنه مرتبط بـ 3 عيادات',
        en: 'Cannot delete department because it is linked to 3 clinics',
      },
      linkedClinics: [
        {
          clinicId: '507f1f77bcf86cd799439011',
          clinicName: 'Cardiology Clinic A',
          complexName: 'Medical Complex 1',
          complexId: '507f1f77bcf86cd799439012',
        },
        {
          clinicId: '507f1f77bcf86cd799439013',
          clinicName: 'Cardiology Clinic B',
          complexName: 'Medical Complex 1',
          complexId: '507f1f77bcf86cd799439012',
        },
        {
          clinicId: '507f1f77bcf86cd799439014',
          clinicName: 'Cardiology Clinic C',
          complexName: 'Medical Complex 2',
          complexId: '507f1f77bcf86cd799439015',
        },
      ],
      recommendations: {
        ar: 'يرجى إزالة القسم من جميع العيادات المرتبطة قبل الحذف',
        en: 'Please remove the department from all linked clinics before deletion',
      },
    },
  },

  /**
   * Cannot delete department - has services
   */
  CANNOT_DELETE_HAS_SERVICES: {
    success: true,
    data: {
      canDelete: false,
      reason: {
        ar: 'لا يمكن حذف القسم لأنه يحتوي على 5 خدمات',
        en: 'Cannot delete department because it has 5 services',
      },
      linkedServices: 5,
      recommendations: {
        ar: 'يرجى حذف أو نقل جميع الخدمات المرتبطة قبل حذف القسم',
        en: 'Please delete or move all linked services before deleting the department',
      },
    },
  },

  /**
   * Cannot delete department - linked to clinics and has services
   */
  CANNOT_DELETE_BOTH: {
    success: true,
    data: {
      canDelete: false,
      reason: {
        ar: 'لا يمكن حذف القسم لأنه مرتبط بـ 2 عيادات و 5 خدمات',
        en: 'Cannot delete department because it is linked to 2 clinics and 5 services',
      },
      linkedClinics: [
        {
          clinicId: '507f1f77bcf86cd799439011',
          clinicName: 'Cardiology Clinic A',
          complexName: 'Medical Complex 1',
          complexId: '507f1f77bcf86cd799439012',
        },
        {
          clinicId: '507f1f77bcf86cd799439013',
          clinicName: 'Cardiology Clinic B',
          complexName: 'Medical Complex 1',
          complexId: '507f1f77bcf86cd799439012',
        },
      ],
      linkedServices: 5,
      recommendations: {
        ar: 'يرجى إزالة القسم من جميع العيادات والخدمات المرتبطة قبل الحذف',
        en: 'Please remove the department from all linked clinics and services before deletion',
      },
    },
  },
};

/**
 * Department Error Response Examples
 */
export const DEPARTMENT_ERROR_EXAMPLES = {
  /**
   * Validation error
   */
  VALIDATION_ERROR: {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: {
        ar: 'خطأ في التحقق من البيانات',
        en: 'Validation error',
      },
      details: {
        field: 'name',
        constraint: 'isNotEmpty',
        value: '',
      },
    },
  },

  /**
   * Department not found
   */
  DEPARTMENT_NOT_FOUND: {
    success: false,
    error: {
      code: DEPARTMENT_ERROR_CODES.NOT_FOUND,
      message: DEPARTMENT_ERROR_MESSAGES.NOT_FOUND,
    },
  },

  /**
   * Department name already exists
   */
  DEPARTMENT_NAME_EXISTS: {
    success: false,
    error: {
      code: DEPARTMENT_ERROR_CODES.NAME_EXISTS,
      message: DEPARTMENT_ERROR_MESSAGES.NAME_EXISTS,
    },
  },

  /**
   * Cannot delete - linked to clinics
   */
  DELETE_LINKED_TO_CLINICS: {
    success: false,
    error: {
      code: DEPARTMENT_ERROR_CODES.LINKED_TO_CLINICS,
      message: DEPARTMENT_ERROR_MESSAGES.LINKED_TO_CLINICS,
      linkedClinics: [
        {
          clinicId: '507f1f77bcf86cd799439011',
          clinicName: 'Cardiology Clinic A',
          complexName: 'Medical Complex 1',
          complexId: '507f1f77bcf86cd799439012',
        },
        {
          clinicId: '507f1f77bcf86cd799439013',
          clinicName: 'Cardiology Clinic B',
          complexName: 'Medical Complex 1',
          complexId: '507f1f77bcf86cd799439012',
        },
        {
          clinicId: '507f1f77bcf86cd799439014',
          clinicName: 'Cardiology Clinic C',
          complexName: 'Medical Complex 2',
          complexId: '507f1f77bcf86cd799439015',
        },
      ],
      linkedClinicsCount: 3,
    },
  },

  /**
   * Cannot delete - has services
   */
  DELETE_HAS_SERVICES: {
    success: false,
    error: {
      code: DEPARTMENT_ERROR_CODES.HAS_SERVICES,
      message: DEPARTMENT_ERROR_MESSAGES.HAS_SERVICES,
      linkedServices: 5,
    },
  },

  /**
   * Department already assigned to complex
   */
  ALREADY_ASSIGNED: {
    success: false,
    error: {
      code: 'DEPARTMENT_ALREADY_ASSIGNED',
      message: {
        ar: 'القسم مرتبط بالفعل بهذا المجمع',
        en: 'Department already assigned to this complex',
      },
    },
  },

  /**
   * Invalid department ID format
   */
  INVALID_ID: {
    success: false,
    error: {
      code: 'INVALID_ID',
      message: {
        ar: 'معرف القسم غير صالح',
        en: 'Invalid department ID format',
      },
    },
  },

  /**
   * Unauthorized access
   */
  UNAUTHORIZED: {
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message: {
        ar: 'غير مصرح لك بالوصول',
        en: 'Unauthorized access',
      },
    },
  },

  /**
   * Insufficient permissions (requires Admin or Owner role)
   */
  FORBIDDEN: {
    success: false,
    error: {
      code: 'INSUFFICIENT_PERMISSIONS',
      message: {
        ar: 'ليس لديك الصلاحيات الكافية (يتطلب دور مسؤول أو مالك)',
        en: 'Insufficient permissions (requires Admin or Owner role)',
      },
    },
  },
};

/**
 * Combined Swagger examples for Department module
 */
export const DEPARTMENT_SWAGGER_EXAMPLES = {
  ...DEPARTMENT_SUCCESS_EXAMPLES,
  ...DEPARTMENT_ERROR_EXAMPLES,
};
