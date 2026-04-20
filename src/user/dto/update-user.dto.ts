import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  IsBoolean,
  IsMongoId,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '../../common/enums/user-role.enum';
import { PhoneDto } from '../../common/dto/phone.dto';

/**
 * DTO for updating user information
 *
 * Used for admin-initiated user updates that may trigger session invalidation
 */
export class UpdateUserDto {
  @ApiPropertyOptional({
    description:
      'User email address (changing this will invalidate all sessions)',
    example: 'john.doe@example.com',
    type: String,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Unique username used for login',
    example: 'john.doe',
    type: String,
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9._-]{3,30}$/)
  username?: string;

  @ApiPropertyOptional({
    description: 'User first name',
    example: 'John',
    type: String,
    minLength: 2,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  firstName?: string;

  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Doe',
    type: String,
    minLength: 2,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  lastName?: string;

  @ApiPropertyOptional({
    description: 'User phone number',
    example: '+966501234567',
    type: String,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'List of phone numbers for the user (supports multiple entries)',
    type: [PhoneDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhoneDto)
  phones?: PhoneDto[];

  @ApiPropertyOptional({
    description: 'User role (changing this will invalidate all sessions)',
    example: 'admin',
    enum: UserRole,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'User nationality',
    example: 'SA',
    type: String,
  })
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiPropertyOptional({
    description: 'User gender',
    example: 'male',
    enum: ['male', 'female', 'other'],
  })
  @IsOptional()
  @IsEnum(['male', 'female', 'other'])
  gender?: string;

  @ApiPropertyOptional({
    description: 'User preferred language',
    example: 'en',
    enum: ['ar', 'en'],
  })
  @IsOptional()
  @IsEnum(['ar', 'en'])
  preferredLanguage?: 'ar' | 'en';

  @ApiPropertyOptional({
    description: 'Profile picture URL',
    example: '/uploads/profiles/profile-uuid.jpg',
    type: String,
  })
  @IsOptional()
  @IsString()
  profilePictureUrl?: string;

  @ApiPropertyOptional({
    description: 'Whether the user has completed the onboarding process',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  onboardingComplete?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the user has completed the initial setup',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  setupComplete?: boolean;

  @ApiPropertyOptional({
    description: 'Organization ID association',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsOptional()
  @IsMongoId()
  organizationId?: string;

  @ApiPropertyOptional({
    description: 'Complex ID association',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsOptional()
  @IsMongoId()
  complexId?: string;

  @ApiPropertyOptional({
    description: 'Primary Clinic ID association',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsOptional()
  @IsMongoId()
  clinicId?: string;

  @ApiPropertyOptional({
    description: 'Clinic IDs for users associated with multiple clinics',
    example: ['507f1f77bcf86cd799439011'],
    type: [String],
  })
  @IsOptional()
  @IsMongoId({ each: true })
  clinicIds?: string[];
}
