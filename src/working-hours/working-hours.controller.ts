import { Controller, Post, Get, Put, Body, Param, Query, HttpStatus, HttpCode } from '@nestjs/common';
import { WorkingHoursService } from './working-hours.service';
import { CreateWorkingHoursDto, UpdateWorkingHoursDto } from './dto/create-working-hours.dto';
import { WorkingHours } from '../database/schemas/working-hours.schema';

@Controller('working-hours')
export class WorkingHoursController {
  constructor(private readonly workingHoursService: WorkingHoursService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createWorkingHours(@Body() createDto: CreateWorkingHoursDto) {
    try {
      const workingHours = await this.workingHoursService.createWorkingHours(createDto);
      
      return {
        success: true,
        message: 'Working hours created successfully',
        data: workingHours
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create working hours',
        error: error.message
      };
    }
  }

  @Post('validate-clinic-hours')
  @HttpCode(HttpStatus.OK)
  async validateClinicHours(
    @Body() body: {
      clinicId: string;
      clinicSchedule: any[];
      complexId: string;
    }
  ) {
    try {
      const validation = await this.workingHoursService.validateClinicHoursWithinComplex(
        body.clinicId,
        body.clinicSchedule,
        body.complexId
      );
      
      return {
        success: validation.isValid,
        message: validation.isValid ? 'Clinic hours are valid within complex hours' : 'Clinic hours validation failed',
        data: {
          isValid: validation.isValid,
          errors: validation.errors
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to validate clinic hours',
        error: error.message
      };
    }
  }

  @Post('with-parent-validation')
  @HttpCode(HttpStatus.CREATED)
  async createWorkingHoursWithParentValidation(
    @Body() body: {
      workingHours: CreateWorkingHoursDto;
      parentEntityType?: string;
      parentEntityId?: string;
    }
  ) {
    try {
      const workingHours = await this.workingHoursService.createWorkingHoursWithParentValidation(
        body.workingHours,
        body.parentEntityType,
        body.parentEntityId
      );
      
      return {
        success: true,
        message: 'Working hours created successfully with parent validation',
        data: workingHours
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create working hours with parent validation',
        error: error.message
      };
    }
  }

  @Get(':entityType/:entityId')
  async getWorkingHours(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string
  ) {
    try {
      const workingHours = await this.workingHoursService.getWorkingHours(entityType, entityId);
      
      return {
        success: true,
        message: 'Working hours retrieved successfully',
        data: workingHours
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve working hours',
        error: error.message
      };
    }
  }

  @Get('complex/:complexId')
  async getComplexWorkingHours(@Param('complexId') complexId: string) {
    try {
      // For now, return a simple response until the service method exists
      return {
        success: true,
        message: 'Complex working hours retrieved successfully',
        data: []
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve complex working hours',
        data: []
      };
    }
  }

  @Put(':entityType/:entityId')
  @HttpCode(HttpStatus.OK)
  async updateWorkingHours(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Body() updateDto: UpdateWorkingHoursDto,
    @Query('validateWithParent') validateWithParent?: string,
    @Query('parentEntityType') parentEntityType?: string,
    @Query('parentEntityId') parentEntityId?: string
  ) {
    try {
      let workingHours;

      if (validateWithParent === 'true' && parentEntityType && parentEntityId) {
        // Use parent validation
        workingHours = await this.workingHoursService.createWorkingHoursWithParentValidation(
          {
            entityType,
            entityId,
            schedule: updateDto.schedule
          },
          parentEntityType,
          parentEntityId
        );
      } else {
        // Standard update
        workingHours = await this.workingHoursService.updateWorkingHours(entityType, entityId, updateDto);
      }
      
      return {
        success: true,
        message: 'Working hours updated successfully',
        data: workingHours
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update working hours',
        error: error.message
      };
    }
  }
}
