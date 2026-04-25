import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

const TEST_ENV = {
  JWT_SECRET: 'test-jwt-secret-appointment-context-e2e',
  JWT_EXPIRES_IN: '1h',
  JWT_REFRESH_SECRET: 'test-refresh-secret-appointment-context-e2e',
  JWT_REFRESH_EXPIRES_IN: '7d',
  NODE_ENV: 'test',
  MONGODB_URI:
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cliniva_test',
};

const CREDENTIALS = {
  owner: { username: 'Zoukaa-Owner-12', password: '12345678Zz@' },
  admin: { username: 'Admin01-12', password: '12345678Zz@' },
  staff: { username: 'Staff01-21', password: '12345678Zz@' },
};

type ContextData = {
  planType: string;
  role: string;
  complexes?: Array<{ _id: string; name: string }>;
  clinics: Array<{
    _id: string;
    name: string;
    services: string[];
    workingHours: unknown[];
  }>;
  doctors: Array<{
    _id: string;
    name: string;
    clinicIds: string[];
    serviceIds: string[];
    workingHours: unknown[];
  }>;
  services: Array<{
    _id: string;
    name: string;
    duration: number;
    clinicIds: string[];
    doctorIds: string[];
  }>;
};

describe('GET /appointments/context', () => {
  let app: INestApplication;
  let ownerToken: string;
  let adminToken: string;
  let staffToken: string;

  const loginAndGetToken = async (
    username: string,
    password: string,
  ): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username, password });

    expect(res.status).toBe(200);
    expect(res.body.access_token).toBeDefined();
    return res.body.access_token;
  };

  const getContext = async (token: string): Promise<ContextData> => {
    const res = await request(app.getHttpServer())
      .get('/appointments/context')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    return res.body.data as ContextData;
  };

  const assertCommonContextShape = (data: ContextData) => {
    expect(data.planType).toBe('company');
    expect(typeof data.role).toBe('string');

    expect(Array.isArray(data.complexes)).toBe(true);
    expect((data.complexes ?? []).length).toBeGreaterThan(0);
    (data.complexes ?? []).forEach((complex) => {
      expect(complex._id).toBeDefined();
      expect(complex.name).toBeDefined();
    });

    expect(Array.isArray(data.clinics)).toBe(true);
    expect(data.clinics.length).toBeGreaterThan(0);
    data.clinics.forEach((clinic) => {
      expect(clinic._id).toBeDefined();
      expect(clinic.name).toBeDefined();
      expect(Array.isArray(clinic.services)).toBe(true);
      expect(Array.isArray(clinic.workingHours)).toBe(true);
    });

    expect(Array.isArray(data.doctors)).toBe(true);
    expect(data.doctors.length).toBeGreaterThan(0);
    data.doctors.forEach((doctor) => {
      expect(doctor._id).toBeDefined();
      expect(doctor.name).toBeDefined();
      expect(Array.isArray(doctor.clinicIds)).toBe(true);
      expect(Array.isArray(doctor.serviceIds)).toBe(true);
      expect(Array.isArray(doctor.workingHours)).toBe(true);
    });

    expect(Array.isArray(data.services)).toBe(true);
    expect(data.services.length).toBeGreaterThan(0);
    data.services.forEach((service) => {
      expect(service._id).toBeDefined();
      expect(service.name).toBeDefined();
      expect(service.duration).toBeDefined();
      expect(Array.isArray(service.clinicIds)).toBe(true);
      expect(Array.isArray(service.doctorIds)).toBe(true);
    });
  };

  const logContextSummary = (label: string, data: ContextData) => {
    console.log(
      `[${label}] planType=${data.planType}, complexes=${data.complexes?.length ?? 0}, clinics=${data.clinics.length}, doctors=${data.doctors.length}, services=${data.services.length}`,
    );
  };

  beforeAll(async () => {
    Object.assign(process.env, TEST_ENV);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();

    ownerToken = await loginAndGetToken(
      CREDENTIALS.owner.username,
      CREDENTIALS.owner.password,
    );
    adminToken = await loginAndGetToken(
      CREDENTIALS.admin.username,
      CREDENTIALS.admin.password,
    );
    staffToken = await loginAndGetToken(
      CREDENTIALS.staff.username,
      CREDENTIALS.staff.password,
    );
  }, 120_000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('owner login returns full company context', async () => {
    const ownerContext = await getContext(ownerToken);
    assertCommonContextShape(ownerContext);

    const clinicWithServices = ownerContext.clinics.find(
      (clinic) => clinic.services.length > 0,
    );
    expect(clinicWithServices).toBeDefined();

    const doctorWithClinic = ownerContext.doctors.find(
      (doctor) => doctor.clinicIds.length > 0,
    );
    expect(doctorWithClinic).toBeDefined();

    const clinicIds = new Set(ownerContext.clinics.map((clinic) => clinic._id));
    const firstService = ownerContext.services[0];
    expect(firstService).toBeDefined();
    firstService.clinicIds.forEach((id) => {
      expect(clinicIds.has(id)).toBe(true);
    });

    logContextSummary('owner', ownerContext);
  });

  it('admin login returns same rich company context shape as owner', async () => {
    const adminContext = await getContext(adminToken);
    assertCommonContextShape(adminContext);
    logContextSummary('admin', adminContext);
  });

  it('staff login returns staff role and restricted context', async () => {
    const ownerContext = await getContext(ownerToken);
    const staffContext = await getContext(staffToken);

    expect(staffContext.role.toLowerCase()).toContain('staff');
    expect(
      staffContext.complexes === undefined || staffContext.complexes.length === 0,
    ).toBe(true);
    expect(staffContext.clinics.length).toBeGreaterThan(0);
    expect(staffContext.clinics.length).toBeLessThanOrEqual(
      ownerContext.clinics.length,
    );

    const ownerClinicIds = new Set(ownerContext.clinics.map((c) => c._id));
    staffContext.clinics.forEach((clinic) => {
      expect(ownerClinicIds.has(clinic._id)).toBe(true);
    });

    logContextSummary('staff', staffContext);
  });

  it('POST /appointments/check-conflicts returns 200 for past datetime', async () => {
    const ownerContext = await getContext(ownerToken);
    expect(ownerContext.doctors.length).toBeGreaterThan(0);

    const doctorId = ownerContext.doctors[0]._id;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const appointmentDate = yesterday.toISOString().split('T')[0];

    const res = await request(app.getHttpServer())
      .post('/appointments/check-conflicts')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        doctorId,
        appointmentDate,
        appointmentTime: '10:00',
        patientId: '000000000000000000000001',
      });

    expect(res.status).toBe(200);
  });
});
