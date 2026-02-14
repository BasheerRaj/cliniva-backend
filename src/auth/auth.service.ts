import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../database/schemas/user.schema';
import { AuditLog } from '../database/schemas/audit-log.schema';
import { LoginDto, RegisterDto, AuthResponseDto, UserProfileDto } from './dto';
import { SubscriptionService } from '../subscription/subscription.service';
import { RateLimitService } from './rate-limit.service';
import { AuditService } from './audit.service';
import { SessionService } from './session.service';
import { EmailService } from './email.service';
import {
  UserRole,
  canManageRole,
  RoleDisplayNames,
  getManageableRoles,
} from '../common/enums/user-role.enum';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly saltRounds = 12;

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLog>,
    private jwtService: JwtService,
    private readonly subscriptionService: SubscriptionService,
    private readonly rateLimitService: RateLimitService,
    private readonly auditService: AuditService,
    private readonly sessionService: SessionService,
    private readonly emailService: EmailService,
  ) { }

  /**
   * Register a new user
   *
   * Role-based authorization rules:
   * - No one can create a super_admin (only seeded in DB)
   * - Only owner or super_admin can create an admin
   * - Admin can create manager, doctor, staff, patient (associated to same scope)
   * - Owner/patient can self-register without auth (creatorUser is null)
   *
   * @param registerDto - Registration data
   * @param creatorUser - Optional authenticated user creating this account (null for self-registration)
   */
  async register(
    registerDto: RegisterDto,
    creatorUser?: { id: string; role: UserRole; email: string } | null,
  ): Promise<AuthResponseDto> {
    try {
      const targetRole = registerDto.role as UserRole;

      // ==========================================
      // ROLE-BASED AUTHORIZATION CHECKS
      // ==========================================

      // Rule 1: No one can create a super_admin
      if (targetRole === UserRole.SUPER_ADMIN) {
        this.logger.warn(
          `Attempt to create super_admin by ${creatorUser?.email || 'anonymous'}`,
        );
        throw new ForbiddenException({
          message: {
            ar: 'لا يمكن إنشاء حساب مدير أعلى. هذا الدور محجوز للنظام فقط',
            en: 'Cannot create a super admin account. This role is reserved for the system only',
          },
          code: 'CANNOT_CREATE_SUPER_ADMIN',
        });
      }

      // Rule 2: Determine if auth is required based on target role
      const selfRegisterableRoles: UserRole[] = [UserRole.OWNER, UserRole.PATIENT];
      const requiresAuth = !selfRegisterableRoles.includes(targetRole);

      if (requiresAuth && !creatorUser) {
        this.logger.warn(
          `Unauthenticated attempt to create user with role '${targetRole}'`,
        );
        throw new ForbiddenException({
          message: {
            ar: `لا يمكن تسجيل حساب بدور '${targetRole}' بدون مصادقة. يجب أن يتم الإنشاء بواسطة مستخدم مخول`,
            en: `Cannot self-register with role '${targetRole}'. This account must be created by an authorized user`,
          },
          code: 'AUTH_REQUIRED_FOR_ROLE',
        });
      }

      // Rule 3: If auth is provided, validate the creator has permission to create this role
      if (creatorUser) {
        const creatorRole = creatorUser.role as UserRole;
        const canCreate = canManageRole(creatorRole, targetRole);

        if (!canCreate) {
          this.logger.warn(
            `User ${creatorUser.email} (role: ${creatorRole}) attempted to create user with role '${targetRole}' - DENIED`,
          );
          throw new ForbiddenException({
            message: {
              ar: `ليس لديك صلاحية لإنشاء حساب بدور '${RoleDisplayNames[targetRole] || targetRole}'. دورك (${RoleDisplayNames[creatorRole] || creatorRole}) لا يسمح بذلك`,
              en: `You do not have permission to create a user with role '${RoleDisplayNames[targetRole] || targetRole}'. Your role (${RoleDisplayNames[creatorRole] || creatorRole}) does not allow this`,
            },
            code: 'INSUFFICIENT_ROLE_PERMISSION',
            details: {
              creatorRole: creatorRole,
              targetRole: targetRole,
              allowedRoles: getManageableRoles(creatorRole),
            },
          });
        }
      }

      // ==========================================
      // EXISTING REGISTRATION LOGIC
      // ==========================================

      // Check if user already exists
      const existingUser = await this.userModel.findOne({
        email: registerDto.email.toLowerCase(),
      });

      if (existingUser) {
        throw new ConflictException({
          message: {
            ar: 'مستخدم بهذا البريد الإلكتروني موجود بالفعل',
            en: 'User with this email already exists',
          },
          code: 'EMAIL_ALREADY_EXISTS',
        });
      }

      // Hash password
      const hashedPassword = await this.hashPassword(registerDto.password);

      // ==========================================
      // SCOPE ASSOCIATION
      // ==========================================
      // When a privileged user creates another user, associate the new user
      // with the same organization/complex/clinic scope
      let scopeFields: any = {};
      if (creatorUser && requiresAuth) {
        scopeFields.createdBy = creatorUser.id;
        const creator = await this.userModel.findById(creatorUser.id);
        if (creator) {
          if (creator.organizationId) {
            scopeFields.organizationId = creator.organizationId;
          }
          if (creator.complexId) {
            scopeFields.complexId = creator.complexId;
          }
          if (creator.clinicId) {
            scopeFields.clinicId = creator.clinicId;
          }
          this.logger.log(
            `New user will be associated with creator's scope: org=${creator.organizationId}, complex=${creator.complexId}, clinic=${creator.clinicId}`,
          );
        }
      }

      // Create new user
      const newUser = new this.userModel({
        ...registerDto,
        email: registerDto.email.toLowerCase(),
        passwordHash: hashedPassword,
        isActive: true,
        emailVerified: false,
        // Authentication fields
        isFirstLogin: true,
        temporaryPassword: false,
        lastPasswordChange: new Date(),
        passwordChangeRequired: false,
        passwordResetUsed: false,
        // Scope association from creator
        ...scopeFields,
      });

      const savedUser = await newUser.save();
      this.logger.log(
        `New user registered: ${savedUser.email} (role: ${savedUser.role})${creatorUser ? ` by ${creatorUser.email}` : ' (self-registration)'
        }`,
      );

      // Generate tokens
      const tokens = await this.generateTokens(savedUser);

      // Calculate token expiration
      const accessTokenExpiry = this.parseTimeToSeconds(
        process.env.JWT_EXPIRES_IN || '24h',
      );
      const expiresAt = new Date(Date.now() + accessTokenExpiry * 1000);

      // Create session record - Requirement 4.1, 4.2
      const userId = (savedUser._id as any).toString();
      try {
        await this.sessionService.createSession(
          userId,
          {
            userAgent: 'unknown',
            ipAddress: '0.0.0.0',
          },
          tokens.access_token,
          tokens.refresh_token,
          expiresAt,
        );
        this.logger.log(`Session created for new user ${userId}`);
      } catch (error) {
        // Log error but don't fail registration if session creation fails
        this.logger.warn(
          `Failed to create session for new user ${userId}: ${error.message}`,
        );
      }

      // Update last login
      await this.updateLastLogin(userId);

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
          // Scope fields
          organizationId: (savedUser.organizationId as any)?.toString() || null,
          complexId: (savedUser.complexId as any)?.toString() || null,
          clinicId: (savedUser.clinicId as any)?.toString() || null,
        },
      };
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(`Registration failed: ${error.message}`, error.stack);
      throw new BadRequestException({
        message: {
          ar: 'فشل التسجيل',
          en: 'Registration failed',
        },
        code: 'REGISTRATION_FAILED',
      });
    }
  }

  /**
   * Login user
   *
   * Requirements: 1.1, 5.1
   * Task: 12.1 - Handle first login flag and audit logging
   */
  async login(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    try {
      // Find user by email
      const user = await this.userModel.findOne({
        email: loginDto.email.toLowerCase(),
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
        throw new UnauthorizedException({
          message: {
            ar: 'بيانات الاعتماد غير صحيحة',
            en: 'Invalid credentials',
          },
          code: 'INVALID_CREDENTIALS',
        });
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
        throw new UnauthorizedException({
          message: {
            ar: 'الحساب غير نشط',
            en: 'Account is inactive',
          },
          code: 'ACCOUNT_INACTIVE',
        });
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
        throw new UnauthorizedException({
          message: {
            ar: 'بيانات الاعتماد غير صحيحة',
            en: 'Invalid credentials',
          },
          code: 'INVALID_CREDENTIALS',
        });
      }

      const userId = (user._id as any).toString();
      this.logger.log(`User logged in: ${user.email}`);

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Calculate token expiration
      const accessTokenExpiry = this.parseTimeToSeconds(
        process.env.JWT_EXPIRES_IN || '24h',
      );
      const expiresAt = new Date(Date.now() + accessTokenExpiry * 1000);

      // Create session record - Requirement 4.1, 4.2
      try {
        await this.sessionService.createSession(
          userId,
          {
            userAgent: userAgent || 'unknown',
            ipAddress: ipAddress || '0.0.0.0',
          },
          tokens.access_token,
          tokens.refresh_token,
          expiresAt,
        );
        this.logger.log(`Session created for user ${userId}`);
      } catch (error) {
        // Log error but don't fail login if session creation fails
        this.logger.warn(
          `Failed to create session for user ${userId}: ${error.message}`,
        );
      }

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
          const subscription =
            await this.subscriptionService.getSubscriptionById(
              user.subscriptionId.toString(),
            );
          if (subscription) {
            // The planId is populated with the full SubscriptionPlan object
            const plan = subscription.planId as any;
            planType = plan.name; // The planType is stored in the plan's 'name' field
          }
        } catch (error) {
          this.logger.warn(
            `Could not fetch planType for user ${user.email}: ${error.message}`,
          );
        }
      }

      // Check isFirstLogin flag and include passwordChangeRequired in response - Requirement 1.1
      const passwordChangeRequired =
        user.isFirstLogin || user.passwordChangeRequired || false;

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
      throw new UnauthorizedException({
        message: {
          ar: 'فشلت المصادقة',
          en: 'Authentication failed',
        },
        code: 'AUTHENTICATION_FAILED',
      });
    }
  }

  /**
   * Refresh access token with blacklist check
   *
   * Requirements: 7.3, 7.4, 7.5
   * Task: 19.1
   *
   * @param refreshToken - Refresh token to use for generating new tokens
   * @returns AuthResponse with new tokens and user data
   */
  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      // Hash token and check if blacklisted - Requirement 7.3
      const tokenHash = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');

      const isBlacklisted =
        await this.sessionService.isTokenBlacklisted(tokenHash);

      if (isBlacklisted) {
        this.logger.warn('Attempted to use blacklisted refresh token');
        throw new UnauthorizedException({
          message: {
            ar: 'الرمز محظور',
            en: 'Token blacklisted',
          },
          code: 'AUTH_012',
        });
      }

      // Validate token signature and expiration - Requirement 7.3
      const payload = this.jwtService.verify(refreshToken, {
        secret:
          process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
      });

      // Find user
      const user = await this.userModel.findById(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException({
          message: {
            ar: 'رمز غير صالح',
            en: 'Invalid token',
          },
          code: 'AUTH_003',
        });
      }

      // Generate new access and refresh tokens - Requirement 7.4
      const tokens = await this.generateTokens(user);

      // Blacklist old refresh token (single-use) - Requirement 7.5
      // Get expiration from the old token payload
      const oldTokenExpiry = new Date(payload.exp * 1000);

      await this.sessionService.addTokenToBlacklist(
        refreshToken,
        (user._id as any).toString(),
        oldTokenExpiry,
        'token_refresh',
      );

      this.logger.log(
        `Refresh token used and blacklisted for user ${user._id}`,
      );

      // Return new tokens - Requirement 7.4
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
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // Handle JWT-specific errors
      if (error.name === 'TokenExpiredError') {
        this.logger.warn('Refresh token expired');
        throw new UnauthorizedException({
          message: {
            ar: 'انتهت صلاحية الرمز',
            en: 'Token expired',
          },
          code: 'AUTH_002',
        });
      }

      if (error.name === 'JsonWebTokenError' || error.name === 'SyntaxError') {
        this.logger.warn('Invalid refresh token');
        throw new UnauthorizedException({
          message: {
            ar: 'رمز غير صالح',
            en: 'Invalid token',
          },
          code: 'AUTH_003',
        });
      }

      this.logger.error(`Token refresh failed: ${error.message}`, error.stack);
      throw new UnauthorizedException({
        message: {
          ar: 'فشل تحديث الرمز',
          en: 'Token refresh failed',
        },
        code: 'AUTH_003',
      });
    }
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string): Promise<UserProfileDto> {
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
      this.logger.error(
        `User validation failed: ${error.message}`,
        error.stack,
      );
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
        secret:
          process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
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
      this.logger.warn(
        `Failed to update last login for user ${userId}: ${error.message}`,
      );
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
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 86400;
    }
  }

  async getUserWithSubscriptionInfo(userId: string): Promise<any> {
    try {
      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        throw new BadRequestException({
          message: {
            ar: 'المستخدم غير موجود',
            en: 'User not found',
          },
          code: 'USER_NOT_FOUND',
        });
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
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new BadRequestException({
        message: {
          ar: `فشل الحصول على معلومات تصحيح المستخدم: ${error.message}`,
          en: `Failed to get user debug info: ${error.message}`,
        },
        code: 'DEBUG_INFO_FAILED',
      });
    }
  }

  /**
   * First login password change
   *
   * Requirements: 1.1-1.6, 2.1-2.3
   * Task: 8.1
   *
   * @param userId - User ID requesting password change
   * @param currentPassword - Current password for verification
   * @param newPassword - New password to set
   * @returns AuthResponse with new tokens and updated user
   */
  async firstLoginPasswordChange(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<AuthResponseDto> {
    try {
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

      // Validate current password matches (Requirement 1.3, 2.1)
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

      // Validate new password differs from current (Requirement 1.3)
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

      // Update user: password, isFirstLogin=false, temporaryPassword=false, lastPasswordChange=now (Requirement 1.4)
      user.passwordHash = hashedPassword;
      user.isFirstLogin = false;
      user.temporaryPassword = false;
      user.lastPasswordChange = new Date();
      await user.save();

      this.logger.log(`First login password changed for user ${userId}`);

      // Generate new access and refresh tokens (Requirement 1.5)
      const tokens = await this.generateTokens(user);

      // Call SessionService to invalidate old sessions
      await this.sessionService.invalidateUserSessions(
        userId,
        'first_login_password_change',
      );

      // Call AuditService to log password change
      await this.auditService.logPasswordChange(userId, 'first_login');

      // Return new tokens and updated user (Requirement 1.5)
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
          // Authentication fields
          isFirstLogin: user.isFirstLogin, // Now false
          passwordChangeRequired: false,
          preferredLanguage: user.preferredLanguage,
          isOwner: user.role === 'owner',
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
        `First login password change failed for user ${userId}: ${error.message}`,
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
      const isAllowed =
        await this.rateLimitService.checkPasswordChangeLimit(userId);
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
      await this.auditService.logPasswordChange(userId, 'user_initiated');

      // TODO: Call EmailService to send confirmation (Requirement 4.4)
      // This will be implemented when EmailService is available (Task 7)
      this.logger.log(
        `Email confirmation needed for password change by user ${userId}`,
      );

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
   * Initiate email change with verification
   *
   * This method initiates an email change process by:
   * 1. Checking if the new email is already in use
   * 2. Generating a verification token
   * 3. Storing the pending email change
   * 4. Sending verification email to the new address
   *
   * @param userId - User ID requesting email change
   * @param newEmail - New email address
   * @returns Success response
   */
  async initiateEmailChange(userId: string, newEmail: string): Promise<void> {
    try {
      // Validate user exists
      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        throw new NotFoundException({
          message: {
            ar: 'المستخدم غير موجود',
            en: 'User not found',
          },
          code: 'USER_NOT_FOUND',
        });
      }

      // Check if new email is already in use
      const existingUser = await this.userModel
        .findOne({ email: newEmail.toLowerCase() })
        .exec();
      if (existingUser) {
        throw new ConflictException({
          message: {
            ar: 'البريد الإلكتروني مستخدم بالفعل',
            en: 'Email already in use',
          },
          code: 'EMAIL_ALREADY_IN_USE',
        });
      }

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex');

      // Store pending email change (expires in 24 hours)
      user.emailVerificationToken = hashedToken;
      user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      (user as any).pendingEmail = newEmail.toLowerCase();
      await user.save();

      // Send verification email
      const language = user.preferredLanguage || 'en';
      await this.emailService.sendEmailChangeVerification(
        newEmail,
        user.firstName,
        verificationToken,
        language,
      );

      this.logger.log(
        `Email change initiated for user ${userId}. Verification sent to ${newEmail}`,
      );
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(
        `Email change initiation failed for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException({
        message: {
          ar: 'فشل بدء تغيير البريد الإلكتروني',
          en: 'Failed to initiate email change',
        },
        code: 'EMAIL_CHANGE_INITIATION_FAILED',
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
  async forgotPassword(email: string, ipAddress: string): Promise<any> {
    try {
      // Check rate limit for IP address (5 per hour) - Requirement 2.10
      const isAllowed =
        await this.rateLimitService.checkPasswordResetLimit(ipAddress);
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
        email: email.toLowerCase(),
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
        this.logger.log(
          `Password reset email needed for ${user.email} with token: ${resetToken}`,
        );

        // Call AuditService to log reset request
        await this.auditService.logPasswordResetRequest(email, ipAddress);
      } else {
        // User doesn't exist, but we still log the attempt
        this.logger.log(
          `Password reset requested for non-existent email: ${email}`,
        );
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
  async resetPassword(token: string, newPassword: string): Promise<any> {
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
      if (
        !user.passwordResetExpires ||
        user.passwordResetExpires < new Date()
      ) {
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
      this.logger.log(
        `Password reset confirmation email needed for ${user.email}`,
      );

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
      this.logger.error(`Password reset failed: ${error.message}`, error.stack);
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
   * Logout user and blacklist tokens
   *
   * Requirements: 3.5
   * Task: 18.1
   *
   * @param userId - User ID logging out
   * @param accessToken - Access token to blacklist
   * @param refreshToken - Refresh token to blacklist (optional)
   * @param ipAddress - IP address of the request (optional)
   * @param userAgent - User agent string (optional)
   * @returns Success response with bilingual message
   */
  async logout(
    userId: string,
    accessToken: string,
    refreshToken?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<any> {
    try {
      // Verify and decode access token to get expiration
      let accessTokenExpiry: Date;
      try {
        const accessPayload = await this.jwtService.verifyAsync(accessToken, {
          secret: process.env.JWT_SECRET,
        });
        accessTokenExpiry = new Date(accessPayload.exp * 1000);
      } catch (error) {
        // If token is already expired or invalid, use a default expiry
        // This ensures we still blacklist it
        accessTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      }

      // Call SessionService.addTokenToBlacklist for access token
      await this.sessionService.addTokenToBlacklist(
        accessToken,
        userId,
        accessTokenExpiry,
        'logout',
      );

      this.logger.log(`Access token blacklisted for user ${userId} on logout`);

      // Invalidate session record - Requirement 4.3
      try {
        // Find and invalidate the session by token
        const tokenHash = crypto
          .createHash('sha256')
          .update(accessToken)
          .digest('hex');
        const session = await this.sessionService.restoreSession(accessToken);
        if (session) {
          await this.sessionService.invalidateSession(
            (session._id as any).toString(),
            'logout',
          );
          this.logger.log(`Session invalidated for user ${userId} on logout`);
        }
      } catch (error) {
        // Log error but don't fail logout if session invalidation fails
        this.logger.warn(
          `Failed to invalidate session for user ${userId}: ${error.message}`,
        );
      }

      // If refresh token provided, blacklist it too
      if (refreshToken) {
        let refreshTokenExpiry: Date;
        try {
          const refreshPayload = await this.jwtService.verifyAsync(
            refreshToken,
            {
              secret:
                process.env.JWT_REFRESH_SECRET ||
                process.env.JWT_SECRET + '_refresh',
            },
          );
          refreshTokenExpiry = new Date(refreshPayload.exp * 1000);
        } catch (error) {
          // If token is already expired or invalid, use a default expiry
          refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
        }

        await this.sessionService.addTokenToBlacklist(
          refreshToken,
          userId,
          refreshTokenExpiry,
          'logout',
        );

        this.logger.log(
          `Refresh token blacklisted for user ${userId} on logout`,
        );
      }

      // Call AuditService to log logout
      await this.auditLogModel.create({
        eventType: 'logout',
        userId: new Types.ObjectId(userId),
        ipAddress: ipAddress || '0.0.0.0',
        userAgent: userAgent || 'unknown',
        timestamp: new Date(),
        success: true,
        details: {
          action: 'User logged out',
          tokensBlacklisted: refreshToken ? 2 : 1,
        },
      });

      this.logger.log(`User ${userId} logged out successfully`);

      // Return success response
      return {
        success: true,
        message: {
          ar: 'تم تسجيل الخروج بنجاح',
          en: 'Logout successful',
        },
      };
    } catch (error) {
      this.logger.error(
        `Logout failed for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException({
        message: {
          ar: 'فشل تسجيل الخروج',
          en: 'Logout failed',
        },
        code: 'LOGOUT_FAILED',
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
  async sendPasswordResetEmail(userId: string, adminId: string): Promise<any> {
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

      this.logger.log(
        `Admin ${adminId} initiated password reset for user ${userId}`,
      );

      // TODO: Call EmailService to send reset email - Requirement 2.6
      // This will be implemented when EmailService is available (Task 7)
      // await this.emailService.sendPasswordResetEmail(
      //   user.email,
      //   user.firstName,
      //   resetToken,
      //   user.preferredLanguage || 'en'
      // );
      this.logger.log(
        `Password reset email needed for ${user.email} with token: ${resetToken}`,
      );

      // Call AuditService to log admin-initiated reset
      await this.auditService.logPasswordChange(userId, 'admin_reset', adminId);

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

  /**
   * Get login history for a user
   * @param userId - User ID
   * @param limit - Number of records to return
   * @returns Array of login audit logs
   */
  async getLoginHistory(userId: string, limit: number = 50): Promise<any[]> {
    try {
      return await this.auditLogModel
        .find({
          userId: new Types.ObjectId(userId),
          eventType: {
            $in: ['login_success', 'login_failure'],
          },
        })
        .sort({ timestamp: -1 })
        .limit(limit)
        .select('eventType timestamp ipAddress userAgent success details')
        .lean()
        .exec();
    } catch (error) {
      this.logger.error(
        `Failed to get login history for user ${userId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get activity log for a user
   * @param userId - User ID
   * @param limit - Number of records to return
   * @returns Array of activity audit logs
   */
  async getUserActivityLog(userId: string, limit: number = 50): Promise<any[]> {
    try {
      return await this.auditLogModel
        .find({
          userId: new Types.ObjectId(userId),
        })
        .sort({ timestamp: -1 })
        .limit(limit)
        .select('eventType timestamp ipAddress userAgent success details')
        .lean()
        .exec();
    } catch (error) {
      this.logger.error(
        `Failed to get activity log for user ${userId}: ${error.message}`,
      );
      throw error;
    }
  }
}
