import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Email or Username',
    example: 'user@example.com OR john_doe123',
  })
  @IsString({ message: 'Email or Username must be a string' })
  @IsNotEmpty({ message: 'Email or Username is required' })
  emailOrUsername: string; // ✅ تغيير من email إلى emailOrUsername

  @ApiProperty({
    description: 'User password (minimum 6 characters)',
    minLength: 6,
    example: 'secret123',
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;
}
