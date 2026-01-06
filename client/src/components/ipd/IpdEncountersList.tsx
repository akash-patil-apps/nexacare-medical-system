import React from 'react';
import { Table, Tag, Button, Space, Typography, Empty, Spin } from 'antd';
import { UserOutlined, SwapOutlined, CheckCircleOutlined, TeamOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import type { IpdEncounter } from '../../types/ipd';

const { Text } = Typography;

interface IpdEncountersListProps {
  hospitalId?: number;
  doctorId?: number; // Filter by attending doctor
  onTransfer?: (encounter: IpdEncounter) => void;
  onTransferDoctor?: (encounter: IpdEncounter) => void; // Transfer to another doctor
  onDischarge?: (encounter: IpdEncounter) => void;
  onViewPatient?: (encounter: IpdEncounter) => void; // View patient details with clinical docs
  showDoctorInfo?: boolean; // Show doctor information in table
}

export const IpdEncountersList: React.FC<IpdEncountersListProps> = ({
  hospitalId,
  doctorId,
  onTransfer,
  onTransferDoctor,
  onDischarge,
  onViewPatient,
  showDoctorInfo = false,
}) => {
  // Fetch IPD encounters
  const { data: encountersRaw = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/ipd/encounters', hospitalId, doctorId],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      let url = '/api/ipd/encounters?';
      const params = new URLSearchParams();
      if (hospitalId) params.append('hospitalId', String(hospitalId));
      if (doctorId) {
        params.append('doctorId', String(doctorId));
        console.log('🔍 Fetching IPD encounters for doctorId:', doctorId, 'type:', typeof doctorId);
      }
      url += params.toString();
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to fetch encounters:', response.status, errorText);
        throw new Error('Failed to fetch encounters');
      }
      const data = await response.json();
      console.log('📋 Fetched encounters:', data.length, 'total');
      console.log('🔍 Filter params:', { hospitalId, doctorId });
      if (data.length > 0) {
        console.log('📋 First encounter:', {
          id: data[0].id,
          patientId: data[0].patientId,
          admittingDoctorId: data[0].admittingDoctorId,
          attendingDoctorId: data[0].attendingDoctorId,
          status: data[0].status,
          patient: data[0].patient?.user?.fullName || 'Unknown',
        });
      } else {
        console.log('⚠️ No encounters found. Checking if doctorId filter is correct:', doctorId);
      }
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
  
  console.log('📋 IpdEncountersList - Total encounters:', encounters.length);
  console.log('📋 IpdEncountersList - Active encounters:', activeEncounters.length);
  console.log('📋 IpdEncountersList - Encounter statuses:', encounters.map(e => ({ id: e.id, status: e.status, patient: e.patient?.user?.fullName })));
  if (doctorId) {
    console.log('📋 IpdEncountersList - Doctor ID filter:', doctorId);
    console.log('📋 IpdEncountersList - Doctor IDs in encounters:', encounters.map(e => ({
      id: e.id,
      admittingDoctorId: e.admittingDoctorId,
      attendingDoctorId: e.attendingDoctorId,
      patient: e.patient?.user?.fullName
    })));
  }

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
      title: 'Attending Doctor',
      key: 'attendingDoctor',
      render: (_: any, record: IpdEncounter) => (
        <Space>
          <TeamOutlined />
          <Text>
            {record.attendingDoctor?.fullName || record.admittingDoctor?.fullName || 'N/A'}
          </Text>
        </Space>
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
          {onViewPatient && (
            <Button
              size="small"
              type="primary"
              icon={<UserOutlined />}
              onClick={() => onViewPatient(record)}
            >
              View Patient
            </Button>
          )}
          {onTransferDoctor && (record.status === 'admitted' || record.status === 'transferred') && (
            <Button
              size="small"
              icon={<TeamOutlined />}
              onClick={() => onTransferDoctor(record)}
            >
              Transfer Doctor
            </Button>
          )}
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



