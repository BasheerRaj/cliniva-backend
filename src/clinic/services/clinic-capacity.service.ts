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
   * OPTIMIZED: Uses aggregation pipeline to reduce database round trips
   */
  private async calculateCapacity(
    clinicId: string,
  ): Promise<CapacityStatusResponse> {
    // Use aggregation pipeline to fetch clinic and all capacity data in one query
    const capacityAggregation = await this.clinicModel.aggregate([
      {
        $match: { _id: new Types.ObjectId(clinicId) },
      },
      {
        $lookup: {
          from: 'users',
          let: { clinicId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$clinicId', '$$clinicId'] },
                isActive: true,
                role: 'doctor',
              },
            },
            {
              $project: {
                _id: 1,
                firstName: 1,
                lastName: 1,
                email: 1,
                role: 1,
              },
            },
          ],
          as: 'doctors',
        },
      },
      {
        $lookup: {
          from: 'users',
          let: { clinicId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$clinicId', '$$clinicId'] },
                isActive: true,
                role: { $nin: ['doctor', 'patient'] },
              },
            },
            {
              $project: {
                _id: 1,
                firstName: 1,
                lastName: 1,
                email: 1,
                role: 1,
              },
            },
          ],
          as: 'staff',
        },
      },
      {
        $lookup: {
          from: 'appointments',
          let: { clinicId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$clinicId', '$$clinicId'] },
                deletedAt: null,
              },
            },
            {
              $group: {
                _id: '$patientId',
              },
            },
          ],
          as: 'uniquePatients',
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          maxDoctors: 1,
          maxStaff: 1,
          maxPatients: 1,
          doctors: 1,
          staff: 1,
          currentDoctors: { $size: '$doctors' },
          currentStaff: { $size: '$staff' },
          currentPatients: { $size: '$uniquePatients' },
        },
      },
    ]);

    // Check if clinic exists
    if (!capacityAggregation || capacityAggregation.length === 0) {
      throw new NotFoundException({
        code: 'CLINIC_007',
        message: ERROR_CODES.CLINIC_007.message,
      });
    }

    const result = capacityAggregation[0];

    // Build capacity breakdown from aggregation result
    const doctors = this.buildDoctorsCapacity(result);
    const staff = this.buildStaffCapacity(result);
    const patients = this.buildPatientsCapacity(result);

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      doctors,
      staff,
      patients,
    });

    return {
      clinicId: result._id.toString(),
      clinicName: result.name,
      capacity: { doctors, staff, patients },
      recommendations,
    };
  }

  /**
   * Build doctors capacity from aggregation result
   */
  private buildDoctorsCapacity(result: any): CapacityMetrics & {
    list: PersonnelList[];
  } {
    const maxDoctors = result.maxDoctors || 0;
    const currentDoctors = result.currentDoctors || 0;
    const available = maxDoctors - currentDoctors;
    const percentage =
      maxDoctors > 0 ? Math.round((currentDoctors / maxDoctors) * 100) : 0;
    const isExceeded = currentDoctors > maxDoctors;

    const list: PersonnelList[] = (result.doctors || []).map((doc: any) => ({
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
   * Build staff capacity from aggregation result
   */
  private buildStaffCapacity(result: any): CapacityMetrics & {
    list: PersonnelList[];
  } {
    const maxStaff = result.maxStaff || 0;
    const currentStaff = result.currentStaff || 0;
    const available = maxStaff - currentStaff;
    const percentage =
      maxStaff > 0 ? Math.round((currentStaff / maxStaff) * 100) : 0;
    const isExceeded = currentStaff > maxStaff;

    const list: PersonnelList[] = (result.staff || []).map((staff: any) => ({
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
   * Build patients capacity from aggregation result
   */
  private buildPatientsCapacity(result: any): CapacityMetrics & {
    count: number;
  } {
    const maxPatients = result.maxPatients || 0;
    const currentPatients = result.currentPatients || 0;
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
