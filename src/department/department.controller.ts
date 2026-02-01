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
} from '@nestjs/common';
import { DepartmentService } from './department.service';
import {
  CreateDepartmentDto,
  AssignDepartmentsDto,
} from './dto/create-department.dto';
import { Department } from '../database/schemas/department.schema';
import { ComplexDepartment } from '../database/schemas/complex-department.schema';

@Controller('departments')
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
}
