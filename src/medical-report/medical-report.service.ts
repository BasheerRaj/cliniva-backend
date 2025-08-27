import { 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  ConflictException,
  ForbiddenException,
  Logger
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MedicalReport } from '../database/schemas/medical-report.schema';
import { Appointment } from '../database/schemas/appointment.schema';
import { Patient } from '../database/schemas/patient.schema';
import { User } from '../database/schemas/user.schema';
import { 
  CreateMedicalReportDto, 
  UpdateMedicalReportDto, 
  MedicalReportSearchQueryDto,
  ShareMedicalReportDto,
  BulkCreateMedicalReportDto,
  MedicalReportStatsDto,
  PatientMedicalHistoryDto,
  DoctorReportStatsDto,
  MedicalReportSummaryDto,
  GenerateMedicalReportPdfDto,
  MedicalReportFilterDto
} from './dto';

@Injectable()
export class MedicalReportService {
  private readonly logger = new Logger(MedicalReportService.name);

  constructor(
    @InjectModel('MedicalReport') private readonly medicalReportModel: Model<MedicalReport>,
    @InjectModel('Appointment') private readonly appointmentModel: Model<Appointment>,
    @InjectModel('Patient') private readonly patientModel: Model<Patient>,
    @InjectModel('User') private readonly userModel: Model<User>,
  ) {}

  /**
   * Validate medical report data
   */
  private async validateMedicalReportData(
    reportDto: CreateMedicalReportDto | UpdateMedicalReportDto,
    isUpdate = false,
    reportId?: string
  ): Promise<void> {
    // For creation, validate all required entities
    if (!isUpdate) {
      const createDto = reportDto as CreateMedicalReportDto;

      // Validate appointment exists and is completed
      const appointment = await this.appointmentModel.findOne({ 
        _id: new Types.ObjectId(createDto.appointmentId),
        deletedAt: { $exists: false }
      });

      if (!appointment) {
        throw new NotFoundException('Appointment not found');
      }

      if (appointment.status !== 'completed') {
        throw new BadRequestException('Medical report can only be created for completed appointments');
      }

      // Check if report already exists for this appointment
      const existingReport = await this.medicalReportModel.findOne({
        appointmentId: new Types.ObjectId(createDto.appointmentId),
        deletedAt: { $exists: false }
      });

      if (existingReport) {
        throw new ConflictException('Medical report already exists for this appointment');
      }

      // Validate patient exists
      const patient = await this.patientModel.findOne({ 
        _id: new Types.ObjectId(createDto.patientId),
        deletedAt: { $exists: false }
      });

      if (!patient) {
        throw new NotFoundException('Patient not found');
      }

      // Validate doctor exists and is active
      const doctor = await this.userModel.findOne({ 
        _id: new Types.ObjectId(createDto.doctorId),
        role: { $in: ['doctor', 'admin', 'owner'] },
        isActive: true
      });

      if (!doctor) {
        throw new NotFoundException('Doctor not found or inactive');
      }

      // Validate that the doctor is the same as in the appointment
      if (appointment.doctorId.toString() !== createDto.doctorId) {
        throw new BadRequestException('Doctor must match the appointment doctor');
      }

      // Validate that the patient is the same as in the appointment
      if (appointment.patientId.toString() !== createDto.patientId) {
        throw new BadRequestException('Patient must match the appointment patient');
      }
    }

    // Validate content lengths
    if (reportDto.diagnosis && reportDto.diagnosis.trim().length === 0) {
      throw new BadRequestException('Diagnosis cannot be empty if provided');
    }

    if (reportDto.treatmentPlan && reportDto.treatmentPlan.trim().length === 0) {
      throw new BadRequestException('Treatment plan cannot be empty if provided');
    }
  }

  /**
   * Create a new medical report
   */
  async createMedicalReport(
    createMedicalReportDto: CreateMedicalReportDto,
    createdByUserId?: string
  ): Promise<MedicalReport> {
    this.logger.log(`Creating medical report for appointment ${createMedicalReportDto.appointmentId}`);

    await this.validateMedicalReportData(createMedicalReportDto);

    const reportData = {
      ...createMedicalReportDto,
      appointmentId: new Types.ObjectId(createMedicalReportDto.appointmentId),
      patientId: new Types.ObjectId(createMedicalReportDto.patientId),
      doctorId: new Types.ObjectId(createMedicalReportDto.doctorId),
      createdBy: createdByUserId ? new Types.ObjectId(createdByUserId) : undefined,
      nextAppointmentRecommended: createMedicalReportDto.nextAppointmentRecommended || false,
      isVisibleToPatient: createMedicalReportDto.isVisibleToPatient !== undefined ? 
        createMedicalReportDto.isVisibleToPatient : true,
      version: 1,
    };

    const medicalReport = new this.medicalReportModel(reportData);
    const savedReport = await medicalReport.save();
    
    this.logger.log(`Medical report created successfully with ID: ${savedReport._id}`);
    return savedReport;
  }

  /**
   * Get medical reports with filtering and pagination
   */
  async getMedicalReports(query: MedicalReportSearchQueryDto): Promise<{
    reports: MedicalReport[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      search,
      appointmentId,
      patientId,
      doctorId,
      createdBy,
      nextAppointmentRecommended,
      isVisibleToPatient,
      dateFrom,
      dateTo,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query;

    // Build filter object
    const filter: any = {
      deletedAt: { $exists: false }
    };

    // Individual field filters
    if (appointmentId) filter.appointmentId = new Types.ObjectId(appointmentId);
    if (patientId) filter.patientId = new Types.ObjectId(patientId);
    if (doctorId) filter.doctorId = new Types.ObjectId(doctorId);
    if (createdBy) filter.createdBy = new Types.ObjectId(createdBy);
    if (nextAppointmentRecommended !== undefined) filter.nextAppointmentRecommended = nextAppointmentRecommended;
    if (isVisibleToPatient !== undefined) filter.isVisibleToPatient = isVisibleToPatient;

    // Date filtering
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    // Search across text fields
    if (search) {
      filter.$or = [
        { diagnosis: { $regex: search, $options: 'i' } },
        { symptoms: { $regex: search, $options: 'i' } },
        { treatmentPlan: { $regex: search, $options: 'i' } },
        { medications: { $regex: search, $options: 'i' } },
        { followUpInstructions: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.max(1, Math.min(100, parseInt(limit)));
    const skip = (pageNum - 1) * pageSize;

    // Sorting
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [reports, total] = await Promise.all([
      this.medicalReportModel
        .find(filter)
        .populate('appointmentId', 'appointmentDate appointmentTime status')
        .populate('patientId', 'firstName lastName dateOfBirth phone email')
        .populate('doctorId', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName')
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .exec(),
      this.medicalReportModel.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      reports,
      total,
      page: pageNum,
      totalPages
    };
  }

  /**
   * Get medical report by ID
   */
  async getMedicalReportById(reportId: string): Promise<MedicalReport> {
    if (!Types.ObjectId.isValid(reportId)) {
      throw new BadRequestException('Invalid medical report ID format');
    }

    const report = await this.medicalReportModel
      .findOne({ 
        _id: new Types.ObjectId(reportId),
        deletedAt: { $exists: false }
      })
      .populate({
        path: 'appointmentId',
        select: 'appointmentDate appointmentTime status serviceId',
        populate: {
          path: 'serviceId',
          select: 'name description'
        }
      })
      .populate('patientId', 'firstName lastName dateOfBirth phone email address')
      .populate('doctorId', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email')
      .exec();

    if (!report) {
      throw new NotFoundException('Medical report not found');
    }

    return report;
  }

  /**
   * Update medical report
   */
  async updateMedicalReport(
    reportId: string,
    updateMedicalReportDto: UpdateMedicalReportDto,
    updatedByUserId?: string
  ): Promise<MedicalReport> {
    if (!Types.ObjectId.isValid(reportId)) {
      throw new BadRequestException('Invalid medical report ID format');
    }

    this.logger.log(`Updating medical report: ${reportId}`);

    await this.validateMedicalReportData(updateMedicalReportDto, true, reportId);

    // Get current report to increment version
    const currentReport = await this.getMedicalReportById(reportId);
    
    const updateData: any = {
      ...updateMedicalReportDto,
      updatedBy: updatedByUserId ? new Types.ObjectId(updatedByUserId) : undefined,
      version: currentReport.version + 1,
    };

    const report = await this.medicalReportModel
      .findOneAndUpdate(
        { 
          _id: new Types.ObjectId(reportId),
          deletedAt: { $exists: false }
        },
        { $set: updateData },
        { new: true, runValidators: true }
      )
      .exec();

    if (!report) {
      throw new NotFoundException('Medical report not found');
    }

    this.logger.log(`Medical report updated successfully: ${reportId}`);
    return report;
  }

  /**
   * Soft delete medical report
   */
  async deleteMedicalReport(reportId: string, deletedByUserId?: string): Promise<void> {
    if (!Types.ObjectId.isValid(reportId)) {
      throw new BadRequestException('Invalid medical report ID format');
    }

    this.logger.log(`Soft deleting medical report: ${reportId}`);

    const result = await this.medicalReportModel
      .findOneAndUpdate(
        { 
          _id: new Types.ObjectId(reportId),
          deletedAt: { $exists: false }
        },
        { 
          $set: {
            deletedAt: new Date(),
            updatedBy: deletedByUserId ? new Types.ObjectId(deletedByUserId) : undefined,
          }
        }
      )
      .exec();

    if (!result) {
      throw new NotFoundException('Medical report not found');
    }

    this.logger.log(`Medical report soft deleted successfully: ${reportId}`);
  }

  /**
   * Share medical report with users
   */
  async shareMedicalReport(
    reportId: string,
    shareDto: ShareMedicalReportDto,
    sharedByUserId?: string
  ): Promise<{ success: boolean; message: string; sharedWith: string[] }> {
    const report = await this.getMedicalReportById(reportId);

    // Validate users exist
    const users = await this.userModel.find({
      _id: { $in: shareDto.shareWithUserIds.map(id => new Types.ObjectId(id)) },
      isActive: true
    });

    if (users.length !== shareDto.shareWithUserIds.length) {
      throw new BadRequestException('One or more users not found or inactive');
    }

    // Update report visibility if sharing with patient
    if (shareDto.shareWithPatient && !report.isVisibleToPatient) {
      await this.updateMedicalReport(
        reportId,
        { isVisibleToPatient: true },
        sharedByUserId
      );
    }

    // In a real implementation, you would:
    // 1. Create sharing records in a separate collection
    // 2. Send notifications to shared users
    // 3. Log the sharing activity

    this.logger.log(`Medical report ${reportId} shared with ${shareDto.shareWithUserIds.length} users`);

    return {
      success: true,
      message: 'Medical report shared successfully',
      sharedWith: shareDto.shareWithUserIds
    };
  }

  /**
   * Get patient's medical history
   */
  async getPatientMedicalHistory(patientId: string): Promise<PatientMedicalHistoryDto> {
    if (!Types.ObjectId.isValid(patientId)) {
      throw new BadRequestException('Invalid patient ID format');
    }

    const patient = await this.patientModel.findOne({
      _id: new Types.ObjectId(patientId),
      deletedAt: { $exists: false }
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const reports = await this.medicalReportModel
      .find({
        patientId: new Types.ObjectId(patientId),
        deletedAt: { $exists: false }
      })
      .populate('appointmentId', 'appointmentDate appointmentTime')
      .populate('doctorId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .exec();

    const totalReports = reports.length;
    const latestReport = reports.length > 0 ? this.mapToSummaryDto(reports[0]) : undefined;

    // Extract common diagnoses
    const diagnosisMap = new Map<string, number>();
    reports.forEach(report => {
      if (report.diagnosis) {
        const diagnosis = report.diagnosis.trim();
        diagnosisMap.set(diagnosis, (diagnosisMap.get(diagnosis) || 0) + 1);
      }
    });

    const commonDiagnoses = Array.from(diagnosisMap.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([diagnosis]) => diagnosis);

    // Extract current medications (from latest reports)
    const recentReports = reports.slice(0, 3);
    const currentMedications = Array.from(new Set(
      recentReports
        .filter(report => report.medications)
        .map(report => report.medications!.split(',').map(med => med.trim()))
        .flat()
    )).slice(0, 10);

    // Count pending follow-ups
    const pendingFollowUps = reports.filter(report => report.nextAppointmentRecommended).length;

    const reportSummaries = reports.map(report => this.mapToSummaryDto(report));

    return {
      patientId,
      patientName: `${patient.firstName} ${patient.lastName}`,
      totalReports,
      latestReport,
      commonDiagnoses,
      currentMedications,
      pendingFollowUps,
      reports: reportSummaries
    };
  }

  /**
   * Get doctor's report statistics
   */
  async getDoctorReportStats(doctorId: string): Promise<DoctorReportStatsDto> {
    if (!Types.ObjectId.isValid(doctorId)) {
      throw new BadRequestException('Invalid doctor ID format');
    }

    const doctor = await this.userModel.findOne({
      _id: new Types.ObjectId(doctorId),
      role: { $in: ['doctor', 'admin', 'owner'] },
      isActive: true
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found or inactive');
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

    const [
      totalReports,
      reportsThisMonth,
      recentReports,
      followUpStats,
      shareStats,
      topDiagnosesResult
    ] = await Promise.all([
      this.medicalReportModel.countDocuments({
        doctorId: new Types.ObjectId(doctorId),
        deletedAt: { $exists: false }
      }),

      this.medicalReportModel.countDocuments({
        doctorId: new Types.ObjectId(doctorId),
        createdAt: { $gte: startOfMonth },
        deletedAt: { $exists: false }
      }),

      this.medicalReportModel
        .find({
          doctorId: new Types.ObjectId(doctorId),
          deletedAt: { $exists: false }
        })
        .populate('appointmentId', 'appointmentDate appointmentTime')
        .sort({ createdAt: -1 })
        .limit(10)
        .exec(),

      this.medicalReportModel.countDocuments({
        doctorId: new Types.ObjectId(doctorId),
        nextAppointmentRecommended: true,
        deletedAt: { $exists: false }
      }),

      this.medicalReportModel.countDocuments({
        doctorId: new Types.ObjectId(doctorId),
        isVisibleToPatient: true,
        deletedAt: { $exists: false }
      }),

      this.medicalReportModel.aggregate([
        {
          $match: {
            doctorId: new Types.ObjectId(doctorId),
            diagnosis: { $exists: true, $ne: '' },
            deletedAt: { $exists: false }
          }
        },
        {
          $group: {
            _id: '$diagnosis',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
    ]);

    // Calculate weekly average
    const weeksInService = Math.max(1, Math.ceil((now.getTime() - (doctor as any).createdAt.getTime()) / (7 * 24 * 60 * 60 * 1000)));
    const avgReportsPerWeek = totalReports / weeksInService;

    const followUpRecommendationRate = totalReports > 0 ? (followUpStats / totalReports) * 100 : 0;
    const patientShareRate = totalReports > 0 ? (shareStats / totalReports) * 100 : 0;

    const topDiagnoses = topDiagnosesResult.map(item => ({
      diagnosis: item._id,
      count: item.count
    }));

    const recentReportSummaries = recentReports.map(report => this.mapToSummaryDto(report));

    return {
      doctorId,
      doctorName: `${doctor.firstName} ${doctor.lastName}`,
      totalReports,
      reportsThisMonth,
      avgReportsPerWeek: Math.round(avgReportsPerWeek * 100) / 100,
      followUpRecommendationRate: Math.round(followUpRecommendationRate * 100) / 100,
      patientShareRate: Math.round(patientShareRate * 100) / 100,
      topDiagnoses,
      recentReports: recentReportSummaries
    };
  }

  /**
   * Get medical report statistics
   */
  async getMedicalReportStats(): Promise<MedicalReportStatsDto> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalReports,
      reportsThisMonth,
      reportsThisWeek,
      reportsToday,
      reportsWithFollowUp,
      reportsSharedWithPatients,
      topDiagnosesResult,
      topDoctorsResult,
      monthlyTrendResult
    ] = await Promise.all([
      // Total reports
      this.medicalReportModel.countDocuments({ deletedAt: { $exists: false } }),

      // This month
      this.medicalReportModel.countDocuments({
        createdAt: { $gte: startOfMonth },
        deletedAt: { $exists: false }
      }),

      // This week
      this.medicalReportModel.countDocuments({
        createdAt: { $gte: startOfWeek },
        deletedAt: { $exists: false }
      }),

      // Today
      this.medicalReportModel.countDocuments({
        createdAt: { $gte: startOfDay },
        deletedAt: { $exists: false }
      }),

      // With follow-up recommendations
      this.medicalReportModel.countDocuments({
        nextAppointmentRecommended: true,
        deletedAt: { $exists: false }
      }),

      // Shared with patients
      this.medicalReportModel.countDocuments({
        isVisibleToPatient: true,
        deletedAt: { $exists: false }
      }),

      // Top diagnoses
      this.medicalReportModel.aggregate([
        {
          $match: {
            diagnosis: { $exists: true, $ne: '' },
            deletedAt: { $exists: false }
          }
        },
        {
          $group: {
            _id: '$diagnosis',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),

      // Top doctors
      this.medicalReportModel.aggregate([
        {
          $match: { deletedAt: { $exists: false } }
        },
        {
          $group: {
            _id: '$doctorId',
            count: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'doctor'
          }
        },
        { $unwind: '$doctor' },
        {
          $project: {
            doctorId: '$_id',
            doctorName: { $concat: ['$doctor.firstName', ' ', '$doctor.lastName'] },
            reportCount: '$count'
          }
        },
        { $sort: { reportCount: -1 } },
        { $limit: 5 }
      ]),

      // Monthly trend (last 6 months)
      this.medicalReportModel.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) },
            deletedAt: { $exists: false }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ])
    ]);

    // Calculate averages and percentages
    const averageReportsPerDay = totalReports > 0 ? totalReports / 30 : 0; // Rough estimate

    const topDiagnoses = topDiagnosesResult.map(item => ({
      diagnosis: item._id,
      count: item.count,
      percentage: totalReports > 0 ? Math.round((item.count / totalReports) * 10000) / 100 : 0
    }));

    const topDoctors = topDoctorsResult.map(item => ({
      doctorId: item.doctorId.toString(),
      doctorName: item.doctorName,
      reportCount: item.reportCount
    }));

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyTrend = monthlyTrendResult.map(item => ({
      month: `${monthNames[item._id.month - 1]} ${item._id.year}`,
      count: item.count
    }));

    const followUpRecommendationRate = totalReports > 0 ? (reportsWithFollowUp / totalReports) * 100 : 0;
    const patientVisibilityRate = totalReports > 0 ? (reportsSharedWithPatients / totalReports) * 100 : 0;

    return {
      totalReports,
      reportsThisMonth,
      reportsThisWeek,
      reportsToday,
      averageReportsPerDay: Math.round(averageReportsPerDay * 100) / 100,
      reportsWithFollowUp,
      reportsSharedWithPatients,
      topDiagnoses,
      topDoctors,
      monthlyTrend,
      followUpRecommendationRate: Math.round(followUpRecommendationRate * 100) / 100,
      patientVisibilityRate: Math.round(patientVisibilityRate * 100) / 100
    };
  }

  /**
   * Get reports by appointment ID
   */
  async getReportByAppointmentId(appointmentId: string): Promise<MedicalReport | null> {
    if (!Types.ObjectId.isValid(appointmentId)) {
      throw new BadRequestException('Invalid appointment ID format');
    }

    return await this.medicalReportModel
      .findOne({
        appointmentId: new Types.ObjectId(appointmentId),
        deletedAt: { $exists: false }
      })
      .populate('patientId', 'firstName lastName')
      .populate('doctorId', 'firstName lastName')
      .exec();
  }

  /**
   * Get reports requiring follow-up
   */
  async getReportsRequiringFollowUp(): Promise<MedicalReport[]> {
    return await this.medicalReportModel
      .find({
        nextAppointmentRecommended: true,
        deletedAt: { $exists: false }
      })
      .populate('patientId', 'firstName lastName phone email')
      .populate('doctorId', 'firstName lastName')
      .populate('appointmentId', 'appointmentDate')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Helper method to map medical report to summary DTO
   */
  private mapToSummaryDto(report: MedicalReport): MedicalReportSummaryDto {
    const appointment = report.appointmentId as any;
    const doctor = report.doctorId as any;

    return {
      reportId: (report as any)._id.toString(),
      appointmentDate: appointment?.appointmentDate || new Date(),
      doctorName: doctor ? `${doctor.firstName} ${doctor.lastName}` : 'Unknown Doctor',
      diagnosis: report.diagnosis || 'No diagnosis provided',
      hasFollowUp: report.nextAppointmentRecommended,
      isSharedWithPatient: report.isVisibleToPatient,
      createdAt: (report as any).createdAt,
      version: report.version
    };
  }

  /**
   * Search medical reports with advanced filters
   */
  async searchMedicalReports(
    searchTerm: string,
    filters?: MedicalReportFilterDto,
    limit: number = 20
  ): Promise<MedicalReport[]> {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return [];
    }

    const filter: any = {
      deletedAt: { $exists: false },
      $or: [
        { diagnosis: { $regex: searchTerm, $options: 'i' } },
        { symptoms: { $regex: searchTerm, $options: 'i' } },
        { treatmentPlan: { $regex: searchTerm, $options: 'i' } },
        { medications: { $regex: searchTerm, $options: 'i' } }
      ]
    };

    // Apply additional filters
    if (filters) {
      if (filters.diagnoses && filters.diagnoses.length > 0) {
        filter.diagnosis = { $in: filters.diagnoses.map(d => new RegExp(d, 'i')) };
      }

      if (filters.doctorIds && filters.doctorIds.length > 0) {
        filter.doctorId = { $in: filters.doctorIds.map(id => new Types.ObjectId(id)) };
      }

      if (filters.hasFollowUp !== undefined) {
        filter.nextAppointmentRecommended = filters.hasFollowUp;
      }

      if (filters.isSharedWithPatient !== undefined) {
        filter.isVisibleToPatient = filters.isSharedWithPatient;
      }

      if (filters.dateRange) {
        const now = new Date();
        let startDate: Date;

        switch (filters.dateRange) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'quarter':
            startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          default:
            startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        }

        filter.createdAt = { $gte: startDate };
      }
    }

    return await this.medicalReportModel
      .find(filter)
      .populate('patientId', 'firstName lastName')
      .populate('doctorId', 'firstName lastName')
      .populate('appointmentId', 'appointmentDate appointmentTime')
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 50))
      .exec();
  }
} 