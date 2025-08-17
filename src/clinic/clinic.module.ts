import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClinicService } from './clinic.service';
import { ClinicController } from './clinic.controller';
import { ClinicSchema } from '../database/schemas/clinic.schema';
import { SubscriptionModule } from '../subscription/subscription.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Clinic', schema: ClinicSchema },
    ]),
    SubscriptionModule,
    CommonModule,
  ],
  controllers: [ClinicController],
  providers: [ClinicService],
  exports: [ClinicService],
})
export class ClinicModule {}
