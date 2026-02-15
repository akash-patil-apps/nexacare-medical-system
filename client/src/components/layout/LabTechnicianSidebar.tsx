import React from 'react';
import { Button } from 'antd';
import { UserOutlined, DashboardOutlined, ExperimentOutlined, FileSearchOutlined, CheckCircleOutlined, LogoutOutlined } from '@ant-design/icons';
import { useLocation } from 'wouter';
import { useAuth } from '../../hooks/use-auth';

const LAB_VIEWS = ['dashboard', 'pending-orders', 'result-entry', 'report-release'] as const;

interface LabTechnicianSidebarProps {
  selectedMenuKey?: string;
  onMenuClick?: (key?: string) => void;
  hospitalName?: string | null;
}

export const LabTechnicianSidebar: React.FC<LabTechnicianSidebarProps> = ({ 
  selectedMenuKey = 'dashboard',
  onMenuClick,
}) => {
  const [, setLocation] = useLocation();
  const { logout } = useAuth();
  const handleMenuClick = (key: string) => {
    if (onMenuClick) onMenuClick(key);
    if (key && LAB_VIEWS.includes(key as any)) {
      const path = key === 'dashboard' ? '/dashboard/lab' : `/dashboard/lab?view=${key}`;
      if (typeof window !== 'undefined') window.history.replaceState(null, '', path);
      setLocation(path);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      background: '#fff', // White background matching PatientSidebar
      width: '80px', // Narrow vertical bar
      alignItems: 'center',
      padding: '16px 0',
      gap: '12px',
      borderRight: '1px solid #E5E7EB', // Light border on right
    }}>
      {/* User Icon at Top */}
      <Button
        type="text"
        icon={<UserOutlined style={{ fontSize: '20px', color: '#1A8FE3' }} />}
        style={{
          width: '48px',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#E3F2FF', // Light blue background for active user icon
          borderRadius: '8px',
        }}
        onClick={() => setLocation('/dashboard/profile')}
      />

      {/* Navigation Icons - Vertical Stack */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, alignItems: 'center' }}>
        <Button
          type="text"
          icon={<DashboardOutlined style={{ fontSize: '20px', color: selectedMenuKey === 'dashboard' ? '#1A8FE3' : '#6B7280' }} />}
          style={{
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: selectedMenuKey === 'dashboard' ? '#E3F2FF' : 'transparent',
            borderRadius: '8px',
          }}
          onClick={() => handleMenuClick('dashboard')}
          title="Dashboard"
        />
        
        <Button
          type="text"
          icon={<ExperimentOutlined style={{ fontSize: '20px', color: selectedMenuKey === 'pending-orders' ? '#1A8FE3' : '#6B7280' }} />}
          style={{
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: selectedMenuKey === 'pending-orders' ? '#E3F2FF' : 'transparent',
            borderRadius: '8px',
          }}
          onClick={() => handleMenuClick('pending-orders')}
          title="Pending orders"
        />
        
        <Button
          type="text"
          icon={<FileSearchOutlined style={{ fontSize: '20px', color: selectedMenuKey === 'result-entry' ? '#1A8FE3' : '#6B7280' }} />}
          style={{
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: selectedMenuKey === 'result-entry' ? '#E3F2FF' : 'transparent',
            borderRadius: '8px',
          }}
          onClick={() => handleMenuClick('result-entry')}
          title="Result entry"
        />
        
        <Button
          type="text"
          icon={<CheckCircleOutlined style={{ fontSize: '20px', color: selectedMenuKey === 'report-release' ? '#1A8FE3' : '#6B7280' }} />}
          style={{ 
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: selectedMenuKey === 'report-release' ? '#E3F2FF' : 'transparent',
            borderRadius: '8px',
          }}
          onClick={() => handleMenuClick('report-release')}
          title="Report release"
        />
            </div>

      {/* Bottom Icons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
        <Button
          type="text"
          icon={<LogoutOutlined style={{ fontSize: '20px', color: '#EF4444' }} />}
          style={{
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => logout()}
          title="Logout"
        />
      </div>
    </div>
  );
};
