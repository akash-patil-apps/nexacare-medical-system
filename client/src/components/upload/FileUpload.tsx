import { useState } from 'react';
import { Upload, Button, message, Progress, Space, Typography } from 'antd';
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';

const { Text } = Typography;

interface FileUploadProps {
  folder?: string; // Optional folder for organizing uploads
  maxSize?: number; // Max file size in bytes (default: 5MB)
  accept?: string; // Accepted file types (e.g., '.pdf,.jpg,.png')
  onUploadSuccess?: (file: { url: string; key: string; filename: string; size: number; mimetype: string }) => void;
  onUploadError?: (error: string) => void;
  multiple?: boolean;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  folder = 'general',
  maxSize = 5 * 1024 * 1024, // 5MB default
  accept,
  onUploadSuccess,
  onUploadError,
  multiple = false,
  disabled = false,
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const handleUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError, onProgress } = options;
    const fileObj = file as File;

    // Validate file size
    if (fileObj.size > maxSize) {
      const errorMsg = `File size exceeds maximum allowed size of ${(maxSize / 1024 / 1024).toFixed(2)}MB`;
      message.error(errorMsg);
      onError?.(new Error(errorMsg) as any);
      return;
    }

    setUploading(true);

    try {
      const token = localStorage.getItem('auth-token');
      const formData = new FormData();
      formData.append('file', fileObj);
      if (folder) {
        formData.append('folder', folder);
      }

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setUploadProgress((prev) => ({
            ...prev,
            [fileObj.name]: percent,
          }));
          onProgress?.({ percent } as any);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          if (response.success) {
            message.success(`${fileObj.name} uploaded successfully`);
            onUploadSuccess?.(response.file);
            onSuccess?.(response, xhr as any);
            
            // Update file list
            setFileList((prev) =>
              prev.map((item) =>
                item.name === fileObj.name
                  ? {
                      ...item,
                      status: 'done',
                      url: response.file.url,
                      response: response,
                    }
                  : item
              )
            );
          } else {
            throw new Error(response.message || 'Upload failed');
          }
        } else {
          const error = JSON.parse(xhr.responseText || '{}');
          throw new Error(error.message || 'Upload failed');
        }
        setUploading(false);
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[fileObj.name];
          return newProgress;
        });
      });

      xhr.addEventListener('error', () => {
        const errorMsg = 'Upload failed. Please try again.';
        message.error(errorMsg);
        onError?.(new Error(errorMsg) as any);
        setUploading(false);
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[fileObj.name];
          return newProgress;
        });
      });

      xhr.open('POST', '/api/storage/upload');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    } catch (error: any) {
      console.error('Upload error:', error);
      const errorMsg = error.message || 'Upload failed';
      message.error(errorMsg);
      onError?.(error);
      onUploadError?.(errorMsg);
      setUploading(false);
    }
  };

  const handleRemove = (file: UploadFile) => {
    setFileList((prev) => prev.filter((item) => item.uid !== file.uid));
    setUploadProgress((prev) => {
      const newProgress = { ...prev };
      delete newProgress[file.name || ''];
      return newProgress;
    });
  };

  const uploadProps: UploadProps = {
    fileList,
    customRequest: handleUpload,
    onChange: ({ fileList: newFileList }) => {
      setFileList(newFileList);
    },
    onRemove: handleRemove,
    accept,
    multiple,
    disabled: disabled || uploading,
    beforeUpload: (file) => {
      // Validate file size before upload
      if (file.size > maxSize) {
        message.error(`File size exceeds maximum allowed size of ${(maxSize / 1024 / 1024).toFixed(2)}MB`);
        return Upload.LIST_IGNORE;
      }
      return true;
    },
  };

  return (
    <div>
      <Upload {...uploadProps}>
        <Button icon={<UploadOutlined />} disabled={disabled || uploading}>
          {uploading ? 'Uploading...' : 'Select File'}
        </Button>
      </Upload>
      
      {fileList.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {fileList.map((file) => (
            <div key={file.uid} style={{ marginBottom: 8 }}>
              <Space>
                <Text>{file.name}</Text>
                {uploadProgress[file.name || ''] !== undefined && (
                  <Progress
                    percent={uploadProgress[file.name || '']}
                    size="small"
                    style={{ width: 200 }}
                  />
                )}
                {file.status === 'done' && (
                  <Text type="success">✓ Uploaded</Text>
                )}
              </Space>
            </div>
          ))}
        </div>
      )}
      
      {maxSize && (
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
          Maximum file size: {(maxSize / 1024 / 1024).toFixed(2)}MB
        </Text>
      )}
    </div>
  );
};
