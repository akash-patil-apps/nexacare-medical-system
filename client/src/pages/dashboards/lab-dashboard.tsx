import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Layout, 
  Card, 
  Row, 
  Col, 
  Button, 
  Table, 
  Tag, 
  Space, 
  Typography,
  Menu,
  message,
  Drawer,
  Spin,
  Select,
  Alert,
  Divider
} from 'antd';

const { Option } = Select;
import { 
  UserOutlined, 
  CalendarOutlined, 
  MedicineBoxOutlined, 
  FileTextOutlined,
  CheckCircleOutlined,
  ExperimentOutlined,
  UploadOutlined,
  FileSearchOutlined,
  BarChartOutlined,
  AlertOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { useResponsive } from '../../hooks/use-responsive';
import { KpiCard } from '../../components/dashboard/KpiCard';
import LabReportUploadModal from '../../components/modals/lab-report-upload-modal';
import { NotificationBell } from '../../components/notifications/NotificationBell';
import { subscribeToAppointmentEvents } from '../../lib/appointments-events';
import { getISTStartOfDay, isSameDayIST } from '../../lib/timezone';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;

const labTheme = {
  primary: '#0EA5E9', // Sky blue
  secondary: '#22C55E', // Green
  accent: '#F87171', // Red
  background: '#F0FAFF', // Light blue
  highlight: '#DFF3FF', // Lighter blue
};

export default function LabDashboard() {
  const { user, logout } = useAuth();
  const { isMobile, isTablet } = useResponsive();
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Auto-collapse sidebar on mobile/tablet
  useEffect(() => {
    if (isMobile || isTablet) {
      setCollapsed(true);
    }
  }, [isMobile, isTablet]);

  // Get lab reports from API
  const { data: labReportsData = [], isLoading: labReportsLoading } = useQuery({
    queryKey: ['/api/labs/me/reports'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/labs/me/reports', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        // If API not ready, return empty array
        console.log('⚠️ Lab reports API not ready yet');
        return [];
      }
      const data = await response.json();
      console.log('📋 Lab reports loaded:', data.length, 'reports');
      console.log('📋 Sample report data:', data[0] ? {
        id: data[0].id,
        patientId: data[0].patientId,
        patientName: data[0].patientName,
        testName: data[0].testName
      } : 'No reports');
      return data;
    },
    enabled: !!user,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Get lab profile to access lab name
  const { data: labProfile } = useQuery({
    queryKey: ['/api/labs/profile'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/labs/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        console.log('⚠️ Lab profile API not ready yet');
        return null;
      }
      return response.json();
    },
    enabled: !!user && user.role?.toUpperCase() === 'LAB',
  });

  // Get notifications for lab technician
  const { data: notifications = [], isLoading: notificationsLoading } = useQuery({
    queryKey: ['/api/notifications/me'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/notifications/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        console.log('⚠️ Notifications API not ready yet');
        return [];
      }
      return response.json();
    },
    enabled: !!user,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  // Real-time: subscribe to appointment events for notifications
  useEffect(() => {
    const unsubscribe = subscribeToAppointmentEvents({
      onEvent: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/notifications/me'] });
    },
  });
    return unsubscribe;
  }, [queryClient]);


  // Update lab report status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ reportId, status }: { reportId: number; status: string }) => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/labs/reports/${reportId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update status');
      }
      return response.json();
    },
    onSuccess: () => {
      message.success('Status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/lab-reports/my'] });
      queryClient.invalidateQueries({ queryKey: ['/api/labs/me/reports'] });
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to update status');
    },
  });

  // Get current week range (Sunday to Saturday) in IST
  const currentWeekRange = useMemo(() => {
    const now = getISTStartOfDay();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - dayOfWeek); // Go back to Sunday
    sunday.setHours(0, 0, 0, 0);
    
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6); // Add 6 days to get Saturday
    saturday.setHours(23, 59, 59, 999);
    
    return { start: sunday, end: saturday };
  }, []);

  // Check if a report date is within current week (Sunday to Saturday)
  const isInCurrentWeek = (reportDate: Date | string | null | undefined): boolean => {
    if (!reportDate) return false;
    try {
      const date = reportDate instanceof Date ? reportDate : new Date(reportDate);
      if (isNaN(date.getTime())) return false;
      const reportDateIST = getISTStartOfDay(date);
      return reportDateIST >= currentWeekRange.start && reportDateIST <= currentWeekRange.end;
    } catch {
      return false;
    }
  };

  // Calculate real stats from current week only (Sunday to Saturday) using IST
  const stats = useMemo(() => {
    if (!labReportsData || labReportsData.length === 0) {
      return {
    totalTests: 0,
    completedTests: 0,
    pendingTests: 0,
    todayTests: 0,
    criticalResults: 0,
    normalResults: 0
  };
    }
    
    // Filter reports to current week only (Sunday to Saturday)
    const weekReports = labReportsData.filter((report: any) => {
      // Always include pending/processing reports (they need action regardless of date)
      const status = (report.status || '').toLowerCase();
      if (status === 'pending' || status === 'processing') {
        return true;
      }
      // For other statuses, check if within current week
      return isInCurrentWeek(report.reportDate || report.date);
    });
    
    return {
      totalTests: weekReports.length,
      completedTests: weekReports.filter((report: any) => report.status === 'completed' || report.status === 'ready').length,
      pendingTests: weekReports.filter((report: any) => report.status === 'pending' || report.status === 'processing').length,
      todayTests: weekReports.filter((report: any) => {
        if (!report.reportDate && !report.date) return false;
        return isSameDayIST(report.reportDate || report.date, new Date());
      }).length,
      criticalResults: weekReports.filter((report: any) => 
        report.priority === 'Critical' || report.result === 'Abnormal'
      ).length,
      normalResults: weekReports.filter((report: any) => 
        report.result === 'Normal'
      ).length
    };
  }, [labReportsData, currentWeekRange]);

  // Filter lab reports: Show only relevant reports (similar to receptionist dashboard logic)
  // - Show all pending/processing reports (regardless of date - these need action)
  // - Show today's reports
  // - Show recent reports (last 30 days)
  // - Exclude very old completed reports (older than 30 days) to keep dashboard clean
  const relevantLabReports = useMemo(() => {
    if (!labReportsData || labReportsData.length === 0) return [];
    
    const todayStartIST = getISTStartOfDay();
    const thirtyDaysAgo = new Date(todayStartIST);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return labReportsData.filter((report: any) => {
      // Always show pending/processing reports (they need action)
      const status = (report.status || '').toLowerCase();
      if (status === 'pending' || status === 'processing') {
        return true;
      }
      
      // For other statuses, check the report date
      if (!report.reportDate && !report.date) {
        // If no date, show it (might be a recent entry)
        return true;
      }
      
      try {
        const reportDate = report.reportDate ? new Date(report.reportDate) : new Date(report.date);
        if (isNaN(reportDate.getTime())) {
          return true; // Invalid date, show it
        }
        
        const reportDateIST = getISTStartOfDay(reportDate);
        
        // Show if report is from today or within last 30 days
        if (reportDateIST >= thirtyDaysAgo) {
          return true;
        }
        
        // For reports older than 30 days:
        // - Exclude completed/ready reports (they're done, no action needed)
        // - Show other statuses (might need attention)
        if (status === 'completed' || status === 'ready') {
          return false;
        }
        
        // For other statuses older than 30 days, still show them (might need attention)
        return true;
      } catch (error) {
        console.error(`❌ Error checking date for report ${report.id}:`, error);
        return true; // On error, show it
      }
    });
  }, [labReportsData]);

  // Filter lab reports by status (after applying date filter)
  const filteredLabReports = useMemo(() => {
    if (!relevantLabReports) return [];
    if (statusFilter === 'all') return relevantLabReports;
    return relevantLabReports.filter((report: any) => report.status === statusFilter);
  }, [relevantLabReports, statusFilter]);

  // Separate doctor requests (pending with placeholder results) from regular reports
  const doctorRequests = useMemo(() => {
    return filteredLabReports.filter((report: any) => 
      report.status === 'pending' && 
      (report.results === 'Pending - Awaiting lab processing' || report.results?.includes('Pending - Awaiting')) &&
      report.doctorId // Has a doctor ID, meaning it's a request
    );
  }, [filteredLabReports]);

  // Transform lab reports for table display
  const labReports = useMemo(() => {
    return filteredLabReports.map((report: any) => ({
      ...report,
      id: report.id,
      patient: report.patientName || report.patient || 'Unknown',
      testName: report.testName || 'Test',
      date: report.reportDate ? new Date(report.reportDate).toLocaleDateString() : 'N/A',
      result: report.result || (report.status === 'ready' ? 'Ready' : 'Pending'),
      priority: report.priority || 'Normal',
      status: report.status || 'pending',
    }));
  }, [filteredLabReports]);

  const reportColumns = [
    {
      title: '#',
      key: 'serial',
      width: 60,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (
        <Text type="secondary" style={{ fontWeight: 500 }}>{index + 1}</Text>
      ),
    },
    {
      title: 'Patient',
      dataIndex: 'patient',
      key: 'patient',
      width: 150,
      render: (patient: string) => (
        <Text strong>{patient}</Text>
      ),
    },
    {
      title: 'Test Name',
      dataIndex: 'testName',
      key: 'testName',
      width: 180,
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (date: string) => (
        <Text>{date || 'N/A'}</Text>
      ),
    },
    {
      title: 'Result',
      dataIndex: 'result',
      key: 'result',
      width: 120,
      render: (result: string) => (
        <Tag color={result === 'Normal' ? 'green' : result === 'Abnormal' ? 'red' : 'orange'}>
          {result}
        </Tag>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: string) => (
        <Tag color={priority === 'Critical' ? 'red' : priority === 'High' ? 'orange' : 'blue'}>
          {priority}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status: string, record: any) => (
        <Space>
          <Tag color={
            status === 'completed' || status === 'ready' ? 'green' : 
            status === 'processing' ? 'blue' : 
            'orange'
          }>
            {status?.toUpperCase() || 'PENDING'}
        </Tag>
          {status !== 'completed' && status !== 'ready' && (
            <Select
              size="small"
              value={status}
              onChange={(newStatus) => updateStatusMutation.mutate({ reportId: record.id, status: newStatus })}
              style={{ width: 120 }}
            >
              <Option value="pending">Pending</Option>
              <Option value="processing">Processing</Option>
              <Option value="ready">Ready</Option>
              <Option value="completed">Completed</Option>
            </Select>
          )}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
          <Button
            type="link"
            size="small"
            onClick={() => {
              setSelectedReport(record);
              setIsUploadModalOpen(true);
            }}
          >
            Edit
          </Button>
      ),
    },
  ];

  const renderMobileReportCard = (record: any, opts?: { accentBorder?: boolean; badgeText?: string }) => {
    const status = (record.status || 'pending').toLowerCase();
    const result = record.result || 'Pending';
    const priority = record.priority || 'Normal';
    const accentBorder = opts?.accentBorder ?? false;

    const statusColor =
      status === 'completed' || status === 'ready' ? 'green' :
      status === 'processing' ? 'blue' :
      'orange';

    const resultColor =
      result === 'Normal' ? 'green' :
      result === 'Abnormal' ? 'red' :
      'orange';

    const priorityColor =
      priority === 'Critical' ? 'red' :
      priority === 'High' ? 'orange' :
      'blue';

    return (
      <Card
        key={`${opts?.badgeText || 'report'}-${record.id}`}
        size="small"
        variant="borderless"
        style={{
          borderRadius: 16,
          border: accentBorder ? `2px solid ${labTheme.accent}` : '1px solid #E5E7EB',
          background: '#fff',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        }}
        bodyStyle={{ padding: 14 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <Text strong style={{ fontSize: 14, display: 'block', lineHeight: 1.4 }}>
              {record.patient || 'Unknown'}
            </Text>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', lineHeight: 1.4 }}>
              {record.testName || 'Test'} • {record.date || 'N/A'}
            </Text>
          </div>

          <Space size={6} wrap style={{ justifyContent: 'flex-end' }}>
            {opts?.badgeText && (
              <Tag color="orange" style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>
                {opts.badgeText}
              </Tag>
            )}
            <Tag color={priorityColor} style={{ margin: 0, fontSize: 12 }}>
              {priority}
            </Tag>
            <Tag color={resultColor} style={{ margin: 0, fontSize: 12 }}>
              {result}
            </Tag>
          </Space>
        </div>

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <Space size={8} wrap>
            <Tag color={statusColor} style={{ margin: 0, fontSize: 12 }}>
              {status.toUpperCase()}
            </Tag>
            {status !== 'completed' && (
              <Select
                size="small"
                value={status}
                onChange={(newStatus) => updateStatusMutation.mutate({ reportId: record.id, status: newStatus })}
                style={{ width: 140 }}
              >
                <Option value="pending">Pending</Option>
                <Option value="processing">Processing</Option>
                <Option value="ready">Ready</Option>
                <Option value="completed">Completed</Option>
              </Select>
            )}
          </Space>

          <Button
            size="small"
            type="link"
            onClick={() => {
              setSelectedReport(record);
              setIsUploadModalOpen(true);
            }}
          >
            Edit
          </Button>
        </div>
      </Card>
    );
  };

  const [selectedMenuKey] = useState<string>('dashboard');

  const sidebarMenu = useMemo(() => [
    {
      key: 'dashboard',
      icon: <ExperimentOutlined style={{ fontSize: 18, color: selectedMenuKey === 'dashboard' ? labTheme.primary : '#8C8C8C' }} />, 
      label: 'Dashboard' 
    },
    {
      key: 'reports',
      icon: <FileTextOutlined style={{ fontSize: 18, color: selectedMenuKey === 'reports' ? labTheme.primary : '#8C8C8C' }} />, 
      label: 'Test Reports' 
    },
    {
      key: 'patients',
      icon: <UserOutlined style={{ fontSize: 18, color: selectedMenuKey === 'patients' ? labTheme.primary : '#8C8C8C' }} />, 
      label: 'Patients' 
    },
    {
      key: 'upload',
      icon: <UploadOutlined style={{ fontSize: 18, color: selectedMenuKey === 'upload' ? labTheme.primary : '#8C8C8C' }} />, 
      label: 'Upload Results' 
    },
    {
      key: 'analytics',
      icon: <BarChartOutlined style={{ fontSize: 18, color: selectedMenuKey === 'analytics' ? labTheme.primary : '#8C8C8C' }} />, 
      label: 'Analytics' 
    },
  ], [selectedMenuKey]);

  const siderWidth = isMobile ? 0 : (collapsed ? 80 : 260);

  // Generate lab technician ID (LAB-YYYY-XXX format)
  const labTechnicianId = useMemo(() => {
    if (user?.id) {
      const year = new Date().getFullYear();
      const idNum = String(user.id).padStart(3, '0');
      return `LAB-${year}-${idNum}`;
    }
    return 'LAB-2024-001';
  }, [user?.id]);

  // Get initials for avatar
  const userInitials = useMemo(() => {
    if (user?.fullName) {
      const names = user.fullName.split(' ');
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return user.fullName.substring(0, 2).toUpperCase();
    }
    return 'LT';
  }, [user?.fullName]);

  // Sidebar content component (reusable for drawer and sider)
  const SidebarContent = ({ onMenuClick }: { onMenuClick?: () => void }) => (
      <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      background: '#fff',
    }}>
      {/* NexaCare Lab Logo/Name Section */}
      <div style={{
        padding: '20px 16px',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: labTheme.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '24px',
        }}>
          <ExperimentOutlined />
        </div>
        <div style={{ textAlign: 'center' }}>
          <Text strong style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111827', lineHeight: 1.4 }}>
            NexaCare Lab
          </Text>
      </div>
      </div>

      {/* Navigation Menu */}
      <Menu
        className="lab-dashboard-menu"
        mode="inline"
        selectedKeys={[selectedMenuKey]}
        items={sidebarMenu}
        style={{ 
          border: 'none', 
          flex: 1,
          background: 'transparent',
          padding: '8px',
          overflowY: 'auto',
        }}
        onClick={(e) => {
          if (onMenuClick) onMenuClick();
          message.info(`${e.key} page coming soon.`);
        }}
        theme="light"
      />

      {/* User Profile Footer - Light Grey Rounded Card */}
      <div style={{
        marginTop: 'auto',
        padding: '16px',
        background: '#fff',
        flexShrink: 0,
      }}>
        <div style={{
          background: '#F3F4F6',
          borderRadius: '12px',
          padding: '16px',
        }}>
          {/* Layer 1: Profile Photo + (Name + ID) */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            marginBottom: '12px',
          }}>
            {/* Avatar */}
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: labTheme.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 600,
              fontSize: '14px',
              flexShrink: 0,
            }}>
              {userInitials}
            </div>
            
            {/* Name (top) and ID (below) - stacked vertically */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text strong style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#262626', lineHeight: 1.5, marginBottom: '4px' }}>
                {user?.fullName || 'Lab Technician'}
              </Text>
              <Text style={{ display: 'block', fontSize: '12px', color: '#8C8C8C' }}>
                ID: {labTechnicianId}
              </Text>
            </div>
          </div>
          
          {/* Layer 2: Lab Name */}
          {labProfile?.name && (
            <div style={{
              marginBottom: '12px',
              paddingBottom: '12px',
              borderBottom: '1px solid #E5E7EB',
            }}>
              <Text style={{ display: 'block', fontSize: '12px', color: '#8C8C8C', lineHeight: 1.4 }}>
                {labProfile.name}
              </Text>
            </div>
          )}
          
          {/* Layer 3: Active Lab Technician Text + Settings Icon */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            {/* Active Lab Technician on left */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#10B981',
              }} />
              <Text style={{ fontSize: '12px', color: '#10B981', fontWeight: 500 }}>
                Active Lab Technician
              </Text>
            </div>
            
            {/* Settings Icon on right */}
            <Button 
              type="text" 
              icon={<SettingOutlined style={{ color: '#8C8C8C', fontSize: '18px' }} />} 
              onClick={() => message.info('Settings coming soon.')}
              style={{ flexShrink: 0, padding: 0, width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        /* Override medical-container padding only when lab dashboard is rendered */
        body:has(.lab-dashboard-wrapper) .medical-container {
          padding: 0 !important;
          display: block !important;
          align-items: unset !important;
          justify-content: unset !important;
          background: transparent !important;
          min-height: 100vh !important;
        }

        /* Ensure table body has padding for last row visibility */
        .lab-dashboard-wrapper .ant-table-body {
          padding-bottom: 40px !important;
        }
        .lab-dashboard-wrapper .ant-table-body-inner {
          padding-bottom: 40px !important;
        }
        .lab-dashboard-wrapper td.ant-table-cell {
          padding: 8px !important;
        }
        /* Remove gap between table header and first row */
        .lab-dashboard-wrapper .ant-table-thead > tr > th {
          padding: 12px 8px !important;
          border-bottom: 1px solid #f0f0f0 !important;
        }
        .lab-dashboard-wrapper .ant-table-tbody > tr:first-child > td {
          border-top: none !important;
          padding-top: 8px !important;
        }
        .lab-dashboard-wrapper .ant-table-thead + .ant-table-tbody {
          margin-top: 0 !important;
        }
        .lab-dashboard-wrapper .ant-table-container {
          border-top: none !important;
        }
        .lab-dashboard-wrapper .ant-table-tbody > tr:first-child > td {
          border-top: none !important;
        }
        .lab-dashboard-wrapper .ant-table-thead + .ant-table-tbody {
          margin-top: 0 !important;
        }
        .lab-dashboard-wrapper .ant-table-fixed-right {
          background: #fff;
          box-shadow: -2px 0 8px rgba(0, 0, 0, 0.08);
        }

        .lab-dashboard-menu .ant-menu-item {
          border-radius: 12px !important;
          margin: 4px 8px !important;
          height: 48px !important;
          line-height: 48px !important;
          transition: all 0.3s ease !important;
          padding-left: 16px !important;
          background: transparent !important;
          border: none !important;
        }
        .lab-dashboard-menu .ant-menu-item:hover {
          background: transparent !important;
        }
        .lab-dashboard-menu .ant-menu-item:hover,
        .lab-dashboard-menu .ant-menu-item:hover .ant-menu-title-content {
          color: #595959 !important;
        }
        .lab-dashboard-menu .ant-menu-item-selected {
          background: ${labTheme.primary} !important;
          font-weight: 500 !important;
          border: none !important;
          padding-left: 16px !important;
        }
        .lab-dashboard-menu .ant-menu-item-selected,
        .lab-dashboard-menu .ant-menu-item-selected .ant-menu-title-content {
          color: #fff !important;
        }
        .lab-dashboard-menu .ant-menu-item-selected .ant-menu-item-icon,
        .lab-dashboard-menu .ant-menu-item-selected .anticon {
          color: #fff !important;
        }
        .lab-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) {
          color: #8C8C8C !important;
          background: transparent !important;
        }
        .lab-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) .ant-menu-title-content {
          color: #8C8C8C !important;
        }
        .lab-dashboard-menu .ant-menu-item-selected::after {
          display: none !important;
        }
        .lab-dashboard-menu .ant-menu-item-icon,
        .lab-dashboard-menu .anticon {
          font-size: 18px !important;
          width: 18px !important;
          height: 18px !important;
        }
      `}</style>
      <Layout className="lab-dashboard-wrapper" style={{ minHeight: '100vh', background: labTheme.background }}>
      {/* Desktop/Tablet Sidebar */}
      {!isMobile && (
      <Sider 
          trigger={null}
        collapsible 
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={260}
        collapsedWidth={80}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          width: siderWidth,
          background: '#fff',
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s ease',
          zIndex: 10,
        }}
      >
          <SidebarContent />
        </Sider>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          title="Navigation"
          placement="left"
          onClose={() => setMobileDrawerOpen(false)}
          open={mobileDrawerOpen}
          bodyStyle={{ padding: 0 }}
          width={260}
        >
          <SidebarContent onMenuClick={() => setMobileDrawerOpen(false)} />
        </Drawer>
      )}

      <Layout
        style={{
          marginLeft: siderWidth,
          minHeight: '100vh',
          background: labTheme.background,
          transition: 'margin-left 0.2s ease',
          overflow: 'hidden',
        }}
      >
        <Content
          style={{
            background: labTheme.background,
            height: '100vh',
            overflow: 'hidden',
            padding: isMobile ? '24px 16px 16px' : isTablet ? '24px 20px 20px' : '24px 32px 24px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%',
            overflow: 'hidden',
          }}>
            {/* Notifications Bell (top-right) */}
            {!isMobile && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8, paddingRight: 8, overflow: 'visible' }}>
                <NotificationBell />
              </div>
            )}
            {/* Mobile Menu Button */}
            {isMobile && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Button
                  type="text"
                  icon={<MenuUnfoldOutlined />}
                  onClick={() => setMobileDrawerOpen(true)}
                  style={{ fontSize: '18px' }}
                />
                <Title level={4} style={{ margin: 0 }}>Dashboard</Title>
                <div style={{ paddingRight: 8, overflow: 'visible' }}>
                  <NotificationBell />
                </div>
              </div>
            )}
            
            {/* Alert/Banner Notifications - Show important unread notifications */}
            {notifications.filter((n: any) => !n.isRead).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {notifications
                  .filter((n: any) => !n.isRead)
                  .slice(0, 3) // Show max 3 alerts
                  .map((notif: any) => {
                    const type = (notif.type || '').toLowerCase();
                    let alertType: 'info' | 'success' | 'warning' | 'error' = 'info';
                    if (type.includes('cancel') || type.includes('reject') || type.includes('critical')) alertType = 'error';
                    else if (type.includes('confirm') || type.includes('complete') || type.includes('ready')) alertType = 'success';
                    else if (type.includes('pending') || type.includes('resched') || type.includes('processing')) alertType = 'warning';
                    
                    return (
                      <Alert
                        key={notif.id}
                        message={notif.title || 'Notification'}
                        description={notif.message}
                        type={alertType}
                        showIcon
                        closable
                        style={{ marginBottom: 8 }}
                        onClose={() => {
                          // Mark as read when closed
                          const token = localStorage.getItem('auth-token');
                          fetch(`/api/notifications/read/${notif.id}`, {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${token}` },
                          }).then(() => {
                            queryClient.invalidateQueries({ queryKey: ['/api/notifications/me'] });
                          });
                        }}
                      />
                    );
                  })}
              </div>
            )}

            {/* KPI Cards - Matching Receptionist Dashboard Design */}
            {isMobile ? (
              <div style={{ 
                display: 'flex', 
                overflowX: 'auto', 
                gap: 16, 
                marginBottom: 24,
                paddingBottom: 8,
                scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling: 'touch',
              }}>
                {[
                  { label: "Samples Pending", value: stats?.pendingTests || 0, icon: <FileSearchOutlined style={{ fontSize: '24px', color: labTheme.primary }} />, trendLabel: "Awaiting Analysis", trendColor: labTheme.primary, trendBg: labTheme.highlight, onView: () => message.info('View pending tests') },
                  { label: "Reports Ready", value: stats?.completedTests || 0, icon: <CheckCircleOutlined style={{ fontSize: '24px', color: labTheme.secondary }} />, trendLabel: "Completed Today", trendColor: labTheme.secondary, trendBg: "#D1FAE5", onView: () => message.info('View completed tests') },
                  { label: "Critical Alerts", value: stats?.criticalResults || 0, icon: <AlertOutlined style={{ fontSize: '24px', color: labTheme.accent }} />, trendLabel: "Requires Attention", trendColor: stats?.criticalResults > 0 ? labTheme.accent : "#6B7280", trendBg: stats?.criticalResults > 0 ? "#FEE2E2" : "#F3F4F6", onView: () => message.info('View critical alerts') },
                  { label: "Total Tests", value: stats?.totalTests || 0, icon: <ExperimentOutlined style={{ fontSize: '24px', color: labTheme.primary }} />, trendLabel: "All Time", trendColor: "#6B7280", trendBg: "#F3F4F6", onView: () => message.info('View all tests') },
                ].map((kpi, idx) => (
                  <div key={idx} style={{ minWidth: 220, scrollSnapAlign: 'start' }}>
                    <KpiCard {...kpi} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 16, marginBottom: 24, width: '100%' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
              <KpiCard
                label="Samples Pending"
                value={stats?.pendingTests || 0}
                icon={<FileSearchOutlined style={{ fontSize: '24px', color: labTheme.primary }} />}
                trendLabel="Awaiting Analysis"
                trendType="neutral"
                    trendColor={labTheme.primary}
                    trendBg={labTheme.highlight}
                    onView={() => message.info('View pending tests')}
              />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
              <KpiCard
                label="Reports Ready"
                value={stats?.completedTests || 0}
                icon={<CheckCircleOutlined style={{ fontSize: '24px', color: labTheme.secondary }} />}
                trendLabel="Completed Today"
                trendType="positive"
                    trendColor={labTheme.secondary}
                    trendBg="#D1FAE5"
                    onView={() => message.info('View completed tests')}
              />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
              <KpiCard
                label="Critical Alerts"
                value={stats?.criticalResults || 0}
                icon={<AlertOutlined style={{ fontSize: '24px', color: labTheme.accent }} />}
                trendLabel="Requires Attention"
                trendType={stats?.criticalResults > 0 ? 'negative' : 'positive'}
                    trendColor={stats?.criticalResults > 0 ? labTheme.accent : "#6B7280"}
                    trendBg={stats?.criticalResults > 0 ? "#FEE2E2" : "#F3F4F6"}
                    onView={() => message.info('View critical alerts')}
              />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
              <KpiCard
                label="Total Tests"
                value={stats?.totalTests || 0}
                icon={<ExperimentOutlined style={{ fontSize: '24px', color: labTheme.primary }} />}
                trendLabel="All Time"
                trendType="neutral"
                    trendColor="#6B7280"
                    trendBg="#F3F4F6"
                    onView={() => message.info('View all tests')}
              />
                </div>
              </div>
            )}

          {/* Lab Status Summary - Similar to Receptionist Queue Status */}
          <Card 
            variant="borderless"
            style={{ 
              borderRadius: 16,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              border: '1px solid #E5E7EB',
              background: '#fff',
              marginBottom: 24,
            }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              flexWrap: isMobile ? 'wrap' : 'nowrap',
              gap: isMobile ? 16 : 24,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <Text type="secondary" style={{ fontSize: 14, minWidth: 80 }}>Pending:</Text>
                <Text strong style={{ fontSize: 16, color: '#F97316' }}>{relevantLabReports?.filter((r: any) => r.status === 'pending').length || 0}</Text>
              </div>
              <Divider type="vertical" style={{ height: 24, margin: 0 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <Text type="secondary" style={{ fontSize: 14, minWidth: 100 }}>Processing:</Text>
                <Text strong style={{ fontSize: 16, color: '#0EA5E9' }}>{relevantLabReports?.filter((r: any) => r.status === 'processing').length || 0}</Text>
              </div>
              <Divider type="vertical" style={{ height: 24, margin: 0 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <Text type="secondary" style={{ fontSize: 14, minWidth: 120 }}>Ready:</Text>
                <Text strong style={{ fontSize: 16, color: '#22C55E' }}>{relevantLabReports?.filter((r: any) => r.status === 'ready' || r.status === 'completed').length || 0}</Text>
              </div>
              <Divider type="vertical" style={{ height: 24, margin: 0 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <Text type="secondary" style={{ fontSize: 14, minWidth: 100 }}>Total:</Text>
                <Text strong style={{ fontSize: 16, color: labTheme.primary }}>{relevantLabReports?.length || 0}</Text>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {relevantLabReports?.filter((r: any) => r.status === 'completed' || r.status === 'ready').length || 0} of {relevantLabReports?.length || 0} completed
                </Text>
              </div>
            </div>
          </Card>

          {/* Lab Reports Queue - Full width, fills remaining height */}
          <Row gutter={[16, 16]} style={{ flex: 1, minHeight: 0, display: 'flex' }}>
            <Col xs={24} lg={24} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <Card 
                variant="borderless"
                style={{ 
                  borderRadius: 16,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                  border: '1px solid #E5E7EB',
                  background: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  minHeight: 0,
                }}
                title="Lab Reports Queue"
                extra={
                      <Space>
                    <Select
                      value={statusFilter}
                      onChange={setStatusFilter}
                      style={{ width: 120 }}
                      size="small"
                    >
                      <Option value="all">All Status</Option>
                      <Option value="pending">Pending</Option>
                      <Option value="processing">Processing</Option>
                      <Option value="ready">Ready</Option>
                      <Option value="completed">Completed</Option>
                    </Select>
                    <Button type="link" onClick={() => message.info('View all reports feature coming soon')}>View All</Button>
                      </Space>
                    }
                bodyStyle={{ 
                  flex: 1, 
                  minHeight: 0, 
                  display: 'flex', 
                  flexDirection: 'column',
                  overflow: 'hidden',
                  padding: 0,
                }}
              >
                <div style={{ 
                  flex: 1, 
                  minHeight: 0, 
                  display: 'flex', 
                  flexDirection: 'column',
                  overflow: 'hidden',
                  padding: isMobile ? 12 : 16,
                }}>
                  {/* Doctor Requests Section */}
                  {doctorRequests.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <Space style={{ marginBottom: 12 }}>
                        <ExperimentOutlined style={{ color: labTheme.accent }} />
                        <Text strong>Doctor Requests ({doctorRequests.length})</Text>
                        <Tag color="orange">New</Tag>
                      </Space>
                    {isMobile ? (
                      <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        {doctorRequests.map((report: any) => {
                          const row = {
                            ...report,
                            id: report.id,
                            patient: report.patientName || report.patient || 'Unknown',
                            testName: report.testName || 'Test',
                            date: report.reportDate ? new Date(report.reportDate).toLocaleDateString() : 'N/A',
                            result: 'Requested',
                            priority: report.priority || 'Normal',
                            status: report.status || 'pending',
                          };
                          return renderMobileReportCard(row, { accentBorder: true, badgeText: 'New' });
                        })}
                      </Space>
                    ) : (
                        <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                        <Table
                          columns={reportColumns}
                          dataSource={doctorRequests.map((report: any) => ({
                            ...report,
                            id: report.id,
                            patient: report.patientName || report.patient || 'Unknown',
                            testName: report.testName || 'Test',
                            date: report.reportDate ? new Date(report.reportDate).toLocaleDateString() : 'N/A',
                            result: 'Requested',
                            priority: report.priority || 'Normal',
                            status: report.status || 'pending',
                          }))}
                          pagination={false}
                          rowKey="id"
                          size={isMobile ? "small" : "middle"}
                          scroll={isMobile ? { x: 'max-content' } : undefined}
                          style={{
                            backgroundColor: labTheme.background
                          }}
                        />
                      </div>
                    )}
                    </div>
                )}

                {/* Regular Lab Reports */}
                  {isMobile ? (
                    <Space direction="vertical" size={12} style={{ width: '100%', flex: 1, overflowY: 'auto', paddingRight: 8, paddingBottom: 40 }}>
                      {labReportsLoading ? (
                        <>
                          <Card size="small" style={{ borderRadius: 16 }}><Spin /></Card>
                          <Card size="small" style={{ borderRadius: 16 }}><Spin /></Card>
                        </>
                      ) : (
                        labReports.filter((r: any) => !doctorRequests.find((dr: any) => dr.id === r.id)).map((report: any) => renderMobileReportCard(report))
                      )}
                    </Space>
                  ) : (
                    <div style={{ flex: 1, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                      <div style={{ flex: 1, height: '100%', overflowY: 'auto', overflowX: 'auto', minHeight: 0 }}>
                        <div style={{ paddingBottom: 40 }}>
                      <Table
                        columns={reportColumns}
                        dataSource={labReports.filter((r: any) => !doctorRequests.find((dr: any) => dr.id === r.id))}
                        pagination={false}
                        rowKey="id"
                        size={isMobile ? "small" : "middle"}
                            scroll={{ 
                              x: 'max-content',
                              ...(labReports.length > 3 ? { y: 'calc(100vh - 520px)' } : {}),
                            }}
                        loading={labReportsLoading}
                        style={{
                          backgroundColor: labTheme.background
                        }}
                      />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </Col>
          </Row>

      {/* Lab Report Upload Modal */}
      <LabReportUploadModal
        open={isUploadModalOpen}
        onCancel={() => {
          setIsUploadModalOpen(false);
          setSelectedReport(null);
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/lab-reports/my'] });
          queryClient.invalidateQueries({ queryKey: ['/api/labs/me/reports'] });
        }}
        report={selectedReport}
      />
          </div>
        </Content>
      </Layout>
      </Layout>
    </>
  );
}
