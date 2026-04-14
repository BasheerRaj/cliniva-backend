import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Patch,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  Query,
  Request,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SpecialtyService } from './specialty.service';
import {
  CreateSpecialtyDto,
  SpecialtyDropdownQueryDto,
  UpdateSpecialtyDto,
  ToggleSpecialtyStatusDto,
  SpecialtySearchDto,
} from './dto';
import { ResponseBuilder } from '../common/utils/response-builder.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('Specialties')
@ApiBearerAuth()
@Controller('specialties')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SpecialtyController {
  constructor(private readonly specialtyService: SpecialtyService) {}

  /**
   * Create a new specialty
   */
  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create specialty', description: 'Create a new medical specialty' })
  @ApiResponse({
    status: 201,
    description: 'Specialty created successfully',
    schema: {
      example: {
        success: true,
        data: {
          _id: '507f1f77bcf86cd799439035',
          name: 'Pediatrics',
          description: 'Medical care for infants, children, and adolescents',
          complexId: '507f1f77bcf86cd799439014',
          isActive: true,
          createdAt: '2026-02-08T11:00:00.000Z',
          updatedAt: '2026-02-08T11:00:00.000Z',
        },
        message: { ar: 'تم إنشاء التخصص بنجاح', en: 'Specialty created successfully' },
      },
    },
  })
  @ApiResponse({ status: 409, description: 'Specialty with this name already exists' })
  async createSpecialty(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    createSpecialtyDto: CreateSpecialtyDto,
    @Req() req: any,
  ) {
    const specialty = await this.specialtyService.createSpecialty(createSpecialtyDto, req.user);
    return ResponseBuilder.success(specialty, {
      ar: 'تم إنشاء التخصص بنجاح',
      en: 'Specialty created successfully',
    });
  }

  /**
   * Get all specialties with pagination and filters
   */
  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  @ApiOperation({
    summary: 'List specialties',
    description: 'Get paginated list of specialties with optional search and filters',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search in name and description' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status' })
  @ApiQuery({ name: 'complexId', required: false, description: 'Filter by complex' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: '1' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: '10' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field', enum: ['name', 'updatedAt', 'assignedDoctorsCount'] })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order', enum: ['asc', 'desc'] })
  @ApiResponse({
    status: 200,
    description: 'Specialties list retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          specialties: [
            {
              _id: '507f1f77bcf86cd799439028',
              name: 'Cardiology',
              description: 'Heart and cardiovascular system',
              isActive: true,
              complexId: '507f1f77bcf86cd799439014',
              assignedDoctorsCount: 5,
              activeDoctorsCount: 5,
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2026-02-08T10:00:00.000Z',
            },
          ],
          total: 15,
          page: 1,
          totalPages: 2,
        },
        message: { ar: 'تم جلب قائمة التخصصات بنجاح', en: 'Specialties list retrieved successfully' },
      },
    },
  })
  async getAllSpecialties(
    @Query(new ValidationPipe({ transform: true })) query: SpecialtySearchDto,
    @Req() req: any,
  ) {
    const result = await this.specialtyService.getAllSpecialties(query, req.user);
    return ResponseBuilder.success(
      {
        specialties: result.specialties,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      },
      {
        ar: 'تم جلب قائمة التخصصات بنجاح',
        en: 'Specialties list retrieved successfully',
      },
    );
  }

  /**
   * Get specialties for dropdown
   */
  @Get('dropdown')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get specialties for dropdown',
    description:
      'Get specialties for dropdown selection with optional complex and search filters. Returns active specialties by default.',
  })
  @ApiQuery({
    name: 'complexId',
    required: false,
    description: 'Filter by complex ID',
    example: '507f1f77bcf86cd799439014',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by specialty name',
    example: 'cardio',
  })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    description: 'Include inactive specialties in dropdown result',
    example: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Specialties retrieved successfully',
    schema: {
      example: {
        success: true,
        data: [
          {
            _id: '507f1f77bcf86cd799439028',
            name: 'Cardiology',
            isActive: true,
            complexId: '507f1f77bcf86cd799439014',
          },
        ],
        message: {
          ar: 'تم جلب قائمة التخصصات بنجاح',
          en: 'Specialties retrieved successfully',
        },
      },
    },
  })
  async getSpecialtiesForDropdown(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: SpecialtyDropdownQueryDto,
    @Req() req: any,
  ) {
    const specialties = await this.specialtyService.getSpecialtiesForDropdown(query, req.user);
    return ResponseBuilder.success(specialties, {
      ar: 'تم جلب قائمة التخصصات بنجاح',
      en: 'Specialties retrieved successfully',
    });
  }

  /**
   * Get specialty statistics
   */
  @Get(':id/stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  @ApiOperation({
    summary: 'Get specialty statistics',
    description: 'Get statistics for a specialty including doctor and appointment counts',
  })
  @ApiParam({ name: 'id', description: 'Specialty ID' })
  @ApiResponse({
    status: 200,
    description: 'Specialty statistics retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Specialty not found' })
  async getSpecialtyStats(@Param('id') id: string) {
    const result = await this.specialtyService.getSpecialtyStats(id);
    return ResponseBuilder.success(result, {
      ar: 'تم جلب إحصائيات التخصص بنجاح',
      en: 'Specialty statistics retrieved successfully',
    });
  }

  /**
   * Toggle specialty status (activate/deactivate)
   */
  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  @ApiOperation({
    summary: 'Toggle specialty status',
    description: 'Activate or deactivate a specialty. Cannot deactivate if doctors are assigned.',
  })
  @ApiParam({ name: 'id', description: 'Specialty ID' })
  @ApiBody({ type: ToggleSpecialtyStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Specialty status updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Cannot deactivate - has active doctors' })
  @ApiResponse({ status: 404, description: 'Specialty not found' })
  async toggleStatus(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: ToggleSpecialtyStatusDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id || req.user?._id?.toString() || req.user?.sub;
    return this.specialtyService.toggleStatus(id, dto, userId || '');
  }

  /**
   * Get specialty by ID with details
   */
  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  @ApiOperation({
    summary: 'Get specialty details',
    description: 'Get specialty with assigned doctors and statistics',
  })
  @ApiParam({ name: 'id', description: 'Specialty ID' })
  @ApiResponse({
    status: 200,
    description: 'Specialty details retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          _id: '507f1f77bcf86cd799439028',
          name: 'Cardiology',
          description: 'Heart and cardiovascular system',
          isActive: true,
          assignedDoctors: [],
          statistics: { totalDoctors: 5, totalAppointments: 45, averageExperience: 12.4 },
        },
        message: { ar: 'تم جلب تفاصيل التخصص بنجاح', en: 'Specialty details retrieved successfully' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Specialty not found' })
  async getSpecialty(@Param('id') id: string) {
    const specialty = await this.specialtyService.getSpecialtyDetails(id);
    return ResponseBuilder.success(specialty, {
      ar: 'تم جلب تفاصيل التخصص بنجاح',
      en: 'Specialty details retrieved successfully',
    });
  }

  /**
   * Update specialty
   */
  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  @ApiOperation({ summary: 'Update specialty', description: 'Update an existing specialty' })
  @ApiParam({ name: 'id', description: 'Specialty ID' })
  @ApiResponse({
    status: 200,
    description: 'Specialty updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Specialty not found' })
  async updateSpecialty(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    updateSpecialtyDto: UpdateSpecialtyDto,
    @Req() req: any,
  ) {
    const specialty = await this.specialtyService.updateSpecialty(
      id,
      updateSpecialtyDto,
      req.user,
    );
    return ResponseBuilder.success(specialty, {
      ar: 'تم تحديث التخصص بنجاح',
      en: 'Specialty updated successfully',
    });
  }

  /**
   * Delete specialty
   */
  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete specialty',
    description: 'Delete a specialty. Must be deactivated first and have no assigned doctors.',
  })
  @ApiParam({ name: 'id', description: 'Specialty ID' })
  @ApiResponse({ status: 204, description: 'Specialty deleted successfully' })
  @ApiResponse({ status: 400, description: 'Must deactivate first or has assigned doctors' })
  @ApiResponse({ status: 404, description: 'Specialty not found' })
  async deleteSpecialty(@Param('id') id: string): Promise<void> {
    return this.specialtyService.deleteSpecialty(id);
  }
}
