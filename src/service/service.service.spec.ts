import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ServiceService } from './service.service';
import { ServiceOfferService } from '../service-offer/service-offer.service';
import { SessionManagerService } from './services/session-manager.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const oid = () => new Types.ObjectId().toString();

function buildMockServiceDoc(overrides: Record<string, any> = {}) {
  const doc: any = {
    _id: new Types.ObjectId(),
    name: 'Test Service',
    durationMinutes: 30,
    price: 100,
    sessions: [],
    complexDepartmentId: undefined,
    clinicId: undefined,
    isActive: true,
    ...overrides,
  };
  doc.save = jest.fn().mockResolvedValue(doc);
  return doc;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('ServiceService', () => {
  let service: ServiceService;

  // Model mocks
  let MockServiceModel: any;
  let mockAppointmentModel: any;
  let mockClinicServiceModel: any;
  let mockNotificationModel: any;
  let mockUserModel: any;

  // Dependency mocks
  let mockServiceOfferService: any;
  let mockSessionManagerService: any;

  // Shared save spy (for constructor-created docs)
  let mockSave: jest.Mock;

  beforeEach(async () => {
    mockSave = jest.fn();

    // ServiceModel acts as both constructor and query object
    MockServiceModel = jest.fn().mockReturnValue({ save: mockSave });
    MockServiceModel.findOne = jest.fn();
    MockServiceModel.findById = jest.fn();
    MockServiceModel.findByIdAndUpdate = jest.fn();
    MockServiceModel.find = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });

    mockAppointmentModel = {
      find: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
      countDocuments: jest.fn().mockResolvedValue(0),
      updateMany: jest.fn().mockResolvedValue({}),
    };

    mockClinicServiceModel = {
      findOne: jest.fn(),
    };

    mockNotificationModel = {
      create: jest.fn().mockResolvedValue({}),
    };

    mockUserModel = {
      findById: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      }),
    };

    mockServiceOfferService = {
      calculateServicePrice: jest.fn(),
    };

    mockSessionManagerService = {
      validateAndProcessSessions: jest.fn(),
      validateSessionRemoval: jest.fn().mockResolvedValue(undefined),
      findSessionById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceService,
        { provide: getModelToken('Service'), useValue: MockServiceModel },
        { provide: getModelToken('ClinicService'), useValue: mockClinicServiceModel },
        { provide: getModelToken('Appointment'), useValue: mockAppointmentModel },
        { provide: getModelToken('Notification'), useValue: mockNotificationModel },
        { provide: getModelToken('User'), useValue: mockUserModel },
        { provide: ServiceOfferService, useValue: mockServiceOfferService },
        { provide: SessionManagerService, useValue: mockSessionManagerService },
      ],
    }).compile();

    service = module.get<ServiceService>(ServiceService);
  });

  afterEach(() => jest.clearAllMocks());

  // =========================================================================
  // createService – session processing (Requirement 8.1)
  // =========================================================================

  describe('createService – session processing', () => {
    const baseDto = {
      name: 'Dental Checkup',
      durationMinutes: 30,
      price: 150,
    };

    beforeEach(() => {
      // No duplicate found for any query
      MockServiceModel.findOne.mockResolvedValue(null);
      // Constructor-created doc saves successfully
      mockSave.mockResolvedValue({ _id: new Types.ObjectId(), ...baseDto });
    });

    it('should NOT call validateAndProcessSessions when sessions not provided', async () => {
      await service.createService(baseDto as any);

      expect(mockSessionManagerService.validateAndProcessSessions).not.toHaveBeenCalled();
    });

    it('should NOT set sessions on serviceData when sessions not provided', async () => {
      await service.createService(baseDto as any);

      const constructorArg = MockServiceModel.mock.calls[0][0];
      expect(constructorArg.sessions).toBeUndefined();
    });

    it('should call validateAndProcessSessions with sessions and durationMinutes when sessions provided', async () => {
      const sessions = [
        { order: 1, name: 'Consultation', duration: 20 },
        { order: 2, name: 'Treatment', duration: 40 },
      ];
      const processed = [
        { _id: oid(), name: 'Consultation', duration: 20, order: 1 },
        { _id: oid(), name: 'Treatment', duration: 40, order: 2 },
      ];
      mockSessionManagerService.validateAndProcessSessions.mockReturnValue(processed);

      await service.createService({ ...baseDto, sessions } as any);

      expect(mockSessionManagerService.validateAndProcessSessions).toHaveBeenCalledWith(
        sessions,
        30,
      );
    });

    it('should store processed sessions on the service document', async () => {
      const sessions = [{ order: 1, name: 'Step 1' }];
      const processed = [{ _id: oid(), name: 'Step 1', duration: 30, order: 1 }];
      mockSessionManagerService.validateAndProcessSessions.mockReturnValue(processed);

      await service.createService({ ...baseDto, sessions } as any);

      const constructorArg = MockServiceModel.mock.calls[0][0];
      expect(constructorArg.sessions).toBe(processed);
    });

    it('should NOT call validateAndProcessSessions when sessions is empty array', async () => {
      await service.createService({ ...baseDto, sessions: [] } as any);

      expect(mockSessionManagerService.validateAndProcessSessions).not.toHaveBeenCalled();
    });

    it('should use durationMinutes from DTO as default duration for sessions', async () => {
      const sessions = [{ order: 1 }];
      mockSessionManagerService.validateAndProcessSessions.mockReturnValue([
        { _id: oid(), name: 'Session 1', duration: 45, order: 1 },
      ]);

      await service.createService({ ...baseDto, durationMinutes: 45, sessions } as any);

      expect(mockSessionManagerService.validateAndProcessSessions).toHaveBeenCalledWith(
        sessions,
        45,
      );
    });

    it('should throw BadRequestException if validateAndProcessSessions throws', async () => {
      const sessions = [{ order: 1, name: 'Step 1' }];
      mockSessionManagerService.validateAndProcessSessions.mockImplementation(() => {
        throw new BadRequestException({
          message: { ar: 'ترتيب الجلسات مكرر', en: 'Duplicate session order' },
          code: 'DUPLICATE_SESSION_ORDER',
        });
      });

      await expect(
        service.createService({ ...baseDto, sessions } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // updateService – session management (Requirement 8.2)
  // =========================================================================

  describe('updateService – session management', () => {
    const serviceId = oid();
    let mockDoc: any;

    beforeEach(() => {
      mockDoc = buildMockServiceDoc({ sessions: [] });
      MockServiceModel.findOne.mockResolvedValue(mockDoc);
    });

    it('should NOT call session methods when sessions is undefined', async () => {
      await service.updateService(serviceId, { price: 200 } as any);

      expect(mockSessionManagerService.validateSessionRemoval).not.toHaveBeenCalled();
      expect(mockSessionManagerService.validateAndProcessSessions).not.toHaveBeenCalled();
    });

    it('should call validateAndProcessSessions when sessions array is provided', async () => {
      const sessions = [{ order: 1, name: 'Diagnosis' }];
      const processed = [{ _id: oid(), name: 'Diagnosis', duration: 30, order: 1 }];
      mockSessionManagerService.validateAndProcessSessions.mockReturnValue(processed);

      await service.updateService(serviceId, { sessions } as any);

      expect(mockSessionManagerService.validateAndProcessSessions).toHaveBeenCalledWith(
        sessions,
        30, // service.durationMinutes
      );
    });

    it('should replace service.sessions with processed result', async () => {
      const sessions = [{ order: 1, name: 'Step A' }];
      const processed = [{ _id: oid(), name: 'Step A', duration: 30, order: 1 }];
      mockSessionManagerService.validateAndProcessSessions.mockReturnValue(processed);

      await service.updateService(serviceId, { sessions } as any);

      expect(mockDoc.sessions).toBe(processed);
    });

    it('should set service.sessions to [] when sessions is empty array', async () => {
      await service.updateService(serviceId, { sessions: [] } as any);

      expect(mockDoc.sessions).toEqual([]);
      expect(mockSessionManagerService.validateAndProcessSessions).not.toHaveBeenCalled();
    });

    it('should call validateSessionRemoval before validateAndProcessSessions when removedSessionIds provided', async () => {
      const sessions = [{ order: 1, name: 'Replacement' }];
      const removedSessionIds = [oid(), oid()];
      const processed = [{ _id: oid(), name: 'Replacement', duration: 30, order: 1 }];
      mockSessionManagerService.validateAndProcessSessions.mockReturnValue(processed);

      const callOrder: string[] = [];
      mockSessionManagerService.validateSessionRemoval.mockImplementation(async () => {
        callOrder.push('validateSessionRemoval');
      });
      mockSessionManagerService.validateAndProcessSessions.mockImplementation(() => {
        callOrder.push('validateAndProcessSessions');
        return processed;
      });

      await service.updateService(serviceId, { sessions, removedSessionIds } as any);

      expect(callOrder).toEqual(['validateSessionRemoval', 'validateAndProcessSessions']);
    });

    it('should call validateSessionRemoval with serviceId and removedSessionIds', async () => {
      const sessions = [{ order: 1, name: 'New Step' }];
      const removedSessionIds = [oid()];
      mockSessionManagerService.validateAndProcessSessions.mockReturnValue([]);

      await service.updateService(serviceId, { sessions, removedSessionIds } as any);

      expect(mockSessionManagerService.validateSessionRemoval).toHaveBeenCalledWith(
        serviceId,
        removedSessionIds,
      );
    });

    it('should NOT call validateSessionRemoval when removedSessionIds is absent', async () => {
      const sessions = [{ order: 1, name: 'Step' }];
      mockSessionManagerService.validateAndProcessSessions.mockReturnValue([]);

      await service.updateService(serviceId, { sessions } as any);

      expect(mockSessionManagerService.validateSessionRemoval).not.toHaveBeenCalled();
    });

    it('should NOT call validateSessionRemoval when removedSessionIds is empty array', async () => {
      const sessions = [{ order: 1, name: 'Step' }];
      mockSessionManagerService.validateAndProcessSessions.mockReturnValue([]);

      await service.updateService(serviceId, { sessions, removedSessionIds: [] } as any);

      expect(mockSessionManagerService.validateSessionRemoval).not.toHaveBeenCalled();
    });

    it('should use updateDto.durationMinutes as effective duration when provided', async () => {
      const sessions = [{ order: 1, name: 'Step' }];
      mockSessionManagerService.validateAndProcessSessions.mockReturnValue([]);

      // durationMinutes in updateDto but same as service (not a critical change triggering appointments check)
      await service.updateService(serviceId, { sessions, durationMinutes: 60 } as any);

      expect(mockSessionManagerService.validateAndProcessSessions).toHaveBeenCalledWith(
        sessions,
        60,
      );
    });

    it('should fall back to service.durationMinutes when updateDto.durationMinutes not provided', async () => {
      mockDoc.durationMinutes = 45;
      const sessions = [{ order: 1, name: 'Step' }];
      mockSessionManagerService.validateAndProcessSessions.mockReturnValue([]);

      await service.updateService(serviceId, { sessions } as any);

      expect(mockSessionManagerService.validateAndProcessSessions).toHaveBeenCalledWith(
        sessions,
        45,
      );
    });

    it('should throw ConflictException when validateSessionRemoval rejects', async () => {
      const removedSessionIds = [oid()];
      const sessions = [{ order: 1, name: 'New Step' }];
      mockSessionManagerService.validateSessionRemoval.mockRejectedValue(
        new ConflictException({
          message: {
            ar: 'لا يمكن حذف الجلسة',
            en: 'Cannot remove session with active appointments',
          },
          code: 'CANNOT_REMOVE_SESSION_WITH_ACTIVE_APPOINTMENTS',
        }),
      );

      await expect(
        service.updateService(serviceId, { sessions, removedSessionIds } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when service not found', async () => {
      MockServiceModel.findOne.mockResolvedValue(null);

      await expect(
        service.updateService(serviceId, { sessions: [] } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should save the service after session update', async () => {
      const sessions = [{ order: 1, name: 'Step' }];
      mockSessionManagerService.validateAndProcessSessions.mockReturnValue([]);

      await service.updateService(serviceId, { sessions } as any);

      expect(mockDoc.save).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // deleteService – soft-delete filter (Requirement 8.3)
  // =========================================================================

  describe('deleteService – soft-delete appointment filter', () => {
    const serviceId = oid();
    let mockDoc: any;

    beforeEach(() => {
      mockDoc = buildMockServiceDoc();
      MockServiceModel.findOne.mockResolvedValue(mockDoc);
      MockServiceModel.findByIdAndUpdate.mockResolvedValue(mockDoc);
    });

    it('should query appointments using isDeleted: { $ne: true }', async () => {
      mockAppointmentModel.countDocuments.mockResolvedValue(0);

      await service.deleteService(serviceId);

      expect(mockAppointmentModel.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ isDeleted: { $ne: true } }),
      );
    });

    it('should NOT use deletedAt: { $exists: false } in appointment query', async () => {
      mockAppointmentModel.countDocuments.mockResolvedValue(0);

      await service.deleteService(serviceId);

      const queryArg = mockAppointmentModel.countDocuments.mock.calls[0][0];
      expect(queryArg).not.toHaveProperty('deletedAt');
    });

    it('should query only scheduled and confirmed appointments', async () => {
      mockAppointmentModel.countDocuments.mockResolvedValue(0);

      await service.deleteService(serviceId);

      expect(mockAppointmentModel.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({
          status: { $in: ['scheduled', 'confirmed'] },
        }),
      );
    });

    it('should throw BadRequestException when active appointments exist', async () => {
      mockAppointmentModel.countDocuments.mockResolvedValue(3);

      await expect(service.deleteService(serviceId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should include activeAppointmentsCount in the error when blocked', async () => {
      mockAppointmentModel.countDocuments.mockResolvedValue(2);

      const err = await service.deleteService(serviceId).catch((e) => e);
      expect(err.response.activeAppointmentsCount).toBe(2);
    });

    it('should call findByIdAndUpdate with isActive: false when no active appointments', async () => {
      mockAppointmentModel.countDocuments.mockResolvedValue(0);

      await service.deleteService(serviceId);

      expect(MockServiceModel.findByIdAndUpdate).toHaveBeenCalledWith(
        serviceId,
        expect.objectContaining({ isActive: false }),
      );
    });

    it('should include deletedAt in the update when soft-deleting', async () => {
      mockAppointmentModel.countDocuments.mockResolvedValue(0);

      await service.deleteService(serviceId);

      const updateArg = MockServiceModel.findByIdAndUpdate.mock.calls[0][1];
      expect(updateArg.deletedAt).toBeInstanceOf(Date);
    });

    it('should include deletedBy in the update when userId is provided', async () => {
      const userId = oid();
      mockAppointmentModel.countDocuments.mockResolvedValue(0);

      await service.deleteService(serviceId, userId);

      const updateArg = MockServiceModel.findByIdAndUpdate.mock.calls[0][1];
      expect(updateArg.deletedBy.toString()).toBe(userId);
    });

    it('should throw NotFoundException when service not found', async () => {
      MockServiceModel.findOne.mockResolvedValue(null);

      await expect(service.deleteService(serviceId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
