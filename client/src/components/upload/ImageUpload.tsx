import { useState } from 'react';
import { Upload, message, Space, Typography } from 'antd';
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import type { RcFile } from 'antd/es/upload';

const { Text } = Typography;

interface ImageUploadProps {
  folder?: string;
  maxSize?: number; // Max file size in bytes (default: 2MB)
  onUploadSuccess?: (file: { url: string; key: string; filename: string; size: number; mimetype: string }) => void;
  onUploadError?: (error: string) => void;
  value?: string; // Current image URL
  onChange?: (url: string | null) => void;
  disabled?: boolean;
  showPreview?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  folder = 'images',
  maxSize = 2 * 1024 * 1024, // 2MB default for images
  onUploadSuccess,
  onUploadError,
  value,
  onChange,
  disabled = false,
  showPreview = true,
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(value || null);

  const getBase64 = (file: RcFile): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });

  const handleUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options;
    const fileObj = file as File;

    // Validate file type
    if (!fileObj.type.startsWith('image/')) {
      const errorMsg = 'Only image files are allowed';
      message.error(errorMsg);
      onError?.(new Error(errorMsg) as any);
      return;
    }

    // Validate file size
    if (fileObj.size > maxSize) {
      const errorMsg = `Image size exceeds maximum allowed size of ${(maxSize / 1024 / 1024).toFixed(2)}MB`;
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

      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      const data = await response.json();
      if (data.success) {
        message.success('Image uploaded successfully');
        setPreviewImage(data.file.url);
        onChange?.(data.file.url);
        onUploadSuccess?.(data.file);
        onSuccess?.(data, response as any);
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      const errorMsg = error.message || 'Upload failed';
      message.error(errorMsg);
      onError?.(error);
      onUploadError?.(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setFileList([]);
    setPreviewImage(null);
    onChange?.(null);
  };

  const uploadProps: UploadProps = {
    fileList,
    customRequest: handleUpload,
    onChange: ({ fileList: newFileList }) => {
      setFileList(newFileList);
    },
    onRemove: handleRemove,
    accept: 'image/*',
    listType: 'picture-card',
    maxCount: 1,
    disabled: disabled || uploading,
    beforeUpload: async (file) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        message.error('Only image files are allowed');
        return Upload.LIST_IGNORE;
      }

      // Validate file size
      if (file.size > maxSize) {
        message.error(`Image size exceeds maximum allowed size of ${(maxSize / 1024 / 1024).toFixed(2)}MB`);
        return Upload.LIST_IGNORE;
      }

      // Show preview
      if (showPreview) {
        const preview = await getBase64(file as RcFile);
        setPreviewImage(preview);
      }

      return true;
    },
  };

  return (
    <div>
      <Upload {...uploadProps}>
        {(!previewImage && fileList.length === 0) && (
          <div>
            <UploadOutlined />
            <div style={{ marginTop: 8 }}>Upload</div>
          </div>
        )}
      </Upload>

      {previewImage && showPreview && (
        <div style={{ marginTop: 16 }}>
          <img
            src={previewImage}
            alt="Preview"
            style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }}
          />
        </div>
      )}

      {maxSize && (
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
          Maximum image size: {(maxSize / 1024 / 1024).toFixed(2)}MB
        </Text>
      )}
    </div>
  );
};
