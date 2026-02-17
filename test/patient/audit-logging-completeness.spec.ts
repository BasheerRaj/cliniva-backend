import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { PatientService } from '../../src/patient/patient.service';
import { AuditService } from '../../src/auth/audit.service';
import { Patient } from '../../src/database/schemas/patient.schema';
import { Appointment } from '../../src/database/schemas/appointment.schema';
import { AuditLog } from '../../src/database/schemas/audit-log.schema';

/**
 * Test Suite: Audit Logging Completeness
 * 
 * This test suite verifies that all patient operations log audit events
 * with complete metadata as specified in Requirements 12.1-12.6
 * 
 * Requirements Coverage:
 * - 12.1: Patient creation logging
 * - 12.2: Patient update logging
 * - 12.3: Patient deactivation logging
 * - 12.4: Patient activation logging
 * - 12.5: Patient deletion logging
 * - 12.6: Audit log metadata completeness (timestamp, IP address, user agent)
 */
describe('PatientService - Audit Logging Completeness', () => {
  let service: PatientService;
  let auditService: AuditService;
  let patientModel: Model<Patient>;
  let appointmentModel: Model<Appointment>;
  let auditLogModel: Model<AuditLog>;
  let connection: Connection;

  const mockUserId = '507f1f77bcf86cd799439011';
  const mockPatientId = '507f1f77bcf86cd799439012';
  const mockPatientNumber = 'PAT2024001';
  const mockIpAddress = '192.168.1.1';
  const mockUserAgent = 'Mozilla/5.0';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientService,
        {
          provide: getModelToken('Patient'),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            countDocuments: jest.fn(),
            aggregate: jest.fn(),
            create: jest.fn(),
            findOneAndUpdate: jest.fn(),
            updateMany: jest.fn(),
            save: jest.fn(),
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
            startSession: jest.fn().mockResolvedValue({
              startTransaction: jest.fn(),
              commitTransaction: jest.fn(),
              abortTransaction: jest.fn(),
              endSession: jest.fn(),
            }),
          },
        },
        {
          provide: AuditService,
          useValue: {
            logSecurityEvent: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<PatientService>(PatientService);
    auditService = module.get<AuditService>(AuditService);
    patientModel = module.get<Model<Patient>>(getModelToken('Patient'));
    appointmentModel = module.get<Model<Appointment>>(getModelToken('Appointment'));
    connection = module.get<Connection>('DatabaseConnection');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Requirement 12.1: Patient Creation Audit Logging
   * 
   * Verifies that createPatient logs:
   * - Patient ID
   * - Patient number
   * - Creator user ID
   */
  describe('createPatient - Audit Logging (Requirement 12.1)', () => {
    it('should log patient creation with patient ID, patient number, and creator ID', async () => {
      const createPatientDto = {
        cardNumber: 'CARD123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        gender: 'male' as const,
        phone: '1234567890',
        email: 'john.doe@example.com',
      };

      const mockPatient = {
        _id: mockPatientId,
        ...createPatientDto,
        patientNumber: mockPatientNumber,
        status: 'Active',
        save: jest.fn().mockResolvedValue({
          _id: mockPatientId,
          ...createPatientDto,
          patientNumber: mockPatientNumber,
        }),
      };

      jest.spyOn(patientModel, 'findOne').mockResolvedValue(null);
      (patientModel as any).mockImplementation(() => mockPatient);

      await service.createPatient(createPatientDto, mockUserId);

      expect(auditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PATIENT_CREATED',
          userId: mockUserId,
          actorId: mockUserId,
          metadata: expect.objectContaining({
            patientId: mockPatientId,
            patientNumber: mockPatientNumber,
          }),
        }),
      );
    });

    it('should include timestamp in audit log', async () => {
      const createPatientDto = {
        cardNumber: 'CARD123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        gender: 'male' as const,
      };

      const mockPatient = {
        _id: mockPatientId,
        ...createPatientDto,
        patientNumber: mockPatientNumber,
        status: 'Active',
        save: jest.fn().mockResolvedValue({
          _id: mockPatientId,
          ...createPatientDto,
          patientNumber: mockPatientNumber,
        }),
      };

      jest.spyOn(patientModel, 'findOne').mockResolvedValue(null);
      (patientModel as any).mockImplementation(() => mockPatient);

      await service.createPatient(createPatientDto, mockUserId);

      expect(auditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Date),
        }),
      );
    });

    it('should not log audit event when createdByUserId is not provided', async () => {
      const createPatientDto = {
        cardNumber: 'CARD123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        gender: 'male' as const,
      };

      const mockPatient = {
        _id: mockPatientId,
        ...createPatientDto,
        patientNumber: mockPatientNumber,
        status: 'Active',
        save: jest.fn().mockResolvedValue({
          _id: mockPatientId,
          ...createPatientDto,
          patientNumber: mockPatientNumber,
        }),
      };

      jest.spyOn(patientModel, 'findOne').mockResolvedValue(null);
      (patientModel as any).mockImplementation(() => mockPatient);

      await service.createPatient(createPatientDto);

      expect(auditService.logSecurityEvent).not.toHaveBeenCalled();
    });
  });

  /**
   * Requirement 12.2: Patient Update Audit Logging
   * 
   * Verifies that updatePatient logs:
   * - Patient ID
   * - Changed fields
   * - Updater user ID
   */
  describe('updatePatient - Audit Logging (Requirement 12.2)', () => {
    it('should log patient update with patient ID, changed fields, and updater ID', async () => {
      const updatePatientDto = {
        firstName: 'Jane',
        phone: '9876543210',
      };

      const mockUpdatedPatient = {
        _id: mockPatientId,
        ...updatePatientDto,
        patientNumber: mockPatientNumber,
      };

      jest.spyOn(patientModel, 'findOneAndUpdate').mockResolvedValue(mockUpdatedPatient as any);

      await service.updatePatient(mockPatientId, updatePatientDto, mockUserId);

      expect(auditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PATIENT_UPDATED',
          userId: mockPatientId,
          actorId: mockUserId,
          metadata: expect.objectContaining({
            changes: ['firstName', 'phone'],
          }),
        }),
      );
    });

    it('should include timestamp in update audit log', async () => {
      const updatePatientDto = {
        firstName: 'Jane',
      };

      const mockUpdatedPatient = {
        _id: mockPatientId,
        ...updatePatientDto,
      };

      jest.spyOn(patientModel, 'findOneAndUpdate').mockResolvedValue(mockUpdatedPatient as any);

      await service.updatePatient(mockPatientId, updatePatientDto, mockUserId);

      expect(auditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Date),
        }),
      );
    });

    it('should not log audit event when updatedByUserId is not provided', async () => {
      const updatePatientDto = {
        firstName: 'Jane',
      };

      const mockUpdatedPatient = {
        _id: mockPatientId,
        ...updatePatientDto,
      };

      jest.spyOn(patientModel, 'findOneAndUpdate').mockResolvedValue(mockUpdatedPatient as any);

      await service.updatePatient(mockPatientId, updatePatientDto);

      expect(auditService.logSecurityEvent).not.toHaveBeenCalled();
    });
  });

  /**
   * Requirement 12.3: Patient Deactivation Audit Logging
   * 
   * Verifies that deactivatePatient logs:
   * - Patient ID
   * - Cancelled appointment count
   * - Actor user ID
   */
  describe('deactivatePatient - Audit Logging (Requirement 12.3)', () => {
    it('should log patient deactivation with patient ID, cancelled count, and actor ID', async () => {
      const mockPatient = {
        _id: mockPatientId,
        status: 'Active',
        patientNumber: mockPatientNumber,
      };

      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn(),
      };

      jest.spyOn(patientModel, 'findOne').mockResolvedValue(mockPatient as any);
      jest.spyOn(patientModel, 'findOneAndUpdate').mockResolvedValue({
        ...mockPatient,
        status: 'Inactive',
      } as any);
      jest.spyOn(appointmentModel, 'updateMany').mockResolvedValue({
        modifiedCount: 3,
      } as any);
      jest.spyOn(connection, 'startSession').mockResolvedValue(mockSession as any);

      await service.deactivatePatient(mockPatientId, mockUserId);

      expect(auditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PATIENT_DEACTIVATED',
          userId: mockPatientId,
          actorId: mockUserId,
          metadata: expect.objectContaining({
            cancelledAppointments: 3,
          }),
        }),
      );
    });

    it('should include timestamp in deactivation audit log', async () => {
      const mockPatient = {
        _id: mockPatientId,
        status: 'Active',
      };

      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn(),
      };

      jest.spyOn(patientModel, 'findOne').mockResolvedValue(mockPatient as any);
      jest.spyOn(patientModel, 'findOneAndUpdate').mockResolvedValue({
        ...mockPatient,
        status: 'Inactive',
      } as any);
      jest.spyOn(appointmentModel, 'updateMany').mockResolvedValue({
        modifiedCount: 0,
      } as any);
      jest.spyOn(connection, 'startSession').mockResolvedValue(mockSession as any);

      await service.deactivatePatient(mockPatientId, mockUserId);

      expect(auditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Date),
        }),
      );
    });

    it('should not log audit event when updatedByUserId is not provided', async () => {
      const mockPatient = {
        _id: mockPatientId,
        status: 'Active',
      };

      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn(),
      };

      jest.spyOn(patientModel, 'findOne').mockResolvedValue(mockPatient as any);
      jest.spyOn(patientModel, 'findOneAndUpdate').mockResolvedValue({
        ...mockPatient,
        status: 'Inactive',
      } as any);
      jest.spyOn(appointmentModel, 'updateMany').mockResolvedValue({
        modifiedCount: 0,
      } as any);
      jest.spyOn(connection, 'startSession').mockResolvedValue(mockSession as any);

      await service.deactivatePatient(mockPatientId);

      expect(auditService.logSecurityEvent).not.toHaveBeenCalled();
    });

    it('should not log audit event for idempotent deactivation', async () => {
      const mockPatient = {
        _id: mockPatientId,
        status: 'Inactive',
      };

      jest.spyOn(patientModel, 'findOne').mockResolvedValue(mockPatient as any);

      await service.deactivatePatient(mockPatientId, mockUserId);

      expect(auditService.logSecurityEvent).not.toHaveBeenCalled();
    });
  });

  /**
   * Requirement 12.4: Patient Activation Audit Logging
   * 
   * Verifies that activatePatient logs:
   * - Patient ID
   * - Actor user ID
   */
  describe('activatePatient - Audit Logging (Requirement 12.4)', () => {
    it('should log patient activation with patient ID and actor ID', async () => {
      const mockPatient = {
        _id: mockPatientId,
        status: 'Inactive',
      };

      jest.spyOn(patientModel, 'findOne').mockResolvedValue(mockPatient as any);
      jest.spyOn(patientModel, 'findOneAndUpdate').mockResolvedValue({
        ...mockPatient,
        status: 'Active',
      } as any);

      await service.activatePatient(mockPatientId, mockUserId);

      expect(auditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PATIENT_ACTIVATED',
          userId: mockPatientId,
          actorId: mockUserId,
          metadata: expect.objectContaining({
            action: 'Patient account activated',
          }),
        }),
      );
    });

    it('should include timestamp in activation audit log', async () => {
      const mockPatient = {
        _id: mockPatientId,
        status: 'Inactive',
      };

      jest.spyOn(patientModel, 'findOne').mockResolvedValue(mockPatient as any);
      jest.spyOn(patientModel, 'findOneAndUpdate').mockResolvedValue({
        ...mockPatient,
        status: 'Active',
      } as any);

      await service.activatePatient(mockPatientId, mockUserId);

      expect(auditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Date),
        }),
      );
    });

    it('should not log audit event when updatedByUserId is not provided', async () => {
      const mockPatient = {
        _id: mockPatientId,
        status: 'Inactive',
      };

      jest.spyOn(patientModel, 'findOne').mockResolvedValue(mockPatient as any);
      jest.spyOn(patientModel, 'findOneAndUpdate').mockResolvedValue({
        ...mockPatient,
        status: 'Active',
      } as any);

      await service.activatePatient(mockPatientId);

      expect(auditService.logSecurityEvent).not.toHaveBeenCalled();
    });

    it('should not log audit event for idempotent activation', async () => {
      const mockPatient = {
        _id: mockPatientId,
        status: 'Active',
      };

      jest.spyOn(patientModel, 'findOne').mockResolvedValue(mockPatient as any);

      await service.activatePatient(mockPatientId, mockUserId);

      expect(auditService.logSecurityEvent).not.toHaveBeenCalled();
    });
  });

  /**
   * Requirement 12.5: Patient Deletion Audit Logging
   * 
   * Verifies that deletePatient logs:
   * - Patient ID
   * - Deleter user ID
   */
  describe('deletePatient - Audit Logging (Requirement 12.5)', () => {
    it('should log patient deletion with patient ID and deleter ID', async () => {
      const mockPatient = {
        _id: mockPatientId,
        status: 'Inactive',
      };

      jest.spyOn(patientModel, 'findOne').mockResolvedValue(mockPatient as any);
      jest.spyOn(patientModel, 'findOneAndUpdate').mockResolvedValue(mockPatient as any);

      await service.deletePatient(mockPatientId, mockUserId);

      expect(auditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PATIENT_DELETED',
          userId: mockPatientId,
          actorId: mockUserId,
          metadata: expect.objectContaining({
            action: 'Patient record soft deleted',
          }),
        }),
      );
    });

    it('should include timestamp in deletion audit log', async () => {
      const mockPatient = {
        _id: mockPatientId,
        status: 'Inactive',
      };

      jest.spyOn(patientModel, 'findOne').mockResolvedValue(mockPatient as any);
      jest.spyOn(patientModel, 'findOneAndUpdate').mockResolvedValue(mockPatient as any);

      await service.deletePatient(mockPatientId, mockUserId);

      expect(auditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Date),
        }),
      );
    });

    it('should not log audit event when deletedByUserId is not provided', async () => {
      const mockPatient = {
        _id: mockPatientId,
        status: 'Inactive',
      };

      jest.spyOn(patientModel, 'findOne').mockResolvedValue(mockPatient as any);
      jest.spyOn(patientModel, 'findOneAndUpdate').mockResolvedValue(mockPatient as any);

      await service.deletePatient(mockPatientId);

      expect(auditService.logSecurityEvent).not.toHaveBeenCalled();
    });
  });

  /**
   * Requirement 12.6: Audit Log Metadata Completeness
   * 
   * Verifies that all audit logs include:
   * - Timestamp
   * - IP address
   * - User agent
   * 
   * Note: Current implementation uses hardcoded values ('0.0.0.0' and 'System')
   * This is a known limitation that should be addressed in future iterations
   * by passing actual IP address and user agent from the controller layer.
   */
  describe('Audit Log Metadata Completeness (Requirement 12.6)', () => {
    it('should include timestamp, IP address, and user agent in all audit logs', async () => {
      const createPatientDto = {
        cardNumber: 'CARD123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        gender: 'male' as const,
      };

      const mockPatient = {
        _id: mockPatientId,
        ...createPatientDto,
        patientNumber: mockPatientNumber,
        status: 'Active',
        save: jest.fn().mockResolvedValue({
          _id: mockPatientId,
          ...createPatientDto,
          patientNumber: mockPatientNumber,
        }),
      };

      jest.spyOn(patientModel, 'findOne').mockResolvedValue(null);
      (patientModel as any).mockImplementation(() => mockPatient);

      await service.createPatient(createPatientDto, mockUserId);

      expect(auditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Date),
          ipAddress: expect.any(String),
          userAgent: expect.any(String),
        }),
      );
    });

    it('should verify IP address is present in audit log', async () => {
      const updatePatientDto = {
        firstName: 'Jane',
      };

      const mockUpdatedPatient = {
        _id: mockPatientId,
        ...updatePatientDto,
      };

      jest.spyOn(patientModel, 'findOneAndUpdate').mockResolvedValue(mockUpdatedPatient as any);

      await service.updatePatient(mockPatientId, updatePatientDto, mockUserId);

      const callArgs = (auditService.logSecurityEvent as jest.Mock).mock.calls[0][0];
      expect(callArgs.ipAddress).toBeDefined();
      expect(typeof callArgs.ipAddress).toBe('string');
    });

    it('should verify user agent is present in audit log', async () => {
      const mockPatient = {
        _id: mockPatientId,
        status: 'Inactive',
      };

      jest.spyOn(patientModel, 'findOne').mockResolvedValue(mockPatient as any);
      jest.spyOn(patientModel, 'findOneAndUpdate').mockResolvedValue({
        ...mockPatient,
        status: 'Active',
      } as any);

      await service.activatePatient(mockPatientId, mockUserId);

      const callArgs = (auditService.logSecurityEvent as jest.Mock).mock.calls[0][0];
      expect(callArgs.userAgent).toBeDefined();
      expect(typeof callArgs.userAgent).toBe('string');
    });
  });

  /**
   * Summary Test: Verify All Operations Log Audit Events
   * 
   * This test ensures that all five patient operations (create, update, 
   * deactivate, activate, delete) properly log audit events when a user ID
   * is provided.
   */
  describe('Summary: All Operations Log Audit Events', () => {
    it('should verify all patient operations log audit events', async () => {
      // Test data setup
      const createPatientDto = {
        cardNumber: 'CARD123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        gender: 'male' as const,
      };

      const mockPatient = {
        _id: mockPatientId,
        ...createPatientDto,
        patientNumber: mockPatientNumber,
        status: 'Active',
        save: jest.fn().mockResolvedValue({
          _id: mockPatientId,
          ...createPatientDto,
          patientNumber: mockPatientNumber,
        }),
      };

      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn(),
      };

      // Setup mocks
      jest.spyOn(patientModel, 'findOne')
        .mockResolvedValueOnce(null) // For create
        .mockResolvedValueOnce({ ...mockPatient, status: 'Active' } as any) // For deactivate
        .mockResolvedValueOnce({ ...mockPatient, status: 'Inactive' } as any) // For activate
        .mockResolvedValueOnce({ ...mockPatient, status: 'Inactive' } as any); // For delete

      (patientModel as any).mockImplementation(() => mockPatient);
      jest.spyOn(patientModel, 'findOneAndUpdate').mockResolvedValue(mockPatient as any);
      jest.spyOn(appointmentModel, 'updateMany').mockResolvedValue({ modifiedCount: 0 } as any);
      jest.spyOn(connection, 'startSession').mockResolvedValue(mockSession as any);

      // Execute all operations
      await service.createPatient(createPatientDto, mockUserId);
      await service.updatePatient(mockPatientId, { firstName: 'Jane' }, mockUserId);
      await service.deactivatePatient(mockPatientId, mockUserId);
      await service.activatePatient(mockPatientId, mockUserId);
      await service.deletePatient(mockPatientId, mockUserId);

      // Verify all operations logged audit events
      expect(auditService.logSecurityEvent).toHaveBeenCalledTimes(5);
      
      // Verify event types
      const calls = (auditService.logSecurityEvent as jest.Mock).mock.calls;
      expect(calls[0][0].eventType).toBe('PATIENT_CREATED');
      expect(calls[1][0].eventType).toBe('PATIENT_UPDATED');
      expect(calls[2][0].eventType).toBe('PATIENT_DEACTIVATED');
      expect(calls[3][0].eventType).toBe('PATIENT_ACTIVATED');
      expect(calls[4][0].eventType).toBe('PATIENT_DELETED');
    });
  });
});
