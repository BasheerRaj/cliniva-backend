import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DoctorSpecialty } from '../database/schemas/doctor-specialty.schema';
import { User } from '../database/schemas/user.schema';
import { Specialty } from '../database/schemas/specialty.schema';
import {
  CreateDoctorSpecialtyDto,
  UpdateDoctorSpecialtyDto,
  DoctorSpecialtySearchDto,
  BulkAssignSpecialtiesDto,
} from './dto';

@Injectable()
export class DoctorSpecialtiesService {
  private readonly logger = new Logger(DoctorSpecialtiesService.name);

  constructor(
    @InjectModel('DoctorSpecialty')
    private readonly doctorSpecialtyModel: Model<DoctorSpecialty>,
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('Specialty') private readonly specialtyModel: Model<Specialty>,
  ) {}

  /**
   * Assign specialty to doctor
   */
  async assignSpecialtyToDoctor(
    createDto: CreateDoctorSpecialtyDto,
  ): Promise<DoctorSpecialty> {
    this.logger.log(
      `Assigning specialty ${createDto.specialtyId} to doctor ${createDto.doctorId}`,
    );

    // Validate doctor exists and has doctor role
    const doctor = await this.userModel.findById(createDto.doctorId);
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    if (doctor.role !== 'doctor') {
      throw new BadRequestException('User is not a doctor');
    }

    // Validate specialty exists
    const specialty = await this.specialtyModel.findById(createDto.specialtyId);
    if (!specialty) {
      throw new NotFoundException('Specialty not found');
    }

    // Check if assignment already exists
    const existingAssignment = await this.doctorSpecialtyModel.findOne({
      doctorId: new Types.ObjectId(createDto.doctorId),
      specialtyId: new Types.ObjectId(createDto.specialtyId),
    });

    if (existingAssignment) {
      throw new ConflictException(
        'Doctor is already assigned to this specialty',
      );
    }

    const assignmentData = {
      doctorId: new Types.ObjectId(createDto.doctorId),
      specialtyId: new Types.ObjectId(createDto.specialtyId),
      yearsOfExperience: createDto.yearsOfExperience || 0,
      certificationNumber: createDto.certificationNumber,
    };

    const assignment = new this.doctorSpecialtyModel(assignmentData);
    const savedAssignment = await assignment.save();

    this.logger.log(`Specialty assigned successfully: ${savedAssignment._id}`);
    return savedAssignment;
  }

  /**
   * Get doctor's specialties
   */
  async getDoctorSpecialties(doctorId: string): Promise<DoctorSpecialty[]> {
    if (!Types.ObjectId.isValid(doctorId)) {
      throw new BadRequestException('Invalid doctor ID format');
    }

    this.logger.log(`Fetching specialties for doctor: ${doctorId}`);

    const specialties = await this.doctorSpecialtyModel
      .find({ doctorId: new Types.ObjectId(doctorId) })
      .populate('specialtyId', 'name description')
      .populate('doctorId', 'firstName lastName email')
      .exec();

    return specialties;
  }

  /**
   * Get doctors by specialty
   */
  async getDoctorsBySpecialty(specialtyId: string): Promise<DoctorSpecialty[]> {
    if (!Types.ObjectId.isValid(specialtyId)) {
      throw new BadRequestException('Invalid specialty ID format');
    }

    this.logger.log(`Fetching doctors for specialty: ${specialtyId}`);

    const doctors = await this.doctorSpecialtyModel
      .find({ specialtyId: new Types.ObjectId(specialtyId) })
      .populate('doctorId', 'firstName lastName email')
      .populate('specialtyId', 'name description')
      .exec();

    return doctors;
  }

  /**
   * Get assignment by ID
   */
  async getAssignmentById(assignmentId: string): Promise<DoctorSpecialty> {
    if (!Types.ObjectId.isValid(assignmentId)) {
      throw new BadRequestException('Invalid assignment ID format');
    }

    const assignment = await this.doctorSpecialtyModel
      .findById(assignmentId)
      .populate('doctorId', 'firstName lastName email')
      .populate('specialtyId', 'name description')
      .exec();

    if (!assignment) {
      throw new NotFoundException('Doctor specialty assignment not found');
    }

    return assignment;
  }

  /**
   * Update specialty assignment
   */
  async updateAssignment(
    assignmentId: string,
    updateDto: UpdateDoctorSpecialtyDto,
  ): Promise<DoctorSpecialty> {
    if (!Types.ObjectId.isValid(assignmentId)) {
      throw new BadRequestException('Invalid assignment ID format');
    }

    this.logger.log(`Updating assignment: ${assignmentId}`);

    const assignment = await this.doctorSpecialtyModel
      .findByIdAndUpdate(
        assignmentId,
        { $set: updateDto },
        { new: true, runValidators: true },
      )
      .populate('doctorId', 'firstName lastName email')
      .populate('specialtyId', 'name description')
      .exec();

    if (!assignment) {
      throw new NotFoundException('Doctor specialty assignment not found');
    }

    this.logger.log(`Assignment updated successfully: ${assignmentId}`);
    return assignment;
  }

  /**
   * Remove specialty assignment
   */
  async removeSpecialtyAssignment(assignmentId: string): Promise<void> {
    if (!Types.ObjectId.isValid(assignmentId)) {
      throw new BadRequestException('Invalid assignment ID format');
    }

    this.logger.log(`Removing assignment: ${assignmentId}`);

    const result =
      await this.doctorSpecialtyModel.findByIdAndDelete(assignmentId);
    if (!result) {
      throw new NotFoundException('Doctor specialty assignment not found');
    }

    this.logger.log(`Assignment removed successfully: ${assignmentId}`);
  }

  /**
   * Search assignments with filters
   */
  async searchAssignments(query: DoctorSpecialtySearchDto): Promise<{
    data: DoctorSpecialty[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      doctorId,
      specialtyId,
      search,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    // Build filter
    const filter: any = {};

    if (doctorId && Types.ObjectId.isValid(doctorId)) {
      filter.doctorId = new Types.ObjectId(doctorId);
    }
    if (specialtyId && Types.ObjectId.isValid(specialtyId)) {
      filter.specialtyId = new Types.ObjectId(specialtyId);
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.max(1, Math.min(100, parseInt(limit)));
    const skip = (pageNum - 1) * pageSize;

    // Sorting
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Build aggregation pipeline for search
    const pipeline: any[] = [
      { $match: filter },
      {
        $lookup: {
          from: 'users',
          localField: 'doctorId',
          foreignField: '_id',
          as: 'doctor',
        },
      },
      {
        $lookup: {
          from: 'specialties',
          localField: 'specialtyId',
          foreignField: '_id',
          as: 'specialty',
        },
      },
      { $unwind: { path: '$doctor', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$specialty', preserveNullAndEmptyArrays: true } },
    ];

    // Add search filter if provided
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { 'doctor.firstName': { $regex: search, $options: 'i' } },
            { 'doctor.lastName': { $regex: search, $options: 'i' } },
            { 'doctor.email': { $regex: search, $options: 'i' } },
            { 'specialty.name': { $regex: search, $options: 'i' } },
            { certificationNumber: { $regex: search, $options: 'i' } },
          ],
        },
      });
    }

    // Get total count
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult =
      await this.doctorSpecialtyModel.aggregate(countPipeline);
    const total = countResult.length > 0 ? countResult[0].total : 0;

    // Add pagination and sorting
    pipeline.push({ $sort: sort }, { $skip: skip }, { $limit: pageSize });

    const data = await this.doctorSpecialtyModel.aggregate(pipeline);
    const totalPages = Math.ceil(total / pageSize);

    return {
      data,
      total,
      page: pageNum,
      totalPages,
    };
  }

  /**
   * Bulk assign specialties to doctor
   */
  async bulkAssignSpecialties(bulkDto: BulkAssignSpecialtiesDto): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    this.logger.log(
      `Bulk assigning specialties to doctor: ${bulkDto.doctorId}`,
    );

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const specialtyId of bulkDto.specialtyIds) {
      try {
        await this.assignSpecialtyToDoctor({
          doctorId: bulkDto.doctorId,
          specialtyId,
          yearsOfExperience: bulkDto.yearsOfExperience,
        });
        success++;
      } catch (error) {
        failed++;
        errors.push(`Specialty ${specialtyId}: ${error.message}`);
      }
    }

    return { success, failed, errors };
  }

  /**
   * Get all assignments for analytics
   */
  async getAssignmentStats(): Promise<{
    totalAssignments: number;
    doctorsWithSpecialties: number;
    specialtiesAssigned: number;
    topSpecialties: Array<{ specialtyName: string; doctorCount: number }>;
    averageExperience: number;
  }> {
    const [
      totalAssignments,
      doctorStats,
      specialtyStats,
      topSpecialtiesResult,
      experienceStats,
    ] = await Promise.all([
      this.doctorSpecialtyModel.countDocuments({}),
      this.doctorSpecialtyModel.distinct('doctorId'),
      this.doctorSpecialtyModel.distinct('specialtyId'),
      this.doctorSpecialtyModel.aggregate([
        {
          $lookup: {
            from: 'specialties',
            localField: 'specialtyId',
            foreignField: '_id',
            as: 'specialty',
          },
        },
        { $unwind: '$specialty' },
        {
          $group: {
            _id: '$specialtyId',
            specialtyName: { $first: '$specialty.name' },
            doctorCount: { $sum: 1 },
          },
        },
        { $sort: { doctorCount: -1 } },
        { $limit: 10 },
      ]),
      this.doctorSpecialtyModel.aggregate([
        {
          $group: {
            _id: null,
            averageExperience: { $avg: '$yearsOfExperience' },
          },
        },
      ]),
    ]);

    return {
      totalAssignments,
      doctorsWithSpecialties: doctorStats.length,
      specialtiesAssigned: specialtyStats.length,
      topSpecialties: topSpecialtiesResult.map((item) => ({
        specialtyName: item.specialtyName,
        doctorCount: item.doctorCount,
      })),
      averageExperience:
        experienceStats.length > 0
          ? Math.round(experienceStats[0].averageExperience * 100) / 100
          : 0,
    };
  }
}
