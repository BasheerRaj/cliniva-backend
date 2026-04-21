import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { assertSameTenant, TenantUser } from '../common/utils/tenant-scope.util';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { Organization } from '../database/schemas/organization.schema';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  SetupLegalInfoDto,
} from './dto/create-organization.dto';
import { ValidationUtil } from '../common/utils/validation.util';
import { TransactionUtil } from '../common/utils/transaction.util';
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

    this.validateAndNormalizePhoneInputs(createOrganizationDto as any);

    if (
      createOrganizationDto.googleLocation &&
      !ValidationUtil.validateGoogleLocation(
        createOrganizationDto.googleLocation,
      )
    ) {
      throw new BadRequestException('Invalid location format');
    }

    // Use MongoDB transaction to ensure data consistency (if replica set is available)
    const { session, useTransaction } = await TransactionUtil.startTransaction(
      this.connection,
    );

    try {
      // Prepare organization data with logo normalization and schema-compatible address
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

      // Transform address string to structured object for schema compatibility
      const preparedData = this.prepareOrganizationUpdatePayload(
        organizationData,
      );

      const organization = new this.organizationModel(preparedData);
      const savedOrganization = await organization.save(
        TransactionUtil.getSessionOptions(session, useTransaction),
      );

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
        TransactionUtil.getSessionOptions(session, useTransaction),
      );

      await TransactionUtil.commitTransaction(session, useTransaction);
      return this.formatOrganizationResponse(savedOrganization);
    } catch (error) {
      await TransactionUtil.abortTransaction(session, useTransaction);

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
      await TransactionUtil.endSession(session);
    }
  }

  async getOrganization(organizationId: string, requestingUser?: TenantUser): Promise<Organization> {
    const organization = await this.organizationModel
      .findById(organizationId)
      .exec();
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Tenant ownership check — non-super_admin cannot read other tenants' orgs
    if (requestingUser && requestingUser.role !== 'super_admin') {
      // Allow if user's organizationId directly matches (owner accessing their own org)
      const userOrgId = requestingUser.organizationId;
      const isOwner = userOrgId && (
        userOrgId === organizationId ||
        userOrgId === organization._id?.toString()
      );
      if (!isOwner) {
        assertSameTenant(organization.subscriptionId, requestingUser);
      }
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

  async getAllOrganizations(ownerId?: string): Promise<Organization[]> {
    const filter = ownerId ? { ownerId: new Types.ObjectId(ownerId) } : {};
    const organizations = await this.organizationModel.find(filter).exec();
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

    this.validateAndNormalizePhoneInputs(updateOrganizationDto as any);

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

    // Transform DTO to match schema - address must be structured object, not string
    const updatePayload = this.prepareOrganizationUpdatePayload(
      updateOrganizationDto,
    );

    // Use findByIdAndUpdate instead of save()
    const updatedOrganization = await this.organizationModel.findByIdAndUpdate(
      organizationId,
      updatePayload,
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

    const phoneNumbers = this.extractPhoneNumberStrings(organizationData.phoneNumbers);
    if (organizationData.phone && !ValidationUtil.validatePhone(organizationData.phone)) {
      errors.push('Invalid phone number format');
    }
    if (phoneNumbers.some((phone) => !ValidationUtil.validatePhone(phone))) {
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

  /**
   * Prepares update payload to match organization schema.
   * Transforms flat address string to structured { street, city, ... } object.
   */
  private prepareOrganizationUpdatePayload(dto: any): Record<string, any> {
    const payload = { ...dto };

    const normalizedPhoneNumbers = this.normalizePhoneNumbers(
      payload.phone,
      payload.phoneNumbers,
    );
    if (normalizedPhoneNumbers !== undefined) {
      payload.phoneNumbers = normalizedPhoneNumbers;
    }
    delete payload.phone;

    // Schema expects address as object { street, city, state, postalCode, country, googleLocation }
    // DTO may send address as string - transform for schema compatibility
    if (payload.address !== undefined) {
      if (typeof payload.address === 'string') {
        payload.address = {
          street: payload.address,
          ...(payload.googleLocation && {
            googleLocation: payload.googleLocation,
          }),
        };
        // Remove top-level googleLocation if merged into address
        delete payload.googleLocation;
      }
    } else if (payload.googleLocation) {
      // Only googleLocation provided - update address with googleLocation
      // Use $set to preserve existing address fields (handled in update call)
      payload.address = { googleLocation: payload.googleLocation };
      delete payload.googleLocation;
    }

    return payload;
  }

  private validateAndNormalizePhoneInputs(dto: any): void {
    const normalizedPhoneNumbers = this.normalizePhoneNumbers(
      dto.phone,
      dto.phoneNumbers,
    );

    if (normalizedPhoneNumbers !== undefined) {
      dto.phoneNumbers = normalizedPhoneNumbers;
    }

    const numbersToValidate = normalizedPhoneNumbers ?? [];
    if (numbersToValidate.some((phone) => !ValidationUtil.validatePhone(phone.number))) {
      throw new BadRequestException('Please provide a valid phone number');
    }
  }

  private normalizePhoneNumbers(
    legacyPhone?: string,
    phoneNumbersInput?: any[],
  ): Array<{ number: string; type: 'primary'; label: string }> | undefined {
    if (phoneNumbersInput === undefined && legacyPhone === undefined) {
      return undefined;
    }

    const extracted =
      phoneNumbersInput !== undefined
        ? this.extractPhoneNumberStrings(phoneNumbersInput)
        : this.extractPhoneNumberStrings(legacyPhone ? [legacyPhone] : []);

    const unique = Array.from(new Set(extracted));
    return unique.map((number) => ({ number, type: 'primary', label: 'Main' }));
  }

  private extractPhoneNumberStrings(values?: any[]): string[] {
    if (!Array.isArray(values)) {
      return [];
    }

    return values
      .map((value) => {
        if (typeof value === 'string') return this.normalizePhoneValue(value);
        if (value && typeof value === 'object' && typeof value.number === 'string') {
          return this.normalizePhoneValue(value.number);
        }
        return '';
      })
      .filter(Boolean);
  }

  private normalizePhoneValue(value?: string): string {
    if (!value) return '';
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('+')) return trimmed;

    const cleaned = trimmed.replace(/[\s-]/g, '');
    if (/^\d+$/.test(cleaned)) {
      return `+${cleaned}`;
    }

    return trimmed;
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
