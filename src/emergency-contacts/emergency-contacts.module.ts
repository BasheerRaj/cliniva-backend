import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmergencyContactsService } from './emergency-contacts.service';
import { EmergencyContactsController } from './emergency-contacts.controller';
import { EmergencyContactSchema } from '../database/schemas/emergency-contact.schema';
import { PatientSchema } from '../database/schemas/patient.schema';
import { UserSchema } from '../database/schemas/user.schema';
import { SubscriptionSchema } from '../database/schemas/subscription.schema';
import { SubscriptionPlanSchema } from '../database/schemas/subscription-plan.schema';
import { OrganizationSchema } from '../database/schemas/organization.schema';
import { ComplexSchema } from '../database/schemas/complex.schema';
import { ClinicSchema } from '../database/schemas/clinic.schema';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'EmergencyContact', schema: EmergencyContactSchema },
      { name: 'Patient', schema: PatientSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Subscription', schema: SubscriptionSchema },
      { name: 'SubscriptionPlan', schema: SubscriptionPlanSchema },
      { name: 'Organization', schema: OrganizationSchema },
      { name: 'Complex', schema: ComplexSchema },
      { name: 'Clinic', schema: ClinicSchema },
    ]),
    CommonModule,
  ],
  controllers: [EmergencyContactsController],
  providers: [EmergencyContactsService],
  exports: [EmergencyContactsService],
})
export class EmergencyContactsModule {} 