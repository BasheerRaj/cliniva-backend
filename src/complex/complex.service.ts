import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Complex } from '../database/schemas/complex.schema';
import {
  CreateComplexDto,
  UpdateComplexDto,
  SetupBusinessProfileDto,
} from './dto/create-complex.dto';
import { ValidationUtil } from '../common/utils/validation.util';
import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class ComplexService {
  constructor(
    @InjectModel('Complex') private readonly complexModel: Model<Complex>,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async createComplex(createComplexDto: CreateComplexDto): Promise<Complex> {
    // Validate subscription is active
    const isActive = await this.subscriptionService.isSubscriptionActive(
      createComplexDto.subscriptionId,
    );
    if (!isActive) {
      throw new BadRequestException('Subscription is not active');
    }

    // Validate subscription limits
    const currentComplexes = await this.complexModel.countDocuments({
      subscriptionId: new Types.ObjectId(createComplexDto.subscriptionId),
    });

    const { plan } = await this.subscriptionService.getSubscriptionWithPlan(
      createComplexDto.subscriptionId,
    );
    if (
      plan.maxComplexes &&
      plan.maxComplexes > 0 &&
      currentComplexes >= plan.maxComplexes
    ) {
      throw new BadRequestException(
        `Plan allows maximum ${plan.maxComplexes} complex(es)`,
      );
    }

    // Validate business profile for complex-only plans
    if (!createComplexDto.organizationId) {
      const businessProfileValidation = ValidationUtil.validateBusinessProfile({
        yearEstablished: createComplexDto.yearEstablished,
        mission: createComplexDto.mission,
        vision: createComplexDto.vision,
        ceoName: createComplexDto.ceoName,
        vatNumber: createComplexDto.vatNumber,
        crNumber: createComplexDto.crNumber,
      });

      if (!businessProfileValidation.isValid) {
        throw new BadRequestException(
          `Validation failed: ${businessProfileValidation.errors.join(', ')}`,
        );
      }
    }

    // Validate contact information
    if (
      createComplexDto.email &&
      !ValidationUtil.validateEmail(createComplexDto.email)
    ) {
      throw new BadRequestException('Invalid email format');
    }

    if (
      createComplexDto.phone &&
      !ValidationUtil.validatePhone(createComplexDto.phone)
    ) {
      throw new BadRequestException('Invalid phone number format');
    }

    const complexData = {
      ...createComplexDto,
      organizationId: createComplexDto.organizationId
        ? new Types.ObjectId(createComplexDto.organizationId)
        : null,
      subscriptionId: new Types.ObjectId(createComplexDto.subscriptionId),
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

  async getComplexBySubscription(
    subscriptionId: string,
  ): Promise<Complex | null> {
    return await this.complexModel
      .findOne({ subscriptionId: new Types.ObjectId(subscriptionId) })
      .exec();
  }

  async updateComplex(
    complexId: string,
    updateComplexDto: UpdateComplexDto,
  ): Promise<Complex> {
    const complex = await this.getComplex(complexId);

    // Validate business profile data if provided
    if (this.hasBusinessProfileData(updateComplexDto)) {
      const businessProfileValidation = ValidationUtil.validateBusinessProfile({
        yearEstablished: updateComplexDto.yearEstablished,
        mission: updateComplexDto.mission,
        vision: updateComplexDto.vision,
        ceoName: updateComplexDto.ceoName,
        vatNumber: updateComplexDto.vatNumber,
        crNumber: updateComplexDto.crNumber,
      });

      if (!businessProfileValidation.isValid) {
        throw new BadRequestException(
          `Validation failed: ${businessProfileValidation.errors.join(', ')}`,
        );
      }
    }

    Object.assign(complex, updateComplexDto);
    return await complex.save();
  }

  async setupBusinessProfile(
    complexId: string,
    businessProfileDto: SetupBusinessProfileDto,
  ): Promise<Complex> {
    const complex = await this.getComplex(complexId);

    // Validate business profile
    const validation =
      ValidationUtil.validateBusinessProfile(businessProfileDto);
    if (!validation.isValid) {
      throw new BadRequestException(
        `Validation failed: ${validation.errors.join(', ')}`,
      );
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
      data.crNumber
    );
  }

  // ======== VALIDATION METHODS ========

  async isNameAvailable(
    name: string,
    organizationId?: string,
  ): Promise<boolean> {
    try {
      const trimmedName = name.trim().toLowerCase();
      if (!trimmedName) return false;

      const query: any = {
        name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
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

      const existingComplex = await this.complexModel
        .findOne({
          email: { $regex: new RegExp(`^${trimmedEmail}$`, 'i') },
        })
        .exec();

      return !existingComplex;
    } catch (error) {
      console.error('Error checking email availability:', error);
      return false;
    }
  }
}
