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
    <Card 
      variant="outlined"
      style={{
        borderRadius: 12,
        border: '1px solid #E3F2FF',
        background: '#fff',
        transition: 'all 0.3s ease',
        marginBottom: 12,
      }}
      hoverable
    >
      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        <Title level={5} style={{ marginBottom: 0, color: '#1A8FE3', fontWeight: 600 }}>
          {title}
        </Title>
        <Text type="secondary" style={{ fontSize: 12 }}>{timestamp}</Text>
        <Text style={{ fontSize: 14, color: '#595959' }}>{description}</Text>
      </Space>
      {actionLabel && (
        <Button 
          type="link" 
          onClick={onAction} 
          style={{ 
            marginTop: 12, 
            paddingLeft: 0,
            color: '#1A8FE3',
            fontWeight: 500,
          }}
        >
          {actionLabel} →
        </Button>
      )}
    </Card>
  );
}

