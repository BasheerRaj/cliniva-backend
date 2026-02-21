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
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { DepartmentService } from './department.service';
import {
  CreateDepartmentDto,
  AssignDepartmentsDto,
  UpdateDepartmentDto,
  UpdateDepartmentStatusDto,
  DeactivateWithTransferDto,
} from './dto/create-department.dto';
import { Department } from '../database/schemas/department.schema';
import { ComplexDepartment } from '../database/schemas/complex-department.schema';
import {
  DeleteResult,
  CanDeleteResult,
  CheckDependenciesResult,
  DeactivateWithTransferResult,
} from './dto/delete-response.dto';
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
  @ApiOperation({
    summary: 'Create new department',
    description: `
      Create a new department in the system. Departments are shared across the platform
      and can be assigned to multiple complexes.
      
      **Use Cases:**
      - Add new medical specialty departments
      - Create custom departments for specific medical services
      - Expand available department options for complex/clinic setup
      
      **Request Body:**
      - name: Department name (required, unique)
      - description: Department description (optional)
      
      **Business Rules:**
      - Department name must be unique across the system
      - Department name is required and cannot be empty
      - Description is optional but recommended for clarity
      - Once created, departments can be assigned to complexes
      - Departments are shared resources across all organizations
      
      **Response:**
      - Returns the created department with generated ID
      - Includes creation timestamp
      - Returns 201 status code on success
      
      **Note:** This endpoint does not require authentication in the current implementation.
      Consider adding authentication for production use.
    `,
  })
  @ApiBody({
    type: CreateDepartmentDto,
    description: 'Department creation data',
    examples: {
      cardiology: {
        summary: 'Cardiology Department',
        description: 'Create a cardiology department',
        value: {
          name: 'Cardiology',
          description: 'Heart and cardiovascular system department',
        },
      },
      pediatrics: {
        summary: 'Pediatrics Department',
        description: 'Create a pediatrics department',
        value: {
          name: 'Pediatrics',
          description: 'Children healthcare department',
        },
      },
      orthopedics: {
        summary: 'Orthopedics Department',
        description: 'Create an orthopedics department',
        value: {
          name: 'Orthopedics',
          description: 'Bone and joint care department',
        },
      },
      minimal: {
        summary: 'Minimal Required Fields',
        description: 'Create department with only required fields',
        value: {
          name: 'Neurology',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Department created successfully',
    schema: {
      example: {
        success: true,
        data: {
          _id: '507f1f77bcf86cd799439011',
          name: 'Cardiology',
          description: 'Heart and cardiovascular system department',
          createdAt: '2026-02-07T10:00:00.000Z',
          updatedAt: '2026-02-07T10:00:00.000Z',
        },
        message: {
          ar: 'تم إنشاء القسم بنجاح',
          en: 'Department created successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error or department name already exists',
    schema: {
      oneOf: [
        {
          title: 'Validation Error',
          example: {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: {
                ar: 'خطأ في التحقق من البيانات',
                en: 'Validation error',
              },
              details: {
                field: 'name',
                constraint: 'isNotEmpty',
                value: '',
              },
            },
          },
        },
        {
          title: 'Department Name Already Exists',
          example: {
            success: false,
            error: {
              code: 'DEPARTMENT_004',
              message: {
                ar: 'اسم القسم موجود بالفعل',
                en: 'Department name already exists',
              },
            },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
    schema: {
      example: {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: {
            ar: 'حدث خطأ في الخادم',
            en: 'Internal server error occurred',
          },
        },
      },
    },
  })
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
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all departments',
    description: `
      Retrieve a complete list of all departments in the system.
      
      **Use Cases:**
      - Display department selection dropdown in forms
      - Show all available departments for complex assignment
      - Department management dashboard
      - Clinic creation/update forms
      
      **Response:**
      - Returns array of all departments with basic information
      - Departments are not filtered by complex or organization
      - Includes department ID, name, and description
      
      **Business Rules:**
      - Requires authentication
      - No pagination (returns all departments)
      - Departments are shared across the platform
      
      **Note:** This endpoint returns all departments regardless of complex assignment.
      Use GET /departments/complexes/:complexId to get departments for a specific complex.
    `,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Departments list retrieved successfully',
    schema: {
      example: {
        success: true,
        data: [
          {
            _id: '507f1f77bcf86cd799439011',
            name: 'Cardiology',
            description: 'Heart and cardiovascular system department',
            createdAt: '2026-02-07T10:00:00.000Z',
            updatedAt: '2026-02-07T10:00:00.000Z',
          },
          {
            _id: '507f1f77bcf86cd799439012',
            name: 'Pediatrics',
            description: 'Children healthcare department',
            createdAt: '2026-02-07T09:00:00.000Z',
            updatedAt: '2026-02-07T09:00:00.000Z',
          },
          {
            _id: '507f1f77bcf86cd799439013',
            name: 'Orthopedics',
            description: 'Bone and joint care department',
            createdAt: '2026-02-07T08:00:00.000Z',
            updatedAt: '2026-02-07T08:00:00.000Z',
          },
        ],
        message: {
          ar: 'تم استرجاع قائمة الأقسام بنجاح',
          en: 'Departments list retrieved successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
    schema: {
      example: {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: {
            ar: 'غير مصرح لك بالوصول',
            en: 'Unauthorized access',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
    schema: {
      example: {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: {
            ar: 'حدث خطأ في الخادم',
            en: 'Internal server error occurred',
          },
        },
      },
    },
  })
  async getAllDepartments(): Promise<Department[]> {
    return this.departmentService.getAllDepartments();
  }

  /**
   * Get department by ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get department by ID',
    description: `
      Retrieve detailed information about a specific department by its unique identifier.
      
      **Use Cases:**
      - Display department details in management dashboard
      - View department information before editing
      - Show department details in clinic/complex forms
      - Verify department existence and details
      
      **Response:**
      - Returns complete department information including:
        - Department ID, name, and description
        - Creation and update timestamps
        - All department metadata
      
      **Business Rules:**
      - Requires authentication
      - Department must exist in the system
      - Returns 404 if department not found
      
      **Note:** This endpoint returns basic department information.
      To see which complexes use this department, use GET /departments/complexes/:complexId/relationships
    `,
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Department unique identifier (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439011',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Department details retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          _id: '507f1f77bcf86cd799439011',
          name: 'Cardiology',
          description: 'Heart and cardiovascular system department',
          createdAt: '2026-02-07T10:00:00.000Z',
          updatedAt: '2026-02-07T10:00:00.000Z',
        },
        message: {
          ar: 'تم استرجاع تفاصيل القسم بنجاح',
          en: 'Department details retrieved successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid department ID format',
    schema: {
      example: {
        success: false,
        error: {
          code: 'INVALID_ID',
          message: {
            ar: 'معرف القسم غير صالح',
            en: 'Invalid department ID format',
          },
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
    schema: {
      example: {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: {
            ar: 'غير مصرح لك بالوصول',
            en: 'Unauthorized access',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
    schema: {
      example: {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: {
            ar: 'حدث خطأ في الخادم',
            en: 'Internal server error occurred',
          },
        },
      },
    },
  })
  async getDepartment(@Param('id') id: string): Promise<Department> {
    return this.departmentService.getDepartment(id);
  }

  /**
   * Update department
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update department information',
    description: `
      Update an existing department's information including name and description.
      
      **Use Cases:**
      - Update department name for rebranding or corrections
      - Modify department description for clarity
      - Update department information after organizational changes
      - Correct typos or improve descriptions
      
      **Request Body:**
      - name: New department name (optional, must be unique if provided)
      - description: New department description (optional)
      
      **Business Rules:**
      - Requires authentication and Admin/Owner role
      - Department must exist in the system
      - If name is updated, it must be unique across all departments
      - At least one field (name or description) must be provided
      - Name cannot be empty if provided
      - Description is optional
      - Update does not affect existing clinic or service linkages
      
      **Response:**
      - Returns the updated department with new values
      - Includes updated timestamp
      - Returns 200 status code on success
      
      **Important Notes:**
      - Updating a department name does not affect existing linkages
      - All clinics and services using this department will see the updated name
      - Consider the impact on reports and historical data before changing names
      - Description updates are safe and do not affect functionality
    `,
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Department unique identifier (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439011',
    required: true,
  })
  @ApiBody({
    type: UpdateDepartmentDto,
    description: 'Department update data (at least one field required)',
    examples: {
      updateName: {
        summary: 'Update Department Name',
        description: 'Update only the department name',
        value: {
          name: 'Cardiology & Vascular',
        },
      },
      updateDescription: {
        summary: 'Update Department Description',
        description: 'Update only the department description',
        value: {
          description:
            'Heart, cardiovascular system, and vascular surgery department',
        },
      },
      updateBoth: {
        summary: 'Update Name and Description',
        description: 'Update both name and description together',
        value: {
          name: 'Cardiology & Vascular Surgery',
          description:
            'Comprehensive heart, cardiovascular, and vascular surgery department',
        },
      },
      expandDescription: {
        summary: 'Expand Description',
        description: 'Add more details to existing description',
        value: {
          description:
            'Heart and cardiovascular system department specializing in cardiac care, interventional cardiology, and heart failure management',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Department updated successfully',
    schema: {
      example: {
        success: true,
        data: {
          _id: '507f1f77bcf86cd799439011',
          name: 'Cardiology & Vascular',
          description:
            'Heart, cardiovascular system, and vascular surgery department',
          createdAt: '2026-02-07T10:00:00.000Z',
          updatedAt: '2026-02-07T12:30:00.000Z',
        },
        message: {
          ar: 'تم تحديث القسم بنجاح',
          en: 'Department updated successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Validation error, invalid ID format, or department name already exists',
    schema: {
      oneOf: [
        {
          title: 'Validation Error - Empty Fields',
          example: {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: {
                ar: 'خطأ في التحقق من البيانات',
                en: 'Validation error',
              },
              details: {
                field: 'name',
                constraint: 'isNotEmpty',
                value: '',
              },
            },
          },
        },
        {
          title: 'Department Name Already Exists',
          example: {
            success: false,
            error: {
              code: 'DEPARTMENT_004',
              message: {
                ar: 'اسم القسم موجود بالفعل',
                en: 'Department name already exists',
              },
            },
          },
        },
        {
          title: 'Invalid Department ID',
          example: {
            success: false,
            error: {
              code: 'INVALID_ID',
              message: {
                ar: 'معرف القسم غير صالح',
                en: 'Invalid department ID format',
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
    schema: {
      example: {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: {
            ar: 'غير مصرح لك بالوصول',
            en: 'Unauthorized access',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User does not have permission (requires Admin or Owner role)',
    schema: {
      example: {
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: {
            ar: 'ليس لديك الصلاحيات الكافية (يتطلب دور مسؤول أو مالك)',
            en: 'Insufficient permissions (requires Admin or Owner role)',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
    schema: {
      example: {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: {
            ar: 'حدث خطأ في الخادم',
            en: 'Internal server error occurred',
          },
        },
      },
    },
  })
  async updateDepartment(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    updateDepartmentDto: UpdateDepartmentDto,
  ): Promise<Department> {
    return this.departmentService.updateDepartment(id, updateDepartmentDto);
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
   * Update department status
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update department status',
    description: `
      Update the status of a department to active or inactive.

      **Use Cases:**
      - Reactivate a previously deactivated department
      - Deactivate a department that has no linked clinics

      **Important:**
      - Cannot deactivate a department that has linked clinics
      - Use deactivate-with-transfer endpoint to deactivate department with clinics

      **Business Rules:**
      - Requires authentication and Admin/Owner role
      - Department must exist in the system
      - If deactivating, department must have no linked clinics
      - Valid status values: 'active', 'inactive'

      **Response:**
      - Returns updated department with new status
      - Returns 200 status code on success
    `,
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Department unique identifier (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439011',
    required: true,
  })
  @ApiBody({
    type: UpdateDepartmentStatusDto,
    description: 'Department status update data',
    examples: {
      activate: {
        summary: 'Activate Department',
        description: 'Set department status to active',
        value: {
          status: 'active',
        },
      },
      deactivate: {
        summary: 'Deactivate Department (No Clinics)',
        description: 'Set department status to inactive (only if no linked clinics)',
        value: {
          status: 'inactive',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Department status updated successfully',
    schema: {
      example: {
        success: true,
        data: {
          _id: '507f1f77bcf86cd799439011',
          name: 'Cardiology',
          description: 'Heart and cardiovascular system department',
          status: 'inactive',
          createdAt: '2026-02-07T10:00:00.000Z',
          updatedAt: '2026-02-21T14:30:00.000Z',
        },
        message: {
          ar: 'تم تحديث حالة القسم بنجاح',
          en: 'Department status updated successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot deactivate department with linked clinics',
    schema: {
      example: {
        success: false,
        error: {
          code: 'DEPARTMENT_001',
          message: {
            ar: 'لا يمكن إلغاء تفعيل القسم لأنه مرتبط بعيادات. استخدم endpoint إلغاء التفعيل مع النقل بدلاً من ذلك',
            en: 'Cannot deactivate department because it has linked clinics. Use deactivate-with-transfer endpoint instead',
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
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User does not have permission (requires Admin or Owner role)',
  })
  async updateDepartmentStatus(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    updateStatusDto: UpdateDepartmentStatusDto,
  ): Promise<Department> {
    return this.departmentService.updateDepartmentStatus(
      id,
      updateStatusDto.status,
    );
  }

  /**
   * Deactivate department with clinic transfer
   */
  @Post(':id/deactivate-with-transfer')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Deactivate department with clinic transfer',
    description: `
      Deactivate a department and transfer all its clinics to another active department.
      This ensures that clinics are not left without a department assignment.

      **Use Cases:**
      - Deactivate a department that has linked clinics
      - Reorganize clinic assignments by consolidating departments
      - Retire obsolete departments while preserving clinic operations

      **Process:**
      1. Validates source department exists and is active
      2. Validates target department exists and is active
      3. Finds all clinics linked to source department
      4. Transfers each clinic to target department (same complex)
      5. Updates source department status to 'inactive'
      6. Returns count of clinics transferred

      **Business Rules:**
      - Requires authentication and Admin/Owner role
      - Source department must be active
      - Target department must be active
      - Target department will be assigned to complexes as needed
      - All clinics in a complex will use target department's ComplexDepartment ID

      **Important Notes:**
      - This operation cannot be undone automatically
      - Clinics remain in their original complexes
      - Only the department assignment changes
      - If target department is not assigned to a complex, it will be assigned automatically
    `,
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Source department ID to deactivate (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439011',
    required: true,
  })
  @ApiBody({
    type: DeactivateWithTransferDto,
    description: 'Target department information',
    examples: {
      transfer: {
        summary: 'Transfer Clinics to Another Department',
        description: 'Deactivate department and transfer all clinics to target department',
        value: {
          targetDepartmentId: '507f1f77bcf86cd799439012',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Department deactivated and clinics transferred successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم إلغاء تفعيل القسم ونقل العيادات بنجاح',
          en: 'Department deactivated and clinics transferred successfully',
        },
        clinicsTransferred: 3,
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Source department is already inactive or target department is invalid',
    schema: {
      oneOf: [
        {
          title: 'Source Department Inactive',
          example: {
            success: false,
            error: {
              code: 'DEPARTMENT_005',
              message: {
                ar: 'القسم غير نشط',
                en: 'Department is inactive',
              },
            },
          },
        },
        {
          title: 'Target Department Inactive',
          example: {
            success: false,
            error: {
              code: 'DEPARTMENT_007',
              message: {
                ar: 'القسم المستهدف غير نشط',
                en: 'Target department is inactive',
              },
            },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Source or target department not found',
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
  async deactivateWithTransfer(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    deactivateDto: DeactivateWithTransferDto,
  ): Promise<DeactivateWithTransferResult> {
    return this.departmentService.deactivateWithTransfer(
      id,
      deactivateDto.targetDepartmentId,
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
   * Check department dependencies
   * Returns information about clinics using this department
   */
  @Get(':id/check-dependencies')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check department dependencies',
    description: `
      Check if a department has active clinics linked to it. This endpoint
      provides information about clinics using the department before attempting
      deactivation or transfer operations.

      **Use Cases:**
      - Before deactivating a department, check if it has active clinics
      - Display list of clinics that will need reassignment
      - UI can show warnings about affected clinics

      **Returns:**
      - hasActiveClinics: boolean indicating if department has active clinics
      - count: number of active clinics using this department
      - clinics: array of clinic details with complex information

      **Business Rules:**
      - Requires authentication and Admin/Owner role
      - Department must exist in the system
      - Only checks active clinics (excludes deleted/inactive)

      **Note:** This is a read-only operation for informational purposes.
    `,
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Department unique identifier (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439011',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dependencies check completed successfully',
    schema: {
      example: {
        success: true,
        data: {
          hasActiveClinics: true,
          count: 3,
          clinics: [
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
        },
        message: {
          ar: 'تم التحقق من التبعيات بنجاح',
          en: 'Dependencies checked successfully',
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
  async checkDependencies(
    @Param('id') id: string,
  ): Promise<CheckDependenciesResult> {
    return this.departmentService.checkDependencies(id);
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
