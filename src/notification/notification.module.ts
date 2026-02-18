import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationSchema } from '../database/schemas/notification.schema';
import { AuthModule } from '../auth/auth.module';
import { User, UserSchema } from '../database/schemas/user.schema';
import {
  Subscription,
  SubscriptionSchema,
} from '../database/schemas/subscription.schema';
import {
  SubscriptionPlan,
  SubscriptionPlanSchema,
} from '../database/schemas/subscription-plan.schema';

@Global() // Make it global so other modules can use NotificationService easily
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Notification', schema: NotificationSchema },
      { name: User.name, schema: UserSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
    ]),
    AuthModule,
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
