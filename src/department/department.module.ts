import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DepartmentController } from './department.controller';
import { DepartmentService } from './department.service';
import { DepartmentSchema } from '../database/schemas/department.schema';
import { ComplexDepartmentSchema } from '../database/schemas/complex-department.schema';
import { ClinicSchema } from '../database/schemas/clinic.schema';
import { ServiceSchema } from '../database/schemas/service.schema';
import { SubscriptionSchema } from '../database/schemas/subscription.schema';
import { SubscriptionPlanSchema } from '../database/schemas/subscription-plan.schema';
import { UserSchema } from '../database/schemas/user.schema';
import { CommonModule } from '../common/common.module';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Department', schema: DepartmentSchema },
      { name: 'ComplexDepartment', schema: ComplexDepartmentSchema },
      { name: 'Clinic', schema: ClinicSchema },
      { name: 'Service', schema: ServiceSchema },
      { name: 'Subscription', schema: SubscriptionSchema },
      { name: 'SubscriptionPlan', schema: SubscriptionPlanSchema },
      { name: 'User', schema: UserSchema },
    ]),
    CommonModule,
    AuthModule,
    SubscriptionModule,
  ],
  controllers: [DepartmentController],
  providers: [DepartmentService],
  exports: [DepartmentService],
})
export class DepartmentModule {}
