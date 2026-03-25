import {
  IsNotEmpty,
  IsString,
  MinLength,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class LoginDto {
  @ApiProperty({
    description: 'Unique username',
    example: 'john.doe',
    type: String,
  })
  @Transform(({ value }) => value?.toLowerCase().trim())
  @IsString({
    message: JSON.stringify({
      ar: 'اسم المستخدم يجب أن يكون نصاً',
      en: 'Username must be a string',
    }),
  })
  @IsNotEmpty({
    message: JSON.stringify({
      ar: 'اسم المستخدم مطلوب',
      en: 'Username is required',
    }),
  })
  username: string;

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

  @ApiProperty({
    description: 'Remember me for 30 days',
    example: true,
    required: false,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean({
    message: JSON.stringify({
      ar: 'يجب أن تكون قيمة تذكرني بولينية',
      en: 'Remember me must be a boolean value',
    }),
  })
  rememberMe?: boolean;
}
