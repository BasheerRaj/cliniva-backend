import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { DoctorDeactivationService } from './doctor-deactivation.service';
import { Appointment } from '../database/schemas/appointment.schema';
import { User } from '../database/schemas/user.schema';
import { EmailService } from '../auth/email.service';
import { AuditService } from '../auth/audit.service';
import { Types } from 'mongoose';

describe('DoctorDeactivationService', () => {
  let service: DoctorDeactivationService;
  let appointmentModel: any;
  let userModel: any;
  let emailService: any;
  let auditService: any;
  let connection: any;

  beforeEach(async () => {
    // Mock models
    appointmentModel = {
      find: jest.fn().mockReturnThis(),
      findById: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      exec: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    userModel = {
      findById: jest.fn().mockReturnThis(),
      session: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    emailService = {
      sendAppointmentNotification: jest.fn().mockResolvedValue(undefined),
    };

    auditService = {
      logSecurityEvent: jest.fn().mockResolvedValue(undefined),
    };

    // Mock MongoDB connection with session support
    const mockSession = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    };

    connection = {
      startSession: jest.fn().mockResolvedValue(mockSession),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoctorDeactivationService,
        {
          provide: getModelToken(Appointment.name),
          useValue: appointmentModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: userModel,
        },
        {
          provide: getConnectionToken(),
          useValue: connection,
        },
        {
          provide: EmailService,
          useValue: emailService,
        },
        {
          provide: AuditService,
          useValue: auditService,
        },
      ],
    }).compile();

    service = module.get<DoctorDeactivationService>(DoctorDeactivationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFutureAppointments', () => {
    it('should return future appointments for a doctor', async () => {
      const doctorId = new Types.ObjectId().toString();
      const mockAppointments = [
        {
          _id: new Types.ObjectId(),
          doctorId: new Types.ObjectId(doctorId),
          appointmentDate: new Date('2025-12-31'),
          appointmentTime: '10:00',
          status: 'scheduled',
        },
      ];

      appointmentModel.exec.mockResolvedValue(mockAppointments);

      const result = await service.getFutureAppointments(doctorId);

      expect(result).toEqual(mockAppointments);
      expect(appointmentModel.find).toHaveBeenCalled();
      expect(appointmentModel.populate).toHaveBeenCalled();
      expect(appointmentModel.sort).toHaveBeenCalled();
    });

    it('should throw error for invalid doctor ID', async () => {
      await expect(service.getFutureAppointments('invalid-id')).rejects.toThrow();
    });
  });

  describe('transferAppointments', () => {
    it('should validate doctor IDs', async () => {
      const fromDoctorId = 'invalid';
      const toDoctorId = new Types.ObjectId().toString();
      const appointmentIds = [new Types.ObjectId().toString()];
      const actorId = new Types.ObjectId().toString();

      await expect(
        service.transferAppointments(fromDoctorId, toDoctorId, appointmentIds, actorId),
      ).rejects.toThrow();
    });
  });

  describe('markForRescheduling', () => {
    it('should validate doctor ID', async () => {
      const doctorId = 'invalid';
      const appointmentIds = [new Types.ObjectId().toString()];
      const reason = 'Doctor deactivation';
      const actorId = new Types.ObjectId().toString();

      await expect(
        service.markForRescheduling(doctorId, appointmentIds, reason, actorId),
      ).rejects.toThrow();
    });
  });

  describe('deactivateDoctor', () => {
    it('should validate doctor ID', async () => {
      const doctorId = 'invalid';
      const options = {
        transferAppointments: false,
        skipTransfer: true,
        reason: 'Test',
        actorId: new Types.ObjectId().toString(),
      };

      await expect(service.deactivateDoctor(doctorId, options)).rejects.toThrow();
    });
  });
});
