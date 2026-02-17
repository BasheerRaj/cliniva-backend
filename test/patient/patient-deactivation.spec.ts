import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { PatientService } from '../../src/patient/patient.service';
import { AuditService } from '../../src/auth/audit.service';
import { ERROR_MESSAGES } from '../../src/common/utils/error-messages.constant';

describe('PatientService - Deactivation with Transactions (Task 3)', () => {
  let service: PatientService;
  let patientModel: any;
  let appointmentModel: any;
  let mockSession: any;

  const mockPatientModel: any = {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

  const mockAppointmentModel = {
    updateMany: jest.fn(),
  };

  const mockAuditService = {
    logSecurityEvent: jest.fn(),
  };

  beforeEach(async () => {
    // Create mock session
    mockSession = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    };

    const mockConnection = {
      startSession: jest.fn().mockResolvedValue(mockSession),
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
    patientModel = module.get(getModelToken('Patient'));
    appointmentModel = module.get(getModelToken('Appointment'));

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('Task 3.1: Transaction-based deactivation', () => {
    it('should deactivate patient and cancel appointments within a transaction', async () => {
      const patientId = '507f1f77bcf86cd799439011';
      const userId = '507f1f77bcf86cd799439012';

      const mockPatient = {
        _id: new Types.ObjectId(patientId),
        firstName: 'John',
        lastName: 'Doe',
        status: 'Active',
      };

      const mockDeactivatedPatient = {
        ...mockPatient,
        status: 'Inactive',
      };

      // Mock patient lookup
      mockPatientModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPatient),
      });

      // Mock patient update
      mockPatientModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDeactivatedPatient),
      });

      // Mock appointment cancellation
      mockAppointmentModel.updateMany.mockResolvedValue({
        modifiedCount: 3,
      });

      const result = await service.deactivatePatient(patientId, userId);

      // Verify transaction was started
      expect(mockSession.startTransaction).toHaveBeenCalled();

      // Verify patient was updated with session
      expect(mockPatientModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: expect.any(Types.ObjectId),
          deletedAt: { $exists: false },
        }),
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'Inactive',
          }),
        }),
        expect.objectContaining({
          new: true,
          session: mockSession,
        }),
      );

      // Verify appointments were cancelled with session
      expect(mockAppointmentModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: expect.any(Types.ObjectId),
          status: { $in: ['scheduled', 'confirmed'] },
          deletedAt: { $exists: false },
        }),
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'cancelled',
            cancellationReason: 'Patient deactivated',
          }),
        }),
        expect.objectContaining({
          session: mockSession,
        }),
      );

      // Verify transaction was committed
      expect(mockSession.commitTransaction).toHaveBeenCalled();

      // Verify session was ended
      expect(mockSession.endSession).toHaveBeenCalled();

      // Verify audit log was created
      expect(mockAuditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PATIENT_DEACTIVATED',
          userId: patientId,
          actorId: userId,
          metadata: { cancelledAppointments: 3 },
        }),
      );

      expect(result.status).toBe('Inactive');
    });

    it('should rollback transaction on error', async () => {
      const patientId = '507f1f77bcf86cd799439011';
      const userId = '507f1f77bcf86cd799439012';

      const mockPatient = {
        _id: new Types.ObjectId(patientId),
        firstName: 'John',
        lastName: 'Doe',
        status: 'Active',
      };

      // Mock patient lookup
      mockPatientModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPatient),
      });

      // Mock patient update to succeed
      mockPatientModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockPatient, status: 'Inactive' }),
      });

      // Mock appointment cancellation to fail
      mockAppointmentModel.updateMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.deactivatePatient(patientId, userId),
      ).rejects.toThrow();

      // Verify transaction was started
      expect(mockSession.startTransaction).toHaveBeenCalled();

      // Verify transaction was aborted
      expect(mockSession.abortTransaction).toHaveBeenCalled();

      // Verify session was ended
      expect(mockSession.endSession).toHaveBeenCalled();

      // Verify transaction was NOT committed
      expect(mockSession.commitTransaction).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent patient', async () => {
      const patientId = '507f1f77bcf86cd799439011';
      const userId = '507f1f77bcf86cd799439012';

      // Mock patient not found
      mockPatientModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.deactivatePatient(patientId, userId),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.deactivatePatient(patientId, userId),
      ).rejects.toThrow(
        expect.objectContaining({
          response: ERROR_MESSAGES.PATIENT_NOT_FOUND,
        }),
      );

      // Verify transaction was NOT started for non-existent patient
      expect(mockSession.startTransaction).not.toHaveBeenCalled();
    });
  });

  describe('Task 3.2: Idempotent deactivation', () => {
    it('should return patient without error if already inactive', async () => {
      const patientId = '507f1f77bcf86cd799439011';
      const userId = '507f1f77bcf86cd799439012';

      const mockInactivePatient = {
        _id: new Types.ObjectId(patientId),
        firstName: 'John',
        lastName: 'Doe',
        status: 'Inactive',
      };

      // Mock patient lookup - already inactive
      mockPatientModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockInactivePatient),
      });

      const result = await service.deactivatePatient(patientId, userId);

      // Verify patient was returned as-is
      expect(result.status).toBe('Inactive');

      // Verify transaction was NOT started
      expect(mockSession.startTransaction).not.toHaveBeenCalled();

      // Verify patient was NOT updated
      expect(mockPatientModel.findOneAndUpdate).not.toHaveBeenCalled();

      // Verify appointments were NOT cancelled
      expect(mockAppointmentModel.updateMany).not.toHaveBeenCalled();

      // Verify audit log was NOT created
      expect(mockAuditService.logSecurityEvent).not.toHaveBeenCalled();
    });

    it('should handle multiple deactivation calls gracefully', async () => {
      const patientId = '507f1f77bcf86cd799439011';
      const userId = '507f1f77bcf86cd799439012';

      const mockInactivePatient = {
        _id: new Types.ObjectId(patientId),
        firstName: 'John',
        lastName: 'Doe',
        status: 'Inactive',
      };

      // Mock patient lookup - already inactive
      mockPatientModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockInactivePatient),
      });

      // Call deactivate multiple times
      const result1 = await service.deactivatePatient(patientId, userId);
      const result2 = await service.deactivatePatient(patientId, userId);
      const result3 = await service.deactivatePatient(patientId, userId);

      // All calls should succeed
      expect(result1.status).toBe('Inactive');
      expect(result2.status).toBe('Inactive');
      expect(result3.status).toBe('Inactive');

      // Verify transaction was never started
      expect(mockSession.startTransaction).not.toHaveBeenCalled();
    });
  });

  describe('Task 3: Integration - Deactivation with appointment cancellation', () => {
    it('should log cancelled appointment count in audit trail', async () => {
      const patientId = '507f1f77bcf86cd799439011';
      const userId = '507f1f77bcf86cd799439012';

      const mockPatient = {
        _id: new Types.ObjectId(patientId),
        firstName: 'John',
        lastName: 'Doe',
        status: 'Active',
      };

      // Mock patient lookup
      mockPatientModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPatient),
      });

      // Mock patient update
      mockPatientModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockPatient, status: 'Inactive' }),
      });

      // Mock appointment cancellation with 5 appointments
      mockAppointmentModel.updateMany.mockResolvedValue({
        modifiedCount: 5,
      });

      await service.deactivatePatient(patientId, userId);

      // Verify audit log includes cancelled appointment count
      expect(mockAuditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PATIENT_DEACTIVATED',
          metadata: { cancelledAppointments: 5 },
        }),
      );
    });

    it('should handle deactivation with no active appointments', async () => {
      const patientId = '507f1f77bcf86cd799439011';
      const userId = '507f1f77bcf86cd799439012';

      const mockPatient = {
        _id: new Types.ObjectId(patientId),
        firstName: 'John',
        lastName: 'Doe',
        status: 'Active',
      };

      // Mock patient lookup
      mockPatientModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPatient),
      });

      // Mock patient update
      mockPatientModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockPatient, status: 'Inactive' }),
      });

      // Mock appointment cancellation with 0 appointments
      mockAppointmentModel.updateMany.mockResolvedValue({
        modifiedCount: 0,
      });

      const result = await service.deactivatePatient(patientId, userId);

      expect(result.status).toBe('Inactive');

      // Verify audit log includes 0 cancelled appointments
      expect(mockAuditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PATIENT_DEACTIVATED',
          metadata: { cancelledAppointments: 0 },
        }),
      );
    });
  });
});
