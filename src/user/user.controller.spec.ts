import { ForbiddenException } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserRole } from '../common/enums/user-role.enum';

describe('UserController read-only staff access', () => {
  let userService: any;
  let userDropdownService: any;
  let authService: any;
  let controller: UserController;

  beforeEach(() => {
    userService = {
      getUsers: jest.fn(),
      getUserDetailById: jest.fn(),
    };
    userDropdownService = {
      getUsersForDropdown: jest.fn(),
    };
    authService = {};

    controller = new UserController(
      userService,
      userDropdownService,
      authService,
    );
  });

  it('allows staff to request doctor lists', async () => {
    userService.getUsers.mockResolvedValue({
      users: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    });

    await controller.getUsers(
      { role: UserRole.DOCTOR } as any,
      { user: { role: UserRole.STAFF, clinicId: 'clinic-1' } },
    );

    expect(userService.getUsers).toHaveBeenCalledWith(
      { role: UserRole.DOCTOR },
      { role: UserRole.STAFF, clinicId: 'clinic-1' },
    );
  });

  it('blocks staff from requesting unrestricted user lists', async () => {
    await expect(
      controller.getUsers(
        {} as any,
        { user: { role: UserRole.STAFF, clinicId: 'clinic-1' } },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forces dropdown lookups for staff into their clinic scope', async () => {
    userDropdownService.getUsersForDropdown.mockResolvedValue([]);

    await controller.getUsersForDropdown(
      UserRole.STAFF,
      undefined,
      'other-clinic',
      'other-clinic,another-clinic',
      undefined,
      {
        user: {
          role: UserRole.STAFF,
          subscriptionId: 'sub-1',
          clinicId: 'clinic-1',
          clinicIds: ['clinic-1', 'clinic-2'],
        },
      },
    );

    expect(userDropdownService.getUsersForDropdown).toHaveBeenCalledWith(
      {
        role: UserRole.STAFF,
        complexId: undefined,
        clinicId: 'clinic-1',
        clinicIds: ['clinic-1', 'clinic-2'],
        includeDeactivated: false,
      },
      expect.objectContaining({
        role: UserRole.STAFF,
        clinicId: 'clinic-1',
        clinicIds: ['clinic-1', 'clinic-2'],
      }),
    );
  });

  it('blocks staff from viewing admin details', async () => {
    userService.getUserDetailById.mockResolvedValue({
      _id: 'user-1',
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      clinicId: 'clinic-1',
    });

    await expect(
      controller.getUserById('user-1', {
        user: { role: UserRole.STAFF, clinicId: 'clinic-1' },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows staff to view doctor details from a shared clinic', async () => {
    userService.getUserDetailById.mockResolvedValue({
      _id: { toString: () => 'user-2' },
      email: 'doctor@example.com',
      firstName: 'Doctor',
      lastName: 'User',
      role: UserRole.DOCTOR,
      phone: null,
      nationality: null,
      gender: null,
      isActive: true,
      emailVerified: true,
      preferredLanguage: 'en',
      subscriptionId: null,
      organizationId: null,
      complexId: null,
      clinicId: { _id: { toString: () => 'clinic-1' }, name: 'Clinic 1', nameAr: 'Clinic 1' },
      clinicIds: [{ toString: () => 'clinic-1' }],
      lastLogin: null,
      workingHours: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await controller.getUserById('user-2', {
      user: { role: UserRole.STAFF, clinicId: 'clinic-1' },
    });

    expect(result.success).toBe(true);
    expect(result.data.role).toBe(UserRole.DOCTOR);
  });
});
