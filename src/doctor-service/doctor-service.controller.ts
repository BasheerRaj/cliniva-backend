import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
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
import { DoctorServiceService } from './doctor-service.service';
import {
  AssignDoctorToServiceDto,
  DeactivateDoctorFromServiceDto,
  UpdateDoctorServiceNotesDto,
} from './dto/doctor-service.dto';
import { SERVICE_SWAGGER_EXAMPLES } from '../service/constants/swagger-examples';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Doctor-Service')
@Controller('services')
@UseGuards(JwtAuthGuard)
export class DoctorServiceController {
  constructor(
    private readonly doctorServiceService: DoctorServiceService,
  ) {}

  /**
   * Get available doctors for service
   * GET /services/:serviceId/available-doctors
   */
  @ApiOperation({
    summary: 'Get available doctors for service',
    description:
      'Returns list of active doctors who can be assigned to this service. Only shows doctors who work at clinics where this service is offered and are not already assigned.',
  })
  @ApiResponse({
    status: 200,
    description: 'Available doctors retrieved successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم استرجاع الأطباء المتاحين بنجاح',
          en: 'Available doctors retrieved successfully',
        },
        data: [
          {
            _id: '507f1f77bcf86cd799439012',
            firstName: 'Ahmed',
            lastName: 'Hassan',
            email: 'ahmed.hassan@clinic.com',
            role: 'doctor',
            status: 'active',
            isAlreadyAssigned: false,
            canBeAssigned: true,
          },
        ],
        count: 1,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Service not found',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.SERVICE_NOT_FOUND,
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'serviceId',
    description: 'Service ID (MongoDB ObjectId)',
    type: String,
    example: '507f1f77bcf86cd799439013',
  })
  @ApiQuery({
    name: 'clinicId',
    required: false,
    type: String,
    description: 'Filter by specific clinic',
  })
  @Get(':serviceId/available-doctors')
  async getAvailableDoctorsForService(
    @Param('serviceId') serviceId: string,
    @Query('clinicId') clinicId?: string,
  ) {
    const doctors = await this.doctorServiceService.getAvailableDoctorsForService(
      serviceId,
      clinicId,
    );
    return {
      success: true,
      message: {
        ar: 'تم استرجاع الأطباء المتاحين بنجاح',
        en: 'Available doctors retrieved successfully',
      },
      data: doctors,
      count: doctors.length,
    };
  }

  /**
   * Get doctors assigned to service
   * GET /services/:serviceId/doctors
   */
  @ApiOperation({
    summary: 'Get doctors assigned to service',
    description:
      'Retrieves all doctors assigned to a service, optionally filtered by clinic and active status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Doctors retrieved successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم استرجاع الأطباء بنجاح',
          en: 'Doctors retrieved successfully',
        },
        data: [
          {
            _id: '507f1f77bcf86cd799439011',
            doctorId: {
              _id: '507f1f77bcf86cd799439012',
              firstName: 'Ahmed',
              lastName: 'Hassan',
              email: 'ahmed.hassan@clinic.com',
              role: 'doctor',
            },
            serviceId: '507f1f77bcf86cd799439013',
            clinicId: {
              _id: '507f1f77bcf86cd799439014',
              name: 'Main Clinic',
            },
            isActive: true,
            activeAppointmentsCount: 5,
            totalAppointmentsCount: 25,
            notes: 'Specialized in this service',
          },
        ],
        count: 1,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Service not found',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.SERVICE_NOT_FOUND,
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'serviceId',
    description: 'Service ID (MongoDB ObjectId)',
    type: String,
    example: '507f1f77bcf86cd799439013',
  })
  @ApiQuery({
    name: 'clinicId',
    required: false,
    type: String,
    description: 'Filter by clinic ID',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status (default: true)',
  })
  @ApiQuery({
    name: 'includeStats',
    required: false,
    type: Boolean,
    description: 'Include appointment statistics',
  })
  @Get(':serviceId/doctors')
  async getDoctorsForService(
    @Param('serviceId') serviceId: string,
    @Query('clinicId') clinicId?: string,
    @Query('isActive') isActive?: string,
    @Query('includeStats') includeStats?: string,
  ) {
    const doctors = await this.doctorServiceService.getDoctorsForService(
      serviceId,
      {
        clinicId,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        includeStats: includeStats === 'true',
      },
    );
    return {
      success: true,
      message: {
        ar: 'تم استرجاع الأطباء بنجاح',
        en: 'Doctors retrieved successfully',
      },
      data: doctors,
      count: doctors.length,
    };
  }

  /**
   * Assign doctor to service
   * POST /services/:serviceId/doctors
   */
  @ApiOperation({
    summary: 'Assign doctor to service',
    description:
      'Assigns a doctor to a service at a specific clinic. The doctor must work at the clinic where the service is offered.',
  })
  @ApiResponse({
    status: 201,
    description: 'Doctor assigned to service successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم إسناد الطبيب للخدمة بنجاح',
          en: 'Doctor assigned to service successfully',
        },
        data: {
          _id: '507f1f77bcf86cd799439011',
          doctorId: '507f1f77bcf86cd799439012',
          serviceId: '507f1f77bcf86cd799439013',
          clinicId: '507f1f77bcf86cd799439014',
          isActive: true,
          activeAppointmentsCount: 0,
          totalAppointmentsCount: 0,
          notes: 'Specialized in this service',
          createdAt: '2026-01-31T10:00:00.000Z',
          updatedAt: '2026-01-31T10:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or business rule violation',
    schema: {
      example: {
        statusCode: 400,
        message: {
          ar: 'الطبيب لا يعمل في هذه العيادة',
          en: 'Doctor does not work at this clinic',
        },
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Service not found',
    schema: {
      example: SERVICE_SWAGGER_EXAMPLES.SERVICE_NOT_FOUND,
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'serviceId',
    description: 'Service ID (MongoDB ObjectId)',
    type: String,
    example: '507f1f77bcf86cd799439013',
  })
  @ApiBody({ type: AssignDoctorToServiceDto })
  @Post(':serviceId/doctors')
  @HttpCode(HttpStatus.CREATED)
  async assignDoctorToService(
    @Param('serviceId') serviceId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: AssignDoctorToServiceDto,
  ) {
    const result = await this.doctorServiceService.assignDoctorToService(
      serviceId,
      dto,
    );
    return {
      success: true,
      message: {
        ar: 'تم إسناد الطبيب للخدمة بنجاح',
        en: 'Doctor assigned to service successfully',
      },
      data: result,
    };
  }

  /**
   * Deactivate doctor from service
   * PATCH /services/:serviceId/doctors/:doctorId/deactivate
   */
  @ApiOperation({
    summary: 'Deactivate doctor from service',
    description:
      'Deactivates a doctor from a service while preserving historical data. No new appointments can be scheduled, but existing data remains.',
  })
  @ApiResponse({
    status: 200,
    description: 'Doctor deactivated successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم إلغاء تنشيط الطبيب من الخدمة بنجاح',
          en: 'Doctor deactivated from service successfully',
        },
        data: {
          _id: '507f1f77bcf86cd799439011',
          doctorId: '507f1f77bcf86cd799439012',
          serviceId: '507f1f77bcf86cd799439013',
          clinicId: '507f1f77bcf86cd799439014',
          isActive: false,
          deactivatedAt: '2026-01-31T12:00:00.000Z',
          deactivationReason: 'Doctor transferred to another department',
          appointmentsTransferred: {
            count: 5,
            toDoctor: '507f1f77bcf86cd799439016',
            notificationsSent: true,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Has active appointments without transfer',
    schema: {
      example: {
        statusCode: 400,
        message: {
          ar: 'الطبيب لديه 5 مواعيد نشطة. يرجى نقل المواعيد أو إلغاؤها أولاً',
          en: 'Doctor has 5 active appointments. Please transfer or cancel appointments first',
        },
        error: 'Bad Request',
        activeAppointmentsCount: 5,
        requiresTransfer: true,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Assignment not found',
    schema: {
      example: {
        statusCode: 404,
        message: {
          ar: 'الطبيب غير مسند لهذه الخدمة',
          en: 'Doctor is not assigned to this service',
        },
        error: 'Not Found',
      },
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'serviceId',
    description: 'Service ID (MongoDB ObjectId)',
    type: String,
    example: '507f1f77bcf86cd799439013',
  })
  @ApiParam({
    name: 'doctorId',
    description: 'Doctor User ID (MongoDB ObjectId)',
    type: String,
    example: '507f1f77bcf86cd799439012',
  })
  @ApiBody({ type: DeactivateDoctorFromServiceDto })
  @Patch(':serviceId/doctors/:doctorId/deactivate')
  async deactivateDoctorFromService(
    @Param('serviceId') serviceId: string,
    @Param('doctorId') doctorId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: DeactivateDoctorFromServiceDto,
    @Request() req: any,
  ) {
    const userId = req?.user?.id || req?.user?.userId;
    const result = await this.doctorServiceService.deactivateDoctorFromService(
      serviceId,
      doctorId,
      dto,
      userId,
    );
    return {
      success: true,
      message: {
        ar: 'تم إلغاء تنشيط الطبيب من الخدمة بنجاح',
        en: 'Doctor deactivated from service successfully',
      },
      data: result,
    };
  }

  /**
   * Remove doctor from service
   * DELETE /services/:serviceId/doctors/:doctorId
   */
  @ApiOperation({
    summary: 'Remove doctor from service',
    description:
      'Permanently removes a doctor from a service. Can only be done if doctor has NO appointments (active or historical).',
  })
  @ApiResponse({
    status: 200,
    description: 'Doctor removed successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم إزالة الطبيب من الخدمة بنجاح',
          en: 'Doctor removed from service successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete - has appointments',
    schema: {
      example: {
        statusCode: 400,
        message: {
          ar: 'لا يمكن حذف الطبيب لأنه لديه مواعيد مرتبطة بهذه الخدمة. استخدم إلغاء التنشيط بدلاً من ذلك',
          en: 'Cannot delete doctor because they have appointments for this service. Use deactivate instead',
        },
        error: 'Bad Request',
        totalAppointmentsCount: 10,
        useDeactivateInstead: true,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Assignment not found',
    schema: {
      example: {
        statusCode: 404,
        message: {
          ar: 'الطبيب غير مسند لهذه الخدمة',
          en: 'Doctor is not assigned to this service',
        },
        error: 'Not Found',
      },
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'serviceId',
    description: 'Service ID (MongoDB ObjectId)',
    type: String,
    example: '507f1f77bcf86cd799439013',
  })
  @ApiParam({
    name: 'doctorId',
    description: 'Doctor User ID (MongoDB ObjectId)',
    type: String,
    example: '507f1f77bcf86cd799439012',
  })
  @ApiQuery({
    name: 'clinicId',
    required: true,
    type: String,
    description: 'Clinic ID (MongoDB ObjectId)',
  })
  @Delete(':serviceId/doctors/:doctorId')
  async removeDoctorFromService(
    @Param('serviceId') serviceId: string,
    @Param('doctorId') doctorId: string,
    @Query('clinicId') clinicId: string,
  ) {
    await this.doctorServiceService.removeDoctorFromService(
      serviceId,
      doctorId,
      clinicId,
    );
    return {
      success: true,
      message: {
        ar: 'تم إزالة الطبيب من الخدمة بنجاح',
        en: 'Doctor removed from service successfully',
      },
    };
  }

  /**
   * Update doctor assignment notes
   * PATCH /services/:serviceId/doctors/:doctorId
   */
  @ApiOperation({
    summary: 'Update doctor assignment notes',
    description:
      'Updates notes for a doctor-service assignment. Cannot change doctor or service - only metadata.',
  })
  @ApiResponse({
    status: 200,
    description: 'Assignment notes updated successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم تحديث ملاحظات الإسناد بنجاح',
          en: 'Assignment notes updated successfully',
        },
        data: {
          _id: '507f1f77bcf86cd799439011',
          doctorId: '507f1f77bcf86cd799439012',
          serviceId: '507f1f77bcf86cd799439013',
          clinicId: '507f1f77bcf86cd799439014',
          isActive: true,
          notes: 'Updated notes',
          updatedAt: '2026-01-31T13:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Assignment not found',
    schema: {
      example: {
        statusCode: 404,
        message: {
          ar: 'الطبيب غير مسند لهذه الخدمة',
          en: 'Doctor is not assigned to this service',
        },
        error: 'Not Found',
      },
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'serviceId',
    description: 'Service ID (MongoDB ObjectId)',
    type: String,
    example: '507f1f77bcf86cd799439013',
  })
  @ApiParam({
    name: 'doctorId',
    description: 'Doctor User ID (MongoDB ObjectId)',
    type: String,
    example: '507f1f77bcf86cd799439012',
  })
  @ApiBody({ type: UpdateDoctorServiceNotesDto })
  @Patch(':serviceId/doctors/:doctorId')
  async updateDoctorServiceNotes(
    @Param('serviceId') serviceId: string,
    @Param('doctorId') doctorId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UpdateDoctorServiceNotesDto,
  ) {
    const result = await this.doctorServiceService.updateDoctorServiceNotes(
      serviceId,
      doctorId,
      dto,
    );
    return {
      success: true,
      message: {
        ar: 'تم تحديث ملاحظات الإسناد بنجاح',
        en: 'Assignment notes updated successfully',
      },
      data: result,
    };
  }
}


