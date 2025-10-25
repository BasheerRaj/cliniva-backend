import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Complex } from '../database/schemas/complex.schema';
import { CreateComplexDto, UpdateComplexDto, SetupBusinessProfileDto } from './dto/create-complex.dto';
import { ValidationUtil } from '../common/utils/validation.util';
import { SubscriptionService } from '../subscription/subscription.service';
import { UserRole } from 'src/common/enums/user-role.enum';
import { User } from 'src/database/schemas/user.schema';
import { Organization } from 'src/database/schemas/organization.schema';
import { PaginateComplexesDto } from './dto/paginate-complexes.dto';
import { ComplexListItemDto } from './dto/complex-response.dto';
import { da } from '@faker-js/faker';

@Injectable()
export class ComplexService {
  constructor(
    @InjectModel('Complex') private readonly complexModel: Model<Complex>,
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('Organization') private readonly organizationModel: Model<Organization>,
    private readonly subscriptionService: SubscriptionService,
  ) { }

  async createComplex(createComplexDto: CreateComplexDto): Promise<Complex> {
    // Validate subscription is active
    const isActive = await this.subscriptionService.isSubscriptionActive(createComplexDto.subscriptionId);
    if (!isActive) {
      throw new BadRequestException('Subscription is not active');
    }

    // Validate subscription limits
    const currentComplexes = await this.complexModel.countDocuments({
      subscriptionId: new Types.ObjectId(createComplexDto.subscriptionId)
    });

    const { plan } = await this.subscriptionService.getSubscriptionWithPlan(createComplexDto.subscriptionId);
    if (plan.maxComplexes && plan.maxComplexes > 0 && currentComplexes >= plan.maxComplexes) {
      throw new BadRequestException(`Plan allows maximum ${plan.maxComplexes} complex(es)`);
    }

    // Validate business profile for complex-only plans
    if (!createComplexDto.organizationId) {
      const businessProfileValidation = ValidationUtil.validateBusinessProfile({
        yearEstablished: createComplexDto.yearEstablished,
        vision: createComplexDto.vision,
        ceoName: createComplexDto.ceoName,
        vatNumber: createComplexDto.vatNumber,
        crNumber: createComplexDto.crNumber
      });

      if (!businessProfileValidation.isValid) {
        throw new BadRequestException(`Validation failed: ${businessProfileValidation.errors.join(', ')}`);
      }
    }

    // Validate contact information
    if (createComplexDto.email && !ValidationUtil.validateEmail(createComplexDto.email)) {
      throw new BadRequestException('Invalid email format');
    }

    if (createComplexDto.phone && !ValidationUtil.validatePhone(createComplexDto.phone)) {
      throw new BadRequestException('Invalid phone number format');
    }

    const complexData = {
      ...createComplexDto,
      organizationId: createComplexDto.organizationId ? new Types.ObjectId(createComplexDto.organizationId) : null,
      subscriptionId: new Types.ObjectId(createComplexDto.subscriptionId)
    };

    const complex = new this.complexModel(complexData);
    return await complex.save();
  }

  async getComplex(complexId: string): Promise<Complex> {
    const complex = await this.complexModel.findById(complexId).exec();
    if (!complex) {
      throw new NotFoundException('Complex not found');
    }
    return complex;
  }

  async getComplexesByOrganization(organizationId: string): Promise<Complex[]> {
    return await this.complexModel
      .find({ organizationId: new Types.ObjectId(organizationId) })
      .exec();
  }

  async getComplexBySubscription(subscriptionId: string): Promise<Complex | null> {
    return await this.complexModel
      .findOne({ subscriptionId: new Types.ObjectId(subscriptionId) })
      .exec();
  }

  async updateComplex(complexId: string, updateComplexDto: UpdateComplexDto): Promise<Complex> {
    const complex = await this.getComplex(complexId);

    // Validate business profile data if provided
    if (this.hasBusinessProfileData(updateComplexDto)) {
      const businessProfileValidation = ValidationUtil.validateBusinessProfile({
        yearEstablished: updateComplexDto.yearEstablished,
        vision: updateComplexDto.vision,
        ceoName: updateComplexDto.ceoName,
        vatNumber: updateComplexDto.vatNumber,
        crNumber: updateComplexDto.crNumber,
      });

      if (!businessProfileValidation.isValid) {
        throw new BadRequestException(`Validation failed: ${businessProfileValidation.errors.join(', ')}`);
      }
    }

    Object.assign(complex, updateComplexDto);
    return await complex.save();
  }

  async setupBusinessProfile(complexId: string, businessProfileDto: SetupBusinessProfileDto): Promise<Complex> {
    const complex = await this.getComplex(complexId);

    // Validate business profile
    const validation = ValidationUtil.validateBusinessProfile(businessProfileDto);
    if (!validation.isValid) {
      throw new BadRequestException(`Validation failed: ${validation.errors.join(', ')}`);
    }

    Object.assign(complex, businessProfileDto);
    return await complex.save();
  }

  private hasBusinessProfileData(data: any): boolean {
    return !!(
      data.yearEstablished ||
      data.mission ||
      data.vision ||
      data.ceoName ||
      data.vatNumber ||
      data.crNumber ||
      data.description
    );
  }

  // ======== VALIDATION METHODS ========

  async isNameAvailable(name: string, organizationId?: string): Promise<boolean> {
    try {
      const trimmedName = name.trim().toLowerCase();
      if (!trimmedName) return false;

      const query: any = {
        name: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
      };

      // If organizationId is provided, check within that organization scope
      if (organizationId) {
        query.organizationId = new Types.ObjectId(organizationId);
      }

      const existingComplex = await this.complexModel.findOne(query).exec();
      return !existingComplex;
    } catch (error) {
      console.error('Error checking complex name availability:', error);
      return false;
    }
  }

  async isEmailAvailable(email: string): Promise<boolean> {
    try {
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail) return false;

      const existingComplex = await this.complexModel.findOne({
        email: { $regex: new RegExp(`^${trimmedEmail}$`, 'i') }
      }).exec();

      return !existingComplex;
    } catch (error) {
      console.error('Error checking email availability:', error);
      return false;
    }
  }
  async canAccessComplex(userId: string, complexId: string): Promise<{
    hasAccess: boolean;
    reason?: string;
    user?: User;
    complex?: Complex;
  }> {
    try {
      const user = await this.userModel.findById(userId)
        .select('organizationId complexId role')
        .exec();

      if (!user) {
        return { hasAccess: false, reason: 'User not found' };
      }

      const complex = await this.complexModel.findById(complexId).exec();

      if (!complex) {
        return { hasAccess: false, reason: 'Complex not found' };
      }

      const userOrgId = user.organizationId?.toString();
      const userComplexId = user.complexId?.toString();
      const complexOrgId = complex.organizationId?.toString();
      const isOwner = userId === complex.ownerId?.toString();
      const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;

      // السماح بالوصول إذا:
      const belongsToSameOrg = userOrgId && userOrgId === complexOrgId;
      const belongsToComplex = userComplexId === complexId;

      const hasAccess = belongsToSameOrg || belongsToComplex || isOwner || isSuperAdmin;

      if (!hasAccess) {
        return {
          hasAccess: false,
          reason: 'You do not have permission to access this complex',
          user,
          complex
        };
      }

      return { hasAccess: true, user, complex };

    } catch (error) {
      console.error('Error checking complex access:', error);
      return { hasAccess: false, reason: 'Error checking permissions' };
    }
  }

  /**
   * تحقق من صلاحية التعديل
   */
  async canModifyComplex(userId: string, complexId: string): Promise<{
    canModify: boolean;
    reason?: string;
    user?: User;
    complex?: Complex;
  }> {
    try {
      const user = await this.userModel.findById(userId).select('role').exec();

      if (!user) {
        return { canModify: false, reason: 'User not found' };
      }

      const complex = await this.complexModel.findById(complexId).exec();

      if (!complex) {
        return { canModify: false, reason: 'Complex not found' };
      }

      const isOwner = userId === complex.ownerId?.toString();
      const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;
      const isAdmin = user.role === UserRole.ADMIN;

      const canModify = isOwner || isSuperAdmin || isAdmin;

      if (!canModify) {
        return {
          canModify: false,
          reason: 'Only the complex owner or admin can modify it',
          user,
          complex
        };
      }

      return { canModify: true, user, complex };

    } catch (error) {
      console.error('Error checking complex modify permission:', error);
      return { canModify: false, reason: 'Error checking permissions' };
    }
  }

  /**
   * تحقق من صلاحية عرض قائمة الـ complexes
   */
  async canViewComplexesList(userId: string): Promise<{
    canView: boolean;
    reason?: string;
    user?: User;
    organizationId?: string;
  }> {
    try {
      const user = await this.userModel.findById(userId)
        .select('organizationId role')
        .exec();

      if (!user) {
        return { canView: false, reason: 'User not found' };
      }

      // السماح للـ Owner, Admin, Manager
      const allowedRoles = [
        UserRole.OWNER,
        UserRole.ADMIN,
        UserRole.SUPER_ADMIN
      ];

      if (!allowedRoles.includes(user.role as UserRole)) {
        return {
          canView: false,
          reason: 'Only owners and admins can view complexes list',
          user
        };
      }

      return {
        canView: true,
        user,
        organizationId: user.organizationId?.toString()
      };

    } catch (error) {
      console.error('Error checking view complexes permission:', error);
      return { canView: false, reason: 'Error checking permissions' };
    }
  }
  // ======== PAGINATED LIST METHOD ========

  /**
   * عرض قائمة الـ Complexes مع pagination وفلاتر
   */
  async getPaginatedComplexes(
    userId: string,
    paginateDto: PaginateComplexesDto
  ): Promise<{
    complexes: ComplexListItemDto[];
    pagination: any;
  }> {
    // تحقق من الصلاحيات
    const permission = await this.canViewComplexesList(userId);

    if (!permission.canView) {
      throw new ForbiddenException(permission.reason || 'Access denied');
    }

    const {
      page = 1,
      limit = 10,
      search,
      organizationId,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = paginateDto;

    // بناء الـ query
    const query: any = {};

    // فلترة حسب المنظمة (إذا كان المستخدم ليس super admin)
    if (permission.user?.role !== UserRole.SUPER_ADMIN) {
      if (permission.organizationId) {
        query.organizationId = new Types.ObjectId(permission.organizationId);
      }
    } else if (organizationId) {
      // Super admin يمكنه فلترة حسب أي منظمة
      query.organizationId = new Types.ObjectId(organizationId);
    }

    // البحث بالاسم
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    // فلترة حسب الحالة (نفترض أن isActive موجود)
    // إذا لم يكن موجوداً، يمكنك إضافة الحقل للـ schema
    // if (status) {
    //   query.isActive = status === 'active';
    // }

    // حساب الـ pagination
    const skip = (page - 1) * limit;

    // ترتيب النتائج
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // جلب البيانات
    const [complexes, totalItems] = await Promise.all([
      this.complexModel
        .find(query)
        .populate('organizationId', 'name')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.complexModel.countDocuments(query).exec()
    ]);

    // جلب عدد العيادات والمواعيد لكل complex
    const complexesWithCounts = await Promise.all(
      complexes.map(async (complex, index) => {
        const complexId = (complex._id as any).toString();

        // عدد العيادات
        const clinicsCount = await this.getClinicsCount(complexId);

        // عدد المواعيد المجدولة
        const appointmentsCount = await this.getScheduledAppointmentsCount(complexId);

        return {
          no: skip + index + 1,
          complexId: complexId,
          complexName: complex.name,
          scheduledAppointmentsCount: appointmentsCount,
          clinicsAssignedCount: clinicsCount,
          pic: complex.managerName || 'N/A', // Person in Charge
          status: 'active' as const, // يمكن تحديثه إذا كان لديك حقل isActive
          organizationName: (complex.organizationId as any)?.name || 'N/A',
        } as ComplexListItemDto;
      })
    );

    // حساب معلومات الـ pagination
    const totalPages = Math.ceil(totalItems / limit);

    return {
      complexes: complexesWithCounts,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
        
      }
    };
  }

  /**
   * حساب عدد العيادات في الـ complex
   */
  private async getClinicsCount(complexId: string): Promise<number> {
    try {
      // يجب أن يكون لديك Clinic model
      // هنا نستخدم placeholder - قم بتحديثه حسب structure الخاص بك
      const Clinic = this.complexModel.db.model('Clinic');
      return await Clinic.countDocuments({ complexId: new Types.ObjectId(complexId) }).exec();
    } catch (error) {
      console.error('Error counting clinics:', error);
      return 0;
    }
  }

  /**
   * حساب عدد المواعيد المجدولة في الـ complex
   */
  private async getScheduledAppointmentsCount(complexId: string): Promise<number> {
    try {
      // يجب أن يكون لديك Appointment model
      // هنا نستخدم placeholder - قم بتحديثه حسب structure الخاص بك
      const Appointment = this.complexModel.db.model('Appointment');

      // الحصول على جميع clinics في الـ complex
      const Clinic = this.complexModel.db.model('Clinic');
      const clinics = await Clinic.find({ complexId: new Types.ObjectId(complexId) })
        .select('_id')
        .exec();

      const clinicIds = clinics.map(c => c._id);

      // عد المواعيد المجدولة في هذه العيادات
      return await Appointment.countDocuments({
        clinicId: { $in: clinicIds },
        status: { $in: ['scheduled', 'confirmed'] }
      }).exec();
    } catch (error) {
      console.error('Error counting appointments:', error);
      return 0;
    }
  }

}
