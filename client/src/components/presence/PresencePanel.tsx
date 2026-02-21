import React, { useState } from 'react';
import { Card, List, Typography, Select, Input, Button } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import { PresenceDot } from './PresenceDot';
import type { PresenceEntry, UserStatus } from '../../lib/presence';

const { Text } = Typography;

const ROLE_LABELS: Record<string, string> = {
  doctor: 'Doctor',
  hospital: 'Hospital Admin',
  admin: 'Admin',
  receptionist: 'Receptionist',
  nurse: 'Nurse',
  lab: 'Lab',
  pharmacist: 'Pharmacist',
  radiology_technician: 'Radiology',
};

const USER_STATUS_LABELS: Record<UserStatus, string> = {
  available: 'Available',
  away: 'Away',
  busy: 'Busy',
  dnd: 'Do not disturb',
};

interface PresencePanelProps {
  presence: PresenceEntry[];
  loading?: boolean;
  title?: string;
  /** Current user id (staff) - show "Set my status" when set */
  currentUserId?: number | null;
  onUpdateMyStatus?: (payload: { userStatus?: UserStatus; userStatusText?: string | null }) => Promise<void>;
}

/**
 * Slack-style "Who's online" panel for hospital admin: staff only, with status/away.
 */
export function PresencePanel({
  presence,
  loading,
  title = "Who's online",
  currentUserId,
  onUpdateMyStatus,
}: PresencePanelProps) {
  const [statusSelect, setStatusSelect] = useState<UserStatus | null>(null);
  const [statusText, setStatusText] = useState<string>('');
  const [updating, setUpdating] = useState(false);

  const handleSetStatus = async () => {
    if (!onUpdateMyStatus) return;
    setUpdating(true);
    try {
      await onUpdateMyStatus({
        userStatus: statusSelect ?? undefined,
        userStatusText: statusText.trim() || null,
      });
      setStatusSelect(null);
      setStatusText('');
    } finally {
      setUpdating(false);
    }
  }

  return (
    <Card
      title={
        <span>
          <TeamOutlined style={{ marginRight: 8 }} />
          {title}
        </span>
      }
      size="small"
      loading={loading}
      style={{ minWidth: 260 }}
    >
      {currentUserId != null && onUpdateMyStatus && (
        <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }}>
          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Set my status</Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Select
              placeholder="Status"
              size="small"
              value={statusSelect}
              onChange={setStatusSelect}
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
              placeholder="e.g. In a meeting, Back in 10 min"
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              allowClear
            />
            <Button type="primary" size="small" onClick={handleSetStatus} loading={updating} disabled={!statusSelect && !statusText.trim()}>
              Update status
            </Button>
          </div>
        </div>
      )}

      {presence.length === 0 ? (
        <Text type="secondary">No staff online right now.</Text>
      ) : (
        <List
          size="small"
          dataSource={presence}
          renderItem={(entry) => (
            <List.Item style={{ padding: '6px 0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, width: '100%' }}>
                <PresenceDot status="online" size={8} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text strong style={{ fontSize: 13 }}>{entry.fullName ?? `User #${entry.userId}`}</Text>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    {ROLE_LABELS[entry.role?.toLowerCase()] ?? entry.role}
                    {entry.userStatus && entry.userStatus !== 'available' && (
                      <> · <span style={{ color: '#f59e0b' }}>{USER_STATUS_LABELS[entry.userStatus as UserStatus] ?? entry.userStatus}</span></>
                    )}
                    {entry.userStatusText && (
                      <div style={{ marginTop: 2, fontStyle: 'italic' }}>{entry.userStatusText}</div>
                    )}
                  </div>
                </div>
              </div>
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}
