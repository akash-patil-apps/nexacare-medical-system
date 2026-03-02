// Notification service for NexaCare Medical System
// Handles all notification operations with database persistence
import { db } from '../db.js';
import { notifications } from '../../drizzle/schema.js';

export interface NotificationData {
  userId: number;
  type: string;
  title: string;
  message: string;
  relatedId?: number;
  relatedType?: string;
}

export class NotificationService {
  // Create a notification and store in database
  static async createNotification(notification: NotificationData) {
    try {
      const [createdNotification] = await db.insert(notifications).values({
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        relatedId: notification.relatedId,
        relatedType: notification.relatedType,
        isRead: false,
      }).returning();

      // Log notification creation
      console.log(`\n🔔 Notification Created:`);
      console.log(`👤 User: ${notification.userId}`);
      console.log(`📋 Title: ${notification.title}`);
      console.log(`📄 Message: ${notification.message}`);
      console.log(`🎯 Type: ${notification.type}`);
      console.log(`⏰ Created: ${new Date().toLocaleString()}\n`);

      return createdNotification;
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw error;
    }
  }

  // Get notifications for a user
  static async getUserNotifications(userId: number) {
    try {
      const userNotifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt));

      return userNotifications;
    } catch (error) {
      console.error('Failed to get user notifications:', error);
      throw error;
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId: number) {
    try {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, notificationId));

      console.log(`🔔 Notification ${notificationId} marked as read`);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  // Send appointment confirmation notification
  static async sendAppointmentConfirmation(appointmentId: number, patientId: number, doctorId: number) {
    const notification = {
      userId: patientId,
      type: 'appointment',
      title: 'Appointment Confirmed',
      message: 'Your appointment has been confirmed by the receptionist.',
      relatedId: appointmentId,
      relatedType: 'appointment',
    };

    return this.createNotification(notification);
  }

  // Send prescription notification
  static async sendPrescriptionNotification(prescriptionId: number, patientId: number, doctorId: number) {
    const notification = {
      userId: patientId,
      type: 'prescription',
      title: 'New Prescription Available',
      message: 'Your doctor has created a new prescription for you.',
      relatedId: prescriptionId,
      relatedType: 'prescription',
    };

    return this.createNotification(notification);
  }

  // Send lab report notification
  static async sendLabReportNotification(reportId: number, patientId: number, doctorId: number) {
    const notification = {
      userId: patientId,
      type: 'lab_report',
      title: 'Lab Report Ready',
      message: 'Your lab test results are now available.',
      relatedId: reportId,
      relatedType: 'lab_report',
    };

    return this.createNotification(notification);
  }

  // Send appointment reminder
  static async sendAppointmentReminder(appointmentId: number, patientId: number) {
    const notification = {
      userId: patientId,
      type: 'reminder',
      title: 'Appointment Reminder',
      message: 'You have an appointment scheduled for tomorrow.',
      relatedId: appointmentId,
      relatedType: 'appointment',
    };

    return this.createNotification(notification);
  }
}

// Import required functions
import { eq, desc } from 'drizzle-orm';
