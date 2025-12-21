import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseService } from '../firebase/firebase.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private firebaseService: FirebaseService,
  ) {}

  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: any,
  ) {
    // Create in PostgreSQL
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data: data || {},
      },
    });

    // Also write to Firebase Realtime Database for realtime updates
    try {
      await this.firebaseService.writeNotificationToDatabase(userId, {
        id: notification.id,
        type: type,
        title: title,
        message: message,
        data: data || {},
        isRead: false,
        createdAt: notification.createdAt.getTime(),
      });
    } catch (error) {
      console.error('Failed to write notification to Realtime Database:', error);
      // Don't fail the whole request if Realtime DB write fails
    }

    return notification;
  }

  async getUserNotifications(userId: string, unreadOnly = false) {
    const notifications = await this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { isRead: false }),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Enrich notifications with invitation status if type is TRIP_INVITATION
    const enrichedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        if (notification.type === 'TRIP_INVITATION' && notification.data) {
          const data = notification.data as any;
          if (data.invitationId) {
            // Fetch the current invitation status
            const invitation = await this.prisma.memberInvitation.findUnique({
              where: { id: data.invitationId },
              select: { status: true },
            });

            // Add invitation status to data
            return {
              ...notification,
              data: {
                ...data,
                invitationStatus: invitation?.status || 'UNKNOWN',
              },
            };
          }
        }
        return notification;
      }),
    );

    return enrichedNotifications;
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.update({
      where: { id, userId },
      data: { isRead: true },
    });

    // Also update in Realtime Database
    try {
      await this.firebaseService.markNotificationAsRead(userId, id);
    } catch (error) {
      console.error('Failed to mark notification as read in Realtime Database:', error);
    }

    return notification;
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    // Also update in Realtime Database
    try {
      const notifications = await this.firebaseService.getUserNotifications(userId);
      for (const notif of notifications) {
        if (!notif.isRead) {
          await this.firebaseService.markNotificationAsRead(userId, notif.id);
        }
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read in Realtime Database:', error);
    }

    return result;
  }

  async deleteNotification(id: string, userId: string) {
    const notification = await this.prisma.notification.delete({
      where: { id, userId },
    });

    // Also delete from Realtime Database
    try {
      await this.firebaseService.deleteNotificationFromDatabase(userId, id);
    } catch (error) {
      console.error('Failed to delete notification from Realtime Database:', error);
    }

    return notification;
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async deleteAllNotifications(userId: string) {
    // Delete from PostgreSQL
    const result = await this.prisma.notification.deleteMany({
      where: { userId },
    });

    // Delete from Realtime Database
    try {
      const notifications = await this.firebaseService.getUserNotifications(userId);
      for (const notif of notifications) {
        await this.firebaseService.deleteNotificationFromDatabase(userId, notif.id);
      }
    } catch (error) {
      console.error('Failed to delete all notifications from Realtime Database:', error);
    }

    return { 
      deleted: result.count,
      message: `Deleted ${result.count} notifications`,
    };
  }
}
