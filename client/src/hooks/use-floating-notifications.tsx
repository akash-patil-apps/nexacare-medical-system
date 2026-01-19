// client/src/hooks/use-floating-notifications.tsx
import { useEffect, useRef } from 'react';
import { App } from 'antd';
import type { AppNotification } from '../components/notifications/NotificationBell';
import { FloatingNotification } from '../components/notifications/FloatingNotification';

interface UseFloatingNotificationsOptions {
  notifications: AppNotification[];
  showActions?: boolean;
  onConfirm?: (notificationId: number, relatedId?: number) => void;
  onCancel?: (notificationId: number, relatedId?: number) => void;
  onReschedule?: (notificationId: number, relatedId?: number) => void;
  duration?: number;
}

export function useFloatingNotifications({
  notifications,
  showActions = false,
  onConfirm,
  onCancel,
  onReschedule,
  duration = 10,
}: UseFloatingNotificationsOptions) {
  const shownNotificationIdsRef = useRef<Set<number>>(new Set());
  const { queryClient } = require('@tanstack/react-query').useQueryClient();

  useEffect(() => {
    if (!notifications || notifications.length === 0) return;

    const unread = notifications.filter((n) => !n.isRead);
    
    unread.forEach((notif) => {
      const notifId = Number(notif.id);
      
      // Only show if we haven't shown this notification before
      if (!shownNotificationIdsRef.current.has(notifId)) {
        shownNotificationIdsRef.current.add(notifId);
        
        const markAsRead = async (notificationId: number) => {
          const token = localStorage.getItem('auth-token');
          if (token) {
            try {
              await fetch(`/api/notifications/read/${notificationId}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
              });
              queryClient.invalidateQueries({ queryKey: ['/api/notifications/me'] });
            } catch (error) {
              console.error('Failed to mark notification as read:', error);
            }
          }
        };

        // Render floating notification
        return (
          <FloatingNotification
            key={notifId}
            notification={notif}
            showActions={showActions}
            onConfirm={onConfirm}
            onCancel={onCancel}
            onReschedule={onReschedule}
            onDismiss={markAsRead}
            duration={duration}
          />
        );
      }
    });
  }, [notifications, showActions, onConfirm, onCancel, onReschedule, duration, queryClient]);
}
