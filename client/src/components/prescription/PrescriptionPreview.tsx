import React from 'react';
import { Typography, Divider, Table } from 'antd';
import dayjs from 'dayjs';
import type { Medication } from '../../../shared/schema';

const { Text, Title } = Typography;

interface PrescriptionPreviewProps {
  hospitalName?: string;
  hospitalAddress?: string;
  hospitalPhone?: string;
  hospitalTiming?: string;
  hospitalClosed?: string;
  doctorName?: string;
  doctorQualification?: string;
  doctorRegNo?: string;
  patientId?: number;
  patientName?: string;
  patientGender?: string;
  patientAge?: number;
  patientMobile?: string;
  patientAddress?: string;
  weight?: number;
  height?: number;
  bmi?: number;
  bp?: string;
  date: string | Date;
  chiefComplaints?: string[];
  clinicalFindings?: string[];
  diagnosis?: string;
  medications: Medication[];
  labTests?: Array<{ testName: string; testType?: string }>;
  advice?: string[];
  followUpDate?: string | Date;
}

export const PrescriptionPreview: React.FC<PrescriptionPreviewProps> = ({
  hospitalName = 'SMS Hospital',
  hospitalAddress = 'B/503, Business Center, MG Road, Pune - 411000.',
  hospitalPhone = 'Ph: 5465647658',
  hospitalTiming = '09:00 AM - 01:00 PM, 06:00 PM - 08:00 PM',
  hospitalClosed = 'Sunday',
  doctorName = 'Dr. Unknown',
  doctorQualification = 'M.S.',
  doctorRegNo = 'MMC 2018',
  patientId,
  patientName = 'Patient',
  patientGender = 'M',
  patientAge,
  patientMobile,
  patientAddress,
  weight,
  height,
  bmi,
  bp,
  date,
  chiefComplaints = [],
  clinicalFindings = [],
  diagnosis,
  medications = [],
  labTests = [],
  advice = [],
  followUpDate,
}) => {
  // Calculate BMI if weight and height are provided
  const calculatedBMI = bmi || (weight && height ? (weight / ((height / 100) ** 2)).toFixed(2) : null);

  // Format date
  const formattedDate = dayjs(date).format('DD-MMM-YYYY');
  const formattedFollowUp = followUpDate ? dayjs(followUpDate).format('DD-MM-YYYY') : null;

  // Parse dosage format (e.g., "1-0-1" means morning-afternoon-night)
  // The dosage format can be in frequency field (like "1-0-1") or in dosage field
  const parseDosage = (dosage: string, frequency?: string): string => {
    // First check frequency field for "1-0-1" format
    if (frequency) {
      const frequencyPattern = /^(\d+)-(\d+)-(\d+)$/;
      const freqMatch = frequency.match(frequencyPattern);
      
      if (freqMatch) {
        const [, morning, afternoon, night] = freqMatch;
        const parts: string[] = [];
        
        if (morning !== '0') parts.push(`${morning} Morning`);
        if (afternoon !== '0') parts.push(`${afternoon} Afternoon`);
        if (night !== '0') parts.push(`${night} Night`);
        
        return parts.join(', ');
      }
    }
    
    // Then check dosage field for "1-0-1" format
    if (dosage) {
      const dosagePattern = /^(\d+)-(\d+)-(\d+)$/;
      const match = dosage.match(dosagePattern);
      
      if (match) {
        const [, morning, afternoon, night] = match;
        const parts: string[] = [];
        
        if (morning !== '0') parts.push(`${morning} Morning`);
        if (afternoon !== '0') parts.push(`${afternoon} Afternoon`);
        if (night !== '0') parts.push(`${night} Night`);
        
        return parts.join(', ');
      }
    }
    
    // If not in that format, return as is or combine with frequency
    if (frequency && dosage) {
      return `${dosage} ${frequency}`;
    }
    
    return dosage || frequency || '';
  };

  // Calculate total tablets/capsules
  const calculateTotal = (med: Medication): number => {
    const duration = med.duration || '';
    const durationMatch = duration.match(/(\d+)\s*days?/i);
    const days = durationMatch ? parseInt(durationMatch[1]) : 0;
    
    // Check frequency field first for "1-0-1" format
    const frequency = med.frequency || '';
    const frequencyMatch = frequency.match(/^(\d+)-(\d+)-(\d+)$/);
    
    if (frequencyMatch) {
      const [, morning, afternoon, night] = frequencyMatch;
      const perDay = parseInt(morning) + parseInt(afternoon) + parseInt(night);
      return perDay * days;
    }
    
    // Then check dosage field
    const dosage = med.dosage || '';
    const dosageMatch = dosage.match(/^(\d+)-(\d+)-(\d+)$/);
    
    if (dosageMatch) {
      const [, morning, afternoon, night] = dosageMatch;
      const perDay = parseInt(morning) + parseInt(afternoon) + parseInt(night);
      return perDay * days;
    }
    
    // Fallback: try to extract number from frequency
    const freqMatch = med.frequency?.match(/(\d+)/);
    const perDay = freqMatch ? parseInt(freqMatch[1]) : 1;
    return perDay * days;
  };

  const medicationColumns = [
    {
      title: 'Medicine Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Medication) => (
        <div>
          <Text strong>{text}</Text>
          {record.unit && (
            <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: 2 }}>
              {record.unit.toUpperCase()}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Dosage',
      key: 'dosage',
      render: (_: any, record: Medication) => {
        const dosageText = parseDosage(record.dosage || '', record.frequency);
        const timing = record.timing ? ` (${record.timing})` : '';
        // If dosageText is empty, show frequency as fallback
        const displayText = dosageText || record.frequency || '';
        return <Text>{displayText}{timing}</Text>;
      },
    },
    {
      title: 'Duration',
      key: 'duration',
      render: (_: any, record: Medication) => {
        const duration = record.duration || '';
        const total = calculateTotal(record);
        const medType = record.name?.toUpperCase().includes('CAP') ? 'Cap' : 'Tab';
        return (
          <Text>
            {duration} (Tot: {total} {medType})
          </Text>
        );
      },
    },
  ];

  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif',
      padding: '20px',
      background: '#fff',
      maxWidth: '800px',
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        {/* Left: Doctor Info */}
        <div style={{ flex: 1 }}>
          <Text strong style={{ fontSize: '16px' }}>{doctorName}</Text>
          <br />
          <Text style={{ fontSize: '14px' }}>{doctorQualification}</Text>
          <br />
          <Text style={{ fontSize: '12px' }}>Reg. No: {doctorRegNo}</Text>
        </div>

        {/* Center: Hospital Logo/Icon */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            margin: '0 auto',
            background: '#1890ff',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '24px',
            fontWeight: 'bold',
          }}>
            ╬
          </div>
        </div>

        {/* Right: Hospital Info */}
        <div style={{ flex: 1, textAlign: 'right' }}>
          <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>{hospitalName}</Text>
          <br />
          <Text style={{ fontSize: '12px' }}>{hospitalAddress}</Text>
          <br />
          <Text style={{ fontSize: '12px' }}>{hospitalPhone}</Text>
          <br />
          <Text style={{ fontSize: '12px' }}>{hospitalTiming}</Text>
          <br />
          <Text style={{ fontSize: '12px' }}>Closed: {hospitalClosed}</Text>
        </div>
      </div>

      <Divider style={{ margin: '10px 0' }} />

      {/* Patient and Date */}
      <div style={{ marginBottom: '15px' }}>
        <div style={{ textAlign: 'right', marginBottom: '10px' }}>
          <Text style={{ fontSize: '14px' }}>Date: {formattedDate}</Text>
        </div>
        <div>
          <Text style={{ fontSize: '14px' }}>
            ID: {patientId} - {patientName?.toUpperCase()} ({patientGender}) / {patientAge} Y
          </Text>
          <br />
          {patientMobile && (
            <>
              <Text style={{ fontSize: '14px' }}>Mob. No.: {patientMobile}</Text>
              <br />
            </>
          )}
          {patientAddress && (
            <>
              <Text style={{ fontSize: '14px' }}>Address: {patientAddress}</Text>
              <br />
            </>
          )}
          {(weight || height || calculatedBMI || bp) && (
            <Text style={{ fontSize: '14px' }}>
              Weight (Kg): {weight || 'N/A'}, Height (Cm): {height || 'N/A'}
              {calculatedBMI && ` (B.M.I. = ${calculatedBMI})`}
              {bp && `, BP: ${bp} mmHg`}
            </Text>
          )}
        </div>
      </div>

      <Divider style={{ margin: '10px 0' }} />

      {/* Medical Information */}
      <div style={{ marginBottom: '15px' }}>
        {/* Chief Complaints */}
        {chiefComplaints.length > 0 && (
          <div style={{ marginBottom: '10px' }}>
            <Text strong style={{ fontSize: '14px' }}>Chief Complaints:</Text>
            <br />
            {chiefComplaints.map((complaint, idx) => (
              <Text key={idx} style={{ fontSize: '14px', display: 'block' }}>
                * {complaint.toUpperCase()}
              </Text>
            ))}
          </div>
        )}

        {/* Clinical Findings */}
        {clinicalFindings.length > 0 && (
          <div style={{ marginBottom: '10px' }}>
            <Text strong style={{ fontSize: '14px' }}>Clinical Findings:</Text>
            <br />
            {clinicalFindings.map((finding, idx) => (
              <Text key={idx} style={{ fontSize: '14px', display: 'block' }}>
                * {finding.toUpperCase()}
              </Text>
            ))}
          </div>
        )}

        {/* Diagnosis */}
        {diagnosis && (
          <div style={{ marginBottom: '10px' }}>
            <Text strong style={{ fontSize: '14px' }}>Diagnosis:</Text>
            <br />
            <Text style={{ fontSize: '14px' }}>* {diagnosis.toUpperCase()}</Text>
          </div>
        )}

        {/* Prescription (R) */}
        {medications.length > 0 && (
          <div style={{ marginTop: '15px', marginBottom: '10px' }}>
            <Text strong style={{ fontSize: '14px' }}>R</Text>
            <Table
              dataSource={medications.map((med, idx) => ({ ...med, key: idx }))}
              columns={medicationColumns}
              pagination={false}
              size="small"
              style={{ marginTop: '10px' }}
            />
          </div>
        )}

        {/* Lab Tests */}
        {labTests.length > 0 && (
          <div style={{ marginTop: '15px', marginBottom: '10px' }}>
            <Text strong style={{ fontSize: '14px' }}>Lab Tests Recommended:</Text>
            <br />
            {labTests.map((test, idx) => (
              <Text key={idx} style={{ fontSize: '14px', display: 'block' }}>
                * {test.testName} {test.testType ? `(${test.testType})` : ''}
              </Text>
            ))}
          </div>
        )}

        {/* Advice */}
        {advice.length > 0 && (
          <div style={{ marginTop: '15px', marginBottom: '10px' }}>
            <Text strong style={{ fontSize: '14px' }}>Advice:</Text>
            <br />
            {advice.map((item, idx) => (
              <Text key={idx} style={{ fontSize: '14px', display: 'block' }}>
                * {item.toUpperCase()}
              </Text>
            ))}
          </div>
        )}

        {/* Follow Up */}
        {formattedFollowUp && (
          <div style={{ marginTop: '15px' }}>
            <Text strong style={{ fontSize: '14px' }}>Follow Up: </Text>
            <Text style={{ fontSize: '14px' }}>{formattedFollowUp}</Text>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '11px', color: '#666' }}>
        <Text>Substitute with equivalent Generics as required.</Text>
      </div>
    </div>
  );
};
