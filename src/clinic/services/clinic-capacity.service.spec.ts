import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ClinicCapacityService } from './clinic-capacity.service';
import { Clinic } from '../../database/schemas/clinic.schema';
import { User } from '../../database/schemas/user.schema';
import { Appointment } from '../../database/schemas/appointment.schema';

describe('ClinicCapacityService', () => {
  let service: ClinicCapacityService;
  let mockClinicModel: any;
  let mockUserModel: any;
  let mockAppointmentModel: any;

  const mockClinicId = new Types.ObjectId().toString();
  const mockClinic = {
    _id: new Types.ObjectId(mockClinicId),
    name: 'Test Clinic',
    maxDoctors: 10,
    maxStaff: 20,
    maxPatients: 100,
  };

  beforeEach(async () => {
    // Create mocks
    mockClinicModel = {
      findById: jest.fn(),
      aggregate: jest.fn(),
    };

    mockUserModel = {
      find: jest.fn(),
    };

    mockAppointmentModel = {
      aggregate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicCapacityService,
        {
          provide: getModelToken('Clinic'),
          useValue: mockClinicModel,
        },
        {
          provide: getModelToken('User'),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken('Appointment'),
          useValue: mockAppointmentModel,
        },
      ],
    }).compile();

    service = module.get<ClinicCapacityService>(ClinicCapacityService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    service.clearCache();
  });

  describe('getCapacityStatus', () => {
    it('should return capacity status for a valid clinic', async () => {
      // Arrange
      const mockDoctors = [
        {
          _id: new Types.ObjectId(),
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          role: 'doctor',
        },
        {
          _id: new Types.ObjectId(),
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          role: 'doctor',
        },
      ];

      const mockStaff = [
        {
          _id: new Types.ObjectId(),
          firstName: 'Alice',
          lastName: 'Johnson',
          email: 'alice@example.com',
          role: 'nurse',
        },
      ];

      // Mock aggregation pipeline response
      mockClinicModel.aggregate.mockResolvedValue([
        {
          _id: new Types.ObjectId(mockClinicId),
          name: 'Test Clinic',
          maxDoctors: 10,
          maxStaff: 20,
          maxPatients: 100,
          doctors: mockDoctors,
          staff: mockStaff,
          currentDoctors: 2,
          currentStaff: 1,
          currentPatients: 50,
        },
      ]);

      // Act
      const result = await service.getCapacityStatus(mockClinicId);

      // Assert
      expect(result).toBeDefined();
      expect(result.clinicId).toBe(mockClinicId);
      expect(result.clinicName).toBe('Test Clinic');

      // Doctors capacity
      expect(result.capacity.doctors.max).toBe(10);
      expect(result.capacity.doctors.current).toBe(2);
      expect(result.capacity.doctors.available).toBe(8);
      expect(result.capacity.doctors.percentage).toBe(20);
      expect(result.capacity.doctors.isExceeded).toBe(false);
      expect(result.capacity.doctors.list).toHaveLength(2);
      expect(result.capacity.doctors.list[0].name).toBe('John Doe');

      // Staff capacity
      expect(result.capacity.staff.max).toBe(20);
      expect(result.capacity.staff.current).toBe(1);
      expect(result.capacity.staff.available).toBe(19);
      expect(result.capacity.staff.percentage).toBe(5);
      expect(result.capacity.staff.isExceeded).toBe(false);
      expect(result.capacity.staff.list).toHaveLength(1);

      // Patients capacity
      expect(result.capacity.patients.max).toBe(100);
      expect(result.capacity.patients.current).toBe(50);
      expect(result.capacity.patients.available).toBe(50);
      expect(result.capacity.patients.percentage).toBe(50);
      expect(result.capacity.patients.isExceeded).toBe(false);
      expect(result.capacity.patients.count).toBe(50);

      // No recommendations when not exceeded
      expect(result.recommendations).toHaveLength(0);
    });

    it('should detect exceeded doctor capacity', async () => {
      // Arrange
      const mockDoctors = Array.from({ length: 12 }, (_, i) => ({
        _id: new Types.ObjectId(),
        firstName: `Doctor${i}`,
        lastName: `Test${i}`,
        email: `doctor${i}@example.com`,
        role: 'doctor',
      }));

      // Mock aggregation pipeline response
      mockClinicModel.aggregate.mockResolvedValue([
        {
          _id: new Types.ObjectId(mockClinicId),
          name: 'Test Clinic',
          maxDoctors: 10,
          maxStaff: 20,
          maxPatients: 100,
          doctors: mockDoctors,
          staff: [],
          currentDoctors: 12,
          currentStaff: 0,
          currentPatients: 50,
        },
      ]);

      // Act
      const result = await service.getCapacityStatus(mockClinicId);

      // Assert
      expect(result.capacity.doctors.current).toBe(12);
      expect(result.capacity.doctors.max).toBe(10);
      expect(result.capacity.doctors.available).toBe(-2);
      expect(result.capacity.doctors.percentage).toBe(120);
      expect(result.capacity.doctors.isExceeded).toBe(true);
      expect(result.recommendations).toContain(
        'Doctor capacity exceeded. Consider increasing maxDoctors or redistributing workload.',
      );
    });

    it('should detect exceeded staff capacity', async () => {
      // Arrange
      const mockStaff = Array.from({ length: 25 }, (_, i) => ({
        _id: new Types.ObjectId(),
        firstName: `Staff${i}`,
        lastName: `Test${i}`,
        email: `staff${i}@example.com`,
        role: 'nurse',
      }));

      // Mock aggregation pipeline response
      mockClinicModel.aggregate.mockResolvedValue([
        {
          _id: new Types.ObjectId(mockClinicId),
          name: 'Test Clinic',
          maxDoctors: 10,
          maxStaff: 20,
          maxPatients: 100,
          doctors: [],
          staff: mockStaff,
          currentDoctors: 0,
          currentStaff: 25,
          currentPatients: 50,
        },
      ]);

      // Act
      const result = await service.getCapacityStatus(mockClinicId);

      // Assert
      expect(result.capacity.staff.current).toBe(25);
      expect(result.capacity.staff.max).toBe(20);
      expect(result.capacity.staff.available).toBe(-5);
      expect(result.capacity.staff.percentage).toBe(125);
      expect(result.capacity.staff.isExceeded).toBe(true);
      expect(result.recommendations).toContain(
        'Staff capacity exceeded. Consider hiring more staff or increasing maxStaff limit.',
      );
    });

    it('should detect exceeded patient capacity', async () => {
      // Arrange
      // Mock aggregation pipeline response
      mockClinicModel.aggregate.mockResolvedValue([
        {
          _id: new Types.ObjectId(mockClinicId),
          name: 'Test Clinic',
          maxDoctors: 10,
          maxStaff: 20,
          maxPatients: 100,
          doctors: [],
          staff: [],
          currentDoctors: 0,
          currentStaff: 0,
          currentPatients: 120,
        },
      ]);

      // Act
      const result = await service.getCapacityStatus(mockClinicId);

      // Assert
      expect(result.capacity.patients.current).toBe(120);
      expect(result.capacity.patients.max).toBe(100);
      expect(result.capacity.patients.available).toBe(-20);
      expect(result.capacity.patients.percentage).toBe(120);
      expect(result.capacity.patients.isExceeded).toBe(true);
      expect(result.recommendations).toContain(
        'Patient capacity exceeded. Consider expanding facilities or limiting patient intake.',
      );
    });

    it('should generate multiple recommendations when multiple capacities exceeded', async () => {
      // Arrange
      const mockDoctors = Array.from({ length: 12 }, (_, i) => ({
        _id: new Types.ObjectId(),
        firstName: `Doctor${i}`,
        lastName: `Test${i}`,
        email: `doctor${i}@example.com`,
        role: 'doctor',
      }));

      const mockStaff = Array.from({ length: 25 }, (_, i) => ({
        _id: new Types.ObjectId(),
        firstName: `Staff${i}`,
        lastName: `Test${i}`,
        email: `staff${i}@example.com`,
        role: 'nurse',
      }));

      // Mock aggregation pipeline response
      mockClinicModel.aggregate.mockResolvedValue([
        {
          _id: new Types.ObjectId(mockClinicId),
          name: 'Test Clinic',
          maxDoctors: 10,
          maxStaff: 20,
          maxPatients: 100,
          doctors: mockDoctors,
          staff: mockStaff,
          currentDoctors: 12,
          currentStaff: 25,
          currentPatients: 120,
        },
      ]);

      // Act
      const result = await service.getCapacityStatus(mockClinicId);

      // Assert
      expect(result.recommendations).toHaveLength(3);
      expect(result.recommendations).toContain(
        'Doctor capacity exceeded. Consider increasing maxDoctors or redistributing workload.',
      );
      expect(result.recommendations).toContain(
        'Staff capacity exceeded. Consider hiring more staff or increasing maxStaff limit.',
      );
      expect(result.recommendations).toContain(
        'Patient capacity exceeded. Consider expanding facilities or limiting patient intake.',
      );
    });

    it('should throw NotFoundException for invalid clinic', async () => {
      // Arrange
      mockClinicModel.aggregate.mockResolvedValue([]);

      // Act & Assert
      await expect(service.getCapacityStatus(mockClinicId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle zero capacity limits', async () => {
      // Arrange
      // Mock aggregation pipeline response
      mockClinicModel.aggregate.mockResolvedValue([
        {
          _id: new Types.ObjectId(mockClinicId),
          name: 'Test Clinic',
          maxDoctors: 0,
          maxStaff: 0,
          maxPatients: 0,
          doctors: [],
          staff: [],
          currentDoctors: 0,
          currentStaff: 0,
          currentPatients: 0,
        },
      ]);

      // Act
      const result = await service.getCapacityStatus(mockClinicId);

      // Assert
      expect(result.capacity.doctors.percentage).toBe(0);
      expect(result.capacity.staff.percentage).toBe(0);
      expect(result.capacity.patients.percentage).toBe(0);
    });

    it('should handle empty patient aggregation result', async () => {
      // Arrange
      // Mock aggregation pipeline response with no patients
      mockClinicModel.aggregate.mockResolvedValue([
        {
          _id: new Types.ObjectId(mockClinicId),
          name: 'Test Clinic',
          maxDoctors: 10,
          maxStaff: 20,
          maxPatients: 100,
          doctors: [],
          staff: [],
          currentDoctors: 0,
          currentStaff: 0,
          currentPatients: 0,
        },
      ]);

      // Act
      const result = await service.getCapacityStatus(mockClinicId);

      // Assert
      expect(result.capacity.patients.current).toBe(0);
      expect(result.capacity.patients.count).toBe(0);
    });
  });

  describe('Cache functionality', () => {
    it('should cache capacity results', async () => {
      // Arrange
      mockClinicModel.aggregate.mockResolvedValue([
        {
          _id: new Types.ObjectId(mockClinicId),
          name: 'Test Clinic',
          maxDoctors: 10,
          maxStaff: 20,
          maxPatients: 100,
          doctors: [],
          staff: [],
          currentDoctors: 0,
          currentStaff: 0,
          currentPatients: 50,
        },
      ]);

      // Act
      await service.getCapacityStatus(mockClinicId);
      await service.getCapacityStatus(mockClinicId);

      // Assert - should only call database once due to caching
      expect(mockClinicModel.aggregate).toHaveBeenCalledTimes(1);
    });

    it('should invalidate cache for specific clinic', async () => {
      // Arrange
      mockClinicModel.aggregate.mockResolvedValue([
        {
          _id: new Types.ObjectId(mockClinicId),
          name: 'Test Clinic',
          maxDoctors: 10,
          maxStaff: 20,
          maxPatients: 100,
          doctors: [],
          staff: [],
          currentDoctors: 0,
          currentStaff: 0,
          currentPatients: 50,
        },
      ]);

      // Act
      await service.getCapacityStatus(mockClinicId);
      service.invalidateCache(mockClinicId);
      await service.getCapacityStatus(mockClinicId);

      // Assert - should call database twice after cache invalidation
      expect(mockClinicModel.aggregate).toHaveBeenCalledTimes(2);
    });

    it('should clear all cache', async () => {
      // Arrange
      const clinicId1 = new Types.ObjectId().toString();
      const clinicId2 = new Types.ObjectId().toString();

      mockClinicModel.aggregate.mockResolvedValue([
        {
          _id: new Types.ObjectId(mockClinicId),
          name: 'Test Clinic',
          maxDoctors: 10,
          maxStaff: 20,
          maxPatients: 100,
          doctors: [],
          staff: [],
          currentDoctors: 0,
          currentStaff: 0,
          currentPatients: 50,
        },
      ]);

      // Act
      await service.getCapacityStatus(clinicId1);
      await service.getCapacityStatus(clinicId2);
      service.clearCache();
      await service.getCapacityStatus(clinicId1);
      await service.getCapacityStatus(clinicId2);

      // Assert - should call database 4 times (2 before clear, 2 after)
      expect(mockClinicModel.aggregate).toHaveBeenCalledTimes(4);
    });
  });
});
