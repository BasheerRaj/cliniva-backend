import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ServiceService } from './service.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';

@ApiTags('Service Categories')
@Controller('service-categories')
export class ServiceCategoryController {
  constructor(private readonly serviceService: ServiceService) {}

  @ApiOperation({
    summary: 'Create service category',
    description:
      'Adds a new service category to the category list. Requires authentication.',
  })
  @ApiResponse({
    status: 201,
    description: 'Service category created successfully',
    schema: {
      example: {
        success: true,
        data: {
          name: 'Consultation',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Category already exists or invalid payload',
  })
  @ApiBearerAuth()
  @ApiBody({ type: CreateServiceCategoryDto })
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createServiceCategory(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: CreateServiceCategoryDto,
  ): Promise<{
    success: boolean;
    data: { name: string };
  }> {
    const data = await this.serviceService.createServiceCategory(dto.name);
    return {
      success: true,
      data,
    };
  }

  @ApiOperation({
    summary: 'Update service category by ID',
    description:
      'Updates the category name using the service category document ID. Requires authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service category updated successfully',
    schema: {
      example: {
        success: true,
        data: {
          _id: '507f1f77bcf86cd799439099',
          name: 'Primary Consultation',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid ID or duplicate category name',
  })
  @ApiResponse({
    status: 404,
    description: 'Service category not found',
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'Service category MongoDB ObjectId',
    example: '507f1f77bcf86cd799439099',
    type: String,
  })
  @ApiBody({ type: CreateServiceCategoryDto })
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateServiceCategoryById(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: CreateServiceCategoryDto,
  ): Promise<{
    success: boolean;
    data: { _id: string; name: string };
  }> {
    const data = await this.serviceService.updateServiceCategoryById(id, dto.name);
    return {
      success: true,
      data,
    };
  }

  @ApiOperation({
    summary: 'Get service category list',
    description:
      'Returns distinct service categories from all non-deleted services. Public endpoint (no authentication required).',
  })
  @ApiResponse({
    status: 200,
    description: 'Service category list fetched successfully',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: '507f1f77bcf86cd799439099',
            name: 'Consultation',
          },
          {
            id: '507f1f77bcf86cd799439100',
            name: 'Diagnostic',
          },
        ],
        count: 3,
      },
    },
  })
  @Get()
  async getServiceCategories(): Promise<{
    success: boolean;
    data: Array<{ id: string; name: string }>;
    count: number;
  }> {
    const data = await this.serviceService.getServiceCategoryList();
    return {
      success: true,
      data,
      count: data.length,
    };
  }
}
