import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import { DoctorSpecialtiesService } from './doctor-specialties.service';
import {
  CreateDoctorSpecialtyDto,
  UpdateDoctorSpecialtyDto,
  DoctorSpecialtySearchDto,
  DoctorSpecialtyResponseDto,
  BulkAssignSpecialtiesDto,
  ToggleDoctorSpecialtyStatusDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('doctor-specialties')
@UseGuards(JwtAuthGuard)
export class DoctorSpecialtiesController {
  private readonly logger = new Logger(DoctorSpecialtiesController.name);

  constructor(
    private readonly doctorSpecialtiesService: DoctorSpecialtiesService,
  ) {}

  /**
   * Assign specialty to doctor
   * POST /doctor-specialties
   */
  @Post()
  async assignSpecialtyToDoctor(
    @Body(new ValidationPipe())
    createDoctorSpecialtyDto: CreateDoctorSpecialtyDto,
  ) {
    try {
      this.logger.log(
        `Assigning specialty to doctor: ${createDoctorSpecialtyDto.doctorId}`,
      );

      const assignment =
        await this.doctorSpecialtiesService.assignSpecialtyToDoctor(
          createDoctorSpecialtyDto,
        );

      const response: DoctorSpecialtyResponseDto = {
        id: (assignment as any)._id.toString(),
        doctorId: assignment.doctorId.toString(),
        specialtyId: assignment.specialtyId.toString(),
        isActive: (assignment as any).isActive,
        yearsOfExperience: assignment.yearsOfExperience,
        certificationNumber: assignment.certificationNumber,
        createdAt: (assignment as any).createdAt || new Date(),
        updatedAt: (assignment as any).updatedAt || new Date(),
      };

      return {
        success: true,
        message: 'Specialty assigned to doctor successfully',
        data: response,
      };
    } catch (error) {
      this.logger.error(`Failed to assign specialty: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get doctor's specialties
   * GET /doctor-specialties/doctor/:doctorId
   */
  @Get('doctor/:doctorId')
  async getDoctorSpecialties(@Param('doctorId') doctorId: string) {
    try {
      this.logger.log(`Fetching specialties for doctor: ${doctorId}`);

      const specialties =
        await this.doctorSpecialtiesService.getDoctorSpecialties(doctorId);

      const data: DoctorSpecialtyResponseDto[] = specialties.map(
        (specialty) => {
          // Handle populated vs non-populated doctorId
          const doctorIdStr = (specialty.doctorId as any)._id
            ? (specialty.doctorId as any)._id.toString()
            : specialty.doctorId.toString();

          // Handle populated vs non-populated specialtyId
          const specialtyIdStr = (specialty.specialtyId as any)._id
            ? (specialty.specialtyId as any)._id.toString()
            : specialty.specialtyId.toString();

          return {
            id: (specialty as any)._id.toString(),
            doctorId: doctorIdStr,
            specialtyId: specialtyIdStr,
            doctorName: `${(specialty.doctorId as any).firstName || ''} ${(specialty.doctorId as any).lastName || ''}`.trim(),
            clinicName:
              ((specialty.doctorId as any).clinicId as any)?.name || undefined,
            isActive: (specialty as any).isActive,
            yearsOfExperience: specialty.yearsOfExperience,
            certificationNumber: specialty.certificationNumber,
            createdAt: (specialty as any).createdAt || new Date(),
            updatedAt: (specialty as any).updatedAt || new Date(),
            doctor: specialty.doctorId
              ? {
                  id: doctorIdStr,
                  firstName: (specialty.doctorId as any).firstName,
                  lastName: (specialty.doctorId as any).lastName,
                  email: (specialty.doctorId as any).email,
                  clinicName:
                    ((specialty.doctorId as any).clinicId as any)?.name ||
                    undefined,
                }
              : undefined,
            specialty: specialty.specialtyId
              ? {
                  id: specialtyIdStr,
                  name: (specialty.specialtyId as any).name,
                  description: (specialty.specialtyId as any).description,
                }
              : undefined,
          };
        },
      );

      return {
        success: true,
        message: 'Doctor specialties retrieved successfully',
        data,
        count: data.length,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch doctor specialties: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get doctors by specialty
   * GET /doctor-specialties/specialty/:specialtyId
   */
  @Get('specialty/:specialtyId')
  async getDoctorsBySpecialty(@Param('specialtyId') specialtyId: string) {
    try {
      this.logger.log(`Fetching doctors for specialty: ${specialtyId}`);

      const doctors =
        await this.doctorSpecialtiesService.getDoctorsBySpecialty(specialtyId);

      const data: DoctorSpecialtyResponseDto[] = doctors.map((doctor) => {
        // Handle populated vs non-populated doctorId
        const doctorIdStr = (doctor.doctorId as any)._id
          ? (doctor.doctorId as any)._id.toString()
          : doctor.doctorId.toString();

        // Handle populated vs non-populated specialtyId
        const specialtyIdStr = (doctor.specialtyId as any)._id
          ? (doctor.specialtyId as any)._id.toString()
          : doctor.specialtyId.toString();

        return {
          id: (doctor as any)._id.toString(),
          doctorId: doctorIdStr,
          specialtyId: specialtyIdStr,
          doctorName: `${(doctor.doctorId as any).firstName || ''} ${(doctor.doctorId as any).lastName || ''}`.trim(),
          clinicName: ((doctor.doctorId as any).clinicId as any)?.name || undefined,
          isActive: (doctor as any).isActive,
          yearsOfExperience: doctor.yearsOfExperience,
          certificationNumber: doctor.certificationNumber,
          createdAt: (doctor as any).createdAt || new Date(),
          updatedAt: (doctor as any).updatedAt || new Date(),
          doctor: doctor.doctorId
            ? {
                id: doctorIdStr,
                firstName: (doctor.doctorId as any).firstName,
                lastName: (doctor.doctorId as any).lastName,
                email: (doctor.doctorId as any).email,
                clinicName:
                  ((doctor.doctorId as any).clinicId as any)?.name || undefined,
              }
            : undefined,
          specialty: doctor.specialtyId
            ? {
                id: specialtyIdStr,
                name: (doctor.specialtyId as any).name,
                description: (doctor.specialtyId as any).description,
              }
            : undefined,
        };
      });

      return {
        success: true,
        message: 'Doctors by specialty retrieved successfully',
        data,
        count: data.length,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch doctors by specialty: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get assignment by ID
   * GET /doctor-specialties/details/:id
   */
  @Get('details/:id')
  async getAssignmentById(@Param('id') id: string) {
    try {
      this.logger.log(`Fetching assignment by ID: ${id}`);

      const assignment =
        await this.doctorSpecialtiesService.getAssignmentById(id);

      // Handle populated vs non-populated doctorId
      const doctorIdStr = (assignment.doctorId as any)._id
        ? (assignment.doctorId as any)._id.toString()
        : assignment.doctorId.toString();

      // Handle populated vs non-populated specialtyId
      const specialtyIdStr = (assignment.specialtyId as any)._id
        ? (assignment.specialtyId as any)._id.toString()
        : assignment.specialtyId.toString();

      const response: DoctorSpecialtyResponseDto = {
        id: (assignment as any)._id.toString(),
        doctorId: doctorIdStr,
        specialtyId: specialtyIdStr,
        doctorName: `${(assignment.doctorId as any).firstName || ''} ${(assignment.doctorId as any).lastName || ''}`.trim(),
        clinicName:
          ((assignment.doctorId as any).clinicId as any)?.name || undefined,
        isActive: (assignment as any).isActive,
        yearsOfExperience: assignment.yearsOfExperience,
        certificationNumber: assignment.certificationNumber,
        createdAt: (assignment as any).createdAt || new Date(),
        updatedAt: (assignment as any).updatedAt || new Date(),
        doctor: assignment.doctorId
          ? {
              id: doctorIdStr,
              firstName: (assignment.doctorId as any).firstName,
              lastName: (assignment.doctorId as any).lastName,
              email: (assignment.doctorId as any).email,
              clinicName:
                ((assignment.doctorId as any).clinicId as any)?.name ||
                undefined,
            }
          : undefined,
        specialty: assignment.specialtyId
          ? {
              id: specialtyIdStr,
              name: (assignment.specialtyId as any).name,
              description: (assignment.specialtyId as any).description,
            }
          : undefined,
      };

      return {
        success: true,
        message: 'Assignment retrieved successfully',
        data: response,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch assignment: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search assignments with filters
   * GET /doctor-specialties
   */
  @Get()
  async searchAssignments(@Query() query: DoctorSpecialtySearchDto) {
    try {
      this.logger.log(
        `Searching assignments with filters: ${JSON.stringify(query)}`,
      );

      const result =
        await this.doctorSpecialtiesService.searchAssignments(query);

      const data: DoctorSpecialtyResponseDto[] = result.data.map(
        (assignment: any) => ({
          id: assignment._id.toString(),
          doctorId: assignment.doctorId.toString(),
          specialtyId: assignment.specialtyId.toString(),
          doctorName:
            `${assignment.doctor?.firstName || ''} ${assignment.doctor?.lastName || ''}`.trim() ||
            undefined,
          clinicName: assignment.clinicName || undefined,
          isActive:
            assignment.isActive !== undefined ? assignment.isActive : true,
          yearsOfExperience: assignment.yearsOfExperience,
          certificationNumber: assignment.certificationNumber,
          createdAt: assignment.createdAt || new Date(),
          updatedAt: assignment.updatedAt || new Date(),
          doctor: assignment.doctor
            ? {
                id:
                  assignment.doctor._id?.toString() ||
                  assignment.doctorId.toString(),
                firstName: assignment.doctor.firstName,
                lastName: assignment.doctor.lastName,
                email: assignment.doctor.email,
                clinicName: assignment.clinicName || undefined,
              }
            : undefined,
          specialty: assignment.specialty
            ? {
                id:
                  assignment.specialty._id?.toString() ||
                  assignment.specialtyId.toString(),
                name: assignment.specialty.name,
                description: assignment.specialty.description,
              }
            : undefined,
        }),
      );

      return {
        success: true,
        message: 'Assignment search completed successfully',
        data,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit: parseInt(query.limit || '10'),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to search assignments: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update assignment
   * PUT /doctor-specialties/:id
   */
  @Put(':id')
  async updateAssignment(
    @Param('id') id: string,
    @Body(new ValidationPipe())
    updateDoctorSpecialtyDto: UpdateDoctorSpecialtyDto,
  ) {
    try {
      this.logger.log(`Updating assignment: ${id}`);

      const assignment = await this.doctorSpecialtiesService.updateAssignment(
        id,
        updateDoctorSpecialtyDto,
      );

      // Handle populated vs non-populated doctorId
      const doctorIdStr = (assignment.doctorId as any)._id
        ? (assignment.doctorId as any)._id.toString()
        : assignment.doctorId.toString();

      // Handle populated vs non-populated specialtyId
      const specialtyIdStr = (assignment.specialtyId as any)._id
        ? (assignment.specialtyId as any)._id.toString()
        : assignment.specialtyId.toString();

      const response: DoctorSpecialtyResponseDto = {
        id: (assignment as any)._id.toString(),
        doctorId: doctorIdStr,
        specialtyId: specialtyIdStr,
        doctorName: `${(assignment.doctorId as any).firstName || ''} ${(assignment.doctorId as any).lastName || ''}`.trim(),
        clinicName:
          ((assignment.doctorId as any).clinicId as any)?.name || undefined,
        isActive: (assignment as any).isActive,
        yearsOfExperience: assignment.yearsOfExperience,
        certificationNumber: assignment.certificationNumber,
        createdAt: (assignment as any).createdAt || new Date(),
        updatedAt: (assignment as any).updatedAt || new Date(),
        doctor: assignment.doctorId
          ? {
              id: doctorIdStr,
              firstName: (assignment.doctorId as any).firstName,
              lastName: (assignment.doctorId as any).lastName,
              email: (assignment.doctorId as any).email,
              clinicName:
                ((assignment.doctorId as any).clinicId as any)?.name ||
                undefined,
            }
          : undefined,
        specialty: assignment.specialtyId
          ? {
              id: specialtyIdStr,
              name: (assignment.specialtyId as any).name,
              description: (assignment.specialtyId as any).description,
            }
          : undefined,
      };

      return {
        success: true,
        message: 'Assignment updated successfully',
        data: response,
      };
    } catch (error) {
      this.logger.error(`Failed to update assignment: ${error.message}`);
      throw error;
    }
  }

  /**
   * Toggle assignment status
   * PATCH /doctor-specialties/:id/status
   */
  @Patch(':id/status')
  async toggleAssignmentStatus(
    @Param('id') id: string,
    @Body(new ValidationPipe()) dto: ToggleDoctorSpecialtyStatusDto,
  ) {
    try {
      this.logger.log(`Toggling assignment status: ${id}`);

      const assignment = await this.doctorSpecialtiesService.toggleAssignmentStatus(
        id,
        dto.isActive,
      );

      const doctorIdStr = (assignment.doctorId as any)._id
        ? (assignment.doctorId as any)._id.toString()
        : assignment.doctorId.toString();

      const specialtyIdStr = (assignment.specialtyId as any)._id
        ? (assignment.specialtyId as any)._id.toString()
        : assignment.specialtyId.toString();

      const response: DoctorSpecialtyResponseDto = {
        id: (assignment as any)._id.toString(),
        doctorId: doctorIdStr,
        specialtyId: specialtyIdStr,
        doctorName: `${(assignment.doctorId as any).firstName || ''} ${(assignment.doctorId as any).lastName || ''}`.trim(),
        clinicName:
          ((assignment.doctorId as any).clinicId as any)?.name || undefined,
        isActive: (assignment as any).isActive,
        yearsOfExperience: assignment.yearsOfExperience,
        certificationNumber: assignment.certificationNumber,
        createdAt: (assignment as any).createdAt || new Date(),
        updatedAt: (assignment as any).updatedAt || new Date(),
        doctor: assignment.doctorId
          ? {
              id: doctorIdStr,
              firstName: (assignment.doctorId as any).firstName,
              lastName: (assignment.doctorId as any).lastName,
              email: (assignment.doctorId as any).email,
              clinicName:
                ((assignment.doctorId as any).clinicId as any)?.name ||
                undefined,
            }
          : undefined,
        specialty: assignment.specialtyId
          ? {
              id: specialtyIdStr,
              name: (assignment.specialtyId as any).name,
              description: (assignment.specialtyId as any).description,
            }
          : undefined,
      };

      return {
        success: true,
        message: 'Assignment status updated successfully',
        data: response,
      };
    } catch (error) {
      this.logger.error(`Failed to toggle assignment status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove specialty assignment
   * DELETE /doctor-specialties/:id
   */
  @Delete(':id')
  async removeSpecialtyAssignment(@Param('id') id: string) {
    try {
      this.logger.log(`Removing assignment: ${id}`);

      await this.doctorSpecialtiesService.removeSpecialtyAssignment(id);

      return {
        success: true,
        message: 'Specialty assignment removed successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to remove assignment: ${error.message}`);
      throw error;
    }
  }

  /**
   * Bulk assign specialties to doctor
   * POST /doctor-specialties/bulk-assign
   */
  @Post('bulk-assign')
  async bulkAssignSpecialties(
    @Body(new ValidationPipe()) bulkAssignDto: BulkAssignSpecialtiesDto,
  ) {
    try {
      this.logger.log(
        `Bulk assigning specialties to doctor: ${bulkAssignDto.doctorId}`,
      );

      const result =
        await this.doctorSpecialtiesService.bulkAssignSpecialties(
          bulkAssignDto,
        );

      return {
        success: true,
        message: `Bulk assignment completed. ${result.success} successful, ${result.failed} failed.`,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Failed to bulk assign specialties: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get assignment statistics
   * GET /doctor-specialties/stats
   */
  @Get('stats')
  async getAssignmentStats() {
    try {
      this.logger.log('Fetching assignment statistics');

      const stats = await this.doctorSpecialtiesService.getAssignmentStats();

      return {
        success: true,
        message: 'Assignment statistics retrieved successfully',
        data: stats,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch assignment statistics: ${error.message}`,
      );
      throw error;
    }
  }
}
