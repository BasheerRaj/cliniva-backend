import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserAccess } from '../database/schemas/user-access.schema';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class UserAccessService {
  constructor(
    @InjectModel('UserAccess') private readonly userAccessModel: Model<UserAccess>,
  ) {}

  async createUserAccess(userId: string, scopeType: string, scopeId: string, role: UserRole): Promise<UserAccess> {
    const userAccess = new this.userAccessModel({
      userId: new Types.ObjectId(userId),
      scopeType,
      scopeId: new Types.ObjectId(scopeId),
      role
    });

    return await userAccess.save();
  }

  async getUserAccess(userId: string): Promise<UserAccess[]> {
    return await this.userAccessModel.find({
      userId: new Types.ObjectId(userId)
    }).exec();
  }

  async setupUserAccessForOnboarding(userId: string, planType: string, entities: any): Promise<void> {
    const role = UserRole.OWNER; // Owner of the subscription

    switch (planType.toLowerCase()) {
      case 'company':
        // Grant access to organization and all created entities
        if (entities.organization) {
          await this.createUserAccess(userId, 'organization', entities.organization._id.toString(), role);
        }
        
        if (entities.complexes) {
          for (const complex of entities.complexes) {
            await this.createUserAccess(userId, 'complex', complex._id.toString(), role);
          }
        }

        if (entities.clinics) {
          for (const clinic of entities.clinics) {
            await this.createUserAccess(userId, 'clinic', clinic._id.toString(), role);
          }
        }
        break;

      case 'complex':
        if (entities.complexes) {
          for (const complex of entities.complexes) {
            await this.createUserAccess(userId, 'complex', complex._id.toString(), role);
          }
        }

        if (entities.clinics) {
          for (const clinic of entities.clinics) {
            await this.createUserAccess(userId, 'clinic', clinic._id.toString(), role);
          }
        }
        break;

      case 'clinic':
        if (entities.clinics) {
          for (const clinic of entities.clinics) {
            await this.createUserAccess(userId, 'clinic', clinic._id.toString(), role);
          }
        }
        break;
    }
  }

  async validateUserCanAccessEntity(userId: string, entityType: string, entityId: string): Promise<boolean> {
    const access = await this.userAccessModel.findOne({
      userId: new Types.ObjectId(userId),
      scopeType: entityType,
      scopeId: new Types.ObjectId(entityId)
    });

    return !!access;
  }
}
