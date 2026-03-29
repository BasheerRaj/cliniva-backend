// src/common/utils/tenant-scope.util.ts
import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';

export interface TenantUser {
  role: string;
  subscriptionId?: string;
  organizationId?: string;
  complexId?: string;
  clinicId?: string;
}

/**
 * Returns a MongoDB filter that restricts results to the requesting user's
 * subscription. Returns {} for super_admin (no restriction).
 */
export function buildTenantFilter(user: TenantUser): Record<string, any> {
  if (!user || user.role === 'super_admin') return {};
  if (!user.subscriptionId) return {};
  return { subscriptionId: new Types.ObjectId(user.subscriptionId) };
}

/**
 * Throws ForbiddenException if the entity's subscriptionId does not match
 * the requesting user's subscriptionId. No-ops for super_admin.
 */
export function assertSameTenant(
  entitySubscriptionId: string | Types.ObjectId | undefined | null,
  user: TenantUser,
  errorMessage = { ar: 'غير مصرح بالوصول', en: 'Access denied: resource belongs to another tenant' },
): void {
  if (user.role === 'super_admin') return;
  if (!user.subscriptionId) {
    throw new ForbiddenException({ message: errorMessage });
  }
  if (entitySubscriptionId?.toString() !== user.subscriptionId) {
    throw new ForbiddenException({ message: errorMessage });
  }
}
