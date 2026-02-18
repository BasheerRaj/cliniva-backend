import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkingHoursController } from './working-hours.controller';
import { WorkingHoursService } from './working-hours.service';
import { WorkingHoursValidationService } from './services/working-hours-validation.service';
import { WorkingHoursSuggestionService } from './services/working-hours-suggestion.service';
import { AppointmentConflictService } from './services/appointment-conflict.service';
import { WorkingHoursReschedulingService } from './services/working-hours-rescheduling.service';
import { WorkingHoursSchema } from '../database/schemas/working-hours.schema';
import { ClinicSchema } from '../database/schemas/clinic.schema';
import { ComplexSchema } from '../database/schemas/complex.schema';
import { UserSchema } from '../database/schemas/user.schema';
import { AppointmentSchema } from '../database/schemas/appointment.schema';
import { NotificationSchema } from '../database/schemas/notification.schema';
import { SubscriptionSchema } from '../database/schemas/subscription.schema';
import { SubscriptionPlanSchema } from '../database/schemas/subscription-plan.schema';
import { CommonModule } from '../common/common.module';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'WorkingHours', schema: WorkingHoursSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Clinic', schema: ClinicSchema },
      { name: 'Complex', schema: ComplexSchema },
      { name: 'Appointment', schema: AppointmentSchema },
      { name: 'Notification', schema: NotificationSchema },
      { name: 'Subscription', schema: SubscriptionSchema },
      { name: 'SubscriptionPlan', schema: SubscriptionPlanSchema },
    ]),
    CommonModule,
    forwardRef(() => AuthModule),
    SubscriptionModule,
  ],
  controllers: [WorkingHoursController],
  providers: [
    WorkingHoursService,
    WorkingHoursValidationService,
    WorkingHoursSuggestionService,
    AppointmentConflictService,
    WorkingHoursReschedulingService,
  ],
  exports: [
    WorkingHoursService,
    WorkingHoursValidationService,
    WorkingHoursSuggestionService,
    AppointmentConflictService,
    WorkingHoursReschedulingService,
  ],
})
export class WorkingHoursModule {}
