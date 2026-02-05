import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClinicService } from './clinic.service';
import { ClinicController } from './clinic.controller';
import { ClinicSchema } from '../database/schemas/clinic.schema';
import { ComplexSchema } from '../database/schemas/complex.schema';
import { UserSchema } from '../database/schemas/user.schema';
import { AppointmentSchema } from '../database/schemas/appointment.schema';
import { WorkingHoursSchema } from '../database/schemas/working-hours.schema';
import { AuditLogSchema } from '../database/schemas/audit-log.schema';
import { SubscriptionSchema } from '../database/schemas/subscription.schema';
import { SubscriptionPlanSchema } from '../database/schemas/subscription-plan.schema';
import { SubscriptionModule } from '../subscription/subscription.module';
import { CommonModule } from '../common/common.module';
import { AuthModule } from '../auth/auth.module';
import { ClinicCapacityService } from './services/clinic-capacity.service';
import { ClinicWorkingHoursService } from './services/clinic-working-hours.service';
import { ClinicStatusService } from './services/clinic-status.service';
import { AuditService } from '../auth/audit.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Clinic', schema: ClinicSchema },
      { name: 'Complex', schema: ComplexSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Appointment', schema: AppointmentSchema },
      { name: 'WorkingHours', schema: WorkingHoursSchema },
      { name: 'AuditLog', schema: AuditLogSchema },
      { name: 'Subscription', schema: SubscriptionSchema },
      { name: 'SubscriptionPlan', schema: SubscriptionPlanSchema },
    ]),
    SubscriptionModule,
    CommonModule,
    AuthModule,
  ],
  controllers: [ClinicController],
  providers: [
    ClinicService,
    ClinicCapacityService,
    ClinicWorkingHoursService,
    ClinicStatusService,
    AuditService,
  ],
  exports: [
    ClinicService,
    ClinicCapacityService,
    ClinicWorkingHoursService,
    ClinicStatusService,
  ],
})
export class ClinicModule {}
