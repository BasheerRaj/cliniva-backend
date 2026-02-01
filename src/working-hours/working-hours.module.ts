import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkingHoursController } from './working-hours.controller';
import { WorkingHoursService } from './working-hours.service';
import { WorkingHoursValidationService } from './services/working-hours-validation.service';
import { WorkingHoursSchema } from '../database/schemas/working-hours.schema';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'WorkingHours', schema: WorkingHoursSchema },
    ]),
    CommonModule,
  ],
  controllers: [WorkingHoursController],
  providers: [WorkingHoursService, WorkingHoursValidationService],
  exports: [WorkingHoursService, WorkingHoursValidationService],
})
export class WorkingHoursModule {}
