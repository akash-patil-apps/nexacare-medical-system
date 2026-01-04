// server/services/notifications.service.ts
import { db } from '../db';
import { notifications } from '../../shared/schema';
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
 */
export const getUserNotifications = async (userId: number) => {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt));
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
