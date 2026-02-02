import { Controller, Post, Get, Body, Param, Put, Query, Delete, Patch, NotFoundException, BadRequestException } from '@nestjs/common';
import { ComplexService } from './complex.service';
import { CreateComplexDto, UpdateComplexDto } from './dto/create-complex.dto';
import { ListComplexesQueryDto } from './dto/list-complexes-query.dto';
import { UpdateComplexStatusDto } from './dto/update-complex-status.dto';
import { AssignPICDto } from './dto/assign-pic.dto';
import { TransferClinicsDto } from './dto/transfer-clinics.dto';

@Controller('complexes')
export class ComplexController {
  constructor(private readonly complexService: ComplexService) {}

  /**
   * List complexes with pagination, filters, and optional counts
   * GET /complexes
   * 
   * Requirements: 1.1, 1.11
   */
  @Get()
  async listComplexes(@Query() query: ListComplexesQueryDto) {
    try {
      return await this.complexService.listComplexes(query);
    } catch (error) {
      // Handle specific error types
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        const errorResponse = error.getResponse() as any;
        return {
          success: false,
          error: {
            code: errorResponse.code || 'COMPLEX_999',
            message: errorResponse.message || {
              ar: 'حدث خطأ أثناء استرجاع قائمة المجمعات',
              en: 'An error occurred while retrieving complexes list',
            },
            details: errorResponse.details,
          },
        };
      }

      // Handle unexpected errors with generic bilingual message
      return {
        success: false,
        error: {
          code: 'COMPLEX_999',
          message: {
            ar: 'حدث خطأ غير متوقع أثناء استرجاع قائمة المجمعات',
            en: 'An unexpected error occurred while retrieving complexes list',
          },
          details: error.message,
        },
      };
    }
  }

  @Post()
  async createComplex(@Body() createComplexDto: CreateComplexDto) {
    try {
      const complex = await this.complexService.createComplex(createComplexDto);
      return {
        success: true,
        data: complex,
        message: {
          ar: 'تم إنشاء المجمع بنجاح',
          en: 'Complex created successfully',
        },
      };
    } catch (error) {
      // Handle BadRequestException with bilingual error
      if (error instanceof BadRequestException) {
        const errorResponse = error.getResponse() as any;
        return {
          success: false,
          error: {
            code: errorResponse.code || 'COMPLEX_999',
            message: errorResponse.message || {
              ar: 'فشل إنشاء المجمع',
              en: 'Failed to create complex',
            },
            details: errorResponse.details,
          },
        };
      }

      // Handle NotFoundException with bilingual error
      if (error instanceof NotFoundException) {
        const errorResponse = error.getResponse() as any;
        return {
          success: false,
          error: {
            code: errorResponse.code || 'COMPLEX_006',
            message: errorResponse.message || {
              ar: 'المجمع غير موجود',
              en: 'Complex not found',
            },
            details: errorResponse.details,
          },
        };
      }

      // Handle other errors with generic bilingual message
      return {
        success: false,
        error: {
          code: 'COMPLEX_999',
          message: {
            ar: 'حدث خطأ غير متوقع أثناء إنشاء المجمع',
            en: 'An unexpected error occurred while creating complex',
          },
          details: error.message,
        },
      };
    }
  }

  @Get('subscription/:subscriptionId')
  async getComplexBySubscription(
    @Param('subscriptionId') subscriptionId: string,
  ) {
    try {
      const complex =
        await this.complexService.getComplexBySubscription(subscriptionId);
      return {
        success: true,
        message: complex
          ? {
              ar: 'تم العثور على المجمع',
              en: 'Complex found',
            }
          : {
              ar: 'لم يتم العثور على مجمع لهذا الاشتراك',
              en: 'No complex found for this subscription',
            },
        data: complex,
      };
    } catch (error) {
      // Handle specific error types
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        const errorResponse = error.getResponse() as any;
        return {
          success: false,
          error: {
            code: errorResponse.code || 'COMPLEX_999',
            message: errorResponse.message || {
              ar: 'فشل استرجاع المجمع حسب الاشتراك',
              en: 'Failed to retrieve complex by subscription',
            },
            details: errorResponse.details,
          },
        };
      }

      // Handle unexpected errors
      return {
        success: false,
        error: {
          code: 'COMPLEX_999',
          message: {
            ar: 'حدث خطأ غير متوقع أثناء استرجاع المجمع حسب الاشتراك',
            en: 'An unexpected error occurred while retrieving complex by subscription',
          },
          details: error.message,
        },
      };
    }
  }

  @Get('organization/:organizationId')
  async getComplexesByOrganization(
    @Param('organizationId') organizationId: string,
  ) {
    try {
      const complexes =
        await this.complexService.getComplexesByOrganization(organizationId);
      return {
        success: true,
        message: {
          ar: 'تم استرجاع المجمعات بنجاح',
          en: 'Complexes retrieved successfully',
        },
        data: complexes,
      };
    } catch (error) {
      // Handle specific error types
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        const errorResponse = error.getResponse() as any;
        return {
          success: false,
          error: {
            code: errorResponse.code || 'COMPLEX_999',
            message: errorResponse.message || {
              ar: 'فشل استرجاع المجمعات حسب المنظمة',
              en: 'Failed to retrieve complexes by organization',
            },
            details: errorResponse.details,
          },
        };
      }

      // Handle unexpected errors
      return {
        success: false,
        error: {
          code: 'COMPLEX_999',
          message: {
            ar: 'حدث خطأ غير متوقع أثناء استرجاع المجمعات حسب المنظمة',
            en: 'An unexpected error occurred while retrieving complexes by organization',
          },
          details: error.message,
        },
      };
    }
  }

  /**
   * Get complex details with all relationships and calculated metrics
   * GET /complexes/:id
   * 
   * Requirements: 2.1, 2.9
   */
  @Get(':id')
  async getComplex(@Param('id') id: string) {
    try {
      return await this.complexService.getComplexDetails(id);
    } catch (error) {
      // Handle NotFoundException with bilingual error
      if (error instanceof NotFoundException) {
        const errorResponse = error.getResponse() as any;
        return {
          success: false,
          error: {
            code: errorResponse.code || 'COMPLEX_006',
            message: errorResponse.message || {
              ar: 'المجمع غير موجود',
              en: 'Complex not found',
            },
            details: errorResponse.details,
          },
        };
      }

      // Handle BadRequestException with bilingual error
      if (error instanceof BadRequestException) {
        const errorResponse = error.getResponse() as any;
        return {
          success: false,
          error: {
            code: errorResponse.code || 'COMPLEX_999',
            message: errorResponse.message || {
              ar: 'فشل استرجاع تفاصيل المجمع',
              en: 'Failed to retrieve complex details',
            },
            details: errorResponse.details,
          },
        };
      }

      // Handle other errors with generic bilingual message
      return {
        success: false,
        error: {
          code: 'COMPLEX_999',
          message: {
            ar: 'حدث خطأ غير متوقع أثناء استرجاع تفاصيل المجمع',
            en: 'An unexpected error occurred while retrieving complex details',
          },
          details: error.message,
        },
      };
    }
  }

  /**
   * Update complex with validation for department restrictions and PIC
   * PUT /complexes/:id
   * 
   * Requirements: 4.9
   */
  @Put(':id')
  async updateComplex(
    @Param('id') id: string,
    @Body() updateComplexDto: UpdateComplexDto,
  ) {
    try {
      const result = await this.complexService.updateComplex(
        id,
        updateComplexDto,
      );
      
      // Return the result which includes departmentRestrictions if any
      return result;
    } catch (error) {
      // Handle NotFoundException with bilingual error
      if (error instanceof NotFoundException) {
        const errorResponse = error.getResponse() as any;
        return {
          success: false,
          error: {
            code: errorResponse.code || 'COMPLEX_006',
            message: errorResponse.message || {
              ar: 'المجمع غير موجود',
              en: 'Complex not found',
            },
            details: errorResponse.details,
          },
        };
      }

      // Handle BadRequestException with bilingual error
      if (error instanceof BadRequestException) {
        const errorResponse = error.getResponse() as any;
        return {
          success: false,
          error: {
            code: errorResponse.code || 'COMPLEX_999',
            message: errorResponse.message || {
              ar: 'فشل تحديث المجمع',
              en: 'Failed to update complex',
            },
            details: errorResponse.details,
            departmentRestrictions: errorResponse.departmentRestrictions,
          },
        };
      }

      // Handle other errors with generic bilingual message
      return {
        success: false,
        error: {
          code: 'COMPLEX_999',
          message: {
            ar: 'حدث خطأ غير متوقع أثناء تحديث المجمع',
            en: 'An unexpected error occurred while updating complex',
          },
          details: error.message,
        },
      };
    }
  }

  /**
   * Soft delete a complex
   * DELETE /complexes/:id
   * 
   * Requirements: 5.6
   */
  @Delete(':id')
  async softDeleteComplex(@Param('id') id: string) {
    try {
      return await this.complexService.softDeleteComplex(id);
    } catch (error) {
      // Handle NotFoundException with bilingual error
      if (error instanceof NotFoundException) {
        const errorResponse = error.getResponse() as any;
        return {
          success: false,
          error: {
            code: errorResponse.code || 'COMPLEX_006',
            message: errorResponse.message || {
              ar: 'المجمع غير موجود',
              en: 'Complex not found',
            },
            details: errorResponse.details,
          },
        };
      }

      // Handle BadRequestException with bilingual error (e.g., COMPLEX_003)
      if (error instanceof BadRequestException) {
        const errorResponse = error.getResponse() as any;
        return {
          success: false,
          error: {
            code: errorResponse.code || 'COMPLEX_999',
            message: errorResponse.message || {
              ar: 'فشل حذف المجمع',
              en: 'Failed to delete complex',
            },
            details: errorResponse.details,
          },
        };
      }

      // Handle other errors with generic bilingual message
      return {
        success: false,
        error: {
          code: 'COMPLEX_999',
          message: {
            ar: 'حدث خطأ غير متوقع أثناء حذف المجمع',
            en: 'An unexpected error occurred while deleting complex',
          },
          details: error.message,
        },
      };
    }
  }

  /**
   * Update complex status with cascading effects
   * PATCH /complexes/:id/status
   * 
   * Requirements: 6.10
   */
  @Patch(':id/status')
  async updateComplexStatus(
    @Param('id') id: string,
    @Body() updateComplexStatusDto: UpdateComplexStatusDto,
  ) {
    try {
      // TODO: Extract userId from authenticated user context when auth is implemented
      // For now, we pass undefined and the service will use the complex owner
      return await this.complexService.updateComplexStatus(
        id,
        updateComplexStatusDto,
        undefined,
      );
    } catch (error) {
      // Handle NotFoundException with bilingual error
      if (error instanceof NotFoundException) {
        const errorResponse = error.getResponse() as any;
        return {
          success: false,
          error: {
            code: errorResponse.code || 'COMPLEX_006',
            message: errorResponse.message || {
              ar: 'المجمع غير موجود',
              en: 'Complex not found',
            },
            details: errorResponse.details,
          },
        };
      }

      // Handle BadRequestException with bilingual error (e.g., COMPLEX_004, COMPLEX_005)
      if (error instanceof BadRequestException) {
        const errorResponse = error.getResponse() as any;
        return {
          success: false,
          error: {
            code: errorResponse.code || 'COMPLEX_999',
            message: errorResponse.message || {
              ar: 'فشل تحديث حالة المجمع',
              en: 'Failed to update complex status',
            },
            details: errorResponse.details,
          },
        };
      }

      // Handle other errors with generic bilingual message
      return {
        success: false,
        error: {
          code: 'COMPLEX_999',
          message: {
            ar: 'حدث خطأ غير متوقع أثناء تحديث حالة المجمع',
            en: 'An unexpected error occurred while updating complex status',
          },
          details: error.message,
        },
      };
    }
  }

  /**
   * Get complex capacity with breakdown and utilization
   * GET /complexes/:id/capacity
   * 
   * Requirements: 7.6
   */
  @Get(':id/capacity')
  async getComplexCapacity(@Param('id') id: string) {
    try {
      return await this.complexService.getComplexCapacity(id);
    } catch (error) {
      // Handle NotFoundException with bilingual error
      if (error instanceof NotFoundException) {
        const errorResponse = error.getResponse() as any;
        return {
          success: false,
          error: {
            code: errorResponse.code || 'COMPLEX_006',
            message: errorResponse.message || {
              ar: 'المجمع غير موجود',
              en: 'Complex not found',
            },
            details: errorResponse.details,
          },
        };
      }

      // Handle BadRequestException with bilingual error
      if (error instanceof BadRequestException) {
        const errorResponse = error.getResponse() as any;
        return {
          success: false,
          error: {
            code: errorResponse.code || 'COMPLEX_999',
            message: errorResponse.message || {
              ar: 'فشل حساب سعة المجمع',
              en: 'Failed to calculate complex capacity',
            },
            details: errorResponse.details,
          },
        };
      }

      // Handle other errors with generic bilingual message
      return {
        success: false,
        error: {
          code: 'COMPLEX_999',
          message: {
            ar: 'حدث خطأ غير متوقع أثناء حساب سعة المجمع',
            en: 'An unexpected error occurred while calculating complex capacity',
          },
          details: error.message,
        },
      };
    }
  }

  /**
   * Assign person-in-charge to a complex
   * PATCH /complexes/:id/pic
   * 
   * Requirements: 8.6
   */
  @Patch(':id/pic')
  async assignPersonInCharge(
    @Param('id') id: string,
    @Body() assignPICDto: AssignPICDto,
  ) {
    try {
      return await this.complexService.assignPersonInCharge(
        id,
        assignPICDto.userId,
      );
    } catch (error) {
      // Handle NotFoundException with bilingual error
      if (error instanceof NotFoundException) {
        const errorResponse = error.getResponse() as any;
        return {
          success: false,
          error: {
            code: errorResponse.code || 'COMPLEX_006',
            message: errorResponse.message || {
              ar: 'المجمع غير موجود',
              en: 'Complex not found',
            },
            details: errorResponse.details,
          },
        };
      }

      // Handle BadRequestException with bilingual error (e.g., COMPLEX_002)
      if (error instanceof BadRequestException) {
        const errorResponse = error.getResponse() as any;
        return {
          success: false,
          error: {
            code: errorResponse.code || 'COMPLEX_999',
            message: errorResponse.message || {
              ar: 'فشل تعيين الشخص المسؤول',
              en: 'Failed to assign person-in-charge',
            },
            details: errorResponse.details,
          },
        };
      }

      // Handle other errors with generic bilingual message
      return {
        success: false,
        error: {
          code: 'COMPLEX_999',
          message: {
            ar: 'حدث خطأ غير متوقع أثناء تعيين الشخص المسؤول',
            en: 'An unexpected error occurred while assigning person-in-charge',
          },
          details: error.message,
        },
      };
    }
  }

  /**
   * Remove person-in-charge from a complex
   * DELETE /complexes/:id/pic
   * 
   * Requirements: 9.4
   */
  @Delete(':id/pic')
  async removePersonInCharge(@Param('id') id: string) {
    try {
      return await this.complexService.removePersonInCharge(id);
    } catch (error) {
      // Handle NotFoundException with bilingual error
      if (error instanceof NotFoundException) {
        const errorResponse = error.getResponse() as any;
        return {
          success: false,
          error: {
            code: errorResponse.code || 'COMPLEX_006',
            message: errorResponse.message || {
              ar: 'المجمع غير موجود',
              en: 'Complex not found',
            },
            details: errorResponse.details,
          },
        };
      }

      // Handle BadRequestException with bilingual error
      if (error instanceof BadRequestException) {
        const errorResponse = error.getResponse() as any;
        return {
          success: false,
          error: {
            code: errorResponse.code || 'COMPLEX_999',
            message: errorResponse.message || {
              ar: 'فشل إزالة الشخص المسؤول',
              en: 'Failed to remove person-in-charge',
            },
            details: errorResponse.details,
          },
        };
      }

      // Handle other errors with generic bilingual message
      return {
        success: false,
        error: {
          code: 'COMPLEX_999',
          message: {
            ar: 'حدث خطأ غير متوقع أثناء إزالة الشخص المسؤول',
            en: 'An unexpected error occurred while removing person-in-charge',
          },
          details: error.message,
        },
      };
    }
  }

  /**
   * Transfer clinics from source complex to target complex
   * POST /complexes/:id/transfer-clinics
   * 
   * Requirements: 10.10
   */
  @Post(':id/transfer-clinics')
  async transferClinics(
    @Param('id') sourceComplexId: string,
    @Body() transferClinicsDto: TransferClinicsDto,
  ) {
    try {
      return await this.complexService.transferClinics(
        sourceComplexId,
        transferClinicsDto.targetComplexId,
        transferClinicsDto.clinicIds,
      );
    } catch (error) {
      // Handle NotFoundException with bilingual error
      if (error instanceof NotFoundException) {
        const errorResponse = error.getResponse() as any;
        return {
          success: false,
          error: {
            code: errorResponse.code || 'COMPLEX_006',
            message: errorResponse.message || {
              ar: 'المجمع غير موجود',
              en: 'Complex not found',
            },
            details: errorResponse.details,
          },
        };
      }

      // Handle BadRequestException with bilingual error (e.g., COMPLEX_005, validation errors)
      if (error instanceof BadRequestException) {
        const errorResponse = error.getResponse() as any;
        return {
          success: false,
          error: {
            code: errorResponse.code || 'COMPLEX_999',
            message: errorResponse.message || {
              ar: 'فشل نقل العيادات',
              en: 'Failed to transfer clinics',
            },
            details: errorResponse.details,
          },
        };
      }

      // Handle other errors with generic bilingual message
      return {
        success: false,
        error: {
          code: 'COMPLEX_999',
          message: {
            ar: 'حدث خطأ غير متوقع أثناء نقل العيادات',
            en: 'An unexpected error occurred while transferring clinics',
          },
          details: error.message,
        },
      };
    }
  }
}
