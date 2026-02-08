import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  HttpStatus,
  HttpCode,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  SetupLegalInfoDto,
} from './dto/create-organization.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import * as SWAGGER_EXAMPLES from './constants/swagger-examples';

@ApiTags('Organizations')
@Controller('organization') // Changed from 'organizations' to match frontend call
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @ApiOperation({
    summary: 'Create new organization',
    description:
      'Creates a new organization with company plan subscription. Requires authentication. Each user can only own one organization. The organization is automatically linked to the authenticated user as the owner. Validates subscription plan (must be company plan) and ensures subscription is active.',
  })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
    schema: {
      example: SWAGGER_EXAMPLES.CREATE_ORGANIZATION_SUCCESS_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Validation failed, duplicate organization, invalid subscription, or user already owns an organization',
    schema: {
      examples: {
        alreadyExists: {
          value: SWAGGER_EXAMPLES.ERROR_ORGANIZATION_ALREADY_EXISTS_EXAMPLE,
        },
        userOwnsOrg: {
          value: SWAGGER_EXAMPLES.ERROR_USER_ALREADY_OWNS_ORGANIZATION_EXAMPLE,
        },
        subscriptionNotActive: {
          value: SWAGGER_EXAMPLES.ERROR_SUBSCRIPTION_NOT_ACTIVE_EXAMPLE,
        },
        invalidPlan: {
          value: SWAGGER_EXAMPLES.ERROR_INVALID_SUBSCRIPTION_PLAN_EXAMPLE,
        },
        duplicateName: {
          value: SWAGGER_EXAMPLES.ERROR_DUPLICATE_NAME_EXAMPLE,
        },
        duplicateEmail: {
          value: SWAGGER_EXAMPLES.ERROR_DUPLICATE_EMAIL_EXAMPLE,
        },
        validationFailed: {
          value: SWAGGER_EXAMPLES.ERROR_VALIDATION_FAILED_EXAMPLE,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: SWAGGER_EXAMPLES.ERROR_UNAUTHORIZED_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
    schema: {
      example: SWAGGER_EXAMPLES.ERROR_INTERNAL_SERVER_EXAMPLE,
    },
  })
  @ApiBearerAuth()
  @ApiBody({
    type: CreateOrganizationDto,
    description: 'Organization creation data',
    examples: {
      complete: {
        summary: 'Complete organization data',
        value: SWAGGER_EXAMPLES.CREATE_ORGANIZATION_REQUEST_EXAMPLE,
      },
    },
  })
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createOrganization(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @Request() req,
  ) {
    try {
      const userId = req.user.userId || req.user.id;
      const organization = await this.organizationService.createOrganization(
        createOrganizationDto,
        userId,
      );

      return {
        success: true,
        message: 'Organization created successfully',
        data: {
          organizationId: organization._id?.toString() || organization.id,
          subscriptionId: createOrganizationDto.subscriptionId,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to create organization',
        data: {
          organizationId: '',
          subscriptionId: createOrganizationDto.subscriptionId,
        },
      };
    }
  }

  @ApiOperation({
    summary: 'Get organization by ID',
    description:
      'Retrieves detailed information about a specific organization by its unique identifier. Returns complete organization profile including business information, contact details, and legal information.',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization retrieved successfully',
    schema: {
      example: SWAGGER_EXAMPLES.GET_ORGANIZATION_SUCCESS_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
    schema: {
      example: SWAGGER_EXAMPLES.ERROR_ORGANIZATION_NOT_FOUND_EXAMPLE,
    },
  })
  @ApiParam({
    name: 'id',
    description: 'Organization unique identifier (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439012',
    type: String,
  })
  @Get(':id')
  async getOrganization(@Param('id') id: string) {
    try {
      const organization = await this.organizationService.getOrganization(id);

      return {
        success: true,
        message: 'Organization retrieved successfully',
        data: organization,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve organization',
        error: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Update organization',
    description:
      'Updates an existing organization with new information. All fields are optional - only provided fields will be updated. Validates business profile data, contact information, and ensures uniqueness constraints (name, email) are maintained.',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
    schema: {
      example: SWAGGER_EXAMPLES.UPDATE_ORGANIZATION_SUCCESS_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Validation failed or duplicate data',
    schema: {
      examples: {
        validationFailed: {
          value: SWAGGER_EXAMPLES.ERROR_VALIDATION_FAILED_EXAMPLE,
        },
        duplicateName: {
          value: SWAGGER_EXAMPLES.ERROR_DUPLICATE_NAME_EXAMPLE,
        },
        duplicateEmail: {
          value: SWAGGER_EXAMPLES.ERROR_DUPLICATE_EMAIL_EXAMPLE,
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
    schema: {
      example: SWAGGER_EXAMPLES.ERROR_ORGANIZATION_NOT_FOUND_EXAMPLE,
    },
  })
  @ApiParam({
    name: 'id',
    description: 'Organization unique identifier (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439012',
    type: String,
  })
  @ApiBody({
    type: UpdateOrganizationDto,
    description: 'Organization update data (all fields optional)',
    examples: {
      partial: {
        summary: 'Partial update',
        value: SWAGGER_EXAMPLES.UPDATE_ORGANIZATION_REQUEST_EXAMPLE,
      },
    },
  })
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async updateOrganization(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ) {
    try {
      const organization = await this.organizationService.updateOrganization(
        id,
        updateOrganizationDto,
      );

      return {
        success: true,
        message: 'Organization updated successfully',
        data: organization,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update organization',
        error: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Setup legal information',
    description:
      'Sets up or updates legal information for an organization including VAT number, Commercial Registration (CR) number, terms and conditions, and privacy policy. Validates VAT and CR number formats according to Saudi Arabian standards.',
  })
  @ApiResponse({
    status: 200,
    description: 'Legal information setup successfully',
    schema: {
      example: SWAGGER_EXAMPLES.SETUP_LEGAL_INFO_SUCCESS_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid VAT or CR number format',
    schema: {
      examples: {
        invalidVat: {
          value: SWAGGER_EXAMPLES.ERROR_INVALID_VAT_NUMBER_EXAMPLE,
        },
        invalidCr: {
          value: SWAGGER_EXAMPLES.ERROR_INVALID_CR_NUMBER_EXAMPLE,
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
    schema: {
      example: SWAGGER_EXAMPLES.ERROR_ORGANIZATION_NOT_FOUND_EXAMPLE,
    },
  })
  @ApiParam({
    name: 'id',
    description: 'Organization unique identifier (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439012',
    type: String,
  })
  @ApiBody({
    type: SetupLegalInfoDto,
    description: 'Legal information data',
    examples: {
      complete: {
        summary: 'Complete legal information',
        value: SWAGGER_EXAMPLES.SETUP_LEGAL_INFO_REQUEST_EXAMPLE,
      },
    },
  })
  @Post(':id/legal-info')
  @HttpCode(HttpStatus.OK)
  async setupLegalInfo(
    @Param('id') id: string,
    @Body() setupLegalInfoDto: SetupLegalInfoDto,
  ) {
    try {
      const organization = await this.organizationService.setupLegalInfo(
        id,
        setupLegalInfoDto,
      );

      return {
        success: true,
        message: 'Legal information setup successfully',
        data: organization,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to setup legal information',
        error: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Get organization by subscription ID',
    description:
      'Retrieves an organization associated with a specific subscription. Returns the organization if found, or null if no organization exists for the given subscription. Useful for checking if an organization has already been created for a subscription during onboarding.',
  })
  @ApiResponse({
    status: 200,
    description: 'Query successful - organization found or not found',
    schema: {
      examples: {
        found: {
          summary: 'Organization found',
          value: SWAGGER_EXAMPLES.GET_BY_SUBSCRIPTION_SUCCESS_EXAMPLE,
        },
        notFound: {
          summary: 'No organization found',
          value: SWAGGER_EXAMPLES.GET_BY_SUBSCRIPTION_NOT_FOUND_EXAMPLE,
        },
      },
    },
  })
  @ApiParam({
    name: 'subscriptionId',
    description: 'Subscription unique identifier (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @Get('subscription/:subscriptionId')
  async getBySubscription(@Param('subscriptionId') subscriptionId: string) {
    try {
      const organization =
        await this.organizationService.getOrganizationBySubscription(
          subscriptionId,
        );

      return {
        success: true,
        message: organization ? 'Organization found' : 'No organization found',
        data: organization,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve organization',
        error: error.message,
      };
    }
  }
}
