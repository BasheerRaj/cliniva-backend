import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Clinic } from '../../database/schemas/clinic.schema';
import { User } from '../../database/schemas/user.schema';
import { Appointment } from '../../database/schemas/appointment.schema';
import { ERROR_CODES } from '../constants/error-codes.constant';

/**
 * Capacity metrics for a specific resource type (doctors, staff, patients)
 */
export interface CapacityMetrics {
  max: number;
  current: number;
  available: number;
  percentage: number;
  isExceeded: boolean;
}

/**
 * Personnel information for capacity breakdown
 */
export interface PersonnelList {
  id: string;
  name: string;
  role: string;
  email?: string;
}

/**
 * Complete capacity breakdown with personnel lists
 */
export interface CapacityBreakdown {
  doctors: CapacityMetrics & { list: PersonnelList[] };
  staff: CapacityMetrics & { list: PersonnelList[] };
  patients: CapacityMetrics & { count: number };
}

/**
 * Complete capacity status response
 */
export interface CapacityStatusResponse {
  clinicId: string;
  clinicName: string;
  capacity: CapacityBreakdown;
  recommendations: string[];
}

/**
 * Service for calculating and tracking clinic capacity status
 * Implements BZR-39: Capacity highlighting when exceeded
 */
@Injectable()
export class ClinicCapacityService {
  private capacityCache = new Map<
    string,
    { data: CapacityStatusResponse; timestamp: number }
  >();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectModel('Clinic') private readonly clinicModel: Model<Clinic>,
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('Appointment')
    private readonly appointmentModel: Model<Appointment>,
  ) {}

  /**
   * Get complete capacity status for a clinic
   * BZR-39: Capacity highlighting when exceeded
   *
   * @param clinicId - Clinic ID
   * @returns Complete capacity breakdown with personnel lists
   */
  async getCapacityStatus(clinicId: string): Promise<CapacityStatusResponse> {
    // Check cache first
    const cached = this.capacityCache.get(clinicId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    // Calculate capacity
    const result = await this.calculateCapacity(clinicId);

    // Cache the result
    this.capacityCache.set(clinicId, {
      data: result,
      timestamp: Date.now(),
    });

    return result;
  }

  /**
   * Invalidate cache for a specific clinic
   * Should be called when clinic data is updated
   *
   * @param clinicId - Clinic ID to invalidate cache for
   */
  invalidateCache(clinicId: string): void {
    this.capacityCache.delete(clinicId);
  }

  /**
   * Clear all cached capacity data
   */
  clearCache(): void {
    this.capacityCache.clear();
  }

  /**
   * Calculate capacity without caching
   * Private method used by getCapacityStatus
   */
  private async calculateCapacity(
    clinicId: string,
  ): Promise<CapacityStatusResponse> {
    // 1. Validate clinic exists
    const clinic = await this.clinicModel.findById(clinicId);
    if (!clinic) {
      throw new NotFoundException({
        code: 'CLINIC_007',
        message: ERROR_CODES.CLINIC_007.message,
      });
    }

    // 2. Calculate doctors capacity with personnel list
    const doctors = await this.calculateDoctorsCapacity(clinicId, clinic);

    // 3. Calculate staff capacity with personnel list
    const staff = await this.calculateStaffCapacity(clinicId, clinic);

    // 4. Calculate patients capacity
    const patients = await this.calculatePatientsCapacity(clinicId, clinic);

    // 5. Generate recommendations
    const recommendations = this.generateRecommendations({
      doctors,
      staff,
      patients,
    });

    return {
      clinicId,
      clinicName: clinic.name,
      capacity: { doctors, staff, patients },
      recommendations,
    };
  }

  /**
   * Calculate doctors capacity with personnel list
   */
  private async calculateDoctorsCapacity(
    clinicId: string,
    clinic: Clinic,
  ): Promise<CapacityMetrics & { list: PersonnelList[] }> {
    const maxDoctors = clinic.maxDoctors || 0;

    // Get all active doctors assigned to this clinic
    const doctorsList = await this.userModel
      .find({
        clinicId: new Types.ObjectId(clinicId),
        role: 'doctor',
        isActive: true,
      })
      .select('_id firstName lastName email role')
      .lean();

    const currentDoctors = doctorsList.length;
    const available = maxDoctors - currentDoctors;
    const percentage =
      maxDoctors > 0 ? Math.round((currentDoctors / maxDoctors) * 100) : 0;
    const isExceeded = currentDoctors > maxDoctors;

    const list: PersonnelList[] = doctorsList.map((doc) => ({
      id: doc._id.toString(),
      name: `${doc.firstName} ${doc.lastName}`,
      role: doc.role,
      email: doc.email,
    }));

    return {
      max: maxDoctors,
      current: currentDoctors,
      available,
      percentage,
      isExceeded,
      list,
    };
  }

  /**
   * Calculate staff capacity with personnel list
   */
  private async calculateStaffCapacity(
    clinicId: string,
    clinic: Clinic,
  ): Promise<CapacityMetrics & { list: PersonnelList[] }> {
    const maxStaff = clinic.maxStaff || 0;

    // Get all active staff (non-doctor, non-patient roles)
    const staffList = await this.userModel
      .find({
        clinicId: new Types.ObjectId(clinicId),
        role: { $nin: ['doctor', 'patient'] },
        isActive: true,
      })
      .select('_id firstName lastName email role')
      .lean();

    const currentStaff = staffList.length;
    const available = maxStaff - currentStaff;
    const percentage =
      maxStaff > 0 ? Math.round((currentStaff / maxStaff) * 100) : 0;
    const isExceeded = currentStaff > maxStaff;

    const list: PersonnelList[] = staffList.map((staff) => ({
      id: staff._id.toString(),
      name: `${staff.firstName} ${staff.lastName}`,
      role: staff.role,
      email: staff.email,
    }));

    return {
      max: maxStaff,
      current: currentStaff,
      available,
      percentage,
      isExceeded,
      list,
    };
  }

  /**
   * Calculate patients capacity using aggregation
   */
  private async calculatePatientsCapacity(
    clinicId: string,
    clinic: Clinic,
  ): Promise<CapacityMetrics & { count: number }> {
    const maxPatients = clinic.maxPatients || 0;

    // Count unique patients with appointments at this clinic using aggregation
    const patientAggregation = await this.appointmentModel.aggregate([
      {
        $match: {
          clinicId: new Types.ObjectId(clinicId),
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: '$patientId',
        },
      },
      {
        $count: 'total',
      },
    ]);

    const currentPatients =
      patientAggregation.length > 0 ? patientAggregation[0].total : 0;

    const available = maxPatients - currentPatients;
    const percentage =
      maxPatients > 0 ? Math.round((currentPatients / maxPatients) * 100) : 0;
    const isExceeded = currentPatients > maxPatients;

    return {
      max: maxPatients,
      current: currentPatients,
      available,
      percentage,
      isExceeded,
      count: currentPatients,
    };
  }

  /**
   * Generate capacity recommendations based on exceeded capacities
   */
  private generateRecommendations(capacity: CapacityBreakdown): string[] {
    const recommendations: string[] = [];

    if (capacity.doctors.isExceeded) {
      recommendations.push(
        'Doctor capacity exceeded. Consider increasing maxDoctors or redistributing workload.',
      );
    }

    if (capacity.staff.isExceeded) {
      recommendations.push(
        'Staff capacity exceeded. Consider hiring more staff or increasing maxStaff limit.',
      );
    }

    if (capacity.patients.isExceeded) {
      recommendations.push(
        'Patient capacity exceeded. Consider expanding facilities or limiting patient intake.',
      );
    }

    return recommendations;
  }
}
