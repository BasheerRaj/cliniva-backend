import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Patient } from '../../database/schemas/patient.schema';
import { User } from '../../database/schemas/user.schema';
import { Service } from '../../database/schemas/service.schema';
import { Clinic } from '../../database/schemas/clinic.schema';
import { Department } from '../../database/schemas/department.schema';
import { ClinicService } from '../../database/schemas/clinic-service.schema';
import { DoctorService } from '../../database/schemas/doctor-service.schema';
import { ERROR_MESSAGES } from '../../common/utils/error-messages.constant';

/**
 * AppointmentValidationService
 * 
 * Handles comprehensive entity validation and relationship verification
 * for the Appointments Management Module (M6).
 * 
 * Responsibilities:
 * - Validate Patient, Doctor, Service, Clinic, and Department entities
 * - Verify service-clinic relationships
 * - Verify doctor-service authorization
 * - Provide bilingual error messages
 */
@Injectable()
export class AppointmentValidationService {
  private readonly logger = new Logger(AppointmentValidationService.name);

  constructor(
    @InjectModel('Patient') private readonly patientModel: Model<Patient>,
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('Service') private readonly serviceModel: Model<Service>,
    @InjectModel('Clinic') private readonly clinicModel: Model<Clinic>,
    @InjectModel('Department')
    private readonly departmentModel: Model<Department>,
    @InjectModel('ClinicService')
    private readonly clinicServiceModel: Model<ClinicService>,
    @InjectModel('DoctorService')
    private readonly doctorServiceModel: Model<DoctorService>,
  ) {}

  /**
   * Task 6.1: Validate Patient
   * Requirements: 1.1
   * 
   * Validates that:
   * - Patient exists in the database
   * - Patient is active (not deactivated)
   * 
   * @param patientId - Patient ID to validate
   * @throws NotFoundException if patient not found
   * @throws BadRequestException if patient is inactive
   */
  async validatePatient(patientId: string): Promise<void> {
    this.logger.debug(`Validating patient: ${patientId}`);

    if (!Types.ObjectId.isValid(patientId)) {
      throw new BadRequestException({
        message: ERROR_MESSAGES.INVALID_PATIENT_ID,
      });
    }

    const patient = await this.patientModel.findOne({
      _id: new Types.ObjectId(patientId),
      isDeleted: false,
    });

    if (!patient) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.PATIENT_NOT_FOUND,
      });
    }

    if (patient.status !== 'Active') {
      throw new BadRequestException({
        message: {
          ar: 'المريض غير نشط. لا يمكن حجز مواعيد',
          en: 'Patient is inactive. Cannot book appointments',
        },
      });
    }

    this.logger.debug(`Patient ${patientId} validated successfully`);
  }

  /**
   * Task 6.2: Validate Doctor
   * Requirements: 1.2
   * 
   * Validates that:
   * - Doctor exists in the database
   * - Doctor is active
   * - User has doctor role
   * 
   * @param doctorId - Doctor ID to validate
   * @throws NotFoundException if doctor not found
   * @throws BadRequestException if doctor is inactive or not a doctor
   */
  async validateDoctor(doctorId: string): Promise<void> {
    this.logger.debug(`Validating doctor: ${doctorId}`);

    if (!Types.ObjectId.isValid(doctorId)) {
      throw new BadRequestException({
        message: ERROR_MESSAGES.INVALID_ID_FORMAT,
      });
    }

    const doctor = await this.userModel.findOne({
      _id: new Types.ObjectId(doctorId),
    });

    if (!doctor) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.DOCTOR_NOT_FOUND,
      });
    }

    // Check if user has doctor role
    if (!['doctor', 'admin', 'owner'].includes(doctor.role)) {
      throw new BadRequestException({
        message: {
          ar: 'المستخدم ليس طبيباً',
          en: 'User is not a doctor',
        },
      });
    }

    // Check if doctor is active
    if (!doctor.isActive) {
      throw new BadRequestException({
        message: {
          ar: 'الطبيب غير نشط. لا يمكن حجز مواعيد',
          en: 'Doctor is inactive. Cannot book appointments',
        },
      });
    }

    this.logger.debug(`Doctor ${doctorId} validated successfully`);
  }

  /**
   * Task 6.3: Validate Service
   * Requirements: 1.3
   * 
   * Validates that:
   * - Service exists in the database
   * - Service is active
   * 
   * @param serviceId - Service ID to validate
   * @returns Service object with duration
   * @throws NotFoundException if service not found
   * @throws BadRequestException if service is inactive
   */
  async validateService(serviceId: string): Promise<Service> {
    this.logger.debug(`Validating service: ${serviceId}`);

    if (!Types.ObjectId.isValid(serviceId)) {
      throw new BadRequestException({
        message: ERROR_MESSAGES.INVALID_ID_FORMAT,
      });
    }

    const service = await this.serviceModel.findOne({
      _id: new Types.ObjectId(serviceId),
      deletedAt: { $exists: false },
    });

    if (!service) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.SERVICE_NOT_FOUND,
      });
    }

    if (!service.isActive) {
      throw new BadRequestException({
        message: {
          ar: 'الخدمة غير نشطة حالياً. لا يمكن حجز مواعيد',
          en: 'Service is currently inactive. Cannot book appointments',
        },
        serviceId: service._id,
        serviceName: service.name,
        deactivationReason: service.deactivationReason,
      });
    }

    this.logger.debug(`Service ${serviceId} validated successfully`);
    return service;
  }

  /**
   * Task 6.4: Validate Clinic
   * Requirements: 1.4
   * 
   * Validates that:
   * - Clinic exists in the database
   * - Clinic is active
   * 
   * @param clinicId - Clinic ID to validate
   * @returns Clinic object
   * @throws NotFoundException if clinic not found
   * @throws BadRequestException if clinic is inactive
   */
  async validateClinic(clinicId: string): Promise<Clinic> {
    this.logger.debug(`Validating clinic: ${clinicId}`);

    if (!Types.ObjectId.isValid(clinicId)) {
      throw new BadRequestException({
        message: ERROR_MESSAGES.INVALID_ID_FORMAT,
      });
    }

    const clinic = await this.clinicModel.findOne({
      _id: new Types.ObjectId(clinicId),
    });

    if (!clinic) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.CLINIC_NOT_FOUND,
      });
    }

    if (!clinic.isActive) {
      throw new BadRequestException({
        message: {
          ar: 'العيادة غير نشطة حالياً. لا يمكن حجز مواعيد',
          en: 'Clinic is currently inactive. Cannot book appointments',
        },
      });
    }

    this.logger.debug(`Clinic ${clinicId} validated successfully`);
    return clinic;
  }

  /**
   * Task 6.5: Validate Department
   * Requirements: 1.5
   * 
   * Validates that:
   * - Department exists in the database (if provided)
   * 
   * @param departmentId - Department ID to validate (optional)
   * @throws NotFoundException if department not found
   */
  async validateDepartment(departmentId?: string): Promise<void> {
    if (!departmentId) {
      return; // Department is optional
    }

    this.logger.debug(`Validating department: ${departmentId}`);

    if (!Types.ObjectId.isValid(departmentId)) {
      throw new BadRequestException({
        message: ERROR_MESSAGES.INVALID_ID_FORMAT,
      });
    }

    const department = await this.departmentModel.findOne({
      _id: new Types.ObjectId(departmentId),
    });

    if (!department) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.DEPARTMENT_NOT_FOUND,
      });
    }

    this.logger.debug(`Department ${departmentId} validated successfully`);
  }

  /**
   * Task 6.6: Validate Service-Clinic Relationship
   * Requirements: 1.6
   * 
   * Verifies that the service is provided by the specified clinic.
   * Checks the ClinicService junction table for the relationship.
   * 
   * @param serviceId - Service ID
   * @param clinicId - Clinic ID
   * @throws ConflictException if service not provided by clinic
   */
  async validateServiceClinicRelationship(
    serviceId: string,
    clinicId: string,
  ): Promise<void> {
    this.logger.debug(
      `Validating service-clinic relationship: service=${serviceId}, clinic=${clinicId}`,
    );

    // Check if the service is directly associated with the clinic
    const service = await this.serviceModel.findOne({
      _id: new Types.ObjectId(serviceId),
      clinicId: new Types.ObjectId(clinicId),
      deletedAt: { $exists: false },
    });

    if (service) {
      this.logger.debug(
        `Service ${serviceId} is directly associated with clinic ${clinicId}`,
      );
      return;
    }

    // Check the ClinicService junction table
    const clinicService = await this.clinicServiceModel.findOne({
      clinicId: new Types.ObjectId(clinicId),
      serviceId: new Types.ObjectId(serviceId),
      isActive: true,
    });

    if (!clinicService) {
      throw new ConflictException({
        message: {
          ar: 'الخدمة غير متوفرة في هذه العيادة',
          en: 'Service is not provided by this clinic',
        },
        serviceId,
        clinicId,
      });
    }

    this.logger.debug(
      `Service-clinic relationship validated successfully: service=${serviceId}, clinic=${clinicId}`,
    );
  }

  /**
   * Task 6.7: Validate Doctor-Service Authorization
   * Requirements: 1.7
   * 
   * Verifies that the doctor is authorized to provide the service.
   * Checks the DoctorService junction table for authorization.
   * 
   * @param doctorId - Doctor ID
   * @param serviceId - Service ID
   * @param clinicId - Clinic ID
   * @throws ConflictException if doctor not authorized for service
   */
  async validateDoctorServiceAuthorization(
    doctorId: string,
    serviceId: string,
    clinicId: string,
  ): Promise<void> {
    this.logger.debug(
      `Validating doctor-service authorization: doctor=${doctorId}, service=${serviceId}, clinic=${clinicId}`,
    );

    // Check the DoctorService junction table
    const doctorService = await this.doctorServiceModel.findOne({
      doctorId: new Types.ObjectId(doctorId),
      serviceId: new Types.ObjectId(serviceId),
      clinicId: new Types.ObjectId(clinicId),
      isActive: true,
    });

    if (!doctorService) {
      throw new ConflictException({
        message: {
          ar: 'الطبيب غير مصرح له بتقديم هذه الخدمة في هذه العيادة',
          en: 'Doctor is not authorized to provide this service at this clinic',
        },
        doctorId,
        serviceId,
        clinicId,
      });
    }

    this.logger.debug(
      `Doctor-service authorization validated successfully: doctor=${doctorId}, service=${serviceId}, clinic=${clinicId}`,
    );
  }

  /**
   * Task 6.8: Validate All Entities and Relationships
   * Requirements: 1.1-1.7
   * 
   * Comprehensive validation method that validates all entities
   * and their relationships before creating an appointment.
   * 
   * @param patientId - Patient ID
   * @param doctorId - Doctor ID
   * @param serviceId - Service ID
   * @param clinicId - Clinic ID
   * @param departmentId - Department ID (optional)
   * @returns Service object with duration
   */
  async validateAllEntitiesAndRelationships(
    patientId: string,
    doctorId: string,
    serviceId: string,
    clinicId: string,
    departmentId?: string,
  ): Promise<{ service: Service; clinic: Clinic }> {
    this.logger.log('Starting comprehensive entity and relationship validation');

    // Validate all entities in parallel for better performance
    await Promise.all([
      this.validatePatient(patientId),
      this.validateDoctor(doctorId),
      this.validateDepartment(departmentId),
    ]);

    // Validate service and clinic separately to get their objects
    const service = await this.validateService(serviceId);
    const clinic = await this.validateClinic(clinicId);

    // After entity validation, validate relationships
    await Promise.all([
      this.validateServiceClinicRelationship(serviceId, clinicId),
      this.validateDoctorServiceAuthorization(doctorId, serviceId, clinicId),
    ]);

    this.logger.log('All entities and relationships validated successfully');
    return { service, clinic };
  }
}
