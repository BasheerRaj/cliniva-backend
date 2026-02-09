/**
 * Swagger Examples for Service Module
 *
 * This file contains example request/response payloads for API documentation.
 * Used by @ApiBody() and @ApiResponse() decorators in the controller.
 */

// ============================================================================
// CREATE SERVICE EXAMPLES
// ============================================================================

export const CREATE_SERVICE_REQUEST_EXAMPLE = {
  name: 'General Consultation',
  description: 'Standard medical consultation with a doctor',
  durationMinutes: 30,
  price: 150,
  complexDepartmentId: '507f1f77bcf86cd799439012',
};

export const CREATE_SERVICE_CLINIC_REQUEST_EXAMPLE = {
  name: 'Clinic-Specific Service',
  description: 'Service only available at this clinic',
  durationMinutes: 45,
  price: 200,
  clinicId: '507f1f77bcf86cd799439014',
};

export const CREATE_SERVICE_RESPONSE_EXAMPLE = {
  _id: '507f1f77bcf86cd799439011',
  name: 'General Consultation',
  description: 'Standard medical consultation with a doctor',
  durationMinutes: 30,
  price: 150,
  complexDepartmentId: '507f1f77bcf86cd799439012',
  isActive: true,
  createdAt: '2026-01-31T10:00:00.000Z',
  updatedAt: '2026-01-31T10:00:00.000Z',
};

// ============================================================================
// UPDATE SERVICE EXAMPLES
// ============================================================================

export const UPDATE_SERVICE_REQUEST_EXAMPLE = {
  name: 'General Consultation - Updated',
  description: 'Updated description',
  durationMinutes: 45,
  price: 200,
  confirmRescheduling: true,
};

export const UPDATE_SERVICE_RESPONSE_EXAMPLE = {
  _id: '507f1f77bcf86cd799439011',
  name: 'General Consultation - Updated',
  description: 'Updated description',
  durationMinutes: 45,
  price: 200,
  complexDepartmentId: '507f1f77bcf86cd799439012',
  isActive: true,
  updatedAt: '2026-01-31T11:00:00.000Z',
  affectedAppointments: {
    count: 5,
    status: 'needs_rescheduling',
    notificationsSent: true,
  },
};

// ============================================================================
// DELETE SERVICE EXAMPLES
// ============================================================================

export const DELETE_SERVICE_RESPONSE_EXAMPLE = {
  success: true,
  message: {
    ar: 'تم حذف الخدمة بنجاح',
    en: 'Service deleted successfully',
  },
  deletedAt: '2026-01-31T12:00:00.000Z',
};

// ============================================================================
// GET SERVICE EXAMPLES
// ============================================================================

export const GET_SERVICE_RESPONSE_EXAMPLE = {
  _id: '507f1f77bcf86cd799439011',
  name: 'General Consultation',
  description: 'Standard medical consultation',
  durationMinutes: 30,
  price: 150,
  complexDepartmentId: '507f1f77bcf86cd799439012',
  isActive: true,
  createdAt: '2026-01-31T10:00:00.000Z',
  updatedAt: '2026-01-31T10:00:00.000Z',
};

export const GET_SERVICES_LIST_RESPONSE_EXAMPLE = [
  {
    _id: '507f1f77bcf86cd799439011',
    name: 'General Consultation',
    description: 'Standard medical consultation',
    durationMinutes: 30,
    price: 150,
    complexDepartmentId: '507f1f77bcf86cd799439012',
    isActive: true,
    createdAt: '2026-01-31T10:00:00.000Z',
    updatedAt: '2026-01-31T10:00:00.000Z',
  },
  {
    _id: '507f1f77bcf86cd799439013',
    name: 'X-Ray Examination',
    description: 'X-ray imaging service',
    durationMinutes: 15,
    price: 100,
    complexDepartmentId: '507f1f77bcf86cd799439012',
    isActive: true,
    createdAt: '2026-01-31T10:00:00.000Z',
    updatedAt: '2026-01-31T10:00:00.000Z',
  },
];

// ============================================================================
// VALIDATE SERVICE NAMES EXAMPLES
// ============================================================================

export const VALIDATE_SERVICE_NAMES_REQUEST_EXAMPLE = {
  serviceNames: ['General Consultation', 'X-Ray', 'Blood Test'],
  complexDepartmentId: '507f1f77bcf86cd799439012',
};

export const VALIDATE_SERVICE_NAMES_VALID_RESPONSE_EXAMPLE = {
  isValid: true,
  conflicts: [],
  suggestions: [],
  message: 'All service names are valid and available',
};

export const VALIDATE_SERVICE_NAMES_CONFLICT_RESPONSE_EXAMPLE = {
  isValid: false,
  conflicts: ['General Consultation', 'X-Ray'],
  suggestions: ['General Consultation-2026', 'X-Ray-2026'],
  message: 'Service name conflicts detected: General Consultation, X-Ray',
};

// ============================================================================
// ASSIGN SERVICES TO CLINIC EXAMPLES
// ============================================================================

export const ASSIGN_SERVICES_REQUEST_EXAMPLE = {
  serviceAssignments: [
    {
      serviceId: '507f1f77bcf86cd799439011',
      priceOverride: 200,
      isActive: true,
    },
    {
      serviceId: '507f1f77bcf86cd799439013',
      priceOverride: 120,
      isActive: true,
    },
  ],
};

export const ASSIGN_SERVICES_RESPONSE_EXAMPLE = [
  {
    _id: '507f1f77bcf86cd799439020',
    clinicId: '507f1f77bcf86cd799439014',
    serviceId: '507f1f77bcf86cd799439011',
    priceOverride: 200,
    isActive: true,
    createdAt: '2026-01-31T10:00:00.000Z',
    updatedAt: '2026-01-31T10:00:00.000Z',
  },
  {
    _id: '507f1f77bcf86cd799439021',
    clinicId: '507f1f77bcf86cd799439014',
    serviceId: '507f1f77bcf86cd799439013',
    priceOverride: 120,
    isActive: true,
    createdAt: '2026-01-31T10:00:00.000Z',
    updatedAt: '2026-01-31T10:00:00.000Z',
  },
];

// ============================================================================
// ERROR EXAMPLES
// ============================================================================

export const ERROR_SERVICE_NOT_FOUND_EXAMPLE = {
  statusCode: 404,
  message: {
    ar: 'الخدمة غير موجودة',
    en: 'Service not found',
  },
  error: 'Not Found',
};

export const ERROR_SERVICE_DUPLICATE_NAME_EXAMPLE = {
  statusCode: 400,
  message:
    'Service "General Consultation" already exists in this department. Please choose a different name.',
  error: 'Bad Request',
};

export const ERROR_SERVICE_VALIDATION_EXAMPLE = {
  statusCode: 400,
  message: [
    'name must be longer than or equal to 2 characters',
    'name must be shorter than or equal to 100 characters',
    'durationMinutes must not be less than 5',
    'durationMinutes must not be greater than 480',
  ],
  error: 'Bad Request',
};

export const ERROR_SERVICE_UPDATE_REQUIRES_CONFIRMATION_EXAMPLE = {
  statusCode: 400,
  message: {
    ar: 'هذا التعديل سيؤثر على 5 مواعيد نشطة. يرجى التأكيد لإعادة الجدولة',
    en: 'This change will affect 5 active appointments. Please confirm to reschedule',
  },
  error: 'Bad Request',
  requiresConfirmation: true,
  affectedAppointmentsCount: 5,
  affectedAppointmentIds: [
    '507f1f77bcf86cd799439030',
    '507f1f77bcf86cd799439031',
    '507f1f77bcf86cd799439032',
    '507f1f77bcf86cd799439033',
    '507f1f77bcf86cd799439034',
  ],
};

export const ERROR_SERVICE_DELETE_HAS_APPOINTMENTS_EXAMPLE = {
  statusCode: 400,
  message: {
    ar: 'لا يمكن حذف الخدمة لأنها تحتوي على 3 مواعيد نشطة',
    en: 'Cannot delete service because it has 3 active appointments',
  },
  error: 'Bad Request',
  activeAppointmentsCount: 3,
};

export const ERROR_UNAUTHORIZED_EXAMPLE = {
  statusCode: 401,
  message: 'Unauthorized',
  error: 'Unauthorized',
};

