import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkingHoursController } from './working-hours.controller';
import { WorkingHoursService } from './working-hours.service';
import { WorkingHoursValidationService } from './services/working-hours-validation.service';
import { WorkingHoursSuggestionService } from './services/working-hours-suggestion.service';
import { AppointmentConflictService } from './services/appointment-conflict.service';
import { WorkingHoursSchema } from '../database/schemas/working-hours.schema';
import { ClinicSchema } from '../database/schemas/clinic.schema';
import { ComplexSchema } from '../database/schemas/complex.schema';
import { AppointmentSchema } from '../database/schemas/appointment.schema';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'WorkingHours', schema: WorkingHoursSchema },
      { name: 'Clinic', schema: ClinicSchema },
      { name: 'Complex', schema: ComplexSchema },
      { name: 'Appointment', schema: AppointmentSchema },
    ]),
    CommonModule,
  ],
  controllers: [WorkingHoursController],
  providers: [
    WorkingHoursService,
    WorkingHoursValidationService,
    WorkingHoursSuggestionService,
    AppointmentConflictService,
  ],
  exports: [
    WorkingHoursService,
    WorkingHoursValidationService,
    WorkingHoursSuggestionService,
    AppointmentConflictService,
  ],
})
export class WorkingHoursModule {}
