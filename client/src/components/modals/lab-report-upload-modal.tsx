import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Select,
  DatePicker,
  Space,
  Typography,
  Upload,
  message,
  Row,
  Col,
  Tag,
} from 'antd';
import {
  UploadOutlined,
  FileTextOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

const { TextArea } = Input;
const { Title, Text } = Typography;
const { Option } = Select;

interface LabReportUploadModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  report?: any; // For editing existing reports
}

export default function LabReportUploadModal({
  open,
  onCancel,
  onSuccess,
  report,
}: LabReportUploadModalProps) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [fileList, setFileList] = useState<any[]>([]);

  // Fetch patients for selection
  const { data: patientsData } = useQuery({
    queryKey: ['/api/patients'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/patients', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) return { patients: [] };
      return response.json();
    },
  });

  const patients = Array.isArray(patientsData?.patients) 
    ? patientsData.patients 
    : Array.isArray(patientsData) 
      ? patientsData 
      : [];

  // Fetch doctors for selection
  const { data: doctorsData } = useQuery({
    queryKey: ['/api/doctors'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/doctors', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) return { doctors: [] };
      return response.json();
    },
  });

  const doctors = Array.isArray(doctorsData?.doctors)
    ? doctorsData.doctors
    : Array.isArray(doctorsData)
      ? doctorsData
      : [];

  useEffect(() => {
    if (open) {
      if (report) {
        // Edit mode - populate form with existing data
        form.setFieldsValue({
          patientId: report.patientId,
          doctorId: report.doctorId,
          testName: report.testName,
          testType: report.testType,
          results: report.results,
          normalRanges: report.normalRanges,
          reportDate: report.reportDate ? dayjs(report.reportDate) : dayjs(),
          notes: report.notes,
          status: report.status || 'pending',
        });
      } else {
        // New report - reset form
        form.resetFields();
        form.setFieldsValue({
          reportDate: dayjs(),
          status: 'pending',
        });
      }
      setFileList([]);
    }
  }, [open, report, form]);

  const uploadMutation = useMutation({
    mutationFn: async (values: any) => {
      const token = localStorage.getItem('auth-token');
      const payload = {
        ...values,
        reportDate: values.reportDate ? values.reportDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        reportUrl: fileList.length > 0 ? fileList[0].url : undefined,
      };

      const url = report 
        ? `/api/labs/reports/${report.id}` 
        : '/api/labs/reports';
      const method = report ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save lab report');
      }

      return response.json();
    },
    onSuccess: () => {
      message.success(report ? 'Lab report updated successfully' : 'Lab report uploaded successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/lab-reports/my'] });
      queryClient.invalidateQueries({ queryKey: ['/api/labs/me/reports'] });
      form.resetFields();
      setFileList([]);
      onSuccess?.();
      onCancel();
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to save lab report');
    },
  });

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      uploadMutation.mutate(values);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleFileUpload = (info: any) => {
    let newFileList = [...info.fileList];
    // Limit to 1 file
    newFileList = newFileList.slice(-1);
    setFileList(newFileList);

    if (info.file.status === 'done') {
      message.success(`${info.file.name} file uploaded successfully`);
    } else if (info.file.status === 'error') {
      message.error(`${info.file.name} file upload failed.`);
    }
  };

  const testTypes = [
    'Blood Test',
    'Urine Test',
    'X-Ray',
    'CT Scan',
    'MRI',
    'Ultrasound',
    'ECG',
    'Biopsy',
    'Culture',
    'Other',
  ];

  return (
    <Modal
      title={
        <Space>
          <ExperimentOutlined style={{ fontSize: '20px', color: '#0EA5E9' }} />
          <span>{report ? 'Edit Lab Report' : 'Upload Lab Report'}</span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      width={700}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleSubmit}
          loading={uploadMutation.isPending}
          icon={<UploadOutlined />}
        >
          {report ? 'Update Report' : 'Upload Report'}
        </Button>,
      ]}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="patientId"
              label="Patient"
              rules={[{ required: true, message: 'Please select a patient' }]}
            >
              <Select
                placeholder="Select patient"
                showSearch
                filterOption={(input, option) =>
                  (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {patients.map((patient: any) => (
                  <Option key={patient.id} value={patient.id}>
                    {patient.fullName || patient.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="doctorId"
              label="Requesting Doctor (Optional)"
            >
              <Select
                placeholder="Select doctor"
                allowClear
                showSearch
                filterOption={(input, option) =>
                  (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {doctors.map((doctor: any) => (
                  <Option key={doctor.id} value={doctor.id}>
                    {doctor.fullName || doctor.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="testName"
              label="Test Name"
              rules={[{ required: true, message: 'Please enter test name' }]}
            >
              <Input placeholder="e.g., Complete Blood Count" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="testType"
              label="Test Type"
              rules={[{ required: true, message: 'Please select test type' }]}
            >
              <Select placeholder="Select test type">
                {testTypes.map((type) => (
                  <Option key={type} value={type}>
                    {type}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="results"
          label="Results"
          rules={[{ required: true, message: 'Please enter test results' }]}
        >
          <TextArea
            rows={4}
            placeholder="Enter test results, values, and findings..."
          />
        </Form.Item>

        <Form.Item
          name="normalRanges"
          label="Normal Ranges (Optional)"
        >
          <Input placeholder="e.g., 4.0-11.0 x 10^9/L" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="reportDate"
              label="Report Date"
              rules={[{ required: true, message: 'Please select report date' }]}
            >
              <DatePicker
                style={{ width: '100%' }}
                format="YYYY-MM-DD"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="status"
              label="Status"
              rules={[{ required: true, message: 'Please select status' }]}
            >
              <Select>
                <Option value="pending">
                  <Tag color="orange">Pending</Tag>
                </Option>
                <Option value="processing">
                  <Tag color="blue">Processing</Tag>
                </Option>
                <Option value="ready">
                  <Tag color="green">Ready</Tag>
                </Option>
                <Option value="completed">
                  <Tag color="green">Completed</Tag>
                </Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="notes"
          label="Notes (Optional)"
        >
          <TextArea
            rows={2}
            placeholder="Additional notes or observations..."
          />
        </Form.Item>

        <Form.Item
          label="Upload Report File (Optional)"
        >
          <Upload
            fileList={fileList}
            onChange={handleFileUpload}
            beforeUpload={() => false} // Prevent auto upload
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>Select File</Button>
          </Upload>
          <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
            Supported formats: PDF, JPG, PNG (Max 10MB)
          </Text>
        </Form.Item>
      </Form>
    </Modal>
  );
}

