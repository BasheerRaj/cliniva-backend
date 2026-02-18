import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DoctorService } from '../database/schemas/doctor-service.schema';
import { Service } from '../database/schemas/service.schema';
import { User } from '../database/schemas/user.schema';
import { Clinic } from '../database/schemas/clinic.schema';
import { Appointment } from '../database/schemas/appointment.schema';
import { EmployeeShift } from '../database/schemas/employee-shift.schema';
import { EmployeeProfile } from '../database/schemas/employee-profile.schema';
import { ClinicService as ClinicServiceSchema } from '../database/schemas/clinic-service.schema';
import {
  AssignDoctorToServiceDto,
  DeactivateDoctorFromServiceDto,
  UpdateDoctorServiceNotesDto,
} from './dto/doctor-service.dto';

@Injectable()
export class DoctorServiceService {
  constructor(
    @InjectModel('DoctorService')
    private readonly doctorServiceModel: Model<DoctorService>,
    @InjectModel('Service') private readonly serviceModel: Model<Service>,
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('Clinic') private readonly clinicModel: Model<Clinic>,
    @InjectModel('Appointment')
    private readonly appointmentModel: Model<Appointment>,
    @InjectModel('EmployeeShift')
    private readonly employeeShiftModel: Model<EmployeeShift>,
    @InjectModel('EmployeeProfile')
    private readonly employeeProfileModel: Model<EmployeeProfile>,
    @InjectModel('ClinicService')
    private readonly clinicServiceModel: Model<ClinicServiceSchema>,
  ) {}

  /**
   * Assign doctor to service
   */
  async assignDoctorToService(
    serviceId: string,
    dto: AssignDoctorToServiceDto,
  ): Promise<DoctorService> {
    // Validate service exists and is active
    const service = await this.serviceModel.findById(serviceId);
    if (!service) {
      throw new NotFoundException({
        message: {
          ar: 'الخدمة غير موجودة',
          en: 'Service not found',
        },
      });
    }

    if (service.deletedAt || !service.isActive) {
      throw new BadRequestException({
        message: {
          ar: 'الخدمة غير نشطة',
          en: 'Service is not active',
        },
      });
    }

    // Validate clinic exists and is active
    const clinic = await this.clinicModel.findById(dto.clinicId);
    if (!clinic) {
      throw new NotFoundException({
        message: {
          ar: 'العيادة غير موجودة',
          en: 'Clinic not found',
        },
      });
    }

    // Validate doctor exists and is active with role 'doctor'
    const doctor = await this.userModel.findOne({
      _id: new Types.ObjectId(dto.doctorId),
      role: 'doctor',
      isActive: true,
    });

    if (!doctor) {
      throw new BadRequestException({
        message: {
          ar: 'الطبيب غير موجود أو غير نشط',
          en: 'Doctor not found or inactive',
        },
      });
    }

    // Validate doctor works at this clinic
    // Check User.clinicId OR EmployeeShift with clinic entity
    const doctorWorksAtClinic =
      doctor.clinicId?.toString() === dto.clinicId ||
      (await this.employeeShiftModel.exists({
        userId: new Types.ObjectId(dto.doctorId),
        entityType: 'clinic',
        entityId: new Types.ObjectId(dto.clinicId),
        isActive: true,
      }));

    if (!doctorWorksAtClinic) {
      throw new BadRequestException({
        message: {
          ar: 'الطبيب لا يعمل في هذه العيادة',
          en: 'Doctor does not work at this clinic',
        },
      });
    }

    // Validate service is available at this clinic
    const clinicService = await this.clinicServiceModel.findOne({
      clinicId: new Types.ObjectId(dto.clinicId),
      serviceId: new Types.ObjectId(serviceId),
      isActive: true,
    });

    if (!clinicService) {
      throw new BadRequestException({
        message: {
          ar: 'الخدمة غير متاحة في هذه العيادة',
          en: 'Service is not available at this clinic',
        },
      });
    }

    // Check if already assigned
    const existing = await this.doctorServiceModel.findOne({
      doctorId: new Types.ObjectId(dto.doctorId),
      serviceId: new Types.ObjectId(serviceId),
      clinicId: new Types.ObjectId(dto.clinicId),
    });

    if (existing) {
      if (existing.isActive) {
        throw new BadRequestException({
          message: {
            ar: 'الطبيب مسند بالفعل لهذه الخدمة في هذه العيادة',
            en: 'Doctor is already assigned to this service at this clinic',
          },
        });
      } else {
        // Reactivate if previously deactivated
        existing.isActive = true;
        existing.deactivatedAt = undefined;
        existing.deactivationReason = undefined;
        existing.deactivatedBy = undefined;
        existing.notes = dto.notes;
        return await existing.save();
      }
    }

    // Create new assignment
    const doctorService = new this.doctorServiceModel({
      doctorId: new Types.ObjectId(dto.doctorId),
      serviceId: new Types.ObjectId(serviceId),
      clinicId: new Types.ObjectId(dto.clinicId),
      notes: dto.notes,
      isActive: true,
    });

    return await doctorService.save();
  }

  /**
   * Get doctors assigned to service
   */
  async getDoctorsForService(
    serviceId: string,
    query: {
      clinicId?: string;
      isActive?: boolean;
      includeStats?: boolean;
    },
  ): Promise<any[]> {
    const filter: any = {
      serviceId: new Types.ObjectId(serviceId),
    };

    if (query.clinicId) {
      filter.clinicId = new Types.ObjectId(query.clinicId);
    }

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    } else {
      filter.isActive = true; // Default to active only
    }

    const doctorServices = await this.doctorServiceModel
      .find(filter)
      .populate('doctorId', 'firstName lastName email role')
      .populate('clinicId', 'name')
      .sort({ createdAt: -1 })
      .exec();

    if (query.includeStats) {
      // Update appointment counts
      for (const ds of doctorServices) {
        const activeCount = await this.appointmentModel.countDocuments({
          doctorId: ds.doctorId,
          serviceId: ds.serviceId,
          status: { $in: ['scheduled', 'confirmed'] },
          appointmentDate: { $gte: new Date() },
        });

        const totalCount = await this.appointmentModel.countDocuments({
          doctorId: ds.doctorId,
          serviceId: ds.serviceId,
        });

        ds.activeAppointmentsCount = activeCount;
        ds.totalAppointmentsCount = totalCount;
        await ds.save();
      }
    }

    return doctorServices;
  }

  /**
   * Deactivate doctor from service
   */
  async deactivateDoctorFromService(
    serviceId: string,
    doctorId: string,
    dto: DeactivateDoctorFromServiceDto,
    userId: string,
  ): Promise<any> {
    // Find assignment
    const doctorService = await this.doctorServiceModel.findOne({
      doctorId: new Types.ObjectId(doctorId),
      serviceId: new Types.ObjectId(serviceId),
      clinicId: new Types.ObjectId(dto.clinicId),
    });

    if (!doctorService) {
      throw new NotFoundException({
        message: {
          ar: 'الطبيب غير مسند لهذه الخدمة',
          en: 'Doctor is not assigned to this service',
        },
      });
    }

    // Check for active appointments
    const activeAppointments = await this.appointmentModel.find({
      doctorId: new Types.ObjectId(doctorId),
      serviceId: new Types.ObjectId(serviceId),
      clinicId: new Types.ObjectId(dto.clinicId),
      status: { $in: ['scheduled', 'confirmed'] },
      appointmentDate: { $gte: new Date() },
    });

    let appointmentsTransferred: {
      count: number;
      toDoctor: string;
      notificationsSent: boolean;
    } | null = null;

    if (activeAppointments.length > 0) {
      if (!dto.transferAppointmentsTo) {
        throw new BadRequestException({
          message: {
            ar: `الطبيب لديه ${activeAppointments.length} مواعيد نشطة. يرجى نقل المواعيد أو إلغاؤها أولاً`,
            en: `Doctor has ${activeAppointments.length} active appointments. Please transfer or cancel appointments first`,
          },
          activeAppointmentsCount: activeAppointments.length,
          requiresTransfer: true,
        });
      }

      // Transfer appointments
      await this.transferAppointments(
        activeAppointments,
        dto.transferAppointmentsTo,
        dto.notifyPatients !== false,
      );

      appointmentsTransferred = {
        count: activeAppointments.length,
        toDoctor: dto.transferAppointmentsTo,
        notificationsSent: dto.notifyPatients !== false,
      };
    }

    // Deactivate
    doctorService.isActive = false;
    doctorService.deactivatedAt = new Date();
    doctorService.deactivationReason = dto.reason;
    doctorService.deactivatedBy = new Types.ObjectId(userId);

    const result = await doctorService.save();

    return {
      ...result.toObject(),
      appointmentsTransferred,
    };
  }

  /**
   * Transfer appointments to another doctor
   */
  private async transferAppointments(
    appointments: Appointment[],
    newDoctorId: string,
    notifyPatients: boolean,
  ): Promise<void> {
    // Validate new doctor exists and is active
    const newDoctor = await this.userModel.findOne({
      _id: new Types.ObjectId(newDoctorId),
      role: 'doctor',
      isActive: true,
    });

    if (!newDoctor) {
      throw new BadRequestException({
        message: {
          ar: 'الطبيب الجديد غير موجود أو غير نشط',
          en: 'New doctor not found or inactive',
        },
      });
    }

    // Update appointments
    await this.appointmentModel.updateMany(
      { _id: { $in: appointments.map((a) => a._id) } },
      {
        $set: {
          doctorId: new Types.ObjectId(newDoctorId),
          notes: 'Doctor changed due to service reassignment',
        },
      },
    );

    // TODO: Send notifications if requested
    // This would integrate with a notification service
    if (notifyPatients) {
      // await this.notificationService.sendAppointmentDoctorChange(...)
    }
  }

  /**
   * Remove doctor from service (permanent delete)
   */
  async removeDoctorFromService(
    serviceId: string,
    doctorId: string,
    clinicId: string,
  ): Promise<void> {
    const doctorService = await this.doctorServiceModel.findOne({
      doctorId: new Types.ObjectId(doctorId),
      serviceId: new Types.ObjectId(serviceId),
      clinicId: new Types.ObjectId(clinicId),
    });

    if (!doctorService) {
      throw new NotFoundException({
        message: {
          ar: 'الطبيب غير مسند لهذه الخدمة',
          en: 'Doctor is not assigned to this service',
        },
      });
    }

    // Check for any appointments (active or historical)
    const appointmentCount = await this.appointmentModel.countDocuments({
      doctorId: new Types.ObjectId(doctorId),
      serviceId: new Types.ObjectId(serviceId),
      clinicId: new Types.ObjectId(clinicId),
    });

    if (appointmentCount > 0) {
      throw new BadRequestException({
        message: {
          ar: 'لا يمكن حذف الطبيب لأنه لديه مواعيد مرتبطة بهذه الخدمة. استخدم إلغاء التنشيط بدلاً من ذلك',
          en: 'Cannot delete doctor because they have appointments for this service. Use deactivate instead',
        },
        totalAppointmentsCount: appointmentCount,
        useDeactivateInstead: true,
      });
    }

    // Delete assignment
    await doctorService.deleteOne();
  }

  /**
   * Get available doctors for service
   */
  async getAvailableDoctorsForService(
    serviceId: string,
    clinicId?: string,
  ): Promise<any[]> {
    // Get service to validate it exists
    const service = await this.serviceModel.findById(serviceId);
    if (!service) {
      throw new NotFoundException({
        message: {
          ar: 'الخدمة غير موجودة',
          en: 'Service not found',
        },
      });
    }

    // Get clinics where service is offered
    let clinicIds: Types.ObjectId[];
    if (clinicId) {
      clinicIds = [new Types.ObjectId(clinicId)];
    } else {
      const clinicServices = await this.clinicServiceModel.find({
        serviceId: new Types.ObjectId(serviceId),
        isActive: true,
      });
      clinicIds = clinicServices.map((cs) => cs.clinicId);
    }

    if (clinicIds.length === 0) {
      return [];
    }

    // Get doctors working at these clinics
    // Check User.clinicId OR EmployeeShift with clinic entity
    const doctorsAtClinics = await this.userModel.find({
      role: 'doctor',
      isActive: true,
      $or: [
        { clinicId: { $in: clinicIds } },
        {
          _id: {
            $in: (
              await this.employeeShiftModel.distinct('userId', {
                entityType: 'clinic',
                entityId: { $in: clinicIds },
                isActive: true,
              })
            ).map((id) => new Types.ObjectId(id.toString())),
          },
        },
      ],
    });

    // Check which doctors are already assigned
    const existingAssignments = await this.doctorServiceModel.find({
      serviceId: new Types.ObjectId(serviceId),
      doctorId: { $in: doctorsAtClinics.map((d) => d._id) },
      isActive: true,
    });

    const assignedDoctorIds = new Set(
      existingAssignments.map((ds) => ds.doctorId.toString()),
    );

    // Format response
    return doctorsAtClinics.map((doctor) => {
      const doctorId = (doctor._id as Types.ObjectId).toString();
      return {
        _id: doctorId,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        email: doctor.email,
        role: doctor.role,
        status: doctor.isActive ? 'active' : 'inactive',
        isAlreadyAssigned: assignedDoctorIds.has(doctorId),
        canBeAssigned: !assignedDoctorIds.has(doctorId),
      };
    });
  }

  /**
   * Update doctor assignment notes
   */
  async updateDoctorServiceNotes(
    serviceId: string,
    doctorId: string,
    dto: UpdateDoctorServiceNotesDto,
  ): Promise<DoctorService> {
    const doctorService = await this.doctorServiceModel.findOne({
      doctorId: new Types.ObjectId(doctorId),
      serviceId: new Types.ObjectId(serviceId),
      clinicId: new Types.ObjectId(dto.clinicId),
    });

    if (!doctorService) {
      throw new NotFoundException({
        message: {
          ar: 'الطبيب غير مسند لهذه الخدمة',
          en: 'Doctor is not assigned to this service',
        },
      });
    }

    if (dto.notes !== undefined) {
      doctorService.notes = dto.notes;
    }

    return await doctorService.save();
  }
}
