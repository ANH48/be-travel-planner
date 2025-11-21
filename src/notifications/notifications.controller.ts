import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUserFull,
  CurrentUserData,
} from '../auth/decorators/current-user-full.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  getNotifications(
    @CurrentUserFull() user: CurrentUserData,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.getUserNotifications(
      user.userId,
      unreadOnly === 'true',
    );
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUserFull() user: CurrentUserData) {
    return this.notificationsService.getUnreadCount(user.userId);
  }

  @Post(':id/read')
  markAsRead(@Param('id') id: string, @CurrentUserFull() user: CurrentUserData) {
    return this.notificationsService.markAsRead(id, user.userId);
  }

  @Post('read-all')
  markAllAsRead(@CurrentUserFull() user: CurrentUserData) {
    return this.notificationsService.markAllAsRead(user.userId);
  }

  @Delete(':id')
  deleteNotification(
    @Param('id') id: string,
    @CurrentUserFull() user: CurrentUserData,
  ) {
    return this.notificationsService.deleteNotification(id, user.userId);
  }

  @Delete()
  deleteAllNotifications(@CurrentUserFull() user: CurrentUserData) {
    return this.notificationsService.deleteAllNotifications(user.userId);
  }
}
