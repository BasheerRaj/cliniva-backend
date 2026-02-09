/**
 * Standard Response DTOs for Swagger Documentation
 *
 * Provides reusable DTO classes for consistent API response documentation.
 * All DTOs include ApiProperty decorators for Swagger schema generation.
 *
 * @module common/dto/response
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BilingualMessage } from '../types/bilingual-message.type';

/**
 * Bilingual Message DTO
 * Used for all user-facing messages in both Arabic and English
 */
export class BilingualMessageDto implements BilingualMessage {
  @ApiProperty({
    description: 'Arabic message text (supports RTL)',
    example: 'تمت العملية بنجاح',
    type: String,
  })
  ar: string;

  @ApiProperty({
    description: 'English message text',
    example: 'Operation completed successfully',
    type: String,
  })
  en: string;
}

/**
 * Error Details DTO
 * Contains detailed error information
 */
export class ErrorDetailsDto {
  @ApiProperty({
    description: 'Error code for programmatic handling',
    example: 'VALIDATION_ERROR',
    type: String,
  })
  code: string;

  @ApiProperty({
    description: 'Bilingual error message',
    type: BilingualMessageDto,
  })
  message: BilingualMessageDto;

  @ApiPropertyOptional({
    description:
      'Additional error details (field-specific errors, validation constraints, etc.)',
    example: { field: 'email', constraint: 'isEmail', value: 'invalid-email' },
  })
  details?: any;
}

/**
 * Success Response DTO
 * Standard success response structure
 */
export class SuccessResponseDto<T = any> {
  @ApiProperty({
    description: 'Indicates successful operation',
    example: true,
    type: Boolean,
  })
  success: true;

  @ApiPropertyOptional({
    description: 'Response data',
  })
  data?: T;

  @ApiPropertyOptional({
    description: 'Success message',
    type: BilingualMessageDto,
  })
  message?: BilingualMessageDto;
}

/**
 * Error Response DTO
 * Standard error response structure
 */
export class ErrorResponseDto {
  @ApiProperty({
    description: 'Indicates failed operation',
    example: false,
    type: Boolean,
  })
  success: false;

  @ApiProperty({
    description: 'Error details',
    type: ErrorDetailsDto,
  })
  error: ErrorDetailsDto;
}

/**
 * Pagination Metadata DTO
 * Contains pagination information for list responses
 */
export class PaginationMetaDto {
  @ApiProperty({
    description: 'Current page number (1-indexed)',
    example: 1,
    type: Number,
    minimum: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    type: Number,
    minimum: 1,
    maximum: 100,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of items across all pages',
    example: 100,
    type: Number,
    minimum: 0,
  })
  total: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 10,
    type: Number,
    minimum: 0,
  })
  totalPages: number;
}

/**
 * Paginated Response DTO
 * Standard paginated list response structure
 */
export class PaginatedResponseDto<T = any> {
  @ApiProperty({
    description: 'Indicates successful operation',
    example: true,
    type: Boolean,
  })
  success: true;

  @ApiProperty({
    description: 'Array of items for the current page',
    isArray: true,
  })
  data: T[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;
}

/**
 * Created Response DTO
 * Standard response for resource creation (201)
 */
export class CreatedResponseDto<T = any> {
  @ApiProperty({
    description: 'Indicates successful creation',
    example: true,
    type: Boolean,
  })
  success: true;

  @ApiProperty({
    description: 'Created resource data',
  })
  data: T;

  @ApiProperty({
    description: 'Success message',
    type: BilingualMessageDto,
    example: {
      ar: 'تم إنشاء العنصر بنجاح',
      en: 'Item created successfully',
    },
  })
  message: BilingualMessageDto;
}

/**
 * Updated Response DTO
 * Standard response for resource updates (200)
 */
export class UpdatedResponseDto<T = any> {
  @ApiProperty({
    description: 'Indicates successful update',
    example: true,
    type: Boolean,
  })
  success: true;

  @ApiProperty({
    description: 'Updated resource data',
  })
  data: T;

  @ApiProperty({
    description: 'Success message',
    type: BilingualMessageDto,
    example: {
      ar: 'تم تحديث العنصر بنجاح',
      en: 'Item updated successfully',
    },
  })
  message: BilingualMessageDto;
}

/**
 * Deleted Response DTO
 * Standard response for resource deletion (200)
 */
export class DeletedResponseDto {
  @ApiProperty({
    description: 'Indicates successful deletion',
    example: true,
    type: Boolean,
  })
  success: true;

  @ApiProperty({
    description: 'Success message',
    type: BilingualMessageDto,
    example: {
      ar: 'تم حذف العنصر بنجاح',
      en: 'Item deleted successfully',
    },
  })
  message: BilingualMessageDto;
}

/**
 * No Content Response DTO
 * Standard response for operations with no content (204)
 */
export class NoContentResponseDto {
  @ApiProperty({
    description: 'Indicates successful operation with no content',
    example: true,
    type: Boolean,
  })
  success: true;
}
