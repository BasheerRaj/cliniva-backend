import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UserService } from './user.service';
import { User } from '../database/schemas/user.schema';
import { Organization } from '../database/schemas/organization.schema';
import { Complex } from '../database/schemas/complex.schema';
import { Clinic } from '../database/schemas/clinic.schema';
import { Subscription } from '../database/schemas/subscription.schema';
import { SubscriptionPlan } from '../database/schemas/subscription-plan.schema';
import { SessionService } from '../auth/session.service';
import { EmailService } from '../auth/email.service';
import { AuditService } from '../auth/audit.service';
import { UserRole } from '../common/enums/user-role.enum';
import { Types } from 'mongoose';

describe('UserService - Session Invalidation Hooks', () => {
  let service: UserService;
  let mockUserModel: any;
  let mockSessionService: any;
  let mockEmailService: any;
  let mockAuditService: any;

  const mockUser = {
    _id: new Types.ObjectId(),
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.DOCTOR,
    preferredLanguage: 'en',
  };

  beforeEach(async () => {
    // Create mocks
    mockUserModel = {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      countDocuments: jest.fn(),
    };

    mockSessionService = {
      invalidateUserSessions: jest.fn().mockResolvedValue(undefined),
    };

    mockEmailService = {
      sendUsernameChangedNotification: jest.fn().mockResolvedValue(undefined),
      sendRoleChangedNotification: jest.fn().mockResolvedValue(undefined),
    };

    mockAuditService = {
      logSessionInvalidation: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(Organization.name),
          useValue: {},
        },
        {
          provide: getModelToken(Complex.name),
          useValue: {},
        },
        {
          provide: getModelToken(Clinic.name),
          useValue: {},
        },
        {
          provide: getModelToken(Subscription.name),
          useValue: {},
        },
        {
          provide: getModelToken(SubscriptionPlan.name),
          useValue: {},
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('updateUser', () => {
    it('should invalidate sessions when email is changed', async () => {
      // Arrange
      const userId = mockUser._id.toString();
      const newEmail = 'newemail@example.com';
      const adminId = new Types.ObjectId().toString();

      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      mockUserModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockUser,
          email: newEmail,
        }),
      });

      // Act
      await service.updateUser(
        userId,
        { email: newEmail },
        adminId,
      );

      // Assert - Requirement 3.1: Email change invalidates sessions
      expect(mockSessionService.invalidateUserSessions).toHaveBeenCalledWith(
        userId,
        'email_change',
        adminId,
      );

      // Assert - Requirement 3.8: Notification sent
      expect(mockEmailService.sendUsernameChangedNotification).toHaveBeenCalledWith(
        newEmail,
        mockUser.email,
        mockUser.firstName,
        'en',
      );

      // Assert - Requirement 3.8: Audit log created
      expect(mockAuditService.logSessionInvalidation).toHaveBeenCalledWith(
        userId,
        'email_change',
        0,
        adminId,
      );
    });

    it('should invalidate sessions when role is changed', async () => {
      // Arrange
      const userId = mockUser._id.toString();
      const newRole = UserRole.ADMIN;
      const adminId = new Types.ObjectId().toString();

      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      mockUserModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockUser,
          role: newRole,
        }),
      });

      // Act
      await service.updateUser(
        userId,
        { role: newRole },
        adminId,
      );

      // Assert - Requirement 3.2: Role change invalidates sessions
      expect(mockSessionService.invalidateUserSessions).toHaveBeenCalledWith(
        userId,
        'role_change',
        adminId,
      );

      // Assert - Requirement 3.8: Notification sent
      expect(mockEmailService.sendRoleChangedNotification).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.firstName,
        mockUser.role,
        newRole,
        'en',
      );

      // Assert - Requirement 3.8: Audit log created
      expect(mockAuditService.logSessionInvalidation).toHaveBeenCalledWith(
        userId,
        'role_change',
        0,
        adminId,
      );
    });

    it('should not invalidate sessions when other fields are changed', async () => {
      // Arrange
      const userId = mockUser._id.toString();
      const adminId = new Types.ObjectId().toString();

      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      mockUserModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockUser,
          firstName: 'Updated',
        }),
      });

      // Act
      await service.updateUser(
        userId,
        { firstName: 'Updated' },
        adminId,
      );

      // Assert - No session invalidation for non-critical fields
      expect(mockSessionService.invalidateUserSessions).not.toHaveBeenCalled();
      expect(mockEmailService.sendUsernameChangedNotification).not.toHaveBeenCalled();
      expect(mockEmailService.sendRoleChangedNotification).not.toHaveBeenCalled();
      expect(mockAuditService.logSessionInvalidation).not.toHaveBeenCalled();
    });

    it('should handle both email and role changes in single update', async () => {
      // Arrange
      const userId = mockUser._id.toString();
      const newEmail = 'newemail@example.com';
      const newRole = UserRole.ADMIN;
      const adminId = new Types.ObjectId().toString();

      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      mockUserModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockUser,
          email: newEmail,
          role: newRole,
        }),
      });

      // Act
      await service.updateUser(
        userId,
        { email: newEmail, role: newRole },
        adminId,
      );

      // Assert - Both invalidations should occur
      expect(mockSessionService.invalidateUserSessions).toHaveBeenCalledTimes(2);
      expect(mockSessionService.invalidateUserSessions).toHaveBeenCalledWith(
        userId,
        'email_change',
        adminId,
      );
      expect(mockSessionService.invalidateUserSessions).toHaveBeenCalledWith(
        userId,
        'role_change',
        adminId,
      );
    });
  });
});
