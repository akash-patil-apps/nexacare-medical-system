// server/routes/messages.routes.ts
// In-platform messaging API: send and receive messages between users
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import type { AuthenticatedRequest } from '../types';
import {
  sendMessage,
  getConversations,
  getConversationWith,
  markConversationAsRead,
  searchUsersToMessage,
  getUnreadMessageCount,
} from '../services/messages.service';
import { z } from 'zod';

const router = Router();

const sendMessageBodySchema = z.object({
  recipientId: z.number().int().positive(),
  body: z.string().min(1).max(10000),
});

// Unread message count for header badge (must be before /conversation/:userId)
router.get('/unread-count', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const count = await getUnreadMessageCount(userId);
    res.json({ count });
  } catch (err) {
    console.error('Messages unread count error:', err);
    res.status(500).json({ message: 'Failed to get unread count' });
  }
});

// List my conversations (with last message and unread count)
router.get('/conversations', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const list = await getConversations(userId);
    res.json(list);
  } catch (err) {
    console.error('Messages list conversations error:', err);
    res.status(500).json({ message: 'Failed to load conversations' });
  }
});

// Search users to start a new conversation (must be before /conversation/:userId)
router.get('/users', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const currentUserId = req.user!.id;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const userList = await searchUsersToMessage(currentUserId, q);
    res.json(userList);
  } catch (err) {
    console.error('Messages search users error:', err);
    res.status(500).json({ message: 'Failed to search users' });
  }
});

// Get messages with a specific user
router.get('/conversation/:userId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const me = req.user!.id;
    const otherUserId = parseInt(req.params.userId, 10);
    if (Number.isNaN(otherUserId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    const data = await getConversationWith(me, otherUserId);
    res.json(data);
  } catch (err) {
    console.error('Messages get conversation error:', err);
    res.status(500).json({ message: 'Failed to load conversation' });
  }
});

// Mark conversation with a user as read
router.post('/conversation/:userId/read', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const me = req.user!.id;
    const otherUserId = parseInt(req.params.userId, 10);
    if (Number.isNaN(otherUserId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    await markConversationAsRead(me, otherUserId);
    res.json({ success: true });
  } catch (err) {
    console.error('Messages mark read error:', err);
    res.status(500).json({ message: 'Failed to mark as read' });
  }
});

// Send a message
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = sendMessageBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid body', errors: parsed.error.flatten() });
    }
    const senderId = req.user!.id;
    const { recipientId, body } = parsed.data;
    const msg = await sendMessage(senderId, recipientId, body);
    res.status(201).json(msg);
  } catch (err: any) {
    if (err.message === 'Cannot send message to yourself') {
      return res.status(400).json({ message: err.message });
    }
    console.error('Messages send error:', err);
    res.status(500).json({ message: err.message || 'Failed to send message' });
  }
});

export default router;
