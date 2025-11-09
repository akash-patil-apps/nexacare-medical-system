import { Button, Card, Space, Typography } from 'antd';

const { Title, Text } = Typography;

export type TimelineType = 'appointments' | 'prescriptions' | 'labs';

interface TimelineItemProps {
  title: string;
  timestamp: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function TimelineItem({
  title,
  timestamp,
  description,
  actionLabel,
  onAction,
}: TimelineItemProps) {
  return (
    <Card bordered>
      <Space direction="vertical" style={{ width: '100%' }} size={4}>
        <Title level={4} style={{ marginBottom: 0 }}>
          {title}
        </Title>
        <Text type="secondary">{timestamp}</Text>
        <Text>{description}</Text>
      </Space>
      {actionLabel && (
        <Button type="link" onClick={onAction} style={{ marginTop: 8, paddingLeft: 0 }}>
          {actionLabel}
        </Button>
      )}
    </Card>
  );
}

