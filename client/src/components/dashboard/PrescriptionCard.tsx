import { Card, Col, Row, Space, Statistic, Typography, Button } from 'antd';

const { Title, Text } = Typography;

interface PrescriptionCardProps {
  name: string;
  dosage: string;
  nextDose: string;
  refillsRemaining: string;
  adherence: number;
  onViewDetails?: () => void;
  onRequestRefill?: () => void;
}

export function PrescriptionCard({
  name,
  dosage,
  nextDose,
  refillsRemaining,
  adherence,
  onViewDetails,
  onRequestRefill,
}: PrescriptionCardProps) {
  return (
    <Card variant="outlined" style={{ borderRadius: 12 }}>
      <Row gutter={[16, 16]} align="middle">
        <Col xs={24} md={8}>
          <Title level={4} style={{ marginBottom: 4 }}>
            {name}
          </Title>
          <Text type="secondary">{dosage}</Text>
        </Col>
        <Col xs={24} md={6}>
          <Text type="secondary">Next Dose</Text>
          <div>{nextDose}</div>
        </Col>
        <Col xs={24} md={6}>
          <Text type="secondary">Refill Status</Text>
          <div>{refillsRemaining}</div>
        </Col>
        <Col xs={24} md={4}>
          <Text type="secondary">Adherence</Text>
          <Statistic
            value={adherence * 100}
            suffix="%"
            precision={0}
            valueStyle={{ color: '#52c41a' }}
          />
        </Col>
      </Row>
      <Space style={{ marginTop: 16 }}>
        <Button onClick={onViewDetails}>View Details</Button>
        <Button type="primary" onClick={onRequestRefill}>
          Request Refill
        </Button>
      </Space>
    </Card>
  );
}

