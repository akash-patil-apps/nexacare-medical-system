import { useState } from 'react';
import { Modal, Button, Spin, Typography, Space } from 'antd';
import { FilePdfOutlined, DownloadOutlined, CloseOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface PDFViewerProps {
  url: string;
  title?: string;
  open?: boolean;
  onClose?: () => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  url,
  title = 'PDF Viewer',
  open: controlledOpen,
  onClose,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const handleClose = onClose || (() => setInternalOpen(false));

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = title || 'document.pdf';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      {controlledOpen === undefined && (
        <Button
          icon={<FilePdfOutlined />}
          onClick={() => setInternalOpen(true)}
        >
          View PDF
        </Button>
      )}

      <Modal
        title={
          <Space>
            <FilePdfOutlined />
            <span>{title}</span>
          </Space>
        }
        open={isOpen}
        onCancel={handleClose}
        width={900}
        footer={[
          <Button key="download" icon={<DownloadOutlined />} onClick={handleDownload}>
            Download
          </Button>,
          <Button key="close" onClick={handleClose}>
            Close
          </Button>,
        ]}
      >
        <div style={{ textAlign: 'center', minHeight: 600 }}>
          {loading && (
            <div style={{ padding: '100px 0' }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">Loading PDF...</Text>
              </div>
            </div>
          )}
          <iframe
            src={url}
            style={{
              width: '100%',
              height: 600,
              border: 'none',
              display: loading ? 'none' : 'block',
            }}
            onLoad={() => setLoading(false)}
            title={title}
          />
        </div>
      </Modal>
    </>
  );
};
