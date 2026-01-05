import React, { useState, useMemo } from 'react';
import { Card, Select, Space, Typography, Empty, Spin, Tag, Tooltip, Button } from 'antd';
import {
  HomeOutlined,
  BuildOutlined,
  PartitionOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { Bed, BedStructure } from '../../types/ipd';

const { Title, Text } = Typography;

interface BedSelectorProps {
  structure: BedStructure | null;
  selectedBedId: number | null;
  onSelectBed: (bedId: number) => void;
  isLoading?: boolean;
  filterByStatus?: ('available' | 'occupied' | 'cleaning' | 'blocked')[];
  showOnlyAvailable?: boolean;
  excludeBedId?: number | null; // Exclude a specific bed (e.g., current bed in transfer)
}

export const BedSelector: React.FC<BedSelectorProps> = ({
  structure,
  selectedBedId,
  onSelectBed,
  isLoading = false,
  filterByStatus,
  showOnlyAvailable = false,
  excludeBedId = null,
}) => {
  const [selectedFloorId, setSelectedFloorId] = useState<number | null>(null);
  const [selectedWardId, setSelectedWardId] = useState<number | null>(null);

  // Filter beds based on props
  const filteredBeds = useMemo(() => {
    if (!structure) {
      console.log('BedSelector: No structure provided');
      return [];
    }
    
    if (!structure.beds || structure.beds.length === 0) {
      console.log('BedSelector: No beds in structure', structure);
      return [];
    }
    
    console.log('BedSelector: Processing beds', {
      totalBeds: structure.beds.length,
      floors: structure.floors?.length || 0,
      wards: structure.wards?.length || 0,
      rooms: structure.rooms?.length || 0,
    });
    
    let beds = structure.beds;

    // Filter by status
    if (showOnlyAvailable) {
      const beforeFilter = beds.length;
      beds = beds.filter((bed) => bed.status === 'available');
      console.log(`BedSelector: Filtered by available status: ${beforeFilter} -> ${beds.length}`);
    } else if (filterByStatus && filterByStatus.length > 0) {
      beds = beds.filter((bed) => filterByStatus.includes(bed.status));
    }

    // Filter by floor
    if (selectedFloorId) {
      const wardIds = structure.wards
        .filter((w) => w.floorId === selectedFloorId)
        .map((w) => w.id);
      const roomIds = structure.rooms
        .filter((r) => wardIds.includes(r.wardId))
        .map((r) => r.id);
      const beforeFilter = beds.length;
      beds = beds.filter((bed) => roomIds.includes(bed.roomId));
      console.log(`BedSelector: Filtered by floor ${selectedFloorId}: ${beforeFilter} -> ${beds.length}`, { wardIds, roomIds });
    }

    // Filter by ward
    if (selectedWardId) {
      const roomIds = structure.rooms
        .filter((r) => r.wardId === selectedWardId)
        .map((r) => r.id);
      const beforeFilter = beds.length;
      beds = beds.filter((bed) => roomIds.includes(bed.roomId));
      console.log(`BedSelector: Filtered by ward ${selectedWardId}: ${beforeFilter} -> ${beds.length}`, { roomIds });
    }

    // Exclude specific bed (e.g., current bed in transfer)
    if (excludeBedId) {
      const beforeFilter = beds.length;
      beds = beds.filter((bed) => bed.id !== excludeBedId);
      console.log(`BedSelector: Excluded bed ${excludeBedId}: ${beforeFilter} -> ${beds.length}`);
    }

    console.log('BedSelector: Final filtered beds count:', beds.length);
    return beds;
  }, [structure, selectedFloorId, selectedWardId, filterByStatus, showOnlyAvailable, excludeBedId]);

  // Get bed with full hierarchy
  const getBedHierarchy = (bed: Bed) => {
    const room = structure?.rooms.find((r) => r.id === bed.roomId);
    const ward = structure?.wards.find((w) => w.id === room?.wardId);
    const floor = structure?.floors.find((f) => f.id === ward?.floorId);

    return { floor, ward, room, bed };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'success';
      case 'occupied':
        return 'error';
      case 'cleaning':
        return 'warning';
      case 'blocked':
        return 'default';
      case 'maintenance':
        return 'processing';
      default:
        return 'default';
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

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!structure) {
    console.log('BedSelector: Structure is null');
    return <Empty description="Loading bed structure..." />;
  }
  
  if (!structure.beds || structure.beds.length === 0) {
    console.log('BedSelector: No beds in structure', {
      hasStructure: !!structure,
      bedsCount: structure.beds?.length || 0,
      floorsCount: structure.floors?.length || 0,
      wardsCount: structure.wards?.length || 0,
      roomsCount: structure.rooms?.length || 0,
    });
    return <Empty description="No beds configured. Please set up bed structure first." />;
  }

  // Group beds by room
  const bedsByRoom = useMemo(() => {
    const grouped: Record<number, Bed[]> = {};
    filteredBeds.forEach((bed) => {
      if (!grouped[bed.roomId]) {
        grouped[bed.roomId] = [];
      }
      grouped[bed.roomId].push(bed);
    });
    return grouped;
  }, [filteredBeds]);

  // Get unique floors and wards for filters
  const availableFloors = useMemo(() => {
    if (!structure) return [];
    return structure.floors.filter((f) => f.isActive);
  }, [structure]);

  const availableWards = useMemo(() => {
    if (!structure) return [];
    let wards = structure.wards.filter((w) => w.isActive);
    if (selectedFloorId) {
      wards = wards.filter((w) => w.floorId === selectedFloorId);
    }
    return wards;
  }, [structure, selectedFloorId]);

  return (
    <div>
      {/* Filters */}
      <Space direction="vertical" size="middle" style={{ width: '100%', marginBottom: 16 }}>
        {availableFloors.length > 0 && (
          <Select
            placeholder="Filter by Floor"
            allowClear
            value={selectedFloorId}
            onChange={setSelectedFloorId}
            style={{ width: '100%' }}
            options={availableFloors.map((f) => ({
              value: f.id,
              label: `${f.floorName || `Floor ${f.floorNumber}`} (${f.floorNumber >= 0 ? '+' : ''}${f.floorNumber})`,
            }))}
          />
        )}
        <Select
          placeholder="Filter by Ward"
          allowClear
          value={selectedWardId}
          onChange={setSelectedWardId}
          style={{ width: '100%' }}
          options={availableWards.map((w) => ({
            value: w.id,
            label: `${w.name} (${w.type})`,
          }))}
        />
      </Space>

      {/* Bed Grid */}
      {Object.keys(bedsByRoom).length === 0 ? (
        <Empty description="No beds found matching the filters" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.entries(bedsByRoom).map(([roomId, beds]) => {
            const room = structure.rooms.find((r) => r.id === Number(roomId));
            const ward = structure.wards.find((w) => w.id === room?.wardId);
            const floor = structure.floors.find((f) => f.id === ward?.floorId);

            return (
              <Card
                key={roomId}
                size="small"
                title={
                  <Space>
                    {floor && <HomeOutlined />}
                    {ward && <BuildOutlined />}
                    <PartitionOutlined />
                    <Text strong>
                      {room?.roomName || `Room ${room?.roomNumber}`}
                    </Text>
                    {floor && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {floor.floorName || `Floor ${floor.floorNumber}`}
                      </Text>
                    )}
                    {ward && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {ward.name}
                      </Text>
                    )}
                  </Space>
                }
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                    gap: 12,
                  }}
                >
                  {beds.map((bed) => {
                    const isSelected = selectedBedId === bed.id;
                    const hierarchy = getBedHierarchy(bed);

                    return (
                      <Tooltip
                        key={bed.id}
                        title={
                          <div>
                            <div>
                              <strong>{bed.bedName || `Bed ${bed.bedNumber}`}</strong>
                            </div>
                            <div>Status: {getStatusLabel(bed.status)}</div>
                            {bed.bedType && <div>Type: {bed.bedType}</div>}
                            {hierarchy.ward && <div>Ward: {hierarchy.ward.name}</div>}
                            {bed.notes && <div>Notes: {bed.notes}</div>}
                          </div>
                        }
                      >
                        <Card
                          hoverable
                          size="small"
                          style={{
                            cursor: bed.status === 'available' ? 'pointer' : 'not-allowed',
                            border: isSelected
                              ? '2px solid #1890ff'
                              : bed.status === 'available'
                              ? '1px solid #d9d9d9'
                              : '1px solid #ffccc7',
                            background:
                              bed.status === 'available'
                                ? isSelected
                                  ? '#e6f7ff'
                                  : '#f6ffed'
                                : bed.status === 'occupied'
                                ? '#fff1f0'
                                : '#fffbe6',
                            opacity: bed.status === 'available' ? 1 : 0.7,
                          }}
                          onClick={() => {
                            if (bed.status === 'available') {
                              onSelectBed(bed.id);
                            }
                          }}
                        >
                          <Space direction="vertical" size="small" style={{ width: '100%', textAlign: 'center' }}>
                            <AppstoreOutlined
                              style={{
                                fontSize: 24,
                                color:
                                  bed.status === 'available'
                                    ? '#52c41a'
                                    : bed.status === 'occupied'
                                    ? '#ff4d4f'
                                    : '#faad14',
                              }}
                            />
                            <Text strong style={{ fontSize: 12, display: 'block' }}>
                              {bed.bedName || `Bed ${bed.bedNumber}`}
                            </Text>
                            <Tag color={getStatusColor(bed.status)} style={{ margin: 0 }}>
                              {getStatusLabel(bed.status)}
                            </Tag>
                            {isSelected && (
                              <CheckCircleOutlined style={{ color: '#1890ff', fontSize: 16 }} />
                            )}
                          </Space>
                        </Card>
                      </Tooltip>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

