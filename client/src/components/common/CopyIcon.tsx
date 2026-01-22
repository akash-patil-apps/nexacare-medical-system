import React from 'react';
import { CopyOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { copyToClipboard } from '../../lib/copy-utils';

interface CopyIconProps {
  text: string;
  label?: string;
  style?: React.CSSProperties;
  size?: number;
}

export const CopyIcon: React.FC<CopyIconProps> = ({ text, label, style, size = 14 }) => {
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await copyToClipboard(text, label);
  };

  return (
    <Button
      type="text"
      size="small"
      icon={<CopyOutlined style={{ fontSize: size, color: '#1890ff' }} />}
      onClick={handleCopy}
      style={{ 
        padding: '0 4px',
        height: 'auto',
        display: 'inline-flex',
        alignItems: 'center',
        ...style 
      }}
      title={`Copy ${label || 'text'}`}
    />
  );
};
