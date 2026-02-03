import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import {
  validComplexData,
  listQueryFixtures,
  testEnvironment,
} from '../fixtures/complex.fixtures';
import {
  createTestComplex,
  createMultipleComplexes,
  cleanupTestData,
  assertBilingualMessage,
  assertPaginationMetadata,
  assertComplexStructure,
} from '../utils/test-helpers';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

/**
 * Integration tests for GET /complexes endpoint
 * Requirements: 1.1-1.11
 */
describe('GET /complexes (e2e)', () => {
  let app: INestApplication;
  let complexModel: Model<any>;

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
    complexModel = moduleFixture.get(getModelToken('Complex'));
  });

  afterAll(async () => {
    await cleanupTestData({ complexModel });
    await app.close();
  });

  beforeEach(async () => {
    // Clean up before each test
    await cleanupTestData({ complexModel });
  });

  describe('Basic Pagination', () => {
    it('should return paginated list of complexes', async () => {
      // Arrange: Create test complexes
      await createMultipleComplexes(complexModel, 15);

      // Act
      const response = await request(app.getHttpServer())
        .get('/complexes')
        .query(listQueryFixtures.basicPagination)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(10);
      expect(response.body).toHaveProperty('meta');
      assertPaginationMetadata(response.body.meta);
      expect(response.body.meta.total).toBe(15);
      expect(response.body.meta.totalPages).toBe(2);
      assertBilingualMessage(response.body.message);
    });

    it('should return empty array when no complexes exist', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/complexes')
        .query(listQueryFixtures.basicPagination)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.meta.total).toBe(0);
      expect(response.body.meta.totalPages).toBe(0);
    });

    it('should handle page parameter correctly', async () => {
      // Arrange
      await createMultipleComplexes(complexModel, 25);

      // Act: Request page 2
      const response = await request(app.getHttpServer())
        .get('/complexes')
        .query({ page: 2, limit: 10 })
        .expect(200);

      // Assert
      expect(response.body.meta.page).toBe(2);
      expect(response.body.data.length).toBeLessThanOrEqual(10);
    });

    it('should handle limit parameter correctly', async () => {
      // Arrange
      await createMultipleComplexes(complexModel, 25);

      // Act: Request with limit 5
      const response = await request(app.getHttpServer())
        .get('/complexes')
        .query({ page: 1, limit: 5 })
        .expect(200);

      // Assert
      expect(response.body.meta.limit).toBe(5);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should use default pagination values when not provided', async () => {
      // Arrange
      await createMultipleComplexes(complexModel, 5);

      // Act: No query parameters
      const response = await request(app.getHttpServer())
        .get('/complexes')
        .expect(200);

      // Assert
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(10);
    });
  });

  describe('Filters', () => {
    it('should filter by status', async () => {
      // Arrange: Create complexes with different statuses
      await createTestComplex(complexModel, { ...validComplexData, status: 'active' });
      await createTestComplex(complexModel, {
        ...validComplexData,
        email: 'inactive@test.com',
        status: 'inactive',
      });

      // Act
      const response = await request(app.getHttpServer())
        .get('/complexes')
        .query({ status: 'active' })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].status).toBe('active');
    });

    it('should filter by search term (name)', async () => {
      // Arrange
      await createTestComplex(complexModel, { ...validComplexData, name: 'Cardiology Complex' });
      await createTestComplex(complexModel, {
        ...validComplexData,
        name: 'Neurology Center',
        email: 'neuro@test.com',
      });

      // Act
      const response = await request(app.getHttpServer())
        .get('/complexes')
        .query({ search: 'Cardiology' })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].name).toContain('Cardiology');
    });

    it('should perform case-insensitive search', async () => {
      // Arrange
      await createTestComplex(complexModel, { ...validComplexData, name: 'Medical Complex' });

      // Act
      const response = await request(app.getHttpServer())
        .get('/complexes')
        .query({ search: 'medical' })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
    });

    it('should combine multiple filters', async () => {
      // Arrange
      await createTestComplex(complexModel, {
        ...validComplexData,
        name: 'Active Medical Complex',
        status: 'active',
      });
      await createTestComplex(complexModel, {
        ...validComplexData,
        name: 'Inactive Medical Complex',
        email: 'inactive@test.com',
        status: 'inactive',
      });

      // Act
      const response = await request(app.getHttpServer())
        .get('/complexes')
        .query({ status: 'active', search: 'Medical' })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].status).toBe('active');
      expect(response.body.data[0].name).toContain('Medical');
    });
  });

  describe('Sorting', () => {
    it('should sort by name ascending', async () => {
      // Arrange
      await createTestComplex(complexModel, { ...validComplexData, name: 'Zebra Complex' });
      await createTestComplex(complexModel, {
        ...validComplexData,
        name: 'Alpha Complex',
        email: 'alpha@test.com',
      });

      // Act
      const response = await request(app.getHttpServer())
        .get('/complexes')
        .query({ sortBy: 'name', sortOrder: 'asc' })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data[0].name).toBe('Alpha Complex');
      expect(response.body.data[1].name).toBe('Zebra Complex');
    });

    it('should sort by name descending', async () => {
      // Arrange
      await createTestComplex(complexModel, { ...validComplexData, name: 'Zebra Complex' });
      await createTestComplex(complexModel, {
        ...validComplexData,
        name: 'Alpha Complex',
        email: 'alpha@test.com',
      });

      // Act
      const response = await request(app.getHttpServer())
        .get('/complexes')
        .query({ sortBy: 'name', sortOrder: 'desc' })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data[0].name).toBe('Zebra Complex');
      expect(response.body.data[1].name).toBe('Alpha Complex');
    });

    it('should use default sort (createdAt desc) when not specified', async () => {
      // Arrange: Create complexes with delay to ensure different timestamps
      const first = await createTestComplex(complexModel, {
        ...validComplexData,
        name: 'First Complex',
      });
      await new Promise((resolve) => setTimeout(resolve, 100));
      const second = await createTestComplex(complexModel, {
        ...validComplexData,
        name: 'Second Complex',
        email: 'second@test.com',
      });

      // Act
      const response = await request(app.getHttpServer())
        .get('/complexes')
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      // Most recent should be first (desc order)
      expect(response.body.data[0].name).toBe('Second Complex');
    });
  });

  describe('Include Counts', () => {
    it('should include counts when includeCounts is true', async () => {
      // Arrange
      const complex = await createTestComplex(complexModel, validComplexData);

      // Act
      const response = await request(app.getHttpServer())
        .get('/complexes')
        .query({ includeCounts: true })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('scheduledAppointmentsCount');
      expect(response.body.data[0]).toHaveProperty('clinicsAssignedCount');
      expect(response.body.data[0]).toHaveProperty('capacity');
    });

    it('should not include counts when includeCounts is false', async () => {
      // Arrange
      await createTestComplex(complexModel, validComplexData);

      // Act
      const response = await request(app.getHttpServer())
        .get('/complexes')
        .query({ includeCounts: false })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).not.toHaveProperty('scheduledAppointmentsCount');
      expect(response.body.data[0]).not.toHaveProperty('clinicsAssignedCount');
      expect(response.body.data[0]).not.toHaveProperty('capacity');
    });
  });

  describe('Response Structure', () => {
    it('should return correct response structure', async () => {
      // Arrange
      await createTestComplex(complexModel, validComplexData);

      // Act
      const response = await request(app.getHttpServer())
        .get('/complexes')
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body).toHaveProperty('message');
      assertBilingualMessage(response.body.message);
    });

    it('should return complexes with correct structure', async () => {
      // Arrange
      await createTestComplex(complexModel, validComplexData);

      // Act
      const response = await request(app.getHttpServer())
        .get('/complexes')
        .expect(200);

      // Assert
      expect(response.body.data.length).toBeGreaterThan(0);
      assertComplexStructure(response.body.data[0]);
    });
  });

  describe('Validation', () => {
    it('should reject invalid page number', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/complexes')
        .query({ page: 0 })
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid limit', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/complexes')
        .query({ limit: 0 })
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
    });

    it('should reject limit exceeding maximum', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/complexes')
        .query({ limit: 101 })
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid status value', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/complexes')
        .query({ status: 'invalid-status' })
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid sortOrder value', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/complexes')
        .query({ sortOrder: 'invalid' })
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
    });
  });
});
