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
  IsIP
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { UserRole } from '../../common/enums/user-role.enum';
import { PermissionsEnum } from '../../common/enums/permissions.enum';

// User Access Management DTOs
export class CreateUserAccessDto {
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @IsEnum(['organization', 'complex', 'department', 'clinic'])
  @IsNotEmpty()
  scopeType: string;

  @IsMongoId()
  @IsNotEmpty()
  scopeId: string;

  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @IsArray()
  @IsEnum(PermissionsEnum, { each: true })
  @IsOptional()
  customPermissions?: PermissionsEnum[];

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsString()
  @IsOptional()
  @Length(0, 500)
  notes?: string;
}

export class UpdateUserAccessDto {
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsArray()
  @IsEnum(PermissionsEnum, { each: true })
  @IsOptional()
  customPermissions?: PermissionsEnum[];

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsString()
  @IsOptional()
  @Length(0, 500)
  notes?: string;

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

  @IsEnum(['login', 'logout', 'access_attempt', 'permission_denied', 'session_expired', 'password_change', 'role_change', 'failed_login', 'suspicious_activity', 'api_access', 'data_access', 'system_access'])
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
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @IsArray()
  @IsEnum(PermissionsEnum, { each: true })
  @IsNotEmpty()
  permissions: PermissionsEnum[];

  @IsEnum(['organization', 'complex', 'department', 'clinic'])
  @IsNotEmpty()
  scopeType: string;

  @IsMongoId()
  @IsNotEmpty()
  scopeId: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsString()
  @IsOptional()
  @Length(0, 500)
  reason?: string;
}

export class RevokePermissionsDto {
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @IsArray()
  @IsEnum(PermissionsEnum, { each: true })
  @IsNotEmpty()
  permissions: PermissionsEnum[];

  @IsEnum(['organization', 'complex', 'department', 'clinic'])
  @IsNotEmpty()
  scopeType: string;

  @IsMongoId()
  @IsNotEmpty()
  scopeId: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 500)
  reason: string;
}

// Search and Filter DTOs
export class UserAccessSearchDto {
  @IsString()
  @IsOptional()
  search?: string; // Search across user names and emails

  @IsMongoId()
  @IsOptional()
  userId?: string;

  @IsEnum(['organization', 'complex', 'department', 'clinic'])
  @IsOptional()
  scopeType?: string;

  @IsMongoId()
  @IsOptional()
  scopeId?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: string;

  @IsArray()
  @IsEnum(PermissionsEnum, { each: true })
  @IsOptional()
  hasPermissions?: PermissionsEnum[];

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isExpired?: boolean;

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

export class AccessLogSearchDto {
  @IsMongoId()
  @IsOptional()
  userId?: string;

  @IsArray()
  @IsEnum(['login', 'logout', 'access_attempt', 'permission_denied', 'session_expired', 'password_change', 'role_change', 'failed_login', 'suspicious_activity', 'api_access', 'data_access', 'system_access'], { each: true })
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
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @IsEnum(PermissionsEnum)
  @IsNotEmpty()
  permission: PermissionsEnum;

  @IsEnum(['organization', 'complex', 'department', 'clinic'])
  @IsNotEmpty()
  scopeType: string;

  @IsMongoId()
  @IsNotEmpty()
  scopeId: string;
}

export class CheckMultiplePermissionsDto {
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @IsArray()
  @IsEnum(PermissionsEnum, { each: true })
  @IsNotEmpty()
  permissions: PermissionsEnum[];

  @IsEnum(['organization', 'complex', 'department', 'clinic'])
  @IsNotEmpty()
  scopeType: string;

  @IsMongoId()
  @IsNotEmpty()
  scopeId: string;

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

  @IsEnum(['suspicious_login', 'multiple_failed_attempts', 'unusual_location', 'privilege_escalation', 'data_breach_attempt', 'account_takeover', 'brute_force_attack'])
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