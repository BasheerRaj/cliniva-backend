import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { PatientService } from '../../src/patient/patient.service';
import { AuditService } from '../../src/auth/audit.service';
import { ERROR_MESSAGES } from '../../src/common/utils/error-messages.constant';

describe('PatientService - Patient Activation', () => {
  let service: PatientService;
  let mockPatientModel: any;
  let mockAppointmentModel: any;
  let mockConnection: any;
  let mockAuditService: any;

  beforeEach(async () => {
    // Mock Patient Model
    mockPatientModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn(),
      }),
      findOneAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn(),
      }),
    };

    // Mock Appointment Model
    mockAppointmentModel = {
      updateMany: jest.fn(),
    };

    // Mock Connection
    mockConnection = {
      startSession: jest.fn(),
    };

    // Mock Audit Service
    mockAuditService = {
      logSecurityEvent: jest.fn(),
    };

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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('activatePatient', () => {
    const patientId = new Types.ObjectId().toString();
    const userId = new Types.ObjectId().toString();

    it('should activate an inactive patient successfully', async () => {
      const inactivePatient = {
        _id: new Types.ObjectId(patientId),
        firstName: 'John',
        lastName: 'Doe',
        status: 'Inactive',
        cardNumber: 'CARD123',
        patientNumber: 'PAT2024001',
      };

      const activatedPatient = {
        ...inactivePatient,
        status: 'Active',
      };

      mockPatientModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(inactivePatient),
      });
      mockPatientModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(activatedPatient),
      });

      const result = await service.activatePatient(patientId, userId);

      // Verify patient was found first
      expect(mockPatientModel.findOne).toHaveBeenCalledWith({
        _id: new Types.ObjectId(patientId),
        deletedAt: { $exists: false },
      });

      // Verify patient was updated
      expect(mockPatientModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: new Types.ObjectId(patientId), deletedAt: { $exists: false } },
        {
          $set: {
            status: 'Active',
            updatedBy: new Types.ObjectId(userId),
          },
        },
        { new: true },
      );

      // Verify audit log was created
      expect(mockAuditService.logSecurityEvent).toHaveBeenCalledWith({
        eventType: 'PATIENT_ACTIVATED',
        userId: patientId,
        actorId: userId,
        ipAddress: '0.0.0.0',
        userAgent: 'System',
        timestamp: expect.any(Date),
        metadata: { action: 'Patient account activated' },
      });

      expect(result.status).toBe('Active');
    });

    it('should throw BadRequestException for invalid patient ID', async () => {
      const invalidId = 'invalid-id';

      await expect(service.activatePatient(invalidId, userId)).rejects.toThrow(
        BadRequestException,
      );

      await expect(
        service.activatePatient(invalidId, userId),
      ).rejects.toThrow(
        expect.objectContaining({
          response: ERROR_MESSAGES.INVALID_PATIENT_ID,
        }),
      );
    });

    it('should throw NotFoundException when patient does not exist', async () => {
      mockPatientModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.activatePatient(patientId, userId)).rejects.toThrow(
        NotFoundException,
      );

      await expect(
        service.activatePatient(patientId, userId),
      ).rejects.toThrow(
        expect.objectContaining({
          response: ERROR_MESSAGES.PATIENT_NOT_FOUND,
        }),
      );
    });

    it('should handle idempotent activation - return patient if already active', async () => {
      const activePatient = {
        _id: new Types.ObjectId(patientId),
        firstName: 'John',
        lastName: 'Doe',
        status: 'Active',
        cardNumber: 'CARD123',
        patientNumber: 'PAT2024001',
      };

      mockPatientModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(activePatient),
      });

      const result = await service.activatePatient(patientId, userId);

      // Verify patient was returned as-is
      expect(result).toEqual(activePatient);
      expect(result.status).toBe('Active');

      // Verify no update was attempted
      expect(mockPatientModel.findOneAndUpdate).not.toHaveBeenCalled();

      // Verify no audit log was created
      expect(mockAuditService.logSecurityEvent).not.toHaveBeenCalled();
    });

    it('should handle multiple activation calls idempotently', async () => {
      const activePatient = {
        _id: new Types.ObjectId(patientId),
        firstName: 'John',
        lastName: 'Doe',
        status: 'Active',
        cardNumber: 'CARD123',
        patientNumber: 'PAT2024001',
      };

      mockPatientModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(activePatient),
      });

      // Call activate multiple times
      const result1 = await service.activatePatient(patientId, userId);
      const result2 = await service.activatePatient(patientId, userId);
      const result3 = await service.activatePatient(patientId, userId);

      // All calls should succeed
      expect(result1.status).toBe('Active');
      expect(result2.status).toBe('Active');
      expect(result3.status).toBe('Active');

      // Verify no updates were attempted
      expect(mockPatientModel.findOneAndUpdate).not.toHaveBeenCalled();

      // Verify no audit logs were created
      expect(mockAuditService.logSecurityEvent).not.toHaveBeenCalled();
    });

    it('should activate patient without userId (system activation)', async () => {
      const inactivePatient = {
        _id: new Types.ObjectId(patientId),
        firstName: 'John',
        lastName: 'Doe',
        status: 'Inactive',
        cardNumber: 'CARD123',
        patientNumber: 'PAT2024001',
      };

      const activatedPatient = {
        ...inactivePatient,
        status: 'Active',
      };

      mockPatientModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(inactivePatient),
      });
      mockPatientModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(activatedPatient),
      });

      const result = await service.activatePatient(patientId);

      // Verify patient was updated without userId
      expect(mockPatientModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: new Types.ObjectId(patientId), deletedAt: { $exists: false } },
        {
          $set: {
            status: 'Active',
            updatedBy: undefined,
          },
        },
        { new: true },
      );

      // Verify no audit log was created (no userId)
      expect(mockAuditService.logSecurityEvent).not.toHaveBeenCalled();

      expect(result.status).toBe('Active');
    });

    it('should throw NotFoundException if patient is soft-deleted', async () => {
      mockPatientModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.activatePatient(patientId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should log activation event with correct metadata', async () => {
      const inactivePatient = {
        _id: new Types.ObjectId(patientId),
        firstName: 'John',
        lastName: 'Doe',
        status: 'Inactive',
        cardNumber: 'CARD123',
        patientNumber: 'PAT2024001',
      };

      const activatedPatient = {
        ...inactivePatient,
        status: 'Active',
      };

      mockPatientModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(inactivePatient),
      });
      mockPatientModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(activatedPatient),
      });

      await service.activatePatient(patientId, userId);

      // Verify audit log includes correct metadata
      expect(mockAuditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PATIENT_ACTIVATED',
          userId: patientId,
          actorId: userId,
          metadata: { action: 'Patient account activated' },
        }),
      );
    });

    it('should update patient status from Inactive to Active', async () => {
      const inactivePatient = {
        _id: new Types.ObjectId(patientId),
        firstName: 'John',
        lastName: 'Doe',
        status: 'Inactive',
        cardNumber: 'CARD123',
        patientNumber: 'PAT2024001',
      };

      const activatedPatient = {
        ...inactivePatient,
        status: 'Active',
      };

      mockPatientModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(inactivePatient),
      });
      mockPatientModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(activatedPatient),
      });

      const result = await service.activatePatient(patientId, userId);

      expect(result.status).toBe('Active');
    });
  });
});
