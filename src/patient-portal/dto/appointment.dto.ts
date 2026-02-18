import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsEnum,
} from 'class-validator';

export class BookAppointmentDto {
  @IsString()
  @IsNotEmpty()
  doctorId: string;

  @IsString()
  @IsNotEmpty()
  clinicId: string;

  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @IsDateString()
  @IsNotEmpty()
  appointmentDate: string;

  @IsString()
  @IsNotEmpty()
  appointmentTime: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
