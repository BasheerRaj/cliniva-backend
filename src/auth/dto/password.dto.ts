import { 
  IsEmail, 
  IsNotEmpty, 
  IsString, 
  MinLength, 
  Matches 
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO لطلب إعادة تعيين كلمة المرور
 */
export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email address of the user',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;
}

/**
 * DTO لإعادة تعيين كلمة المرور
 */
export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token received via email',
    example: 'abc123xyz456...',
  })
  @IsString({ message: 'Token must be a string' })
  @IsNotEmpty({ message: 'Reset token is required' })
  token: string;

  @ApiProperty({
    description: 'New password (min 8 chars, uppercase, lowercase, number, special char)',
    example: 'NewPassword123!',
    minLength: 8,
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    { message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' }
  )
  newPassword: string;

  @ApiProperty({
    description: 'Confirm new password',
    example: 'NewPassword123!',
  })
  @IsString({ message: 'Confirm password must be a string' })
  @IsNotEmpty({ message: 'Password confirmation is required' })
  confirmPassword: string;
}

/**
 * DTO لتغيير كلمة المرور (للمستخدم المسجل دخول)
 */
export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password',
    example: 'OldPassword123!',
  })
  @IsString({ message: 'Current password must be a string' })
  @IsNotEmpty({ message: 'Current password is required' })
  currentPassword: string;

  @ApiProperty({
    description: 'New password (min 8 chars, uppercase, lowercase, number, special char)',
    example: 'NewPassword123!',
    minLength: 8,
  })
  @IsString({ message: 'New password must be a string' })
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    { message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' }
  )
  newPassword: string;

  @ApiProperty({
    description: 'Confirm new password',
    example: 'NewPassword123!',
  })
  @IsString({ message: 'Confirm password must be a string' })
  @IsNotEmpty({ message: 'Password confirmation is required' })
  confirmPassword: string;
}

/**
 * Response DTO for password reset request
 */
export class ForgotPasswordResponseDto {
  message: string;
  email: string;
  expiresIn: string;
}

/**
 * Response DTO for token validation
 */
export class ValidateResetTokenResponseDto {
  isValid: boolean;
  message: string;
  email?: string;
  expiresAt?: Date;
}