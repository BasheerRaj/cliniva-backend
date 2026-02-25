import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppointmentLifecycleService } from './appointment-lifecycle.service';
import { AppointmentConflictService } from '../appointment-conflict.service';
import { AppointmentWorkingHoursService } from './appointment-working-hours.service';
import { Appointment } from '../../database/schemas/appointment.schema';
import { AppointmentStatus } from '../constants/appointment-status.enum';
import { CompleteAppointmentDto } from '../dto/complete-appointment.dto';
import { RescheduleDto } from '../dto/reschedule.dto';

describe('AppointmentLifecycleService', () => {
  let service: AppointmentLifecycleService;
  let appointmentModel: Model<Appointment>;
  let conflictService: AppointmentConflictService;
  let workingHoursService: AppointmentWorkingHoursService;

  const mockAppointmentId = new Types.ObjectId().toString();
  const mockUserId = new Types.ObjectId().toString();
  const mockDoctorId = new Types.ObjectId();
  const mockClinicId = new Types.ObjectId();
  const mockPatientId = new Types.ObjectId();
  const mockServiceId = new Types.ObjectId();

  const mockAppointment = {
    _id: new Types.ObjectId(mockAppointmentId),
    patientId: mockPatientId,
    doctorId: mockDoctorId,
    clinicId: mockClinicId,
    serviceId: mockServiceId,
    appointmentDate: new Date('2024-03-20'),
    appointmentTime: '10:00',
    duration: 30,
    status: AppointmentStatus.IN_PROGRESS,
    save: jest.fn(),
  };

  const mockPopulatedAppointment = {
    ...mockAppointment,
    patientId: { firstName: 'John', lastName: 'Doe' },
    doctorId: { firstName: 'Dr. Smith', lastName: 'Johnson' },
    clinicId: { name: 'Test Clinic' },
    serviceId: { name: 'Consultation', durationMinutes: 30 },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentLifecycleService,
        {
          provide: getModelToken('Appointment'),
          useValue: {
            findOne: jest.fn(),
            findByIdAndUpdate: jest.fn(),
          },
        },
        {
          provide: AppointmentConflictService,
          useValue: {
            checkConflicts: jest.fn(),
            throwConflictError: jest.fn(),
          },
        },
        {
          provide: AppointmentWorkingHoursService,
          useValue: {
            validateWorkingHours: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AppointmentLifecycleService>(
      AppointmentLifecycleService,
    );
    appointmentModel = module.get<Model<Appointment>>(
      getModelToken('Appointment'),
    );
    conflictService = module.get<AppointmentConflictService>(
      AppointmentConflictService,
    );
    workingHoursService = module.get<AppointmentWorkingHoursService>(
      AppointmentWorkingHoursService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('completeAppointment', () => {
    const completeDto: CompleteAppointmentDto = {
      doctorNotes: 'Patient responded well to treatment',
    };

    it('should complete appointment successfully', async () => {
      jest.spyOn(appointmentModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAppointment),
      } as any);

      jest.spyOn(appointmentModel, 'findByIdAndUpdate').mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPopulatedAppointment),
      } as any);

      const result = await service.completeAppointment(
        mockAppointmentId,
        completeDto,
        mockUserId,
      );

      expect(result).toBeDefined();
      expect(appointmentModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockAppointmentId,
        expect.objectContaining({
          status: AppointmentStatus.COMPLETED,
          completionNotes: completeDto.doctorNotes,
          actualEndTime: expect.any(Date),
        }),
        expect.any(Object),
      );
    });

    it('should throw error for invalid appointment ID', async () => {
      await expect(
        service.completeAppointment('invalid-id', completeDto, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if appointment not found', async () => {
      jest.spyOn(appointmentModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(
        service.completeAppointment(mockAppointmentId, completeDto, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if status is not in_progress', async () => {
      const scheduledAppointment = {
        ...mockAppointment,
        status: AppointmentStatus.SCHEDULED,
      };

      jest.spyOn(appointmentModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(scheduledAppointment),
      } as any);

      await expect(
        service.completeAppointment(mockAppointmentId, completeDto, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if doctorNotes are empty', async () => {
      jest.spyOn(appointmentModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAppointment),
      } as any);

      const emptyNotesDto: CompleteAppointmentDto = {
        doctorNotes: '   ',
      };

      await expect(
        service.completeAppointment(
          mockAppointmentId,
          emptyNotesDto,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelAppointment', () => {
    const cancellationReason = 'Patient requested cancellation';

    it('should cancel appointment successfully', async () => {
      jest.spyOn(appointmentModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAppointment),
      } as any);

      jest.spyOn(appointmentModel, 'findByIdAndUpdate').mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPopulatedAppointment),
      } as any);

      const result = await service.cancelAppointment(
        mockAppointmentId,
        cancellationReason,
        mockUserId,
        false,
      );

      expect(result).toBeDefined();
      expect(appointmentModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockAppointmentId,
        expect.objectContaining({
          status: AppointmentStatus.CANCELLED,
          cancellationReason: cancellationReason,
          cancelledAt: expect.any(Date),
          cancelledBy: expect.any(Types.ObjectId),
          rescheduleRequested: false,
        }),
        expect.any(Object),
      );
    });

    it('should throw error for invalid appointment ID', async () => {
      await expect(
        service.cancelAppointment(
          'invalid-id',
          cancellationReason,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if appointment not found', async () => {
      jest.spyOn(appointmentModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(
        service.cancelAppointment(
          mockAppointmentId,
          cancellationReason,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if trying to cancel completed appointment', async () => {
      const completedAppointment = {
        ...mockAppointment,
        status: AppointmentStatus.COMPLETED,
      };

      jest.spyOn(appointmentModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(completedAppointment),
      } as any);

      await expect(
        service.cancelAppointment(
          mockAppointmentId,
          cancellationReason,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if cancellationReason is empty', async () => {
      jest.spyOn(appointmentModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAppointment),
      } as any);

      await expect(
        service.cancelAppointment(mockAppointmentId, '   ', mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set rescheduleRequested flag when provided', async () => {
      jest.spyOn(appointmentModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAppointment),
      } as any);

      jest.spyOn(appointmentModel, 'findByIdAndUpdate').mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPopulatedAppointment),
      } as any);

      await service.cancelAppointment(
        mockAppointmentId,
        cancellationReason,
        mockUserId,
        true,
      );

      expect(appointmentModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockAppointmentId,
        expect.objectContaining({
          rescheduleRequested: true,
        }),
        expect.any(Object),
      );
    });
  });

  describe('rescheduleAppointment', () => {
    const rescheduleDto: RescheduleDto = {
      newDate: new Date('2024-03-25'),
      newTime: '14:00',
      reason: 'Patient requested different time',
    };

    it('should reschedule appointment successfully', async () => {
      jest.spyOn(appointmentModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAppointment),
      } as any);

      jest
        .spyOn(workingHoursService, 'validateWorkingHours')
        .mockResolvedValue(undefined);

      jest.spyOn(conflictService, 'checkConflicts').mockResolvedValue([]);

      jest.spyOn(appointmentModel, 'findByIdAndUpdate').mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPopulatedAppointment),
      } as any);

      const result = await service.rescheduleAppointment(
        mockAppointmentId,
        rescheduleDto,
        mockUserId,
      );

      expect(result).toBeDefined();
      expect(workingHoursService.validateWorkingHours).toHaveBeenCalledWith(
        mockClinicId.toString(),
        mockDoctorId.toString(),
        rescheduleDto.newDate,
        rescheduleDto.newTime,
        mockAppointment.duration,
      );
      expect(conflictService.checkConflicts).toHaveBeenCalledWith(
        mockDoctorId.toString(),
        rescheduleDto.newDate,
        rescheduleDto.newTime,
        mockAppointment.duration,
        mockAppointmentId,
      );
      expect(appointmentModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockAppointmentId,
        expect.objectContaining({
          appointmentDate: rescheduleDto.newDate,
          appointmentTime: rescheduleDto.newTime,
          $push: {
            rescheduleHistory: expect.objectContaining({
              previousDate: mockAppointment.appointmentDate,
              previousTime: mockAppointment.appointmentTime,
              newDate: rescheduleDto.newDate,
              newTime: rescheduleDto.newTime,
              reason: rescheduleDto.reason,
            }),
          },
        }),
        expect.any(Object),
      );
    });

    it('should throw error for invalid appointment ID', async () => {
      await expect(
        service.rescheduleAppointment('invalid-id', rescheduleDto, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if appointment not found', async () => {
      jest.spyOn(appointmentModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(
        service.rescheduleAppointment(
          mockAppointmentId,
          rescheduleDto,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if trying to reschedule completed appointment', async () => {
      const completedAppointment = {
        ...mockAppointment,
        status: AppointmentStatus.COMPLETED,
      };

      jest.spyOn(appointmentModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(completedAppointment),
      } as any);

      await expect(
        service.rescheduleAppointment(
          mockAppointmentId,
          rescheduleDto,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if working hours validation fails', async () => {
      jest.spyOn(appointmentModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAppointment),
      } as any);

      jest
        .spyOn(workingHoursService, 'validateWorkingHours')
        .mockRejectedValue(
          new ConflictException({
            message: {
              ar: 'خارج ساعات العمل',
              en: 'Outside working hours',
            },
          }),
        );

      await expect(
        service.rescheduleAppointment(
          mockAppointmentId,
          rescheduleDto,
          mockUserId,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw error if conflicts detected', async () => {
      const conflictingAppointment = {
        _id: new Types.ObjectId(),
        appointmentTime: '14:00',
        duration: 30,
      };

      jest.spyOn(appointmentModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAppointment),
      } as any);

      jest
        .spyOn(workingHoursService, 'validateWorkingHours')
        .mockResolvedValue(undefined);

      jest
        .spyOn(conflictService, 'checkConflicts')
        .mockResolvedValue([conflictingAppointment] as any);

      jest
        .spyOn(conflictService, 'throwConflictError')
        .mockImplementation(() => {
          throw new ConflictException({
            message: {
              ar: 'يوجد تعارض',
              en: 'Conflict detected',
            },
          });
        });

      await expect(
        service.rescheduleAppointment(
          mockAppointmentId,
          rescheduleDto,
          mockUserId,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should use default reason if not provided', async () => {
      const dtoWithoutReason: RescheduleDto = {
        newDate: new Date('2024-03-25'),
        newTime: '14:00',
      };

      jest.spyOn(appointmentModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAppointment),
      } as any);

      jest
        .spyOn(workingHoursService, 'validateWorkingHours')
        .mockResolvedValue(undefined);

      jest.spyOn(conflictService, 'checkConflicts').mockResolvedValue([]);

      jest.spyOn(appointmentModel, 'findByIdAndUpdate').mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPopulatedAppointment),
      } as any);

      await service.rescheduleAppointment(
        mockAppointmentId,
        dtoWithoutReason,
        mockUserId,
      );

      expect(appointmentModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockAppointmentId,
        expect.objectContaining({
          $push: {
            rescheduleHistory: expect.objectContaining({
              reason: 'Rescheduled',
            }),
          },
        }),
        expect.any(Object),
      );
    });
  });
});
