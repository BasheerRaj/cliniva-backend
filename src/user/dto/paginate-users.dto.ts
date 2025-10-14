import { IsInt, IsOptional, Min, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '../../common/enums/user-role.enum';

export class PaginateUsersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string; // البحث بالاسم

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole; // فلترة حسب الدور

  @IsOptional()
  @IsString()
  status?: 'active' | 'inactive'; // فلترة حسب الحالة
}
