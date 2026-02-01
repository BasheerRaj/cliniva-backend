import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';

import {
  FirstLoginGuard,
  SKIP_FIRST_LOGIN_CHECK,
} from '../../../src/auth/guards/first-login.guard';
import { User } from '../../../src/database/schemas/user.schema';
import { AuthErrorCode } from '../../../src/common/enums/auth-error-code.enum';

describe('FirstLoginGuard', () => {
  let guard: FirstLoginGuard;
  let reflector: Reflector;
  let mockExecutionContext: Partial<ExecutionContext>;

  const mockUserModel = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FirstLoginGuard,
        Reflector,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    guard = module.get<FirstLoginGuard>(FirstLoginGuard);
    reflector = module.get<Reflector>(Reflector);

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: {
            userId: 'user-123',
            email: 'test@example.com',
            role: 'doctor',
          },
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });

    it('should allow access when skipFirstLoginCheck is true', async () => {
      // Mock reflector to return true for skip check
      jest.spyOn(reflector, 'get').mockReturnValue(true);

      const result = await guard.canActivate(
        mockExecutionContext as ExecutionContext,
      );

      expect(result).toBe(true);
      expect(reflector.get).toHaveBeenCalledWith(
        SKIP_FIRST_LOGIN_CHECK,
        mockExecutionContext.getHandler(),
      );
      expect(mockUserModel.findById).not.toHaveBeenCalled();
    });

    it('should allow access when user.isFirstLogin is false', async () => {
      // Mock reflector to return false (no skip)
      jest.spyOn(reflector, 'get').mockReturnValue(false);

      // Mock user with isFirstLogin = false
      const mockUser = {
        _id: 'user-123',
        email: 'test@example.com',
        isFirstLogin: false,
      };
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await guard.canActivate(
        mockExecutionContext as ExecutionContext,
      );

      expect(result).toBe(true);
      expect(mockUserModel.findById).toHaveBeenCalledWith('user-123');
    });

    it('should throw ForbiddenException when user.isFirstLogin is true', async () => {
      // Mock reflector to return false (no skip)
      jest.spyOn(reflector, 'get').mockReturnValue(false);

      // Mock user with isFirstLogin = true
      const mockUser = {
        _id: 'user-123',
        email: 'test@example.com',
        isFirstLogin: true,
      };
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      await expect(
        guard.canActivate(mockExecutionContext as ExecutionContext),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        guard.canActivate(mockExecutionContext as ExecutionContext),
      ).rejects.toMatchObject({
        response: {
          code: AuthErrorCode.PASSWORD_CHANGE_REQUIRED,
        },
      });

      expect(mockUserModel.findById).toHaveBeenCalledWith('user-123');
    });

    it('should throw ForbiddenException when user is not found in request', async () => {
      // Mock reflector to return false (no skip)
      jest.spyOn(reflector, 'get').mockReturnValue(false);

      // Mock execution context with no user
      const contextWithoutUser = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: null,
          }),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      };

      await expect(
        guard.canActivate(contextWithoutUser as ExecutionContext),
      ).rejects.toThrow(ForbiddenException);

      expect(mockUserModel.findById).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user document is not found', async () => {
      // Mock reflector to return false (no skip)
      jest.spyOn(reflector, 'get').mockReturnValue(false);

      // Mock user not found in database
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        guard.canActivate(mockExecutionContext as ExecutionContext),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        guard.canActivate(mockExecutionContext as ExecutionContext),
      ).rejects.toMatchObject({
        response: {
          code: AuthErrorCode.USER_NOT_FOUND,
        },
      });

      expect(mockUserModel.findById).toHaveBeenCalledWith('user-123');
    });

    it('should handle database errors gracefully', async () => {
      // Mock reflector to return false (no skip)
      jest.spyOn(reflector, 'get').mockReturnValue(false);

      // Mock database error
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      await expect(
        guard.canActivate(mockExecutionContext as ExecutionContext),
      ).rejects.toThrow(ForbiddenException);

      expect(mockUserModel.findById).toHaveBeenCalledWith('user-123');
    });

    it('should check isFirstLogin flag correctly', async () => {
      // Mock reflector to return false (no skip)
      jest.spyOn(reflector, 'get').mockReturnValue(false);

      // Test with isFirstLogin = false
      const mockUserNotFirstLogin = {
        _id: 'user-123',
        email: 'test@example.com',
        isFirstLogin: false,
      };
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUserNotFirstLogin),
      });

      const result1 = await guard.canActivate(
        mockExecutionContext as ExecutionContext,
      );
      expect(result1).toBe(true);

      // Test with isFirstLogin = true
      const mockUserFirstLogin = {
        _id: 'user-123',
        email: 'test@example.com',
        isFirstLogin: true,
      };
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUserFirstLogin),
      });

      await expect(
        guard.canActivate(mockExecutionContext as ExecutionContext),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
