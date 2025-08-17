import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../database/schemas/user.schema';
import { LoginDto, RegisterDto, AuthResponseDto, UserProfileDto } from './dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly saltRounds = 12;

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
  ) {}

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    try {
      // Check if user already exists
      const existingUser = await this.userModel.findOne({ 
        email: registerDto.email.toLowerCase() 
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(registerDto.password);

      // Create new user
      const newUser = new this.userModel({
        ...registerDto,
        email: registerDto.email.toLowerCase(),
        passwordHash: hashedPassword,
        isActive: true,
        emailVerified: false,
      });

      const savedUser = await newUser.save();
      this.logger.log(`New user registered: ${savedUser.email}`);

      // Generate tokens
      const tokens = await this.generateTokens(savedUser);

      // Update last login
      await this.updateLastLogin((savedUser._id as any).toString());

      return {
        ...tokens,
        user: {
          id: (savedUser._id as any).toString(),
          email: savedUser.email,
          firstName: savedUser.firstName,
          lastName: savedUser.lastName,
          role: savedUser.role,
          isActive: savedUser.isActive,
          emailVerified: savedUser.emailVerified,
        },
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Registration failed: ${error.message}`, error.stack);
      throw new BadRequestException('Registration failed');
    }
  }

  /**
   * Login user
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    try {
      // Find user by email
      const user = await this.userModel.findOne({ 
        email: loginDto.email.toLowerCase() 
      });

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new UnauthorizedException('Account is inactive');
      }

      // Validate password
      const isPasswordValid = await this.validatePassword(
        loginDto.password,
        user.passwordHash,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      this.logger.log(`User logged in: ${user.email}`);

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Update last login
      await this.updateLastLogin((user._id as any).toString());

      return {
        ...tokens,
        user: {
          id: (user._id as any).toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Login failed: ${error.message}`, error.stack);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
      });

      // Find user
      const user = await this.userModel.findById(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid token');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      return {
        ...tokens,
        user: {
          id: (user._id as any).toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
        },
      };
    } catch (error) {
      this.logger.error(`Token refresh failed: ${error.message}`, error.stack);
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return new UserProfileDto(user);
  }

  /**
   * Validate user by ID (used by JWT strategy)
   */
  async validateUserById(userId: string): Promise<User | null> {
    try {
      const user = await this.userModel.findById(userId);
      if (user && user.isActive) {
        return user;
      }
      return null;
    } catch (error) {
      this.logger.error(`User validation failed: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Hash password
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Validate password
   */
  private async validatePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Generate JWT tokens
   */
  private async generateTokens(user: User): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const payload = {
      sub: (user._id as any).toString(),
      email: user.email,
      role: user.role,
    };

    const accessTokenExpiry = process.env.JWT_EXPIRES_IN || '24h';
    const refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: accessTokenExpiry,
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
        expiresIn: refreshTokenExpiry,
      }),
    ]);

    // Calculate expires_in in seconds
    const expiresIn = this.parseTimeToSeconds(accessTokenExpiry);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
    };
  }

  /**
   * Update user's last login timestamp
   */
  private async updateLastLogin(userId: string): Promise<void> {
    try {
      await this.userModel.findByIdAndUpdate(userId, {
        lastLogin: new Date(),
      });
    } catch (error) {
      // Don't throw error for this operation, just log it
      this.logger.warn(`Failed to update last login for user ${userId}: ${error.message}`);
    }
  }

  /**
   * Parse time string to seconds
   */
  private parseTimeToSeconds(timeString: string): number {
    const matches = timeString.match(/^(\d+)([smhd])$/);
    if (!matches) return 86400; // default 24 hours

    const value = parseInt(matches[1]);
    const unit = matches[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 86400;
    }
  }
}
