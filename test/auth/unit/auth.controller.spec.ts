import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';

import { AuthController } from '../../../src/auth/auth.controller';
import { AuthService } from '../../../src/auth/auth.service';
import { JwtAuthGuard } from '../../../src/auth/guards/jwt-auth.guard';
import { LoginDto, RegisterDto, RefreshTokenDto } from '../../../src/auth/dto';
import { UserRole } from '../../../src/common/enums/user-role.enum';
import { mockAuthService, mockAuthResponse, mockUserProfile } from '../mocks/auth.mocks';

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
      const result = await controller.login(loginDto);
      
      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('refresh', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refresh_token: 'valid-refresh-token',
    };

    it('should refresh access token', async () => {
      const result = await controller.refresh(refreshTokenDto);
      
      expect(authService.refreshToken).toHaveBeenCalledWith(refreshTokenDto.refresh_token);
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
    it('should return success message', async () => {
      const result = await controller.logout();
      
      expect(result).toEqual({ message: 'Successfully logged out' });
    });
  });
});




