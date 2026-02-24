import React, { useState } from 'react';
import {
  Modal,
  Descriptions,
  Button,
  Space,
  Tag,
  Typography,
  Divider,
  Alert,
  Spin,
} from 'antd';
import {
  DownloadOutlined,
  FileTextOutlined,
  ExperimentOutlined,
  CalendarOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import ReactMarkdown from 'react-markdown';

const { Title, Text, Paragraph } = Typography;

const DISCLAIMER =
  'This is for information only and is not medical advice. Please discuss your results with your doctor.';

interface LabReportViewerModalProps {
  open: boolean;
  onCancel: () => void;
  report: any;
  loading?: boolean;
}

export default function LabReportViewerModal({
  open,
  onCancel,
  report,
  loading = false,
}: LabReportViewerModalProps) {
  const [interpretLoading, setInterpretLoading] = useState(false);
  const [loadingReportId, setLoadingReportId] = useState<number | null>(null);
  const [interpretationCache, setInterpretationCache] = useState<Record<number, { interpretation: string } | { error: string }>>({});

  if (!report) return null;

  const cached = report.id ? interpretationCache[report.id] : undefined;
  const interpretation = cached && 'interpretation' in cached ? cached.interpretation : null;
  const interpretError = cached && 'error' in cached ? cached.error : null;
  const isLoadingThisReport = loadingReportId === report.id;

  const hasResults = report.results && report.results !== 'Pending - Awaiting lab processing';
  const canInterpret = hasResults && report.id;

  const handleExplainResults = async () => {
    if (!report?.id) return;
    setInterpretLoading(true);
    setLoadingReportId(report.id);
    try {
      const token = localStorage.getItem('auth-token');
      const res = await fetch('/api/ai/lab-interpretation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reportId: report.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setInterpretationCache((prev) => ({
          ...prev,
          [report.id]: {
            error: data?.message || 'Explanation could not be generated. Please try again or ask your doctor.',
          },
        }));
      } else {
        setInterpretationCache((prev) => ({
          ...prev,
          [report.id]: { interpretation: data.interpretation || '' },
        }));
      }
    } catch {
      setInterpretationCache((prev) => ({
        ...prev,
        [report.id]: {
          error: 'Explanation could not be generated. Please try again or ask your doctor.',
        },
      }));
    } finally {
      setInterpretLoading(false);
      setLoadingReportId(null);
    }
  };

  const handleDownload = () => {
    if (report.reportUrl) {
      // If there's a report URL, download it
      window.open(report.reportUrl, '_blank');
    } else {
      // Otherwise, generate a simple text report
      const reportText = generateReportText(report);
      const blob = new Blob([reportText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Lab_Report_${report.testName}_${dayjs(report.reportDate).format('YYYY-MM-DD')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const generateReportText = (report: any) => {
    return `
LAB REPORT
${'='.repeat(50)}

Patient: ${report.patientName || 'N/A'}
Test Name: ${report.testName || 'N/A'}
Test Type: ${report.testType || 'N/A'}
Report Date: ${report.reportDate ? dayjs(report.reportDate).format('DD MMM YYYY') : 'N/A'}
Status: ${report.status || 'N/A'}

${'-'.repeat(50)}

RESULTS:
${report.results || 'No results available'}

${report.normalRanges ? `\nNormal Ranges:\n${report.normalRanges}` : ''}

${report.notes ? `\nNotes:\n${report.notes}` : ''}

${'-'.repeat(50)}
Generated on: ${dayjs().format('DD MMM YYYY, hh:mm A')}
    `.trim();
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'ready':
        return 'green';
      case 'processing':
        return 'blue';
      case 'pending':
        return 'orange';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'ready':
        return <CheckCircleOutlined />;
      case 'processing':
        return <ClockCircleOutlined />;
      default:
        return <ClockCircleOutlined />;
    }
  };

  return (
    <Modal
      title={
        <Space>
          <ExperimentOutlined style={{ fontSize: '20px', color: 'var(--ant-color-primary)' }} />
          <span>Lab Report</span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Close
        </Button>,
        <Button
          key="download"
          type="primary"
          icon={<DownloadOutlined />}
          onClick={handleDownload}
        >
          Download Report
        </Button>,
      ]}
      destroyOnClose
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
        </div>
      ) : (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {/* Status Alert */}
          {report.status === 'pending' && (
            <Alert
              message="Report Pending"
              description="This lab report is still being processed. Results will be available once the lab completes the test."
              type="warning"
              showIcon
            />
          )}

          {report.status === 'processing' && (
            <Alert
              message="Report Processing"
              description="This lab report is currently being processed. Results will be available soon."
              type="info"
              showIcon
            />
          )}

          {/* Report Details */}
          <Descriptions
            bordered
            column={1}
            size="small"
          >
            <Descriptions.Item
              label={
                <Space>
                  <UserOutlined />
                  <span>Patient</span>
                </Space>
              }
            >
              {report.patientName || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item
              label={
                <Space>
                  <ExperimentOutlined />
                  <span>Test Name</span>
                </Space>
              }
            >
              <Text strong>{report.testName || 'N/A'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Test Type">
              {report.testType || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item
              label={
                <Space>
                  <CalendarOutlined />
                  <span>Report Date</span>
                </Space>
              }
            >
              {report.reportDate
                ? dayjs(report.reportDate).format('DD MMM YYYY, hh:mm A')
                : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag
                color={getStatusColor(report.status)}
                icon={getStatusIcon(report.status)}
              >
                {report.status?.toUpperCase() || 'PENDING'}
              </Tag>
            </Descriptions.Item>
            {report.doctorName && (
              <Descriptions.Item label="Requested By">
                Dr. {report.doctorName}
              </Descriptions.Item>
            )}
            {report.labName && (
              <Descriptions.Item label="Lab">
                {report.labName}
              </Descriptions.Item>
            )}
          </Descriptions>

          <Divider />

          {/* Results Section */}
          <div>
            <Title level={5}>
              <FileTextOutlined style={{ marginRight: 8 }} />
              Test Results
            </Title>
            {report.results && report.results !== 'Pending - Awaiting lab processing' ? (
              <div
                style={{
                  padding: 16,
                  backgroundColor: '#f5f5f5',
                  borderRadius: 8,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                }}
              >
                <Paragraph style={{ margin: 0 }}>{report.results}</Paragraph>
              </div>
            ) : (
              <Alert
                message="Results Not Available"
                description="Test results are not yet available. Please check back later."
                type="info"
                showIcon
              />
            )}
            {canInterpret && !interpretation && (
              <div style={{ marginTop: 12 }}>
                <Button
                  type="default"
                  icon={<BulbOutlined />}
                  onClick={handleExplainResults}
                  loading={interpretLoading}
                  disabled={interpretLoading}
                >
                  What do these results mean?
                </Button>
              </div>
            )}
          </div>

          {/* AI Interpretation */}
          {interpretError && (
            <Alert
              message="Could not generate explanation"
              description={interpretError}
              type="warning"
              showIcon
              style={{ marginTop: 8 }}
            />
          )}
          {(interpretation || isLoadingThisReport) && (
            <>
              <Divider />
              <div>
                <Title level={5}>
                  <BulbOutlined style={{ marginRight: 8 }} />
                  AI explanation
                </Title>
                {isLoadingThisReport ? (
                  <div style={{ padding: 16, textAlign: 'center' }}>
                    <Spin />
                  </div>
                ) : interpretation ? (
                  <div
                    style={{
                      padding: 16,
                      backgroundColor: '#f0f9ff',
                      borderRadius: 8,
                    }}
                    className="lab-interpretation-content"
                  >
                    {interpretation.endsWith(DISCLAIMER) ? (
                      <>
                        <ReactMarkdown
                          components={{
                            h1: ({ children }) => <Title level={5} style={{ margin: '0 0 8px' }}>{children}</Title>,
                            h2: ({ children }) => <Title level={5} style={{ margin: '16px 0 8px' }}>{children}</Title>,
                            h3: ({ children }) => <Text strong style={{ display: 'block', margin: '12px 0 4px' }}>{children}</Text>,
                            p: ({ children }) => <Paragraph style={{ marginBottom: 8 }}>{children}</Paragraph>,
                            strong: ({ children }) => <Text strong>{children}</Text>,
                          }}
                        >
                          {interpretation.slice(0, -DISCLAIMER.length).trim()}
                        </ReactMarkdown>
                        <Paragraph style={{ margin: '12px 0 0', color: '#cf1322', fontWeight: 500 }}>
                          {DISCLAIMER}
                        </Paragraph>
                      </>
                    ) : (
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => <Title level={5} style={{ margin: '0 0 8px' }}>{children}</Title>,
                          h2: ({ children }) => <Title level={5} style={{ margin: '16px 0 8px' }}>{children}</Title>,
                          h3: ({ children }) => <Text strong style={{ display: 'block', margin: '12px 0 4px' }}>{children}</Text>,
                          p: ({ children }) => <Paragraph style={{ marginBottom: 8 }}>{children}</Paragraph>,
                          strong: ({ children }) => <Text strong>{children}</Text>,
                        }}
                      >
                        {interpretation}
                      </ReactMarkdown>
                    )}
                  </div>
                ) : null}
              </div>
            </>
          )}

          {/* Normal Ranges */}
          {report.normalRanges && (
            <>
              <Divider />
              <div>
                <Title level={5}>Normal Ranges</Title>
                <div
                  style={{
                    padding: 16,
                    backgroundColor: '#e6f7ff',
                    borderRadius: 8,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  <Paragraph style={{ margin: 0 }}>{report.normalRanges}</Paragraph>
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {report.notes && (
            <>
              <Divider />
              <div>
                <Title level={5}>Notes</Title>
                <div
                  style={{
                    padding: 16,
                    backgroundColor: '#fffbe6',
                    borderRadius: 8,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  <Paragraph style={{ margin: 0 }}>{report.notes}</Paragraph>
                </div>
              </div>
            </>
          )}

          {/* Report URL */}
          {report.reportUrl && (
            <>
              <Divider />
              <div>
                <Title level={5}>Attached Report</Title>
                <Button
                  type="link"
                  icon={<DownloadOutlined />}
                  onClick={() => window.open(report.reportUrl, '_blank')}
                >
                  View/Download PDF
                </Button>
              </div>
            </>
          )}
        </Space>
      )}
    </Modal>
  );
}

