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
import { SubscriptionService } from '../subscription/subscription.service';
import * as crypto from 'crypto';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  ForgotPasswordResponseDto,
  ValidateResetTokenResponseDto,
} from './dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly saltRounds = 12;

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    try {
      // ✅ Check if email already exists
      const existingUserByEmail = await this.userModel.findOne({ 
        email: registerDto.email.toLowerCase() 
      });

      if (existingUserByEmail) {
        throw new ConflictException('User with this email already exists');
      }

      // ✅ Check if username already exists
      const existingUserByUsername = await this.userModel.findOne({ 
        username: registerDto.username.toLowerCase() 
      });

      if (existingUserByUsername) {
        throw new ConflictException('Username is already taken');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(registerDto.password);

      // ✅ Create new user with username
      const newUser = new this.userModel({
        email: registerDto.email.toLowerCase(),
        username: registerDto.username.toLowerCase(), // ✅ إضافة username
        passwordHash: hashedPassword,
        role: registerDto.role,
        isActive: true,
        emailVerified: false,
      });

      const savedUser = await newUser.save();
      this.logger.log(`New user registered: ${savedUser.email} (@${savedUser.username})`);

      // Generate tokens
      const tokens = await this.generateTokens(savedUser);

      // Update last login
      await this.updateLastLogin((savedUser._id as any).toString());

      return {
        ...tokens,
        user: {
          id: (savedUser._id as any).toString(),
          email: savedUser.email,
          username: savedUser.username, // ✅ إضافة username
          role: savedUser.role,
          isActive: savedUser.isActive,
          emailVerified: savedUser.emailVerified,
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
   * Login user - ✅ Support both email and username
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    try {
      const { emailOrUsername, password } = loginDto;

      // ✅ Find user by email OR username
      const user = await this.userModel.findOne({
        $or: [
          { email: emailOrUsername.toLowerCase() },
          { username: emailOrUsername.toLowerCase() }
        ]
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
        password,
        user.passwordHash,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      this.logger.log(`User logged in: ${user.email} (@${user.username})`);

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Update last login
      await this.updateLastLogin((user._id as any).toString());

      // Get planType from subscription if user has one
      let planType: string | null = null;
      if (user.subscriptionId) {
        try {
          const subscription = await this.subscriptionService.getSubscriptionById(user.subscriptionId.toString());
          if (subscription) {
            const plan = subscription.planId as any;
            planType = plan.name;
          }
        } catch (error) {
          this.logger.warn(`Could not fetch planType for user ${user.email}: ${error.message}`);
        }
      }

      return {
        ...tokens,
        user: {
          id: (user._id as any).toString(),
          email: user.email,
          username: user.username, // ✅ إضافة username
          role: user.role,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          setupComplete: user.setupComplete || false,
          subscriptionId: user.subscriptionId?.toString() || null,
          organizationId: user.organizationId?.toString() || null,
          complexId: user.complexId?.toString() || null,
          clinicId: user.clinicId?.toString() || null,
          onboardingComplete: user.onboardingComplete || false,
          onboardingProgress: user.onboardingProgress || [],
          planType: planType,
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
   * Login user
   */

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
          username:user.username,
          email: user.email,
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
   * طلب إعادة تعيين كلمة المرور
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{
    message: string;
    email: string;
    expiresIn: string;
  }> {
    const { email } = forgotPasswordDto;

    try {
      // البحث عن المستخدم
      const user = await this.userModel.findOne({ 
        email: email.toLowerCase() 
      });

      // ⚠️ أمان: لا نكشف إذا كان الإيميل موجود أم لا
      if (!user) {
        this.logger.warn(`Password reset requested for non-existent email: ${email}`);
        // نرجع نفس الرسالة للأمان
        return {
          message: 'If the email exists, a password reset link has been sent',
          email: email,
          expiresIn: '1 hour'
        };
      }

      // التحقق من أن الحساب نشط
      if (!user.isActive) {
        throw new BadRequestException('Account is inactive. Please contact support.');
      }

      // توليد token عشوائي آمن
      const resetToken = crypto.randomBytes(32).toString('hex');
      
      // Hash الـ token قبل حفظه في قاعدة البيانات
      const hashedToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

      // تحديد مدة انتهاء الصلاحية (1 ساعة)
      const tokenExpiry = new Date();
      tokenExpiry.setHours(tokenExpiry.getHours() + 1);

      // حفظ الـ token في قاعدة البيانات
      user.passwordResetToken = hashedToken;
      user.passwordResetExpires = tokenExpiry;
      await user.save();

      this.logger.log(`Password reset token generated for user: ${email}`);

      // 📧 إرسال Email (TODO: integrate with email service)
      // في الإنتاج، سترسل هذا عبر email service
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password?token=${resetToken}`;
      
      this.logger.log(`Reset URL (development): ${resetUrl}`);
      
      // TODO: استخدام EmailService لإرسال email
      /*
      await this.emailService.sendPasswordResetEmail({
        to: user.email,
        firstName: user.firstName,
        resetUrl: resetUrl,
        expiresIn: '1 hour'
      });
      */

      return {
        message: 'If the email exists, a password reset link has been sent',
        email: email,
        expiresIn: '1 hour'
      };

    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Forgot password error: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to process password reset request');
    }
  }

  /**
   * التحقق من صلاحية reset token
   */
  async validateResetToken(token: string): Promise<{
    isValid: boolean;
    message: string;
    email?: string;
    expiresAt?: Date;
  }> {
    try {
      // Hash الـ token للمقارنة
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      // البحث عن المستخدم بالـ token
      const user = await this.userModel.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: new Date() } // لم ينتهي بعد
      });

      if (!user) {
        return {
          isValid: false,
          message: 'Invalid or expired reset token'
        };
      }

      return {
        isValid: true,
        message: 'Reset token is valid',
        email: user.email,
        expiresAt: user.passwordResetExpires
      };

    } catch (error) {
      this.logger.error(`Validate reset token error: ${error.message}`, error.stack);
      return {
        isValid: false,
        message: 'Failed to validate reset token'
      };
    }
  }

  /**
   * إعادة تعيين كلمة المرور
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{
    message: string;
  }> {
    const { token, newPassword, confirmPassword } = resetPasswordDto;

    try {
      // التحقق من تطابق كلمات المرور
      if (newPassword !== confirmPassword) {
        throw new BadRequestException('Passwords do not match');
      }

      // Hash الـ token للمقارنة
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      // البحث عن المستخدم بالـ token
      const user = await this.userModel.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: new Date() }
      });

      if (!user) {
        throw new BadRequestException('Invalid or expired reset token');
      }

      // التحقق من أن الحساب نشط
      if (!user.isActive) {
        throw new BadRequestException('Account is inactive. Please contact support.');
      }

      // التحقق من أن كلمة المرور الجديدة مختلفة عن القديمة
      const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
      if (isSamePassword) {
        throw new BadRequestException('New password must be different from the old password');
      }

      // Hash كلمة المرور الجديدة
      const hashedPassword = await this.hashPassword(newPassword);

      // تحديث كلمة المرور وحذف الـ token
      user.passwordHash = hashedPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      this.logger.log(`Password reset successful for user: ${user.email}`);

      // TODO: إرسال email تأكيد تغيير كلمة المرور
      /*
      await this.emailService.sendPasswordChangedEmail({
        to: user.email,
        firstName: user.firstName
      });
      */

      return {
        message: 'Password has been reset successfully. You can now login with your new password.'
      };

    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Reset password error: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to reset password');
    }
  }

  /**
   * تغيير كلمة المرور (للمستخدم المسجل دخول)
   */
  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto
  ): Promise<{
    message: string;
  }> {
    const { currentPassword, newPassword, confirmPassword } = changePasswordDto;

    try {
      // التحقق من تطابق كلمات المرور الجديدة
      if (newPassword !== confirmPassword) {
        throw new BadRequestException('New passwords do not match');
      }

      // البحث عن المستخدم
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // التحقق من أن الحساب نشط
      if (!user.isActive) {
        throw new BadRequestException('Account is inactive');
      }

      // التحقق من كلمة المرور الحالية
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.passwordHash
      );

      if (!isCurrentPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      // التحقق من أن كلمة المرور الجديدة مختلفة عن القديمة
      if (currentPassword === newPassword) {
        throw new BadRequestException('New password must be different from current password');
      }

      // Hash كلمة المرور الجديدة
      const hashedPassword = await this.hashPassword(newPassword);

      // تحديث كلمة المرور
      user.passwordHash = hashedPassword;
      await user.save();

      this.logger.log(`Password changed successfully for user: ${user.email}`);

      // TODO: إرسال email تأكيد
      /*
      await this.emailService.sendPasswordChangedEmail({
        to: user.email,
        firstName: user.firstName
      });
      */

      return {
        message: 'Password has been changed successfully'
      };

    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error(`Change password error: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to change password');
    }
  }
}
