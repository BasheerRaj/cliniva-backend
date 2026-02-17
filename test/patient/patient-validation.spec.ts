import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { PatientService } from '../../src/patient/patient.service';
import { AuditService } from '../../src/auth/audit.service';
import { ERROR_MESSAGES } from '../../src/common/utils/error-messages.constant';

describe('PatientService - Validation Logic (Task 2)', () => {
  let service: PatientService;
  let patientModel: any;

  const mockPatientModel: any = jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      patientNumber: 'PAT2024001',
      status: 'Active',
    }),
  }));

  mockPatientModel.findOne = jest.fn();
  mockPatientModel.find = jest.fn();
  mockPatientModel.countDocuments = jest.fn();
  mockPatientModel.create = jest.fn();
  mockPatientModel.findByIdAndUpdate = jest.fn();
  mockPatientModel.findOneAndUpdate = jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      status: 'Active',
    }),
  });
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

  describe('Task 2.1: CardNumber validation in update operations', () => {
    it('should reject update when cardNumber is included in UpdatePatientDto', async () => {
      const patientId = '507f1f77bcf86cd799439011';
      const updateDto = {
        firstName: 'John',
        cardNumber: '12345', // This should be rejected
      };

      await expect(
        service.updatePatient(patientId, updateDto as any),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.updatePatient(patientId, updateDto as any),
      ).rejects.toThrow(
        expect.objectContaining({
          response: ERROR_MESSAGES.CARD_NUMBER_NOT_EDITABLE,
        }),
      );
    });

    it('should allow update when cardNumber is not included', async () => {
      const patientId = '507f1f77bcf86cd799439011';
      const updateDto = {
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockPatient = {
        _id: patientId,
        firstName: 'John',
        lastName: 'Doe',
        cardNumber: '12345',
        status: 'Active',
      };

      mockPatientModel.findOne.mockResolvedValue(null); // No duplicates
      mockPatientModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPatient),
      });

      const result = await service.updatePatient(patientId, updateDto as any);

      expect(result).toBeDefined();
      expect(result.firstName).toBe('John');
    });
  });

  describe('Task 2.2: Date of Birth validation', () => {
    it('should reject future date of birth', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const createDto = {
        firstName: 'John',
        lastName: 'Doe',
        cardNumber: '12345',
        dateOfBirth: futureDate.toISOString(),
        gender: 'male',
      };

      mockPatientModel.findOne.mockResolvedValue(null); // No duplicates

      await expect(service.createPatient(createDto as any)).rejects.toThrow(
        BadRequestException,
      );

      await expect(service.createPatient(createDto as any)).rejects.toThrow(
        expect.objectContaining({
          response: ERROR_MESSAGES.DATE_OF_BIRTH_FUTURE,
        }),
      );
    });

    it('should reject date of birth indicating age > 150 years', async () => {
      const veryOldDate = new Date();
      veryOldDate.setFullYear(veryOldDate.getFullYear() - 151);

      const createDto = {
        firstName: 'John',
        lastName: 'Doe',
        cardNumber: '12345',
        dateOfBirth: veryOldDate.toISOString(),
        gender: 'male',
      };

      mockPatientModel.findOne.mockResolvedValue(null); // No duplicates

      await expect(service.createPatient(createDto as any)).rejects.toThrow(
        BadRequestException,
      );

      await expect(service.createPatient(createDto as any)).rejects.toThrow(
        expect.objectContaining({
          response: ERROR_MESSAGES.DATE_OF_BIRTH_TOO_OLD,
        }),
      );
    });

    it('should accept valid date of birth', async () => {
      const validDate = new Date();
      validDate.setFullYear(validDate.getFullYear() - 30);

      const createDto = {
        firstName: 'John',
        lastName: 'Doe',
        cardNumber: '12345',
        dateOfBirth: validDate.toISOString(),
        gender: 'male',
      };

      mockPatientModel.findOne.mockResolvedValue(null); // No duplicates

      const result = await service.createPatient(createDto as any);

      expect(result).toBeDefined();
      expect(result.patientNumber).toBe('PAT2024001');
    });
  });

  describe('Task 2.3: Emergency contact validation', () => {
    it('should reject when emergency contact name is provided without phone', async () => {
      const createDto = {
        firstName: 'John',
        lastName: 'Doe',
        cardNumber: '12345',
        dateOfBirth: '1990-01-01',
        gender: 'male',
        emergencyContactName: 'Jane Doe',
        // emergencyContactPhone is missing
      };

      mockPatientModel.findOne.mockResolvedValue(null); // No duplicates

      await expect(service.createPatient(createDto as any)).rejects.toThrow(
        BadRequestException,
      );

      await expect(service.createPatient(createDto as any)).rejects.toThrow(
        expect.objectContaining({
          response: ERROR_MESSAGES.EMERGENCY_CONTACT_PHONE_REQUIRED,
        }),
      );
    });

    it('should reject when emergency contact phone is provided without name', async () => {
      const createDto = {
        firstName: 'John',
        lastName: 'Doe',
        cardNumber: '12345',
        dateOfBirth: '1990-01-01',
        gender: 'male',
        emergencyContactPhone: '+1234567890',
        // emergencyContactName is missing
      };

      mockPatientModel.findOne.mockResolvedValue(null); // No duplicates

      await expect(service.createPatient(createDto as any)).rejects.toThrow(
        BadRequestException,
      );

      await expect(service.createPatient(createDto as any)).rejects.toThrow(
        expect.objectContaining({
          response: ERROR_MESSAGES.EMERGENCY_CONTACT_NAME_REQUIRED,
        }),
      );
    });

    it('should accept when both emergency contact name and phone are provided', async () => {
      const createDto = {
        firstName: 'John',
        lastName: 'Doe',
        cardNumber: '12345',
        dateOfBirth: '1990-01-01',
        gender: 'male',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+1234567890',
      };

      mockPatientModel.findOne.mockResolvedValue(null); // No duplicates

      const result = await service.createPatient(createDto as any);

      expect(result).toBeDefined();
      expect(result.patientNumber).toBe('PAT2024001');
    });

    it('should accept when neither emergency contact name nor phone are provided', async () => {
      const createDto = {
        firstName: 'John',
        lastName: 'Doe',
        cardNumber: '12345',
        dateOfBirth: '1990-01-01',
        gender: 'male',
        // No emergency contact fields
      };

      mockPatientModel.findOne.mockResolvedValue(null); // No duplicates

      const result = await service.createPatient(createDto as any);

      expect(result).toBeDefined();
      expect(result.patientNumber).toBe('PAT2024001');
    });
  });
});
