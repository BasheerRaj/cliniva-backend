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
  Logger,
} from '@nestjs/common';
import { DynamicInfoService } from './dynamic-info.service';
import {
  CreateDynamicInfoDto,
  UpdateDynamicInfoDto,
  DynamicInfoSearchDto,
  DynamicInfoResponseDto,
  InfoTypeDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('dynamic-info')
@UseGuards(JwtAuthGuard)
export class DynamicInfoController {
  private readonly logger = new Logger(DynamicInfoController.name);

  constructor(private readonly dynamicInfoService: DynamicInfoService) {}

  /**
   * Create dynamic information
   * POST /dynamic-info
   */
  @Post()
  async createDynamicInfo(
    @Body(new ValidationPipe()) createDynamicInfoDto: CreateDynamicInfoDto,
  ) {
    try {
      this.logger.log(
        `Creating dynamic info for entity: ${createDynamicInfoDto.entityType}/${createDynamicInfoDto.entityId}`,
      );

      const dynamicInfo =
        await this.dynamicInfoService.createDynamicInfo(createDynamicInfoDto);

      const response: DynamicInfoResponseDto = {
        id: (dynamicInfo as any)._id.toString(),
        entityType: dynamicInfo.entityType,
        entityId: dynamicInfo.entityId.toString(),
        infoType: dynamicInfo.infoType,
        infoValue: dynamicInfo.infoValue,
        isActive: dynamicInfo.isActive,
        createdAt: (dynamicInfo as any).createdAt || new Date(),
        updatedAt: (dynamicInfo as any).updatedAt || new Date(),
      };

      return {
        success: true,
        message: 'Dynamic information created successfully',
        data: response,
      };
    } catch (error) {
      this.logger.error(`Failed to create dynamic info: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get dynamic information by entity
   * GET /dynamic-info/:entityType/:entityId
   */
  @Get(':entityType/:entityId')
  async getDynamicInfoByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    try {
      this.logger.log(
        `Fetching dynamic info for entity: ${entityType}/${entityId}`,
      );

      const dynamicInfoList =
        await this.dynamicInfoService.getDynamicInfoByEntity(
          entityType,
          entityId,
        );

      const data: DynamicInfoResponseDto[] = dynamicInfoList.map((info) => ({
        id: (info as any)._id.toString(),
        entityType: info.entityType,
        entityId: info.entityId.toString(),
        infoType: info.infoType,
        infoValue: info.infoValue,
        isActive: info.isActive,
        createdAt: (info as any).createdAt || new Date(),
        updatedAt: (info as any).updatedAt || new Date(),
      }));

      return {
        success: true,
        message: 'Dynamic information retrieved successfully',
        data,
        count: data.length,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch dynamic info by entity: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get dynamic information by ID
   * GET /dynamic-info/details/:id
   */
  @Get('details/:id')
  async getDynamicInfoById(@Param('id') id: string) {
    try {
      this.logger.log(`Fetching dynamic info by ID: ${id}`);

      const dynamicInfo = await this.dynamicInfoService.getDynamicInfoById(id);

      const response: DynamicInfoResponseDto = {
        id: (dynamicInfo as any)._id.toString(),
        entityType: dynamicInfo.entityType,
        entityId: dynamicInfo.entityId.toString(),
        infoType: dynamicInfo.infoType,
        infoValue: dynamicInfo.infoValue,
        isActive: dynamicInfo.isActive,
        createdAt: (dynamicInfo as any).createdAt || new Date(),
        updatedAt: (dynamicInfo as any).updatedAt || new Date(),
      };

      return {
        success: true,
        message: 'Dynamic information retrieved successfully',
        data: response,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch dynamic info by ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search dynamic information with filters
   * GET /dynamic-info
   */
  @Get()
  async searchDynamicInfo(@Query() query: DynamicInfoSearchDto) {
    try {
      this.logger.log(
        `Searching dynamic info with filters: ${JSON.stringify(query)}`,
      );

      const result = await this.dynamicInfoService.searchDynamicInfo(query);

      const data: DynamicInfoResponseDto[] = result.data.map((info) => ({
        id: (info as any)._id.toString(),
        entityType: info.entityType,
        entityId: info.entityId.toString(),
        infoType: info.infoType,
        infoValue: info.infoValue,
        isActive: info.isActive,
        createdAt: (info as any).createdAt || new Date(),
        updatedAt: (info as any).updatedAt || new Date(),
      }));

      return {
        success: true,
        message: 'Dynamic information search completed successfully',
        data,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit: parseInt(query.limit || '10'),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to search dynamic info: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update dynamic information
   * PUT /dynamic-info/:id
   */
  @Put(':id')
  async updateDynamicInfo(
    @Param('id') id: string,
    @Body(new ValidationPipe()) updateDynamicInfoDto: UpdateDynamicInfoDto,
  ) {
    try {
      this.logger.log(`Updating dynamic info: ${id}`);

      const updatedInfo = await this.dynamicInfoService.updateDynamicInfo(
        id,
        updateDynamicInfoDto,
      );

      const response: DynamicInfoResponseDto = {
        id: (updatedInfo as any)._id.toString(),
        entityType: updatedInfo.entityType,
        entityId: updatedInfo.entityId.toString(),
        infoType: updatedInfo.infoType,
        infoValue: updatedInfo.infoValue,
        isActive: updatedInfo.isActive,
        createdAt: (updatedInfo as any).createdAt || new Date(),
        updatedAt: (updatedInfo as any).updatedAt || new Date(),
      };

      return {
        success: true,
        message: 'Dynamic information updated successfully',
        data: response,
      };
    } catch (error) {
      this.logger.error(`Failed to update dynamic info: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete dynamic information
   * DELETE /dynamic-info/:id
   */
  @Delete(':id')
  async deleteDynamicInfo(@Param('id') id: string) {
    try {
      this.logger.log(`Deleting dynamic info: ${id}`);

      await this.dynamicInfoService.deleteDynamicInfo(id);

      return {
        success: true,
        message: 'Dynamic information deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to delete dynamic info: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get available information types
   * GET /dynamic-info/types
   */
  @Get('types')
  async getInfoTypes() {
    try {
      this.logger.log('Fetching available info types');

      const infoTypes = await this.dynamicInfoService.getInfoTypes();

      return {
        success: true,
        message: 'Info types retrieved successfully',
        data: infoTypes,
        count: infoTypes.length,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch info types: ${error.message}`);
      throw error;
    }
  }
}
