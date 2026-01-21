// server/services/notifications.service.ts
import { db } from '../db';
import { notifications, appointments } from '../../shared/schema';
import { eq, desc } from 'drizzle-orm';
import type { InsertNotification } from '../../shared/schema-types';

/**
 * Create a new notification for a user.
 */
export const createNotification = async (
  data: Omit<InsertNotification, 'id' | 'createdAt' | 'isRead'>
) => {
  return db.insert(notifications).values({
    ...data,
    isRead: false,
  }).returning();
};

/**
 * Get all notifications for a user, ordered by most recent first.
 * Only returns notifications where event time >= current time.
 * For appointment-related notifications, event time is derived from appointment date+time.
 * For other notifications, event time is the createdAt time.
 */
export const getUserNotifications = async (userId: number) => {
  const now = new Date();
  
  // Get all notifications for the user
  const allNotifications = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt));

  // Filter notifications based on event time
  const futureNotifications = [];
  
  for (const notif of allNotifications) {
    let eventTime: Date | null = null;
    
    // If notification is related to an appointment, get the appointment's scheduled time
    if (notif.relatedType === 'appointment' && notif.relatedId) {
      const [appointment] = await db
        .select({
          id: appointments.id,
          patientId: appointments.patientId,
          doctorId: appointments.doctorId,
          hospitalId: appointments.hospitalId,
          appointmentDate: appointments.appointmentDate,
          appointmentTime: appointments.appointmentTime,
          status: appointments.status,
        })
        .from(appointments)
        .where(eq(appointments.id, notif.relatedId))
        .limit(1);
      
      if (appointment) {
        // Parse appointment date and time to create event time
        const appointmentDate = appointment.appointmentDate instanceof Date 
          ? appointment.appointmentDate 
          : new Date(appointment.appointmentDate);
        
        const timeStr = appointment.appointmentTime || appointment.timeSlot?.split('-')[0] || '09:00';
        const [hours, minutes] = timeStr.split(':').map(Number);
        
        eventTime = new Date(appointmentDate);
        eventTime.setHours(hours || 9, minutes || 0, 0, 0);
      }
    }
    
    // If no event time from appointment, use createdAt as fallback
    if (!eventTime) {
      eventTime = notif.createdAt instanceof Date 
        ? notif.createdAt 
        : new Date(notif.createdAt || now);
    }
    
    // Only include notifications where event time >= current time
    if (eventTime >= now) {
      futureNotifications.push(notif);
    }
  }
  
  return futureNotifications;
};

/**
 * Mark a single notification as read.
 */
export const markNotificationAsRead = async (notificationId: number) => {
  return db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.id, notificationId))
    .returning();
};

/**
 * Mark all notifications as read for a user.
 */
export const markAllNotificationsAsRead = async (userId: number) => {
  return db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.userId, userId));
};
