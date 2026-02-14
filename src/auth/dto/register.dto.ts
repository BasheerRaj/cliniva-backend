import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  Matches,
  IsMongoId,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../common/enums/user-role.enum';
import { Transform } from 'class-transformer';
import { IsPhoneNumberWithCountryCode } from '../../common/decorators/phone-validation.decorator';

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
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

  @ApiProperty({
    description:
      'User password (min 8 characters, must include uppercase, lowercase, number, and special character)',
    example: 'SecurePass123!',
    type: String,
    minLength: 8,
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
  @MinLength(8, {
    message: JSON.stringify({
      ar: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
      en: 'Password must be at least 8 characters long',
    }),
  })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, {
    message: JSON.stringify({
      ar: 'كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم ورمز خاص',
      en: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    }),
  })
  password: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
    type: String,
  })
  @IsString({
    message: JSON.stringify({
      ar: 'الاسم الأول يجب أن يكون نصاً',
      en: 'First name must be a string',
    }),
  })
  @IsNotEmpty({
    message: JSON.stringify({
      ar: 'الاسم الأول مطلوب',
      en: 'First name is required',
    }),
  })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    type: String,
  })
  @IsString({
    message: JSON.stringify({
      ar: 'اسم العائلة يجب أن يكون نصاً',
      en: 'Last name must be a string',
    }),
  })
  @IsNotEmpty({
    message: JSON.stringify({
      ar: 'اسم العائلة مطلوب',
      en: 'Last name is required',
    }),
  })
  lastName: string;

  @ApiProperty({
    description: 'User role in the system',
    example: 'owner',
    enum: UserRole,
    enumName: 'UserRole',
  })
  @IsEnum(UserRole, {
    message: JSON.stringify({
      ar: 'الدور يجب أن يكون أحد: super_admin, owner, admin, manager, doctor, staff, patient',
      en: 'Role must be one of: super_admin, owner, admin, manager, doctor, staff, patient',
    }),
  })
  @IsNotEmpty({
    message: JSON.stringify({
      ar: 'الدور مطلوب',
      en: 'Role is required',
    }),
  })
  role: UserRole;

  @IsPhoneNumberWithCountryCode(
    false,
    'User phone number with country code (E.164 format)',
    '+966501234567',
  )
  phone?: string;

  @ApiPropertyOptional({
    description: 'User nationality',
    example: 'US',
    type: String,
  })
  @IsOptional()
  @IsString({
    message: JSON.stringify({
      ar: 'الجنسية يجب أن تكون نصاً',
      en: 'Nationality must be a string',
    }),
  })
  nationality?: string;

  @ApiPropertyOptional({
    description: 'User gender',
    example: 'male',
    enum: ['male', 'female', 'other'],
  })
  @IsOptional()
  @IsEnum(['male', 'female', 'other'], {
    message: JSON.stringify({
      ar: 'الجنس يجب أن يكون أحد: male, female, other',
      en: 'Gender must be one of: male, female, other',
    }),
  })
  gender?: string;

  @ApiPropertyOptional({
    description: 'Complex ID (optional) - Associates user with a specific complex',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsOptional()
  @IsMongoId({
    message: JSON.stringify({
      ar: 'معرف المجمع غير صالح',
      en: 'Invalid complex ID',
    }),
  })
  complexId?: string;

  @ApiPropertyOptional({
    description: 'Clinic ID (optional)',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsOptional()
  @IsMongoId({
    message: JSON.stringify({
      ar: 'معرف العيادة غير صالح',
      en: 'Invalid clinic ID',
    }),
  })
  clinicId?: string;
}
