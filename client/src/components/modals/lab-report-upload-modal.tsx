import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Select,
  Space,
  Typography,
  Upload,
  message,
  Row,
  Col,
  Table,
} from 'antd';
import {
  UploadOutlined,
  ExperimentOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Text } = Typography;
const { Option } = Select;

/** Parse "min-max" or "min - max" from range text; return null if not found. */
function parseRange(rangeStr: string | undefined): { min: number; max: number } | null {
  if (!rangeStr || typeof rangeStr !== 'string') return null;
  const m = rangeStr.match(/(\d*\.?\d+)\s*[-–]\s*(\d*\.?\d+)/);
  if (!m) return null;
  const min = parseFloat(m[1]);
  const max = parseFloat(m[2]);
  if (Number.isNaN(min) || Number.isNaN(max)) return null;
  return { min, max };
}

/** Return true if numeric value is outside the parsed range (or no range). */
function isValueOutOfRange(value: string | number | undefined, rangeStr: string | undefined): boolean {
  if (value === undefined || value === null || value === '') return false;
  const num = typeof value === 'string' ? parseFloat(value.trim()) : value;
  if (Number.isNaN(num)) return false;
  const range = parseRange(rangeStr);
  if (!range) return false;
  return num < range.min || num > range.max;
}

function ValueInputWithRangeHighlight({
  normalRange,
  placeholder,
  name,
  ...rest
}: { normalRange?: string; placeholder?: string; name?: any } & Omit<React.ComponentProps<typeof Input>, 'name'>) {
  const form = Form.useFormInstance();
  const value = Form.useWatch(name, form);
  const outOfRange = isValueOutOfRange(value, normalRange);
  return (
    <Input
      {...rest}
      placeholder={placeholder}
      style={{
        ...rest.style,
        backgroundColor: outOfRange ? '#FEE2E2' : undefined,
        borderColor: outOfRange ? '#EF4444' : undefined,
      }}
    />
  );
}

type ResultTemplateParam = {
  id: number;
  parameterName: string;
  unit?: string;
  normalRange?: string;
  sortOrder: number;
  isRequired: boolean;
  referenceRangesByGroup?: Array<{ group: string; unit?: string; normalRange: string }>;
};

type ResultTemplate = {
  labTest: { id: number; name: string; code?: string; category?: string };
  parameters: ResultTemplateParam[];
};

/** Get reference range string for a parameter based on patient gender (from referenceRangesByGroup). */
function getRangeForGender(
  param: ResultTemplateParam,
  gender: string | null | undefined
): string | undefined {
  const groups = param.referenceRangesByGroup;
  if (!groups?.length || !gender) return param.normalRange;
  const g = String(gender).trim().toLowerCase();
  const match = groups.find(
    (r) => String(r.group || '').trim().toLowerCase() === g
  );
  if (match) return match.normalRange;
  return param.normalRange;
}

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Processing', value: 'processing' },
  { label: 'Ready', value: 'ready' },
  { label: 'Completed', value: 'completed' },
] as const;

/** Segmented control with a sliding pill that moves to the selected option (Figma-style). */
function StatusSegmentedWithPill({ value, onChange }: { value?: string; onChange?: (v: string) => void }) {
  const status = value || 'pending';
  const index = Math.max(0, STATUS_OPTIONS.findIndex((o) => o.value === status));
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        background: '#F9FAFB',
        padding: 4,
        borderRadius: 8,
        width: '100%',
      }}
    >
      {/* Sliding pill */}
      <div
        style={{
          position: 'absolute',
          top: 4,
          bottom: 4,
          left: `calc(${index * 25}% + 4px)`,
          width: 'calc(25% - 8px)',
          background: '#8B5CF6',
          borderRadius: 6,
          transition: 'left 0.25s ease',
          pointerEvents: 'none',
        }}
      />
      {STATUS_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange?.(opt.value)}
          style={{
            flex: 1,
            padding: '8px 16px',
            border: 'none',
            background: 'transparent',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 500,
            color: status === opt.value ? '#fff' : '#6B7280',
            cursor: 'pointer',
            position: 'relative',
            zIndex: 1,
            transition: 'color 0.2s ease',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

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

  const watchedTestName = Form.useWatch('testName', form);
  const watchedPatientId = Form.useWatch('patientId', form);
  const testName = report?.testName ?? watchedTestName;
  const testNameStr = typeof testName === 'string' ? testName.trim() : '';

  // Fetch lab test catalog (to resolve test name -> catalog id for template)
  const { data: labTestsList = [] } = useQuery({
    queryKey: ['/api/lab-tests'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const res = await fetch('/api/lab-tests', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: open && !!testNameStr,
  });

  const catalogId = useMemo(() => {
    if (!testNameStr) return null;
    const match = (labTestsList as any[]).find((t: any) => (t.name || '').trim() === testNameStr);
    return match?.id ?? null;
  }, [labTestsList, testNameStr]);

  const { data: resultTemplate, isLoading: templateLoading } = useQuery({
    queryKey: ['/api/lab-tests', catalogId, 'result-template'],
    queryFn: async (): Promise<ResultTemplate> => {
      const token = localStorage.getItem('auth-token');
      const res = await fetch(`/api/lab-tests/${catalogId}/result-template`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch template');
      return res.json();
    },
    enabled: open && !!catalogId,
  });

  const hasTemplate = !!(resultTemplate?.parameters?.length);
  const templateParams = resultTemplate?.parameters ?? [];

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

  // Resolve patient gender for gender-specific reference ranges (must be after patients is defined)
  const selectedPatient = useMemo(() => {
    const id = report ? report.patientId : watchedPatientId;
    if (id == null) return null;
    return (patients as any[]).find((p: any) => p.id === id) ?? null;
  }, [report?.patientId, watchedPatientId, patients]);
  const patientGender = selectedPatient?.gender ?? null;

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
        form.resetFields();
        form.setFieldsValue({
          status: 'pending',
        });
      }
      setFileList([]);
    }
  }, [open, report, form]);

  // When result template loads, set parameterResults initial values (and try to parse report.results when editing)
  useEffect(() => {
    if (!open || !hasTemplate || templateParams.length === 0) return;
    const existing = form.getFieldValue('parameterResults');
    if (Array.isArray(existing) && existing.length === templateParams.length) return;
    const resultsStr = report?.results;
    const parsed: Record<string, string> = {};
    if (typeof resultsStr === 'string') {
      resultsStr.split(/\n/).forEach((line) => {
        const m = line.match(/^([^:]+):\s*(.+)$/);
        if (m) parsed[m[1].trim()] = m[2].trim();
      });
    }
    const next = templateParams.map((p, i) => ({
      parameterName: p.parameterName,
      resultValue: parsed[p.parameterName] ?? '',
      unit: p.unit ?? '',
      normalRange: p.normalRange ?? '',
    }));
    form.setFieldsValue({ parameterResults: next });
  }, [open, hasTemplate, templateParams, report?.results, form]);

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
      if (hasTemplate && values.parameterResults) {
        const lines = (values.parameterResults as any[])
          .filter((r: any) => r?.resultValue != null && String(r.resultValue).trim() !== '')
          .map((r: any, idx: number) => {
            const param = templateParams[idx];
            const effectiveRange = param ? getRangeForGender(param, patientGender) : r.normalRange;
            const u = r.unit ? ` ${r.unit}` : '';
            const ref = effectiveRange ? ` (ref: ${effectiveRange})` : '';
            return `${r.parameterName}: ${String(r.resultValue).trim()}${u}${ref}`;
          });
        if (lines.length === 0) {
          message.warning('Enter at least one result value.');
          return;
        }
        uploadMutation.mutate({
          ...values,
          results: lines.join('\n'),
          normalRanges: templateParams.map((p) => getRangeForGender(p, patientGender) || '').filter(Boolean).join('; ') || values.normalRanges,
          parameterResults: undefined,
        });
      } else {
        uploadMutation.mutate(values);
      }
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


  const isEditing = !!report;
  return (
    <Modal
      className="lab-report-upload-modal"
      title={null}
      open={open}
      onCancel={onCancel}
      width={1152}
      footer={null}
      destroyOnHidden
      closable={false}
      styles={{
        content: {
          background: '#FFFFFF',
          backgroundColor: '#FFFFFF',
          padding: 0,
          height: '90vh',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
        body: {
          padding: 0,
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
      }}
    >
      {/* Figma: Custom header — fixed, no shrink */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 12px 8px', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, background: '#F5F3FF', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ExperimentOutlined style={{ fontSize: 20, color: '#A78BFA' }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#262626' }}>
              {isEditing ? 'Edit Lab Report' : 'Upload Lab Report'}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 14, color: '#6B7280' }}>
              {isEditing ? 'Update test results and status' : 'Create a new lab report'}
            </p>
          </div>
        </div>
        <Button type="text" onClick={onCancel} style={{ width: 40, height: 40 }} icon={<CloseOutlined style={{ fontSize: 18, color: '#6B7280' }} />} />
      </div>
      {/* Scrollable body — only this area scrolls */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px' }}>
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
      >
        <Row gutter={24}>
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

        <Row gutter={24}>
          <Col span={report ? 12 : 24}>
            <Form.Item
              name="testName"
              label="Test Name"
              rules={[{ required: true, message: 'Please enter test name' }]}
            >
              <Input 
                placeholder="e.g., Complete Blood Count" 
                disabled={!!report}
                readOnly={!!report}
                style={{ background: report ? '#F9FAFB' : undefined }}
              />
            </Form.Item>
          </Col>
          {report && (
            <Col span={12}>
              <Form.Item label="Report Date">
                <Input 
                  value={report.reportDate ? dayjs(report.reportDate).format('YYYY-MM-DD HH:mm') : 'N/A'} 
                  disabled 
                  readOnly
                  style={{ background: '#F9FAFB' }}
                />
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
                  Report date is set when submitted
                </Text>
              </Form.Item>
            </Col>
          )}
        </Row>

        {templateLoading ? (
          <div style={{ padding: '12px 0', color: '#8c8c8c' }}>Loading result template…</div>
        ) : hasTemplate ? (
          <>
            {templateParams.map((p, index) => (
              <Form.Item key={`hidden-${p.id}`} name={['parameterResults', index, 'parameterName']} hidden>
                <Input />
              </Form.Item>
            ))}
            {templateParams.map((p, index) => (
              <Form.Item key={`unit-${p.id}`} name={['parameterResults', index, 'unit']} hidden>
                <Input />
              </Form.Item>
            ))}
            {templateParams.map((p, index) => (
              <Form.Item key={`range-${p.id}`} name={['parameterResults', index, 'normalRange']} hidden>
                <Input />
              </Form.Item>
            ))}
            <Form.Item name="normalRanges" hidden><Input /></Form.Item>
            <div className="lab-report-params-table-wrapper" style={{ marginBottom: 24, border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
            <Table
              size="small"
              pagination={false}
              bordered={false}
              rowKey={(_, i) => String(i)}
              dataSource={templateParams.map((p, index) => ({ ...p, index }))}
              style={{ border: 'none' }}
              columns={[
                {
                  title: 'Parameter',
                  key: 'parameter',
                  width: 180,
                  render: (_: any, row: ResultTemplateParam & { index: number }) => (
                    <span>
                      <Text strong>{row.parameterName}</Text>
                      {row.unit && <Text type="secondary" style={{ marginLeft: 6, fontSize: 12 }}>({row.unit})</Text>}
                    </span>
                  ),
                },
                {
                  title: 'Reference Range',
                  key: 'range',
                  width: 220,
                  render: (_: any, row: ResultTemplateParam) => (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {getRangeForGender(row, patientGender) || '—'}
                    </Text>
                  ),
                },
                {
                  title: 'Value',
                  key: 'value',
                  render: (_: any, row: ResultTemplateParam & { index: number }) => {
                    const index = row.index;
                    const effectiveRange = getRangeForGender(row, patientGender);
                    return (
                      <Form.Item
                        name={['parameterResults', index, 'resultValue']}
                        rules={row.isRequired ? [{ required: true, message: `Enter ${row.parameterName}` }] : undefined}
                        style={{ marginBottom: 0 }}
                      >
                        <ValueInputWithRangeHighlight
                          name={['parameterResults', index, 'resultValue']}
                          placeholder={row.unit ? `in ${row.unit}` : 'Enter value'}
                          normalRange={effectiveRange}
                        />
                      </Form.Item>
                    );
                  },
                },
              ]}
            />
            </div>
            <style>{`
              .lab-report-params-table-wrapper .ant-table-thead > tr > th {
                border-bottom: 1px solid #E5E7EB;
                background: #F9FAFB;
                border-inline: none !important;
              }
              .lab-report-params-table-wrapper .ant-table-tbody > tr > td {
                border-bottom: 1px solid #E5E7EB;
                border-inline: none !important;
              }
              .lab-report-params-table-wrapper .ant-table-tbody > tr:last-child > td {
                border-bottom: none;
              }
              .lab-report-params-table-wrapper .ant-table-container {
                border: none;
              }
              .lab-report-params-table-wrapper table {
                border: none;
              }
            `}</style>
          </>
        ) : (
          <>
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
          </>
        )}

        <Form.Item
          name="status"
          label="Status"
          rules={[{ required: true, message: 'Please select status' }]}
        >
          <StatusSegmentedWithPill />
        </Form.Item>

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
            PDF, JPG, PNG (max 10MB)
          </Text>
        </Form.Item>
      </Form>
      </div>
      {/* Figma: Footer — fixed, no shrink */}
      <div style={{ flexShrink: 0, padding: '16px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <Button onClick={onCancel} style={{ color: '#6B7280', fontWeight: 500 }}>
          Cancel
        </Button>
        <Button
          type="primary"
          onClick={() => form.submit()}
          loading={uploadMutation.isPending}
          icon={<UploadOutlined />}
          style={{ background: '#8B5CF6', borderColor: '#8B5CF6', borderRadius: 8, fontWeight: 500 }}
        >
          {isEditing ? 'Update Report' : 'Upload Report'}
        </Button>
      </div>
    </Modal>
  );
}

