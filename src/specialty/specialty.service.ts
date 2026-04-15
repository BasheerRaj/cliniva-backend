import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Specialty } from '../database/schemas/specialty.schema';
import { DoctorSpecialty } from '../database/schemas/doctor-specialty.schema';
import {
  CreateSpecialtyDto,
  UpdateSpecialtyDto,
  ToggleSpecialtyStatusDto,
  SpecialtySearchDto,
} from './dto';
import { ResponseBuilder } from '../common/utils/response-builder.util';
import { buildTenantFilter, TenantUser } from '../common/utils/tenant-scope.util';

@Injectable()
export class SpecialtyService implements OnModuleInit {
  private readonly logger = new Logger(SpecialtyService.name);

  constructor(
    @InjectModel('Specialty') private readonly specialtyModel: Model<Specialty>,
    @InjectModel('DoctorSpecialty')
    private readonly doctorSpecialtyModel: Model<DoctorSpecialty>,
    @InjectModel('Complex') private readonly complexModel: Model<any>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const indexes = await this.specialtyModel.collection.indexes();
      const legacyGlobalNameIndex = indexes.find(
        (idx: any) => idx?.name === 'name_1' && idx?.unique === true,
      );

      if (legacyGlobalNameIndex) {
        await this.specialtyModel.collection.dropIndex('name_1');
        this.logger.warn(
          'Dropped legacy global unique index name_1 from specialties collection',
        );
      }
    } catch (error: any) {
      this.logger.warn(
        `Specialty index migration check skipped: ${error?.message ?? 'unknown error'}`,
      );
    }
  }

  async createSpecialty(createDto: CreateSpecialtyDto, creatingUser: TenantUser): Promise<Specialty> {
    const tenantFilter = buildTenantFilter(creatingUser);
    const existing = await this.specialtyModel.findOne({
      ...tenantFilter,
      name: { $regex: new RegExp(`^${createDto.name}$`, 'i') },
    });

    if (existing) {
      throw new ConflictException({
        message: {
          ar: 'التخصص بهذا الاسم موجود بالفعل',
          en: 'Specialty with this name already exists',
        },
        code: 'SPECIALTY_EXISTS',
      });
    }

    if (createDto.complexId) {
      await this.validateComplex(createDto.complexId);
    }

    const specialty = new this.specialtyModel({
      ...createDto,
      isActive: createDto.isActive !== undefined ? createDto.isActive : true,
      subscriptionId: creatingUser.subscriptionId
        ? new Types.ObjectId(creatingUser.subscriptionId)
        : undefined,
    });
    try {
      return await specialty.save();
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException({
          message: {
            ar: 'التخصص بهذا الاسم موجود بالفعل',
            en: 'Specialty with this name already exists',
          },
          code: 'SPECIALTY_EXISTS',
        });
      }
      throw error;
    }
  }

  async getSpecialtiesForDropdown(filters?: {
    complexId?: string;
    search?: string;
    includeInactive?: boolean;
  }, requestingUser?: TenantUser): Promise<any[]> {
    const tenantFilter = buildTenantFilter(requestingUser ?? {} as TenantUser);
    const query: any = { ...tenantFilter, deletedAt: { $exists: false } };

    if (!filters?.includeInactive) {
      query.isActive = true;
    }

    if (filters?.complexId) {
      if (!Types.ObjectId.isValid(filters.complexId)) {
        throw new BadRequestException('Invalid complex ID format');
      }
      query.complexId = new Types.ObjectId(filters.complexId);
    }

    if (filters?.search?.trim()) {
      query.name = { $regex: filters.search.trim(), $options: 'i' };
    }

    return await this.specialtyModel
      .find(query)
      .select('_id name isActive complexId')
      .sort({ name: 1 })
      .lean();
  }

  async getAllSpecialties(query: SpecialtySearchDto, requestingUser?: TenantUser): Promise<{
    specialties: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      search,
      isActive,
      complexId,
      page = '1',
      limit = '10',
      sortBy = 'name',
      sortOrder = 'asc',
      order,
    } = query;

    const tenantFilter = buildTenantFilter(requestingUser ?? {} as TenantUser);
    const filter: any = { ...tenantFilter };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    const canSeeInactiveByDefault = ['super_admin', 'owner', 'admin'].includes(
      String(requestingUser?.role || '').toLowerCase(),
    );
    // Status visibility:
    // - explicit isActive always wins
    // - admin/owner/super_admin can see both by default
    // - other roles default to active only
    if (isActive !== undefined) {
      filter.isActive = isActive;
    } else if (!canSeeInactiveByDefault) {
      filter.isActive = true;
    }
    if (complexId && Types.ObjectId.isValid(complexId)) {
      filter.complexId = new Types.ObjectId(complexId);
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * pageSize;

    const sortField =
      sortBy === 'assignedDoctorsCount' ? 'assignedDoctorsCount' : sortBy;
    const effectiveSortOrder = (sortOrder || order || 'asc') === 'asc' ? 'asc' : 'desc';
    const sortDirection = effectiveSortOrder === 'asc' ? 1 : -1;

    const pipeline: any[] = [
      { $match: filter },
      {
        $lookup: {
          from: 'doctor_specialties',
          localField: '_id',
          foreignField: 'specialtyId',
          as: 'doctorAssignments',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'doctorAssignments.doctorId',
          foreignField: '_id',
          as: 'doctors',
        },
      },
      {
        $lookup: {
          from: 'clinics',
          localField: 'doctors.clinicId',
          foreignField: '_id',
          as: 'clinics',
        },
      },
      // Count scheduled appointments for this specialty (via its doctors)
      {
        $lookup: {
          from: 'appointments',
          let: { doctorIds: '$doctorAssignments.doctorId' },
          pipeline: [
            {
              $match: {
                $expr: { $in: ['$doctorId', '$$doctorIds'] },
                status: 'scheduled',
                deletedAt: { $exists: false },
              },
            },
            { $count: 'count' },
          ],
          as: '_scheduledApts',
        },
      },
      {
        $addFields: {
          doctorAssignments: {
            $map: {
              input: '$doctorAssignments',
              as: 'assignment',
              in: {
                _id: '$$assignment._id',
                doctorId: '$$assignment.doctorId',
                specialtyId: '$$assignment.specialtyId',
                yearsOfExperience: '$$assignment.yearsOfExperience',
                certificationNumber: '$$assignment.certificationNumber',
                createdAt: '$$assignment.createdAt',
                updatedAt: '$$assignment.updatedAt',
                __v: '$$assignment.__v',
                isActive: { $ifNull: ['$$assignment.isActive', true] },
                doctorName: {
                  $let: {
                    vars: {
                      matchedDoctor: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: '$doctors',
                              as: 'doc',
                              cond: {
                                $eq: ['$$doc._id', '$$assignment.doctorId'],
                              },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: {
                      $trim: {
                        input: {
                          $concat: [
                            { $ifNull: ['$$matchedDoctor.firstName', ''] },
                            ' ',
                            { $ifNull: ['$$matchedDoctor.lastName', ''] },
                          ],
                        },
                      },
                    },
                  },
                },
                clinicName: {
                  $let: {
                    vars: {
                      matchedDoctor: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: '$doctors',
                              as: 'doc',
                              cond: {
                                $eq: ['$$doc._id', '$$assignment.doctorId'],
                              },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: {
                      $let: {
                        vars: {
                          matchedClinic: {
                            $arrayElemAt: [
                              {
                                $filter: {
                                  input: '$clinics',
                                  as: 'clinic',
                                  cond: {
                                    $eq: [
                                      '$$clinic._id',
                                      '$$matchedDoctor.clinicId',
                                    ],
                                  },
                                },
                              },
                              0,
                            ],
                          },
                        },
                        in: '$$matchedClinic.name',
                      },
                    },
                  },
                },
              },
            },
          },
          assignedDoctorsCount: { $size: '$doctorAssignments' },
          activeDoctorsCount: {
            $size: {
              $filter: {
                input: '$doctorAssignments',
                as: 'assignment',
                cond: { $eq: [{ $ifNull: ['$$assignment.isActive', true] }, true] },
              },
            },
          },
          scheduledAppointmentsCount: {
            $ifNull: [{ $arrayElemAt: ['$_scheduledApts.count', 0] }, 0],
          },
        },
      },
      { $unset: '_scheduledApts' },
      { $sort: { [sortField]: sortDirection } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: pageSize }],
          count: [{ $count: 'total' }],
        },
      },
    ];

    const result = await this.specialtyModel.aggregate(pipeline);
    const specialties = result[0]?.data || [];
    const total = result[0]?.count[0]?.total || 0;
    const totalPages = Math.ceil(total / pageSize);

    return { specialties, total, page: pageNum, totalPages };
  }

  async getSpecialty(specialtyId: string): Promise<Specialty> {
    if (!Types.ObjectId.isValid(specialtyId)) {
      throw new BadRequestException('Invalid specialty ID format');
    }
    const specialty = await this.specialtyModel.findById(specialtyId);
    if (!specialty) {
      throw new NotFoundException({
        message: {
          ar: 'التخصص غير موجود',
          en: 'Specialty not found',
        },
        code: 'SPECIALTY_NOT_FOUND',
      });
    }
    return specialty as Specialty;
  }

  async getSpecialtyDetails(specialtyId: string): Promise<any> {
    if (!Types.ObjectId.isValid(specialtyId)) {
      throw new BadRequestException('Invalid specialty ID format');
    }

    const specialtyDoc = await this.specialtyModel.findById(specialtyId);
    if (!specialtyDoc) {
      throw new NotFoundException({
        message: {
          ar: 'التخصص غير موجود',
          en: 'Specialty not found',
        },
        code: 'SPECIALTY_NOT_FOUND',
      });
    }

    const doctorAssignments = await this.doctorSpecialtyModel.aggregate([
      { $match: { specialtyId: new Types.ObjectId(specialtyId) } },
      {
        $lookup: {
          from: 'users',
          localField: 'doctorId',
          foreignField: '_id',
          as: 'doctor',
        },
      },
      { $unwind: '$doctor' },
      {
        $lookup: {
          from: 'clinics',
          let: {
            clinicIdStr: {
              $cond: [
                { $ifNull: ['$doctor.clinicId', false] },
                { $toString: '$doctor.clinicId' },
                null,
              ],
            },
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [{ $toString: '$_id' }, '$$clinicIdStr'],
                },
              },
            },
          ],
          as: 'clinic',
        },
      },
      {
        $lookup: {
          from: 'appointments',
          let: { doctorId: '$doctorId' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$doctorId', '$$doctorId'] },
                status: { $in: ['scheduled', 'confirmed'] },
              },
            },
            { $count: 'count' },
          ],
          as: 'appointmentCount',
        },
      },
      {
        $project: {
          _id: 1,
          specialtyId: '$specialtyId',
          doctorId: '$doctor._id',
          clinicId: '$doctor.clinicId',
          doctorName: {
            $concat: [
              { $ifNull: ['$doctor.firstName', ''] },
              ' ',
              { $ifNull: ['$doctor.lastName', ''] },
            ],
          },
          clinicName: {
            $ifNull: [{ $arrayElemAt: ['$clinic.name', 0] }, ''],
          },
          yearsOfExperience: 1,
          certificationNumber: 1,
          createdAt: 1,
          updatedAt: 1,
          __v: 1,
          isActive: { $ifNull: ['$isActive', true] },
          appointmentsCount: {
            $ifNull: [{ $arrayElemAt: ['$appointmentCount.count', 0] }, 0],
          },
        },
      },
    ]);

    const totalDoctors = doctorAssignments.length;
    const totalAppointments = doctorAssignments.reduce(
      (sum, d) => sum + d.appointmentsCount,
      0,
    );
    const averageExperience =
      totalDoctors > 0
        ? doctorAssignments.reduce((sum, d) => sum + (d.yearsOfExperience || 0), 0) /
          totalDoctors
        : 0;

    return {
      ...specialtyDoc.toObject(),
      assignedDoctors: doctorAssignments,
      doctorAssignments,
      statistics: {
        totalDoctors,
        totalAppointments,
        averageExperience: Math.round(averageExperience * 10) / 10,
      },
    };
  }

  async updateSpecialty(
    specialtyId: string,
    updateDto: UpdateSpecialtyDto,
    updatingUser?: TenantUser,
  ): Promise<Specialty> {
    if (updateDto.name) {
      const tenantFilter = buildTenantFilter(updatingUser ?? ({} as TenantUser));
      const existing = await this.specialtyModel.findOne({
        ...tenantFilter,
        name: { $regex: new RegExp(`^${updateDto.name}$`, 'i') },
        _id: { $ne: specialtyId },
      });

      if (existing) {
        throw new ConflictException({
          message: {
            ar: 'التخصص بهذا الاسم موجود بالفعل',
            en: 'Specialty with this name already exists',
          },
          code: 'SPECIALTY_EXISTS',
        });
      }
    }

    if (updateDto.complexId) {
      await this.validateComplex(updateDto.complexId);
    }

    let updated: Specialty | null = null;
    try {
      updated = await this.specialtyModel.findByIdAndUpdate(
        specialtyId,
        updateDto,
        { new: true },
      );
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException({
          message: {
            ar: 'التخصص بهذا الاسم موجود بالفعل',
            en: 'Specialty with this name already exists',
          },
          code: 'SPECIALTY_EXISTS',
        });
      }
      throw error;
    }

    if (!updated) {
      throw new NotFoundException({
        message: {
          ar: 'التخصص غير موجود',
          en: 'Specialty not found',
        },
        code: 'SPECIALTY_NOT_FOUND',
      });
    }

    return updated;
  }

  async toggleStatus(
    specialtyId: string,
    dto: ToggleSpecialtyStatusDto,
    userId: string,
  ): Promise<any> {
    const specialty = await this.specialtyModel.findById(specialtyId);
    if (!specialty) {
      throw new NotFoundException({
        message: {
          ar: 'التخصص غير موجود',
          en: 'Specialty not found',
        },
        code: 'SPECIALTY_NOT_FOUND',
      });
    }

    if (!dto.isActive && specialty.isActive) {
      const activeDoctors = await this.getActiveDoctorCount(specialtyId);
      if (activeDoctors > 0) {
        throw new BadRequestException({
          message: {
            ar: `لا يمكن تعطيل التخصص. يوجد ${activeDoctors} طبيب مرتبط بهذا التخصص`,
            en: `Cannot deactivate specialty. ${activeDoctors} doctor(s) are assigned to this specialty`,
          },
          code: 'SPECIALTY_HAS_ACTIVE_DOCTORS',
          details: { activeDoctors },
        });
      }

      (specialty as any).deactivatedAt = new Date();
      (specialty as any).deactivatedBy = new Types.ObjectId(userId);
      (specialty as any).deactivationReason = dto.reason;
    } else if (dto.isActive) {
      (specialty as any).deactivatedAt = undefined;
      (specialty as any).deactivatedBy = undefined;
      (specialty as any).deactivationReason = undefined;
    }

    (specialty as any).isActive = dto.isActive;
    await specialty.save();

    return ResponseBuilder.success(
      specialty.toObject(),
      {
        ar: dto.isActive ? 'تم تفعيل التخصص بنجاح' : 'تم تعطيل التخصص بنجاح',
        en: dto.isActive
          ? 'Specialty activated successfully'
          : 'Specialty deactivated successfully',
      },
    );
  }

  async deleteSpecialty(specialtyId: string): Promise<void> {
    const specialty = await this.specialtyModel.findById(specialtyId);
    if (!specialty) {
      throw new NotFoundException({
        message: {
          ar: 'التخصص غير موجود',
          en: 'Specialty not found',
        },
        code: 'SPECIALTY_NOT_FOUND',
      });
    }

    if ((specialty as any).isActive) {
      throw new BadRequestException({
        message: {
          ar: 'يجب تعطيل التخصص قبل الحذف',
          en: 'Specialty must be deactivated before deletion',
        },
        code: 'SPECIALTY_MUST_BE_DEACTIVATED',
      });
    }

    const doctorCount = await this.doctorSpecialtyModel.countDocuments({
      specialtyId: new Types.ObjectId(specialtyId),
    });

    if (doctorCount > 0) {
      throw new BadRequestException({
        message: {
          ar: `لا يمكن حذف التخصص. يوجد ${doctorCount} طبيب مرتبط بهذا التخصص`,
          en: `Cannot delete specialty. ${doctorCount} doctor(s) are assigned to this specialty`,
        },
        code: 'SPECIALTY_HAS_DOCTORS',
        details: { doctorCount },
      });
    }

    await this.specialtyModel.findByIdAndDelete(specialtyId);
  }

  async getSpecialtyStats(specialtyId: string): Promise<any> {
    const specialty = await this.specialtyModel.findById(specialtyId);
    if (!specialty) {
      throw new NotFoundException({
        message: {
          ar: 'التخصص غير موجود',
          en: 'Specialty not found',
        },
        code: 'SPECIALTY_NOT_FOUND',
      });
    }

    const stats = await this.doctorSpecialtyModel.aggregate([
      { $match: { specialtyId: new Types.ObjectId(specialtyId) } },
      {
        $lookup: {
          from: 'appointments',
          localField: 'doctorId',
          foreignField: 'doctorId',
          as: 'appointments',
        },
      },
      {
        $addFields: {
          totalAppointments: { $size: '$appointments' },
          completedAppointments: {
            $size: {
              $filter: {
                input: '$appointments',
                as: 'apt',
                cond: { $eq: ['$$apt.status', 'completed'] },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          totalDoctors: { $sum: 1 },
          averageExperience: { $avg: '$yearsOfExperience' },
          totalAppointments: { $sum: '$totalAppointments' },
          completedAppointments: { $sum: '$completedAppointments' },
        },
      },
    ]);

    const statData = stats[0] || {
      totalDoctors: 0,
      averageExperience: 0,
      totalAppointments: 0,
      completedAppointments: 0,
    };

    const completionRate =
      statData.totalAppointments > 0
        ? Math.round(
            (statData.completedAppointments / statData.totalAppointments) * 1000,
          ) / 10
        : 0;

    return {
      specialty: specialty.toObject(),
      statistics: {
        ...statData,
        completionRate,
      },
    };
  }

  private async validateComplex(complexId: string): Promise<void> {
    const complex = await this.complexModel.findById(complexId);
    if (!complex) {
      throw new NotFoundException({
        message: {
          ar: 'المجمع غير موجود',
          en: 'Complex not found',
        },
        code: 'COMPLEX_NOT_FOUND',
      });
    }
  }

  private async getActiveDoctorCount(specialtyId: string): Promise<number> {
    const result = await this.doctorSpecialtyModel.aggregate([
      { $match: { specialtyId: new Types.ObjectId(specialtyId) } },
      { $match: { $expr: { $eq: [{ $ifNull: ['$isActive', true] }, true] } } },
      { $count: 'count' },
    ]);
    return result[0]?.count || 0;
  }
}
