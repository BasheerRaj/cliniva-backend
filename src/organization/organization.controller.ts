import { Controller, Post, Get, Put, Body, Param, HttpStatus, HttpCode } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto, UpdateOrganizationDto, SetupLegalInfoDto } from './dto/create-organization.dto';

@Controller('organizations')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrganization(@Body() createOrganizationDto: CreateOrganizationDto) {
    try {
      const organization = await this.organizationService.createOrganization(createOrganizationDto);
      
      return {
        success: true,
        message: 'Organization created successfully',
        data: organization
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create organization',
        error: error.message
      };
    }
  }

  @Get(':id')
  async getOrganization(@Param('id') id: string) {
    try {
      const organization = await this.organizationService.getOrganization(id);
      
      return {
        success: true,
        message: 'Organization retrieved successfully',
        data: organization
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve organization',
        error: error.message
      };
    }
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async updateOrganization(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto
  ) {
    try {
      const organization = await this.organizationService.updateOrganization(id, updateOrganizationDto);
      
      return {
        success: true,
        message: 'Organization updated successfully',
        data: organization
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update organization',
        error: error.message
      };
    }
  }

  @Post(':id/legal-info')
  @HttpCode(HttpStatus.OK)
  async setupLegalInfo(
    @Param('id') id: string,
    @Body() setupLegalInfoDto: SetupLegalInfoDto
  ) {
    try {
      const organization = await this.organizationService.setupLegalInfo(id, setupLegalInfoDto);
      
      return {
        success: true,
        message: 'Legal information setup successfully',
        data: organization
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to setup legal information',
        error: error.message
      };
    }
  }

  @Get('subscription/:subscriptionId')
  async getBySubscription(@Param('subscriptionId') subscriptionId: string) {
    try {
      const organization = await this.organizationService.getOrganizationBySubscription(subscriptionId);
      
      return {
        success: true,
        message: organization ? 'Organization found' : 'No organization found',
        data: organization
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve organization',
        error: error.message
      };
    }
  }
}
