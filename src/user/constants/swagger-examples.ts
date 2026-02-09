/**
 * Swagger Examples for User Module
 *
 * This file contains example request/response payloads for API documentation.
 * Used by @ApiBody() and @ApiResponse() decorators in the controller.
 */

// ============================================================================
// USER LIST EXAMPLES
// ============================================================================

export const USER_LIST_RESPONSE_EXAMPLE = {
  success: true,
  data: [
    {
      id: '507f1f77bcf86cd799439011',
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'owner',
      phone: '+966501234567',
      isActive: true,
      emailVerified: true,
      preferredLanguage: 'en',
      createdAt: '2026-01-15T10:00:00.000Z',
      updatedAt: '2026-02-07T10:00:00.000Z',
    },
    {
      id: '507f1f77bcf86cd799439012',
      email: 'jane.smith@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'admin',
      phone: '+966501234568',
      isActive: true,
      emailVerified: true,
      preferredLanguage: 'ar',
      createdAt: '2026-01-20T10:00:00.000Z',
      updatedAt: '2026-02-05T10:00:00.000Z',
    },
  ],
  meta: {
    page: 1,
    limit: 10,
    total: 25,
    totalPages: 3,
  },
};

export const USER_LIST_EMPTY_RESPONSE_EXAMPLE = {
  success: true,
  data: [],
  meta: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
};

// ============================================================================
// USER DETAIL EXAMPLES
// ============================================================================

export const USER_DETAIL_RESPONSE_EXAMPLE = {
  success: true,
  data: {
    id: '507f1f77bcf86cd799439011',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'owner',
    phone: '+966501234567',
    nationality: 'SA',
    gender: 'male',
    isActive: true,
    emailVerified: true,
    preferredLanguage: 'en',
    subscriptionId: '507f1f77bcf86cd799439013',
    organizationId: '507f1f77bcf86cd799439014',
    complexId: null,
    clinicId: null,
    lastLogin: '2026-02-07T09:30:00.000Z',
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-02-07T10:00:00.000Z',
  },
};

// ============================================================================
// CREATE USER EXAMPLES
// ============================================================================

export const CREATE_USER_REQUEST_EXAMPLE = {
  email: 'new.user@example.com',
  firstName: 'Ahmed',
  lastName: 'Al-Saud',
  role: 'doctor',
  phone: '+966501234569',
  nationality: 'SA',
  gender: 'male',
  preferredLanguage: 'ar',
};

export const CREATE_USER_RESPONSE_EXAMPLE = {
  success: true,
  data: {
    id: '507f1f77bcf86cd799439015',
    email: 'new.user@example.com',
    firstName: 'Ahmed',
    lastName: 'Al-Saud',
    role: 'doctor',
    phone: '+966501234569',
    nationality: 'SA',
    gender: 'male',
    isActive: true,
    emailVerified: false,
    preferredLanguage: 'ar',
    createdAt: '2026-02-07T10:00:00.000Z',
    updatedAt: '2026-02-07T10:00:00.000Z',
  },
  message: {
    ar: 'تم إنشاء المستخدم بنجاح',
    en: 'User created successfully',
  },
};

// ============================================================================
// UPDATE USER EXAMPLES
// ============================================================================

export const UPDATE_USER_REQUEST_EXAMPLE = {
  firstName: 'John',
  lastName: 'Doe Updated',
  phone: '+966501234570',
  preferredLanguage: 'ar',
};

export const UPDATE_USER_RESPONSE_EXAMPLE = {
  success: true,
  data: {
    id: '507f1f77bcf86cd799439011',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe Updated',
    role: 'owner',
    phone: '+966501234570',
    preferredLanguage: 'ar',
  },
  message: {
    ar: 'تم تحديث المستخدم بنجاح',
    en: 'User updated successfully',
  },
};

export const UPDATE_USER_EMAIL_RESPONSE_EXAMPLE = {
  success: true,
  data: {
    id: '507f1f77bcf86cd799439011',
    email: 'john.new@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'owner',
    phone: '+966501234567',
    preferredLanguage: 'en',
  },
  message: {
    ar: 'تم تحديث المستخدم بنجاح. تم إبطال جميع الجلسات النشطة.',
    en: 'User updated successfully. All active sessions have been invalidated.',
  },
};

export const UPDATE_USER_ROLE_RESPONSE_EXAMPLE = {
  success: true,
  data: {
    id: '507f1f77bcf86cd799439011',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'admin',
    phone: '+966501234567',
    preferredLanguage: 'en',
  },
  message: {
    ar: 'تم تحديث المستخدم بنجاح. تم إبطال جميع الجلسات النشطة.',
    en: 'User updated successfully. All active sessions have been invalidated.',
  },
};

// ============================================================================
// DELETE USER EXAMPLES
// ============================================================================

export const DELETE_USER_RESPONSE_EXAMPLE = {
  success: true,
  message: {
    ar: 'تم حذف المستخدم بنجاح',
    en: 'User deleted successfully',
  },
};

// ============================================================================
// UPDATE USER STATUS EXAMPLES
// ============================================================================

export const UPDATE_USER_STATUS_REQUEST_EXAMPLE = {
  isActive: false,
};

export const UPDATE_USER_STATUS_ACTIVATE_RESPONSE_EXAMPLE = {
  success: true,
  data: {
    id: '507f1f77bcf86cd799439011',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'owner',
    isActive: true,
    updatedAt: '2026-02-07T10:00:00.000Z',
  },
  message: {
    ar: 'تم تفعيل المستخدم بنجاح',
    en: 'User activated successfully',
  },
};

export const UPDATE_USER_STATUS_DEACTIVATE_RESPONSE_EXAMPLE = {
  success: true,
  data: {
    id: '507f1f77bcf86cd799439011',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'owner',
    isActive: false,
    updatedAt: '2026-02-07T10:00:00.000Z',
  },
  message: {
    ar: 'تم إلغاء تفعيل المستخدم بنجاح',
    en: 'User deactivated successfully',
  },
};

// ============================================================================
// DEACTIVATE DOCTOR WITH TRANSFER EXAMPLES
// ============================================================================

export const DEACTIVATE_DOCTOR_TRANSFER_REQUEST_EXAMPLE = {
  transferAppointments: true,
  targetDoctorId: '507f1f77bcf86cd799439016',
};

export const DEACTIVATE_DOCTOR_SKIP_REQUEST_EXAMPLE = {
  transferAppointments: false,
  skipTransfer: true,
};

export const DEACTIVATE_DOCTOR_TRANSFER_RESPONSE_EXAMPLE = {
  success: true,
  data: {
    deactivatedUser: {
      id: '507f1f77bcf86cd799439011',
      email: 'doctor@example.com',
      firstName: 'Dr. Ahmed',
      lastName: 'Al-Saud',
      role: 'doctor',
      isActive: false,
    },
    appointmentsTransferred: 5,
    appointmentsRescheduled: 0,
    targetDoctorId: '507f1f77bcf86cd799439016',
  },
  message: {
    ar: 'تم إلغاء تفعيل المستخدم بنجاح',
    en: 'User deactivated successfully',
  },
};

export const DEACTIVATE_DOCTOR_SKIP_RESPONSE_EXAMPLE = {
  success: true,
  data: {
    deactivatedUser: {
      id: '507f1f77bcf86cd799439011',
      email: 'doctor@example.com',
      firstName: 'Dr. Ahmed',
      lastName: 'Al-Saud',
      role: 'doctor',
      isActive: false,
    },
    appointmentsTransferred: 0,
    appointmentsRescheduled: 3,
    targetDoctorId: null,
  },
  message: {
    ar: 'تم إلغاء تفعيل المستخدم بنجاح',
    en: 'User deactivated successfully',
  },
};

// ============================================================================
// USERS DROPDOWN EXAMPLES
// ============================================================================

export const USERS_DROPDOWN_RESPONSE_EXAMPLE = {
  success: true,
  data: [
    {
      id: '507f1f77bcf86cd799439011',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      role: 'doctor',
    },
    {
      id: '507f1f77bcf86cd799439012',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      role: 'doctor',
    },
  ],
};

// ============================================================================
// TRANSFER APPOINTMENTS EXAMPLES
// ============================================================================

export const TRANSFER_APPOINTMENTS_REQUEST_EXAMPLE = {
  targetDoctorId: '507f1f77bcf86cd799439016',
  appointmentIds: [
    '507f1f77bcf86cd799439020',
    '507f1f77bcf86cd799439021',
    '507f1f77bcf86cd799439022',
  ],
};

export const TRANSFER_APPOINTMENTS_RESPONSE_EXAMPLE = {
  success: true,
  data: {
    transferred: 3,
    failed: 0,
    errors: [],
    targetDoctor: {
      id: '507f1f77bcf86cd799439016',
      firstName: 'Dr. Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@example.com',
    },
  },
  message: {
    ar: 'تم نقل المواعيد بنجاح',
    en: 'Appointments transferred successfully',
  },
};

export const TRANSFER_APPOINTMENTS_PARTIAL_RESPONSE_EXAMPLE = {
  success: true,
  data: {
    transferred: 2,
    failed: 1,
    errors: ['Appointment not found: 507f1f77bcf86cd799439022'],
    targetDoctor: {
      id: '507f1f77bcf86cd799439016',
      firstName: 'Dr. Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@example.com',
    },
  },
  message: {
    ar: 'تم نقل بعض المواعيد بنجاح',
    en: 'Some appointments transferred successfully',
  },
};

// ============================================================================
// SEND PASSWORD RESET EXAMPLES
// ============================================================================

export const SEND_PASSWORD_RESET_RESPONSE_EXAMPLE = {
  success: true,
  message: {
    ar: 'تم إرسال رسالة إعادة تعيين كلمة المرور بنجاح',
    en: 'Password reset email sent successfully',
  },
};

// ============================================================================
// CHECK USER ENTITIES EXAMPLES
// ============================================================================

export const CHECK_USER_ENTITIES_REQUEST_EXAMPLE = {
  userId: '507f1f77bcf86cd799439011',
};

export const CHECK_USER_ENTITIES_RESPONSE_EXAMPLE = {
  hasOrganization: true,
  hasComplex: false,
  hasClinic: false,
  planType: 'company',
  hasPrimaryEntity: true,
  needsSetup: false,
  nextStep: 'dashboard',
};

export const CHECK_USER_ENTITIES_NEEDS_SETUP_RESPONSE_EXAMPLE = {
  hasOrganization: false,
  hasComplex: false,
  hasClinic: false,
  planType: 'clinic',
  hasPrimaryEntity: false,
  needsSetup: true,
  nextStep: 'setup-clinic',
};

// ============================================================================
// ERROR RESPONSE EXAMPLES
// ============================================================================

export const ERROR_USER_NOT_FOUND_EXAMPLE = {
  success: false,
  error: {
    code: 'USER_NOT_FOUND',
    message: {
      ar: 'المستخدم غير موجود',
      en: 'User not found',
    },
  },
};

export const ERROR_CANNOT_DEACTIVATE_SELF_EXAMPLE = {
  success: false,
  error: {
    code: 'CANNOT_MODIFY_SELF',
    message: {
      ar: 'لا يمكنك إلغاء تفعيل حسابك الخاص',
      en: 'Cannot deactivate your own account',
    },
  },
};

export const ERROR_DOCTOR_HAS_APPOINTMENTS_EXAMPLE = {
  success: false,
  error: {
    code: 'DOCTOR_HAS_APPOINTMENTS',
    message: {
      ar: 'الطبيب لديه مواعيد نشطة. يرجى نقل المواعيد أو تخطي النقل.',
      en: 'Doctor has active appointments. Please transfer appointments or skip transfer.',
    },
    details: {
      appointmentCount: 5,
    },
  },
};

export const ERROR_TARGET_DOCTOR_NOT_FOUND_EXAMPLE = {
  success: false,
  error: {
    code: 'DOCTOR_NOT_FOUND',
    message: {
      ar: 'الطبيب المستهدف غير موجود',
      en: 'Target doctor not found',
    },
  },
};

export const ERROR_TARGET_DOCTOR_INACTIVE_EXAMPLE = {
  success: false,
  error: {
    code: 'USER_INACTIVE',
    message: {
      ar: 'الطبيب المستهدف غير نشط',
      en: 'Target doctor is inactive',
    },
  },
};

export const ERROR_EMAIL_ALREADY_EXISTS_EXAMPLE = {
  success: false,
  error: {
    code: 'EMAIL_ALREADY_EXISTS',
    message: {
      ar: 'البريد الإلكتروني مستخدم بالفعل',
      en: 'Email already exists',
    },
  },
};

export const ERROR_INVALID_ROLE_EXAMPLE = {
  success: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: {
      ar: 'الدور غير صالح',
      en: 'Invalid role',
    },
    details: {
      field: 'role',
      allowedValues: ['owner', 'admin', 'manager', 'doctor', 'staff'],
    },
  },
};

export const ERROR_UNAUTHORIZED_EXAMPLE = {
  success: false,
  error: {
    code: 'UNAUTHORIZED',
    message: {
      ar: 'غير مصرح لك بالوصول',
      en: 'Unauthorized access',
    },
  },
};

export const ERROR_FORBIDDEN_EXAMPLE = {
  success: false,
  error: {
    code: 'INSUFFICIENT_PERMISSIONS',
    message: {
      ar: 'ليس لديك الصلاحيات الكافية',
      en: 'Insufficient permissions',
    },
  },
};

export const ERROR_VALIDATION_EXAMPLE = {
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
};
