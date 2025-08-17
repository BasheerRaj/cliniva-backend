import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Clinic } from '../database/schemas/clinic.schema';
import { CreateClinicDto, UpdateClinicDto, SetupCapacityDto, SetupBusinessProfileDto } from './dto/create-clinic.dto';
import { ValidationUtil } from '../common/utils/validation.util';
import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class ClinicService {
  constructor(
    @InjectModel('Clinic') private readonly clinicModel: Model<Clinic>,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async createClinic(createClinicDto: CreateClinicDto): Promise<Clinic> {
    // Validate subscription is active
    const isActive = await this.subscriptionService.isSubscriptionActive(createClinicDto.subscriptionId);
    if (!isActive) {
      throw new BadRequestException('Subscription is not active');
    }

    // Validate subscription limits
    const currentClinics = await this.clinicModel.countDocuments({
      subscriptionId: new Types.ObjectId(createClinicDto.subscriptionId)
    });

    const { plan } = await this.subscriptionService.getSubscriptionWithPlan(createClinicDto.subscriptionId);
    if (plan.maxClinics && plan.maxClinics > 0 && currentClinics >= plan.maxClinics) {
      throw new BadRequestException(`Plan allows maximum ${plan.maxClinics} clinic(s)`);
    }

    // Validate business profile for clinic-only plans
    if (!createClinicDto.complexDepartmentId && plan.name.toLowerCase() === 'clinic') {
      const businessProfileValidation = ValidationUtil.validateBusinessProfile({
        yearEstablished: createClinicDto.yearEstablished,
        mission: createClinicDto.mission,
        vision: createClinicDto.vision,
        ceoName: createClinicDto.ceoName,
        vatNumber: createClinicDto.vatNumber,
        crNumber: createClinicDto.crNumber
      });

      if (!businessProfileValidation.isValid) {
        throw new BadRequestException(`Validation failed: ${businessProfileValidation.errors.join(', ')}`);
      }

      // Validate capacity for clinic plan
      if (!createClinicDto.maxPatients) {
        throw new BadRequestException('Clinic plan requires maximum patient capacity');
      }

      if (!createClinicDto.sessionDuration) {
        throw new BadRequestException('Clinic plan requires default session duration');
      }
    }

    // Validate contact information
    if (createClinicDto.email && !ValidationUtil.validateEmail(createClinicDto.email)) {
      throw new BadRequestException('Invalid email format');
    }

    if (createClinicDto.phone && !ValidationUtil.validatePhone(createClinicDto.phone)) {
      throw new BadRequestException('Invalid phone number format');
    }

    const clinicData = {
      ...createClinicDto,
      complexDepartmentId: createClinicDto.complexDepartmentId ? new Types.ObjectId(createClinicDto.complexDepartmentId) : null,
      subscriptionId: new Types.ObjectId(createClinicDto.subscriptionId)
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

  async getClinicsByComplex(complexId: string): Promise<Clinic[]> {
    // Find complex departments first, then clinics
    return await this.clinicModel
      .find({})
      .populate('complexDepartmentId')
      .exec()
      .then(clinics => 
        clinics.filter(clinic => 
          clinic.complexDepartmentId && 
          (clinic.complexDepartmentId as any).complexId?.toString() === complexId
        )
      );
  }

  async getClinicBySubscription(subscriptionId: string): Promise<Clinic | null> {
    return await this.clinicModel
      .findOne({ subscriptionId: new Types.ObjectId(subscriptionId) })
      .exec();
  }

  async updateClinic(clinicId: string, updateClinicDto: UpdateClinicDto): Promise<Clinic> {
    const clinic = await this.getClinic(clinicId);

    // Validate business profile data if provided
    if (this.hasBusinessProfileData(updateClinicDto)) {
      const businessProfileValidation = ValidationUtil.validateBusinessProfile({
        yearEstablished: updateClinicDto.yearEstablished,
        mission: updateClinicDto.mission,
        vision: updateClinicDto.vision,
        ceoName: updateClinicDto.ceoName,
        vatNumber: updateClinicDto.vatNumber,
        crNumber: updateClinicDto.crNumber
      });

      if (!businessProfileValidation.isValid) {
        throw new BadRequestException(`Validation failed: ${businessProfileValidation.errors.join(', ')}`);
      }
    }

    Object.assign(clinic, updateClinicDto);
    return await clinic.save();
  }

  async setupCapacity(clinicId: string, capacityDto: SetupCapacityDto): Promise<Clinic> {
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

    if (capacityDto.sessionDuration && (capacityDto.sessionDuration < 15 || capacityDto.sessionDuration > 480)) {
      throw new BadRequestException('Session duration must be between 15 and 480 minutes');
    }

    Object.assign(clinic, capacityDto);
    return await clinic.save();
  }

  async setupBusinessProfile(clinicId: string, businessProfileDto: SetupBusinessProfileDto): Promise<Clinic> {
    const clinic = await this.getClinic(clinicId);

    // Validate business profile
    const validation = ValidationUtil.validateBusinessProfile(businessProfileDto);
    if (!validation.isValid) {
      throw new BadRequestException(`Validation failed: ${validation.errors.join(', ')}`);
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
}
