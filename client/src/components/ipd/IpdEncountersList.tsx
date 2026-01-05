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
  const { data: encountersRaw = [], isLoading } = useQuery<any[]>({
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
      const data = await response.json();
      console.log('Fetched encounters:', data);
      console.log('First encounter patient data:', data[0]?.patient);
      console.log('First encounter patient user:', data[0]?.patient?.user);
      return data;
    },
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  // Flatten encounters if they come in nested structure
  const encounters: IpdEncounter[] = encountersRaw.map((enc: any) => {
    // If already flattened, return as is
    if (enc.id && !enc.encounter) {
      return enc;
    }
    // If nested, flatten it
    if (enc.encounter) {
      return {
        ...enc.encounter,
        patient: enc.patient,
        hospital: enc.hospital,
        admittingDoctor: enc.admittingDoctor,
        attendingDoctor: enc.attendingDoctor,
        currentBed: enc.currentBed,
        currentBedId: enc.currentBedId,
      };
    }
    return enc;
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
      render: (_: any, record: IpdEncounter) => {
        // Handle both nested and flattened patient structures
        console.log('Rendering patient for encounter:', record.id, 'Patient data:', record.patient);
        const patientName = record.patient?.user?.fullName 
          || (record.patient as any)?.fullName 
          || (record.patient as any)?.user?.fullName
          || 'Unknown';
        return (
          <Space>
            <UserOutlined />
            <Text strong>{patientName}</Text>
          </Space>
        );
      },
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



