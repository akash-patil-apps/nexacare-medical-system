// server/services/messages.service.ts
// In-platform messaging: send and receive messages between users (no external service)
import { db } from '../db';
import { messages, users, notifications } from '../../shared/schema';
import { eq, or, and, desc, sql, inArray, ne, ilike, isNull } from 'drizzle-orm';
import type { InsertMessage } from '../../shared/schema-types';

/**
 * Send a message from sender to recipient. Optionally create an in-app notification for the recipient.
 */
export async function sendMessage(
  senderId: number,
  recipientId: number,
  body: string
): Promise<{ id: number; senderId: number; recipientId: number; body: string; createdAt: Date | string }> {
  if (senderId === recipientId) {
    throw new Error('Cannot send message to yourself');
  }
  const [inserted] = await db
    .insert(messages)
    .values({
      senderId,
      recipientId,
      body: body.trim(),
    } as InsertMessage)
    .returning({ id: messages.id, senderId: messages.senderId, recipientId: messages.recipientId, body: messages.body, createdAt: messages.createdAt });
  if (!inserted) throw new Error('Failed to send message');

  // In-app notification for recipient (optional: so they see "New message" in the bell)
  const [sender] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, senderId)).limit(1);
  await db.insert(notifications).values({
    userId: recipientId,
    type: 'message',
    title: 'New message',
    message: sender ? `${sender.fullName}: ${body.trim().slice(0, 80)}${body.length > 80 ? '…' : ''}` : 'You have a new message',
    relatedId: inserted.id,
    relatedType: 'message',
  });

  return inserted;
}

/**
 * List conversations for the current user: other users with whom they have messages,
 * with last message and unread count.
 */
export async function getConversations(userId: number) {
  const raw = await db
    .select({
      otherUserId: sql<number>`CASE WHEN ${messages.senderId} = ${userId} THEN ${messages.recipientId} ELSE ${messages.senderId} END`,
      lastMessageId: messages.id,
      lastBody: messages.body,
      lastCreatedAt: messages.createdAt,
      lastSenderId: messages.senderId,
    })
    .from(messages)
    .where(or(eq(messages.senderId, userId), eq(messages.recipientId, userId)))
    .orderBy(desc(messages.createdAt));

  // Dedupe by other user and take latest
  const byOther = new Map<number, { lastMessageId: number; lastBody: string; lastCreatedAt: Date | string; lastSenderId: number }>();
  for (const row of raw) {
    const otherId = row.otherUserId;
    if (!byOther.has(otherId)) byOther.set(otherId, { lastMessageId: row.lastMessageId, lastBody: row.lastBody, lastCreatedAt: row.lastCreatedAt, lastSenderId: row.lastSenderId });
  }

  const otherUserIds = [...byOther.keys()];
  if (otherUserIds.length === 0) return [];

  const userRows = await db
    .select({ id: users.id, fullName: users.fullName, role: users.role })
    .from(users)
    .where(inArray(users.id, otherUserIds));

  const userMap = new Map(userRows.map((u) => [u.id, u]));

  const unreadRows = await db
    .select()
    .from(messages)
    .where(and(eq(messages.recipientId, userId), isNull(messages.readAt)));

  const unreadBySender = new Map<number, number>();
  for (const r of unreadRows) {
    unreadBySender.set(r.senderId, (unreadBySender.get(r.senderId) ?? 0) + 1);
  }

  return otherUserIds.map((otherId) => {
    const last = byOther.get(otherId)!;
    const u = userMap.get(otherId);
    return {
      otherUserId: otherId,
      otherUserName: u?.fullName ?? 'Unknown',
      otherUserRole: u?.role ?? null,
      lastMessageId: last.lastMessageId,
      lastBody: last.lastBody,
      lastCreatedAt: last.lastCreatedAt,
      lastIsFromMe: last.lastSenderId === userId,
      unreadCount: unreadBySender.get(otherId) ?? 0,
    };
  });
}

/**
 * Get messages between current user and another user, ordered by createdAt ascending.
 */
export async function getConversationWith(userId: number, otherUserId: number) {
  const rows = await db
    .select({
      id: messages.id,
      senderId: messages.senderId,
      recipientId: messages.recipientId,
      body: messages.body,
      readAt: messages.readAt,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(
      or(
        and(eq(messages.senderId, userId), eq(messages.recipientId, otherUserId)),
        and(eq(messages.senderId, otherUserId), eq(messages.recipientId, userId))
      )
    )
    .orderBy(messages.createdAt);

  const [other] = await db.select({ id: users.id, fullName: users.fullName, role: users.role }).from(users).where(eq(users.id, otherUserId)).limit(1);
  return {
    otherUser: other ? { id: other.id, fullName: other.fullName, role: other.role } : null,
    messages: rows.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      recipientId: m.recipientId,
      body: m.body,
      readAt: m.readAt,
      createdAt: m.createdAt,
      isFromMe: m.senderId === userId,
    })),
  };
}

/**
 * Get total unread message count for the current user (for badge in header).
 */
export async function getUnreadMessageCount(userId: number): Promise<number> {
  const rows = await db
    .select({ id: messages.id })
    .from(messages)
    .where(and(eq(messages.recipientId, userId), isNull(messages.readAt)));
  return rows.length;
}

/**
 * Mark all messages from another user to the current user as read.
 */
export async function markConversationAsRead(userId: number, otherUserId: number) {
  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(and(eq(messages.recipientId, userId), eq(messages.senderId, otherUserId), isNull(messages.readAt)));
}

/**
 * Search users by name or mobile (for "new conversation" picker). Excludes current user.
 */
export async function searchUsersToMessage(currentUserId: number, query?: string) {
  const trimmed = query?.trim();
  if (!trimmed || trimmed.length < 1) {
    return db
      .select({ id: users.id, fullName: users.fullName, mobileNumber: users.mobileNumber, role: users.role })
      .from(users)
      .where(ne(users.id, currentUserId))
      .limit(50);
  }
  const term = `%${trimmed}%`;
  return db
    .select({ id: users.id, fullName: users.fullName, mobileNumber: users.mobileNumber, role: users.role })
    .from(users)
    .where(and(ne(users.id, currentUserId), or(ilike(users.fullName, term), ilike(users.mobileNumber, term))))
    .limit(50);
}
