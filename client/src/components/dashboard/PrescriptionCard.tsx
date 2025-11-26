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
  const adherencePercentage = adherence * 100;
  const adherenceColor = adherencePercentage >= 80 ? '#10B981' : adherencePercentage >= 60 ? '#F59E0B' : '#EF4444';

  return (
    <Card 
      variant="outlined" 
      style={{ 
        borderRadius: 16,
        border: '1px solid #E3F2FF',
        boxShadow: '0 2px 8px rgba(26, 143, 227, 0.06)',
        transition: 'all 0.3s ease',
        marginBottom: 16,
      }}
      hoverable
    >
      <Row gutter={[20, 16]} align="middle">
        <Col xs={24} md={8}>
          <Title level={4} style={{ marginBottom: 8, color: '#1A8FE3' }}>
            {name}
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>{dosage}</Text>
        </Col>
        <Col xs={24} md={6}>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Next Dose
          </Text>
          <div style={{ marginTop: 4, fontSize: 14, fontWeight: 500, color: '#262626' }}>{nextDose}</div>
        </Col>
        <Col xs={24} md={6}>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Refill Status
          </Text>
          <div style={{ marginTop: 4, fontSize: 14, fontWeight: 500, color: '#262626' }}>{refillsRemaining}</div>
        </Col>
        <Col xs={24} md={4}>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Adherence
          </Text>
          <div style={{ marginTop: 4 }}>
            <Statistic
              value={adherencePercentage}
              suffix="%"
              precision={0}
              valueStyle={{ 
                color: adherenceColor,
                fontSize: 20,
                fontWeight: 600,
              }}
            />
            <div style={{ 
              width: '100%', 
              height: 4, 
              background: '#E3F2FF', 
              borderRadius: 2,
              marginTop: 4,
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${adherencePercentage}%`,
                height: '100%',
                background: adherenceColor,
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        </Col>
      </Row>
      <Space style={{ marginTop: 20 }}>
        <Button 
          onClick={onViewDetails}
          style={{
            borderRadius: 10,
            borderColor: '#E3F2FF',
          }}
        >
          View Details
        </Button>
        <Button 
          type="primary" 
          onClick={onRequestRefill}
          style={{
            background: '#1A8FE3',
            borderColor: '#1A8FE3',
            borderRadius: 10,
          }}
        >
          Request Refill
        </Button>
      </Space>
    </Card>
  );
}

