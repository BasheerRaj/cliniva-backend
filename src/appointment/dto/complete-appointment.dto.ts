import { IsNotEmpty, IsOptional, IsString, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for completing an appointment with medical record data
 * Requirements: 8.1-8.10
 * 
 * All validation messages are bilingual (Arabic & English)
 */
export class CompleteAppointmentDto {
  @ApiProperty({
    description: 'Doctor notes (required for completion)',
    example: 'Patient responded well to treatment. Continue current medication.',
    minLength: 10,
    maxLength: 2000,
  })
  @IsNotEmpty({
    message: '{"ar":"ملاحظات الطبيب مطلوبة","en":"Doctor notes are required"}',
  })
  @IsString({
    message: '{"ar":"ملاحظات الطبيب يجب أن تكون نصاً","en":"Doctor notes must be a string"}',
  })
  doctorNotes: string;

  @ApiPropertyOptional({
    description: 'Diagnosis',
    example: 'Type 2 Diabetes',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({
    message: '{"ar":"التشخيص يجب أن يكون نصاً","en":"Diagnosis must be a string"}',
  })
  diagnosis?: string;

  @ApiPropertyOptional({
    description: 'Symptoms observed',
    example: 'Fatigue, increased thirst, frequent urination',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({
    message: '{"ar":"الأعراض يجب أن تكون نصاً","en":"Symptoms must be a string"}',
  })
  symptoms?: string;

  @ApiPropertyOptional({
    description: 'Clinical findings',
    example: 'Blood glucose elevated at 180 mg/dL',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({
    message: '{"ar":"النتائج السريرية يجب أن تكون نصاً","en":"Findings must be a string"}',
  })
  findings?: string;

  @ApiPropertyOptional({
    description: 'Procedures performed',
    example: 'HbA1c test conducted',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({
    message: '{"ar":"الإجراءات يجب أن تكون نصاً","en":"Procedures must be a string"}',
  })
  procedures?: string;

  @ApiPropertyOptional({
    description: 'Prescriptions',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        medication: { type: 'string', example: 'Metformin' },
        dosage: { type: 'string', example: '500mg' },
        frequency: { type: 'string', example: 'Twice daily' },
        duration: { type: 'string', example: '3 months' },
      },
    },
  })
  @IsOptional()
  @IsArray({
    message: '{"ar":"الوصفات الطبية يجب أن تكون مصفوفة","en":"Prescriptions must be an array"}',
  })
  prescriptions?: Array<{
    medication?: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
  }>;

  @ApiPropertyOptional({
    description: 'Treatment plan',
    example: 'Gradual lifestyle change with medication',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString({
    message: '{"ar":"خطة العلاج يجب أن تكون نصاً","en":"Treatment plan must be a string"}',
  })
  treatmentPlan?: string;

  @ApiPropertyOptional({
    description: 'Follow-up required',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean({
    message: '{"ar":"المتابعة المطلوبة يجب أن تكون قيمة منطقية","en":"Follow-up required must be a boolean"}',
  })
  followUpRequired?: boolean;

  @ApiPropertyOptional({
    description: 'Follow-up notes',
    example: 'Schedule follow-up in 3 months for HbA1c recheck',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({
    message: '{"ar":"ملاحظات المتابعة يجب أن تكون نصاً","en":"Follow-up notes must be a string"}',
  })
  followUpNotes?: string;

  @ApiPropertyOptional({
    description: 'Recommended follow-up duration',
    example: '3 months',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({
    message: '{"ar":"مدة المتابعة الموصى بها يجب أن تكون نصاً","en":"Recommended follow-up duration must be a string"}',
  })
  followUpDuration?: string;
}
