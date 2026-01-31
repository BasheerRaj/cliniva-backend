import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class FirstLoginPasswordChangeDto {
  @IsString({ message: 'Current password must be a string' })
  @IsNotEmpty({ message: 'Current password is required' })
  @MinLength(8, { message: 'Current password must be at least 8 characters long' })
  currentPassword: string;

  @IsString({ message: 'New password must be a string' })
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    {
      message: 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }
  )
  newPassword: string;

  @IsString({ message: 'Confirm password must be a string' })
  @IsNotEmpty({ message: 'Confirm password is required' })
  @MinLength(8, { message: 'Confirm password must be at least 8 characters long' })
  confirmPassword: string;
}
