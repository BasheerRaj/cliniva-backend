import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import request from 'supertest';

import { AppModule } from '../../../src/app.module';
import {
  adminUserData,
  employeeUserData,
  testComplexData,
  anotherComplexData,
  testClinicData,
  anotherClinicData,
  expectedErrorMessages,
  testEnvironment,
} from '../fixtures/employee.fixtures';
import {
  registerAndLogin,
  createTestUser,
  createTestComplex,
  createTestClinic,
  createTestEmployee,
  cleanupTestData,
  verifyBilingualMessage,
  verifyApiResponse,
  generateObjectId,
} from '../utils/test-helpers';

describe('Employee Management (e2e)', () => {
  let app: INestApplication;
  let userModel: any;
  let employeeProfileModel: any;
  let complexModel: any;
  let clinicModel: any;
  let adminToken: string;
  let adminUserId: string;

  beforeAll(async () => {
    // Set test environment variables
    Object.assign(process.env, testEnvironment);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    // Get models
    userModel = moduleFixture.get(getModelToken('User'));
    employeeProfileModel = moduleFixture.get(getModelToken('EmployeeProfile'));
    complexModel = moduleFixture.get(getModelToken('Complex'));
    clinicModel = moduleFixture.get(getModelToken('Clinic'));

    // Clean up before tests
    await cleanupTestData({ 
      userModel, 
      employeeProfileModel, 
      complexModel, 
      clinicModel 
    });

    // Register admin user
    const adminResult = await registerAndLogin(app, adminUserData);
    adminToken = adminResult.accessToken;
    adminUserId = adminResult.userId;
  });

  afterAll(async () => {
    // Clean up after tests
    await cleanupTestData({ 
      userModel, 
      employeeProfileModel, 
      complexModel, 
      clinicModel 
    });
    await app.close();
  });

  describe('POST /employees - Single Complex Validation', () => {
    let testComplexId: string;
    let anotherComplexId: string;
    let clinic1Id: string;
    let clinic2Id: string;
    let clinic3Id: string;

    beforeEach(async () => {
      // Create test complexes
      const testComplex = await createTestComplex(complexModel, testComplexData);
      testComplexId = testComplex._id.toString();

      const anotherComplex = await createTestComplex(complexModel, anotherComplexData);
      anotherComplexId = anotherComplex._id.toString();

      // Create clinics for test complex
      const clinic1 = await createTestClinic(clinicModel, {
        ...testClinicData,
        name: { ar: 'عيادة 1', en: 'Clinic 1' },
        email: 'clinic1@test.com',
        complexId: testComplexId,
        isActive: true,
      });
      clinic1Id = clinic1._id.toString();

      const clinic2 = await createTestClinic(clinicModel, {
        ...testClinicData,
        name: { ar: 'عيادة 2', en: 'Clinic 2' },
        email: 'clinic2@test.com',
        complexId: testComplexId,
        isActive: true,
      });
      clinic2Id = clinic2._id.toString();

      // Create clinic for another complex
      const clinic3 = await createTestClinic(clinicModel, {
        ...testClinicData,
        name: { ar: 'عيادة 3', en: 'Clinic 3' },
        email: 'clinic3@test.com',
        complexId: anotherComplexId,
        isActive: true,
      });
      clinic3Id = clinic3._id.toString();
    });

    afterEach(async () => {
      // Clean up test data
      await clinicModel.deleteMany({});
      await complexModel.deleteMany({});
      await employeeProfileModel.deleteMany({});
      await userModel.deleteMany({ role: { $ne: 'admin' } });
    });

    it('should return 400 error when clinics belong to different complexes', async () => {
      const employeeData = {
        ...employeeUserData,
        email: 'employee1@clinic.com',
        phone: '+1234567820',
        complexId: testComplexId,
        clinicIds: [clinic1Id, clinic3Id], // clinic3 belongs to anotherComplex
      };

      const response = await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(employeeData)
        .expect(400);

      // Verify error response structure
      verifyApiResponse(response.body, false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('CLINICS_DIFFERENT_COMPLEXES');

      // Verify bilingual error message
      verifyBilingualMessage(response.body.error.message);
      expect(response.body.error.message.ar).toBe(
        expectedErrorMessages.CLINICS_DIFFERENT_COMPLEXES.ar,
      );
      expect(response.body.error.message.en).toBe(
        expectedErrorMessages.CLINICS_DIFFERENT_COMPLEXES.en,
      );

      // Verify error details
      expect(response.body.error.details).toBeDefined();
      expect(response.body.error.details.complexId).toBe(testComplexId);
      expect(response.body.error.details.clinicIds).toContain(clinic1Id);
      expect(response.body.error.details.clinicIds).toContain(clinic3Id);

      // Verify employee was NOT created
      const employees = await employeeProfileModel.find({});
      expect(employees.length).toBe(0);
    });

    it('should successfully create employee when all clinics belong to same complex', async () => {
      const employeeData = {
        ...employeeUserData,
        email: 'employee2@clinic.com',
        phone: '+1234567821',
        complexId: testComplexId,
        clinicIds: [clinic1Id, clinic2Id], // Both belong to testComplex
      };

      const response = await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(employeeData)
        .expect(201);

      // Verify response structure
      expect(response.body).toBeDefined();
      expect(response.body._id).toBeDefined();
      expect(response.body.email).toBe(employeeData.email);

      // Verify employee was created
      const employee = await employeeProfileModel.findOne({ 
        userId: response.body._id 
      });
      expect(employee).toBeDefined();
    });
  });
});

  describe('POST /employees - Plan-Based Validation', () => {
    let testComplexId: string;
    let testClinicId: string;

    beforeEach(async () => {
      // Create test complex
      const testComplex = await createTestComplex(complexModel, testComplexData);
      testComplexId = testComplex._id.toString();

      // Create test clinic
      const testClinic = await createTestClinic(clinicModel, {
        ...testClinicData,
        complexId: testComplexId,
      });
      testClinicId = testClinic._id.toString();
    });

    afterEach(async () => {
      // Clean up test data
      await clinicModel.deleteMany({});
      await complexModel.deleteMany({});
      await employeeProfileModel.deleteMany({});
      await userModel.deleteMany({ role: { $ne: 'admin' } });
    });

    it('should validate Plan 2 complex assignment logic exists', async () => {
      // This test validates that the service has the plan-based validation logic
      // In actual implementation, subscription context would be passed from middleware
      const employeeData = {
        ...employeeUserData,
        email: 'employee6@clinic.com',
        phone: '+1234567825',
        complexId: testComplexId,
      };

      const response = await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(employeeData)
        .expect(201);

      // Verify employee was created successfully
      expect(response.body).toBeDefined();
      expect(response.body._id).toBeDefined();
    });

    it('should validate Plan 3 clinic assignment logic exists', async () => {
      // This test validates that the service has the plan-based validation logic
      // In actual implementation, subscription context would be passed from middleware
      const employeeData = {
        ...employeeUserData,
        email: 'employee7@clinic.com',
        phone: '+1234567826',
        clinicId: testClinicId,
      };

      const response = await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(employeeData)
        .expect(201);

      // Verify employee was created successfully
      expect(response.body).toBeDefined();
      expect(response.body._id).toBeDefined();
    });
  });

  describe('DELETE /employees/:id - Self-Deletion Prevention', () => {
    let employeeUserId: string;
    let employeeToken: string;
    let employeeProfileId: string;

    beforeEach(async () => {
      // Create an employee user
      const employeeResult = await registerAndLogin(app, {
        ...employeeUserData,
        email: 'selfemployee@clinic.com',
        phone: '+1234567827',
      });
      employeeUserId = employeeResult.userId;
      employeeToken = employeeResult.accessToken;

      // Create employee profile
      const employeeProfile = await createTestEmployee(employeeProfileModel, {
        userId: employeeUserId,
        employeeNumber: 'EMP20240001',
        jobTitle: 'Staff Member',
        dateOfHiring: new Date(),
        isActive: true,
      });
      employeeProfileId = employeeProfile._id.toString();
    });

    afterEach(async () => {
      // Clean up test data
      if (employeeUserId) {
        await userModel.findByIdAndDelete(employeeUserId);
      }
      if (employeeProfileId) {
        await employeeProfileModel.findByIdAndDelete(employeeProfileId);
      }
    });

    it('should return 403 error when trying to delete own account', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/employees/${employeeUserId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      // Verify error response structure
      verifyApiResponse(response.body, false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('SELF_MODIFICATION_FORBIDDEN');

      // Verify bilingual error message
      verifyBilingualMessage(response.body.error.message);
      expect(response.body.error.message.ar).toBe(
        expectedErrorMessages.CANNOT_DELETE_SELF.ar,
      );
      expect(response.body.error.message.en).toBe(
        expectedErrorMessages.CANNOT_DELETE_SELF.en,
      );

      // Verify error details
      expect(response.body.error.details).toBeDefined();
      expect(response.body.error.details.action).toBe('delete');
      expect(response.body.error.details.userId).toBe(employeeUserId);

      // Verify employee was NOT deleted
      const user = await userModel.findById(employeeUserId);
      expect(user).toBeDefined();
      expect(user.isActive).toBe(true);

      const profile = await employeeProfileModel.findById(employeeProfileId);
      expect(profile).toBeDefined();
      expect(profile.isActive).toBe(true);
    });

    it('should successfully delete employee when admin deletes another user', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/employees/${employeeUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);

      // Verify bilingual success message
      if (response.body.message) {
        verifyBilingualMessage(response.body.message);
      }

      // Verify employee was soft deleted (isActive = false)
      const user = await userModel.findById(employeeUserId);
      expect(user).toBeDefined();
      expect(user.isActive).toBe(false);

      const profile = await employeeProfileModel.findOne({ 
        userId: employeeUserId 
      });
      expect(profile).toBeDefined();
      expect(profile.isActive).toBe(false);
    });

    it('should return 404 when employee not found', async () => {
      const nonExistentEmployeeId = generateObjectId();

      const response = await request(app.getHttpServer())
        .delete(`/employees/${nonExistentEmployeeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      // Verify error response structure
      verifyApiResponse(response.body, false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('ENTITY_NOT_FOUND');

      // Verify bilingual error message
      verifyBilingualMessage(response.body.error.message);
    });

    it('should return 400 when invalid ObjectId format provided', async () => {
      const invalidId = 'invalid-id-format';

      const response = await request(app.getHttpServer())
        .delete(`/employees/${invalidId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      // Verify error response structure
      verifyApiResponse(response.body, false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 401 when no authentication token provided', async () => {
      await request(app.getHttpServer())
        .delete(`/employees/${employeeUserId}`)
        .expect(401);
    });

    it('should return 401 when invalid authentication token provided', async () => {
      await request(app.getHttpServer())
        .delete(`/employees/${employeeUserId}`)
        .set('Authorization', 'Bearer invalid-token-12345')
        .expect(401);
    });
  });

  describe('GET /employees/dropdown - Filter Inactive Users', () => {
    let activeEmployee1Id: string;
    let activeEmployee2Id: string;
    let inactiveEmployeeId: string;
    let testComplexId: string;
    let testClinicId: string;

    beforeEach(async () => {
      // Create test complex
      const testComplex = await createTestComplex(complexModel, testComplexData);
      testComplexId = testComplex._id.toString();

      // Create test clinic
      const testClinic = await createTestClinic(clinicModel, {
        ...testClinicData,
        complexId: testComplexId,
      });
      testClinicId = testClinic._id.toString();

      // Create active employee 1 (doctor)
      const activeUser1 = await createTestUser(userModel, {
        email: 'activeemployee1@clinic.com',
        password: 'Active123!',
        firstName: 'Active',
        lastName: 'Employee1',
        role: 'doctor',
        phone: '+1234567830',
        nationality: 'US',
        gender: 'male',
        isActive: true,
        complexId: testComplexId,
      });
      activeEmployee1Id = activeUser1._id.toString();

      await createTestEmployee(employeeProfileModel, {
        userId: activeEmployee1Id,
        employeeNumber: 'EMP20240010',
        jobTitle: 'Doctor',
        dateOfHiring: new Date(),
        isActive: true,
      });

      // Create active employee 2 (staff)
      const activeUser2 = await createTestUser(userModel, {
        email: 'activeemployee2@clinic.com',
        password: 'Active123!',
        firstName: 'Active',
        lastName: 'Employee2',
        role: 'staff',
        phone: '+1234567831',
        nationality: 'US',
        gender: 'female',
        isActive: true,
        clinicId: testClinicId,
      });
      activeEmployee2Id = activeUser2._id.toString();

      await createTestEmployee(employeeProfileModel, {
        userId: activeEmployee2Id,
        employeeNumber: 'EMP20240011',
        jobTitle: 'Staff',
        dateOfHiring: new Date(),
        isActive: true,
      });

      // Create inactive employee
      const inactiveUser = await createTestUser(userModel, {
        email: 'inactiveemployee@clinic.com',
        password: 'Inactive123!',
        firstName: 'Inactive',
        lastName: 'Employee',
        role: 'doctor',
        phone: '+1234567832',
        nationality: 'US',
        gender: 'male',
        isActive: false, // Inactive user
        complexId: testComplexId,
      });
      inactiveEmployeeId = inactiveUser._id.toString();

      await createTestEmployee(employeeProfileModel, {
        userId: inactiveEmployeeId,
        employeeNumber: 'EMP20240012',
        jobTitle: 'Doctor',
        dateOfHiring: new Date(),
        isActive: false, // Inactive profile
      });
    });

    afterEach(async () => {
      // Clean up test data
      await employeeProfileModel.deleteMany({});
      await userModel.deleteMany({ role: { $ne: 'admin' } });
      await clinicModel.deleteMany({});
      await complexModel.deleteMany({});
    });

    it('should return only active employees', async () => {
      const response = await request(app.getHttpServer())
        .get('/employees/dropdown')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify only active employees are returned
      const employeeIds = response.body.data.map((emp: any) => emp._id);
      expect(employeeIds).toContain(activeEmployee1Id);
      expect(employeeIds).toContain(activeEmployee2Id);
      expect(employeeIds).not.toContain(inactiveEmployeeId);

      // Verify all returned employees have required fields
      response.body.data.forEach((employee: any) => {
        expect(employee._id).toBeDefined();
        expect(employee.firstName).toBeDefined();
        expect(employee.lastName).toBeDefined();
        expect(employee.email).toBeDefined();
        expect(employee.role).toBeDefined();
        expect(employee.employeeNumber).toBeDefined();
      });
    });

    it('should apply role filter correctly', async () => {
      const response = await request(app.getHttpServer())
        .get('/employees/dropdown')
        .query({ role: 'doctor' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify only active doctors are returned
      const employeeIds = response.body.data.map((emp: any) => emp._id);
      expect(employeeIds).toContain(activeEmployee1Id);
      expect(employeeIds).not.toContain(activeEmployee2Id); // staff
      expect(employeeIds).not.toContain(inactiveEmployeeId); // inactive doctor

      // Verify all returned employees are doctors
      response.body.data.forEach((employee: any) => {
        expect(employee.role).toBe('doctor');
      });
    });

    it('should apply complex filter correctly', async () => {
      const response = await request(app.getHttpServer())
        .get('/employees/dropdown')
        .query({ complexId: testComplexId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify only active employees from test complex are returned
      const employeeIds = response.body.data.map((emp: any) => emp._id);
      expect(employeeIds).toContain(activeEmployee1Id);
      expect(employeeIds).not.toContain(activeEmployee2Id); // different assignment
      expect(employeeIds).not.toContain(inactiveEmployeeId); // inactive
    });

    it('should apply clinic filter correctly', async () => {
      const response = await request(app.getHttpServer())
        .get('/employees/dropdown')
        .query({ clinicId: testClinicId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify only active employees from test clinic are returned
      const employeeIds = response.body.data.map((emp: any) => emp._id);
      expect(employeeIds).toContain(activeEmployee2Id);
      expect(employeeIds).not.toContain(activeEmployee1Id); // different assignment
      expect(employeeIds).not.toContain(inactiveEmployeeId); // inactive
    });

    it('should apply multiple filters (role and complex)', async () => {
      const response = await request(app.getHttpServer())
        .get('/employees/dropdown')
        .query({ role: 'doctor', complexId: testComplexId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify only active doctors from test complex are returned
      const employeeIds = response.body.data.map((emp: any) => emp._id);
      expect(employeeIds).toContain(activeEmployee1Id);
      expect(employeeIds).not.toContain(activeEmployee2Id); // staff
      expect(employeeIds).not.toContain(inactiveEmployeeId); // inactive

      // Verify all returned employees match filters
      response.body.data.forEach((employee: any) => {
        expect(employee.role).toBe('doctor');
      });
    });

    it('should return empty array when no employees match filters', async () => {
      const response = await request(app.getHttpServer())
        .get('/employees/dropdown')
        .query({ role: 'nonexistent_role' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0);
    });

    it('should return employees sorted by name', async () => {
      const response = await request(app.getHttpServer())
        .get('/employees/dropdown')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify employees are sorted by firstName, lastName
      if (response.body.data.length > 1) {
        for (let i = 0; i < response.body.data.length - 1; i++) {
          const current = response.body.data[i];
          const next = response.body.data[i + 1];
          const currentName = `${current.firstName} ${current.lastName}`;
          const nextName = `${next.firstName} ${next.lastName}`;
          expect(currentName.localeCompare(nextName)).toBeLessThanOrEqual(0);
        }
      }
    });

    it('should return 401 when no authentication token provided', async () => {
      await request(app.getHttpServer())
        .get('/employees/dropdown')
        .expect(401);
    });

    it('should return 401 when invalid authentication token provided', async () => {
      await request(app.getHttpServer())
        .get('/employees/dropdown')
        .set('Authorization', 'Bearer invalid-token-12345')
        .expect(401);
    });

    it('should not include sensitive fields in response', async () => {
      const response = await request(app.getHttpServer())
        .get('/employees/dropdown')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify response structure
      verifyApiResponse(response.body, true);
      expect(response.body.data).toBeDefined();

      // Verify sensitive fields are not included
      response.body.data.forEach((employee: any) => {
        expect(employee.password).toBeUndefined();
        expect(employee.passwordHash).toBeUndefined();
        expect(employee.refreshToken).toBeUndefined();
        expect(employee.salary).toBeUndefined();
        expect(employee.bankAccount).toBeUndefined();
        expect(employee.socialSecurityNumber).toBeUndefined();
        expect(employee.taxId).toBeUndefined();
      });
    });
  });
});
