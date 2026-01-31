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
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  AuthResponseDto,
  UserProfileDto,
} from './dto';

@Controller('auth')
export class AuthController {
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




