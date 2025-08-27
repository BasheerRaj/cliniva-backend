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
import { MedicalReportService } from './medical-report.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateMedicalReportDto,
  UpdateMedicalReportDto,
  MedicalReportSearchQueryDto,
  ShareMedicalReportDto,
  BulkCreateMedicalReportDto,
  GenerateMedicalReportPdfDto,
  MedicalReportFilterDto,
} from './dto';

@Controller('medical-reports')
@UseGuards(JwtAuthGuard)
export class MedicalReportController {
  constructor(private readonly medicalReportService: MedicalReportService) {}

  /**
   * Create a new medical report
   * POST /medical-reports
   */
  @Post()
  async createMedicalReport(
    @Body(new ValidationPipe()) createMedicalReportDto: CreateMedicalReportDto,
    @Request() req: any
  ) {
    try {
      const report = await this.medicalReportService.createMedicalReport(
        createMedicalReportDto,
        req.user?.userId
      );
      return {
        success: true,
        message: 'Medical report created successfully',
        data: report
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create medical report',
        error: error.message
      };
    }
  }

  /**
   * Get all medical reports with filtering and pagination
   * GET /medical-reports
   */
  @Get()
  async getMedicalReports(@Query(new ValidationPipe()) query: MedicalReportSearchQueryDto) {
    try {
      const result = await this.medicalReportService.getMedicalReports(query);
      return {
        success: true,
        message: 'Medical reports retrieved successfully',
        data: result.reports,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit: parseInt(query.limit || '10')
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve medical reports',
        error: error.message
      };
    }
  }

  /**
   * Get medical report by ID
   * GET /medical-reports/:id
   */
  @Get(':id')
  async getMedicalReport(@Param('id') id: string) {
    try {
      const report = await this.medicalReportService.getMedicalReportById(id);
      return {
        success: true,
        message: 'Medical report retrieved successfully',
        data: report
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve medical report',
        error: error.message
      };
    }
  }

  /**
   * Update medical report information
   * PUT /medical-reports/:id
   */
  @Put(':id')
  async updateMedicalReport(
    @Param('id') id: string,
    @Body(new ValidationPipe()) updateMedicalReportDto: UpdateMedicalReportDto,
    @Request() req: any
  ) {
    try {
      const report = await this.medicalReportService.updateMedicalReport(
        id,
        updateMedicalReportDto,
        req.user?.userId
      );
      return {
        success: true,
        message: 'Medical report updated successfully',
        data: report
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update medical report',
        error: error.message
      };
    }
  }

  /**
   * Soft delete medical report
   * DELETE /medical-reports/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteMedicalReport(@Param('id') id: string, @Request() req: any) {
    try {
      await this.medicalReportService.deleteMedicalReport(id, req.user?.userId);
      return {
        success: true,
        message: 'Medical report deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to delete medical report',
        error: error.message
      };
    }
  }

  /**
   * Share medical report with users
   * POST /medical-reports/:id/share
   */
  @Post(':id/share')
  async shareMedicalReport(
    @Param('id') id: string,
    @Body(new ValidationPipe()) shareDto: ShareMedicalReportDto,
    @Request() req: any
  ) {
    try {
      const result = await this.medicalReportService.shareMedicalReport(
        id,
        shareDto,
        req.user?.userId
      );
      return {
        success: true,
        message: result.message,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to share medical report',
        error: error.message
      };
    }
  }

  /**
   * Get medical report by appointment ID
   * GET /medical-reports/appointment/:appointmentId
   */
  @Get('appointment/:appointmentId')
  async getMedicalReportByAppointment(@Param('appointmentId') appointmentId: string) {
    try {
      const report = await this.medicalReportService.getReportByAppointmentId(appointmentId);
      if (!report) {
        return {
          success: true,
          message: 'No medical report found for this appointment',
          data: null
        };
      }
      return {
        success: true,
        message: 'Medical report retrieved successfully',
        data: report
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve medical report',
        error: error.message
      };
    }
  }

  /**
   * Get patient's medical history
   * GET /medical-reports/patient/:patientId
   */
  @Get('patient/:patientId')
  async getPatientMedicalHistory(@Param('patientId') patientId: string) {
    try {
      const history = await this.medicalReportService.getPatientMedicalHistory(patientId);
      return {
        success: true,
        message: 'Patient medical history retrieved successfully',
        data: history
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve patient medical history',
        error: error.message
      };
    }
  }

  /**
   * Get doctor's report statistics
   * GET /medical-reports/doctor/:doctorId/stats
   */
  @Get('doctor/:doctorId/stats')
  async getDoctorReportStats(@Param('doctorId') doctorId: string) {
    try {
      const stats = await this.medicalReportService.getDoctorReportStats(doctorId);
      return {
        success: true,
        message: 'Doctor report statistics retrieved successfully',
        data: stats
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve doctor statistics',
        error: error.message
      };
    }
  }

  /**
   * Get medical report statistics
   * GET /medical-reports/stats/overview
   */
  @Get('stats/overview')
  async getMedicalReportStats() {
    try {
      const stats = await this.medicalReportService.getMedicalReportStats();
      return {
        success: true,
        message: 'Medical report statistics retrieved successfully',
        data: stats
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve medical report statistics',
        error: error.message
      };
    }
  }

  /**
   * Get reports requiring follow-up
   * GET /medical-reports/follow-up/pending
   */
  @Get('follow-up/pending')
  async getPendingFollowUpReports() {
    try {
      const reports = await this.medicalReportService.getReportsRequiringFollowUp();
      return {
        success: true,
        message: 'Pending follow-up reports retrieved successfully',
        data: reports,
        count: reports.length
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve pending follow-up reports',
        error: error.message
      };
    }
  }

  /**
   * Search medical reports
   * GET /medical-reports/search/query?q=searchTerm
   */
  @Get('search/query')
  async searchMedicalReports(
    @Query('q') searchTerm: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('diagnoses') diagnoses?: string,
    @Query('doctorIds') doctorIds?: string,
    @Query('hasFollowUp') hasFollowUp?: string,
    @Query('dateRange') dateRange?: string
  ) {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        throw new BadRequestException('Search term is required');
      }

      // Build filter object
      const filters: MedicalReportFilterDto = {};
      if (diagnoses) filters.diagnoses = diagnoses.split(',');
      if (doctorIds) filters.doctorIds = doctorIds.split(',');
      if (hasFollowUp) filters.hasFollowUp = hasFollowUp === 'true';
      if (dateRange) filters.dateRange = dateRange;

      const reports = await this.medicalReportService.searchMedicalReports(
        searchTerm,
        filters,
        limit || 20
      );

      return {
        success: true,
        message: 'Search completed successfully',
        data: reports,
        count: reports.length
      };
    } catch (error) {
      return {
        success: false,
        message: 'Search failed',
        error: error.message
      };
    }
  }

  /**
   * Get medical reports by patient ID with pagination
   * GET /medical-reports/patients/:patientId/reports
   */
  @Get('patients/:patientId/reports')
  async getPatientReports(
    @Param('patientId') patientId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc'
  ) {
    try {
      const query: MedicalReportSearchQueryDto = {
        patientId,
        page: page || '1',
        limit: limit || '10',
        sortBy: sortBy || 'createdAt',
        sortOrder: sortOrder || 'desc'
      };

      const result = await this.medicalReportService.getMedicalReports(query);
      return {
        success: true,
        message: 'Patient reports retrieved successfully',
        data: result.reports,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit: parseInt(limit || '10')
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve patient reports',
        error: error.message
      };
    }
  }

  /**
   * Get medical reports by doctor ID
   * GET /medical-reports/doctors/:doctorId/reports
   */
  @Get('doctors/:doctorId/reports')
  async getDoctorReports(
    @Param('doctorId') doctorId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    try {
      const query: MedicalReportSearchQueryDto = {
        doctorId,
        page: page || '1',
        limit: limit || '10',
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      const result = await this.medicalReportService.getMedicalReports(query);
      return {
        success: true,
        message: 'Doctor reports retrieved successfully',
        data: result.reports,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve doctor reports',
        error: error.message
      };
    }
  }

  /**
   * Get reports by date range
   * GET /medical-reports/reports/date-range?from=YYYY-MM-DD&to=YYYY-MM-DD
   */
  @Get('reports/date-range')
  async getReportsByDateRange(
    @Query('from') dateFrom: string,
    @Query('to') dateTo: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    try {
      if (!dateFrom || !dateTo) {
        throw new BadRequestException('Both from and to date parameters are required');
      }

      const query: MedicalReportSearchQueryDto = {
        dateFrom,
        dateTo,
        page: page || '1',
        limit: limit || '20'
      };

      const result = await this.medicalReportService.getMedicalReports(query);
      return {
        success: true,
        message: 'Reports in date range retrieved successfully',
        data: result.reports,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages
        },
        dateRange: {
          from: dateFrom,
          to: dateTo
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve reports by date range',
        error: error.message
      };
    }
  }

  /**
   * Get reports by visibility status
   * GET /medical-reports/visibility/:status
   */
  @Get('visibility/:status')
  async getReportsByVisibility(
    @Param('status') status: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    try {
      const isVisible = status === 'visible';
      
      const query: MedicalReportSearchQueryDto = {
        isVisibleToPatient: isVisible,
        page: page || '1',
        limit: limit || '10'
      };

      const result = await this.medicalReportService.getMedicalReports(query);
      return {
        success: true,
        message: `Reports ${status} to patients retrieved successfully`,
        data: result.reports,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve reports by visibility',
        error: error.message
      };
    }
  }

  /**
   * Get reports with follow-up recommendations
   * GET /medical-reports/follow-up/recommended
   */
  @Get('follow-up/recommended')
  async getReportsWithFollowUp(
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    try {
      const query: MedicalReportSearchQueryDto = {
        nextAppointmentRecommended: true,
        page: page || '1',
        limit: limit || '10'
      };

      const result = await this.medicalReportService.getMedicalReports(query);
      return {
        success: true,
        message: 'Reports with follow-up recommendations retrieved successfully',
        data: result.reports,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve reports with follow-up',
        error: error.message
      };
    }
  }

  /**
   * Generate PDF for medical report
   * POST /medical-reports/:id/pdf
   */
  @Post(':id/pdf')
  async generateReportPdf(
    @Param('id') id: string,
    @Body(new ValidationPipe()) pdfOptions: GenerateMedicalReportPdfDto
  ) {
    try {
      // Get the report data
      const report = await this.medicalReportService.getMedicalReportById(id);
      
      // In a real implementation, you would:
      // 1. Use a PDF generation library (like puppeteer, jsPDF, or PDFKit)
      // 2. Create a formatted PDF with the report data
      // 3. Include optional elements based on pdfOptions
      // 4. Return the PDF buffer or save it and return URL

      return {
        success: true,
        message: 'PDF generation requested successfully',
        data: {
          reportId: id,
          pdfOptions,
          // In real implementation:
          // pdfUrl: 'url-to-generated-pdf',
          // pdfBuffer: buffer-data
          message: 'PDF generation would be implemented here'
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to generate PDF',
        error: error.message
      };
    }
  }

  /**
   * Get report analytics by diagnosis
   * GET /medical-reports/analytics/diagnoses
   */
  @Get('analytics/diagnoses')
  async getDiagnosisAnalytics(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number
  ) {
    try {
      const stats = await this.medicalReportService.getMedicalReportStats();
      
      return {
        success: true,
        message: 'Diagnosis analytics retrieved successfully',
        data: {
          topDiagnoses: stats.topDiagnoses.slice(0, limit || 10),
          totalUniqueDiganoses: stats.topDiagnoses.length,
          analysisDate: new Date()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve diagnosis analytics',
        error: error.message
      };
    }
  }

  /**
   * Get report version history (placeholder for future implementation)
   * GET /medical-reports/:id/versions
   */
  @Get(':id/versions')
  async getReportVersions(@Param('id') id: string) {
    try {
      // This would require implementing a separate version tracking system
      const report = await this.medicalReportService.getMedicalReportById(id);
      
      return {
        success: true,
        message: 'Report version history retrieved',
        data: {
          reportId: id,
          currentVersion: report.version,
          versions: [
                         {
               version: report.version,
               createdAt: (report as any).updatedAt || (report as any).createdAt,
               updatedBy: report.updatedBy || report.createdBy,
               isCurrent: true
             }
          ],
          message: 'Full version tracking would be implemented here'
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve version history',
        error: error.message
      };
    }
  }
} 