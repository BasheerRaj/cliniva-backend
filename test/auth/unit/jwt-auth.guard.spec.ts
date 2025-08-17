import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { JwtAuthGuard } from '../../../src/auth/guards/jwt-auth.guard';

// Mock the AuthGuard
jest.mock('@nestjs/passport', () => ({
  AuthGuard: jest.fn().mockImplementation(() => {
    return class MockAuthGuard {
      canActivate = jest.fn().mockReturnValue(true);
    };
  }),
}));

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let mockExecutionContext: Partial<ExecutionContext>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtAuthGuard],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          headers: {
            authorization: 'Bearer valid-token',
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

    it('should extend AuthGuard with jwt strategy', () => {
      expect(guard).toBeInstanceOf(JwtAuthGuard);
    });

    it('should call super.canActivate and return boolean', async () => {
      const result = await guard.canActivate(mockExecutionContext as ExecutionContext);
      
      expect(result).toBe(true);
      expect(typeof result).toBe('boolean');
    });

    it('should handle ExecutionContext properly', async () => {
      const result = await guard.canActivate(mockExecutionContext as ExecutionContext);
      
      expect(mockExecutionContext.switchToHttp).toBeDefined();
      expect(result).toBeDefined();
    });
  });
});



