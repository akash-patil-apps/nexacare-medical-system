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

  const labPrimary = '#8B5CF6';
  const labPrimaryHover = '#7C3AED';
  const activeBg = labPrimary;
  const activeColor = '#fff';
  const inactiveColor = '#6B7280';
  const logoutColor = '#EF4444';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#fff',
      width: 80,
      alignItems: 'center',
      padding: '24px 0',
      borderRight: '1px solid #E5E7EB',
    }}>
      {/* Profile - top */}
      <Button
        type="text"
        icon={<UserOutlined style={{ fontSize: 24, color: inactiveColor }} />}
        style={{
          width: 48,
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          borderRadius: 8,
          marginBottom: 16,
        }}
        onClick={() => setLocation('/dashboard/profile')}
        title="Profile"
      />

      {/* Nav items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1, alignItems: 'center' }}>
        {[
          { key: 'dashboard', Icon: DashboardOutlined, label: 'Dashboard' },
          { key: 'pending-orders', Icon: ExperimentOutlined, label: 'Pending Orders' },
          { key: 'result-entry', Icon: FileSearchOutlined, label: 'Result Entry' },
          { key: 'report-release', Icon: CheckCircleOutlined, label: 'Report Release' },
        ].map(({ key, Icon, label }) => {
          const isActive = selectedMenuKey === key;
          return (
            <Button
              key={key}
              type="text"
              icon={<Icon style={{ fontSize: 24, color: isActive ? activeColor : inactiveColor }} />}
              style={{
                width: 48,
                height: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isActive ? activeBg : 'transparent',
                borderRadius: 8,
                marginBottom: 16,
              }}
              onClick={() => handleMenuClick(key)}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = '#F3F4F6';
                  e.currentTarget.querySelector('.anticon')?.setAttribute('style', `font-size: 24px; color: ${inactiveColor}`);
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
              }}
              title={label}
            />
          );
        })}
      </div>

      {/* Logout - bottom */}
      <Button
        type="text"
        icon={<LogoutOutlined style={{ fontSize: 24, color: logoutColor }} />}
        style={{
          width: 48,
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          marginTop: 'auto',
        }}
        onClick={() => logout()}
        title="Logout"
        onMouseEnter={(e) => { e.currentTarget.style.background = '#FEF2F2'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      />
    </div>
  );
};
