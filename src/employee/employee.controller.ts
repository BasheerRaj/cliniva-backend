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

@Controller('employees')
@UseGuards(JwtAuthGuard)
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  /**
   * Create a new employee
   * POST /employees
   */
  @Post()
  async createEmployee(
    @Body(new ValidationPipe()) createEmployeeDto: CreateEmployeeDto,
    @Request() req: any
  ) {
    try {
      const employee = await this.employeeService.createEmployee(
        createEmployeeDto,
        req.user?.userId
      );
      return {
        success: true,
        message: 'Employee created successfully',
        data: employee
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create employee',
        error: error.message
      };
    }
  }

  /**
   * Get all employees with filtering and pagination
   * GET /employees
   */
  @Get()
  async getEmployees(@Query(new ValidationPipe()) query: EmployeeSearchQueryDto) {
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
          limit: parseInt(query.limit || '10')
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve employees',
        error: error.message
      };
    }
  }

  /**
   * Get employee by ID
   * GET /employees/:id
   */
  @Get(':id')
  async getEmployee(@Param('id') id: string) {
    try {
      const employee = await this.employeeService.getEmployeeById(id);
      return {
        success: true,
        message: 'Employee retrieved successfully',
        data: employee
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve employee',
        error: error.message
      };
    }
  }

  /**
   * Update employee information
   * PUT /employees/:id
   */
  @Put(':id')
  async updateEmployee(
    @Param('id') id: string,
    @Body(new ValidationPipe()) updateEmployeeDto: UpdateEmployeeDto,
    @Request() req: any
  ) {
    try {
      const employee = await this.employeeService.updateEmployee(
        id,
        updateEmployeeDto,
        req.user?.userId
      );
      return {
        success: true,
        message: 'Employee updated successfully',
        data: employee
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update employee',
        error: error.message
      };
    }
  }

  /**
   * Soft delete employee
   * DELETE /employees/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteEmployee(@Param('id') id: string, @Request() req: any) {
    try {
      const result = await this.employeeService.deleteEmployee(id, req.user?.userId);
      return result;
    } catch (error) {
      return {
        success: false,
        message: 'Failed to delete employee',
        error: error.message
      };
    }
  }

  /**
   * Terminate employee
   * POST /employees/:id/terminate
   */
  @Post(':id/terminate')
  async terminateEmployee(
    @Param('id') id: string,
    @Body(new ValidationPipe()) terminateDto: TerminateEmployeeDto,
    @Request() req: any
  ) {
    try {
      const employee = await this.employeeService.terminateEmployee(
        id,
        terminateDto,
        req.user?.userId
      );
      return {
        success: true,
        message: 'Employee terminated successfully',
        data: employee
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to terminate employee',
        error: error.message
      };
    }
  }

  /**
   * Get employee by employee number
   * GET /employees/number/:employeeNumber
   */
  @Get('number/:employeeNumber')
  async getEmployeeByNumber(@Param('employeeNumber') employeeNumber: string) {
    try {
      const employee = await this.employeeService.getEmployeeByNumber(employeeNumber);
      return {
        success: true,
        message: 'Employee retrieved successfully',
        data: employee
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve employee',
        error: error.message
      };
    }
  }

  /**
   * Search employees
   * GET /employees/search/query?q=searchTerm
   */
  @Get('search/query')
  async searchEmployees(
    @Query('q') searchTerm: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number
  ) {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        throw new BadRequestException('Search term is required');
      }

      const employees = await this.employeeService.searchEmployees(
        searchTerm,
        limit || 20
      );

      return {
        success: true,
        message: 'Search completed successfully',
        data: employees,
        count: employees.length
      };
    } catch (error) {
      return {
        success: false,
        message: 'Search failed',
        error: error.message
      };
    }
  }

  /**
   * Get employee statistics
   * GET /employees/stats/overview
   */
  @Get('stats/overview')
  async getEmployeeStats() {
    try {
      const stats = await this.employeeService.getEmployeeStats();
      return {
        success: true,
        message: 'Employee statistics retrieved successfully',
        data: stats
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve employee statistics',
        error: error.message
      };
    }
  }

  /**
   * Get employees by role
   * GET /employees/role/:role
   */
  @Get('role/:role')
  async getEmployeesByRole(
    @Param('role') role: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    try {
      const query: EmployeeSearchQueryDto = {
        role,
        page: page || '1',
        limit: limit || '10'
      };

      const result = await this.employeeService.getEmployees(query);
      return {
        success: true,
        message: `Employees with role '${role}' retrieved successfully`,
        data: result.employees,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve employees by role',
        error: error.message
      };
    }
  }

  /**
   * Get active employees
   * GET /employees/status/active
   */
  @Get('status/active')
  async getActiveEmployees(
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    try {
      const query: EmployeeSearchQueryDto = {
        isActive: true,
        page: page || '1',
        limit: limit || '10'
      };

      const result = await this.employeeService.getEmployees(query);
      return {
        success: true,
        message: 'Active employees retrieved successfully',
        data: result.employees,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve active employees',
        error: error.message
      };
    }
  }

  /**
   * Get inactive employees
   * GET /employees/status/inactive
   */
  @Get('status/inactive')
  async getInactiveEmployees(
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    try {
      const query: EmployeeSearchQueryDto = {
        isActive: false,
        page: page || '1',
        limit: limit || '10'
      };

      const result = await this.employeeService.getEmployees(query);
      return {
        success: true,
        message: 'Inactive employees retrieved successfully',
        data: result.employees,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve inactive employees',
        error: error.message
      };
    }
  }

  /**
   * Get employees hired in date range
   * GET /employees/hired/date-range?from=YYYY-MM-DD&to=YYYY-MM-DD
   */
  @Get('hired/date-range')
  async getEmployeesHiredInRange(
    @Query('from') dateFrom: string,
    @Query('to') dateTo: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    try {
      if (!dateFrom || !dateTo) {
        throw new BadRequestException('Both from and to date parameters are required');
      }

      const query: EmployeeSearchQueryDto = {
        dateHiredFrom: dateFrom,
        dateHiredTo: dateTo,
        page: page || '1',
        limit: limit || '20'
      };

      const result = await this.employeeService.getEmployees(query);
      return {
        success: true,
        message: 'Employees hired in date range retrieved successfully',
        data: result.employees,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages
        },
        dateRange: {
          from: dateFrom,
          to: dateTo
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve employees by hiring date range',
        error: error.message
      };
    }
  }

  /**
   * Bulk employee actions
   * POST /employees/bulk-action
   */
  @Post('bulk-action')
  async bulkEmployeeAction(
    @Body(new ValidationPipe()) bulkActionDto: BulkEmployeeActionDto,
    @Request() req: any
  ) {
    try {
      const result = await this.employeeService.bulkEmployeeAction(
        bulkActionDto,
        req.user?.userId
      );
      return {
        success: true,
        message: 'Bulk action completed',
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: 'Bulk action failed',
        error: error.message
      };
    }
  }

  // Employee Documents Management

  /**
   * Create employee document
   * POST /employees/:id/documents
   */
  @Post(':id/documents')
  async createEmployeeDocument(
    @Param('id') employeeId: string,
    @Body(new ValidationPipe()) createDocumentDto: CreateEmployeeDocumentDto,
    @Request() req: any
  ) {
    try {
      // Ensure the document is for the correct employee
      createDocumentDto.userId = employeeId;

      const document = await this.employeeService.createEmployeeDocument(
        createDocumentDto,
        req.user?.userId
      );
      return {
        success: true,
        message: 'Employee document created successfully',
        data: document
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create employee document',
        error: error.message
      };
    }
  }

  /**
   * Get employee documents
   * GET /employees/:id/documents
   */
  @Get(':id/documents')
  async getEmployeeDocuments(@Param('id') employeeId: string) {
    try {
      const documents = await this.employeeService.getEmployeeDocuments(employeeId);
      return {
        success: true,
        message: 'Employee documents retrieved successfully',
        data: documents,
        count: documents.length
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve employee documents',
        error: error.message
      };
    }
  }

  /**
   * Update employee document
   * PUT /employees/documents/:documentId
   */
  @Put('documents/:documentId')
  async updateEmployeeDocument(
    @Param('documentId') documentId: string,
    @Body(new ValidationPipe()) updateDocumentDto: UpdateEmployeeDocumentDto,
    @Request() req: any
  ) {
    try {
      const document = await this.employeeService.updateEmployeeDocument(
        documentId,
        updateDocumentDto,
        req.user?.userId
      );
      return {
        success: true,
        message: 'Employee document updated successfully',
        data: document
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update employee document',
        error: error.message
      };
    }
  }

  // Employee Shift Management

  /**
   * Create employee shift
   * POST /employees/:id/shifts
   */
  @Post(':id/shifts')
  async createEmployeeShift(
    @Param('id') employeeId: string,
    @Body(new ValidationPipe()) createShiftDto: CreateEmployeeShiftDto
  ) {
    try {
      // Ensure the shift is for the correct employee
      createShiftDto.userId = employeeId;

      const shift = await this.employeeService.createEmployeeShift(createShiftDto);
      return {
        success: true,
        message: 'Employee shift created successfully',
        data: shift
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create employee shift',
        error: error.message
      };
    }
  }

  /**
   * Get employee shifts
   * GET /employees/:id/shifts
   */
  @Get(':id/shifts')
  async getEmployeeShifts(@Param('id') employeeId: string) {
    try {
      const shifts = await this.employeeService.getEmployeeShifts(employeeId);
      return {
        success: true,
        message: 'Employee shifts retrieved successfully',
        data: shifts,
        count: shifts.length
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve employee shifts',
        error: error.message
      };
    }
  }

  /**
   * Get employees by organization
   * GET /employees/organization/:organizationId
   */
  @Get('organization/:organizationId')
  async getEmployeesByOrganization(
    @Param('organizationId') organizationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    try {
      const query: EmployeeSearchQueryDto = {
        organizationId,
        page: page || '1',
        limit: limit || '10'
      };

      const result = await this.employeeService.getEmployees(query);
      return {
        success: true,
        message: 'Organization employees retrieved successfully',
        data: result.employees,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve organization employees',
        error: error.message
      };
    }
  }

  /**
   * Get employees by complex
   * GET /employees/complex/:complexId
   */
  @Get('complex/:complexId')
  async getEmployeesByComplex(
    @Param('complexId') complexId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    try {
      const query: EmployeeSearchQueryDto = {
        complexId,
        page: page || '1',
        limit: limit || '10'
      };

      const result = await this.employeeService.getEmployees(query);
      return {
        success: true,
        message: 'Complex employees retrieved successfully',
        data: result.employees,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve complex employees',
        error: error.message
      };
    }
  }

  /**
   * Get employees by clinic
   * GET /employees/clinic/:clinicId
   */
  @Get('clinic/:clinicId')
  async getEmployeesByClinic(
    @Param('clinicId') clinicId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    try {
      const query: EmployeeSearchQueryDto = {
        clinicId,
        page: page || '1',
        limit: limit || '10'
      };

      const result = await this.employeeService.getEmployees(query);
      return {
        success: true,
        message: 'Clinic employees retrieved successfully',
        data: result.employees,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve clinic employees',
        error: error.message
      };
    }
  }

  /**
   * Get employee analytics by role
   * GET /employees/analytics/roles
   */
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
          analysisDate: new Date()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve role analytics',
        error: error.message
      };
    }
  }

  /**
   * Get employee salary analytics
   * GET /employees/analytics/salary
   */
  @Get('analytics/salary')
  async getEmployeeSalaryAnalytics() {
    try {
      const stats = await this.employeeService.getEmployeeStats();
      
      return {
        success: true,
        message: 'Employee salary analytics retrieved successfully',
        data: {
          salaryStatistics: stats.salaryStatistics,
          analysisDate: new Date()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve salary analytics',
        error: error.message
      };
    }
  }

  /**
   * Get hiring trends
   * GET /employees/analytics/hiring-trends
   */
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
          analysisDate: new Date()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve hiring trends',
        error: error.message
      };
    }
  }

  /**
   * Get upcoming document expirations
   * GET /employees/documents/expiring?days=30
   */
  @Get('documents/expiring')
  async getUpcomingDocumentExpirations(
    @Query('days', new ParseIntPipe({ optional: true })) days?: number
  ) {
    try {
      const stats = await this.employeeService.getEmployeeStats();
      
      return {
        success: true,
        message: 'Upcoming document expirations retrieved successfully',
        data: {
          upcomingExpirations: stats.upcomingDocumentExpirations,
          count: stats.upcomingDocumentExpirations.length,
          daysAhead: days || 30
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve document expirations',
        error: error.message
      };
    }
  }

  /**
   * Get employee birthday list
   * GET /employees/birthdays/upcoming?days=30
   */
  @Get('birthdays/upcoming')
  async getUpcomingBirthdays(
    @Query('days', new ParseIntPipe({ optional: true })) days?: number
  ) {
    try {
      // This would be implemented similar to the patient birthdays functionality
      // For now, return a placeholder response
      return {
        success: true,
        message: 'Upcoming employee birthdays retrieved successfully',
        data: [],
        count: 0,
        message_note: 'Birthday tracking functionality would be implemented here'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve upcoming birthdays',
        error: error.message
      };
    }
  }

  /**
   * Export employees data
   * GET /employees/export/data?format=csv
   */
  @Get('export/data')
  async exportEmployeesData(
    @Query('format') format?: string,
    @Query() filters?: EmployeeSearchQueryDto
  ) {
    try {
      // This would implement actual CSV/Excel export
      const result = await this.employeeService.getEmployees({
        ...filters,
        limit: '1000' // Export more records
      });
      
      return {
        success: true,
        message: 'Employee export prepared successfully',
        data: {
          employees: result.employees,
          totalExported: result.total,
          format: format || 'json',
          exportDate: new Date(),
          message: 'Export functionality would generate CSV/Excel file here'
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to export employees data',
        error: error.message
      };
    }
  }
} 