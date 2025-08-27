import { 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  ConflictException,
  ForbiddenException,
  Logger
} from '@nestjs/common';
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
  ) {}

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
    }

    // Validate date of birth (should not be in the future and person should be at least 16)
    if (createDto.dateOfBirth) {
      const birthDate = new Date(createDto.dateOfBirth);
      const today = new Date();
      const minAge = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());
      
      if (birthDate > today) {
        throw new BadRequestException('Date of birth cannot be in the future');
      }
      
      if (birthDate > minAge) {
        throw new BadRequestException('Employee must be at least 16 years old');
      }
    }

    // Validate date of hiring
    if (createDto.dateOfHiring) {
      const hiringDate = new Date(createDto.dateOfHiring);
      const today = new Date();
      const maxFutureDate = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
      
      if (hiringDate > maxFutureDate) {
        throw new BadRequestException('Hiring date cannot be more than 1 year in the future');
      }
    }

    // Validate salary (if provided, should be reasonable)
    if (createDto.salary && (createDto.salary < 0 || createDto.salary > 1000000)) {
      throw new BadRequestException('Salary must be between 0 and 1,000,000');
    }

    // Validate assignment entities exist
    if (createDto.organizationId) {
      const organization = await this.organizationModel.findById(createDto.organizationId);
      if (!organization) {
        throw new NotFoundException('Organization not found');
      }
    }

    if (createDto.complexId) {
      const complex = await this.complexModel.findById(createDto.complexId);
      if (!complex) {
        throw new NotFoundException('Complex not found');
      }
    }

    if (createDto.clinicId) {
      const clinic = await this.clinicModel.findById(createDto.clinicId);
      if (!clinic) {
        throw new NotFoundException('Clinic not found');
      }
    }
  }

  /**
   * Create a new employee
   */
  async createEmployee(
    createEmployeeDto: CreateEmployeeDto,
    createdByUserId?: string
  ): Promise<any> {
    this.logger.log(`Creating employee: ${createEmployeeDto.email}`);

    await this.validateEmployeeData(createEmployeeDto);

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(createEmployeeDto.password, saltRounds);

    // Generate employee number if not provided
    const employeeNumber = createEmployeeDto.employeeNumber || await this.generateEmployeeNumber();

    // Create user account
    const userData = {
      email: createEmployeeDto.email,
      password: hashedPassword,
      firstName: createEmployeeDto.firstName,
      lastName: createEmployeeDto.lastName,
      phone: createEmployeeDto.phone,
      role: createEmployeeDto.role,
      nationality: createEmployeeDto.nationality,
      gender: createEmployeeDto.gender,
      dateOfBirth: new Date(createEmployeeDto.dateOfBirth),
      address: createEmployeeDto.address,
      isActive: true,
      emailVerified: false, // Will need to verify email
      setupComplete: false,
      onboardingComplete: false,
    };

    const user = new this.userModel(userData);
    const savedUser = await user.save();

    // Create employee profile
    const profileData = {
      userId: savedUser._id,
      employeeNumber,
      cardNumber: createEmployeeDto.cardNumber,
      maritalStatus: createEmployeeDto.maritalStatus,
      numberOfChildren: createEmployeeDto.numberOfChildren || 0,
      profilePictureUrl: createEmployeeDto.profilePictureUrl,
      jobTitle: createEmployeeDto.jobTitle,
      dateOfHiring: new Date(createEmployeeDto.dateOfHiring),
      salary: createEmployeeDto.salary,
      bankAccount: createEmployeeDto.bankAccount,
      socialSecurityNumber: createEmployeeDto.socialSecurityNumber,
      taxId: createEmployeeDto.taxId,
      notes: createEmployeeDto.notes,
      isActive: true,
    };

    const employeeProfile = new this.employeeProfileModel(profileData);
    const savedProfile = await employeeProfile.save();

    this.logger.log(`Employee created successfully: ${savedUser.email} (ID: ${savedUser._id})`);

    // Return combined user and profile data
    return {
      ...savedUser.toObject(),
      employeeProfile: savedProfile.toObject(),
    };
  }

  /**
   * Get employees with filtering and pagination
   */
  async getEmployees(query: EmployeeSearchQueryDto): Promise<{
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
      organizationId,
      complexId,
      clinicId,
      isActive,
      dateHiredFrom,
      dateHiredTo,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query;

    // Build user filter
    const userFilter: any = {};
    
    if (firstName) userFilter.firstName = { $regex: firstName, $options: 'i' };
    if (lastName) userFilter.lastName = { $regex: lastName, $options: 'i' };
    if (email) userFilter.email = { $regex: email, $options: 'i' };
    if (role) userFilter.role = role;
    if (isActive !== undefined) userFilter.isActive = isActive;

    // Search across multiple fields
    if (search) {
      userFilter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Build employee profile filter
    const profileFilter: any = { isActive: true };
    
    if (employeeNumber) profileFilter.employeeNumber = { $regex: employeeNumber, $options: 'i' };
    if (jobTitle) profileFilter.jobTitle = { $regex: jobTitle, $options: 'i' };

    // Date filtering
    if (dateHiredFrom || dateHiredTo) {
      profileFilter.dateOfHiring = {};
      if (dateHiredFrom) profileFilter.dateOfHiring.$gte = new Date(dateHiredFrom);
      if (dateHiredTo) profileFilter.dateOfHiring.$lte = new Date(dateHiredTo);
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.max(1, Math.min(100, parseInt(limit)));
    const skip = (pageNum - 1) * pageSize;

    // Sorting
    const sort: any = {};
    if (sortBy.includes('.')) {
      // Handle nested sorting like 'employeeProfile.dateOfHiring'
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }

    // Aggregate pipeline to join users with employee profiles
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
          ...userFilter,
          'employeeProfile.isActive': true,
          ...(Object.keys(profileFilter).length > 1 && {
            $and: Object.entries(profileFilter).map(([key, value]) => ({
              [`employeeProfile.${key}`]: value
            }))
          })
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
      },
      {
        $sort: sort
      },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: pageSize }
          ],
          count: [
            { $count: 'total' }
          ]
        }
      }
    ];

    const result = await this.userModel.aggregate(pipeline).exec();
    
    const employees = result[0].data || [];
    const total = result[0].count[0]?.total || 0;
    const totalPages = Math.ceil(total / pageSize);

    return {
      employees,
      total,
      page: pageNum,
      totalPages
    };
  }

  /**
   * Get employee by ID
   */
  async getEmployeeById(employeeId: string): Promise<any> {
    if (!Types.ObjectId.isValid(employeeId)) {
      throw new BadRequestException('Invalid employee ID format');
    }

    const pipeline = [
      {
        $match: { _id: new Types.ObjectId(employeeId) }
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
    updatedByUserId?: string
  ): Promise<any> {
    if (!Types.ObjectId.isValid(employeeId)) {
      throw new BadRequestException('Invalid employee ID format');
    }

    this.logger.log(`Updating employee: ${employeeId}`);

    await this.validateEmployeeData(updateEmployeeDto, true, employeeId);

    // Get current employee
    const currentEmployee = await this.getEmployeeById(employeeId);
    if (!currentEmployee) {
      throw new NotFoundException('Employee not found');
    }

    // Separate user updates from profile updates
    const userUpdates: any = {};
    const profileUpdates: any = {};

    // User fields
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

    // Update user if there are user updates
    if (Object.keys(userUpdates).length > 0) {
      await this.userModel.findByIdAndUpdate(
        employeeId,
        { $set: userUpdates },
        { new: true, runValidators: true }
      );
    }

    // Update employee profile if there are profile updates
    if (Object.keys(profileUpdates).length > 0) {
      await this.employeeProfileModel.findOneAndUpdate(
        { userId: new Types.ObjectId(employeeId) },
        { $set: profileUpdates },
        { new: true, runValidators: true }
      );
    }

    this.logger.log(`Employee updated successfully: ${employeeId}`);

    // Return updated employee
    return await this.getEmployeeById(employeeId);
  }

  /**
   * Soft delete employee
   */
  async deleteEmployee(employeeId: string, deletedByUserId?: string): Promise<void> {
    if (!Types.ObjectId.isValid(employeeId)) {
      throw new BadRequestException('Invalid employee ID format');
    }

    this.logger.log(`Soft deleting employee: ${employeeId}`);

    const employee = await this.getEmployeeById(employeeId);
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Deactivate user account
    await this.userModel.findByIdAndUpdate(
      employeeId,
      { 
        $set: { 
          isActive: false 
        }
      }
    );

    // Deactivate employee profile
    await this.employeeProfileModel.findOneAndUpdate(
      { userId: new Types.ObjectId(employeeId) },
      { 
        $set: { 
          isActive: false 
        }
      }
    );

    // Deactivate all shifts
    await this.employeeShiftModel.updateMany(
      { userId: new Types.ObjectId(employeeId) },
      { 
        $set: { 
          isActive: false 
        }
      }
    );

    this.logger.log(`Employee soft deleted successfully: ${employeeId}`);
  }

  /**
   * Terminate employee
   */
  async terminateEmployee(
    employeeId: string,
    terminateDto: TerminateEmployeeDto,
    terminatedByUserId?: string
  ): Promise<any> {
    if (!Types.ObjectId.isValid(employeeId)) {
      throw new BadRequestException('Invalid employee ID format');
    }

    this.logger.log(`Terminating employee: ${employeeId}`);

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
    await this.userModel.findByIdAndUpdate(
      employeeId,
      { 
        $set: { 
          isActive: false 
        }
      }
    );

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
      { 
        $set: { 
          isActive: false 
        }
      }
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
              actionByUserId
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
} 