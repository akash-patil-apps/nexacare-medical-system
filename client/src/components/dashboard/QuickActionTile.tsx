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
  const isPrimary = variant === 'primary';

  return (
    <Button
      block={isPrimary}
      size="large"
      icon={icon}
      onClick={onClick}
      style={{
        height: isPrimary ? 80 : 48,
      }}
      type={isPrimary ? 'default' : 'default'}
    >
      {label}
    </Button>
  );
}

