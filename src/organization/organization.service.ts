import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { Organization } from '../database/schemas/organization.schema';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  SetupLegalInfoDto,
} from './dto/create-organization.dto';
import { ValidationUtil } from '../common/utils/validation.util';
import { SubscriptionService } from '../subscription/subscription.service';
import { User } from '../database/schemas/user.schema';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectModel('Organization')
    private readonly organizationModel: Model<Organization>,
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectConnection() private readonly connection: Connection,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async createOrganization(
    createOrganizationDto: CreateOrganizationDto,
    userId: string,
  ): Promise<Organization> {
    // Validate user exists
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found. Please log in again.');
    }

    // Check if user already owns an organization
    const existingUserOrg = await this.organizationModel.findOne({
      ownerId: new Types.ObjectId(userId),
    });

    if (existingUserOrg) {
      throw new BadRequestException(
        'You already own an organization. Each user can only own one company.',
      );
    }

    try {
      // Validate subscription exists and is active
      const isActive = await this.subscriptionService.isSubscriptionActive(
        createOrganizationDto.subscriptionId,
      );
      if (!isActive) {
        throw new BadRequestException(
          'Your subscription is not active. Please contact support or update your subscription.',
        );
      }

      // Validate subscription is company plan
      const { plan } = await this.subscriptionService.getSubscriptionWithPlan(
        createOrganizationDto.subscriptionId,
      );
      if (!plan || plan.name.toLowerCase() !== 'company') {
        throw new BadRequestException(
          'Company registration requires a company plan subscription. Please upgrade your plan.',
        );
      }

      // Check if organization already exists for this subscription
      const existingOrg = await this.organizationModel.findOne({
        subscriptionId: new Types.ObjectId(
          createOrganizationDto.subscriptionId,
        ),
      });

      if (existingOrg) {
        throw new BadRequestException(
          'An organization already exists for this subscription.',
        );
      }
    } catch (error) {
      // Handle subscription-related errors with user-friendly messages
      if (error.message.includes('Subscription not found')) {
        throw new BadRequestException(
          'Your subscription could not be found. Please contact support.',
        );
      } else if (error.message.includes('Subscription plan not found')) {
        throw new BadRequestException(
          'There was an issue with your subscription plan. Please contact support.',
        );
      } else {
        // Re-throw if it's already a BadRequestException or other expected error
        throw error;
      }
    }

    // Validate business profile data
    const businessProfileValidation = ValidationUtil.validateBusinessProfile({
      yearEstablished: createOrganizationDto.yearEstablished,
      mission: createOrganizationDto.mission,
      vision: createOrganizationDto.vision,
      ceoName: createOrganizationDto.ceoName,
      vatNumber: createOrganizationDto.vatNumber,
      crNumber: createOrganizationDto.crNumber,
    });

    if (!businessProfileValidation.isValid) {
      throw new BadRequestException(
        `Validation failed: ${businessProfileValidation.errors.join(', ')}`,
      );
    }

    // Validate contact information
    if (
      createOrganizationDto.email &&
      !ValidationUtil.validateEmail(createOrganizationDto.email)
    ) {
      throw new BadRequestException('Please provide a valid email address');
    }

    if (
      createOrganizationDto.phone &&
      !ValidationUtil.validatePhone(createOrganizationDto.phone)
    ) {
      throw new BadRequestException('Please provide a valid phone number');
    }

    if (
      createOrganizationDto.googleLocation &&
      !ValidationUtil.validateGoogleLocation(
        createOrganizationDto.googleLocation,
      )
    ) {
      throw new BadRequestException('Invalid location format');
    }

    // Use MongoDB transaction to ensure data consistency
    const session = await this.connection.startSession();

    try {
      session.startTransaction();

      // Prepare organization data with logo normalization
      const organizationData = {
        ...createOrganizationDto,
        subscriptionId: new Types.ObjectId(
          createOrganizationDto.subscriptionId,
        ),
        ownerId: new Types.ObjectId(userId), // Set the owner
      };

      // Handle logo URL - ensure it's stored as relative path
      if (organizationData.logoUrl) {
        organizationData.logoUrl = this.normalizeLogoPath(
          organizationData.logoUrl,
        );
      }

      const organization = new this.organizationModel(organizationData);
      const savedOrganization = await organization.save({ session });

      // Update user with organization reference and set as owner
      await this.userModel.findByIdAndUpdate(
        userId,
        {
          organizationId: savedOrganization._id,
          subscriptionId: new Types.ObjectId(
            createOrganizationDto.subscriptionId,
          ),
          role: UserRole.OWNER, // Set user as owner
          setupComplete: true,
          onboardingComplete: true,
        },
        { session },
      );

      await session.commitTransaction();
      return this.formatOrganizationResponse(savedOrganization);
    } catch (error) {
      await session.abortTransaction();

      // Handle duplicate key errors and other database errors with user-friendly messages
      if (error.code === 11000) {
        if (error.keyPattern?.name) {
          throw new BadRequestException(
            'A company with this name already exists. Please choose a different name.',
          );
        } else if (error.keyPattern?.email) {
          throw new BadRequestException(
            'A company with this email already exists. Please use a different email.',
          );
        } else if (error.keyPattern?.registrationNumber) {
          throw new BadRequestException(
            'A company with this registration number already exists.',
          );
        } else {
          throw new BadRequestException(
            'A company with this information already exists.',
          );
        }
      }

      throw new InternalServerErrorException(
        `Failed to create organization: ${error.message}`,
      );
    } finally {
      await session.endSession();
    }
  }

  async getOrganization(organizationId: string): Promise<Organization> {
    const organization = await this.organizationModel
      .findById(organizationId)
      .exec();
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    return this.formatOrganizationResponse(organization);
  }

  async getOrganizationBySubscription(
    subscriptionId: string,
  ): Promise<Organization | null> {
    const organization = await this.organizationModel
      .findOne({ subscriptionId: new Types.ObjectId(subscriptionId) })
      .exec();

    return organization ? this.formatOrganizationResponse(organization) : null;
  }

  async getOrganizationByName(name: string): Promise<Organization | null> {
    const organization = await this.organizationModel
      .findOne({
        $or: [
          { name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } },
          { legalName: { $regex: new RegExp(`^${name.trim()}$`, 'i') } },
        ],
      })
      .exec();

    return organization ? this.formatOrganizationResponse(organization) : null;
  }

  async getAllOrganizations(): Promise<Organization[]> {
    const organizations = await this.organizationModel.find().exec();
    return organizations.map((org) => this.formatOrganizationResponse(org));
  }

  async updateOrganization(
    organizationId: string,
    updateOrganizationDto: UpdateOrganizationDto,
  ): Promise<Organization> {
    // First, verify the organization exists
    const existingOrg = await this.organizationModel.findById(organizationId);
    if (!existingOrg) {
      throw new NotFoundException('Organization not found');
    }

    // Validate business profile data if provided
    if (this.hasBusinessProfileData(updateOrganizationDto)) {
      const businessProfileValidation = ValidationUtil.validateBusinessProfile({
        yearEstablished: updateOrganizationDto.yearEstablished,
        mission: updateOrganizationDto.mission,
        vision: updateOrganizationDto.vision,
        ceoName: updateOrganizationDto.ceoName,
        vatNumber: updateOrganizationDto.vatNumber,
        crNumber: updateOrganizationDto.crNumber,
      });

      if (!businessProfileValidation.isValid) {
        throw new BadRequestException(
          `Validation failed: ${businessProfileValidation.errors.join(', ')}`,
        );
      }
    }

    // Validate contact information if provided
    if (
      updateOrganizationDto.email &&
      !ValidationUtil.validateEmail(updateOrganizationDto.email)
    ) {
      throw new BadRequestException('Invalid email format');
    }

    if (
      updateOrganizationDto.phone &&
      !ValidationUtil.validatePhone(updateOrganizationDto.phone)
    ) {
      throw new BadRequestException('Invalid phone number format');
    }

    if (
      updateOrganizationDto.googleLocation &&
      !ValidationUtil.validateGoogleLocation(
        updateOrganizationDto.googleLocation,
      )
    ) {
      throw new BadRequestException('Invalid Google location format');
    }

    // Handle logo URL - ensure it's stored as relative path
    if (updateOrganizationDto.logoUrl) {
      updateOrganizationDto.logoUrl = this.normalizeLogoPath(
        updateOrganizationDto.logoUrl,
      );
    }

    // Use findByIdAndUpdate instead of save()
    const updatedOrganization = await this.organizationModel.findByIdAndUpdate(
      organizationId,
      updateOrganizationDto,
      { new: true, runValidators: true },
    );

    if (!updatedOrganization) {
      throw new NotFoundException('Organization not found');
    }

    return this.formatOrganizationResponse(updatedOrganization);
  }

  async setupLegalInfo(
    organizationId: string,
    legalInfoDto: SetupLegalInfoDto,
  ): Promise<Organization> {
    // Verify the organization exists
    const existingOrg = await this.organizationModel.findById(organizationId);
    if (!existingOrg) {
      throw new NotFoundException('Organization not found');
    }

    // Validate legal information
    if (
      legalInfoDto.vatNumber &&
      !ValidationUtil.validateVATNumber(legalInfoDto.vatNumber)
    ) {
      throw new BadRequestException('Invalid VAT number format');
    }

    if (
      legalInfoDto.crNumber &&
      !ValidationUtil.validateCRNumber(legalInfoDto.crNumber)
    ) {
      throw new BadRequestException(
        'Invalid Commercial Registration number format',
      );
    }

    // Use findByIdAndUpdate instead of save()
    const updatedOrganization = await this.organizationModel.findByIdAndUpdate(
      organizationId,
      {
        ...(legalInfoDto.vatNumber && { vatNumber: legalInfoDto.vatNumber }),
        ...(legalInfoDto.crNumber && { crNumber: legalInfoDto.crNumber }),
      },
      { new: true, runValidators: true },
    );

    if (!updatedOrganization) {
      throw new NotFoundException('Organization not found');
    }

    return this.formatOrganizationResponse(updatedOrganization);
  }

  async deleteOrganization(organizationId: string): Promise<void> {
    const organization = await this.getOrganization(organizationId);

    // Check if organization has associated complexes
    // Note: This should be implemented with proper cascade delete logic
    // For now, we'll just delete the organization
    await this.organizationModel.findByIdAndDelete(organizationId);
  }

  async validateOrganizationData(
    organizationData: any,
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate required fields
    if (!organizationData.name) {
      errors.push('Organization name is required');
    }

    if (!organizationData.subscriptionId) {
      errors.push('Subscription ID is required');
    }

    // Validate business profile
    const businessProfileValidation =
      ValidationUtil.validateBusinessProfile(organizationData);
    if (!businessProfileValidation.isValid) {
      errors.push(...businessProfileValidation.errors);
    }

    // Validate contact information
    if (
      organizationData.email &&
      !ValidationUtil.validateEmail(organizationData.email)
    ) {
      errors.push('Invalid email format');
    }

    if (
      organizationData.phone &&
      !ValidationUtil.validatePhone(organizationData.phone)
    ) {
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

  // ======== VALIDATION METHODS ========

  async isNameAvailable(name: string, userId?: string): Promise<boolean> {
    try {
      const trimmedName = name.trim().toLowerCase();
      if (!trimmedName) return false;

      const existingOrg = await this.organizationModel
        .findOne({
          name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
        })
        .exec();

      // If no organization exists with this name, it's available
      if (!existingOrg) {
        return true;
      }

      // If userId is provided, check if the existing organization belongs to the current user
      if (
        userId &&
        existingOrg.ownerId &&
        existingOrg.ownerId.toString() === userId
      ) {
        return true; // User can reuse their own organization's name
      }

      return false; // Name is taken by another organization
    } catch (error) {
      console.error('Error checking organization name availability:', error);
      return false;
    }
  }

  async isVatNumberAvailable(vatNumber: string): Promise<boolean> {
    try {
      const trimmedVat = vatNumber.trim();
      if (!trimmedVat) return false;

      const existingOrg = await this.organizationModel
        .findOne({
          vatNumber: trimmedVat,
        })
        .exec();

      return !existingOrg;
    } catch (error) {
      console.error('Error checking VAT number availability:', error);
      return false;
    }
  }

  async isCrNumberAvailable(crNumber: string): Promise<boolean> {
    try {
      const trimmedCr = crNumber.trim();
      if (!trimmedCr) return false;

      const existingOrg = await this.organizationModel
        .findOne({
          crNumber: trimmedCr,
        })
        .exec();

      return !existingOrg;
    } catch (error) {
      console.error('Error checking CR number availability:', error);
      return false;
    }
  }

  async isEmailAvailable(email: string): Promise<boolean> {
    try {
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail) return false;

      const existingOrg = await this.organizationModel
        .findOne({
          email: { $regex: new RegExp(`^${trimmedEmail}$`, 'i') },
        })
        .exec();

      return !existingOrg;
    } catch (error) {
      console.error('Error checking email availability:', error);
      return false;
    }
  }

  // ======== HELPER METHODS ========

  /**
   * Normalize logo path to relative format
   */
  private normalizeLogoPath(logoUrl: string): string {
    if (!logoUrl) return logoUrl;

    // If it's a blob URL, extract filename and create relative path
    if (logoUrl.startsWith('blob:')) {
      // Extract filename from blob URL if possible, otherwise generate one
      const filename = logoUrl.split('/').pop() || `logo-${Date.now()}.jpg`;
      return `/uploads/logos/${filename}`;
    }

    // If it's already a relative path, keep it
    if (logoUrl.startsWith('/uploads/')) {
      return logoUrl;
    }

    // If it's a full URL with our domain, convert to relative
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    if (logoUrl.startsWith(baseUrl)) {
      return logoUrl.replace(baseUrl, '');
    }

    // Otherwise, assume it's a filename and create proper relative path
    const filename = logoUrl.split('/').pop() || logoUrl;
    return `/uploads/logos/${filename}`;
  }

  private constructLogoUrl(
    relativePath: string | null | undefined,
  ): string | undefined {
    if (!relativePath) return undefined;

    // If it's already a full URL (backward compatibility), return as is
    if (
      relativePath.startsWith('http://') ||
      relativePath.startsWith('https://')
    ) {
      return relativePath;
    }

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    return `${baseUrl}${relativePath}`;
  }

  private formatOrganizationResponse(org: any): any {
    if (!org) return org;

    // Convert to plain object if it's a Mongoose document
    const plainOrg = org.toObject ? org.toObject() : org;

    // Construct full logo URL if logo exists
    if (plainOrg.logo || plainOrg.logoUrl) {
      const logoPath = plainOrg.logo || plainOrg.logoUrl;
      plainOrg.logoUrl = this.constructLogoUrl(logoPath);
      // Keep both for backward compatibility
      if (plainOrg.logo) plainOrg.logo = this.constructLogoUrl(logoPath);
    }

    return plainOrg;
  }
}
