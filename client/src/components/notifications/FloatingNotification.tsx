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

    // Determine progress bar color based on notification type
    let progressBarColor = '#1890ff'; // Default blue for info
    if (notificationType === 'error') {
      progressBarColor = '#ff4d4f'; // Red
    } else if (notificationType === 'success') {
      progressBarColor = '#52c41a'; // Green
    } else if (notificationType === 'warning') {
      progressBarColor = '#faad14'; // Orange
    }

    // Create progress bar style with animation
    const progressBarStyle: React.CSSProperties = {
      position: 'absolute',
      bottom: 0,
      left: 0,
      width: '100%',
      height: '10px',
      backgroundColor: progressBarColor,
      transformOrigin: 'left',
      animation: `progressBarAnimation ${duration}s linear forwards`,
      borderRadius: '0 0 4px 4px',
      zIndex: 1000,
    };
    
    // Add className for targeting
    const progressBarClassName = 'notification-progress-bar';

    // Create custom notification with action buttons and progress bar
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

    // Inject CSS animation and notification wrapper styles if not already present
    const styleId = 'floating-notification-progress-animation';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes progressBarAnimation {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
        .ant-notification-notice {
          position: relative !important;
          overflow: hidden !important;
          min-width: 420px !important;
          max-width: 500px !important;
        }
        .ant-notification-notice-wrapper {
          min-width: 420px !important;
          max-width: 500px !important;
        }
        .notification-progress-bar {
          position: absolute !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          width: 100% !important;
          margin: 0 !important;
        }
      `;
      document.head.appendChild(style);
    }

    notificationApi[notificationType]({
      message: notification.title || 'Notification',
      description: (
        <div style={{ position: 'relative', paddingBottom: '10px' }}>
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

    // After notification is rendered, inject progress bar at the bottom of notification container
    // Use multiple attempts to find the notification element
    const injectProgressBar = () => {
      // Try to find notification by checking all notification wrappers
      const allWrappers = Array.from(document.querySelectorAll('.ant-notification-notice-wrapper'));
      
      // Find the notification that matches our content (title or message)
      const targetWrapper = allWrappers.find((wrapper) => {
        const notice = wrapper.querySelector('.ant-notification-notice');
        if (!notice) return false;
        const messageEl = notice.querySelector('.ant-notification-notice-message');
        const descriptionEl = notice.querySelector('.ant-notification-notice-description');
        const messageText = messageEl?.textContent || '';
        const descriptionText = descriptionEl?.textContent || '';
        return messageText.includes(notification.title || '') || 
               descriptionText.includes(notification.message || '');
      });
      
      const noticeElement = targetWrapper?.querySelector('.ant-notification-notice') as HTMLElement;
      
      if (noticeElement && !noticeElement.querySelector(`.${progressBarClassName}`)) {
        const progressBar = document.createElement('div');
        progressBar.className = progressBarClassName;
        Object.assign(progressBar.style, {
          position: 'absolute',
          bottom: '0',
          left: '0',
          width: '100%',
          height: '10px',
          backgroundColor: progressBarColor,
          transformOrigin: 'left',
          animation: `progressBarAnimation ${duration}s linear forwards`,
          borderRadius: '0 0 4px 4px',
          zIndex: '1000',
        });
        noticeElement.appendChild(progressBar);
        return true;
      }
      return false;
    };

    // Try multiple times with increasing delays to ensure notification is rendered
    let attempts = 0;
    const maxAttempts = 5;
    const tryInject = () => {
      attempts++;
      if (!injectProgressBar() && attempts < maxAttempts) {
        setTimeout(tryInject, 50 * attempts);
      }
    };
    setTimeout(tryInject, 50);

    // Auto-dismiss after duration (but don't mark as read - let it stay in notification bell)
    timeoutRef.current = setTimeout(() => {
      notificationApi.destroy(notificationKeyRef.current);
      // Don't call onDismiss here - notification should remain in notification bell
      // Only mark as read when user explicitly interacts (clicks or closes manually)
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
