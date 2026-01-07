import { Button } from 'antd';
import { ReactNode, CSSProperties } from 'react';

interface QuickActionTileProps {
  title?: string;
  label?: string; // For backward compatibility
  description?: string;
  icon?: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  style?: CSSProperties;
}

export function QuickActionTile({
  title,
  label,
  description,
  icon,
  onClick,
  variant = 'secondary',
  style,
}: QuickActionTileProps) {
  // Use title if provided, otherwise fall back to label
  const displayLabel = title || label || '';
  const isPrimary = variant === 'primary';
  const buttonId = `quick-action-${displayLabel ? displayLabel.toLowerCase().replace(/\s+/g, '-') : 'action'}`;
  
  return (
    <>
      <style>{`
        #${buttonId} .anticon {
          font-size: 18px !important;
        }
      `}</style>
      <Button
        id={buttonId}
        size="large"
        icon={icon}
        onClick={onClick}
        style={{
          height: 'auto',
          borderRadius: 12,
          fontSize: '14px',
          fontWeight: 600,
          background: isPrimary ? '#1A8FE3' : '#fff',
          border: isPrimary ? '1px solid #1A8FE3' : '1px solid #e5e7eb',
          color: isPrimary ? '#fff' : '#6b7280',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '8px 16px',
          flex: 1,
          minWidth: 0,
          ...style,
        }}
      type={isPrimary ? 'primary' : 'default'}
      onMouseEnter={(e) => {
        if (!isPrimary) {
          e.currentTarget.style.background = '#f9fafb';
          e.currentTarget.style.borderColor = '#d1d5db';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
        } else {
          e.currentTarget.style.background = '#1589D6';
          e.currentTarget.style.borderColor = '#1589D6';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(26, 143, 227, 0.3)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = isPrimary ? '#1A8FE3' : '#fff';
        e.currentTarget.style.borderColor = isPrimary ? '#1A8FE3' : '#e5e7eb';
        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
      }}
    >
      {displayLabel}
    </Button>
    </>
  );
}

