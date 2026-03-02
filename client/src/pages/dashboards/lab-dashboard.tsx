import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Redirect, useLocation } from "wouter";
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
  App,
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
  EditOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { useResponsive } from '../../hooks/use-responsive';
import { KpiCard } from '../../components/dashboard/KpiCard';
import LabReportUploadModal from '../../components/modals/lab-report-upload-modal';
import { NotificationBell } from '../../components/notifications/NotificationBell';
import { TopHeader } from '../../components/layout/TopHeader';
import { LabTechnicianSidebar } from '../../components/layout/LabTechnicianSidebar';
import { subscribeToAppointmentEvents } from '../../lib/appointments-events';
import { getShownNotificationIds, markNotificationAsShown } from '../../lib/notification-shown-storage';
import { getISTStartOfDay, isSameDayIST } from '../../lib/timezone';
import PendingLabOrders from '../lab/pending-orders';
import LabResultEntry from '../lab/result-entry';
import LabReportRelease from '../lab/report-release';
import SampleCollection from '../lab/sample-collection';

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
  const { user, logout, isLoading } = useAuth();
  const { notification: notificationApi } = App.useApp();
  const { isMobile, isTablet } = useResponsive();
  const queryClient = useQueryClient();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateTab, setDateTab] = useState<'today' | 'yesterday' | 'all'>('today');
  const [location, setLocation] = useLocation();
  const urlView = useMemo(() => {
    const search = location.includes('?') ? location.split('?')[1] || '' : '';
    let view = new URLSearchParams(search).get('view');
    if (view && ['dashboard', 'pending-orders', 'result-entry', 'report-release'].includes(view)) return view;
    if (typeof window !== 'undefined') {
      view = new URLSearchParams(window.location.search).get('view');
      if (view && ['dashboard', 'pending-orders', 'result-entry', 'report-release'].includes(view)) return view;
    }
    return 'dashboard';
  }, [location]);
  const [sidebarView, setSidebarView] = useState<string | null>(null);
  const selectedMenuKey = sidebarView ?? urlView;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pathname = window.location.pathname;
    const search = window.location.search || '';
    if (!pathname.startsWith('/dashboard/lab')) return;
    const fullUrl = pathname + search;
    if (search && fullUrl !== location) setLocation(fullUrl);
    const view = new URLSearchParams(search).get('view');
    if (view && ['dashboard', 'pending-orders', 'result-entry', 'report-release'].includes(view)) setSidebarView(view);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount to sync URL
  }, []);

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
        return [];
      }
      const data = await response.json();
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
        return [];
      }
      return response.json();
    },
    enabled: !!user,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  // Show floating notifications for unread notifications (only once per notification, persisted across refresh)
  useEffect(() => {
    if (!notifications || notifications.length === 0 || !user?.id) return;

    const shownIds = getShownNotificationIds(user.id);
    const unread = notifications.filter((n: any) => !n.isRead);

    unread.forEach((notif: any) => {
      const notifId = Number(notif.id);
      if (shownIds.has(notifId)) return;
      markNotificationAsShown(user.id, notifId);

      const type = (notif.type || '').toLowerCase();
      let notificationType: 'info' | 'success' | 'warning' | 'error' = 'info';
      if (type.includes('cancel') || type.includes('reject') || type.includes('critical')) notificationType = 'error';
      else if (type.includes('confirm') || type.includes('complete') || type.includes('ready')) notificationType = 'success';
      else if (type.includes('pending') || type.includes('resched') || type.includes('processing')) notificationType = 'warning';

      notificationApi[notificationType]({
        message: notif.title || 'Notification',
        description: notif.message,
        placement: 'topRight',
        duration: 10,
        key: `notif-${notifId}`,
        onClick: () => {
          const token = localStorage.getItem('auth-token');
          if (token) {
            fetch(`/api/notifications/read/${notifId}`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
            }).then(() => {
              queryClient.invalidateQueries({ queryKey: ['/api/notifications/me'] });
            });
          }
        },
        onClose: () => {
          const token = localStorage.getItem('auth-token');
          if (token) {
            fetch(`/api/notifications/read/${notifId}`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
            }).then(() => {
              queryClient.invalidateQueries({ queryKey: ['/api/notifications/me'] });
            });
          }
        },
      });
    });
  }, [notifications, notificationApi, queryClient, user?.id]);

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

  // Filter by date tab (Today / Yesterday / All) for queue table
  const queueFilteredReports = useMemo(() => {
    if (!filteredLabReports.length) return [];
    if (dateTab === 'all') return filteredLabReports;
    const todayStart = getISTStartOfDay();
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    return filteredLabReports.filter((report: any) => {
      const d = report.reportDate ? new Date(report.reportDate) : report.date ? new Date(report.date) : null;
      if (!d || isNaN(d.getTime())) return dateTab === 'today';
      const reportDay = getISTStartOfDay(d);
      if (dateTab === 'today') return reportDay.getTime() === todayStart.getTime();
      if (dateTab === 'yesterday') return reportDay.getTime() === yesterdayStart.getTime();
      return true;
    });
  }, [filteredLabReports, dateTab]);

  // Date tab counts (from filteredLabReports for Today/Yesterday/All)
  const dateTabCounts = useMemo(() => {
    const todayStart = getISTStartOfDay();
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    let today = 0, yesterday = 0;
    (filteredLabReports || []).forEach((r: any) => {
      const d = r.reportDate ? new Date(r.reportDate) : r.date ? new Date(r.date) : null;
      if (!d || isNaN(d.getTime())) return;
      const reportDay = getISTStartOfDay(d);
      if (reportDay.getTime() === todayStart.getTime()) today++;
      else if (reportDay.getTime() === yesterdayStart.getTime()) yesterday++;
    });
    return { today, yesterday, all: (filteredLabReports || []).length };
  }, [filteredLabReports]);

  // Separate doctor requests (pending with placeholder results) from regular reports
  const doctorRequests = useMemo(() => {
    return filteredLabReports.filter((report: any) => 
      report.status === 'pending' && 
      (report.results === 'Pending - Awaiting lab processing' || report.results?.includes('Pending - Awaiting')) &&
      report.doctorId // Has a doctor ID, meaning it's a request
    );
  }, [filteredLabReports]);

  // Transform lab reports for table display (use queueFilteredReports for date-tabbed queue)
  const labReports = useMemo(() => {
    return queueFilteredReports.map((report: any) => ({
      ...report,
      id: report.id,
      patient: report.patientName || report.patient || 'Unknown',
      testName: report.testName || 'Test',
      hospital: report.hospitalName ?? '—',
      date: report.reportDate ? new Date(report.reportDate).toLocaleDateString() : 'N/A',
      result: report.result || (report.status === 'ready' ? 'Ready' : 'Pending'),
      priority: report.priority || 'Normal',
      status: report.status || 'pending',
    }));
  }, [queueFilteredReports]);

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
      title: 'Hospital',
      dataIndex: 'hospital',
      key: 'hospital',
      width: 180,
      render: (hospital: string) => (
        <Text>{hospital ?? '—'}</Text>
      ),
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
      width: 120,
      render: (status: string) => (
        <Tag color={
          status === 'completed' || status === 'ready' ? 'green' :
          status === 'processing' ? 'blue' :
          'orange'
        }>
          {status?.toUpperCase() || 'PENDING'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Button
          type="primary"
          size="small"
          onClick={() => {
            setSelectedReport(record);
            setIsUploadModalOpen(true);
          }}
          style={{ background: '#8B5CF6', borderColor: '#8B5CF6', borderRadius: 8 }}
          icon={<EditOutlined style={{ fontSize: 14 }} />}
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
        styles={{ body: { padding: 14 } }}
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
          <Tag color={statusColor} style={{ margin: 0, fontSize: 12 }}>
            {status.toUpperCase()}
          </Tag>

          <Button
            size="small"
            type="primary"
            onClick={() => {
              setSelectedReport(record);
              setIsUploadModalOpen(true);
            }}
            style={{ background: '#8B5CF6', borderColor: '#8B5CF6', borderRadius: 8 }}
          >
            Edit
          </Button>
        </div>
      </Card>
    );
  };

  // Redirect if not authenticated (after all hooks)
  if (!isLoading && !user) {
    return <Redirect to="/login" />;
  }
  if (!isLoading && user) {
    const userRole = user.role?.toUpperCase();
    if (userRole !== 'LAB') {
      message.warning('You do not have access to this dashboard');
      switch (userRole) {
        case 'PATIENT': return <Redirect to="/dashboard/patient" />;
        case 'DOCTOR': return <Redirect to="/dashboard/doctor" />;
        case 'RECEPTIONIST': return <Redirect to="/dashboard/receptionist" />;
        case 'HOSPITAL': return <Redirect to="/dashboard/hospital" />;
        case 'NURSE': return <Redirect to="/dashboard/nurse" />;
        case 'PHARMACIST': return <Redirect to="/dashboard/pharmacist" />;
        case 'RADIOLOGY_TECHNICIAN': return <Redirect to="/dashboard/radiology-technician" />;
        default: return <Redirect to="/login" />;
      }
    }
  }

  const siderWidth = isMobile ? 0 : 80; // Narrow sidebar width matching PatientSidebar

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

        /* Figma Design - Menu Styling for Lab Dashboard */
        .lab-dashboard-menu .ant-menu-item {
          border-radius: 8px !important;
          margin: 2px 0 !important;
          height: auto !important;
          line-height: 1.5 !important;
          transition: all 0.2s ease !important;
          padding: 10px 12px !important;
          background: transparent !important;
          border: none !important;
        }
        .lab-dashboard-menu .ant-menu-item:hover {
          background: #F9FAFB !important;
        }
        .lab-dashboard-menu .ant-menu-item:hover,
        .lab-dashboard-menu .ant-menu-item:hover .ant-menu-title-content {
          color: #111827 !important;
        }
        .lab-dashboard-menu .ant-menu-item:hover .ant-menu-item-icon,
        .lab-dashboard-menu .ant-menu-item:hover .anticon {
          color: #111827 !important;
        }
        .lab-dashboard-menu .ant-menu-item-selected {
          background: #EFF6FF !important;
          font-weight: 500 !important;
          border: none !important;
          padding: 10px 12px !important;
        }
        .lab-dashboard-menu .ant-menu-item-selected,
        .lab-dashboard-menu .ant-menu-item-selected .ant-menu-title-content {
          color: #0EA5E9 !important;
        }
        .lab-dashboard-menu .ant-menu-item-selected .ant-menu-item-icon,
        .lab-dashboard-menu .ant-menu-item-selected .anticon {
          color: #0EA5E9 !important;
        }
        .lab-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) {
          color: #374151 !important;
          background: transparent !important;
        }
        .lab-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) .ant-menu-title-content {
          color: #374151 !important;
        }
        .lab-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) .ant-menu-item-icon,
        .lab-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) .anticon {
          color: #374151 !important;
        }
        .lab-dashboard-menu .ant-menu-item-selected::after {
          display: none !important;
        }
        .lab-dashboard-menu .ant-menu-item-icon,
        .lab-dashboard-menu .anticon {
          font-size: 20px !important;
          width: 20px !important;
          height: 20px !important;
        }
        .lab-reports-queue-table .ant-table-thead > tr > th {
          background: #FAFAFA !important;
          font-weight: 600;
          color: #262626;
          font-size: 14px;
        }
      `}</style>
      <Layout className="lab-dashboard-wrapper" style={{ minHeight: '100vh', background: labTheme.background }}>
      {/* Desktop/Tablet Sidebar */}
      {!isMobile && (
      <Sider 
        width={80}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          background: '#fff',
            boxShadow: '0 2px 16px rgba(14, 165, 233, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10,
            borderRight: '1px solid #E5E7EB',
        }}
      >
          <LabTechnicianSidebar 
            selectedMenuKey={selectedMenuKey}
            onMenuClick={(key) => {
              if (key) setSidebarView(key);
              setLocation(key === 'dashboard' ? '/dashboard/lab' : `/dashboard/lab?view=${key}`);
            }}
            hospitalName={labProfile?.name}
          />
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
          width={80}
        >
          <LabTechnicianSidebar 
            selectedMenuKey={selectedMenuKey}
            onMenuClick={(key) => {
              if (key) setSidebarView(key);
              setLocation(key === 'dashboard' ? '/dashboard/lab' : `/dashboard/lab?view=${key}`);
              setMobileDrawerOpen(false);
            }}
            hospitalName={labProfile?.name}
          />
        </Drawer>
      )}

      <Layout
        style={{
          marginLeft: siderWidth,
          minHeight: '100vh',
          background: labTheme.background,
          transition: 'margin-left 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh', // Fixed height to enable scrolling
        }}
      >
        {/* TopHeader - Figma Lab: purple accent #8B5CF6 */}
        <TopHeader
          userName={user?.fullName || 'Lab Admin'}
          userRole="Lab"
          primaryColor="#8B5CF6"
          userId={useMemo(() => {
            if (user?.id) {
              const year = new Date().getFullYear();
              const idNum = String(user.id).padStart(3, '0');
              return `LAB-${year}-${idNum}`;
            }
            return 'LAB-2024-001';
          }, [user?.id])}
          userInitials={useMemo(() => {
            if (user?.fullName) {
              const names = user.fullName.split(' ');
              if (names.length >= 2) {
                return `${names[0][0]}${names[1][0]}`.toUpperCase();
              }
              return user.fullName.substring(0, 2).toUpperCase();
            }
            return 'LA';
          }, [user?.fullName])}
          notificationCount={notifications.filter((n: any) => !n.isRead).length}
        />

        <Content
          style={{
            background: labTheme.background,
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            minHeight: 0, // Important for flex scrolling
            // Responsive padding - reduced to save side space
            padding: isMobile 
              ? '12px 12px 16px'  // Mobile: smaller side padding
              : isTablet 
                ? '12px 16px 20px'  // Tablet: medium side padding
                : '12px 16px 20px', // Desktop: reduced padding
            display: 'flex',
            flexDirection: 'column',
            margin: 0,
            width: '100%',
          }}
        >
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            flex: 1,
            minHeight: 0,
          }}>
            {/* Mobile Menu Button */}
            {isMobile && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 16 }}>
                <Button
                  type="text"
                  icon={<MenuUnfoldOutlined />}
                  onClick={() => setMobileDrawerOpen(true)}
                  style={{ fontSize: '18px' }}
                />
              </div>
            )}

            {/* Render content based on selected menu */}
            {selectedMenuKey === 'pending-orders' && <PendingLabOrders />}
            {selectedMenuKey === 'result-entry' && <LabResultEntry />}
            {selectedMenuKey === 'report-release' && <LabReportRelease />}
            {selectedMenuKey === 'dashboard' && (
              <>
            
            {/* Floating Notifications - Auto-dismiss after 10 seconds (handled by useEffect) */}

            {/* KPI Cards - Figma Lab design: icon left, tag right, label, value */}
            {(() => {
              const kpiData = [
                { label: 'Samples Pending', value: stats?.pendingTests ?? 0, tag: 'Awaiting Analysis', tagStyle: { background: '#EDE9FE', color: '#7C3AED' }, iconBg: '#F5F3FF', iconColor: '#A78BFA', Icon: FileSearchOutlined },
                { label: 'Reports Ready', value: stats?.completedTests ?? 0, tag: 'Completed Today', tagStyle: { background: '#D1FAE5', color: '#059669' }, iconBg: '#F9FAFB', iconColor: '#9CA3AF', Icon: CheckCircleOutlined },
                { label: 'Critical Alerts', value: stats?.criticalResults ?? 0, tag: 'Requires Attention', tagStyle: { background: '#FEE2E2', color: '#DC2626' }, iconBg: '#F9FAFB', iconColor: '#9CA3AF', Icon: AlertOutlined },
                { label: 'Total Tests', value: stats?.totalTests ?? 0, tag: 'All Time', tagStyle: { background: '#F3F4F6', color: '#6B7280' }, iconBg: '#F9FAFB', iconColor: '#9CA3AF', Icon: ExperimentOutlined },
              ];
              return isMobile ? (
                <div style={{ display: 'flex', overflowX: 'auto', gap: 16, marginBottom: 24, paddingBottom: 8, scrollSnapType: 'x mandatory' }}>
                  {kpiData.map((kpi, idx) => {
                    const Icon = kpi.Icon;
                    return (
                      <Card key={idx} size="small" style={{ minWidth: 220, scrollSnapAlign: 'start', borderRadius: 16, border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} styles={{ body: { padding: 24 } }} onClick={() => message.info('View')}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                          <div style={{ width: 48, height: 48, borderRadius: 12, background: kpi.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon style={{ fontSize: 24, color: kpi.iconColor }} />
                          </div>
                          <span style={{ padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 500, ...kpi.tagStyle }}>{kpi.tag}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 14, color: '#6B7280', marginBottom: 4 }}>{kpi.label}</p>
                        <p style={{ margin: 0, fontSize: 30, fontWeight: 600, color: '#262626' }}>{kpi.value}</p>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                  {kpiData.map((kpi, idx) => {
                    const Icon = kpi.Icon;
                    return (
                      <Card key={idx} size="small" style={{ borderRadius: 16, border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', cursor: 'pointer' }} styles={{ body: { padding: 24 } }} onClick={() => message.info('View')}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                          <div style={{ width: 48, height: 48, borderRadius: 12, background: kpi.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon style={{ fontSize: 24, color: kpi.iconColor }} />
                          </div>
                          <span style={{ padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 500, ...kpi.tagStyle }}>{kpi.tag}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 14, color: '#6B7280', marginBottom: 4 }}>{kpi.label}</p>
                        <p style={{ margin: 0, fontSize: 30, fontWeight: 600, color: '#262626' }}>{kpi.value}</p>
                      </Card>
                    );
                  })}
                </div>
              );
            })()}

          {/* Lab Status Bar - Figma: dot + label + count, dividers, Total, completed today */}
          <Card
            variant="borderless"
            style={{ borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #E5E7EB', background: '#fff', marginBottom: 24 }}
            styles={{ body: { padding: 24 } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                {[
                  { label: 'Pending', count: relevantLabReports?.filter((r: any) => r.status === 'pending').length || 0, dotColor: '#D1D5DB', textColor: '#6B7280' },
                  { label: 'Processing', count: relevantLabReports?.filter((r: any) => r.status === 'processing').length || 0, dotColor: '#D1D5DB', textColor: '#6B7280' },
                  { label: 'Ready', count: relevantLabReports?.filter((r: any) => r.status === 'ready').length || 0, dotColor: '#86EFAC', textColor: '#059669' },
                  { label: 'Completed', count: relevantLabReports?.filter((r: any) => r.status === 'completed').length || 0, dotColor: '#86EFAC', textColor: '#059669' },
                ].map((s, i) => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: s.dotColor }} />
                    <span style={{ fontSize: 14, color: '#6B7280' }}>{s.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: s.textColor }}>{s.count}</span>
                    {i < 3 && <div style={{ width: 1, height: 24, background: '#E5E7EB', marginLeft: 16 }} />}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 14 }}>
                <span style={{ color: '#6B7280' }}>Total: </span>
                <span style={{ fontWeight: 600, color: '#262626' }}>{relevantLabReports?.length || 0}</span>
                <span style={{ color: '#6B7280', marginLeft: 16 }}>
                  (<span style={{ fontWeight: 600, color: '#059669' }}>{relevantLabReports?.filter((r: any) => r.status === 'completed' || r.status === 'ready').length || 0}</span> completed today)
                </span>
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
                styles={{ 
                  body: { 
                    flex: 1, 
                    minHeight: 0, 
                    display: 'flex', 
                    flexDirection: 'column',
                    overflow: 'hidden',
                    padding: 0,
                  },
                }}
              >
                {/* Figma: Header with title, subtitle, filters, date tabs */}
                <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #E5E7EB' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#262626' }}>Lab Reports Queue</h3>
                      <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6B7280' }}>Manage and track lab test reports</p>
                    </div>
                    <Space size={12}>
                      <Select
                        value={statusFilter}
                        onChange={setStatusFilter}
                        style={{ width: 140 }}
                        size="small"
                        options={[
                          { value: 'all', label: 'All Status' },
                          { value: 'pending', label: 'Pending' },
                          { value: 'processing', label: 'Processing' },
                          { value: 'ready', label: 'Ready' },
                          { value: 'completed', label: 'Completed' },
                        ]}
                      />
                      <Button type="link" onClick={() => { setSidebarView('report-release'); setLocation('/dashboard/lab?view=report-release'); }} style={{ color: '#8B5CF6', fontWeight: 500, padding: 0 }}>
                        View All <RightOutlined style={{ fontSize: 12, marginLeft: 4 }} />
                      </Button>
                    </Space>
                  </div>
                  {/* Date tabs - Figma */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {[
                      { id: 'today' as const, label: 'Today', count: dateTabCounts.today },
                      { id: 'yesterday' as const, label: 'Yesterday', count: dateTabCounts.yesterday },
                      { id: 'all' as const, label: 'All', count: dateTabCounts.all },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setDateTab(tab.id)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 8,
                          fontSize: 14,
                          fontWeight: 500,
                          border: 'none',
                          cursor: 'pointer',
                          background: dateTab === tab.id ? '#EDE9FE' : 'transparent',
                          color: dateTab === tab.id ? '#7C3AED' : '#6B7280',
                        }}
                      >
                        {tab.label}
                        <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 9999, fontSize: 12, background: dateTab === tab.id ? '#7C3AED' : '#F3F4F6', color: dateTab === tab.id ? '#fff' : '#6B7280' }}>
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ 
                  flex: 1, 
                  minHeight: 0, 
                  display: 'flex', 
                  flexDirection: 'column',
                  overflow: 'hidden',
                  padding: isMobile ? 12 : 16,
                }}>
                  {/* Doctor Requests table (when any) - show above main table */}
                  {doctorRequests.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <Space style={{ marginBottom: 12 }}>
                        <ExperimentOutlined style={{ color: '#8B5CF6' }} />
                        <Text strong>Doctor Requests ({doctorRequests.length})</Text>
                        <Tag color="purple">New</Tag>
                      </Space>
                      {isMobile ? (
                        <Space direction="vertical" size={12} style={{ width: '100%' }}>
                          {doctorRequests.map((report: any) => {
                            const row = { ...report, id: report.id, patient: report.patientName || report.patient || 'Unknown', testName: report.testName || 'Test', date: report.reportDate ? new Date(report.reportDate).toLocaleDateString() : 'N/A', result: 'Requested', priority: report.priority || 'Normal', status: report.status || 'pending' };
                            return renderMobileReportCard(row, { accentBorder: true, badgeText: 'New' });
                          })}
                        </Space>
                      ) : (
                        <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                          <Table columns={reportColumns} dataSource={doctorRequests.map((r: any) => ({ ...r, id: r.id, patient: r.patientName || r.patient || 'Unknown', testName: r.testName || 'Test', hospital: r.hospitalName ?? '—', date: r.reportDate ? new Date(r.reportDate).toLocaleDateString() : 'N/A', result: 'Requested', priority: r.priority || 'Normal', status: r.status || 'pending' }))} pagination={false} rowKey="id" size="small" scroll={{ x: 'max-content' }} style={{ backgroundColor: '#FAFAFA' }} />
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
                        style={{ backgroundColor: '#fff' }}
                        className="lab-reports-queue-table"
                      />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {/* Figma: Doctor Requests footer bar */}
                <div style={{ padding: '16px 24px', background: '#FAFAFA', borderTop: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#262626' }}>Doctor Requests</span>
                    <span style={{ padding: '2px 8px', background: '#8B5CF6', color: '#fff', fontSize: 12, fontWeight: 500, borderRadius: 9999 }}>New</span>
                    <span style={{ fontSize: 14, color: '#6B7280' }}>({doctorRequests.length} pending)</span>
                  </div>
                  <Button type="link" size="small" style={{ color: '#8B5CF6', fontWeight: 500 }} onClick={() => message.info('View requests')}>
                    View Requests
                    <RightOutlined style={{ marginLeft: 4, fontSize: 12 }} />
                  </Button>
                </div>
              </Card>
            </Col>
          </Row>
              </>
            )}
          </div>
        </Content>
      </Layout>
      </Layout>

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
    </>
  );
}
