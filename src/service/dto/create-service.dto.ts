import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray } from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  complexDepartmentId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  durationMinutes?: number = 30;

  @IsNumber()
  @IsOptional()
  price?: number;
}

export class AssignServicesDto {
  @IsArray()
  serviceAssignments: ServiceAssignmentDto[];
}

export class ServiceAssignmentDto {
  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @IsNumber()
  @IsOptional()
  priceOverride?: number;

  @IsOptional()
  isActive?: boolean = true;
}
