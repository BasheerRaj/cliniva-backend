import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { PAYMENT_ERRORS, SUCCESS_MESSAGES, NOT_FOUND_ERRORS, AUTH_ERRORS } from './constants/payment-messages';

/**
 * Payment Controller
 * Handles all payment-related HTTP endpoints
 * 
 * Requirements: 6.1, 6.12, 8.1, 9.1, 9.8, 9.9, 10.1, 10.12, 11.2, 11.4, 11.6, 11.8, 11.10
 * 
 * All endpoints require JWT authentication
 * Role-based access control enforced via guards
 * All responses include bilingual messages (Arabic & English)
 */
@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Create a new payment
   * Requirements: 6.1, 6.12
   * 
   * Accessible by: Staff, Admin, Manager, Owner
   * Records payment against a Posted invoice
   * Automatically updates invoice balances and payment status
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({
    summary: 'Create a new payment',
    description:
      'Records a new payment against a Posted invoice. ' +
      'Requires authentication and Staff/Admin/Manager/Owner role. ' +
      'Validates payment amount against outstanding balance. ' +
      'Automatically updates invoice balances and payment status within a transaction. ' +
      'Payment date cannot be in the future.',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment created successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم حفظ الدفعة بنجاح وتحديث أرصدة الفاتورة',
          en: 'Payment saved successfully and invoice balances updated',
        },
        data: {
          _id: '507f1f77bcf86cd799439016',
          paymentId: 'PAY-0001',
          invoiceId: '507f1f77bcf86cd799439014',
          patientId: '507f1f77bcf86cd799439011',
          amount: 100,
          paymentMethod: 'cash',
          paymentDate: '2024-01-16T00:00:00.000Z',
          addedBy: '507f1f77bcf86cd799439015',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data or validation error (amount exceeds balance, zero amount, future date, etc.)',
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
    description: 'Invoice or patient not found',
  })
  async createPayment(
    @Body() createPaymentDto: CreatePaymentDto,
    @Request() req: any,
  ) {
    try {
      const userId = req.user?.id || req.user?.userId || req.user?.sub;
      
      if (!userId) {
        throw new BadRequestException({
          message: AUTH_ERRORS.UNAUTHORIZED_ACCESS,
          code: 'UNAUTHORIZED',
        });
      }

      const payment = await this.paymentService.createPayment(
        createPaymentDto,
        userId,
        req.user,
      );

      return {
        success: true,
        message: SUCCESS_MESSAGES.PAYMENT_CREATED,
        data: payment,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get list of payments with filtering and pagination
   * Requirements: 8.1, 11.2, 11.4
   * 
   * Accessible by: All authenticated users
   * Staff users see only their clinic's payments
   * Admin/Manager/Owner users see all accessible payments
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.STAFF,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.OWNER,
    UserRole.DOCTOR,
  )
  @ApiOperation({
    summary: 'Get list of payments',
    description:
      'Retrieves a paginated list of payments with optional filtering and sorting. ' +
      'Staff users see only payments for their assigned clinic. ' +
      'Admin/Manager/Owner users see payments for all accessible clinics. ' +
      'Supports filtering by payment method, date range, invoice number, and search.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by payment ID, patient name, or invoice number',
  })
  @ApiQuery({
    name: 'paymentMethod',
    required: false,
    enum: ['cash', 'card', 'bank_transfer', 'insurance', 'check', 'digital_wallet'],
    description: 'Filter by payment method',
  })
  @ApiQuery({
    name: 'invoiceId',
    required: false,
    description: 'Filter by invoice ID',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    description: 'Filter by payment date from (ISO 8601 format)',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    description: 'Filter by payment date to (ISO 8601 format)',
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
    enum: ['paymentDate', 'amount', 'patientName'],
    description: 'Sort field (default: paymentDate)',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order (default: desc)',
  })
  @ApiResponse({
    status: 200,
    description: 'Payments retrieved successfully',
    schema: {
      example: {
        success: true,
        data: [
          {
            _id: '507f1f77bcf86cd799439016',
            paymentId: 'PAY-0001',
            invoiceId: {
              _id: '507f1f77bcf86cd799439014',
              invoiceNumber: 'INV-0001',
            },
            patientId: {
              _id: '507f1f77bcf86cd799439011',
              firstName: 'John',
              lastName: 'Doe',
            },
            amount: 100,
            paymentMethod: 'cash',
            paymentDate: '2024-01-16T00:00:00.000Z',
          },
        ],
        meta: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async getPayments(@Query() query: PaymentQueryDto, @Request() req: any) {
    try {
      const user = req.user;
      
      if (!user) {
        throw new BadRequestException({
          message: AUTH_ERRORS.UNAUTHORIZED_ACCESS,
          code: 'UNAUTHORIZED',
        });
      }

      // Extract user details for role-based filtering
      const userId = user.id || user.userId || user.sub;
      const userRole = user.role;
      const userClinicId = user.clinicId || null;
      const userClinicIds = Array.isArray(user?.clinicIds)
        ? user.clinicIds.map(String)
        : undefined;
      const userOrganizationId = user.organizationId || null;
      const userComplexId = user.complexId || null;

      const result = await this.paymentService.getPayments(
        query,
        userId,
        userRole,
        userClinicId,
        userClinicIds,
        userOrganizationId,
        userComplexId,
        user.subscriptionId || null,
      );

      return {
        success: true,
        data: result.data,
        meta: result.meta,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get payment by ID
   * Requirements: 9.1, 11.6
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
    summary: 'Get payment by ID',
    description:
      'Retrieves detailed information about a specific payment. ' +
      'Includes patient, invoice, clinic details and payment information. ' +
      'Role-based access control ensures users can only view payments they have access to.',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439016',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          _id: '507f1f77bcf86cd799439016',
          paymentId: 'PAY-0001',
          invoiceId: {
            _id: '507f1f77bcf86cd799439014',
            invoiceNumber: 'INV-0001',
            invoiceTitle: 'Initial Consultation',
            totalAmount: 165,
            paidAmount: 100,
            outstandingBalance: 65,
          },
          patientId: {
            _id: '507f1f77bcf86cd799439011',
            firstName: 'John',
            lastName: 'Doe',
          },
          amount: 100,
          paymentMethod: 'cash',
          paymentDate: '2024-01-16T00:00:00.000Z',
          notes: 'Partial payment',
          addedBy: {
            _id: '507f1f77bcf86cd799439015',
            firstName: 'Admin',
            lastName: 'User',
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
    description: 'Forbidden - No access to this payment',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
  })
  async getPaymentById(@Param('id') id: string, @Request() req: any) {
    try {
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
      const userClinicIds = Array.isArray(user?.clinicIds)
        ? user.clinicIds.map(String)
        : user.clinicId
        ? [String(user.clinicId)]
        : [];

      const payment = await this.paymentService.getPaymentById(
        id,
        userId,
        userRole,
        userClinicIds,
        user,
      );

      if (!payment) {
        throw new NotFoundException({
          message: NOT_FOUND_ERRORS.PAYMENT,
          code: 'PAYMENT_NOT_FOUND',
        });
      }

      return {
        success: true,
        data: payment,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update a payment
   * Requirements: 10.1, 10.12, 11.8, 11.10
   * 
   * Accessible by: Staff (own payments), Admin, Manager, Owner
   * Updates payment details and recalculates invoice balances
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update a payment',
    description:
      'Updates an existing payment. ' +
      'Staff users can only update payments they created. ' +
      'Admin/Manager/Owner users can update any payment. ' +
      'Patient and invoice fields cannot be modified. ' +
      'Invoice balances are recalculated automatically within a transaction.',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439016',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment updated successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم تحديث الدفعة بنجاح',
          en: 'Payment updated successfully',
        },
        data: {
          _id: '507f1f77bcf86cd799439016',
          paymentId: 'PAY-0001',
          amount: 120,
          paymentMethod: 'card',
          paymentDate: '2024-01-16T00:00:00.000Z',
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
    description: 'Forbidden - No permission to update this payment',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
  })
  async updatePayment(
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
    @Request() req: any,
  ) {
    try {
      const userId = req.user?.id || req.user?.userId || req.user?.sub;
      const user = req.user;
      
      if (!userId || !user) {
        throw new BadRequestException({
          message: AUTH_ERRORS.UNAUTHORIZED_ACCESS,
          code: 'UNAUTHORIZED',
        });
      }

      const userRole = user.role;

      const payment = await this.paymentService.updatePayment(
        id,
        updatePaymentDto,
        userId,
        userRole,
        user,
      );

      return {
        success: true,
        message: SUCCESS_MESSAGES.PAYMENT_UPDATED,
        data: payment,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Soft delete a payment (Admin only)
   * Requirements: 11.10
   * 
   * Accessible by: Admin, Manager, Owner only
   * Performs soft delete (sets deletedAt timestamp)
   * Recalculates invoice balances after deletion
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({
    summary: 'Delete a payment (soft delete)',
    description:
      'Soft deletes a payment by setting the deletedAt timestamp. ' +
      'The payment is not physically removed from the database. ' +
      'Only Admin/Manager/Owner users can delete payments. ' +
      'Invoice balances are recalculated after deletion.',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439016',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment deleted successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم حذف الدفعة بنجاح',
          en: 'Payment deleted successfully',
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
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
  })
  async deletePayment(@Param('id') id: string, @Request() req: any) {
    try {
      const userId = req.user?.id || req.user?.userId || req.user?.sub;
      const userRole = req.user?.role;
      
      if (!userId || !userRole) {
        throw new BadRequestException({
          message: AUTH_ERRORS.UNAUTHORIZED_ACCESS,
          code: 'UNAUTHORIZED',
        });
      }

      await this.paymentService.deletePayment(id, userId, userRole, req.user);

      return {
        success: true,
        message: SUCCESS_MESSAGES.PAYMENT_DELETED,
      };
    } catch (error) {
      throw error;
    }
  }
}
