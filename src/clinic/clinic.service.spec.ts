import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ClinicService } from './clinic.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { ValidationUtil } from '../common/utils/validation.util';
import { ResponseBuilder } from '../common/utils/response-builder.util';
import { ERROR_MESSAGES } from '../common/utils/error-messages.constant';

describe('ClinicService', () => {
  let service: ClinicService;
  let clinicModel: jest.Mocked<Model<any>>;
  let complexModel: jest.Mocked<Model<any>>;
  let subscriptionService: jest.Mocked<SubscriptionService>;

  // Mock models factory
  const createMockModel = () => ({
    find: jest.fn().mockReturnThis(),
    findOne: jest.fn().mockReturnThis(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    updateMany: jest.fn(),
    aggregate: jest.fn(),
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn(),
    save: jest.fn(),
  });

  beforeEach(async () => {
    // Create mock models
    clinicModel = createMockModel() as any;
    complexModel = createMockModel() as any;

    // Create mock subscription service
    subscriptionService = {
      isSubscriptionActive: jest.fn(),
      getSubscriptionWithPlan: jest.fn(),
      getSubscriptionByUser: jest.fn(),
    } as any;

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

  // ============================================================================
  // getClinicsByComplex Tests
  // ============================================================================
  describe('getClinicsByComplex', () => {
    const complexId = '507f1f77bcf86cd799439011';
    const mockClinics = [
      {
        _id: '507f1f77bcf86cd799439012',
        name: 'Clinic A',
        complexId: new Types.ObjectId(complexId),
        isActive: true,
        specialization: 'General',
        email: 'clinica@test.com',
      },
      {
        _id: '507f1f77bcf86cd799439013',
        name: 'Clinic B',
        complexId: new Types.ObjectId(complexId),
        isActive: true,
        specialization: 'Dental',
        email: 'clinicb@test.com',
      },
    ];

    it('should return clinics for a valid complex', async () => {
      // Mock ValidationUtil.validateEntityExists
      jest.spyOn(ValidationUtil, 'validateEntityExists').mockResolvedValue({
        _id: complexId,
        name: 'Test Complex',
      });

      // Mock clinic query
      clinicModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockClinics),
      } as any);

      // Mock ResponseBuilder
      const mockResponse = { success: true, data: mockClinics };
      jest.spyOn(ResponseBuilder, 'success').mockReturnValue(mockResponse);

      const result = await service.getClinicsByComplex(complexId);

      // Verify ValidationUtil was called
      expect(ValidationUtil.validateEntityExists).toHaveBeenCalledWith(
        complexModel,
        complexId,
        ERROR_MESSAGES.COMPLEX_NOT_FOUND,
      );

      // Verify query was built correctly
      expect(clinicModel.find).toHaveBeenCalledWith({
        complexId: new Types.ObjectId(complexId),
      });

      // Verify response
      expect(ResponseBuilder.success).toHaveBeenCalledWith(mockClinics);
      expect(result).toEqual(mockResponse);
    });

    it('should throw NotFoundException when complex does not exist', async () => {
      const nonExistentComplexId = '507f1f77bcf86cd799439099';

      // Mock ValidationUtil.validateEntityExists to throw
      jest.spyOn(ValidationUtil, 'validateEntityExists').mockRejectedValue(
        new NotFoundException({
          message: ERROR_MESSAGES.COMPLEX_NOT_FOUND,
          code: 'ENTITY_NOT_FOUND',
          details: { id: nonExistentComplexId },
        }),
      );

      // Should throw NotFoundException
      await expect(
        service.getClinicsByComplex(nonExistentComplexId),
      ).rejects.toThrow(NotFoundException);

      // Verify validation was called
      expect(ValidationUtil.validateEntityExists).toHaveBeenCalledWith(
        complexModel,
        nonExistentComplexId,
        ERROR_MESSAGES.COMPLEX_NOT_FOUND,
      );

      // Verify query was not executed
      expect(clinicModel.find).not.toHaveBeenCalled();
    });

    it('should apply isActive filter when provided', async () => {
      const activeClinics = [mockClinics[0]];

      jest.spyOn(ValidationUtil, 'validateEntityExists').mockResolvedValue({
        _id: complexId,
        name: 'Test Complex',
      });

      clinicModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(activeClinics),
      } as any);

      const mockResponse = { success: true, data: activeClinics };
      jest.spyOn(ResponseBuilder, 'success').mockReturnValue(mockResponse);

      await service.getClinicsByComplex(complexId, { isActive: true });

      // Verify query includes isActive filter
      expect(clinicModel.find).toHaveBeenCalledWith({
        complexId: new Types.ObjectId(complexId),
        isActive: true,
      });
    });

    it('should apply custom sorting when provided', async () => {
      jest.spyOn(ValidationUtil, 'validateEntityExists').mockResolvedValue({
        _id: complexId,
        name: 'Test Complex',
      });

      const sortMock = jest.fn().mockReturnThis();
      clinicModel.find.mockReturnValue({
        sort: sortMock,
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockClinics),
      } as any);

      const mockResponse = { success: true, data: mockClinics };
      jest.spyOn(ResponseBuilder, 'success').mockReturnValue(mockResponse);

      await service.getClinicsByComplex(complexId, {
        sortBy: 'specialization',
        sortOrder: 'desc',
      });

      // Verify sort was called with correct parameters
      expect(sortMock).toHaveBeenCalledWith({ specialization: -1 });
    });

    it('should use default sorting (name ascending) when not provided', async () => {
      jest.spyOn(ValidationUtil, 'validateEntityExists').mockResolvedValue({
        _id: complexId,
        name: 'Test Complex',
      });

      const sortMock = jest.fn().mockReturnThis();
      clinicModel.find.mockReturnValue({
        sort: sortMock,
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockClinics),
      } as any);

      const mockResponse = { success: true, data: mockClinics };
      jest.spyOn(ResponseBuilder, 'success').mockReturnValue(mockResponse);

      await service.getClinicsByComplex(complexId);

      // Verify default sort was applied
      expect(sortMock).toHaveBeenCalledWith({ name: 1 });
    });

    it('should return empty array when no clinics found', async () => {
      jest.spyOn(ValidationUtil, 'validateEntityExists').mockResolvedValue({
        _id: complexId,
        name: 'Test Complex',
      });

      clinicModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      } as any);

      const mockResponse = { success: true, data: [] };
      jest.spyOn(ResponseBuilder, 'success').mockReturnValue(mockResponse);

      const result = await service.getClinicsByComplex(complexId);

      expect(ResponseBuilder.success).toHaveBeenCalledWith([]);
      expect(result).toEqual(mockResponse);
    });
  });

  // ============================================================================
  // getClinicsForDropdown Tests
  // ============================================================================
  describe('getClinicsForDropdown', () => {
    const mockActiveClinics = [
      {
        _id: '507f1f77bcf86cd799439012',
        name: 'Clinic A',
        specialization: 'General',
      },
      {
        _id: '507f1f77bcf86cd799439013',
        name: 'Clinic B',
        specialization: 'Dental',
      },
    ];

    it('should return only active clinics', async () => {
      clinicModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockActiveClinics),
      } as any);

      const mockResponse = { success: true, data: mockActiveClinics };
      jest.spyOn(ResponseBuilder, 'success').mockReturnValue(mockResponse);

      const result = await service.getClinicsForDropdown();

      // Verify query filters for active clinics only
      expect(clinicModel.find).toHaveBeenCalledWith({ isActive: true });

      // Verify response
      expect(ResponseBuilder.success).toHaveBeenCalledWith(mockActiveClinics);
      expect(result).toEqual(mockResponse);
    });

    it('should filter by complexId when provided', async () => {
      const complexId = '507f1f77bcf86cd799439011';

      clinicModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockActiveClinics),
      } as any);

      const mockResponse = { success: true, data: mockActiveClinics };
      jest.spyOn(ResponseBuilder, 'success').mockReturnValue(mockResponse);

      await service.getClinicsForDropdown({ complexId });

      // Verify query includes complexId filter
      expect(clinicModel.find).toHaveBeenCalledWith({
        isActive: true,
        complexId: new Types.ObjectId(complexId),
      });
    });

    it('should sort results by name ascending', async () => {
      const sortMock = jest.fn().mockReturnThis();
      clinicModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: sortMock,
        lean: jest.fn().mockResolvedValue(mockActiveClinics),
      } as any);

      const mockResponse = { success: true, data: mockActiveClinics };
      jest.spyOn(ResponseBuilder, 'success').mockReturnValue(mockResponse);

      await service.getClinicsForDropdown();

      // Verify sort was called with name ascending
      expect(sortMock).toHaveBeenCalledWith({ name: 1 });
    });

    it('should return empty array when no active clinics found', async () => {
      clinicModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      } as any);

      const mockResponse = { success: true, data: [] };
      jest.spyOn(ResponseBuilder, 'success').mockReturnValue(mockResponse);

      const result = await service.getClinicsForDropdown();

      expect(ResponseBuilder.success).toHaveBeenCalledWith([]);
      expect(result).toEqual(mockResponse);
    });

    it('should select only necessary fields for dropdown', async () => {
      const selectMock = jest.fn().mockReturnThis();
      clinicModel.find.mockReturnValue({
        select: selectMock,
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockActiveClinics),
      } as any);

      const mockResponse = { success: true, data: mockActiveClinics };
      jest.spyOn(ResponseBuilder, 'success').mockReturnValue(mockResponse);

      await service.getClinicsForDropdown();

      // Verify select was called with minimal fields
      expect(selectMock).toHaveBeenCalledWith('_id name specialization');
    });

    it('should exclude inactive clinics from results', async () => {
      // This test verifies that inactive clinics are not included
      clinicModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockActiveClinics),
      } as any);

      const mockResponse = { success: true, data: mockActiveClinics };
      jest.spyOn(ResponseBuilder, 'success').mockReturnValue(mockResponse);

      await service.getClinicsForDropdown();

      // Verify the query explicitly filters for active clinics
      expect(clinicModel.find).toHaveBeenCalledWith({ isActive: true });
    });
  });

  // ============================================================================
  // assignPersonInCharge Tests
  // ============================================================================
  describe('assignPersonInCharge', () => {
    const clinicId = '507f1f77bcf86cd799439012';
    const complexId = '507f1f77bcf86cd799439011';
    const personInChargeId = '507f1f77bcf86cd799439020';

    const mockClinic = {
      _id: clinicId,
      name: 'Test Clinic',
      complexId: new Types.ObjectId(complexId),
      personInChargeId: null,
      save: jest.fn(),
    };

    const mockComplex = {
      _id: complexId,
      name: 'Test Complex',
      personInChargeId: new Types.ObjectId(personInChargeId),
    };

    const mockUpdatedClinic = {
      ...mockClinic,
      personInChargeId: new Types.ObjectId(personInChargeId),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should successfully assign PIC when valid', async () => {
      // Mock clinic findById - first call
      const execMock1 = jest.fn().mockResolvedValue(mockClinic);
      clinicModel.findById = jest.fn().mockReturnValue({
        exec: execMock1,
      } as any);

      // Mock complex findById
      const selectMock = jest.fn().mockReturnThis();
      const execMock2 = jest.fn().mockResolvedValue(mockComplex);
      complexModel.findById = jest.fn().mockReturnValue({
        select: selectMock,
        exec: execMock2,
      } as any);

      // Mock save
      mockClinic.save = jest.fn().mockResolvedValue(mockUpdatedClinic);

      // Mock final findById with populate - second call
      const populateMock = jest.fn().mockReturnThis();
      const execMock3 = jest.fn().mockResolvedValue({
        ...mockUpdatedClinic,
        personInChargeId: {
          _id: personInChargeId,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@test.com',
          role: 'admin',
        },
      });

      // Override findById for the second call
      clinicModel.findById = jest
        .fn()
        .mockReturnValueOnce({
          exec: execMock1,
        } as any)
        .mockReturnValueOnce({
          populate: populateMock,
          exec: execMock3,
        } as any);

      const result = await service.assignPersonInCharge(clinicId, {
        personInChargeId,
      });

      // Verify clinic was found
      expect(clinicModel.findById).toHaveBeenCalledWith(clinicId);

      // Verify complex was queried
      expect(complexModel.findById).toHaveBeenCalledWith(mockClinic.complexId);

      // Verify clinic was saved
      expect(mockClinic.save).toHaveBeenCalled();

      // Verify result has populated PIC
      expect(result.personInChargeId).toBeDefined();
    });

    it('should throw NotFoundException when clinic not found', async () => {
      clinicModel.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(
        service.assignPersonInCharge(clinicId, { personInChargeId }),
      ).rejects.toThrow(NotFoundException);

      expect(clinicModel.findById).toHaveBeenCalledWith(clinicId);
    });

    it('should throw BadRequestException when clinic has no complex', async () => {
      const clinicWithoutComplex = {
        ...mockClinic,
        complexId: null,
      };

      clinicModel.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(clinicWithoutComplex),
      } as any);

      await expect(
        service.assignPersonInCharge(clinicId, { personInChargeId }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when complex not found', async () => {
      clinicModel.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockClinic),
      } as any);

      complexModel.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(
        service.assignPersonInCharge(clinicId, { personInChargeId }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when PIC not from complex (CLINIC_002)', async () => {
      const differentPICId = '507f1f77bcf86cd799439099';

      clinicModel.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockClinic),
      } as any);

      complexModel.findById = jest.fn().mockReturnValue({
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
      const complexWithoutPIC = {
        ...mockComplex,
        personInChargeId: null,
      };

      clinicModel.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockClinic),
      } as any);

      complexModel.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(complexWithoutPIC),
      } as any);

      await expect(
        service.assignPersonInCharge(clinicId, { personInChargeId }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
