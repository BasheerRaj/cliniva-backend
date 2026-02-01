import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Put,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  ValidationPipe,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { PatientService } from './patient.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreatePatientDto,
  UpdatePatientDto,
  PatientSearchQueryDto,
  UpdateMedicalHistoryDto,
  CreateEmergencyContactDto,
  PatientResponseDto,
  PatientStatsDto,
} from './dto';

@Controller('patients')
@UseGuards(JwtAuthGuard)
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  /**
   * Create a new patient
   * POST /patients
   */
  @Post()
  async createPatient(
    @Body(new ValidationPipe()) createPatientDto: CreatePatientDto,
    @Request() req: any,
  ) {
    try {
      const patient = await this.patientService.createPatient(
        createPatientDto,
        req.user?.userId,
      );
      return {
        success: true,
        message: 'Patient created successfully',
        data: patient,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create patient',
        error: error.message,
      };
    }
  }

  /**
   * Get all patients with filtering and pagination
   * GET /patients
   */
  @Get()
  async getPatients(@Query(new ValidationPipe()) query: PatientSearchQueryDto) {
    try {
      const result = await this.patientService.getPatients(query);
      return {
        success: true,
        message: 'Patients retrieved successfully',
        data: result.patients,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit: parseInt(query.limit || '10'),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve patients',
        error: error.message,
      };
    }
  }

  /**
   * Get patient by ID
   * GET /patients/:id
   */
  @Get(':id')
  async getPatient(@Param('id') id: string) {
    try {
      const patient = await this.patientService.getPatientById(id);
      return {
        success: true,
        message: 'Patient retrieved successfully',
        data: patient,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve patient',
        error: error.message,
      };
    }
  }

  /**
   * Update patient information
   * PUT /patients/:id
   */
  @Put(':id')
  async updatePatient(
    @Param('id') id: string,
    @Body(new ValidationPipe()) updatePatientDto: UpdatePatientDto,
    @Request() req: any,
  ) {
    try {
      const patient = await this.patientService.updatePatient(
        id,
        updatePatientDto,
        req.user?.userId,
      );
      return {
        success: true,
        message: 'Patient updated successfully',
        data: patient,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update patient',
        error: error.message,
      };
    }
  }

  /**
   * Soft delete patient
   * DELETE /patients/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deletePatient(@Param('id') id: string, @Request() req: any) {
    try {
      await this.patientService.deletePatient(id, req.user?.userId);
      return {
        success: true,
        message: 'Patient deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to delete patient',
        error: error.message,
      };
    }
  }

  /**
   * Search patients by term
   * GET /patients/search?q=searchTerm
   */
  @Get('search/query')
  async searchPatients(
    @Query('q') searchTerm: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        throw new BadRequestException('Search term is required');
      }

      const patients = await this.patientService.searchPatients(
        searchTerm,
        limit || 20,
      );
      return {
        success: true,
        message: 'Search completed successfully',
        data: patients,
        count: patients.length,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Search failed',
        error: error.message,
      };
    }
  }

  /**
   * Get patient by patient number
   * GET /patients/number/:patientNumber
   */
  @Get('number/:patientNumber')
  async getPatientByNumber(@Param('patientNumber') patientNumber: string) {
    try {
      const patient =
        await this.patientService.getPatientByNumber(patientNumber);
      return {
        success: true,
        message: 'Patient retrieved successfully',
        data: patient,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve patient',
        error: error.message,
      };
    }
  }

  /**
   * Update patient medical history
   * PUT /patients/:id/medical-history
   */
  @Put(':id/medical-history')
  async updateMedicalHistory(
    @Param('id') id: string,
    @Body(new ValidationPipe())
    updateMedicalHistoryDto: UpdateMedicalHistoryDto,
    @Request() req: any,
  ) {
    try {
      const patient = await this.patientService.updateMedicalHistory(
        id,
        updateMedicalHistoryDto,
        req.user?.userId,
      );
      return {
        success: true,
        message: 'Medical history updated successfully',
        data: patient,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update medical history',
        error: error.message,
      };
    }
  }

  /**
   * Get patient medical history
   * GET /patients/:id/medical-history
   */
  @Get(':id/medical-history')
  async getMedicalHistory(@Param('id') id: string) {
    try {
      const patient = await this.patientService.getPatientById(id);
      const medicalHistory = {
        patientId: patient._id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        bloodType: patient.bloodType,
        allergies: patient.allergies,
        medicalHistory: patient.medicalHistory,
        insuranceProvider: patient.insuranceProvider,
        insurancePolicyNumber: patient.insurancePolicyNumber,
      };

      return {
        success: true,
        message: 'Medical history retrieved successfully',
        data: medicalHistory,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve medical history',
        error: error.message,
      };
    }
  }

  /**
   * Get patient statistics
   * GET /patients/stats/overview
   */
  @Get('stats/overview')
  async getPatientStats() {
    try {
      const stats = await this.patientService.getPatientStats();
      return {
        success: true,
        message: 'Patient statistics retrieved successfully',
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve patient statistics',
        error: error.message,
      };
    }
  }

  /**
   * Get recent patients
   * GET /patients/recent?limit=10
   */
  @Get('recent/list')
  async getRecentPatients(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    try {
      const patients = await this.patientService.getRecentPatients(limit || 10);
      return {
        success: true,
        message: 'Recent patients retrieved successfully',
        data: patients,
        count: patients.length,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve recent patients',
        error: error.message,
      };
    }
  }

  /**
   * Get patients with upcoming birthdays
   * GET /patients/birthdays/upcoming?days=30
   */
  @Get('birthdays/upcoming')
  async getUpcomingBirthdays(
    @Query('days', new ParseIntPipe({ optional: true })) days?: number,
  ) {
    try {
      const patients = await this.patientService.getUpcomingBirthdays(
        days || 30,
      );
      return {
        success: true,
        message: 'Upcoming birthdays retrieved successfully',
        data: patients,
        count: patients.length,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve upcoming birthdays',
        error: error.message,
      };
    }
  }

  /**
   * Check if email exists
   * GET /patients/validation/email-exists?email=test@example.com
   */
  @Get('validation/email-exists')
  async checkEmailExists(@Query('email') email: string) {
    try {
      if (!email) {
        throw new BadRequestException('Email parameter is required');
      }

      const exists = await this.patientService.patientExistsByEmail(email);
      return {
        success: true,
        message: 'Email validation completed',
        data: {
          email,
          exists,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Email validation failed',
        error: error.message,
      };
    }
  }

  /**
   * Check if phone exists
   * GET /patients/validation/phone-exists?phone=+1234567890
   */
  @Get('validation/phone-exists')
  async checkPhoneExists(@Query('phone') phone: string) {
    try {
      if (!phone) {
        throw new BadRequestException('Phone parameter is required');
      }

      const exists = await this.patientService.patientExistsByPhone(phone);
      return {
        success: true,
        message: 'Phone validation completed',
        data: {
          phone,
          exists,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Phone validation failed',
        error: error.message,
      };
    }
  }

  /**
   * Get patient's emergency contacts
   * GET /patients/:id/emergency-contacts
   */
  @Get(':id/emergency-contacts')
  async getEmergencyContacts(@Param('id') id: string) {
    try {
      const patient = await this.patientService.getPatientById(id);
      const emergencyContacts: Array<{
        name: string;
        phone: string;
        relationship: string;
        isPrimary: boolean;
      }> = [];

      if (patient.emergencyContactName && patient.emergencyContactPhone) {
        emergencyContacts.push({
          name: patient.emergencyContactName,
          phone: patient.emergencyContactPhone,
          relationship: 'Emergency Contact',
          isPrimary: true,
        });
      }

      return {
        success: true,
        message: 'Emergency contacts retrieved successfully',
        data: emergencyContacts,
        count: emergencyContacts.length,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve emergency contacts',
        error: error.message,
      };
    }
  }

  /**
   * Add/Update emergency contact
   * POST /patients/:id/emergency-contacts
   */
  @Post(':id/emergency-contacts')
  async addEmergencyContact(
    @Param('id') id: string,
    @Body(new ValidationPipe()) emergencyContactDto: CreateEmergencyContactDto,
    @Request() req: any,
  ) {
    try {
      // For now, we'll update the patient record directly
      // In the future, this could be expanded to support multiple emergency contacts
      const updateDto: UpdatePatientDto = {
        emergencyContactName: emergencyContactDto.contactName,
        emergencyContactPhone: emergencyContactDto.contactPhone,
      };

      const patient = await this.patientService.updatePatient(
        id,
        updateDto,
        req.user?.userId,
      );

      return {
        success: true,
        message: 'Emergency contact added successfully',
        data: {
          name: patient.emergencyContactName,
          phone: patient.emergencyContactPhone,
          relationship: emergencyContactDto.relationship || 'Emergency Contact',
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to add emergency contact',
        error: error.message,
      };
    }
  }

  /**
   * Get patients count by gender
   * GET /patients/analytics/gender-distribution
   */
  @Get('analytics/gender-distribution')
  async getGenderDistribution() {
    try {
      const stats = await this.patientService.getPatientStats();
      return {
        success: true,
        message: 'Gender distribution retrieved successfully',
        data: {
          male: stats.malePatients,
          female: stats.femalePatients,
          total: stats.totalPatients,
          malePercentage:
            stats.totalPatients > 0
              ? Math.round((stats.malePatients / stats.totalPatients) * 100)
              : 0,
          femalePercentage:
            stats.totalPatients > 0
              ? Math.round((stats.femalePatients / stats.totalPatients) * 100)
              : 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve gender distribution',
        error: error.message,
      };
    }
  }
}
