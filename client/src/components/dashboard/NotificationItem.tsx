import { Button, Card, Space, Tag, Typography } from 'antd';

const { Text } = Typography;

export type NotificationSeverity = 'urgent' | 'info';

interface NotificationItemProps {
  title: string;
  message: string;
  timestamp: string;
  severity: NotificationSeverity;
  onMarkRead?: () => void;
  read?: boolean;
}

const severityColorMap: Record<NotificationSeverity, string> = {
  urgent: 'red',
  info: 'blue',
};

export function NotificationItem({
  title,
  message,
  timestamp,
  severity,
  onMarkRead,
  read = false,
}: NotificationItemProps) {
  return (
    <Card
      type="inner"
      title={
        <Space size={8}>
          <Tag color={severityColorMap[severity]} style={{ marginRight: 8 }}>
            {severity === 'urgent' ? 'Urgent' : 'Info'}
          </Tag>
          <Text strong>{title}</Text>
        </Space>
      }
      extra={
        <Button type="link" onClick={onMarkRead} disabled={read}>
          {read ? 'Read' : 'Mark as read'}
        </Button>
      }
    >
      <Text type="secondary">{timestamp}</Text>
      <div style={{ marginTop: 8 }}>
        <Text>{message}</Text>
      </div>
    </Card>
  );
}

