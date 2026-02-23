import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token received via email',
    example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6',
    type: String,
    minLength: 32,
  })
  @IsString({
    message: JSON.stringify({
      ar: 'الرمز يجب أن يكون نصاً',
      en: 'Token must be a string',
    }),
  })
  @IsNotEmpty({
    message: JSON.stringify({
      ar: 'الرمز مطلوب',
      en: 'Token is required',
    }),
  })
  @MinLength(32, {
    message: JSON.stringify({
      ar: 'الرمز يجب أن يكون 32 حرفاً على الأقل',
      en: 'Token must be at least 32 characters long',
    }),
  })
  token: string;

  @ApiProperty({
    description:
      'New password (min 8 characters, must include uppercase, lowercase, number, and special character)',
    example: 'NewSecurePass123!',
    type: String,
    minLength: 8,
  })
  @IsString({
    message: JSON.stringify({
      ar: 'كلمة المرور الجديدة يجب أن تكون نصاً',
      en: 'New password must be a string',
    }),
  })
  @IsNotEmpty({
    message: JSON.stringify({
      ar: 'كلمة المرور الجديدة مطلوبة',
      en: 'New password is required',
    }),
  })
  @MinLength(8, {
    message: JSON.stringify({
      ar: 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل',
      en: 'New password must be at least 8 characters long',
    }),
  })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message: JSON.stringify({
      ar: 'كلمة المرور الجديدة يجب أن تحتوي على حرف كبير وحرف صغير ورقم ورمز خاص',
      en: 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    }),
  })
  newPassword: string;

  @ApiProperty({
    description: 'Confirmation of new password (must match newPassword)',
    example: 'NewSecurePass123!',
    type: String,
    minLength: 8,
  })
  @IsString({
    message: JSON.stringify({
      ar: 'تأكيد كلمة المرور يجب أن يكون نصاً',
      en: 'Confirm password must be a string',
    }),
  })
  @IsNotEmpty({
    message: JSON.stringify({
      ar: 'تأكيد كلمة المرور مطلوب',
      en: 'Confirm password is required',
    }),
  })
  @MinLength(8, {
    message: JSON.stringify({
      ar: 'تأكيد كلمة المرور يجب أن يكون 8 أحرف على الأقل',
      en: 'Confirm password must be at least 8 characters long',
    }),
  })
  confirmPassword: string;
}
