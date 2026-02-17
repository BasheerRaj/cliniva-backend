/**
 * Swagger Examples for Patient Management Module
 *
 * This file contains example request/response payloads for API documentation.
 * Used by @ApiBody() and @ApiResponse() decorators in the controller.
 */

// ============================================================================
// CREATE PATIENT EXAMPLES
// ============================================================================

export const CREATE_PATIENT_REQUEST_EXAMPLE = {
  cardNumber: 'ID123456789',
  firstName: 'Ahmed',
  lastName: 'Hassan',
  dateOfBirth: '1990-05-15',
  gender: 'male',
  phone: '+966501234567',
  email: 'ahmed.hassan@example.com',
  address: '123 King Fahd Road, Riyadh',
  nationality: 'Saudi Arabia',
  maritalStatus: 'Married',
  religion: 'Islam',
  preferredLanguage: 'arabic',
  bloodType: 'A+',
  allergies: 'Penicillin',
  medicalHistory: 'Hypertension, controlled with medication',
  emergencyContactName: 'Fatima Hassan',
  emergencyContactPhone: '+966509876543',
  emergencyContactRelationship: 'Spouse',
  insuranceCompany: 'Bupa Arabia',
  insuranceMemberNumber: 'BUPA123456',
  insuranceMemberType: 'Primary',
  insuranceProviderNetwork: 'Premium',
  insurancePolicyId: 'POL-2024-001',
  insuranceClass: 'Gold',
  insuranceCoPayment: 50,
  insuranceCoverageLimit: 500000,
  insuranceStartDate: '2024-01-01',
  insuranceEndDate: '2024-12-31',
  insuranceStatus: 'Active',
};

export const CREATE_PATIENT_RESPONSE_EXAMPLE = {
  success: true,
  message: 'Patient created successfully',
  data: {
    _id: '507f1f77bcf86cd799439011',
    patientNumber: 'PAT2024001',
    cardNumber: 'ID123456789',
    firstName: 'Ahmed',
    lastName: 'Hassan',
    dateOfBirth: '1990-05-15T00:00:00.000Z',
    gender: 'male',
    status: 'Active',
    phone: '+966501234567',
    email: 'ahmed.hassan@example.com',
    address: '123 King Fahd Road, Riyadh',
    nationality: 'Saudi Arabia',
    maritalStatus: 'Married',
    religion: 'Islam',
    preferredLanguage: 'arabic',
    bloodType: 'A+',
    allergies: 'Penicillin',
    medicalHistory: 'Hypertension, controlled with medication',
    emergencyContactName: 'Fatima Hassan',
    emergencyContactPhone: '+966509876543',
    emergencyContactRelationship: 'Spouse',
    insuranceCompany: 'Bupa Arabia',
    insuranceMemberNumber: 'BUPA123456',
    insuranceMemberType: 'Primary',
    insuranceProviderNetwork: 'Premium',
    insurancePolicyId: 'POL-2024-001',
    insuranceClass: 'Gold',
    insuranceCoPayment: 50,
    insuranceCoverageLimit: 500000,
    insuranceStartDate: '2024-01-01T00:00:00.000Z',
    insuranceEndDate: '2024-12-31T00:00:00.000Z',
    insuranceStatus: 'Active',
    createdAt: '2024-02-03T10:30:00.000Z',
    updatedAt: '2024-02-03T10:30:00.000Z',
  },
};

// ============================================================================
// UPDATE PATIENT EXAMPLES
// ============================================================================

export const UPDATE_PATIENT_REQUEST_EXAMPLE = {
  phone: '+966501234568',
  email: 'ahmed.hassan.updated@example.com',
  address: '456 King Abdullah Road, Riyadh',
  allergies: 'Penicillin, Sulfa drugs',
  medicalHistory: 'Hypertension, controlled with medication. Recent checkup normal.',
};

export const UPDATE_PATIENT_RESPONSE_EXAMPLE = {
  success: true,
  message: 'Patient updated successfully',
  data: {
    _id: '507f1f77bcf86cd799439011',
    patientNumber: 'PAT2024001',
    cardNumber: 'ID123456789',
    firstName: 'Ahmed',
    lastName: 'Hassan',
    phone: '+966501234568',
    email: 'ahmed.hassan.updated@example.com',
    address: '456 King Abdullah Road, Riyadh',
    allergies: 'Penicillin, Sulfa drugs',
    medicalHistory: 'Hypertension, controlled with medication. Recent checkup normal.',
    status: 'Active',
    updatedAt: '2024-02-03T11:00:00.000Z',
  },
};

// ============================================================================
// DEACTIVATE PATIENT EXAMPLES
// ============================================================================

export const DEACTIVATE_PATIENT_RESPONSE_EXAMPLE = {
  success: true,
  message: 'Patient deactivated and appointments cancelled',
  data: {
    _id: '507f1f77bcf86cd799439011',
    patientNumber: 'PAT2024001',
    cardNumber: 'ID123456789',
    firstName: 'Ahmed',
    lastName: 'Hassan',
    status: 'Inactive',
    updatedAt: '2024-02-03T12:00:00.000Z',
  },
};

// ============================================================================
// ACTIVATE PATIENT EXAMPLES
// ============================================================================

export const ACTIVATE_PATIENT_RESPONSE_EXAMPLE = {
  success: true,
  message: 'Patient activated successfully',
  data: {
    _id: '507f1f77bcf86cd799439011',
    patientNumber: 'PAT2024001',
    cardNumber: 'ID123456789',
    firstName: 'Ahmed',
    lastName: 'Hassan',
    status: 'Active',
    updatedAt: '2024-02-03T13:00:00.000Z',
  },
};

// ============================================================================
// DELETE PATIENT EXAMPLES
// ============================================================================

export const DELETE_PATIENT_RESPONSE_EXAMPLE = {
  success: true,
  message: 'Patient deleted successfully',
};

// ============================================================================
// GET PATIENT BY ID EXAMPLES
// ============================================================================

export const GET_PATIENT_RESPONSE_EXAMPLE = {
  success: true,
  message: 'Patient retrieved successfully',
  data: {
    _id: '507f1f77bcf86cd799439011',
    patientNumber: 'PAT2024001',
    cardNumber: 'ID123456789',
    firstName: 'Ahmed',
    lastName: 'Hassan',
    dateOfBirth: '1990-05-15T00:00:00.000Z',
    age: 34,
    gender: 'male',
    status: 'Active',
    phone: '+966501234567',
    email: 'ahmed.hassan@example.com',
    address: '123 King Fahd Road, Riyadh',
    nationality: 'Saudi Arabia',
    maritalStatus: 'Married',
    religion: 'Islam',
    preferredLanguage: 'arabic',
    bloodType: 'A+',
    allergies: 'Penicillin',
    medicalHistory: 'Hypertension, controlled with medication',
    emergencyContactName: 'Fatima Hassan',
    emergencyContactPhone: '+966509876543',
    emergencyContactRelationship: 'Spouse',
    insuranceCompany: 'Bupa Arabia',
    insuranceMemberNumber: 'BUPA123456',
    insuranceStatus: 'Active',
    createdAt: '2024-02-03T10:30:00.000Z',
    updatedAt: '2024-02-03T10:30:00.000Z',
  },
};

// ============================================================================
// GET PATIENTS LIST EXAMPLES
// ============================================================================

export const GET_PATIENTS_RESPONSE_EXAMPLE = {
  success: true,
  message: 'Patients retrieved successfully',
  data: [
    {
      _id: '507f1f77bcf86cd799439011',
      patientNumber: 'PAT2024001',
      firstName: 'Ahmed',
      lastName: 'Hassan',
      age: 34,
      gender: 'male',
      status: 'Active',
      phone: '+966501234567',
      email: 'ahmed.hassan@example.com',
      insuranceCompany: 'Bupa Arabia',
      insuranceStatus: 'Active',
    },
    {
      _id: '507f1f77bcf86cd799439012',
      patientNumber: 'PAT2024002',
      firstName: 'Fatima',
      lastName: 'Ali',
      age: 28,
      gender: 'female',
      status: 'Active',
      phone: '+966502345678',
      email: 'fatima.ali@example.com',
      insuranceCompany: 'Tawuniya',
      insuranceStatus: 'Active',
    },
  ],
  pagination: {
    total: 150,
    page: 1,
    totalPages: 15,
    limit: 10,
  },
};

// ============================================================================
// SEARCH PATIENTS EXAMPLES
// ============================================================================

export const SEARCH_PATIENTS_RESPONSE_EXAMPLE = {
  success: true,
  message: 'Search completed successfully',
  data: [
    {
      _id: '507f1f77bcf86cd799439011',
      patientNumber: 'PAT2024001',
      firstName: 'Ahmed',
      lastName: 'Hassan',
      phone: '+966501234567',
      email: 'ahmed.hassan@example.com',
      status: 'Active',
    },
  ],
  count: 1,
};

// ============================================================================
// PATIENT STATISTICS EXAMPLES
// ============================================================================

export const PATIENT_STATS_RESPONSE_EXAMPLE = {
  success: true,
  message: 'Patient statistics retrieved successfully',
  data: {
    totalPatients: 150,
    malePatients: 85,
    femalePatients: 65,
    averageAge: 42.5,
    patientsWithInsurance: 120,
    recentPatients: 15,
  },
};

// ============================================================================
// ERROR RESPONSE EXAMPLES
// ============================================================================

export const ERROR_DUPLICATE_CARD_NUMBER_EXAMPLE = {
  statusCode: 409,
  message: {
    ar: 'رقم البطاقة موجود بالفعل',
    en: 'Card number already exists',
  },
  code: 'PATIENT_ALREADY_EXISTS_CARD',
  timestamp: '2024-02-03T10:30:00.000Z',
  path: '/patients',
};

export const ERROR_PATIENT_NOT_FOUND_EXAMPLE = {
  statusCode: 404,
  message: {
    ar: 'المريض غير موجود',
    en: 'Patient not found',
  },
  code: 'PATIENT_NOT_FOUND',
  timestamp: '2024-02-03T10:30:00.000Z',
  path: '/patients/507f1f77bcf86cd799439011',
};

export const ERROR_CARD_NUMBER_NOT_EDITABLE_EXAMPLE = {
  statusCode: 400,
  message: {
    ar: 'لا يمكن تعديل رقم البطاقة',
    en: 'Card number cannot be edited',
  },
  code: 'CARD_NUMBER_NOT_EDITABLE',
  timestamp: '2024-02-03T10:30:00.000Z',
  path: '/patients/507f1f77bcf86cd799439011',
};

export const ERROR_PATIENT_MUST_BE_DEACTIVATED_EXAMPLE = {
  statusCode: 400,
  message: {
    ar: 'يجب تعطيل المريض قبل الحذف',
    en: 'Patient must be deactivated before deletion',
  },
  code: 'PATIENT_MUST_BE_DEACTIVATED',
  timestamp: '2024-02-03T10:30:00.000Z',
  path: '/patients/507f1f77bcf86cd799439011',
};

export const ERROR_INVALID_PATIENT_ID_EXAMPLE = {
  statusCode: 400,
  message: {
    ar: 'معرف المريض غير صالح',
    en: 'Invalid patient ID',
  },
  code: 'INVALID_PATIENT_ID',
  timestamp: '2024-02-03T10:30:00.000Z',
  path: '/patients/invalid-id',
};

export const ERROR_DUPLICATE_EMAIL_EXAMPLE = {
  statusCode: 409,
  message: {
    ar: 'البريد الإلكتروني موجود بالفعل',
    en: 'Email already exists',
  },
  code: 'EMAIL_ALREADY_EXISTS',
  timestamp: '2024-02-03T10:30:00.000Z',
  path: '/patients',
};

export const ERROR_DUPLICATE_PHONE_EXAMPLE = {
  statusCode: 409,
  message: {
    ar: 'رقم الهاتف موجود بالفعل',
    en: 'Phone number already exists',
  },
  code: 'PHONE_ALREADY_EXISTS',
  timestamp: '2024-02-03T10:30:00.000Z',
  path: '/patients',
};

export const ERROR_INVALID_DATE_OF_BIRTH_EXAMPLE = {
  statusCode: 400,
  message: {
    ar: 'تاريخ الميلاد غير صالح',
    en: 'Invalid date of birth',
  },
  code: 'INVALID_DATE_OF_BIRTH',
  timestamp: '2024-02-03T10:30:00.000Z',
  path: '/patients',
};

export const ERROR_INCOMPLETE_EMERGENCY_CONTACT_EXAMPLE = {
  statusCode: 400,
  message: {
    ar: 'معلومات جهة الاتصال في حالات الطوارئ غير مكتملة',
    en: 'Emergency contact information is incomplete',
  },
  code: 'INCOMPLETE_EMERGENCY_CONTACT',
  timestamp: '2024-02-03T10:30:00.000Z',
  path: '/patients',
};

export const ERROR_VALIDATION_EXAMPLE = {
  statusCode: 400,
  message: [
    'cardNumber should not be empty',
    'firstName must be longer than or equal to 2 characters',
    'dateOfBirth must be a valid ISO 8601 date string',
    'gender must be one of the following values: male, female, other',
  ],
  error: 'Bad Request',
  timestamp: '2024-02-03T10:30:00.000Z',
  path: '/patients',
};

// ============================================================================
// VALIDATION RULES DOCUMENTATION
// ============================================================================

export const VALIDATION_RULES = {
  cardNumber: {
    required: true,
    type: 'string',
    description: 'Unique patient identification card number (immutable after creation)',
    example: 'ID123456789',
  },
  firstName: {
    required: true,
    type: 'string',
    minLength: 2,
    maxLength: 50,
    description: 'Patient first name',
    example: 'Ahmed',
  },
  lastName: {
    required: true,
    type: 'string',
    minLength: 2,
    maxLength: 50,
    description: 'Patient last name',
    example: 'Hassan',
  },
  dateOfBirth: {
    required: true,
    type: 'string',
    format: 'ISO 8601 date',
    description: 'Patient date of birth (cannot be in future, age must be ≤ 150 years)',
    example: '1990-05-15',
  },
  gender: {
    required: true,
    type: 'enum',
    values: ['male', 'female', 'other'],
    description: 'Patient gender',
    example: 'male',
  },
  phone: {
    required: false,
    type: 'string',
    minLength: 10,
    maxLength: 20,
    description: 'Patient phone number (must be unique if provided)',
    example: '+966501234567',
  },
  email: {
    required: false,
    type: 'string',
    format: 'email',
    description: 'Patient email address (must be unique if provided)',
    example: 'ahmed.hassan@example.com',
  },
  emergencyContact: {
    required: false,
    description: 'Emergency contact information (name and phone must both be provided or both omitted)',
    fields: {
      emergencyContactName: 'Contact person name',
      emergencyContactPhone: 'Contact person phone number',
      emergencyContactRelationship: 'Relationship to patient',
    },
  },
  bloodType: {
    required: false,
    type: 'enum',
    values: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    description: 'Patient blood type',
    example: 'A+',
  },
  status: {
    type: 'enum',
    values: ['Active', 'Inactive'],
    description: 'Patient status (Active patients can book appointments, Inactive cannot)',
    default: 'Active',
  },
};

// ============================================================================
// BUSINESS RULES DOCUMENTATION
// ============================================================================

export const BUSINESS_RULES = {
  patientCreation: [
    'Card number must be unique across all patients',
    'Patient number is auto-generated in format PAT{YEAR}{SEQUENCE}',
    'New patients are created with status "Active" by default',
    'Email and phone must be unique if provided',
    'Date of birth cannot be in the future',
    'Age calculated from date of birth must be ≤ 150 years',
    'Emergency contact name and phone must both be provided or both omitted',
  ],
  patientUpdate: [
    'Card number cannot be modified after creation',
    'Email and phone must remain unique if changed',
    'Soft-deleted patients cannot be updated',
    'All validation rules apply to updated fields',
  ],
  patientDeactivation: [
    'Changes patient status from "Active" to "Inactive"',
    'Automatically cancels all scheduled and confirmed appointments',
    'Cancelled appointments have cancellationReason set to "Patient deactivated"',
    'Operation is atomic (uses database transaction)',
    'Idempotent - deactivating an already inactive patient succeeds without error',
    'Audit log records deactivation with count of cancelled appointments',
  ],
  patientActivation: [
    'Changes patient status from "Inactive" to "Active"',
    'Allows patient to be scheduled for new appointments',
    'Does not restore previously cancelled appointments',
    'Idempotent - activating an already active patient succeeds without error',
    'Audit log records activation event',
  ],
  patientDeletion: [
    'Only inactive patients can be deleted',
    'Attempting to delete an active patient returns error',
    'Deletion is soft delete (sets deletedAt timestamp)',
    'Soft-deleted patients are excluded from all queries',
    'Patient record is preserved in database for audit purposes',
    'Audit log records deletion event',
  ],
  patientSearch: [
    'Searches across firstName, lastName, phone, email, patientNumber, and cardNumber',
    'Search is case-insensitive',
    'Empty or whitespace-only search terms return empty results',
    'Results are limited to maximum 50 patients',
    'Soft-deleted patients are excluded from search results',
  ],
  patientStatistics: [
    'All counts exclude soft-deleted patients',
    'Total count equals sum of gender counts',
    'Average age calculated from all non-deleted patients',
    'Insurance count includes only patients with insuranceStatus = "Active"',
    'Recent count includes patients created within last 30 days',
  ],
};
