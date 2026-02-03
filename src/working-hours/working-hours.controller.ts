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
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { WorkingHoursService } from './working-hours.service';
import { WorkingHoursValidationService } from './services/working-hours-validation.service';
import { WorkingHoursSuggestionService } from './services/working-hours-suggestion.service';
import { AppointmentConflictService } from './services/appointment-conflict.service';
import { WorkingHoursReschedulingService } from './services/working-hours-rescheduling.service';
import {
  CreateWorkingHoursDto,
  UpdateWorkingHoursDto,
} from './dto/create-working-hours.dto';
import {
  ValidateWorkingHoursDto,
  ValidateWorkingHoursResponse,
} from './dto/validate-working-hours.dto';
import {
  SuggestWorkingHoursQueryDto,
  SuggestWorkingHoursResponse,
} from './dto/suggest-working-hours.dto';
import {
  CheckConflictsDto,
  CheckConflictsResponse,
} from './dto/check-conflicts.dto';
import {
  UpdateWithReschedulingDto,
  UpdateWithReschedulingResponse,
} from './dto/update-with-rescheduling.dto';
import { WorkingHours } from '../database/schemas/working-hours.schema';
import { BilingualMessage } from '../common/types/bilingual-message.type';

/**
 * Standard API response format
 */
interface StandardResponse<T = any> {
  success: boolean;
  data?: T;
  message?: BilingualMessage | string;
  error?: string;
}

@ApiTags('Working Hours')
@Controller('working-hours')
export class WorkingHoursController {
  constructor(
    private readonly workingHoursService: WorkingHoursService,
    private readonly validationService: WorkingHoursValidationService,
    private readonly suggestionService: WorkingHoursSuggestionService,
    private readonly conflictService: AppointmentConflictService,
    private readonly reschedulingService: WorkingHoursReschedulingService,
  ) {}

  /**
   * Creates a standardized success response
   * @private
   */
  private createSuccessResponse<T>(
    data: T,
    message?: BilingualMessage | string,
  ): StandardResponse<T> {
    return {
      success: true,
      data,
      ...(message && { message }),
    };
  }

  /**
   * Creates a standardized error response
   * @private
   */
  private createErrorResponse(
    message: BilingualMessage | string,
    error?: string,
  ): StandardResponse {
    return {
      success: false,
      message,
      ...(error && { error }),
    };
  }

  /**
   * Creates working hours for an entity.
   * Validates schedule format before creation.
   *
   * @param {CreateWorkingHoursDto} createDto - Working hours creation data
   * @returns {Promise<StandardResponse<WorkingHours[]>>} Created working hours
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createWorkingHours(
    @Body() createDto: CreateWorkingHoursDto,
  ): Promise<StandardResponse<WorkingHours[]>> {
    const workingHours =
      await this.workingHoursService.createWorkingHours(createDto);

    return this.createSuccessResponse(workingHours, {
      ar: 'تم إنشاء ساعات العمل بنجاح',
      en: 'Working hours created successfully',
    });
  }

  /**
   * Validates clinic hours against complex hours.
   *
   * @deprecated Use POST /working-hours/validate endpoint instead
   * @param {object} body - Validation request body
   * @returns {Promise<StandardResponse>} Validation result
   */
  @Post('validate-clinic-hours')
  @HttpCode(HttpStatus.OK)
  async validateClinicHours(
    @Body()
    body: {
      clinicId: string;
      clinicSchedule: any[];
      complexId: string;
    },
  ): Promise<StandardResponse> {
    const validation =
      await this.workingHoursService.validateClinicHoursWithinComplex(
        body.clinicId,
        body.clinicSchedule,
        body.complexId,
      );

    return this.createSuccessResponse(
      {
        isValid: validation.isValid,
        errors: validation.errors,
      },
      validation.isValid
        ? {
            ar: 'ساعات العيادة صالحة ضمن ساعات المجمع',
            en: 'Clinic hours are valid within complex hours',
          }
        : {
            ar: 'فشل التحقق من صحة ساعات العيادة',
            en: 'Clinic hours validation failed',
          },
    );
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
                      en: {
                        type: 'string',
                        example: 'Error message in English',
                      },
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
      const validationResult =
        await this.validationService.validateHierarchical(
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
      // Handle unexpected errors gracefully
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

  /**
   * Get suggested working hours based on role and entity assignment
   *
   * This endpoint provides auto-fill suggestions for working hours based on
   * the user's role and assigned entity according to business rules:
   * - BZR-h5e4c7a0: Doctors auto-fill from assigned clinic
   * - BZR-r2b4e5c7: Staff auto-fill from assigned complex
   * - Auto-filled hours are editable within constraints
   *
   * @param {string} entityType - Entity type (user)
   * @param {string} entityId - Entity ID
   * @param {SuggestWorkingHoursQueryDto} query - Query parameters (role, clinicId/complexId)
   * @returns {Promise<SuggestWorkingHoursResponse>} Suggested schedule with source information
   *
   * @example
   * GET /working-hours/suggest/user/507f1f77bcf86cd799439011?role=doctor&clinicId=507f1f77bcf86cd799439012
   *
   * @example
   * GET /working-hours/suggest/user/507f1f77bcf86cd799439011?role=staff&complexId=507f1f77bcf86cd799439013
   */
  @Get('suggest/:entityType/:entityId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get suggested working hours based on role',
    description:
      'Provides auto-fill suggestions for working hours based on user role and entity assignment. ' +
      'Doctors get suggestions from assigned clinic, staff get suggestions from assigned complex. ' +
      'Suggested hours can be modified within parent entity constraints.',
  })
  @ApiQuery({
    name: 'role',
    enum: ['doctor', 'staff'],
    description: 'User role to determine suggestion source',
    required: true,
    example: 'doctor',
  })
  @ApiQuery({
    name: 'clinicId',
    type: String,
    description: 'Clinic ID for doctor role (required for doctors)',
    required: false,
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'complexId',
    type: String,
    description: 'Complex ID for staff role (required for staff)',
    required: false,
    example: '507f1f77bcf86cd799439012',
  })
  @ApiResponse({
    status: 200,
    description: 'Suggestions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            suggestedSchedule: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  dayOfWeek: { type: 'string', example: 'monday' },
                  isWorkingDay: { type: 'boolean', example: true },
                  openingTime: { type: 'string', example: '08:00' },
                  closingTime: { type: 'string', example: '17:00' },
                  breakStartTime: { type: 'string', example: '12:00' },
                  breakEndTime: { type: 'string', example: '13:00' },
                },
              },
            },
            source: {
              type: 'object',
              properties: {
                entityType: { type: 'string', example: 'clinic' },
                entityId: {
                  type: 'string',
                  example: '507f1f77bcf86cd799439011',
                },
                entityName: { type: 'string', example: 'Main Clinic' },
              },
            },
            canModify: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: 404,
    description: 'Entity or working hours not found',
  })
  async getSuggestedWorkingHours(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query() query: SuggestWorkingHoursQueryDto,
  ): Promise<SuggestWorkingHoursResponse> {
    // Get suggested hours based on role
    const suggestionResult = await this.suggestionService.getSuggestedHours(
      query.role,
      query.clinicId,
      query.complexId,
    );

    return {
      success: true,
      data: suggestionResult,
    };
  }

  /**
   * Check for appointment conflicts when updating doctor working hours
   *
   * This endpoint identifies appointments that would fall outside new working hours
   * when a doctor's schedule is updated. It provides detailed conflict information
   * to support rescheduling decisions according to business rules:
   * - BZR-l9e0f1c4: Detect appointments outside new working hours
   * - BZR-43: Identify appointments requiring rescheduling
   *
   * @param {CheckConflictsDto} checkDto - Conflict check request data
   * @returns {Promise<CheckConflictsResponse>} Conflict detection result with details
   *
   * @example
   * POST /working-hours/check-conflicts
   * {
   *   "userId": "507f1f77bcf86cd799439011",
   *   "schedule": [
   *     {
   *       "dayOfWeek": "monday",
   *       "isWorkingDay": true,
   *       "openingTime": "09:00",
   *       "closingTime": "17:00"
   *     },
   *     {
   *       "dayOfWeek": "tuesday",
   *       "isWorkingDay": false
   *     }
   *   ]
   * }
   */
  @Post('check-conflicts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check for appointment conflicts',
    description:
      "Identifies appointments that would fall outside new working hours when updating a doctor's schedule. " +
      'Returns detailed conflict information including patient names, appointment times, and conflict reasons. ' +
      'Used to inform rescheduling decisions before applying working hours changes.',
  })
  @ApiBody({
    type: CheckConflictsDto,
    description: 'Conflict check request with user ID and new schedule',
    examples: {
      'doctor-schedule-change': {
        summary: 'Check conflicts for doctor schedule change',
        value: {
          userId: '507f1f77bcf86cd799439011',
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
            {
              dayOfWeek: 'thursday',
              isWorkingDay: true,
              openingTime: '10:00',
              closingTime: '18:00',
            },
            {
              dayOfWeek: 'friday',
              isWorkingDay: false,
            },
            {
              dayOfWeek: 'saturday',
              isWorkingDay: true,
              openingTime: '08:00',
              closingTime: '14:00',
            },
            {
              dayOfWeek: 'sunday',
              isWorkingDay: false,
            },
          ],
        },
      },
      'reduced-hours': {
        summary: 'Check conflicts when reducing working hours',
        value: {
          userId: '507f1f77bcf86cd799439012',
          schedule: [
            {
              dayOfWeek: 'monday',
              isWorkingDay: true,
              openingTime: '10:00',
              closingTime: '15:00',
            },
            {
              dayOfWeek: 'tuesday',
              isWorkingDay: true,
              openingTime: '10:00',
              closingTime: '15:00',
            },
            {
              dayOfWeek: 'wednesday',
              isWorkingDay: false,
            },
            {
              dayOfWeek: 'thursday',
              isWorkingDay: false,
            },
            {
              dayOfWeek: 'friday',
              isWorkingDay: false,
            },
            {
              dayOfWeek: 'saturday',
              isWorkingDay: false,
            },
            {
              dayOfWeek: 'sunday',
              isWorkingDay: false,
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Conflict check completed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            hasConflicts: {
              type: 'boolean',
              example: true,
              description: 'Whether any conflicts were detected',
            },
            conflicts: {
              type: 'array',
              description: 'Array of conflicting appointments with details',
              items: {
                type: 'object',
                properties: {
                  appointmentId: {
                    type: 'string',
                    example: '507f1f77bcf86cd799439013',
                    description:
                      'Unique identifier of the conflicting appointment',
                  },
                  patientName: {
                    type: 'string',
                    example: 'John Doe',
                    description: 'Full name of the patient',
                  },
                  appointmentDate: {
                    type: 'string',
                    example: '2026-02-15',
                    description: 'Date of the appointment (YYYY-MM-DD)',
                  },
                  appointmentTime: {
                    type: 'string',
                    example: '08:30',
                    description: 'Time of the appointment (HH:mm)',
                  },
                  conflictReason: {
                    type: 'object',
                    description: 'Bilingual explanation of the conflict',
                    properties: {
                      ar: {
                        type: 'string',
                        example: 'الموعد في 08:30 قبل وقت الفتح الجديد 09:00',
                      },
                      en: {
                        type: 'string',
                        example:
                          'Appointment at 08:30 is before new opening time 09:00',
                      },
                    },
                  },
                },
              },
            },
            affectedAppointments: {
              type: 'number',
              example: 3,
              description: 'Total number of appointments affected',
            },
            requiresRescheduling: {
              type: 'boolean',
              example: true,
              description: 'Whether rescheduling action is required',
            },
          },
        },
        message: {
          type: 'object',
          properties: {
            ar: {
              type: 'string',
              example: 'تم اكتشاف 3 مواعيد متعارضة',
            },
            en: {
              type: 'string',
              example: '3 conflicting appointments detected',
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
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async checkConflicts(
    @Body() checkDto: CheckConflictsDto,
  ): Promise<CheckConflictsResponse> {
    // Check for conflicts using the conflict service
    const conflictResult = await this.conflictService.checkConflicts(
      checkDto.userId,
      checkDto.schedule,
    );

    // Prepare response message
    let message;
    if (conflictResult.hasConflicts) {
      const count = conflictResult.affectedAppointments;
      message = {
        ar: `تم اكتشاف ${count} ${count === 1 ? 'موعد متعارض' : 'مواعيد متعارضة'}`,
        en: `${count} conflicting ${count === 1 ? 'appointment' : 'appointments'} detected`,
      };
    } else {
      message = {
        ar: 'لا توجد مواعيد متعارضة',
        en: 'No conflicting appointments found',
      };
    }

    return {
      success: true,
      data: {
        hasConflicts: conflictResult.hasConflicts,
        conflicts: conflictResult.conflicts,
        affectedAppointments: conflictResult.affectedAppointments,
        requiresRescheduling: conflictResult.requiresRescheduling,
      },
      message,
    };
  }

  /**
   * Update working hours with automatic appointment rescheduling
   *
   * This endpoint updates working hours and automatically handles conflicting
   * appointments according to the specified strategy. It uses transactions to
   * ensure data consistency and provides rollback capability on failure.
   *
   * Business Rules:
   * - BZR-l9e0f1c4: Reschedule appointments after modification date
   * - BZR-43: Only reschedule appointments on modified days
   * - Mark appointments as "needs_rescheduling" until staff confirms
   * - Send notifications to affected patients
   * - Log all rescheduling actions for audit
   *
   * @param {string} entityType - Entity type (user for doctors)
   * @param {string} entityId - Entity ID (user ID for doctors)
   * @param {UpdateWithReschedulingDto} updateDto - Update request with rescheduling options
   * @returns {Promise<UpdateWithReschedulingResponse>} Update result with rescheduling summary
   *
   * @example
   * PUT /working-hours/user/507f1f77bcf86cd799439011/with-rescheduling
   * {
   *   "schedule": [
   *     {
   *       "dayOfWeek": "monday",
   *       "isWorkingDay": true,
   *       "openingTime": "09:00",
   *       "closingTime": "17:00"
   *     },
   *     {
   *       "dayOfWeek": "tuesday",
   *       "isWorkingDay": false
   *     }
   *   ],
   *   "handleConflicts": "reschedule",
   *   "notifyPatients": true,
   *   "reschedulingReason": "Doctor schedule change"
   * }
   */
  @Put(':entityType/:entityId/with-rescheduling')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update working hours with appointment rescheduling',
    description:
      'Updates working hours and automatically handles conflicting appointments. ' +
      'Supports three strategies: reschedule (automatic), notify (mark for manual rescheduling), or cancel. ' +
      'Uses transactions to ensure data consistency with rollback on failure. ' +
      'Sends notifications to affected patients and logs all actions for audit.',
  })
  @ApiBody({
    type: UpdateWithReschedulingDto,
    description: 'Update request with schedule and rescheduling options',
    examples: {
      'reschedule-strategy': {
        summary: 'Update with automatic rescheduling',
        value: {
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
            {
              dayOfWeek: 'thursday',
              isWorkingDay: true,
              openingTime: '10:00',
              closingTime: '18:00',
            },
            {
              dayOfWeek: 'friday',
              isWorkingDay: false,
            },
            {
              dayOfWeek: 'saturday',
              isWorkingDay: true,
              openingTime: '08:00',
              closingTime: '14:00',
            },
            {
              dayOfWeek: 'sunday',
              isWorkingDay: false,
            },
          ],
          handleConflicts: 'reschedule',
          notifyPatients: true,
          reschedulingReason: 'Doctor schedule change',
        },
      },
      'notify-strategy': {
        summary: 'Update with manual rescheduling notification',
        value: {
          schedule: [
            {
              dayOfWeek: 'monday',
              isWorkingDay: true,
              openingTime: '10:00',
              closingTime: '16:00',
            },
            {
              dayOfWeek: 'tuesday',
              isWorkingDay: true,
              openingTime: '10:00',
              closingTime: '16:00',
            },
            {
              dayOfWeek: 'wednesday',
              isWorkingDay: false,
            },
            {
              dayOfWeek: 'thursday',
              isWorkingDay: false,
            },
            {
              dayOfWeek: 'friday',
              isWorkingDay: false,
            },
            {
              dayOfWeek: 'saturday',
              isWorkingDay: false,
            },
            {
              dayOfWeek: 'sunday',
              isWorkingDay: false,
            },
          ],
          handleConflicts: 'notify',
          notifyPatients: true,
          reschedulingReason: 'Reduced working hours',
        },
      },
      'cancel-strategy': {
        summary: 'Update with appointment cancellation',
        value: {
          schedule: [
            {
              dayOfWeek: 'monday',
              isWorkingDay: true,
              openingTime: '09:00',
              closingTime: '17:00',
            },
            {
              dayOfWeek: 'tuesday',
              isWorkingDay: false,
            },
            {
              dayOfWeek: 'wednesday',
              isWorkingDay: false,
            },
            {
              dayOfWeek: 'thursday',
              isWorkingDay: false,
            },
            {
              dayOfWeek: 'friday',
              isWorkingDay: false,
            },
            {
              dayOfWeek: 'saturday',
              isWorkingDay: false,
            },
            {
              dayOfWeek: 'sunday',
              isWorkingDay: false,
            },
          ],
          handleConflicts: 'cancel',
          notifyPatients: true,
          reschedulingReason: 'Doctor unavailable',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Working hours updated successfully with rescheduling',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            workingHours: {
              type: 'array',
              description: 'Updated working hours records',
              items: {
                type: 'object',
                properties: {
                  _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
                  entityType: { type: 'string', example: 'user' },
                  entityId: {
                    type: 'string',
                    example: '507f1f77bcf86cd799439012',
                  },
                  dayOfWeek: { type: 'string', example: 'monday' },
                  isWorkingDay: { type: 'boolean', example: true },
                  openingTime: { type: 'string', example: '09:00' },
                  closingTime: { type: 'string', example: '17:00' },
                },
              },
            },
            appointmentsRescheduled: {
              type: 'number',
              example: 3,
              description: 'Number of appointments automatically rescheduled',
            },
            appointmentsMarkedForRescheduling: {
              type: 'number',
              example: 2,
              description:
                'Number of appointments marked for manual rescheduling',
            },
            appointmentsCancelled: {
              type: 'number',
              example: 0,
              description: 'Number of appointments cancelled',
            },
            notificationsSent: {
              type: 'number',
              example: 5,
              description: 'Number of notifications sent to patients',
            },
            rescheduledAppointments: {
              type: 'array',
              description: 'Details of affected appointments',
              items: {
                type: 'object',
                properties: {
                  appointmentId: {
                    type: 'string',
                    example: '507f1f77bcf86cd799439013',
                  },
                  oldDate: { type: 'string', example: '2026-02-15' },
                  oldTime: { type: 'string', example: '08:30' },
                  newDate: { type: 'string', example: '2026-02-15' },
                  newTime: { type: 'string', example: '09:00' },
                  status: {
                    type: 'string',
                    enum: [
                      'rescheduled',
                      'marked_for_rescheduling',
                      'cancelled',
                    ],
                    example: 'rescheduled',
                  },
                },
              },
            },
          },
        },
        message: {
          type: 'object',
          properties: {
            ar: {
              type: 'string',
              example: 'تم تحديث ساعات العمل بنجاح. تم إعادة جدولة 3 مواعيد',
            },
            en: {
              type: 'string',
              example:
                'Working hours updated successfully. 3 appointments rescheduled',
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
  @ApiResponse({
    status: 404,
    description: 'Entity not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - transaction rolled back',
  })
  async updateWithRescheduling(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Body() updateDto: UpdateWithReschedulingDto,
  ): Promise<UpdateWithReschedulingResponse> {
    // Validate entity type
    if (entityType !== 'user') {
      throw new BadRequestException({
        message: {
          ar: 'نوع الكيان غير صالح. يدعم فقط "user"',
          en: 'Invalid entity type. Only "user" is supported',
        },
        code: 'INVALID_ENTITY_TYPE',
      });
    }

    // Perform update with rescheduling using the rescheduling service
    const result = await this.reschedulingService.updateWithRescheduling(
      entityType,
      entityId,
      updateDto.schedule,
      {
        handleConflicts: updateDto.handleConflicts,
        notifyPatients: updateDto.notifyPatients,
        reschedulingReason: updateDto.reschedulingReason,
      },
    );

    // Prepare success message based on results
    let message;
    const totalAffected =
      result.appointmentsRescheduled +
      result.appointmentsMarkedForRescheduling +
      result.appointmentsCancelled;

    if (totalAffected === 0) {
      message = {
        ar: 'تم تحديث ساعات العمل بنجاح. لا توجد مواعيد متأثرة',
        en: 'Working hours updated successfully. No appointments affected',
      };
    } else {
      const arParts: string[] = ['تم تحديث ساعات العمل بنجاح.'];
      const enParts: string[] = ['Working hours updated successfully.'];

      if (result.appointmentsRescheduled > 0) {
        arParts.push(
          `تم إعادة جدولة ${result.appointmentsRescheduled} ${result.appointmentsRescheduled === 1 ? 'موعد' : 'مواعيد'}`,
        );
        enParts.push(
          `${result.appointmentsRescheduled} ${result.appointmentsRescheduled === 1 ? 'appointment' : 'appointments'} rescheduled`,
        );
      }

      if (result.appointmentsMarkedForRescheduling > 0) {
        arParts.push(
          `${result.appointmentsMarkedForRescheduling} ${result.appointmentsMarkedForRescheduling === 1 ? 'موعد يحتاج' : 'مواعيد تحتاج'} إعادة جدولة يدوية`,
        );
        enParts.push(
          `${result.appointmentsMarkedForRescheduling} ${result.appointmentsMarkedForRescheduling === 1 ? 'appointment needs' : 'appointments need'} manual rescheduling`,
        );
      }

      if (result.appointmentsCancelled > 0) {
        arParts.push(
          `تم إلغاء ${result.appointmentsCancelled} ${result.appointmentsCancelled === 1 ? 'موعد' : 'مواعيد'}`,
        );
        enParts.push(
          `${result.appointmentsCancelled} ${result.appointmentsCancelled === 1 ? 'appointment' : 'appointments'} cancelled`,
        );
      }

      message = {
        ar: arParts.join('. '),
        en: enParts.join('. '),
      };
    }

    return {
      success: true,
      data: {
        workingHours: result.workingHours,
        appointmentsRescheduled: result.appointmentsRescheduled,
        appointmentsMarkedForRescheduling:
          result.appointmentsMarkedForRescheduling,
        appointmentsCancelled: result.appointmentsCancelled,
        notificationsSent: result.notificationsSent,
        rescheduledAppointments: result.rescheduledAppointments,
      },
      message,
    };
  }

  /**
   * Creates working hours with parent entity validation.
   *
   * @param {object} body - Request body with working hours and parent entity info
   * @returns {Promise<StandardResponse<WorkingHours[]>>} Created working hours
   */
  @Post('with-parent-validation')
  @HttpCode(HttpStatus.CREATED)
  async createWorkingHoursWithParentValidation(
    @Body()
    body: {
      workingHours: CreateWorkingHoursDto;
      parentEntityType?: string;
      parentEntityId?: string;
    },
  ): Promise<StandardResponse<WorkingHours[]>> {
    const workingHours =
      await this.workingHoursService.createWorkingHoursWithParentValidation(
        body.workingHours,
        body.parentEntityType,
        body.parentEntityId,
      );

    return this.createSuccessResponse(workingHours, {
      ar: 'تم إنشاء ساعات العمل بنجاح مع التحقق من الكيان الأصلي',
      en: 'Working hours created successfully with parent validation',
    });
  }

  /**
   * Retrieves working hours for an entity.
   *
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @returns {Promise<StandardResponse<WorkingHours[]>>} Working hours records
   */
  @Get(':entityType/:entityId')
  async getWorkingHours(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ): Promise<StandardResponse<WorkingHours[]>> {
    const workingHours = await this.workingHoursService.getWorkingHours(
      entityType,
      entityId,
    );

    return this.createSuccessResponse(workingHours, {
      ar: 'تم استرجاع ساعات العمل بنجاح',
      en: 'Working hours retrieved successfully',
    });
  }

  /**
   * Retrieves complex working hours.
   *
   * @param {string} complexId - Complex ID
   * @returns {Promise<StandardResponse>} Complex working hours
   */
  @Get('complex/:complexId')
  async getComplexWorkingHours(
    @Param('complexId') complexId: string,
  ): Promise<StandardResponse> {
    // For now, return a simple response until the service method exists
    return this.createSuccessResponse([], {
      ar: 'تم استرجاع ساعات عمل المجمع بنجاح',
      en: 'Complex working hours retrieved successfully',
    });
  }

  /**
   * Updates working hours for an entity.
   * Optionally validates against parent entity.
   *
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @param {UpdateWorkingHoursDto} updateDto - Update data
   * @param {string} validateWithParent - Whether to validate with parent
   * @param {string} parentEntityType - Parent entity type (if validating)
   * @param {string} parentEntityId - Parent entity ID (if validating)
   * @returns {Promise<StandardResponse<WorkingHours[]>>} Updated working hours
   */
  @Put(':entityType/:entityId')
  @HttpCode(HttpStatus.OK)
  async updateWorkingHours(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Body() updateDto: UpdateWorkingHoursDto,
    @Query('validateWithParent') validateWithParent?: string,
    @Query('parentEntityType') parentEntityType?: string,
    @Query('parentEntityId') parentEntityId?: string,
  ): Promise<StandardResponse<WorkingHours[]>> {
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

    return this.createSuccessResponse(workingHours, {
      ar: 'تم تحديث ساعات العمل بنجاح',
      en: 'Working hours updated successfully',
    });
  }
}
