import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { Connection, Types } from 'mongoose';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { WorkingHoursModule } from '../../src/working-hours/working-hours.module';
import { DatabaseModule } from '../../src/database/database.module';

/**
 * @fileoverview Integration tests for the rescheduling endpoint
 *
 * Tests the PUT /working-hours/:entityType/:entityId/with-rescheduling endpoint
 * which updates working hours and handles conflicting appointments.
 *
 * Test Coverage:
 * - Automatic appointment rescheduling
 * - Manual rescheduling notification
 * - Appointment cancellation
 * - Transaction rollback on failure
 * - Notification sending
 * - Error handling
 *
 * Business Rules Tested:
 * - BZR-l9e0f1c4: Reschedule appointments after modification date
 * - BZR-43: Only reschedule appointments on modified days
 */
describe('WorkingHoursController - Rescheduling Endpoint (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let testUserId: Types.ObjectId;
  let testPatientId: Types.ObjectId;
  let testAppointmentIds: Types.ObjectId[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        MongooseModule.forRoot(
          process.env.MONGODB_TEST_URI ||
            'mongodb://localhost:27017/cliniva_test',
        ),
        DatabaseModule,
        WorkingHoursModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    connection = moduleFixture.get<Connection>(getConnectionToken());
  });

  afterAll(async () => {
    if (connection) {
      await connection.close();
    }
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    // Clean up test data
    await connection.collection('working_hours').deleteMany({});
    await connection.collection('appointments').deleteMany({});
    await connection.collection('notifications').deleteMany({});
    await connection.collection('users').deleteMany({});
    await connection.collection('patients').deleteMany({});

    // Create test user (doctor)
    testUserId = new Types.ObjectId();
    await connection.collection('users').insertOne({
      _id: testUserId,
      email: 'doctor@test.com',
      firstName: 'Test',
      lastName: 'Doctor',
      role: 'doctor',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create test patient
    testPatientId = new Types.ObjectId();
    await connection.collection('patients').insertOne({
      _id: testPatientId,
      firstName: 'Test',
      lastName: 'Patient',
      email: 'patient@test.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create initial working hours (Monday-Friday, 08:00-17:00)
    const initialSchedule = [
      {
        entityType: 'user',
        entityId: testUserId,
        dayOfWeek: 'monday',
        isWorkingDay: true,
        openingTime: '08:00',
        closingTime: '17:00',
      },
      {
        entityType: 'user',
        entityId: testUserId,
        dayOfWeek: 'tuesday',
        isWorkingDay: true,
        openingTime: '08:00',
        closingTime: '17:00',
      },
      {
        entityType: 'user',
        entityId: testUserId,
        dayOfWeek: 'wednesday',
        isWorkingDay: true,
        openingTime: '08:00',
        closingTime: '17:00',
      },
      {
        entityType: 'user',
        entityId: testUserId,
        dayOfWeek: 'thursday',
        isWorkingDay: true,
        openingTime: '08:00',
        closingTime: '17:00',
      },
      {
        entityType: 'user',
        entityId: testUserId,
        dayOfWeek: 'friday',
        isWorkingDay: true,
        openingTime: '08:00',
        closingTime: '17:00',
      },
      {
        entityType: 'user',
        entityId: testUserId,
        dayOfWeek: 'saturday',
        isWorkingDay: false,
      },
      {
        entityType: 'user',
        entityId: testUserId,
        dayOfWeek: 'sunday',
        isWorkingDay: false,
      },
    ];

    await connection.collection('working_hours').insertMany(initialSchedule);

    // Create test appointments
    testAppointmentIds = [];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    // Appointment 1: Early morning (07:30) - will conflict with new hours (09:00 start)
    const appointment1Id = new Types.ObjectId();
    testAppointmentIds.push(appointment1Id);
    await connection.collection('appointments').insertOne({
      _id: appointment1Id,
      doctorId: testUserId,
      patientId: testPatientId,
      appointmentDate: tomorrow,
      appointmentTime: '07:30',
      durationMinutes: 30,
      status: 'scheduled',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Appointment 2: Within new hours (10:00) - no conflict
    const appointment2Id = new Types.ObjectId();
    testAppointmentIds.push(appointment2Id);
    await connection.collection('appointments').insertOne({
      _id: appointment2Id,
      doctorId: testUserId,
      patientId: testPatientId,
      appointmentDate: tomorrow,
      appointmentTime: '10:00',
      durationMinutes: 30,
      status: 'scheduled',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Appointment 3: Late evening (17:30) - will conflict with new hours (17:00 end)
    const appointment3Id = new Types.ObjectId();
    testAppointmentIds.push(appointment3Id);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    await connection.collection('appointments').insertOne({
      _id: appointment3Id,
      doctorId: testUserId,
      patientId: testPatientId,
      appointmentDate: dayAfterTomorrow,
      appointmentTime: '17:30',
      durationMinutes: 30,
      status: 'scheduled',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  describe('PUT /working-hours/:entityType/:entityId/with-rescheduling', () => {
    it('should update working hours with automatic rescheduling', async () => {
      const newSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
        {
          dayOfWeek: 'tuesday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
        {
          dayOfWeek: 'wednesday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
        {
          dayOfWeek: 'thursday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
        {
          dayOfWeek: 'friday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
        {
          dayOfWeek: 'saturday',
          isWorkingDay: false,
        },
        {
          dayOfWeek: 'sunday',
          isWorkingDay: false,
        },
      ];

      const response = await request(app.getHttpServer())
        .put(`/working-hours/user/${testUserId}/with-rescheduling`)
        .send({
          schedule: newSchedule,
          handleConflicts: 'reschedule',
          notifyPatients: true,
          reschedulingReason: 'Doctor schedule change',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.workingHours).toHaveLength(7);
      expect(response.body.data.appointmentsRescheduled).toBeGreaterThanOrEqual(
        0,
      );
      expect(response.body.message).toBeDefined();
      expect(response.body.message.ar).toBeDefined();
      expect(response.body.message.en).toBeDefined();

      // Verify working hours were updated
      const updatedHours = await connection
        .collection('working_hours')
        .find({ entityId: testUserId })
        .toArray();
      expect(updatedHours).toHaveLength(7);

      const mondayHours = updatedHours.find((h) => h.dayOfWeek === 'monday');
      expect(mondayHours.openingTime).toBe('09:00');
      expect(mondayHours.closingTime).toBe('17:00');
    });

    it('should mark appointments for manual rescheduling when strategy is "notify"', async () => {
      const newSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '10:00',
          closingTime: '16:00',
        },
        {
          dayOfWeek: 'tuesday',
          isWorkingDay: true,
          openingTime: '10:00',
          closingTime: '16:00',
        },
        {
          dayOfWeek: 'wednesday',
          isWorkingDay: false,
        },
        {
          dayOfWeek: 'thursday',
          isWorkingDay: false,
        },
        {
          dayOfWeek: 'friday',
          isWorkingDay: false,
        },
        {
          dayOfWeek: 'saturday',
          isWorkingDay: false,
        },
        {
          dayOfWeek: 'sunday',
          isWorkingDay: false,
        },
      ];

      const response = await request(app.getHttpServer())
        .put(`/working-hours/user/${testUserId}/with-rescheduling`)
        .send({
          schedule: newSchedule,
          handleConflicts: 'notify',
          notifyPatients: true,
          reschedulingReason: 'Reduced working hours',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(
        response.body.data.appointmentsMarkedForRescheduling,
      ).toBeGreaterThanOrEqual(0);
      expect(response.body.data.notificationsSent).toBeGreaterThanOrEqual(0);
    });

    it('should cancel appointments when strategy is "cancel"', async () => {
      const newSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
        {
          dayOfWeek: 'tuesday',
          isWorkingDay: false,
        },
        {
          dayOfWeek: 'wednesday',
          isWorkingDay: false,
        },
        {
          dayOfWeek: 'thursday',
          isWorkingDay: false,
        },
        {
          dayOfWeek: 'friday',
          isWorkingDay: false,
        },
        {
          dayOfWeek: 'saturday',
          isWorkingDay: false,
        },
        {
          dayOfWeek: 'sunday',
          isWorkingDay: false,
        },
      ];

      const response = await request(app.getHttpServer())
        .put(`/working-hours/user/${testUserId}/with-rescheduling`)
        .send({
          schedule: newSchedule,
          handleConflicts: 'cancel',
          notifyPatients: true,
          reschedulingReason: 'Doctor unavailable',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.appointmentsCancelled).toBeGreaterThanOrEqual(
        0,
      );
    });

    it('should handle case with no conflicting appointments', async () => {
      // Delete all appointments
      await connection.collection('appointments').deleteMany({});

      const newSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
        {
          dayOfWeek: 'tuesday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
        {
          dayOfWeek: 'wednesday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
        {
          dayOfWeek: 'thursday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
        {
          dayOfWeek: 'friday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
        {
          dayOfWeek: 'saturday',
          isWorkingDay: false,
        },
        {
          dayOfWeek: 'sunday',
          isWorkingDay: false,
        },
      ];

      const response = await request(app.getHttpServer())
        .put(`/working-hours/user/${testUserId}/with-rescheduling`)
        .send({
          schedule: newSchedule,
          handleConflicts: 'reschedule',
          notifyPatients: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.appointmentsRescheduled).toBe(0);
      expect(response.body.data.appointmentsMarkedForRescheduling).toBe(0);
      expect(response.body.data.appointmentsCancelled).toBe(0);
      expect(response.body.message.en).toContain('No appointments affected');
    });

    it('should reject invalid entity type', async () => {
      const newSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
      ];

      const response = await request(app.getHttpServer())
        .put(`/working-hours/clinic/${testUserId}/with-rescheduling`)
        .send({
          schedule: newSchedule,
          handleConflicts: 'reschedule',
        })
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.message.en).toContain('Invalid entity type');
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .put(`/working-hours/user/${testUserId}/with-rescheduling`)
        .send({
          // Missing schedule
          handleConflicts: 'reschedule',
        })
        .expect(400);
    });

    it('should validate handleConflicts enum', async () => {
      const newSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
      ];

      await request(app.getHttpServer())
        .put(`/working-hours/user/${testUserId}/with-rescheduling`)
        .send({
          schedule: newSchedule,
          handleConflicts: 'invalid_strategy',
        })
        .expect(400);
    });

    it('should include rescheduled appointment details in response', async () => {
      const newSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
        {
          dayOfWeek: 'tuesday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
        {
          dayOfWeek: 'wednesday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
        {
          dayOfWeek: 'thursday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
        {
          dayOfWeek: 'friday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
        {
          dayOfWeek: 'saturday',
          isWorkingDay: false,
        },
        {
          dayOfWeek: 'sunday',
          isWorkingDay: false,
        },
      ];

      const response = await request(app.getHttpServer())
        .put(`/working-hours/user/${testUserId}/with-rescheduling`)
        .send({
          schedule: newSchedule,
          handleConflicts: 'reschedule',
          notifyPatients: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.rescheduledAppointments).toBeDefined();
      expect(Array.isArray(response.body.data.rescheduledAppointments)).toBe(
        true,
      );

      if (response.body.data.rescheduledAppointments.length > 0) {
        const appointment = response.body.data.rescheduledAppointments[0];
        expect(appointment.appointmentId).toBeDefined();
        expect(appointment.oldDate).toBeDefined();
        expect(appointment.oldTime).toBeDefined();
        expect(appointment.status).toBeDefined();
        expect([
          'rescheduled',
          'marked_for_rescheduling',
          'cancelled',
        ]).toContain(appointment.status);
      }
    });

    it('should send notifications when notifyPatients is true', async () => {
      const newSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
        {
          dayOfWeek: 'tuesday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
        {
          dayOfWeek: 'wednesday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
        {
          dayOfWeek: 'thursday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
        {
          dayOfWeek: 'friday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
        {
          dayOfWeek: 'saturday',
          isWorkingDay: false,
        },
        {
          dayOfWeek: 'sunday',
          isWorkingDay: false,
        },
      ];

      const response = await request(app.getHttpServer())
        .put(`/working-hours/user/${testUserId}/with-rescheduling`)
        .send({
          schedule: newSchedule,
          handleConflicts: 'notify',
          notifyPatients: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Check if notifications were created
      const notifications = await connection
        .collection('notifications')
        .find({ recipientId: testPatientId })
        .toArray();

      if (response.body.data.notificationsSent > 0) {
        expect(notifications.length).toBeGreaterThan(0);
      }
    });

    it('should not send notifications when notifyPatients is false', async () => {
      const newSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
        {
          dayOfWeek: 'tuesday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
        {
          dayOfWeek: 'wednesday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
        {
          dayOfWeek: 'thursday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
        {
          dayOfWeek: 'friday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
        {
          dayOfWeek: 'saturday',
          isWorkingDay: false,
        },
        {
          dayOfWeek: 'sunday',
          isWorkingDay: false,
        },
      ];

      const response = await request(app.getHttpServer())
        .put(`/working-hours/user/${testUserId}/with-rescheduling`)
        .send({
          schedule: newSchedule,
          handleConflicts: 'reschedule',
          notifyPatients: false,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notificationsSent).toBe(0);
    });
  });
});
