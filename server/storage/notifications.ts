// server/storage/notifications.ts
import { db } from '../db';
import { notifications } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import type { InsertNotification } from '../../shared/schema-types';

export const createNotification = (notif: Omit<InsertNotification, 'id' | 'createdAt' | 'isRead'>) => {
  return db.insert(notifications).values({ ...notif, isRead: false }).returning();
};

export const getNotificationsForUser = (userId: number) => {
  return db.select().from(notifications).where(eq(notifications.userId, userId));
};

export const markNotificationAsRead = (id: number) => {
  return db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id)).returning();
};

export const markAllNotificationsAsRead = (userId: number) => {
  return db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
};
