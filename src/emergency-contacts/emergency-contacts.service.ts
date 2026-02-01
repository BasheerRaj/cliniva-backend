import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EmergencyContact } from '../database/schemas/emergency-contact.schema';
import { Patient } from '../database/schemas/patient.schema';
import { Organization } from '../database/schemas/organization.schema';
import { Complex } from '../database/schemas/complex.schema';
import { Clinic } from '../database/schemas/clinic.schema';
import {
  CreateEmergencyContactDto,
  UpdateEmergencyContactDto,
  EmergencyContactSearchDto,
  BulkEmergencyContactDto,
} from './dto';

@Injectable()
export class EmergencyContactsService {
  private readonly logger = new Logger(EmergencyContactsService.name);

  constructor(
    @InjectModel('EmergencyContact')
    private readonly emergencyContactModel: Model<EmergencyContact>,
    @InjectModel('Patient') private readonly patientModel: Model<Patient>,
    @InjectModel('Organization')
    private readonly organizationModel: Model<Organization>,
    @InjectModel('Complex') private readonly complexModel: Model<Complex>,
    @InjectModel('Clinic') private readonly clinicModel: Model<Clinic>,
  ) {}

  /**
   * Add emergency contact
   */
  async addEmergencyContact(
    createDto: CreateEmergencyContactDto,
  ): Promise<EmergencyContact> {
    this.logger.log(
      `Adding emergency contact for ${createDto.entityType}: ${createDto.entityId}`,
    );

    // Validate entity exists
    await this.validateEntity(createDto.entityType, createDto.entityId);

    // If setting as primary, unset other primary contacts for this entity
    if (createDto.isPrimary) {
      await this.unsetPrimaryContacts(createDto.entityType, createDto.entityId);
    }

    const contactData = {
      entityType: createDto.entityType,
      entityId: new Types.ObjectId(createDto.entityId),
      contactName: createDto.contactName,
      contactPhone: createDto.contactPhone,
      relationship: createDto.relationship,
      alternativePhone: createDto.alternativePhone,
      email: createDto.email,
      isActive: createDto.isActive !== false,
      isPrimary: createDto.isPrimary || false,
    };

    const contact = new this.emergencyContactModel(contactData);
    const savedContact = await contact.save();

    this.logger.log(
      `Emergency contact added successfully: ${savedContact._id}`,
    );
    return savedContact;
  }

  /**
   * Get emergency contacts for entity (e.g., patient)
   */
  async getEmergencyContactsByEntity(
    entityType: string,
    entityId: string,
  ): Promise<EmergencyContact[]> {
    if (!Types.ObjectId.isValid(entityId)) {
      throw new BadRequestException('Invalid entity ID format');
    }

    this.logger.log(
      `Fetching emergency contacts for ${entityType}: ${entityId}`,
    );

    const contacts = await this.emergencyContactModel
      .find({
        entityType,
        entityId: new Types.ObjectId(entityId),
        isActive: true,
      })
      .sort({ isPrimary: -1, createdAt: -1 })
      .exec();

    return contacts;
  }

  /**
   * Get emergency contact by ID
   */
  async getEmergencyContactById(contactId: string): Promise<EmergencyContact> {
    if (!Types.ObjectId.isValid(contactId)) {
      throw new BadRequestException('Invalid contact ID format');
    }

    const contact = await this.emergencyContactModel.findById(contactId).exec();
    if (!contact) {
      throw new NotFoundException('Emergency contact not found');
    }

    return contact;
  }

  /**
   * Update emergency contact
   */
  async updateEmergencyContact(
    contactId: string,
    updateDto: UpdateEmergencyContactDto,
  ): Promise<EmergencyContact> {
    if (!Types.ObjectId.isValid(contactId)) {
      throw new BadRequestException('Invalid contact ID format');
    }

    this.logger.log(`Updating emergency contact: ${contactId}`);

    const existingContact = await this.getEmergencyContactById(contactId);

    // If setting as primary, unset other primary contacts for this entity
    if (updateDto.isPrimary && !existingContact.isPrimary) {
      await this.unsetPrimaryContacts(
        existingContact.entityType,
        existingContact.entityId.toString(),
      );
    }

    const contact = await this.emergencyContactModel
      .findByIdAndUpdate(
        contactId,
        { $set: updateDto },
        { new: true, runValidators: true },
      )
      .exec();

    if (!contact) {
      throw new NotFoundException('Emergency contact not found');
    }

    this.logger.log(`Emergency contact updated successfully: ${contactId}`);
    return contact;
  }

  /**
   * Delete emergency contact
   */
  async deleteEmergencyContact(contactId: string): Promise<void> {
    if (!Types.ObjectId.isValid(contactId)) {
      throw new BadRequestException('Invalid contact ID format');
    }

    this.logger.log(`Deleting emergency contact: ${contactId}`);

    const result =
      await this.emergencyContactModel.findByIdAndDelete(contactId);
    if (!result) {
      throw new NotFoundException('Emergency contact not found');
    }

    this.logger.log(`Emergency contact deleted successfully: ${contactId}`);
  }

  /**
   * Search emergency contacts with filters
   */
  async searchEmergencyContacts(query: EmergencyContactSearchDto): Promise<{
    data: EmergencyContact[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      entityType,
      entityId,
      search,
      isActive,
      isPrimary,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    // Build filter
    const filter: any = {};

    if (entityType) filter.entityType = entityType;
    if (entityId && Types.ObjectId.isValid(entityId)) {
      filter.entityId = new Types.ObjectId(entityId);
    }
    if (isActive !== undefined) filter.isActive = isActive;
    if (isPrimary !== undefined) filter.isPrimary = isPrimary;

    // Handle search across multiple fields
    if (search) {
      filter.$or = [
        { contactName: new RegExp(search, 'i') },
        { contactPhone: new RegExp(search, 'i') },
        { relationship: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
      ];
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.max(1, Math.min(100, parseInt(limit)));
    const skip = (pageNum - 1) * pageSize;

    // Sorting
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [data, total] = await Promise.all([
      this.emergencyContactModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .exec(),
      this.emergencyContactModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      data,
      total,
      page: pageNum,
      totalPages,
    };
  }

  /**
   * Get primary emergency contact for entity
   */
  async getPrimaryContact(
    entityType: string,
    entityId: string,
  ): Promise<EmergencyContact | null> {
    if (!Types.ObjectId.isValid(entityId)) {
      throw new BadRequestException('Invalid entity ID format');
    }

    const primaryContact = await this.emergencyContactModel
      .findOne({
        entityType,
        entityId: new Types.ObjectId(entityId),
        isPrimary: true,
        isActive: true,
      })
      .exec();

    return primaryContact;
  }

  /**
   * Set primary emergency contact
   */
  async setPrimaryContact(contactId: string): Promise<EmergencyContact> {
    const contact = await this.getEmergencyContactById(contactId);

    // Unset other primary contacts for this entity
    await this.unsetPrimaryContacts(
      contact.entityType,
      contact.entityId.toString(),
    );

    // Set this contact as primary
    const updatedContact = await this.emergencyContactModel
      .findByIdAndUpdate(
        contactId,
        { $set: { isPrimary: true } },
        { new: true },
      )
      .exec();

    this.logger.log(`Contact set as primary: ${contactId}`);
    return updatedContact!;
  }

  /**
   * Bulk add emergency contacts
   */
  async bulkAddContacts(bulkDto: BulkEmergencyContactDto): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    this.logger.log(
      `Bulk adding contacts for ${bulkDto.entityType}: ${bulkDto.entityId}`,
    );

    // Validate entity exists
    await this.validateEntity(bulkDto.entityType, bulkDto.entityId);

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const contactData of bulkDto.contacts) {
      try {
        await this.addEmergencyContact({
          entityType: bulkDto.entityType,
          entityId: bulkDto.entityId,
          contactName: contactData.contactName,
          contactPhone: contactData.contactPhone,
          relationship: contactData.relationship,
          alternativePhone: contactData.alternativePhone,
          email: contactData.email,
          isPrimary: contactData.isPrimary,
        });
        success++;
      } catch (error) {
        failed++;
        errors.push(`Contact ${contactData.contactName}: ${error.message}`);
      }
    }

    return { success, failed, errors };
  }

  /**
   * Get statistics
   */
  async getContactStats(): Promise<{
    totalContacts: number;
    contactsByEntityType: Array<{ entityType: string; count: number }>;
    primaryContacts: number;
    contactsWithEmail: number;
    contactsWithAlternativePhone: number;
  }> {
    const [
      totalContacts,
      contactsByEntityType,
      primaryContacts,
      contactsWithEmail,
      contactsWithAlternativePhone,
    ] = await Promise.all([
      this.emergencyContactModel.countDocuments({ isActive: true }),
      this.emergencyContactModel.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$entityType', count: { $sum: 1 } } },
      ]),
      this.emergencyContactModel.countDocuments({
        isPrimary: true,
        isActive: true,
      }),
      this.emergencyContactModel.countDocuments({
        email: { $exists: true, $ne: null },
        isActive: true,
      }),
      this.emergencyContactModel.countDocuments({
        alternativePhone: { $exists: true, $ne: null },
        isActive: true,
      }),
    ]);

    return {
      totalContacts,
      contactsByEntityType: contactsByEntityType.map((item) => ({
        entityType: item._id,
        count: item.count,
      })),
      primaryContacts,
      contactsWithEmail,
      contactsWithAlternativePhone,
    };
  }

  // Helper Methods

  /**
   * Validate that the entity exists
   */
  private async validateEntity(
    entityType: string,
    entityId: string,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(entityId)) {
      throw new BadRequestException('Invalid entity ID format');
    }

    let entity = null;

    switch (entityType) {
      case 'patient':
        entity = await this.patientModel.findById(entityId);
        break;
      case 'organization':
        entity = await this.organizationModel.findById(entityId);
        break;
      case 'complex':
        entity = await this.complexModel.findById(entityId);
        break;
      case 'clinic':
        entity = await this.clinicModel.findById(entityId);
        break;
      default:
        throw new BadRequestException('Invalid entity type');
    }

    if (!entity) {
      throw new NotFoundException(`${entityType} not found`);
    }
  }

  /**
   * Unset primary status for other contacts of the same entity
   */
  private async unsetPrimaryContacts(
    entityType: string,
    entityId: string,
  ): Promise<void> {
    await this.emergencyContactModel.updateMany(
      {
        entityType,
        entityId: new Types.ObjectId(entityId),
        isPrimary: true,
      },
      { $set: { isPrimary: false } },
    );
  }
}
