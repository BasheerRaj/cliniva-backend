import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ServiceController } from './service.controller';
import { ServiceCategoryController } from './service-category.controller';
import { ServiceService } from './service.service';
import { ServiceSchema } from '../database/schemas/service.schema';
import { ServiceCategorySchema } from '../database/schemas/service-category.schema';
import { ClinicServiceSchema } from '../database/schemas/clinic-service.schema';
import { AppointmentSchema } from '../database/schemas/appointment.schema';
import { UserSchema } from '../database/schemas/user.schema';
import { SubscriptionSchema } from '../database/schemas/subscription.schema';
import { SubscriptionPlanSchema } from '../database/schemas/subscription-plan.schema';
import { NotificationSchema } from '../database/schemas/notification.schema';
import { DoctorServiceSchema } from '../database/schemas/doctor-service.schema';
import { ClinicSchema } from '../database/schemas/clinic.schema';
import { ComplexDepartmentSchema } from '../database/schemas/complex-department.schema';
import { ComplexSchema } from '../database/schemas/complex.schema';
import { EmployeeShiftSchema } from '../database/schemas/employee-shift.schema';
import { CommonModule } from '../common/common.module';
import { AuthModule } from '../auth/auth.module';
import { ServiceOfferModule } from '../service-offer/service-offer.module';
import { SessionManagerService } from './services/session-manager.service';
import { SessionValidationService } from '../appointment/services/session-validation.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Service', schema: ServiceSchema },
      { name: 'ServiceCategory', schema: ServiceCategorySchema },
      { name: 'ClinicService', schema: ClinicServiceSchema },
      { name: 'Appointment', schema: AppointmentSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Subscription', schema: SubscriptionSchema },
      { name: 'SubscriptionPlan', schema: SubscriptionPlanSchema },
      { name: 'Notification', schema: NotificationSchema },
      { name: 'DoctorService', schema: DoctorServiceSchema },
      { name: 'Clinic', schema: ClinicSchema },
      { name: 'ComplexDepartment', schema: ComplexDepartmentSchema },
      { name: 'Complex', schema: ComplexSchema },
      { name: 'EmployeeShift', schema: EmployeeShiftSchema },
    ]),
    CommonModule,
    AuthModule,
    ServiceOfferModule,
  ],
  controllers: [ServiceController, ServiceCategoryController],
  providers: [ServiceService, SessionManagerService, SessionValidationService],
  exports: [ServiceService, SessionManagerService, SessionValidationService],
})
export class ServiceModule {}
