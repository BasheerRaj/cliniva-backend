import { IsNotEmpty, IsString } from 'class-validator';

export class CheckUserEntitiesDto {
  @IsNotEmpty()
  @IsString()
  userId: string;
}

export class UserEntitiesResponseDto {
  hasOrganization: boolean;
  hasComplex: boolean;
  hasClinic: boolean;
  planType: string;
  hasPrimaryEntity: boolean;
  needsSetup: boolean;
  nextStep: string;
}
