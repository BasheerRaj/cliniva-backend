import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsMongoId,
  IsArray,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  Length,
  IsDateString,
  ValidateNested,
  IsObject,
  IsIP,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { UserRole } from '../../common/enums/user-role.enum';
import { PermissionsEnum } from '../../common/enums/permissions.enum';

// User Access Management DTOs
export class CreateUserAccessDto {
  @ApiProperty({
    description: 'User ID to grant access to',
    example: '507f1f77bcf86cd799439012',
    type: String,
  })
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Scope type - defines the level of access (organization, complex, department, or clinic)',
    enum: ['organization', 'complex', 'department', 'clinic'],
    example: 'clinic',
  })
  @IsEnum(['organization', 'complex', 'department', 'clinic'])
  @IsNotEmpty()
  scopeType: string;

  @ApiProperty({
    description: 'Scope entity ID - the ID of the organization, complex, department, or clinic',
    example: '507f1f77bcf86cd799439013',
    type: String,
  })
  @IsMongoId()
  @IsNotEmpty()
  scopeId: string;

  @ApiProperty({
    description: 'User role within the scope',
    enum: UserRole,
    example: UserRole.ADMIN,
  })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @ApiPropertyOptional({
    description: 'Custom permissions beyond role defaults',
    type: [String],
    enum: PermissionsEnum,
    example: [PermissionsEnum.USER_READ, PermissionsEnum.USER_CREATE],
  })
  @IsArray()
  @IsEnum(PermissionsEnum, { each: true })
  @IsOptional()
  customPermissions?: PermissionsEnum[];

  @ApiPropertyOptional({
    description: 'Access expiration date (ISO 8601 format)',
    example: '2026-12-31T23:59:59.000Z',
    type: String,
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @ApiPropertyOptional({
    description: 'Additional notes about this access grant',
    example: 'Temporary access for project duration',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @Length(0, 500)
  notes?: string;
}

export class UpdateUserAccessDto {
  @ApiPropertyOptional({
    description: 'Updated user role',
    enum: UserRole,
    example: UserRole.DOCTOR,
  })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Updated custom permissions',
    type: [String],
    enum: PermissionsEnum,
    example: [PermissionsEnum.USER_READ, PermissionsEnum.USER_UPDATE],
  })
  @IsArray()
  @IsEnum(PermissionsEnum, { each: true })
  @IsOptional()
  customPermissions?: PermissionsEnum[];

  @ApiPropertyOptional({
    description: 'Updated expiration date',
    example: '2027-12-31T23:59:59.000Z',
    type: String,
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @ApiPropertyOptional({
    description: 'Updated notes',
    example: 'Extended access for additional responsibilities',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @Length(0, 500)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Active status - set to false to temporarily disable access',
    example: true,
    type: Boolean,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;
}

// Bulk User Access Operations
export class BulkUserAccessDto {
  @IsArray()
  @IsMongoId({ each: true })
  @IsNotEmpty()
  userIds: string[];

  @IsEnum(['grant', 'revoke', 'update_role', 'activate', 'deactivate'])
  @IsNotEmpty()
  action: string;

  @IsEnum(['organization', 'complex', 'department', 'clinic'])
  @IsOptional()
  scopeType?: string;

  @IsMongoId()
  @IsOptional()
  scopeId?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsArray()
  @IsEnum(PermissionsEnum, { each: true })
  @IsOptional()
  permissions?: PermissionsEnum[];

  @IsString()
  @IsOptional()
  @Length(0, 500)
  reason?: string;
}

// Access Log DTOs
export class CreateAccessLogDto {
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @IsEnum([
    'login',
    'logout',
    'access_attempt',
    'permission_denied',
    'session_expired',
    'password_change',
    'role_change',
    'failed_login',
    'suspicious_activity',
    'api_access',
    'data_access',
    'system_access',
  ])
  @IsNotEmpty()
  eventType: string;

  @IsIP()
  @IsNotEmpty()
  ipAddress: string;

  @IsString()
  @IsOptional()
  userAgent?: string;

  @IsString()
  @IsOptional()
  sessionId?: string;

  @IsEnum(['success', 'failure', 'blocked', 'warning'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  resource?: string;

  @IsString()
  @IsOptional()
  method?: string;

  @IsNumber()
  @IsOptional()
  @Min(100)
  @Max(599)
  statusCode?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  responseTime?: number;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  deviceType?: string;

  @IsString()
  @IsOptional()
  browser?: string;

  @IsString()
  @IsOptional()
  operatingSystem?: string;

  @IsObject()
  @IsOptional()
  requestData?: Record<string, any>;

  @IsString()
  @IsOptional()
  errorMessage?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  riskScore?: number;

  @IsEnum(['low', 'medium', 'high', 'critical'])
  @IsOptional()
  riskLevel?: string;

  @IsMongoId()
  @IsOptional()
  organizationId?: string;

  @IsMongoId()
  @IsOptional()
  clinicId?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  duration?: number;

  @IsString()
  @IsOptional()
  @Length(0, 1000)
  notes?: string;
}

// User Permission DTOs
export class AssignPermissionsDto {
  @ApiProperty({
    description: 'User ID to assign permissions to',
    example: '507f1f77bcf86cd799439012',
    type: String,
  })
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Permissions to assign',
    type: [String],
    enum: PermissionsEnum,
    example: [PermissionsEnum.USER_READ, PermissionsEnum.USER_CREATE],
  })
  @IsArray()
  @IsEnum(PermissionsEnum, { each: true })
  @IsNotEmpty()
  permissions: PermissionsEnum[];

  @ApiProperty({
    description: 'Scope type where permissions apply',
    enum: ['organization', 'complex', 'department', 'clinic'],
    example: 'clinic',
  })
  @IsEnum(['organization', 'complex', 'department', 'clinic'])
  @IsNotEmpty()
  scopeType: string;

  @ApiProperty({
    description: 'Scope entity ID',
    example: '507f1f77bcf86cd799439013',
    type: String,
  })
  @IsMongoId()
  @IsNotEmpty()
  scopeId: string;

  @ApiPropertyOptional({
    description: 'Permission expiration date',
    example: '2026-12-31T23:59:59.000Z',
    type: String,
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @ApiPropertyOptional({
    description: 'Reason for assigning permissions',
    example: 'Temporary access for special project',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @Length(0, 500)
  reason?: string;
}

export class RevokePermissionsDto {
  @ApiProperty({
    description: 'User ID to revoke permissions from',
    example: '507f1f77bcf86cd799439012',
    type: String,
  })
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Permissions to revoke',
    type: [String],
    enum: PermissionsEnum,
    example: [PermissionsEnum.USER_DELETE],
  })
  @IsArray()
  @IsEnum(PermissionsEnum, { each: true })
  @IsNotEmpty()
  permissions: PermissionsEnum[];

  @ApiProperty({
    description: 'Scope type where permissions are revoked',
    enum: ['organization', 'complex', 'department', 'clinic'],
    example: 'clinic',
  })
  @IsEnum(['organization', 'complex', 'department', 'clinic'])
  @IsNotEmpty()
  scopeType: string;

  @ApiProperty({
    description: 'Scope entity ID',
    example: '507f1f77bcf86cd799439013',
    type: String,
  })
  @IsMongoId()
  @IsNotEmpty()
  scopeId: string;

  @ApiProperty({
    description: 'Reason for revoking permissions (required)',
    example: 'Role change - no longer requires delete permission',
    minLength: 1,
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 500)
  reason: string;
}

// Search and Filter DTOs
export class UserAccessSearchDto {
  @ApiPropertyOptional({
    description: 'Search term - searches across user names and emails',
    example: 'ahmed',
    type: String,
  })
  @IsString()
  @IsOptional()
  search?: string; // Search across user names and emails

  @ApiPropertyOptional({
    description: 'Filter by user ID',
    example: '507f1f77bcf86cd799439012',
    type: String,
  })
  @IsMongoId()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by scope type',
    enum: ['organization', 'complex', 'department', 'clinic'],
    example: 'clinic',
  })
  @IsEnum(['organization', 'complex', 'department', 'clinic'])
  @IsOptional()
  scopeType?: string;

  @ApiPropertyOptional({
    description: 'Filter by scope ID',
    example: '507f1f77bcf86cd799439013',
    type: String,
  })
  @IsMongoId()
  @IsOptional()
  scopeId?: string;

  @ApiPropertyOptional({
    description: 'Filter by role',
    enum: UserRole,
    example: UserRole.ADMIN,
  })
  @IsEnum(UserRole)
  @IsOptional()
  role?: string;

  @ApiPropertyOptional({
    description: 'Filter by permissions - returns records with any of these permissions',
    type: [String],
    enum: PermissionsEnum,
    example: [PermissionsEnum.USER_READ],
  })
  @IsArray()
  @IsEnum(PermissionsEnum, { each: true })
  @IsOptional()
  hasPermissions?: PermissionsEnum[];

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
    type: Boolean,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by expiration status',
    example: false,
    type: Boolean,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isExpired?: boolean;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    type: String,
    default: '1',
  })
  @IsString()
  @IsOptional()
  page?: string;

  @ApiPropertyOptional({
    description: 'Items per page (max: 100)',
    example: 10,
    type: String,
    default: '10',
  })
  @IsString()
  @IsOptional()
  limit?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'createdAt',
    type: String,
    default: 'createdAt',
  })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    example: 'desc',
    default: 'desc',
  })
  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}

export class AccessLogSearchDto {
  @IsMongoId()
  @IsOptional()
  userId?: string;

  @IsArray()
  @IsEnum(
    [
      'login',
      'logout',
      'access_attempt',
      'permission_denied',
      'session_expired',
      'password_change',
      'role_change',
      'failed_login',
      'suspicious_activity',
      'api_access',
      'data_access',
      'system_access',
    ],
    { each: true },
  )
  @IsOptional()
  eventTypes?: string[];

  @IsIP()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  sessionId?: string;

  @IsEnum(['success', 'failure', 'blocked', 'warning'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  resource?: string;

  @IsEnum(['low', 'medium', 'high', 'critical'])
  @IsOptional()
  riskLevel?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  flaggedForReview?: boolean;

  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @IsMongoId()
  @IsOptional()
  organizationId?: string;

  @IsMongoId()
  @IsOptional()
  clinicId?: string;

  @IsString()
  @IsOptional()
  page?: string;

  @IsString()
  @IsOptional()
  limit?: string;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}

// Role Management DTOs
export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  roleName: string;

  @IsString()
  @IsOptional()
  @Length(0, 500)
  description?: string;

  @IsArray()
  @IsEnum(PermissionsEnum, { each: true })
  @IsNotEmpty()
  permissions: PermissionsEnum[];

  @IsEnum(['organization', 'complex', 'department', 'clinic'])
  @IsNotEmpty()
  scopeType: string;

  @IsMongoId()
  @IsOptional()
  scopeId?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isSystemRole?: boolean;
}

export class UpdateRoleDto {
  @IsString()
  @IsOptional()
  @Length(2, 50)
  roleName?: string;

  @IsString()
  @IsOptional()
  @Length(0, 500)
  description?: string;

  @IsArray()
  @IsEnum(PermissionsEnum, { each: true })
  @IsOptional()
  permissions?: PermissionsEnum[];

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;
}

// Permission Check DTOs
export class CheckPermissionDto {
  @ApiProperty({
    description: 'User ID to check permission for',
    example: '507f1f77bcf86cd799439012',
    type: String,
  })
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Permission to check',
    enum: PermissionsEnum,
    example: PermissionsEnum.USER_READ,
  })
  @IsEnum(PermissionsEnum)
  @IsNotEmpty()
  permission: PermissionsEnum;

  @ApiProperty({
    description: 'Scope type to check permission in',
    enum: ['organization', 'complex', 'department', 'clinic'],
    example: 'clinic',
  })
  @IsEnum(['organization', 'complex', 'department', 'clinic'])
  @IsNotEmpty()
  scopeType: string;

  @ApiProperty({
    description: 'Scope entity ID',
    example: '507f1f77bcf86cd799439013',
    type: String,
  })
  @IsMongoId()
  @IsNotEmpty()
  scopeId: string;
}

export class CheckMultiplePermissionsDto {
  @ApiProperty({
    description: 'User ID to check permissions for',
    example: '507f1f77bcf86cd799439012',
    type: String,
  })
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'List of permissions to check',
    type: [String],
    enum: PermissionsEnum,
    example: [PermissionsEnum.USER_READ, PermissionsEnum.USER_CREATE],
  })
  @IsArray()
  @IsEnum(PermissionsEnum, { each: true })
  @IsNotEmpty()
  permissions: PermissionsEnum[];

  @ApiProperty({
    description: 'Scope type to check permissions in',
    enum: ['organization', 'complex', 'department', 'clinic'],
    example: 'clinic',
  })
  @IsEnum(['organization', 'complex', 'department', 'clinic'])
  @IsNotEmpty()
  scopeType: string;

  @ApiProperty({
    description: 'Scope entity ID',
    example: '507f1f77bcf86cd799439013',
    type: String,
  })
  @IsMongoId()
  @IsNotEmpty()
  scopeId: string;

  @ApiPropertyOptional({
    description: 'Requirement type - "all" requires all permissions, "any" requires at least one',
    enum: ['all', 'any'],
    example: 'all',
    default: 'all',
  })
  @IsEnum(['all', 'any'])
  @IsOptional()
  requirementType?: 'all' | 'any'; // Require all permissions or any permission
}

// Session Management DTOs
export class CreateSessionDto {
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @IsIP()
  @IsNotEmpty()
  ipAddress: string;

  @IsString()
  @IsNotEmpty()
  userAgent: string;

  @IsString()
  @IsOptional()
  deviceFingerprint?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  rememberMe?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(300) // Minimum 5 minutes
  @Max(86400) // Maximum 24 hours
  expiresInSeconds?: number;
}

export class SessionStatusDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsMongoId()
  @IsNotEmpty()
  userId: string;
}

// Security DTOs
export class SecurityAlertDto {
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @IsEnum([
    'suspicious_login',
    'multiple_failed_attempts',
    'unusual_location',
    'privilege_escalation',
    'data_breach_attempt',
    'account_takeover',
    'brute_force_attack',
  ])
  @IsNotEmpty()
  alertType: string;

  @IsEnum(['low', 'medium', 'high', 'critical'])
  @IsNotEmpty()
  severity: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 1000)
  description: string;

  @IsObject()
  @IsOptional()
  evidence?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  requiresImmedateAction?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  affectedResources?: string[];
}

// Analytics DTOs
export class UserAccessStatsDto {
  totalUsersWithAccess: number;
  activeUsers: number;
  usersWithExpiredAccess: number;
  usersByRole: Array<{
    role: string;
    count: number;
    percentage: number;
  }>;
  usersByScope: Array<{
    scopeType: string;
    count: number;
  }>;
  recentAccessChanges: Array<{
    userId: string;
    userName: string;
    changeType: string;
    timestamp: Date;
  }>;
  accessByPermission: Array<{
    permission: string;
    userCount: number;
  }>;
  securityAlerts: Array<{
    alertType: string;
    count: number;
    severity: string;
  }>;
  loginTrends: Array<{
    date: string;
    loginCount: number;
    failedLoginCount: number;
  }>;
  topActiveUsers: Array<{
    userId: string;
    userName: string;
    accessCount: number;
    lastAccess: Date;
  }>;
}

export class SecurityStatsDto {
  totalAccessLogs: number;
  loginAttempts: number;
  failedLogins: number;
  suspiciousActivities: number;
  blockedAttempts: number;
  uniqueIpAddresses: number;
  riskDistribution: Array<{
    riskLevel: string;
    count: number;
    percentage: number;
  }>;
  topRiskyUsers: Array<{
    userId: string;
    userName: string;
    riskScore: number;
    recentAlerts: number;
  }>;
  accessByTimeOfDay: Array<{
    hour: number;
    accessCount: number;
  }>;
  accessByLocation: Array<{
    location: string;
    accessCount: number;
    uniqueUsers: number;
  }>;
  deviceStats: Array<{
    deviceType: string;
    count: number;
    percentage: number;
  }>;
  browserStats: Array<{
    browser: string;
    count: number;
    percentage: number;
  }>;
}

// Audit DTOs
export class AccessAuditDto {
  userId: string;
  userName: string;
  currentRole: UserRole;
  scopes: Array<{
    scopeType: string;
    scopeId: string;
    scopeName: string;
    role: UserRole;
    permissions: PermissionsEnum[];
    grantedAt: Date;
    expiresAt?: Date;
  }>;
  recentActivity: Array<{
    eventType: string;
    timestamp: Date;
    ipAddress: string;
    resource?: string;
    status: string;
  }>;
  permissionChanges: Array<{
    permission: PermissionsEnum;
    action: 'granted' | 'revoked';
    timestamp: Date;
    grantedBy?: string;
  }>;
  securityFlags: Array<{
    alertType: string;
    severity: string;
    timestamp: Date;
    resolved: boolean;
  }>;
}
