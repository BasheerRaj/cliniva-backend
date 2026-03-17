import { IsMongoId, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for allocating a payment amount to a specific session within an invoice
 * PART D
 */
export class SessionAllocationDto {
  @ApiProperty({ description: 'Invoice ID', example: '507f1f77bcf86cd799439014' })
  @IsMongoId()
  invoiceId: string;

  @ApiProperty({ description: 'Invoice item (session) ID within the invoice', example: '507f1f77bcf86cd799439020' })
  @IsString()
  invoiceItemId: string;

  @ApiPropertyOptional({ description: 'Service name for display', example: 'Physiotherapy' })
  @IsOptional()
  @IsString()
  serviceName?: string;

  @ApiPropertyOptional({ description: 'Session name for display', example: 'Session 1' })
  @IsOptional()
  @IsString()
  sessionName?: string;

  @ApiProperty({ description: 'Amount allocated to this session', example: 50 })
  @IsNumber()
  @Min(0)
  amount: number;
}
