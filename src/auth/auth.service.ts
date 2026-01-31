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
import * as crypto from 'crypto';
import { User } from '../database/schemas/user.schema';
import { LoginDto, RegisterDto, AuthResponseDto, UserProfileDto } from './dto';
import { SubscriptionService } from '../subscription/subscription.service';
import { RateLimitService } from './rate-limit.service';
import { AuditService } from './audit.service';
import { SessionService } from './session.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly saltRounds = 12;

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
    private readonly subscriptionService: SubscriptionService,
    private readonly rateLimitService: RateLimitService,
    private readonly auditService: AuditService,
    private readonly sessionService: SessionService,
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
        // Authentication fields
        isFirstLogin: true,
        lastPasswordChange: new Date(),
        passwordChangeRequired: false,
        passwordResetUsed: false,
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
          // Authentication fields
          isFirstLogin: savedUser.isFirstLogin,
          passwordChangeRequired: savedUser.passwordChangeRequired,
          preferredLanguage: savedUser.preferredLanguage,
          isOwner: savedUser.role === 'owner',
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
   * 
   * Requirements: 1.1, 5.1
   * Task: 12.1 - Handle first login flag and audit logging
   */
  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResponseDto> {
    try {
      // Find user by email
      const user = await this.userModel.findOne({ 
        email: loginDto.email.toLowerCase() 
      });

      if (!user) {
        // Log failed login attempt - Requirement 5.1
        if (ipAddress) {
          await this.auditService.logLoginFailure(
            loginDto.email,
            ipAddress,
            'invalid_credentials',
          );
        }
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if user is active
      if (!user.isActive) {
        // Log failed login attempt - Requirement 5.1
        if (ipAddress) {
          await this.auditService.logLoginFailure(
            loginDto.email,
            ipAddress,
            'account_inactive',
          );
        }
        throw new UnauthorizedException('Account is inactive');
      }

      // Validate password
      const isPasswordValid = await this.validatePassword(
        loginDto.password,
        user.passwordHash,
      );

      if (!isPasswordValid) {
        // Log failed login attempt - Requirement 5.1
        if (ipAddress) {
          await this.auditService.logLoginFailure(
            loginDto.email,
            ipAddress,
            'invalid_credentials',
          );
        }
        throw new UnauthorizedException('Invalid credentials');
      }

      const userId = (user._id as any).toString();
      this.logger.log(`User logged in: ${user.email}`);

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Update last login timestamp - Requirement 1.1
      await this.updateLastLogin(userId);

      // Log successful login - Requirement 5.1
      if (ipAddress) {
        await this.auditService.logLoginSuccess(
          userId,
          ipAddress,
          userAgent || 'unknown',
        );
      }

      // Get planType from subscription if user has one
      let planType: string | null = null;
      if (user.subscriptionId) {
        try {
          const subscription = await this.subscriptionService.getSubscriptionById(user.subscriptionId.toString());
          if (subscription) {
            // The planId is populated with the full SubscriptionPlan object
            const plan = subscription.planId as any;
            planType = plan.name; // The planType is stored in the plan's 'name' field
          }
        } catch (error) {
          this.logger.warn(`Could not fetch planType for user ${user.email}: ${error.message}`);
        }
      }

      // Check isFirstLogin flag and include passwordChangeRequired in response - Requirement 1.1
      const passwordChangeRequired = user.isFirstLogin || user.passwordChangeRequired || false;

      return {
        ...tokens,
        user: {
          id: userId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          // Authentication fields - Requirement 1.1
          isFirstLogin: user.isFirstLogin,
          passwordChangeRequired: passwordChangeRequired,
          preferredLanguage: user.preferredLanguage,
          // Add onboarding-related fields
          setupComplete: user.setupComplete || false,
          subscriptionId: user.subscriptionId?.toString() || null,
          organizationId: user.organizationId?.toString() || null,
          complexId: user.complexId?.toString() || null,
          clinicId: user.clinicId?.toString() || null,
          onboardingComplete: user.onboardingComplete || false,
          onboardingProgress: user.onboardingProgress || [],
          planType: planType, // Add planType from subscription
          isOwner: user.role === 'owner',
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
          isOwner: user.role === 'owner',
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

  async getUserWithSubscriptionInfo(userId: string): Promise<any> {
    try {
      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        throw new BadRequestException('User not found');
      }

      return {
        userId: (user._id as any).toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        subscriptionId: user.subscriptionId?.toString() || null,
        organizationId: user.organizationId?.toString() || null,
        complexId: user.complexId?.toString() || null,
        clinicId: user.clinicId?.toString() || null,
        setupComplete: user.setupComplete || false,
        onboardingComplete: user.onboardingComplete || false,
        onboardingProgress: user.onboardingProgress || [],
        // Debug info - raw user document
        userDocument: user.toObject(),
        hasSubscriptionId: !!user.subscriptionId,
        hasOrganizationId: !!user.organizationId,
        isOwner: user.role === 'owner',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get user debug info: ${error.message}`);
    }
  }

  /**
   * Change password for authenticated user
   * 
   * Requirements: 2.1-2.4, 9.3
   * 
   * @param userId - User ID requesting password change
   * @param currentPassword - Current password for verification
   * @param newPassword - New password to set
   * @returns Success response with bilingual message
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<any> {
    try {
      // Check rate limit for user (3 per hour) - Requirement 9.3
      const isAllowed = await this.rateLimitService.checkPasswordChangeLimit(userId);
      if (!isAllowed) {
        throw new BadRequestException({
          message: {
            ar: 'تم تجاوز الحد المسموح من المحاولات',
            en: 'Rate limit exceeded',
          },
          code: 'RATE_LIMIT_EXCEEDED',
        });
      }

      // Find user
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException({
          message: {
            ar: 'المستخدم غير موجود',
            en: 'User not found',
          },
          code: 'USER_NOT_FOUND',
        });
      }

      // Validate current password matches (Requirement 2.1)
      const isCurrentPasswordValid = await this.validatePassword(
        currentPassword,
        user.passwordHash,
      );

      if (!isCurrentPasswordValid) {
        throw new BadRequestException({
          message: {
            ar: 'كلمة المرور الحالية غير صحيحة',
            en: 'Current password is incorrect',
          },
          code: 'INVALID_CURRENT_PASSWORD',
        });
      }

      // Validate new password differs from current (Requirement 2.1)
      const isSamePassword = await this.validatePassword(
        newPassword,
        user.passwordHash,
      );

      if (isSamePassword) {
        throw new BadRequestException({
          message: {
            ar: 'كلمة المرور الجديدة يجب أن تختلف عن الحالية',
            en: 'New password must differ from current password',
          },
          code: 'NEW_PASSWORD_SAME_AS_CURRENT',
        });
      }

      // Note: Password complexity validation is handled by DTO validators (Requirement 2.2)

      // Hash new password with bcrypt (12 rounds)
      const hashedPassword = await this.hashPassword(newPassword);

      // Update user: password, lastPasswordChange=now (Requirement 2.3)
      user.passwordHash = hashedPassword;
      user.lastPasswordChange = new Date();
      await user.save();

      this.logger.log(`Password changed for user ${userId}`);

      // Call SessionService to invalidate all user sessions (Requirement 2.4)
      // Note: In a stateless JWT system, we mark the invalidation event
      // The actual token blacklisting will happen when tokens are presented
      await this.sessionService.invalidateUserSessions(
        userId,
        'password_change',
      );

      // Call AuditService to log password change
      await this.auditService.logPasswordChange(
        userId,
        'user_initiated',
      );

      // TODO: Call EmailService to send confirmation (Requirement 4.4)
      // This will be implemented when EmailService is available (Task 7)
      this.logger.log(`Email confirmation needed for password change by user ${userId}`);

      // Return success response
      return {
        success: true,
        message: {
          ar: 'تم تغيير كلمة المرور بنجاح',
          en: 'Password changed successfully',
        },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Password change failed for user ${userId}: ${error.message}`,
        error.stack,
      );
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
   * Request password reset
   * 
   * Requirements: 2.5, 2.6, 2.10, 7.9
   * 
   * @param email - User email address
   * @param ipAddress - Request IP address for rate limiting
   * @returns Success response (doesn't reveal if email exists)
   */
  async forgotPassword(
    email: string,
    ipAddress: string,
  ): Promise<any> {
    try {
      // Check rate limit for IP address (5 per hour) - Requirement 2.10
      const isAllowed = await this.rateLimitService.checkPasswordResetLimit(ipAddress);
      if (!isAllowed) {
        throw new BadRequestException({
          message: {
            ar: 'تم تجاوز الحد المسموح من المحاولات. يرجى المحاولة لاحقاً',
            en: 'Rate limit exceeded. Please try again later',
          },
          code: 'RATE_LIMIT_EXCEEDED',
        });
      }

      // Find user by email
      const user = await this.userModel.findOne({ 
        email: email.toLowerCase() 
      });

      // If user exists, generate and send reset token
      if (user) {
        // Generate secure reset token (32 bytes random) - Requirement 7.9
        const resetToken = crypto.randomBytes(32).toString('hex');

        // Hash token for storage
        const hashedToken = crypto
          .createHash('sha256')
          .update(resetToken)
          .digest('hex');

        // Set passwordResetToken and passwordResetExpires (24h) on user - Requirement 2.5
        user.passwordResetToken = hashedToken;
        user.passwordResetExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        user.passwordResetUsed = false;
        await user.save();

        this.logger.log(`Password reset requested for user ${user.email}`);

        // TODO: Call EmailService to send reset email with token - Requirement 2.6
        // This will be implemented when EmailService is available (Task 7)
        // await this.emailService.sendPasswordResetEmail(
        //   user.email,
        //   user.firstName,
        //   resetToken,
        //   user.preferredLanguage || 'en'
        // );
        this.logger.log(`Password reset email needed for ${user.email} with token: ${resetToken}`);

        // Call AuditService to log reset request
        await this.auditService.logPasswordResetRequest(email, ipAddress);
      } else {
        // User doesn't exist, but we still log the attempt
        this.logger.log(`Password reset requested for non-existent email: ${email}`);
        await this.auditService.logPasswordResetRequest(email, ipAddress);
      }

      // Return success response (don't reveal if email exists) - Requirement 2.10
      return {
        success: true,
        message: {
          ar: 'إذا كان البريد الإلكتروني موجوداً في نظامنا، ستتلقى رسالة لإعادة تعيين كلمة المرور',
          en: 'If the email exists in our system, you will receive a password reset email',
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Password reset request failed for ${email}: ${error.message}`,
        error.stack,
      );
      // Return generic success message even on error to avoid revealing information
      return {
        success: true,
        message: {
          ar: 'إذا كان البريد الإلكتروني موجوداً في نظامنا، ستتلقى رسالة لإعادة تعيين كلمة المرور',
          en: 'If the email exists in our system, you will receive a password reset email',
        },
      };
    }
  }

  /**
   * Reset password using reset token
   * 
   * Requirements: 2.7-2.9
   * 
   * @param token - Password reset token from email
   * @param newPassword - New password to set
   * @returns Success response with bilingual message
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<any> {
    try {
      // Hash provided token to match stored hash
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      // Find user by hashed token
      const user = await this.userModel.findOne({
        passwordResetToken: hashedToken,
      });

      // Validate token exists - Requirement 2.7
      if (!user) {
        throw new BadRequestException({
          message: {
            ar: 'رمز إعادة تعيين كلمة المرور غير صالح',
            en: 'Password reset token is invalid',
          },
          code: 'PASSWORD_RESET_TOKEN_INVALID',
        });
      }

      // Validate token not expired - Requirement 2.8
      if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
        throw new BadRequestException({
          message: {
            ar: 'انتهت صلاحية رمز إعادة تعيين كلمة المرور',
            en: 'Password reset token has expired',
          },
          code: 'PASSWORD_RESET_TOKEN_EXPIRED',
        });
      }

      // Validate token not already used - Requirement 2.9
      if (user.passwordResetUsed) {
        throw new BadRequestException({
          message: {
            ar: 'تم استخدام رمز إعادة تعيين كلمة المرور بالفعل',
            en: 'Password reset token has already been used',
          },
          code: 'PASSWORD_RESET_TOKEN_USED',
        });
      }

      // Note: Password complexity validation is handled by DTO validators (Requirement 2.2)

      // Hash new password with bcrypt (12 rounds)
      const hashedPassword = await this.hashPassword(newPassword);

      // Update user: password, clear reset token fields, set passwordResetUsed=true
      user.passwordHash = hashedPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      user.passwordResetUsed = true;
      user.lastPasswordChange = new Date();
      await user.save();

      const userId = (user._id as any).toString();
      this.logger.log(`Password reset completed for user ${userId}`);

      // Call SessionService to invalidate all user sessions - Requirement 2.4
      await this.sessionService.invalidateUserSessions(
        userId,
        'password_reset',
      );

      // Call AuditService to log password reset completion
      await this.auditService.logPasswordResetComplete(userId, hashedToken);

      // TODO: Call EmailService to send confirmation - Requirement 4.4
      // This will be implemented when EmailService is available (Task 7)
      // await this.emailService.sendPasswordChangedNotification(
      //   user.email,
      //   user.firstName,
      //   user.preferredLanguage || 'en'
      // );
      this.logger.log(`Password reset confirmation email needed for ${user.email}`);

      // Return success response
      return {
        success: true,
        message: {
          ar: 'تم إعادة تعيين كلمة المرور بنجاح',
          en: 'Password has been reset successfully',
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Password reset failed: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException({
        message: {
          ar: 'فشل إعادة تعيين كلمة المرور',
          en: 'Password reset failed',
        },
        code: 'PASSWORD_RESET_FAILED',
      });
    }
  }

  /**
   * Send password reset email (admin-initiated)
   * 
   * Requirements: 2.5, 2.6, 8.5
   * 
   * @param userId - User ID to send reset email to
   * @param adminId - Admin ID who initiated the reset
   * @returns Success response with bilingual message
   */
  async sendPasswordResetEmail(
    userId: string,
    adminId: string,
  ): Promise<any> {
    try {
      // Verify admin has permission (admin, owner, or super_admin)
      const admin = await this.userModel.findById(adminId);
      if (!admin) {
        throw new NotFoundException({
          message: {
            ar: 'المسؤول غير موجود',
            en: 'Admin not found',
          },
          code: 'ADMIN_NOT_FOUND',
        });
      }

      // Check if admin has permission (admin, owner, or super_admin roles)
      const allowedRoles = ['admin', 'owner', 'super_admin'];
      if (!allowedRoles.includes(admin.role)) {
        throw new BadRequestException({
          message: {
            ar: 'ليس لديك صلاحية لإرسال رسائل إعادة تعيين كلمة المرور',
            en: 'You do not have permission to send password reset emails',
          },
          code: 'INSUFFICIENT_PERMISSIONS',
        });
      }

      // Find user by ID
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException({
          message: {
            ar: 'المستخدم غير موجود',
            en: 'User not found',
          },
          code: 'USER_NOT_FOUND',
        });
      }

      // Generate secure reset token (32 bytes random) - Requirement 7.9
      const resetToken = crypto.randomBytes(32).toString('hex');

      // Hash token for storage
      const hashedToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

      // Set passwordResetToken and passwordResetExpires (24h) on user - Requirement 2.5
      user.passwordResetToken = hashedToken;
      user.passwordResetExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      user.passwordResetUsed = false;
      await user.save();

      this.logger.log(`Admin ${adminId} initiated password reset for user ${userId}`);

      // TODO: Call EmailService to send reset email - Requirement 2.6
      // This will be implemented when EmailService is available (Task 7)
      // await this.emailService.sendPasswordResetEmail(
      //   user.email,
      //   user.firstName,
      //   resetToken,
      //   user.preferredLanguage || 'en'
      // );
      this.logger.log(`Password reset email needed for ${user.email} with token: ${resetToken}`);

      // Call AuditService to log admin-initiated reset
      await this.auditService.logPasswordChange(
        userId,
        'admin_reset',
        adminId,
      );

      // Return success response
      return {
        success: true,
        message: {
          ar: 'تم إرسال رسالة إعادة تعيين كلمة المرور بنجاح',
          en: 'Password reset email sent successfully',
        },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Admin password reset failed for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException({
        message: {
          ar: 'فشل إرسال رسالة إعادة تعيين كلمة المرور',
          en: 'Failed to send password reset email',
        },
        code: 'PASSWORD_RESET_EMAIL_FAILED',
      });
    }
  }
}
