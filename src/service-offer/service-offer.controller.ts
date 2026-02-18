import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ServiceOfferService } from './service-offer.service';
import { AssignDiscountToServiceDto } from './dto/assign-discount-to-service.dto';
import { CalculateServicePriceDto } from './dto/calculate-service-price.dto';
import { ServiceOffer } from './schemas/service-offer.schema';
import { PriceCalculation } from './interfaces/price-calculation.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Service Discounts')
@Controller('services/:serviceId')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ServiceOfferController {
  constructor(private readonly serviceOfferService: ServiceOfferService) {}

  /**
   * Assign discount to service
   */
  @ApiOperation({
    summary: 'Assign discount to service',
    description:
      'Assigns a discount (offer) to a service. The discount can be applied during appointment booking.',
  })
  @ApiParam({
    name: 'serviceId',
    description: 'Service ID',
    example: '507f1f77bcf86cd799439012',
  })
  @ApiBody({ type: AssignDiscountToServiceDto })
  @ApiResponse({
    status: 201,
    description: 'Discount assigned successfully',
    schema: {
      example: {
        _id: '507f1f77bcf86cd799439011',
        serviceId: '507f1f77bcf86cd799439012',
        offerId: '507f1f77bcf86cd799439013',
        isActive: true,
        appliedCount: 0,
        createdAt: '2026-01-31T10:00:00.000Z',
        offer: {
          _id: '507f1f77bcf86cd799439013',
          name: 'Summer Discount',
          discountType: 'percent',
          discountValue: 20,
          startsAt: '2026-06-01T00:00:00.000Z',
          endsAt: '2026-08-31T23:59:59.000Z',
          isActive: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Discount already assigned to this service',
    schema: {
      example: {
        statusCode: 400,
        message: {
          ar: 'الخصم مسند بالفعل لهذه الخدمة',
          en: 'Discount is already assigned to this service',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Service or offer not found',
  })
  @Post('discounts')
  @HttpCode(HttpStatus.CREATED)
  async assignDiscountToService(
    @Param('serviceId') serviceId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: AssignDiscountToServiceDto,
    @Request() req: any,
  ): Promise<any> {
    const result = await this.serviceOfferService.assignDiscountToService(
      serviceId,
      dto,
      req.user?.userId,
    );

    // Format response with offer details
    const offer = result.offerId as any;
    const now = new Date();
    const isCurrentlyValid =
      offer.isActive &&
      (!offer.startsAt || new Date(offer.startsAt) <= now) &&
      (!offer.endsAt || new Date(offer.endsAt) >= now);

    const resultObj = result.toObject ? result.toObject() : result;

    return {
      _id: result._id,
      serviceId: result.serviceId,
      offerId: result.offerId,
      isActive: result.isActive,
      appliedCount: result.appliedCount,
      createdAt: resultObj.createdAt,
      offer: {
        _id: offer._id,
        name: offer.name,
        discountType: offer.discountType,
        discountValue: offer.discountValue,
        startsAt: offer.startsAt,
        endsAt: offer.endsAt,
        isActive: offer.isActive,
        isCurrentlyValid,
      },
    };
  }

  /**
   * Get service discounts
   */
  @ApiOperation({
    summary: 'Get service discounts',
    description:
      'Retrieves all discounts assigned to a service. Can filter by active status and include/exclude expired offers.',
  })
  @ApiParam({
    name: 'serviceId',
    description: 'Service ID',
    example: '507f1f77bcf86cd799439012',
  })
  @ApiQuery({
    name: 'isActive',
    description: 'Filter by active status',
    required: false,
    type: Boolean,
  })
  @ApiQuery({
    name: 'includeExpired',
    description: 'Include expired offers',
    required: false,
    type: Boolean,
    default: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Service discounts retrieved successfully',
    schema: {
      example: [
        {
          _id: '507f1f77bcf86cd799439011',
          serviceId: '507f1f77bcf86cd799439012',
          offerId: '507f1f77bcf86cd799439013',
          isActive: true,
          appliedCount: 15,
          offer: {
            _id: '507f1f77bcf86cd799439013',
            name: 'Summer Discount',
            discountType: 'percent',
            discountValue: 20,
            startsAt: '2026-06-01T00:00:00.000Z',
            endsAt: '2026-08-31T23:59:59.000Z',
            isActive: true,
            isCurrentlyValid: true,
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Service not found',
  })
  @Get('discounts')
  async getServiceDiscounts(
    @Param('serviceId') serviceId: string,
    @Query('isActive') isActive?: string,
    @Query('includeExpired') includeExpired?: string,
  ): Promise<any[]> {
    const isActiveBool =
      isActive !== undefined ? isActive === 'true' : undefined;
    const includeExpiredBool =
      includeExpired !== undefined ? includeExpired === 'true' : false;

    return this.serviceOfferService.getServiceDiscounts(
      serviceId,
      isActiveBool,
      includeExpiredBool,
    );
  }

  /**
   * Remove discount from service
   */
  @ApiOperation({
    summary: 'Remove discount from service',
    description:
      'Permanently removes a discount assignment from a service. This action cannot be undone.',
  })
  @ApiParam({
    name: 'serviceId',
    description: 'Service ID',
    example: '507f1f77bcf86cd799439012',
  })
  @ApiParam({
    name: 'offerId',
    description: 'Offer ID',
    example: '507f1f77bcf86cd799439013',
  })
  @ApiResponse({
    status: 200,
    description: 'Discount removed successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم إزالة الخصم من الخدمة بنجاح',
          en: 'Discount removed from service successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Discount assignment not found',
  })
  @Delete('discounts/:offerId')
  @HttpCode(HttpStatus.OK)
  async removeDiscountFromService(
    @Param('serviceId') serviceId: string,
    @Param('offerId') offerId: string,
  ): Promise<{ success: boolean; message: { ar: string; en: string } }> {
    await this.serviceOfferService.removeDiscountFromService(
      serviceId,
      offerId,
    );

    return {
      success: true,
      message: {
        ar: 'تم إزالة الخصم من الخدمة بنجاح',
        en: 'Discount removed from service successfully',
      },
    };
  }

  /**
   * Deactivate discount
   */
  @ApiOperation({
    summary: 'Deactivate discount',
    description:
      'Deactivates a discount assignment while preserving history (appliedCount). The discount can be reactivated later.',
  })
  @ApiParam({
    name: 'serviceId',
    description: 'Service ID',
    example: '507f1f77bcf86cd799439012',
  })
  @ApiParam({
    name: 'offerId',
    description: 'Offer ID',
    example: '507f1f77bcf86cd799439013',
  })
  @ApiResponse({
    status: 200,
    description: 'Discount deactivated successfully',
    schema: {
      example: {
        _id: '507f1f77bcf86cd799439011',
        serviceId: '507f1f77bcf86cd799439012',
        offerId: '507f1f77bcf86cd799439013',
        isActive: false,
        deactivatedAt: '2026-01-31T12:00:00.000Z',
        appliedCount: 15,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Discount assignment not found',
  })
  @Patch('discounts/:offerId/deactivate')
  async deactivateDiscount(
    @Param('serviceId') serviceId: string,
    @Param('offerId') offerId: string,
    @Request() req: any,
  ): Promise<ServiceOffer> {
    return this.serviceOfferService.deactivateDiscount(
      serviceId,
      offerId,
      req.user?.userId,
    );
  }

  /**
   * Calculate service price with discount
   */
  @ApiOperation({
    summary: 'Calculate service price with discount',
    description:
      'Calculates the final price after applying active discounts. Used during appointment booking to determine the discounted price.',
  })
  @ApiParam({
    name: 'serviceId',
    description: 'Service ID',
    example: '507f1f77bcf86cd799439012',
  })
  @ApiBody({ type: CalculateServicePriceDto })
  @ApiResponse({
    status: 200,
    description: 'Price calculated successfully',
    schema: {
      example: {
        basePrice: 150,
        discountApplied: {
          offerId: '507f1f77bcf86cd799439013',
          name: 'Summer Discount',
          type: 'percent',
          value: 20,
          amount: 30,
        },
        finalPrice: 120,
        currency: 'SAR',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Service not found',
  })
  @Post('calculate-price')
  async calculateServicePrice(
    @Param('serviceId') serviceId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: CalculateServicePriceDto,
  ): Promise<PriceCalculation> {
    return this.serviceOfferService.calculateServicePrice(serviceId, dto);
  }
}
