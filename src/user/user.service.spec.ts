import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from '../database/schemas/user.schema';
import { Organization } from '../database/schemas/organization.schema';
import { Complex } from '../database/schemas/complex.schema';
import { Clinic } from '../database/schemas/clinic.schema';
import { Subscription } from '../database/schemas/subscription.schema';
import { SubscriptionPlan } from '../database/schemas/subscription-plan.schema';
import { Appointment } from '../database/schemas/appointment.schema';
import { SessionService } from '../auth/session.service';
import { EmailService } from '../auth/email.service';
import { AuditService } from '../auth/audit.service';
import { UserRole } from '../common/enums/user-role.enum';
import { Types } from 'mongoose';

describe('UserService - Session Invalidation Hooks', () => {
  let service: UserService;
  let mockUserModel: any;
  let mockAppointmentModel: any;
  let mockConnection: any;
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
    isActive: true,
    save: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    // Create mocks
    mockUserModel = {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      countDocuments: jest.fn(),
    };

    mockAppointmentModel = {
      find: jest.fn(),
      updateMany: jest.fn(),
    };

    const mockSession = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      abortTransaction: jest.fn().mockResolvedValue(undefined),
      endSession: jest.fn(),
    };

    mockConnection = {
      startSession: jest.fn().mockResolvedValue(mockSession),
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
          provide: getModelToken(Appointment.name),
          useValue: mockAppointmentModel,
        },
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
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

  describe('getUsersForDropdown', () => {
    it('should return only active users', async () => {
      // Arrange
      const activeUsers = [
        {
          _id: new Types.ObjectId(),
          firstName: 'Active',
          lastName: 'User1',
          email: 'active1@example.com',
          role: UserRole.DOCTOR,
          isActive: true,
        },
        {
          _id: new Types.ObjectId(),
          firstName: 'Active',
          lastName: 'User2',
          email: 'active2@example.com',
          role: UserRole.ADMIN,
          isActive: true,
        },
      ];

      mockUserModel.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(activeUsers),
      });

      // Act
      const result = await service.getUsersForDropdown();

      // Assert - Requirement 3.2 (BZR-q4f3e1b8): Only active users returned
      expect(mockUserModel.find).toHaveBeenCalledWith({ isActive: true });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(activeUsers);
      expect(result.data).toHaveLength(2);
    });

    it('should filter users by role', async () => {
      // Arrange
      const doctors = [
        {
          _id: new Types.ObjectId(),
          firstName: 'Doctor',
          lastName: 'One',
          email: 'doctor1@example.com',
          role: UserRole.DOCTOR,
          isActive: true,
        },
      ];

      mockUserModel.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(doctors),
      });

      // Act
      const result = await service.getUsersForDropdown({ role: UserRole.DOCTOR });

      // Assert
      expect(mockUserModel.find).toHaveBeenCalledWith({
        isActive: true,
        role: UserRole.DOCTOR,
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(doctors);
    });

    it('should filter users by complexId', async () => {
      // Arrange
      const complexId = new Types.ObjectId().toString();
      const complexUsers = [
        {
          _id: new Types.ObjectId(),
          firstName: 'Complex',
          lastName: 'User',
          email: 'complex@example.com',
          role: UserRole.DOCTOR,
          complexId: new Types.ObjectId(complexId),
          isActive: true,
        },
      ];

      mockUserModel.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(complexUsers),
      });

      // Act
      const result = await service.getUsersForDropdown({ complexId });

      // Assert
      expect(mockUserModel.find).toHaveBeenCalledWith({
        isActive: true,
        complexId: new Types.ObjectId(complexId),
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(complexUsers);
    });

    it('should filter users by clinicId', async () => {
      // Arrange
      const clinicId = new Types.ObjectId().toString();
      const clinicUsers = [
        {
          _id: new Types.ObjectId(),
          firstName: 'Clinic',
          lastName: 'User',
          email: 'clinic@example.com',
          role: UserRole.DOCTOR,
          clinicId: new Types.ObjectId(clinicId),
          isActive: true,
        },
      ];

      mockUserModel.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(clinicUsers),
      });

      // Act
      const result = await service.getUsersForDropdown({ clinicId });

      // Assert
      expect(mockUserModel.find).toHaveBeenCalledWith({
        isActive: true,
        clinicId: new Types.ObjectId(clinicId),
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(clinicUsers);
    });

    it('should apply multiple filters simultaneously', async () => {
      // Arrange
      const complexId = new Types.ObjectId().toString();
      const filteredUsers = [
        {
          _id: new Types.ObjectId(),
          firstName: 'Filtered',
          lastName: 'Doctor',
          email: 'filtered@example.com',
          role: UserRole.DOCTOR,
          complexId: new Types.ObjectId(complexId),
          isActive: true,
        },
      ];

      mockUserModel.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(filteredUsers),
      });

      // Act
      const result = await service.getUsersForDropdown({
        role: UserRole.DOCTOR,
        complexId,
      });

      // Assert
      expect(mockUserModel.find).toHaveBeenCalledWith({
        isActive: true,
        role: UserRole.DOCTOR,
        complexId: new Types.ObjectId(complexId),
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(filteredUsers);
    });

    it('should sort users by firstName and lastName', async () => {
      // Arrange
      const users = [
        {
          _id: new Types.ObjectId(),
          firstName: 'Alice',
          lastName: 'Smith',
          email: 'alice@example.com',
          role: UserRole.DOCTOR,
          isActive: true,
        },
        {
          _id: new Types.ObjectId(),
          firstName: 'Bob',
          lastName: 'Jones',
          email: 'bob@example.com',
          role: UserRole.DOCTOR,
          isActive: true,
        },
      ];

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(users),
      };

      mockUserModel.find = jest.fn().mockReturnValue(mockChain);

      // Act
      await service.getUsersForDropdown();

      // Assert - Verify sort is called with correct parameters
      expect(mockChain.sort).toHaveBeenCalledWith({ firstName: 1, lastName: 1 });
    });

    it('should return empty array when no active users match filters', async () => {
      // Arrange
      mockUserModel.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      // Act
      const result = await service.getUsersForDropdown({ role: 'NON_EXISTENT_ROLE' });

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('updateUserStatus', () => {
    it('should successfully update user status to active', async () => {
      // Arrange
      const userId = mockUser._id.toString();
      const currentUserId = new Types.ObjectId().toString();
      const ipAddress = '127.0.0.1';
      const userAgent = 'test-agent';

      const userToUpdate = {
        ...mockUser,
        isActive: false,
        save: jest.fn().mockResolvedValue(true),
      };

      mockUserModel.findById = jest.fn().mockResolvedValue(userToUpdate);

      // Act
      const result = await service.updateUserStatus(
        userId,
        { isActive: true },
        currentUserId,
        ipAddress,
        userAgent,
      );

      // Assert
      expect(userToUpdate.isActive).toBe(true);
      expect(userToUpdate.save).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockSessionService.invalidateUserSessions).not.toHaveBeenCalled();
      expect(mockAuditService.logSessionInvalidation).toHaveBeenCalledWith(
        userId,
        'user_activated',
        0,
        currentUserId,
      );
    });

    it('should successfully deactivate user and invalidate sessions', async () => {
      // Arrange
      const userId = mockUser._id.toString();
      const currentUserId = new Types.ObjectId().toString();
      const ipAddress = '127.0.0.1';
      const userAgent = 'test-agent';

      const userToUpdate = {
        ...mockUser,
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };

      mockUserModel.findById = jest.fn().mockResolvedValue(userToUpdate);

      // Act
      const result = await service.updateUserStatus(
        userId,
        { isActive: false },
        currentUserId,
        ipAddress,
        userAgent,
      );

      // Assert
      expect(userToUpdate.isActive).toBe(false);
      expect(userToUpdate.save).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(mockSessionService.invalidateUserSessions).toHaveBeenCalledWith(
        userId,
        'user_deactivated',
        currentUserId,
      );
      expect(mockAuditService.logSessionInvalidation).toHaveBeenCalledWith(
        userId,
        'user_deactivated',
        0,
        currentUserId,
      );
    });

    it('should throw ForbiddenException when trying to deactivate own account', async () => {
      // Arrange
      const userId = mockUser._id.toString();
      const currentUserId = userId; // Same user
      const ipAddress = '127.0.0.1';
      const userAgent = 'test-agent';

      // Act & Assert
      await expect(
        service.updateUserStatus(
          userId,
          { isActive: false },
          currentUserId,
          ipAddress,
          userAgent,
        ),
      ).rejects.toThrow(ForbiddenException);

      // Verify no side effects occurred
      expect(mockUserModel.findById).not.toHaveBeenCalled();
      expect(mockSessionService.invalidateUserSessions).not.toHaveBeenCalled();
    });

    it('should allow activating own account', async () => {
      // Arrange
      const userId = mockUser._id.toString();
      const currentUserId = userId; // Same user
      const ipAddress = '127.0.0.1';
      const userAgent = 'test-agent';

      const userToUpdate = {
        ...mockUser,
        isActive: false,
        save: jest.fn().mockResolvedValue(true),
      };

      mockUserModel.findById = jest.fn().mockResolvedValue(userToUpdate);

      // Act
      const result = await service.updateUserStatus(
        userId,
        { isActive: true },
        currentUserId,
        ipAddress,
        userAgent,
      );

      // Assert - Should succeed (no self-modification check for activation)
      expect(result.success).toBe(true);
      expect(userToUpdate.isActive).toBe(true);
    });
  });

  describe('deactivateDoctorWithTransfer', () => {
    it('should successfully transfer appointments to target doctor', async () => {
      // Arrange
      const doctorId = mockUser._id.toString();
      const targetDoctorId = new Types.ObjectId().toString();
      const currentUserId = new Types.ObjectId().toString();
      const ipAddress = '127.0.0.1';
      const userAgent = 'test-agent';

      const doctorToDeactivate = {
        ...mockUser,
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };

      const targetDoctor = {
        _id: new Types.ObjectId(targetDoctorId),
        email: 'target@example.com',
        firstName: 'Target',
        lastName: 'Doctor',
        role: UserRole.DOCTOR,
        isActive: true,
      };

      const activeAppointments = [
        { _id: new Types.ObjectId(), doctorId: new Types.ObjectId(doctorId), status: 'scheduled' },
        { _id: new Types.ObjectId(), doctorId: new Types.ObjectId(doctorId), status: 'confirmed' },
      ];

      mockUserModel.findById = jest
        .fn()
        .mockResolvedValueOnce(doctorToDeactivate)
        .mockResolvedValueOnce(targetDoctor);

      mockAppointmentModel.find = jest.fn().mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(activeAppointments),
      });

      mockAppointmentModel.updateMany = jest.fn().mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ modifiedCount: 2 }),
      });

      // Act
      const result = await service.deactivateDoctorWithTransfer(
        doctorId,
        {
          transferAppointments: true,
          targetDoctorId,
          skipTransfer: false,
        },
        currentUserId,
        ipAddress,
        userAgent,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.appointmentsTransferred).toBe(2);
      expect(result.data.appointmentsRescheduled).toBe(0);
      expect(result.data.targetDoctorId).toBe(targetDoctorId);
      expect(doctorToDeactivate.isActive).toBe(false);
      expect(mockSessionService.invalidateUserSessions).toHaveBeenCalledWith(
        doctorId,
        'user_deactivated',
        currentUserId,
      );
    });

    it('should mark appointments for rescheduling when skipTransfer is true', async () => {
      // Arrange
      const doctorId = mockUser._id.toString();
      const currentUserId = new Types.ObjectId().toString();
      const ipAddress = '127.0.0.1';
      const userAgent = 'test-agent';

      const doctorToDeactivate = {
        ...mockUser,
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };

      const activeAppointments = [
        { _id: new Types.ObjectId(), doctorId: new Types.ObjectId(doctorId), status: 'scheduled' },
      ];

      mockUserModel.findById = jest.fn().mockResolvedValue(doctorToDeactivate);

      mockAppointmentModel.find = jest.fn().mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(activeAppointments),
      });

      mockAppointmentModel.updateMany = jest.fn().mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      });

      // Act
      const result = await service.deactivateDoctorWithTransfer(
        doctorId,
        {
          transferAppointments: false,
          skipTransfer: true,
        },
        currentUserId,
        ipAddress,
        userAgent,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.appointmentsTransferred).toBe(0);
      expect(result.data.appointmentsRescheduled).toBe(1);
      expect(doctorToDeactivate.isActive).toBe(false);
    });

    it('should throw error when doctor has appointments and no transfer option provided', async () => {
      // Arrange
      const doctorId = mockUser._id.toString();
      const currentUserId = new Types.ObjectId().toString();
      const ipAddress = '127.0.0.1';
      const userAgent = 'test-agent';

      const doctorToDeactivate = {
        ...mockUser,
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };

      const activeAppointments = [
        { _id: new Types.ObjectId(), doctorId: new Types.ObjectId(doctorId), status: 'scheduled' },
      ];

      mockUserModel.findById = jest.fn().mockResolvedValue(doctorToDeactivate);

      mockAppointmentModel.find = jest.fn().mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(activeAppointments),
      });

      // Act & Assert
      await expect(
        service.deactivateDoctorWithTransfer(
          doctorId,
          {
            transferAppointments: false,
            skipTransfer: false,
          },
          currentUserId,
          ipAddress,
          userAgent,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when trying to deactivate own account', async () => {
      // Arrange
      const doctorId = mockUser._id.toString();
      const currentUserId = doctorId; // Same user
      const ipAddress = '127.0.0.1';
      const userAgent = 'test-agent';

      // Act & Assert
      await expect(
        service.deactivateDoctorWithTransfer(
          doctorId,
          {
            transferAppointments: false,
            skipTransfer: true,
          },
          currentUserId,
          ipAddress,
          userAgent,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should rollback transaction on failure', async () => {
      // Arrange
      const doctorId = mockUser._id.toString();
      const targetDoctorId = new Types.ObjectId().toString();
      const currentUserId = new Types.ObjectId().toString();
      const ipAddress = '127.0.0.1';
      const userAgent = 'test-agent';

      const doctorToDeactivate = {
        ...mockUser,
        isActive: true,
        save: jest.fn().mockRejectedValue(new Error('Database error')),
      };

      const targetDoctor = {
        _id: new Types.ObjectId(targetDoctorId),
        email: 'target@example.com',
        firstName: 'Target',
        lastName: 'Doctor',
        role: UserRole.DOCTOR,
        isActive: true,
      };

      const activeAppointments = [
        { _id: new Types.ObjectId(), doctorId: new Types.ObjectId(doctorId), status: 'scheduled' },
      ];

      mockUserModel.findById = jest
        .fn()
        .mockResolvedValueOnce(doctorToDeactivate)
        .mockResolvedValueOnce(targetDoctor);

      mockAppointmentModel.find = jest.fn().mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(activeAppointments),
      });

      mockAppointmentModel.updateMany = jest.fn().mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      });

      // Get the mock session from connection
      const mockSession = await mockConnection.startSession();

      // Act & Assert
      await expect(
        service.deactivateDoctorWithTransfer(
          doctorId,
          {
            transferAppointments: true,
            targetDoctorId,
            skipTransfer: false,
          },
          currentUserId,
          ipAddress,
          userAgent,
        ),
      ).rejects.toThrow('Database error');

      // Verify transaction was aborted
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should successfully deactivate doctor with no appointments', async () => {
      // Arrange
      const doctorId = mockUser._id.toString();
      const currentUserId = new Types.ObjectId().toString();
      const ipAddress = '127.0.0.1';
      const userAgent = 'test-agent';

      const doctorToDeactivate = {
        ...mockUser,
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };

      mockUserModel.findById = jest.fn().mockResolvedValue(doctorToDeactivate);

      mockAppointmentModel.find = jest.fn().mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]), // No appointments
      });

      // Act
      const result = await service.deactivateDoctorWithTransfer(
        doctorId,
        {
          transferAppointments: false,
          skipTransfer: false,
        },
        currentUserId,
        ipAddress,
        userAgent,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.appointmentsTransferred).toBe(0);
      expect(result.data.appointmentsRescheduled).toBe(0);
      expect(doctorToDeactivate.isActive).toBe(false);
    });
  });
});
