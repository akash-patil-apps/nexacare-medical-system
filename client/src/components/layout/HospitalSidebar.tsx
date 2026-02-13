import React from 'react';
import { Button, message } from 'antd';
import {
  UserOutlined,
  BankOutlined,
  MessageOutlined,
  FileTextOutlined,
  BarChartOutlined,
  SolutionOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useLocation } from 'wouter';
import { useAuth } from '../../hooks/use-auth';

interface HospitalSidebarProps {
  selectedMenuKey?: string;
  onMenuClick?: () => void;
}

/** Single sidebar for all hospital/admin pages: dashboard, messages, revenue, staff. Same order everywhere. */
export const HospitalSidebar: React.FC<HospitalSidebarProps> = ({
  selectedMenuKey = 'dashboard',
  onMenuClick,
}) => {
  const [, setLocation] = useLocation();
  const { logout } = useAuth();

  const handleMenuClick = (key: string) => {
    if (onMenuClick) onMenuClick();
    switch (key) {
      case 'dashboard':
        setLocation('/dashboard/hospital');
        if (typeof window !== 'undefined') window.history.replaceState(null, '', '/dashboard/hospital');
        break;
      case 'patients': {
        const path = '/dashboard/hospital?view=patients';
        if (typeof window !== 'undefined') window.history.replaceState(null, '', path);
        setLocation(path);
        break;
      }
      case 'messages':
        setLocation('/admin/messages');
        break;
      case 'reports':
        message.info('Lab Reports page coming soon.');
        break;
      case 'revenue':
        setLocation('/dashboard/hospital/revenue');
        break;
      case 'staff':
        setLocation('/dashboard/hospital/staff');
        break;
      default:
        break;
    }
  };

  const btn = (key: string, icon: React.ReactNode, title: string) => (
    <Button
      type="text"
      icon={icon}
      style={{
        width: '48px',
        height: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: selectedMenuKey === key ? '#E3F2FF' : 'transparent',
        borderRadius: '8px',
      }}
      onClick={() => handleMenuClick(key)}
      title={title}
    />
  );

  const icon = (key: string) => (selectedMenuKey === key ? '#1A8FE3' : '#6B7280');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#fff',
        width: '80px',
        alignItems: 'center',
        padding: '16px 0',
        gap: '12px',
        borderRight: '1px solid #E5E7EB',
      }}
    >
      <Button
        type="text"
        icon={<UserOutlined style={{ fontSize: '20px', color: '#1A8FE3' }} />}
        style={{
          width: '48px',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#E3F2FF',
          borderRadius: '8px',
        }}
        onClick={() => setLocation('/dashboard/profile')}
        title="Profile"
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, alignItems: 'center' }}>
        {btn('dashboard', <BankOutlined style={{ fontSize: '20px', color: icon('dashboard') }} />, 'Dashboard')}
        {btn('patients', <UserOutlined style={{ fontSize: '20px', color: icon('patients') }} />, 'Patients')}
        {btn('messages', <MessageOutlined style={{ fontSize: '20px', color: icon('messages') }} />, 'Messages')}
        {btn('reports', <FileTextOutlined style={{ fontSize: '20px', color: icon('reports') }} />, 'Lab Reports')}
        {btn('revenue', <BarChartOutlined style={{ fontSize: '20px', color: icon('revenue') }} />, 'Revenue')}
        {btn('staff', <SolutionOutlined style={{ fontSize: '20px', color: icon('staff') }} />, 'Staff management')}
      </div>

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
