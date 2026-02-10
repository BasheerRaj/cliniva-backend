import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Notification preferences
 */
export class NotificationPreferencesDto {
  @ApiPropertyOptional({
    description: 'Enable email notifications',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @ApiPropertyOptional({
    description: 'Enable SMS notifications',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  sms?: boolean;

  @ApiPropertyOptional({
    description: 'Enable push notifications',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  push?: boolean;

  @ApiPropertyOptional({
    description: 'Enable appointment reminder notifications',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  appointmentReminders?: boolean;

  @ApiPropertyOptional({
    description: 'Enable system update notifications',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  systemUpdates?: boolean;
}

/**
 * DTO for updating user preferences
 */
export class UpdatePreferencesDto {
  @ApiPropertyOptional({
    description: 'Preferred language',
    example: 'ar',
    enum: ['ar', 'en'],
  })
  @IsOptional()
  @IsEnum(['ar', 'en'])
  language?: 'ar' | 'en';

  @ApiPropertyOptional({
    description: 'Theme preference',
    example: 'dark',
    enum: ['light', 'dark', 'auto'],
  })
  @IsOptional()
  @IsEnum(['light', 'dark', 'auto'])
  theme?: 'light' | 'dark' | 'auto';

  @ApiPropertyOptional({
    description: 'Notification preferences',
    type: NotificationPreferencesDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  notifications?: NotificationPreferencesDto;
}
