import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
    type: String,
    format: 'email',
  })
  @Transform(({ value }) => value?.toLowerCase().trim())
  @IsEmail(
    {},
    {
      message: JSON.stringify({
        ar: 'البريد الإلكتروني غير صالح',
        en: 'Invalid email address',
      }),
    },
  )
  @IsNotEmpty({
    message: JSON.stringify({
      ar: 'البريد الإلكتروني مطلوب',
      en: 'Email is required',
    }),
  })
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePass123!',
    type: String,
    minLength: 6,
  })
  @IsString({
    message: JSON.stringify({
      ar: 'كلمة المرور يجب أن تكون نصاً',
      en: 'Password must be a string',
    }),
  })
  @IsNotEmpty({
    message: JSON.stringify({
      ar: 'كلمة المرور مطلوبة',
      en: 'Password is required',
    }),
  })
  @MinLength(6, {
    message: JSON.stringify({
      ar: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
      en: 'Password must be at least 6 characters long',
    }),
  })
  password: string;
}
