import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsEmail, IsUrl, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { LegalDocumentDto } from 'src/onboarding/dto/shared-base.dto';

export class CreateComplexDto {
  @IsString()
  @IsOptional()
  organizationId?: string; // NULL for complex-only plans

  @IsString()
  @IsNotEmpty()
  subscriptionId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  googleLocation?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  managerName?: string;

  @IsNumber()
  @IsOptional()
  yearEstablished?: number;

  @IsString()
  @IsOptional()
  vision?: string;

  @IsString()
  @IsOptional()
  ceoName?: string;

  @IsString()
  @IsOptional()
  vatNumber?: string;

  @IsString()
  @IsOptional()
  crNumber?: string;
}

export class UpdateComplexDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  googleLocation?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsUrl()
  @IsOptional()
  logoUrl?: string;


  @IsString()
  @IsOptional()
  managerName?: string;

  @IsNumber()
  @IsOptional()
  yearEstablished?: number;


  @IsString()
  @IsOptional()
  vision?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  ceoName?: string;

  @IsString()
  @IsOptional()
  vatNumber?: string;

  @IsString()
  @IsOptional()
  crNumber?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LegalDocumentDto)
  @IsOptional()
  termsAndConditions?: LegalDocumentDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LegalDocumentDto)
  @IsOptional()
  privacyPolicies?: LegalDocumentDto[];
}


export class SetupBusinessProfileDto {
  @IsNumber()
  @IsOptional()
  yearEstablished?: number;

  @IsString()
  @IsOptional()
  mission?: string;

  @IsString()
  @IsOptional()
  vision?: string;

  @IsString()
  @IsOptional()
  ceoName?: string;

  @IsString()
  @IsOptional()
  vatNumber?: string;

  @IsString()
  @IsOptional()
  crNumber?: string;
}
