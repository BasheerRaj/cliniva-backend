import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Contact } from '../database/schemas/contact.schema';
import { CreateContactsDto, UpdateContactDto } from './dto/create-contact.dto';
import { ValidationUtil } from '../common/utils/validation.util';

@Injectable()
export class ContactService {
  constructor(
    @InjectModel('Contact') private readonly contactModel: Model<Contact>,
  ) {}

  async createContacts(createDto: CreateContactsDto): Promise<Contact[]> {
    const contacts: Contact[] = [];

    for (const contactData of createDto.contacts) {
      // Validate social media URL
      if (!ValidationUtil.validateSocialMediaUrl(contactData.contactType, contactData.contactValue)) {
        throw new BadRequestException(`Invalid ${contactData.contactType} URL: ${contactData.contactValue}`);
      }

      const contact = new this.contactModel({
        entityType: createDto.entityType,
        entityId: new Types.ObjectId(createDto.entityId),
        contactType: contactData.contactType.toLowerCase(),
        contactValue: contactData.contactValue,
        isActive: contactData.isActive !== false
      });

      contacts.push(await contact.save());
    }

    return contacts;
  }

  async updateContact(contactId: string, updateDto: UpdateContactDto): Promise<Contact> {
    const contact = await this.contactModel.findById(contactId);
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    // Validate URL if contactValue is being updated
    if (updateDto.contactValue && updateDto.contactType) {
      if (!ValidationUtil.validateSocialMediaUrl(updateDto.contactType, updateDto.contactValue)) {
        throw new BadRequestException(`Invalid ${updateDto.contactType} URL: ${updateDto.contactValue}`);
      }
    }

    Object.assign(contact, updateDto);
    return await contact.save();
  }

  async getContactsByEntity(entityType: string, entityId: string): Promise<Contact[]> {
    return await this.contactModel.find({
      entityType,
      entityId: new Types.ObjectId(entityId),
      isActive: true
    }).exec();
  }

  async deleteContact(contactId: string): Promise<void> {
    const contact = await this.contactModel.findById(contactId);
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    contact.isActive = false;
    await contact.save();
  }

  async createBulkContacts(contacts: any[], entityMappings: Array<{ type: string; id: string }>): Promise<void> {
    for (const mapping of entityMappings) {
      const entityContacts = contacts.filter(c => c.entityType === mapping.type);
      if (entityContacts.length > 0) {
        await this.createContacts({
          entityType: mapping.type,
          entityId: mapping.id,
          contacts: entityContacts
        });
      }
    }
  }
}
