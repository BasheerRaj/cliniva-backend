import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Put,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  ValidationPipe,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { EmployeeService } from './employee.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeSearchQueryDto,
  CreateEmployeeDocumentDto,
  UpdateEmployeeDocumentDto,
  CreateEmployeeShiftDto,
  UpdateEmployeeShiftDto,
  BulkEmployeeActionDto,
  EmployeePerformanceDto,
  AssignEmployeeDto,
  EmployeeAttendanceDto,
  TerminateEmployeeDto,
} from './dto';
import { EMPLOYEE_SWAGGER_EXAMPLES } from './constants/swagger-examples';

@ApiTags('Employees')
@Controller('employees')
@UseGuards(JwtAuthGuard)
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  /**
   * Create a new employee
   * POST /employees
   */
  @ApiOperation({
    summary: 'Create new employee',
    description:
      'Creates a new employee with user account and employee profile. Generates unique employee number if not provided. Validates email and phone uniqueness, age requirements (minimum 16 years), and entity assignments.',
  })
  @ApiResponse({
    status: 201,
    description: 'Employee created successfully',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.CREATE_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation error - Invalid input data or business rule violation',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.FORBIDDEN,
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Email or employee number already exists',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.EMAIL_EXISTS,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @ApiBearerAuth()
  @ApiBody({ type: CreateEmployeeDto })
  @Post()
  async createEmployee(
    @Body(new ValidationPipe()) createEmployeeDto: CreateEmployeeDto,
    @Request() req: any,
  ) {
    try {
      const employee = await this.employeeService.createEmployee(
        createEmployeeDto,
        req.user?.userId,
      );
      return {
        success: true,
        message: 'Employee created successfully',
        data: employee,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create employee',
        error: error.message,
      };
    }
  }

  /**
   * Get all employees with filtering and pagination
   * GET /employees
   */
  @ApiOperation({
    summary: 'List employees with pagination',
    description:
      'Retrieves a paginated list of employees with optional filtering by name, email, role, job title, organization, complex, clinic, active status, and hiring date range. Supports search across multiple fields and sorting.',
  })
  @ApiResponse({
    status: 200,
    description: 'Employees retrieved successfully',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.LIST_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - Invalid query parameters',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @ApiBearerAuth()
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search across name, email, phone',
  })
  @ApiQuery({
    name: 'firstName',
    required: false,
    type: String,
    description: 'Filter by first name',
  })
  @ApiQuery({
    name: 'lastName',
    required: false,
    type: String,
    description: 'Filter by last name',
  })
  @ApiQuery({
    name: 'email',
    required: false,
    type: String,
    description: 'Filter by email',
  })
  @ApiQuery({
    name: 'employeeNumber',
    required: false,
    type: String,
    description: 'Filter by employee number',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: [
      'doctor',
      'nurse',
      'technician',
      'admin',
      'receptionist',
      'pharmacist',
      'therapist',
      'other',
    ],
    description: 'Filter by role',
  })
  @ApiQuery({
    name: 'jobTitle',
    required: false,
    type: String,
    description: 'Filter by job title',
  })
  @ApiQuery({
    name: 'organizationId',
    required: false,
    type: String,
    description: 'Filter by organization ID',
  })
  @ApiQuery({
    name: 'complexId',
    required: false,
    type: String,
    description: 'Filter by complex ID',
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
    description: 'Filter by active status',
  })
  @ApiQuery({
    name: 'dateHiredFrom',
    required: false,
    type: String,
    description: 'Filter by hiring date from (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'dateHiredTo',
    required: false,
    type: String,
    description: 'Filter by hiring date to (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Items per page',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    example: 'createdAt',
    description: 'Sort field',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    example: 'desc',
    description: 'Sort order',
  })
  @Get()
  async getEmployees(
    @Query(new ValidationPipe()) query: EmployeeSearchQueryDto,
  ) {
    try {
      const result = await this.employeeService.getEmployees(query);
      return {
        success: true,
        message: 'Employees retrieved successfully',
        data: result.employees,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit: parseInt(query.limit || '10'),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve employees',
        error: error.message,
      };
    }
  }

  /**
   * Get current user's employee profile
   * GET /employees/me
   */
  @ApiOperation({
    summary: 'Get current user employee profile',
    description:
      'Retrieves the authenticated user\'s employee profile including employee number, job title, salary, date of hiring, certifications, and documents.',
  })
  @ApiResponse({
    status: 200,
    description: 'Employee profile retrieved successfully',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.GET_SUCCESS,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Employee profile not found',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.NOT_FOUND,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @ApiBearerAuth()
  @Get('me')
  async getCurrentEmployeeProfile(@Request() req: any) {
    try {
      const userId = req.user?.id || req.user?.userId || req.user?.sub;
      if (!userId) {
        return {
          success: false,
          message: 'Failed to retrieve employee',
          error: 'User ID not found in token',
        };
      }

      const employee = await this.employeeService.getEmployeeById(userId);
      return {
        success: true,
        message: 'Employee profile retrieved successfully',
        data: employee,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve employee',
        error: error.message,
      };
    }
  }

  /**
   * Get employee by ID
   * GET /employees/:id
   */
  @ApiOperation({
    summary: 'Get employee by ID',
    description:
      'Retrieves detailed employee information including user account, employee profile, shifts, documents, and associated organization/complex/clinic. Returns complete employee data with all relationships populated.',
  })
  @ApiResponse({
    status: 200,
    description: 'Employee retrieved successfully',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.GET_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - Invalid employee ID format',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Employee not found',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.NOT_FOUND,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'Employee ID (MongoDB ObjectId)',
    type: String,
  })
  @Get(':id')
  async getEmployee(@Param('id') id: string) {
    try {
      const employee = await this.employeeService.getEmployeeById(id);
      return {
        success: true,
        message: 'Employee retrieved successfully',
        data: employee,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve employee',
        error: error.message,
      };
    }
  }

  /**
   * Update employee information
   * PUT /employees/:id
   */
  @ApiOperation({
    summary: 'Update employee',
    description:
      'Updates employee information including user account details and employee profile. Validates uniqueness constraints and business rules. Supports partial updates.',
  })
  @ApiResponse({
    status: 200,
    description: 'Employee updated successfully',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.UPDATE_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - Invalid input data',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.FORBIDDEN,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Employee not found',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.NOT_FOUND,
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Email or phone already exists',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.EMAIL_EXISTS,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'Employee ID (MongoDB ObjectId)',
    type: String,
  })
  @ApiBody({ type: UpdateEmployeeDto })
  @Put(':id')
  async updateEmployee(
    @Param('id') id: string,
    @Body(new ValidationPipe()) updateEmployeeDto: UpdateEmployeeDto,
    @Request() req: any,
  ) {
    try {
      const employee = await this.employeeService.updateEmployee(
        id,
        updateEmployeeDto,
        req.user?.userId,
      );
      return {
        success: true,
        message: 'Employee updated successfully',
        data: employee,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update employee',
        error: error.message,
      };
    }
  }

  /**
   * Soft delete employee
   * DELETE /employees/:id
   */
  @ApiOperation({
    summary: 'Delete employee',
    description:
      'Soft deletes an employee by deactivating the user account, employee profile, and all associated shifts. Employee data is retained but marked as inactive. Users cannot delete their own account.',
  })
  @ApiResponse({
    status: 200,
    description: 'Employee deleted successfully',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.DELETE_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - Cannot delete own account',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.CANNOT_DELETE_SELF,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.FORBIDDEN,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Employee not found',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.NOT_FOUND,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'Employee ID (MongoDB ObjectId)',
    type: String,
  })
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteEmployee(@Param('id') id: string, @Request() req: any) {
    try {
      const result = await this.employeeService.deleteEmployee(
        id,
        req.user?.userId,
      );
      return result;
    } catch (error) {
      return {
        success: false,
        message: 'Failed to delete employee',
        error: error.message,
      };
    }
  }

  /**
   * Terminate employee
   * POST /employees/:id/terminate
   */
  @ApiOperation({
    summary: 'Terminate employee',
    description:
      'Terminates an employee with specified termination date, type, and reason. Marks employee as inactive and records termination details. Supports different termination types including resignation, termination, retirement, and layoff.',
  })
  @ApiResponse({
    status: 200,
    description: 'Employee terminated successfully',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.TERMINATE_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - Invalid input data',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.FORBIDDEN,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Employee not found',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.NOT_FOUND,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'Employee ID (MongoDB ObjectId)',
    type: String,
  })
  @ApiBody({ type: TerminateEmployeeDto })
  @Post(':id/terminate')
  async terminateEmployee(
    @Param('id') id: string,
    @Body(new ValidationPipe()) terminateDto: TerminateEmployeeDto,
    @Request() req: any,
  ) {
    try {
      const employee = await this.employeeService.terminateEmployee(
        id,
        terminateDto,
        req.user?.userId,
      );
      return {
        success: true,
        message: 'Employee terminated successfully',
        data: employee,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to terminate employee',
        error: error.message,
      };
    }
  }

  /**
   * Get employee by employee number
   * GET /employees/number/:employeeNumber
   */
  @ApiOperation({
    summary: 'Get employee by employee number',
    description:
      'Retrieves employee information using their unique employee number. Returns complete employee data including profile, shifts, and documents.',
  })
  @ApiResponse({
    status: 200,
    description: 'Employee retrieved successfully',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.GET_SUCCESS,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Employee not found',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.NOT_FOUND,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'employeeNumber',
    description: 'Unique employee number',
    type: String,
    example: 'EMP20260001',
  })
  @Get('number/:employeeNumber')
  async getEmployeeByNumber(@Param('employeeNumber') employeeNumber: string) {
    try {
      const employee =
        await this.employeeService.getEmployeeByNumber(employeeNumber);
      return {
        success: true,
        message: 'Employee retrieved successfully',
        data: employee,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve employee',
        error: error.message,
      };
    }
  }

  /**
   * Search employees
   * GET /employees/search/query?q=searchTerm
   */
  @ApiOperation({
    summary: 'Search employees',
    description:
      'Performs full-text search across employee names, emails, phone numbers, and employee numbers. Returns matching employees with configurable result limit.',
  })
  @ApiResponse({
    status: 200,
    description: 'Search completed successfully',
    schema: {
      example: {
        success: true,
        message: { ar: 'تم البحث بنجاح', en: 'Search completed successfully' },
        data: [EMPLOYEE_SWAGGER_EXAMPLES.GET_SUCCESS.data],
        count: 1,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - Search term required',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @ApiBearerAuth()
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    description: 'Search term',
    example: 'John',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum results to return',
    example: 20,
  })
  @Get('search/query')
  async searchEmployees(
    @Query('q') searchTerm: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        throw new BadRequestException('Search term is required');
      }

      const employees = await this.employeeService.searchEmployees(
        searchTerm,
        limit || 20,
      );

      return {
        success: true,
        message: 'Search completed successfully',
        data: employees,
        count: employees.length,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Search failed',
        error: error.message,
      };
    }
  }

  /**
   * Get employee statistics
   * GET /employees/stats/overview
   */
  @ApiOperation({
    summary: 'Get employee statistics',
    description:
      'Retrieves comprehensive employee statistics including total counts, role distribution, salary analytics, hiring trends, and upcoming document expirations. Provides insights for workforce management and planning.',
  })
  @ApiResponse({
    status: 200,
    description: 'Employee statistics retrieved successfully',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.STATS_SUCCESS,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @ApiBearerAuth()
  @Get('stats/overview')
  async getEmployeeStats() {
    try {
      const stats = await this.employeeService.getEmployeeStats();
      return {
        success: true,
        message: 'Employee statistics retrieved successfully',
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve employee statistics',
        error: error.message,
      };
    }
  }

  /**
   * Get employees by role
   * GET /employees/role/:role
   */
  @ApiOperation({
    summary: 'Get employees by role',
    description:
      'Retrieves paginated list of employees filtered by their role (doctor, nurse, technician, admin, receptionist, pharmacist, therapist, other).',
  })
  @ApiResponse({
    status: 200,
    description: 'Employees retrieved successfully',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.LIST_SUCCESS,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'role',
    description: 'Employee role',
    enum: [
      'doctor',
      'nurse',
      'technician',
      'admin',
      'receptionist',
      'pharmacist',
      'therapist',
      'other',
    ],
    example: 'doctor',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Items per page',
  })
  @Get('role/:role')
  async getEmployeesByRole(
    @Param('role') role: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const query: EmployeeSearchQueryDto = {
        role,
        page: page || '1',
        limit: limit || '10',
      };

      const result = await this.employeeService.getEmployees(query);
      return {
        success: true,
        message: `Employees with role '${role}' retrieved successfully`,
        data: result.employees,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve employees by role',
        error: error.message,
      };
    }
  }

  /**
   * Get active employees
   * GET /employees/status/active
   */
  @ApiOperation({
    summary: 'Get active employees',
    description:
      'Retrieves paginated list of all active employees (isActive = true). Excludes terminated and inactive employees.',
  })
  @ApiResponse({
    status: 200,
    description: 'Active employees retrieved successfully',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.LIST_SUCCESS,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @ApiBearerAuth()
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Items per page',
  })
  @Get('status/active')
  async getActiveEmployees(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const query: EmployeeSearchQueryDto = {
        isActive: true,
        page: page || '1',
        limit: limit || '10',
      };

      const result = await this.employeeService.getEmployees(query);
      return {
        success: true,
        message: 'Active employees retrieved successfully',
        data: result.employees,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve active employees',
        error: error.message,
      };
    }
  }

  /**
   * Get inactive employees
   * GET /employees/status/inactive
   */
  @ApiOperation({
    summary: 'Get inactive employees',
    description:
      'Retrieves paginated list of all inactive employees (isActive = false). Includes terminated and deactivated employees.',
  })
  @ApiResponse({
    status: 200,
    description: 'Inactive employees retrieved successfully',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.LIST_SUCCESS,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @ApiBearerAuth()
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Items per page',
  })
  @Get('status/inactive')
  async getInactiveEmployees(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const query: EmployeeSearchQueryDto = {
        isActive: false,
        page: page || '1',
        limit: limit || '10',
      };

      const result = await this.employeeService.getEmployees(query);
      return {
        success: true,
        message: 'Inactive employees retrieved successfully',
        data: result.employees,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve inactive employees',
        error: error.message,
      };
    }
  }

  /**
   * Get employees hired in date range
   * GET /employees/hired/date-range?from=YYYY-MM-DD&to=YYYY-MM-DD
   */
  @ApiOperation({
    summary: 'Get employees hired in date range',
    description:
      'Retrieves paginated list of employees hired within a specified date range. Useful for tracking hiring trends and onboarding cohorts.',
  })
  @ApiResponse({
    status: 200,
    description: 'Employees retrieved successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم استرجاع الموظفين بنجاح',
          en: 'Employees hired in date range retrieved successfully',
        },
        data: [EMPLOYEE_SWAGGER_EXAMPLES.GET_SUCCESS.data],
        pagination: { total: 1, page: 1, totalPages: 1 },
        dateRange: { from: '2024-01-01', to: '2024-12-31' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - Both from and to dates required',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @ApiBearerAuth()
  @ApiQuery({
    name: 'from',
    required: true,
    type: String,
    description: 'Start date (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'to',
    required: true,
    type: String,
    description: 'End date (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 20,
    description: 'Items per page',
  })
  @Get('hired/date-range')
  async getEmployeesHiredInRange(
    @Query('from') dateFrom: string,
    @Query('to') dateTo: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      if (!dateFrom || !dateTo) {
        throw new BadRequestException(
          'Both from and to date parameters are required',
        );
      }

      const query: EmployeeSearchQueryDto = {
        dateHiredFrom: dateFrom,
        dateHiredTo: dateTo,
        page: page || '1',
        limit: limit || '20',
      };

      const result = await this.employeeService.getEmployees(query);
      return {
        success: true,
        message: 'Employees hired in date range retrieved successfully',
        data: result.employees,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
        },
        dateRange: {
          from: dateFrom,
          to: dateTo,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve employees by hiring date range',
        error: error.message,
      };
    }
  }

  /**
   * Bulk employee actions
   * POST /employees/bulk-action
   */
  @ApiOperation({
    summary: 'Perform bulk actions on employees',
    description:
      'Executes bulk operations on multiple employees simultaneously. Supports actions: activate, deactivate, terminate, export. Useful for batch processing and administrative tasks.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk action completed successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تمت العملية الجماعية بنجاح',
          en: 'Bulk action completed',
        },
        data: {
          processedCount: 5,
          successCount: 5,
          failedCount: 0,
          action: 'activate',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - Invalid action or employee IDs',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.FORBIDDEN,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @ApiBearerAuth()
  @ApiBody({ type: BulkEmployeeActionDto })
  @Post('bulk-action')
  async bulkEmployeeAction(
    @Body(new ValidationPipe()) bulkActionDto: BulkEmployeeActionDto,
    @Request() req: any,
  ) {
    try {
      const result = await this.employeeService.bulkEmployeeAction(
        bulkActionDto,
        req.user?.userId,
      );
      return {
        success: true,
        message: 'Bulk action completed',
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Bulk action failed',
        error: error.message,
      };
    }
  }

  // Employee Documents Management

  /**
   * Create employee document
   * POST /employees/:id/documents
   */
  @ApiOperation({
    summary: 'Create employee document',
    description:
      'Uploads and registers a new document for an employee. Supports various document types including contracts, certificates, licenses, work permits, and insurance documents. Tracks expiry dates and verification status.',
  })
  @ApiResponse({
    status: 201,
    description: 'Employee document created successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم إنشاء مستند الموظف بنجاح',
          en: 'Employee document created successfully',
        },
        data: {
          _id: '507f1f77bcf86cd799439014',
          userId: '507f1f77bcf86cd799439011',
          documentType: 'license',
          documentName: 'Medical License',
          fileUrl: 'https://example.com/documents/license.pdf',
          status: 'active',
          expiryDate: '2027-12-31T00:00:00.000Z',
          isVerified: false,
          createdAt: '2026-02-07T10:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - Invalid input data',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Employee not found',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.NOT_FOUND,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'Employee ID (MongoDB ObjectId)',
    type: String,
  })
  @ApiBody({ type: CreateEmployeeDocumentDto })
  @Post(':id/documents')
  async createEmployeeDocument(
    @Param('id') employeeId: string,
    @Body(new ValidationPipe()) createDocumentDto: CreateEmployeeDocumentDto,
    @Request() req: any,
  ) {
    try {
      // Ensure the document is for the correct employee
      createDocumentDto.userId = employeeId;

      // Get the authenticated user ID (JWT strategy returns 'id' property)
      const uploadedByUserId = req.user?.id;

      const document = await this.employeeService.createEmployeeDocument(
        createDocumentDto,
        uploadedByUserId,
      );
      return {
        success: true,
        message: {
          ar: 'تم إنشاء مستند الموظف بنجاح',
          en: 'Employee document created successfully',
        },
        data: document,
      };
    } catch (error) {
      return {
        success: false,
        message: {
          ar: 'فشل في إنشاء مستند الموظف',
          en: 'Failed to create employee document',
        },
        error: error.message,
      };
    }
  }

  /**
   * Get employee documents
   * GET /employees/:id/documents
   */
  @ApiOperation({
    summary: 'Get employee documents',
    description:
      'Retrieves all documents associated with an employee including contracts, certificates, licenses, and other employment-related documents. Returns document metadata and status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Employee documents retrieved successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم استرجاع مستندات الموظف بنجاح',
          en: 'Employee documents retrieved successfully',
        },
        data: [
          {
            _id: '507f1f77bcf86cd799439014',
            documentType: 'license',
            documentName: 'Medical License',
            fileUrl: 'https://example.com/documents/license.pdf',
            status: 'active',
            expiryDate: '2027-12-31T00:00:00.000Z',
            isVerified: true,
          },
        ],
        count: 1,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Employee not found',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.NOT_FOUND,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'Employee ID (MongoDB ObjectId)',
    type: String,
  })
  @Get(':id/documents')
  async getEmployeeDocuments(@Param('id') employeeId: string) {
    try {
      const documents =
        await this.employeeService.getEmployeeDocuments(employeeId);
      return {
        success: true,
        message: 'Employee documents retrieved successfully',
        data: documents,
        count: documents.length,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve employee documents',
        error: error.message,
      };
    }
  }

  /**
   * Update employee document
   * PUT /employees/documents/:documentId
   */
  @ApiOperation({
    summary: 'Update employee document',
    description:
      'Updates employee document information including name, expiry date, status, and verification status. Supports partial updates.',
  })
  @ApiResponse({
    status: 200,
    description: 'Employee document updated successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم تحديث مستند الموظف بنجاح',
          en: 'Employee document updated successfully',
        },
        data: {
          _id: '507f1f77bcf86cd799439014',
          documentType: 'license',
          documentName: 'Updated Medical License',
          status: 'active',
          isVerified: true,
          updatedAt: '2026-02-07T11:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - Invalid input data',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.NOT_FOUND,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'documentId',
    description: 'Document ID (MongoDB ObjectId)',
    type: String,
  })
  @ApiBody({ type: UpdateEmployeeDocumentDto })
  @Put('documents/:documentId')
  async updateEmployeeDocument(
    @Param('documentId') documentId: string,
    @Body(new ValidationPipe()) updateDocumentDto: UpdateEmployeeDocumentDto,
    @Request() req: any,
  ) {
    try {
      const document = await this.employeeService.updateEmployeeDocument(
        documentId,
        updateDocumentDto,
        req.user?.userId,
      );
      return {
        success: true,
        message: 'Employee document updated successfully',
        data: document,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update employee document',
        error: error.message,
      };
    }
  }

  /**
   * Create employee shift
   * POST /employees/:id/shifts
   */
  @ApiOperation({
    summary: 'Create employee shift',
    description:
      'Creates a new work shift schedule for an employee. Defines shift name, day of week, start/end times, and break duration. Shifts can be assigned at organization, complex, or clinic level.',
  })
  @ApiResponse({
    status: 201,
    description: 'Employee shift created successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم إنشاء وردية الموظف بنجاح',
          en: 'Employee shift created successfully',
        },
        data: {
          _id: '507f1f77bcf86cd799439013',
          userId: '507f1f77bcf86cd799439011',
          shiftName: 'Morning Shift',
          dayOfWeek: 'monday',
          startTime: '08:00',
          endTime: '16:00',
          breakDurationMinutes: 60,
          entityType: 'clinic',
          entityId: '507f1f77bcf86cd799439020',
          isActive: true,
          createdAt: '2026-02-07T10:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - Invalid shift data',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Employee not found',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.NOT_FOUND,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'Employee ID (MongoDB ObjectId)',
    type: String,
  })
  @ApiBody({ type: CreateEmployeeShiftDto })
  @Post(':id/shifts')
  async createEmployeeShift(
    @Param('id') employeeId: string,
    @Body(new ValidationPipe()) createShiftDto: CreateEmployeeShiftDto,
  ) {
    try {
      // Ensure the shift is for the correct employee
      createShiftDto.userId = employeeId;

      const shift =
        await this.employeeService.createEmployeeShift(createShiftDto);
      return {
        success: true,
        message: 'Employee shift created successfully',
        data: shift,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create employee shift',
        error: error.message,
      };
    }
  }

  /**
   * Get employee shifts
   * GET /employees/:id/shifts
   */
  @ApiOperation({
    summary: 'Get employee shifts',
    description:
      'Retrieves all work shift schedules for an employee. Returns shift details including day, time, break duration, and assignment location.',
  })
  @ApiResponse({
    status: 200,
    description: 'Employee shifts retrieved successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم استرجاع ورديات الموظف بنجاح',
          en: 'Employee shifts retrieved successfully',
        },
        data: [
          {
            _id: '507f1f77bcf86cd799439013',
            shiftName: 'Morning Shift',
            dayOfWeek: 'monday',
            startTime: '08:00',
            endTime: '16:00',
            breakDurationMinutes: 60,
            entityType: 'clinic',
            entityId: '507f1f77bcf86cd799439020',
            isActive: true,
          },
        ],
        count: 1,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Employee not found',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.NOT_FOUND,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'Employee ID (MongoDB ObjectId)',
    type: String,
  })
  @Get(':id/shifts')
  async getEmployeeShifts(@Param('id') employeeId: string) {
    try {
      const shifts = await this.employeeService.getEmployeeShifts(employeeId);
      return {
        success: true,
        message: 'Employee shifts retrieved successfully',
        data: shifts,
        count: shifts.length,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve employee shifts',
        error: error.message,
      };
    }
  }

  /**
   * Get employees by organization
   * GET /employees/organization/:organizationId
   */
  @ApiOperation({
    summary: 'Get employees by organization',
    description:
      'Retrieves paginated list of all employees assigned to a specific organization. Useful for organization-level employee management.',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization employees retrieved successfully',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.LIST_SUCCESS,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.NOT_FOUND,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'organizationId',
    description: 'Organization ID (MongoDB ObjectId)',
    type: String,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Items per page',
  })
  @Get('organization/:organizationId')
  async getEmployeesByOrganization(
    @Param('organizationId') organizationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const query: EmployeeSearchQueryDto = {
        organizationId,
        page: page || '1',
        limit: limit || '10',
      };

      const result = await this.employeeService.getEmployees(query);
      return {
        success: true,
        message: 'Organization employees retrieved successfully',
        data: result.employees,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve organization employees',
        error: error.message,
      };
    }
  }

  /**
   * Get employees by complex
   * GET /employees/complex/:complexId
   */
  @ApiOperation({
    summary: 'Get employees by complex',
    description:
      'Retrieves paginated list of all employees assigned to a specific medical complex. Useful for complex-level employee management.',
  })
  @ApiResponse({
    status: 200,
    description: 'Complex employees retrieved successfully',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.LIST_SUCCESS,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Complex not found',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.NOT_FOUND,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'complexId',
    description: 'Complex ID (MongoDB ObjectId)',
    type: String,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Items per page',
  })
  @Get('complex/:complexId')
  async getEmployeesByComplex(
    @Param('complexId') complexId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const query: EmployeeSearchQueryDto = {
        complexId,
        page: page || '1',
        limit: limit || '10',
      };

      const result = await this.employeeService.getEmployees(query);
      return {
        success: true,
        message: 'Complex employees retrieved successfully',
        data: result.employees,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve complex employees',
        error: error.message,
      };
    }
  }

  /**
   * Get employees by clinic
   * GET /employees/clinic/:clinicId
   */
  @ApiOperation({
    summary: 'Get employees by clinic',
    description:
      'Retrieves paginated list of all employees assigned to a specific clinic. Useful for clinic-level employee management and scheduling.',
  })
  @ApiResponse({
    status: 200,
    description: 'Clinic employees retrieved successfully',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.LIST_SUCCESS,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Clinic not found',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.NOT_FOUND,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'clinicId',
    description: 'Clinic ID (MongoDB ObjectId)',
    type: String,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Items per page',
  })
  @Get('clinic/:clinicId')
  async getEmployeesByClinic(
    @Param('clinicId') clinicId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const query: EmployeeSearchQueryDto = {
        clinicId,
        page: page || '1',
        limit: limit || '10',
      };

      const result = await this.employeeService.getEmployees(query);
      return {
        success: true,
        message: 'Clinic employees retrieved successfully',
        data: result.employees,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve clinic employees',
        error: error.message,
      };
    }
  }

  /**
   * Get employee analytics by role
   * GET /employees/analytics/roles
   */
  @ApiOperation({
    summary: 'Get employee role analytics',
    description:
      'Retrieves analytics on employee distribution by role. Shows count and percentage for each role type (doctor, nurse, technician, etc.). Useful for workforce planning and resource allocation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Employee role analytics retrieved successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم استرجاع تحليلات أدوار الموظفين بنجاح',
          en: 'Employee role analytics retrieved successfully',
        },
        data: {
          employeesByRole: [
            { role: 'doctor', count: 45, percentage: 30 },
            { role: 'nurse', count: 60, percentage: 40 },
            { role: 'admin', count: 20, percentage: 13.3 },
            { role: 'technician', count: 25, percentage: 16.7 },
          ],
          totalEmployees: 150,
          analysisDate: '2026-02-07T10:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @ApiBearerAuth()
  @Get('analytics/roles')
  async getEmployeeRoleAnalytics() {
    try {
      const stats = await this.employeeService.getEmployeeStats();

      return {
        success: true,
        message: 'Employee role analytics retrieved successfully',
        data: {
          employeesByRole: stats.employeesByRole,
          totalEmployees: stats.totalEmployees,
          analysisDate: new Date(),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve role analytics',
        error: error.message,
      };
    }
  }

  /**
   * Get employee salary analytics
   * GET /employees/analytics/salary
   */
  @ApiOperation({
    summary: 'Get employee salary analytics',
    description:
      'Retrieves salary statistics including average, median, and salary ranges by role. Provides insights for compensation planning and budget management.',
  })
  @ApiResponse({
    status: 200,
    description: 'Employee salary analytics retrieved successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم استرجاع تحليلات رواتب الموظفين بنجاح',
          en: 'Employee salary analytics retrieved successfully',
        },
        data: {
          salaryStatistics: {
            averageSalary: 18500,
            medianSalary: 16000,
            salaryRangeByRole: [
              {
                role: 'doctor',
                minSalary: 20000,
                maxSalary: 50000,
                averageSalary: 32000,
              },
              {
                role: 'nurse',
                minSalary: 8000,
                maxSalary: 18000,
                averageSalary: 12000,
              },
            ],
          },
          analysisDate: '2026-02-07T10:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @ApiBearerAuth()
  @Get('analytics/salary')
  async getEmployeeSalaryAnalytics() {
    try {
      const stats = await this.employeeService.getEmployeeStats();

      return {
        success: true,
        message: 'Employee salary analytics retrieved successfully',
        data: {
          salaryStatistics: stats.salaryStatistics,
          analysisDate: new Date(),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve salary analytics',
        error: error.message,
      };
    }
  }

  /**
   * Get hiring trends
   * GET /employees/analytics/hiring-trends
   */
  @ApiOperation({
    summary: 'Get hiring trends',
    description:
      'Retrieves hiring trend analytics including monthly hiring patterns, new hires this month/year. Useful for workforce growth analysis and recruitment planning.',
  })
  @ApiResponse({
    status: 200,
    description: 'Hiring trends retrieved successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم استرجاع اتجاهات التوظيف بنجاح',
          en: 'Hiring trends retrieved successfully',
        },
        data: {
          monthlyHiringTrend: [
            { month: '2026-01', count: 12 },
            { month: '2026-02', count: 8 },
          ],
          newHiresThisMonth: 8,
          newHiresThisYear: 45,
          analysisDate: '2026-02-07T10:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @ApiBearerAuth()
  @Get('analytics/hiring-trends')
  async getHiringTrends() {
    try {
      const stats = await this.employeeService.getEmployeeStats();

      return {
        success: true,
        message: 'Hiring trends retrieved successfully',
        data: {
          monthlyHiringTrend: stats.monthlyHiringTrend,
          newHiresThisMonth: stats.newHiresThisMonth,
          newHiresThisYear: stats.newHiresThisYear,
          analysisDate: new Date(),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve hiring trends',
        error: error.message,
      };
    }
  }

  /**
   * Get upcoming document expirations
   * GET /employees/documents/expiring?days=30
   */
  @ApiOperation({
    summary: 'Get upcoming document expirations',
    description:
      'Retrieves list of employee documents expiring within specified number of days. Helps track and renew important documents like licenses, certificates, and work permits before expiration.',
  })
  @ApiResponse({
    status: 200,
    description: 'Upcoming document expirations retrieved successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم استرجاع المستندات المنتهية الصلاحية قريبًا بنجاح',
          en: 'Upcoming document expirations retrieved successfully',
        },
        data: {
          upcomingExpirations: [
            {
              employeeId: '507f1f77bcf86cd799439011',
              employeeName: 'John Doe',
              documentType: 'license',
              expiryDate: '2026-03-15T00:00:00.000Z',
              daysUntilExpiry: 36,
            },
          ],
          count: 1,
          daysAhead: 30,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @ApiBearerAuth()
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days ahead to check',
    example: 30,
  })
  @Get('documents/expiring')
  async getUpcomingDocumentExpirations(
    @Query('days', new ParseIntPipe({ optional: true })) days?: number,
  ) {
    try {
      const stats = await this.employeeService.getEmployeeStats();

      return {
        success: true,
        message: 'Upcoming document expirations retrieved successfully',
        data: {
          upcomingExpirations: stats.upcomingDocumentExpirations,
          count: stats.upcomingDocumentExpirations.length,
          daysAhead: days || 30,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve document expirations',
        error: error.message,
      };
    }
  }

  /**
   * Get employee birthday list
   * GET /employees/birthdays/upcoming?days=30
   */
  @ApiOperation({
    summary: 'Get upcoming employee birthdays',
    description:
      'Retrieves list of employees with birthdays within specified number of days. Useful for employee engagement and celebration planning.',
  })
  @ApiResponse({
    status: 200,
    description: 'Upcoming employee birthdays retrieved successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم استرجاع أعياد ميلاد الموظفين القادمة بنجاح',
          en: 'Upcoming employee birthdays retrieved successfully',
        },
        data: [],
        count: 0,
        message_note:
          'Birthday tracking functionality would be implemented here',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @ApiBearerAuth()
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days ahead to check',
    example: 30,
  })
  @Get('birthdays/upcoming')
  async getUpcomingBirthdays(
    @Query('days', new ParseIntPipe({ optional: true })) days?: number,
  ) {
    try {
      // This would be implemented similar to the patient birthdays functionality
      // For now, return a placeholder response
      return {
        success: true,
        message: 'Upcoming employee birthdays retrieved successfully',
        data: [],
        count: 0,
        message_note:
          'Birthday tracking functionality would be implemented here',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve upcoming birthdays',
        error: error.message,
      };
    }
  }

  /**
   * Export employees data
   * GET /employees/export/data?format=csv
   */
  @ApiOperation({
    summary: 'Export employees data',
    description:
      'Exports employee data in specified format (CSV, Excel, JSON). Supports filtering to export specific employee subsets. Returns up to 1000 records per export.',
  })
  @ApiResponse({
    status: 200,
    description: 'Employee export prepared successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم تحضير تصدير الموظفين بنجاح',
          en: 'Employee export prepared successfully',
        },
        data: {
          employees: [EMPLOYEE_SWAGGER_EXAMPLES.GET_SUCCESS.data],
          totalExported: 1,
          format: 'csv',
          exportDate: '2026-02-07T10:00:00.000Z',
          message: 'Export functionality would generate CSV/Excel file here',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      example: EMPLOYEE_SWAGGER_EXAMPLES.INTERNAL_ERROR,
    },
  })
  @ApiBearerAuth()
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['csv', 'excel', 'json'],
    description: 'Export format',
    example: 'csv',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search filter',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: [
      'doctor',
      'nurse',
      'technician',
      'admin',
      'receptionist',
      'pharmacist',
      'therapist',
      'other',
    ],
    description: 'Role filter',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Active status filter',
  })
  @Get('export/data')
  async exportEmployeesData(
    @Query('format') format?: string,
    @Query() filters?: EmployeeSearchQueryDto,
  ) {
    try {
      // This would implement actual CSV/Excel export
      const result = await this.employeeService.getEmployees({
        ...filters,
        limit: '1000', // Export more records
      });

      return {
        success: true,
        message: 'Employee export prepared successfully',
        data: {
          employees: result.employees,
          totalExported: result.total,
          format: format || 'json',
          exportDate: new Date(),
          message: 'Export functionality would generate CSV/Excel file here',
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to export employees data',
        error: error.message,
      };
    }
  }
}
