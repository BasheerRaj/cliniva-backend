import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleService } from './schedule.service';
import { ScheduleController } from './schedule.controller';
import { ScheduleSchema } from '../database/schemas/schedule.schema';
import { UserSchema } from '../database/schemas/user.schema';
import { ClinicSchema } from '../database/schemas/clinic.schema';
import { ComplexSchema } from '../database/schemas/complex.schema';
import { OrganizationSchema } from '../database/schemas/organization.schema';
import { AppointmentSchema } from '../database/schemas/appointment.schema';
import { WorkingHoursSchema } from '../database/schemas/working-hours.schema';
import { EmployeeShiftSchema } from '../database/schemas/employee-shift.schema';
import { SubscriptionSchema } from '../database/schemas/subscription.schema';
import { SubscriptionPlanSchema } from '../database/schemas/subscription-plan.schema';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Schedule', schema: ScheduleSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Clinic', schema: ClinicSchema },
      { name: 'Complex', schema: ComplexSchema },
      { name: 'Organization', schema: OrganizationSchema },
      { name: 'Appointment', schema: AppointmentSchema },
      { name: 'WorkingHours', schema: WorkingHoursSchema },
      { name: 'EmployeeShift', schema: EmployeeShiftSchema },
      { name: 'Subscription', schema: SubscriptionSchema },
      { name: 'SubscriptionPlan', schema: SubscriptionPlanSchema },
    ]),
    SubscriptionModule,
  ],
  controllers: [ScheduleController],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {} 