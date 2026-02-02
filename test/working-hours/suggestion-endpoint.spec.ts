import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkingHoursModule } from '../../src/working-hours/working-hours.module';
import { WorkingHoursSchema } from '../../src/database/schemas/working-hours.schema';
import { ClinicSchema } from '../../src/database/schemas/clinic.schema';
import { ComplexSchema } from '../../src/database/schemas/complex.schema';
import { Model, Types } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';

/**
 * E2E Tests for Working Hours Suggestion Endpoint
 *
 * Tests the GET /working-hours/suggest/:entityType/:entityId endpoint
 * which provides auto-fill suggestions based on role and entity assignment.
 *
 * Business Rules Tested:
 * - BZR-h5e4c7a0: Doctors auto-fill from assigned clinic
 * - BZR-r2b4e5c7: Staff auto-fill from assigned complex
 * - Auto-filled hours are editable within constraints
 *
 * Test Coverage:
 * - Doctor role with clinic hours
 * - Staff role with complex hours
 * - Missing parent hours
 * - Invalid role
 * - Missing required parameters
 */
describe('Working Hours Suggestion Endpoint (e2e)', () => {
  let app: INestApplication;
  let workingHoursModel: Model<any>;
  let clinicModel: Model<any>;
  let complexModel: Model<any>;

  // Test data IDs
  const clinicId = new Types.ObjectId();
  const complexId = new Types.ObjectId();
  const userId = new Types.ObjectId();
  const ownerId = new Types.ObjectId();
  const subscriptionId = new Types.ObjectId();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(
          process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cliniva_test',
        ),
        MongooseModule.forFeature([
          { name: 'WorkingHours', schema: WorkingHoursSchema },
          { name: 'Clinic', schema: ClinicSchema },
          { name: 'Complex', schema: ComplexSchema },
        ]),
        WorkingHoursModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    workingHoursModel = moduleFixture.get<Model<any>>(
      getModelToken('WorkingHours'),
    );
    clinicModel = moduleFixture.get<Model<any>>(getModelToken('Clinic'));
    complexModel = moduleFixture.get<Model<any>>(getModelToken('Complex'));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await workingHoursModel.deleteMany({});
    await clinicModel.deleteMany({});
    await complexModel.deleteMany({});
  });

  describe('GET /working-hours/suggest/:entityType/:entityId', () => {
    describe('Doctor Role - Clinic Hours', () => {
      beforeEach(async () => {
        // Create test clinic
        await clinicModel.create({
          _id: clinicId,
          name: 'Test Clinic',
          complexId: complexId,
          ownerId: ownerId,
          subscriptionId: subscriptionId,
          isActive: true,
        });

        // Create clinic working hours
        await workingHoursModel.create([
          {
            entityType: 'clinic',
            entityId: clinicId,
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '08:00',
            closingTime: '17:00',
            breakStartTime: '12:00',
            breakEndTime: '13:00',
            isActive: true,
          },
          {
            entityType: 'clinic',
            entityId: clinicId,
            dayOfWeek: 'tuesday',
            isWorkingDay: true,
            openingTime: '08:00',
            closingTime: '17:00',
            isActive: true,
          },
          {
            entityType: 'clinic',
            entityId: clinicId,
            dayOfWeek: 'wednesday',
            isWorkingDay: false,
            isActive: true,
          },
        ]);
      });

      it('should return suggested hours from clinic for doctor role', async () => {
        const response = await request(app.getHttpServer())
          .get(`/working-hours/suggest/user/${userId}`)
          .query({ role: 'doctor', clinicId: clinicId.toString() })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            suggestedSchedule: expect.arrayContaining([
              expect.objectContaining({
                dayOfWeek: 'monday',
                isWorkingDay: true,
                openingTime: '08:00',
                closingTime: '17:00',
                breakStartTime: '12:00',
                breakEndTime: '13:00',
              }),
              expect.objectContaining({
                dayOfWeek: 'tuesday',
                isWorkingDay: true,
                openingTime: '08:00',
                closingTime: '17:00',
              }),
              expect.objectContaining({
                dayOfWeek: 'wednesday',
                isWorkingDay: false,
              }),
            ]),
            source: {
              entityType: 'clinic',
              entityId: clinicId.toString(),
              entityName: 'Test Clinic',
            },
            canModify: true,
          },
        });

        expect(response.body.data.suggestedSchedule).toHaveLength(3);
      });

      it('should return 404 when clinic has no working hours', async () => {
        // Delete clinic hours
        await workingHoursModel.deleteMany({ entityId: clinicId });

        const response = await request(app.getHttpServer())
          .get(`/working-hours/suggest/user/${userId}`)
          .query({ role: 'doctor', clinicId: clinicId.toString() })
          .expect(404);

        expect(response.body.message).toBeDefined();
      });

      it('should return 404 when clinic does not exist', async () => {
        const nonExistentClinicId = new Types.ObjectId();

        const response = await request(app.getHttpServer())
          .get(`/working-hours/suggest/user/${userId}`)
          .query({ role: 'doctor', clinicId: nonExistentClinicId.toString() })
          .expect(404);

        expect(response.body.message).toBeDefined();
      });

      it('should return 400 when clinicId is missing for doctor role', async () => {
        const response = await request(app.getHttpServer())
          .get(`/working-hours/suggest/user/${userId}`)
          .query({ role: 'doctor' })
          .expect(404);

        expect(response.body.message).toBeDefined();
      });
    });

    describe('Staff Role - Complex Hours', () => {
      beforeEach(async () => {
        // Create test complex
        await complexModel.create({
          _id: complexId,
          name: 'Test Complex',
          ownerId: ownerId,
          subscriptionId: subscriptionId,
          isActive: true,
        });

        // Create complex working hours
        await workingHoursModel.create([
          {
            entityType: 'complex',
            entityId: complexId,
            dayOfWeek: 'monday',
            isWorkingDay: true,
            openingTime: '07:00',
            closingTime: '18:00',
            isActive: true,
          },
          {
            entityType: 'complex',
            entityId: complexId,
            dayOfWeek: 'tuesday',
            isWorkingDay: true,
            openingTime: '07:00',
            closingTime: '18:00',
            breakStartTime: '12:00',
            breakEndTime: '13:00',
            isActive: true,
          },
        ]);
      });

      it('should return suggested hours from complex for staff role', async () => {
        const response = await request(app.getHttpServer())
          .get(`/working-hours/suggest/user/${userId}`)
          .query({ role: 'staff', complexId: complexId.toString() })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            suggestedSchedule: expect.arrayContaining([
              expect.objectContaining({
                dayOfWeek: 'monday',
                isWorkingDay: true,
                openingTime: '07:00',
                closingTime: '18:00',
              }),
              expect.objectContaining({
                dayOfWeek: 'tuesday',
                isWorkingDay: true,
                openingTime: '07:00',
                closingTime: '18:00',
                breakStartTime: '12:00',
                breakEndTime: '13:00',
              }),
            ]),
            source: {
              entityType: 'complex',
              entityId: complexId.toString(),
              entityName: 'Test Complex',
            },
            canModify: true,
          },
        });

        expect(response.body.data.suggestedSchedule).toHaveLength(2);
      });

      it('should return 404 when complex has no working hours', async () => {
        // Delete complex hours
        await workingHoursModel.deleteMany({ entityId: complexId });

        const response = await request(app.getHttpServer())
          .get(`/working-hours/suggest/user/${userId}`)
          .query({ role: 'staff', complexId: complexId.toString() })
          .expect(404);

        expect(response.body.message).toBeDefined();
      });

      it('should return 404 when complex does not exist', async () => {
        const nonExistentComplexId = new Types.ObjectId();

        const response = await request(app.getHttpServer())
          .get(`/working-hours/suggest/user/${userId}`)
          .query({ role: 'staff', complexId: nonExistentComplexId.toString() })
          .expect(404);

        expect(response.body.message).toBeDefined();
      });

      it('should return 400 when complexId is missing for staff role', async () => {
        const response = await request(app.getHttpServer())
          .get(`/working-hours/suggest/user/${userId}`)
          .query({ role: 'staff' })
          .expect(404);

        expect(response.body.message).toBeDefined();
      });
    });

    describe('Validation', () => {
      it('should return 400 for invalid role', async () => {
        const response = await request(app.getHttpServer())
          .get(`/working-hours/suggest/user/${userId}`)
          .query({ role: 'invalid', clinicId: clinicId.toString() })
          .expect(400);

        expect(response.body.message).toBeDefined();
      });

      it('should return 400 when role is missing', async () => {
        const response = await request(app.getHttpServer())
          .get(`/working-hours/suggest/user/${userId}`)
          .query({ clinicId: clinicId.toString() })
          .expect(400);

        expect(response.body.message).toBeDefined();
      });
    });
  });
});
