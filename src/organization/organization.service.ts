import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Organization } from '../database/schemas/organization.schema';
import { CreateOrganizationDto, UpdateOrganizationDto, SetupLegalInfoDto } from './dto/create-organization.dto';
import { ValidationUtil } from '../common/utils/validation.util';
import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectModel('Organization') private readonly organizationModel: Model<Organization>,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async createOrganization(createOrganizationDto: CreateOrganizationDto): Promise<Organization> {
    // Validate subscription exists and is active
    const isActive = await this.subscriptionService.isSubscriptionActive(createOrganizationDto.subscriptionId);
    if (!isActive) {
      throw new BadRequestException('Subscription is not active');
    }

    // Validate subscription is company plan
    const { plan } = await this.subscriptionService.getSubscriptionWithPlan(createOrganizationDto.subscriptionId);
    if (plan.name.toLowerCase() !== 'company') {
      throw new BadRequestException('Organization can only be created for company plan');
    }

    // Check if organization already exists for this subscription
    const existingOrg = await this.organizationModel.findOne({
      subscriptionId: new Types.ObjectId(createOrganizationDto.subscriptionId)
    });

    if (existingOrg) {
      throw new BadRequestException('Organization already exists for this subscription');
    }

    // Validate business profile data
    const businessProfileValidation = ValidationUtil.validateBusinessProfile({
      yearEstablished: createOrganizationDto.yearEstablished,
      mission: createOrganizationDto.mission,
      vision: createOrganizationDto.vision,
      ceoName: createOrganizationDto.ceoName,
      vatNumber: createOrganizationDto.vatNumber,
      crNumber: createOrganizationDto.crNumber
    });

    if (!businessProfileValidation.isValid) {
      throw new BadRequestException(`Validation failed: ${businessProfileValidation.errors.join(', ')}`);
    }

    // Validate contact information
    if (createOrganizationDto.email && !ValidationUtil.validateEmail(createOrganizationDto.email)) {
      throw new BadRequestException('Invalid email format');
    }

    if (createOrganizationDto.phone && !ValidationUtil.validatePhone(createOrganizationDto.phone)) {
      throw new BadRequestException('Invalid phone number format');
    }

    if (createOrganizationDto.googleLocation && !ValidationUtil.validateGoogleLocation(createOrganizationDto.googleLocation)) {
      throw new BadRequestException('Invalid Google location format');
    }

    const organizationData = {
      ...createOrganizationDto,
      subscriptionId: new Types.ObjectId(createOrganizationDto.subscriptionId)
    };

    const organization = new this.organizationModel(organizationData);
    return await organization.save();
  }

  async getOrganization(organizationId: string): Promise<Organization> {
    const organization = await this.organizationModel.findById(organizationId).exec();
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    return organization;
  }

  async getOrganizationBySubscription(subscriptionId: string): Promise<Organization | null> {
    return await this.organizationModel
      .findOne({ subscriptionId: new Types.ObjectId(subscriptionId) })
      .exec();
  }

  async updateOrganization(
    organizationId: string,
    updateOrganizationDto: UpdateOrganizationDto
  ): Promise<Organization> {
    const organization = await this.getOrganization(organizationId);

    // Validate business profile data if provided
    if (this.hasBusinessProfileData(updateOrganizationDto)) {
      const businessProfileValidation = ValidationUtil.validateBusinessProfile({
        yearEstablished: updateOrganizationDto.yearEstablished,
        mission: updateOrganizationDto.mission,
        vision: updateOrganizationDto.vision,
        ceoName: updateOrganizationDto.ceoName,
        vatNumber: updateOrganizationDto.vatNumber,
        crNumber: updateOrganizationDto.crNumber
      });

      if (!businessProfileValidation.isValid) {
        throw new BadRequestException(`Validation failed: ${businessProfileValidation.errors.join(', ')}`);
      }
    }

    // Validate contact information if provided
    if (updateOrganizationDto.email && !ValidationUtil.validateEmail(updateOrganizationDto.email)) {
      throw new BadRequestException('Invalid email format');
    }

    if (updateOrganizationDto.phone && !ValidationUtil.validatePhone(updateOrganizationDto.phone)) {
      throw new BadRequestException('Invalid phone number format');
    }

    if (updateOrganizationDto.googleLocation && !ValidationUtil.validateGoogleLocation(updateOrganizationDto.googleLocation)) {
      throw new BadRequestException('Invalid Google location format');
    }

    Object.assign(organization, updateOrganizationDto);
    return await organization.save();
  }

  async setupLegalInfo(organizationId: string, legalInfoDto: SetupLegalInfoDto): Promise<Organization> {
    const organization = await this.getOrganization(organizationId);

    // Validate legal information
    if (legalInfoDto.vatNumber && !ValidationUtil.validateVATNumber(legalInfoDto.vatNumber)) {
      throw new BadRequestException('Invalid VAT number format');
    }

    if (legalInfoDto.crNumber && !ValidationUtil.validateCRNumber(legalInfoDto.crNumber)) {
      throw new BadRequestException('Invalid Commercial Registration number format');
    }

    // Update organization with legal info
    if (legalInfoDto.vatNumber) organization.vatNumber = legalInfoDto.vatNumber;
    if (legalInfoDto.crNumber) organization.crNumber = legalInfoDto.crNumber;

    return await organization.save();
  }

  async deleteOrganization(organizationId: string): Promise<void> {
    const organization = await this.getOrganization(organizationId);
    
    // Check if organization has associated complexes
    // Note: This should be implemented with proper cascade delete logic
    // For now, we'll just delete the organization
    await this.organizationModel.findByIdAndDelete(organizationId);
  }

  async validateOrganizationData(organizationData: any): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate required fields
    if (!organizationData.name) {
      errors.push('Organization name is required');
    }

    if (!organizationData.subscriptionId) {
      errors.push('Subscription ID is required');
    }

    // Validate business profile
    const businessProfileValidation = ValidationUtil.validateBusinessProfile(organizationData);
    if (!businessProfileValidation.isValid) {
      errors.push(...businessProfileValidation.errors);
    }

    // Validate contact information
    if (organizationData.email && !ValidationUtil.validateEmail(organizationData.email)) {
      errors.push('Invalid email format');
    }

    if (organizationData.phone && !ValidationUtil.validatePhone(organizationData.phone)) {
      errors.push('Invalid phone number format');
    }

    return { isValid: errors.length === 0, errors };
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
