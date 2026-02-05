import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DepartmentService } from './department.service';
import {
  CreateDepartmentDto,
  AssignDepartmentsDto,
} from './dto/create-department.dto';
import { Department } from '../database/schemas/department.schema';
import { ComplexDepartment } from '../database/schemas/complex-department.schema';
import { DeleteResult, CanDeleteResult } from './dto/delete-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('departments')
@ApiTags('departments')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  /**
   * Create a new department
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createDepartment(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    createDepartmentDto: CreateDepartmentDto,
  ): Promise<Department> {
    return this.departmentService.createDepartment(createDepartmentDto);
  }

  /**
   * Get all departments
   */
  @Get()
  async getAllDepartments(): Promise<Department[]> {
    return this.departmentService.getAllDepartments();
  }

  /**
   * Get department by ID
   */
  @Get(':id')
  async getDepartment(@Param('id') id: string): Promise<Department> {
    return this.departmentService.getDepartment(id);
  }

  /**
   * Assign departments to a complex
   */
  @Post('complexes/:complexId/assign')
  @HttpCode(HttpStatus.CREATED)
  async assignDepartmentsToComplex(
    @Param('complexId') complexId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    assignDto: AssignDepartmentsDto,
  ): Promise<ComplexDepartment[]> {
    return this.departmentService.assignDepartmentsToComplex(
      complexId,
      assignDto,
    );
  }

  /**
   * Get departments for a specific complex
   */
  @Get('complexes/:complexId')
  async getDepartmentsByComplex(
    @Param('complexId') complexId: string,
  ): Promise<Department[]> {
    return this.departmentService.getDepartmentsByComplex(complexId);
  }

  /**
   * Get complex-department relationships for a complex
   */
  @Get('complexes/:complexId/relationships')
  async getComplexDepartmentsByComplex(
    @Param('complexId') complexId: string,
  ): Promise<ComplexDepartment[]> {
    return this.departmentService.getComplexDepartmentsByComplex(complexId);
  }

  /**
   * Create a relationship between complex and department
   */
  @Post('complexes/:complexId/departments/:departmentId')
  @HttpCode(HttpStatus.CREATED)
  async createComplexDepartment(
    @Param('complexId') complexId: string,
    @Param('departmentId') departmentId: string,
  ): Promise<ComplexDepartment> {
    return this.departmentService.createComplexDepartment(
      complexId,
      departmentId,
    );
  }

  /**
   * Delete department with validation
   * Prevents deletion if department is linked to clinics or has services
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete department with validation',
    description: `
      Delete a department after validating it is not linked to any clinics or services.
      
      **Business Rules:**
      - Cannot delete if department is linked to any active clinics
      - Cannot delete if department has any services
      - Only Admin or Owner roles can delete departments
      
      **Error Codes:**
      - DEPARTMENT_001: Department is linked to clinics
      - DEPARTMENT_002: Department has services
      - DEPARTMENT_003: Department not found
    `,
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Department ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Department deleted successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم حذف القسم بنجاح',
          en: 'Department deleted successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete - linked to clinics or has services',
    schema: {
      example: {
        success: false,
        error: {
          code: 'DEPARTMENT_001',
          message: {
            ar: 'لا يمكن حذف القسم لأنه مرتبط بعيادة',
            en: 'Cannot delete department because it is linked to a clinic',
          },
          linkedClinics: [
            {
              clinicId: '507f1f77bcf86cd799439011',
              clinicName: 'Cardiology Clinic A',
              complexName: 'Medical Complex 1',
              complexId: '507f1f77bcf86cd799439012',
            },
          ],
          linkedClinicsCount: 3,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Department not found',
    schema: {
      example: {
        success: false,
        error: {
          code: 'DEPARTMENT_003',
          message: {
            ar: 'القسم غير موجود',
            en: 'Department not found',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User does not have permission (requires Admin or Owner role)',
  })
  async deleteDepartment(@Param('id') id: string): Promise<DeleteResult> {
    return this.departmentService.deleteDepartment(id);
  }

  /**
   * Check if department can be deleted
   * Returns deletion eligibility information including linked entities
   */
  @Get(':id/can-delete')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check if department can be deleted',
    description: `
      Check whether a department can be safely deleted by verifying it has no linked clinics or services.
      This endpoint is useful for frontend UI to disable delete buttons and show appropriate tooltips.
      
      **Returns:**
      - canDelete: boolean indicating if deletion is allowed
      - reason: bilingual explanation if deletion is blocked
      - linkedClinics: array of clinics linked to this department
      - linkedServices: count of services using this department
      - recommendations: bilingual suggestions for user action
      
      **Note:** This is a read-only operation that does not modify any data.
    `,
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Department ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns deletion eligibility information',
    schema: {
      oneOf: [
        {
          title: 'Can Delete',
          example: {
            success: true,
            data: {
              canDelete: true,
            },
          },
        },
        {
          title: 'Cannot Delete - Linked to Clinics',
          example: {
            success: true,
            data: {
              canDelete: false,
              reason: {
                ar: 'لا يمكن حذف القسم لأنه مرتبط بـ 3 عيادات',
                en: 'Cannot delete department because it is linked to 3 clinics',
              },
              linkedClinics: [
                {
                  clinicId: '507f1f77bcf86cd799439011',
                  clinicName: 'Cardiology Clinic A',
                  complexName: 'Medical Complex 1',
                  complexId: '507f1f77bcf86cd799439012',
                },
                {
                  clinicId: '507f1f77bcf86cd799439013',
                  clinicName: 'Cardiology Clinic B',
                  complexName: 'Medical Complex 1',
                  complexId: '507f1f77bcf86cd799439012',
                },
              ],
              linkedServices: 5,
              recommendations: {
                ar: 'يرجى إزالة القسم من جميع العيادات والخدمات المرتبطة قبل الحذف',
                en: 'Please remove the department from all linked clinics and services before deletion',
              },
            },
          },
        },
        {
          title: 'Cannot Delete - Has Services',
          example: {
            success: true,
            data: {
              canDelete: false,
              reason: {
                ar: 'لا يمكن حذف القسم لأنه يحتوي على 5 خدمات',
                en: 'Cannot delete department because it has 5 services',
              },
              linkedServices: 5,
              recommendations: {
                ar: 'يرجى إزالة القسم من جميع العيادات والخدمات المرتبطة قبل الحذف',
                en: 'Please remove the department from all linked clinics and services before deletion',
              },
            },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Department not found',
    schema: {
      example: {
        success: false,
        error: {
          code: 'DEPARTMENT_003',
          message: {
            ar: 'القسم غير موجود',
            en: 'Department not found',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User does not have permission (requires Admin or Owner role)',
  })
  async canDeleteDepartment(@Param('id') id: string): Promise<CanDeleteResult> {
    return this.departmentService.canDeleteDepartment(id);
  }
}
