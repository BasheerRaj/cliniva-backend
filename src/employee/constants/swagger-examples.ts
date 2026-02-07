/**
 * Employee Module Swagger Examples
 * 
 * Example objects for Swagger documentation of employee management endpoints.
 * All examples follow the standard response format with bilingual messages.
 * 
 * @module employee/constants/swagger-examples
 */

import { ErrorCode } from '../../common/constants/error-codes';

/**
 * Employee Success Response Examples
 */
export const EMPLOYEE_SUCCESS_EXAMPLES = {
  /**
   * Employee created successfully (201)
   */
  CREATE_SUCCESS: {
    success: true,
    data: {
      _id: '507f1f77bcf86cd799439011',
      email: 'john.doe@cliniva.com',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+966501234567',
      role: 'doctor',
      nationality: 'Saudi Arabia',
      gender: 'male',
      dateOfBirth: '1990-05-15T00:00:00.000Z',
      address: '123 Medical Street, Riyadh',
      isActive: true,
      emailVerified: false,
      setupComplete: false,
      onboardingComplete: false,
      createdAt: '2026-02-07T10:00:00.000Z',
      updatedAt: '2026-02-07T10:00:00.000Z',
      employeeProfile: {
        _id: '507f1f77bcf86cd799439012',
        userId: '507f1f77bcf86cd799439011',
        employeeNumber: 'EMP20260001',
        cardNumber: 'CARD123456',
        maritalStatus: 'married',
        numberOfChildren: 2,
        profilePictureUrl: 'https://example.com/profiles/john-doe.jpg',
        jobTitle: 'Senior Physician',
        dateOfHiring: '2024-01-15T00:00:00.000Z',
        salary: 25000,
        bankAccount: 'SA1234567890123456789012',
        socialSecurityNumber: 'SSN123456789',
        taxId: 'TAX987654321',
        notes: 'Specialized in cardiology',
        isActive: true,
        createdAt: '2026-02-07T10:00:00.000Z',
        updatedAt: '2026-02-07T10:00:00.000Z',
      },
    },
    message: {
      ar: 'تم إنشاء الموظف بنجاح',
      en: 'Employee created successfully',
    },
  },

  /**
   * Employee retrieved successfully (200)
   */
  GET_SUCCESS: {
    success: true,
    data: {
      _id: '507f1f77bcf86cd799439011',
      email: 'john.doe@cliniva.com',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+966501234567',
      role: 'doctor',
      nationality: 'Saudi Arabia',
      gender: 'male',
      dateOfBirth: '1990-05-15T00:00:00.000Z',
      address: '123 Medical Street, Riyadh',
      isActive: true,
      emailVerified: true,
      setupComplete: true,
      onboardingComplete: true,
      createdAt: '2026-02-07T10:00:00.000Z',
      updatedAt: '2026-02-07T10:00:00.000Z',
      employeeProfile: {
        _id: '507f1f77bcf86cd799439012',
        userId: '507f1f77bcf86cd799439011',
        employeeNumber: 'EMP20260001',
        cardNumber: 'CARD123456',
        maritalStatus: 'married',
        numberOfChildren: 2,
        profilePictureUrl: 'https://example.com/profiles/john-doe.jpg',
        jobTitle: 'Senior Physician',
        dateOfHiring: '2024-01-15T00:00:00.000Z',
        salary: 25000,
        bankAccount: 'SA1234567890123456789012',
        socialSecurityNumber: 'SSN123456789',
        taxId: 'TAX987654321',
        notes: 'Specialized in cardiology',
        isActive: true,
        createdAt: '2026-02-07T10:00:00.000Z',
        updatedAt: '2026-02-07T10:00:00.000Z',
      },
      shifts: [
        {
          _id: '507f1f77bcf86cd799439013',
          shiftName: 'Morning Shift',
          dayOfWeek: 'monday',
          startTime: '08:00',
          endTime: '16:00',
          breakDurationMinutes: 60,
          entityType: 'clinic',
          entityId: '507f1f77bcf86cd799439020',
          isActive: true,
        },
      ],
      documents: [
        {
          _id: '507f1f77bcf86cd799439014',
          documentType: 'license',
          documentName: 'Medical License',
          status: 'active',
          expiryDate: '2027-12-31T00:00:00.000Z',
          isVerified: true,
        },
      ],
      organization: {
        _id: '507f1f77bcf86cd799439030',
        name: 'Cliniva Healthcare',
      },
      complex: {
        _id: '507f1f77bcf86cd799439031',
        name: 'Main Medical Complex',
      },
      clinic: {
        _id: '507f1f77bcf86cd799439032',
        name: 'Cardiology Clinic',
      },
    },
    message: {
      ar: 'تم استرجاع بيانات الموظف بنجاح',
      en: 'Employee retrieved successfully',
    },
  },

  /**
   * Employee updated successfully (200)
   */
  UPDATE_SUCCESS: {
    success: true,
    data: {
      _id: '507f1f77bcf86cd799439011',
      email: 'john.doe@cliniva.com',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+966501234567',
      role: 'doctor',
      jobTitle: 'Chief Physician',
      salary: 30000,
      updatedAt: '2026-02-07T11:00:00.000Z',
    },
    message: {
      ar: 'تم تحديث بيانات الموظف بنجاح',
      en: 'Employee updated successfully',
    },
  },

  /**
   * Employee deleted successfully (200)
   */
  DELETE_SUCCESS: {
    success: true,
    message: {
      ar: 'تم حذف الموظف بنجاح',
      en: 'Employee deleted successfully',
    },
  },

  /**
   * Employee list with pagination (200)
   */
  LIST_SUCCESS: {
    success: true,
    data: [
      {
        _id: '507f1f77bcf86cd799439011',
        email: 'john.doe@cliniva.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+966501234567',
        role: 'doctor',
        employeeProfile: {
          employeeNumber: 'EMP20260001',
          jobTitle: 'Senior Physician',
          dateOfHiring: '2024-01-15T00:00:00.000Z',
          isActive: true,
        },
      },
      {
        _id: '507f1f77bcf86cd799439015',
        email: 'jane.smith@cliniva.com',
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+966501234568',
        role: 'nurse',
        employeeProfile: {
          employeeNumber: 'EMP20260002',
          jobTitle: 'Head Nurse',
          dateOfHiring: '2024-02-01T00:00:00.000Z',
          isActive: true,
        },
      },
    ],
    pagination: {
      total: 25,
      page: 1,
      totalPages: 3,
      limit: 10,
    },
    message: {
      ar: 'تم استرجاع قائمة الموظفين بنجاح',
      en: 'Employees retrieved successfully',
    },
  },

  /**
   * Employee terminated successfully (200)
   */
  TERMINATE_SUCCESS: {
    success: true,
    data: {
      _id: '507f1f77bcf86cd799439011',
      isActive: false,
      employeeProfile: {
        terminationDate: '2026-02-07T00:00:00.000Z',
        isActive: false,
      },
    },
    message: {
      ar: 'تم إنهاء خدمة الموظف بنجاح',
      en: 'Employee terminated successfully',
    },
  },

  /**
   * Employee statistics (200)
   */
  STATS_SUCCESS: {
    success: true,
    data: {
      totalEmployees: 150,
      activeEmployees: 145,
      inactiveEmployees: 5,
      newHiresThisMonth: 8,
      newHiresThisYear: 45,
      averageTenure: 24,
      employeesByRole: [
        { role: 'doctor', count: 45, percentage: 30 },
        { role: 'nurse', count: 60, percentage: 40 },
        { role: 'admin', count: 20, percentage: 13.3 },
        { role: 'technician', count: 25, percentage: 16.7 },
      ],
      salaryStatistics: {
        averageSalary: 18500,
        medianSalary: 16000,
        salaryRangeByRole: [
          { role: 'doctor', minSalary: 20000, maxSalary: 50000, averageSalary: 32000 },
          { role: 'nurse', minSalary: 8000, maxSalary: 18000, averageSalary: 12000 },
        ],
      },
      monthlyHiringTrend: [
        { month: '2026-01', count: 12 },
        { month: '2026-02', count: 8 },
      ],
      upcomingDocumentExpirations: [
        {
          employeeId: '507f1f77bcf86cd799439011',
          employeeName: 'John Doe',
          documentType: 'license',
          expiryDate: '2026-03-15T00:00:00.000Z',
          daysUntilExpiry: 36,
        },
      ],
    },
    message: {
      ar: 'تم استرجاع إحصائيات الموظفين بنجاح',
      en: 'Employee statistics retrieved successfully',
    },
  },
};

/**
 * Employee Error Response Examples
 */
export const EMPLOYEE_ERROR_EXAMPLES = {
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
   * Employee not found (404)
   */
  NOT_FOUND: {
    success: false,
    error: {
      code: ErrorCode.NOT_FOUND,
      message: {
        ar: 'الموظف غير موجود',
        en: 'Employee not found',
      },
      details: {
        employeeId: '507f1f77bcf86cd799439011',
      },
    },
  },

  /**
   * Email already exists (409)
   */
  EMAIL_EXISTS: {
    success: false,
    error: {
      code: ErrorCode.DUPLICATE_ENTRY,
      message: {
        ar: 'البريد الإلكتروني موجود بالفعل',
        en: 'Email already exists',
      },
      details: {
        field: 'email',
        value: 'john.doe@cliniva.com',
      },
    },
  },

  /**
   * Employee number already exists (409)
   */
  EMPLOYEE_NUMBER_EXISTS: {
    success: false,
    error: {
      code: ErrorCode.DUPLICATE_ENTRY,
      message: {
        ar: 'رقم الموظف موجود بالفعل',
        en: 'Employee number already exists',
      },
      details: {
        field: 'employeeNumber',
        value: 'EMP20260001',
      },
    },
  },

  /**
   * Invalid date of birth (400)
   */
  INVALID_DATE_OF_BIRTH: {
    success: false,
    error: {
      code: ErrorCode.VALIDATION_ERROR,
      message: {
        ar: 'يجب أن يكون عمر الموظف 16 عامًا على الأقل',
        en: 'Employee must be at least 16 years old',
      },
      details: {
        field: 'dateOfBirth',
      },
    },
  },

  /**
   * Cannot delete own account (400)
   */
  CANNOT_DELETE_SELF: {
    success: false,
    error: {
      code: ErrorCode.BUSINESS_RULE_VIOLATION,
      message: {
        ar: 'لا يمكنك حذف حسابك الخاص',
        en: 'Cannot delete your own account',
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
};

/**
 * Combined employee examples for easy import
 */
export const EMPLOYEE_SWAGGER_EXAMPLES = {
  ...EMPLOYEE_SUCCESS_EXAMPLES,
  ...EMPLOYEE_ERROR_EXAMPLES,
};
