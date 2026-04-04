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
  Request,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { InvoiceService } from './invoice.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceQueryDto } from './dto/invoice-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { InvoiceScopeGuard } from './guards/invoice-scope.guard';
import { INVOICE_ERRORS, SUCCESS_MESSAGES, NOT_FOUND_ERRORS, AUTH_ERRORS } from './constants/invoice-messages';

/**
 * Invoice Controller
 * Handles all invoice-related HTTP endpoints
 * 
 * Requirements: 1.1, 1.14, 1.15, 2.1, 3.1, 4.1, 4.10, 11.1, 11.3, 11.5, 11.7, 11.9
 * 
 * All endpoints require JWT authentication
 * Role-based access control enforced via guards
 * All responses include bilingual messages (Arabic & English)
 */
@ApiTags('Invoices')
@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly invoicePdfService: InvoicePdfService,
  ) {}

  /**
   * Create a new invoice
   * Requirements: 1.1, 1.14, 1.15
   * 
   * Accessible by: Staff, Admin, Manager, Owner
   * Creates invoice in Draft status with DFT-xxxx number
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({
    summary: 'Create a new invoice',
    description:
      'Creates a new invoice for patient services. Invoice is created in Draft status with a temporary DFT-xxxx number. ' +
      'Requires authentication and Staff/Admin/Manager/Owner role. ' +
      'Validates patient and service existence, calculates totals automatically.',
  })
  @ApiResponse({
    status: 201,
    description: 'Invoice created successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم إنشاء الفاتورة بنجاح',
          en: 'Invoice created successfully',
        },
        data: {
          _id: '507f1f77bcf86cd799439014',
          invoiceNumber: 'DFT-0001',
          invoiceTitle: 'Initial Consultation',
          invoiceStatus: 'draft',
          paymentStatus: 'not_due',
          totalAmount: 165,
          paidAmount: 0,
          outstandingBalance: 165,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data or validation error',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Patient or service not found',
  })
  async createInvoice(
    @Body() createInvoiceDto: CreateInvoiceDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    const userRole = req.user?.role;
    const userClinicId = req.user?.clinicId;
    
    if (!userId || !userRole) {
      throw new BadRequestException({
        message: AUTH_ERRORS.UNAUTHORIZED_ACCESS,
        code: 'UNAUTHORIZED',
      });
    }

    const invoice = await this.invoiceService.createInvoice(
      createInvoiceDto,
      userId,
      userRole,
      userClinicId,
    );

    return {
      success: true,
      message: SUCCESS_MESSAGES.INVOICE_CREATED,
      data: invoice,
    };
  }

  /**
   * Get list of invoices with filtering and pagination
   * Requirements: 2.1, 11.1, 11.3
   * 
   * Accessible by: All authenticated users
   * Staff users see only their clinic's invoices
   * Admin/Manager/Owner users see all accessible invoices
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard, InvoiceScopeGuard)
  @Roles(
    UserRole.STAFF,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.OWNER,
    UserRole.DOCTOR,
  )
  @ApiOperation({
    summary: 'Get list of invoices',
    description:
      'Retrieves a paginated list of invoices with optional filtering and sorting. ' +
      'Staff users see only invoices for their assigned clinic. ' +
      'Admin/Manager/Owner users see invoices for all accessible clinics. ' +
      'Supports filtering by status, payment status, date range, and search.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by invoice number, patient name, or invoice title',
  })
  @ApiQuery({
    name: 'invoiceStatus',
    required: false,
    enum: ['draft', 'posted', 'cancelled'],
    description: 'Filter by invoice status',
  })
  @ApiQuery({
    name: 'paymentStatus',
    required: false,
    enum: ['not_due', 'unpaid', 'partially_paid', 'paid'],
    description: 'Filter by payment status',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    description: 'Filter by issue date from (ISO 8601 format)',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    description: 'Filter by issue date to (ISO 8601 format)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 100)',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['invoiceNumber', 'patientName', 'issueDate', 'totalAmount', 'paymentStatus'],
    description: 'Sort field (default: createdAt)',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order (default: desc)',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoices retrieved successfully',
    schema: {
      example: {
        success: true,
        data: [
          {
            _id: '507f1f77bcf86cd799439014',
            invoiceNumber: 'INV-0001',
            invoiceTitle: 'Initial Consultation',
            invoiceStatus: 'posted',
            paymentStatus: 'partially_paid',
            totalAmount: 165,
            paidAmount: 100,
            outstandingBalance: 65,
          },
        ],
        meta: {
          page: 1,
          limit: 10,
          total: 50,
          totalPages: 5,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async getInvoices(@Query() query: InvoiceQueryDto, @Request() req: any) {
    const result = await this.invoiceService.getInvoices(
      query,
      req.user?.role,
      req.user?.subscriptionId,
      req.user?.clinicId,
      req.user?.organizationId,
    );

    return {
      success: true,
      data: result.data,
      meta: result.meta,
    };
  }

  /**
   * Get an invoice suitable for the appointment booking flow.
   * Returns the first posted, unpaid/partially-paid invoice for a patient+clinic.
   * MUST be declared before GET ':id' to avoid route conflict.
   * PART I
   *
   * GET /invoices/for-booking?patientId=...&clinicId=...&invoiceId=... (invoiceId optional)
   */
  @Get('for-booking')
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.STAFF,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.OWNER,
    UserRole.DOCTOR,
  )
  @ApiOperation({
    summary: 'Get invoice for booking',
    description:
      'Returns a posted, unpaid or partially-paid invoice for a specific patient and clinic. ' +
      'Used by the appointment booking flow to link bookings to existing invoices. ' +
      'Optionally narrows to a specific invoiceId.',
  })
  @ApiQuery({ name: 'patientId', required: true, description: 'Patient ID' })
  @ApiQuery({ name: 'clinicId', required: true, description: 'Clinic ID' })
  @ApiQuery({ name: 'invoiceId', required: false, description: 'Optional invoice ID to narrow results' })
  @ApiResponse({ status: 200, description: 'Invoice retrieved successfully' })
  @ApiResponse({ status: 404, description: 'No matching posted invoice found' })
  async getInvoiceForBooking(
    @Query('patientId') patientId: string,
    @Query('clinicId') clinicId: string,
    @Query('invoiceId') invoiceId: string | undefined,
    @Request() req: any,
  ) {
    if (!patientId || !clinicId) {
      throw new BadRequestException({
        message: { ar: 'معرف المريض والعيادة مطلوبان', en: 'patientId and clinicId are required' },
        code: 'MISSING_PARAMS',
      });
    }

    const invoice = await this.invoiceService.getInvoiceForBooking(
      patientId,
      clinicId,
      invoiceId,
      req.user?.userId || req.user?.id || req.user?.sub,
      req.user?.role,
      req.user?.clinicId,
    );

    return {
      success: true,
      message: SUCCESS_MESSAGES.INVOICE_RETRIEVED,
      data: invoice,
    };
  }

  /**
   * Get bookable invoices for a patient.
   * clinicId is optional: when omitted, returns across all accessible clinics
   * (staff/doctor are always scoped to their own clinic via JWT).
   * MUST be declared before GET ':id' to avoid route conflict.
   *
   * GET /invoices/list-for-booking?patientId=...&clinicId=...
   */
  @Get('list-for-booking')
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.STAFF,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.OWNER,
    UserRole.DOCTOR,
  )
  @ApiOperation({
    summary: 'List invoices for booking',
    description:
      'Returns all posted/draft, unpaid or partially-paid invoices for a patient. ' +
      'When clinicId is omitted, returns across all accessible clinics (staff/doctor scoped via JWT). ' +
      'Used by the appointment booking flow to let the user choose which invoice to link.',
  })
  @ApiQuery({ name: 'patientId', required: true, description: 'Patient ID' })
  @ApiQuery({ name: 'clinicId', required: false, description: 'Clinic ID (optional; omit to fetch across all accessible clinics)' })
  @ApiResponse({ status: 200, description: 'Invoices retrieved successfully' })
  async getInvoicesListForBooking(
    @Query('patientId') patientId: string,
    @Query('clinicId') clinicId: string | undefined,
    @Request() req: any,
  ) {
    if (!patientId) {
      throw new BadRequestException({
        message: { ar: 'معرف المريض مطلوب', en: 'patientId is required' },
        code: 'MISSING_PARAMS',
      });
    }

    const invoices = await this.invoiceService.getInvoicesListForBooking(
      patientId,
      clinicId,
      req.user?.role,
      req.user?.clinicId,
    );

    return {
      success: true,
      message: SUCCESS_MESSAGES.INVOICE_RETRIEVED,
      data: invoices,
    };
  }

  /**
   * Get patients who have at least one bookable invoice session for a clinic.
   * Used by the appointment booking form patient dropdown.
   * MUST be declared before GET ':id'.
   *
   * GET /invoices/bookable-patients?clinicId=...&search=...
   */
  @Get('bookable-patients')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER, UserRole.DOCTOR)
  @ApiOperation({ summary: 'List patients with bookable invoice sessions for a clinic' })
  @ApiQuery({ name: 'clinicId', required: true, description: 'Clinic ID' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by patient name or number' })
  @ApiResponse({ status: 200, description: 'Patients retrieved successfully' })
  async getPatientsWithBookableInvoices(
    @Query('clinicId') clinicId: string,
    @Query('search') search?: string,
  ) {
    if (!clinicId) {
      throw new BadRequestException({
        message: { ar: 'معرف العيادة مطلوب', en: 'clinicId is required' },
        code: 'MISSING_CLINIC_ID',
      });
    }
    const patients = await this.invoiceService.getPatientsWithBookableInvoices(clinicId, search);
    return {
      success: true,
      message: { ar: 'تم استرجاع المرضى بنجاح', en: 'Patients retrieved successfully' },
      data: patients,
    };
  }

  /**
   * Get patients who have at least one posted, unpaid/partially-paid invoice.
   * Used by the payment form patient dropdown.
   * MUST be declared before GET ':id'.
   *
   * GET /invoices/payable-patients?search=...
   */
  @Get('payable-patients')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER, UserRole.DOCTOR)
  @ApiOperation({ summary: 'List patients with payable invoices' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by patient name or number' })
  @ApiResponse({ status: 200, description: 'Patients retrieved successfully' })
  async getPatientsWithPayableInvoices(
    @Query('search') search?: string,
    @Request() req?: any,
  ) {
    const patients = await this.invoiceService.getPatientsWithPayableInvoices(
      search,
      req?.user?.role,
      req?.user?.clinicId,
      req?.user?.subscriptionId,
    );
    return {
      success: true,
      message: { ar: 'تم استرجاع المرضى بنجاح', en: 'Patients retrieved successfully' },
      data: patients,
    };
  }

  /**
   * Transition a Draft invoice to Posted status.
   * PATCH /invoices/:id/post
   *
   * Assigns an official INV-xxxx number and makes the invoice available for booking.
   * Idempotent: calling on an already-posted invoice returns it unchanged.
   */
  @Patch(':id/post')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({
    summary: 'Post (publish) a draft invoice',
    description:
      'Transitions a Draft invoice to Posted status, assigning an official INV-xxxx number. ' +
      'After posting, the invoice can be linked to appointments for session booking.',
  })
  @ApiParam({ name: 'id', description: 'Invoice ID', example: '507f1f77bcf86cd799439014' })
  @ApiResponse({ status: 200, description: 'Invoice posted successfully' })
  @ApiResponse({ status: 400, description: 'Invoice is not in Draft status' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async postInvoice(@Param('id') id: string) {
    const invoice = await this.invoiceService.transitionToPosted(id);
    return {
      success: true,
      message: { ar: 'تم نشر الفاتورة بنجاح', en: 'Invoice posted successfully' },
      data: invoice,
    };
  }

  /**
   * Cancel an invoice.
   * PATCH /invoices/:id/cancel
   * PART I
   *
   * Only invoices with paidAmount === 0 can be cancelled.
   * All embedded sessions are also set to 'cancelled'.
   */
  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({
    summary: 'Cancel an invoice',
    description:
      'Cancels a draft or posted invoice that has no associated payments. ' +
      'All embedded invoice sessions are set to cancelled. ' +
      'Only Admin/Manager/Owner can cancel invoices.',
  })
  @ApiParam({ name: 'id', description: 'Invoice ID', example: '507f1f77bcf86cd799439014' })
  @ApiResponse({ status: 200, description: 'Invoice cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Invoice has payments and cannot be cancelled' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async cancelInvoice(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;

    if (!userId) {
      throw new BadRequestException({
        message: AUTH_ERRORS.UNAUTHORIZED_ACCESS,
        code: 'UNAUTHORIZED',
      });
    }

    const invoice = await this.invoiceService.cancelInvoice(id, userId);

    return {
      success: true,
      message: { ar: 'تم إلغاء الفاتورة بنجاح', en: 'Invoice cancelled successfully' },
      data: invoice,
    };
  }

  /**
   * Export invoice as PDF
   * UC-7y8z9a0b: Print/Export Invoice
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
   *
   * IMPORTANT: Must be declared before GET ':id' to avoid route conflict.
   * Accessible by: Staff, Admin, Manager, Owner, Doctor
   */
  @Get(':id/export')
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.STAFF,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.OWNER,
    UserRole.DOCTOR,
  )
  @ApiOperation({
    summary: 'Export invoice as PDF',
    description: 'Generates and downloads a printable PDF for the specified invoice. UC-7y8z9a0b.',
  })
  @ApiParam({ name: 'id', description: 'Invoice ID (MongoDB ObjectId)', example: '507f1f77bcf86cd799439014' })
  @ApiResponse({ status: 200, description: 'PDF file returned as binary stream' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async exportInvoicePdf(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const { buffer, filename } = await this.invoicePdfService.generateInvoicePdf(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  /**
   * Get payment history for an invoice
   * Returns all payments linked to a specific invoice, paginated, newest first.
   */
  @Get(':id/payments')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard, InvoiceScopeGuard)
  @Roles(
    UserRole.STAFF,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.OWNER,
    UserRole.DOCTOR,
  )
  @ApiOperation({
    summary: 'Get payment history for an invoice',
    description: 'Returns all payments linked to a specific invoice, sorted newest first.',
  })
  @ApiParam({ name: 'id', description: 'Invoice ID', example: '507f1f77bcf86cd799439014' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Payment history retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async getInvoicePayments(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.invoiceService.getInvoicePayments(id, page, limit);
  }

  /**
   * Get invoice by ID
   * Requirements: 3.1, 11.5
   *
   * Accessible by: All authenticated users
   * Role-based access control enforced
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.STAFF,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.OWNER,
    UserRole.DOCTOR,
  )
  @ApiOperation({
    summary: 'Get invoice by ID',
    description:
      'Retrieves detailed information about a specific invoice. ' +
      'Includes patient, service, clinic details and financial information. ' +
      'Role-based access control ensures users can only view invoices they have access to.',
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439014',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          _id: '507f1f77bcf86cd799439014',
          invoiceNumber: 'INV-0001',
          invoiceTitle: 'Initial Consultation',
          invoiceStatus: 'posted',
          paymentStatus: 'partially_paid',
          totalAmount: 165,
          paidAmount: 100,
          outstandingBalance: 65,
          patient: {
            _id: '507f1f77bcf86cd799439011',
            firstName: 'John',
            lastName: 'Doe',
          },
          service: {
            _id: '507f1f77bcf86cd799439013',
            name: 'Consultation',
            price: 200,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - No access to this invoice',
  })
  @ApiResponse({
    status: 404,
    description: 'Invoice not found',
  })
  async getInvoiceById(@Param('id') id: string, @Request() req: any) {
    const user = req.user;
    
    if (!user) {
      throw new BadRequestException({
        message: AUTH_ERRORS.UNAUTHORIZED_ACCESS,
        code: 'UNAUTHORIZED',
      });
    }

    // Extract user details for role-based access control
    const userId = user.id || user.userId || user.sub;
    const userRole = user.role;
    const userClinicIds = user.clinicId ? [user.clinicId] : [];

    const invoice = await this.invoiceService.getInvoiceById(
      id,
      userId,
      userRole,
      userClinicIds,
    );

    if (!invoice) {
      throw new NotFoundException({
        message: NOT_FOUND_ERRORS.INVOICE,
        code: 'INVOICE_NOT_FOUND',
      });
    }

    return {
      success: true,
      data: invoice,
    };
  }

  /**
   * Update an invoice (Draft only)
   * Requirements: 4.1, 4.10, 11.7, 11.9
   * 
   * Accessible by: Staff (own invoices), Admin, Manager, Owner
   * Only Draft invoices can be updated
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({
    summary: 'Update an invoice',
    description:
      'Updates an existing invoice. Only Draft invoices can be updated. ' +
      'Staff users can only update invoices they created. ' +
      'Admin/Manager/Owner users can update any Draft invoice. ' +
      'Patient field cannot be modified. Financial calculations are updated automatically.',
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439014',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice updated successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم تحديث الفاتورة بنجاح',
          en: 'Invoice updated successfully',
        },
        data: {
          _id: '507f1f77bcf86cd799439014',
          invoiceNumber: 'DFT-0001',
          invoiceTitle: 'Updated Consultation',
          invoiceStatus: 'draft',
          totalAmount: 180,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data or invoice is not in Draft status',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - No permission to update this invoice',
  })
  @ApiResponse({
    status: 404,
    description: 'Invoice not found',
  })
  async updateInvoice(
    @Param('id') id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    const user = req.user;
    
    if (!userId || !user) {
      throw new BadRequestException({
        message: AUTH_ERRORS.UNAUTHORIZED_ACCESS,
        code: 'UNAUTHORIZED',
      });
    }

    const userRole = user.role;
    const userOrganizationId = user.organizationId;

    const invoice = await this.invoiceService.updateInvoice(
      id,
      updateInvoiceDto,
      userId,
      userRole,
      userOrganizationId,
      user.subscriptionId,
    );

    return {
      success: true,
      message: SUCCESS_MESSAGES.INVOICE_UPDATED,
      data: invoice,
    };
  }

  /**
   * Soft delete an invoice
   * Requirements: 11.9
   * 
   * Accessible by: Admin, Manager, Owner
   * Performs soft delete (sets deletedAt timestamp)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({
    summary: 'Delete an invoice (soft delete)',
    description:
      'Soft deletes an invoice by setting the deletedAt timestamp. ' +
      'The invoice is not physically removed from the database. ' +
      'Only Admin/Manager/Owner users can delete invoices. ' +
      'Invoices with associated payments cannot be deleted.',
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439014',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice deleted successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم حذف الفاتورة بنجاح',
          en: 'Invoice deleted successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete invoice with associated payments',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Invoice not found',
  })
  async deleteInvoice(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    const userRole = req.user?.role;
    
    if (!userId || !userRole) {
      throw new BadRequestException({
        message: AUTH_ERRORS.UNAUTHORIZED_ACCESS,
        code: 'UNAUTHORIZED',
      });
    }

    const userOrganizationId = req.user?.organizationId;
    await this.invoiceService.deleteInvoice(id, userId, userRole, userOrganizationId, req.user?.subscriptionId);

    return {
      success: true,
      message: SUCCESS_MESSAGES.INVOICE_DELETED,
    };
  }
}
