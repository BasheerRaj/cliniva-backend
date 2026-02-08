/**
 * Service Module Swagger Examples
 * 
 * Example objects for Swagger documentation of the Service module.
 * Demonstrates medical service management including CRUD operations,
 * service assignments to clinics, and pricing structures.
 * 
 * @module service/constants/swagger-examples
 */

import { COMMON_SWAGGER_EXAMPLES } from '../../common/examples/common-responses';

/**
 * Service Success Response Examples
 */
export const SERVICE_SUCCESS_EXAMPLES = {
  /**
   * Service created successfully
   */
  CREATE_SERVICE_SUCCESS: {
    success: true,
    data: {
      _id: '507f1f77bcf86cd799439011',
      name: 'General Consultation',
      description: 'Standard medical consultation with a general practitioner',
      durationMinutes: 30,
      price: 150,
      complexDepartmentId: '507f1f77bcf86cd799439020',
      createdAt: '2026-02-08T10:00:00.000Z',
      updatedAt: '2026-02-08T10:00:00.000Z',
    },
    message: {
      ar: 'تم إنشاء الخدمة بنجاح',
      en: 'Service created successfully',
    },
  },

  /**
   * Service retrieved successfully
   */
  GET_SERVICE_SUCCESS: {
    success: true,
    data: {
      _id: '507f1f77bcf86cd799439011',
      name: 'General Consultation',
      description: 'Standard medical consultation with a general practitioner',
      durationMinutes: 30,
      price: 150,
      complexDepartmentId: '507f1f77bcf86cd799439020',
      createdAt: '2026-02-08T10:00:00.000Z',
      updatedAt: '2026-02-08T10:00:00.000Z',
    },
  },

  /**
   * List of services
   */
  LIST_SERVICES_SUCCESS: {
    success: true,
    data: [
      {
        _id: '507f1f77bcf86cd799439011',
        name: 'General Consultation',
        description: 'Standard medical consultation',
        durationMinutes: 30,
        price: 150,
        complexDepartmentId: '507f1f77bcf86cd799439020',
      },
      {
        _id: '507f1f77bcf86cd799439012',
        name: 'Specialist Consultation',
        description: 'Consultation with a medical specialist',
        durationMinutes: 45,
        price: 250,
        complexDepartmentId: '507f1f77bcf86cd799439020',
      },
      {
        _id: '507f1f77bcf86cd799439013',
        name: 'Follow-up Visit',
        description: 'Follow-up appointment after initial consultation',
        durationMinutes: 20,
        price: 100,
        complexDepartmentId: '507f1f77bcf86cd799439020',
      },
    ],
  },

  /**
   * Service updated successfully
   */
  UPDATE_SERVICE_SUCCESS: {
    success: true,
    data: {
      _id: '507f1f77bcf86cd799439011',
      name: 'General Consultation - Updated',
      description: 'Updated description for general consultation',
      durationMinutes: 40,
      price: 175,
      complexDepartmentId: '507f1f77bcf86cd799439020',
      updatedAt: '2026-02-08T11:00:00.000Z',
    },
    message: {
      ar: 'تم تحديث الخدمة بنجاح',
      en: 'Service updated successfully',
    },
  },

  /**
   * Service deleted successfully
   */
  DELETE_SERVICE_SUCCESS: {
    success: true,
    message: {
      ar: 'تم حذف الخدمة بنجاح',
      en: 'Service deleted successfully',
    },
  },

  /**
   * Services assigned to clinic successfully
   */
  ASSIGN_SERVICES_SUCCESS: {
    success: true,
    data: [
      {
        _id: '507f1f77bcf86cd799439030',
        clinicId: '507f1f77bcf86cd799439040',
        serviceId: '507f1f77bcf86cd799439011',
        priceOverride: 160,
        isActive: true,
        createdAt: '2026-02-08T10:00:00.000Z',
      },
      {
        _id: '507f1f77bcf86cd799439031',
        clinicId: '507f1f77bcf86cd799439040',
        serviceId: '507f1f77bcf86cd799439012',
        priceOverride: 260,
        isActive: true,
        createdAt: '2026-02-08T10:00:00.000Z',
      },
    ],
    message: {
      ar: 'تم تعيين الخدمات للعيادة بنجاح',
      en: 'Services assigned to clinic successfully',
    },
  },

  /**
   * Service names validation success
   */
  VALIDATE_NAMES_SUCCESS: {
    isValid: true,
    conflicts: [],
    suggestions: [],
    message: 'All service names are valid and available',
  },

  /**
   * Service names validation with conflicts
   */
  VALIDATE_NAMES_CONFLICTS: {
    isValid: false,
    conflicts: ['General Consultation', 'X-Ray'],
    suggestions: ['General Consultation-v2', 'X-Ray-v2'],
    message: 'Service name conflicts detected: General Consultation, X-Ray',
  },

  /**
   * Services by complex department
   */
  SERVICES_BY_DEPARTMENT: {
    success: true,
    data: [
      {
        _id: '507f1f77bcf86cd799439011',
        name: 'Cardiology Consultation',
        description: 'Consultation with cardiologist',
        durationMinutes: 45,
        price: 300,
        complexDepartmentId: '507f1f77bcf86cd799439020',
      },
      {
        _id: '507f1f77bcf86cd799439012',
        name: 'ECG Test',
        description: 'Electrocardiogram test',
        durationMinutes: 20,
        price: 150,
        complexDepartmentId: '507f1f77bcf86cd799439020',
      },
    ],
  },

  /**
   * Services by clinic
   */
  SERVICES_BY_CLINIC: {
    success: true,
    data: [
      {
        _id: '507f1f77bcf86cd799439011',
        name: 'General Consultation',
        description: 'Standard medical consultation',
        durationMinutes: 30,
        price: 150,
      },
      {
        _id: '507f1f77bcf86cd799439012',
        name: 'Blood Test',
        description: 'Complete blood count test',
        durationMinutes: 15,
        price: 80,
      },
    ],
  },

  /**
   * Services owned by clinic
   */
  SERVICES_OWNED_BY_CLINIC: {
    success: true,
    data: [
      {
        _id: '507f1f77bcf86cd799439015',
        name: 'Clinic-Specific Service',
        description: 'Service created specifically for this clinic',
        durationMinutes: 30,
        price: 120,
        clinicId: '507f1f77bcf86cd799439040',
      },
    ],
  },
};

/**
 * Service Error Response Examples
 */
export const SERVICE_ERROR_EXAMPLES = {
  /**
   * Service not found
   */
  SERVICE_NOT_FOUND: {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: {
        ar: 'الخدمة غير موجودة',
        en: 'Service not found',
      },
      details: {
        serviceId: '507f1f77bcf86cd799439011',
      },
    },
  },

  /**
   * Service name already exists
   */
  SERVICE_NAME_EXISTS: {
    success: false,
    error: {
      code: 'ALREADY_EXISTS',
      message: {
        ar: 'اسم الخدمة موجود بالفعل',
        en: 'Service name already exists',
      },
      details: {
        field: 'name',
        value: 'General Consultation',
      },
    },
  },

  /**
   * Invalid service name length
   */
  INVALID_SERVICE_NAME: {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: {
        ar: 'يجب أن يكون اسم الخدمة بين 2 و 100 حرف',
        en: 'Service name must be between 2 and 100 characters',
      },
      details: {
        field: 'name',
        minLength: 2,
        maxLength: 100,
      },
    },
  },

  /**
   * Invalid price value
   */
  INVALID_PRICE: {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: {
        ar: 'السعر يجب أن يكون رقماً موجباً',
        en: 'Price must be a positive number',
      },
      details: {
        field: 'price',
        value: -50,
      },
    },
  },

  /**
   * Invalid duration
   */
  INVALID_DURATION: {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: {
        ar: 'المدة يجب أن تكون رقماً موجباً',
        en: 'Duration must be a positive number',
      },
      details: {
        field: 'durationMinutes',
        value: 0,
      },
    },
  },

  /**
   * Missing required field
   */
  MISSING_SERVICE_NAME: {
    success: false,
    error: {
      code: 'REQUIRED_FIELD',
      message: {
        ar: 'اسم الخدمة مطلوب',
        en: 'Service name is required',
      },
      details: {
        field: 'name',
      },
    },
  },

  /**
   * Service already assigned to clinic
   */
  SERVICE_ALREADY_ASSIGNED: {
    success: false,
    error: {
      code: 'ALREADY_EXISTS',
      message: {
        ar: 'الخدمة مخصصة بالفعل لهذه العيادة',
        en: 'Service already assigned to this clinic',
      },
      details: {
        serviceId: '507f1f77bcf86cd799439011',
        clinicId: '507f1f77bcf86cd799439040',
      },
    },
  },

  /**
   * Invalid clinic or department reference
   */
  INVALID_REFERENCE: {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: {
        ar: 'معرف القسم أو العيادة غير صالح',
        en: 'Invalid department or clinic ID',
      },
      details: {
        field: 'complexDepartmentId',
      },
    },
  },
};

/**
 * Combined Service Swagger Examples
 */
export const SERVICE_SWAGGER_EXAMPLES = {
  ...SERVICE_SUCCESS_EXAMPLES,
  ...SERVICE_ERROR_EXAMPLES,
  ...COMMON_SWAGGER_EXAMPLES,
};
