// server/routes/notifications.routes.ts
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import type { AuthenticatedRequest } from '../types.js';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/notifications.service.js';

const router = Router();

// Get all notifications for the current user
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const notifications = await getUserNotifications(req.user!.id);
    res.json(notifications);
  } catch (err) {
    console.error('Fetch notifications error:', err);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

// Mark a single notification as read
router.post('/read/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await markNotificationAsRead(Number(req.params.id));
    res.json({ success: true, result });
  } catch (err) {
    console.error('Mark as read error:', err);
    res.status(500).json({ message: 'Failed to update notification' });
  }
});

// Mark all notifications as read
router.post('/read-all', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    await markAllNotificationsAsRead(req.user!.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Mark all as read error:', err);
    res.status(500).json({ message: 'Failed to update notifications' });
  }
});

export default router;
