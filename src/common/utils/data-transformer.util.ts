import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';

export interface OnboardingData {
  user: any;
  subscription: any;
  organization?: any;
  complexes?: any[];
  departments?: any[];
  clinics?: any[];
  services?: any[];
  workingHours?: any[];
  contacts?: any[];
  dynamicInfo?: any[];
}

export interface EntityCreationData {
  type: string;
  data: any;
  dependencies: string[];
  order: number;
}

export interface ContactInput {
  entityType?: string;
  entityId?: string;
  contactType: string;
  contactValue: string;
  isActive?: boolean;
}

export interface Contact {
  entityType: string;
  entityId: Types.ObjectId;
  contactType: string;
  contactValue: string;
  isActive: boolean;
}

export interface WorkingHoursInput {
  entityType?: string;
  entityId?: string;
  dayOfWeek: string;
  isWorkingDay: boolean;
  openingTime?: string;
  closingTime?: string;
  breakStartTime?: string;
  breakEndTime?: string;
}

export interface WorkingHours {
  entityType: string;
  entityId: Types.ObjectId;
  dayOfWeek: string;
  isWorkingDay: boolean;
  openingTime?: string;
  closingTime?: string;
  breakStartTime?: string;
  breakEndTime?: string;
  isActive: boolean;
}

export interface LegalInfo {
  vatNumber?: string;
  crNumber?: string;
  termsConditions?: string;
  privacyPolicy?: string;
  googleLocation?: string;
}

export interface IdMappings {
  [key: string]: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface AddressInput {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

@Injectable()
export class DataTransformerUtil {
  static transformOnboardingDataToEntities(data: OnboardingData): EntityCreationData[] {
    const entities: EntityCreationData[] = [];
    let order = 1;

    // Subscription (always first)
    if (data.subscription) {
      entities.push({
        type: 'subscription',
        data: data.subscription,
        dependencies: [],
        order: order++
      });
    }

    // Organization (for company plan)
    if (data.organization) {
      entities.push({
        type: 'organization',
        data: data.organization,
        dependencies: ['subscription'],
        order: order++
      });
    }

    // Complexes
    if (data.complexes && data.complexes.length > 0) {
      data.complexes.forEach(complex => {
        entities.push({
          type: 'complex',
          data: complex,
          dependencies: data.organization ? ['subscription', 'organization'] : ['subscription'],
          order: order++
        });
      });
    }

    // Departments
    if (data.departments && data.departments.length > 0) {
      data.departments.forEach(department => {
        entities.push({
          type: 'department',
          data: department,
          dependencies: [],
          order: order++
        });
      });
    }

    // Complex-Department relationships
    if (data.complexes && data.departments) {
      data.complexes.forEach(complex => {
        if (complex.departmentIds && complex.departmentIds.length > 0) {
          complex.departmentIds.forEach(departmentId => {
            entities.push({
              type: 'complexDepartment',
              data: { complexId: complex.id, departmentId },
              dependencies: ['complex', 'department'],
              order: order++
            });
          });
        }
      });
    }

    // Clinics
    if (data.clinics && data.clinics.length > 0) {
      data.clinics.forEach(clinic => {
        entities.push({
          type: 'clinic',
          data: clinic,
          dependencies: clinic.complexDepartmentId ? ['complexDepartment'] : ['subscription'],
          order: order++
        });
      });
    }

    // Services
    if (data.services && data.services.length > 0) {
      data.services.forEach(service => {
        entities.push({
          type: 'service',
          data: service,
          dependencies: ['complexDepartment'],
          order: order++
        });
      });
    }

    // Supporting entities (working hours, contacts, dynamic info)
    this.addSupportingEntities(entities, data, order);

    return entities.sort((a, b) => a.order - b.order);
  }

  private static addSupportingEntities(entities: EntityCreationData[], data: OnboardingData, startOrder: number): void {
    let order = startOrder;

    // Working hours
    if (data.workingHours && data.workingHours.length > 0) {
      data.workingHours.forEach(workingHour => {
        entities.push({
          type: 'workingHours',
          data: workingHour,
          dependencies: ['entity'],
          order: order++
        });
      });
    }

    // Contacts
    if (data.contacts && data.contacts.length > 0) {
      data.contacts.forEach(contact => {
        entities.push({
          type: 'contact',
          data: contact,
          dependencies: ['entity'],
          order: order++
        });
      });
    }

    // Dynamic info
    if (data.dynamicInfo && data.dynamicInfo.length > 0) {
      data.dynamicInfo.forEach(info => {
        entities.push({
          type: 'dynamicInfo',
          data: info,
          dependencies: ['entity'],
          order: order++
        });
      });
    }
  }

  static normalizeContactData(contacts: ContactInput[], entityType: string, entityId: string): Contact[] {
    return contacts.map(contact => ({
      entityType: contact.entityType || entityType,
      entityId: new Types.ObjectId(contact.entityId || entityId),
      contactType: contact.contactType.toLowerCase(),
      contactValue: this.normalizeContactValue(contact.contactType, contact.contactValue),
      isActive: contact.isActive !== false
    }));
  }

  private static normalizeContactValue(contactType: string, value: string): string {
    switch (contactType.toLowerCase()) {
      case 'email':
        return value.toLowerCase().trim();
      case 'phone':
      case 'whatsapp':
        return value.replace(/[\s\-\(\)]/g, '');
      case 'facebook':
      case 'instagram':
      case 'twitter':
      case 'linkedin':
        return value.toLowerCase().trim();
      default:
        return value.trim();
    }
  }

  static normalizeWorkingHoursData(schedule: WorkingHoursInput[], entityType: string, entityId: string): WorkingHours[] {
    return schedule.map(hours => ({
      entityType: hours.entityType || entityType,
      entityId: new Types.ObjectId(hours.entityId || entityId),
      dayOfWeek: hours.dayOfWeek.toLowerCase(),
      isWorkingDay: hours.isWorkingDay,
      openingTime: hours.openingTime,
      closingTime: hours.closingTime,
      breakStartTime: hours.breakStartTime,
      breakEndTime: hours.breakEndTime,
      isActive: true
    }));
  }

  static extractLegalInfoFromEntity(entityData: any): LegalInfo {
    return {
      vatNumber: entityData.vatNumber,
      crNumber: entityData.crNumber,
      termsConditions: entityData.termsConditions,
      privacyPolicy: entityData.privacyPolicy,
      googleLocation: entityData.googleLocation
    };
  }

  static generateEntityIds(entityStructure: any): IdMappings {
    const idMappings: IdMappings = {};

    // Generate IDs for each entity type
    const entityTypes = ['organization', 'complex', 'department', 'clinic', 'service'];
    
    entityTypes.forEach(type => {
      if (entityStructure[type]) {
        if (Array.isArray(entityStructure[type])) {
          entityStructure[type].forEach((entity: any, index: number) => {
            const id = new Types.ObjectId().toString();
            idMappings[`${type}_${index}`] = id;
            entity.id = id;
          });
        } else {
          const id = new Types.ObjectId().toString();
          idMappings[type] = id;
          entityStructure[type].id = id;
        }
      }
    });

    return idMappings;
  }

  static extractLocationCoordinates(googleLocation: string): Coordinates | null {
    // Extract coordinates from Google Maps location string
    const coordinateRegex = /(-?\d+\.?\d*),(-?\d+\.?\d*)/;
    const match = googleLocation.match(coordinateRegex);
    
    if (match) {
      return {
        latitude: parseFloat(match[1]),
        longitude: parseFloat(match[2])
      };
    }
    
    return null;
  }

  static normalizeAddress(address: AddressInput): string {
    const parts = [
      address.addressLine1,
      address.addressLine2,
      address.city,
      address.state,
      address.postalCode,
      address.country
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  static transformEntityForDatabase(entityType: string, entityData: any, idMappings: IdMappings): any {
    const transformed = { ...entityData };

    // Transform reference fields to ObjectIds
    const referenceFields = this.getReferenceFieldsForEntity(entityType);
    referenceFields.forEach(field => {
      if (transformed[field]) {
        // If it's a string ID, convert to ObjectId
        if (typeof transformed[field] === 'string') {
          transformed[field] = new Types.ObjectId(transformed[field]);
        }
        // If it's a mapped ID, use the mapping
        else if (idMappings[transformed[field]]) {
          transformed[field] = new Types.ObjectId(idMappings[transformed[field]]);
        }
      }
    });

    // Set timestamps
    transformed.createdAt = new Date();
    transformed.updatedAt = new Date();

    return transformed;
  }

  private static getReferenceFieldsForEntity(entityType: string): string[] {
    const referenceFields: Record<string, string[]> = {
      organization: ['subscriptionId'],
      complex: ['organizationId', 'subscriptionId'],
      clinic: ['complexDepartmentId', 'subscriptionId'],
      complexDepartment: ['complexId', 'departmentId'],
      service: ['complexDepartmentId'],
      clinicService: ['clinicId', 'serviceId'],
      workingHours: ['entityId'],
      contact: ['entityId'],
      dynamicInfo: ['entityId'],
      userAccess: ['userId']
    };

    return referenceFields[entityType] || [];
  }

  static createDynamicInfoEntries(entityType: string, entityId: string, legalInfo: LegalInfo): any[] {
    const entries: any[] = [];

    if (legalInfo.termsConditions) {
      entries.push({
        entityType,
        entityId: new Types.ObjectId(entityId),
        infoType: 'terms_conditions',
        infoValue: legalInfo.termsConditions,
        isActive: true
      });
    }

    if (legalInfo.privacyPolicy) {
      entries.push({
        entityType,
        entityId: new Types.ObjectId(entityId),
        infoType: 'privacy_policy',
        infoValue: legalInfo.privacyPolicy,
        isActive: true
      });
    }

    return entries;
  }
}
