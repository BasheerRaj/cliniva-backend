import { ApiProperty } from '@nestjs/swagger';

export interface WorkingHoursDay {
  dayOfWeek: string;
  isWorkingDay: boolean;
  openingTime?: string;
  closingTime?: string;
  breakStartTime?: string;
  breakEndTime?: string;
}

export class AppointmentPageContextResponseDto {
  @ApiProperty({ enum: ['company', 'complex', 'clinic'] })
  planType: string;

  @ApiProperty({ description: 'Requesting user role' })
  role: string;

  @ApiProperty({ type: [Object], description: 'Available complexes (only for company plan)' })
  complexes?: { _id: string; name: string }[];

  @ApiProperty({ type: [Object], description: 'Available clinics' })
  clinics: {
    _id: string;
    name: string;
    complexId?: string;
    services: string[];
    workingHours: WorkingHoursDay[];
  }[];

  @ApiProperty({ type: [Object], description: 'Available doctors' })
  doctors: {
    _id: string;
    name: string;
    clinicIds: string[];
    serviceIds: string[];
    workingHours: WorkingHoursDay[];
  }[];

  @ApiProperty({ type: [Object], description: 'Available services' })
  services: { _id: string; name: string; duration: number; clinicIds: string[]; doctorIds: string[] }[];
}
