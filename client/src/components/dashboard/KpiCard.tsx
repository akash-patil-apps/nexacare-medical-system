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
    <Card>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Text type="secondary">{label}</Text>
        {icon}
      </Space>
      <Title level={1} style={{ margin: '12px 0' }}>
        {value}
      </Title>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        {trendLabel && <Tag color={trendColorMap[trendType]}>{trendLabel}</Tag>}
        <Button type="link" onClick={onView}>
          View
        </Button>
      </Space>
    </Card>
  );
}

