import { PartialType } from '@nestjs/swagger';
import { CreateAppointmentDto } from './create-appointment.dto';

/**
 * DTO for updating an existing appointment
 * Requirements: 9.1-9.8
 * 
 * Extends CreateAppointmentDto with all fields optional
 * All validation messages remain bilingual (Arabic & English)
 */
export class UpdateAppointmentDto extends PartialType(CreateAppointmentDto) {}
