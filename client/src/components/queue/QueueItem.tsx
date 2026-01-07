import React from 'react';
import { Card, Tag, Space, Button, Typography, Tooltip } from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  MessageOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { OpdQueueEntry } from '../../../types/queue';

const { Text } = Typography;

interface QueueItemProps {
  queueEntry: OpdQueueEntry;
  onCall?: (id: number) => void;
  onStart?: (id: number) => void;
  onComplete?: (id: number) => void;
  onNoShow?: (id: number) => void;
  onSkip?: (id: number) => void;
  onMoveUp?: (id: number) => void;
  onMoveDown?: (id: number) => void;
  showActions?: boolean;
  isReceptionist?: boolean;
  isDoctor?: boolean;
}

export const QueueItem: React.FC<QueueItemProps> = ({
  queueEntry,
  onCall,
  onStart,
  onComplete,
  onNoShow,
  onSkip,
  onMoveUp,
  onMoveDown,
  showActions = true,
  isReceptionist = false,
  isDoctor = false,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'default';
      case 'called':
        return 'processing';
      case 'in_consultation':
        return 'warning';
      case 'completed':
        return 'success';
      case 'no_show':
        return 'error';
      case 'skipped':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'Waiting';
      case 'called':
        return 'Called';
      case 'in_consultation':
        return 'In Consultation';
      case 'completed':
        return 'Completed';
      case 'no_show':
        return 'No Show';
      case 'skipped':
        return 'Skipped';
      default:
        return status;
    }
  };

  const patientName = queueEntry.patient?.user?.fullName || 'Unknown Patient';
  const patientAge = queueEntry.patient?.dateOfBirth
    ? new Date().getFullYear() - new Date(queueEntry.patient.dateOfBirth).getFullYear()
    : null;

  return (
    <Card
      size="small"
      style={{
        marginBottom: 8,
        borderLeft: `4px solid ${
          queueEntry.status === 'in_consultation'
            ? '#faad14'
            : queueEntry.status === 'called'
            ? '#1890ff'
            : queueEntry.status === 'completed'
            ? '#52c41a'
            : '#d9d9d9'
        }`,
      }}
    >
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Text strong style={{ fontSize: 18 }}>
              #{queueEntry.tokenNumber}
            </Text>
            <Tag color={getStatusColor(queueEntry.status)}>{getStatusLabel(queueEntry.status)}</Tag>
          </Space>
          {showActions && isReceptionist && queueEntry.status === 'waiting' && (
            <Space>
              {onMoveUp && (
                <Tooltip title="Move Up">
                  <Button
                    type="text"
                    size="small"
                    icon={<ArrowUpOutlined />}
                    onClick={() => onMoveUp(queueEntry.id)}
                  />
                </Tooltip>
              )}
              {onMoveDown && (
                <Tooltip title="Move Down">
                  <Button
                    type="text"
                    size="small"
                    icon={<ArrowDownOutlined />}
                    onClick={() => onMoveDown(queueEntry.id)}
                  />
                </Tooltip>
              )}
              {onCall && (
                <Button
                  type="primary"
                  size="small"
                  onClick={() => onCall(queueEntry.id)}
                >
                  Call
                </Button>
              )}
            </Space>
          )}
          {showActions && isDoctor && queueEntry.status === 'called' && (
            <Button
              type="primary"
              size="small"
              onClick={() => onStart?.(queueEntry.id)}
            >
              Start Consultation
            </Button>
          )}
          {showActions && isDoctor && queueEntry.status === 'in_consultation' && (
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => onComplete?.(queueEntry.id)}
            >
              Complete
            </Button>
          )}
        </div>

        <div>
          <Space>
            <UserOutlined />
            <Text strong>{patientName}</Text>
            {patientAge && <Text type="secondary">({patientAge} years)</Text>}
          </Space>
        </div>

        {queueEntry.appointment && (
          <div>
            <Text type="secondary">
              {queueEntry.appointment.reason || 'No reason provided'}
            </Text>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            {queueEntry.patient?.user?.mobileNumber && (
              <>
                <Tooltip title="Call">
                  <Button
                    type="link"
                    size="small"
                    icon={<PhoneOutlined />}
                    href={`tel:${queueEntry.patient.user.mobileNumber}`}
                  />
                </Tooltip>
                <Tooltip title="SMS">
                  <Button
                    type="link"
                    size="small"
                    icon={<MessageOutlined />}
                    href={`sms:${queueEntry.patient.user.mobileNumber}`}
                  />
                </Tooltip>
              </>
            )}
          </Space>
          {showActions && isReceptionist && (
            <Space>
              {queueEntry.status !== 'no_show' && onNoShow && (
                <Button
                  type="link"
                  danger
                  size="small"
                  icon={<CloseCircleOutlined />}
                  onClick={() => onNoShow(queueEntry.id)}
                >
                  No Show
                </Button>
              )}
              {queueEntry.status === 'called' && onSkip && (
                <Button
                  type="link"
                  size="small"
                  onClick={() => onSkip(queueEntry.id)}
                >
                  Skip
                </Button>
              )}
            </Space>
          )}
        </div>

        {queueEntry.checkedInAt && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            Checked in: {new Date(queueEntry.checkedInAt).toLocaleTimeString()}
          </Text>
        )}
      </Space>
    </Card>
  );
};





