import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../common/enums/user-role.enum';

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
    type: String,
    format: 'email',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    description:
      'User password (min 8 characters, must include uppercase, lowercase, number, and special character)',
    example: 'SecurePass123!',
    type: String,
    minLength: 8,
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
    type: String,
  })
  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    type: String,
  })
  @IsString({ message: 'Last name must be a string' })
  @IsNotEmpty({ message: 'Last name is required' })
  lastName: string;

  @ApiProperty({
    description: 'User role in the system',
    example: 'owner',
    enum: UserRole,
    enumName: 'UserRole',
  })
  @IsEnum(UserRole, {
    message:
      'Role must be one of: super_admin, owner, admin, doctor, staff, patient',
  })
  @IsNotEmpty({ message: 'Role is required' })
  role: UserRole;

  @ApiPropertyOptional({
    description: 'User phone number',
    example: '+1234567890',
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'User nationality',
    example: 'US',
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'Nationality must be a string' })
  nationality?: string;

  @ApiPropertyOptional({
    description: 'User gender',
    example: 'male',
    enum: ['male', 'female', 'other'],
  })
  @IsOptional()
  @IsEnum(['male', 'female', 'other'], {
    message: 'Gender must be one of: male, female, other',
  })
  gender?: string;
}
