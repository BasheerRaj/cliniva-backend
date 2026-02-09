/**
 * Clinic Module Swagger Examples
 *
 * Reusable example objects for Swagger documentation in the Clinic module.
 * These examples demonstrate clinic-specific response formats and data structures.
 *
 * @module clinic/constants/swagger-examples
 */

import { ERROR_CODES } from './error-codes.constant';

/**
 * Clinic Success Response Examples
 */
export const CLINIC_SUCCESS_EXAMPLES = {
  /**
   * Clinic created successfully
   */
  CREATE_CLINIC_SUCCESS: {
    success: true,
    data: {
      _id: '507f1f77bcf86cd799439011',
      name: 'Cardiology Clinic',
      status: 'active',
      complexId: '507f1f77bcf86cd799439012',
      subscriptionId: '507f1f77bcf86cd799439013',
      maxDoctors: 10,
      maxStaff: 15,
      maxPatients: 100,
      sessionDuration: 30,
      email: 'cardiology@example.com',
      phone: '+966501234567',
      createdAt: '2026-02-07T10:00:00.000Z',
      updatedAt: '2026-02-07T10:00:00.000Z',
    },
    message: {
      ar: 'تم إنشاء العيادة بنجاح',
      en: 'Clinic created successfully',
    },
  },

  /**
   * Clinic details retrieved successfully
   */
  GET_CLINIC_SUCCESS: {
    success: true,
    data: {
      _id: '507f1f77bcf86cd799439011',
      name: 'Cardiology Clinic',
      status: 'active',
      complexId: '507f1f77bcf86cd799439012',
      subscriptionId: '507f1f77bcf86cd799439013',
      personInCharge: {
        _id: '507f1f77bcf86cd799439014',
        firstName: 'Ahmed',
        lastName: 'Al-Saudi',
        email: 'ahmed.alsaudi@example.com',
        role: 'owner',
      },
      maxDoctors: 10,
      maxStaff: 15,
      maxPatients: 100,
      sessionDuration: 30,
      email: 'cardiology@example.com',
      phone: '+966501234567',
      capacity: {
        doctors: {
          max: 10,
          current: 5,
          available: 5,
          percentage: 50,
          isExceeded: false,
          list: [
            {
              id: '507f1f77bcf86cd799439015',
              name: 'Dr. Mohammed Ali',
              role: 'doctor',
              email: 'mohammed.ali@example.com',
            },
          ],
        },
        staff: {
          max: 15,
          current: 8,
          available: 7,
          percentage: 53,
          isExceeded: false,
          list: [
            {
              id: '507f1f77bcf86cd799439016',
              name: 'Sara Ahmed',
              role: 'nurse',
              email: 'sara.ahmed@example.com',
            },
          ],
        },
        patients: {
          max: 100,
          current: 45,
          available: 55,
          percentage: 45,
          isExceeded: false,
          count: 45,
        },
      },
      scheduledAppointmentsCount: 12,
      recommendations: [],
      createdAt: '2026-02-07T10:00:00.000Z',
      updatedAt: '2026-02-07T10:00:00.000Z',
    },
    message: {
      ar: 'تم استرجاع تفاصيل العيادة بنجاح',
      en: 'Clinic details retrieved successfully',
    },
  },

  /**
   * Clinics list retrieved successfully
   */
  LIST_CLINICS_SUCCESS: {
    success: true,
    data: [
      {
        _id: '507f1f77bcf86cd799439011',
        name: 'Cardiology Clinic',
        status: 'active',
        complexId: '507f1f77bcf86cd799439012',
        subscriptionId: '507f1f77bcf86cd799439013',
        email: 'cardiology@example.com',
        phone: '+966501234567',
        capacity: {
          doctors: {
            max: 10,
            current: 5,
            isExceeded: false,
            percentage: 50,
          },
          staff: {
            max: 15,
            current: 8,
            isExceeded: false,
            percentage: 53,
          },
          patients: {
            max: 100,
            current: 45,
            isExceeded: false,
            percentage: 45,
          },
        },
        scheduledAppointmentsCount: 12,
      },
      {
        _id: '507f1f77bcf86cd799439017',
        name: 'Pediatrics Clinic',
        status: 'active',
        complexId: '507f1f77bcf86cd799439012',
        subscriptionId: '507f1f77bcf86cd799439013',
        email: 'pediatrics@example.com',
        phone: '+966501234568',
      },
    ],
    meta: {
      page: 1,
      limit: 10,
      total: 2,
      totalPages: 1,
    },
    message: {
      ar: 'تم استرجاع قائمة العيادات بنجاح',
      en: 'Clinics list retrieved successfully',
    },
  },

  /**
   * Clinic updated successfully
   */
  UPDATE_CLINIC_SUCCESS: {
    success: true,
    data: {
      _id: '507f1f77bcf86cd799439011',
      name: 'Advanced Cardiology Clinic',
      status: 'active',
      complexId: '507f1f77bcf86cd799439012',
      subscriptionId: '507f1f77bcf86cd799439013',
      maxDoctors: 15,
      maxStaff: 20,
      maxPatients: 150,
      updatedAt: '2026-02-07T11:00:00.000Z',
    },
    message: {
      ar: 'تم تحديث العيادة بنجاح',
      en: 'Clinic updated successfully',
    },
  },

  /**
   * Clinic status changed successfully
   */
  CHANGE_STATUS_SUCCESS: {
    success: true,
    data: {
      clinic: {
        _id: '507f1f77bcf86cd799439011',
        name: 'Cardiology Clinic',
        status: 'inactive',
        updatedAt: '2026-02-07T11:00:00.000Z',
      },
      transferredDoctors: 5,
      transferredStaff: 8,
      rescheduledAppointments: 12,
      notificationsSent: {
        staff: 13,
        patients: 12,
      },
    },
    message: {
      ar: 'تم تغيير حالة العيادة بنجاح',
      en: 'Clinic status changed successfully',
    },
  },

  /**
   * PIC assigned successfully
   */
  ASSIGN_PIC_SUCCESS: {
    success: true,
    data: {
      _id: '507f1f77bcf86cd799439011',
      name: 'Cardiology Clinic',
      personInCharge: {
        _id: '507f1f77bcf86cd799439014',
        firstName: 'Ahmed',
        lastName: 'Al-Saudi',
        email: 'ahmed.alsaudi@example.com',
        role: 'owner',
      },
      updatedAt: '2026-02-07T11:00:00.000Z',
    },
    message: {
      ar: 'تم تعيين المسؤول بنجاح',
      en: 'Person in charge assigned successfully',
    },
  },

  /**
   * Clinic services retrieved successfully
   */
  GET_SERVICES_SUCCESS: {
    success: true,
    data: [
      {
        _id: '507f1f77bcf86cd799439018',
        name: 'ECG Test',
        description: 'Electrocardiogram test',
        price: 200,
        duration: 30,
        isActive: true,
      },
      {
        _id: '507f1f77bcf86cd799439019',
        name: 'Consultation',
        description: 'Cardiology consultation',
        price: 300,
        duration: 45,
        isActive: true,
      },
    ],
    message: {
      ar: 'تم استرجاع خدمات العيادة بنجاح',
      en: 'Clinic services retrieved successfully',
    },
  },

  /**
   * Working hours validation success
   */
  VALIDATE_WORKING_HOURS_SUCCESS: {
    success: true,
    data: {
      isValid: true,
      errors: [],
      conflicts: {
        appointments: [],
        doctorSchedules: [],
        staffSchedules: [],
      },
    },
    message: {
      ar: 'ساعات العمل صالحة',
      en: 'Working hours are valid',
    },
  },

  /**
   * Capacity status retrieved successfully
   */
  CAPACITY_STATUS_SUCCESS: {
    success: true,
    data: {
      clinicId: '507f1f77bcf86cd799439011',
      clinicName: 'Cardiology Clinic',
      capacity: {
        doctors: {
          max: 10,
          current: 5,
          available: 5,
          percentage: 50,
          isExceeded: false,
          list: [
            {
              id: '507f1f77bcf86cd799439015',
              name: 'Dr. Mohammed Ali',
              role: 'doctor',
              email: 'mohammed.ali@example.com',
            },
          ],
        },
        staff: {
          max: 15,
          current: 8,
          available: 7,
          percentage: 53,
          isExceeded: false,
          list: [
            {
              id: '507f1f77bcf86cd799439016',
              name: 'Sara Ahmed',
              role: 'nurse',
              email: 'sara.ahmed@example.com',
            },
          ],
        },
        patients: {
          max: 100,
          current: 45,
          available: 55,
          percentage: 45,
          isExceeded: false,
          count: 45,
        },
      },
      recommendations: [],
    },
    message: {
      ar: 'تم جلب حالة السعة بنجاح',
      en: 'Capacity status retrieved successfully',
    },
  },
};

/**
 * Clinic Error Response Examples
 */
export const CLINIC_ERROR_EXAMPLES = {
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
        field: 'email',
        constraint: 'isEmail',
        value: 'invalid-email',
      },
    },
  },

  /**
   * Clinic not found
   */
  CLINIC_NOT_FOUND: {
    success: false,
    error: ERROR_CODES.CLINIC_007,
  },

  /**
   * Plan limit exceeded
   */
  PLAN_LIMIT_EXCEEDED: {
    success: false,
    error: ERROR_CODES.CLINIC_001,
  },

  /**
   * Invalid PIC (not from complex)
   */
  INVALID_PIC: {
    success: false,
    error: ERROR_CODES.CLINIC_002,
  },

  /**
   * Cannot delete clinic with active appointments
   */
  ACTIVE_APPOINTMENTS: {
    success: false,
    error: ERROR_CODES.CLINIC_003,
  },

  /**
   * Must transfer staff before deactivation
   */
  TRANSFER_REQUIRED: {
    success: false,
    error: ERROR_CODES.CLINIC_004,
  },

  /**
   * Working hours outside complex hours
   */
  HOURS_OUTSIDE_COMPLEX: {
    success: false,
    error: ERROR_CODES.CLINIC_005,
  },

  /**
   * Working hours conflict with appointments
   */
  HOURS_CONFLICT: {
    success: false,
    error: ERROR_CODES.CLINIC_006,
  },

  /**
   * Target clinic not found
   */
  TARGET_CLINIC_NOT_FOUND: {
    success: false,
    error: ERROR_CODES.CLINIC_008,
  },

  /**
   * Invalid email format
   */
  INVALID_EMAIL: {
    success: false,
    error: ERROR_CODES.CLINIC_009,
  },

  /**
   * Invalid phone format
   */
  INVALID_PHONE: {
    success: false,
    error: ERROR_CODES.CLINIC_010,
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
   * Insufficient permissions
   */
  FORBIDDEN: {
    success: false,
    error: {
      code: 'INSUFFICIENT_PERMISSIONS',
      message: {
        ar: 'ليس لديك الصلاحيات الكافية',
        en: 'Insufficient permissions',
      },
    },
  },

  /**
   * Working hours validation failed
   */
  VALIDATION_FAILED: {
    success: false,
    data: {
      isValid: false,
      errors: [
        {
          day: 'monday',
          error: 'Opening time is outside complex working hours',
          complexHours: { openingTime: '08:00', closingTime: '18:00' },
          proposedHours: { openingTime: '07:00', closingTime: '17:00' },
        },
      ],
      conflicts: {
        appointments: [
          {
            appointmentId: '507f1f77bcf86cd799439020',
            patientName: 'Ali Mohammed',
            doctorName: 'Dr. Ahmed',
            appointmentTime: '2026-02-10T07:30:00.000Z',
            reason: 'Appointment scheduled before proposed opening time',
          },
        ],
        doctorSchedules: [],
        staffSchedules: [],
      },
    },
    message: {
      ar: 'فشل التحقق من ساعات العمل',
      en: 'Working hours validation failed',
    },
  },
};

/**
 * Combined Swagger examples for Clinic module
 */
export const CLINIC_SWAGGER_EXAMPLES = {
  ...CLINIC_SUCCESS_EXAMPLES,
  ...CLINIC_ERROR_EXAMPLES,
};
