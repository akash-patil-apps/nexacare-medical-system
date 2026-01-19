// client/src/components/notifications/FloatingNotification.tsx
import { useEffect, useRef } from 'react';
import { App, Button, Space } from 'antd';
import { CheckOutlined, CloseOutlined, ReloadOutlined } from '@ant-design/icons';
import type { AppNotification } from './NotificationBell';

interface FloatingNotificationProps {
  notification: AppNotification;
  onConfirm?: (notificationId: number, relatedId?: number) => void;
  onCancel?: (notificationId: number, relatedId?: number) => void;
  onReschedule?: (notificationId: number, relatedId?: number) => void;
  onDismiss?: (notificationId: number) => void;
  showActions?: boolean;
  duration?: number; // Auto-dismiss duration in seconds
}

export function FloatingNotification({
  notification,
  onConfirm,
  onCancel,
  onReschedule,
  onDismiss,
  showActions = false,
  duration = 10,
}: FloatingNotificationProps) {
  const { notification: notificationApi } = App.useApp();
  const notificationKeyRef = useRef<string>(`floating-notif-${notification.id}`);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownRef = useRef(false);

  useEffect(() => {
    // Only show once
    if (hasShownRef.current) return;
    hasShownRef.current = true;

    const type = (notification.type || '').toLowerCase();
    let notificationType: 'info' | 'success' | 'warning' | 'error' = 'info';
    
    if (type.includes('cancel') || type.includes('reject')) {
      notificationType = 'error';
    } else if (type.includes('confirm') || type.includes('complete')) {
      notificationType = 'success';
    } else if (type.includes('pending') || type.includes('resched')) {
      notificationType = 'warning';
    }

    // Create custom notification with action buttons
    const btn = showActions ? (
      <Space size="small" style={{ marginTop: 8 }}>
        {onConfirm && (
          <Button
            type="primary"
            size="small"
            icon={<CheckOutlined />}
            onClick={() => {
              onConfirm(notification.id, notification.relatedId || undefined);
              notificationApi.destroy(notificationKeyRef.current);
              if (timeoutRef.current) clearTimeout(timeoutRef.current);
            }}
          >
            Confirm
          </Button>
        )}
        {onCancel && (
          <Button
            danger
            size="small"
            icon={<CloseOutlined />}
            onClick={() => {
              onCancel(notification.id, notification.relatedId || undefined);
              notificationApi.destroy(notificationKeyRef.current);
              if (timeoutRef.current) clearTimeout(timeoutRef.current);
            }}
          >
            Cancel
          </Button>
        )}
        {onReschedule && (
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => {
              onReschedule(notification.id, notification.relatedId || undefined);
              notificationApi.destroy(notificationKeyRef.current);
              if (timeoutRef.current) clearTimeout(timeoutRef.current);
            }}
          >
            Reschedule
          </Button>
        )}
      </Space>
    ) : null;

    notificationApi[notificationType]({
      message: notification.title || 'Notification',
      description: (
        <div>
          <div>{notification.message}</div>
          {btn}
        </div>
      ),
      placement: 'topRight',
      duration: duration,
      key: notificationKeyRef.current,
      onClick: () => {
        // Mark as read when clicked
        if (onDismiss) {
          onDismiss(notification.id);
        }
      },
      onClose: () => {
        // Mark as read when closed
        if (onDismiss) {
          onDismiss(notification.id);
        }
      },
    });

    // Auto-dismiss after duration
    timeoutRef.current = setTimeout(() => {
      notificationApi.destroy(notificationKeyRef.current);
      if (onDismiss) {
        onDismiss(notification.id);
      }
    }, duration * 1000);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []); // Only run once when component mounts

  return null; // This component doesn't render anything directly
}
