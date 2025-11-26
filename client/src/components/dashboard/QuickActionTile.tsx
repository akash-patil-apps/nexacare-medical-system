import { Button } from 'antd';
import { ReactNode } from 'react';

interface QuickActionTileProps {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

export function QuickActionTile({
  label,
  icon,
  onClick,
  variant = 'primary',
}: QuickActionTileProps) {
  return (
    <Button
      block
      size="large"
      icon={icon}
      onClick={onClick}
      style={{
        height: 48,
        borderRadius: 12,
        fontSize: '14px',
        fontWeight: 500,
        background: '#fff',
        border: '1px solid #e5e7eb',
        color: '#2563eb',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '12px 16px',
      }}
      type="default"
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#f9fafb';
        e.currentTarget.style.borderColor = '#2563eb';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#fff';
        e.currentTarget.style.borderColor = '#e5e7eb';
      }}
    >
      {label}
    </Button>
  );
}

