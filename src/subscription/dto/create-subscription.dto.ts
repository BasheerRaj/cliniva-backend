import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class CreateSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  planId: string;

  @IsString()
  @IsEnum(['company', 'complex', 'clinic'])
  planType: string;

  @IsString()
  @IsEnum(['active', 'inactive', 'cancelled'])
  @IsOptional()
  status?: string = 'active';

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class UpdateSubscriptionStatusDto {
  @IsString()
  @IsEnum(['active', 'inactive', 'cancelled'])
  status: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
