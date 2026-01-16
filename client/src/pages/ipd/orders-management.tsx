// client/src/pages/ipd/orders-management.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Table, Tag, Space, Typography, Tabs, Button, message, Badge, Alert, Empty } from 'antd';
import { MedicineBoxOutlined, ExperimentOutlined, CameraOutlined, PlusOutlined, DropboxOutlined, AppleOutlined, TeamOutlined } from '@ant-design/icons';
import { apiRequest } from '../../lib/queryClient';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface OrdersManagementProps {
  encounterId: number;
}

export default function OrdersManagement({ encounterId }: OrdersManagementProps) {
  const [activeTab, setActiveTab] = useState('all');

  // Fetch all orders for the encounter
  const { data: orders, isLoading, error } = useQuery({
    queryKey: ['/api/ipd-workflow/encounters', encounterId, 'orders'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/ipd-workflow/encounters/${encounterId}/orders`);
      if (!res.ok) {
        throw new Error('Failed to fetch orders');
      }
      return res.json();
    },
    onError: (err) => {
      console.error('Error fetching orders:', err);
    },
  });

  const medicationColumns = [
    {
      title: 'Medication',
      dataIndex: 'medicationName',
      key: 'medicationName',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Dosage',
      key: 'dosage',
      render: (_: any, record: any) => (
        <Text>{record.dosage} {record.unit}</Text>
      ),
    },
    {
      title: 'Route',
      dataIndex: 'route',
      key: 'route',
    },
    {
      title: 'Frequency',
      dataIndex: 'frequency',
      key: 'frequency',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: any = {
          active: 'green',
          stopped: 'red',
          completed: 'blue',
        };
        return <Tag color={colors[status] || 'default'}>{status?.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Ordered By',
      key: 'doctor',
      render: (_: any, record: any) => (
        <Text>{record.doctor?.fullName || 'N/A'}</Text>
      ),
    },
    {
      title: 'Start Date',
      dataIndex: 'startDate',
      key: 'startDate',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  const labColumns = [
    {
      title: 'Order Number',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Tests',
      key: 'items',
      render: (_: any, record: any) => (
        <Space>
          {record.items?.map((item: any) => (
            <Tag key={item.id}>{item.testName}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: any = {
          ordered: 'blue',
          sample_collected: 'green',
          processing: 'orange',
          completed: 'green',
        };
        return <Tag color={colors[status] || 'default'}>{status?.replace('_', ' ').toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Order Date',
      dataIndex: 'orderDate',
      key: 'orderDate',
      render: (date: string) => new Date(date).toLocaleString(),
    },
  ];

  const radiologyColumns = [
    {
      title: 'Order Number',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Tests',
      key: 'items',
      render: (_: any, record: any) => (
        <Space>
          {record.items?.map((item: any) => (
            <Tag key={item.id}>{item.testName}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: any = {
          ordered: 'blue',
          scheduled: 'green',
          in_progress: 'orange',
          completed: 'green',
        };
        return <Tag color={colors[status] || 'default'}>{status?.replace('_', ' ').toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Order Date',
      dataIndex: 'orderDate',
      key: 'orderDate',
      render: (date: string) => new Date(date).toLocaleString(),
    },
  ];

  const allOrders = [
    ...(orders?.medications?.map((m: any) => ({ ...m, type: 'medication' })) || []),
    ...(orders?.lab?.map((l: any) => ({ ...l, type: 'lab' })) || []),
    ...(orders?.radiology?.map((r: any) => ({ ...r, type: 'radiology' })) || []),
    ...(orders?.ivFluids?.map((iv: any) => ({ ...iv, type: 'iv_fluid' })) || []),
    ...(orders?.diets?.map((d: any) => ({ ...d, type: 'diet' })) || []),
    ...(orders?.nursing?.map((n: any) => ({ ...n, type: 'nursing' })) || []),
  ].sort((a, b) => new Date(b.createdAt || b.orderDate).getTime() - new Date(a.createdAt || a.orderDate).getTime());

  if (error) {
    return (
      <Card>
        <Alert
          message="Error Loading Orders"
          description={error instanceof Error ? error.message : 'Failed to load orders. Please try again.'}
          type="error"
          showIcon
        />
      </Card>
    );
  }

  return (
    <Card>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>
            Orders Management
          </Title>
          <Space>
            <Badge count={orders?.medications?.filter((m: any) => m.status === 'active').length || 0}>
              <Tag color="blue">Active Medications</Tag>
            </Badge>
            <Badge count={orders?.lab?.filter((l: any) => l.status !== 'completed').length || 0}>
              <Tag color="orange">Pending Lab</Tag>
            </Badge>
            <Badge count={orders?.radiology?.filter((r: any) => r.status !== 'completed').length || 0}>
              <Tag color="purple">Pending Radiology</Tag>
            </Badge>
          </Space>
        </div>

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane
            tab={
              <span>
                All Orders <Badge count={allOrders.length} style={{ marginLeft: 8 }} />
              </span>
            }
            key="all"
          >
            {allOrders.length > 0 ? (
              <Table
                columns={[
                  {
                    title: 'Type',
                    key: 'type',
                    render: (_: any, record: any) => {
                      const icons: any = {
                        medication: <MedicineBoxOutlined style={{ color: '#52c41a' }} />,
                        lab: <ExperimentOutlined style={{ color: '#1890ff' }} />,
                        radiology: <CameraOutlined style={{ color: '#722ed1' }} />,
                        iv_fluid: <DropboxOutlined style={{ color: '#13c2c2' }} />,
                        diet: <AppleOutlined style={{ color: '#fa8c16' }} />,
                        nursing: <TeamOutlined style={{ color: '#2f54eb' }} />,
                      };
                      return icons[record.type] || <Text>{record.type}</Text>;
                    },
                  },
                  {
                    title: 'Details',
                    key: 'details',
                    render: (_: any, record: any) => {
                      if (record.type === 'medication') {
                        return <Text>{record.medicationName} - {record.dosage} {record.unit}</Text>;
                      }
                      if (record.type === 'iv_fluid') {
                        return <Text>{record.fluidName} - {record.volume} @ {record.rate}</Text>;
                      }
                      if (record.type === 'diet') {
                        return <Text>{record.dietType}</Text>;
                      }
                      if (record.type === 'nursing') {
                        return <Text>{record.orderDescription}</Text>;
                      }
                      return <Text>{record.orderNumber || 'N/A'}</Text>;
                    },
                  },
                  {
                    title: 'Status',
                    key: 'status',
                    render: (_: any, record: any) => {
                      const colors: any = {
                        active: 'green',
                        ordered: 'blue',
                        scheduled: 'green',
                        in_progress: 'orange',
                        completed: 'green',
                      };
                      return <Tag color={colors[record.status] || 'default'}>{record.status?.replace('_', ' ').toUpperCase()}</Tag>;
                    },
                  },
                  {
                    title: 'Date',
                    key: 'date',
                    render: (_: any, record: any) => new Date(record.createdAt || record.orderDate).toLocaleString(),
                  },
                ]}
                dataSource={allOrders}
                loading={isLoading}
                rowKey={(record) => `${record.type}-${record.id}`}
                pagination={{ pageSize: 10 }}
              />
            ) : (
              <Empty description="No orders found for this encounter" />
            )}
          </TabPane>

          <TabPane
            tab={
              <span>
                <MedicineBoxOutlined /> Medications <Badge count={orders?.medications?.length || 0} style={{ marginLeft: 8 }} />
              </span>
            }
            key="medications"
          >
            {orders?.medications && orders.medications.length > 0 ? (
              <Table
                columns={medicationColumns}
                dataSource={orders.medications}
                loading={isLoading}
                rowKey="id"
                pagination={{ pageSize: 10 }}
              />
            ) : (
              <Empty description="No medication orders found" />
            )}
          </TabPane>

          <TabPane
            tab={
              <span>
                <ExperimentOutlined /> Lab Orders <Badge count={orders?.lab?.length || 0} style={{ marginLeft: 8 }} />
              </span>
            }
            key="lab"
          >
            {orders?.lab && orders.lab.length > 0 ? (
              <Table
                columns={labColumns}
                dataSource={orders.lab}
                loading={isLoading}
                rowKey="id"
                pagination={{ pageSize: 10 }}
              />
            ) : (
              <Empty description="No lab orders found" />
            )}
          </TabPane>

          <TabPane
            tab={
              <span>
                <CameraOutlined /> Radiology Orders <Badge count={orders?.radiology?.length || 0} style={{ marginLeft: 8 }} />
              </span>
            }
            key="radiology"
          >
            {orders?.radiology && orders.radiology.length > 0 ? (
              <Table
                columns={radiologyColumns}
                dataSource={orders.radiology}
                loading={isLoading}
                rowKey="id"
                pagination={{ pageSize: 10 }}
              />
            ) : (
              <Empty description="No radiology orders found" />
            )}
          </TabPane>
        </Tabs>
      </Space>
    </Card>
  );
}
