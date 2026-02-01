import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EmployeeService } from './employee.service';
import { ValidationUtil } from '../common/utils/validation.util';
import { ResponseBuilder } from '../common/utils/response-builder.util';
import { ERROR_MESSAGES } from '../common/utils/error-messages.constant';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let userModel: jest.Mocked<Model<any>>;
  let employeeProfileModel: jest.Mocked<Model<any>>;
  let employeeDocumentModel: jest.Mocked<Model<any>>;
  let employeeShiftModel: jest.Mocked<Model<any>>;
  let organizationModel: jest.Mocked<Model<any>>;
  let complexModel: jest.Mocked<Model<any>>;
  let clinicModel: jest.Mocked<Model<any>>;

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
    exec: jest.fn(),
    save: jest.fn(),
  });

  beforeEach(async () => {
    // Create mock models
    userModel = createMockModel() as any;
    employeeProfileModel = createMockModel() as any;
    employeeDocumentModel = createMockModel() as any;
    employeeShiftModel = createMockModel() as any;
    organizationModel = createMockModel() as any;
    complexModel = createMockModel() as any;
    clinicModel = createMockModel() as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeService,
        {
          provide: getModelToken('User'),
          useValue: userModel,
        },
        {
          provide: getModelToken('EmployeeProfile'),
          useValue: employeeProfileModel,
        },
        {
          provide: getModelToken('EmployeeDocument'),
          useValue: employeeDocumentModel,
        },
        {
          provide: getModelToken('EmployeeShift'),
          useValue: employeeShiftModel,
        },
        {
          provide: getModelToken('Organization'),
          useValue: organizationModel,
        },
        {
          provide: getModelToken('Complex'),
          useValue: complexModel,
        },
        {
          provide: getModelToken('Clinic'),
          useValue: clinicModel,
        },
      ],
    }).compile();

    service = module.get<EmployeeService>(EmployeeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // validateSingleComplexAssignment Tests
  // ============================================================================
  describe('validateSingleComplexAssignment', () => {
    it('should pass validation when all clinics belong to same complex', async () => {
      const complexId = '507f1f77bcf86cd799439011';
      const clinicIds = [
        '507f1f77bcf86cd799439012',
        '507f1f77bcf86cd799439013',
      ];

      const mockClinics = [
        { _id: clinicIds[0], complexId: new Types.ObjectId(complexId) },
        { _id: clinicIds[1], complexId: new Types.ObjectId(complexId) },
      ];

      // Mock the clinic query
      clinicModel.find.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockClinics),
      } as any);

      const employeeDto = {
        complexId,
        clinicIds,
      };

      // Should not throw
      await expect(
        service['validateSingleComplexAssignment'](employeeDto),
      ).resolves.not.toThrow();
    });

    it('should throw BadRequestException when clinics belong to different complexes', async () => {
      const complexId = '507f1f77bcf86cd799439011';
      const differentComplexId = '507f1f77bcf86cd799439014';
      const clinicIds = [
        '507f1f77bcf86cd799439012',
        '507f1f77bcf86cd799439013',
      ];

      const mockClinics = [
        { _id: clinicIds[0], complexId: new Types.ObjectId(complexId) },
        {
          _id: clinicIds[1],
          complexId: new Types.ObjectId(differentComplexId),
        },
      ];

      // Mock the clinic query
      clinicModel.find.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockClinics),
      } as any);

      const employeeDto = {
        complexId,
        clinicIds,
      };

      // Should throw BadRequestException
      await expect(
        service['validateSingleComplexAssignment'](employeeDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw with correct error message for different complexes', async () => {
      const complexId = '507f1f77bcf86cd799439011';
      const differentComplexId = '507f1f77bcf86cd799439014';
      const clinicIds = [
        '507f1f77bcf86cd799439012',
        '507f1f77bcf86cd799439013',
      ];

      const mockClinics = [
        { _id: clinicIds[0], complexId: new Types.ObjectId(complexId) },
        {
          _id: clinicIds[1],
          complexId: new Types.ObjectId(differentComplexId),
        },
      ];

      clinicModel.find.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockClinics),
      } as any);

      const employeeDto = {
        complexId,
        clinicIds,
      };

      try {
        await service['validateSingleComplexAssignment'](employeeDto);
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response.message).toEqual(
          ERROR_MESSAGES.CLINICS_DIFFERENT_COMPLEXES,
        );
        expect(error.response.code).toBe('CLINICS_DIFFERENT_COMPLEXES');
      }
    });

    it('should skip validation when no complexId provided', async () => {
      const employeeDto = {
        clinicIds: ['507f1f77bcf86cd799439012'],
      };

      // Should not throw and should not query clinics
      await expect(
        service['validateSingleComplexAssignment'](employeeDto),
      ).resolves.not.toThrow();

      expect(clinicModel.find).not.toHaveBeenCalled();
    });

    it('should skip validation when no clinicIds provided', async () => {
      const employeeDto = {
        complexId: '507f1f77bcf86cd799439011',
      };

      // Should not throw and should not query clinics
      await expect(
        service['validateSingleComplexAssignment'](employeeDto),
      ).resolves.not.toThrow();

      expect(clinicModel.find).not.toHaveBeenCalled();
    });

    it('should skip validation when clinicIds is empty array', async () => {
      const employeeDto = {
        complexId: '507f1f77bcf86cd799439011',
        clinicIds: [],
      };

      // Should not throw and should not query clinics
      await expect(
        service['validateSingleComplexAssignment'](employeeDto),
      ).resolves.not.toThrow();

      expect(clinicModel.find).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // validatePlanBasedAssignment Tests
  // ============================================================================
  describe('validatePlanBasedAssignment', () => {
    describe('Plan 2 (Complex) validation', () => {
      it('should pass when complex matches subscription', async () => {
        const complexId = '507f1f77bcf86cd799439011';
        const employeeDto = { complexId };
        const subscription = {
          planType: 'complex',
          complexId: new Types.ObjectId(complexId),
        };

        // Should not throw
        await expect(
          service['validatePlanBasedAssignment'](employeeDto, subscription),
        ).resolves.not.toThrow();
      });

      it('should throw BadRequestException when complex does not match subscription', async () => {
        const employeeComplexId = '507f1f77bcf86cd799439011';
        const subscriptionComplexId = '507f1f77bcf86cd799439012';

        const employeeDto = { complexId: employeeComplexId };
        const subscription = {
          planType: 'complex',
          complexId: new Types.ObjectId(subscriptionComplexId),
        };

        // Should throw BadRequestException
        await expect(
          service['validatePlanBasedAssignment'](employeeDto, subscription),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw with correct error message for complex mismatch', async () => {
        const employeeComplexId = '507f1f77bcf86cd799439011';
        const subscriptionComplexId = '507f1f77bcf86cd799439012';

        const employeeDto = { complexId: employeeComplexId };
        const subscription = {
          planType: 'complex',
          complexId: new Types.ObjectId(subscriptionComplexId),
        };

        try {
          await service['validatePlanBasedAssignment'](
            employeeDto,
            subscription,
          );
          fail('Should have thrown BadRequestException');
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestException);
          expect(error.response.message).toEqual({
            ar: 'يجب أن يتطابق المجمع مع اشتراكك',
            en: 'Complex must match your subscription',
          });
          expect(error.response.code).toBe('COMPLEX_MISMATCH');
          expect(error.response.details).toEqual({
            subscriptionComplexId: subscription.complexId,
            providedComplexId: employeeComplexId,
          });
        }
      });

      it('should pass when no complexId provided in employee data', async () => {
        const employeeDto = {};
        const subscription = {
          planType: 'complex',
          complexId: new Types.ObjectId('507f1f77bcf86cd799439011'),
        };

        // Should not throw
        await expect(
          service['validatePlanBasedAssignment'](employeeDto, subscription),
        ).resolves.not.toThrow();
      });
    });

    describe('Plan 3 (Clinic) validation', () => {
      it('should pass when clinic matches subscription', async () => {
        const clinicId = '507f1f77bcf86cd799439011';
        const employeeDto = { clinicId };
        const subscription = {
          planType: 'clinic',
          clinicId: new Types.ObjectId(clinicId),
        };

        // Should not throw
        await expect(
          service['validatePlanBasedAssignment'](employeeDto, subscription),
        ).resolves.not.toThrow();
      });

      it('should throw BadRequestException when clinic does not match subscription', async () => {
        const employeeClinicId = '507f1f77bcf86cd799439011';
        const subscriptionClinicId = '507f1f77bcf86cd799439012';

        const employeeDto = { clinicId: employeeClinicId };
        const subscription = {
          planType: 'clinic',
          clinicId: new Types.ObjectId(subscriptionClinicId),
        };

        // Should throw BadRequestException
        await expect(
          service['validatePlanBasedAssignment'](employeeDto, subscription),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw with correct error message for clinic mismatch', async () => {
        const employeeClinicId = '507f1f77bcf86cd799439011';
        const subscriptionClinicId = '507f1f77bcf86cd799439012';

        const employeeDto = { clinicId: employeeClinicId };
        const subscription = {
          planType: 'clinic',
          clinicId: new Types.ObjectId(subscriptionClinicId),
        };

        try {
          await service['validatePlanBasedAssignment'](
            employeeDto,
            subscription,
          );
          fail('Should have thrown BadRequestException');
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestException);
          expect(error.response.message).toEqual({
            ar: 'يجب أن تتطابق العيادة مع اشتراكك',
            en: 'Clinic must match your subscription',
          });
          expect(error.response.code).toBe('CLINIC_MISMATCH');
          expect(error.response.details).toEqual({
            subscriptionClinicId: subscription.clinicId,
            providedClinicId: employeeClinicId,
          });
        }
      });

      it('should pass when no clinicId provided in employee data', async () => {
        const employeeDto = {};
        const subscription = {
          planType: 'clinic',
          clinicId: new Types.ObjectId('507f1f77bcf86cd799439011'),
        };

        // Should not throw
        await expect(
          service['validatePlanBasedAssignment'](employeeDto, subscription),
        ).resolves.not.toThrow();
      });
    });

    describe('Plan 1 (Company) validation', () => {
      it('should pass for company plan with any complex', async () => {
        const employeeDto = { complexId: '507f1f77bcf86cd799439011' };
        const subscription = {
          planType: 'company',
          organizationId: new Types.ObjectId('507f1f77bcf86cd799439020'),
        };

        // Should not throw - company plan has no restrictions
        await expect(
          service['validatePlanBasedAssignment'](employeeDto, subscription),
        ).resolves.not.toThrow();
      });

      it('should pass for company plan with any clinic', async () => {
        const employeeDto = { clinicId: '507f1f77bcf86cd799439011' };
        const subscription = {
          planType: 'company',
          organizationId: new Types.ObjectId('507f1f77bcf86cd799439020'),
        };

        // Should not throw - company plan has no restrictions
        await expect(
          service['validatePlanBasedAssignment'](employeeDto, subscription),
        ).resolves.not.toThrow();
      });
    });
  });

  // ============================================================================
  // deleteEmployee Tests
  // ============================================================================
  describe('deleteEmployee', () => {
    const employeeId = '507f1f77bcf86cd799439011';
    const deletedByUserId = '507f1f77bcf86cd799439012';
    const mockEmployee = {
      _id: employeeId,
      email: 'employee@test.com',
      isActive: true,
    };

    it('should successfully delete employee when not self-deletion', async () => {
      // Mock ValidationUtil.validateEntityExists
      jest
        .spyOn(ValidationUtil, 'validateEntityExists')
        .mockResolvedValue(mockEmployee);

      // Mock ValidationUtil.validateNotSelfModification (should not throw)
      jest
        .spyOn(ValidationUtil, 'validateNotSelfModification')
        .mockImplementation(() => {});

      // Mock database updates
      userModel.findByIdAndUpdate.mockResolvedValue({
        ...mockEmployee,
        isActive: false,
      });
      employeeProfileModel.findOneAndUpdate.mockResolvedValue({
        isActive: false,
      });
      employeeShiftModel.updateMany.mockResolvedValue({ modifiedCount: 2 });

      // Mock ResponseBuilder
      const mockResponse = {
        success: true,
        data: null,
        message: ERROR_MESSAGES.EMPLOYEE_DELETED,
      };
      jest.spyOn(ResponseBuilder, 'success').mockReturnValue(mockResponse);

      const result = await service.deleteEmployee(employeeId, deletedByUserId);

      // Verify ValidationUtil was called correctly
      expect(ValidationUtil.validateEntityExists).toHaveBeenCalledWith(
        userModel,
        employeeId,
        ERROR_MESSAGES.EMPLOYEE_NOT_FOUND,
      );
      expect(ValidationUtil.validateNotSelfModification).toHaveBeenCalledWith(
        employeeId,
        deletedByUserId,
        'delete',
      );

      // Verify database updates
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(employeeId, {
        $set: { isActive: false },
      });
      expect(employeeProfileModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: new Types.ObjectId(employeeId) },
        { $set: { isActive: false } },
      );
      expect(employeeShiftModel.updateMany).toHaveBeenCalledWith(
        { userId: new Types.ObjectId(employeeId) },
        { $set: { isActive: false } },
      );

      // Verify response
      expect(ResponseBuilder.success).toHaveBeenCalledWith(
        null,
        ERROR_MESSAGES.EMPLOYEE_DELETED,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw ForbiddenException when attempting self-deletion', async () => {
      const sameUserId = '507f1f77bcf86cd799439011';

      // Mock ValidationUtil.validateEntityExists
      jest
        .spyOn(ValidationUtil, 'validateEntityExists')
        .mockResolvedValue(mockEmployee);

      // Mock ValidationUtil.validateNotSelfModification to throw
      jest
        .spyOn(ValidationUtil, 'validateNotSelfModification')
        .mockImplementation(() => {
          throw new ForbiddenException({
            message: ERROR_MESSAGES.CANNOT_DELETE_SELF,
            code: 'SELF_MODIFICATION_FORBIDDEN',
            details: { action: 'delete', userId: sameUserId },
          });
        });

      // Should throw ForbiddenException
      await expect(
        service.deleteEmployee(sameUserId, sameUserId),
      ).rejects.toThrow(ForbiddenException);

      // Verify validation was called
      expect(ValidationUtil.validateNotSelfModification).toHaveBeenCalledWith(
        sameUserId,
        sameUserId,
        'delete',
      );

      // Verify database was not updated
      expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(employeeProfileModel.findOneAndUpdate).not.toHaveBeenCalled();
      expect(employeeShiftModel.updateMany).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when employee does not exist', async () => {
      const nonExistentId = '507f1f77bcf86cd799439099';

      // Mock ValidationUtil.validateEntityExists to throw
      jest.spyOn(ValidationUtil, 'validateEntityExists').mockRejectedValue(
        new NotFoundException({
          message: ERROR_MESSAGES.EMPLOYEE_NOT_FOUND,
          code: 'ENTITY_NOT_FOUND',
          details: { id: nonExistentId },
        }),
      );

      // Should throw NotFoundException
      await expect(
        service.deleteEmployee(nonExistentId, deletedByUserId),
      ).rejects.toThrow(NotFoundException);

      // Verify validation was called
      expect(ValidationUtil.validateEntityExists).toHaveBeenCalledWith(
        userModel,
        nonExistentId,
        ERROR_MESSAGES.EMPLOYEE_NOT_FOUND,
      );

      // Verify database was not updated
      expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should work without deletedByUserId parameter', async () => {
      // Mock ValidationUtil.validateEntityExists
      jest
        .spyOn(ValidationUtil, 'validateEntityExists')
        .mockResolvedValue(mockEmployee);

      // Mock ValidationUtil.validateNotSelfModification (should not be called)
      jest
        .spyOn(ValidationUtil, 'validateNotSelfModification')
        .mockImplementation(() => {});

      // Mock database updates
      userModel.findByIdAndUpdate.mockResolvedValue({
        ...mockEmployee,
        isActive: false,
      });
      employeeProfileModel.findOneAndUpdate.mockResolvedValue({
        isActive: false,
      });
      employeeShiftModel.updateMany.mockResolvedValue({ modifiedCount: 0 });

      // Mock ResponseBuilder
      const mockResponse = {
        success: true,
        data: null,
        message: ERROR_MESSAGES.EMPLOYEE_DELETED,
      };
      jest.spyOn(ResponseBuilder, 'success').mockReturnValue(mockResponse);

      const result = await service.deleteEmployee(employeeId);

      // Verify validation was called but not self-modification check
      expect(ValidationUtil.validateEntityExists).toHaveBeenCalled();
      expect(ValidationUtil.validateNotSelfModification).not.toHaveBeenCalled();

      // Verify database updates still happened
      expect(userModel.findByIdAndUpdate).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });
  });

  // ============================================================================
  // getEmployeesForDropdown Tests
  // ============================================================================
  describe('getEmployeesForDropdown', () => {
    const mockActiveEmployees = [
      {
        _id: '507f1f77bcf86cd799439011',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        role: 'doctor',
        phone: '1234567890',
        employeeNumber: 'EMP20240001',
        jobTitle: 'Senior Doctor',
        profilePictureUrl: 'http://example.com/pic1.jpg',
      },
      {
        _id: '507f1f77bcf86cd799439012',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@test.com',
        role: 'nurse',
        phone: '0987654321',
        employeeNumber: 'EMP20240002',
        jobTitle: 'Head Nurse',
        profilePictureUrl: 'http://example.com/pic2.jpg',
      },
    ];

    it('should return only active employees', async () => {
      // Mock aggregate pipeline
      userModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockActiveEmployees),
      } as any);

      // Mock ResponseBuilder
      const mockResponse = { success: true, data: mockActiveEmployees };
      jest.spyOn(ResponseBuilder, 'success').mockReturnValue(mockResponse);

      const result = await service.getEmployeesForDropdown();

      // Verify aggregate was called
      expect(userModel.aggregate).toHaveBeenCalled();

      // Verify the pipeline includes active filter
      const pipeline = userModel.aggregate.mock.calls[0][0];
      const matchStage = pipeline.find((stage: any) => stage.$match);
      expect(matchStage.$match).toEqual({
        isActive: true,
        'employeeProfile.isActive': true,
      });

      // Verify response
      expect(ResponseBuilder.success).toHaveBeenCalledWith(mockActiveEmployees);
      expect(result).toEqual(mockResponse);
    });

    it('should filter by role when provided', async () => {
      const filteredEmployees = [mockActiveEmployees[0]]; // Only doctor

      userModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(filteredEmployees),
      } as any);

      const mockResponse = { success: true, data: filteredEmployees };
      jest.spyOn(ResponseBuilder, 'success').mockReturnValue(mockResponse);

      const result = await service.getEmployeesForDropdown({ role: 'doctor' });

      // Verify aggregate was called
      expect(userModel.aggregate).toHaveBeenCalled();

      // Verify the pipeline includes role filter
      const pipeline = userModel.aggregate.mock.calls[0][0];
      const roleMatchStage = pipeline.find(
        (stage: any) => stage.$match && stage.$match.role,
      );
      expect(roleMatchStage.$match.role).toBe('doctor');

      expect(result).toEqual(mockResponse);
    });

    it('should filter by complexId when provided', async () => {
      const complexId = '507f1f77bcf86cd799439020';

      userModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockActiveEmployees),
      } as any);

      const mockResponse = { success: true, data: mockActiveEmployees };
      jest.spyOn(ResponseBuilder, 'success').mockReturnValue(mockResponse);

      await service.getEmployeesForDropdown({ complexId });

      // Verify aggregate was called
      expect(userModel.aggregate).toHaveBeenCalled();

      // Verify the pipeline includes complexId filter
      const pipeline = userModel.aggregate.mock.calls[0][0];
      const complexMatchStage = pipeline.find(
        (stage: any) => stage.$match && stage.$match.complexId,
      );
      expect(complexMatchStage.$match.complexId).toEqual(
        new Types.ObjectId(complexId),
      );
    });

    it('should filter by clinicId when provided', async () => {
      const clinicId = '507f1f77bcf86cd799439030';

      userModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockActiveEmployees),
      } as any);

      const mockResponse = { success: true, data: mockActiveEmployees };
      jest.spyOn(ResponseBuilder, 'success').mockReturnValue(mockResponse);

      await service.getEmployeesForDropdown({ clinicId });

      // Verify aggregate was called
      expect(userModel.aggregate).toHaveBeenCalled();

      // Verify the pipeline includes clinicId filter
      const pipeline = userModel.aggregate.mock.calls[0][0];
      const clinicMatchStage = pipeline.find(
        (stage: any) => stage.$match && stage.$match.clinicId,
      );
      expect(clinicMatchStage.$match.clinicId).toEqual(
        new Types.ObjectId(clinicId),
      );
    });

    it('should apply multiple filters simultaneously', async () => {
      const complexId = '507f1f77bcf86cd799439020';
      const role = 'doctor';

      userModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockActiveEmployees[0]]),
      } as any);

      const mockResponse = { success: true, data: [mockActiveEmployees[0]] };
      jest.spyOn(ResponseBuilder, 'success').mockReturnValue(mockResponse);

      await service.getEmployeesForDropdown({ complexId, role });

      // Verify aggregate was called
      expect(userModel.aggregate).toHaveBeenCalled();

      // Verify the pipeline includes both filters
      const pipeline = userModel.aggregate.mock.calls[0][0];
      const filterMatchStage = pipeline.find(
        (stage: any) =>
          stage.$match && (stage.$match.role || stage.$match.complexId),
      );
      expect(filterMatchStage).toBeDefined();
    });

    it('should return empty array when no active employees found', async () => {
      userModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      } as any);

      const mockResponse = { success: true, data: [] };
      jest.spyOn(ResponseBuilder, 'success').mockReturnValue(mockResponse);

      const result = await service.getEmployeesForDropdown();

      expect(ResponseBuilder.success).toHaveBeenCalledWith([]);
      expect(result).toEqual(mockResponse);
    });

    it('should include employee profile fields in projection', async () => {
      userModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockActiveEmployees),
      } as any);

      const mockResponse = { success: true, data: mockActiveEmployees };
      jest.spyOn(ResponseBuilder, 'success').mockReturnValue(mockResponse);

      await service.getEmployeesForDropdown();

      // Verify the pipeline includes projection stage
      const pipeline = userModel.aggregate.mock.calls[0][0];
      const projectStage = pipeline.find((stage: any) => stage.$project);

      expect(projectStage).toBeDefined();
      expect(projectStage.$project).toHaveProperty('employeeNumber');
      expect(projectStage.$project).toHaveProperty('jobTitle');
      expect(projectStage.$project).toHaveProperty('profilePictureUrl');
    });

    it('should sort results by name', async () => {
      userModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockActiveEmployees),
      } as any);

      const mockResponse = { success: true, data: mockActiveEmployees };
      jest.spyOn(ResponseBuilder, 'success').mockReturnValue(mockResponse);

      await service.getEmployeesForDropdown();

      // Verify the pipeline includes sort stage
      const pipeline = userModel.aggregate.mock.calls[0][0];
      const sortStage = pipeline.find((stage: any) => stage.$sort);

      expect(sortStage).toBeDefined();
      expect(sortStage.$sort).toEqual({ firstName: 1, lastName: 1 });
    });

    it('should exclude inactive users from results', async () => {
      // This test verifies that the aggregation pipeline filters out inactive users
      userModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockActiveEmployees),
      } as any);

      const mockResponse = { success: true, data: mockActiveEmployees };
      jest.spyOn(ResponseBuilder, 'success').mockReturnValue(mockResponse);

      await service.getEmployeesForDropdown();

      // Verify the pipeline has the correct match stage for active users
      const pipeline = userModel.aggregate.mock.calls[0][0];
      const matchStage = pipeline.find(
        (stage: any) => stage.$match && stage.$match.isActive !== undefined,
      );

      expect(matchStage.$match.isActive).toBe(true);
      expect(matchStage.$match['employeeProfile.isActive']).toBe(true);
    });
  });
});
