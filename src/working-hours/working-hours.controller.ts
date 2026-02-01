import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { WorkingHoursService } from './working-hours.service';
import { WorkingHoursValidationService } from './services/working-hours-validation.service';
import {
  CreateWorkingHoursDto,
  UpdateWorkingHoursDto,
} from './dto/create-working-hours.dto';
import {
  ValidateWorkingHoursDto,
  ValidateWorkingHoursResponse,
} from './dto/validate-working-hours.dto';
import { WorkingHours } from '../database/schemas/working-hours.schema';

@ApiTags('Working Hours')
@Controller('working-hours')
export class WorkingHoursController {
  constructor(
    private readonly workingHoursService: WorkingHoursService,
    private readonly validationService: WorkingHoursValidationService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createWorkingHours(@Body() createDto: CreateWorkingHoursDto) {
    try {
      const workingHours =
        await this.workingHoursService.createWorkingHours(createDto);

      return {
        success: true,
        message: 'Working hours created successfully',
        data: workingHours,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create working hours',
        error: error.message,
      };
    }
  }

  @Post('validate-clinic-hours')
  @HttpCode(HttpStatus.OK)
  async validateClinicHours(
    @Body()
    body: {
      clinicId: string;
      clinicSchedule: any[];
      complexId: string;
    },
  ) {
    try {
      const validation =
        await this.workingHoursService.validateClinicHoursWithinComplex(
          body.clinicId,
          body.clinicSchedule,
          body.complexId,
        );

      return {
        success: validation.isValid,
        message: validation.isValid
          ? 'Clinic hours are valid within complex hours'
          : 'Clinic hours validation failed',
        data: {
          isValid: validation.isValid,
          errors: validation.errors,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to validate clinic hours',
        error: error.message,
      };
    }
  }

  /**
   * Validate working hours against parent entity hours
   *
   * This endpoint validates child entity working hours against parent entity
   * constraints according to business rules:
   * - BZR-f1c0a9e4: Hierarchical validation (complex→clinic, clinic→user)
   * - BZR-u5a0f7d3: Child hours must be within parent hours
   * - BZR-42: Child cannot be open when parent is closed
   *
   * @param {ValidateWorkingHoursDto} validateDto - Validation request data
   * @returns {Promise<ValidateWorkingHoursResponse>} Validation result with errors and suggestions
   *
   * @example
   * POST /working-hours/validate
   * {
   *   "entityType": "user",
   *   "entityId": "507f1f77bcf86cd799439011",
   *   "parentEntityType": "clinic",
   *   "parentEntityId": "507f1f77bcf86cd799439012",
   *   "schedule": [
   *     {
   *       "dayOfWeek": "monday",
   *       "isWorkingDay": true,
   *       "openingTime": "09:00",
   *       "closingTime": "17:00"
   *     }
   *   ]
   * }
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate working hours against parent entity',
    description:
      'Validates child entity working hours against parent entity constraints. ' +
      'Ensures child hours are within parent hours and child is not open when parent is closed. ' +
      'Returns validation errors with suggested time ranges.',
  })
  @ApiBody({
    type: ValidateWorkingHoursDto,
    description: 'Working hours validation request',
    examples: {
      'user-clinic': {
        summary: 'Validate user hours against clinic',
        value: {
          entityType: 'user',
          entityId: '507f1f77bcf86cd799439011',
          parentEntityType: 'clinic',
          parentEntityId: '507f1f77bcf86cd799439012',
          schedule: [
            {
              dayOfWeek: 'monday',
              isWorkingDay: true,
              openingTime: '09:00',
              closingTime: '17:00',
            },
            {
              dayOfWeek: 'tuesday',
              isWorkingDay: true,
              openingTime: '09:00',
              closingTime: '17:00',
            },
            {
              dayOfWeek: 'wednesday',
              isWorkingDay: false,
            },
          ],
        },
      },
      'clinic-complex': {
        summary: 'Validate clinic hours against complex',
        value: {
          entityType: 'clinic',
          entityId: '507f1f77bcf86cd799439013',
          parentEntityType: 'complex',
          parentEntityId: '507f1f77bcf86cd799439014',
          schedule: [
            {
              dayOfWeek: 'monday',
              isWorkingDay: true,
              openingTime: '08:00',
              closingTime: '16:00',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Validation completed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            isValid: { type: 'boolean', example: false },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  dayOfWeek: { type: 'string', example: 'monday' },
                  message: {
                    type: 'object',
                    properties: {
                      ar: { type: 'string', example: 'رسالة الخطأ بالعربية' },
                      en: { type: 'string', example: 'Error message in English' },
                    },
                  },
                  suggestedRange: {
                    type: 'object',
                    properties: {
                      openingTime: { type: 'string', example: '08:00' },
                      closingTime: { type: 'string', example: '17:00' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  async validateWorkingHours(
    @Body() validateDto: ValidateWorkingHoursDto,
  ): Promise<ValidateWorkingHoursResponse> {
    try {
      // Perform hierarchical validation using the validation service
      const validationResult = await this.validationService.validateHierarchical(
        validateDto.schedule,
        validateDto.parentEntityType,
        validateDto.parentEntityId,
        `${validateDto.entityType} ${validateDto.entityId}`,
      );

      return {
        success: true,
        data: {
          isValid: validationResult.isValid,
          errors: validationResult.errors,
        },
      };
    } catch (error) {
      // Return error in standard format
      return {
        success: false,
        data: {
          isValid: false,
          errors: [
            {
              dayOfWeek: 'general',
              message: {
                ar: 'فشل التحقق من صحة ساعات العمل',
                en: 'Failed to validate working hours',
              },
            },
          ],
        },
      };
    }
  }

  @Post('with-parent-validation')
  @HttpCode(HttpStatus.CREATED)
  async createWorkingHoursWithParentValidation(
    @Body()
    body: {
      workingHours: CreateWorkingHoursDto;
      parentEntityType?: string;
      parentEntityId?: string;
    },
  ) {
    try {
      const workingHours =
        await this.workingHoursService.createWorkingHoursWithParentValidation(
          body.workingHours,
          body.parentEntityType,
          body.parentEntityId,
        );

      return {
        success: true,
        message: 'Working hours created successfully with parent validation',
        data: workingHours,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create working hours with parent validation',
        error: error.message,
      };
    }
  }

  @Get(':entityType/:entityId')
  async getWorkingHours(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    try {
      const workingHours = await this.workingHoursService.getWorkingHours(
        entityType,
        entityId,
      );

      return {
        success: true,
        message: 'Working hours retrieved successfully',
        data: workingHours,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve working hours',
        error: error.message,
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
        data: [],
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve complex working hours',
        data: [],
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
    @Query('parentEntityId') parentEntityId?: string,
  ) {
    try {
      let workingHours;

      if (validateWithParent === 'true' && parentEntityType && parentEntityId) {
        // Use parent validation
        workingHours =
          await this.workingHoursService.createWorkingHoursWithParentValidation(
            {
              entityType,
              entityId,
              schedule: updateDto.schedule,
            },
            parentEntityType,
            parentEntityId,
          );
      } else {
        // Standard update
        workingHours = await this.workingHoursService.updateWorkingHours(
          entityType,
          entityId,
          updateDto,
        );
      }

      return {
        success: true,
        message: 'Working hours updated successfully',
        data: workingHours,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update working hours',
        error: error.message,
      };
    }
  }
}
