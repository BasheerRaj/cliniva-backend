import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger
} from '@nestjs/common';
import { HydratedDocument } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from '../database/schemas/user.schema';
import { EmployeeProfile } from '../database/schemas/employee-profile.schema';
import { EmployeeDocument } from '../database/schemas/employee-document.schema';
import { EmployeeShift } from '../database/schemas/employee-shift.schema';
import { Organization } from '../database/schemas/organization.schema';
import { Complex } from '../database/schemas/complex.schema';
import { Clinic } from '../database/schemas/clinic.schema';
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
  EmployeeStatsDto,
  AssignEmployeeDto,
  EmployeeAttendanceDto,
  TerminateEmployeeDto
} from './dto';

@Injectable()
export class EmployeeService {
  private readonly logger = new Logger(EmployeeService.name);

  constructor(
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('EmployeeProfile') private readonly employeeProfileModel: Model<EmployeeProfile>,
    @InjectModel('EmployeeDocument') private readonly employeeDocumentModel: Model<EmployeeDocument>,
    @InjectModel('EmployeeShift') private readonly employeeShiftModel: Model<EmployeeShift>,
    @InjectModel('Organization') private readonly organizationModel: Model<Organization>,
    @InjectModel('Complex') private readonly complexModel: Model<Complex>,
    @InjectModel('Clinic') private readonly clinicModel: Model<Clinic>,
  ) { }
  // ═══════════════════════════════════════════════════════════
  // 🔐 AUTHORIZATION HELPER METHODS
  // ═══════════════════════════════════════════════════════════

  /**
   * جلب نطاق الصلاحيات للمستخدم (Owner/Admin)
   * Returns: IDs للكيانات التي يملك المستخدم الوصول إليها
   */
  private async getUserAccessScope(authUser: {
    id: string;
    role: string;
    organizationId?: string;
    complexId?: string;
    clinicId?: string;
  }): Promise<{
    allowedOrganizationIds: Types.ObjectId[];
    allowedComplexIds: Types.ObjectId[];
    allowedClinicIds: Types.ObjectId[];
  }> {
    let allowedOrganizationIds: Types.ObjectId[] = [];
    let allowedComplexIds: Types.ObjectId[] = [];
    let allowedClinicIds: Types.ObjectId[] = [];

    if (authUser.role === 'owner') {
      // جلب كل الكيانات المملوكة
      const ownedOrganizations = await this.organizationModel.find({
        ownerId: new Types.ObjectId(authUser.id)
      }).exec();

      const ownedComplexes = await this.complexModel.find({
        ownerId: new Types.ObjectId(authUser.id)
      }).exec();

      const ownedClinics = await this.clinicModel.find({
        ownerId: new Types.ObjectId(authUser.id)
      }).exec();

      if (ownedOrganizations.length > 0) {
        allowedOrganizationIds = ownedOrganizations.map(org => org._id as Types.ObjectId);

        const complexesUnderOrgs = await this.complexModel.find({
          organizationId: { $in: allowedOrganizationIds }
        }).exec();

        allowedComplexIds = [
          ...ownedComplexes.map(c => c._id as Types.ObjectId),
          ...complexesUnderOrgs.map(c => c._id as Types.ObjectId)
        ];

        const clinicsUnderComplexes = await this.clinicModel.find({
          complexId: { $in: allowedComplexIds }
        }).exec();

        allowedClinicIds = [
          ...ownedClinics.map(c => c._id as Types.ObjectId),
          ...clinicsUnderComplexes.map(c => c._id as Types.ObjectId)
        ];

      } else if (ownedComplexes.length > 0) {
        allowedComplexIds = ownedComplexes.map(c => c._id as Types.ObjectId);

        const clinicsUnderComplexes = await this.clinicModel.find({
          complexId: { $in: allowedComplexIds }
        }).exec();

        allowedClinicIds = [
          ...ownedClinics.map(c => c._id as Types.ObjectId),
          ...clinicsUnderComplexes.map(c => c._id as Types.ObjectId)
        ];

      } else if (ownedClinics.length > 0) {
        allowedClinicIds = ownedClinics.map(c => c._id as Types.ObjectId);
      } else {
        throw new ForbiddenException('You do not own any organizations, complexes, or clinics');
      }

    } else if (authUser.role === 'admin') {
      if (authUser.organizationId) {
        allowedOrganizationIds = [new Types.ObjectId(authUser.organizationId)];

        const complexes = await this.complexModel.find({
          organizationId: authUser.organizationId
        }).exec();
        allowedComplexIds = complexes.map(c => c._id as Types.ObjectId);

        const clinics = await this.clinicModel.find({
          complexId: { $in: allowedComplexIds }
        }).exec();
        allowedClinicIds = clinics.map(c => c._id as Types.ObjectId);

      } else if (authUser.complexId) {
        allowedComplexIds = [new Types.ObjectId(authUser.complexId)];

        const clinics = await this.clinicModel.find({
          complexId: authUser.complexId
        }).exec();
        allowedClinicIds = clinics.map(c => c._id as Types.ObjectId);

      } else if (authUser.clinicId) {
        allowedClinicIds = [new Types.ObjectId(authUser.clinicId)];

      } else {
        throw new ForbiddenException('Admin account is not assigned to any entity');
      }

    } else {
      throw new ForbiddenException('Only owners and admins can access employee data');
    }

    return {
      allowedOrganizationIds,
      allowedComplexIds,
      allowedClinicIds
    };
  }

  /**
   * التحقق من أن الموظف ضمن نطاق صلاحيات المستخدم
   */
  private async validateEmployeeAccess(
    employeeId: string,
    authUser: {
      id: string;
      role: string;
      organizationId?: string;
      complexId?: string;
      clinicId?: string;
    }
  ): Promise<void> {
    // جلب الموظف
    const employee = await this.userModel.findById(employeeId).exec();
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // جلب نطاق الصلاحيات
    const scope = await this.getUserAccessScope(authUser);

    // التحقق من أن الموظف ضمن النطاق
    const hasAccess =
      (employee.organizationId &&
        scope.allowedOrganizationIds.some(
          id => id.toString() === employee.organizationId?.toString()
        )) ||
      (employee.complexId &&
        scope.allowedComplexIds.some(
          id => id.toString() === employee.complexId?.toString()
        )) ||
      (employee.clinicId &&
        scope.allowedClinicIds.some(
          id => id.toString() === employee.clinicId?.toString()
        ));

    if (!hasAccess) {
      throw new ForbiddenException(
        'You do not have permission to access this employee'
      );
    }
  }

  /**
   * فلتر الموظفين حسب نطاق الصلاحيات
   */
  private buildAccessScopeFilter(scope: {
    allowedOrganizationIds: Types.ObjectId[];
    allowedComplexIds: Types.ObjectId[];
    allowedClinicIds: Types.ObjectId[];
  }): any {
    const scopeConditions: any[] = [];

    if (scope.allowedOrganizationIds.length > 0) {
      scopeConditions.push({
        organizationId: { $in: scope.allowedOrganizationIds }
      });
    }
    if (scope.allowedComplexIds.length > 0) {
      scopeConditions.push({ complexId: { $in: scope.allowedComplexIds } });
    }
    if (scope.allowedClinicIds.length > 0) {
      scopeConditions.push({ clinicId: { $in: scope.allowedClinicIds } });
    }

    if (scopeConditions.length === 0) {
      throw new ForbiddenException('No accessible entities found');
    }

    return { $or: scopeConditions };
  }
  /**
   * Generate unique employee number
   */

  private async generateEmployeeNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `EMP${currentYear}`;

    // Find the last employee number for this year
    const lastEmployee = await this.employeeProfileModel
      .findOne({
        employeeNumber: { $regex: `^${prefix}` }
      })
      .sort({ employeeNumber: -1 })
      .exec();

    let nextNumber = 1;
    if (lastEmployee && lastEmployee.employeeNumber) {
      const lastNumber = parseInt(lastEmployee.employeeNumber.substring(prefix.length));
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }

  /**
   * Validate employee data
   */
  private async validateEmployeeData(
    employeeDto: CreateEmployeeDto | UpdateEmployeeDto,
    isUpdate = false,
    employeeId?: string
  ): Promise<void> {
    const createDto = employeeDto as CreateEmployeeDto;
  
    // For creation, validate required fields and uniqueness
    if (!isUpdate) {
      // ✅ التحقق من فرادة username
      if (createDto.username) {
        const existingUserByUsername = await this.userModel.findOne({
          username: createDto.username
        });
  
        if (existingUserByUsername) {
          throw new ConflictException('Username already exists');
        }
      }
  
      // Check email uniqueness
      const existingUserByEmail = await this.userModel.findOne({
        email: createDto.email
      });
  
      if (existingUserByEmail) {
        throw new ConflictException('Email already exists');
      }
  
      // Validate phone uniqueness
      const existingUserByPhone = await this.userModel.findOne({
        phone: createDto.phone
      });
  
      if (existingUserByPhone) {
        throw new ConflictException('Phone number already exists');
      }
  
      // Validate employee number uniqueness (if provided)
      if (createDto.employeeNumber) {
        const existingEmployee = await this.employeeProfileModel.findOne({
          employeeNumber: createDto.employeeNumber
        });
  
        if (existingEmployee) {
          throw new ConflictException('Employee number already exists');
        }
      }
  
      // Validate card number uniqueness (if provided)
      if (createDto.cardNumber) {
        const existingEmployeeByCard = await this.employeeProfileModel.findOne({
          cardNumber: createDto.cardNumber
        });
  
        if (existingEmployeeByCard) {
          throw new ConflictException('Card number already exists');
        }
      }
    } else {
      // ✅ عند التحديث، التحقق من username إذا تم تقديمه
      const updateDto = employeeDto as UpdateEmployeeDto;
      if (updateDto.username && employeeId) {
        const existingUser = await this.userModel.findOne({
          username: updateDto.username,
          _id: { $ne: new Types.ObjectId(employeeId) }
        });
  
        if (existingUser) {
          throw new ConflictException('Username already exists');
        }
      }
    }
  
    // Rest of validation...
  }

  /**
   * Create a new employee
   */
 /**
 * Create a new employee
 */
async createEmployee(
  createEmployeeDto: CreateEmployeeDto,
  authUser: {
    id: string;
    role: string;
    organizationId?: string;
    complexId?: string;
    clinicId?: string;
  }
): Promise<any> {
  this.logger.log('Creating new employee');

  // 🔐 التحقق من الصلاحيات
  await this.validateCreateEmployeeEntities(createEmployeeDto, authUser);

  // التحقق من البيانات
  await this.validateEmployeeData(createEmployeeDto);

  // ✅ التحقق من username
  const existingUserByUsername = await this.userModel
    .findOne({ username: createEmployeeDto.username })
    .exec();

  if (existingUserByUsername) {
    throw new ConflictException('Username already exists');
  }

  // Check if email already exists
  const existingUser = await this.userModel
    .findOne({ email: createEmployeeDto.email.toLowerCase() })
    .exec();

  if (existingUser) {
    throw new ConflictException('Email already exists');
  }

  // Check if employee number already exists (if provided)
  if (createEmployeeDto.employeeNumber) {
    const existingEmployeeNumber = await this.employeeProfileModel
      .findOne({ employeeNumber: createEmployeeDto.employeeNumber })
      .exec();

    if (existingEmployeeNumber) {
      throw new ConflictException('Employee number already exists');
    }
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(createEmployeeDto.password, 10);

  // ✅ Create user مع username
  const user = await this.userModel.create({
    email: createEmployeeDto.email.toLowerCase(),
    username: createEmployeeDto.username, // ✅ إضافة username
    passwordHash: hashedPassword,
    firstName: createEmployeeDto.firstName, // اختياري الآن
    lastName: createEmployeeDto.lastName,   // اختياري الآن
    phone: createEmployeeDto.phone,
    role: createEmployeeDto.role || 'staff',
    gender: createEmployeeDto.gender,
    dateOfBirth: createEmployeeDto.dateOfBirth
      ? new Date(createEmployeeDto.dateOfBirth)
      : undefined,
    nationality: createEmployeeDto.nationality,
    address: createEmployeeDto.address,
    isActive: true,
    emailVerified: false,
    organizationId: createEmployeeDto.organizationId
      ? new Types.ObjectId(createEmployeeDto.organizationId)
      : undefined,
    complexId: createEmployeeDto.complexId
      ? new Types.ObjectId(createEmployeeDto.complexId)
      : undefined,
    clinicId: createEmployeeDto.clinicId
      ? new Types.ObjectId(createEmployeeDto.clinicId)
      : undefined,
  });

  // Create employee profile
  const employeeProfile = await this.employeeProfileModel.create({
    userId: user._id,
    employeeNumber: createEmployeeDto.employeeNumber,
    dateOfHiring: createEmployeeDto.dateOfHiring
      ? new Date(createEmployeeDto.dateOfHiring)
      : new Date(),
    jobTitle: createEmployeeDto.jobTitle,
    salary: createEmployeeDto.salary,
    cardNumber: createEmployeeDto.cardNumber,
    maritalStatus: createEmployeeDto.maritalStatus,
    numberOfChildren: createEmployeeDto.numberOfChildren || 0,
    profilePictureUrl: createEmployeeDto.profilePictureUrl,
    bankAccount: createEmployeeDto.bankAccount,
    socialSecurityNumber: createEmployeeDto.socialSecurityNumber,
    taxId: createEmployeeDto.taxId,
    notes: createEmployeeDto.notes,
    specialties: createEmployeeDto.specialties || [],
    isActive: true,
  });

  // ✅ Create shifts if provided
  if (createEmployeeDto.shifts && createEmployeeDto.shifts.length > 0) {
    const shifts = createEmployeeDto.shifts.map(shift => ({
      userId: user._id,
      entityType: shift.entityType,
      entityId: new Types.ObjectId(shift.entityId),
      shiftName: shift.shiftName,
      dayOfWeek: shift.dayOfWeek,
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakDurationMinutes: shift.breakDurationMinutes || 0,
      isActive: true,
    }));

    await this.employeeShiftModel.insertMany(shifts);
  }

  this.logger.log(`Employee created successfully: ${user._id}`);

  return await this.getEmployeeById((user._id as Types.ObjectId).toString());
}



  /**
   * Get employees with filtering and pagination
   */
  async getEmployees(
    query: EmployeeSearchQueryDto,
    authUser: {
      id: string;
      role: string;
      organizationId?: string;
      complexId?: string;
      clinicId?: string;
    }
  ): Promise<{
    employees: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      search,
      firstName,
      lastName,
      email,
      employeeNumber,
      role,
      jobTitle,
      isActive,
      dateHiredFrom,
      dateHiredTo,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    // جلب المستخدم
    const user = await this.userModel.findById(authUser.id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // بناء فلتر البحث الأساسي
    const userFilter: any = { isDeleted: { $ne: true } };
    if (firstName) userFilter.firstName = { $regex: firstName, $options: 'i' };
    if (lastName) userFilter.lastName = { $regex: lastName, $options: 'i' };
    if (email) userFilter.email = { $regex: email, $options: 'i' };
    if (role) userFilter.role = role;
    if (isActive !== undefined) userFilter.isActive = isActive;

    if (search) {
      userFilter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    // فلترة ملف الموظف
    const profileFilter: any = {};
    if (employeeNumber) profileFilter.employeeNumber = { $regex: employeeNumber, $options: 'i' };
    if (jobTitle) profileFilter.jobTitle = { $regex: jobTitle, $options: 'i' };

    if (dateHiredFrom || dateHiredTo) {
      profileFilter.dateOfHiring = {};
      if (dateHiredFrom) profileFilter.dateOfHiring.$gte = new Date(dateHiredFrom);
      if (dateHiredTo) profileFilter.dateOfHiring.$lte = new Date(dateHiredTo);
    }

    // 🔐 استخدام Helper Methods
    const scope = await this.getUserAccessScope(authUser);
    const accessFilter = this.buildAccessScopeFilter(scope);
    userFilter.$and = [accessFilter];

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.max(1, Math.min(100, parseInt(limit)));
    const skip = (pageNum - 1) * pageSize;

    // Sorting
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Aggregate pipeline
    const pipeline = [
      {
        $lookup: {
          from: 'employee_profiles',
          localField: '_id',
          foreignField: 'userId',
          as: 'employeeProfile',
        },
      },
      { $unwind: { path: '$employeeProfile', preserveNullAndEmptyArrays: false } },
      {
        $match: {
          ...userFilter,
          ...(Object.keys(profileFilter).length > 0 && {
            $and: Object.entries(profileFilter).map(([key, value]) => ({
              [`employeeProfile.${key}`]: value,
            })),
          }),
        },
      },
      {
        $lookup: {
          from: 'organizations',
          localField: 'organizationId',
          foreignField: '_id',
          as: 'organization',
        },
      },
      {
        $lookup: {
          from: 'complexes',
          localField: 'complexId',
          foreignField: '_id',
          as: 'complex',
        },
      },
      {
        $lookup: {
          from: 'clinics',
          localField: 'clinicId',
          foreignField: '_id',
          as: 'clinic',
        },
      },
      {
        $addFields: {
          organization: { $arrayElemAt: ['$organization', 0] },
          complex: { $arrayElemAt: ['$complex', 0] },
          clinic: { $arrayElemAt: ['$clinic', 0] },
        },
      },
      { $sort: sort },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: pageSize }],
          count: [{ $count: 'total' }],
        },
      },
    ];

    const result = await this.userModel.aggregate(pipeline).exec();

    const employees = result[0].data || [];
    const total = result[0].count[0]?.total || 0;
    const totalPages = Math.ceil(total / pageSize);

    return { employees, total, page: pageNum, totalPages };
  }




  /**
   * Get employee by ID
   */
  async getEmployeeById(
    employeeId: string,
    authUser?: {
      id: string;
      role: string;
      organizationId?: string;
      complexId?: string;
      clinicId?: string;
    }
  ): Promise<any> {
    if (!Types.ObjectId.isValid(employeeId)) {
      throw new BadRequestException('Invalid employee ID format');
    }

    // 🔐 التحقق من الصلاحيات إذا كان authUser موجود
    if (authUser) {
      await this.validateEmployeeAccess(employeeId, authUser);
    }

    const pipeline = [
      {
        $match: {
          _id: new Types.ObjectId(employeeId),
          isDeleted: { $ne: true }

        }

      },
      {
        $lookup: {
          from: 'employee_profiles',
          localField: '_id',
          foreignField: 'userId',
          as: 'employeeProfile'
        }
      },
      {
        $unwind: {
          path: '$employeeProfile',
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $lookup: {
          from: 'employee_shifts',
          localField: '_id',
          foreignField: 'userId',
          as: 'shifts'
        }
      },
      {
        $lookup: {
          from: 'employee_documents',
          localField: '_id',
          foreignField: 'userId',
          as: 'documents'
        }
      },
      {
        $lookup: {
          from: 'organizations',
          localField: 'organizationId',
          foreignField: '_id',
          as: 'organization'
        }
      },
      {
        $lookup: {
          from: 'complexes',
          localField: 'complexId',
          foreignField: '_id',
          as: 'complex'
        }
      },
      {
        $lookup: {
          from: 'clinics',
          localField: 'clinicId',
          foreignField: '_id',
          as: 'clinic'
        }
      },
      {
        $addFields: {
          organization: { $arrayElemAt: ['$organization', 0] },
          complex: { $arrayElemAt: ['$complex', 0] },
          clinic: { $arrayElemAt: ['$clinic', 0] }
        }
      }
    ];

    const result = await this.userModel.aggregate(pipeline).exec();

    if (!result || result.length === 0) {
      throw new NotFoundException('Employee not found');
    }

    return result[0];
  }

  /**
   * Update employee information
   */
  async updateEmployee(
    employeeId: string,
    updateEmployeeDto: UpdateEmployeeDto,
    updatedByUserId?: string,
    authUser?: {
      id: string;
      role: string;
      organizationId?: string;
      complexId?: string;
      clinicId?: string;
    }
  ): Promise<any> {
    if (!Types.ObjectId.isValid(employeeId)) {
      throw new BadRequestException('Invalid employee ID format');
    }
  
    this.logger.log(`Updating employee: ${employeeId}`);
  
    // 🔐 التحقق من الصلاحيات
    if (authUser) {
      await this.validateEmployeeAccess(employeeId, authUser);
    }
  
    await this.validateEmployeeData(updateEmployeeDto, true, employeeId);
  
    const currentEmployee = await this.getEmployeeById(employeeId);
    if (!currentEmployee) {
      throw new NotFoundException('Employee not found');
    }
  
    const userUpdates: any = {};
    const profileUpdates: any = {};
  
    // ✅ User fields مع username
    if (updateEmployeeDto.username) userUpdates.username = updateEmployeeDto.username;
    if (updateEmployeeDto.firstName) userUpdates.firstName = updateEmployeeDto.firstName;
    if (updateEmployeeDto.lastName) userUpdates.lastName = updateEmployeeDto.lastName;
    if (updateEmployeeDto.phone) userUpdates.phone = updateEmployeeDto.phone;
    if (updateEmployeeDto.nationality) userUpdates.nationality = updateEmployeeDto.nationality;
    if (updateEmployeeDto.address) userUpdates.address = updateEmployeeDto.address;
    if (updateEmployeeDto.isActive !== undefined) userUpdates.isActive = updateEmployeeDto.isActive;
  
    // Profile fields
    if (updateEmployeeDto.cardNumber) profileUpdates.cardNumber = updateEmployeeDto.cardNumber;
    if (updateEmployeeDto.maritalStatus) profileUpdates.maritalStatus = updateEmployeeDto.maritalStatus;
    if (updateEmployeeDto.numberOfChildren !== undefined) profileUpdates.numberOfChildren = updateEmployeeDto.numberOfChildren;
    if (updateEmployeeDto.profilePictureUrl) profileUpdates.profilePictureUrl = updateEmployeeDto.profilePictureUrl;
    if (updateEmployeeDto.jobTitle) profileUpdates.jobTitle = updateEmployeeDto.jobTitle;
    if (updateEmployeeDto.salary !== undefined) profileUpdates.salary = updateEmployeeDto.salary;
    if (updateEmployeeDto.bankAccount) profileUpdates.bankAccount = updateEmployeeDto.bankAccount;
    if (updateEmployeeDto.socialSecurityNumber) profileUpdates.socialSecurityNumber = updateEmployeeDto.socialSecurityNumber;
    if (updateEmployeeDto.taxId) profileUpdates.taxId = updateEmployeeDto.taxId;
    if (updateEmployeeDto.notes) profileUpdates.notes = updateEmployeeDto.notes;
    if (updateEmployeeDto.employeeNumber) profileUpdates.employeeNumber = updateEmployeeDto.employeeNumber;
    if (updateEmployeeDto.specialties) profileUpdates.specialties = updateEmployeeDto.specialties;
  
    if (Object.keys(userUpdates).length > 0) {
      await this.userModel.findByIdAndUpdate(
        employeeId,
        { $set: userUpdates },
        { new: true, runValidators: true }
      );
    }
  
    if (Object.keys(profileUpdates).length > 0) {
      await this.employeeProfileModel.findOneAndUpdate(
        { userId: new Types.ObjectId(employeeId) },
        { $set: profileUpdates },
        { new: true, runValidators: true }
      );
    }
  
    this.logger.log(`Employee updated successfully: ${employeeId}`);
  
    return await this.getEmployeeById(employeeId);
  }


  /**
   * Soft delete employee
   */
  // في employee.service.ts

  /**
   * Delete employee with safety constraints
   */
  async deleteEmployee(
    employeeId: string,
    deletedByUserId?: string,
    authUser?: {
      id: string;
      role: string;
      organizationId?: string;
      complexId?: string;
      clinicId?: string;
    }
  ): Promise<void> {
    if (!Types.ObjectId.isValid(employeeId)) {
      throw new BadRequestException('Invalid employee ID format');
    }

    this.logger.log(`Attempting to delete employee: ${employeeId}`);

    // 🔐 1. التحقق من الصلاحيات
    if (authUser) {
      await this.validateEmployeeAccess(employeeId, authUser);
    }

    // 🔐 2. منع حذف المستخدم نفسه
    if (authUser && authUser.id === employeeId) {
      throw new ForbiddenException(
        'You cannot delete your own account. Please contact another administrator.'
      );
    }

    // 🔐 3. جلب بيانات الموظف
    const employee = await this.userModel.findById(employeeId).exec();
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // 🔐 4. منع حذف Owner
    if (employee.role === 'owner') {
      throw new ForbiddenException(
        'Owner accounts cannot be deleted. Please contact system support.'
      );
    }

    // 🔐 5. التحقق من أن الحساب معطل
    if (employee.isActive) {
      throw new BadRequestException(
        'Active accounts cannot be deleted. Please deactivate the account first.'
      );
    }

    // 🔐 6. التحقق من عدم وجود مواعيد مستقبلية (إذا كان طبيب)
    if (employee.role === 'doctor') {
      // TODO: عند إنشاء Appointment System
      // const futureAppointments = await this.appointmentModel.countDocuments({
      //   doctorId: employeeId,
      //   appointmentDate: { $gte: new Date() },
      //   status: { $in: ['scheduled', 'confirmed'] }
      // });
      // 
      // if (futureAppointments > 0) {
      //   throw new BadRequestException(
      //     `Cannot delete doctor with ${futureAppointments} upcoming appointments. ` +
      //     'Please reassign or cancel appointments first.'
      //   );
      // }

      this.logger.warn(
        `Deleting doctor ${employeeId}. Appointment check not implemented yet.`
      );
    }

    // ✅ 7. Soft Delete (تغيير إلى deleted بدلاً من حذف نهائي)
    await this.userModel.findByIdAndUpdate(employeeId, {
      $set: {
        isActive: false,
        deletedAt: new Date(),
        deletedBy: deletedByUserId ? new Types.ObjectId(deletedByUserId) : null,
        // يمكن إضافة flag للإشارة إلى الحذف
        isDeleted: true
      }
    });

    // Soft delete employee profile
    await this.employeeProfileModel.findOneAndUpdate(
      { userId: new Types.ObjectId(employeeId) },
      {
        $set: {
          isActive: false,
          isDeleted: true
        }
      }
    );

    // Soft delete all shifts
    await this.employeeShiftModel.updateMany(
      { userId: new Types.ObjectId(employeeId) },
      {
        $set: {
          isActive: false,
          isDeleted: true
        }
      }
    );

    // Soft delete all documents
    await this.employeeDocumentModel.updateMany(
      { userId: new Types.ObjectId(employeeId) },
      {
        $set: {
          isActive: false,
          isDeleted: true
        }
      }
    );

    this.logger.log(
      `Employee deleted successfully: ${employeeId} by user: ${deletedByUserId || 'system'}`
    );
  }

  /**
   * Terminate employee
   */
  async terminateEmployee(
    employeeId: string,
    terminateDto: TerminateEmployeeDto,
    userAuth: {
      id: string;
      role: string;
      organizationId?: string;
      complexId?: string;
      clinicId?: string;
    }
  ): Promise<any> {
    if (!Types.ObjectId.isValid(employeeId)) {
      throw new BadRequestException('Invalid employee ID format');
    }

    this.logger.log(`Terminating employee: ${employeeId}`);

    // 🔐 التحقق من الصلاحيات (استخدام الـ helper method)
    await this.validateEmployeeAccess(employeeId, userAuth);

    const employee = await this.getEmployeeById(employeeId);
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (!employee.isActive) {
      throw new BadRequestException('Employee is already terminated');
    }

    const terminationDate = new Date(terminateDto.terminationDate);

    // Validate termination date
    if (terminationDate < employee.employeeProfile.dateOfHiring) {
      throw new BadRequestException('Termination date cannot be before hiring date');
    }

    // Update user account
    await this.userModel.findByIdAndUpdate(employeeId, {
      $set: { isActive: false }
    });

    // Update employee profile with termination details
    await this.employeeProfileModel.findOneAndUpdate(
      { userId: new Types.ObjectId(employeeId) },
      {
        $set: {
          isActive: false,
          terminationDate: terminationDate,
          notes: `${employee.employeeProfile.notes || ''}\n\nTERMINATION:\nType: ${terminateDto.terminationType}\nReason: ${terminateDto.reason}\n${terminateDto.finalNotes || ''}`.trim()
        }
      }
    );

    // Deactivate all shifts
    await this.employeeShiftModel.updateMany(
      { userId: new Types.ObjectId(employeeId) },
      { $set: { isActive: false } }
    );

    this.logger.log(`Employee terminated successfully: ${employeeId}`);

    return await this.getEmployeeById(employeeId);
  }

  /**
   * Get employee by employee number
   */
  async getEmployeeByNumber(employeeNumber: string): Promise<any> {
    const profile = await this.employeeProfileModel
      .findOne({ employeeNumber, isActive: true })
      .populate('userId')
      .exec();

    if (!profile) {
      throw new NotFoundException('Employee not found');
    }

    return await this.getEmployeeById(profile.userId.toString());
  }

  /**
   * Search employees
   */
  async searchEmployees(
    searchTerm: string,
    limit: number = 20
  ): Promise<any[]> {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return [];
    }

    const pipeline = [
      {
        $lookup: {
          from: 'employee_profiles',
          localField: '_id',
          foreignField: 'userId',
          as: 'employeeProfile'
        }
      },
      {
        $unwind: {
          path: '$employeeProfile',
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $match: {
          isActive: true,
          'employeeProfile.isActive': true,
          $or: [
            { firstName: { $regex: searchTerm, $options: 'i' } },
            { lastName: { $regex: searchTerm, $options: 'i' } },
            { email: { $regex: searchTerm, $options: 'i' } },
            { phone: { $regex: searchTerm, $options: 'i' } },
            { 'employeeProfile.employeeNumber': { $regex: searchTerm, $options: 'i' } },
            { 'employeeProfile.jobTitle': { $regex: searchTerm, $options: 'i' } }
          ]
        }
      },
      {
        $limit: Math.min(limit, 50)
      },
      {
        $project: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          email: 1,
          phone: 1,
          role: 1,
          employeeNumber: '$employeeProfile.employeeNumber',
          jobTitle: '$employeeProfile.jobTitle'
        }
      }
    ];

    return await this.userModel.aggregate(pipeline).exec();
  }

  /**
   * Get employee statistics
   */
  async getEmployeeStats(): Promise<EmployeeStatsDto> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      totalEmployees,
      activeEmployees,
      newHiresThisMonth,
      newHiresThisYear,
      employeesByRole,
      salaryStats,
      genderStats,
      monthlyHiringTrend,
      upcomingExpirations
    ] = await Promise.all([
      // Total employees count
      this.employeeProfileModel.countDocuments({}),

      // Active employees count  
      this.employeeProfileModel.countDocuments({ isActive: true }),

      // New hires this month
      this.employeeProfileModel.countDocuments({
        dateOfHiring: { $gte: startOfMonth },
        isActive: true
      }),

      // New hires this year
      this.employeeProfileModel.countDocuments({
        dateOfHiring: { $gte: startOfYear },
        isActive: true
      }),

      // Employees by role
      this.userModel.aggregate([
        {
          $lookup: {
            from: 'employee_profiles',
            localField: '_id',
            foreignField: 'userId',
            as: 'profile'
          }
        },
        {
          $unwind: '$profile'
        },
        {
          $match: { 'profile.isActive': true }
        },
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]),

      // Salary statistics
      this.employeeProfileModel.aggregate([
        {
          $match: {
            isActive: true,
            salary: { $gt: 0 }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $group: {
            _id: null,
            averageSalary: { $avg: '$salary' },
            salaries: { $push: '$salary' },
            roleStats: {
              $push: {
                role: '$user.role',
                salary: '$salary'
              }
            }
          }
        }
      ]),

      // Gender distribution
      this.userModel.aggregate([
        {
          $lookup: {
            from: 'employee_profiles',
            localField: '_id',
            foreignField: 'userId',
            as: 'profile'
          }
        },
        {
          $unwind: '$profile'
        },
        {
          $match: { 'profile.isActive': true }
        },
        {
          $group: {
            _id: '$gender',
            count: { $sum: 1 }
          }
        }
      ]),

      // Monthly hiring trend (last 12 months)
      this.employeeProfileModel.aggregate([
        {
          $match: {
            dateOfHiring: {
              $gte: new Date(now.getFullYear() - 1, now.getMonth(), 1)
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$dateOfHiring' },
              month: { $month: '$dateOfHiring' }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ]),

      // Upcoming document expirations (next 30 days)
      this.employeeDocumentModel.aggregate([
        {
          $match: {
            expiryDate: {
              $gte: now,
              $lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
            },
            status: 'active',
            isActive: true
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $project: {
            employeeId: '$userId',
            employeeName: {
              $concat: ['$user.firstName', ' ', '$user.lastName']
            },
            documentType: 1,
            expiryDate: 1,
            daysUntilExpiry: {
              $divide: [
                { $subtract: ['$expiryDate', now] },
                24 * 60 * 60 * 1000
              ]
            }
          }
        },
        {
          $sort: { expiryDate: 1 }
        }
      ])
    ]);

    // Calculate additional statistics
    const inactiveEmployees = totalEmployees - activeEmployees;

    // Calculate average tenure
    const tenureResult = await this.employeeProfileModel.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $addFields: {
          tenureMonths: {
            $divide: [
              { $subtract: [now, '$dateOfHiring'] },
              30 * 24 * 60 * 60 * 1000 // Approximate months
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          averageTenure: { $avg: '$tenureMonths' }
        }
      }
    ]);

    const averageTenure = tenureResult.length > 0 ? Math.round(tenureResult[0].averageTenure) : 0;

    // Process role statistics
    const roleStats = employeesByRole.map(item => ({
      role: item._id,
      count: item.count,
      percentage: totalEmployees > 0 ? Math.round((item.count / totalEmployees) * 100) : 0
    }));

    // Process salary statistics
    const salaryStatistics = salaryStats.length > 0 ? {
      averageSalary: Math.round(salaryStats[0].averageSalary || 0),
      medianSalary: 0, // Would calculate from sorted salaries array
      salaryRangeByRole: [] // Would group by role and calculate ranges
    } : {
      averageSalary: 0,
      medianSalary: 0,
      salaryRangeByRole: []
    };

    // Process gender distribution
    const genderDistribution = {
      male: 0,
      female: 0,
      other: 0,
      malePercentage: 0,
      femalePercentage: 0
    };

    genderStats.forEach(stat => {
      genderDistribution[stat._id] = stat.count;
    });

    if (totalEmployees > 0) {
      genderDistribution.malePercentage = Math.round((genderDistribution.male / totalEmployees) * 100);
      genderDistribution.femalePercentage = Math.round((genderDistribution.female / totalEmployees) * 100);
    }

    // Process monthly hiring trend
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyTrend = monthlyHiringTrend.map(item => ({
      month: `${monthNames[item._id.month - 1]} ${item._id.year}`,
      count: item.count
    }));

    return {
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      newHiresThisMonth,
      newHiresThisYear,
      averageTenure,
      employeesByRole: roleStats,
      employeesByDepartment: [], // Would implement if department schema exists
      upcomingDocumentExpirations: upcomingExpirations,
      salaryStatistics,
      genderDistribution,
      ageDistribution: [], // Would calculate age ranges
      monthlyHiringTrend: monthlyTrend
    };
  }

  /**
   * Create employee document
   */
  async createEmployeeDocument(
    createDocumentDto: CreateEmployeeDocumentDto,
    uploadedByUserId?: string
  ): Promise<any> {
    // Validate employee exists
    const employee = await this.getEmployeeById(createDocumentDto.userId);
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const documentData = {
      ...createDocumentDto,
      userId: new Types.ObjectId(createDocumentDto.userId),
      uploadedBy: uploadedByUserId ? new Types.ObjectId(uploadedByUserId) : undefined,
      status: 'active',
      isVerified: false,
      isActive: true,
      issueDate: createDocumentDto.issueDate ? new Date(createDocumentDto.issueDate) : undefined,
      expiryDate: createDocumentDto.expiryDate ? new Date(createDocumentDto.expiryDate) : undefined,
    };

    const document = new this.employeeDocumentModel(documentData);
    return await document.save();
  }

  /**
   * Update employee document
   */
  async updateEmployeeDocument(
    documentId: string,
    updateDocumentDto: UpdateEmployeeDocumentDto,
    updatedByUserId?: string
  ): Promise<any> {
    if (!Types.ObjectId.isValid(documentId)) {
      throw new BadRequestException('Invalid document ID format');
    }

    const updateData: any = {
      ...updateDocumentDto,
      expiryDate: updateDocumentDto.expiryDate ? new Date(updateDocumentDto.expiryDate) : undefined,
    };

    if (updateDocumentDto.isVerified && updatedByUserId) {
      updateData.verifiedBy = new Types.ObjectId(updatedByUserId);
      updateData.verifiedAt = new Date();
    }

    const document = await this.employeeDocumentModel
      .findByIdAndUpdate(
        documentId,
        { $set: updateData },
        { new: true, runValidators: true }
      )
      .exec();

    if (!document) {
      throw new NotFoundException('Employee document not found');
    }

    return document;
  }

  /**
   * Get employee documents
   */
  async getEmployeeDocuments(employeeId: string): Promise<any[]> {
    if (!Types.ObjectId.isValid(employeeId)) {
      throw new BadRequestException('Invalid employee ID format');
    }

    return await this.employeeDocumentModel
      .find({
        userId: new Types.ObjectId(employeeId),
        isActive: true
      })
      .populate('uploadedBy', 'firstName lastName')
      .populate('verifiedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Create employee shift
   */
  async createEmployeeShift(
    createShiftDto: CreateEmployeeShiftDto
  ): Promise<any> {
    // Validate employee exists
    const employee = await this.getEmployeeById(createShiftDto.userId);
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Validate shift times
    const startTime = createShiftDto.startTime.split(':');
    const endTime = createShiftDto.endTime.split(':');
    const startMinutes = parseInt(startTime[0]) * 60 + parseInt(startTime[1]);
    const endMinutes = parseInt(endTime[0]) * 60 + parseInt(endTime[1]);

    if (startMinutes >= endMinutes) {
      throw new BadRequestException('End time must be after start time');
    }

    // Check for overlapping shifts on the same day
    const existingShift = await this.employeeShiftModel.findOne({
      userId: new Types.ObjectId(createShiftDto.userId),
      dayOfWeek: createShiftDto.dayOfWeek,
      entityType: createShiftDto.entityType,
      entityId: new Types.ObjectId(createShiftDto.entityId),
      isActive: true
    });

    if (existingShift) {
      throw new ConflictException(`Employee already has a shift on ${createShiftDto.dayOfWeek} for this ${createShiftDto.entityType}`);
    }

    const shiftData = {
      ...createShiftDto,
      userId: new Types.ObjectId(createShiftDto.userId),
      entityId: new Types.ObjectId(createShiftDto.entityId),
      breakDurationMinutes: createShiftDto.breakDurationMinutes || 0,
      isActive: true,
    };

    const shift = new this.employeeShiftModel(shiftData);
    return await shift.save();
  }

  /**
   * Get employee shifts
   */
  async getEmployeeShifts(employeeId: string): Promise<any[]> {
    if (!Types.ObjectId.isValid(employeeId)) {
      throw new BadRequestException('Invalid employee ID format');
    }

    return await this.employeeShiftModel
      .find({
        userId: new Types.ObjectId(employeeId),
        isActive: true
      })
      .populate('entityId')
      .sort({ dayOfWeek: 1, startTime: 1 })
      .exec();
  }

  /**
   * Bulk employee actions
   */
  async bulkEmployeeAction(
    bulkActionDto: BulkEmployeeActionDto,
    actionByUserId?: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const { employeeIds, action, reason, effectiveDate } = bulkActionDto;
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const employeeId of employeeIds) {
      try {
        switch (action) {
          case 'activate':
            await this.updateEmployee(employeeId, { isActive: true }, actionByUserId);
            break;
          case 'deactivate':
            await this.updateEmployee(employeeId, { isActive: false }, actionByUserId);
            break;
          case 'terminate':
            if (!effectiveDate || !reason) {
              throw new BadRequestException('Termination requires effective date and reason');
            }
            await this.terminateEmployee(
              employeeId,
              {
                terminationDate: effectiveDate,
                terminationType: 'other',
                reason,
              },
              {
                id: actionByUserId || '', // Provide a fallback if undefined
                role: 'admin', // Or another appropriate role if you have it
              }
            );
            break;
          case 'export':
            // Export logic would be implemented here
            break;
        }
        success++;
      } catch (error) {
        failed++;
        errors.push(`Employee ${employeeId}: ${error.message}`);
      }
    }

    return { success, failed, errors };
  }
  /**
 * إعادة تفعيل موظف معطل
 */
  async activateEmployee(
    employeeId: string,
    activatedByUserId: string,
    authUser: {
      id: string;
      role: string;
      organizationId?: string;
      complexId?: string;
      clinicId?: string;
    }
  ): Promise<any> {
    if (!Types.ObjectId.isValid(employeeId)) {
      throw new BadRequestException('Invalid employee ID format');
    }

    this.logger.log(`Activating employee: ${employeeId}`);

    // 🔐 التحقق من الصلاحيات
    await this.validateEmployeeAccess(employeeId, authUser);

    // جلب الموظف
    const employee = await this.getEmployeeById(employeeId);
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
  // ✅ التحقق من أنه غير محذوف
  if (employee.isDeleted) {
    throw new BadRequestException(
      'Cannot activate a deleted employee. Use restore functionality instead.'
    );
  }
    // التحقق من أنه معطل بالفعل
    if (employee.isActive) {
      throw new BadRequestException('Employee is already active');
    }

    // إعادة التفعيل
    await this.userModel.findByIdAndUpdate(employeeId, {
      $set: { isActive: true }
    });

    await this.employeeProfileModel.findOneAndUpdate(
      { userId: new Types.ObjectId(employeeId) },
      { $set: { isActive: true } }
    );

    // إعادة تفعيل المناوبات
    await this.employeeShiftModel.updateMany(
      { userId: new Types.ObjectId(employeeId) },
      { $set: { isActive: true } }
    );

    this.logger.log(`Employee activated successfully: ${employeeId} by user: ${activatedByUserId}`);

    return await this.getEmployeeById(employeeId);
  }

  /**
   * إعادة تفعيل موظف منتهي الخدمة (Reactivation بعد Termination)
   */
  async reactivateTerminatedEmployee(
    employeeId: string,
    reactivationDto: {
      reason: string;
      newJobTitle?: string;
      newSalary?: number;
      dateOfReactivation: string;
    },
    reactivatedByUserId: string,
    authUser: {
      id: string;
      role: string;
      organizationId?: string;
      complexId?: string;
      clinicId?: string;
    }
  ): Promise<any> {
    if (!Types.ObjectId.isValid(employeeId)) {
      throw new BadRequestException('Invalid employee ID format');
    }

    this.logger.log(`Reactivating terminated employee: ${employeeId}`);

    // 🔐 التحقق من الصلاحيات
    await this.validateEmployeeAccess(employeeId, authUser);

    const employee = await this.getEmployeeById(employeeId);
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (employee.isActive) {
      throw new BadRequestException('Employee is already active');
    }

    // التحقق من أن لديه terminationDate (كان منتهي الخدمة)
    if (!employee.employeeProfile.terminationDate) {
      throw new BadRequestException('This employee was not terminated. Use activate endpoint instead.');
    }

    const reactivationDate = new Date(reactivationDto.dateOfReactivation);

    // التحقق من التاريخ
    if (reactivationDate < employee.employeeProfile.terminationDate) {
      throw new BadRequestException('Reactivation date must be after termination date');
    }

    // إعادة التفعيل
    await this.userModel.findByIdAndUpdate(employeeId, {
      $set: { isActive: true }
    });

    const profileUpdates: any = {
      isActive: true,
      terminationDate: null, // إزالة تاريخ الإنهاء
      dateOfHiring: reactivationDate, // تاريخ إعادة التوظيف
      notes: `${employee.employeeProfile.notes || ''}\n\nREACTIVATION:\nDate: ${reactivationDate.toISOString()}\nReason: ${reactivationDto.reason}`.trim()
    };

    if (reactivationDto.newJobTitle) {
      profileUpdates.jobTitle = reactivationDto.newJobTitle;
    }
    if (reactivationDto.newSalary) {
      profileUpdates.salary = reactivationDto.newSalary;
    }

    await this.employeeProfileModel.findOneAndUpdate(
      { userId: new Types.ObjectId(employeeId) },
      { $set: profileUpdates }
    );

    // إعادة تفعيل المناوبات (اختياري - قد تحتاج إنشاء جديدة)
    await this.employeeShiftModel.updateMany(
      { userId: new Types.ObjectId(employeeId) },
      { $set: { isActive: true } }
    );

    this.logger.log(`Employee reactivated successfully: ${employeeId} by user: ${reactivatedByUserId}`);

    return await this.getEmployeeById(employeeId);
  }
  /**
   * التحقق من أن المستخدم يملك الوصول للكيان المحدد
   */
  private async validateEntityOwnership(
    entityId: string,
    entityType: 'organization' | 'complex' | 'clinic',
    authUser: {
      id: string;
      role: string;
      organizationId?: string;
      complexId?: string;
      clinicId?: string;
    }
  ): Promise<void> {
    if (!entityId) {
      return; // لا يوجد كيان محدد
    }

    // جلب نطاق الصلاحيات
    const scope = await this.getUserAccessScope(authUser);

    let hasAccess = false;
    const entityObjectId = new Types.ObjectId(entityId);

    switch (entityType) {
      case 'organization':
        hasAccess = scope.allowedOrganizationIds.some(
          id => id.toString() === entityObjectId.toString()
        );
        break;
      case 'complex':
        hasAccess = scope.allowedComplexIds.some(
          id => id.toString() === entityObjectId.toString()
        );
        break;
      case 'clinic':
        hasAccess = scope.allowedClinicIds.some(
          id => id.toString() === entityObjectId.toString()
        );
        break;
    }

    if (!hasAccess) {
      throw new ForbiddenException(
        `You do not have permission to create employees in this ${entityType}`
      );
    }
  }

  /**
   * التحقق من صحة الكيانات المُرسلة عند الإنشاء
   */
  private async validateCreateEmployeeEntities(
    createEmployeeDto: CreateEmployeeDto,
    authUser: {
      id: string;
      role: string;
      organizationId?: string;
      complexId?: string;
      clinicId?: string;
    }
  ): Promise<void> {
    const { organizationId, complexId, clinicId } = createEmployeeDto;

    // على الأقل يجب تحديد كيان واحد
    if (!organizationId && !complexId && !clinicId) {
      throw new BadRequestException(
        'At least one of organizationId, complexId, or clinicId must be provided'
      );
    }

    // التحقق من ملكية كل كيان محدد
    if (organizationId) {
      await this.validateEntityOwnership(organizationId, 'organization', authUser);
    }

    if (complexId) {
      await this.validateEntityOwnership(complexId, 'complex', authUser);

      // التحقق من أن Complex ينتمي للـ Organization المحددة
      if (organizationId) {
        const complex = await this.complexModel.findById(complexId).exec();
        if (!complex) {
          throw new NotFoundException('Complex not found');
        }
        if (complex.organizationId?.toString() !== organizationId) {
          throw new BadRequestException(
            'Complex does not belong to the specified organization'
          );
        }
      }
    }

    if (clinicId) {
      await this.validateEntityOwnership(clinicId, 'clinic', authUser);

      // التحقق من أن Clinic ينتمي للـ Complex المحدد
      if (complexId) {
        const clinic = await this.clinicModel.findById(clinicId).exec();
        if (!clinic) {
          throw new NotFoundException('Clinic not found');
        }
        if (clinic.complexId?.toString() !== complexId) {
          throw new BadRequestException(
            'Clinic does not belong to the specified complex'
          );
        }
      }
    }
  }
  /**
   * جلب الكيانات المتاحة للمستخدم لإنشاء موظفين فيها
   */
  async getAvailableEntitiesForUser(authUser: {
    id: string;
    role: string;
    organizationId?: string;
    complexId?: string;
    clinicId?: string;
  }): Promise<{
    organizations: any[];
    complexes: any[];
    clinics: any[];
  }> {
    const scope = await this.getUserAccessScope(authUser);

    // جلب تفاصيل Organizations
    const organizations = await this.organizationModel
      .find({ _id: { $in: scope.allowedOrganizationIds } })
      .select('_id name email')
      .exec();

    // جلب تفاصيل Complexes
    const complexes = await this.complexModel
      .find({ _id: { $in: scope.allowedComplexIds } })
      .select('_id name organizationId')
      .exec();

    // جلب تفاصيل Clinics
    const clinics = await this.clinicModel
      .find({ _id: { $in: scope.allowedClinicIds } })
      .select('_id name complexId organizationId')
      .exec();

    return {
      organizations,
      complexes,
      clinics
    };
  }
} 