// client/src/pages/ipd/patient-detail.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Tabs, Space, Typography, Tag, Descriptions, Spin, message, Table, Divider } from 'antd';
import { UserOutlined, MedicineBoxOutlined, FileTextOutlined, ExperimentOutlined, HomeOutlined, DollarOutlined } from '@ant-design/icons';
import { apiRequest } from '../../lib/queryClient';
import OrdersManagement from './orders-management';
import DoctorRounds from './doctor-rounds';
import EMAR from './emar';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface IPDPatientDetailProps {
  encounterId: number;
}

export default function IPDPatientDetail({ encounterId }: IPDPatientDetailProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch encounter details
  const { data: encounter, isLoading } = useQuery({
    queryKey: ['/api/ipd/encounters', encounterId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/ipd/encounters/${encounterId}`);
      return res.json();
    },
  });

  // Fetch encounter charges
  const { data: charges, isLoading: chargesLoading } = useQuery({
    queryKey: ['/api/hospital-charges/encounter', encounterId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/hospital-charges/encounter/${encounterId}`);
      return res.json();
    },
    enabled: !!encounter && (encounter.status === 'discharged' || encounter.status === 'LAMA' || encounter.status === 'death' || encounter.status === 'absconded'),
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!encounter) {
    return <Card>Encounter not found</Card>;
  }

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>
              <UserOutlined /> {encounter.patient?.user?.fullName || encounter.patient?.fullName || 'Patient'}
            </Title>
            <Space>
              <Tag color={encounter.status === 'admitted' ? 'green' : 'default'}>
                {encounter.status?.toUpperCase()}
              </Tag>
              <Tag color="blue">{encounter.admissionType?.toUpperCase()}</Tag>
            </Space>
          </div>

          <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small">
            <Descriptions.Item label="Patient ID">
              {encounter.patient?.id || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Admitted At">
              {new Date(encounter.admittedAt).toLocaleString()}
            </Descriptions.Item>
            {(encounter.dischargedAt || encounter.status === 'discharged' || encounter.status === 'LAMA' || encounter.status === 'death' || encounter.status === 'absconded') && (
              <Descriptions.Item label="Discharged At">
                {encounter.dischargedAt ? new Date(encounter.dischargedAt).toLocaleString() : 'N/A'}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Admitting Doctor">
              {encounter.admittingDoctor?.fullName || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Attending Doctor">
              {encounter.attendingDoctor?.fullName || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Assigned Nurse">
              {encounter.assignedNurse?.fullName || 'Not Assigned'}
            </Descriptions.Item>
            <Descriptions.Item label={encounter.status === 'discharged' || encounter.status === 'LAMA' || encounter.status === 'death' || encounter.status === 'absconded' ? 'Last Bed' : 'Current Bed'}>
              {encounter.status === 'discharged' || encounter.status === 'LAMA' || encounter.status === 'death' || encounter.status === 'absconded' 
                ? (encounter.currentBed?.bedName || encounter.currentBed?.bedNumber || 'N/A (Discharged)')
                : (encounter.currentBed?.bedName || encounter.currentBed?.bedNumber || 'N/A')}
            </Descriptions.Item>
          </Descriptions>
        </Space>
      </Card>

      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane
            tab={
              <span>
                <HomeOutlined /> Overview
              </span>
            }
            key="overview"
          >
            <Card>
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Text strong>Patient Information</Text>
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="Name">{encounter.patient?.user?.fullName || encounter.patient?.fullName || 'N/A'}</Descriptions.Item>
                  <Descriptions.Item label="Age">
                    {encounter.patient?.dateOfBirth
                      ? `${Math.floor((new Date().getTime() - new Date(encounter.patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} years`
                      : 'N/A'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Gender">{encounter.patient?.gender || 'N/A'}</Descriptions.Item>
                  <Descriptions.Item label="Blood Group">{encounter.patient?.bloodGroup || 'N/A'}</Descriptions.Item>
                </Descriptions>
              </Space>
            </Card>
          </TabPane>

          <TabPane
            tab={
              <span>
                <MedicineBoxOutlined /> Orders
              </span>
            }
            key="orders"
          >
            <OrdersManagement encounterId={encounterId} />
          </TabPane>

          <TabPane
            tab={
              <span>
                <FileTextOutlined /> Rounds
              </span>
            }
            key="rounds"
          >
            <DoctorRounds encounterId={encounterId} patientId={encounter.patientId} />
          </TabPane>

          <TabPane
            tab={
              <span>
                <MedicineBoxOutlined /> eMAR
              </span>
            }
            key="emar"
          >
            <EMAR encounterId={encounterId} />
          </TabPane>
          {(encounter.status === 'discharged' || encounter.status === 'LAMA' || encounter.status === 'death' || encounter.status === 'absconded') ? (
            <TabPane
              tab={
                <span>
                  <FileTextOutlined /> Discharge Summary
                </span>
              }
              key="discharge-summary"
            >
              <Card>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <div>
                    <Text strong>Discharge Date: </Text>
                    <Text>{encounter.dischargedAt ? new Date(encounter.dischargedAt).toLocaleString() : 'N/A'}</Text>
                  </div>
                  <div>
                    <Text strong>Discharge Status: </Text>
                    <Tag color={encounter.status === 'discharged' ? 'green' : encounter.status === 'death' ? 'red' : 'orange'}>
                      {encounter.status?.toUpperCase()}
                    </Tag>
                  </div>
                  {encounter.dischargeSummaryText ? (
                    <div>
                      <Text strong>Discharge Summary:</Text>
                      <div style={{ 
                        marginTop: 16, 
                        padding: 16, 
                        background: '#f5f5f5', 
                        borderRadius: 8,
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        maxHeight: '600px',
                        overflowY: 'auto'
                      }}>
                        {encounter.dischargeSummaryText}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Text type="secondary">No discharge summary available.</Text>
                    </div>
                  )}
                  
                  {/* Itemized Charges */}
                  {charges && charges.total > 0 && (
                    <div style={{ marginTop: 24 }}>
                      <Divider />
                      <Text strong style={{ fontSize: 16 }}>
                        <DollarOutlined /> Itemized Charges
                      </Text>
                      
                      {/* Bed Charges */}
                      {charges.bedCharges && charges.bedCharges.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <Text strong>Bed Charges:</Text>
                          <Table
                            size="small"
                            dataSource={charges.bedCharges}
                            columns={[
                              { title: 'Date', dataIndex: 'date', key: 'date' },
                              { title: 'Bed', dataIndex: 'bedName', key: 'bedName' },
                              { title: 'Type', dataIndex: 'bedType', key: 'bedType' },
                              { title: 'Days', dataIndex: 'days', key: 'days' },
                              { title: 'Daily Rate', dataIndex: 'dailyRate', key: 'dailyRate', render: (val) => `₹${val.toFixed(2)}` },
                              { title: 'Total', dataIndex: 'total', key: 'total', render: (val) => <Text strong>₹{val.toFixed(2)}</Text> },
                            ]}
                            pagination={false}
                            style={{ marginTop: 8 }}
                          />
                        </div>
                      )}

                      {/* Lab Charges */}
                      {charges.labCharges && charges.labCharges.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <Text strong>Lab Test Charges:</Text>
                          <Table
                            size="small"
                            dataSource={charges.labCharges}
                            columns={[
                              { title: 'Date', dataIndex: 'date', key: 'date' },
                              { title: 'Test', dataIndex: 'testName', key: 'testName' },
                              { title: 'Amount', dataIndex: 'price', key: 'price', render: (val) => <Text strong>₹{val.toFixed(2)}</Text> },
                            ]}
                            pagination={false}
                            style={{ marginTop: 8 }}
                          />
                        </div>
                      )}

                      {/* Radiology Charges */}
                      {charges.radiologyCharges && charges.radiologyCharges.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <Text strong>Radiology Charges:</Text>
                          <Table
                            size="small"
                            dataSource={charges.radiologyCharges}
                            columns={[
                              { title: 'Date', dataIndex: 'date', key: 'date' },
                              { title: 'Test', dataIndex: 'testName', key: 'testName' },
                              { title: 'Amount', dataIndex: 'price', key: 'price', render: (val) => <Text strong>₹{val.toFixed(2)}</Text> },
                            ]}
                            pagination={false}
                            style={{ marginTop: 8 }}
                          />
                        </div>
                      )}

                      {/* Service Charges */}
                      {charges.serviceCharges && charges.serviceCharges.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <Text strong>Service Charges:</Text>
                          <Table
                            size="small"
                            dataSource={charges.serviceCharges}
                            columns={[
                              { title: 'Date', dataIndex: 'date', key: 'date' },
                              { title: 'Service', dataIndex: 'serviceName', key: 'serviceName' },
                              { title: 'Amount', dataIndex: 'price', key: 'price', render: (val) => <Text strong>₹{val.toFixed(2)}</Text> },
                            ]}
                            pagination={false}
                            style={{ marginTop: 8 }}
                          />
                        </div>
                      )}

                      {/* Grand Total */}
                      <div style={{ marginTop: 16, padding: 12, background: '#e6f7ff', borderRadius: 8 }}>
                        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                          <Text strong style={{ fontSize: 16 }}>Grand Total:</Text>
                          <Text strong style={{ fontSize: 18, color: '#1890ff' }}>₹{charges.total.toFixed(2)}</Text>
                        </Space>
                      </div>
                    </div>
                  )}
                  
                  {chargesLoading && (
                    <div style={{ marginTop: 16, textAlign: 'center' }}>
                      <Spin /> <Text type="secondary">Loading charges...</Text>
                    </div>
                  )}
                </Space>
              </Card>
            </TabPane>
          ) : null}
        </Tabs>
      </Card>
    </div>
  );
}
