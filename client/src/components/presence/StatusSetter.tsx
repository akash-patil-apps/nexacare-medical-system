import React, { useState } from 'react';
import { Card, Select, Input, Button, Typography } from 'antd';
import { SmileOutlined } from '@ant-design/icons';
import { updateMyPresence } from '../../lib/presence';
import type { UserStatus } from '../../lib/presence';

const { Text } = Typography;

const USER_STATUS_LABELS: Record<UserStatus, string> = {
  available: 'Available',
  away: 'Away',
  busy: 'Busy',
  dnd: 'Do not disturb',
};

interface StatusSetterProps {
  onUpdated?: () => void;
}

/**
 * Compact Slack-like status setter for staff (doctor, receptionist, nurse, etc.).
 * Lets them set Available / Away / Busy / DND and an optional message.
 */
export function StatusSetter({ onUpdated }: StatusSetterProps) {
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [userStatusText, setUserStatusText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth-token');
      await updateMyPresence(token, {
        userStatus: userStatus ?? undefined,
        userStatusText: userStatusText.trim() || null,
      });
      setUserStatus(null);
      setUserStatusText('');
      onUpdated?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card size="small" title={<span><SmileOutlined style={{ marginRight: 6 }} />My status</span>} style={{ minWidth: 200 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Select
          placeholder="Set status"
          size="small"
          value={userStatus}
          onChange={setUserStatus}
          style={{ width: '100%' }}
          options={[
            { value: 'available', label: USER_STATUS_LABELS.available },
            { value: 'away', label: USER_STATUS_LABELS.away },
            { value: 'busy', label: USER_STATUS_LABELS.busy },
            { value: 'dnd', label: USER_STATUS_LABELS.dnd },
          ]}
        />
        <Input
          size="small"
          placeholder="e.g. In a meeting"
          value={userStatusText}
          onChange={(e) => setUserStatusText(e.target.value)}
          allowClear
        />
        <Button type="primary" size="small" onClick={handleUpdate} loading={loading} disabled={!userStatus && !userStatusText.trim()}>
          Update
        </Button>
      </div>
    </Card>
  );
}
