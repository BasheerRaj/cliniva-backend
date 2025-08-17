// Mock bcrypt at the top level - must be before imports
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

import { AuthService } from '../../../src/auth/auth.service';
import { User } from '../../../src/database/schemas/user.schema';
import { LoginDto, RegisterDto } from '../../../src/auth/dto';
import { UserRole } from '../../../src/common/enums/user-role.enum';
import { mockUser, mockUserModel, mockJwtService } from '../mocks/auth.mocks';

describe('AuthService', () => {
  let service: AuthService;
  let userModel: Model<User>;
  let jwtService: JwtService;

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
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userModel = module.get<Model<User>>(getModelToken(User.name));
    jwtService = module.get<JwtService>(JwtService);
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

    it('should successfully login with valid credentials', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockUserModel.findByIdAndUpdate.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ 
        email: loginDto.email.toLowerCase() 
      });
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(mockUser.email);
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockUserModel.findOne.mockResolvedValue(inactiveUser);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
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
});



