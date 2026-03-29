import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { buildTenantFilter, assertSameTenant } from './tenant-scope.util';

describe('buildTenantFilter', () => {
  it('returns empty filter for super_admin', () => {
    const filter = buildTenantFilter({ role: 'super_admin', subscriptionId: 'abc' });
    expect(filter).toEqual({});
  });

  it('returns subscriptionId filter for non-super_admin', () => {
    const subId = new Types.ObjectId().toString();
    const filter = buildTenantFilter({ role: 'admin', subscriptionId: subId });
    expect(filter).toEqual({ subscriptionId: new Types.ObjectId(subId) });
  });

  it('returns empty filter when user has no subscriptionId', () => {
    const filter = buildTenantFilter({ role: 'admin' });
    expect(filter).toEqual({});
  });
});

describe('assertSameTenant', () => {
  it('does not throw for super_admin regardless of entity subscription', () => {
    expect(() =>
      assertSameTenant('other-sub-id', { role: 'super_admin', subscriptionId: 'my-sub' }),
    ).not.toThrow();
  });

  it('does not throw when entity subscription matches user subscription', () => {
    const subId = new Types.ObjectId().toString();
    expect(() =>
      assertSameTenant(subId, { role: 'admin', subscriptionId: subId }),
    ).not.toThrow();
  });

  it('throws ForbiddenException when subscriptions do not match', () => {
    expect(() =>
      assertSameTenant('other-id', { role: 'admin', subscriptionId: 'my-id' }),
    ).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when user has no subscriptionId', () => {
    expect(() =>
      assertSameTenant('some-id', { role: 'admin' }),
    ).toThrow(ForbiddenException);
  });
});
