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

const trendColorMap: Record<TrendType, { color: string; bg?: string }> = {
  positive: { color: '#10B981', bg: '#D1FAE5' }, // Green for "Updated"
  neutral: { color: '#2563eb', bg: '#DBEAFE' }, // Blue for "Current", orange for "Latest", purple for messages
  negative: { color: '#EF4444', bg: '#FEE2E2' },
};

export function KpiCard({
  label,
  value,
  icon,
  trendLabel,
  trendType = 'neutral',
  trendColor,
  trendBg,
  onView,
}: KpiCardProps) {
  const tagColor = trendColor || trendColorMap[trendType].color;
  const tagBg = trendBg || trendColorMap[trendType].bg || '#FAFAFA';
  return (
    <Card 
      style={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        border: '1px solid #E3F2FF',
        transition: 'all 0.2s ease',
        cursor: onView ? 'pointer' : 'default',
        background: '#fff',
      }}
      hoverable={!!onView}
      styles={{ 
        body: {
          display: 'flex', 
          flexDirection: 'column', 
          flex: 1, 
          padding: '20px',
          minHeight: '140px',
        }
      }}
      onClick={onView}
    >
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <Text type="secondary" style={{ fontSize: '13px', fontWeight: 400, color: '#6b7280', lineHeight: 1.5 }}>
          {label}
        </Text>
        <div style={{ 
          fontSize: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {icon}
        </div>
      </div>
      <Title 
        level={1} 
        style={{ 
          margin: '12px 0 16px', 
          fontSize: '32px', 
          lineHeight: '40px', 
          wordBreak: 'break-word',
          fontWeight: 700,
          color: '#262626',
          textAlign: 'center',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {value}
      </Title>
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
        {trendLabel && (
          <Tag 
            style={{ 
              borderRadius: 9999,
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 500,
              color: tagColor,
              background: tagBg,
              border: 'none',
              margin: 0,
            }}
          >
            {trendLabel}
          </Tag>
        )}
        {onView && (
          <Button 
            type="link" 
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }} 
            style={{ 
              padding: 0,
              fontWeight: 500,
              color: '#2563eb',
              fontSize: '13px',
              height: 'auto',
            }}
          >
            View →
          </Button>
        )}
      </div>
    </Card>
  );
}

