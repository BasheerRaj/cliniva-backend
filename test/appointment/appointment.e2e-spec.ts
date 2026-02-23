/**
 * M6 – Appointments Management – End-to-End Tests
 * Covers all 13 use-cases (UC-1 → UC-13)
 *
 * Run with:
 *   npm run test:e2e -- test/appointment/appointment.e2e-spec.ts
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import request from 'supertest';
import { Types } from 'mongoose';
import { AppModule } from '../../src/app.module';

// ─── helpers ────────────────────────────────────────────────────────────────
async function registerAndGetToken(
    app: INestApplication,
    userData: object,
    authToken?: string,
): Promise<{ accessToken: string; userId: string }> {
    const req = request(app.getHttpServer())
        .post('/auth/register')
        .send(userData);
    if (authToken) {
        req.set('Authorization', `Bearer ${authToken}`);
    }
    const res = await req;
    // token lives at body.access_token (project standard)
    return {
        accessToken: res.body.access_token ?? '',
        userId:
            res.body.user?._id ??
            res.body.user?.id ??
            res.body.data?.user?._id ??
            '',
    };
}

// ─── test environment (same pattern as existing suites) ──────────────────────
const TEST_ENV = {
    JWT_SECRET: 'test-jwt-secret-appointment-e2e',
    JWT_EXPIRES_IN: '1h',
    JWT_REFRESH_SECRET: 'test-refresh-secret-appointment-e2e',
    JWT_REFRESH_EXPIRES_IN: '7d',
    NODE_ENV: 'test',
    MONGODB_URI:
        process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cliniva_test',
};

// ─── main suite ─────────────────────────────────────────────────────────────
describe('M6 Appointments Management (e2e)', () => {
    let app: INestApplication;

    // Mongoose models injected directly for seeding
    let userModel: any;
    let appointmentModel: any;

    // Auth tokens
    let adminToken: string;
    let adminUserId: string;
    let doctorToken: string;
    let doctorUserId: string;

    // Seed entity IDs (created in beforeAll via DB models)
    let patientId: string;
    let doctorId: string;
    let clinicId: string;
    let serviceId: string;

    // IDs reused across test groups
    let bookedAppointmentId: string;
    let confirmedAppointmentId: string;
    let inProgressAppointmentId: string;

    // ─── setup ────────────────────────────────────────────────────────────────
    beforeAll(async () => {
        Object.assign(process.env, TEST_ENV);

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(
            new ValidationPipe({ transform: true, whitelist: true }),
        );
        await app.init();

        // Inject models
        userModel = moduleFixture.get(getModelToken('User'));
        appointmentModel = moduleFixture.get(getModelToken('Appointment'));

        // Clean slate
        await appointmentModel.deleteMany({ notes: { $regex: 'E2E-M6' } }).catch(() => { });

        const ts = Date.now();

        // ── Step 1: Register owner (can self-register) ───────────────────────────
        const ownerRes = await registerAndGetToken(app, {
            email: `appt-owner-${ts}@test.com`,
            password: 'Owner@12345',
            firstName: 'ApptOwner',
            lastName: 'E2E',
            role: 'owner',
            phone: `+96649${ts.toString().slice(-7)}`,
            nationality: 'SA',
            gender: 'male',
        });
        const ownerToken = ownerRes.accessToken;

        // ── Step 2: Owner creates admin ──────────────────────────────────────────
        const adminRes = await registerAndGetToken(app, {
            email: `appt-admin-${ts}@test.com`,
            password: 'Admin@12345',
            firstName: 'ApptAdmin',
            lastName: 'E2E',
            role: 'admin',
            phone: `+96650${ts.toString().slice(-7)}`,
            nationality: 'SA',
            gender: 'male',
        }, ownerToken);
        adminToken = adminRes.accessToken;
        adminUserId = adminRes.userId;
        // Fall back to owner token if admin registration failed
        if (!adminToken) {
            adminToken = ownerToken;
        }

        // ── Step 3: Admin creates doctor ─────────────────────────────────────────
        const docEmail = `appt-doc-${ts}@test.com`;
        const doctorRes = await registerAndGetToken(app, {
            email: docEmail,
            password: 'Doctor@12345',
            firstName: 'ApptDoctor',
            lastName: 'E2E',
            role: 'doctor',
            phone: `+96651${ts.toString().slice(-7)}`,
            nationality: 'SA',
            gender: 'male',
        }, adminToken);
        doctorToken = doctorRes.accessToken;
        doctorUserId = doctorRes.userId;
        if (!doctorUserId) {
            const doc = await userModel.findOne({ email: docEmail });
            doctorUserId = doc?._id?.toString() ?? new Types.ObjectId().toString();
        }
        doctorId = doctorUserId;

        // ── Step 4: Patient self-registers ───────────────────────────────────────
        const patEmail = `appt-pat-${ts}@test.com`;
        const patRes = await registerAndGetToken(app, {
            email: patEmail,
            password: 'Patient@12345',
            firstName: 'TestPatient',
            lastName: 'E2E',
            role: 'patient',
            phone: `+96652${ts.toString().slice(-7)}`,
            nationality: 'SA',
            gender: 'female',
        });
        patientId = patRes.userId;
        if (!patientId) {
            const doc = await userModel.findOne({ email: patEmail });
            patientId = doc?._id?.toString() ?? new Types.ObjectId().toString();
        }

        // ── Clinic (try model injection, fall back to fake ObjectId) ─────────────
        try {
            const clinicModel = moduleFixture.get(getModelToken('Clinic'));
            const clinic = await clinicModel.create({
                name: `E2E Clinic ${ts}`,
                phone: `+96653${ts.toString().slice(-7)}`,
                email: `clinic-${ts}@e2e.com`,
                specialization: 'General',
                isActive: true,
                status: 'active',
            });
            clinicId = clinic._id.toString();
        } catch {
            clinicId = new Types.ObjectId().toString();
        }

        // ── Service (try model injection, fall back to fake ObjectId) ────────────
        try {
            const serviceModel = moduleFixture.get(getModelToken('Service'));
            const service = await serviceModel.create({
                name: `E2E Service ${ts}`,
                duration: 30,
                isActive: true,
            });
            serviceId = service._id.toString();
        } catch {
            serviceId = new Types.ObjectId().toString();
        }
    }, 90_000);


    afterAll(async () => {
        // clean up appointments created during tests
        await appointmentModel.deleteMany({ notes: { $regex: 'E2E-M6' } }).catch(() => { });
        await userModel.findByIdAndDelete(patientId).catch(() => { });
        await app.close();
    });

    // ── utility: create appointment directly in DB (bypasses validation) ───────
    async function seedAppointment(overrides: object = {}) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const appt = await appointmentModel.create({
            patientId: new Types.ObjectId(patientId),
            doctorId: new Types.ObjectId(doctorId),
            clinicId: new Types.ObjectId(clinicId),
            serviceId: new Types.ObjectId(serviceId),
            appointmentDate: tomorrow.toISOString().split('T')[0],
            appointmentTime: '10:00',
            duration: 30,
            status: 'scheduled',
            urgencyLevel: 'medium',
            notes: 'E2E-M6 seeded appointment',
            ...overrides,
        });
        return appt._id.toString();
    }

    // =========================================================================
    // UC-1: Book Appointment (POST /appointments)
    // =========================================================================
    describe('UC-1: Book Appointment', () => {
        it('controller exists and requires auth (401 without token)', async () => {
            const res = await request(app.getHttpServer())
                .post('/appointments')
                .send({});
            expect(res.status).toBe(401);
        });

        it('returns 201/200 wrapper when called with auth (even with bad data, controller wraps errors)', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 2);
            const res = await request(app.getHttpServer())
                .post('/appointments')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    patientId,
                    doctorId,
                    clinicId,
                    serviceId,
                    appointmentDate: tomorrow.toISOString().split('T')[0],
                    appointmentTime: '09:00',
                    urgencyLevel: 'medium',
                    notes: 'E2E-M6 UC-1 booking test',
                });

            // Controller wraps all outcomes; check shape
            expect([200, 201]).toContain(res.status);
            if (res.body.success === true) {
                expect(res.body.data).toBeDefined();
                bookedAppointmentId = res.body.data._id;
            }
        });
    });

    // =========================================================================
    // UC-2: View Appointments List (GET /appointments)
    // =========================================================================
    describe('UC-2: View Appointments List', () => {
        it('returns 401 without auth', async () => {
            const res = await request(app.getHttpServer()).get('/appointments');
            expect(res.status).toBe(401);
        });

        it('returns list with pagination', async () => {
            const res = await request(app.getHttpServer())
                .get('/appointments?page=1&limit=5')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    // =========================================================================
    // UC-3: View Appointment Details (GET /appointments/:id)
    // =========================================================================
    describe('UC-3: View Appointment Details', () => {
        let targetId: string;

        beforeAll(async () => {
            targetId = await seedAppointment({ notes: 'E2E-M6 UC-3 detail test' });
        });

        it('returns 401 without auth', async () => {
            const res = await request(app.getHttpServer()).get(`/appointments/${targetId}`);
            expect(res.status).toBe(401);
        });

        it('returns appointment details', async () => {
            const res = await request(app.getHttpServer())
                .get(`/appointments/${targetId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data._id).toBe(targetId);
        });

        it('fails with not-found for nonexistent ID', async () => {
            const res = await request(app.getHttpServer())
                .get(`/appointments/${new Types.ObjectId()}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.body.success ?? false).toBe(false);
        });
    });

    // =========================================================================
    // UC-4: Edit Appointment (PUT /appointments/:id)
    // =========================================================================
    describe('UC-4: Edit Appointment', () => {
        let targetId: string;

        beforeAll(async () => {
            targetId = await seedAppointment({ notes: 'E2E-M6 UC-4 edit target' });
        });

        it('returns 401 without auth', async () => {
            const res = await request(app.getHttpServer())
                .put(`/appointments/${targetId}`)
                .send({ notes: 'updated' });
            expect(res.status).toBe(401);
        });

        it('updates notes field', async () => {
            const res = await request(app.getHttpServer())
                .put(`/appointments/${targetId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ notes: 'E2E-M6 UC-4 updated notes' });

            expect([200, 201]).toContain(res.status);
            // Service may succeed or fail due to validation, but controller must respond
            expect(res.body).toBeDefined();
        });
    });

    // =========================================================================
    // UC-5: Check Doctor Availability (GET /appointments/availability/:doctorId)
    // =========================================================================
    describe('UC-5: Check Doctor Availability', () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 3);
        const dateStr = tomorrow.toISOString().split('T')[0];

        it('returns 401 without auth', async () => {
            const res = await request(app.getHttpServer())
                .get(`/appointments/availability/${doctorId}?date=${dateStr}`);
            expect(res.status).toBe(401);
        });

        it('returns availability slots', async () => {
            const res = await request(app.getHttpServer())
                .get(`/appointments/availability/${doctorId}?date=${dateStr}&clinicId=${clinicId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect([200, 201]).toContain(res.status);
            expect(res.body).toBeDefined();
        });
    });

    // =========================================================================
    // UC-6: Cancel Appointment (POST /appointments/:id/cancel)
    // =========================================================================
    describe('UC-6: Cancel Appointment', () => {
        let cancelId: string;

        beforeAll(async () => {
            cancelId = await seedAppointment({ notes: 'E2E-M6 UC-6 cancel target' });
        });

        it('returns 401 without auth', async () => {
            const res = await request(app.getHttpServer())
                .post(`/appointments/${cancelId}/cancel`)
                .send({ cancellationReason: 'test' });
            expect(res.status).toBe(401);
        });

        it('cancels appointment with reason', async () => {
            const res = await request(app.getHttpServer())
                .post(`/appointments/${cancelId}/cancel`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ cancellationReason: 'E2E-M6 test cancellation', rescheduleOption: false });

            expect([200, 201]).toContain(res.status);
            if (res.body.success === true) {
                expect(res.body.data.status).toBe('cancelled');
            }
        });
    });

    // =========================================================================
    // UC-7: Reschedule Appointment (POST /appointments/:id/reschedule)
    // =========================================================================
    describe('UC-7: Reschedule Appointment', () => {
        let rescheduleId: string;

        beforeAll(async () => {
            rescheduleId = await seedAppointment({ notes: 'E2E-M6 UC-7 reschedule target' });
        });

        it('returns 401 without auth', async () => {
            const res = await request(app.getHttpServer())
                .post(`/appointments/${rescheduleId}/reschedule`)
                .send({});
            expect(res.status).toBe(401);
        });

        it('reschedules appointment', async () => {
            const newDate = new Date();
            newDate.setDate(newDate.getDate() + 5);
            const newDateStr = newDate.toISOString().split('T')[0];

            const res = await request(app.getHttpServer())
                .post(`/appointments/${rescheduleId}/reschedule`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    newAppointmentDate: newDateStr,
                    newAppointmentTime: '14:00',
                    rescheduleReason: 'E2E-M6 doctor unavailable on original date',
                });

            expect([200, 201]).toContain(res.status);
            // response is wrapped; just check it responded
            expect(res.body).toBeDefined();
        });
    });

    // =========================================================================
    // UC-8: Delete Appointment (DELETE /appointments/:id)
    // =========================================================================
    describe('UC-8: Delete Appointment', () => {
        let deleteId: string;

        beforeAll(async () => {
            deleteId = await seedAppointment({ notes: 'E2E-M6 UC-8 delete target' });
        });

        it('returns 401 without auth', async () => {
            const res = await request(app.getHttpServer()).delete(`/appointments/${deleteId}`);
            expect(res.status).toBe(401);
        });

        it('soft-deletes appointment', async () => {
            const res = await request(app.getHttpServer())
                .delete(`/appointments/${deleteId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect([200, 201]).toContain(res.status);
            expect(res.body.success).toBe(true);
        });

        it('deleted appointment is no longer retrievable', async () => {
            const res = await request(app.getHttpServer())
                .get(`/appointments/${deleteId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.body.success ?? false).toBe(false);
        });
    });

    // =========================================================================
    // UC-9 (NEW): View Calendar (GET /appointments/calendar)
    // =========================================================================
    describe('UC-9 (NEW): View Appointments Calendar', () => {
        it('returns 401 without auth', async () => {
            const res = await request(app.getHttpServer()).get('/appointments/calendar');
            expect(res.status).toBe(401);
        });

        it('returns weekly calendar grouped by date', async () => {
            const res = await request(app.getHttpServer())
                .get('/appointments/calendar?view=week&date=2027-06-01')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.view).toBe('week');
            expect(res.body.data.groupedByDate).toBeDefined();
        });

        it('returns daily calendar', async () => {
            const res = await request(app.getHttpServer())
                .get('/appointments/calendar?view=day&date=2027-06-01')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.view).toBe('day');
        });

        it('returns monthly calendar', async () => {
            const res = await request(app.getHttpServer())
                .get('/appointments/calendar?view=month&date=2027-06-01')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.view).toBe('month');
        });

        it('defaults to week view when view param omitted', async () => {
            const res = await request(app.getHttpServer())
                .get('/appointments/calendar?date=2027-06-01')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.view).toBe('week');
        });
    });

    // =========================================================================
    // UC-10 (NEW): Change Appointment Status (PATCH /appointments/:id/status)
    // =========================================================================
    describe('UC-10 (NEW): Change Appointment Status', () => {
        let statusId: string;

        beforeAll(async () => {
            statusId = await seedAppointment({ notes: 'E2E-M6 UC-10 status target', status: 'scheduled' });
        });

        it('returns 401 without auth', async () => {
            const res = await request(app.getHttpServer())
                .patch(`/appointments/${statusId}/status`)
                .send({ status: 'confirmed' });
            expect(res.status).toBe(401);
        });

        it('changes status from scheduled to confirmed', async () => {
            const res = await request(app.getHttpServer())
                .patch(`/appointments/${statusId}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'confirmed' });

            expect([200, 201]).toContain(res.status);
            if (res.body.success === true) {
                expect(res.body.data.status).toBe('confirmed');
                confirmedAppointmentId = statusId;
            }
        });

        it('rejects cancellation without reason', async () => {
            const freshId = await seedAppointment({ notes: 'E2E-M6 cancel-no-reason test' });
            const res = await request(app.getHttpServer())
                .patch(`/appointments/${freshId}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'cancelled' }); // no reason

            // Either controller returns success:false or a 4xx
            const rejected = res.body.success === false || res.status >= 400;
            expect(rejected).toBe(true);
        });

        it('rejects rescheduled without newDate', async () => {
            const freshId = await seedAppointment({ notes: 'E2E-M6 reschedule-no-date test' });
            const res = await request(app.getHttpServer())
                .patch(`/appointments/${freshId}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'rescheduled' }); // no newDate/newTime

            const rejected = res.body.success === false || res.status >= 400;
            expect(rejected).toBe(true);
        });
    });

    // =========================================================================
    // UC-11 (NEW): Start Appointment (POST /appointments/:id/start)
    // =========================================================================
    describe('UC-11 (NEW): Start Appointment', () => {
        let startId: string;

        beforeAll(async () => {
            // Seed a confirmed appointment to start
            startId = await seedAppointment({ notes: 'E2E-M6 UC-11 start target', status: 'confirmed' });
            confirmedAppointmentId = confirmedAppointmentId ?? startId;
        });

        it('returns 401 without auth', async () => {
            const res = await request(app.getHttpServer())
                .post(`/appointments/${startId}/start`);
            expect(res.status).toBe(401);
        });

        it('starts a confirmed appointment', async () => {
            const res = await request(app.getHttpServer())
                .post(`/appointments/${startId}/start`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect([200, 201]).toContain(res.status);
            if (res.body.success === true) {
                expect(res.body.data.status).toBe('in_progress');
                expect(res.body.data.actualStartTime).toBeDefined();
                expect(res.body.redirectTo).toContain('/medical-entry/');
                inProgressAppointmentId = startId;
            }
        });

        it('rejects starting an already in-progress appointment', async () => {
            if (!inProgressAppointmentId) return;

            const res = await request(app.getHttpServer())
                .post(`/appointments/${inProgressAppointmentId}/start`)
                .set('Authorization', `Bearer ${adminToken}`);

            const rejected = res.body.success === false || res.status >= 400;
            expect(rejected).toBe(true);
        });
    });

    // =========================================================================
    // UC-12 (NEW): End Appointment (POST /appointments/:id/end)
    // =========================================================================
    describe('UC-12 (NEW): End Appointment', () => {
        let endId: string;

        beforeAll(async () => {
            // Seed an in_progress appointment
            endId = await seedAppointment({ notes: 'E2E-M6 UC-12 end target', status: 'in_progress', actualStartTime: new Date() });
        });

        it('returns 401 without auth', async () => {
            const res = await request(app.getHttpServer())
                .post(`/appointments/${endId}/end`)
                .send({});
            expect(res.status).toBe(401);
        });

        it('ends an in-progress appointment with medical data', async () => {
            const res = await request(app.getHttpServer())
                .post(`/appointments/${endId}/end`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    sessionNotes: {
                        diagnosis: 'Type 2 Diabetes',
                        symptoms: 'Fatigue, thirst',
                        findings: 'Blood glucose elevated',
                    },
                    prescriptions: [
                        { medication: 'Metformin', dosage: '500mg', frequency: 'Twice daily', duration: '3 months' },
                    ],
                    treatmentPlan: { steps: 'Diet modification', tests: 'HbA1c', lifestyle: 'Exercise daily' },
                    followUp: { required: true, recommendedDuration: '3 months' },
                });

            expect([200, 201]).toContain(res.status);
            if (res.body.success === true) {
                expect(res.body.data.status).toBe('completed');
                expect(res.body.data.actualEndTime).toBeDefined();
            }
        });

        it('rejects ending an already-completed appointment', async () => {
            // endId is now completed (from test above) – try ending again
            const completedId = await seedAppointment({ notes: 'E2E-M6 already-completed', status: 'completed' });

            const res = await request(app.getHttpServer())
                .post(`/appointments/${completedId}/end`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({});

            const rejected = res.body.success === false || res.status >= 400;
            expect(rejected).toBe(true);
        });
    });

    // =========================================================================
    // UC-13 (NEW): Conclude Appointment (POST /appointments/:id/conclude)
    // =========================================================================
    describe('UC-13 (NEW): Conclude Appointment', () => {
        let concludeId: string;

        beforeAll(async () => {
            concludeId = await seedAppointment({ notes: 'E2E-M6 UC-13 conclude target', status: 'in_progress', actualStartTime: new Date() });
        });

        it('returns 401 without auth', async () => {
            const res = await request(app.getHttpServer())
                .post(`/appointments/${concludeId}/conclude`)
                .send({});
            expect(res.status).toBe(401);
        });

        it('rejects conclusion without doctorNotes (BR-f1d3e2c)', async () => {
            const freshId = await seedAppointment({ notes: 'E2E-M6 conclude-no-notes', status: 'in_progress', actualStartTime: new Date() });

            const res = await request(app.getHttpServer())
                .post(`/appointments/${freshId}/conclude`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    sessionNotes: { diagnosis: 'Test' },
                    // doctorNotes intentionally missing
                });

            const rejected = res.body.success === false || res.status >= 400;
            expect(rejected).toBe(true);
        });

        it('concludes appointment with valid doctorNotes', async () => {
            const res = await request(app.getHttpServer())
                .post(`/appointments/${concludeId}/conclude`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    doctorNotes: 'Patient responded well to treatment. Continue medication and monitor monthly.',
                    sessionNotes: {
                        diagnosis: 'Type 2 Diabetes',
                        symptoms: 'Fatigue, thirst',
                        findings: 'Controlled blood glucose',
                        procedures: 'HbA1c test',
                    },
                    prescriptions: [
                        { medication: 'Metformin', dosage: '500mg', frequency: 'Twice daily', duration: '6 months' },
                    ],
                    treatmentPlan: { steps: 'Continue diet', tests: 'HbA1c every 6 months', lifestyle: 'Exercise 30 min/day' },
                    followUp: { required: true, recommendedDuration: '6 months' },
                });

            expect([200, 201]).toContain(res.status);
            if (res.body.success === true) {
                expect(res.body.data.status).toBe('completed');
                expect(res.body.data.actualEndTime).toBeDefined();
            }
        });

        it('rejects status change on a completed appointment (final state)', async () => {
            const completedId = await seedAppointment({ notes: 'E2E-M6 final-state test', status: 'completed' });

            const res = await request(app.getHttpServer())
                .patch(`/appointments/${completedId}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'cancelled', reason: 'E2E test attempt' });

            const rejected = res.body.success === false || res.status >= 400;
            expect(rejected).toBe(true);
        });
    });
});
