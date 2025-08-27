import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactsDto, UpdateContactDto } from './dto/create-contact.dto';
import { Contact } from '../database/schemas/contact.schema';

@Controller('contacts')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  /**
   * Create a new contact entry
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createContact(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    createContactsDto: CreateContactsDto,
  ): Promise<Contact[]> {
    return this.contactService.createContacts(createContactsDto);
  }

  /**
   * Get contacts by entity
   */
  @Get('entity/:entityType/:entityId')
  async getContactsByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ): Promise<Contact[]> {
    return this.contactService.getContactsByEntity(entityType, entityId);
  }

  /**
   * Update contact
   */
  @Put(':id')
  async updateContact(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    updateContactDto: UpdateContactDto,
  ): Promise<Contact> {
    return this.contactService.updateContact(id, updateContactDto);
  }

  /**
   * Delete contact
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteContact(@Param('id') id: string): Promise<void> {
    return this.contactService.deleteContact(id);
  }

  /**
   * Get all contacts with optional filtering
   */
  @Get()
  async getAllContacts(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('type') contactType?: string,
  ): Promise<Contact[]> {
    if (entityType && entityId) {
      return this.contactService.getContactsByEntity(entityType, entityId);
    }
    return [];
  }
}
