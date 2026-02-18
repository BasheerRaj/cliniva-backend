import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ServiceOffer } from './schemas/service-offer.schema';
import { Offer } from '../database/schemas/offer.schema';
import { Service } from '../database/schemas/service.schema';
import { AssignDiscountToServiceDto } from './dto/assign-discount-to-service.dto';
import { CalculateServicePriceDto } from './dto/calculate-service-price.dto';
import {
  PriceCalculation,
  DiscountApplied,
} from './interfaces/price-calculation.interface';

@Injectable()
export class ServiceOfferService {
  constructor(
    @InjectModel('ServiceOffer')
    private readonly serviceOfferModel: Model<ServiceOffer>,
    @InjectModel('Offer')
    private readonly offerModel: Model<Offer>,
    @InjectModel('Service')
    private readonly serviceModel: Model<Service>,
  ) {}

  /**
   * Assign a discount (offer) to a service
   */
  async assignDiscountToService(
    serviceId: string,
    dto: AssignDiscountToServiceDto,
    userId?: string,
  ): Promise<ServiceOffer> {
    // Validate service exists
    const service = await this.serviceModel.findById(serviceId);
    if (!service) {
      throw new NotFoundException({
        message: {
          ar: 'الخدمة غير موجودة',
          en: 'Service not found',
        },
      });
    }

    // Validate offer exists
    const offer = await this.offerModel.findById(dto.offerId);
    if (!offer) {
      throw new NotFoundException({
        message: {
          ar: 'العرض غير موجود',
          en: 'Offer not found',
        },
      });
    }

    // Check if already assigned
    const existing = await this.serviceOfferModel.findOne({
      serviceId: new Types.ObjectId(serviceId),
      offerId: new Types.ObjectId(dto.offerId),
    });

    if (existing) {
      throw new BadRequestException({
        message: {
          ar: 'الخصم مسند بالفعل لهذه الخدمة',
          en: 'Discount is already assigned to this service',
        },
      });
    }

    // Create new assignment
    const serviceOffer = new this.serviceOfferModel({
      serviceId: new Types.ObjectId(serviceId),
      offerId: new Types.ObjectId(dto.offerId),
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });

    const saved = await serviceOffer.save();

    // Populate offer for return
    const populated = await this.serviceOfferModel
      .findById(saved._id)
      .populate('offerId')
      .exec();

    if (!populated) {
      throw new NotFoundException({
        message: {
          ar: 'فشل إنشاء تعيين الخصم',
          en: 'Failed to create discount assignment',
        },
      });
    }

    return populated;
  }

  /**
   * Get all discounts assigned to a service
   */
  async getServiceDiscounts(
    serviceId: string,
    isActive?: boolean,
    includeExpired: boolean = false,
  ): Promise<any[]> {
    // Validate service exists
    const service = await this.serviceModel.findById(serviceId);
    if (!service) {
      throw new NotFoundException({
        message: {
          ar: 'الخدمة غير موجودة',
          en: 'Service not found',
        },
      });
    }

    // Build query
    const query: any = {
      serviceId: new Types.ObjectId(serviceId),
    };

    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    // Get service offers with populated offer
    const serviceOffers = await this.serviceOfferModel
      .find(query)
      .populate('offerId')
      .exec();

    // Filter expired offers if needed
    const now = new Date();
    const result = serviceOffers.map((so) => {
      const offer = so.offerId as any;
      const isCurrentlyValid =
        offer.isActive &&
        (!offer.startsAt || new Date(offer.startsAt) <= now) &&
        (!offer.endsAt || new Date(offer.endsAt) >= now);

      if (!includeExpired && !isCurrentlyValid) {
        return null;
      }

      return {
        _id: so._id,
        serviceId: so.serviceId,
        offerId: so.offerId,
        isActive: so.isActive,
        appliedCount: so.appliedCount,
        deactivatedAt: so.deactivatedAt,
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
    });

    return result.filter((item) => item !== null);
  }

  /**
   * Remove discount from service
   */
  async removeDiscountFromService(
    serviceId: string,
    offerId: string,
  ): Promise<void> {
    const serviceOffer = await this.serviceOfferModel.findOne({
      serviceId: new Types.ObjectId(serviceId),
      offerId: new Types.ObjectId(offerId),
    });

    if (!serviceOffer) {
      throw new NotFoundException({
        message: {
          ar: 'الخصم غير مسند لهذه الخدمة',
          en: 'Discount is not assigned to this service',
        },
      });
    }

    await this.serviceOfferModel.findByIdAndDelete(serviceOffer._id);
  }

  /**
   * Deactivate discount assignment
   */
  async deactivateDiscount(
    serviceId: string,
    offerId: string,
    userId?: string,
  ): Promise<ServiceOffer> {
    const serviceOffer = await this.serviceOfferModel.findOne({
      serviceId: new Types.ObjectId(serviceId),
      offerId: new Types.ObjectId(offerId),
    });

    if (!serviceOffer) {
      throw new NotFoundException({
        message: {
          ar: 'الخصم غير مسند لهذه الخدمة',
          en: 'Discount is not assigned to this service',
        },
      });
    }

    serviceOffer.isActive = false;
    serviceOffer.deactivatedAt = new Date();
    if (userId) {
      serviceOffer.deactivatedBy = new Types.ObjectId(userId);
    }

    return await serviceOffer.save();
  }

  /**
   * Calculate service price with discount
   */
  async calculateServicePrice(
    serviceId: string,
    dto: CalculateServicePriceDto,
  ): Promise<PriceCalculation> {
    const service = await this.serviceModel.findById(serviceId);
    if (!service) {
      throw new NotFoundException({
        message: {
          ar: 'الخدمة غير موجودة',
          en: 'Service not found',
        },
      });
    }

    const basePrice = dto.basePrice || service.price || 0;
    const appointmentDate = new Date(dto.appointmentDate);

    // Get active discounts for this service
    const serviceOffers = await this.serviceOfferModel
      .find({
        serviceId: new Types.ObjectId(serviceId),
        isActive: true,
      })
      .populate('offerId')
      .exec();

    // Find valid discount for the appointment date
    let discountApplied: DiscountApplied | null = null;
    let discountAmount = 0;

    for (const so of serviceOffers) {
      const offer = so.offerId as any;

      if (!offer.isActive) continue;

      // Check date range
      if (offer.startsAt && appointmentDate < new Date(offer.startsAt))
        continue;
      if (offer.endsAt && appointmentDate > new Date(offer.endsAt)) continue;

      // Calculate discount
      if (offer.discountType === 'percent') {
        discountAmount = (basePrice * offer.discountValue) / 100;
      } else {
        discountAmount = offer.discountValue;
      }

      discountApplied = {
        offerId: offer._id.toString(),
        name: offer.name,
        type: offer.discountType,
        value: offer.discountValue,
        amount: discountAmount,
      };

      break; // Apply first valid discount only
    }

    const finalPrice = Math.max(0, basePrice - discountAmount);

    return {
      basePrice,
      discountApplied,
      finalPrice,
      currency: 'SAR',
    };
  }

  /**
   * Increment discount usage count
   */
  async incrementDiscountUsage(
    serviceId: string,
    offerId: string,
  ): Promise<void> {
    await this.serviceOfferModel.findOneAndUpdate(
      {
        serviceId: new Types.ObjectId(serviceId),
        offerId: new Types.ObjectId(offerId),
      },
      { $inc: { appliedCount: 1 } },
    );
  }
}
