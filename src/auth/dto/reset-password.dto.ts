import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token received via email',
    example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6',
    type: String,
    minLength: 32,
  })
  @IsString({ message: 'Token must be a string' })
  @IsNotEmpty({ message: 'Token is required' })
  @MinLength(32, { message: 'Token must be at least 32 characters long' })
  token: string;

  @ApiProperty({
    description:
      'New password (min 8 characters, must include uppercase, lowercase, number, and special character)',
    example: 'NewSecurePass123!',
    type: String,
    minLength: 8,
  })
  @IsString({ message: 'New password must be a string' })
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  newPassword: string;

  @ApiProperty({
    description: 'Confirmation of new password (must match newPassword)',
    example: 'NewSecurePass123!',
    type: String,
    minLength: 8,
  })
  @IsString({ message: 'Confirm password must be a string' })
  @IsNotEmpty({ message: 'Confirm password is required' })
  @MinLength(8, {
    message: 'Confirm password must be at least 8 characters long',
  })
  confirmPassword: string;
}
