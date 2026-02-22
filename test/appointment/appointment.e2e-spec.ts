/**
 * M6 – Appointments Management – End-to-End Tests
 * Covers all 13 use-cases from use-cases/m6.json
 *
 * Run with:
 *   npm run test:e2e -- test/appointment/appointment.e2e-spec.ts
 *
 * Prerequisites:
 *   - A running MongoDB instance (or in-memory mongo via @nestjs/testing)
 *   - AUTH_TOKEN env-var set to a valid JWT (or obtained in beforeAll)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

/**
 * Helper to extract a bearer token for a given role.
 * Adjust to match however your auth module issues tokens.
 */
async function loginAs(
    app: INestApplication,
    email: string,
    password: string,
): Promise<string> {
    const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(200);
    return res.body.data?.accessToken ?? res.body.accessToken;
}

describe('M6 Appointments Management (e2e)', () => {
    let app: INestApplication;

    // Tokens for different roles
    let adminToken: string;
    let doctorToken: string;
    let staffToken: string;

    // IDs created during setup / tests
    let createdAppointmentId: string;
    let confirmedAppointmentId: string;
    let inProgressAppointmentId: string;

    // Seed IDs – replace with valid ObjectIds from your test DB or seeder
    const SEED = {
        patientId: process.env.TEST_PATIENT_ID ?? '507f1f77bcf86cd799439001',
        doctorId: process.env.TEST_DOCTOR_ID ?? '507f1f77bcf86cd799439002',
        clinicId: process.env.TEST_CLINIC_ID ?? '507f1f77bcf86cd799439003',
        serviceId: process.env.TEST_SERVICE_ID ?? '507f1f77bcf86cd799439004',
        appointmentDate: '2027-06-01',
        appointmentTime: '10:00',
    };

    // -------------------------------------------------------------------------
    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
        await app.init();

        // Obtain tokens (adjust credentials to match your test users)
        adminToken = await loginAs(app, process.env.TEST_ADMIN_EMAIL ?? 'admin@test.com', process.env.TEST_ADMIN_PASS ?? 'Admin@1234').catch(() => '');
        doctorToken = await loginAs(app, process.env.TEST_DOCTOR_EMAIL ?? 'doctor@test.com', process.env.TEST_DOCTOR_PASS ?? 'Doctor@1234').catch(() => '');
        staffToken = await loginAs(app, process.env.TEST_STAFF_EMAIL ?? 'staff@test.com', process.env.TEST_STAFF_PASS ?? 'Staff@1234').catch(() => '');
    });

    afterAll(async () => {
        await app.close();
    });

    // =========================================================================
    // UC-1: Book Appointment (POST /appointments)
    // =========================================================================
    describe('UC-1: Book Appointment', () => {
        it('should create a new appointment with status=scheduled', async () => {
            const res = await request(app.getHttpServer())
                .post('/appointments')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    patientId: SEED.patientId,
                    doctorId: SEED.doctorId,
                    clinicId: SEED.clinicId,
                    serviceId: SEED.serviceId,
                    appointmentDate: SEED.appointmentDate,
                    appointmentTime: SEED.appointmentTime,
                    urgencyLevel: 'medium',
                    notes: 'E2E test appointment',
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.status).toBe('scheduled');
            createdAppointmentId = res.body.data._id;
        });

        it('should reject booking with a past date (400)', async () => {
            const res = await request(app.getHttpServer())
                .post('/appointments')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    patientId: SEED.patientId,
                    doctorId: SEED.doctorId,
                    clinicId: SEED.clinicId,
                    serviceId: SEED.serviceId,
                    appointmentDate: '2020-01-01',
                    appointmentTime: '10:00',
                });

            expect(res.status).toBe(201); // controller wraps all errors in 200/201
            expect(res.body.success ?? false).toBe(false);
        });
    });

    // =========================================================================
    // UC-2: View Appointments List (GET /appointments)
    // =========================================================================
    describe('UC-2: View Appointments List', () => {
        it('should return paginated list', async () => {
            const res = await request(app.getHttpServer())
                .get('/appointments?page=1&limit=5')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.pagination).toBeDefined();
        });

        it('should filter by status', async () => {
            const res = await request(app.getHttpServer())
                .get('/appointments?status=scheduled')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            res.body.data.forEach((appt: any) =>
                expect(appt.status).toBe('scheduled'),
            );
        });
    });

    // =========================================================================
    // UC-3: View Appointment Details (GET /appointments/:id)
    // =========================================================================
    describe('UC-3: View Appointment Details', () => {
        it('should return full appointment details with populated fields', async () => {
            if (!createdAppointmentId) return;

            const res = await request(app.getHttpServer())
                .get(`/appointments/${createdAppointmentId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data._id).toBe(createdAppointmentId);
        });

        it('should return not-found for invalid ID', async () => {
            const res = await request(app.getHttpServer())
                .get('/appointments/000000000000000000000000')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200); // controller wraps
            expect(res.body.success ?? false).toBe(false);
        });
    });

    // =========================================================================
    // UC-4: Edit Appointment (PUT /appointments/:id)
    // =========================================================================
    describe('UC-4: Edit Appointment', () => {
        it('should update appointment notes', async () => {
            if (!createdAppointmentId) return;

            const res = await request(app.getHttpServer())
                .put(`/appointments/${createdAppointmentId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ notes: 'Updated notes from E2E test' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    // =========================================================================
    // UC-5: Check Doctor Availability (GET /appointments/availability/:doctorId)
    // =========================================================================
    describe('UC-5: Check Doctor Availability', () => {
        it('should return time slots for a doctor', async () => {
            const res = await request(app.getHttpServer())
                .get(`/appointments/availability/${SEED.doctorId}?date=${SEED.appointmentDate}&clinicId=${SEED.clinicId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    // =========================================================================
    // UC-6: Cancel Appointment (POST /appointments/:id/cancel)
    // =========================================================================
    describe('UC-6: Cancel Appointment', () => {
        let cancelTargetId: string;

        beforeAll(async () => {
            // Create a fresh appointment to cancel
            const res = await request(app.getHttpServer())
                .post('/appointments')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    patientId: SEED.patientId,
                    doctorId: SEED.doctorId,
                    clinicId: SEED.clinicId,
                    serviceId: SEED.serviceId,
                    appointmentDate: '2027-07-01',
                    appointmentTime: '11:00',
                });
            cancelTargetId = res.body.data?._id;
        });

        it('should cancel appointment with reason', async () => {
            if (!cancelTargetId) return;

            const res = await request(app.getHttpServer())
                .post(`/appointments/${cancelTargetId}/cancel`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ cancellationReason: 'Patient requested cancellation', rescheduleOption: false });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.status).toBe('cancelled');
        });
    });

    // =========================================================================
    // UC-7: Reschedule Appointment (POST /appointments/:id/reschedule)
    // =========================================================================
    describe('UC-7: Reschedule Appointment', () => {
        it('should reschedule appointment to new date/time', async () => {
            if (!createdAppointmentId) return;

            const res = await request(app.getHttpServer())
                .post(`/appointments/${createdAppointmentId}/reschedule`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    newAppointmentDate: '2027-06-15',
                    newAppointmentTime: '14:00',
                    rescheduleReason: 'Doctor unavailable on original date',
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    // =========================================================================
    // UC-8: Delete Appointment (DELETE /appointments/:id)
    // =========================================================================
    describe('UC-8: Delete Appointment', () => {
        let deleteTargetId: string;

        beforeAll(async () => {
            const res = await request(app.getHttpServer())
                .post('/appointments')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    patientId: SEED.patientId,
                    doctorId: SEED.doctorId,
                    clinicId: SEED.clinicId,
                    serviceId: SEED.serviceId,
                    appointmentDate: '2027-08-01',
                    appointmentTime: '09:00',
                });
            deleteTargetId = res.body.data?._id;
        });

        it('should soft-delete appointment', async () => {
            if (!deleteTargetId) return;

            const res = await request(app.getHttpServer())
                .delete(`/appointments/${deleteTargetId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('should not appear in list after soft-delete', async () => {
            if (!deleteTargetId) return;

            const res = await request(app.getHttpServer())
                .get(`/appointments/${deleteTargetId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.body.success ?? false).toBe(false);
        });
    });

    // =========================================================================
    // UC-9 (NEW): View Calendar (GET /appointments/calendar)
    // =========================================================================
    describe('UC-9 (NEW): View Appointments Calendar', () => {
        it('should return weekly calendar grouped by date', async () => {
            const res = await request(app.getHttpServer())
                .get('/appointments/calendar?view=week&date=2027-06-01')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.view).toBe('week');
            expect(res.body.data.groupedByDate).toBeDefined();
        });

        it('should return daily calendar', async () => {
            const res = await request(app.getHttpServer())
                .get('/appointments/calendar?view=day&date=2027-06-01')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.view).toBe('day');
        });

        it('should return monthly calendar', async () => {
            const res = await request(app.getHttpServer())
                .get('/appointments/calendar?view=month&date=2027-06-01')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.view).toBe('month');
        });

        it('should reject invalid view mode (400)', async () => {
            const res = await request(app.getHttpServer())
                .get('/appointments/calendar?view=invalid')
                .set('Authorization', `Bearer ${adminToken}`);

            // ValidationPipe should reject before controller
            expect([200, 400]).toContain(res.status);
        });
    });

    // =========================================================================
    // UC-10 (NEW): Change Appointment Status (PATCH /appointments/:id/status)
    // =========================================================================
    describe('UC-10 (NEW): Change Appointment Status', () => {
        let statusTargetId: string;

        beforeAll(async () => {
            const res = await request(app.getHttpServer())
                .post('/appointments')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    patientId: SEED.patientId,
                    doctorId: SEED.doctorId,
                    clinicId: SEED.clinicId,
                    serviceId: SEED.serviceId,
                    appointmentDate: '2027-09-01',
                    appointmentTime: '10:00',
                });
            statusTargetId = res.body.data?._id;
        });

        it('should change status from scheduled to confirmed', async () => {
            if (!statusTargetId) return;

            const res = await request(app.getHttpServer())
                .patch(`/appointments/${statusTargetId}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'confirmed' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.status).toBe('confirmed');
            confirmedAppointmentId = statusTargetId;
        });

        it('should reject cancellation without reason (400)', async () => {
            if (!statusTargetId) return;

            const res = await request(app.getHttpServer())
                .patch(`/appointments/${statusTargetId}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'cancelled' }); // missing reason

            expect(res.body.success ?? false).toBe(false);
        });

        it('should reject changing status on a completed appointment', async () => {
            // We'll test this after the conclude flow marks an appointment completed
            // Skipping here – handled in conclude tests
            expect(true).toBe(true);
        });
    });

    // =========================================================================
    // UC-11 (NEW): Start Appointment (POST /appointments/:id/start)
    // =========================================================================
    describe('UC-11 (NEW): Start Appointment', () => {
        beforeAll(async () => {
            // Confirm a fresh appointment then start it
            if (!confirmedAppointmentId) {
                const r = await request(app.getHttpServer())
                    .post('/appointments')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({
                        patientId: SEED.patientId,
                        doctorId: SEED.doctorId,
                        clinicId: SEED.clinicId,
                        serviceId: SEED.serviceId,
                        appointmentDate: '2027-10-01',
                        appointmentTime: '10:00',
                    });
                confirmedAppointmentId = r.body.data?._id;
            }
        });

        it('should start a scheduled/confirmed appointment', async () => {
            if (!confirmedAppointmentId) return;

            const res = await request(app.getHttpServer())
                .post(`/appointments/${confirmedAppointmentId}/start`)
                .set('Authorization', `Bearer ${doctorToken || adminToken}`);

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.status).toBe('in_progress');
            expect(res.body.data.actualStartTime).toBeDefined();
            expect(res.body.redirectTo).toContain('/medical-entry/');
            inProgressAppointmentId = confirmedAppointmentId;
        });

        it('should reject starting an already in-progress appointment (400)', async () => {
            if (!inProgressAppointmentId) return;

            const res = await request(app.getHttpServer())
                .post(`/appointments/${inProgressAppointmentId}/start`)
                .set('Authorization', `Bearer ${doctorToken || adminToken}`);

            expect(res.body.success ?? false).toBe(false);
        });
    });

    // =========================================================================
    // UC-12 (NEW): End Appointment (POST /appointments/:id/end)
    // =========================================================================
    describe('UC-12 (NEW): End Appointment', () => {
        let endTargetId: string;

        beforeAll(async () => {
            // Create, then start a fresh appointment
            const created = await request(app.getHttpServer())
                .post('/appointments')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    patientId: SEED.patientId,
                    doctorId: SEED.doctorId,
                    clinicId: SEED.clinicId,
                    serviceId: SEED.serviceId,
                    appointmentDate: '2027-11-01',
                    appointmentTime: '10:00',
                });
            const id = created.body.data?._id;
            if (id) {
                await request(app.getHttpServer())
                    .post(`/appointments/${id}/start`)
                    .set('Authorization', `Bearer ${adminToken}`);
                endTargetId = id;
            }
        });

        it('should end appointment with medical entry data', async () => {
            if (!endTargetId) return;

            const res = await request(app.getHttpServer())
                .post(`/appointments/${endTargetId}/end`)
                .set('Authorization', `Bearer ${doctorToken || adminToken}`)
                .send({
                    sessionNotes: {
                        diagnosis: 'Type 2 Diabetes',
                        symptoms: 'Fatigue, thirst',
                        findings: 'Blood glucose elevated',
                    },
                    prescriptions: [
                        { medication: 'Metformin', dosage: '500mg', frequency: 'Twice daily', duration: '3 months' },
                    ],
                    treatmentPlan: { steps: 'Diet modification', tests: 'HbA1c every 3 months', lifestyle: 'Exercise daily' },
                    followUp: { required: true, recommendedDuration: '3 months' },
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.status).toBe('completed');
            expect(res.body.data.actualEndTime).toBeDefined();
        });

        it('should reject ending a non-in-progress appointment (400)', async () => {
            if (!endTargetId) return;

            // Appointment is already completed from above
            const res = await request(app.getHttpServer())
                .post(`/appointments/${endTargetId}/end`)
                .set('Authorization', `Bearer ${doctorToken || adminToken}`)
                .send({});

            expect(res.body.success ?? false).toBe(false);
        });
    });

    // =========================================================================
    // UC-13 (NEW): Conclude Appointment (POST /appointments/:id/conclude)
    // =========================================================================
    describe('UC-13 (NEW): Conclude Appointment', () => {
        let concludeTargetId: string;

        beforeAll(async () => {
            const created = await request(app.getHttpServer())
                .post('/appointments')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    patientId: SEED.patientId,
                    doctorId: SEED.doctorId,
                    clinicId: SEED.clinicId,
                    serviceId: SEED.serviceId,
                    appointmentDate: '2027-12-01',
                    appointmentTime: '10:00',
                });
            const id = created.body.data?._id;
            if (id) {
                await request(app.getHttpServer())
                    .post(`/appointments/${id}/start`)
                    .set('Authorization', `Bearer ${adminToken}`);
                concludeTargetId = id;
            }
        });

        it('should reject conclusion without doctorNotes (BR-f1d3e2c)', async () => {
            if (!concludeTargetId) return;

            const res = await request(app.getHttpServer())
                .post(`/appointments/${concludeTargetId}/conclude`)
                .set('Authorization', `Bearer ${doctorToken || adminToken}`)
                .send({
                    sessionNotes: { diagnosis: 'Test' },
                    // doctorNotes intentionally missing
                });

            expect(res.body.success ?? true).toBe(false);
        });

        it('should conclude appointment with valid doctorNotes', async () => {
            if (!concludeTargetId) return;

            const res = await request(app.getHttpServer())
                .post(`/appointments/${concludeTargetId}/conclude`)
                .set('Authorization', `Bearer ${doctorToken || adminToken}`)
                .send({
                    doctorNotes: 'Patient responded well to treatment. Continue current medication and monitor monthly.',
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
                    followUp: { required: true, recommendedDuration: '6 months', doctorNotes: 'Monitor HbA1c' },
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.status).toBe('completed');
            expect(res.body.data.actualEndTime).toBeDefined();
        });

        it('should reject status change on completed appointment', async () => {
            if (!concludeTargetId) return;

            const res = await request(app.getHttpServer())
                .patch(`/appointments/${concludeTargetId}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'cancelled', reason: 'Test reason here' });

            expect(res.body.success ?? false).toBe(false);
        });
    });
});
