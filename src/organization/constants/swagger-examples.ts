/**
 * Swagger Examples for Organization Module
 *
 * This file contains example request/response payloads for API documentation.
 * Used by @ApiBody() and @ApiResponse() decorators in the controller.
 */

// ============================================================================
// CREATE ORGANIZATION EXAMPLES
// ============================================================================

export const CREATE_ORGANIZATION_REQUEST_EXAMPLE = {
  subscriptionId: '507f1f77bcf86cd799439011',
  name: 'HealthCare Solutions Inc.',
  legalName: 'HealthCare Solutions Incorporated',
  registrationNumber: 'REG-2024-001',
  phone: '+966501234567',
  email: 'info@healthcaresolutions.com',
  address: '123 Medical District, Riyadh, Saudi Arabia',
  googleLocation: 'https://maps.google.com/?q=24.7136,46.6753',
  logoUrl: '/uploads/logos/healthcare-logo.png',
  yearEstablished: 2020,
  mission:
    'To provide exceptional healthcare services with compassion and excellence',
  vision: 'To be the leading healthcare provider in the region',
  ceoName: 'Dr. Ahmed Al-Rashid',
  website: 'https://www.healthcaresolutions.com',
  vatNumber: '300123456700003',
  crNumber: '1010123456',
};

export const CREATE_ORGANIZATION_SUCCESS_EXAMPLE = {
  success: true,
  message: 'Organization created successfully',
  data: {
    organizationId: '507f1f77bcf86cd799439012',
    subscriptionId: '507f1f77bcf86cd799439011',
  },
};

// ============================================================================
// GET ORGANIZATION EXAMPLES
// ============================================================================

export const GET_ORGANIZATION_SUCCESS_EXAMPLE = {
  success: true,
  message: 'Organization retrieved successfully',
  data: {
    _id: '507f1f77bcf86cd799439012',
    subscriptionId: '507f1f77bcf86cd799439011',
    ownerId: '507f1f77bcf86cd799439010',
    name: 'HealthCare Solutions Inc.',
    legalName: 'HealthCare Solutions Incorporated',
    registrationNumber: 'REG-2024-001',
    phone: '+966501234567',
    email: 'info@healthcaresolutions.com',
    address: '123 Medical District, Riyadh, Saudi Arabia',
    googleLocation: 'https://maps.google.com/?q=24.7136,46.6753',
    logoUrl: 'http://localhost:3000/uploads/logos/healthcare-logo.png',
    yearEstablished: 2020,
    mission:
      'To provide exceptional healthcare services with compassion and excellence',
    vision: 'To be the leading healthcare provider in the region',
    ceoName: 'Dr. Ahmed Al-Rashid',
    website: 'https://www.healthcaresolutions.com',
    vatNumber: '300123456700003',
    crNumber: '1010123456',
    createdAt: '2024-02-07T10:00:00.000Z',
    updatedAt: '2024-02-07T10:00:00.000Z',
  },
};

// ============================================================================
// UPDATE ORGANIZATION EXAMPLES
// ============================================================================

export const UPDATE_ORGANIZATION_REQUEST_EXAMPLE = {
  name: 'HealthCare Solutions International',
  phone: '+966501234568',
  email: 'contact@healthcaresolutions.com',
  address: '456 Medical Plaza, Riyadh, Saudi Arabia',
  mission:
    'To provide world-class healthcare services with innovation and compassion',
  vision: 'To be the premier healthcare provider globally',
  website: 'https://www.healthcaresolutions.international',
};

export const UPDATE_ORGANIZATION_SUCCESS_EXAMPLE = {
  success: true,
  message: 'Organization updated successfully',
  data: {
    _id: '507f1f77bcf86cd799439012',
    subscriptionId: '507f1f77bcf86cd799439011',
    ownerId: '507f1f77bcf86cd799439010',
    name: 'HealthCare Solutions International',
    legalName: 'HealthCare Solutions Incorporated',
    registrationNumber: 'REG-2024-001',
    phone: '+966501234568',
    email: 'contact@healthcaresolutions.com',
    address: '456 Medical Plaza, Riyadh, Saudi Arabia',
    googleLocation: 'https://maps.google.com/?q=24.7136,46.6753',
    logoUrl: 'http://localhost:3000/uploads/logos/healthcare-logo.png',
    yearEstablished: 2020,
    mission:
      'To provide world-class healthcare services with innovation and compassion',
    vision: 'To be the premier healthcare provider globally',
    ceoName: 'Dr. Ahmed Al-Rashid',
    website: 'https://www.healthcaresolutions.international',
    vatNumber: '300123456700003',
    crNumber: '1010123456',
    createdAt: '2024-02-07T10:00:00.000Z',
    updatedAt: '2024-02-07T12:30:00.000Z',
  },
};

// ============================================================================
// SETUP LEGAL INFO EXAMPLES
// ============================================================================

export const SETUP_LEGAL_INFO_REQUEST_EXAMPLE = {
  vatNumber: '300123456700003',
  crNumber: '1010123456',
  termsConditions: 'https://www.healthcaresolutions.com/terms',
  privacyPolicy: 'https://www.healthcaresolutions.com/privacy',
};

export const SETUP_LEGAL_INFO_SUCCESS_EXAMPLE = {
  success: true,
  message: 'Legal information setup successfully',
  data: {
    _id: '507f1f77bcf86cd799439012',
    subscriptionId: '507f1f77bcf86cd799439011',
    ownerId: '507f1f77bcf86cd799439010',
    name: 'HealthCare Solutions Inc.',
    legalName: 'HealthCare Solutions Incorporated',
    registrationNumber: 'REG-2024-001',
    phone: '+966501234567',
    email: 'info@healthcaresolutions.com',
    address: '123 Medical District, Riyadh, Saudi Arabia',
    vatNumber: '300123456700003',
    crNumber: '1010123456',
    createdAt: '2024-02-07T10:00:00.000Z',
    updatedAt: '2024-02-07T11:00:00.000Z',
  },
};

// ============================================================================
// GET BY SUBSCRIPTION EXAMPLES
// ============================================================================

export const GET_BY_SUBSCRIPTION_SUCCESS_EXAMPLE = {
  success: true,
  message: 'Organization found',
  data: {
    _id: '507f1f77bcf86cd799439012',
    subscriptionId: '507f1f77bcf86cd799439011',
    ownerId: '507f1f77bcf86cd799439010',
    name: 'HealthCare Solutions Inc.',
    legalName: 'HealthCare Solutions Incorporated',
    registrationNumber: 'REG-2024-001',
    phone: '+966501234567',
    email: 'info@healthcaresolutions.com',
    address: '123 Medical District, Riyadh, Saudi Arabia',
    googleLocation: 'https://maps.google.com/?q=24.7136,46.6753',
    logoUrl: 'http://localhost:3000/uploads/logos/healthcare-logo.png',
    yearEstablished: 2020,
    mission:
      'To provide exceptional healthcare services with compassion and excellence',
    vision: 'To be the leading healthcare provider in the region',
    ceoName: 'Dr. Ahmed Al-Rashid',
    website: 'https://www.healthcaresolutions.com',
    vatNumber: '300123456700003',
    crNumber: '1010123456',
    createdAt: '2024-02-07T10:00:00.000Z',
    updatedAt: '2024-02-07T10:00:00.000Z',
  },
};

export const GET_BY_SUBSCRIPTION_NOT_FOUND_EXAMPLE = {
  success: true,
  message: 'No organization found',
  data: null,
};

// ============================================================================
// ERROR RESPONSE EXAMPLES
// ============================================================================

export const ERROR_ORGANIZATION_NOT_FOUND_EXAMPLE = {
  success: false,
  message: 'Organization not found',
  error: 'Organization with the specified ID does not exist',
};

export const ERROR_ORGANIZATION_ALREADY_EXISTS_EXAMPLE = {
  success: false,
  message: 'Failed to create organization',
  data: {
    organizationId: '',
    subscriptionId: '507f1f77bcf86cd799439011',
  },
  error: {
    statusCode: 400,
    message: {
      ar: 'يوجد بالفعل منظمة لهذا الاشتراك',
      en: 'An organization already exists for this subscription',
    },
    code: 'ORGANIZATION_ALREADY_EXISTS',
  },
};

export const ERROR_USER_ALREADY_OWNS_ORGANIZATION_EXAMPLE = {
  success: false,
  message: 'Failed to create organization',
  data: {
    organizationId: '',
    subscriptionId: '507f1f77bcf86cd799439011',
  },
  error: {
    statusCode: 400,
    message: {
      ar: 'لديك بالفعل منظمة. كل مستخدم يمكنه امتلاك شركة واحدة فقط',
      en: 'You already own an organization. Each user can only own one company',
    },
    code: 'USER_ALREADY_OWNS_ORGANIZATION',
  },
};

export const ERROR_SUBSCRIPTION_NOT_ACTIVE_EXAMPLE = {
  success: false,
  message: 'Failed to create organization',
  data: {
    organizationId: '',
    subscriptionId: '507f1f77bcf86cd799439011',
  },
  error: {
    statusCode: 400,
    message: {
      ar: 'اشتراكك غير نشط. يرجى الاتصال بالدعم أو تحديث اشتراكك',
      en: 'Your subscription is not active. Please contact support or update your subscription',
    },
    code: 'SUBSCRIPTION_NOT_ACTIVE',
  },
};

export const ERROR_INVALID_SUBSCRIPTION_PLAN_EXAMPLE = {
  success: false,
  message: 'Failed to create organization',
  data: {
    organizationId: '',
    subscriptionId: '507f1f77bcf86cd799439011',
  },
  error: {
    statusCode: 400,
    message: {
      ar: 'تسجيل الشركة يتطلب اشتراك خطة الشركة. يرجى ترقية خطتك',
      en: 'Company registration requires a company plan subscription. Please upgrade your plan',
    },
    code: 'INVALID_SUBSCRIPTION_PLAN',
  },
};

export const ERROR_DUPLICATE_NAME_EXAMPLE = {
  success: false,
  message: 'Failed to create organization',
  data: {
    organizationId: '',
    subscriptionId: '507f1f77bcf86cd799439011',
  },
  error: {
    statusCode: 400,
    message: {
      ar: 'توجد شركة بهذا الاسم بالفعل. يرجى اختيار اسم مختلف',
      en: 'A company with this name already exists. Please choose a different name',
    },
    code: 'DUPLICATE_NAME',
  },
};

export const ERROR_DUPLICATE_EMAIL_EXAMPLE = {
  success: false,
  message: 'Failed to create organization',
  data: {
    organizationId: '',
    subscriptionId: '507f1f77bcf86cd799439011',
  },
  error: {
    statusCode: 400,
    message: {
      ar: 'توجد شركة بهذا البريد الإلكتروني بالفعل. يرجى استخدام بريد إلكتروني مختلف',
      en: 'A company with this email already exists. Please use a different email',
    },
    code: 'DUPLICATE_EMAIL',
  },
};

export const ERROR_VALIDATION_FAILED_EXAMPLE = {
  success: false,
  message: 'Failed to create organization',
  data: {
    organizationId: '',
    subscriptionId: '507f1f77bcf86cd799439011',
  },
  error: {
    statusCode: 400,
    message: {
      ar: 'فشل التحقق من الصحة: البريد الإلكتروني غير صالح',
      en: 'Validation failed: Invalid email format',
    },
    code: 'VALIDATION_FAILED',
  },
};

export const ERROR_INVALID_VAT_NUMBER_EXAMPLE = {
  success: false,
  message: 'Failed to setup legal information',
  error: {
    statusCode: 400,
    message: {
      ar: 'تنسيق رقم ضريبة القيمة المضافة غير صالح',
      en: 'Invalid VAT number format',
    },
    code: 'INVALID_VAT_NUMBER',
  },
};

export const ERROR_INVALID_CR_NUMBER_EXAMPLE = {
  success: false,
  message: 'Failed to setup legal information',
  error: {
    statusCode: 400,
    message: {
      ar: 'تنسيق رقم السجل التجاري غير صالح',
      en: 'Invalid Commercial Registration number format',
    },
    code: 'INVALID_CR_NUMBER',
  },
};

export const ERROR_UNAUTHORIZED_EXAMPLE = {
  statusCode: 401,
  message: {
    ar: 'غير مصرح',
    en: 'Unauthorized',
  },
  code: 'UNAUTHORIZED',
  timestamp: '2024-02-07T10:30:00.000Z',
  path: '/organization',
};

export const ERROR_INTERNAL_SERVER_EXAMPLE = {
  success: false,
  message: 'Failed to create organization',
  data: {
    organizationId: '',
    subscriptionId: '507f1f77bcf86cd799439011',
  },
  error: {
    statusCode: 500,
    message: {
      ar: 'حدث خطأ داخلي في الخادم',
      en: 'Internal server error occurred',
    },
    code: 'INTERNAL_SERVER_ERROR',
  },
};
