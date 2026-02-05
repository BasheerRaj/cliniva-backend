import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Department } from '../database/schemas/department.schema';
import { ComplexDepartment } from '../database/schemas/complex-department.schema';
import { Clinic } from '../database/schemas/clinic.schema';
import { Service } from '../database/schemas/service.schema';
import {
  CreateDepartmentDto,
  AssignDepartmentsDto,
} from './dto/create-department.dto';
import {
  DeleteResult,
  CanDeleteResult,
  LinkedClinicDto,
} from './dto/delete-response.dto';
import {
  DEPARTMENT_ERROR_CODES,
  DEPARTMENT_ERROR_MESSAGES,
  DEPARTMENT_SUCCESS_MESSAGES,
  buildCannotDeleteReason,
  buildDeletionRecommendations,
} from './constants';

/**
 * Internal interface for clinic data with populated complex
 * Used for type safety in deletion validation queries
 */
interface LinkedClinicData {
  _id: Types.ObjectId;
  name: string;
  complexId?: {
    _id: Types.ObjectId;
    name: string;
  };
}

@Injectable()
export class DepartmentService {
  constructor(
    @InjectModel('Department')
    private readonly departmentModel: Model<Department>,
    @InjectModel('ComplexDepartment')
    private readonly complexDepartmentModel: Model<ComplexDepartment>,
    @InjectModel('Clinic')
    private readonly clinicModel: Model<Clinic>,
    @InjectModel('Service')
    private readonly serviceModel: Model<Service>,
  ) {}

  /**
   * Create a new department
   * @param createDepartmentDto - Department creation data
   * @returns Created department document
   * @throws BadRequestException if department name already exists
   */
  async createDepartment(
    createDepartmentDto: CreateDepartmentDto,
  ): Promise<Department> {
    // Check if department already exists
    const existingDepartment = await this.departmentModel.findOne({
      name: createDepartmentDto.name,
    });

    if (existingDepartment) {
      throw new BadRequestException({
        message: DEPARTMENT_ERROR_MESSAGES.NAME_EXISTS,
        code: DEPARTMENT_ERROR_CODES.NAME_EXISTS,
      });
    }

    const department = new this.departmentModel(createDepartmentDto);
    return await department.save();
  }

  /**
   * Get all departments
   * @returns Array of all department documents
   */
  async getAllDepartments(): Promise<Department[]> {
    return await this.departmentModel.find().exec();
  }

  /**
   * Get a single department by ID
   * @param departmentId - Department ID
   * @returns Department document
   * @throws NotFoundException if department not found
   */
  async getDepartment(departmentId: string): Promise<Department> {
    const department = await this.departmentModel.findById(departmentId);
    if (!department) {
      throw new NotFoundException({
        message: DEPARTMENT_ERROR_MESSAGES.NOT_FOUND,
        code: DEPARTMENT_ERROR_CODES.NOT_FOUND,
      });
    }
    return department;
  }

  /**
   * Create a relationship between a complex and a department
   * @param complexId - Complex ID
   * @param departmentId - Department ID
   * @returns Created ComplexDepartment document
   * @throws BadRequestException if relationship already exists
   */
  async createComplexDepartment(
    complexId: string,
    departmentId: string,
  ): Promise<ComplexDepartment> {
    // Check if complex-department relationship already exists
    const existing = await this.complexDepartmentModel.findOne({
      complexId: new Types.ObjectId(complexId),
      departmentId: new Types.ObjectId(departmentId),
    });

    if (existing) {
      throw new BadRequestException(
        'Department already assigned to this complex',
      );
    }

    const complexDepartment = new this.complexDepartmentModel({
      complexId: new Types.ObjectId(complexId),
      departmentId: new Types.ObjectId(departmentId),
      isActive: true,
    });

    return await complexDepartment.save();
  }

  /**
   * Assign multiple departments to a complex
   * @param complexId - Complex ID
   * @param assignDto - DTO containing array of department IDs
   * @returns Array of created ComplexDepartment documents
   */
  async assignDepartmentsToComplex(
    complexId: string,
    assignDto: AssignDepartmentsDto,
  ): Promise<ComplexDepartment[]> {
    const results: ComplexDepartment[] = [];

    for (const departmentId of assignDto.departmentIds) {
      try {
        const complexDepartment = await this.createComplexDepartment(
          complexId,
          departmentId,
        );
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

  /**
   * Get all departments assigned to a specific complex
   * @param complexId - Complex ID
   * @returns Array of department documents
   */
  async getDepartmentsByComplex(complexId: string): Promise<Department[]> {
    const complexDepartments = await this.complexDepartmentModel
      .find({
        complexId: new Types.ObjectId(complexId),
        isActive: true,
      })
      .populate('departmentId')
      .exec();

    return complexDepartments.map(
      (cd) => cd.departmentId as unknown as Department,
    );
  }

  /**
   * Get all ComplexDepartment relationships for a specific complex
   * @param complexId - Complex ID
   * @returns Array of ComplexDepartment documents with populated department data
   */
  async getComplexDepartmentsByComplex(
    complexId: string,
  ): Promise<ComplexDepartment[]> {
    return await this.complexDepartmentModel
      .find({
        complexId: new Types.ObjectId(complexId),
        isActive: true,
      })
      .populate('departmentId')
      .exec();
  }

  /**
   * Get a single ComplexDepartment relationship by ID
   * @param complexDepartmentId - ComplexDepartment ID
   * @returns ComplexDepartment document with populated department data, or null if not found
   */
  async getComplexDepartmentById(
    complexDepartmentId: string,
  ): Promise<ComplexDepartment | null> {
    return await this.complexDepartmentModel
      .findById(complexDepartmentId)
      .populate('departmentId')
      .exec();
  }

  /**
   * Validate that a department exists
   * @param departmentId - Department ID to validate
   * @returns Department document if found
   * @throws NotFoundException if department not found
   */
  private async validateDepartmentExists(
    departmentId: string,
  ): Promise<Department> {
    const department = await this.departmentModel.findById(departmentId);

    if (!department) {
      throw new NotFoundException({
        message: DEPARTMENT_ERROR_MESSAGES.NOT_FOUND,
        code: DEPARTMENT_ERROR_CODES.NOT_FOUND,
      });
    }

    return department;
  }

  /**
   * Get ComplexDepartment IDs for a given department
   * @param departmentId - Department ID
   * @returns Array of ComplexDepartment ObjectIds
   */
  private async getComplexDepartmentIds(
    departmentId: string,
  ): Promise<Types.ObjectId[]> {
    const complexDepartments = await this.complexDepartmentModel
      .find({
        departmentId: new Types.ObjectId(departmentId),
        isActive: true,
      })
      .select('_id')
      .lean();

    return complexDepartments.map((cd) => cd._id as Types.ObjectId);
  }

  /**
   * Get clinics linked to ComplexDepartment IDs
   * @param complexDeptIds - Array of ComplexDepartment IDs
   * @returns Array of linked clinics with complex information
   */
  private async getLinkedClinics(
    complexDeptIds: Types.ObjectId[],
  ): Promise<LinkedClinicData[]> {
    if (complexDeptIds.length === 0) {
      return [];
    }

    const linkedClinics = await this.clinicModel
      .find({
        complexDepartmentId: { $in: complexDeptIds },
        status: { $ne: 'deleted' },
      })
      .populate('complexId', 'name')
      .select('_id name complexId')
      .lean<LinkedClinicData[]>();

    return linkedClinics;
  }

  /**
   * Get count of services linked to ComplexDepartment IDs
   * @param complexDeptIds - Array of ComplexDepartment IDs
   * @returns Count of linked services
   */
  private async getLinkedServicesCount(
    complexDeptIds: Types.ObjectId[],
  ): Promise<number> {
    if (complexDeptIds.length === 0) {
      return 0;
    }

    // Check if service model exists (optional dependency)
    if (!this.serviceModel) {
      return 0;
    }

    try {
      return await this.serviceModel.countDocuments({
        complexDepartmentId: { $in: complexDeptIds },
      });
    } catch (error) {
      // Service collection might not exist yet
      return 0;
    }
  }

  /**
   * Format linked clinic data to DTO format
   * @param linkedClinics - Array of linked clinic data from database
   * @returns Array of formatted LinkedClinicDto objects
   */
  private formatLinkedClinics(
    linkedClinics: LinkedClinicData[],
  ): LinkedClinicDto[] {
    return linkedClinics.map((c) => ({
      clinicId: c._id.toString(),
      clinicName: c.name,
      complexName: c.complexId?.name || 'Unknown',
      complexId: c.complexId?._id?.toString(),
    }));
  }

  /**
   * Build response for can-delete check
   * @param linkedClinics - Array of linked clinics
   * @param linkedServices - Count of linked services
   * @returns CanDeleteResult with deletion eligibility information
   */
  private buildCanDeleteResponse(
    linkedClinics: LinkedClinicData[],
    linkedServices: number,
  ): CanDeleteResult {
    const hasLinkedClinics = linkedClinics.length > 0;
    const hasLinkedServices = linkedServices > 0;
    const canDelete = !hasLinkedClinics && !hasLinkedServices;

    if (canDelete) {
      return {
        success: true,
        data: {
          canDelete: true,
        },
      };
    }

    // Build reason message using helper function
    const reason = buildCannotDeleteReason(
      linkedClinics.length,
      linkedServices,
    );

    // Build recommendations using helper function
    const recommendations = buildDeletionRecommendations(
      linkedClinics.length,
      linkedServices,
    );

    // Format linked clinics using helper method
    const formattedClinics = this.formatLinkedClinics(linkedClinics);

    return {
      success: true,
      data: {
        canDelete: false,
        reason,
        linkedClinics: formattedClinics,
        linkedServices: hasLinkedServices ? linkedServices : undefined,
        recommendations,
      },
    };
  }

  /**
   * Delete a department with validation
   * @param departmentId - Department ID to delete
   * @returns DeleteResult with success message
   * @throws NotFoundException if department not found
   * @throws BadRequestException if department is linked to clinics or has services
   */
  async deleteDepartment(departmentId: string): Promise<DeleteResult> {
    try {
      // Step 1: Validate department exists
      await this.validateDepartmentExists(departmentId);

      // Step 2: Get ComplexDepartment IDs
      const complexDeptIds = await this.getComplexDepartmentIds(departmentId);

      // Step 3: Check clinic linkage
      const linkedClinics = await this.getLinkedClinics(complexDeptIds);

      if (linkedClinics.length > 0) {
        const formattedClinics = this.formatLinkedClinics(linkedClinics);

        throw new BadRequestException({
          message: DEPARTMENT_ERROR_MESSAGES.LINKED_TO_CLINICS,
          code: DEPARTMENT_ERROR_CODES.LINKED_TO_CLINICS,
          linkedClinics: formattedClinics,
          linkedClinicsCount: linkedClinics.length,
        });
      }

      // Step 4: Check service linkage
      const linkedServices = await this.getLinkedServicesCount(complexDeptIds);

      if (linkedServices > 0) {
        throw new BadRequestException({
          message: DEPARTMENT_ERROR_MESSAGES.HAS_SERVICES,
          code: DEPARTMENT_ERROR_CODES.HAS_SERVICES,
          linkedServices,
        });
      }

      // Step 5: Safe to delete
      await this.departmentModel.findByIdAndDelete(departmentId);

      return {
        success: true,
        message: DEPARTMENT_SUCCESS_MESSAGES.DELETED,
      };
    } catch (error) {
      // Re-throw known exceptions
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // Handle unexpected errors
      throw new BadRequestException({
        message: {
          ar: 'حدث خطأ أثناء حذف القسم',
          en: 'An error occurred while deleting the department',
        },
      });
    }
  }

  /**
   * Check if a department can be deleted
   * @param departmentId - Department ID to check
   * @returns CanDeleteResult with deletion eligibility information
   * @throws NotFoundException if department not found
   */
  async canDeleteDepartment(departmentId: string): Promise<CanDeleteResult> {
    try {
      // Step 1: Validate department exists
      await this.validateDepartmentExists(departmentId);

      // Step 2: Get ComplexDepartment IDs
      const complexDeptIds = await this.getComplexDepartmentIds(departmentId);

      // Step 3: Get linked clinics
      const linkedClinics = await this.getLinkedClinics(complexDeptIds);

      // Step 4: Get linked services count
      const linkedServices = await this.getLinkedServicesCount(complexDeptIds);

      // Step 5: Build response
      return this.buildCanDeleteResponse(linkedClinics, linkedServices);
    } catch (error) {
      // Re-throw known exceptions
      if (error instanceof NotFoundException) {
        throw error;
      }

      // Handle unexpected errors
      throw new BadRequestException({
        message: {
          ar: 'حدث خطأ أثناء التحقق من إمكانية حذف القسم',
          en: 'An error occurred while checking if department can be deleted',
        },
      });
    }
  }
}
