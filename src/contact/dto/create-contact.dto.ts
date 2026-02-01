import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ContactItemDto {
  @IsString()
  @IsNotEmpty()
  contactType: string; // 'facebook', 'instagram', 'twitter', 'linkedin', 'whatsapp', etc.

  @IsString()
  @IsNotEmpty()
  contactValue: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}

export class CreateContactsDto {
  @IsString()
  @IsEnum(['organization', 'complex', 'clinic', 'user'])
  entityType: string;

  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactItemDto)
  contacts: ContactItemDto[];
}

export class UpdateContactDto {
  @IsString()
  @IsOptional()
  contactType?: string;

  @IsString()
  @IsOptional()
  contactValue?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
