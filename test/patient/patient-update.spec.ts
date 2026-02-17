import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { PatientService } from '../../src/patient/patient.service';
import { Patient } from '../../src/database/schemas/patient.schema';
import { Appointment } from '../../src/database/schemas/appointment.schema';
import { AuditService } from '../../src/auth/audit.service';
import { ERROR_MESSAGES } from '../../src/common/utils/error-messages.constant';
import { UpdatePatientDto } from '../../src/patient/dto';

describe('PatientService - Update Operations', () => {
  let service: PatientService;
  let patientModel: any;
  let auditService: AuditService;

  const mockPatientId = new Types.ObjectId().toString();
  const mockUserId = new Types.ObjectId().toString();

  const mockPatient = {
    _id: new Types.ObjectId(mockPatientId),
    cardNumber: 'CARD123',
    patientNumber: 'PAT2024001',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: new Date('1990-01-01'),
    gender: 'male',
    status: 'Active',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    emergencyContactName: 'Jane Doe',
    emergencyContactPhone: '+0987654321',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPatientModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      exec: jest.fn(),
    };

    const mockAppointmentModel = {
      updateMany: jest.fn(),
    };

    const mockConnection = {
      startSession: jest.fn(),
    };

    const mockAuditService = {
      logSecurityEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientService,
        {
          provide: getModelToken(Patient.name),
          useValue: mockPatientModel,
        },
        {
          provide: getModelToken(Appointment.name),
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

    service = module.get<PatientService>(PatientService);
    patientModel = module.get(getModelToken(Patient.name));
    auditService = module.get<AuditService>(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Task 8.1: Verify updatePatient method handles all validations', () => {
    describe('cardNumber rejection', () => {
      it('should reject update when cardNumber is included', async () => {
        const updateDto: UpdatePatientDto = {
          cardNumber: 'NEWCARD456',
          firstName: 'Jane',
        } as any;

        await expect(
          service.updatePatient(mockPatientId, updateDto, mockUserId),
        ).rejects.toThrow(BadRequestException);

        await expect(
          service.updatePatient(mockPatientId, updateDto, mockUserId),
        ).rejects.toMatchObject({
          response: ERROR_MESSAGES.CARD_NUMBER_NOT_EDITABLE,
        });
      });

      it('should allow update when cardNumber is not included', async () => {
        const updateDto: UpdatePatientDto = {
          firstName: 'Jane',
          lastName: 'Smith',
        };

        patientModel.findOne.mockResolvedValue(null);
        patientModel.findOneAndUpdate.mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            ...mockPatient,
            ...updateDto,
          }),
        });

        const result = await service.updatePatient(mockPatientId, updateDto, mockUserId);

        expect(result.firstName).toBe('Jane');
        expect(result.lastName).toBe('Smith');
      });
    });

    describe('email uniqueness validation', () => {
      it('should reject update when email is already used by another patient', async () => {
        const updateDto: UpdatePatientDto = {
          email: 'existing@example.com',
        };

        const existingPatient = {
          _id: new Types.ObjectId(),
          email: 'existing@example.com',
        };

        patientModel.findOne.mockResolvedValue(existingPatient);

        await expect(
          service.updatePatient(mockPatientId, updateDto, mockUserId),
        ).rejects.toThrow(ConflictException);

        await expect(
          service.updatePatient(mockPatientId, updateDto, mockUserId),
        ).rejects.toMatchObject({
          response: ERROR_MESSAGES.DUPLICATE_EMAIL,
        });
      });

      it('should allow update when email is unique', async () => {
        const updateDto: UpdatePatientDto = {
          email: 'newemail@example.com',
        };

        patientModel.findOne.mockResolvedValue(null);
        patientModel.findOneAndUpdate.mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            ...mockPatient,
            ...updateDto,
          }),
        });

        const result = await service.updatePatient(mockPatientId, updateDto, mockUserId);

        expect(result.email).toBe('newemail@example.com');
      });

      it('should allow update when email belongs to the same patient', async () => {
        const updateDto: UpdatePatientDto = {
          email: 'john.doe@example.com',
        };

        patientModel.findOne.mockResolvedValue(null);
        patientModel.findOneAndUpdate.mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            ...mockPatient,
            ...updateDto,
          }),
        });

        const result = await service.updatePatient(mockPatientId, updateDto, mockUserId);

        expect(result.email).toBe('john.doe@example.com');
      });
    });

    describe('phone uniqueness validation', () => {
      it('should reject update when phone is already used by another patient', async () => {
        const updateDto: UpdatePatientDto = {
          phone: '+9999999999',
        };

        const existingPatient = {
          _id: new Types.ObjectId(),
          phone: '+9999999999',
        };

        // Mock for first service call
        patientModel.findOne.mockResolvedValueOnce(existingPatient);

        await expect(
          service.updatePatient(mockPatientId, updateDto, mockUserId),
        ).rejects.toThrow(ConflictException);

        // Mock for second service call
        patientModel.findOne.mockResolvedValueOnce(existingPatient);

        await expect(
          service.updatePatient(mockPatientId, updateDto, mockUserId),
        ).rejects.toMatchObject({
          response: ERROR_MESSAGES.DUPLICATE_PHONE,
        });
      });

      it('should allow update when phone is unique', async () => {
        const updateDto: UpdatePatientDto = {
          phone: '+1111111111',
        };

        patientModel.findOne.mockResolvedValue(null);
        patientModel.findOneAndUpdate.mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            ...mockPatient,
            ...updateDto,
          }),
        });

        const result = await service.updatePatient(mockPatientId, updateDto, mockUserId);

        expect(result.phone).toBe('+1111111111');
      });
    });

    describe('audit logging', () => {
      it('should log update event with changed fields', async () => {
        const updateDto: UpdatePatientDto = {
          firstName: 'Jane',
          email: 'jane@example.com',
        };

        patientModel.findOne.mockResolvedValue(null);
        patientModel.findOneAndUpdate.mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            ...mockPatient,
            ...updateDto,
          }),
        });

        await service.updatePatient(mockPatientId, updateDto, mockUserId);

        expect(auditService.logSecurityEvent).toHaveBeenCalledWith({
          eventType: 'PATIENT_UPDATED',
          userId: mockPatientId,
          actorId: mockUserId,
          ipAddress: '0.0.0.0',
          userAgent: 'System',
          timestamp: expect.any(Date),
          metadata: { changes: ['firstName', 'email'] },
        });
      });

      it('should not log when updatedByUserId is not provided', async () => {
        const updateDto: UpdatePatientDto = {
          firstName: 'Jane',
        };

        patientModel.findOne.mockResolvedValue(null);
        patientModel.findOneAndUpdate.mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            ...mockPatient,
            ...updateDto,
          }),
        });

        await service.updatePatient(mockPatientId, updateDto);

        expect(auditService.logSecurityEvent).not.toHaveBeenCalled();
      });
    });

    describe('invalid patient ID', () => {
      it('should throw BadRequestException for invalid patient ID format', async () => {
        const invalidId = 'invalid-id';
        const updateDto: UpdatePatientDto = {
          firstName: 'Jane',
        };

        await expect(
          service.updatePatient(invalidId, updateDto, mockUserId),
        ).rejects.toThrow(BadRequestException);

        await expect(
          service.updatePatient(invalidId, updateDto, mockUserId),
        ).rejects.toMatchObject({
          response: ERROR_MESSAGES.INVALID_PATIENT_ID,
        });
      });
    });
  });

  describe('Task 8.2: Add check for soft-deleted patient updates', () => {
    it('should return not found error for soft-deleted patient', async () => {
      const updateDto: UpdatePatientDto = {
        firstName: 'Jane',
      };

      patientModel.findOne.mockResolvedValue(null);
      patientModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null), // Patient not found (soft-deleted)
      });

      await expect(
        service.updatePatient(mockPatientId, updateDto, mockUserId),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.updatePatient(mockPatientId, updateDto, mockUserId),
      ).rejects.toMatchObject({
        response: ERROR_MESSAGES.PATIENT_NOT_FOUND,
      });
    });

    it('should verify deletedAt filter is applied in query', async () => {
      const updateDto: UpdatePatientDto = {
        firstName: 'Jane',
      };

      patientModel.findOne.mockResolvedValue(null);
      patientModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockPatient,
          ...updateDto,
        }),
      });

      await service.updatePatient(mockPatientId, updateDto, mockUserId);

      expect(patientModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: expect.any(Types.ObjectId),
          deletedAt: { $exists: false },
        }),
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should successfully update non-deleted patient', async () => {
      const updateDto: UpdatePatientDto = {
        firstName: 'Jane',
        lastName: 'Smith',
      };

      patientModel.findOne.mockResolvedValue(null);
      patientModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockPatient,
          ...updateDto,
          deletedAt: undefined,
        }),
      });

      const result = await service.updatePatient(mockPatientId, updateDto, mockUserId);

      expect(result).toBeDefined();
      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
    });
  });

  describe('Additional validation tests', () => {
    describe('dateOfBirth validation', () => {
      it('should reject future date of birth', async () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);

        const updateDto: UpdatePatientDto = {
          dateOfBirth: futureDate.toISOString(),
        };

        await expect(
          service.updatePatient(mockPatientId, updateDto, mockUserId),
        ).rejects.toThrow(BadRequestException);

        await expect(
          service.updatePatient(mockPatientId, updateDto, mockUserId),
        ).rejects.toMatchObject({
          response: ERROR_MESSAGES.DATE_OF_BIRTH_FUTURE,
        });
      });

      it('should reject date of birth indicating age > 150 years', async () => {
        const oldDate = new Date();
        oldDate.setFullYear(oldDate.getFullYear() - 151);

        const updateDto: UpdatePatientDto = {
          dateOfBirth: oldDate.toISOString(),
        };

        await expect(
          service.updatePatient(mockPatientId, updateDto, mockUserId),
        ).rejects.toThrow(BadRequestException);

        await expect(
          service.updatePatient(mockPatientId, updateDto, mockUserId),
        ).rejects.toMatchObject({
          response: ERROR_MESSAGES.DATE_OF_BIRTH_TOO_OLD,
        });
      });
    });

    describe('emergency contact validation', () => {
      it('should reject emergency contact name without phone', async () => {
        const updateDto: UpdatePatientDto = {
          emergencyContactName: 'Jane Doe',
          emergencyContactPhone: undefined,
        };

        await expect(
          service.updatePatient(mockPatientId, updateDto, mockUserId),
        ).rejects.toThrow(BadRequestException);

        await expect(
          service.updatePatient(mockPatientId, updateDto, mockUserId),
        ).rejects.toMatchObject({
          response: ERROR_MESSAGES.EMERGENCY_CONTACT_PHONE_REQUIRED,
        });
      });

      it('should reject emergency contact phone without name', async () => {
        const updateDto: UpdatePatientDto = {
          emergencyContactName: undefined,
          emergencyContactPhone: '+1234567890',
        };

        await expect(
          service.updatePatient(mockPatientId, updateDto, mockUserId),
        ).rejects.toThrow(BadRequestException);

        await expect(
          service.updatePatient(mockPatientId, updateDto, mockUserId),
        ).rejects.toMatchObject({
          response: ERROR_MESSAGES.EMERGENCY_CONTACT_NAME_REQUIRED,
        });
      });

      it('should allow both emergency contact name and phone', async () => {
        const updateDto: UpdatePatientDto = {
          emergencyContactName: 'Jane Doe',
          emergencyContactPhone: '+1234567890',
        };

        patientModel.findOne.mockResolvedValue(null);
        patientModel.findOneAndUpdate.mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            ...mockPatient,
            ...updateDto,
          }),
        });

        const result = await service.updatePatient(mockPatientId, updateDto, mockUserId);

        expect(result.emergencyContactName).toBe('Jane Doe');
        expect(result.emergencyContactPhone).toBe('+1234567890');
      });
    });
  });
});
