// Mock bcrypt at the top level - must be before imports
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Mock crypto module
jest.mock('crypto', () => ({
  randomBytes: jest.fn(),
  createHash: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { AuthService } from '../../../src/auth/auth.service';
import { User } from '../../../src/database/schemas/user.schema';
import { LoginDto, RegisterDto } from '../../../src/auth/dto';
import { UserRole } from '../../../src/common/enums/user-role.enum';
import { mockUser, mockUserModel, mockJwtService } from '../mocks/auth.mocks';
import { RateLimitService } from '../../../src/auth/rate-limit.service';
import { AuditService } from '../../../src/auth/audit.service';
import { SessionService } from '../../../src/auth/session.service';
import { SubscriptionService } from '../../../src/subscription/subscription.service';

describe('AuthService', () => {
  let service: AuthService;
  let userModel: Model<User>;
  let jwtService: JwtService;
  let rateLimitService: RateLimitService;
  let auditService: AuditService;
  let sessionService: SessionService;
  let subscriptionService: SubscriptionService;

  // Mock services
  const mockRateLimitService = {
    checkPasswordResetLimit: jest.fn(),
    checkPasswordChangeLimit: jest.fn(),
  };

  const mockAuditService = {
    logPasswordResetRequest: jest.fn(),
    logPasswordChange: jest.fn(),
  };

  const mockSessionService = {
    invalidateUserSessions: jest.fn(),
  };

  const mockSubscriptionService = {
    getSubscriptionById: jest.fn(),
  };

  beforeAll(() => {
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_SECRET = 'test-secret';
  });

  beforeEach(async () => {
    // Create a constructor function for the model
    const UserModelConstructor = function(data: any) {
      return {
        ...data,
        save: jest.fn().mockResolvedValue({ ...data, _id: '507f1f77bcf86cd799439011' }),
      };
    };
    
    // Add static methods to the constructor
    Object.assign(UserModelConstructor, mockUserModel);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(User.name),
          useValue: UserModelConstructor,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: RateLimitService,
          useValue: mockRateLimitService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
        {
          provide: SubscriptionService,
          useValue: mockSubscriptionService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userModel = module.get<Model<User>>(getModelToken(User.name));
    jwtService = module.get<JwtService>(JwtService);
    rateLimitService = module.get<RateLimitService>(RateLimitService);
    auditService = module.get<AuditService>(AuditService);
    sessionService = module.get<SessionService>(SessionService);
    subscriptionService = module.get<SubscriptionService>(SubscriptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset bcrypt mocks
    (bcrypt.hash as jest.Mock).mockClear();
    (bcrypt.compare as jest.Mock).mockClear();
    (bcrypt.hash as jest.Mock).mockReset();
    (bcrypt.compare as jest.Mock).mockReset();
    // Reset JWT service mocks
    mockJwtService.verifyAsync.mockClear();
    mockJwtService.verify.mockClear();
    mockJwtService.sign.mockClear();
    mockJwtService.signAsync.mockClear();
    // Reset JWT service mock implementations
    mockJwtService.verifyAsync.mockReset();
    mockJwtService.verify.mockReset();
    // Reset crypto mocks
    (crypto.randomBytes as jest.Mock).mockClear();
    (crypto.createHash as jest.Mock).mockClear();
    // Reset service mocks
    mockRateLimitService.checkPasswordResetLimit.mockClear();
    mockRateLimitService.checkPasswordChangeLimit.mockClear();
    mockAuditService.logPasswordResetRequest.mockClear();
    mockAuditService.logPasswordChange.mockClear();
    mockSessionService.invalidateUserSessions.mockClear();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.DOCTOR,
    };

    it('should successfully register a new user', async () => {
      mockUserModel.findOne.mockResolvedValue(null);
      mockUserModel.findByIdAndUpdate.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      const result = await service.register(registerDto);

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ 
        email: registerDto.email.toLowerCase() 
      });
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(registerDto.email);
    });

    it('should throw ConflictException if user already exists', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should hash password before saving', async () => {
      mockUserModel.findOne.mockResolvedValue(null);
      mockUserModel.findByIdAndUpdate.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      await service.register(registerDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 12);
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'SecurePass123!',
    };
    const ipAddress = '192.168.1.1';
    const userAgent = 'Mozilla/5.0';

    beforeEach(() => {
      // Reset mocks before each test
      mockAuditService.logLoginSuccess = jest.fn();
      mockAuditService.logLoginFailure = jest.fn();
    });

    it('should successfully login with valid credentials', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockUserModel.findByIdAndUpdate.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto, ipAddress, userAgent);

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ 
        email: loginDto.email.toLowerCase() 
      });
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(mockUser.email);
      
      // Verify audit logging for successful login
      expect(mockAuditService.logLoginSuccess).toHaveBeenCalledWith(
        mockUser._id.toString(),
        ipAddress,
        userAgent,
      );
    });

    it('should include isFirstLogin and passwordChangeRequired in response', async () => {
      const firstLoginUser = { ...mockUser, isFirstLogin: true };
      mockUserModel.findOne.mockResolvedValue(firstLoginUser);
      mockUserModel.findByIdAndUpdate.mockResolvedValue(firstLoginUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto, ipAddress, userAgent);

      expect(result.user.isFirstLogin).toBe(true);
      expect(result.user.passwordChangeRequired).toBe(true);
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto, ipAddress, userAgent)).rejects.toThrow(
        UnauthorizedException,
      );
      
      // Verify audit logging for failed login
      expect(mockAuditService.logLoginFailure).toHaveBeenCalledWith(
        loginDto.email,
        ipAddress,
        'invalid_credentials',
      );
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto, ipAddress, userAgent)).rejects.toThrow(
        UnauthorizedException,
      );
      
      // Verify audit logging for failed login
      expect(mockAuditService.logLoginFailure).toHaveBeenCalledWith(
        loginDto.email,
        ipAddress,
        'invalid_credentials',
      );
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockUserModel.findOne.mockResolvedValue(inactiveUser);

      await expect(service.login(loginDto, ipAddress, userAgent)).rejects.toThrow(
        UnauthorizedException,
      );
      
      // Verify audit logging for failed login
      expect(mockAuditService.logLoginFailure).toHaveBeenCalledWith(
        loginDto.email,
        ipAddress,
        'account_inactive',
      );
    });

    it('should work without ipAddress and userAgent (backward compatibility)', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockUserModel.findByIdAndUpdate.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
      // Should not call audit service if no ipAddress provided
      expect(mockAuditService.logLoginSuccess).not.toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    const refreshToken = 'valid-refresh-token';

    it('should successfully refresh valid token', async () => {
      const payload = { sub: mockUser._id, email: mockUser.email };
      mockJwtService.verify.mockReturnValue(payload);
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockUserModel.findByIdAndUpdate.mockResolvedValue(mockUser);

      const result = await service.refreshToken(refreshToken);

      expect(mockJwtService.verify).toHaveBeenCalledWith(refreshToken, {
        secret: 'test-refresh-secret',
      });
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const payload = { sub: 'nonexistent-id', email: 'test@example.com' };
      mockJwtService.verifyAsync.mockResolvedValue(payload);
      mockUserModel.findById.mockResolvedValue(null);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateUserById', () => {
    it('should return user for valid and active user ID', async () => {
      mockUserModel.findById.mockResolvedValue(mockUser);

      const result = await service.validateUserById(mockUser._id as string);

      expect(mockUserModel.findById).toHaveBeenCalledWith(mockUser._id);
      expect(result).toEqual(mockUser);
    });

    it('should return null for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockUserModel.findById.mockResolvedValue(inactiveUser);

      const result = await service.validateUserById(mockUser._id as string);

      expect(result).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      const result = await service.validateUserById('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('getProfile', () => {
    it('should return user profile for valid user ID', async () => {
      mockUserModel.findById.mockResolvedValue(mockUser);

      const result = await service.getProfile(mockUser._id as string);

      expect(mockUserModel.findById).toHaveBeenCalledWith(mockUser._id);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email', mockUser.email);
    });

    it('should throw NotFoundException for invalid user ID', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      await expect(service.getProfile('invalid-id')).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('forgotPassword', () => {
    const email = 'test@example.com';
    const ipAddress = '192.168.1.1';
    const resetToken = 'random-reset-token-32-bytes-long';
    const hashedToken = 'hashed-token';

    beforeEach(() => {
      // Mock crypto.randomBytes
      (crypto.randomBytes as jest.Mock).mockReturnValue({
        toString: jest.fn().mockReturnValue(resetToken),
      });

      // Mock crypto.createHash
      const mockHashInstance = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(hashedToken),
      };
      (crypto.createHash as jest.Mock).mockReturnValue(mockHashInstance);
    });

    it('should successfully process password reset for existing user', async () => {
      // Arrange
      const userWithSave = {
        ...mockUser,
        save: jest.fn().mockResolvedValue(mockUser),
      };
      mockRateLimitService.checkPasswordResetLimit.mockResolvedValue(true);
      mockUserModel.findOne.mockResolvedValue(userWithSave);
      mockAuditService.logPasswordResetRequest.mockResolvedValue(undefined);

      // Act
      const result = await service.forgotPassword(email, ipAddress);

      // Assert
      expect(mockRateLimitService.checkPasswordResetLimit).toHaveBeenCalledWith(ipAddress);
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: email.toLowerCase() });
      expect(userWithSave.save).toHaveBeenCalled();
      expect(mockAuditService.logPasswordResetRequest).toHaveBeenCalledWith(email, ipAddress);
      expect(result.success).toBe(true);
      expect(result.message).toHaveProperty('ar');
      expect(result.message).toHaveProperty('en');
    });

    it('should generate secure 32-byte reset token', async () => {
      // Arrange
      const userWithSave = {
        ...mockUser,
        save: jest.fn().mockResolvedValue(mockUser),
      };
      mockRateLimitService.checkPasswordResetLimit.mockResolvedValue(true);
      mockUserModel.findOne.mockResolvedValue(userWithSave);

      // Act
      await service.forgotPassword(email, ipAddress);

      // Assert
      expect(crypto.randomBytes).toHaveBeenCalledWith(32);
    });

    it('should hash token before storing', async () => {
      // Arrange
      const userWithSave = {
        ...mockUser,
        save: jest.fn().mockResolvedValue(mockUser),
      };
      mockRateLimitService.checkPasswordResetLimit.mockResolvedValue(true);
      mockUserModel.findOne.mockResolvedValue(userWithSave);

      // Act
      await service.forgotPassword(email, ipAddress);

      // Assert
      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
      expect(userWithSave.passwordResetToken).toBe(hashedToken);
    });

    it('should set password reset expiration to 24 hours', async () => {
      // Arrange
      const userWithSave = {
        ...mockUser,
        save: jest.fn().mockResolvedValue(mockUser),
      };
      mockRateLimitService.checkPasswordResetLimit.mockResolvedValue(true);
      mockUserModel.findOne.mockResolvedValue(userWithSave);

      const beforeTime = Date.now();

      // Act
      await service.forgotPassword(email, ipAddress);

      const afterTime = Date.now();

      // Assert
      expect(userWithSave.passwordResetExpires).toBeDefined();
      const expiresTime = new Date(userWithSave.passwordResetExpires).getTime();
      const expectedMin = beforeTime + 24 * 60 * 60 * 1000;
      const expectedMax = afterTime + 24 * 60 * 60 * 1000;
      expect(expiresTime).toBeGreaterThanOrEqual(expectedMin);
      expect(expiresTime).toBeLessThanOrEqual(expectedMax);
    });

    it('should set passwordResetUsed to false', async () => {
      // Arrange
      const userWithSave = {
        ...mockUser,
        save: jest.fn().mockResolvedValue(mockUser),
      };
      mockRateLimitService.checkPasswordResetLimit.mockResolvedValue(true);
      mockUserModel.findOne.mockResolvedValue(userWithSave);

      // Act
      await service.forgotPassword(email, ipAddress);

      // Assert
      expect(userWithSave.passwordResetUsed).toBe(false);
    });

    it('should return success response even for non-existent email', async () => {
      // Arrange
      mockRateLimitService.checkPasswordResetLimit.mockResolvedValue(true);
      mockUserModel.findOne.mockResolvedValue(null);
      mockAuditService.logPasswordResetRequest.mockResolvedValue(undefined);

      // Act
      const result = await service.forgotPassword('nonexistent@example.com', ipAddress);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toHaveProperty('ar');
      expect(result.message).toHaveProperty('en');
      expect(mockAuditService.logPasswordResetRequest).toHaveBeenCalled();
    });

    it('should throw BadRequestException when rate limit exceeded', async () => {
      // Arrange
      mockRateLimitService.checkPasswordResetLimit.mockResolvedValue(false);

      // Act & Assert
      await expect(service.forgotPassword(email, ipAddress)).rejects.toThrow(BadRequestException);
      expect(mockUserModel.findOne).not.toHaveBeenCalled();
    });

    it('should log audit event for existing user', async () => {
      // Arrange
      const userWithSave = {
        ...mockUser,
        save: jest.fn().mockResolvedValue(mockUser),
      };
      mockRateLimitService.checkPasswordResetLimit.mockResolvedValue(true);
      mockUserModel.findOne.mockResolvedValue(userWithSave);
      mockAuditService.logPasswordResetRequest.mockResolvedValue(undefined);

      // Act
      await service.forgotPassword(email, ipAddress);

      // Assert
      expect(mockAuditService.logPasswordResetRequest).toHaveBeenCalledWith(email, ipAddress);
    });

    it('should log audit event for non-existent user', async () => {
      // Arrange
      mockRateLimitService.checkPasswordResetLimit.mockResolvedValue(true);
      mockUserModel.findOne.mockResolvedValue(null);
      mockAuditService.logPasswordResetRequest.mockResolvedValue(undefined);

      // Act
      await service.forgotPassword(email, ipAddress);

      // Assert
      expect(mockAuditService.logPasswordResetRequest).toHaveBeenCalledWith(email, ipAddress);
    });

    it('should return bilingual success message', async () => {
      // Arrange
      mockRateLimitService.checkPasswordResetLimit.mockResolvedValue(true);
      mockUserModel.findOne.mockResolvedValue(null);

      // Act
      const result = await service.forgotPassword(email, ipAddress);

      // Assert
      expect(result.message.ar).toBeTruthy();
      expect(result.message.en).toBeTruthy();
      expect(typeof result.message.ar).toBe('string');
      expect(typeof result.message.en).toBe('string');
    });

    it('should handle errors gracefully and return success message', async () => {
      // Arrange
      mockRateLimitService.checkPasswordResetLimit.mockResolvedValue(true);
      mockUserModel.findOne.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await service.forgotPassword(email, ipAddress);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toHaveProperty('ar');
      expect(result.message).toHaveProperty('en');
    });
  });

  describe('resetPassword', () => {
    const resetToken = 'valid-reset-token-32-bytes-long';
    const hashedToken = 'hashed-token';
    const newPassword = 'NewSecurePass123!';

    beforeEach(() => {
      // Mock crypto.createHash for token hashing
      const mockHashInstance = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(hashedToken),
      };
      (crypto.createHash as jest.Mock).mockReturnValue(mockHashInstance);

      // Mock bcrypt.hash for password hashing
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-new-password');

      // Mock audit service
      mockAuditService.logPasswordResetComplete = jest.fn().mockResolvedValue(undefined);
    });

    it('should successfully reset password with valid token', async () => {
      // Arrange
      const userWithSave = {
        ...mockUser,
        _id: '507f1f77bcf86cd799439011',
        passwordResetToken: hashedToken,
        passwordResetExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        passwordResetUsed: false,
        save: jest.fn().mockResolvedValue(mockUser),
      };
      mockUserModel.findOne.mockResolvedValue(userWithSave);
      mockSessionService.invalidateUserSessions.mockResolvedValue(undefined);

      // Act
      const result = await service.resetPassword(resetToken, newPassword);

      // Assert
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ passwordResetToken: hashedToken });
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 12);
      expect(userWithSave.passwordHash).toBe('hashed-new-password');
      expect(userWithSave.passwordResetToken).toBeUndefined();
      expect(userWithSave.passwordResetExpires).toBeUndefined();
      expect(userWithSave.passwordResetUsed).toBe(true);
      expect(userWithSave.save).toHaveBeenCalled();
      expect(mockSessionService.invalidateUserSessions).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        'password_reset'
      );
      expect(mockAuditService.logPasswordResetComplete).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        hashedToken
      );
      expect(result.success).toBe(true);
      expect(result.message).toHaveProperty('ar');
      expect(result.message).toHaveProperty('en');
    });

    it('should throw BadRequestException for invalid token', async () => {
      // Arrange
      mockUserModel.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.resetPassword(resetToken, newPassword)).rejects.toThrow(BadRequestException);
      await expect(service.resetPassword(resetToken, newPassword)).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'PASSWORD_RESET_TOKEN_INVALID',
          message: expect.objectContaining({
            ar: expect.any(String),
            en: expect.any(String),
          }),
        }),
      });
    });

    it('should throw BadRequestException for expired token', async () => {
      // Arrange
      const userWithSave = {
        ...mockUser,
        passwordResetToken: hashedToken,
        passwordResetExpires: new Date(Date.now() - 1000), // Expired 1 second ago
        passwordResetUsed: false,
        save: jest.fn().mockResolvedValue(mockUser),
      };
      mockUserModel.findOne.mockResolvedValue(userWithSave);

      // Act & Assert
      await expect(service.resetPassword(resetToken, newPassword)).rejects.toThrow(BadRequestException);
      await expect(service.resetPassword(resetToken, newPassword)).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'PASSWORD_RESET_TOKEN_EXPIRED',
          message: expect.objectContaining({
            ar: expect.any(String),
            en: expect.any(String),
          }),
        }),
      });
    });

    it('should throw BadRequestException for already used token', async () => {
      // Arrange
      const userWithSave = {
        ...mockUser,
        passwordResetToken: hashedToken,
        passwordResetExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        passwordResetUsed: true, // Already used
        save: jest.fn().mockResolvedValue(mockUser),
      };
      mockUserModel.findOne.mockResolvedValue(userWithSave);

      // Act & Assert
      await expect(service.resetPassword(resetToken, newPassword)).rejects.toThrow(BadRequestException);
      await expect(service.resetPassword(resetToken, newPassword)).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'PASSWORD_RESET_TOKEN_USED',
          message: expect.objectContaining({
            ar: expect.any(String),
            en: expect.any(String),
          }),
        }),
      });
    });

    it('should hash token before querying database', async () => {
      // Arrange
      const userWithSave = {
        ...mockUser,
        passwordResetToken: hashedToken,
        passwordResetExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        passwordResetUsed: false,
        save: jest.fn().mockResolvedValue(mockUser),
      };
      mockUserModel.findOne.mockResolvedValue(userWithSave);

      // Act
      await service.resetPassword(resetToken, newPassword);

      // Assert
      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ passwordResetToken: hashedToken });
    });

    it('should hash new password with bcrypt (12 rounds)', async () => {
      // Arrange
      const userWithSave = {
        ...mockUser,
        passwordResetToken: hashedToken,
        passwordResetExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        passwordResetUsed: false,
        save: jest.fn().mockResolvedValue(mockUser),
      };
      mockUserModel.findOne.mockResolvedValue(userWithSave);

      // Act
      await service.resetPassword(resetToken, newPassword);

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 12);
    });

    it('should update lastPasswordChange timestamp', async () => {
      // Arrange
      const beforeTime = Date.now();
      const userWithSave = {
        ...mockUser,
        passwordResetToken: hashedToken,
        passwordResetExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        passwordResetUsed: false,
        save: jest.fn().mockResolvedValue(mockUser),
      };
      mockUserModel.findOne.mockResolvedValue(userWithSave);

      // Act
      await service.resetPassword(resetToken, newPassword);

      const afterTime = Date.now();

      // Assert
      expect(userWithSave.lastPasswordChange).toBeDefined();
      const changeTime = new Date(userWithSave.lastPasswordChange).getTime();
      expect(changeTime).toBeGreaterThanOrEqual(beforeTime);
      expect(changeTime).toBeLessThanOrEqual(afterTime);
    });

    it('should clear reset token fields after successful reset', async () => {
      // Arrange
      const userWithSave = {
        ...mockUser,
        passwordResetToken: hashedToken,
        passwordResetExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        passwordResetUsed: false,
        save: jest.fn().mockResolvedValue(mockUser),
      };
      mockUserModel.findOne.mockResolvedValue(userWithSave);

      // Act
      await service.resetPassword(resetToken, newPassword);

      // Assert
      expect(userWithSave.passwordResetToken).toBeUndefined();
      expect(userWithSave.passwordResetExpires).toBeUndefined();
    });

    it('should set passwordResetUsed to true', async () => {
      // Arrange
      const userWithSave = {
        ...mockUser,
        passwordResetToken: hashedToken,
        passwordResetExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        passwordResetUsed: false,
        save: jest.fn().mockResolvedValue(mockUser),
      };
      mockUserModel.findOne.mockResolvedValue(userWithSave);

      // Act
      await service.resetPassword(resetToken, newPassword);

      // Assert
      expect(userWithSave.passwordResetUsed).toBe(true);
    });

    it('should invalidate all user sessions', async () => {
      // Arrange
      const userWithSave = {
        ...mockUser,
        _id: '507f1f77bcf86cd799439011',
        passwordResetToken: hashedToken,
        passwordResetExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        passwordResetUsed: false,
        save: jest.fn().mockResolvedValue(mockUser),
      };
      mockUserModel.findOne.mockResolvedValue(userWithSave);
      mockSessionService.invalidateUserSessions.mockResolvedValue(undefined);

      // Act
      await service.resetPassword(resetToken, newPassword);

      // Assert
      expect(mockSessionService.invalidateUserSessions).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        'password_reset'
      );
    });

    it('should log password reset completion in audit', async () => {
      // Arrange
      const userWithSave = {
        ...mockUser,
        _id: '507f1f77bcf86cd799439011',
        passwordResetToken: hashedToken,
        passwordResetExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        passwordResetUsed: false,
        save: jest.fn().mockResolvedValue(mockUser),
      };
      mockUserModel.findOne.mockResolvedValue(userWithSave);

      // Act
      await service.resetPassword(resetToken, newPassword);

      // Assert
      expect(mockAuditService.logPasswordResetComplete).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        hashedToken
      );
    });

    it('should return bilingual success message', async () => {
      // Arrange
      const userWithSave = {
        ...mockUser,
        passwordResetToken: hashedToken,
        passwordResetExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        passwordResetUsed: false,
        save: jest.fn().mockResolvedValue(mockUser),
      };
      mockUserModel.findOne.mockResolvedValue(userWithSave);

      // Act
      const result = await service.resetPassword(resetToken, newPassword);

      // Assert
      expect(result.message.ar).toBeTruthy();
      expect(result.message.en).toBeTruthy();
      expect(typeof result.message.ar).toBe('string');
      expect(typeof result.message.en).toBe('string');
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const userWithSave = {
        ...mockUser,
        passwordResetToken: hashedToken,
        passwordResetExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        passwordResetUsed: false,
        save: jest.fn().mockRejectedValue(new Error('Database error')),
      };
      mockUserModel.findOne.mockResolvedValue(userWithSave);

      // Act & Assert
      await expect(service.resetPassword(resetToken, newPassword)).rejects.toThrow(BadRequestException);
    });
  });
});
