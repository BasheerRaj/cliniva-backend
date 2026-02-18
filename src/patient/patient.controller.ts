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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiExtraModels,
} from '@nestjs/swagger';
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
import * as SwaggerExamples from './examples/swagger-examples';

@ApiTags('Patients')
@ApiBearerAuth('JWT-auth')
@ApiExtraModels(
  CreatePatientDto,
  UpdatePatientDto,
  PatientResponseDto,
  PatientStatsDto,
)
@Controller('patients')
@UseGuards(JwtAuthGuard)
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  /**
   * Create a new patient
   * POST /patients
   */
  @Post()
  @ApiOperation({
    summary: 'Create a new patient record',
    description: `Creates a new patient with unique card number validation.
    
**Business Rules:**
- Card number must be unique across all patients
- Patient number is auto-generated in format PAT{YEAR}{SEQUENCE}
- New patients are created with status "Active" by default
- Email and phone must be unique if provided
- Date of birth cannot be in the future and age must be ≤ 150 years
- Emergency contact name and phone must both be provided or both omitted

**Validation:**
- cardNumber: Required, string
- firstName: Required, 2-50 characters
- lastName: Required, 2-50 characters
- dateOfBirth: Required, ISO 8601 date format
- gender: Required, one of: male, female, other
- phone: Optional, 10-20 characters, must be unique
- email: Optional, valid email format, must be unique
- bloodType: Optional, one of: A+, A-, B+, B-, AB+, AB-, O+, O-`,
  })
  @ApiBody({
    type: CreatePatientDto,
    examples: {
      complete: {
        summary: 'Complete patient record',
        description:
          'Example with all fields including insurance and emergency contact',
        value: SwaggerExamples.CREATE_PATIENT_REQUEST_EXAMPLE,
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Patient created successfully',
    schema: {
      example: SwaggerExamples.CREATE_PATIENT_RESPONSE_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or invalid data',
    schema: {
      oneOf: [
        { example: SwaggerExamples.ERROR_VALIDATION_EXAMPLE },
        { example: SwaggerExamples.ERROR_INVALID_DATE_OF_BIRTH_EXAMPLE },
        { example: SwaggerExamples.ERROR_INCOMPLETE_EMERGENCY_CONTACT_EXAMPLE },
      ],
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Duplicate card number, email, or phone',
    schema: {
      oneOf: [
        { example: SwaggerExamples.ERROR_DUPLICATE_CARD_NUMBER_EXAMPLE },
        { example: SwaggerExamples.ERROR_DUPLICATE_EMAIL_EXAMPLE },
        { example: SwaggerExamples.ERROR_DUPLICATE_PHONE_EXAMPLE },
      ],
    },
  })
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
  @ApiOperation({
    summary: 'Get list of patients with filters',
    description: `Retrieves a paginated list of patients with optional filtering.
    
**Features:**
- Pagination support (page, limit)
- Multi-field search (firstName, lastName, phone, email, patientNumber, cardNumber)
- Filtering by status, gender, insurance status
- Sorting by any field (ascending/descending)
- Excludes soft-deleted patients

**Query Parameters:**
- page: Page number (default: 1)
- limit: Items per page (default: 10, max: 100)
- search: Search term for multi-field search
- status: Filter by patient status (Active/Inactive)
- gender: Filter by gender (male/female/other)
- insuranceStatus: Filter by insurance status
- sortBy: Field to sort by (default: createdAt)
- sortOrder: Sort direction (asc/desc, default: desc)`,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
    example: 10,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['Active', 'Inactive'],
    description: 'Patient status',
  })
  @ApiQuery({
    name: 'gender',
    required: false,
    enum: ['male', 'female', 'other'],
    description: 'Patient gender',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    description: 'Sort field',
    example: 'createdAt',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort direction',
    example: 'desc',
  })
  @ApiResponse({
    status: 200,
    description: 'Patients retrieved successfully',
    schema: {
      example: SwaggerExamples.GET_PATIENTS_RESPONSE_EXAMPLE,
    },
  })
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
  @ApiOperation({
    summary: 'Get patient by ID',
    description: `Retrieves complete patient details by ID.
    
**Returns:**
- All patient fields (personal, contact, insurance, emergency contact)
- Calculated age from date of birth
- Current patient status (Active/Inactive)

**Excludes:**
- Soft-deleted patients (returns 404)`,
  })
  @ApiParam({
    name: 'id',
    description: 'Patient ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Patient retrieved successfully',
    schema: {
      example: SwaggerExamples.GET_PATIENT_RESPONSE_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid patient ID',
    schema: {
      example: SwaggerExamples.ERROR_INVALID_PATIENT_ID_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Patient not found or soft-deleted',
    schema: {
      example: SwaggerExamples.ERROR_PATIENT_NOT_FOUND_EXAMPLE,
    },
  })
  async getPatient(@Param('id') id: string) {
    try {
      const patient = await this.patientService.getPatientById(id);

      // Calculate age from dateOfBirth (Requirement 3.4)
      const calculateAge = (dateOfBirth: Date): number => {
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (
          monthDiff < 0 ||
          (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ) {
          age--;
        }

        return age;
      };

      const age = calculateAge(patient.dateOfBirth);

      return {
        success: true,
        message: 'Patient retrieved successfully',
        data: {
          ...patient.toObject(),
          age, // Include calculated age (Requirement 3.4)
        },
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
  @ApiOperation({
    summary: 'Update patient record',
    description: `Updates patient information while preventing changes to immutable fields.
    
**Business Rules:**
- Card number CANNOT be modified after creation
- Email and phone must remain unique if changed
- Soft-deleted patients cannot be updated
- All validation rules apply to updated fields
- Audit log records update with changed fields

**Validation:**
- All fields are optional in update
- Same validation rules as creation apply when fields are provided
- cardNumber field is not allowed in update DTO`,
  })
  @ApiParam({
    name: 'id',
    description: 'Patient ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({
    type: UpdatePatientDto,
    examples: {
      partial: {
        summary: 'Partial update',
        description: 'Update only specific fields',
        value: SwaggerExamples.UPDATE_PATIENT_REQUEST_EXAMPLE,
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Patient updated successfully',
    schema: {
      example: SwaggerExamples.UPDATE_PATIENT_RESPONSE_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid patient ID or card number in update',
    schema: {
      oneOf: [
        { example: SwaggerExamples.ERROR_INVALID_PATIENT_ID_EXAMPLE },
        { example: SwaggerExamples.ERROR_CARD_NUMBER_NOT_EDITABLE_EXAMPLE },
      ],
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Patient not found or soft-deleted',
    schema: {
      example: SwaggerExamples.ERROR_PATIENT_NOT_FOUND_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Duplicate email or phone',
    schema: {
      oneOf: [
        { example: SwaggerExamples.ERROR_DUPLICATE_EMAIL_EXAMPLE },
        { example: SwaggerExamples.ERROR_DUPLICATE_PHONE_EXAMPLE },
      ],
    },
  })
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
   * Deactivate patient
   * PUT /patients/:id/deactivate
   */
  @Put(':id/deactivate')
  @ApiOperation({
    summary: 'Deactivate patient and cancel upcoming appointments',
    description: `Deactivates a patient and automatically cancels all active appointments.
    
**Business Rules:**
- Changes patient status from "Active" to "Inactive"
- Automatically cancels all scheduled and confirmed appointments
- Cancelled appointments have cancellationReason set to "Patient deactivated"
- Operation is atomic (uses database transaction)
- Idempotent - deactivating an already inactive patient succeeds without error
- Audit log records deactivation with count of cancelled appointments

**Use Cases:**
- Patient requests to stop receiving services
- Patient moves to another facility
- Patient is deceased
- Administrative reasons

**Impact:**
- Patient cannot be scheduled for new appointments while inactive
- Existing appointment slots are released back to availability
- Patient can be reactivated later if needed`,
  })
  @ApiParam({
    name: 'id',
    description: 'Patient ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Patient deactivated and appointments cancelled successfully',
    schema: {
      example: SwaggerExamples.DEACTIVATE_PATIENT_RESPONSE_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid patient ID',
    schema: {
      example: SwaggerExamples.ERROR_INVALID_PATIENT_ID_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Patient not found',
    schema: {
      example: SwaggerExamples.ERROR_PATIENT_NOT_FOUND_EXAMPLE,
    },
  })
  async deactivatePatient(@Param('id') id: string, @Request() req: any) {
    try {
      const patient = await this.patientService.deactivatePatient(
        id,
        req.user?.userId,
      );
      return {
        success: true,
        message: 'Patient deactivated and appointments cancelled',
        data: patient,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to deactivate patient',
        error: error.message,
      };
    }
  }

  /**
   * Activate patient
   * PUT /patients/:id/activate
   */
  @Put(':id/activate')
  @ApiOperation({
    summary: 'Activate patient',
    description: `Activates an inactive patient, allowing them to be scheduled for appointments.
    
**Business Rules:**
- Changes patient status from "Inactive" to "Active"
- Allows patient to be scheduled for new appointments
- Does not restore previously cancelled appointments
- Idempotent - activating an already active patient succeeds without error
- Audit log records activation event

**Use Cases:**
- Patient returns after temporary absence
- Patient completes required administrative tasks
- Reactivating after administrative hold

**Impact:**
- Patient becomes eligible for new appointment bookings
- Patient appears in active patient lists and searches
- Previous appointment history is preserved`,
  })
  @ApiParam({
    name: 'id',
    description: 'Patient ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Patient activated successfully',
    schema: {
      example: SwaggerExamples.ACTIVATE_PATIENT_RESPONSE_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid patient ID',
    schema: {
      example: SwaggerExamples.ERROR_INVALID_PATIENT_ID_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Patient not found',
    schema: {
      example: SwaggerExamples.ERROR_PATIENT_NOT_FOUND_EXAMPLE,
    },
  })
  async activatePatient(@Param('id') id: string, @Request() req: any) {
    try {
      const patient = await this.patientService.activatePatient(
        id,
        req.user?.userId,
      );
      return {
        success: true,
        message: 'Patient activated successfully',
        data: patient,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to activate patient',
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
  @ApiOperation({
    summary: 'Soft delete patient',
    description: `Performs a soft delete on a patient record after validation.
    
**Business Rules:**
- Only inactive patients can be deleted
- Attempting to delete an active patient returns error
- Deletion is soft delete (sets deletedAt timestamp)
- Soft-deleted patients are excluded from all queries
- Patient record is preserved in database for audit purposes
- Audit log records deletion event

**Required Steps:**
1. Patient must be deactivated first (PUT /patients/:id/deactivate)
2. Then patient can be deleted (DELETE /patients/:id)

**Use Cases:**
- Removing patient records per data retention policy
- Patient requests data removal (GDPR compliance)
- Cleaning up duplicate or test records

**Impact:**
- Patient no longer appears in any lists or searches
- Patient data is preserved for audit and compliance
- Patient can potentially be restored by database administrator`,
  })
  @ApiParam({
    name: 'id',
    description: 'Patient ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Patient deleted successfully',
    schema: {
      example: SwaggerExamples.DELETE_PATIENT_RESPONSE_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid patient ID or patient is still active',
    schema: {
      oneOf: [
        { example: SwaggerExamples.ERROR_INVALID_PATIENT_ID_EXAMPLE },
        { example: SwaggerExamples.ERROR_PATIENT_MUST_BE_DEACTIVATED_EXAMPLE },
      ],
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Patient not found',
    schema: {
      example: SwaggerExamples.ERROR_PATIENT_NOT_FOUND_EXAMPLE,
    },
  })
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
   * GET /patients/search/query?q=searchTerm
   */
  @Get('search/query')
  @ApiOperation({
    summary: 'Search patients by term',
    description: `Searches for patients across multiple fields.
    
**Search Fields:**
- firstName
- lastName
- phone
- email
- patientNumber
- cardNumber

**Features:**
- Case-insensitive search
- Partial matching
- Maximum 50 results
- Excludes soft-deleted patients

**Validation:**
- Search term is required
- Empty or whitespace-only terms return empty results`,
  })
  @ApiQuery({ name: 'q', description: 'Search term', example: 'Ahmed' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum results (default: 20, max: 50)',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Search completed successfully',
    schema: {
      example: SwaggerExamples.SEARCH_PATIENTS_RESPONSE_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Search term is required',
  })
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
        insuranceCompany: patient.insuranceCompany,
        insuranceMemberNumber: patient.insuranceMemberNumber,
        insuranceStatus: patient.insuranceStatus,
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
  @ApiOperation({
    summary: 'Get patient statistics',
    description: `Retrieves comprehensive patient statistics.
    
**Statistics Included:**
- Total patient count
- Count by gender (male, female, other)
- Average patient age
- Patients with active insurance
- Recently registered patients (last 30 days)

**Business Rules:**
- All counts exclude soft-deleted patients
- Total count equals sum of gender counts
- Average age calculated from all non-deleted patients
- Insurance count includes only patients with insuranceStatus = "Active"
- Recent count includes patients created within last 30 days`,
  })
  @ApiResponse({
    status: 200,
    description: 'Patient statistics retrieved successfully',
    schema: {
      example: SwaggerExamples.PATIENT_STATS_RESPONSE_EXAMPLE,
    },
  })
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
   * GET /patients/recent/list?limit=10
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
          relationship:
            patient.emergencyContactRelationship || 'Emergency Contact',
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
        emergencyContactRelationship: emergencyContactDto.relationship,
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
          relationship:
            patient.emergencyContactRelationship || 'Emergency Contact',
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
