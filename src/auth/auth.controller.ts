import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  Param,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SkipFirstLoginCheck } from './guards/first-login.guard';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  AuthResponseDto,
  UserProfileDto,
  FirstLoginPasswordChangeDto,
} from './dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    registerDto: RegisterDto,
  ): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  /**
   * Login user
   * 
   * Task 12.1: Extract IP address and user agent for audit logging
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    loginDto: LoginDto,
    @Request() req,
  ): Promise<AuthResponseDto> {
    // Extract IP address from request
    const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
    
    // Extract user agent from request headers
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  /**
   * First login password change
   * 
   * Task 15.1: Create POST /auth/first-login-password-change endpoint
   * Requirements: 8.1, 8.6
   * 
   * This endpoint allows users to change their password on first login.
   * It applies JwtAuthGuard (but not FirstLoginGuard) to allow first-time users to access it.
   * The @SkipFirstLoginCheck decorator ensures FirstLoginGuard doesn't block this endpoint.
   */
  @Post('first-login-password-change')
  @UseGuards(JwtAuthGuard)
  @SkipFirstLoginCheck()
  @HttpCode(HttpStatus.OK)
  async firstLoginPasswordChange(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: FirstLoginPasswordChangeDto,
    @Request() req,
  ): Promise<AuthResponseDto> {
    try {
      // Extract userId from JWT payload (populated by JwtAuthGuard)
      const userId = req.user?.userId || req.user?.sub;

      if (!userId) {
        throw new BadRequestException({
          message: {
            ar: 'معرف المستخدم غير موجود',
            en: 'User ID not found',
          },
          code: 'USER_ID_NOT_FOUND',
        });
      }

      // Validate that passwords match
      if (dto.newPassword !== dto.confirmPassword) {
        throw new BadRequestException({
          message: {
            ar: 'كلمات المرور غير متطابقة',
            en: 'Passwords do not match',
          },
          code: 'PASSWORDS_DO_NOT_MATCH',
        });
      }

      // Call AuthService.firstLoginPasswordChange
      const result = await this.authService.firstLoginPasswordChange(
        userId,
        dto.currentPassword,
        dto.newPassword,
      );

      // Return AuthResponse with new tokens
      return result;
    } catch (error) {
      // Handle errors with bilingual messages
      if (error.response?.message) {
        throw error;
      }

      this.logger.error(`First login password change failed: ${error.message}`, error.stack);
      throw new BadRequestException({
        message: {
          ar: 'فشل تغيير كلمة المرور',
          en: 'Password change failed',
        },
        code: 'PASSWORD_CHANGE_FAILED',
      });
    }
  }

  /**
   * Refresh access token
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthResponseDto> {
    return this.authService.refreshToken(refreshTokenDto.refresh_token);
  }

  /**
   * Get current user profile
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req): Promise<UserProfileDto> {
    return this.authService.getProfile(req.user.id);
  }

  /**
   * Logout user (optional endpoint for client-side token removal)
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(): Promise<{ message: string }> {
    // Since we're using stateless JWT, we don't need to do anything server-side
    // The client should remove the token from storage
    return { message: 'Successfully logged out' };
  }

  @Get('debug/user/:userId')
  async debugUser(@Param('userId') userId: string) {
    try {
      const user = await this.authService.getUserWithSubscriptionInfo(userId);
      return {
        success: true,
        message: 'User debug info retrieved',
        data: {
          userFromDatabase: user,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Debug failed: ${error.message}`,
        error: error.message
      };
    }
  }
}




