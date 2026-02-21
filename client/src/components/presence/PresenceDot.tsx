import React from 'react';
import { Tooltip } from 'antd';

type PresenceStatus = 'online' | 'offline';

interface PresenceDotProps {
  status: PresenceStatus;
  size?: number;
  label?: string;
}

/**
 * Slack-style presence indicator: green dot = online, gray = offline.
 */
export function PresenceDot({ status, size = 10, label }: PresenceDotProps) {
  const isOnline = status === 'online';
  const dot = (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: isOnline ? '#22c55e' : '#9ca3af',
        border: '2px solid #fff',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.08)',
        flexShrink: 0,
      }}
      aria-label={isOnline ? 'Online' : 'Offline'}
    />
  );
  const content = label ?? (isOnline ? 'Online' : 'Offline');
  return (
    <Tooltip title={content}>
      {dot}
    </Tooltip>
  );
}
