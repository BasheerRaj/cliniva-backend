import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsUrl,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a new medical complex
 * Subtask 1.3.11: Update all complex DTOs with @ApiProperty decorators
 */
export class CreateComplexDto {
  @ApiPropertyOptional({
    description:
      'Organization ID (required for company plan, null for complex-only plans)',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsString()
  @IsOptional()
  organizationId?: string; // NULL for complex-only plans

  @ApiProperty({
    description: 'Subscription ID for the complex',
    example: '507f1f77bcf86cd799439012',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  subscriptionId: string;

  @ApiProperty({
    description: 'Owner user ID (user who owns/manages this complex)',
    example: '507f1f77bcf86cd799439013',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  ownerId: string;

  @ApiProperty({
    description: 'Complex name',
    example: 'Central Medical Complex',
    type: String,
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Person-in-charge user ID (must be an employee)',
    example: '507f1f77bcf86cd799439014',
    type: String,
  })
  @IsString()
  @IsOptional()
  personInChargeId?: string;

  @ApiPropertyOptional({
    description: 'Physical address of the complex',
    example: 'King Fahd Road, Riyadh, Saudi Arabia',
    type: String,
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description:
      'Google Maps location URL or coordinates (for geographic data)',
    example: 'https://maps.google.com/?q=24.7136,46.6753',
    type: String,
  })
  @IsString()
  @IsOptional()
  googleLocation?: string;

  @ApiPropertyOptional({
    description: 'Primary phone number',
    example: '+966501234567',
    type: String,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Primary email address',
    example: 'info@centralmedical.com',
    type: String,
    format: 'email',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Complex logo URL',
    example: 'https://example.com/logo.png',
    type: String,
    format: 'url',
  })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Complex website URL',
    example: 'https://centralmedical.com',
    type: String,
    format: 'url',
  })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({
    description: 'Manager name',
    example: 'Dr. Ahmed Al-Saud',
    type: String,
  })
  @IsString()
  @IsOptional()
  managerName?: string;

  @ApiPropertyOptional({
    description: 'Year the complex was established',
    example: 2020,
    type: Number,
    minimum: 1900,
    maximum: 2100,
  })
  @IsNumber()
  @IsOptional()
  yearEstablished?: number;

  @ApiPropertyOptional({
    description: 'Complex mission statement',
    example: 'Provide quality healthcare services to the community',
    type: String,
  })
  @IsString()
  @IsOptional()
  mission?: string;

  @ApiPropertyOptional({
    description: 'Complex vision statement',
    example: 'To be the leading healthcare provider in the region',
    type: String,
  })
  @IsString()
  @IsOptional()
  vision?: string;

  @ApiPropertyOptional({
    description: 'CEO name',
    example: 'Dr. Mohammed Al-Rashid',
    type: String,
  })
  @IsString()
  @IsOptional()
  ceoName?: string;

  @ApiPropertyOptional({
    description: 'VAT registration number',
    example: '300123456789003',
    type: String,
  })
  @IsString()
  @IsOptional()
  vatNumber?: string;

  @ApiPropertyOptional({
    description: 'Commercial registration number',
    example: '1010123456',
    type: String,
  })
  @IsString()
  @IsOptional()
  crNumber?: string;
}

/**
 * DTO for updating an existing medical complex
 * Subtask 1.3.11: Update all complex DTOs with @ApiProperty decorators
 */
export class UpdateComplexDto {
  @ApiPropertyOptional({
    description: 'Complex name',
    example: 'Updated Medical Complex',
    type: String,
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Person-in-charge user ID (must be an employee)',
    example: '507f1f77bcf86cd799439014',
    type: String,
  })
  @IsString()
  @IsOptional()
  personInChargeId?: string;

  @ApiPropertyOptional({
    description: 'Physical address of the complex',
    example: 'King Fahd Road, Riyadh, Saudi Arabia',
    type: String,
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description:
      'Google Maps location URL or coordinates (for geographic data)',
    example: 'https://maps.google.com/?q=24.7136,46.6753',
    type: String,
  })
  @IsString()
  @IsOptional()
  googleLocation?: string;

  @ApiPropertyOptional({
    description: 'Primary phone number',
    example: '+966501234567',
    type: String,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Primary email address',
    example: 'updated@centralmedical.com',
    type: String,
    format: 'email',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Complex logo URL',
    example: 'https://example.com/logo.png',
    type: String,
    format: 'url',
  })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Complex website URL',
    example: 'https://centralmedical.com',
    type: String,
    format: 'url',
  })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({
    description: 'Manager name',
    example: 'Dr. Ahmed Al-Saud',
    type: String,
  })
  @IsString()
  @IsOptional()
  managerName?: string;

  @ApiPropertyOptional({
    description: 'Year the complex was established',
    example: 2020,
    type: Number,
    minimum: 1900,
    maximum: 2100,
  })
  @IsNumber()
  @IsOptional()
  yearEstablished?: number;

  @ApiPropertyOptional({
    description: 'Complex mission statement',
    example: 'Provide quality healthcare services to the community',
    type: String,
  })
  @IsString()
  @IsOptional()
  mission?: string;

  @ApiPropertyOptional({
    description: 'Complex vision statement',
    example: 'To be the leading healthcare provider in the region',
    type: String,
  })
  @IsString()
  @IsOptional()
  vision?: string;

  @ApiPropertyOptional({
    description: 'CEO name',
    example: 'Dr. Mohammed Al-Rashid',
    type: String,
  })
  @IsString()
  @IsOptional()
  ceoName?: string;

  @ApiPropertyOptional({
    description: 'VAT registration number',
    example: '300123456789003',
    type: String,
  })
  @IsString()
  @IsOptional()
  vatNumber?: string;

  @ApiPropertyOptional({
    description: 'Commercial registration number',
    example: '1010123456',
    type: String,
  })
  @IsString()
  @IsOptional()
  crNumber?: string;

  @ApiPropertyOptional({
    description:
      'Array of department IDs to associate with the complex. Note: Cannot remove departments linked to active clinics (COMPLEX_007)',
    example: ['507f1f77bcf86cd799439015', '507f1f77bcf86cd799439016'],
    type: [String],
    isArray: true,
  })
  @IsOptional()
  departmentIds?: string[];
}

/**
 * DTO for setting up business profile for complex-only plans
 * Subtask 1.3.11: Update all complex DTOs with @ApiProperty decorators
 */
export class SetupBusinessProfileDto {
  @ApiPropertyOptional({
    description: 'Year the complex was established',
    example: 2020,
    type: Number,
    minimum: 1900,
    maximum: 2100,
  })
  @IsNumber()
  @IsOptional()
  yearEstablished?: number;

  @ApiPropertyOptional({
    description: 'Complex mission statement',
    example: 'Provide quality healthcare services to the community',
    type: String,
  })
  @IsString()
  @IsOptional()
  mission?: string;

  @ApiPropertyOptional({
    description: 'Complex vision statement',
    example: 'To be the leading healthcare provider in the region',
    type: String,
  })
  @IsString()
  @IsOptional()
  vision?: string;

  @ApiPropertyOptional({
    description: 'CEO name',
    example: 'Dr. Mohammed Al-Rashid',
    type: String,
  })
  @IsString()
  @IsOptional()
  ceoName?: string;

  @ApiPropertyOptional({
    description: 'VAT registration number',
    example: '300123456789003',
    type: String,
  })
  @IsString()
  @IsOptional()
  vatNumber?: string;

  @ApiPropertyOptional({
    description: 'Commercial registration number',
    example: '1010123456',
    type: String,
  })
  @IsString()
  @IsOptional()
  crNumber?: string;
}
