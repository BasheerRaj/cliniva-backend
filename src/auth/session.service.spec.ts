import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SessionService } from './session.service';
import { TokenService } from './token.service';
import { TokenBlacklist } from '../database/schemas/token-blacklist.schema';
import { Session } from '../database/schemas/session.schema';

describe('SessionService', () => {
  let service: SessionService;
  let tokenBlacklistModel: Model<TokenBlacklist>;
  let sessionModel: Model<Session>;
  let tokenService: TokenService;

  // Mock data
  const mockUserId = new Types.ObjectId().toString();
  const mockAdminId = new Types.ObjectId().toString();
  const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
  const mockTokenHash = 'abc123hash';
  const mockExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

  // Mock TokenBlacklist model
  const mockTokenBlacklistModel = {
    new: jest.fn(),
    constructor: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
    deleteMany: jest.fn(),
    updateMany: jest.fn(),
    save: jest.fn(),
  };

  // Mock Session model
  const mockSessionModel = {
    new: jest.fn(),
    constructor: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    updateMany: jest.fn(),
    save: jest.fn(),
  };

  // Mock TokenService
  const mockTokenService = {
    hashToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: getModelToken(TokenBlacklist.name),
          useValue: mockTokenBlacklistModel,
        },
        {
          provide: getModelToken(Session.name),
          useValue: mockSessionModel,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    tokenBlacklistModel = module.get<Model<TokenBlacklist>>(
      getModelToken(TokenBlacklist.name),
    );
    sessionModel = module.get<Model<Session>>(getModelToken(Session.name));
    tokenService = module.get<TokenService>(TokenService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('invalidateUserSessions', () => {
    it('should invalidate all active sessions for a user', async () => {
      const reason = 'password_change';
      const mockSessions = [
        {
          _id: new Types.ObjectId(),
          userId: new Types.ObjectId(mockUserId),
          token: mockTokenHash,
          expiresAt: mockExpiresAt,
          isActive: true,
        },
      ];

      mockSessionModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSessions),
      });

      mockSessionModel.updateMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      });

      const result = await service.invalidateUserSessions(mockUserId, reason);

      expect(result).toBe(1);
      expect(mockSessionModel.find).toHaveBeenCalledWith({
        userId: new Types.ObjectId(mockUserId),
        isActive: true,
      });
      expect(mockSessionModel.updateMany).toHaveBeenCalled();
    });

    it('should return 0 if no active sessions found', async () => {
      const reason = 'email_change';

      mockSessionModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await service.invalidateUserSessions(mockUserId, reason);

      expect(result).toBe(0);
    });
  });

  describe('addTokenToBlacklist', () => {
    it('should add a token to the blacklist', async () => {
      mockTokenService.hashToken.mockReturnValue(mockTokenHash);

      const mockSave = jest.fn().mockResolvedValue({});
      mockTokenBlacklistModel.new = jest.fn().mockImplementation(() => ({
        save: mockSave,
      }));

      // Create a mock constructor that returns an object with save method
      const mockBlacklistEntry = {
        tokenHash: mockTokenHash,
        userId: new Types.ObjectId(mockUserId),
        expiresAt: mockExpiresAt,
        blacklistedAt: expect.any(Date),
        reason: 'logout',
        save: mockSave,
      };

      // Mock the model constructor
      (tokenBlacklistModel as any) = jest
        .fn()
        .mockImplementation(() => mockBlacklistEntry);
      service = new SessionService(tokenBlacklistModel as any, tokenService);

      await service.addTokenToBlacklist(
        mockToken,
        mockUserId,
        mockExpiresAt,
        'logout',
      );

      expect(mockTokenService.hashToken).toHaveBeenCalledWith(mockToken);
      expect(mockSave).toHaveBeenCalled();
    });

    it('should add a token to the blacklist with admin ID', async () => {
      mockTokenService.hashToken.mockReturnValue(mockTokenHash);

      const mockSave = jest.fn().mockResolvedValue({});
      const mockBlacklistEntry = {
        tokenHash: mockTokenHash,
        userId: new Types.ObjectId(mockUserId),
        expiresAt: mockExpiresAt,
        blacklistedAt: expect.any(Date),
        reason: 'admin_action',
        adminId: new Types.ObjectId(mockAdminId),
        save: mockSave,
      };

      (tokenBlacklistModel as any) = jest
        .fn()
        .mockImplementation(() => mockBlacklistEntry);
      service = new SessionService(tokenBlacklistModel as any, tokenService);

      await service.addTokenToBlacklist(
        mockToken,
        mockUserId,
        mockExpiresAt,
        'admin_action',
        mockAdminId,
      );

      expect(mockTokenService.hashToken).toHaveBeenCalledWith(mockToken);
      expect(mockSave).toHaveBeenCalled();
    });

    it('should handle duplicate token gracefully', async () => {
      mockTokenService.hashToken.mockReturnValue(mockTokenHash);

      const duplicateError: any = new Error('Duplicate key');
      duplicateError.code = 11000;

      const mockSave = jest.fn().mockRejectedValue(duplicateError);
      const mockBlacklistEntry = {
        save: mockSave,
      };

      (tokenBlacklistModel as any) = jest
        .fn()
        .mockImplementation(() => mockBlacklistEntry);
      service = new SessionService(tokenBlacklistModel as any, tokenService);

      // Should not throw error for duplicate
      await expect(
        service.addTokenToBlacklist(
          mockToken,
          mockUserId,
          mockExpiresAt,
          'logout',
        ),
      ).resolves.not.toThrow();
    });
  });

  describe('isTokenBlacklisted', () => {
    it('should return true if token is blacklisted', async () => {
      const mockBlacklistedToken = {
        tokenHash: mockTokenHash,
        userId: new Types.ObjectId(mockUserId),
        expiresAt: mockExpiresAt,
      };

      mockTokenBlacklistModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockBlacklistedToken),
        }),
      });

      const result = await service.isTokenBlacklisted(mockTokenHash);

      expect(result).toBe(true);
      expect(mockTokenBlacklistModel.findOne).toHaveBeenCalledWith({
        tokenHash: mockTokenHash,
      });
    });

    it('should return false if token is not blacklisted', async () => {
      mockTokenBlacklistModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      const result = await service.isTokenBlacklisted(mockTokenHash);

      expect(result).toBe(false);
    });

    it('should return true on error (fail secure)', async () => {
      mockTokenBlacklistModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockRejectedValue(new Error('Database error')),
        }),
      });

      const result = await service.isTokenBlacklisted(mockTokenHash);

      expect(result).toBe(true);
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should remove expired tokens and return count', async () => {
      const deletedCount = 5;

      mockTokenBlacklistModel.deleteMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount }),
      });

      const result = await service.cleanupExpiredTokens();

      expect(result).toBe(deletedCount);
      expect(mockTokenBlacklistModel.deleteMany).toHaveBeenCalledWith({
        expiresAt: { $lt: expect.any(Date) },
      });
    });

    it('should return 0 if no tokens were deleted', async () => {
      mockTokenBlacklistModel.deleteMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      });

      const result = await service.cleanupExpiredTokens();

      expect(result).toBe(0);
    });

    it('should handle undefined deletedCount', async () => {
      mockTokenBlacklistModel.deleteMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue({}),
      });

      const result = await service.cleanupExpiredTokens();

      expect(result).toBe(0);
    });
  });

  describe('getActiveSessionCount', () => {
    it('should return count of blacklisted tokens for a user', async () => {
      const count = 3;

      mockTokenBlacklistModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(count),
      });

      const result = await service.getActiveSessionCount(mockUserId);

      expect(result).toBe(count);
      expect(mockTokenBlacklistModel.countDocuments).toHaveBeenCalledWith({
        userId: new Types.ObjectId(mockUserId),
        expiresAt: { $gt: expect.any(Date) },
      });
    });

    it('should return 0 if user has no blacklisted tokens', async () => {
      mockTokenBlacklistModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      const result = await service.getActiveSessionCount(mockUserId);

      expect(result).toBe(0);
    });
  });

  describe('invalidateAllUserTokens', () => {
    it('should call invalidateUserSessions with default reason and return count', async () => {
      const spy = jest
        .spyOn(service, 'invalidateUserSessions')
        .mockResolvedValue(2);

      const result = await service.invalidateAllUserTokens(mockUserId);

      expect(spy).toHaveBeenCalledWith(mockUserId, 'manual_invalidation');
      expect(result).toBe(2);
    });
  });
});
