import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ClinicService } from './clinic.service';
import { SubscriptionService } from '../subscription/subscription.service';

describe('ClinicService - assignPersonInCharge', () => {
  let service: ClinicService;
  let clinicModel: jest.Mocked<Model<any>>;
  let complexModel: jest.Mocked<Model<any>>;
  let subscriptionService: jest.Mocked<SubscriptionService>;

  const clinicId = '507f1f77bcf86cd799439012';
  const complexId = '507f1f77bcf86cd799439011';
  const personInChargeId = '507f1f77bcf86cd799439020';

  beforeEach(async () => {
    // Create mock models
    clinicModel = {
      findById: jest.fn(),
    } as any;

    complexModel = {
      findById: jest.fn(),
    } as any;

    subscriptionService = {} as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicService,
        {
          provide: getModelToken('Clinic'),
          useValue: clinicModel,
        },
        {
          provide: getModelToken('Complex'),
          useValue: complexModel,
        },
        {
          provide: SubscriptionService,
          useValue: subscriptionService,
        },
      ],
    }).compile();

    service = module.get<ClinicService>(ClinicService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully assign PIC when valid', async () => {
    const mockClinic = {
      _id: clinicId,
      name: 'Test Clinic',
      complexId: new Types.ObjectId(complexId),
      personInChargeId: null,
      save: jest.fn().mockResolvedValue({
        _id: clinicId,
        name: 'Test Clinic',
        complexId: new Types.ObjectId(complexId),
        personInChargeId: new Types.ObjectId(personInChargeId),
      }),
    };

    const mockComplex = {
      _id: complexId,
      name: 'Test Complex',
      personInChargeId: new Types.ObjectId(personInChargeId),
    };

    // Mock first findById call (get clinic)
    clinicModel.findById.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue(mockClinic),
    } as any);

    // Mock complex findById
    complexModel.findById.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockComplex),
    } as any);

    // Mock second findById call (get updated clinic with populate)
    clinicModel.findById.mockReturnValueOnce({
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue({
        _id: clinicId,
        name: 'Test Clinic',
        complexId: new Types.ObjectId(complexId),
        personInChargeId: {
          _id: personInChargeId,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@test.com',
          role: 'admin',
        },
      }),
    } as any);

    const result = await service.assignPersonInCharge(clinicId, {
      personInChargeId,
    });

    expect(clinicModel.findById).toHaveBeenCalledTimes(2);
    expect(complexModel.findById).toHaveBeenCalledWith(mockClinic.complexId);
    expect(mockClinic.save).toHaveBeenCalled();
    expect(result.personInChargeId).toBeDefined();
    expect(result.personInChargeId.firstName).toBe('John');
  });

  it('should throw NotFoundException when clinic not found', async () => {
    clinicModel.findById.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue(null),
    } as any);

    await expect(
      service.assignPersonInCharge(clinicId, { personInChargeId }),
    ).rejects.toThrow(NotFoundException);

    expect(clinicModel.findById).toHaveBeenCalledWith(clinicId);
  });

  it('should throw BadRequestException when clinic has no complex', async () => {
    const clinicWithoutComplex = {
      _id: clinicId,
      name: 'Test Clinic',
      complexId: null,
      personInChargeId: null,
    };

    clinicModel.findById.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue(clinicWithoutComplex),
    } as any);

    await expect(
      service.assignPersonInCharge(clinicId, { personInChargeId }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw NotFoundException when complex not found', async () => {
    const mockClinic = {
      _id: clinicId,
      name: 'Test Clinic',
      complexId: new Types.ObjectId(complexId),
      personInChargeId: null,
    };

    clinicModel.findById.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue(mockClinic),
    } as any);

    complexModel.findById.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(null),
    } as any);

    await expect(
      service.assignPersonInCharge(clinicId, { personInChargeId }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException when PIC not from complex (CLINIC_002)', async () => {
    const differentPICId = '507f1f77bcf86cd799439099';
    const mockClinic = {
      _id: clinicId,
      name: 'Test Clinic',
      complexId: new Types.ObjectId(complexId),
      personInChargeId: null,
    };

    const mockComplex = {
      _id: complexId,
      name: 'Test Complex',
      personInChargeId: new Types.ObjectId(personInChargeId),
    };

    clinicModel.findById.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue(mockClinic),
    } as any);

    complexModel.findById.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockComplex),
    } as any);

    await expect(
      service.assignPersonInCharge(clinicId, {
        personInChargeId: differentPICId,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException when complex has no PIC', async () => {
    const mockClinic = {
      _id: clinicId,
      name: 'Test Clinic',
      complexId: new Types.ObjectId(complexId),
      personInChargeId: null,
    };

    const complexWithoutPIC = {
      _id: complexId,
      name: 'Test Complex',
      personInChargeId: null,
    };

    clinicModel.findById.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue(mockClinic),
    } as any);

    complexModel.findById.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(complexWithoutPIC),
    } as any);

    await expect(
      service.assignPersonInCharge(clinicId, { personInChargeId }),
    ).rejects.toThrow(BadRequestException);
  });
});
