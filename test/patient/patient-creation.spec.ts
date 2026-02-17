import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { PatientService } from '../../src/patient/patient.service';
import { AuditService } from '../../src/auth/audit.service';
import { ERROR_MESSAGES } from '../../src/common/utils/error-messages.constant';

describe('PatientService - Patient Creation (Task 7)', () => {
  let service: PatientService;
  let patientModel: any;

  const mockPatientModel: any = jest.fn().mockImplementation((data) => ({
    ...data,
    save: jest.fn().mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      ...data,
    }),
  }));

  mockPatientModel.findOne = jest.fn();
  mockPatientModel.find = jest.fn();
  mockPatientModel.countDocuments = jest.fn();
  mockPatientModel.create = jest.fn();
  mockPatientModel.findByIdAndUpdate = jest.fn();
  mockPatientModel.findOneAndUpdate = jest.fn();
  mockPatientModel.updateMany = jest.fn();
  mockPatientModel.aggregate = jest.fn();

  const mockAppointmentModel = {
    updateMany: jest.fn(),
  };

  const mockAuditService = {
    logSecurityEvent: jest.fn(),
  };

  const mockConnection = {
    startSession: jest.fn().mockReturnValue({
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    }),
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
          provide: 'DatabaseConnection',
          useValue: mockConnection,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<PatientService>(PatientService);
    patientModel = module.get(getModelToken('Patient'));

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('Task 7.1: CardNumber uniqueness validation', () => {
    it('should create patient with unique cardNumber', async () => {
      const createDto = {
        firstName: 'John',
        lastName: 'Doe',
        cardNumber: 'CARD12345',
        dateOfBirth: '1990-01-01',
        gender: 'male',
      };

      // Mock: No existing patient with this cardNumber
      mockPatientModel.findOne.mockResolvedValue(null);

      const result = await service.createPatient(createDto as any);

      expect(result).toBeDefined();
      expect(result._id).toBe('507f1f77bcf86cd799439011');
      expect(mockPatientModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          cardNumber: 'CARD12345',
          deletedAt: { $exists: false },
        }),
      );
    });

    it('should reject duplicate cardNumber with bilingual error message', async () => {
      const createDto = {
        firstName: 'John',
        lastName: 'Doe',
        cardNumber: 'CARD12345',
        dateOfBirth: '1990-01-01',
        gender: 'male',
      };

      // Mock: Existing patient with same cardNumber
      mockPatientModel.findOne.mockResolvedValue({
        _id: '507f1f77bcf86cd799439012',
        cardNumber: 'CARD12345',
        firstName: 'Jane',
        lastName: 'Smith',
      });

      await expect(service.createPatient(createDto as any)).rejects.toThrow(
        ConflictException,
      );

      await expect(service.createPatient(createDto as any)).rejects.toThrow(
        expect.objectContaining({
          response: ERROR_MESSAGES.PATIENT_ALREADY_EXISTS_CARD,
        }),
      );
    });

    it('should verify bilingual error message structure for duplicate cardNumber', async () => {
      const createDto = {
        firstName: 'John',
        lastName: 'Doe',
        cardNumber: 'CARD12345',
        dateOfBirth: '1990-01-01',
        gender: 'male',
      };

      // Mock: Existing patient with same cardNumber
      mockPatientModel.findOne.mockResolvedValue({
        _id: '507f1f77bcf86cd799439012',
        cardNumber: 'CARD12345',
      });

      try {
        await service.createPatient(createDto as any);
        fail('Should have thrown ConflictException');
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        expect(error.response).toHaveProperty('ar');
        expect(error.response).toHaveProperty('en');
        expect(error.response.ar).toBe('يوجد مريض مسجل برقم البطاقة هذا بالفعل');
        expect(error.response.en).toBe('A patient with this card number already exists');
      }
    });

    it('should allow same cardNumber for soft-deleted patient', async () => {
      const createDto = {
        firstName: 'John',
        lastName: 'Doe',
        cardNumber: 'CARD12345',
        dateOfBirth: '1990-01-01',
        gender: 'male',
      };

      // Mock: Existing soft-deleted patient with same cardNumber
      // The query should exclude soft-deleted patients (deletedAt: { $exists: false })
      mockPatientModel.findOne.mockResolvedValue(null);

      const result = await service.createPatient(createDto as any);

      expect(result).toBeDefined();
      expect(mockPatientModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          cardNumber: 'CARD12345',
          deletedAt: { $exists: false },
        }),
      );
    });

    it('should check cardNumber uniqueness before other validations', async () => {
      const createDto = {
        firstName: 'John',
        lastName: 'Doe',
        cardNumber: 'CARD12345',
        dateOfBirth: '1990-01-01',
        gender: 'male',
        email: 'duplicate@example.com',
      };

      // Mock: Existing patient with same cardNumber
      mockPatientModel.findOne
        .mockResolvedValueOnce({
          _id: '507f1f77bcf86cd799439012',
          cardNumber: 'CARD12345',
        })
        .mockResolvedValueOnce(null); // For email check

      await expect(service.createPatient(createDto as any)).rejects.toThrow(
        ConflictException,
      );

      // Should fail on cardNumber check before reaching email check
      expect(mockPatientModel.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('Task 7.2: PatientNumber generation', () => {
    it('should generate patientNumber in format PAT{YEAR}{SEQUENCE}', async () => {
      const createDto = {
        firstName: 'John',
        lastName: 'Doe',
        cardNumber: 'CARD12345',
        dateOfBirth: '1990-01-01',
        gender: 'male',
      };

      const currentYear = new Date().getFullYear();

      // Mock: No existing patients for current year
      mockPatientModel.findOne.mockResolvedValue(null);

      const result = await service.createPatient(createDto as any);

      expect(result).toBeDefined();
      expect(result.patientNumber).toMatch(/^PAT\d{4}\d{3}$/);
      expect(result.patientNumber).toContain(`PAT${currentYear}`);
    });

    it('should generate sequential patientNumber starting from 001', async () => {
      const createDto = {
        firstName: 'John',
        lastName: 'Doe',
        cardNumber: 'CARD12345',
        dateOfBirth: '1990-01-01',
        gender: 'male',
      };

      const currentYear = new Date().getFullYear();

      // Mock: No existing patients for current year
      mockPatientModel.findOne.mockResolvedValue(null);

      const result = await service.createPatient(createDto as any);

      expect(result.patientNumber).toBe(`PAT${currentYear}001`);
    });

    it('should increment patientNumber based on last patient', async () => {
      const createDto = {
        firstName: 'John',
        lastName: 'Doe',
        cardNumber: 'CARD12345',
        dateOfBirth: '1990-01-01',
        gender: 'male',
      };

      const currentYear = new Date().getFullYear();

      // Mock: cardNumber uniqueness check (first), then last patient number query
      mockPatientModel.findOne
        .mockResolvedValueOnce(null) // For cardNumber uniqueness check
        .mockResolvedValueOnce({
          patientNumber: `PAT${currentYear}005`,
        }); // For last patient number

      const result = await service.createPatient(createDto as any);

      expect(result.patientNumber).toBe(`PAT${currentYear}006`);
    });

    it('should pad sequence number with leading zeros', async () => {
      const createDto = {
        firstName: 'John',
        lastName: 'Doe',
        cardNumber: 'CARD12345',
        dateOfBirth: '1990-01-01',
        gender: 'male',
      };

      const currentYear = new Date().getFullYear();

      // Mock: cardNumber uniqueness check (first), then last patient number query
      mockPatientModel.findOne
        .mockResolvedValueOnce(null) // For cardNumber uniqueness check
        .mockResolvedValueOnce({
          patientNumber: `PAT${currentYear}099`,
        }); // For last patient number

      const result = await service.createPatient(createDto as any);

      expect(result.patientNumber).toBe(`PAT${currentYear}100`);
    });

    it('should handle year rollover correctly', async () => {
      const createDto = {
        firstName: 'John',
        lastName: 'Doe',
        cardNumber: 'CARD12345',
        dateOfBirth: '1990-01-01',
        gender: 'male',
      };

      const currentYear = new Date().getFullYear();

      // Mock: cardNumber uniqueness check (first), then no patient for current year
      mockPatientModel.findOne
        .mockResolvedValueOnce(null) // For cardNumber uniqueness check
        .mockResolvedValueOnce(null); // No patient for current year

      const result = await service.createPatient(createDto as any);

      // Should start from 001 for new year
      expect(result.patientNumber).toBe(`PAT${currentYear}001`);
    });

    it('should query for last patient number with correct regex', async () => {
      const createDto = {
        firstName: 'John',
        lastName: 'Doe',
        cardNumber: 'CARD12345',
        dateOfBirth: '1990-01-01',
        gender: 'male',
      };

      const currentYear = new Date().getFullYear();

      mockPatientModel.findOne.mockResolvedValue(null);

      await service.createPatient(createDto as any);

      // Verify the query for last patient number
      expect(mockPatientModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          patientNumber: { $regex: `^PAT${currentYear}` },
        }),
        {},
        { sort: { patientNumber: -1 } },
      );
    });
  });

  describe('Integration: CardNumber uniqueness and PatientNumber generation', () => {
    it('should create patient with unique cardNumber and auto-generated patientNumber', async () => {
      const createDto = {
        firstName: 'John',
        lastName: 'Doe',
        cardNumber: 'CARD12345',
        dateOfBirth: '1990-01-01',
        gender: 'male',
      };

      const currentYear = new Date().getFullYear();

      // Mock: cardNumber uniqueness check (first), then last patient number query
      mockPatientModel.findOne
        .mockResolvedValueOnce(null) // For cardNumber uniqueness check
        .mockResolvedValueOnce({
          patientNumber: `PAT${currentYear}010`,
        }); // For last patient number

      const result = await service.createPatient(createDto as any);

      expect(result).toBeDefined();
      expect(result.patientNumber).toBe(`PAT${currentYear}011`);
      expect(result.status).toBe('Active');
    });

    it('should set patient status to Active by default', async () => {
      const createDto = {
        firstName: 'John',
        lastName: 'Doe',
        cardNumber: 'CARD12345',
        dateOfBirth: '1990-01-01',
        gender: 'male',
      };

      mockPatientModel.findOne.mockResolvedValue(null);

      const result = await service.createPatient(createDto as any);

      expect(result.status).toBe('Active');
    });

    it('should log audit event on successful patient creation', async () => {
      const createDto = {
        firstName: 'John',
        lastName: 'Doe',
        cardNumber: 'CARD12345',
        dateOfBirth: '1990-01-01',
        gender: 'male',
      };

      const createdByUserId = '507f1f77bcf86cd799439099';

      mockPatientModel.findOne.mockResolvedValue(null);

      await service.createPatient(createDto as any, createdByUserId);

      expect(mockAuditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PATIENT_CREATED',
          userId: createdByUserId,
          actorId: createdByUserId,
          metadata: expect.objectContaining({
            patientId: expect.any(String),
            patientNumber: expect.stringMatching(/^PAT\d{4}\d{3}$/),
          }),
        }),
      );
    });
  });
});
