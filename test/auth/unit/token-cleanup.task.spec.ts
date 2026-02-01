import { Test, TestingModule } from '@nestjs/testing';
import { TokenCleanupTask } from '../../../src/auth/token-cleanup.task';
import { SessionService } from '../../../src/auth/session.service';

describe('TokenCleanupTask', () => {
  let task: TokenCleanupTask;
  let sessionService: SessionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenCleanupTask,
        {
          provide: SessionService,
          useValue: {
            cleanupExpiredTokens: jest.fn(),
          },
        },
      ],
    }).compile();

    task = module.get<TokenCleanupTask>(TokenCleanupTask);
    sessionService = module.get<SessionService>(SessionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleTokenCleanup', () => {
    it('should call SessionService.cleanupExpiredTokens', async () => {
      // Arrange
      const deletedCount = 5;
      jest
        .spyOn(sessionService, 'cleanupExpiredTokens')
        .mockResolvedValue(deletedCount);

      // Act
      await task.handleTokenCleanup();

      // Assert
      expect(sessionService.cleanupExpiredTokens).toHaveBeenCalledTimes(1);
    });

    it('should log the number of tokens removed', async () => {
      // Arrange
      const deletedCount = 10;
      jest
        .spyOn(sessionService, 'cleanupExpiredTokens')
        .mockResolvedValue(deletedCount);
      const loggerSpy = jest.spyOn(task['logger'], 'log');

      // Act
      await task.handleTokenCleanup();

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        'Starting scheduled token blacklist cleanup',
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        `Token cleanup completed successfully. Removed ${deletedCount} expired token(s) from blacklist`,
      );
    });

    it('should log warning when high number of tokens are cleaned up', async () => {
      // Arrange
      const deletedCount = 1500;
      jest
        .spyOn(sessionService, 'cleanupExpiredTokens')
        .mockResolvedValue(deletedCount);
      const warnSpy = jest.spyOn(task['logger'], 'warn');

      // Act
      await task.handleTokenCleanup();

      // Assert
      expect(warnSpy).toHaveBeenCalledWith(
        `High number of expired tokens cleaned up: ${deletedCount}. Consider reviewing token expiration settings.`,
      );
    });

    it('should handle errors gracefully without throwing', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      jest
        .spyOn(sessionService, 'cleanupExpiredTokens')
        .mockRejectedValue(error);
      const errorSpy = jest.spyOn(task['logger'], 'error');

      // Act & Assert - should not throw
      await expect(task.handleTokenCleanup()).resolves.not.toThrow();
      expect(errorSpy).toHaveBeenCalledWith(
        `Token cleanup failed: ${error.message}`,
        error.stack,
      );
    });
  });

  describe('triggerManualCleanup', () => {
    it('should call SessionService.cleanupExpiredTokens', async () => {
      // Arrange
      const deletedCount = 3;
      jest
        .spyOn(sessionService, 'cleanupExpiredTokens')
        .mockResolvedValue(deletedCount);

      // Act
      const result = await task.triggerManualCleanup();

      // Assert
      expect(sessionService.cleanupExpiredTokens).toHaveBeenCalledTimes(1);
      expect(result).toBe(deletedCount);
    });

    it('should log manual cleanup trigger', async () => {
      // Arrange
      const deletedCount = 7;
      jest
        .spyOn(sessionService, 'cleanupExpiredTokens')
        .mockResolvedValue(deletedCount);
      const loggerSpy = jest.spyOn(task['logger'], 'log');

      // Act
      await task.triggerManualCleanup();

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('Manual token cleanup triggered');
      expect(loggerSpy).toHaveBeenCalledWith(
        `Manual cleanup completed. Removed ${deletedCount} expired token(s)`,
      );
    });

    it('should throw error when cleanup fails', async () => {
      // Arrange
      const error = new Error('Cleanup failed');
      jest
        .spyOn(sessionService, 'cleanupExpiredTokens')
        .mockRejectedValue(error);

      // Act & Assert
      await expect(task.triggerManualCleanup()).rejects.toThrow(
        'Cleanup failed',
      );
    });
  });
});
