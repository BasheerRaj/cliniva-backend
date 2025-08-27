import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DynamicInfo } from '../database/schemas/dynamic-info.schema';
import { 
  CreateDynamicInfoDto, 
  UpdateDynamicInfoDto, 
  DynamicInfoSearchDto,
  InfoTypeDto 
} from './dto/create-dynamic-info.dto';

@Injectable()
export class DynamicInfoService {
  constructor(
    @InjectModel('DynamicInfo') private readonly dynamicInfoModel: Model<DynamicInfo>,
  ) {}

  async createDynamicInfo(createDto: CreateDynamicInfoDto): Promise<DynamicInfo> {
    // Check if info already exists for this entity and type
    await this.dynamicInfoModel.findOneAndUpdate(
      {
        entityType: createDto.entityType,
        entityId: new Types.ObjectId(createDto.entityId),
        infoType: createDto.infoType
      },
      {
        entityType: createDto.entityType,
        entityId: new Types.ObjectId(createDto.entityId),
        infoType: createDto.infoType,
        infoValue: createDto.infoValue,
        isActive: createDto.isActive !== false
      },
      { upsert: true, new: true }
    );

    const result = await this.dynamicInfoModel.findOne({
      entityType: createDto.entityType,
      entityId: new Types.ObjectId(createDto.entityId),
      infoType: createDto.infoType
    });

    if (!result) {
      throw new NotFoundException('Dynamic info not found');
    }

    return result;
  }

  async updateDynamicInfo(infoId: string, updateDto: UpdateDynamicInfoDto): Promise<DynamicInfo> {
    const info = await this.dynamicInfoModel.findById(infoId);
    if (!info) {
      throw new NotFoundException('Dynamic info not found');
    }

    Object.assign(info, updateDto);
    return await info.save();
  }

  async getDynamicInfoByEntity(entityType: string, entityId: string): Promise<DynamicInfo[]> {
    return await this.dynamicInfoModel.find({
      entityType,
      entityId: new Types.ObjectId(entityId),
      isActive: true
    }).exec();
  }

  async getDynamicInfoById(id: string): Promise<DynamicInfo> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid dynamic info ID format');
    }

    const info = await this.dynamicInfoModel.findById(id).exec();
    if (!info) {
      throw new NotFoundException('Dynamic info not found');
    }

    return info;
  }

  async deleteDynamicInfo(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid dynamic info ID format');
    }

    const result = await this.dynamicInfoModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Dynamic info not found');
    }
  }

  async searchDynamicInfo(query: DynamicInfoSearchDto): Promise<{
    data: DynamicInfo[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      entityType,
      entityId,
      infoType,
      isActive,
      search,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query;

    // Build filter
    const filter: any = {};

    if (entityType) filter.entityType = entityType;
    if (entityId && Types.ObjectId.isValid(entityId)) {
      filter.entityId = new Types.ObjectId(entityId);
    }
    if (infoType) filter.infoType = new RegExp(infoType, 'i');
    if (isActive !== undefined) filter.isActive = isActive;

    // Handle search across multiple fields
    if (search) {
      filter.$or = [
        { infoType: new RegExp(search, 'i') },
        { infoValue: new RegExp(search, 'i') },
        { entityType: new RegExp(search, 'i') }
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
      this.dynamicInfoModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .exec(),
      this.dynamicInfoModel.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      data,
      total,
      page: pageNum,
      totalPages
    };
  }

  async getInfoTypes(): Promise<InfoTypeDto[]> {
    // Define available info types with their descriptions
    const infoTypes: InfoTypeDto[] = [
      {
        type: 'privacy_policy',
        description: 'Privacy Policy Document',
        category: 'Legal'
      },
      {
        type: 'terms_conditions',
        description: 'Terms and Conditions',
        category: 'Legal'
      },
      {
        type: 'certifications',
        description: 'Professional Certifications',
        category: 'Credentials'
      },
      {
        type: 'awards',
        description: 'Awards and Recognition',
        category: 'Achievements'
      },
      {
        type: 'licenses',
        description: 'Professional Licenses',
        category: 'Credentials'
      },
      {
        type: 'insurance_info',
        description: 'Insurance Information',
        category: 'Business'
      },
      {
        type: 'emergency_procedures',
        description: 'Emergency Procedures',
        category: 'Safety'
      },
      {
        type: 'contact_hours',
        description: 'Contact Hours and Availability',
        category: 'Operations'
      },
      {
        type: 'specializations',
        description: 'Medical Specializations',
        category: 'Medical'
      },
      {
        type: 'equipment_list',
        description: 'Medical Equipment Inventory',
        category: 'Resources'
      }
    ];

    return infoTypes;
  }

  async createLegalDocuments(legalInfo: any, entityMappings: Array<{ type: string; id: string }>): Promise<void> {
    for (const mapping of entityMappings) {
      if (legalInfo.termsConditions) {
        await this.createDynamicInfo({
          entityType: mapping.type,
          entityId: mapping.id,
          infoType: 'terms_conditions',
          infoValue: legalInfo.termsConditions,
          isActive: true
        });
      }

      if (legalInfo.privacyPolicy) {
        await this.createDynamicInfo({
          entityType: mapping.type,
          entityId: mapping.id,
          infoType: 'privacy_policy',
          infoValue: legalInfo.privacyPolicy,
          isActive: true
        });
      }
    }
  }
}
