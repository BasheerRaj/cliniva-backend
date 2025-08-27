import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ValidationPipe,
  Logger
} from '@nestjs/common';
import { EmergencyContactsService } from './emergency-contacts.service';
import {
  CreateEmergencyContactDto,
  UpdateEmergencyContactDto,
  EmergencyContactSearchDto,
  EmergencyContactResponseDto,
  BulkEmergencyContactDto
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('emergency-contacts')
@UseGuards(JwtAuthGuard)
export class EmergencyContactsController {
  private readonly logger = new Logger(EmergencyContactsController.name);

  constructor(private readonly emergencyContactsService: EmergencyContactsService) {}

  /**
   * Add emergency contact
   * POST /emergency-contacts
   */
  @Post()
  async addEmergencyContact(
    @Body(new ValidationPipe()) createEmergencyContactDto: CreateEmergencyContactDto
  ) {
    try {
      this.logger.log(`Adding emergency contact for ${createEmergencyContactDto.entityType}: ${createEmergencyContactDto.entityId}`);
      
      const contact = await this.emergencyContactsService.addEmergencyContact(createEmergencyContactDto);

      const response: EmergencyContactResponseDto = {
        id: (contact as any)._id.toString(),
        entityType: contact.entityType,
        entityId: contact.entityId.toString(),
        contactName: contact.contactName,
        contactPhone: contact.contactPhone,
        relationship: contact.relationship,
        alternativePhone: contact.alternativePhone,
        email: contact.email,
        isActive: contact.isActive,
        isPrimary: contact.isPrimary,
        createdAt: (contact as any).createdAt || new Date(),
        updatedAt: (contact as any).updatedAt || new Date()
      };

      return {
        success: true,
        message: 'Emergency contact added successfully',
        data: response
      };
    } catch (error) {
      this.logger.error(`Failed to add emergency contact: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get emergency contacts for patient
   * GET /emergency-contacts/patient/:patientId
   */
  @Get('patient/:patientId')
  async getPatientEmergencyContacts(@Param('patientId') patientId: string) {
    try {
      this.logger.log(`Fetching emergency contacts for patient: ${patientId}`);
      
      const contacts = await this.emergencyContactsService.getEmergencyContactsByEntity('patient', patientId);

      const data: EmergencyContactResponseDto[] = contacts.map(contact => ({
        id: (contact as any)._id.toString(),
        entityType: contact.entityType,
        entityId: contact.entityId.toString(),
        contactName: contact.contactName,
        contactPhone: contact.contactPhone,
        relationship: contact.relationship,
        alternativePhone: contact.alternativePhone,
        email: contact.email,
        isActive: contact.isActive,
        isPrimary: contact.isPrimary,
        createdAt: (contact as any).createdAt || new Date(),
        updatedAt: (contact as any).updatedAt || new Date()
      }));

      return {
        success: true,
        message: 'Patient emergency contacts retrieved successfully',
        data,
        count: data.length
      };
    } catch (error) {
      this.logger.error(`Failed to fetch patient emergency contacts: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get emergency contacts for any entity
   * GET /emergency-contacts/:entityType/:entityId
   */
  @Get(':entityType/:entityId')
  async getEmergencyContactsByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string
  ) {
    try {
      this.logger.log(`Fetching emergency contacts for ${entityType}: ${entityId}`);
      
      const contacts = await this.emergencyContactsService.getEmergencyContactsByEntity(entityType, entityId);

      const data: EmergencyContactResponseDto[] = contacts.map(contact => ({
        id: (contact as any)._id.toString(),
        entityType: contact.entityType,
        entityId: contact.entityId.toString(),
        contactName: contact.contactName,
        contactPhone: contact.contactPhone,
        relationship: contact.relationship,
        alternativePhone: contact.alternativePhone,
        email: contact.email,
        isActive: contact.isActive,
        isPrimary: contact.isPrimary,
        createdAt: (contact as any).createdAt || new Date(),
        updatedAt: (contact as any).updatedAt || new Date()
      }));

      return {
        success: true,
        message: 'Emergency contacts retrieved successfully',
        data,
        count: data.length
      };
    } catch (error) {
      this.logger.error(`Failed to fetch emergency contacts: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get emergency contact by ID
   * GET /emergency-contacts/details/:id
   */
  @Get('details/:id')
  async getEmergencyContactById(@Param('id') id: string) {
    try {
      this.logger.log(`Fetching emergency contact by ID: ${id}`);
      
      const contact = await this.emergencyContactsService.getEmergencyContactById(id);

      const response: EmergencyContactResponseDto = {
        id: (contact as any)._id.toString(),
        entityType: contact.entityType,
        entityId: contact.entityId.toString(),
        contactName: contact.contactName,
        contactPhone: contact.contactPhone,
        relationship: contact.relationship,
        alternativePhone: contact.alternativePhone,
        email: contact.email,
        isActive: contact.isActive,
        isPrimary: contact.isPrimary,
        createdAt: (contact as any).createdAt || new Date(),
        updatedAt: (contact as any).updatedAt || new Date()
      };

      return {
        success: true,
        message: 'Emergency contact retrieved successfully',
        data: response
      };
    } catch (error) {
      this.logger.error(`Failed to fetch emergency contact: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search emergency contacts with filters
   * GET /emergency-contacts
   */
  @Get()
  async searchEmergencyContacts(@Query() query: EmergencyContactSearchDto) {
    try {
      this.logger.log(`Searching emergency contacts with filters: ${JSON.stringify(query)}`);
      
      const result = await this.emergencyContactsService.searchEmergencyContacts(query);

      const data: EmergencyContactResponseDto[] = result.data.map(contact => ({
        id: (contact as any)._id.toString(),
        entityType: contact.entityType,
        entityId: contact.entityId.toString(),
        contactName: contact.contactName,
        contactPhone: contact.contactPhone,
        relationship: contact.relationship,
        alternativePhone: contact.alternativePhone,
        email: contact.email,
        isActive: contact.isActive,
        isPrimary: contact.isPrimary,
        createdAt: (contact as any).createdAt || new Date(),
        updatedAt: (contact as any).updatedAt || new Date()
      }));

      return {
        success: true,
        message: 'Emergency contact search completed successfully',
        data,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit: parseInt(query.limit || '10')
        }
      };
    } catch (error) {
      this.logger.error(`Failed to search emergency contacts: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update emergency contact
   * PUT /emergency-contacts/:id
   */
  @Put(':id')
  async updateEmergencyContact(
    @Param('id') id: string,
    @Body(new ValidationPipe()) updateEmergencyContactDto: UpdateEmergencyContactDto
  ) {
    try {
      this.logger.log(`Updating emergency contact: ${id}`);
      
      const contact = await this.emergencyContactsService.updateEmergencyContact(id, updateEmergencyContactDto);

      const response: EmergencyContactResponseDto = {
        id: (contact as any)._id.toString(),
        entityType: contact.entityType,
        entityId: contact.entityId.toString(),
        contactName: contact.contactName,
        contactPhone: contact.contactPhone,
        relationship: contact.relationship,
        alternativePhone: contact.alternativePhone,
        email: contact.email,
        isActive: contact.isActive,
        isPrimary: contact.isPrimary,
        createdAt: (contact as any).createdAt || new Date(),
        updatedAt: (contact as any).updatedAt || new Date()
      };

      return {
        success: true,
        message: 'Emergency contact updated successfully',
        data: response
      };
    } catch (error) {
      this.logger.error(`Failed to update emergency contact: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove emergency contact
   * DELETE /emergency-contacts/:id
   */
  @Delete(':id')
  async deleteEmergencyContact(@Param('id') id: string) {
    try {
      this.logger.log(`Deleting emergency contact: ${id}`);
      
      await this.emergencyContactsService.deleteEmergencyContact(id);

      return {
        success: true,
        message: 'Emergency contact deleted successfully'
      };
    } catch (error) {
      this.logger.error(`Failed to delete emergency contact: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get primary emergency contact for entity
   * GET /emergency-contacts/primary/:entityType/:entityId
   */
  @Get('primary/:entityType/:entityId')
  async getPrimaryContact(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string
  ) {
    try {
      this.logger.log(`Fetching primary emergency contact for ${entityType}: ${entityId}`);
      
      const contact = await this.emergencyContactsService.getPrimaryContact(entityType, entityId);

      if (!contact) {
        return {
          success: true,
          message: 'No primary emergency contact found',
          data: null
        };
      }

      const response: EmergencyContactResponseDto = {
        id: (contact as any)._id.toString(),
        entityType: contact.entityType,
        entityId: contact.entityId.toString(),
        contactName: contact.contactName,
        contactPhone: contact.contactPhone,
        relationship: contact.relationship,
        alternativePhone: contact.alternativePhone,
        email: contact.email,
        isActive: contact.isActive,
        isPrimary: contact.isPrimary,
        createdAt: (contact as any).createdAt || new Date(),
        updatedAt: (contact as any).updatedAt || new Date()
      };

      return {
        success: true,
        message: 'Primary emergency contact retrieved successfully',
        data: response
      };
    } catch (error) {
      this.logger.error(`Failed to fetch primary emergency contact: ${error.message}`);
      throw error;
    }
  }

  /**
   * Set primary emergency contact
   * POST /emergency-contacts/:id/set-primary
   */
  @Post(':id/set-primary')
  async setPrimaryContact(@Param('id') id: string) {
    try {
      this.logger.log(`Setting emergency contact as primary: ${id}`);
      
      const contact = await this.emergencyContactsService.setPrimaryContact(id);

      const response: EmergencyContactResponseDto = {
        id: (contact as any)._id.toString(),
        entityType: contact.entityType,
        entityId: contact.entityId.toString(),
        contactName: contact.contactName,
        contactPhone: contact.contactPhone,
        relationship: contact.relationship,
        alternativePhone: contact.alternativePhone,
        email: contact.email,
        isActive: contact.isActive,
        isPrimary: contact.isPrimary,
        createdAt: (contact as any).createdAt || new Date(),
        updatedAt: (contact as any).updatedAt || new Date()
      };

      return {
        success: true,
        message: 'Emergency contact set as primary successfully',
        data: response
      };
    } catch (error) {
      this.logger.error(`Failed to set primary emergency contact: ${error.message}`);
      throw error;
    }
  }

  /**
   * Bulk add emergency contacts
   * POST /emergency-contacts/bulk
   */
  @Post('bulk')
  async bulkAddContacts(
    @Body(new ValidationPipe()) bulkEmergencyContactDto: BulkEmergencyContactDto
  ) {
    try {
      this.logger.log(`Bulk adding contacts for ${bulkEmergencyContactDto.entityType}: ${bulkEmergencyContactDto.entityId}`);
      
      const result = await this.emergencyContactsService.bulkAddContacts(bulkEmergencyContactDto);

      return {
        success: true,
        message: `Bulk contact addition completed. ${result.success} successful, ${result.failed} failed.`,
        data: result
      };
    } catch (error) {
      this.logger.error(`Failed to bulk add emergency contacts: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get emergency contact statistics
   * GET /emergency-contacts/stats
   */
  @Get('stats')
  async getContactStats() {
    try {
      this.logger.log('Fetching emergency contact statistics');
      
      const stats = await this.emergencyContactsService.getContactStats();

      return {
        success: true,
        message: 'Emergency contact statistics retrieved successfully',
        data: stats
      };
    } catch (error) {
      this.logger.error(`Failed to fetch contact statistics: ${error.message}`);
      throw error;
    }
  }
} 