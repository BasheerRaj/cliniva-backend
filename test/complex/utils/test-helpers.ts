import { Model, Types } from 'mongoose';

/**
 * Helper functions for complex integration tests
 */

/**
 * Create a test complex in the database
 */
export const createTestComplex = async (
  complexModel: Model<any>,
  complexData: any = {},
): Promise<any> => {
  const defaultComplex = {
    name: 'Test Complex',
    email: 'test@complex.com',
    phone: '+1234567890',
    address: {
      street: '123 Test St',
      city: 'Test City',
      state: 'Test State',
      country: 'Test Country',
      postalCode: '12345',
    },
    status: 'active',
    departments: [],
    ...complexData,
  };

  const complex = new complexModel(defaultComplex);
  return complex.save();
};

/**
 * Create multiple test complexes
 */
export const createMultipleComplexes = async (
  complexModel: Model<any>,
  count: number,
  baseData: any = {},
): Promise<any[]> => {
  const complexes = [];
  for (let i = 0; i < count; i++) {
    const complex = await createTestComplex(complexModel, {
      ...baseData,
      name: `Test Complex ${i + 1}`,
      email: `complex${i + 1}@test.com`,
    });
    complexes.push(complex);
  }
  return complexes;
};

/**
 * Create a test user in the database
 */
export const createTestUser = async (
  userModel: Model<any>,
  userData: any = {},
): Promise<any> => {
  const defaultUser = {
    email: 'test@user.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'staff',
    isActive: true,
    passwordHash: '$2b$12$testHashedPassword',
    ...userData,
  };

  const user = new userModel(defaultUser);
  return user.save();
};

/**
 * Create a test subscription
 */
export const createTestSubscription = async (
  subscriptionModel: Model<any>,
  subscriptionData: any = {},
): Promise<any> => {
  const defaultSubscription = {
    plan: 'complex',
    status: 'active',
    maxComplexes: 1,
    ...subscriptionData,
  };

  const subscription = new subscriptionModel(defaultSubscription);
  return subscription.save();
};

/**
 * Create a test organization
 */
export const createTestOrganization = async (
  organizationModel: Model<any>,
  organizationData: any = {},
): Promise<any> => {
  const defaultOrganization = {
    name: 'Test Organization',
    email: 'org@test.com',
    phone: '+1234567890',
    ...organizationData,
  };

  const organization = new organizationModel(defaultOrganization);
  return organization.save();
};

/**
 * Create a test clinic
 */
export const createTestClinic = async (
  clinicModel: Model<any>,
  clinicData: any = {},
): Promise<any> => {
  const defaultClinic = {
    name: 'Test Clinic',
    isActive: true,
    deletedAt: null,
    maxDoctors: 10,
    maxStaff: 20,
    maxPatients: 100,
    ...clinicData,
  };

  const clinic = new clinicModel(defaultClinic);
  return clinic.save();
};

/**
 * Create multiple test clinics for a complex
 */
export const createClinicsForComplex = async (
  clinicModel: Model<any>,
  complexId: string,
  count: number,
): Promise<any[]> => {
  const clinics = [];
  for (let i = 0; i < count; i++) {
    const clinic = await createTestClinic(clinicModel, {
      name: `Clinic ${i + 1}`,
      complexId: new Types.ObjectId(complexId),
    });
    clinics.push(clinic);
  }
  return clinics;
};

/**
 * Create a test department
 */
export const createTestDepartment = async (
  departmentModel: Model<any>,
  departmentData: any = {},
): Promise<any> => {
  const defaultDepartment = {
    name: 'Test Department',
    isActive: true,
    ...departmentData,
  };

  const department = new departmentModel(defaultDepartment);
  return department.save();
};

/**
 * Create a test appointment
 */
export const createTestAppointment = async (
  appointmentModel: Model<any>,
  appointmentData: any = {},
): Promise<any> => {
  const defaultAppointment = {
    status: 'scheduled',
    deletedAt: null,
    appointmentDate: new Date(),
    ...appointmentData,
  };

  const appointment = new appointmentModel(defaultAppointment);
  return appointment.save();
};

/**
 * Clean up test data from database
 */
export const cleanupTestData = async (models: {
  complexModel?: Model<any>;
  userModel?: Model<any>;
  subscriptionModel?: Model<any>;
  organizationModel?: Model<any>;
  clinicModel?: Model<any>;
  departmentModel?: Model<any>;
  appointmentModel?: Model<any>;
}): Promise<void> => {
  const {
    complexModel,
    userModel,
    subscriptionModel,
    organizationModel,
    clinicModel,
    departmentModel,
    appointmentModel,
  } = models;

  // Delete test data using regex patterns
  if (complexModel) {
    await complexModel.deleteMany({
      email: { $regex: /@(test|complex)\.com$/ },
    });
  }

  if (userModel) {
    await userModel.deleteMany({
      email: { $regex: /@(test|user)\.com$/ },
    });
  }

  if (subscriptionModel) {
    await subscriptionModel.deleteMany({
      plan: { $in: ['company', 'complex', 'clinic'] },
    });
  }

  if (organizationModel) {
    await organizationModel.deleteMany({
      email: { $regex: /@test\.com$/ },
    });
  }

  if (clinicModel) {
    await clinicModel.deleteMany({
      name: { $regex: /^(Test|Clinic)/ },
    });
  }

  if (departmentModel) {
    await departmentModel.deleteMany({
      name: { $regex: /^Test/ },
    });
  }

  if (appointmentModel) {
    await appointmentModel.deleteMany({
      status: { $in: ['scheduled', 'confirmed', 'completed', 'cancelled'] },
    });
  }
};

/**
 * Assert bilingual message structure
 */
export const assertBilingualMessage = (message: any): void => {
  expect(message).toHaveProperty('ar');
  expect(message).toHaveProperty('en');
  expect(typeof message.ar).toBe('string');
  expect(typeof message.en).toBe('string');
  expect(message.ar.length).toBeGreaterThan(0);
  expect(message.en.length).toBeGreaterThan(0);
};

/**
 * Assert pagination metadata structure
 */
export const assertPaginationMetadata = (meta: any): void => {
  expect(meta).toHaveProperty('page');
  expect(meta).toHaveProperty('limit');
  expect(meta).toHaveProperty('total');
  expect(meta).toHaveProperty('totalPages');
  expect(typeof meta.page).toBe('number');
  expect(typeof meta.limit).toBe('number');
  expect(typeof meta.total).toBe('number');
  expect(typeof meta.totalPages).toBe('number');
  expect(meta.page).toBeGreaterThan(0);
  expect(meta.limit).toBeGreaterThan(0);
  expect(meta.total).toBeGreaterThanOrEqual(0);
  expect(meta.totalPages).toBeGreaterThanOrEqual(0);
};

/**
 * Assert complex response structure
 */
export const assertComplexStructure = (complex: any): void => {
  expect(complex).toHaveProperty('_id');
  expect(complex).toHaveProperty('name');
  expect(complex).toHaveProperty('email');
  expect(complex).toHaveProperty('phone');
  expect(complex).toHaveProperty('address');
  expect(complex).toHaveProperty('status');
  expect(complex).toHaveProperty('departments');
  expect(complex).toHaveProperty('createdAt');
  expect(complex).toHaveProperty('updatedAt');
};

/**
 * Assert capacity breakdown structure
 */
export const assertCapacityStructure = (capacity: any): void => {
  expect(capacity).toHaveProperty('total');
  expect(capacity).toHaveProperty('current');
  expect(capacity).toHaveProperty('utilization');
  expect(capacity).toHaveProperty('byClinic');

  expect(capacity.total).toHaveProperty('maxDoctors');
  expect(capacity.total).toHaveProperty('maxStaff');
  expect(capacity.total).toHaveProperty('maxPatients');

  expect(capacity.current).toHaveProperty('doctors');
  expect(capacity.current).toHaveProperty('staff');
  expect(capacity.current).toHaveProperty('patients');

  expect(capacity.utilization).toHaveProperty('doctors');
  expect(capacity.utilization).toHaveProperty('staff');
  expect(capacity.utilization).toHaveProperty('patients');

  expect(Array.isArray(capacity.byClinic)).toBe(true);
};

/**
 * Assert error response structure
 */
export const assertErrorResponse = (response: any): void => {
  expect(response).toHaveProperty('success');
  expect(response.success).toBe(false);
  expect(response).toHaveProperty('error');
  expect(response.error).toHaveProperty('code');
  expect(response.error).toHaveProperty('message');
  assertBilingualMessage(response.error.message);
};

/**
 * Assert success response structure
 */
export const assertSuccessResponse = (response: any): void => {
  expect(response).toHaveProperty('success');
  expect(response.success).toBe(true);
  expect(response).toHaveProperty('message');
  assertBilingualMessage(response.message);
};

/**
 * Wait for async operations
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Generate random email
 */
export const generateRandomEmail = (): string => {
  const random = Math.random().toString(36).substring(7);
  return `test-${random}@complex.com`;
};

/**
 * Generate random phone
 */
export const generateRandomPhone = (): string => {
  const random = Math.floor(Math.random() * 10000000000);
  return `+${random}`;
};
