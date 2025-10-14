import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../common/enums/user-role.enum';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email of the user' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

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

  @ApiProperty({ example: 'Mohammed', description: 'First name of the user' })
  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  @ApiProperty({ example: 'Ali', description: 'Last name of the user' })
  @IsString({ message: 'Last name must be a string' })
  @IsNotEmpty({ message: 'Last name is required' })
  lastName: string;

  @ApiProperty({ enum: UserRole, example: UserRole.ADMIN, description: 'Role of the user' })
  @IsEnum(UserRole, {
    message: 'Role must be one of: super_admin, owner, admin, doctor, staff, patient'
  })
  @IsNotEmpty({ message: 'Role is required' })
  role: UserRole;

  @ApiPropertyOptional({ example: '+491234567890', description: 'Phone number of the user' })
  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  phone?: string;

  @ApiPropertyOptional({ example: 'German', description: 'Nationality of the user' })
  @IsOptional()
  @IsString({ message: 'Nationality must be a string' })
  nationality?: string;

  @ApiPropertyOptional({ enum: ['male', 'female', 'other'], description: 'Gender of the user' })
  @IsOptional()
  @IsEnum(['male', 'female', 'other'], {
    message: 'Gender must be one of: male, female, other'
  })
  gender?: string;
}
