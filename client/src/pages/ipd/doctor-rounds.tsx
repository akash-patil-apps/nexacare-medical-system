// client/src/pages/ipd/doctor-rounds.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Table, Tag, Button, Space, Typography, Modal, Form, Input, message, Badge, Timeline, Divider } from 'antd';
import { FileTextOutlined, PlusOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { apiRequest } from '../../lib/queryClient';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface DoctorRoundsProps {
  encounterId: number;
  patientId: number;
}

export default function DoctorRounds({ encounterId, patientId }: DoctorRoundsProps) {
  const queryClient = useQueryClient();
  const [roundModalVisible, setRoundModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Fetch rounds
  const { data: rounds = [], isLoading } = useQuery({
    queryKey: ['/api/ipd-workflow/encounters', encounterId, 'rounds'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/ipd-workflow/encounters/${encounterId}/rounds`);
      return res.json();
    },
  });

  // Fetch recent vitals
  const { data: recentVitals = [] } = useQuery({
    queryKey: ['/api/ipd-workflow/encounters', encounterId, 'vitals', 'recent'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/ipd-workflow/encounters/${encounterId}/vitals/recent?hours=24`);
      return res.json();
    },
  });

  // Create round mutation
  const createRoundMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/ipd-workflow/rounds', data);
      return res.json();
    },
    onSuccess: () => {
      message.success('Round note created successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/ipd-workflow/encounters', encounterId, 'rounds'] });
      setRoundModalVisible(false);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to create round note');
    },
  });

  // Sign note mutation
  const signNoteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      const res = await apiRequest('POST', `/api/ipd-workflow/notes/${noteId}/sign`);
      return res.json();
    },
    onSuccess: () => {
      message.success('Note signed successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/ipd-workflow/encounters', encounterId, 'rounds'] });
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to sign note');
    },
  });

  const handleCreateRound = () => {
    form.resetFields();
    setRoundModalVisible(true);
  };

  const onCreateRound = async (values: any) => {
    await createRoundMutation.mutateAsync({
      encounterId,
      patientId,
      noteType: 'round',
      ...values,
    });
  };

  const handleSignNote = (noteId: number) => {
    signNoteMutation.mutate(noteId);
  };

  const latestVitals = recentVitals[0];

  return (
    <div>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>
              <FileTextOutlined /> Doctor Rounds
            </Title>
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateRound}>
                New Round Note
              </Button>
            </Space>
          </div>

          {/* Recent Vitals Summary */}
          {latestVitals && (
            <Card size="small" style={{ background: '#f0f9ff' }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Text strong>Latest Vitals (Last 24h)</Text>
                <Space>
                  {latestVitals.temperature && <Text>Temp: <strong>{latestVitals.temperature}°C</strong></Text>}
                  {latestVitals.bloodPressure && <Text>BP: <strong>{latestVitals.bloodPressure}</strong></Text>}
                  {latestVitals.pulse && <Text>Pulse: <strong>{latestVitals.pulse} bpm</strong></Text>}
                  {latestVitals.respiratoryRate && <Text>RR: <strong>{latestVitals.respiratoryRate}</strong></Text>}
                  {latestVitals.spo2 && <Text>SpO2: <strong>{latestVitals.spo2}%</strong></Text>}
                </Space>
              </Space>
            </Card>
          )}

          {/* Rounds Timeline */}
          <Timeline>
            {rounds.map((round: any) => (
              <Timeline.Item
                key={round.id}
                color={round.isDraft ? 'orange' : round.signedAt ? 'green' : 'blue'}
              >
                <Card size="small" style={{ marginBottom: 16 }}>
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Space>
                        <Text strong>{new Date(round.createdAt).toLocaleString()}</Text>
                        {round.isDraft && <Tag color="orange">Draft</Tag>}
                        {round.signedAt && <Tag color="green">Signed</Tag>}
                        {!round.isDraft && !round.signedAt && (
                          <Button
                            type="link"
                            size="small"
                            icon={<CheckCircleOutlined />}
                            onClick={() => handleSignNote(round.id)}
                          >
                            Sign Note
                          </Button>
                        )}
                      </Space>
                      {round.doctor && <Text type="secondary">By: {round.doctor.fullName}</Text>}
                    </div>
                    <Divider style={{ margin: '8px 0' }} />
                    {round.subjective && (
                      <div>
                        <Text strong>S:</Text> <Text>{round.subjective}</Text>
                      </div>
                    )}
                    {round.objective && (
                      <div>
                        <Text strong>O:</Text> <Text>{round.objective}</Text>
                      </div>
                    )}
                    {round.assessment && (
                      <div>
                        <Text strong>A:</Text> <Text>{round.assessment}</Text>
                      </div>
                    )}
                    {round.plan && (
                      <div>
                        <Text strong>P:</Text> <Text>{round.plan}</Text>
                      </div>
                    )}
                  </Space>
                </Card>
              </Timeline.Item>
            ))}
          </Timeline>

          {rounds.length === 0 && !isLoading && (
            <Card>
              <Text type="secondary">No rounds recorded yet. Create your first round note.</Text>
            </Card>
          )}
        </Space>
      </Card>

      <Modal
        title="Create Round Note (SOAP)"
        open={roundModalVisible}
        onCancel={() => {
          setRoundModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={createRoundMutation.isPending}
        width={700}
      >
        <Form form={form} onFinish={onCreateRound} layout="vertical">
          <Form.Item
            name="subjective"
            label="Subjective (S)"
            rules={[{ required: true, message: 'Please enter subjective findings' }]}
          >
            <TextArea rows={3} placeholder="Patient complaints, symptoms, history..." />
          </Form.Item>
          <Form.Item
            name="objective"
            label="Objective (O)"
            rules={[{ required: true, message: 'Please enter objective findings' }]}
          >
            <TextArea rows={3} placeholder="Physical exam findings, vitals, lab results..." />
          </Form.Item>
          <Form.Item
            name="assessment"
            label="Assessment (A)"
            rules={[{ required: true, message: 'Please enter assessment' }]}
          >
            <TextArea rows={3} placeholder="Diagnosis, condition assessment..." />
          </Form.Item>
          <Form.Item
            name="plan"
            label="Plan (P)"
            rules={[{ required: true, message: 'Please enter plan' }]}
          >
            <TextArea rows={3} placeholder="Treatment plan, orders, follow-up..." />
          </Form.Item>
          <Form.Item name="isDraft" valuePropName="checked">
            <Input type="checkbox" /> Save as draft
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
