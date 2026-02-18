import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import {
  CreateNotificationDto,
  NotificationQueryDto,
} from './dto/create-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getMyNotifications(
    @Request() req: any,
    @Query() query: NotificationQueryDto,
  ) {
    const result = await this.notificationService.findAllForUser(
      req.user.userId,
      query,
    );
    return {
      success: true,
      data: result.notifications,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      },
    };
  }

  @Put(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req: any) {
    const notification = await this.notificationService.markAsRead(
      id,
      req.user.userId,
    );
    return {
      success: true,
      message: 'Notification marked as read',
      data: notification,
    };
  }

  @Put('read-all')
  async markAllAsRead(@Request() req: any) {
    await this.notificationService.markAllAsRead(req.user.userId);
    return {
      success: true,
      message: 'All notifications marked as read',
    };
  }

  // System internal endpoint for creating notifications manually (could be restricted to admins)
  @Post()
  async createNotification(@Body() createDto: CreateNotificationDto) {
    const notification = await this.notificationService.create(createDto);
    return {
      success: true,
      data: notification,
    };
  }
}
