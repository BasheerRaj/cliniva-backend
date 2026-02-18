import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ServiceOfferController } from './service-offer.controller';
import { ServiceOfferService } from './service-offer.service';
import { ServiceOfferSchema } from './schemas/service-offer.schema';
import { OfferSchema } from '../database/schemas/offer.schema';
import { ServiceSchema } from '../database/schemas/service.schema';
import { UserSchema } from '../database/schemas/user.schema';
import { SubscriptionSchema } from '../database/schemas/subscription.schema';
import { SubscriptionPlanSchema } from '../database/schemas/subscription-plan.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'ServiceOffer', schema: ServiceOfferSchema },
      { name: 'Offer', schema: OfferSchema },
      { name: 'Service', schema: ServiceSchema },
      // Required for JwtAuthGuard
      { name: 'User', schema: UserSchema },
      { name: 'Subscription', schema: SubscriptionSchema },
      { name: 'SubscriptionPlan', schema: SubscriptionPlanSchema },
    ]),
    AuthModule,
  ],
  controllers: [ServiceOfferController],
  providers: [ServiceOfferService],
  exports: [ServiceOfferService],
})
export class ServiceOfferModule {}
