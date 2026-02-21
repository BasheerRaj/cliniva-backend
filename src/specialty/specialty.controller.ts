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
  UpdateSpecialtyDto,
  ToggleSpecialtyStatusDto,
  SpecialtySearchDto,
} from './dto';
import { ResponseBuilder } from '../common/utils/response-builder.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Specialties')
@ApiBearerAuth()
@Controller('specialties')
@UseGuards(JwtAuthGuard)
export class SpecialtyController {
  constructor(private readonly specialtyService: SpecialtyService) {}

  /**
   * Create a new specialty
   */
  @Post()
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
  ) {
    const specialty = await this.specialtyService.createSpecialty(createSpecialtyDto);
    return ResponseBuilder.success(specialty, {
      ar: 'تم إنشاء التخصص بنجاح',
      en: 'Specialty created successfully',
    });
  }

  /**
   * Get all specialties with pagination and filters
   */
  @Get()
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
  ) {
    const result = await this.specialtyService.getAllSpecialties(query);
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
   * Get specialty statistics
   */
  @Get(':id/stats')
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
  ) {
    const specialty = await this.specialtyService.updateSpecialty(id, updateSpecialtyDto);
    return ResponseBuilder.success(specialty, {
      ar: 'تم تحديث التخصص بنجاح',
      en: 'Specialty updated successfully',
    });
  }

  /**
   * Delete specialty
   */
  @Delete(':id')
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
