import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Organization } from '../../database/schemas/organization.schema';
import { Complex } from '../../database/schemas/complex.schema';
import { Clinic } from '../../database/schemas/clinic.schema';
import { User } from '../../database/schemas/user.schema';

export interface OwnershipContext {
  entityType: 'organization' | 'complex' | 'clinic';
  paramName?: string; // Parameter name to extract ID from (default: 'id')
  allowParentOwnership?: boolean; // Allow if user owns parent entity
}

// Decorator to set ownership requirements
export const RequireOwnership = (context: OwnershipContext) =>
  SetMetadata('ownership', context);

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectModel('Organization')
    private readonly organizationModel: Model<Organization>,
    @InjectModel('Complex') private readonly complexModel: Model<Complex>,
    @InjectModel('Clinic') private readonly clinicModel: Model<Clinic>,
    @InjectModel('User') private readonly userModel: Model<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ownershipContext = this.reflector.get<OwnershipContext>(
      'ownership',
      context.getHandler(),
    );

    if (!ownershipContext) {
      return true; // No ownership requirement set
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      throw new ForbiddenException('Authentication required');
    }

    const paramName = ownershipContext.paramName || 'id';
    const entityId = request.params[paramName];

    if (!entityId) {
      throw new BadRequestException(`Missing required parameter: ${paramName}`);
    }

    if (!Types.ObjectId.isValid(entityId)) {
      throw new BadRequestException(
        `Invalid ${ownershipContext.entityType} ID format`,
      );
    }

    try {
      const hasOwnership = await this.verifyOwnership(
        user.userId,
        ownershipContext.entityType,
        entityId,
        ownershipContext.allowParentOwnership || false,
      );

      if (!hasOwnership) {
        throw new ForbiddenException(
          `You don't have permission to access this ${ownershipContext.entityType}`,
        );
      }

      // Add entity context to request for potential use in controller
      request.ownershipContext = {
        entityType: ownershipContext.entityType,
        entityId,
        verified: true,
      };

      return true;
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new ForbiddenException('Ownership verification failed');
    }
  }

  private async verifyOwnership(
    userId: string,
    entityType: 'organization' | 'complex' | 'clinic',
    entityId: string,
    allowParentOwnership: boolean,
  ): Promise<boolean> {
    switch (entityType) {
      case 'organization':
        return this.verifyOrganizationOwnership(userId, entityId);

      case 'complex':
        return this.verifyComplexOwnership(
          userId,
          entityId,
          allowParentOwnership,
        );

      case 'clinic':
        return this.verifyClinicOwnership(
          userId,
          entityId,
          allowParentOwnership,
        );

      default:
        return false;
    }
  }

  private async verifyOrganizationOwnership(
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    const organization = await this.organizationModel
      .findOne({
        _id: new Types.ObjectId(organizationId),
        ownerId: new Types.ObjectId(userId),
      })
      .exec();

    return !!organization;
  }

  private async verifyComplexOwnership(
    userId: string,
    complexId: string,
    allowParentOwnership: boolean,
  ): Promise<boolean> {
    const complex = await this.complexModel
      .findById(complexId)
      .populate('organizationId')
      .exec();

    if (!complex) {
      return false;
    }

    // Complex ownership is determined by organization ownership
    if (allowParentOwnership && complex.organizationId) {
      return this.verifyOrganizationOwnership(
        userId,
        (complex.organizationId as any)._id.toString(),
      );
    }

    // If no parent ownership allowed, check subscription ownership as fallback
    if (!allowParentOwnership) {
      // Check if user's subscription matches complex subscription
      const user = await this.userModel.findById(userId).exec();
      if (user && user.subscriptionId && complex.subscriptionId) {
        return (
          user.subscriptionId.toString() === complex.subscriptionId.toString()
        );
      }
    }

    return false;
  }

  private async verifyClinicOwnership(
    userId: string,
    clinicId: string,
    allowParentOwnership: boolean,
  ): Promise<boolean> {
    const clinic = await this.clinicModel
      .findById(clinicId)
      .populate('complexId')
      .exec();

    if (!clinic) {
      return false;
    }

    // Check parent ownership if allowed
    if (allowParentOwnership) {
      // Check if user owns the parent complex
      if (clinic.complexId) {
        const hasComplexOwnership = await this.verifyComplexOwnership(
          userId,
          (clinic.complexId as any)._id.toString(),
          true,
        );
        if (hasComplexOwnership) {
          return true;
        }
      }
    }

    // Check subscription ownership as fallback
    const user = await this.userModel.findById(userId).exec();
    if (user && user.subscriptionId && clinic.subscriptionId) {
      return (
        user.subscriptionId.toString() === clinic.subscriptionId.toString()
      );
    }

    return false;
  }

  // Helper method to verify ownership for any entity type
  async verifyUserCanAccessEntity(
    userId: string,
    entityType: 'organization' | 'complex' | 'clinic',
    entityId: string,
    allowParentOwnership = true,
  ): Promise<boolean> {
    return this.verifyOwnership(
      userId,
      entityType,
      entityId,
      allowParentOwnership,
    );
  }

  // Helper method to get all entities owned by user
  async getUserOwnedEntities(userId: string) {
    // Get organizations owned by user
    const organizations = await this.organizationModel
      .find({ ownerId: new Types.ObjectId(userId) })
      .exec();

    // Get complexes owned through organization ownership
    const allComplexes = await this.complexModel
      .find()
      .populate('organizationId')
      .exec();
    const complexes = allComplexes.filter(
      (complex) =>
        complex.organizationId &&
        (complex.organizationId as any).ownerId?.toString() === userId,
    );

    // Get clinics owned through complex/organization ownership or subscription
    const allClinics = await this.clinicModel.find().exec();
    const clinics: any[] = [];

    for (const clinic of allClinics) {
      if (
        await this.verifyClinicOwnership(
          userId,
          (clinic._id as any).toString(),
          true,
        )
      ) {
        clinics.push(clinic);
      }
    }

    return {
      organizations: organizations.map((org) => ({
        id: (org._id as any).toString(),
        name: org.name,
      })),
      complexes: complexes.map((complex) => ({
        id: (complex._id as any).toString(),
        name: complex.name,
      })),
      clinics: clinics.map((clinic) => ({
        id: clinic._id.toString(),
        name: clinic.name,
      })),
    };
  }
}
