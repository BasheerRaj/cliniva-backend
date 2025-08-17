import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class AssignDepartmentsDto {
  @IsArray()
  @IsString({ each: true })
  departmentIds: string[];
}
