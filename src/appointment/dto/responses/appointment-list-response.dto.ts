import { ApiProperty } from '@nestjs/swagger';
import { AppointmentDataDto, BilingualMessage } from './appointment-response.dto';

/**
 * Pagination metadata
 */
export class PaginationMeta {
  @ApiProperty({ description: 'Current page number', example: 1 })
  page: number;

  @ApiProperty({ description: 'Items per page', example: 20 })
  limit: number;

  @ApiProperty({ description: 'Total number of items', example: 150 })
  total: number;

  @ApiProperty({ description: 'Total number of pages', example: 8 })
  totalPages: number;

  @ApiProperty({ description: 'Has previous page', example: false })
  hasPrevious: boolean;

  @ApiProperty({ description: 'Has next page', example: true })
  hasNext: boolean;
}

/**
 * Appointment list response DTO with pagination
 * Requirements: 15.1-15.6
 */
export class AppointmentListResponseDto {
  @ApiProperty({ description: 'Success status', example: true })
  success: boolean;

  @ApiProperty({ description: 'Array of appointments', type: [AppointmentDataDto] })
  data: AppointmentDataDto[];

  @ApiProperty({ description: 'Pagination metadata', type: PaginationMeta })
  meta: PaginationMeta;

  @ApiProperty({ description: 'Bilingual message', type: BilingualMessage })
  message: BilingualMessage;
}
