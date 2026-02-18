import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection, ClientSession } from 'mongoose';
import { Patient } from '../database/schemas/patient.schema';
import { Appointment } from '../database/schemas/appointment.schema';
import { AuditService } from '../auth/audit.service';
import { ERROR_MESSAGES } from '../common/utils/error-messages.constant';
import {
  CreatePatientDto,
  UpdatePatientDto,
  PatientSearchQueryDto,
  UpdateMedicalHistoryDto,
  CreateEmergencyContactDto,
  PatientStatsDto,
  PatientResponseDto,
} from './dto';

@Injectable()
export class PatientService {
  private readonly logger = new Logger(PatientService.name);

  constructor(
    @InjectModel('Patient') private readonly patientModel: Model<Patient>,
    @InjectModel('Appointment')
    private readonly appointmentModel: Model<Appointment>,
    @InjectConnection() private readonly connection: Connection,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Generate unique patient number
   */
  private async generatePatientNumber(): Promise<string> {
    const prefix = 'PAT';
    const year = new Date().getFullYear();

    // Find the last patient number for current year
    const lastPatient = await this.patientModel.findOne(
      {
        patientNumber: { $regex: `^${prefix}${year}` },
      },
      {},
      { sort: { patientNumber: -1 } },
    );

    let nextNumber = 1;
    if (lastPatient && lastPatient.patientNumber) {
      const lastNumber = parseInt(lastPatient.patientNumber.substring(7)); // PAT2024001
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${year}${nextNumber.toString().padStart(3, '0')}`;
  }

  /**
   * Validate patient data
   */
  private async validatePatientData(
    patientDto: CreatePatientDto | UpdatePatientDto,
    isUpdate = false,
    patientId?: string,
  ): Promise<void> {
    // Check if cardNumber is being updated (not allowed per business rules)
    if (isUpdate && 'cardNumber' in patientDto) {
      throw new BadRequestException(ERROR_MESSAGES.CARD_NUMBER_NOT_EDITABLE);
    }

    // Check for duplicate card number (m5.json business rule)
    if ('cardNumber' in patientDto && patientDto.cardNumber) {
      const cardNumberQuery: any = {
        cardNumber: patientDto.cardNumber,
        deletedAt: { $exists: false },
      };

      if (isUpdate && patientId) {
        cardNumberQuery._id = { $ne: new Types.ObjectId(patientId) };
      }

      const existingPatientByCard =
        await this.patientModel.findOne(cardNumberQuery);
      if (existingPatientByCard) {
        throw new ConflictException(ERROR_MESSAGES.PATIENT_ALREADY_EXISTS_CARD);
      }
    }

    // Check for duplicate email
    if (patientDto.email) {
      const emailQuery: any = {
        email: patientDto.email,
        deletedAt: { $exists: false },
      };

      if (isUpdate && patientId) {
        emailQuery._id = { $ne: new Types.ObjectId(patientId) };
      }

      const existingPatientByEmail =
        await this.patientModel.findOne(emailQuery);
      if (existingPatientByEmail) {
        throw new ConflictException(ERROR_MESSAGES.DUPLICATE_EMAIL);
      }
    }

    // Check for duplicate phone
    if (patientDto.phone) {
      const phoneQuery: any = {
        phone: patientDto.phone,
        deletedAt: { $exists: false },
      };

      if (isUpdate && patientId) {
        phoneQuery._id = { $ne: new Types.ObjectId(patientId) };
      }

      const existingPatientByPhone =
        await this.patientModel.findOne(phoneQuery);
      if (existingPatientByPhone) {
        throw new ConflictException(ERROR_MESSAGES.DUPLICATE_PHONE);
      }
    }

    // Validate date of birth (not in future)
    if (patientDto.dateOfBirth) {
      const dob = new Date(patientDto.dateOfBirth);
      const today = new Date();

      if (dob > today) {
        throw new BadRequestException(ERROR_MESSAGES.DATE_OF_BIRTH_FUTURE);
      }

      // Check if age is reasonable (not older than 150 years)
      const age = today.getFullYear() - dob.getFullYear();
      if (age > 150) {
        throw new BadRequestException(ERROR_MESSAGES.DATE_OF_BIRTH_TOO_OLD);
      }
    }

    // Validate emergency contact
    if (patientDto.emergencyContactName && !patientDto.emergencyContactPhone) {
      throw new BadRequestException(
        ERROR_MESSAGES.EMERGENCY_CONTACT_PHONE_REQUIRED,
      );
    }

    if (patientDto.emergencyContactPhone && !patientDto.emergencyContactName) {
      throw new BadRequestException(
        ERROR_MESSAGES.EMERGENCY_CONTACT_NAME_REQUIRED,
      );
    }
  }

  /**
   * Create a new patient
   */
  async createPatient(
    createPatientDto: CreatePatientDto,
    createdByUserId?: string,
  ): Promise<Patient> {
    this.logger.log(
      `Creating patient: ${createPatientDto.firstName} ${createPatientDto.lastName}`,
    );

    await this.validatePatientData(createPatientDto);

    const patientNumber = await this.generatePatientNumber();

    const patientData = {
      ...createPatientDto,
      patientNumber,
      dateOfBirth: new Date(createPatientDto.dateOfBirth),
      preferredLanguage: createPatientDto.preferredLanguage || 'english',
      status: 'Active',
      insuranceStartDate: createPatientDto.insuranceStartDate
        ? new Date(createPatientDto.insuranceStartDate)
        : undefined,
      insuranceEndDate: createPatientDto.insuranceEndDate
        ? new Date(createPatientDto.insuranceEndDate)
        : undefined,
      createdBy: createdByUserId
        ? new Types.ObjectId(createdByUserId)
        : undefined,
    };

    const patient = new this.patientModel(patientData);
    const savedPatient = await patient.save();

    if (createdByUserId) {
      await this.auditService.logSecurityEvent({
        eventType: 'PATIENT_CREATED',
        userId: createdByUserId,
        actorId: createdByUserId,
        ipAddress: '0.0.0.0',
        userAgent: 'System',
        timestamp: new Date(),
        metadata: {
          patientId: (savedPatient as any)._id.toString(),
          patientNumber,
        },
      });
    }

    this.logger.log(
      `Patient created successfully with ID: ${savedPatient._id}`,
    );
    return savedPatient;
  }

  /**
   * Get all patients with filtering and pagination
   */
  async getPatients(query: PatientSearchQueryDto): Promise<{
    patients: Patient[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      search,
      firstName,
      lastName,
      phone,
      email,
      gender,
      status,
      bloodType,
      insuranceCompany,
      nationality,
      isPortalEnabled,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    // Build filter object
    const filter: any = {
      deletedAt: { $exists: false }, // Exclude soft-deleted patients
    };

    // Search across multiple fields
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { patientNumber: { $regex: search, $options: 'i' } },
        { cardNumber: { $regex: search, $options: 'i' } },
      ];
    }

    // Individual field filters
    if (firstName) filter.firstName = { $regex: firstName, $options: 'i' };
    if (lastName) filter.lastName = { $regex: lastName, $options: 'i' };
    if (phone) filter.phone = { $regex: phone, $options: 'i' };
    if (email) filter.email = { $regex: email, $options: 'i' };
    if (gender) filter.gender = gender;
    if (status) filter.status = status;
    if (bloodType) filter.bloodType = bloodType;
    if (insuranceCompany)
      filter.insuranceCompany = { $regex: insuranceCompany, $options: 'i' };
    if (nationality)
      filter.nationality = { $regex: nationality, $options: 'i' };
    if (isPortalEnabled !== undefined) filter.isPortalEnabled = isPortalEnabled;

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.max(1, Math.min(50, parseInt(limit))); // Max 50 per page (Requirement 9.5)
    const skip = (pageNum - 1) * pageSize;

    // Sorting
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [patients, total] = await Promise.all([
      this.patientModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .exec(),
      this.patientModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      patients,
      total,
      page: pageNum,
      totalPages,
    };
  }

  /**
   * Calculate patient age from date of birth
   */
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  }

  /**
   * Get patient by ID
   */
  async getPatientById(patientId: string): Promise<Patient> {
    if (!Types.ObjectId.isValid(patientId)) {
      throw new BadRequestException(ERROR_MESSAGES.INVALID_PATIENT_ID);
    }

    const patient = await this.patientModel
      .findOne({
        _id: new Types.ObjectId(patientId),
        deletedAt: { $exists: false },
      })
      .exec();

    if (!patient) {
      throw new NotFoundException(ERROR_MESSAGES.PATIENT_NOT_FOUND);
    }

    return patient;
  }

  /**
   * Get patient by patient number
   */
  async getPatientByNumber(patientNumber: string): Promise<Patient> {
    const patient = await this.patientModel
      .findOne({
        patientNumber,
        deletedAt: { $exists: false },
      })
      .exec();

    if (!patient) {
      throw new NotFoundException(ERROR_MESSAGES.PATIENT_NOT_FOUND);
    }

    return patient;
  }

  /**
   * Update patient
   */
  async updatePatient(
    patientId: string,
    updatePatientDto: UpdatePatientDto,
    updatedByUserId?: string,
  ): Promise<Patient> {
    if (!Types.ObjectId.isValid(patientId)) {
      throw new BadRequestException(ERROR_MESSAGES.INVALID_PATIENT_ID);
    }

    this.logger.log(`Updating patient: ${patientId}`);

    await this.validatePatientData(updatePatientDto, true, patientId);

    const updateData: any = {
      ...updatePatientDto,
      updatedBy: updatedByUserId
        ? new Types.ObjectId(updatedByUserId)
        : undefined,
    };

    // Convert date strings to Date objects if provided
    if (updatePatientDto.dateOfBirth) {
      updateData.dateOfBirth = new Date(updatePatientDto.dateOfBirth);
    }
    if (updatePatientDto.insuranceStartDate) {
      updateData.insuranceStartDate = new Date(
        updatePatientDto.insuranceStartDate,
      );
    }
    if (updatePatientDto.insuranceEndDate) {
      updateData.insuranceEndDate = new Date(updatePatientDto.insuranceEndDate);
    }

    const patient = await this.patientModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(patientId),
          deletedAt: { $exists: false },
        },
        { $set: updateData },
        { new: true, runValidators: true },
      )
      .exec();

    if (!patient) {
      throw new NotFoundException(ERROR_MESSAGES.PATIENT_NOT_FOUND);
    }

    if (updatedByUserId) {
      await this.auditService.logSecurityEvent({
        eventType: 'PATIENT_UPDATED',
        userId: patientId,
        actorId: updatedByUserId,
        ipAddress: '0.0.0.0',
        userAgent: 'System',
        timestamp: new Date(),
        metadata: { changes: Object.keys(updatePatientDto) },
      });
    }

    this.logger.log(`Patient updated successfully: ${patientId}`);
    return patient;
  }

  /**
   * Deactivate patient and cancel appointments with transaction support
   */
  async deactivatePatient(
    patientId: string,
    updatedByUserId?: string,
  ): Promise<Patient> {
    if (!Types.ObjectId.isValid(patientId)) {
      throw new BadRequestException(ERROR_MESSAGES.INVALID_PATIENT_ID);
    }

    this.logger.log(
      `Deactivating patient and cancelling appointments: ${patientId}`,
    );

    // Check if patient exists first
    const existingPatient = await this.patientModel
      .findOne({
        _id: new Types.ObjectId(patientId),
        deletedAt: { $exists: false },
      })
      .exec();

    if (!existingPatient) {
      throw new NotFoundException(ERROR_MESSAGES.PATIENT_NOT_FOUND);
    }

    // Handle idempotent deactivation (Requirement 5.6)
    if (existingPatient.status === 'Inactive') {
      this.logger.log(
        `Patient ${patientId} is already inactive, returning without changes`,
      );
      return existingPatient;
    }

    // Start MongoDB session for transaction
    const session: ClientSession = await this.connection.startSession();
    session.startTransaction();

    try {
      // Update patient status to "Inactive"
      const patient = await this.patientModel
        .findOneAndUpdate(
          { _id: new Types.ObjectId(patientId), deletedAt: { $exists: false } },
          {
            $set: {
              status: 'Inactive',
              updatedBy: updatedByUserId
                ? new Types.ObjectId(updatedByUserId)
                : undefined,
            },
          },
          { new: true, session },
        )
        .exec();

      if (!patient) {
        throw new NotFoundException(ERROR_MESSAGES.PATIENT_NOT_FOUND);
      }

      // Cancel all active appointments (status 'scheduled' or 'confirmed')
      const result = await this.appointmentModel.updateMany(
        {
          patientId: new Types.ObjectId(patientId),
          status: { $in: ['scheduled', 'confirmed'] },
          deletedAt: { $exists: false },
        },
        {
          $set: {
            status: 'cancelled',
            cancellationReason: 'Patient deactivated',
            updatedBy: updatedByUserId
              ? new Types.ObjectId(updatedByUserId)
              : undefined,
          },
        },
        { session },
      );

      // Commit transaction
      await session.commitTransaction();

      // Log deactivation event with cancelled appointment count
      if (updatedByUserId) {
        await this.auditService.logSecurityEvent({
          eventType: 'PATIENT_DEACTIVATED',
          userId: patientId,
          actorId: updatedByUserId,
          ipAddress: '0.0.0.0',
          userAgent: 'System',
          timestamp: new Date(),
          metadata: { cancelledAppointments: result.modifiedCount },
        });
      }

      this.logger.log(
        `Patient ${patientId} deactivated successfully. Cancelled ${result.modifiedCount} appointments.`,
      );

      return patient;
    } catch (error) {
      // Rollback transaction on error
      await session.abortTransaction();
      this.logger.error(`Failed to deactivate patient ${patientId}:`, error);

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException({
        message: {
          ar: 'فشل في تعطيل المريض',
          en: 'Failed to deactivate patient',
        },
      });
    } finally {
      // End session
      session.endSession();
    }
  }

  /**
   * Activate patient
   */
  async activatePatient(
    patientId: string,
    updatedByUserId?: string,
  ): Promise<Patient> {
    if (!Types.ObjectId.isValid(patientId)) {
      throw new BadRequestException(ERROR_MESSAGES.INVALID_PATIENT_ID);
    }

    this.logger.log(`Activating patient: ${patientId}`);

    // Check if patient exists first
    const existingPatient = await this.patientModel
      .findOne({
        _id: new Types.ObjectId(patientId),
        deletedAt: { $exists: false },
      })
      .exec();

    if (!existingPatient) {
      throw new NotFoundException(ERROR_MESSAGES.PATIENT_NOT_FOUND);
    }

    // Handle idempotent activation (Requirement 6.4)
    if (existingPatient.status === 'Active') {
      this.logger.log(
        `Patient ${patientId} is already active, returning without changes`,
      );
      return existingPatient;
    }

    const patient = await this.patientModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(patientId), deletedAt: { $exists: false } },
        {
          $set: {
            status: 'Active',
            updatedBy: updatedByUserId
              ? new Types.ObjectId(updatedByUserId)
              : undefined,
          },
        },
        { new: true },
      )
      .exec();

    if (!patient) {
      throw new NotFoundException(ERROR_MESSAGES.PATIENT_NOT_FOUND);
    }

    if (updatedByUserId) {
      await this.auditService.logSecurityEvent({
        eventType: 'PATIENT_ACTIVATED',
        userId: patientId,
        actorId: updatedByUserId,
        ipAddress: '0.0.0.0',
        userAgent: 'System',
        timestamp: new Date(),
        metadata: { action: 'Patient account activated' },
      });
    }

    this.logger.log(`Patient ${patientId} activated successfully`);

    return patient;
  }

  /**
   * Soft delete patient
   */
  async deletePatient(
    patientId: string,
    deletedByUserId?: string,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(patientId)) {
      throw new BadRequestException(ERROR_MESSAGES.INVALID_PATIENT_ID);
    }

    // Check if patient is deactivated first (m5.json requirement)
    const patient = await this.getPatientById(patientId);
    if (patient.status !== 'Inactive') {
      throw new BadRequestException(ERROR_MESSAGES.PATIENT_MUST_BE_DEACTIVATED);
    }

    this.logger.log(`Soft deleting patient: ${patientId}`);

    const result = await this.patientModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(patientId),
          deletedAt: { $exists: false },
        },
        {
          $set: {
            deletedAt: new Date(),
            updatedBy: deletedByUserId
              ? new Types.ObjectId(deletedByUserId)
              : undefined,
          },
        },
      )
      .exec();

    if (!result) {
      throw new NotFoundException(ERROR_MESSAGES.PATIENT_NOT_FOUND);
    }

    if (deletedByUserId) {
      await this.auditService.logSecurityEvent({
        eventType: 'PATIENT_DELETED',
        userId: patientId,
        actorId: deletedByUserId,
        ipAddress: '0.0.0.0',
        userAgent: 'System',
        timestamp: new Date(),
        metadata: { action: 'Patient record soft deleted' },
      });
    }

    this.logger.log(`Patient soft deleted successfully: ${patientId}`);
  }

  /**
   * Update medical history
   */
  async updateMedicalHistory(
    patientId: string,
    updateMedicalHistoryDto: UpdateMedicalHistoryDto,
    updatedByUserId?: string,
  ): Promise<Patient> {
    if (!Types.ObjectId.isValid(patientId)) {
      throw new BadRequestException(ERROR_MESSAGES.INVALID_PATIENT_ID);
    }

    const updateData: any = {
      ...updateMedicalHistoryDto,
      updatedBy: updatedByUserId
        ? new Types.ObjectId(updatedByUserId)
        : undefined,
    };

    const patient = await this.patientModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(patientId),
          deletedAt: { $exists: false },
        },
        { $set: updateData },
        { new: true },
      )
      .exec();

    if (!patient) {
      throw new NotFoundException(ERROR_MESSAGES.PATIENT_NOT_FOUND);
    }

    return patient;
  }

  /**
   * Get patient statistics
   * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
   */
  async getPatientStats(): Promise<PatientStatsDto> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Base filter to exclude soft-deleted patients (Requirement 10.6)
    const baseFilter = { deletedAt: { $exists: false } };

    const [
      totalPatients,
      activePatients,
      malePatients,
      femalePatients,
      otherGenderPatients,
      patientsWithInsurance,
      patientsWithPortalAccess,
      recentPatients,
      avgAgeResult,
    ] = await Promise.all([
      // Total patients (Requirement 10.1)
      this.patientModel.countDocuments(baseFilter),

      // Active patients (not deleted)
      this.patientModel.countDocuments(baseFilter),

      // Male patients (Requirement 10.2)
      this.patientModel.countDocuments({
        ...baseFilter,
        gender: 'male',
      }),

      // Female patients (Requirement 10.2)
      this.patientModel.countDocuments({
        ...baseFilter,
        gender: 'female',
      }),

      // Other gender patients (Requirement 10.2)
      this.patientModel.countDocuments({
        ...baseFilter,
        gender: 'other',
      }),

      // Patients with active insurance (Requirement 10.4)
      this.patientModel.countDocuments({
        ...baseFilter,
        insuranceStatus: 'Active',
      }),

      // Patients with portal access
      this.patientModel.countDocuments({
        ...baseFilter,
        isPortalEnabled: true,
      }),

      // Recent patients - registered in last 30 days (Requirement 10.5)
      this.patientModel.countDocuments({
        ...baseFilter,
        createdAt: { $gte: thirtyDaysAgo },
      }),

      // Average age calculation (Requirement 10.3)
      this.patientModel.aggregate([
        {
          $match: {
            ...baseFilter,
            dateOfBirth: { $exists: true },
          },
        },
        {
          $project: {
            age: {
              $floor: {
                $divide: [
                  { $subtract: [new Date(), '$dateOfBirth'] },
                  365.25 * 24 * 60 * 60 * 1000,
                ],
              },
            },
          },
        },
        {
          $group: {
            _id: null,
            avgAge: { $avg: '$age' },
          },
        },
      ]),
    ]);

    // Verify that total equals sum of gender counts (Requirement 10.1, 10.2)
    const genderSum = malePatients + femalePatients + otherGenderPatients;
    if (totalPatients !== genderSum) {
      this.logger.warn(
        `Statistics mismatch: total (${totalPatients}) != gender sum (${genderSum})`,
      );
    }

    return {
      totalPatients,
      activePatients,
      malePatients,
      femalePatients,
      avgAge: Math.round((avgAgeResult[0]?.avgAge || 0) * 10) / 10, // Round to 1 decimal place
      patientsWithInsurance,
      patientsWithPortalAccess,
      recentPatients,
    };
  }

  /**
   * Search patients by term (advanced search)
   */
  async searchPatients(
    searchTerm: string,
    limit: number = 20,
  ): Promise<Patient[]> {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return [];
    }

    const searchRegex = new RegExp(searchTerm.trim(), 'i');

    return await this.patientModel
      .find({
        deletedAt: { $exists: false },
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { phone: searchRegex },
          { email: searchRegex },
          { patientNumber: searchRegex },
          {
            $expr: {
              $regexMatch: {
                input: { $concat: ['$firstName', ' ', '$lastName'] },
                regex: searchTerm.trim(),
                options: 'i',
              },
            },
          },
        ],
      })
      .sort({ firstName: 1, lastName: 1 })
      .limit(Math.min(limit, 50)) // Max 50 results
      .exec();
  }

  /**
   * Get recent patients
   */
  async getRecentPatients(limit: number = 10): Promise<Patient[]> {
    return await this.patientModel
      .find({ deletedAt: { $exists: false } })
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 50))
      .exec();
  }

  /**
   * Check if patient exists by email
   */
  async patientExistsByEmail(email: string): Promise<boolean> {
    const patient = await this.patientModel
      .findOne({
        email,
        deletedAt: { $exists: false },
      })
      .exec();

    return !!patient;
  }

  /**
   * Check if patient exists by phone
   */
  async patientExistsByPhone(phone: string): Promise<boolean> {
    const patient = await this.patientModel
      .findOne({
        phone,
        deletedAt: { $exists: false },
      })
      .exec();

    return !!patient;
  }

  /**
   * Get patients with upcoming birthdays (within next 30 days)
   */
  async getUpcomingBirthdays(days: number = 30): Promise<Patient[]> {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    // This is a simplified version - for production, you'd need more complex date logic
    return await this.patientModel
      .find({
        deletedAt: { $exists: false },
        dateOfBirth: { $exists: true },
      })
      .exec()
      .then((patients) => {
        return patients.filter((patient) => {
          const dob = new Date(patient.dateOfBirth);
          const birthMonth = dob.getMonth() + 1;
          const birthDay = dob.getDate();

          // Simple check for same month and day within range
          if (birthMonth === currentMonth) {
            return birthDay >= currentDay && birthDay <= currentDay + days;
          }

          return false;
        });
      });
  }
}
