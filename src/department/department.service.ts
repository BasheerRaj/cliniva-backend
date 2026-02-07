import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
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
  private readonly logger = new Logger(DepartmentService.name);

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
   * Validate that a department exists and return it
   *
   * This method performs validation to ensure a department exists in the database
   * before performing operations on it. It also validates the ObjectId format.
   *
   * @param departmentId - Department ID to validate (must be valid MongoDB ObjectId)
   * @returns Department document if found
   * @throws BadRequestException if departmentId is not a valid ObjectId
   * @throws NotFoundException if department not found in database
   *
   * @private
   * @example
   * const department = await this.validateDepartmentExists('507f1f77bcf86cd799439011');
   */
  private async validateDepartmentExists(
    departmentId: string,
  ): Promise<Department> {
    // Validate ObjectId format before querying database
    if (!Types.ObjectId.isValid(departmentId)) {
      throw new BadRequestException({
        message: {
          ar: 'معرف القسم غير صالح',
          en: 'Invalid department ID format',
        },
        code: 'INVALID_ID',
      });
    }

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
   *
   * Retrieves all active ComplexDepartment junction records that link
   * the specified department to complexes. This is used to find all
   * clinics that might be using this department.
   *
   * @param departmentId - Department ID (must be valid MongoDB ObjectId)
   * @returns Array of ComplexDepartment ObjectIds (empty array if none found)
   *
   * @private
   * @example
   * const complexDeptIds = await this.getComplexDepartmentIds('507f1f77bcf86cd799439011');
   * // Returns: [ObjectId('...'), ObjectId('...')]
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
   *
   * Queries the Clinic collection to find all clinics that are using
   * the specified ComplexDepartment IDs. Excludes deleted clinics and
   * populates complex information for detailed error messages.
   *
   * Query is optimized with:
   * - `.select()` to limit returned fields
   * - `.lean()` for read-only performance
   * - `.populate()` only for required complex name
   *
   * @param complexDeptIds - Array of ComplexDepartment IDs to check
   * @returns Array of linked clinics with complex information (empty if none found)
   *
   * @private
   * @example
   * const linkedClinics = await this.getLinkedClinics([ObjectId('...')]);
   * // Returns: [{ _id: ObjectId, name: 'Clinic A', complexId: { _id: ObjectId, name: 'Complex 1' } }]
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
   *
   * Counts services that are using the specified ComplexDepartment IDs.
   * Uses `countDocuments()` for optimal performance instead of fetching
   * all documents.
   *
   * Handles edge cases:
   * - Returns 0 if no ComplexDepartment IDs provided
   * - Returns 0 if service model is not available (optional dependency)
   * - Returns 0 if service collection doesn't exist yet
   *
   * @param complexDeptIds - Array of ComplexDepartment IDs to check
   * @returns Count of linked services (0 if none found or service collection unavailable)
   *
   * @private
   * @example
   * const serviceCount = await this.getLinkedServicesCount([ObjectId('...')]);
   * // Returns: 5
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
      // Service collection might not exist yet - log and return 0
      this.logger.warn(
        `Unable to count services for department: ${error.message}`,
      );
      return 0;
    }
  }

  /**
   * Format linked clinic data to DTO format
   *
   * Transforms internal database clinic data structure to the public
   * DTO format used in API responses. Handles missing complex data
   * gracefully by providing 'Unknown' as fallback.
   *
   * @param linkedClinics - Array of linked clinic data from database query
   * @returns Array of formatted LinkedClinicDto objects for API response
   *
   * @private
   * @example
   * const formatted = this.formatLinkedClinics(dbClinics);
   * // Returns: [{ clinicId: '507f...', clinicName: 'Clinic A', complexName: 'Complex 1', complexId: '507f...' }]
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
   *
   * Constructs a comprehensive response indicating whether a department
   * can be safely deleted, along with detailed information about any
   * blocking linkages.
   *
   * Response includes:
   * - canDelete flag (true if no linkages exist)
   * - Bilingual reason message (if deletion blocked)
   * - List of linked clinics with details (if applicable)
   * - Count of linked services (if applicable)
   * - Bilingual recommendations for user action (if deletion blocked)
   *
   * @param linkedClinics - Array of clinics linked to the department
   * @param linkedServices - Count of services linked to the department
   * @returns CanDeleteResult with deletion eligibility information
   *
   * @private
   * @example
   * const result = this.buildCanDeleteResponse([], 0);
   * // Returns: { success: true, data: { canDelete: true } }
   *
   * @example
   * const result = this.buildCanDeleteResponse([clinic1, clinic2], 5);
   * // Returns: { success: true, data: { canDelete: false, reason: {...}, linkedClinics: [...], linkedServices: 5, recommendations: {...} } }
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
   *
   * Performs comprehensive validation before deleting a department to ensure
   * data integrity. Implements Business Rule BZR-36 which prevents deletion
   * of departments that are linked to clinics or have services.
   *
   * Validation steps:
   * 1. Verify department exists (throws NotFoundException if not found)
   * 2. Check for linked clinics via ComplexDepartment relationships
   * 3. Check for linked services
   * 4. Delete department if no linkages exist
   *
   * @param departmentId - Department ID to delete (must be valid MongoDB ObjectId)
   * @returns DeleteResult with bilingual success message
   *
   * @throws NotFoundException if department not found (DEPARTMENT_003)
   * @throws BadRequestException if department is linked to clinics (DEPARTMENT_001)
   * @throws BadRequestException if department has services (DEPARTMENT_002)
   * @throws BadRequestException for unexpected errors
   *
   * @example
   * const result = await service.deleteDepartment('507f1f77bcf86cd799439011');
   * // Returns: { success: true, message: { ar: '...', en: '...' } }
   *
   * @example
   * // Throws BadRequestException with linked clinics details
   * await service.deleteDepartment('linked-department-id');
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

        this.logger.warn(
          `Department deletion blocked: ${departmentId} - linked to ${linkedClinics.length} clinics`,
        );

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
        this.logger.warn(
          `Department deletion blocked: ${departmentId} - has ${linkedServices} services`,
        );

        throw new BadRequestException({
          message: DEPARTMENT_ERROR_MESSAGES.HAS_SERVICES,
          code: DEPARTMENT_ERROR_CODES.HAS_SERVICES,
          linkedServices,
        });
      }

      // Step 5: Safe to delete
      await this.departmentModel.findByIdAndDelete(departmentId);

      this.logger.log(`Department deleted successfully: ${departmentId}`);

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
      this.logger.error(
        `Unexpected error deleting department ${departmentId}:`,
        error.stack,
      );

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
   *
   * Performs a read-only check to determine if a department can be safely
   * deleted without violating data integrity constraints. This endpoint is
   * designed for frontend UI to disable delete buttons and show tooltips.
   *
   * Returns comprehensive information including:
   * - Whether deletion is allowed (canDelete flag)
   * - Bilingual reason if deletion is blocked
   * - List of linked clinics with details
   * - Count of linked services
   * - Bilingual recommendations for user action
   *
   * @param departmentId - Department ID to check (must be valid MongoDB ObjectId)
   * @returns CanDeleteResult with deletion eligibility information
   *
   * @throws NotFoundException if department not found (DEPARTMENT_003)
   * @throws BadRequestException for unexpected errors
   *
   * @example
   * const result = await service.canDeleteDepartment('507f1f77bcf86cd799439011');
   * // Returns: { success: true, data: { canDelete: true } }
   *
   * @example
   * // Returns detailed information about blocking linkages
   * const result = await service.canDeleteDepartment('linked-department-id');
   * // Returns: { success: true, data: { canDelete: false, reason: {...}, linkedClinics: [...], ... } }
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
      this.logger.error(
        `Unexpected error checking can-delete for department ${departmentId}:`,
        error.stack,
      );

      throw new BadRequestException({
        message: {
          ar: 'حدث خطأ أثناء التحقق من إمكانية حذف القسم',
          en: 'An error occurred while checking if department can be deleted',
        },
      });
    }
  }
}
