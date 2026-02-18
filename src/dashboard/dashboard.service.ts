import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../database/schemas/user.schema';
import { Appointment } from '../database/schemas/appointment.schema';
import { Patient } from '../database/schemas/patient.schema';
import { AuditLog } from '../database/schemas/audit-log.schema';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Appointment.name) private appointmentModel: Model<Appointment>,
    @InjectModel(Patient.name) private patientModel: Model<Patient>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLog>,
  ) {}

  /**
   * Get Admin Dashboard data
   * UC-a9b8c7d: Admin Dashboard (counts, activity_charts, growth_charts)
   */
  async getAdminDashboard(period: string = 'month') {
    const today = new Date();
    const startDate = this.getStartDate(period);

    const [userCounts, appointmentStats, patientTotal, growthData, activityData] = await Promise.all([
      this.userModel.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),
      this.getAppointmentStatsSummary(),
      this.patientModel.countDocuments({ deletedAt: { $exists: false } }),
      this.getGrowthData(startDate),
      this.getActivityData(startDate)
    ]);

    // Process user counts into a cleaner object
    const roleCounts = {
      total: 0,
      admin: 0,
      doctor: 0,
      staff: 0,
      manager: 0,
      owner: 0,
      patient: 0,
    };

    userCounts.forEach(item => {
      const role = item._id as keyof typeof roleCounts;
      if (roleCounts.hasOwnProperty(role)) {
        roleCounts[role] = item.count;
        roleCounts.total += item.count;
      }
    });

    return {
      counts: {
        users: roleCounts,
        appointments: appointmentStats,
        patients: patientTotal,
      },
      growth_charts: growthData,
      activity_charts: activityData,
    };
  }

  /**
   * Get Staff Dashboard data
   * UC-dhbs47v: Staff Dashboard (appointments_overview, medical_summary)
   */
  async getStaffDashboard(clinicId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const query: any = { 
      appointmentDate: { $gte: today, $lt: tomorrow },
      deletedAt: { $exists: false }
    };
    if (clinicId) query.clinicId = new Types.ObjectId(clinicId);

    const [todayAppointments, recentPatients] = await Promise.all([
      this.appointmentModel.find(query)
        .populate('patientId', 'firstName lastName phone')
        .populate('doctorId', 'firstName lastName')
        .sort({ appointmentTime: 1 })
        .limit(20)
        .exec(),
      this.patientModel.find({ deletedAt: { $exists: false } })
        .sort({ createdAt: -1 })
        .limit(5)
        .exec()
    ]);

    return {
      appointments_overview: {
        today: todayAppointments,
        count: todayAppointments.length,
      },
      medical_summary: {
        recent_patients: recentPatients,
      }
    };
  }

  /**
   * Get Doctor Dashboard data
   * UC-s9b8c45: Doctor Dashboard (today_appointments, availability, quick_actions)
   */
  async getDoctorDashboard(doctorId?: string) {
    if (!doctorId) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayAppointments] = await Promise.all([
      this.appointmentModel.find({
        doctorId: new Types.ObjectId(doctorId),
        appointmentDate: { $gte: today, $lt: tomorrow },
        deletedAt: { $exists: false }
      })
      .populate('patientId', 'firstName lastName phone gender dateOfBirth')
      .sort({ appointmentTime: 1 })
      .exec()
    ]);

    return {
      today_appointments: todayAppointments,
      availability: {
        // This would typically come from WorkingHours and checking booked slots
        status: 'available', 
        next_free_slot: null, 
      },
      quick_actions: [
        { id: 'new_appointment', label: 'New Appointment', icon: 'plus' },
        { id: 'view_schedule', label: 'View Schedule', icon: 'calendar' },
      ]
    };
  }

  private async getAppointmentStatsSummary() {
    const stats = await this.appointmentModel.aggregate([
      { $match: { deletedAt: { $exists: false } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const summary = {
      total: 0,
      scheduled: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
    };

    stats.forEach(item => {
      const status = item._id as keyof typeof summary;
      if (summary.hasOwnProperty(status)) {
        summary[status] = item.count;
        summary.total += item.count;
      }
    });

    return summary;
  }

  private async getGrowthData(startDate: Date) {
    return this.userModel.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { 
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
  }

  private async getActivityData(startDate: Date) {
    return this.auditLogModel.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      {
        $group: {
          _id: { 
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' },
            type: '$eventType'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
  }

  private getStartDate(period: string): Date {
    const date = new Date();
    switch (period) {
      case 'week':
        date.setDate(date.getDate() - 7);
        break;
      case 'month':
        date.setMonth(date.getMonth() - 1);
        break;
      case 'year':
        date.setFullYear(date.getFullYear() - 1);
        break;
      default:
        date.setMonth(date.getMonth() - 1);
    }
    return date;
  }
}
