import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../common/enums/user-role.enum';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email of the user' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;
  @ApiProperty({
    example: 'john_doe',
    description: 'Unique username for the user (3-30 characters, letters, numbers, underscore, hyphen)',
    minLength: 3,
    maxLength: 30
  })
  @IsString({ message: 'Username must be a string' })
  @IsNotEmpty({ message: 'Username is required' })
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @Matches(
    /^[a-zA-Z0-9_-]{3,30}$/,
    { message: 'Username can only contain letters, numbers, underscore, and hyphen (3-30 characters)' }
  )
  username: string;
  @ApiProperty({
    example: 'Password123!',
    description: 'Password must contain uppercase, lowercase, number, and special character',
    minLength: 8
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    { message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' }
  )
  password: string;

  @ApiProperty({ enum: UserRole, example: UserRole.ADMIN, description: 'Role of the user' })
  @IsEnum(UserRole, {
    message: 'Role must be one of: super_admin, owner, admin, doctor, staff, patient'
  })
  @IsNotEmpty({ message: 'Role is required' })
  role: UserRole;

}
