import { Card, Space, Tag, Typography, Button } from 'antd';
import { ReactNode } from 'react';

const { Text, Title } = Typography;

export type TrendType = 'positive' | 'neutral' | 'negative';

interface KpiCardProps {
  label: string;
  value: number | string;
  icon?: ReactNode;
  trendLabel?: string;
  trendType?: TrendType;
  onView?: () => void;
}

const trendColorMap: Record<TrendType, string> = {
  positive: 'green',
  neutral: 'default',
  negative: 'red',
};

export function KpiCard({
  label,
  value,
  icon,
  trendLabel,
  trendType = 'neutral',
  onView,
}: KpiCardProps) {
  return (
    <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }} bodyStyle={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '20px' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text type="secondary" style={{ fontSize: '14px' }}>{label}</Text>
        {icon}
      </Space>
      <Title level={1} style={{ margin: '12px 0', fontSize: '32px', lineHeight: '40px', wordBreak: 'break-word' }}>
        {value}
      </Title>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginTop: 'auto' }}>
        {trendLabel && <Tag color={trendColorMap[trendType]}>{trendLabel}</Tag>}
        {onView && (
          <Button type="link" onClick={onView} style={{ padding: 0 }}>
            View
          </Button>
        )}
      </Space>
    </Card>
  );
}

