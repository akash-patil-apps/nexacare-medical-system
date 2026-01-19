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
        // Use patientName/doctorName from report if available, otherwise use IDs
        form.setFieldsValue({
          patientId: report.patientId,
          doctorId: report.doctorId,
          testName: report.testName,
          results: report.results,
          normalRanges: report.normalRanges,
          notes: report.notes,
          status: report.status || 'pending',
        });
      } else {
        // New report - reset form
        form.resetFields();
        form.setFieldsValue({
          status: 'pending',
        });
      }
      setFileList([]);
    }
  }, [open, report, form]);

  const uploadMutation = useMutation({
    mutationFn: async (values: any) => {
      const token = localStorage.getItem('auth-token');
      
      // When updating, only send fields that should be updated
      // When creating, include all fields including reportDate
      const payload = report 
        ? {
            // Only update these fields when editing
            results: values.results,
            normalRanges: values.normalRanges,
            notes: values.notes,
            status: values.status,
            // Don't update reportDate when editing - keep original
            // Don't update patientId, doctorId, testName - these are read-only
            ...(fileList.length > 0 && { reportUrl: fileList[0].url }),
          }
        : {
            // New report - include all fields
            patientId: values.patientId,
            doctorId: values.doctorId,
            testName: values.testName,
            results: values.results,
            normalRanges: values.normalRanges,
            notes: values.notes,
            status: values.status || 'pending',
            // Report date is automatically set to current date/time when submitted
            reportDate: dayjs().format('YYYY-MM-DD'),
            ...(fileList.length > 0 && { reportUrl: fileList[0].url }),
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
        let errorMessage = 'Failed to save lab report';
        try {
          const error = await response.json();
          errorMessage = error.message || error.error || errorMessage;
          console.error('Lab report update error:', error);
        } catch (e) {
          console.error('Failed to parse error response:', e);
        }
        throw new Error(errorMessage);
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
      destroyOnHidden
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
                disabled={!!report} // Disable when editing - patient cannot be changed
                filterOption={(input, option) =>
                  (option?.label as string)?.toLowerCase().includes(input.toLowerCase()) ||
                  (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                }
                optionLabelProp="label"
              >
                {patients.map((patient: any) => {
                  const patientName = patient.fullName || patient.name || `Patient #${patient.id}`;
                  // If editing and this is the report's patient, show name from report
                  const displayName = (report && report.patientId === patient.id && report.patientName) 
                    ? report.patientName 
                    : patientName;
                  return (
                    <Option key={patient.id} value={patient.id} label={displayName}>
                      {displayName}
                    </Option>
                  );
                })}
                {/* If report has patientName but patient not in list, add it */}
                {report?.patientName && !patients.find((p: any) => p.id === report.patientId) && (
                  <Option key={report.patientId} value={report.patientId} label={report.patientName}>
                    {report.patientName}
                  </Option>
                )}
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
                disabled={!!report} // Disable when editing - doctor cannot be changed
                filterOption={(input, option) =>
                  (option?.label as string)?.toLowerCase().includes(input.toLowerCase()) ||
                  (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                }
                optionLabelProp="label"
              >
                {doctors.map((doctor: any) => {
                  const doctorName = doctor.fullName || doctor.name || `Doctor #${doctor.id}`;
                  // If editing and this is the report's doctor, show name from report
                  const displayName = (report && report.doctorId === doctor.id && report.doctorName) 
                    ? report.doctorName 
                    : doctorName;
                  return (
                    <Option key={doctor.id} value={doctor.id} label={displayName}>
                      {displayName}
                    </Option>
                  );
                })}
                {/* If report has doctorName but doctor not in list, add it */}
                {report?.doctorName && report.doctorId && !doctors.find((d: any) => d.id === report.doctorId) && (
                  <Option key={report.doctorId} value={report.doctorId} label={report.doctorName}>
                    {report.doctorName}
                  </Option>
                )}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="testName"
          label="Test Name"
          rules={[{ required: true, message: 'Please enter test name' }]}
        >
          <Input 
            placeholder="e.g., Complete Blood Count" 
            disabled={!!report} // Make read-only when editing - test name should not be changed
            readOnly={!!report}
          />
        </Form.Item>

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

        <Form.Item
          name="status"
          label="Status"
          rules={[{ required: true, message: 'Please select status' }]}
          tooltip="Status indicates the current stage of the lab report processing workflow"
          extra={
            <div style={{ marginTop: 4, fontSize: '12px', color: '#8c8c8c' }}>
              <strong>Status Flow:</strong> Pending → Processing → Ready → Completed
              <br />
              <strong>Pending:</strong> Request received, awaiting processing
              <br />
              <strong>Processing:</strong> Sample is being analyzed
              <br />
              <strong>Ready:</strong> Results are ready for review
              <br />
              <strong>Completed:</strong> Report is finalized and sent to patient/doctor
            </div>
          }
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
        
        {report && (
          <Form.Item label="Report Date">
            <Input 
              value={report.reportDate ? dayjs(report.reportDate).format('YYYY-MM-DD HH:mm') : 'N/A'} 
              disabled 
              readOnly
            />
            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: 4 }}>
              Report date is automatically set when the report is submitted
            </Text>
          </Form.Item>
        )}

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

