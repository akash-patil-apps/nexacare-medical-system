import React from 'react';
import { Table, Tag, Button, Space, Typography, Empty, Spin, Dropdown } from 'antd';
import { UserOutlined, SwapOutlined, CheckCircleOutlined, TeamOutlined, UsergroupAddOutlined, HeartOutlined, FileTextOutlined, MedicineBoxOutlined, CheckOutlined, MoreOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getAuthToken } from '../../lib/auth';
import type { IpdEncounter } from '../../types/ipd';

const { Text } = Typography;

interface IpdEncountersListProps {
  encounters?: IpdEncounter[]; // Optional: pre-fetched encounters (if provided, won't fetch internally)
  loading?: boolean; // Loading state when using pre-fetched encounters
  hospitalId?: number;
  doctorId?: number; // Filter by attending doctor
  onTransfer?: (encounter: IpdEncounter) => void;
  onTransferDoctor?: (encounter: IpdEncounter) => void; // Transfer to another doctor
  onDischarge?: (encounter: IpdEncounter) => void;
  onViewPatient?: (encounter: IpdEncounter) => void; // View patient details with clinical docs
  onAssignNurse?: (encounter: IpdEncounter) => void; // Assign nurse to patient
  // Nurse-specific actions
  onRecordVitals?: (encounterId: number, patientId: number, patientName: string) => void;
  onAddNote?: (encounter: IpdEncounter) => void;
  onViewMedications?: (encounter: IpdEncounter) => void;
  onAdministerMedication?: (encounter: IpdEncounter) => void;
  showDoctorInfo?: boolean; // Show doctor information in table
  isNurseView?: boolean; // If true, shows nurse action buttons
}

export const IpdEncountersList: React.FC<IpdEncountersListProps> = ({
  encounters: providedEncounters,
  loading: providedLoading,
  hospitalId,
  doctorId,
  onTransfer,
  onTransferDoctor,
  onDischarge,
  onViewPatient,
  onAssignNurse,
  onRecordVitals,
  onAddNote,
  onViewMedications,
  onAdministerMedication,
  showDoctorInfo = false,
  isNurseView = false,
}) => {
  // Fetch IPD encounters only if not provided as prop
  const { data: encountersRaw = [], isLoading: isFetching } = useQuery<any[]>({
    queryKey: ['/api/ipd/encounters', hospitalId, doctorId],
    queryFn: async () => {
      const token = getAuthToken();
      let url = '/api/ipd/encounters?';
      const params = new URLSearchParams();
      if (hospitalId) params.append('hospitalId', String(hospitalId));
      if (doctorId) {
        params.append('doctorId', String(doctorId));
      }
      // Add nurse=true if this is a nurse view
      if (isNurseView) {
        params.append('nurse', 'true');
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
      return data;
    },
    enabled: !providedEncounters, // Only fetch if encounters not provided
    refetchInterval: providedEncounters ? false : 10000, // Auto-refresh only if fetching
  });

  // Use provided encounters or fetched encounters
  const encountersToProcess = providedEncounters || encountersRaw;
  const isLoading = providedLoading !== undefined ? providedLoading : isFetching;

  // Flatten encounters if they come in nested structure
  const encounters: IpdEncounter[] = encountersToProcess.map((enc: any) => {
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
      width: 180,
      render: (_: any, record: IpdEncounter) => {
        const patientName = record.patient?.user?.fullName 
          || (record.patient as any)?.fullName 
          || (record.patient as any)?.user?.fullName
          || 'Unknown';
        return (
          <Space size="small">
            <UserOutlined style={{ color: '#1890ff' }} />
            <Text strong style={{ fontSize: '13px' }}>{patientName}</Text>
          </Space>
        );
      },
    },
    {
      title: 'Admission Type',
      dataIndex: 'admissionType',
      key: 'admissionType',
      width: 120,
      render: (type: string) => <Tag style={{ margin: 0 }}>{type || 'N/A'}</Tag>,
    },
    {
      title: 'Current Bed',
      dataIndex: 'currentBed',
      key: 'currentBed',
      width: 100,
      render: (_: any, record: IpdEncounter) =>
        record.currentBed ? (
          <Text style={{ fontSize: '13px' }}>
            {record.currentBed.bedName || `Bed ${record.currentBed.bedNumber}`}
          </Text>
        ) : (
          <Text type="secondary" style={{ fontSize: '13px' }}>N/A</Text>
        ),
    },
    {
      title: 'Attending Doctor',
      key: 'attendingDoctor',
      width: 180,
      render: (_: any, record: IpdEncounter) => {
        const doctorName = record.attendingDoctor?.fullName || record.admittingDoctor?.fullName || 'N/A';
        return (
          <Space size="small">
            <TeamOutlined style={{ color: '#52c41a' }} />
            <Text style={{ fontSize: '13px' }}>{doctorName}</Text>
          </Space>
        );
      },
    },
    {
      title: 'Admitted',
      dataIndex: 'admittedAt',
      key: 'admittedAt',
      width: 110,
      render: (date: string) => (
        <Text style={{ fontSize: '13px' }}>
          {date ? new Date(date).toLocaleDateString('en-GB') : 'N/A'}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: string) => (
        <Tag color={getStatusColor(status)} style={{ margin: 0 }}>
          {status?.toUpperCase() || 'N/A'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: IpdEncounter) => {
        const menuItems: MenuProps['items'] = [];
        
        // View Patient (always available)
        if (onViewPatient) {
          menuItems.push({
            key: 'view',
            label: 'View Patient',
            icon: <UserOutlined />,
            onClick: () => onViewPatient(record),
          });
        }

        // Nurse-specific actions
        if (isNurseView && (record.status === 'admitted' || record.status === 'transferred')) {
          if (onRecordVitals) {
            menuItems.push({
              key: 'vitals',
              label: 'Record Vitals',
              icon: <HeartOutlined />,
              onClick: () => {
                const patientName = record.patient?.user?.fullName 
                  || (record.patient as any)?.fullName 
                  || (record.patient as any)?.user?.fullName
                  || 'Unknown';
                onRecordVitals(record.id, record.patientId, patientName);
              },
            });
          }
          if (onAddNote) {
            menuItems.push({
              key: 'note',
              label: 'Add Note',
              icon: <FileTextOutlined />,
              onClick: () => onAddNote(record),
            });
          }
          if (onViewMedications) {
            menuItems.push({
              key: 'medications',
              label: 'View Medications',
              icon: <MedicineBoxOutlined />,
              onClick: () => onViewMedications(record),
            });
          }
          if (onAdministerMedication) {
            menuItems.push({
              key: 'administer',
              label: 'Give Medication',
              icon: <CheckOutlined />,
              onClick: () => onAdministerMedication(record),
            });
          }
        }

        // Doctor/Admin actions
        if (!isNurseView) {
          if (onAssignNurse && (record.status === 'admitted' || record.status === 'transferred')) {
            menuItems.push({
              key: 'assign-nurse',
              label: 'Assign Nurse',
              icon: <UsergroupAddOutlined />,
              onClick: () => onAssignNurse(record),
            });
          }
          if (onTransferDoctor && (record.status === 'admitted' || record.status === 'transferred')) {
            menuItems.push({
              key: 'transfer-doctor',
              label: 'Transfer Doctor',
              icon: <TeamOutlined />,
              onClick: () => onTransferDoctor(record),
            });
          }
          if (onTransfer && (record.status === 'admitted' || record.status === 'transferred')) {
            menuItems.push({
              key: 'transfer',
              label: 'Transfer Bed',
              icon: <SwapOutlined />,
              onClick: () => onTransfer(record),
            });
          }
          if (onDischarge && (record.status === 'admitted' || record.status === 'transferred')) {
            menuItems.push({
              key: 'discharge',
              label: 'Discharge',
              icon: <CheckCircleOutlined />,
              danger: true,
              onClick: () => onDischarge(record),
            });
          }
        }

        if (menuItems.length === 0) {
          return null;
        }

        return (
          <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
            <Button size="small" icon={<MoreOutlined />}>
              Actions
            </Button>
          </Dropdown>
        );
      },
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
      pagination={{ 
        pageSize: 10,
        showSizeChanger: false,
        showTotal: (total) => `Total ${total} patients`,
        size: 'small'
      }}
      size="small"
      scroll={{ x: 'max-content' }}
      style={{ fontSize: '13px' }}
    />
  );
};



