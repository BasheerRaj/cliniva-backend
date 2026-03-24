import { ApiProperty } from '@nestjs/swagger';

export class AppointmentPageContextResponseDto {
  @ApiProperty({ enum: ['company', 'complex', 'clinic'] })
  planType: string;

  @ApiProperty({ type: [Object], description: 'Available complexes (only for company plan)' })
  complexes?: { _id: string; name: string }[];

  @ApiProperty({ type: [Object], description: 'Available clinics' })
  clinics: { _id: string; name: string; complexId?: string }[];

  @ApiProperty({ type: [Object], description: 'Available doctors' })
  doctors: { _id: string; firstName: string; lastName: string; clinicId?: string }[];
}
