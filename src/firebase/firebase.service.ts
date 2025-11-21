import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ServiceAccount } from 'firebase-admin';
import * as path from 'path';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private firebaseApp: admin.app.App;

  onModuleInit() {
    const serviceAccount = require(path.join(
      __dirname,
      '../../travel-planer-b5efb-firebase-adminsdk-fbsvc-db08fb9029.json',
    )) as ServiceAccount;

    this.firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: 'https://travel-planer-b5efb-default-rtdb.asia-southeast1.firebasedatabase.app',
    });

    console.log('✅ Firebase Admin initialized with Realtime Database');
  }

  async sendNotification(
    token: string,
    notification: {
      title: string;
      body: string;
      data?: Record<string, string>;
    },
  ): Promise<string> {
    try {
      const message: admin.messaging.Message = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data || {},
        token: token,
      };

      const response = await admin.messaging().send(message);
      console.log('Successfully sent notification:', response);
      return response;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  async sendNotificationToMultipleDevices(
    tokens: string[],
    notification: {
      title: string;
      body: string;
      data?: Record<string, string>;
    },
  ): Promise<admin.messaging.BatchResponse> {
    try {
      const message: admin.messaging.MulticastMessage = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data || {},
        tokens: tokens,
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      console.log('Successfully sent notifications:', response);
      return response;
    } catch (error) {
      console.error('Error sending notifications:', error);
      throw error;
    }
  }

  async sendNotificationToTopic(
    topic: string,
    notification: {
      title: string;
      body: string;
      data?: Record<string, string>;
    },
  ): Promise<string> {
    try {
      const message: admin.messaging.Message = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data || {},
        topic: topic,
      };

      const response = await admin.messaging().send(message);
      console.log('Successfully sent notification to topic:', response);
      return response;
    } catch (error) {
      console.error('Error sending notification to topic:', error);
      throw error;
    }
  }

  /**
   * Write notification to Realtime Database
   */
  async writeNotificationToDatabase(
    userId: string,
    notification: {
      id: string;
      type: string;
      title: string;
      message: string;
      data?: Record<string, any>;
      isRead?: boolean;
      createdAt?: number;
    },
  ): Promise<void> {
    try {
      const db = admin.database();
      const notificationRef = db.ref(`notifications/${userId}/${notification.id}`);
      
      await notificationRef.set({
        ...notification,
        isRead: notification.isRead ?? false,
        createdAt: notification.createdAt ?? Date.now(),
      });

      console.log(`✅ Notification written to database for user ${userId}`);
    } catch (error) {
      console.error('Error writing notification to database:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read in Realtime Database
   */
  async markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
    try {
      const db = admin.database();
      const notificationRef = db.ref(`notifications/${userId}/${notificationId}`);
      
      await notificationRef.update({
        isRead: true,
        readAt: Date.now(),
      });

      console.log(`✅ Notification ${notificationId} marked as read`);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Delete notification from Realtime Database
   */
  async deleteNotificationFromDatabase(userId: string, notificationId: string): Promise<void> {
    try {
      const db = admin.database();
      const notificationRef = db.ref(`notifications/${userId}/${notificationId}`);
      
      await notificationRef.remove();

      console.log(`✅ Notification ${notificationId} deleted from database`);
    } catch (error) {
      console.error('Error deleting notification from database:', error);
      throw error;
    }
  }

  /**
   * Get all notifications for a user
   */
  async getUserNotifications(userId: string): Promise<any[]> {
    try {
      const db = admin.database();
      const notificationsRef = db.ref(`notifications/${userId}`);
      
      const snapshot = await notificationsRef.once('value');
      const notifications = snapshot.val();

      if (!notifications) {
        return [];
      }

      // Convert object to array
      return Object.keys(notifications).map(key => ({
        id: key,
        ...notifications[key],
      }));
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  /**
   * Create custom Firebase token for user authentication
   */
  async createCustomToken(userId: string): Promise<string> {
    try {
      const customToken = await admin.auth().createCustomToken(userId);
      console.log(`✅ Custom token created for user ${userId}`);
      return customToken;
    } catch (error) {
      console.error('Error creating custom token:', error);
      throw error;
    }
  }
}
