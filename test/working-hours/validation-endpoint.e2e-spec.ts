import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkingHoursModule } from '../../src/working-hours/working-hours.module';
import { CommonModule } from '../../src/common/common.module';

/**
 * E2E tests for the working hours validation endpoint
 * Tests the POST /working-hours/validate endpoint
 */
describe('WorkingHoursController /validate (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(
          process.env.MONGODB_TEST_URI || 'mongodb://localhost/cliniva_test',
        ),
        WorkingHoursModule,
        CommonModule,
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
    await app.close();
  });

  describe('POST /working-hours/validate', () => {
    it('should accept valid validation request', () => {
      return request(app.getHttpServer())
        .post('/working-hours/validate')
        .send({
          entityType: 'user',
          entityId: '507f1f77bcf86cd799439011',
          parentEntityType: 'clinic',
          parentEntityId: '507f1f77bcf86cd799439012',
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
          expect(res.body).toHaveProperty('success');
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('isValid');
          expect(res.body.data).toHaveProperty('errors');
        });
    });

    it('should reject invalid entity type', () => {
      return request(app.getHttpServer())
        .post('/working-hours/validate')
        .send({
          entityType: 'invalid',
          entityId: '507f1f77bcf86cd799439011',
          parentEntityType: 'clinic',
          parentEntityId: '507f1f77bcf86cd799439012',
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

    it('should reject missing required fields', () => {
      return request(app.getHttpServer())
        .post('/working-hours/validate')
        .send({
          entityType: 'user',
          // Missing entityId
          parentEntityType: 'clinic',
          parentEntityId: '507f1f77bcf86cd799439012',
          schedule: [],
        })
        .expect(400);
    });

    it('should reject invalid parent entity type', () => {
      return request(app.getHttpServer())
        .post('/working-hours/validate')
        .send({
          entityType: 'user',
          entityId: '507f1f77bcf86cd799439011',
          parentEntityType: 'invalid',
          parentEntityId: '507f1f77bcf86cd799439012',
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

    it('should validate schedule format', () => {
      return request(app.getHttpServer())
        .post('/working-hours/validate')
        .send({
          entityType: 'user',
          entityId: '507f1f77bcf86cd799439011',
          parentEntityType: 'clinic',
          parentEntityId: '507f1f77bcf86cd799439012',
          schedule: [
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
          ],
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.isValid).toBeDefined();
        });
    });
  });
});
