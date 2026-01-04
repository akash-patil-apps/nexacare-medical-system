import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Drawer, List, Space, Tag, Typography, notification } from 'antd';
import { BellOutlined, CheckOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { subscribeToAppointmentEvents } from '../../lib/appointments-events';

const { Text } = Typography;

export type AppNotification = {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  relatedId?: number | null;
  relatedType?: string | null;
  isRead?: boolean | null;
  createdAt?: string | null;
};

async function fetchMyNotifications(): Promise<AppNotification[]> {
  const token = localStorage.getItem('auth-token');
  const res = await fetch('/api/notifications/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
}

async function markAsRead(id: number) {
  const token = localStorage.getItem('auth-token');
  const res = await fetch(`/api/notifications/read/${id}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error('Failed to mark notification as read');
  return res.json();
}

async function markAllAsRead() {
  const token = localStorage.getItem('auth-token');
  const res = await fetch(`/api/notifications/read-all`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error('Failed to mark all notifications as read');
  return res.json();
}

export function NotificationBell({
  placement = 'right',
  showToastOnNew = true,
}: {
  placement?: 'right' | 'left';
  showToastOnNew?: boolean;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['/api/notifications/me'],
    queryFn: fetchMyNotifications,
    staleTime: 5_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications],
  );

  const markOneMutation = useMutation({
    mutationFn: (id: number) => markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/notifications/me'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllAsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/notifications/me'] }),
  });

  // Refresh notifications when appointment events happen (SSE)
  useEffect(() => {
    const unsubscribe = subscribeToAppointmentEvents({
      onEvent: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/notifications/me'] });
      },
    });
    return unsubscribe;
  }, [queryClient]);

  // "Push" style toasts for new notifications (in-app)
  const hasInitializedRef = useRef(false);
  const knownIdsRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!notifications) return;

    const ids = new Set<number>(notifications.map((n) => Number(n.id)));

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      knownIdsRef.current = ids;
      return;
    }

    if (!showToastOnNew) {
      knownIdsRef.current = ids;
      return;
    }

    const prev = knownIdsRef.current;
    const newOnes = notifications.filter((n) => !prev.has(Number(n.id)));
    if (newOnes.length > 0) {
      const latest = newOnes[0];
      notification.open({
        message: latest.title || 'New notification',
        description: latest.message,
        placement: 'topRight',
        duration: 4,
      });
    }
    knownIdsRef.current = ids;
  }, [notifications, showToastOnNew]);

  const typeTagColor = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('cancel')) return 'red';
    if (t.includes('resched')) return 'blue';
    if (t.includes('confirm')) return 'green';
    if (t.includes('reminder')) return 'orange';
    return 'default';
  };

  const normalizeTypeLabel = (type: string) => {
    const t = (type || '').toUpperCase();
    if (t === 'APPOINTMENT_RESCHEDULED' || t === 'APPOINTMENT_RESCHEDULED'.toUpperCase()) return 'RESCHEDULED';
    if (t === 'APPOINTMENT_CONFIRMED') return 'CONFIRMED';
    if (t === 'APPOINTMENT_CANCELLED') return 'CANCELLED';
    return t || 'SYSTEM';
  };

  return (
    <>
      {/* Keep badge inside bounds even when placed at the far right edge */}
      <Badge count={unreadCount} size="small" offset={[-10, 6]}>
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: 18 }} />}
          onClick={() => setOpen(true)}
          aria-label="Open notifications"
        />
      </Badge>

      <Drawer
        title={
          <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
            <Text strong>Notifications</Text>
            <Button
              size="small"
              icon={<CheckOutlined />}
              disabled={unreadCount === 0}
              loading={markAllMutation.isPending}
              onClick={() => markAllMutation.mutate()}
            >
              Mark all read
            </Button>
          </Space>
        }
        open={open}
        onClose={() => setOpen(false)}
        placement={placement}
        width={420}
      >
        <List
          loading={isLoading}
          dataSource={notifications}
          locale={{ emptyText: 'No notifications' }}
          renderItem={(item) => (
            <List.Item
              style={{
                background: item.isRead ? 'transparent' : 'rgba(24, 144, 255, 0.06)',
                borderRadius: 10,
                padding: 12,
                marginBottom: 10,
                display: 'block', // prevent List actions from shrinking meta to a few pixels
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, width: '100%' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text strong style={{ display: 'block', wordBreak: 'break-word' }}>
                        {item.title}
                      </Text>
                      <div style={{ marginTop: 6 }}>
                        <Space size={8} wrap>
                          <Tag color={typeTagColor(item.type)}>{normalizeTypeLabel(item.type)}</Tag>
                          {!item.isRead && <Tag color="blue">NEW</Tag>}
                        </Space>
                      </div>
                    </div>

                    <Button
                      size="small"
                      type="link"
                      disabled={!!item.isRead}
                      loading={markOneMutation.isPending && (markOneMutation.variables as any) === item.id}
                      onClick={() => markOneMutation.mutate(item.id)}
                      style={{ padding: 0, whiteSpace: 'nowrap' }}
                    >
                      Mark read
                    </Button>
                  </div>

                  <div style={{ marginTop: 10, wordBreak: 'break-word' }}>{item.message}</div>
                  {item.createdAt && (
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
                      {new Date(item.createdAt).toLocaleString()}
                    </Text>
                  )}
                </div>
              </div>
            </List.Item>
          )}
        />
      </Drawer>
    </>
  );
}


