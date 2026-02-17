import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { PatientService } from '../../src/patient/patient.service';
import { AuditService } from '../../src/auth/audit.service';
import { Model, Connection } from 'mongoose';
import { Patient } from '../../src/database/schemas/patient.schema';
import { Appointment } from '../../src/database/schemas/appointment.schema';

describe('PatientService - List and Search Operations', () => {
  let service: PatientService;
  let patientModel: Model<Patient>;

  const mockPatientModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  };

  const mockAppointmentModel = {
    updateMany: jest.fn(),
  };

  const mockConnection = {
    startSession: jest.fn(),
  };

  const mockAuditService = {
    logSecurityEvent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientService,
        {
          provide: getModelToken('Patient'),
          useValue: mockPatientModel,
        },
        {
          provide: getModelToken('Appointment'),
          useValue: mockAppointmentModel,
        },
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<PatientService>(PatientService);
    patientModel = module.get<Model<Patient>>(getModelToken('Patient'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPatients - Soft Delete Exclusion (Requirement 2.5)', () => {
    it('should exclude soft-deleted patients from list', async () => {
      const mockPatients = [
        { _id: '1', firstName: 'John', lastName: 'Doe', deletedAt: undefined },
        { _id: '2', firstName: 'Jane', lastName: 'Smith', deletedAt: undefined },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPatients),
      };

      mockPatientModel.find.mockReturnValue(mockQuery);
      mockPatientModel.countDocuments.mockResolvedValue(2);

      await service.getPatients({ page: '1', limit: '10' });

      // Verify deletedAt filter is applied
      expect(mockPatientModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          deletedAt: { $exists: false },
        }),
      );
    });
  });

  describe('getPatients - Pagination (Requirement 2.1)', () => {
    it('should paginate results correctly', async () => {
      const mockPatients = [{ _id: '1', firstName: 'John' }];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPatients),
      };

      mockPatientModel.find.mockReturnValue(mockQuery);
      mockPatientModel.countDocuments.mockResolvedValue(100);

      const result = await service.getPatients({ page: '2', limit: '10' });

      expect(mockQuery.skip).toHaveBeenCalledWith(10); // (page 2 - 1) * 10
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(10);
    });

    it('should limit page size to maximum 50 (Requirement 9.5)', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      mockPatientModel.find.mockReturnValue(mockQuery);
      mockPatientModel.countDocuments.mockResolvedValue(0);

      await service.getPatients({ page: '1', limit: '100' });

      // Should limit to 50, not 100
      expect(mockQuery.limit).toHaveBeenCalledWith(50);
    });
  });

  describe('getPatients - Sorting (Requirement 2.4)', () => {
    it('should sort by specified field and order', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      mockPatientModel.find.mockReturnValue(mockQuery);
      mockPatientModel.countDocuments.mockResolvedValue(0);

      await service.getPatients({
        page: '1',
        limit: '10',
        sortBy: 'firstName',
        sortOrder: 'asc',
      });

      expect(mockQuery.sort).toHaveBeenCalledWith({ firstName: 1 });
    });

    it('should sort descending when sortOrder is desc', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      mockPatientModel.find.mockReturnValue(mockQuery);
      mockPatientModel.countDocuments.mockResolvedValue(0);

      await service.getPatients({
        page: '1',
        limit: '10',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });
  });

  describe('getPatients - Multi-Field Search (Requirement 9.1, 9.4)', () => {
    it('should search across multiple fields', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      mockPatientModel.find.mockReturnValue(mockQuery);
      mockPatientModel.countDocuments.mockResolvedValue(0);

      await service.getPatients({ search: 'john', page: '1', limit: '10' });

      expect(mockPatientModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.arrayContaining([
            { firstName: { $regex: 'john', $options: 'i' } },
            { lastName: { $regex: 'john', $options: 'i' } },
            { phone: { $regex: 'john', $options: 'i' } },
            { email: { $regex: 'john', $options: 'i' } },
            { patientNumber: { $regex: 'john', $options: 'i' } },
            { cardNumber: { $regex: 'john', $options: 'i' } },
          ]),
        }),
      );
    });

    it('should perform case-insensitive search', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      mockPatientModel.find.mockReturnValue(mockQuery);
      mockPatientModel.countDocuments.mockResolvedValue(0);

      await service.getPatients({ search: 'JOHN', page: '1', limit: '10' });

      expect(mockPatientModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.arrayContaining([
            { firstName: { $regex: 'JOHN', $options: 'i' } },
          ]),
        }),
      );
    });
  });

  describe('getPatients - Filter Conjunction (Requirement 9.2)', () => {
    it('should apply AND logic for multiple filters', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      mockPatientModel.find.mockReturnValue(mockQuery);
      mockPatientModel.countDocuments.mockResolvedValue(0);

      await service.getPatients({
        firstName: 'John',
        gender: 'male',
        status: 'Active',
        page: '1',
        limit: '10',
      });

      // All filters should be in the same filter object (AND logic)
      expect(mockPatientModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          deletedAt: { $exists: false },
          firstName: { $regex: 'John', $options: 'i' },
          gender: 'male',
          status: 'Active',
        }),
      );
    });
  });

  describe('searchPatients - Empty Search (Requirement 9.3)', () => {
    it('should return empty array for empty search term', async () => {
      const result = await service.searchPatients('');

      expect(result).toEqual([]);
      expect(mockPatientModel.find).not.toHaveBeenCalled();
    });

    it('should return empty array for whitespace-only search term', async () => {
      const result = await service.searchPatients('   ');

      expect(result).toEqual([]);
      expect(mockPatientModel.find).not.toHaveBeenCalled();
    });
  });

  describe('searchPatients - Result Limiting (Requirement 9.5)', () => {
    it('should limit search results to maximum 50', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      mockPatientModel.find.mockReturnValue(mockQuery);

      await service.searchPatients('john', 100);

      // Should limit to 50 even if requested limit is 100
      expect(mockQuery.limit).toHaveBeenCalledWith(50);
    });

    it('should respect limit if less than 50', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      mockPatientModel.find.mockReturnValue(mockQuery);

      await service.searchPatients('john', 20);

      expect(mockQuery.limit).toHaveBeenCalledWith(20);
    });
  });
});
