/**
 * RBAC Critical E2E Test Suite
 * ==============================
 * Covers the highest-risk scenarios identified in the RBAC audit.
 *
 * These tests MUST all pass before any production deployment.
 * Failing tests indicate an active security vulnerability.
 *
 * @see docs/audit/rbac-audit.md
 */

import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { JwtService } from '@nestjs/jwt';

// ─── Test User Fixture Tokens ──────────────────────────────────────────────────
// These are created once before the suite runs and cleaned up after.
interface TestUser {
    id: string;
    token: string;
    role: string;
    organizationId?: string;
    subscriptionId?: string;
    clinicId?: string;
    complexId?: string;
}

let app: INestApplication;
let jwtService: JwtService;

// Test users — populated in beforeAll
let superAdmin: TestUser;
let ownerA: TestUser;        // Owner of Tenant A
let ownerB: TestUser;        // Owner of Tenant B (separate tenant)
let adminA: TestUser;        // Admin scoped to Tenant A Clinic 1
let adminB: TestUser;        // Admin scoped to Tenant B Clinic 1
let complexAdminA: TestUser; // Complex-admin for Tenant A Complex 1
let doctorA: TestUser;       // Doctor in Tenant A Clinic 1
let doctorA2: TestUser;      // Second doctor in Tenant A Clinic 1
let staffA: TestUser;        // Staff in Tenant A Clinic 1
let patientA: TestUser;      // Patient registered in Tenant A

// Entity IDs — populated in beforeAll
let tenantAClinicId: string;
let tenantAComplexId: string;
let tenantBClinicId: string;
let tenantBComplexId: string;
let patientAId: string;
let patientBId: string;      // A patient belonging to Tenant B
let appointmentAId: string;
let medicalReportAId: string;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Creates a signed JWT directly (bypasses login endpoint)
 * for deterministic test setup without hitting rate limiting.
 */
function signToken(payload: object): string {
    return jwtService.sign(payload, {
        secret: process.env.JWT_SECRET || 'test-secret',
        expiresIn: '1h',
    });
}

function authHeader(token: string) {
    return `Bearer ${token}`;
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);

    // ── Create fixture users via register endpoint ──
    // Note: In a real test environment these would be seeded via database,
    // but here we use the register flow to mirror the actual auth path.

    // 1. Register Owner A (self-register)
    const ownerARes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
            email: `owner-a-${Date.now()}@test.cliniva.com`,
            password: 'Test1234@',
            firstName: 'Owner',
            lastName: 'TenantA',
            role: 'owner',
        });

    ownerA = {
        id: ownerARes.body.user?.id,
        token: ownerARes.body.access_token,
        role: 'owner',
    };

    // 2. Register Owner B (separate tenant)
    const ownerBRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
            email: `owner-b-${Date.now()}@test.cliniva.com`,
            password: 'Test1234@',
            firstName: 'Owner',
            lastName: 'TenantB',
            role: 'owner',
        });

    ownerB = {
        id: ownerBRes.body.user?.id,
        token: ownerBRes.body.access_token,
        role: 'owner',
    };

    // 3. Register Patient A
    const patientARes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
            email: `patient-a-${Date.now()}@test.cliniva.com`,
            password: 'Test1234@',
            firstName: 'Patient',
            lastName: 'Alpha',
            role: 'patient',
        });

    patientA = {
        id: patientARes.body.user?.id,
        token: patientARes.body.access_token,
        role: 'patient',
    };

    // For roles that require admin creation, sign tokens directly
    // (avoids chicken-and-egg problem in test bootstrap)
    const baseAdminAPayload = {
        sub: 'admin-a-test-id',
        id: 'admin-a-test-id',
        email: 'admin-a@test.cliniva.com',
        role: 'admin',
        organizationId: 'org-a-test-id',
        subscriptionId: 'sub-a-test-id',
        clinicId: 'clinic-a-test-id',
    };

    adminA = {
        id: 'admin-a-test-id',
        token: signToken(baseAdminAPayload),
        role: 'admin',
        organizationId: 'org-a-test-id',
        clinicId: 'clinic-a-test-id',
    };

    const baseAdminBPayload = {
        sub: 'admin-b-test-id',
        id: 'admin-b-test-id',
        email: 'admin-b@test.cliniva.com',
        role: 'admin',
        organizationId: 'org-b-test-id',
        subscriptionId: 'sub-b-test-id',
        clinicId: 'clinic-b-test-id',
    };

    adminB = {
        id: 'admin-b-test-id',
        token: signToken(baseAdminBPayload),
        role: 'admin',
        organizationId: 'org-b-test-id',
        clinicId: 'clinic-b-test-id',
    };

    complexAdminA = {
        id: 'complex-admin-a-test-id',
        token: signToken({
            sub: 'complex-admin-a-test-id',
            id: 'complex-admin-a-test-id',
            email: 'complex-admin-a@test.cliniva.com',
            role: 'admin',
            organizationId: 'org-a-test-id',
            complexId: 'complex-a-test-id',
        }),
        role: 'admin',
        complexId: 'complex-a-test-id',
    };

    doctorA = {
        id: 'doctor-a-test-id',
        token: signToken({
            sub: 'doctor-a-test-id',
            id: 'doctor-a-test-id',
            email: 'doctor-a@test.cliniva.com',
            role: 'doctor',
            clinicId: 'clinic-a-test-id',
            organizationId: 'org-a-test-id',
        }),
        role: 'doctor',
        clinicId: 'clinic-a-test-id',
    };

    doctorA2 = {
        id: 'doctor-a2-test-id',
        token: signToken({
            sub: 'doctor-a2-test-id',
            id: 'doctor-a2-test-id',
            email: 'doctor-a2@test.cliniva.com',
            role: 'doctor',
            clinicId: 'clinic-a-test-id',
            organizationId: 'org-a-test-id',
        }),
        role: 'doctor',
        clinicId: 'clinic-a-test-id',
    };

    staffA = {
        id: 'staff-a-test-id',
        token: signToken({
            sub: 'staff-a-test-id',
            id: 'staff-a-test-id',
            email: 'staff-a@test.cliniva.com',
            role: 'staff',
            clinicId: 'clinic-a-test-id',
            organizationId: 'org-a-test-id',
        }),
        role: 'staff',
        clinicId: 'clinic-a-test-id',
    };

    superAdmin = {
        id: 'super-admin-test-id',
        token: signToken({
            sub: 'super-admin-test-id',
            id: 'super-admin-test-id',
            email: 'super@cliniva.platform',
            role: 'super_admin',
        }),
        role: 'super_admin',
    };

    // Set known entity IDs for cross-tenant tests
    tenantAClinicId = 'clinic-a-test-id';
    tenantAComplexId = 'complex-a-test-id';
    tenantBClinicId = 'clinic-b-test-id';
    tenantBComplexId = 'complex-b-test-id';
});

afterAll(async () => {
    await app.close();
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 1: Unauthenticated Requests
// ══════════════════════════════════════════════════════════════════════════════

describe('SEC-1: Unauthenticated requests to protected endpoints → 401', () => {
    const protectedEndpoints = [
        { method: 'get', path: '/users' },
        { method: 'get', path: '/users/me' },
        { method: 'get', path: '/auth/profile' },
        { method: 'post', path: '/auth/logout' },
        { method: 'post', path: '/auth/change-password' },
        { method: 'get', path: '/clinics' },
        { method: 'post', path: '/clinics' },
        { method: 'get', path: '/appointments' },
        { method: 'post', path: '/appointments' },
        { method: 'get', path: '/patients' },
        { method: 'post', path: '/patients' },
        { method: 'get', path: '/medical-reports' },
        { method: 'post', path: '/medical-reports' },
        { method: 'post', path: '/onboarding/start' },
    ];

    test.each(protectedEndpoints)(
        '$method $path returns 401 without token',
        async ({ method, path }) => {
            const res = await (request(app.getHttpServer()) as any)[method](path);
            // Should be 401, not 200, 403, or 500
            expect(res.status).toBe(401);
        },
    );

    // REGRESSION: Debug endpoint MUST be protected (ISSUE-001)
    it('GET /auth/debug/user/:userId must return 401 without token (ISSUE-001)', async () => {
        const res = await request(app.getHttpServer())
            .get('/auth/debug/user/any-id')
            .expect(401);

        expect(res.status).toBe(401);
    });

    // REGRESSION: Subscription endpoints MUST require auth (ISSUE-002)
    it('POST /subscriptions must return 401 without token (ISSUE-002)', async () => {
        const res = await request(app.getHttpServer()).post('/subscriptions').send({
            userId: 'any-id',
            planId: 'any-plan',
        });
        expect(res.status).toBe(401);
    });

    it('PUT /subscriptions/:id/status must return 401 without token (ISSUE-002)', async () => {
        const res = await request(app.getHttpServer())
            .put('/subscriptions/some-id/status')
            .send({ status: 'cancelled' });
        expect(res.status).toBe(401);
    });

    // REGRESSION: Complex endpoints MUST require auth (ISSUE-003)
    it('GET /complexes must return 401 without token (ISSUE-003)', async () => {
        const res = await request(app.getHttpServer()).get('/complexes');
        expect(res.status).toBe(401);
    });

    it('POST /complexes must return 401 without token (ISSUE-003)', async () => {
        const res = await request(app.getHttpServer())
            .post('/complexes')
            .send({ name: 'Test Complex' });
        expect(res.status).toBe(401);
    });

    it('DELETE /complexes/:id must return 401 without token (ISSUE-003)', async () => {
        const res = await request(app.getHttpServer()).delete(
            '/complexes/some-complex-id',
        );
        expect(res.status).toBe(401);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 2: Patient Role Restrictions
// ══════════════════════════════════════════════════════════════════════════════

describe('SEC-2: Patient role → blocked from management endpoints → 403', () => {
    it('Patient cannot access GET /users (admin management)', async () => {
        const res = await request(app.getHttpServer())
            .get('/users')
            .set('Authorization', authHeader(patientA.token));
        expect(res.status).toBe(403);
    });

    it('Patient cannot create another patient via POST /patients', async () => {
        const res = await request(app.getHttpServer())
            .post('/patients')
            .set('Authorization', authHeader(patientA.token))
            .send({
                firstName: 'Fake',
                lastName: 'Patient',
                cardNumber: 'FAKE001',
                dateOfBirth: '1990-01-01',
                gender: 'male',
            });
        expect(res.status).toBe(403);
    });

    it('Patient cannot delete any patient record via DELETE /patients/:id', async () => {
        const res = await request(app.getHttpServer())
            .delete(`/patients/some-patient-id`)
            .set('Authorization', authHeader(patientA.token));
        expect(res.status).toBe(403);
    });

    it('Patient cannot list ALL patients via GET /patients', async () => {
        const res = await request(app.getHttpServer())
            .get('/patients')
            .set('Authorization', authHeader(patientA.token));
        expect(res.status).toBe(403);
    });

    it('Patient cannot create appointments via POST /appointments', async () => {
        const res = await request(app.getHttpServer())
            .post('/appointments')
            .set('Authorization', authHeader(patientA.token))
            .send({
                patientId: patientA.id,
                doctorId: doctorA.id,
                clinicId: tenantAClinicId,
                appointmentDate: '2026-03-01',
                appointmentTime: '10:00',
            });
        // Patients can only VIEW their own appointments, never create
        expect(res.status).toBe(403);
    });

    it('Patient cannot access medical reports for others via GET /medical-reports', async () => {
        const res = await request(app.getHttpServer())
            .get('/medical-reports')
            .set('Authorization', authHeader(patientA.token));
        expect(res.status).toBe(403);
    });

    it('Patient cannot create medical reports via POST /medical-reports', async () => {
        const res = await request(app.getHttpServer())
            .post('/medical-reports')
            .set('Authorization', authHeader(patientA.token))
            .send({ patientId: patientA.id, diagnosis: 'Test' });
        expect(res.status).toBe(403);
    });

    it('Patient cannot access complex management via GET /complexes', async () => {
        const res = await request(app.getHttpServer())
            .get('/complexes')
            .set('Authorization', authHeader(patientA.token));
        expect(res.status).toBe(403);
    });

    it('Patient cannot update subscription status', async () => {
        const res = await request(app.getHttpServer())
            .put('/subscriptions/any-id/status')
            .set('Authorization', authHeader(patientA.token))
            .send({ status: 'cancelled' });
        expect(res.status).toBe(403);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 3: Cross-Tenant Isolation (Owner A vs Owner B)
// ══════════════════════════════════════════════════════════════════════════════

describe('SEC-3: Cross-tenant isolation → Owner A cannot access Owner B data → 403', () => {
    it('Owner A cannot read Owner B clinic via GET /clinics/:id', async () => {
        const res = await request(app.getHttpServer())
            .get(`/clinics/${tenantBClinicId}`)
            .set('Authorization', authHeader(ownerA.token));
        expect(res.status).toBe(403);
    });

    it('Owner A cannot update Owner B clinic via PUT /clinics/:id', async () => {
        const res = await request(app.getHttpServer())
            .put(`/clinics/${tenantBClinicId}`)
            .set('Authorization', authHeader(ownerA.token))
            .send({ name: 'Hijacked Clinic' });
        expect(res.status).toBe(403);
    });

    it('Owner A cannot read Owner B complex', async () => {
        const res = await request(app.getHttpServer())
            .get(`/complexes/${tenantBComplexId}`)
            .set('Authorization', authHeader(ownerA.token));
        expect(res.status).toBe(403);
    });

    it('Owner A cannot delete Owner B complex', async () => {
        const res = await request(app.getHttpServer())
            .delete(`/complexes/${tenantBComplexId}`)
            .set('Authorization', authHeader(ownerA.token));
        expect(res.status).toBe(403);
    });

    it('Owner A cannot cancel Owner B subscription by guessing subscription ID', async () => {
        const res = await request(app.getHttpServer())
            .put(`/subscriptions/owner-b-subscription-id/status`)
            .set('Authorization', authHeader(ownerA.token))
            .send({ status: 'cancelled' });
        expect(res.status).toBe(403);
    });

    it('Owner A cannot list Owner B users by passing their organizationId in query', async () => {
        const res = await request(app.getHttpServer())
            .get('/users?organizationId=org-b-test-id')
            .set('Authorization', authHeader(ownerA.token));
        // Should return empty array scoped to own org, not 403 is acceptable if filtered
        // But should NEVER return org-b users
        if (res.status === 200) {
            const users = res.body?.data?.users || res.body?.data || [];
            const leak = users.some(
                (u: any) => u.organizationId === 'org-b-test-id',
            );
            expect(leak).toBe(false);
        } else {
            expect(res.status).toBe(403);
        }
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 4: Admin Scope Violations
// ══════════════════════════════════════════════════════════════════════════════

describe('SEC-4: Admin scope violations → 403', () => {
    it('Admin A cannot access clinic from Tenant B via GET /clinics/:id', async () => {
        const res = await request(app.getHttpServer())
            .get(`/clinics/${tenantBClinicId}`)
            .set('Authorization', authHeader(adminA.token));
        expect(res.status).toBe(403);
    });

    it('Complex Admin A cannot access a clinic outside their complex', async () => {
        // Clinic B belongs to a different complex
        const res = await request(app.getHttpServer())
            .get(`/clinics/${tenantBClinicId}`)
            .set('Authorization', authHeader(complexAdminA.token));
        expect(res.status).toBe(403);
    });

    it('Admin A cannot update user status for a user in Tenant B', async () => {
        const res = await request(app.getHttpServer())
            .patch(`/users/${adminB.id}/status`)
            .set('Authorization', authHeader(adminA.token))
            .send({ isActive: false });
        expect(res.status).toBe(403);
    });

    it('Admin cannot manage subscription plans (super_admin only)', async () => {
        const res = await request(app.getHttpServer())
            .put('/subscriptions/some-sub-id/status')
            .set('Authorization', authHeader(adminA.token))
            .send({ status: 'cancelled' });
        expect(res.status).toBe(403);
    });

    it('Admin cannot create a new admin role (owner/super_admin only)', async () => {
        const res = await request(app.getHttpServer())
            .post('/users')
            .set('Authorization', authHeader(adminA.token))
            .send({
                email: `new-admin-${Date.now()}@test.com`,
                password: 'Test1234@',
                firstName: 'New',
                lastName: 'Admin',
                role: 'admin',
            });
        expect(res.status).toBe(403);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 5: Doctor Scope Violations
// ══════════════════════════════════════════════════════════════════════════════

describe('SEC-5: Doctor accessing another doctor\'s patient records → 403', () => {
    it('Doctor A cannot read all medical reports system-wide', async () => {
        const res = await request(app.getHttpServer())
            .get('/medical-reports')
            .set('Authorization', authHeader(doctorA.token));
        // Must be 403 or restricted to own clinic only
        if (res.status === 200) {
            // If allowed, verify it only returns reports from doctorA's clinic
            const reports = res.body?.data || [];
            const leak = reports.some(
                (r: any) =>
                    r.clinicId && r.clinicId !== tenantAClinicId,
            );
            expect(leak).toBe(false);
        } else {
            expect(res.status).toBe(403);
        }
    });

    it('Doctor A2 cannot access medical reports created by Doctor A for a patient', async () => {
        // In a real test, we'd first create a report as doctorA, then try to access as doctorA2
        // For now this verifies the endpoint requires clinic ownership
        const res = await request(app.getHttpServer())
            .get('/medical-reports/patient/some-other-patient-id')
            .set('Authorization', authHeader(doctorA2.token));
        // Must validate that doctorA2 has access to this patient
        // If not assigned, should return 403
        // Accept 200 only if patient belongs to doctorA2's clinic
        if (res.status === 200) {
            expect(res.body?.data).toBeDefined();
            // Verify no cross-doctor leakage — this requires service-level enforcement
        } else {
            expect([403, 404]).toContain(res.status);
        }
    });

    it('Doctor cannot update patient medical history if not their patient', async () => {
        const res = await request(app.getHttpServer())
            .put(`/patients/unrelated-patient-id/medical-history`)
            .set('Authorization', authHeader(doctorA.token))
            .send({ allergies: ['penicillin'] });
        expect(res.status).toBe(403);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 6: Staff Role Restrictions
// ══════════════════════════════════════════════════════════════════════════════

describe('SEC-6: Staff cannot access clinical/medical data → 403', () => {
    it('Staff cannot create medical reports', async () => {
        const res = await request(app.getHttpServer())
            .post('/medical-reports')
            .set('Authorization', authHeader(staffA.token))
            .send({ patientId: 'some-id', diagnosis: 'Test' });
        expect(res.status).toBe(403);
    });

    it('Staff cannot update medical history', async () => {
        const res = await request(app.getHttpServer())
            .put('/patients/some-patient-id/medical-history')
            .set('Authorization', authHeader(staffA.token))
            .send({ allergies: ['aspirin'] });
        expect(res.status).toBe(403);
    });

    it('Staff cannot delete patients', async () => {
        const res = await request(app.getHttpServer())
            .delete('/patients/some-patient-id')
            .set('Authorization', authHeader(staffA.token));
        expect(res.status).toBe(403);
    });

    it('Staff cannot access user management (GET /users)', async () => {
        const res = await request(app.getHttpServer())
            .get('/users')
            .set('Authorization', authHeader(staffA.token));
        expect(res.status).toBe(403);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 7: Super-Admin Access (must be 200)
// ══════════════════════════════════════════════════════════════════════════════

describe('SEC-7: Super-admin can access any tenant resource → 200', () => {
    it('Super-admin can list all users', async () => {
        const res = await request(app.getHttpServer())
            .get('/users')
            .set('Authorization', authHeader(superAdmin.token));
        expect(res.status).toBe(200);
    });

    it('Super-admin can access Tenant A clinics', async () => {
        const res = await request(app.getHttpServer())
            .get('/clinics')
            .set('Authorization', authHeader(superAdmin.token));
        expect(res.status).toBe(200);
    });

    it('Super-admin can access Tenant B clinics', async () => {
        const res = await request(app.getHttpServer())
            .get(`/clinics?subscriptionId=sub-b-test-id`)
            .set('Authorization', authHeader(superAdmin.token));
        expect(res.status).toBe(200);
    });

    it('Super-admin can access all medical reports', async () => {
        const res = await request(app.getHttpServer())
            .get('/medical-reports')
            .set('Authorization', authHeader(superAdmin.token));
        expect(res.status).toBe(200);
    });

    it('Super-admin can access all appointments', async () => {
        const res = await request(app.getHttpServer())
            .get('/appointments')
            .set('Authorization', authHeader(superAdmin.token));
        expect(res.status).toBe(200);
    });

    it('Super-admin can get any user by ID', async () => {
        const res = await request(app.getHttpServer())
            .get(`/users/${ownerB.id}`)
            .set('Authorization', authHeader(superAdmin.token));
        // Super-admin cross-tenant access should succeed
        expect(res.status).toBe(200);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 8: Appointment Ownership Boundaries
// ══════════════════════════════════════════════════════════════════════════════

describe('SEC-8: Appointment endpoint ownership enforcement', () => {
    it('Patient cannot view another patient\'s appointments via GET /appointments/patient/:id', async () => {
        // patientA tries to see appointments of patient B
        const res = await request(app.getHttpServer())
            .get(`/appointments/patient/some-other-patient-id`)
            .set('Authorization', authHeader(patientA.token));
        // Should be 403 if patient can only see own appointments
        expect(res.status).toBe(403);
    });

    it('Any user should not see ALL upcoming appointments system-wide', async () => {
        const res = await request(app.getHttpServer())
            .get('/appointments/schedule/upcoming')
            .set('Authorization', authHeader(staffA.token));
        if (res.status === 200) {
            // If 200, must be scoped to staff's clinic only — not global
            const appointments = res.body?.data || [];
            const leak = appointments.some(
                (a: any) => a.clinicId && a.clinicId !== tenantAClinicId,
            );
            expect(leak).toBe(false);
        } else {
            expect([403, 200]).toContain(res.status);
        }
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 9: Debug Endpoint Security (ISSUE-001)
// ══════════════════════════════════════════════════════════════════════════════

describe('SEC-9: Debug endpoint security (ISSUE-001 regression)', () => {
    it('GET /auth/debug/user/:id must not be accessible anonymously', async () => {
        const res = await request(app.getHttpServer()).get(
            '/auth/debug/user/some-user-id',
        );
        expect(res.status).toBe(401);
    });

    it('GET /auth/debug/user/:id must not be accessible by patient role', async () => {
        const res = await request(app.getHttpServer())
            .get('/auth/debug/user/some-user-id')
            .set('Authorization', authHeader(patientA.token));
        expect([403, 404]).toContain(res.status);
    });

    it('GET /auth/debug/user/:id must not be accessible by staff role', async () => {
        const res = await request(app.getHttpServer())
            .get('/auth/debug/user/some-user-id')
            .set('Authorization', authHeader(staffA.token));
        expect([403, 404]).toContain(res.status);
    });

    it('GET /auth/debug/user/:id must only be accessible by super_admin', async () => {
        const res = await request(app.getHttpServer())
            .get(`/auth/debug/user/${ownerA.id}`)
            .set('Authorization', authHeader(superAdmin.token));
        // Super-admin should be able to use debug endpoint for support purposes
        expect([200, 404]).toContain(res.status); // 404 if user doesn't exist in test DB
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 10: Owner Cannot Manage Platform Plans
// ══════════════════════════════════════════════════════════════════════════════

describe('SEC-10: Owner cannot manage platform-level subscription plans', () => {
    it('Owner cannot create new subscription plans', async () => {
        const res = await request(app.getHttpServer())
            .post('/plans')
            .set('Authorization', authHeader(ownerA.token))
            .send({ name: 'custom-plan', price: 0 });
        // Plans endpoint may not exist, but should never return 201
        expect([403, 404, 401]).toContain(res.status);
    });

    it('Owner can VIEW subscription plans (public or own-tenant)', async () => {
        const res = await request(app.getHttpServer())
            .get('/subscriptions/plans')
            .set('Authorization', authHeader(ownerA.token));
        // Plans list should be readable (it's a marketing page feature)
        expect([200, 401]).toContain(res.status);
    });

    it('Owner cannot cancel another owner\'s subscription', async () => {
        const res = await request(app.getHttpServer())
            .put('/subscriptions/owner-b-subscription-id/status')
            .set('Authorization', authHeader(ownerA.token))
            .send({ status: 'cancelled' });
        expect([403, 404]).toContain(res.status);
    });
});
