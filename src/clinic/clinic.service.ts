import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Clinic } from '../database/schemas/clinic.schema';
import { Complex } from '../database/schemas/complex.schema';
import {
  CreateClinicDto,
  UpdateClinicDto,
  SetupCapacityDto,
  SetupBusinessProfileDto,
} from './dto/create-clinic.dto';
import { ClinicFilterDto } from './dto/clinic-filter.dto';
import { ValidationUtil } from '../common/utils/validation.util';
import { ResponseBuilder } from '../common/utils/response-builder.util';
import { ERROR_MESSAGES } from '../common/utils/error-messages.constant';
import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class ClinicService {
  constructor(
    @InjectModel('Clinic') private readonly clinicModel: Model<Clinic>,
    @InjectModel('Complex') private readonly complexModel: Model<Complex>,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async findClinicBySubscription(
    subscriptionId: string,
  ): Promise<Clinic | null> {
    try {
      return await this.clinicModel
        .findOne({
          subscriptionId: new Types.ObjectId(subscriptionId),
        })
        .exec();
    } catch (error) {
      console.error('Error finding clinic by subscription:', error);
      return null;
    }
  }

  async findClinicByUser(userId: string): Promise<Clinic | null> {
    try {
      // First get user's subscription
      const subscription =
        await this.subscriptionService.getSubscriptionByUser(userId);
      if (!subscription) {
        return null;
      }
      return await this.findClinicBySubscription(
        (subscription._id as any).toString(),
      );
    } catch (error) {
      console.error('Error finding clinic by user:', error);
      return null;
    }
  }

  async createClinic(createClinicDto: CreateClinicDto): Promise<Clinic> {
    // Validate subscription is active
    const isActive = await this.subscriptionService.isSubscriptionActive(
      createClinicDto.subscriptionId,
    );
    if (!isActive) {
      throw new BadRequestException('Subscription is not active');
    }

    // Validate subscription limits
    const currentClinics = await this.clinicModel.countDocuments({
      subscriptionId: new Types.ObjectId(createClinicDto.subscriptionId),
    });

    const { plan } = await this.subscriptionService.getSubscriptionWithPlan(
      createClinicDto.subscriptionId,
    );
    if (
      plan.maxClinics &&
      plan.maxClinics > 0 &&
      currentClinics >= plan.maxClinics
    ) {
      throw new BadRequestException(
        `Plan allows maximum ${plan.maxClinics} clinic(s)`,
      );
    }

    // Validate business profile for clinic-only plans
    if (
      !createClinicDto.complexDepartmentId &&
      plan.name.toLowerCase() === 'clinic'
    ) {
      const businessProfileValidation = ValidationUtil.validateBusinessProfile({
        yearEstablished: createClinicDto.yearEstablished,
        mission: createClinicDto.mission,
        vision: createClinicDto.vision,
        ceoName: createClinicDto.ceoName,
        vatNumber: createClinicDto.vatNumber,
        crNumber: createClinicDto.crNumber,
      });

      if (!businessProfileValidation.isValid) {
        throw new BadRequestException(
          `Validation failed: ${businessProfileValidation.errors.join(', ')}`,
        );
      }

      // Validate capacity for clinic plan
      if (!createClinicDto.maxPatients) {
        throw new BadRequestException(
          'Clinic plan requires maximum patient capacity',
        );
      }

      if (!createClinicDto.sessionDuration) {
        throw new BadRequestException(
          'Clinic plan requires default session duration',
        );
      }
    }

    // Validate contact information
    if (
      createClinicDto.email &&
      !ValidationUtil.validateEmail(createClinicDto.email)
    ) {
      throw new BadRequestException('Invalid email format');
    }

    if (
      createClinicDto.phone &&
      !ValidationUtil.validatePhone(createClinicDto.phone)
    ) {
      throw new BadRequestException('Invalid phone number format');
    }

    const clinicData = {
      ...createClinicDto,
      complexDepartmentId: createClinicDto.complexDepartmentId
        ? new Types.ObjectId(createClinicDto.complexDepartmentId)
        : null,
      subscriptionId: new Types.ObjectId(createClinicDto.subscriptionId),
    };

    const clinic = new this.clinicModel(clinicData);
    return await clinic.save();
  }

  async getClinic(clinicId: string): Promise<Clinic> {
    const clinic = await this.clinicModel.findById(clinicId).exec();
    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }
    return clinic;
  }

  /**
   * Get clinics by complex with filtering and sorting
   * BZR-g3e5c9a0: Complex-based clinic filtering endpoint
   *
   * @param complexId - The complex ID to filter clinics by
   * @param filters - Optional filters (isActive, sortBy, sortOrder)
   * @returns Standardized response with clinics array
   */
  async getClinicsByComplex(complexId: string, filters?: ClinicFilterDto) {
    // Validate complex exists
    await ValidationUtil.validateEntityExists(
      this.complexModel,
      complexId,
      ERROR_MESSAGES.COMPLEX_NOT_FOUND,
    );

    // Build query
    const query: any = { complexId: new Types.ObjectId(complexId) };

    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    // Build sort
    const sortBy = filters?.sortBy || 'name';
    const sortOrder = filters?.sortOrder === 'desc' ? -1 : 1;
    const sort: any = { [sortBy]: sortOrder };

    // Execute query
    const clinics = await this.clinicModel
      .find(query)
      .sort(sort)
      .select(
        '_id name address phoneNumbers email isActive specialization licenseNumber',
      )
      .lean();

    return ResponseBuilder.success(clinics);
  }

  /**
   * Get clinics for dropdown (only active, by complex)
   * BZR-g3e5c9a0: Complex-based clinic filtering endpoint
   * BZR-q4f3e1b8: Deactivated user restrictions in dropdowns
   *
   * @param filters - Optional filters (complexId)
   * @returns Standardized response with active clinics
   */
  async getClinicsForDropdown(filters?: { complexId?: string }) {
    const query: any = { isActive: true };

    if (filters?.complexId) {
      query.complexId = new Types.ObjectId(filters.complexId);
    }

    const clinics = await this.clinicModel
      .find(query)
      .select('_id name specialization')
      .sort({ name: 1 })
      .lean();

    return ResponseBuilder.success(clinics);
  }

  async getClinicBySubscription(
    subscriptionId: string,
  ): Promise<Clinic | null> {
    return await this.clinicModel
      .findOne({ subscriptionId: new Types.ObjectId(subscriptionId) })
      .exec();
  }

  async updateClinic(
    clinicId: string,
    updateClinicDto: UpdateClinicDto,
  ): Promise<Clinic> {
    const clinic = await this.getClinic(clinicId);

    // Validate business profile data if provided
    if (this.hasBusinessProfileData(updateClinicDto)) {
      const businessProfileValidation = ValidationUtil.validateBusinessProfile({
        yearEstablished: updateClinicDto.yearEstablished,
        mission: updateClinicDto.mission,
        vision: updateClinicDto.vision,
        ceoName: updateClinicDto.ceoName,
        vatNumber: updateClinicDto.vatNumber,
        crNumber: updateClinicDto.crNumber,
      });

      if (!businessProfileValidation.isValid) {
        throw new BadRequestException(
          `Validation failed: ${businessProfileValidation.errors.join(', ')}`,
        );
      }
    }

    Object.assign(clinic, updateClinicDto);
    return await clinic.save();
  }

  async setupCapacity(
    clinicId: string,
    capacityDto: SetupCapacityDto,
  ): Promise<Clinic> {
    const clinic = await this.getClinic(clinicId);

    // Validate capacity limits
    if (capacityDto.maxStaff && capacityDto.maxStaff < 1) {
      throw new BadRequestException('Maximum staff must be at least 1');
    }

    if (capacityDto.maxDoctors && capacityDto.maxDoctors < 1) {
      throw new BadRequestException('Maximum doctors must be at least 1');
    }

    if (capacityDto.maxPatients && capacityDto.maxPatients < 1) {
      throw new BadRequestException('Maximum patients must be at least 1');
    }

    if (
      capacityDto.sessionDuration &&
      (capacityDto.sessionDuration < 15 || capacityDto.sessionDuration > 480)
    ) {
      throw new BadRequestException(
        'Session duration must be between 15 and 480 minutes',
      );
    }

    Object.assign(clinic, capacityDto);
    return await clinic.save();
  }

  async setupBusinessProfile(
    clinicId: string,
    businessProfileDto: SetupBusinessProfileDto,
  ): Promise<Clinic> {
    const clinic = await this.getClinic(clinicId);

    // Validate business profile
    const validation =
      ValidationUtil.validateBusinessProfile(businessProfileDto);
    if (!validation.isValid) {
      throw new BadRequestException(
        `Validation failed: ${validation.errors.join(', ')}`,
      );
    }

    Object.assign(clinic, businessProfileDto);
    return await clinic.save();
  }

  private hasBusinessProfileData(data: any): boolean {
    return !!(
      data.yearEstablished ||
      data.mission ||
      data.vision ||
      data.ceoName ||
      data.vatNumber ||
      data.crNumber
    );
  }

  // ======== VALIDATION METHODS ========

  async isNameAvailable(
    name: string,
    complexId?: string,
    organizationId?: string,
  ): Promise<boolean> {
    try {
      const trimmedName = name.trim().toLowerCase();
      if (!trimmedName) return false;

      const query: any = {
        name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
      };

      // Check within complex scope if provided
      if (complexId) {
        query.complexId = new Types.ObjectId(complexId);
      }
      // Otherwise check within organization scope if provided
      else if (organizationId) {
        query.organizationId = new Types.ObjectId(organizationId);
      }

      const existingClinic = await this.clinicModel.findOne(query).exec();
      return !existingClinic;
    } catch (error) {
      console.error('Error checking clinic name availability:', error);
      return false;
    }
  }

  async isEmailAvailable(email: string): Promise<boolean> {
    try {
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail) return false;

      const existingClinic = await this.clinicModel
        .findOne({
          email: { $regex: new RegExp(`^${trimmedEmail}$`, 'i') },
        })
        .exec();

      return !existingClinic;
    } catch (error) {
      console.error('Error checking email availability:', error);
      return false;
    }
  }

  async isLicenseNumberAvailable(licenseNumber: string): Promise<boolean> {
    try {
      const trimmedLicense = licenseNumber.trim();
      if (!trimmedLicense) return false;

      const existingClinic = await this.clinicModel
        .findOne({
          licenseNumber: trimmedLicense,
        })
        .exec();

      return !existingClinic;
    } catch (error) {
      console.error('Error checking license number availability:', error);
      return false;
    }
  }
}
