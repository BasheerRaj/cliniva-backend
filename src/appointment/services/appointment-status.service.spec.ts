import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { AppointmentStatusService } from './appointment-status.service';
import { AppointmentStatus } from '../constants/appointment-status.enum';
import { Types } from 'mongoose';

describe('AppointmentStatusService', () => {
  let service: AppointmentStatusService;
  let mockAppointmentModel: any;

  beforeEach(async () => {
    mockAppointmentModel = {
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentStatusService,
        {
          provide: getModelToken('Appointment'),
          useValue: mockAppointmentModel,
        },
      ],
    }).compile();

    service = module.get<AppointmentStatusService>(AppointmentStatusService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateStatusSpecificRequirements', () => {
    it('should throw error when completing without notes', () => {
      expect(() => {
        service.validateStatusSpecificRequirements(
          AppointmentStatus.COMPLETED,
          {},
        );
      }).toThrow(BadRequestException);
    });

    it('should throw error when cancelling without reason', () => {
      expect(() => {
        service.validateStatusSpecificRequirements(
          AppointmentStatus.CANCELLED,
          {},
        );
      }).toThrow(BadRequestException);
    });

    it('should not throw error when completing with notes', () => {
      expect(() => {
        service.validateStatusSpecificRequirements(
          AppointmentStatus.COMPLETED,
          { completionNotes: 'Patient examined successfully' },
        );
      }).not.toThrow();
    });

    it('should not throw error when cancelling with reason', () => {
      expect(() => {
        service.validateStatusSpecificRequirements(
          AppointmentStatus.CANCELLED,
          { cancellationReason: 'Patient requested cancellation' },
        );
      }).not.toThrow();
    });

    it('should accept notes field for completion', () => {
      expect(() => {
        service.validateStatusSpecificRequirements(
          AppointmentStatus.COMPLETED,
          { notes: 'Patient examined successfully' },
        );
      }).not.toThrow();
    });

    it('should accept reason field for cancellation', () => {
      expect(() => {
        service.validateStatusSpecificRequirements(
          AppointmentStatus.CANCELLED,
          { reason: 'Patient requested cancellation' },
        );
      }).not.toThrow();
    });
  });

  describe('changeStatus', () => {
    const appointmentId = new Types.ObjectId().toString();
    const userId = new Types.ObjectId().toString();

    it('should throw error for invalid appointment ID', async () => {
      await expect(
        service.changeStatus('invalid-id', AppointmentStatus.CONFIRMED, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when appointment not found', async () => {
      mockAppointmentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.changeStatus(appointmentId, AppointmentStatus.CONFIRMED, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error for invalid status transition', async () => {
      const mockAppointment = {
        _id: new Types.ObjectId(appointmentId),
        status: AppointmentStatus.COMPLETED,
      };

      mockAppointmentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAppointment),
      });

      await expect(
        service.changeStatus(
          appointmentId,
          AppointmentStatus.SCHEDULED,
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully change status from scheduled to confirmed', async () => {
      const mockAppointment = {
        _id: new Types.ObjectId(appointmentId),
        status: AppointmentStatus.SCHEDULED,
      };

      const mockUpdatedAppointment = {
        ...mockAppointment,
        status: AppointmentStatus.CONFIRMED,
        statusHistory: [
          {
            status: AppointmentStatus.CONFIRMED,
            changedAt: expect.any(Date),
            changedBy: new Types.ObjectId(userId),
          },
        ],
      };

      mockAppointmentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAppointment),
      });

      mockAppointmentModel.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockUpdatedAppointment),
      });

      const result = await service.changeStatus(
        appointmentId,
        AppointmentStatus.CONFIRMED,
        userId,
      );

      expect(result).toBeDefined();
      expect(result.status).toBe(AppointmentStatus.CONFIRMED);
    });

    it('should throw error when completing without notes', async () => {
      const mockAppointment = {
        _id: new Types.ObjectId(appointmentId),
        status: AppointmentStatus.IN_PROGRESS,
      };

      mockAppointmentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAppointment),
      });

      await expect(
        service.changeStatus(appointmentId, AppointmentStatus.COMPLETED, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully complete appointment with notes', async () => {
      const mockAppointment = {
        _id: new Types.ObjectId(appointmentId),
        status: AppointmentStatus.IN_PROGRESS,
      };

      const mockUpdatedAppointment = {
        ...mockAppointment,
        status: AppointmentStatus.COMPLETED,
        completionNotes: 'Appointment completed successfully',
      };

      mockAppointmentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAppointment),
      });

      mockAppointmentModel.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockUpdatedAppointment),
      });

      const result = await service.changeStatus(
        appointmentId,
        AppointmentStatus.COMPLETED,
        userId,
        { completionNotes: 'Appointment completed successfully' },
      );

      expect(result).toBeDefined();
      expect(result.status).toBe(AppointmentStatus.COMPLETED);
    });

    it('should throw error when cancelling without reason', async () => {
      const mockAppointment = {
        _id: new Types.ObjectId(appointmentId),
        status: AppointmentStatus.SCHEDULED,
      };

      mockAppointmentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAppointment),
      });

      await expect(
        service.changeStatus(appointmentId, AppointmentStatus.CANCELLED, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully cancel appointment with reason', async () => {
      const mockAppointment = {
        _id: new Types.ObjectId(appointmentId),
        status: AppointmentStatus.SCHEDULED,
      };

      const mockUpdatedAppointment = {
        ...mockAppointment,
        status: AppointmentStatus.CANCELLED,
        cancellationReason: 'Patient requested cancellation',
      };

      mockAppointmentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAppointment),
      });

      mockAppointmentModel.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockUpdatedAppointment),
      });

      const result = await service.changeStatus(
        appointmentId,
        AppointmentStatus.CANCELLED,
        userId,
        { cancellationReason: 'Patient requested cancellation' },
      );

      expect(result).toBeDefined();
      expect(result.status).toBe(AppointmentStatus.CANCELLED);
    });
  });
});
