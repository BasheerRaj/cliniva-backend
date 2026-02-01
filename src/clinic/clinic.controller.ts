import { Controller, Post, Get, Body, Param, Query, Put, Delete, UseGuards, HttpCode, HttpStatus, HttpException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ClinicService } from './clinic.service';
import { CreateClinicDto, UpdateClinicDto } from './dto/create-clinic.dto';
import { ClinicFilterDto } from './dto/clinic-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Clinics')
@Controller('clinics')
export class ClinicController {
  private readonly logger = new Logger(ClinicController.name);

  constructor(private readonly clinicService: ClinicService) {}

  @Post()
  async createClinic(@Body() createClinicDto: CreateClinicDto) {
    try {
      const clinic = await this.clinicService.createClinic(createClinicDto);
      return { 
        success: true, 
        message: 'Clinic created successfully',
        data: clinic 
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create clinic',
        error: error.message
      };
    }
  }

  @Get(':id')
  async getClinic(@Param('id') id: string) {
    try {
      const clinic = await this.clinicService.getClinic(id);
      return { 
        success: true, 
        message: 'Clinic retrieved successfully',
        data: clinic 
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve clinic',
        error: error.message
      };
    }
  }

  @Put(':id')
  async updateClinic(@Param('id') id: string, @Body() updateClinicDto: UpdateClinicDto) {
    try {
      const clinic = await this.clinicService.updateClinic(id, updateClinicDto);
      return { 
        success: true, 
        message: 'Clinic updated successfully',
        data: clinic 
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update clinic',
        error: error.message
      };
    }
  }

  @Get('subscription/:subscriptionId')
  async getClinicBySubscription(@Param('subscriptionId') subscriptionId: string) {
    try {
      const clinic = await this.clinicService.getClinicBySubscription(subscriptionId);
      return { 
        success: true, 
        message: clinic ? 'Clinic found' : 'No clinic found for this subscription',
        data: clinic 
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve clinic by subscription',
        error: error.message
      };
    }
  }

  /**
   * Get clinics by complex
   * BZR-g3e5c9a0: Complex-based clinic filtering endpoint
   * 
   * Task 7.4: Add getClinicsByComplex endpoint to ClinicController
   * Requirements: 3.4
   * Design: Section 3.6.2
   * 
   * This endpoint returns all clinics belonging to a specific complex,
   * with optional filtering by active status and sorting.
   * 
   * @param complexId - Complex ID from route params
   * @param filters - Optional filters (isActive, sortBy, sortOrder)
   * @returns List of clinics for the complex
   */
  @Get('by-complex/:complexId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get clinics by complex',
    description: 'Get all clinics belonging to a specific complex with optional filters'
  })
  @ApiResponse({ status: 200, description: 'Clinics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Complex not found' })
  @HttpCode(HttpStatus.OK)
  async getClinicsByComplex(
    @Param('complexId') complexId: string,
    @Query() filters: ClinicFilterDto
  ) {
    try {
      return await this.clinicService.getClinicsByComplex(complexId, filters);
    } catch (error) {
      // Re-throw if already an HTTP exception
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Get clinics by complex failed: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        {
          message: {
            ar: 'فشل جلب العيادات حسب المجمع',
            en: 'Failed to retrieve clinics by complex',
          },
          code: 'CLINICS_BY_COMPLEX_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Get clinics for dropdown
   * 
   * Task 7.5: Add getClinicsForDropdown endpoint to ClinicController
   * Requirements: 3.4
   * Design: Section 3.6.2
   * 
   * This endpoint returns only active clinics for dropdown selection,
   * with optional filtering by complex.
   * 
   * @param complexId - Optional complex ID filter
   * @returns List of active clinics
   */
  @Get('dropdown')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get clinics for dropdown',
    description: 'Get active clinics for dropdown selection with optional complex filter'
  })
  @ApiResponse({ status: 200, description: 'Clinics retrieved successfully' })
  @HttpCode(HttpStatus.OK)
  async getClinicsForDropdown(
    @Query('complexId') complexId?: string
  ) {
    try {
      return await this.clinicService.getClinicsForDropdown(complexId ? { complexId } : undefined);
    } catch (error) {
      // Re-throw if already an HTTP exception
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Get clinics for dropdown failed: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        {
          message: {
            ar: 'فشل جلب قائمة العيادات',
            en: 'Failed to retrieve clinics list',
          },
          code: 'CLINICS_DROPDOWN_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Legacy endpoint - kept for backward compatibility
  @Get('complex/:complexId')
  async getClinicsByComplexLegacy(@Param('complexId') complexId: string) {
    try {
      const clinics = await this.clinicService.getClinicsByComplex(complexId);
      return { 
        success: true, 
        message: 'Clinics retrieved successfully',
        data: clinics 
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve clinics by complex',
        error: error.message
      };
    }
  }
} 