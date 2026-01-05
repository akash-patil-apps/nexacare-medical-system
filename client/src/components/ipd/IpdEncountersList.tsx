import React from 'react';
import { Table, Tag, Button, Space, Typography, Empty, Spin } from 'antd';
import { UserOutlined, SwapOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import type { IpdEncounter } from '../../types/ipd';

const { Text } = Typography;

interface IpdEncountersListProps {
  hospitalId?: number;
  onTransfer?: (encounter: IpdEncounter) => void;
  onDischarge?: (encounter: IpdEncounter) => void;
}

export const IpdEncountersList: React.FC<IpdEncountersListProps> = ({
  hospitalId,
  onTransfer,
  onDischarge,
}) => {
  // Fetch IPD encounters
  const { data: encounters = [], isLoading } = useQuery<IpdEncounter[]>({
    queryKey: ['/api/ipd/encounters', hospitalId],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const url = hospitalId
        ? `/api/ipd/encounters?hospitalId=${hospitalId}`
        : '/api/ipd/encounters';
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch encounters');
      return response.json();
    },
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  // Filter active encounters (not discharged)
  const activeEncounters = encounters.filter(
    (e) => e.status === 'admitted' || e.status === 'transferred',
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'admitted':
        return 'processing';
      case 'transferred':
        return 'warning';
      case 'discharged':
        return 'success';
      case 'LAMA':
        return 'error';
      case 'absconded':
        return 'default';
      case 'death':
        return 'error';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      title: 'Patient',
      dataIndex: 'patient',
      key: 'patient',
      render: (_: any, record: IpdEncounter) => (
        <Space>
          <UserOutlined />
          <Text strong>{record.patient?.user?.fullName || 'Unknown'}</Text>
        </Space>
      ),
    },
    {
      title: 'Admission Type',
      dataIndex: 'admissionType',
      key: 'admissionType',
      render: (type: string) => <Tag>{type}</Tag>,
    },
    {
      title: 'Current Bed',
      dataIndex: 'currentBed',
      key: 'currentBed',
      render: (_: any, record: IpdEncounter) =>
        record.currentBed ? (
          <Text>
            {record.currentBed.bedName || `Bed ${record.currentBed.bedNumber}`}
          </Text>
        ) : (
          <Text type="secondary">N/A</Text>
        ),
    },
    {
      title: 'Admitted',
      dataIndex: 'admittedAt',
      key: 'admittedAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: IpdEncounter) => (
        <Space>
          {onTransfer && (record.status === 'admitted' || record.status === 'transferred') && (
            <Button
              size="small"
              icon={<SwapOutlined />}
              onClick={() => onTransfer(record)}
            >
              Transfer
            </Button>
          )}
          {onDischarge && (record.status === 'admitted' || record.status === 'transferred') && (
            <Button
              size="small"
              type="primary"
              danger
              icon={<CheckCircleOutlined />}
              onClick={() => onDischarge(record)}
            >
              Discharge
            </Button>
          )}
        </Space>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (activeEncounters.length === 0) {
    return <Empty description="No active IPD encounters" />;
  }

  return (
    <Table
      columns={columns}
      dataSource={activeEncounters}
      rowKey="id"
      pagination={{ pageSize: 10 }}
    />
  );
};



