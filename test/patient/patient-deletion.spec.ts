import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PatientService } from '../../src/patient/patient.service';
import { AuditService } from '../../src/auth/audit.service';
import { Patient } from '../../src/database/schemas/patient.schema';
import { Appointment } from '../../src/database/schemas/appointment.schema';

describe('PatientService - Deletion', () => {
  let service: PatientService;
  let patientModel: Model<Patient>;
  let appointmentModel: Model<Appointment>;
  let auditService: AuditService;

  const mockPatientId = new Types.ObjectId().toString();
  const mockUserId = new Types.ObjectId().toString();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientService,
        {
          provide: getModelToken('Patient'),
          useValue: {
            findOne: jest.fn().mockReturnValue({
              exec: jest.fn(),
            }),
            findOneAndUpdate: jest.fn().mockReturnValue({
              exec: jest.fn(),
            }),
            countDocuments: jest.fn(),
            find: jest.fn(),
            aggregate: jest.fn(),
          },
        },
        {
          provide: getModelToken('Appointment'),
          useValue: {
            updateMany: jest.fn(),
          },
        },
        {
          provide: 'DatabaseConnection',
          useValue: {
            startSession: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            logSecurityEvent: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PatientService>(PatientService);
    patientModel = module.get<Model<Patient>>(getModelToken('Patient'));
    appointmentModel = module.get<Model<Appointment>>(
      getModelToken('Appointment'),
    );
    auditService = module.get<AuditService>(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deletePatient', () => {
    it('should throw BadRequestException for invalid patient ID', async () => {
      await expect(
        service.deletePatient('invalid-id', mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if patient does not exist', async () => {
      (patientModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.deletePatient(mockPatientId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if patient is Active', async () => {
      const mockActivePatient = {
        _id: new Types.ObjectId(mockPatientId),
        status: 'Active',
        firstName: 'John',
        lastName: 'Doe',
      } as any;

      (patientModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockActivePatient),
      });

      await expect(
        service.deletePatient(mockPatientId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully soft delete an Inactive patient', async () => {
      const mockInactivePatient = {
        _id: new Types.ObjectId(mockPatientId),
        status: 'Inactive',
        firstName: 'John',
        lastName: 'Doe',
      } as any;

      const mockDeletedPatient = {
        ...mockInactivePatient,
        deletedAt: new Date(),
      };

      (patientModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockInactivePatient),
      });
      (patientModel.findOneAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDeletedPatient),
      });
      jest
        .spyOn(auditService, 'logSecurityEvent')
        .mockResolvedValueOnce(undefined);

      await service.deletePatient(mockPatientId, mockUserId);

      expect(patientModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: new Types.ObjectId(mockPatientId),
          deletedAt: { $exists: false },
        },
        {
          $set: {
            deletedAt: expect.any(Date),
            updatedBy: new Types.ObjectId(mockUserId),
          },
        },
      );

      expect(auditService.logSecurityEvent).toHaveBeenCalledWith({
        eventType: 'PATIENT_DELETED',
        userId: mockPatientId,
        actorId: mockUserId,
        ipAddress: '0.0.0.0',
        userAgent: 'System',
        timestamp: expect.any(Date),
        metadata: { action: 'Patient record soft deleted' },
      });
    });

    it('should throw NotFoundException if patient was already soft deleted', async () => {
      const mockInactivePatient = {
        _id: new Types.ObjectId(mockPatientId),
        status: 'Inactive',
        firstName: 'John',
        lastName: 'Doe',
      } as any;

      (patientModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockInactivePatient),
      });
      (patientModel.findOneAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.deletePatient(mockPatientId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should soft delete without audit log if no userId provided', async () => {
      const mockInactivePatient = {
        _id: new Types.ObjectId(mockPatientId),
        status: 'Inactive',
        firstName: 'John',
        lastName: 'Doe',
      } as any;

      const mockDeletedPatient = {
        ...mockInactivePatient,
        deletedAt: new Date(),
      };

      (patientModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockInactivePatient),
      });
      (patientModel.findOneAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDeletedPatient),
      });
      jest
        .spyOn(auditService, 'logSecurityEvent')
        .mockResolvedValueOnce(undefined);

      await service.deletePatient(mockPatientId);

      expect(patientModel.findOneAndUpdate).toHaveBeenCalled();
      expect(auditService.logSecurityEvent).not.toHaveBeenCalled();
    });
  });
});
