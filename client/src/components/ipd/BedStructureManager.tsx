import React, { useState } from 'react';
import {
  Card,
  Button,
  Form,
  Input,
  Select,
  InputNumber,
  Space,
  Table,
  Tag,
  Popconfirm,
  message,
  Modal,
  Typography,
  Divider,
  Tabs,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HomeOutlined,
  BuildOutlined,
  PartitionOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Floor, Ward, Room, Bed } from '../../types/ipd';

const { TextArea } = Input;
const { Title, Text } = Typography;

export const BedStructureManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [floorForm] = Form.useForm();
  const [wardForm] = Form.useForm();
  const [roomForm] = Form.useForm();
  const [bedForm] = Form.useForm();
  const [isFloorModalOpen, setIsFloorModalOpen] = useState(false);
  const [isWardModalOpen, setIsWardModalOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isBedModalOpen, setIsBedModalOpen] = useState(false);
  const [editingFloor, setEditingFloor] = useState<Floor | null>(null);
  const [editingWard, setEditingWard] = useState<Ward | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editingBed, setEditingBed] = useState<Bed | null>(null);
  const [selectedWardForRoom, setSelectedWardForRoom] = useState<number | null>(null);
  const [selectedRoomForBed, setSelectedRoomForBed] = useState<number | null>(null);

  // Fetch structure
  const { data: structure, isLoading } = useQuery({
    queryKey: ['/api/ipd/structure'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/ipd/structure', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch structure');
      return response.json();
    },
    refetchInterval: 5000,
  });

  // Note: Hospital ID is not needed for bed structure management
  // The API automatically uses the logged-in hospital admin's hospital

  // Floor operations
  const handleCreateFloor = async (values: any) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/ipd/floors', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      if (!response.ok) throw new Error('Failed to create floor');
      message.success('Floor created successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/ipd/structure'] });
      setIsFloorModalOpen(false);
      floorForm.resetFields();
    } catch (error: any) {
      message.error(error.message || 'Failed to create floor');
    }
  };

  const handleEditFloor = (floor: Floor) => {
    setEditingFloor(floor);
    floorForm.setFieldsValue(floor);
    setIsFloorModalOpen(true);
  };

  const handleUpdateFloor = async (values: any) => {
    if (!editingFloor) return;
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/ipd/floors/${editingFloor.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      if (!response.ok) throw new Error('Failed to update floor');
      message.success('Floor updated successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/ipd/structure'] });
      setIsFloorModalOpen(false);
      setEditingFloor(null);
      floorForm.resetFields();
    } catch (error: any) {
      message.error(error.message || 'Failed to update floor');
    }
  };

  const handleDeleteFloor = async (floorId: number) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/ipd/floors/${floorId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete floor');
      message.success('Floor deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/ipd/structure'] });
    } catch (error: any) {
      message.error(error.message || 'Failed to delete floor');
    }
  };

  // Ward operations
  const handleCreateWard = async (values: any) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/ipd/wards', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      if (!response.ok) throw new Error('Failed to create ward');
      message.success('Ward created successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/ipd/structure'] });
      setIsWardModalOpen(false);
      wardForm.resetFields();
    } catch (error: any) {
      message.error(error.message || 'Failed to create ward');
    }
  };

  const handleEditWard = (ward: Ward) => {
    setEditingWard(ward);
    wardForm.setFieldsValue(ward);
    setIsWardModalOpen(true);
  };

  const handleUpdateWard = async (values: any) => {
    if (!editingWard) return;
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/ipd/wards/${editingWard.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      if (!response.ok) throw new Error('Failed to update ward');
      message.success('Ward updated successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/ipd/structure'] });
      setIsWardModalOpen(false);
      setEditingWard(null);
      wardForm.resetFields();
    } catch (error: any) {
      message.error(error.message || 'Failed to update ward');
    }
  };

  const handleDeleteWard = async (wardId: number) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/ipd/wards/${wardId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete ward');
      message.success('Ward deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/ipd/structure'] });
    } catch (error: any) {
      message.error(error.message || 'Failed to delete ward');
    }
  };

  // Room operations
  const handleCreateRoom = async (values: any) => {
    if (!selectedWardForRoom) {
      message.warning('Please select a ward first');
      return;
    }
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/ipd/rooms', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...values, wardId: selectedWardForRoom }),
      });
      if (!response.ok) throw new Error('Failed to create room');
      message.success('Room created successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/ipd/structure'] });
      setIsRoomModalOpen(false);
      setSelectedWardForRoom(null);
      roomForm.resetFields();
    } catch (error: any) {
      message.error(error.message || 'Failed to create room');
    }
  };

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
    setSelectedWardForRoom(room.wardId);
    roomForm.setFieldsValue(room);
    setIsRoomModalOpen(true);
  };

  const handleUpdateRoom = async (values: any) => {
    if (!editingRoom) return;
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/ipd/rooms/${editingRoom.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...values, wardId: selectedWardForRoom || editingRoom.wardId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update room' }));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to update room`);
      }
      
      const updatedRoom = await response.json();
      message.success('Room updated successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/ipd/structure'] });
      setIsRoomModalOpen(false);
      setEditingRoom(null);
      setSelectedWardForRoom(null);
      roomForm.resetFields();
    } catch (error: any) {
      console.error('Update room error:', error);
      message.error(error.message || 'Failed to update room');
    }
  };

  const handleDeleteRoom = async (roomId: number) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/ipd/rooms/${roomId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete room');
      message.success('Room deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/ipd/structure'] });
    } catch (error: any) {
      message.error(error.message || 'Failed to delete room');
    }
  };

  // Bed operations
  const handleCreateBed = async (values: any) => {
    if (!selectedRoomForBed) {
      message.warning('Please select a room first');
      return;
    }
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/ipd/beds', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...values, roomId: selectedRoomForBed }),
      });
      if (!response.ok) throw new Error('Failed to create bed');
      message.success('Bed created successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/ipd/structure'] });
      setIsBedModalOpen(false);
      setSelectedRoomForBed(null);
      bedForm.resetFields();
    } catch (error: any) {
      message.error(error.message || 'Failed to create bed');
    }
  };

  const handleEditBed = (bed: Bed) => {
    setEditingBed(bed);
    setSelectedRoomForBed(bed.roomId);
    bedForm.setFieldsValue(bed);
    setIsBedModalOpen(true);
  };

  const handleUpdateBed = async (values: any) => {
    if (!editingBed) return;
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/ipd/beds/${editingBed.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...values, roomId: selectedRoomForBed || editingBed.roomId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update bed' }));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to update bed`);
      }
      
      const updatedBed = await response.json();
      message.success('Bed updated successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/ipd/structure'] });
      setIsBedModalOpen(false);
      setEditingBed(null);
      setSelectedRoomForBed(null);
      bedForm.resetFields();
    } catch (error: any) {
      console.error('Update bed error:', error);
      message.error(error.message || 'Failed to update bed');
    }
  };

  const handleDeleteBed = async (bedId: number) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/ipd/beds/${bedId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete bed');
      message.success('Bed deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/ipd/structure'] });
    } catch (error: any) {
      message.error(error.message || 'Failed to delete bed');
    }
  };

  // Extract data structures from API (already flattened by backend)
  const floors = structure?.floors || [];
  const wards = structure?.wards || [];
  const rooms = structure?.rooms || [];
  const beds = structure?.beds || [];
  
  // Debug logging
  if (structure) {
    const bedStatusBreakdown = beds.reduce((acc: any, bed: any) => {
      acc[bed.status] = (acc[bed.status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('📊 BedStructureManager - Structure data:', {
      floorsCount: floors.length,
      wardsCount: wards.length,
      roomsCount: rooms.length,
      bedsCount: beds.length,
      bedStatusBreakdown,
      allBeds: beds.map((b: any) => ({
        id: b.id,
        bedNumber: b.bedNumber,
        status: b.status,
        roomId: b.roomId,
      })),
    });
  }
  
  // Enrich wards with floor information (if not already included)
  const enrichedWards = wards.map((ward: any) => {
    // If ward already has floor object, use it; otherwise find it
    if (ward.floor) {
      return ward;
    }
    const floor = ward.floorId ? floors.find((f: any) => f.id === ward.floorId) : null;
    return {
      ...ward,
      floor: floor || null,
    };
  });
  
  // Enrich rooms with ward information
  const enrichedRooms = rooms.map((room: any) => {
    const ward = enrichedWards.find((w: any) => w.id === room.wardId);
    return {
      ...room,
      ward: ward || null,
    };
  });
  
  // Enrich beds with room, ward, and floor information
  const enrichedBeds = beds.map((bed: any) => {
    const room = rooms.find((r: any) => r.id === bed.roomId);
    const ward = room ? enrichedWards.find((w: any) => w.id === room.wardId) : null;
    const floor = ward ? (ward.floor || floors.find((f: any) => f.id === ward.floorId)) : null;
    return {
      ...bed,
      room: room || null,
      ward: ward || null,
      floor: floor || null,
    };
  });

  const floorColumns = [
    { title: 'Floor Number', dataIndex: 'floorNumber', key: 'floorNumber' },
    { title: 'Floor Name', dataIndex: 'floorName', key: 'floorName' },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Floor) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEditFloor(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete floor?"
            description="This will also delete all wards, rooms, and beds on this floor."
            onConfirm={() => handleDeleteFloor(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const wardColumns = [
    { 
      title: 'Ward Name', 
      dataIndex: 'name', 
      key: 'name',
      render: (name: string) => name || <Text type="secondary">—</Text>
    },
    { 
      title: 'Type', 
      dataIndex: 'type', 
      key: 'type', 
      render: (type: string) => type ? <Tag>{type}</Tag> : <Text type="secondary">—</Text>
    },
    { 
      title: 'Floor', 
      key: 'floor', 
      render: (_: any, record: Ward) => {
        if (!record.floorId) return <Text type="secondary">No Floor</Text>;
        if (record.floor) {
          return record.floor.floorName || `Floor ${record.floor.floorNumber}`;
        }
        const floor = floors.find((f) => f.id === record.floorId);
        return floor ? (floor.floorName || `Floor ${floor.floorNumber}`) : <Text type="secondary">Unknown</Text>;
      }
    },
    { 
      title: 'Gender Policy', 
      dataIndex: 'genderPolicy', 
      key: 'genderPolicy',
      render: (policy: string) => policy ? policy.replace('_', ' ').toUpperCase() : <Text type="secondary">—</Text>
    },
    { 
      title: 'Capacity', 
      dataIndex: 'capacity', 
      key: 'capacity',
      render: (capacity: number) => capacity !== null && capacity !== undefined ? capacity : <Text type="secondary">—</Text>
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Ward) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEditWard(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete ward?"
            description="This will also delete all rooms and beds in this ward."
            onConfirm={() => handleDeleteWard(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const roomColumns = [
    { 
      title: 'Room Number', 
      dataIndex: 'roomNumber', 
      key: 'roomNumber',
      render: (roomNumber: string) => roomNumber || <Text type="secondary">—</Text>
    },
    { 
      title: 'Room Name', 
      dataIndex: 'roomName', 
      key: 'roomName',
      render: (roomName: string) => roomName || <Text type="secondary">—</Text>
    },
    { 
      title: 'Category', 
      dataIndex: 'category', 
      key: 'category', 
      render: (cat: string) => cat ? <Tag>{cat}</Tag> : <Text type="secondary">—</Text>
    },
    { 
      title: 'Ward', 
      key: 'ward', 
      render: (_: any, record: Room) => {
        if (record.ward) {
          return record.ward.name || 'Unknown';
        }
        const ward = wards.find((w) => w.id === record.wardId);
        return ward?.name || 'Unknown';
      }
    },
    { 
      title: 'Capacity', 
      dataIndex: 'capacity', 
      key: 'capacity',
      render: (capacity: number) => capacity !== null && capacity !== undefined ? capacity : <Text type="secondary">—</Text>
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Room) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEditRoom(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete room?"
            description="This will also delete all beds in this room."
            onConfirm={() => handleDeleteRoom(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const bedColumns = [
    { 
      title: 'Bed Number', 
      dataIndex: 'bedNumber', 
      key: 'bedNumber',
      render: (bedNumber: string) => bedNumber || <Text type="secondary">—</Text>
    },
    { 
      title: 'Bed Name', 
      dataIndex: 'bedName', 
      key: 'bedName',
      render: (bedName: string) => bedName || <Text type="secondary">—</Text>
    },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status', 
      render: (status: string) => {
        if (!status) return <Text type="secondary">—</Text>;
        const colors: Record<string, string> = {
          available: 'success',
          occupied: 'error',
          cleaning: 'warning',
          blocked: 'default',
        };
        return <Tag color={colors[status] || 'default'}>{status}</Tag>;
      }
    },
    { 
      title: 'Bed Type', 
      dataIndex: 'bedType', 
      key: 'bedType',
      render: (bedType: string) => bedType || <Text type="secondary">—</Text>
    },
    { 
      title: 'Room', 
      key: 'room', 
      render: (_: any, record: Bed) => {
        if (record.room) {
          return record.room.roomName || record.room.roomNumber || 'Unknown';
        }
        const room = rooms.find((r) => r.id === record.roomId);
        return room ? (room.roomName || room.roomNumber) : 'Unknown';
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Bed) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEditBed(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete bed?"
            onConfirm={() => handleDeleteBed(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      flex: 1, 
      minHeight: 0, 
      overflow: 'hidden',
      height: '100%',
    }}>
        <style>{`
          .bed-structure-tabs .ant-tabs {
            display: flex !important;
            flex-direction: column !important;
            flex: 1 1 auto !important;
            min-height: 0 !important;
            position: relative !important;
            height: 100% !important;
          }
          .bed-structure-tabs .ant-tabs-nav {
            margin: 0 !important;
            padding: 0 16px !important;
            flex-shrink: 0 !important;
            position: relative !important;
            z-index: 1 !important;
          }
          .bed-structure-tabs .ant-tabs-content-holder {
            flex: 1 1 auto !important;
            min-height: 0 !important;
            overflow: hidden !important;
            position: relative !important;
          }
          .bed-structure-tabs .ant-tabs-content {
            height: 100% !important;
            display: flex !important;
            flex: 1 1 auto !important;
            min-height: 0 !important;
          }
          .bed-structure-tabs .ant-tabs-tabpane {
            height: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            flex: 1 1 auto !important;
            min-height: 0 !important;
            padding-top: 0 !important;
          }
        `}</style>
        <Tabs
          className="bed-structure-tabs"
          items={[
            {
              key: 'floors',
              label: (
                <span>
                  <HomeOutlined /> Floors
                </span>
              ),
              children: (
                <Card
                  title="Floors"
                  extra={
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        setEditingFloor(null);
                        floorForm.resetFields();
                        setIsFloorModalOpen(true);
                      }}
                    >
                      Add Floor
                    </Button>
                  }
                  styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 } }}
                  style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%' }}
                >
                  <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                    <Table
                      columns={floorColumns}
                      dataSource={floors}
                      rowKey={(record) => record.id || `floor-${record.floorNumber}`}
                      loading={isLoading}
                      pagination={false}
                      scroll={{ y: 'calc(100vh - 400px)' }}
                    />
                  </div>
                </Card>
              ),
            },
            {
              key: 'wards',
              label: (
                <span>
                  <BuildOutlined /> Wards
                </span>
              ),
              children: (
                <Card
                  title="Wards"
                  extra={
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        setEditingWard(null);
                        wardForm.resetFields();
                        setIsWardModalOpen(true);
                      }}
                    >
                      Add Ward
                    </Button>
                  }
                  styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 } }}
                  style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%' }}
                >
                  <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                    <Table
                      columns={wardColumns}
                      dataSource={enrichedWards}
                      rowKey={(record) => record.id || `ward-${record.name || 'unknown'}`}
                      loading={isLoading}
                      pagination={false}
                      scroll={{ y: 'calc(100vh - 400px)' }}
                    />
                  </div>
                </Card>
              ),
            },
            {
              key: 'rooms',
              label: (
                <span>
                  <PartitionOutlined /> Rooms
                </span>
              ),
              children: (
                <Card
                  title="Rooms"
                  extra={
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        setEditingRoom(null);
                        setSelectedWardForRoom(null);
                        roomForm.resetFields();
                        setIsRoomModalOpen(true);
                      }}
                    >
                      Add Room
                    </Button>
                  }
                  styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 } }}
                  style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%' }}
                >
                  <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                    <Table
                      columns={roomColumns}
                      dataSource={enrichedRooms}
                      rowKey={(record) => record.id || `room-${record.roomNumber || 'unknown'}`}
                      loading={isLoading}
                      pagination={false}
                      scroll={{ y: 'calc(100vh - 400px)' }}
                    />
                  </div>
                </Card>
              ),
            },
            {
              key: 'beds',
              label: (
                <span>
                  <AppstoreOutlined /> Beds
                </span>
              ),
              children: (
                <Card
                  title="Beds"
                  extra={
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        setEditingBed(null);
                        setSelectedRoomForBed(null);
                        bedForm.resetFields();
                        setIsBedModalOpen(true);
                      }}
                    >
                      Add Bed
                    </Button>
                  }
                  styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 } }}
                  style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%' }}
                >
                  <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                    <Table
                      columns={bedColumns}
                      dataSource={enrichedBeds}
                      rowKey={(record) => record.id || `bed-${record.bedNumber || 'unknown'}`}
                      loading={isLoading}
                      pagination={{ pageSize: 20 }}
                      scroll={{ y: 'calc(100vh - 400px)' }}
                    />
                  </div>
                </Card>
              ),
            },
          ]}
        />

      {/* Floor Modal */}
      <Modal
        title={editingFloor ? 'Edit Floor' : 'Add Floor'}
        open={isFloorModalOpen}
        onCancel={() => {
          setIsFloorModalOpen(false);
          setEditingFloor(null);
          floorForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={floorForm}
          layout="vertical"
          onFinish={editingFloor ? handleUpdateFloor : handleCreateFloor}
        >
          <Form.Item name="floorNumber" label="Floor Number" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} placeholder="0 = Ground, 1 = First, -1 = Basement" />
          </Form.Item>
          <Form.Item name="floorName" label="Floor Name">
            <Input placeholder="e.g., First Floor, Ground Floor" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <TextArea rows={3} placeholder="Optional description" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button onClick={() => setIsFloorModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                {editingFloor ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Ward Modal */}
      <Modal
        title={editingWard ? 'Edit Ward' : 'Add Ward'}
        open={isWardModalOpen}
        onCancel={() => {
          setIsWardModalOpen(false);
          setEditingWard(null);
          wardForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={wardForm}
          layout="vertical"
          onFinish={editingWard ? handleUpdateWard : handleCreateWard}
          initialValues={{ type: 'general', genderPolicy: 'mixed' }}
        >
          <Form.Item name="name" label="Ward Name" rules={[{ required: true }]}>
            <Input placeholder="e.g., General Ward, ICU" />
          </Form.Item>
          <Form.Item name="type" label="Ward Type" rules={[{ required: true }]}>
            <Select>
              <Select.Option key="general" value="general">General</Select.Option>
              <Select.Option key="icu" value="icu">ICU</Select.Option>
              <Select.Option key="er" value="er">Emergency Room</Select.Option>
              <Select.Option key="pediatric" value="pediatric">Pediatric</Select.Option>
              <Select.Option key="maternity" value="maternity">Maternity</Select.Option>
              <Select.Option key="surgical" value="surgical">Surgical</Select.Option>
              <Select.Option key="private" value="private">Private</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="floorId" label="Floor (Optional)">
            <Select placeholder="Select floor" allowClear>
              {floors.map((f) => (
                <Select.Option key={f.id} value={f.id}>
                  {f.floorName || `Floor ${f.floorNumber}`}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="genderPolicy" label="Gender Policy">
            <Select>
              <Select.Option key="mixed" value="mixed">Mixed</Select.Option>
              <Select.Option key="male_only" value="male_only">Male Only</Select.Option>
              <Select.Option key="female_only" value="female_only">Female Only</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="capacity" label="Capacity">
            <InputNumber style={{ width: '100%' }} placeholder="Total bed capacity" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <TextArea rows={3} placeholder="Optional description" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button onClick={() => setIsWardModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                {editingWard ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Room Modal */}
      <Modal
        title={editingRoom ? 'Edit Room' : 'Add Room'}
        open={isRoomModalOpen}
        onCancel={() => {
          setIsRoomModalOpen(false);
          setEditingRoom(null);
          setSelectedWardForRoom(null);
          roomForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={roomForm}
          layout="vertical"
          onFinish={editingRoom ? handleUpdateRoom : handleCreateRoom}
          initialValues={{ category: 'general' }}
        >
          {!editingRoom && (
            <Form.Item 
              label="Select Ward" 
              required
              rules={[{ required: true, message: 'Please select a ward' }]}
            >
              <Select
                placeholder="Select ward"
                value={selectedWardForRoom}
                onChange={(value) => setSelectedWardForRoom(value)}
                showSearch
                filterOption={(input, option) =>
                  (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {wards.length === 0 ? (
                  <Select.Option value={null} disabled>
                    No wards available. Please create a ward first.
                  </Select.Option>
                ) : (
                  wards.map((w) => (
                    <Select.Option key={w.id} value={w.id}>
                      {w.name || 'Unnamed Ward'} {w.type ? `(${w.type})` : ''}
                    </Select.Option>
                  ))
                )}
              </Select>
            </Form.Item>
          )}
          {editingRoom && (
            <Form.Item label="Ward">
              <Input 
                value={wards.find(w => w.id === editingRoom.wardId)?.name || 'Unknown Ward'} 
                disabled 
              />
            </Form.Item>
          )}
          <Form.Item name="roomNumber" label="Room Number" rules={[{ required: true }]}>
            <Input placeholder="e.g., 101, 201" />
          </Form.Item>
          <Form.Item name="roomName" label="Room Name">
            <Input placeholder="e.g., VIP Suite, Deluxe Room" />
          </Form.Item>
          <Form.Item name="category" label="Category" rules={[{ required: true }]}>
            <Select>
              <Select.Option key="general" value="general">General</Select.Option>
              <Select.Option key="semi-private" value="semi-private">Semi-Private</Select.Option>
              <Select.Option key="private" value="private">Private</Select.Option>
              <Select.Option key="deluxe" value="deluxe">Deluxe</Select.Option>
              <Select.Option key="vip" value="vip">VIP</Select.Option>
              <Select.Option key="icu" value="icu">ICU</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="capacity" label="Capacity">
            <InputNumber style={{ width: '100%' }} placeholder="Number of beds in room" min={1} />
          </Form.Item>
          <Form.Item name="amenities" label="Amenities (JSON)">
            <TextArea rows={3} placeholder='e.g., ["AC", "TV", "WiFi"]' />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button onClick={() => {
                setIsRoomModalOpen(false);
                setEditingRoom(null);
                setSelectedWardForRoom(null);
                roomForm.resetFields();
              }}>Cancel</Button>
              <Button 
                type="primary" 
                htmlType="submit"
              >
                {editingRoom ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Bed Modal */}
      <Modal
        title={editingBed ? 'Edit Bed' : 'Add Bed'}
        open={isBedModalOpen}
        onCancel={() => {
          setIsBedModalOpen(false);
          setEditingBed(null);
          setSelectedRoomForBed(null);
          bedForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={bedForm}
          layout="vertical"
          onFinish={editingBed ? handleUpdateBed : handleCreateBed}
          initialValues={{ status: 'available', bedType: 'standard' }}
        >
          {!editingBed && (
            <Form.Item 
              label="Select Room" 
              required
              rules={[{ required: true, message: 'Please select a room' }]}
            >
              <Select
                placeholder="Select room"
                value={selectedRoomForBed}
                onChange={(value) => setSelectedRoomForBed(value)}
                showSearch
                filterOption={(input, option) =>
                  (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {rooms.length === 0 ? (
                  <Select.Option key="no-rooms" value={null} disabled>
                    No rooms available. Please create a room first.
                  </Select.Option>
                ) : (
                  rooms.map((r) => {
                    const ward = wards.find((w) => w.id === r.wardId);
                    return (
                      <Select.Option key={`room-${r.id}`} value={r.id}>
                        {r.roomName || r.roomNumber} - {ward?.name || 'Unknown Ward'}
                      </Select.Option>
                    );
                  })
                )}
              </Select>
            </Form.Item>
          )}
          {editingBed && (
            <Form.Item label="Room">
              <Input 
                value={
                  (() => {
                    const room = rooms.find(r => r.id === editingBed.roomId);
                    return room ? (room.roomName || room.roomNumber) : 'Unknown Room';
                  })()
                } 
                disabled 
              />
            </Form.Item>
          )}
          <Form.Item name="bedNumber" label="Bed Number" rules={[{ required: true }]}>
            <Input placeholder="e.g., 1, 2, A, B" />
          </Form.Item>
          <Form.Item name="bedName" label="Bed Name">
            <Input placeholder="e.g., Bed A, Bed 1" />
          </Form.Item>
          <Form.Item name="bedType" label="Bed Type">
            <Select>
              <Select.Option key="standard" value="standard">Standard</Select.Option>
              <Select.Option key="electric" value="electric">Electric</Select.Option>
              <Select.Option key="manual" value="manual">Manual</Select.Option>
              <Select.Option key="icu" value="icu">ICU Bed</Select.Option>
              <Select.Option key="ventilator" value="ventilator">Ventilator Bed</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="equipment" label="Equipment (JSON)">
            <TextArea rows={3} placeholder='e.g., ["Oxygen", "Monitor"]' />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <TextArea rows={2} placeholder="Special notes about this bed" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button onClick={() => {
                setIsBedModalOpen(false);
                setEditingBed(null);
                setSelectedRoomForBed(null);
                bedForm.resetFields();
              }}>Cancel</Button>
              <Button 
                type="primary" 
                htmlType="submit"
              >
                {editingBed ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

