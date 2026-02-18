/**
 * Bilingual Error Messages Test Suite
 *
 * This test suite verifies that all error messages in the patient management module
 * are bilingual (Arabic & English) as required by Requirements 8.1-8.5.
 *
 * Requirements Coverage:
 * - 8.1: Duplicate cardNumber error
 * - 8.2: Invalid ID error
 * - 8.3: Not found error
 * - 8.4: Active patient deletion error
 * - 8.5: CardNumber edit error
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PatientService } from '../../src/patient/patient.service';
import { Patient } from '../../src/database/schemas/patient.schema';
import { Appointment } from '../../src/database/schemas/appointment.schema';
import { AuditService } from '../../src/auth/audit.service';
import { ERROR_MESSAGES } from '../../src/common/utils/error-messages.constant';

describe('Patient Module - Bilingual Error Messages', () => {
  let service: PatientService;
  let patientModel: Model<Patient>;
  let appointmentModel: Model<Appointment>;

  const mockAuditService = {
    logAction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientService,
        {
          provide: getModelToken(Patient.name),
          useValue: {
            create: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            findById: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            countDocuments: jest.fn(),
            aggregate: jest.fn(),
            startSession: jest.fn(),
          },
        },
        {
          provide: getModelToken(Appointment.name),
          useValue: {
            updateMany: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: 'DATABASE_CONNECTION',
          useValue: {
            startSession: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PatientService>(PatientService);
    patientModel = module.get<Model<Patient>>(getModelToken(Patient.name));
    appointmentModel = module.get<Model<Appointment>>(
      getModelToken(Appointment.name),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Helper function to verify bilingual message structure
   */
  const verifyBilingualMessage = (error: any) => {
    expect(error.response).toBeDefined();
    expect(error.response.message).toBeDefined();
    expect(error.response.message.ar).toBeDefined();
    expect(error.response.message.en).toBeDefined();
    expect(typeof error.response.message.ar).toBe('string');
    expect(typeof error.response.message.en).toBe('string');
    expect(error.response.message.ar.length).toBeGreaterThan(0);
    expect(error.response.message.en.length).toBeGreaterThan(0);
  };

  describe('Requirement 8.1: Duplicate Card Number Error', () => {
    it('should return bilingual error message when creating patient with duplicate cardNumber', async () => {
      const createPatientDto = {
        cardNumber: 'CARD123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male' as const,
      };

      jest.spyOn(patientModel, 'findOne').mockResolvedValueOnce({
        _id: new Types.ObjectId(),
        cardNumber: 'CARD123',
      } as any);

      try {
        await service.createPatient(createPatientDto, 'user123');
        fail('Should have thrown ConflictException');
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        verifyBilingualMessage(error);
        expect(error.response.message).toEqual(
          ERROR_MESSAGES.PATIENT_ALREADY_EXISTS_CARD,
        );
        expect(error.response.message.ar).toBe(
          'يوجد مريض مسجل برقم البطاقة هذا بالفعل',
        );
        expect(error.response.message.en).toBe(
          'A patient with this card number already exists',
        );
      }
    });
  });

  describe('Requirement 8.2: Invalid ID Error', () => {
    it('should return bilingual error message for invalid patient ID in getPatientById', async () => {
      const invalidId = 'invalid-id';

      try {
        await service.getPatientById(invalidId);
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        verifyBilingualMessage(error);
        expect(error.response.message).toEqual(
          ERROR_MESSAGES.INVALID_PATIENT_ID,
        );
        expect(error.response.message.ar).toBe('معرف المريض غير صالح');
        expect(error.response.message.en).toBe('Invalid patient ID');
      }
    });

    it('should return bilingual error message for invalid patient ID in updatePatient', async () => {
      const invalidId = 'invalid-id';
      const updateDto = { firstName: 'Jane' };

      try {
        await service.updatePatient(invalidId, updateDto, 'user123');
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        verifyBilingualMessage(error);
        expect(error.response.message).toEqual(
          ERROR_MESSAGES.INVALID_PATIENT_ID,
        );
      }
    });

    it('should return bilingual error message for invalid patient ID in deactivatePatient', async () => {
      const invalidId = 'invalid-id';

      try {
        await service.deactivatePatient(invalidId, 'user123');
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        verifyBilingualMessage(error);
        expect(error.response.message).toEqual(
          ERROR_MESSAGES.INVALID_PATIENT_ID,
        );
      }
    });

    it('should return bilingual error message for invalid patient ID in activatePatient', async () => {
      const invalidId = 'invalid-id';

      try {
        await service.activatePatient(invalidId, 'user123');
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        verifyBilingualMessage(error);
        expect(error.response.message).toEqual(
          ERROR_MESSAGES.INVALID_PATIENT_ID,
        );
      }
    });

    it('should return bilingual error message for invalid patient ID in deletePatient', async () => {
      const invalidId = 'invalid-id';

      try {
        await service.deletePatient(invalidId, 'user123');
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        verifyBilingualMessage(error);
        expect(error.response.message).toEqual(
          ERROR_MESSAGES.INVALID_PATIENT_ID,
        );
      }
    });
  });

  describe('Requirement 8.3: Patient Not Found Error', () => {
    it('should return bilingual error message when patient not found in getPatientById', async () => {
      const validId = new Types.ObjectId().toString();

      jest.spyOn(patientModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().resolvedValue(null),
      } as any);

      try {
        await service.getPatientById(validId);
        fail('Should have thrown NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        verifyBilingualMessage(error);
        expect(error.response.message).toEqual(
          ERROR_MESSAGES.PATIENT_NOT_FOUND,
        );
        expect(error.response.message.ar).toBe('المريض غير موجود');
        expect(error.response.message.en).toBe('Patient not found');
      }
    });

    it('should return bilingual error message when patient not found in updatePatient', async () => {
      const validId = new Types.ObjectId().toString();
      const updateDto = { firstName: 'Jane' };

      jest.spyOn(patientModel, 'findOne').mockResolvedValue(null);
      jest.spyOn(patientModel, 'findByIdAndUpdate').mockReturnValueOnce({
        exec: jest.fn().resolvedValue(null),
      } as any);

      try {
        await service.updatePatient(validId, updateDto, 'user123');
        fail('Should have thrown NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        verifyBilingualMessage(error);
        expect(error.response.message).toEqual(
          ERROR_MESSAGES.PATIENT_NOT_FOUND,
        );
      }
    });

    it('should return bilingual error message when patient not found in deletePatient', async () => {
      const validId = new Types.ObjectId().toString();

      jest.spyOn(patientModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().resolvedValue(null),
      } as any);

      try {
        await service.deletePatient(validId, 'user123');
        fail('Should have thrown NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        verifyBilingualMessage(error);
        expect(error.response.message).toEqual(
          ERROR_MESSAGES.PATIENT_NOT_FOUND,
        );
      }
    });
  });

  describe('Requirement 8.4: Active Patient Deletion Error', () => {
    it('should return bilingual error message when attempting to delete active patient', async () => {
      const validId = new Types.ObjectId().toString();
      const activePatient = {
        _id: new Types.ObjectId(validId),
        status: 'Active',
        cardNumber: 'CARD123',
        firstName: 'John',
        lastName: 'Doe',
      };

      jest.spyOn(patientModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().resolvedValue(activePatient),
      } as any);

      try {
        await service.deletePatient(validId, 'user123');
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        verifyBilingualMessage(error);
        expect(error.response.message).toEqual(
          ERROR_MESSAGES.PATIENT_MUST_BE_DEACTIVATED,
        );
        expect(error.response.message.ar).toBe(
          'يجب إلغاء تفعيل المريض قبل الحذف',
        );
        expect(error.response.message.en).toBe(
          'Patient must be deactivated before deletion',
        );
      }
    });
  });

  describe('Requirement 8.5: Card Number Edit Error', () => {
    it('should return bilingual error message when attempting to edit cardNumber', async () => {
      const validId = new Types.ObjectId().toString();
      const updateDto = {
        cardNumber: 'NEW_CARD',
        firstName: 'Jane',
      };

      try {
        await service.updatePatient(validId, updateDto, 'user123');
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        verifyBilingualMessage(error);
        expect(error.response.message).toEqual(
          ERROR_MESSAGES.CARD_NUMBER_NOT_EDITABLE,
        );
        expect(error.response.message.ar).toBe('رقم البطاقة غير قابل للتعديل');
        expect(error.response.message.en).toBe('Card number is not editable');
      }
    });
  });

  describe('Additional Bilingual Error Messages', () => {
    it('should return bilingual error for duplicate email', async () => {
      const createPatientDto = {
        cardNumber: 'CARD123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male' as const,
        email: 'test@example.com',
      };

      jest
        .spyOn(patientModel, 'findOne')
        .mockResolvedValueOnce(null) // cardNumber check
        .mockResolvedValueOnce({
          _id: new Types.ObjectId(),
          email: 'test@example.com',
        } as any); // email check

      try {
        await service.createPatient(createPatientDto, 'user123');
        fail('Should have thrown ConflictException');
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        verifyBilingualMessage(error);
        expect(error.response.message).toEqual(ERROR_MESSAGES.DUPLICATE_EMAIL);
        expect(error.response.message.ar).toBe(
          'البريد الإلكتروني مستخدم بالفعل',
        );
        expect(error.response.message.en).toBe('Email is already in use');
      }
    });

    it('should return bilingual error for duplicate phone', async () => {
      const createPatientDto = {
        cardNumber: 'CARD123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male' as const,
        phone: '1234567890',
      };

      jest
        .spyOn(patientModel, 'findOne')
        .mockResolvedValueOnce(null) // cardNumber check
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce({
          _id: new Types.ObjectId(),
          phone: '1234567890',
        } as any); // phone check

      try {
        await service.createPatient(createPatientDto, 'user123');
        fail('Should have thrown ConflictException');
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        verifyBilingualMessage(error);
        expect(error.response.message).toEqual(ERROR_MESSAGES.DUPLICATE_PHONE);
        expect(error.response.message.ar).toBe('رقم الهاتف مستخدم بالفعل');
        expect(error.response.message.en).toBe(
          'Phone number is already in use',
        );
      }
    });

    it('should return bilingual error for future date of birth', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const createPatientDto = {
        cardNumber: 'CARD123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: futureDate,
        gender: 'male' as const,
      };

      jest.spyOn(patientModel, 'findOne').mockResolvedValue(null);

      try {
        await service.createPatient(createPatientDto, 'user123');
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        verifyBilingualMessage(error);
        expect(error.response.message).toEqual(
          ERROR_MESSAGES.DATE_OF_BIRTH_FUTURE,
        );
        expect(error.response.message.ar).toBe(
          'تاريخ الميلاد لا يمكن أن يكون في المستقبل',
        );
        expect(error.response.message.en).toBe(
          'Date of birth cannot be in the future',
        );
      }
    });

    it('should return bilingual error for date of birth too old', async () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 151);

      const createPatientDto = {
        cardNumber: 'CARD123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: oldDate,
        gender: 'male' as const,
      };

      jest.spyOn(patientModel, 'findOne').mockResolvedValue(null);

      try {
        await service.createPatient(createPatientDto, 'user123');
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        verifyBilingualMessage(error);
        expect(error.response.message).toEqual(
          ERROR_MESSAGES.DATE_OF_BIRTH_TOO_OLD,
        );
        expect(error.response.message.ar).toBe(
          'تاريخ الميلاد غير صالح (العمر يتجاوز 150 سنة)',
        );
        expect(error.response.message.en).toBe(
          'Date of birth is invalid (age exceeds 150 years)',
        );
      }
    });

    it('should return bilingual error for emergency contact phone without name', async () => {
      const createPatientDto = {
        cardNumber: 'CARD123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male' as const,
        emergencyContactPhone: '1234567890',
      };

      jest.spyOn(patientModel, 'findOne').mockResolvedValue(null);

      try {
        await service.createPatient(createPatientDto, 'user123');
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        verifyBilingualMessage(error);
        expect(error.response.message).toEqual(
          ERROR_MESSAGES.EMERGENCY_CONTACT_NAME_REQUIRED,
        );
        expect(error.response.message.ar).toBe(
          'اسم جهة الاتصال في حالات الطوارئ مطلوب عند تقديم رقم الهاتف',
        );
        expect(error.response.message.en).toBe(
          'Emergency contact name is required when phone is provided',
        );
      }
    });

    it('should return bilingual error for emergency contact name without phone', async () => {
      const createPatientDto = {
        cardNumber: 'CARD123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male' as const,
        emergencyContactName: 'Jane Doe',
      };

      jest.spyOn(patientModel, 'findOne').mockResolvedValue(null);

      try {
        await service.createPatient(createPatientDto, 'user123');
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        verifyBilingualMessage(error);
        expect(error.response.message).toEqual(
          ERROR_MESSAGES.EMERGENCY_CONTACT_PHONE_REQUIRED,
        );
        expect(error.response.message.ar).toBe(
          'رقم هاتف جهة الاتصال في حالات الطوارئ مطلوب عند تقديم الاسم',
        );
        expect(error.response.message.en).toBe(
          'Emergency contact phone is required when name is provided',
        );
      }
    });
  });

  describe('Message Structure Validation', () => {
    it('should verify all ERROR_MESSAGES have bilingual structure', () => {
      const patientErrorKeys = [
        'PATIENT_ALREADY_EXISTS_CARD',
        'INVALID_PATIENT_ID',
        'PATIENT_NOT_FOUND',
        'PATIENT_MUST_BE_DEACTIVATED',
        'CARD_NUMBER_NOT_EDITABLE',
        'DUPLICATE_EMAIL',
        'DUPLICATE_PHONE',
        'DATE_OF_BIRTH_FUTURE',
        'DATE_OF_BIRTH_TOO_OLD',
        'EMERGENCY_CONTACT_NAME_REQUIRED',
        'EMERGENCY_CONTACT_PHONE_REQUIRED',
      ];

      patientErrorKeys.forEach((key) => {
        const message = ERROR_MESSAGES[key];
        expect(message).toBeDefined();
        expect(message.ar).toBeDefined();
        expect(message.en).toBeDefined();
        expect(typeof message.ar).toBe('string');
        expect(typeof message.en).toBe('string');
        expect(message.ar.length).toBeGreaterThan(0);
        expect(message.en.length).toBeGreaterThan(0);
      });
    });
  });
});
