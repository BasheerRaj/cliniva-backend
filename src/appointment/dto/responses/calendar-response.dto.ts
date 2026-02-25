import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentDataDto, BilingualMessage } from './appointment-response.dto';
import { CalendarView } from '../../constants/calendar-view.enum';

/**
 * Date range for calendar view
 */
export class DateRange {
  @ApiProperty({ description: 'Start date', example: '2024-03-10T00:00:00.000Z', type: Date })
  start: Date;

  @ApiProperty({ description: 'End date', example: '2024-03-16T23:59:59.999Z', type: Date })
  end: Date;
}

/**
 * Appointment count by status
 */
export class StatusCount {
  @ApiProperty({ description: 'Scheduled appointments', example: 15 })
  scheduled: number;

  @ApiProperty({ description: 'Confirmed appointments', example: 10 })
  confirmed: number;

  @ApiProperty({ description: 'In progress appointments', example: 2 })
  in_progress: number;

  @ApiProperty({ description: 'Completed appointments', example: 50 })
  completed: number;

  @ApiProperty({ description: 'Cancelled appointments', example: 5 })
  cancelled: number;

  @ApiProperty({ description: 'No-show appointments', example: 1 })
  no_show: number;
}

/**
 * Calendar summary statistics
 */
export class CalendarSummary {
  @ApiProperty({ description: 'Total appointments in view', example: 83 })
  totalAppointments: number;

  @ApiProperty({ description: 'Appointments by status', type: StatusCount })
  byStatus: StatusCount;
}

/**
 * Calendar data structure
 */
export class CalendarData {
  @ApiProperty({ description: 'Calendar view type', enum: CalendarView, example: CalendarView.WEEK })
  view: CalendarView;

  @ApiProperty({ description: 'Date range for the view', type: DateRange })
  dateRange: DateRange;

  @ApiProperty({
    description: 'Appointments grouped by date (ISO date string as key)',
    example: {
      '2024-03-15': [
        {
          id: '507f1f77bcf86cd799439016',
          appointmentTime: '14:30',
          status: 'scheduled',
        },
      ],
    },
    type: 'object',
    additionalProperties: {
      type: 'array',
      items: { $ref: '#/components/schemas/AppointmentDataDto' },
    },
  })
  appointments: Record<string, AppointmentDataDto[]>;

  @ApiPropertyOptional({ description: 'Summary statistics', type: CalendarSummary })
  summary?: CalendarSummary;
}

/**
 * Calendar response DTO
 * Requirements: 15.1-15.6
 */
export class CalendarResponseDto {
  @ApiProperty({ description: 'Success status', example: true })
  success: boolean;

  @ApiProperty({ description: 'Calendar data', type: CalendarData })
  data: CalendarData;

  @ApiProperty({ description: 'Bilingual message', type: BilingualMessage })
  message: BilingualMessage;
}
