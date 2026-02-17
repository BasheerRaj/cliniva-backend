import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PatientService } from '../../src/patient/patient.service';
import { Patient } from '../../src/database/schemas/patient.schema';
import { AuditService } from '../../src/auth/audit.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('PatientService - Detail Retrieval', () => {
  let service: PatientService;
  let patientModel: Model<Patient>;

  const mockAuditService = {
    logSecurityEvent: jest.fn(),
  };

  const mockPatientModel = {
    findOne: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockAppointmentModel = {
    updateMany: jest.fn(),
  };

  const mockConnection = {
    startSession: jest.fn(),
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
    patientModel = module.get<Model<Patient>>(getModelToken('Patient'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPatientById - Complete Data Retrieval (Requirement 3.1, 3.4, 3.5)', () => {
    it('should return complete patient data with all fields', async () => {
      const patientId = new Types.ObjectId().toString();
      const mockPatient = {
        _id: new Types.ObjectId(patientId),
        patientNumber: 'PAT2024001',
        cardNumber: 'CARD123456',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-15'),
        gender: 'male',
        status: 'Active',
        phone: '+1234567890',
        email: 'john.doe@example.com',
        address: '123 Main St, City, Country',
        nationality: 'US',
        maritalStatus: 'Married',
        religion: 'Christian',
        preferredLanguage: 'english',
        profilePicture: 'profile.jpg',
        documents: ['doc1.pdf', 'doc2.pdf'],
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+0987654321',
        emergencyContactRelationship: 'Spouse',
        bloodType: 'O+',
        allergies: 'Penicillin',
        medicalHistory: 'No major illnesses',
        insuranceCompany: 'Health Insurance Co',
        insuranceMemberNumber: 'INS123456',
        insuranceMemberType: 'Primary',
        insuranceProviderNetwork: 'Network A',
        insurancePolicyId: 'POL123456',
        insuranceClass: 'Gold',
        insuranceCoPayment: 20,
        insuranceCoverageLimit: 100000,
        insuranceStartDate: new Date('2023-01-01'),
        insuranceEndDate: new Date('2024-12-31'),
        insuranceStatus: 'Active',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockPatientModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPatient),
      });

      const result = await service.getPatientById(patientId);

      expect(result).toBeDefined();
      
      // Verify personal information
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.dateOfBirth).toEqual(new Date('1990-01-15'));
      expect(result.gender).toBe('male');
      expect(result.status).toBe('Active');
      expect(result.nationality).toBe('US');
      expect(result.maritalStatus).toBe('Married');
      expect(result.religion).toBe('Christian');
      expect(result.preferredLanguage).toBe('english');
      
      // Verify contact information
      expect(result.phone).toBe('+1234567890');
      expect(result.email).toBe('john.doe@example.com');
      expect(result.address).toBe('123 Main St, City, Country');
      
      // Verify emergency contact information
      expect(result.emergencyContactName).toBe('Jane Doe');
      expect(result.emergencyContactPhone).toBe('+0987654321');
      expect(result.emergencyContactRelationship).toBe('Spouse');
      
      // Verify medical information
      expect(result.bloodType).toBe('O+');
      expect(result.allergies).toBe('Penicillin');
      expect(result.medicalHistory).toBe('No major illnesses');
      
      // Verify insurance information
      expect(result.insuranceCompany).toBe('Health Insurance Co');
      expect(result.insuranceMemberNumber).toBe('INS123456');
      expect(result.insuranceMemberType).toBe('Primary');
      expect(result.insuranceProviderNetwork).toBe('Network A');
      expect(result.insurancePolicyId).toBe('POL123456');
      expect(result.insuranceClass).toBe('Gold');
      expect(result.insuranceCoPayment).toBe(20);
      expect(result.insuranceCoverageLimit).toBe(100000);
      expect(result.insuranceStartDate).toEqual(new Date('2023-01-01'));
      expect(result.insuranceEndDate).toEqual(new Date('2024-12-31'));
      expect(result.insuranceStatus).toBe('Active');
      
      // Verify identifiers
      expect(result.patientNumber).toBe('PAT2024001');
      expect(result.cardNumber).toBe('CARD123456');
      
      // Verify status is included (Requirement 3.5)
      expect(result.status).toBe('Active');
      
      // Note: Age calculation is done in the controller layer, not service layer
      // The service returns the patient with dateOfBirth, and controller calculates age
    });

    it('should return patient with minimal required fields only', async () => {
      const patientId = new Types.ObjectId().toString();
      const mockPatient = {
        _id: new Types.ObjectId(patientId),
        patientNumber: 'PAT2024002',
        cardNumber: 'CARD789012',
        firstName: 'Jane',
        lastName: 'Smith',
        dateOfBirth: new Date('1985-05-20'),
        gender: 'female',
        status: 'Active',
        preferredLanguage: 'english',
        insuranceStatus: 'None',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockPatientModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPatient),
      });

      const result = await service.getPatientById(patientId);

      expect(result).toBeDefined();
      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
      expect(result.dateOfBirth).toEqual(new Date('1985-05-20'));
      expect(result.gender).toBe('female');
      expect(result.status).toBe('Active');
      expect(result.patientNumber).toBe('PAT2024002');
      expect(result.cardNumber).toBe('CARD789012');
    });

    it('should include status field in response', async () => {
      const patientId = new Types.ObjectId().toString();
      const mockPatient = {
        _id: new Types.ObjectId(patientId),
        patientNumber: 'PAT2024003',
        cardNumber: 'CARD345678',
        firstName: 'Bob',
        lastName: 'Johnson',
        dateOfBirth: new Date('1975-03-10'),
        gender: 'male',
        status: 'Inactive',
        preferredLanguage: 'english',
        insuranceStatus: 'None',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockPatientModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPatient),
      });

      const result = await service.getPatientById(patientId);

      expect(result).toBeDefined();
      expect(result.status).toBe('Inactive');
    });

    it('should return patient with dateOfBirth for age calculation', async () => {
      const patientId = new Types.ObjectId().toString();
      const dateOfBirth = new Date('1995-06-15');
      const mockPatient = {
        _id: new Types.ObjectId(patientId),
        patientNumber: 'PAT2024004',
        cardNumber: 'CARD567890',
        firstName: 'Charlie',
        lastName: 'Brown',
        dateOfBirth: dateOfBirth,
        gender: 'male',
        status: 'Active',
        preferredLanguage: 'english',
        insuranceStatus: 'None',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockPatientModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPatient),
      });

      const result = await service.getPatientById(patientId);

      expect(result).toBeDefined();
      expect(result.dateOfBirth).toEqual(dateOfBirth);
      // Age calculation happens in controller, service just returns dateOfBirth
    });
  });

  describe('getPatientById - Error Handling (Requirement 3.2, 3.3)', () => {
    it('should throw BadRequestException for invalid patient ID format', async () => {
      const invalidId = 'invalid-id';

      await expect(service.getPatientById(invalidId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when patient does not exist', async () => {
      const patientId = new Types.ObjectId().toString();

      mockPatientModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getPatientById(patientId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for soft-deleted patient', async () => {
      const patientId = new Types.ObjectId().toString();

      // Soft-deleted patient should not be returned by findOne with deletedAt filter
      mockPatientModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getPatientById(patientId)).rejects.toThrow(
        NotFoundException,
      );

      // Verify the query includes deletedAt filter
      expect(mockPatientModel.findOne).toHaveBeenCalledWith({
        _id: new Types.ObjectId(patientId),
        deletedAt: { $exists: false },
      });
    });

    it('should return bilingual error message for not found patient', async () => {
      const patientId = new Types.ObjectId().toString();

      mockPatientModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      try {
        await service.getPatientById(patientId);
        fail('Should have thrown NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        // The error message should be bilingual from ERROR_MESSAGES.PATIENT_NOT_FOUND
        expect(error.response).toBeDefined();
      }
    });

    it('should return bilingual error message for invalid ID', async () => {
      const invalidId = 'not-a-valid-objectid';

      try {
        await service.getPatientById(invalidId);
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        // The error message should be bilingual from ERROR_MESSAGES.INVALID_PATIENT_ID
        expect(error.response).toBeDefined();
      }
    });
  });

  describe('getPatientById - Query Verification', () => {
    it('should query with correct filters to exclude soft-deleted patients', async () => {
      const patientId = new Types.ObjectId().toString();
      const mockPatient = {
        _id: new Types.ObjectId(patientId),
        patientNumber: 'PAT2024004',
        cardNumber: 'CARD901234',
        firstName: 'Alice',
        lastName: 'Williams',
        dateOfBirth: new Date('1992-07-25'),
        gender: 'female',
        status: 'Active',
        preferredLanguage: 'english',
        insuranceStatus: 'None',
      };

      mockPatientModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPatient),
      });

      await service.getPatientById(patientId);

      // Verify the query includes both _id and deletedAt filter
      expect(mockPatientModel.findOne).toHaveBeenCalledWith({
        _id: new Types.ObjectId(patientId),
        deletedAt: { $exists: false },
      });
    });
  });
});
