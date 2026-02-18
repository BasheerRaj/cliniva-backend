import { IsOptional, IsEnum, IsBoolean, IsMongoId } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../common/enums/user-role.enum';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Transform } from 'class-transformer';

export class GetUsersFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by user role',
    enum: UserRole,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Filter by active status',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by organization ID',
  })
  @IsOptional()
  @IsMongoId()
  organizationId?: string;

  @ApiPropertyOptional({
    description: 'Filter by complex ID',
  })
  @IsOptional()
  @IsMongoId()
  complexId?: string;

  @ApiPropertyOptional({
    description: 'Filter by clinic ID',
  })
  @IsOptional()
  @IsMongoId()
  clinicId?: string;
}
