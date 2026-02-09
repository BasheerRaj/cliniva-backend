import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'User email address for password reset',
    example: 'john.doe@example.com',
    type: String,
    format: 'email',
  })
  @Transform(({ value }) => value?.toLowerCase().trim())
  @IsEmail({}, {
    message: JSON.stringify({
      ar: 'البريد الإلكتروني غير صالح',
      en: 'Invalid email address',
    }),
  })
  @IsNotEmpty({
    message: JSON.stringify({
      ar: 'البريد الإلكتروني مطلوب',
      en: 'Email is required',
    }),
  })
  email: string;
}
