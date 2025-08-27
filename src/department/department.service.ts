import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Department } from '../database/schemas/department.schema';
import { ComplexDepartment } from '../database/schemas/complex-department.schema';
import { CreateDepartmentDto, AssignDepartmentsDto } from './dto/create-department.dto';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectModel('Department') private readonly departmentModel: Model<Department>,
    @InjectModel('ComplexDepartment') private readonly complexDepartmentModel: Model<ComplexDepartment>,
  ) {}

  async createDepartment(createDepartmentDto: CreateDepartmentDto): Promise<Department> {
    // Check if department already exists
    const existingDepartment = await this.departmentModel.findOne({ 
      name: createDepartmentDto.name 
    });

    if (existingDepartment) {
      throw new BadRequestException('Department with this name already exists');
    }

    const department = new this.departmentModel(createDepartmentDto);
    return await department.save();
  }

  async getAllDepartments(): Promise<Department[]> {
    return await this.departmentModel.find().exec();
  }

  async getDepartment(departmentId: string): Promise<Department> {
    const department = await this.departmentModel.findById(departmentId);
    if (!department) {
      throw new NotFoundException('Department not found');
    }
    return department;
  }

  async createComplexDepartment(complexId: string, departmentId: string): Promise<ComplexDepartment> {
    // Check if complex-department relationship already exists
    const existing = await this.complexDepartmentModel.findOne({
      complexId: new Types.ObjectId(complexId),
      departmentId: new Types.ObjectId(departmentId)
    });

    if (existing) {
      throw new BadRequestException('Department already assigned to this complex');
    }

    const complexDepartment = new this.complexDepartmentModel({
      complexId: new Types.ObjectId(complexId),
      departmentId: new Types.ObjectId(departmentId),
      isActive: true
    });

    return await complexDepartment.save();
  }

  async assignDepartmentsToComplex(complexId: string, assignDto: AssignDepartmentsDto): Promise<ComplexDepartment[]> {
    const results: ComplexDepartment[] = [];

    for (const departmentId of assignDto.departmentIds) {
      try {
        const complexDepartment = await this.createComplexDepartment(complexId, departmentId);
        results.push(complexDepartment);
      } catch (error) {
        if (error.message.includes('already assigned')) {
          // Skip if already assigned
          continue;
        }
        throw error;
      }
    }

    return results;
  }

  async getDepartmentsByComplex(complexId: string): Promise<Department[]> {
    const complexDepartments = await this.complexDepartmentModel
      .find({ 
        complexId: new Types.ObjectId(complexId),
        isActive: true 
      })
      .populate('departmentId')
      .exec();

    return complexDepartments.map(cd => cd.departmentId as unknown as Department);
  }

  async getComplexDepartmentsByComplex(complexId: string): Promise<ComplexDepartment[]> {
    return await this.complexDepartmentModel
      .find({ 
        complexId: new Types.ObjectId(complexId),
        isActive: true 
      })
      .populate('departmentId')
      .exec();
  }

  async getComplexDepartmentById(complexDepartmentId: string): Promise<ComplexDepartment | null> {
    return await this.complexDepartmentModel
      .findById(complexDepartmentId)
      .populate('departmentId')
      .exec();
  }
}
