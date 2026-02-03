import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ClinicStatusService } from './clinic-status.service';
import { Clinic } from '../../database/schemas/clinic.schema';
import { User } from '../../database/schemas/user.schema';
import { Appointment } from '../../database/schemas/appointment.schema';
import { AuditService } from '../../auth/audit.service';

describe('ClinicStatusService', () => {
  let service: ClinicStatusService;
  let mockClinicModel: any;
  let mockUserModel: any;
  let mockAppointmentModel: any;
  let mockConnection: any;
  let mockSession: any;
  let mockAuditService: any;

  const mockClinicId = new Types.ObjectId().toString();
  const mockTargetClinicId = new Types.ObjectId().toString();
  const mockUserId = new Types.ObjectId().toString();

  const mockClinic = {
    _id: new Types.ObjectId(mockClinicId),
    name: 'Test Clinic',
    status: 'active',
    isActive: true,
    deactivatedAt: undefined,
    deactivatedBy: undefined,
    deactivationReason: undefined,
    save: jest.fn(),
  };

  const mockTargetClinic = {
    _id: new Types.ObjectId(mockTargetClinicId),
    name: 'Target Clinic',
    status: 'active',
    isActive: true,
  };

  beforeEach(async () => {
    // Create mock session
    mockSession = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    };

    // Create mock connection
    mockConnection = {
      startSession: jest.fn().mockResolvedValue(mockSession),
    };

    // Create model mocks
    mockClinicModel = {
      findById: jest.fn(),
    };

    mockUserModel = {
      countDocuments: jest.fn(),
      find: jest.fn(),
      updateMany: jest.fn(),
    };

    mockAppointmentModel = {
      countDocuments: jest.fn(),
      updateMany: jest.fn(),
    };

    // Create audit service mock
    mockAuditService = {
      logClinicStatusChange: jest.fn().mockResolvedValue(undefined),
      logClinicStaffTransfer: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicStatusService,
        {
          provide: getModelToken('Clinic'),
          useValue: mockClinicModel,
        },
        {
          provide: getModelToken('User'),
          useValue: mockUserModel,
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

    service = module.get<ClinicStatusService>(ClinicStatusService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('changeStatus', () => {
    it('should successfully change status to active without resources', async () => {
      // Arrange
      mockClinicModel.findById.mockResolvedValue(mockClinic);
      mockAppointmentModel.countDocuments.mockResolvedValue(0);
      mockUserModel.countDocuments.mockResolvedValueOnce(0); // doctors
      mockUserModel.countDocuments.mockResolvedValueOnce(0); // staff
      mockClinic.save.mockResolvedValue(mockClinic);

      const options = {
        status: 'active' as const,
        reason: 'Reopening clinic',
      };

      // Act
      const result = await service.changeStatus(
        mockClinicId,
        options,
        mockUserId,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.clinic).toBeDefined();
      expect(mockClinic.status).toBe('active');
      expect(mockClinic.isActive).toBe(true);
      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should successfully change status to inactive without active resources', async () => {
      // Arrange
      mockClinicModel.findById.mockResolvedValue(mockClinic);
      mockAppointmentModel.countDocuments.mockResolvedValue(0);
      mockUserModel.countDocuments.mockResolvedValueOnce(0); // doctors
      mockUserModel.countDocuments.mockResolvedValueOnce(0); // staff
      mockClinic.save.mockResolvedValue(mockClinic);

      const options = {
        status: 'inactive' as const,
        reason: 'Temporary closure',
      };

      // Act
      const result = await service.changeStatus(
        mockClinicId,
        options,
        mockUserId,
      );

      // Assert
      expect(result).toBeDefined();
      expect(mockClinic.status).toBe('inactive');
      expect(mockClinic.isActive).toBe(false);
      expect(mockClinic.deactivatedAt).toBeDefined();
      expect(mockClinic.deactivatedBy).toEqual(new Types.ObjectId(mockUserId));
      expect(mockClinic.deactivationReason).toBe('Temporary closure');
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException for invalid clinic', async () => {
      // Arrange
      mockClinicModel.findById.mockResolvedValue(null);

      const options = {
        status: 'inactive' as const,
      };

      // Act & Assert
      await expect(
        service.changeStatus(mockClinicId, options, mockUserId),
      ).rejects.toThrow(NotFoundException);

      expect(mockConnection.startSession).not.toHaveBeenCalled();
    });

    it('should require transfer decision when deactivating with active appointments', async () => {
      // Arrange
      mockClinicModel.findById.mockResolvedValue(mockClinic);
      mockAppointmentModel.countDocuments.mockResolvedValue(5); // 5 active appointments
      mockUserModel.countDocuments.mockResolvedValueOnce(2); // 2 doctors
      mockUserModel.countDocuments.mockResolvedValueOnce(3); // 3 staff

      const options = {
        status: 'inactive' as const,
        reason: 'Closure',
      };

      // Act & Assert
      try {
        await service.changeStatus(mockClinicId, options, mockUserId);
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response.code).toBe('CLINIC_004');
        expect(error.response.requiresTransfer).toBe(true);
        expect(error.response.activeAppointments).toBe(5);
        expect(error.response.assignedDoctors).toBe(2);
        expect(error.response.assignedStaff).toBe(3);
      }
    });

    it('should require transfer decision when deactivating with assigned doctors', async () => {
      // Arrange
      mockClinicModel.findById.mockResolvedValue(mockClinic);
      mockAppointmentModel.countDocuments.mockResolvedValue(0);
      mockUserModel.countDocuments.mockResolvedValueOnce(3); // 3 doctors
      mockUserModel.countDocuments.mockResolvedValueOnce(0); // 0 staff

      const options = {
        status: 'inactive' as const,
      };

      // Act & Assert
      await expect(
        service.changeStatus(mockClinicId, options, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should require transfer decision when deactivating with assigned staff', async () => {
      // Arrange
      mockClinicModel.findById.mockResolvedValue(mockClinic);
      mockAppointmentModel.countDocuments.mockResolvedValue(0);
      mockUserModel.countDocuments.mockResolvedValueOnce(0); // 0 doctors
      mockUserModel.countDocuments.mockResolvedValueOnce(5); // 5 staff

      const options = {
        status: 'suspended' as const,
      };

      // Act & Assert
      await expect(
        service.changeStatus(mockClinicId, options, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully transfer doctors when deactivating', async () => {
      // Arrange
      mockClinicModel.findById.mockResolvedValueOnce(mockClinic);
      mockClinicModel.findById.mockResolvedValueOnce(mockTargetClinic); // for transferStaff
      mockAppointmentModel.countDocuments.mockResolvedValue(5);
      mockUserModel.countDocuments.mockResolvedValueOnce(2); // doctors
      mockUserModel.countDocuments.mockResolvedValueOnce(0); // staff

      // Mock transfer operations
      mockUserModel.updateMany.mockResolvedValueOnce({ modifiedCount: 2 }); // doctors transferred
      mockUserModel.find.mockReturnValue({
        select: jest
          .fn()
          .mockResolvedValue([
            { _id: new Types.ObjectId() },
            { _id: new Types.ObjectId() },
          ]),
      });
      mockAppointmentModel.updateMany.mockResolvedValueOnce({
        modifiedCount: 5,
      }); // appointments transferred

      mockClinic.save.mockResolvedValue(mockClinic);

      const options = {
        status: 'inactive' as const,
        reason: 'Relocating',
        transferDoctors: true,
        targetClinicId: mockTargetClinicId,
      };

      // Act
      const result = await service.changeStatus(
        mockClinicId,
        options,
        mockUserId,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.doctorsTransferred).toBe(2);
      expect(result.appointmentsAffected).toBe(5);
      expect(mockUserModel.updateMany).toHaveBeenCalled();
      expect(mockAppointmentModel.updateMany).toHaveBeenCalled();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });

    it('should successfully transfer staff when deactivating', async () => {
      // Arrange
      mockClinicModel.findById.mockResolvedValueOnce(mockClinic);
      mockClinicModel.findById.mockResolvedValueOnce(mockTargetClinic); // for transferStaff
      mockAppointmentModel.countDocuments.mockResolvedValue(0);
      mockUserModel.countDocuments.mockResolvedValueOnce(0); // doctors
      mockUserModel.countDocuments.mockResolvedValueOnce(3); // staff

      // Mock transfer operations
      mockUserModel.updateMany.mockResolvedValueOnce({ modifiedCount: 3 }); // staff transferred

      mockClinic.save.mockResolvedValue(mockClinic);

      const options = {
        status: 'inactive' as const,
        transferStaff: true,
        targetClinicId: mockTargetClinicId,
      };

      // Act
      const result = await service.changeStatus(
        mockClinicId,
        options,
        mockUserId,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.staffTransferred).toBe(3);
      expect(mockUserModel.updateMany).toHaveBeenCalled();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });

    it('should mark appointments for rescheduling when deactivating without transfer', async () => {
      // Arrange
      mockClinicModel.findById.mockResolvedValue(mockClinic);
      // No active appointments initially, but we'll test the rescheduling logic directly
      mockAppointmentModel.countDocuments.mockResolvedValue(0);
      mockUserModel.countDocuments.mockResolvedValueOnce(0); // doctors
      mockUserModel.countDocuments.mockResolvedValueOnce(0); // staff

      // Mock the rescheduling update
      mockAppointmentModel.updateMany.mockResolvedValue({ modifiedCount: 0 });
      mockClinic.save.mockResolvedValue(mockClinic);

      const options = {
        status: 'inactive' as const,
      };

      // Act
      const result = await service.changeStatus(
        mockClinicId,
        options,
        mockUserId,
      );

      // Assert - verify the transaction was committed successfully
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(result.clinic.status).toBe('inactive');
    });

    it('should mark appointments for rescheduling when transferring staff but not doctors', async () => {
      // Arrange
      mockClinicModel.findById.mockResolvedValueOnce(mockClinic);
      mockClinicModel.findById.mockResolvedValueOnce(mockTargetClinic); // for transferStaff
      mockAppointmentModel.countDocuments.mockResolvedValue(3); // 3 active appointments
      mockUserModel.countDocuments.mockResolvedValueOnce(0); // 0 doctors
      mockUserModel.countDocuments.mockResolvedValueOnce(2); // 2 staff

      // Mock staff transfer
      mockUserModel.updateMany.mockResolvedValue({ modifiedCount: 2 }); // staff transferred

      // Mock appointment rescheduling (since we're not transferring doctors)
      mockAppointmentModel.updateMany.mockResolvedValue({ modifiedCount: 3 });

      mockClinic.save.mockResolvedValue(mockClinic);

      const options = {
        status: 'inactive' as const,
        transferStaff: true,
        targetClinicId: mockTargetClinicId,
      };

      // Act
      const result = await service.changeStatus(
        mockClinicId,
        options,
        mockUserId,
      );

      // Assert - verify appointments were marked for rescheduling
      expect(mockAppointmentModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          clinicId: new Types.ObjectId(mockClinicId),
          status: { $in: ['scheduled', 'confirmed'] },
        }),
        expect.objectContaining({
          $set: expect.objectContaining({
            reschedulingReason: 'Clinic status changed',
            markedForReschedulingAt: expect.any(Date),
          }),
        }),
        expect.objectContaining({ session: mockSession }),
      );
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });

    it('should throw error if target clinic not specified for transfer', async () => {
      // Arrange
      mockClinicModel.findById.mockResolvedValue(mockClinic);
      mockAppointmentModel.countDocuments.mockResolvedValue(0);
      mockUserModel.countDocuments.mockResolvedValueOnce(2); // doctors
      mockUserModel.countDocuments.mockResolvedValueOnce(0); // staff

      const options = {
        status: 'inactive' as const,
        transferDoctors: true,
        // targetClinicId missing
      };

      // Act & Assert
      await expect(
        service.changeStatus(mockClinicId, options, mockUserId),
      ).rejects.toThrow(BadRequestException);

      const error = await service
        .changeStatus(mockClinicId, options, mockUserId)
        .catch((e) => e);
      expect(error.response.code).toBe('CLINIC_008');
    });

    it('should rollback transaction on error', async () => {
      // Arrange
      mockClinicModel.findById.mockResolvedValueOnce(mockClinic);
      mockClinicModel.findById.mockResolvedValueOnce(mockTargetClinic);
      mockAppointmentModel.countDocuments.mockResolvedValue(0);
      mockUserModel.countDocuments.mockResolvedValueOnce(2); // doctors
      mockUserModel.countDocuments.mockResolvedValueOnce(0); // staff

      // Mock error during transfer
      mockUserModel.updateMany.mockRejectedValue(new Error('Database error'));

      const options = {
        status: 'inactive' as const,
        transferDoctors: true,
        targetClinicId: mockTargetClinicId,
      };

      // Act & Assert
      await expect(
        service.changeStatus(mockClinicId, options, mockUserId),
      ).rejects.toThrow('Database error');

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(mockSession.commitTransaction).not.toHaveBeenCalled();
    });

    it('should handle both doctors and staff transfer', async () => {
      // Arrange
      mockClinicModel.findById.mockResolvedValueOnce(mockClinic);
      mockClinicModel.findById.mockResolvedValueOnce(mockTargetClinic);
      mockAppointmentModel.countDocuments.mockResolvedValue(5);
      mockUserModel.countDocuments.mockResolvedValueOnce(2); // doctors
      mockUserModel.countDocuments.mockResolvedValueOnce(3); // staff

      // Mock transfer operations
      mockUserModel.updateMany.mockResolvedValueOnce({ modifiedCount: 2 }); // doctors
      mockUserModel.find.mockReturnValue({
        select: jest
          .fn()
          .mockResolvedValue([
            { _id: new Types.ObjectId() },
            { _id: new Types.ObjectId() },
          ]),
      });
      mockAppointmentModel.updateMany.mockResolvedValueOnce({
        modifiedCount: 5,
      }); // appointments
      mockUserModel.updateMany.mockResolvedValueOnce({ modifiedCount: 3 }); // staff

      mockClinic.save.mockResolvedValue(mockClinic);

      const options = {
        status: 'inactive' as const,
        transferDoctors: true,
        transferStaff: true,
        targetClinicId: mockTargetClinicId,
      };

      // Act
      const result = await service.changeStatus(
        mockClinicId,
        options,
        mockUserId,
      );

      // Assert
      expect(result.doctorsTransferred).toBe(2);
      expect(result.staffTransferred).toBe(3);
      expect(result.appointmentsAffected).toBe(5);
      expect(mockUserModel.updateMany).toHaveBeenCalledTimes(2);
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });

    // Additional transaction rollback tests for Task 13.3
    it('should rollback transaction on status update failure', async () => {
      // Arrange
      mockClinicModel.findById.mockResolvedValue(mockClinic);
      mockAppointmentModel.countDocuments.mockResolvedValue(0);
      mockUserModel.countDocuments.mockResolvedValueOnce(0); // doctors
      mockUserModel.countDocuments.mockResolvedValueOnce(0); // staff

      // Mock save to fail
      mockClinic.save.mockRejectedValue(new Error('Save failed'));

      const options = {
        status: 'inactive' as const,
        reason: 'Test failure',
      };

      // Act & Assert
      await expect(
        service.changeStatus(mockClinicId, options, mockUserId),
      ).rejects.toThrow('Save failed');

      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(mockSession.commitTransaction).not.toHaveBeenCalled();
    });

    it('should rollback transaction on appointment rescheduling failure', async () => {
      // Arrange
      mockClinicModel.findById.mockResolvedValue(mockClinic);
      mockAppointmentModel.countDocuments.mockResolvedValue(0); // No active appointments initially
      mockUserModel.countDocuments.mockResolvedValueOnce(0); // doctors
      mockUserModel.countDocuments.mockResolvedValueOnce(0); // staff

      // Mock appointment update to fail (this would be called if there were appointments)
      mockAppointmentModel.updateMany.mockRejectedValue(
        new Error('Appointment update failed'),
      );

      // Mock clinic save to succeed initially, but we'll test the rollback path
      mockClinic.save.mockRejectedValue(new Error('Save failed after appointment update'));

      const options = {
        status: 'inactive' as const,
      };

      // Act & Assert
      await expect(
        service.changeStatus(mockClinicId, options, mockUserId),
      ).rejects.toThrow();

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(mockSession.commitTransaction).not.toHaveBeenCalled();
    });

    it('should verify data consistency after rollback on transfer failure', async () => {
      // Arrange
      const originalStatus = 'active';
      mockClinic.status = originalStatus;

      mockClinicModel.findById.mockResolvedValueOnce(mockClinic);
      mockClinicModel.findById.mockResolvedValueOnce(mockTargetClinic);
      mockAppointmentModel.countDocuments.mockResolvedValue(0);
      mockUserModel.countDocuments.mockResolvedValueOnce(2); // doctors
      mockUserModel.countDocuments.mockResolvedValueOnce(0); // staff

      // Mock transfer to fail
      mockUserModel.updateMany.mockRejectedValue(
        new Error('Transfer failed'),
      );

      const options = {
        status: 'inactive' as const,
        transferDoctors: true,
        targetClinicId: mockTargetClinicId,
      };

      // Act & Assert
      await expect(
        service.changeStatus(mockClinicId, options, mockUserId),
      ).rejects.toThrow('Transfer failed');

      // Verify rollback was called
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();

      // Verify clinic status was not changed (data consistency)
      expect(mockClinic.status).toBe(originalStatus);
      expect(mockClinic.save).not.toHaveBeenCalled();
    });

    it('should rollback transaction when target clinic validation fails during transfer', async () => {
      // Arrange
      mockClinicModel.findById.mockResolvedValueOnce(mockClinic);
      mockClinicModel.findById.mockResolvedValueOnce(null); // target clinic not found
      mockAppointmentModel.countDocuments.mockResolvedValue(0);
      mockUserModel.countDocuments.mockResolvedValueOnce(2); // doctors
      mockUserModel.countDocuments.mockResolvedValueOnce(0); // staff

      const options = {
        status: 'inactive' as const,
        transferDoctors: true,
        targetClinicId: mockTargetClinicId,
      };

      // Act & Assert
      await expect(
        service.changeStatus(mockClinicId, options, mockUserId),
      ).rejects.toThrow(NotFoundException);

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(mockSession.commitTransaction).not.toHaveBeenCalled();
    });

    it('should ensure session is always ended even on unexpected errors', async () => {
      // Arrange
      mockClinicModel.findById.mockResolvedValue(mockClinic);
      mockAppointmentModel.countDocuments.mockResolvedValue(0);
      mockUserModel.countDocuments.mockResolvedValueOnce(0);
      mockUserModel.countDocuments.mockResolvedValueOnce(0);

      // Mock an unexpected error
      mockClinic.save.mockRejectedValue(new Error('Unexpected error'));

      const options = {
        status: 'inactive' as const,
      };

      // Act & Assert
      await expect(
        service.changeStatus(mockClinicId, options, mockUserId),
      ).rejects.toThrow('Unexpected error');

      // Verify session cleanup happened
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should rollback all operations when multiple operations fail', async () => {
      // Arrange
      mockClinicModel.findById.mockResolvedValueOnce(mockClinic);
      mockClinicModel.findById.mockResolvedValueOnce(mockTargetClinic);
      mockAppointmentModel.countDocuments.mockResolvedValue(5);
      mockUserModel.countDocuments.mockResolvedValueOnce(3); // doctors
      mockUserModel.countDocuments.mockResolvedValueOnce(2); // staff

      // Mock successful doctor transfer
      mockUserModel.updateMany.mockResolvedValueOnce({ modifiedCount: 3 }); // doctors
      mockUserModel.find.mockReturnValue({
        select: jest
          .fn()
          .mockResolvedValue([
            { _id: new Types.ObjectId() },
            { _id: new Types.ObjectId() },
            { _id: new Types.ObjectId() },
          ]),
      });

      // Mock appointment transfer to fail
      mockAppointmentModel.updateMany.mockRejectedValue(
        new Error('Appointment transfer failed'),
      );

      const options = {
        status: 'inactive' as const,
        transferDoctors: true,
        transferStaff: true,
        targetClinicId: mockTargetClinicId,
      };

      // Act & Assert
      await expect(
        service.changeStatus(mockClinicId, options, mockUserId),
      ).rejects.toThrow('Appointment transfer failed');

      // Verify rollback was called
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(mockSession.commitTransaction).not.toHaveBeenCalled();

      // Verify clinic was not saved (all operations rolled back)
      expect(mockClinic.save).not.toHaveBeenCalled();
    });
  });

  describe('transferStaff', () => {
    it('should successfully transfer doctors', async () => {
      // Arrange
      mockClinicModel.findById.mockResolvedValue(mockTargetClinic);
      mockUserModel.updateMany.mockResolvedValueOnce({ modifiedCount: 3 }); // doctors
      mockUserModel.find.mockReturnValue({
        select: jest
          .fn()
          .mockResolvedValue([
            { _id: new Types.ObjectId() },
            { _id: new Types.ObjectId() },
            { _id: new Types.ObjectId() },
          ]),
      });
      mockAppointmentModel.updateMany.mockResolvedValue({ modifiedCount: 10 });

      const options = {
        targetClinicId: mockTargetClinicId,
        transferDoctors: true,
        transferStaff: false,
        handleConflicts: 'reschedule' as const,
      };

      // Act
      const result = await service.transferStaff(
        mockClinicId,
        options,
        mockSession,
      );

      // Assert
      expect(result.doctorsTransferred).toBe(3);
      expect(result.appointmentsAffected).toBe(10);
      expect(result.staffTransferred).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockUserModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          clinicId: new Types.ObjectId(mockClinicId),
          role: 'doctor',
          isActive: true,
        }),
        expect.objectContaining({
          $set: expect.objectContaining({
            clinicId: new Types.ObjectId(mockTargetClinicId),
          }),
        }),
        expect.objectContaining({ session: mockSession }),
      );
    });

    it('should successfully transfer staff', async () => {
      // Arrange
      mockClinicModel.findById.mockResolvedValue(mockTargetClinic);
      mockUserModel.updateMany.mockResolvedValue({ modifiedCount: 5 });

      const options = {
        targetClinicId: mockTargetClinicId,
        transferDoctors: false,
        transferStaff: true,
        handleConflicts: 'reschedule' as const,
      };

      // Act
      const result = await service.transferStaff(
        mockClinicId,
        options,
        mockSession,
      );

      // Assert
      expect(result.staffTransferred).toBe(5);
      expect(result.doctorsTransferred).toBe(0);
      expect(result.appointmentsAffected).toBe(0);
      expect(mockUserModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          clinicId: new Types.ObjectId(mockClinicId),
          role: { $nin: ['doctor', 'patient'] },
          isActive: true,
        }),
        expect.any(Object),
        expect.objectContaining({ session: mockSession }),
      );
    });

    it('should transfer specific doctors by ID', async () => {
      // Arrange
      const doctorId1 = new Types.ObjectId().toString();
      const doctorId2 = new Types.ObjectId().toString();

      mockClinicModel.findById.mockResolvedValue(mockTargetClinic);
      mockUserModel.updateMany.mockResolvedValueOnce({ modifiedCount: 2 });
      mockUserModel.find.mockReturnValue({
        select: jest
          .fn()
          .mockResolvedValue([
            { _id: new Types.ObjectId(doctorId1) },
            { _id: new Types.ObjectId(doctorId2) },
          ]),
      });
      mockAppointmentModel.updateMany.mockResolvedValue({ modifiedCount: 5 });

      const options = {
        targetClinicId: mockTargetClinicId,
        transferDoctors: true,
        transferStaff: false,
        doctorIds: [doctorId1, doctorId2],
        handleConflicts: 'reschedule' as const,
      };

      // Act
      const result = await service.transferStaff(
        mockClinicId,
        options,
        mockSession,
      );

      // Assert
      expect(result.doctorsTransferred).toBe(2);
      expect(mockUserModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: {
            $in: [new Types.ObjectId(doctorId1), new Types.ObjectId(doctorId2)],
          },
        }),
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should transfer specific staff by ID', async () => {
      // Arrange
      const staffId1 = new Types.ObjectId().toString();
      const staffId2 = new Types.ObjectId().toString();

      mockClinicModel.findById.mockResolvedValue(mockTargetClinic);
      mockUserModel.updateMany.mockResolvedValue({ modifiedCount: 2 });

      const options = {
        targetClinicId: mockTargetClinicId,
        transferDoctors: false,
        transferStaff: true,
        staffIds: [staffId1, staffId2],
        handleConflicts: 'reschedule' as const,
      };

      // Act
      const result = await service.transferStaff(
        mockClinicId,
        options,
        mockSession,
      );

      // Assert
      expect(result.staffTransferred).toBe(2);
      expect(mockUserModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: {
            $in: [new Types.ObjectId(staffId1), new Types.ObjectId(staffId2)],
          },
        }),
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should include department ID in transfer', async () => {
      // Arrange
      const departmentId = new Types.ObjectId().toString();

      mockClinicModel.findById.mockResolvedValue(mockTargetClinic);
      mockUserModel.updateMany.mockResolvedValue({ modifiedCount: 2 });

      const options = {
        targetClinicId: mockTargetClinicId,
        targetDepartmentId: departmentId,
        transferDoctors: false,
        transferStaff: true,
        handleConflicts: 'reschedule' as const,
      };

      // Act
      const result = await service.transferStaff(
        mockClinicId,
        options,
        mockSession,
      );

      // Assert
      expect(mockUserModel.updateMany).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          $set: expect.objectContaining({
            departmentId: new Types.ObjectId(departmentId),
          }),
        }),
        expect.any(Object),
      );
    });

    it('should throw NotFoundException for invalid target clinic', async () => {
      // Arrange
      mockClinicModel.findById.mockResolvedValue(null);

      const options = {
        targetClinicId: mockTargetClinicId,
        transferDoctors: true,
        transferStaff: false,
        handleConflicts: 'reschedule' as const,
      };

      // Act & Assert
      await expect(
        service.transferStaff(mockClinicId, options, mockSession),
      ).rejects.toThrow(NotFoundException);

      const error = await service
        .transferStaff(mockClinicId, options, mockSession)
        .catch((e) => e);
      expect(error.response.code).toBe('CLINIC_008');
    });

    it('should handle zero transfers gracefully', async () => {
      // Arrange
      mockClinicModel.findById.mockResolvedValue(mockTargetClinic);
      mockUserModel.updateMany.mockResolvedValue({ modifiedCount: 0 });

      const options = {
        targetClinicId: mockTargetClinicId,
        transferDoctors: false,
        transferStaff: true,
        handleConflicts: 'reschedule' as const,
      };

      // Act
      const result = await service.transferStaff(
        mockClinicId,
        options,
        mockSession,
      );

      // Assert
      expect(result.staffTransferred).toBe(0);
      expect(result.doctorsTransferred).toBe(0);
      expect(result.appointmentsAffected).toBe(0);
    });

    it('should not transfer appointments if no doctors transferred', async () => {
      // Arrange
      mockClinicModel.findById.mockResolvedValue(mockTargetClinic);
      mockUserModel.updateMany.mockResolvedValue({ modifiedCount: 0 }); // no doctors
      mockUserModel.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([]),
      });

      const options = {
        targetClinicId: mockTargetClinicId,
        transferDoctors: true,
        transferStaff: false,
        handleConflicts: 'reschedule' as const,
      };

      // Act
      const result = await service.transferStaff(
        mockClinicId,
        options,
        mockSession,
      );

      // Assert
      expect(result.doctorsTransferred).toBe(0);
      expect(result.appointmentsAffected).toBe(0);
      expect(mockAppointmentModel.updateMany).not.toHaveBeenCalled();
    });
  });
});
