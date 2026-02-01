import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import { UserSchema } from '../database/schemas/user.schema';
import { EmployeeProfileSchema } from '../database/schemas/employee-profile.schema';
import { EmployeeDocumentSchema } from '../database/schemas/employee-document.schema';
import { EmployeeShiftSchema } from '../database/schemas/employee-shift.schema';
import { OrganizationSchema } from '../database/schemas/organization.schema';
import { ComplexSchema } from '../database/schemas/complex.schema';
import { ClinicSchema } from '../database/schemas/clinic.schema';
import { SubscriptionSchema } from '../database/schemas/subscription.schema';
import { SubscriptionPlanSchema } from '../database/schemas/subscription-plan.schema';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'EmployeeProfile', schema: EmployeeProfileSchema },
      { name: 'EmployeeDocument', schema: EmployeeDocumentSchema },
      { name: 'EmployeeShift', schema: EmployeeShiftSchema },
      { name: 'Organization', schema: OrganizationSchema },
      { name: 'Complex', schema: ComplexSchema },
      { name: 'Clinic', schema: ClinicSchema },
      { name: 'Subscription', schema: SubscriptionSchema },
      { name: 'SubscriptionPlan', schema: SubscriptionPlanSchema },
    ]),
    SubscriptionModule,
  ],
  controllers: [EmployeeController],
  providers: [EmployeeService],
  exports: [EmployeeService],
})
export class EmployeeModule {}
