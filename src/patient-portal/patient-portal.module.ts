import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PatientPortalService } from './services/patient-portal.service';
import { PatientAuthController } from './controllers/patient-auth.controller';
import { User, UserSchema } from '../database/schemas/user.schema';
import { PatientSchema } from '../database/schemas/patient.schema';
import { AppointmentSchema } from '../database/schemas/appointment.schema';
import { Subscription, SubscriptionSchema } from '../database/schemas/subscription.schema';
import { SubscriptionPlan, SubscriptionPlanSchema } from '../database/schemas/subscription-plan.schema';
import { NotificationModule } from '../notification/notification.module';
import { AuthModule } from '../auth/auth.module';
import { AppointmentModule } from '../appointment/appointment.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: 'Patient', schema: PatientSchema },
      { name: 'Appointment', schema: AppointmentSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
    NotificationModule,
    AuthModule,
    AppointmentModule,
  ],
  controllers: [PatientAuthController],
  providers: [PatientPortalService],
})
export class PatientPortalModule {}
