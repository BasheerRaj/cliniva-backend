import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification } from '../database/schemas/notification.schema';
import {
  CreateNotificationDto,
  NotificationQueryDto,
} from './dto/create-notification.dto';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel('Notification')
    private readonly notificationModel: Model<Notification>,
  ) {}

  /**
   * Create and send a notification
   */
  async create(createDto: CreateNotificationDto): Promise<Notification> {
    const notification = new this.notificationModel({
      ...createDto,
      recipientId: new Types.ObjectId(createDto.recipientId),
      senderId: createDto.senderId
        ? new Types.ObjectId(createDto.senderId)
        : undefined,
      relatedEntityId: createDto.relatedEntityId
        ? new Types.ObjectId(createDto.relatedEntityId)
        : undefined,
      deliveryStatus:
        createDto.deliveryMethod === 'in_app' ? 'delivered' : 'pending',
    });

    const saved = await notification.save();

    // Trigger external delivery methods
    if (createDto.deliveryMethod === 'email') {
      await this.sendEmail(createDto);
    } else if (createDto.deliveryMethod === 'sms') {
      await this.sendSms(createDto);
    }

    return saved;
  }

  /**
   * Get notifications for a user
   */
  async findAllForUser(userId: string, query: NotificationQueryDto) {
    const { isRead, page = '1', limit = '10' } = query;
    const filter: any = { recipientId: new Types.ObjectId(userId) };

    if (isRead !== undefined) {
      filter.isRead = isRead;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const [notifications, total] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .exec(),
      this.notificationModel.countDocuments(filter),
    ]);

    return {
      notifications,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), recipientId: new Types.ObjectId(userId) },
      {
        $set: { isRead: true, readAt: new Date(), deliveryStatus: 'delivered' },
      },
      { new: true },
    );

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string) {
    return this.notificationModel.updateMany(
      { recipientId: new Types.ObjectId(userId), isRead: false },
      { $set: { isRead: true, readAt: new Date() } },
    );
  }

  /**
   * Email Delivery Placeholder
   */
  private async sendEmail(dto: CreateNotificationDto) {
    this.logger.log(
      `[Email Placeholder] Sending email to recipient ${dto.recipientId}: ${dto.title}`,
    );

    /* 
    TODO: Implementation with actual Email Service (SendGrid/SES)
    1. Fetch user email from database
    2. Render template
    3. Send email
    4. Update notification deliveryStatus to 'sent' or 'failed'
    
    const emailService = this.moduleRef.get(EmailService);
    await emailService.send(userEmail, dto.title, dto.message);
    */
  }

  /**
   * SMS Delivery Placeholder
   */
  private async sendSms(dto: CreateNotificationDto) {
    this.logger.log(
      `[SMS Placeholder] Sending SMS to recipient ${dto.recipientId}: ${dto.message}`,
    );

    /* 
    TODO: Implementation with actual SMS Service (Twilio/etc)
    1. Fetch user phone from database
    2. Send SMS
    3. Update notification deliveryStatus
    */
  }
}
