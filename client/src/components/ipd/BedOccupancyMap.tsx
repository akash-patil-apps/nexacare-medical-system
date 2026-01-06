import React, { useMemo } from 'react';
import { Card, Row, Col, Statistic, Tag, Space, Typography, Empty, Spin, Tooltip } from 'antd';
import {
  HomeOutlined,
  BuildOutlined,
  PartitionOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import type { BedStructure, Bed, IpdEncounter } from '../../types/ipd';

const { Title, Text } = Typography;

interface BedOccupancyMapProps {
  hospitalId?: number;
  onBedClick?: (bed: Bed) => void;
  showStats?: boolean;
}

export const BedOccupancyMap: React.FC<BedOccupancyMapProps> = ({
  hospitalId,
  onBedClick,
  showStats = true,
}) => {
  // Fetch bed structure
  const { data: structure, isLoading: structureLoading } = useQuery<BedStructure>({
    queryKey: ['/api/ipd/structure'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/ipd/structure', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch bed structure');
      return response.json();
    },
  });

  // Fetch active encounters
  const { data: encounters = [], isLoading: encountersLoading } = useQuery<IpdEncounter[]>({
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
  });

  // Calculate statistics
  const stats = useMemo(() => {
    if (!structure) return null;

    const beds = structure.beds;
    const total = beds.length;
    
    // Log bed statuses for debugging
    console.log('🛏️ BedOccupancyMap - Bed statuses:', beds.map((b: any) => ({
      id: b.id,
      bedNumber: b.bedNumber,
      status: b.status,
    })));
    
    const available = beds.filter((b) => b.status === 'available').length;
    const occupied = beds.filter((b) => b.status === 'occupied').length;
    const cleaning = beds.filter((b) => b.status === 'cleaning').length;
    const blocked = beds.filter((b) => b.status === 'blocked').length;
    const occupancyRate = total > 0 ? ((occupied / total) * 100).toFixed(1) : '0';

    console.log('🛏️ BedOccupancyMap - Stats calculated:', {
      total,
      available,
      occupied,
      cleaning,
      blocked,
      occupancyRate,
    });

    return {
      total,
      available,
      occupied,
      cleaning,
      blocked,
      occupancyRate,
    };
  }, [structure]);

  // Get bed with patient info (defined before useMemo that uses it)
  const getBedWithPatient = (bed: Bed) => {
    const encounter = encounters.find((e: any) => e.currentBedId === bed.id);
    return {
      bed,
      encounter,
      patient: encounter?.patient,
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return '#52c41a';
      case 'occupied':
        return '#ff4d4f';
      case 'cleaning':
        return '#faad14';
      case 'blocked':
        return '#8c8c8c';
      case 'maintenance':
        return '#1890ff';
      default:
        return '#d9d9d9';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'occupied':
        return 'Occupied';
      case 'cleaning':
        return 'Cleaning';
      case 'blocked':
        return 'Blocked';
      case 'maintenance':
        return 'Maintenance';
      default:
        return status;
    }
  };

  // Group beds by floor -> ward -> room (MUST be before early returns to follow hooks rules)
  const organizedBeds = useMemo(() => {
    if (!structure || structure.beds.length === 0) {
      return {};
    }
    const organized: Record<
      number,
      Record<
        number,
        {
          room: any;
          beds: Array<{ bed: Bed; encounter?: IpdEncounter; patient?: any }>;
        }[]
      >
    > = {};

    structure.beds.forEach((bed) => {
      const room = structure.rooms.find((r) => r.id === bed.roomId);
      if (!room) return;

      const ward = structure.wards.find((w) => w.id === room.wardId);
      if (!ward) return;

      const floorId = ward.floorId || 0; // Use 0 for no floor

      if (!organized[floorId]) {
        organized[floorId] = {};
      }
      if (!organized[floorId][ward.id]) {
        organized[floorId][ward.id] = [];
      }

      const roomGroup = organized[floorId][ward.id].find((g: any) => g.room.id === room.id);
      const bedWithPatient = getBedWithPatient(bed);

      if (roomGroup) {
        roomGroup.beds.push(bedWithPatient);
      } else {
        organized[floorId][ward.id].push({
          room,
          beds: [bedWithPatient],
        });
      }
    });

    return organized;
  }, [structure, encounters]);

  if (structureLoading || encountersLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!structure || structure.beds.length === 0) {
    return <Empty description="No beds configured" />;
  }

  return (
    <div>
      {/* Statistics */}
      {showStats && stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Total Beds"
                value={stats.total}
                prefix={<AppstoreOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Available"
                value={stats.available}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Occupied"
                value={stats.occupied}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<CloseCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Occupancy Rate"
                value={stats.occupancyRate}
                suffix="%"
                valueStyle={{ color: stats.occupancyRate > 80 ? '#ff4d4f' : '#1890ff' }}
                prefix={<WarningOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Bed Map */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxHeight: '70vh', overflowY: 'auto', paddingRight: 8 }}>
        {Object.entries(organizedBeds).map(([floorId, wards]) => {
          const floorsList = structure.floors || [];
          const floor = floorsList.find((f: any) => f.id === Number(floorId));
          return (
            <div key={floorId}>
              {floor && (
                <Title level={4} style={{ marginBottom: 16 }}>
                  <HomeOutlined /> {floor.floorName || `Floor ${floor.floorNumber}`}
                </Title>
              )}
              {Object.entries(wards).map(([wardId, rooms]) => {
                const wardsList = structure.wards?.map((item: any) => item.ward || item) || [];
                const ward = wardsList.find((w: any) => w.id === Number(wardId));
                return (
                  <Card
                    key={wardId}
                    title={
                      <Space>
                        <BuildOutlined />
                        <Text strong>{ward?.name || 'Unknown Ward'}</Text>
                        <Tag>{ward?.type || ''}</Tag>
                      </Space>
                    }
                    style={{ marginBottom: 16 }}
                  >
                    {rooms.map(({ room, beds }) => (
                      <Card
                        key={room.id}
                        size="small"
                        title={
                          <Space>
                            <PartitionOutlined />
                            <Text>{room.roomName || `Room ${room.roomNumber}`}</Text>
                            <Tag color={room.category === 'private' ? 'gold' : 'default'}>
                              {room.category}
                            </Tag>
                          </Space>
                        }
                        style={{ marginBottom: 12 }}
                      >
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                            gap: 8,
                          }}
                        >
                          {beds.map(({ bed, encounter, patient }) => (
                            <Tooltip
                              key={bed.id}
                              title={
                                <div>
                                  <div>
                                    <strong>{bed.bedName || `Bed ${bed.bedNumber}`}</strong>
                                  </div>
                                  <div>Status: {getStatusLabel(bed.status)}</div>
                                  {patient && (
                                    <>
                                      <div>Patient: {patient.user?.fullName || 'Unknown'}</div>
                                      <div>
                                        Admitted: {new Date(encounter?.admittedAt || '').toLocaleDateString()}
                                      </div>
                                    </>
                                  )}
                                  {bed.bedType && <div>Type: {bed.bedType}</div>}
                                </div>
                              }
                            >
                              <div
                                style={{
                                  padding: 12,
                                  border: `2px solid ${getStatusColor(bed.status)}`,
                                  borderRadius: 8,
                                  background:
                                    bed.status === 'available'
                                      ? '#f6ffed'
                                      : bed.status === 'occupied'
                                      ? '#fff1f0'
                                      : '#fffbe6',
                                  cursor: onBedClick ? 'pointer' : 'default',
                                  textAlign: 'center',
                                }}
                                onClick={() => onBedClick?.(bed)}
                              >
                                <AppstoreOutlined
                                  style={{
                                    fontSize: 24,
                                    color: getStatusColor(bed.status),
                                    marginBottom: 8,
                                  }}
                                />
                                <div style={{ fontSize: 12, fontWeight: 'bold' }}>
                                  {bed.bedName || `Bed ${bed.bedNumber}`}
                                </div>
                                <Tag
                                  color={
                                    bed.status === 'available'
                                      ? 'success'
                                      : bed.status === 'occupied'
                                      ? 'error'
                                      : 'warning'
                                  }
                                  style={{ marginTop: 4, fontSize: 10 }}
                                >
                                  {getStatusLabel(bed.status)}
                                </Tag>
                                {patient && (
                                  <div style={{ marginTop: 4, fontSize: 10, color: '#666' }}>
                                    {patient.user?.fullName || 'Unknown'}
                                  </div>
                                )}
                              </div>
                            </Tooltip>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </Card>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

