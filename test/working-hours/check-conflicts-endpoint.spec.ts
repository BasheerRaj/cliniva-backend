import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { WorkingHoursModule } from '../../src/working-hours/working-hours.module';
const request = require('supertest');

/**
 * Integration tests for POST /working-hours/check-conflicts endpoint
 *
 * Tests the conflict detection endpoint that identifies appointments
 * that would fall outside new working hours when updating a doctor's schedule.
 *
 * Business Rules Tested:
 * - BZR-l9e0f1c4: Detect appointments outside new working hours
 * - BZR-43: Identify appointments requiring rescheduling
 */
describe('WorkingHoursController - Check Conflicts (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        MongooseModule.forRoot(
          process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cliniva_test',
        ),
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
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /working-hours/check-conflicts', () => {
    it('should return 200 with valid request', () => {
      return request(app.getHttpServer())
        .post('/working-hours/check-conflicts')
        .send({
          userId: '507f1f77bcf86cd799439011',
          schedule: [
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
              isWorkingDay: false,
            },
            {
              dayOfWeek: 'thursday',
              isWorkingDay: true,
              openingTime: '10:00',
              closingTime: '18:00',
            },
            {
              dayOfWeek: 'friday',
              isWorkingDay: false,
            },
            {
              dayOfWeek: 'saturday',
              isWorkingDay: true,
              openingTime: '08:00',
              closingTime: '14:00',
            },
            {
              dayOfWeek: 'sunday',
              isWorkingDay: false,
            },
          ],
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success');
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('hasConflicts');
          expect(res.body.data).toHaveProperty('conflicts');
          expect(res.body.data).toHaveProperty('affectedAppointments');
          expect(res.body.data).toHaveProperty('requiresRescheduling');
          expect(Array.isArray(res.body.data.conflicts)).toBe(true);
        });
    });

    it('should return 400 with missing userId', () => {
      return request(app.getHttpServer())
        .post('/working-hours/check-conflicts')
        .send({
          schedule: [
            {
              dayOfWeek: 'monday',
              isWorkingDay: true,
              openingTime: '09:00',
              closingTime: '17:00',
            },
          ],
        })
        .expect(400);
    });

    it('should return 400 with invalid userId format', () => {
      return request(app.getHttpServer())
        .post('/working-hours/check-conflicts')
        .send({
          userId: 'invalid-id',
          schedule: [
            {
              dayOfWeek: 'monday',
              isWorkingDay: true,
              openingTime: '09:00',
              closingTime: '17:00',
            },
          ],
        })
        .expect(400);
    });

    it('should return 400 with missing schedule', () => {
      return request(app.getHttpServer())
        .post('/working-hours/check-conflicts')
        .send({
          userId: '507f1f77bcf86cd799439011',
        })
        .expect(400);
    });

    it('should return 400 with empty schedule array', () => {
      return request(app.getHttpServer())
        .post('/working-hours/check-conflicts')
        .send({
          userId: '507f1f77bcf86cd799439011',
          schedule: [],
        })
        .expect(400);
    });

    it('should handle schedule with non-working days', () => {
      return request(app.getHttpServer())
        .post('/working-hours/check-conflicts')
        .send({
          userId: '507f1f77bcf86cd799439011',
          schedule: [
            {
              dayOfWeek: 'monday',
              isWorkingDay: false,
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
          ],
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('hasConflicts');
          expect(res.body.data).toHaveProperty('conflicts');
          expect(Array.isArray(res.body.data.conflicts)).toBe(true);
        });
    });

    it('should include bilingual message in response', () => {
      return request(app.getHttpServer())
        .post('/working-hours/check-conflicts')
        .send({
          userId: '507f1f77bcf86cd799439011',
          schedule: [
            {
              dayOfWeek: 'monday',
              isWorkingDay: true,
              openingTime: '09:00',
              closingTime: '17:00',
            },
          ],
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toHaveProperty('ar');
          expect(res.body.message).toHaveProperty('en');
          expect(typeof res.body.message.ar).toBe('string');
          expect(typeof res.body.message.en).toBe('string');
        });
    });

    it('should validate conflict details structure when conflicts exist', () => {
      // This test will pass even if no conflicts exist, but validates structure
      return request(app.getHttpServer())
        .post('/working-hours/check-conflicts')
        .send({
          userId: '507f1f77bcf86cd799439011',
          schedule: [
            {
              dayOfWeek: 'monday',
              isWorkingDay: true,
              openingTime: '09:00',
              closingTime: '17:00',
            },
          ],
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.conflicts).toBeDefined();
          expect(Array.isArray(res.body.data.conflicts)).toBe(true);

          // If conflicts exist, validate their structure
          if (res.body.data.conflicts.length > 0) {
            const conflict = res.body.data.conflicts[0];
            expect(conflict).toHaveProperty('appointmentId');
            expect(conflict).toHaveProperty('patientName');
            expect(conflict).toHaveProperty('appointmentDate');
            expect(conflict).toHaveProperty('appointmentTime');
            expect(conflict).toHaveProperty('conflictReason');
            expect(conflict.conflictReason).toHaveProperty('ar');
            expect(conflict.conflictReason).toHaveProperty('en');
          }
        });
    });
  });
});
