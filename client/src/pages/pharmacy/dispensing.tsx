import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Tag,
  Modal,
  Form,
  InputNumber,
  Select,
  message,
  Row,
  Col,
  Descriptions,
  Divider,
} from 'antd';
import {
  CheckOutlined,
  MedicineBoxOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { apiRequest } from '../../lib/queryClient';
import { PrescriptionPreview } from '../../components/prescription/PrescriptionPreview';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function PharmacyDispensing() {
  const queryClient = useQueryClient();
  const [dispenseModalOpen, setDispenseModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [form] = Form.useForm();

  // Fetch pending prescriptions
  const { data: pendingPrescriptions = [], isLoading } = useQuery({
    queryKey: ['/api/pharmacy/dispensing/pending'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/pharmacy/dispensing/pending');
      return res.json();
    },
  });

  // Fetch inventory for selected medicine
  const { data: inventory = [] } = useQuery({
    queryKey: ['/api/pharmacy/inventory'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/pharmacy/inventory');
      return res.json();
    },
    enabled: !!selectedPrescription,
  });

  // Fetch dispensing history
  const { data: dispensingHistory = [] } = useQuery({
    queryKey: ['/api/pharmacy/dispensing'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/pharmacy/dispensing');
      return res.json();
    },
  });

  // Dispense mutation
  const dispenseMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/pharmacy/dispensing', data);
      return res.json();
    },
    onSuccess: () => {
      message.success('Medicine dispensed successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/pharmacy/dispensing'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pharmacy/inventory'] });
      setDispenseModalOpen(false);
      form.resetFields();
      setSelectedPrescription(null);
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to dispense medicine');
    },
  });

  const handleDispense = async (values: any) => {
    if (!selectedPrescription) return;

    // Parse medications from prescription
    let medications: any[] = [];
    try {
      medications = JSON.parse(selectedPrescription.medications || '[]');
    } catch (e) {
      console.error('Error parsing medications:', e);
    }

    // Build items array from form values
    const items = medications.map((med: any, index: number) => {
      const inventoryId = values[`inventory_${index}`];
      const quantity = values[`quantity_${index}`] || med.quantity || 1;
      
      // Ensure inventoryId is a valid number
      const parsedInventoryId = inventoryId ? Number(inventoryId) : null;
      const parsedQuantity = Number(quantity) || 1;
      
      return {
        prescriptionItemId: index,
        inventoryId: parsedInventoryId,
        quantity: parsedQuantity,
      };
    }).filter((item: any) => item.inventoryId && !isNaN(item.inventoryId) && !isNaN(item.quantity)); // Filter out items without valid inventory selected

    if (items.length === 0) {
      message.error('Please select inventory for at least one medicine');
      return;
    }

    await dispenseMutation.mutate({
      prescriptionId: selectedPrescription.id,
      patientId: selectedPrescription.patientId,
      appointmentId: selectedPrescription.appointmentId,
      items,
    });
  };

  const pendingColumns = [
    {
      title: 'Prescription ID',
      dataIndex: 'id',
      key: 'id',
      render: (id: number) => `#${id}`,
    },
    {
      title: 'Patient',
      key: 'patient',
      render: (_: any, record: any) => (
        <Text strong>{record.patient?.fullName || 'N/A'}</Text>
      ),
    },
    {
      title: 'Doctor',
      key: 'doctor',
      render: (_: any, record: any) => (
        <Text>{record.doctor?.fullName || 'N/A'}</Text>
      ),
    },
    {
      title: 'Medicines',
      key: 'medicines',
      render: (_: any, record: any) => {
        try {
          const meds = JSON.parse(record.medications || '[]');
          return <Text>{meds.length} medicine(s)</Text>;
        } catch {
          return <Text>-</Text>;
        }
      },
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedPrescription(record);
              setViewModalOpen(true);
            }}
          >
            View
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<CheckOutlined />}
            onClick={() => {
              setSelectedPrescription(record);
              setDispenseModalOpen(true);
            }}
          >
            Dispense
          </Button>
        </Space>
      ),
    },
  ];

  const historyColumns = [
    {
      title: 'Dispensation ID',
      dataIndex: 'id',
      key: 'id',
      render: (id: number) => `#${id}`,
    },
    {
      title: 'Patient',
      key: 'patient',
      render: (_: any, record: any) => (
        <Text strong>{record.patient?.fullName || 'N/A'}</Text>
      ),
    },
    {
      title: 'Items',
      key: 'items',
      render: (_: any, record: any) => (
        <Text>{record.items?.length || 0} item(s)</Text>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount: string) => (
        <Text strong>₹{parseFloat(amount || '0').toFixed(2)}</Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'dispensed' ? 'green' : 'orange'}>{status}</Tag>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'dispensedAt',
      key: 'dispensedAt',
      render: (date: string) => (date ? new Date(date).toLocaleDateString() : '-'),
    },
  ];

  // Parse medications for form
  const getMedications = () => {
    if (!selectedPrescription) return [];
    try {
      return JSON.parse(selectedPrescription.medications || '[]');
    } catch {
      return [];
    }
  };

  // Get available inventory for a medicine
  const getAvailableInventory = (medicineName: string) => {
    if (!medicineName || typeof medicineName !== 'string') {
      return [];
    }
    const searchName = medicineName.toLowerCase().trim();
    return inventory.filter((inv: any) => {
      const invMedicineName = inv.medicine?.name || inv.name || '';
      return typeof invMedicineName === 'string' && invMedicineName.toLowerCase().includes(searchName);
    });
  };

  return (
    <div className="pharmacy-dispensing-wrapper" style={{ padding: 24 }}>
      <Card>
        <Title level={2} style={{ marginBottom: 24 }}>
          Prescription Dispensing
        </Title>

        <Table
          title={() => <Text strong>Pending Prescriptions</Text>}
          columns={pendingColumns}
          dataSource={pendingPrescriptions}
          loading={isLoading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />

        <Divider />

        <Table
          title={() => <Text strong>Dispensing History</Text>}
          columns={historyColumns}
          dataSource={dispensingHistory}
          loading={isLoading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* View Prescription Modal */}
      <Modal
        title="View Prescription"
        open={viewModalOpen}
        onCancel={() => {
          setViewModalOpen(false);
          setSelectedPrescription(null);
        }}
        footer={null}
        width={900}
      >
        {selectedPrescription && (() => {
          // Parse medications
          let medications: any[] = [];
          try {
            medications = JSON.parse(selectedPrescription.medications);
            if (!Array.isArray(medications)) medications = [];
          } catch {
            medications = [];
          }

          // Parse instructions to extract chief complaints, clinical findings, advice
          let chiefComplaints: string[] = [];
          let clinicalFindings: string[] = [];
          let advice: string[] = [];
          
          try {
            if (selectedPrescription.instructions) {
              const parsed = JSON.parse(selectedPrescription.instructions);
              if (parsed.chiefComplaints) chiefComplaints = parsed.chiefComplaints;
              if (parsed.clinicalFindings) clinicalFindings = parsed.clinicalFindings;
              if (parsed.advice) advice = parsed.advice;
            }
          } catch {
            // If not JSON, treat as plain text advice
            if (selectedPrescription.instructions) {
              advice = [selectedPrescription.instructions];
            }
          }

          // Get patient data with fallbacks
          const patientName = selectedPrescription.patient?.fullName 
            || selectedPrescription.patient?.user?.fullName 
            || 'Unknown';
          const patientGender = selectedPrescription.patient?.user?.gender 
            || selectedPrescription.patient?.gender 
            || 'M';
          const patientDateOfBirth = selectedPrescription.patient?.user?.dateOfBirth 
            || selectedPrescription.patient?.dateOfBirth;
          const patientAge = patientDateOfBirth 
            ? dayjs().diff(dayjs(patientDateOfBirth), 'year')
            : undefined;
          const patientMobile = selectedPrescription.patient?.user?.mobileNumber 
            || selectedPrescription.patient?.mobileNumber;
          const patientAddress = selectedPrescription.patient?.user?.address 
            || selectedPrescription.patient?.address;

          return (
            <PrescriptionPreview
              hospitalName={selectedPrescription.hospital?.name}
              hospitalAddress={selectedPrescription.hospital?.address}
              doctorName={selectedPrescription.doctor?.fullName || 'Dr. Unknown'}
              doctorQualification="M.S."
              doctorRegNo="MMC 2018"
              patientId={selectedPrescription.patientId}
              patientName={patientName}
              patientGender={patientGender}
              patientAge={patientAge}
              patientMobile={patientMobile}
              patientAddress={patientAddress}
              weight={selectedPrescription.patient?.weight}
              height={selectedPrescription.patient?.height}
              date={selectedPrescription.createdAt}
              chiefComplaints={chiefComplaints}
              clinicalFindings={clinicalFindings}
              diagnosis={selectedPrescription.diagnosis}
              medications={medications}
              labTests={[]}
              advice={advice}
              followUpDate={selectedPrescription.followUpDate}
            />
          );
        })()}
      </Modal>

      {/* Dispense Modal */}
      <Modal
        title="Dispense Medicine"
        open={dispenseModalOpen}
        onCancel={() => {
          setDispenseModalOpen(false);
          form.resetFields();
          setSelectedPrescription(null);
        }}
        footer={null}
        width={800}
      >
        {selectedPrescription && (
          <Form form={form} layout="vertical" onFinish={handleDispense}>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Patient">
                {selectedPrescription.patient?.fullName || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Prescription ID">
                #{selectedPrescription.id}
              </Descriptions.Item>
            </Descriptions>

            <Divider>Select Inventory for Each Medicine</Divider>

            {getMedications().map((med: any, index: number) => {
              const availableInventory = getAvailableInventory(med.medicineName);

              return (
                <Card
                  key={index}
                  size="small"
                  style={{ marginBottom: 16 }}
                  title={
                    <Space>
                      <MedicineBoxOutlined />
                      <Text strong>{med.medicineName}</Text>
                      <Text type="secondary">
                        ({med.dosage} {med.unit}, {med.frequency})
                      </Text>
                    </Space>
                  }
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name={`inventory_${index}`}
                        label="Select Inventory Batch"
                        rules={[{ required: true, message: 'Please select inventory' }]}
                      >
                        <Select placeholder="Select batch">
                          {availableInventory.map((inv: any) => (
                            <Select.Option key={inv.id} value={inv.id}>
                              Batch: {inv.batchNumber} | Stock: {inv.quantity} {inv.unit} | Expiry:{' '}
                              {new Date(inv.expiryDate).toLocaleDateString()}
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name={`quantity_${index}`}
                        label="Quantity to Dispense"
                        initialValue={med.quantity || 1}
                        rules={[{ required: true, message: 'Please enter quantity' }]}
                      >
                        <InputNumber min={1} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>
              );
            })}

            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={dispenseMutation.isPending}
                  icon={<CheckOutlined />}
                >
                  Dispense
                </Button>
                <Button onClick={() => setDispenseModalOpen(false)}>Cancel</Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}
