import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FirstLoginPasswordChangeDto {
  @ApiProperty({
    description: 'Current temporary password',
    example: 'TempPassword123!',
    type: String,
    minLength: 8,
  })
  @IsString({ message: 'Current password must be a string' })
  @IsNotEmpty({ message: 'Current password is required' })
  @MinLength(8, {
    message: 'Current password must be at least 8 characters long',
  })
  currentPassword: string;

  @ApiProperty({
    description:
      'New password (min 8 characters, must include uppercase, lowercase, number, and special character)',
    example: 'NewSecurePass456!',
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
    example: 'NewSecurePass456!',
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
