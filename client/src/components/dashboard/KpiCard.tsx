import { Card, Space, Tag, Typography, Button } from 'antd';
import { ReactNode } from 'react';
import { FIGMA_RECEPTIONIST, FIGMA_RADIUS_KPI_ICON } from '../../design-tokens';

const { Text, Title } = Typography;

export type TrendType = 'positive' | 'neutral' | 'negative';

interface KpiCardProps {
  label: string;
  value: number | string;
  icon?: ReactNode;
  trendLabel?: string;
  trendType?: TrendType;
  trendColor?: string;
  trendBg?: string;
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
        width: '100%',
        display: 'flex', 
        flexDirection: 'column',
        borderRadius: 16, // Style guide: 16px for cards (not 12px from Figma)
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        border: '1px solid #E5E7EB',
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
          padding: FIGMA_RECEPTIONIST.kpiCardPadding,
          minHeight: 120,
        }
      }}
      onClick={onView}
    >
      {/* Label on top */}
      <Text type="secondary" style={{ fontSize: 14, fontWeight: 400, color: '#6B7280', lineHeight: '20px', marginBottom: 8 }}>
        {label}
      </Text>
      
      {/* Value and Icon in same row - Icon on right (matching Figma) */}
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
        <Title 
          level={1} 
          style={{ 
            margin: 0, 
            fontSize: 30, 
            lineHeight: '36px', 
            wordBreak: 'break-word',
            fontWeight: 600,
            color: '#262626',
            textAlign: 'left',
            flex: 1,
          }}
        >
          {value}
        </Title>
        {icon && (
          <div style={{ 
            width: FIGMA_RECEPTIONIST.kpiIconBoxSize,
            height: FIGMA_RECEPTIONIST.kpiIconBoxSize,
            borderRadius: FIGMA_RADIUS_KPI_ICON,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--ant-color-primary-bg, #F3F4F6)',
            flexShrink: 0,
          }}>
            {icon}
          </div>
        )}
      </div>
      
      {/* Tag and View link at bottom */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
        {trendLabel && (
          <Tag 
            style={{ 
              borderRadius: 9999,
              padding: FIGMA_RECEPTIONIST.kpiTagPadding,
              fontSize: 12,
              lineHeight: '16px',
              fontWeight: 500,
              color: tagColor,
              background: tagBg,
              border: 'none',
              margin: 0,
              height: 24,
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

