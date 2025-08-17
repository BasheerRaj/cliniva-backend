import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DynamicInfo } from '../database/schemas/dynamic-info.schema';
import { CreateDynamicInfoDto, UpdateDynamicInfoDto } from './dto/create-dynamic-info.dto';

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
