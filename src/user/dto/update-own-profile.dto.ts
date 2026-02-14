import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';
import { IsPhoneNumberWithCountryCode } from '../../common/decorators/phone-validation.decorator';

/**
 * DTO for users updating their own profile
 *
 * Restricted to basic fields that users can safely update themselves
 */
export class UpdateOwnProfileDto {
  @ApiPropertyOptional({
    description: 'User first name',
    example: 'Ahmed',
    type: String,
    minLength: 2,
  })
  @IsOptional()
  @IsString()
  @MinLength(2, {
    message: JSON.stringify({
      ar: 'الاسم الأول يجب أن يكون حرفين على الأقل',
      en: 'First name must be at least 2 characters',
    }),
  })
  firstName?: string;

  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Al-Mansour',
    type: String,
    minLength: 2,
  })
  @IsOptional()
  @IsString()
  @MinLength(2, {
    message: JSON.stringify({
      ar: 'اسم العائلة يجب أن يكون حرفين على الأقل',
      en: 'Last name must be at least 2 characters',
    }),
  })
  lastName?: string;

  @IsPhoneNumberWithCountryCode(
    false,
    'User phone number (international format with country code)',
    '+966501234567',
  )
  phone?: string;

  @ApiPropertyOptional({
    description: 'User nationality',
    example: 'Saudi Arabia',
    type: String,
  })
  @IsOptional()
  @IsString()
  @MinLength(2, {
    message: JSON.stringify({
      ar: 'الجنسية يجب أن تكون حرفين على الأقل',
      en: 'Nationality must be at least 2 characters',
    }),
  })
  nationality?: string;

  @ApiPropertyOptional({
    description: 'User email address (requires verification)',
    example: 'ahmed.new@cliniva.com',
    type: String,
  })
  @IsOptional()
  @IsEmail(
    {},
    {
      message: JSON.stringify({
        ar: 'البريد الإلكتروني غير صالح',
        en: 'Invalid email address',
      }),
    },
  )
  email?: string;
}
