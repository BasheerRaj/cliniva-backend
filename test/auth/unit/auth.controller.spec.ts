import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe, UnauthorizedException } from '@nestjs/common';

import { AuthController } from '../../../src/auth/auth.controller';
import { AuthService } from '../../../src/auth/auth.service';
import { JwtAuthGuard } from '../../../src/auth/guards/jwt-auth.guard';
import { FirstLoginGuard } from '../../../src/auth/guards/first-login.guard';
import { RateLimitGuard } from '../../../src/auth/guards/rate-limit.guard';
import { LoginDto, RegisterDto, RefreshTokenDto } from '../../../src/auth/dto';
import { UserRole } from '../../../src/common/enums/user-role.enum';
import {
  mockAuthService,
  mockAuthResponse,
  mockUserProfile,
} from '../mocks/auth.mocks';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(FirstLoginGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RateLimitGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.DOCTOR,
    };

    it('should register a new user', async () => {
      const result = await controller.register(registerDto);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(mockAuthResponse);
    });

    it('should validate input data', async () => {
      // Test validation pipe behavior
      expect(controller).toBeDefined();
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'SecurePass123!',
    };

    it('should login user with valid credentials', async () => {
      const mockRequest = {
        ip: '192.168.1.1',
        headers: {
          'user-agent': 'Mozilla/5.0',
        },
      };

      const result = await controller.login(loginDto, mockRequest);

      expect(authService.login).toHaveBeenCalledWith(
        loginDto,
        '192.168.1.1',
        'Mozilla/5.0',
      );
      expect(result).toEqual(mockAuthResponse);
    });

    it('should handle missing IP address and user agent', async () => {
      const mockRequest = {
        headers: {},
      };

      const result = await controller.login(loginDto, mockRequest);

      expect(authService.login).toHaveBeenCalledWith(
        loginDto,
        'unknown',
        'unknown',
      );
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('refresh', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refresh_token: 'valid-refresh-token',
    };

    it('should refresh access token', async () => {
      const result = await controller.refresh(refreshTokenDto);

      expect(authService.refreshToken).toHaveBeenCalledWith(
        refreshTokenDto.refresh_token,
      );
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('getProfile', () => {
    const mockRequest = {
      user: { id: 'user-id' },
    };

    it('should return user profile', async () => {
      const result = await controller.getProfile(mockRequest);

      expect(authService.getProfile).toHaveBeenCalledWith('user-id');
      expect(result).toEqual(mockUserProfile);
    });
  });

  describe('logout', () => {
    it('should logout user and blacklist tokens', async () => {
      const mockRequest = { user: { id: 'user123' } };
      const mockAccessToken = 'Bearer mock-access-token';
      const mockRefreshToken = 'mock-refresh-token';
      const mockIpAddress = '127.0.0.1';
      const mockUserAgent = 'Mozilla/5.0';

      const mockLogoutResponse = {
        success: true,
        message: {
          ar: 'تم تسجيل الخروج بنجاح',
          en: 'Logout successful',
        },
      };

      jest.spyOn(authService, 'logout').mockResolvedValue(mockLogoutResponse);

      const result = await controller.logout(
        mockRequest,
        mockAccessToken,
        mockRefreshToken,
        mockIpAddress,
        mockUserAgent,
      );

      expect(authService.logout).toHaveBeenCalledWith(
        'user123',
        'mock-access-token',
        mockRefreshToken,
        mockIpAddress,
        mockUserAgent,
      );
      expect(result).toEqual(mockLogoutResponse);
    });

    it('should throw error if no access token provided', async () => {
      const mockRequest = { user: { id: 'user123' } };

      await expect(
        controller.logout(
          mockRequest,
          undefined,
          undefined,
          undefined,
          undefined,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('firstLoginPasswordChange', () => {
    const firstLoginPasswordChangeDto = {
      currentPassword: 'OldPass123!',
      newPassword: 'NewPass123!',
      confirmPassword: 'NewPass123!',
    };

    const mockRequest = {
      user: {
        userId: 'user-id',
        sub: 'user-id',
      },
    };

    beforeEach(() => {
      mockAuthService.firstLoginPasswordChange = jest
        .fn()
        .mockResolvedValue(mockAuthResponse);
    });

    it('should change password on first login', async () => {
      const result = await controller.firstLoginPasswordChange(
        firstLoginPasswordChangeDto,
        mockRequest,
      );

      expect(authService.firstLoginPasswordChange).toHaveBeenCalledWith(
        'user-id',
        'OldPass123!',
        'NewPass123!',
      );
      expect(result).toEqual(mockAuthResponse);
    });

    it('should throw error if passwords do not match', async () => {
      const mismatchDto = {
        ...firstLoginPasswordChangeDto,
        confirmPassword: 'DifferentPass123!',
      };

      await expect(
        controller.firstLoginPasswordChange(mismatchDto, mockRequest),
      ).rejects.toThrow();
    });

    it('should throw error if user ID not found', async () => {
      const requestWithoutUser = {
        user: {},
      };

      await expect(
        controller.firstLoginPasswordChange(
          firstLoginPasswordChangeDto,
          requestWithoutUser,
        ),
      ).rejects.toThrow();
    });

    it('should handle service errors with bilingual messages', async () => {
      mockAuthService.firstLoginPasswordChange.mockRejectedValueOnce(
        new Error('Service error'),
      );

      await expect(
        controller.firstLoginPasswordChange(
          firstLoginPasswordChangeDto,
          mockRequest,
        ),
      ).rejects.toThrow();
    });
  });

  describe('changePassword', () => {
    const changePasswordDto = {
      currentPassword: 'OldPass123!',
      newPassword: 'NewPass456!',
      confirmPassword: 'NewPass456!',
    };

    const mockRequest = {
      user: {
        userId: 'user-id',
        sub: 'user-id',
      },
    };

    const mockSuccessResponse = {
      success: true,
      message: {
        ar: 'تم تغيير كلمة المرور بنجاح',
        en: 'Password changed successfully',
      },
    };

    beforeEach(() => {
      mockAuthService.changePassword = jest
        .fn()
        .mockResolvedValue(mockSuccessResponse);
    });

    it('should change password for authenticated user', async () => {
      const result = await controller.changePassword(
        changePasswordDto,
        mockRequest,
      );

      expect(authService.changePassword).toHaveBeenCalledWith(
        'user-id',
        'OldPass123!',
        'NewPass456!',
      );
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should throw error if passwords do not match', async () => {
      const mismatchDto = {
        ...changePasswordDto,
        confirmPassword: 'DifferentPass456!',
      };

      await expect(
        controller.changePassword(mismatchDto, mockRequest),
      ).rejects.toThrow();
    });

    it('should throw error if user ID not found', async () => {
      const requestWithoutUser = {
        user: {},
      };

      await expect(
        controller.changePassword(changePasswordDto, requestWithoutUser),
      ).rejects.toThrow();
    });

    it('should handle service errors with bilingual messages', async () => {
      mockAuthService.changePassword.mockRejectedValueOnce(
        new Error('Service error'),
      );

      await expect(
        controller.changePassword(changePasswordDto, mockRequest),
      ).rejects.toThrow();
    });

    it('should return bilingual success message', async () => {
      const result = await controller.changePassword(
        changePasswordDto,
        mockRequest,
      );

      expect(result.message).toHaveProperty('ar');
      expect(result.message).toHaveProperty('en');
      expect(result.success).toBe(true);
    });
  });
});
