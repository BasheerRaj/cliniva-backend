import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRestrictionService } from './user-restriction.service';
import { DoctorDeactivationService } from './doctor-deactivation.service';
import { UserDropdownService } from './user-dropdown.service';
import { User, UserSchema } from '../database/schemas/user.schema';
import {
  Organization,
  OrganizationSchema,
} from '../database/schemas/organization.schema';
import { Complex, ComplexSchema } from '../database/schemas/complex.schema';
import { Clinic, ClinicSchema } from '../database/schemas/clinic.schema';
import {
  Subscription,
  SubscriptionSchema,
} from '../database/schemas/subscription.schema';
import {
  SubscriptionPlan,
  SubscriptionPlanSchema,
} from '../database/schemas/subscription-plan.schema';
import {
  Appointment,
  AppointmentSchema,
} from '../database/schemas/appointment.schema';
import {
  EmployeeProfile,
  EmployeeProfileSchema,
} from '../database/schemas/employee-profile.schema';
import { AuthModule } from '../auth/auth.module';
import { WorkingHoursModule } from '../working-hours/working-hours.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Organization.name, schema: OrganizationSchema },
      { name: Complex.name, schema: ComplexSchema },
      { name: Clinic.name, schema: ClinicSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
      { name: Appointment.name, schema: AppointmentSchema },
      { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
    ]),
    forwardRef(() => AuthModule), // Use forwardRef to avoid circular dependency
    WorkingHoursModule,
  ],
  controllers: [UserController],
  providers: [
    UserService,
    UserRestrictionService,
    DoctorDeactivationService,
    UserDropdownService,
  ],
  exports: [
    UserService,
    UserRestrictionService,
    DoctorDeactivationService,
    UserDropdownService,
  ],
})
export class UserModule {}
