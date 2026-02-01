import { User } from '../../../src/database/schemas/user.schema';
import { AuthResponseDto, UserProfileDto } from '../../../src/auth/dto';

// Mock User Document
export const mockUser = {
  _id: '507f1f77bcf86cd799439011' as any,
  email: 'test@example.com',
  passwordHash: '$2b$12$hashedPassword',
  firstName: 'John',
  lastName: 'Doe',
  phone: '+1234567890',
  role: 'doctor',
  nationality: 'US',
  dateOfBirth: new Date('1990-01-01'),
  gender: 'male',
  isActive: true,
  emailVerified: false,
  twoFactorEnabled: false,
  lastLogin: new Date(),
  passwordResetToken: null,
  passwordResetExpires: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  save: jest.fn().mockResolvedValue(this),
} as unknown as User;

// Mock inactive user
export const mockInactiveUser = {
  ...mockUser,
  isActive: false,
} as unknown as User;

// Mock Auth Response
export const mockAuthResponse: AuthResponseDto = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 86400,
  user: {
    id: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'doctor',
    isActive: true,
    emailVerified: false,
  },
};

// Mock User Profile
export const mockUserProfile: UserProfileDto = {
  id: '507f1f77bcf86cd799439011',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  phone: '+1234567890',
  role: 'doctor',
  nationality: 'US',
  dateOfBirth: new Date('1990-01-01'),
  gender: 'male',
  isActive: true,
  emailVerified: false,
  twoFactorEnabled: false,
  lastLogin: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock Mongoose User Model
export const mockUserModel = {
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  // Mock constructor function
  new: jest.fn().mockImplementation((data) => ({
    ...data,
    save: jest.fn().mockResolvedValue({ ...data, _id: '507f1f77bcf86cd799439011' }),
  })),
} as any;

// Mock JWT Service
export const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-token'),
  signAsync: jest.fn().mockResolvedValue('mock-token'),
  verify: jest.fn().mockReturnValue({ sub: '507f1f77bcf86cd799439011', email: 'test@example.com' }),
  verifyAsync: jest.fn(),
};

// Mock Auth Service
export const mockAuthService = {
  register: jest.fn().mockResolvedValue(mockAuthResponse),
  login: jest.fn().mockResolvedValue(mockAuthResponse),
  refreshToken: jest.fn().mockResolvedValue(mockAuthResponse),
  getProfile: jest.fn().mockResolvedValue(mockUserProfile),
  validateUserById: jest.fn().mockResolvedValue(mockUser),
  logout: jest.fn().mockResolvedValue({
    success: true,
    message: {
      ar: 'تم تسجيل الخروج بنجاح',
      en: 'Logout successful',
    },
  }),
};

// Mock JWT Strategy User
export const mockJwtUser = {
  id: '507f1f77bcf86cd799439011',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'doctor',
  isActive: true,
  emailVerified: false,
  permissions: [],
};

// Mock Request with User
export const mockRequestWithUser = {
  user: mockJwtUser,
  headers: {
    authorization: 'Bearer mock-token',
  },
};

// Mock JWT Payload
export const mockJwtPayload = {
  sub: '507f1f77bcf86cd799439011',
  email: 'test@example.com',
  role: 'doctor',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 86400,
};

// Test Utilities
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  ...mockUser,
  ...overrides,
} as User);

export const createMockAuthResponse = (overrides: Partial<AuthResponseDto> = {}): AuthResponseDto => ({
  ...mockAuthResponse,
  ...overrides,
});

// Error Messages
export const AUTH_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid credentials',
  USER_EXISTS: 'User with this email already exists',
  ACCOUNT_INACTIVE: 'Account is inactive',
  INVALID_TOKEN: 'Invalid token',
  USER_NOT_FOUND: 'User not found',
  REGISTRATION_FAILED: 'Registration failed',
  AUTHENTICATION_FAILED: 'Authentication failed',
};



