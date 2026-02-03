import { Types } from 'mongoose';

/**
 * Test fixtures for complex integration tests
 */

// Valid complex data
export const validComplexData = {
  name: 'Test Medical Complex',
  email: 'complex@test.com',
  phone: '+1234567890',
  address: {
    street: '123 Medical St',
    city: 'Test City',
    state: 'Test State',
    country: 'Test Country',
    postalCode: '12345',
  },
  departments: [],
  status: 'active' as const,
};

// Complex with departments
export const complexWithDepartments = {
  ...validComplexData,
  name: 'Complex with Departments',
  email: 'complex-dept@test.com',
  departments: [
    new Types.ObjectId().toString(),
    new Types.ObjectId().toString(),
  ],
};

// Complex for status change tests
export const complexForStatusChange = {
  ...validComplexData,
  name: 'Status Change Complex',
  email: 'status-complex@test.com',
};

// Complex for PIC tests
export const complexForPIC = {
  ...validComplexData,
  name: 'PIC Test Complex',
  email: 'pic-complex@test.com',
};

// Complex for transfer tests
export const sourceComplexData = {
  ...validComplexData,
  name: 'Source Complex',
  email: 'source-complex@test.com',
};

export const targetComplexData = {
  ...validComplexData,
  name: 'Target Complex',
  email: 'target-complex@test.com',
};

// Invalid complex data for validation tests
export const invalidComplexData = {
  invalidEmail: {
    ...validComplexData,
    email: 'invalid-email',
  },
  missingName: {
    ...validComplexData,
    name: '',
  },
  invalidPhone: {
    ...validComplexData,
    phone: '123',
  },
};

// List query fixtures
export const listQueryFixtures = {
  basicPagination: {
    page: 1,
    limit: 10,
  },
  withFilters: {
    page: 1,
    limit: 10,
    status: 'active' as const,
    search: 'Test',
  },
  withCounts: {
    page: 1,
    limit: 10,
    includeCounts: true,
  },
  withSort: {
    page: 1,
    limit: 10,
    sortBy: 'name',
    sortOrder: 'asc' as const,
  },
};

// Status update fixtures
export const statusUpdateFixtures = {
  deactivate: {
    status: 'inactive' as const,
    deactivationReason: 'Test deactivation',
  },
  deactivateWithTransfer: {
    status: 'inactive' as const,
    deactivationReason: 'Test deactivation with transfer',
    transferClinics: true,
  },
  suspend: {
    status: 'suspended' as const,
    deactivationReason: 'Test suspension',
  },
  activate: {
    status: 'active' as const,
  },
};

// PIC assignment fixtures
export const picFixtures = {
  validAssignment: {
    userId: new Types.ObjectId().toString(),
  },
  invalidUser: {
    userId: 'invalid-user-id',
  },
};

// Transfer clinics fixtures
export const transferFixtures = {
  validTransfer: {
    clinicIds: [
      new Types.ObjectId().toString(),
      new Types.ObjectId().toString(),
    ],
  },
  singleClinic: {
    clinicIds: [new Types.ObjectId().toString()],
  },
  invalidClinicIds: {
    clinicIds: ['invalid-id'],
  },
  emptyClinicIds: {
    clinicIds: [],
  },
};

// User fixtures for testing
export const userFixtures = {
  owner: {
    _id: new Types.ObjectId(),
    email: 'owner@test.com',
    firstName: 'Test',
    lastName: 'Owner',
    role: 'owner',
    isActive: true,
  },
  admin: {
    _id: new Types.ObjectId(),
    email: 'admin@test.com',
    firstName: 'Test',
    lastName: 'Admin',
    role: 'admin',
    isActive: true,
  },
  doctor: {
    _id: new Types.ObjectId(),
    email: 'doctor@test.com',
    firstName: 'Test',
    lastName: 'Doctor',
    role: 'doctor',
    isActive: true,
  },
  staff: {
    _id: new Types.ObjectId(),
    email: 'staff@test.com',
    firstName: 'Test',
    lastName: 'Staff',
    role: 'staff',
    isActive: true,
  },
  patient: {
    _id: new Types.ObjectId(),
    email: 'patient@test.com',
    firstName: 'Test',
    lastName: 'Patient',
    role: 'patient',
    isActive: true,
  },
};

// Subscription fixtures
export const subscriptionFixtures = {
  activeCompanyPlan: {
    _id: new Types.ObjectId(),
    plan: 'company',
    status: 'active',
    maxComplexes: -1, // Unlimited
  },
  activeComplexPlan: {
    _id: new Types.ObjectId(),
    plan: 'complex',
    status: 'active',
    maxComplexes: 1,
  },
  activeClinicPlan: {
    _id: new Types.ObjectId(),
    plan: 'clinic',
    status: 'active',
    maxComplexes: 0,
  },
  inactiveSubscription: {
    _id: new Types.ObjectId(),
    plan: 'complex',
    status: 'inactive',
    maxComplexes: 1,
  },
};

// Organization fixtures
export const organizationFixtures = {
  testOrganization: {
    _id: new Types.ObjectId(),
    name: 'Test Organization',
    email: 'org@test.com',
    phone: '+1234567890',
  },
};

// Clinic fixtures
export const clinicFixtures = {
  activeClinic: {
    _id: new Types.ObjectId(),
    name: 'Test Clinic 1',
    isActive: true,
    deletedAt: null,
    maxDoctors: 10,
    maxStaff: 20,
    maxPatients: 100,
  },
  inactiveClinic: {
    _id: new Types.ObjectId(),
    name: 'Test Clinic 2',
    isActive: false,
    deletedAt: null,
    maxDoctors: 5,
    maxStaff: 10,
    maxPatients: 50,
  },
  deletedClinic: {
    _id: new Types.ObjectId(),
    name: 'Deleted Clinic',
    isActive: true,
    deletedAt: new Date(),
    maxDoctors: 5,
    maxStaff: 10,
    maxPatients: 50,
  },
};

// Department fixtures
export const departmentFixtures = {
  cardiology: {
    _id: new Types.ObjectId(),
    name: 'Cardiology',
    isActive: true,
  },
  neurology: {
    _id: new Types.ObjectId(),
    name: 'Neurology',
    isActive: true,
  },
  pediatrics: {
    _id: new Types.ObjectId(),
    name: 'Pediatrics',
    isActive: true,
  },
};

// Appointment fixtures
export const appointmentFixtures = {
  scheduled: {
    _id: new Types.ObjectId(),
    status: 'scheduled',
    deletedAt: null,
  },
  confirmed: {
    _id: new Types.ObjectId(),
    status: 'confirmed',
    deletedAt: null,
  },
  completed: {
    _id: new Types.ObjectId(),
    status: 'completed',
    deletedAt: null,
  },
  cancelled: {
    _id: new Types.ObjectId(),
    status: 'cancelled',
    deletedAt: null,
  },
};

// Error response fixtures
export const errorResponseFixtures = {
  complexNotFound: {
    code: 'COMPLEX_006',
    message: {
      ar: 'المجمع غير موجود',
      en: 'Complex not found',
    },
  },
  planLimitExceeded: {
    code: 'COMPLEX_001',
    message: {
      ar: 'تم تجاوز حد الخطة. الخطة المعقدة تسمح بمجمع واحد كحد أقصى',
      en: 'Plan limit exceeded. Complex plan allows maximum 1 complex',
    },
  },
  invalidPIC: {
    code: 'COMPLEX_002',
    message: {
      ar: 'الشخص المسؤول غير صالح. يجب أن يكون موظفًا في المجمع',
      en: 'Invalid person-in-charge. Must be an employee of the complex',
    },
  },
  cannotDeleteWithClinics: {
    code: 'COMPLEX_003',
    message: {
      ar: 'لا يمكن حذف المجمع مع وجود عيادات نشطة',
      en: 'Cannot delete complex with active clinics',
    },
  },
  mustTransferClinics: {
    code: 'COMPLEX_004',
    message: {
      ar: 'يجب نقل العيادات قبل إلغاء التنشيط',
      en: 'Must transfer clinics before deactivation',
    },
  },
  invalidTargetComplex: {
    code: 'COMPLEX_005',
    message: {
      ar: 'المجمع المستهدف غير صالح للنقل',
      en: 'Invalid target complex for transfer',
    },
  },
  departmentLinkedToClinics: {
    code: 'COMPLEX_007',
    message: {
      ar: 'القسم مرتبط بعيادات ولا يمكن إزالته',
      en: 'Department linked to clinics and cannot be removed',
    },
  },
  inactiveSubscription: {
    code: 'COMPLEX_008',
    message: {
      ar: 'الاشتراك غير نشط',
      en: 'Subscription is not active',
    },
  },
  invalidEmail: {
    code: 'COMPLEX_009',
    message: {
      ar: 'تنسيق البريد الإلكتروني غير صالح',
      en: 'Invalid email format',
    },
  },
  invalidPhone: {
    code: 'COMPLEX_010',
    message: {
      ar: 'تنسيق رقم الهاتف غير صالح',
      en: 'Invalid phone format',
    },
  },
};

// Test environment variables
export const testEnvironment = {
  MONGODB_TEST_URI:
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cliniva_test',
  NODE_ENV: 'test',
};
