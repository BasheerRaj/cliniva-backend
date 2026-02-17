import { IsString, IsNotEmpty, IsOptional, IsEnum, IsMongoId, IsBoolean } from 'class-validator';

export class CreateNotificationDto {
  @IsMongoId()
  @IsNotEmpty()
  recipientId: string;

  @IsMongoId()
  @IsOptional()
  senderId?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsEnum([
    'appointment_booked',
    'appointment_confirmed',
    'appointment_rescheduled',
    'appointment_reminder',
    'appointment_cancelled',
    'payment_due',
    'test_results_ready',
    'prescription_ready',
    'system_maintenance',
    'security_alert',
    'general',
  ])
  notificationType: string;

  @IsEnum(['low', 'normal', 'high', 'urgent'])
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  relatedEntityType?: string;

  @IsMongoId()
  @IsOptional()
  relatedEntityId?: string;

  @IsEnum(['in_app', 'email', 'sms', 'push'])
  @IsOptional()
  deliveryMethod?: string;

  @IsOptional()
  data?: Record<string, string>;
}

export class NotificationQueryDto {
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
