import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Patient } from '../database/schemas/patient.schema';
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
        throw new ConflictException('Patient with this email already exists');
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
        throw new ConflictException(
          'Patient with this phone number already exists',
        );
      }
    }

    // Validate date of birth (not in future)
    if (patientDto.dateOfBirth) {
      const dob = new Date(patientDto.dateOfBirth);
      const today = new Date();

      if (dob > today) {
        throw new BadRequestException('Date of birth cannot be in the future');
      }

      // Check if age is reasonable (not older than 150 years)
      const age = today.getFullYear() - dob.getFullYear();
      if (age > 150) {
        throw new BadRequestException(
          'Invalid date of birth: age cannot exceed 150 years',
        );
      }
    }

    // Validate emergency contact
    if (patientDto.emergencyContactName && !patientDto.emergencyContactPhone) {
      throw new BadRequestException(
        'Emergency contact phone is required when emergency contact name is provided',
      );
    }

    if (patientDto.emergencyContactPhone && !patientDto.emergencyContactName) {
      throw new BadRequestException(
        'Emergency contact name is required when emergency contact phone is provided',
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
      isPortalEnabled: createPatientDto.isPortalEnabled || false,
      createdBy: createdByUserId
        ? new Types.ObjectId(createdByUserId)
        : undefined,
    };

    const patient = new this.patientModel(patientData);
    const savedPatient = await patient.save();

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
      bloodType,
      insuranceProvider,
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
      ];
    }

    // Individual field filters
    if (firstName) filter.firstName = { $regex: firstName, $options: 'i' };
    if (lastName) filter.lastName = { $regex: lastName, $options: 'i' };
    if (phone) filter.phone = { $regex: phone, $options: 'i' };
    if (email) filter.email = { $regex: email, $options: 'i' };
    if (gender) filter.gender = gender;
    if (bloodType) filter.bloodType = bloodType;
    if (insuranceProvider)
      filter.insuranceProvider = { $regex: insuranceProvider, $options: 'i' };
    if (nationality)
      filter.nationality = { $regex: nationality, $options: 'i' };
    if (isPortalEnabled !== undefined) filter.isPortalEnabled = isPortalEnabled;

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.max(1, Math.min(100, parseInt(limit))); // Max 100 per page
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
   * Get patient by ID
   */
  async getPatientById(patientId: string): Promise<Patient> {
    if (!Types.ObjectId.isValid(patientId)) {
      throw new BadRequestException('Invalid patient ID format');
    }

    const patient = await this.patientModel
      .findOne({
        _id: new Types.ObjectId(patientId),
        deletedAt: { $exists: false },
      })
      .exec();

    if (!patient) {
      throw new NotFoundException('Patient not found');
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
      throw new NotFoundException('Patient not found');
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
      throw new BadRequestException('Invalid patient ID format');
    }

    this.logger.log(`Updating patient: ${patientId}`);

    await this.validatePatientData(updatePatientDto, true, patientId);

    const updateData: any = {
      ...updatePatientDto,
      updatedBy: updatedByUserId
        ? new Types.ObjectId(updatedByUserId)
        : undefined,
    };

    // Convert date string to Date object if provided
    if (updatePatientDto.dateOfBirth) {
      updateData.dateOfBirth = new Date(updatePatientDto.dateOfBirth);
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
      throw new NotFoundException('Patient not found');
    }

    this.logger.log(`Patient updated successfully: ${patientId}`);
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
      throw new BadRequestException('Invalid patient ID format');
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
      throw new NotFoundException('Patient not found');
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
      throw new BadRequestException('Invalid patient ID format');
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
      throw new NotFoundException('Patient not found');
    }

    return patient;
  }

  /**
   * Get patient statistics
   */
  async getPatientStats(): Promise<PatientStatsDto> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalPatients,
      activePatients,
      malePatients,
      femalePatients,
      patientsWithInsurance,
      patientsWithPortalAccess,
      recentPatients,
      avgAgeResult,
    ] = await Promise.all([
      // Total patients
      this.patientModel.countDocuments({ deletedAt: { $exists: false } }),

      // Active patients (not deleted)
      this.patientModel.countDocuments({ deletedAt: { $exists: false } }),

      // Male patients
      this.patientModel.countDocuments({
        gender: 'male',
        deletedAt: { $exists: false },
      }),

      // Female patients
      this.patientModel.countDocuments({
        gender: 'female',
        deletedAt: { $exists: false },
      }),

      // Patients with insurance
      this.patientModel.countDocuments({
        insuranceProvider: { $exists: true, $ne: '' },
        deletedAt: { $exists: false },
      }),

      // Patients with portal access
      this.patientModel.countDocuments({
        isPortalEnabled: true,
        deletedAt: { $exists: false },
      }),

      // Recent patients (last 30 days)
      this.patientModel.countDocuments({
        createdAt: { $gte: thirtyDaysAgo },
        deletedAt: { $exists: false },
      }),

      // Average age
      this.patientModel.aggregate([
        {
          $match: {
            deletedAt: { $exists: false },
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

    return {
      totalPatients,
      activePatients,
      malePatients,
      femalePatients,
      avgAge: avgAgeResult[0]?.avgAge || 0,
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
