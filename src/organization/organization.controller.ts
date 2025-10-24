import { Controller, Post, Get, Put, Body, Param, HttpStatus, HttpCode, UseGuards, Request } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto, UpdateOrganizationDto, SetupLegalInfoDto } from './dto/create-organization.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from 'src/common';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('organization') // Changed from 'organizations' to match frontend call
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createOrganization(@Body() createOrganizationDto: CreateOrganizationDto, @Request() req) {
    try {
      const userId = req.user.userId || req.user.id;
      const organization = await this.organizationService.createOrganization(createOrganizationDto, userId);

      return {
        success: true,
        message: 'Organization created successfully',
        data: {
          organizationId: organization._id?.toString() || organization.id,
          subscriptionId: createOrganizationDto.subscriptionId
        }
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to create organization',
        data: {
          organizationId: '',
          subscriptionId: createOrganizationDto.subscriptionId
        }
      };
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.DOCTOR, UserRole.STAFF, UserRole.ADMIN)
  async getOrganization(@Param('id') id: string, @Request() req) {
    try {
      const userId = req.user.userId || req.user.id;

      // استخدام الـ helper للتحقق من الصلاحيات
      const { organization } = await this.organizationService.verifyAccessOrThrow(userId, id);

      return {
        success: true,
        message: 'Organization retrieved successfully',
        data: organization
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to retrieve organization',
        error: error.message
      };
    }
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateOrganization(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @Request() req
  ) {
    try {
      const userId = req.user.userId || req.user.id;

      // استخدام الـ helper للتحقق من صلاحية التعديل
      await this.organizationService.verifyModifyPermissionOrThrow(userId, id);

      const updatedOrganization = await this.organizationService.updateOrganization(id, updateOrganizationDto);

      return {
        success: true,
        message: 'Organization updated successfully',
        data: updatedOrganization
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to update organization',
        error: error.message
      };
    }
  }

 @Post(':id/legal-info')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async setupLegalInfo(
    @Param('id') id: string,
    @Body() setupLegalInfoDto: SetupLegalInfoDto,
    @Request() req
  ) {
    try {
      const userId = req.user.userId || req.user.id;
      
      // استخدام الـ helper للتحقق من صلاحية التعديل
      await this.organizationService.verifyModifyPermissionOrThrow(userId, id);
      
      const updatedOrganization = await this.organizationService.setupLegalInfo(id, setupLegalInfoDto);
      
      return {
        success: true,
        message: 'Legal information setup successfully',
        data: updatedOrganization
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to setup legal information',
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
