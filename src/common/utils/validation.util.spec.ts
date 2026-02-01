import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Types, Model } from 'mongoose';
import { ValidationUtil } from './validation.util';
import { ERROR_MESSAGES } from './error-messages.constant';

describe('ValidationUtil', () => {
  // ============================================================================
  // validateObjectId Tests
  // ============================================================================
  describe('validateObjectId', () => {
    it('should pass validation for valid ObjectId', () => {
      const validId = '507f1f77bcf86cd799439011';

      expect(() => {
        ValidationUtil.validateObjectId(validId, ERROR_MESSAGES.USER_NOT_FOUND);
      }).not.toThrow();
    });

    it('should throw BadRequestException for invalid ObjectId format', () => {
      const invalidId = 'invalid-id-format';

      expect(() => {
        ValidationUtil.validateObjectId(
          invalidId,
          ERROR_MESSAGES.USER_NOT_FOUND,
        );
      }).toThrow(BadRequestException);
    });

    it('should throw BadRequestException with correct error structure', () => {
      const invalidId = 'invalid-id';

      try {
        ValidationUtil.validateObjectId(
          invalidId,
          ERROR_MESSAGES.USER_NOT_FOUND,
        );
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response).toEqual({
          message: ERROR_MESSAGES.INVALID_ID_FORMAT,
          code: 'INVALID_ID_FORMAT',
          details: {
            entityName: ERROR_MESSAGES.USER_NOT_FOUND,
            providedId: invalidId,
          },
        });
      }
    });

    it('should throw for empty string', () => {
      expect(() => {
        ValidationUtil.validateObjectId('', ERROR_MESSAGES.USER_NOT_FOUND);
      }).toThrow(BadRequestException);
    });

    it('should throw for null or undefined', () => {
      expect(() => {
        ValidationUtil.validateObjectId(
          null as any,
          ERROR_MESSAGES.USER_NOT_FOUND,
        );
      }).toThrow(BadRequestException);

      expect(() => {
        ValidationUtil.validateObjectId(
          undefined as any,
          ERROR_MESSAGES.USER_NOT_FOUND,
        );
      }).toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // validateEntityExists Tests
  // ============================================================================
  describe('validateEntityExists', () => {
    let mockModel: jest.Mocked<Model<any>>;

    beforeEach(() => {
      mockModel = {
        findById: jest.fn(),
      } as any;
    });

    it('should return entity when found', async () => {
      const validId = '507f1f77bcf86cd799439011';
      const mockEntity = { _id: validId, name: 'Test Entity' };

      mockModel.findById.mockResolvedValue(mockEntity);

      const result = await ValidationUtil.validateEntityExists(
        mockModel,
        validId,
        ERROR_MESSAGES.USER_NOT_FOUND,
      );

      expect(result).toEqual(mockEntity);
      expect(mockModel.findById).toHaveBeenCalledWith(validId);
    });

    it('should throw NotFoundException when entity not found', async () => {
      const validId = '507f1f77bcf86cd799439011';

      mockModel.findById.mockResolvedValue(null);

      await expect(
        ValidationUtil.validateEntityExists(
          mockModel,
          validId,
          ERROR_MESSAGES.USER_NOT_FOUND,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException with correct error structure', async () => {
      const validId = '507f1f77bcf86cd799439011';

      mockModel.findById.mockResolvedValue(null);

      try {
        await ValidationUtil.validateEntityExists(
          mockModel,
          validId,
          ERROR_MESSAGES.USER_NOT_FOUND,
        );
        fail('Should have thrown NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response).toEqual({
          message: ERROR_MESSAGES.USER_NOT_FOUND,
          code: 'ENTITY_NOT_FOUND',
          details: { id: validId },
        });
      }
    });

    it('should throw BadRequestException for invalid ID format before querying', async () => {
      const invalidId = 'invalid-id';

      await expect(
        ValidationUtil.validateEntityExists(
          mockModel,
          invalidId,
          ERROR_MESSAGES.USER_NOT_FOUND,
        ),
      ).rejects.toThrow(BadRequestException);

      // Should not call findById for invalid ID
      expect(mockModel.findById).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // validateNotSelfModification Tests
  // ============================================================================
  describe('validateNotSelfModification', () => {
    it('should pass validation when target and current user are different', () => {
      const targetUserId = '507f1f77bcf86cd799439011';
      const currentUserId = '507f1f77bcf86cd799439012';

      expect(() => {
        ValidationUtil.validateNotSelfModification(
          targetUserId,
          currentUserId,
          'deactivate',
        );
      }).not.toThrow();
    });

    it('should throw ForbiddenException when user attempts self-deactivation', () => {
      const userId = '507f1f77bcf86cd799439011';

      expect(() => {
        ValidationUtil.validateNotSelfModification(
          userId,
          userId,
          'deactivate',
        );
      }).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user attempts self-deletion', () => {
      const userId = '507f1f77bcf86cd799439011';

      expect(() => {
        ValidationUtil.validateNotSelfModification(userId, userId, 'delete');
      }).toThrow(ForbiddenException);
    });

    it('should throw with correct error message for deactivate action', () => {
      const userId = '507f1f77bcf86cd799439011';

      try {
        ValidationUtil.validateNotSelfModification(
          userId,
          userId,
          'deactivate',
        );
        fail('Should have thrown ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.response).toEqual({
          message: ERROR_MESSAGES.CANNOT_DEACTIVATE_SELF,
          code: 'SELF_MODIFICATION_FORBIDDEN',
          details: { action: 'deactivate', userId },
        });
      }
    });

    it('should throw with correct error message for delete action', () => {
      const userId = '507f1f77bcf86cd799439011';

      try {
        ValidationUtil.validateNotSelfModification(userId, userId, 'delete');
        fail('Should have thrown ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.response).toEqual({
          message: ERROR_MESSAGES.CANNOT_DELETE_SELF,
          code: 'SELF_MODIFICATION_FORBIDDEN',
          details: { action: 'delete', userId },
        });
      }
    });
  });

  // ============================================================================
  // validateUserActive Tests
  // ============================================================================
  describe('validateUserActive', () => {
    it('should pass validation for active user', () => {
      const activeUser = { _id: '507f1f77bcf86cd799439011', isActive: true };

      expect(() => {
        ValidationUtil.validateUserActive(activeUser);
      }).not.toThrow();
    });

    it('should throw BadRequestException for inactive user', () => {
      const inactiveUser = { _id: '507f1f77bcf86cd799439011', isActive: false };

      expect(() => {
        ValidationUtil.validateUserActive(inactiveUser);
      }).toThrow(BadRequestException);
    });

    it('should throw with correct error structure', () => {
      const inactiveUser = { _id: '507f1f77bcf86cd799439011', isActive: false };

      try {
        ValidationUtil.validateUserActive(inactiveUser);
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response).toEqual({
          message: ERROR_MESSAGES.DEACTIVATED_USER_ASSIGNMENT,
          code: 'USER_INACTIVE',
          details: { userId: inactiveUser._id },
        });
      }
    });
  });

  // ============================================================================
  // validateSingleComplexAssignment Tests
  // ============================================================================
  describe('validateSingleComplexAssignment', () => {
    let mockClinicModel: jest.Mocked<Model<any>>;

    beforeEach(() => {
      mockClinicModel = {
        find: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
      } as any;
    });

    it('should pass validation when no clinics provided', async () => {
      await expect(
        ValidationUtil.validateSingleComplexAssignment(
          [],
          '507f1f77bcf86cd799439011',
          mockClinicModel,
        ),
      ).resolves.not.toThrow();

      expect(mockClinicModel.find).not.toHaveBeenCalled();
    });

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

      mockClinicModel.find.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockClinics),
      } as any);

      await expect(
        ValidationUtil.validateSingleComplexAssignment(
          clinicIds,
          complexId,
          mockClinicModel,
        ),
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

      mockClinicModel.find.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockClinics),
      } as any);

      await expect(
        ValidationUtil.validateSingleComplexAssignment(
          clinicIds,
          complexId,
          mockClinicModel,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw with correct error structure', async () => {
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

      mockClinicModel.find.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockClinics),
      } as any);

      try {
        await ValidationUtil.validateSingleComplexAssignment(
          clinicIds,
          complexId,
          mockClinicModel,
        );
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response).toEqual({
          message: ERROR_MESSAGES.CLINICS_DIFFERENT_COMPLEXES,
          code: 'CLINICS_DIFFERENT_COMPLEXES',
          details: { complexId, clinicIds },
        });
      }
    });

    it('should query clinics with correct parameters', async () => {
      const complexId = '507f1f77bcf86cd799439011';
      const clinicIds = [
        '507f1f77bcf86cd799439012',
        '507f1f77bcf86cd799439013',
      ];

      const mockClinics = [
        { _id: clinicIds[0], complexId: new Types.ObjectId(complexId) },
        { _id: clinicIds[1], complexId: new Types.ObjectId(complexId) },
      ];

      mockClinicModel.find.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockClinics),
      } as any);

      await ValidationUtil.validateSingleComplexAssignment(
        clinicIds,
        complexId,
        mockClinicModel,
      );

      expect(mockClinicModel.find).toHaveBeenCalledWith({
        _id: { $in: clinicIds },
      });
    });
  });

  // ============================================================================
  // validateNotEmpty Tests
  // ============================================================================
  describe('validateNotEmpty', () => {
    it('should pass validation for non-empty array', () => {
      const array = ['item1', 'item2'];

      expect(() => {
        ValidationUtil.validateNotEmpty(array, ERROR_MESSAGES.EMPTY_ARRAY);
      }).not.toThrow();
    });

    it('should throw BadRequestException for empty array', () => {
      const array: string[] = [];

      expect(() => {
        ValidationUtil.validateNotEmpty(array, ERROR_MESSAGES.EMPTY_ARRAY);
      }).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for null', () => {
      expect(() => {
        ValidationUtil.validateNotEmpty(
          null as any,
          ERROR_MESSAGES.EMPTY_ARRAY,
        );
      }).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for undefined', () => {
      expect(() => {
        ValidationUtil.validateNotEmpty(
          undefined as any,
          ERROR_MESSAGES.EMPTY_ARRAY,
        );
      }).toThrow(BadRequestException);
    });

    it('should throw with correct error structure', () => {
      const array: string[] = [];

      try {
        ValidationUtil.validateNotEmpty(array, ERROR_MESSAGES.EMPTY_ARRAY);
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response).toEqual({
          message: ERROR_MESSAGES.EMPTY_ARRAY,
          code: 'EMPTY_ARRAY',
        });
      }
    });

    it('should work with different array types', () => {
      const numberArray = [1, 2, 3];
      const objectArray = [{ id: 1 }, { id: 2 }];

      expect(() => {
        ValidationUtil.validateNotEmpty(
          numberArray,
          ERROR_MESSAGES.EMPTY_ARRAY,
        );
      }).not.toThrow();

      expect(() => {
        ValidationUtil.validateNotEmpty(
          objectArray,
          ERROR_MESSAGES.EMPTY_ARRAY,
        );
      }).not.toThrow();
    });
  });
});
