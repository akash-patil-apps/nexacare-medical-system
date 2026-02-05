import React from 'react';
import { Button } from 'antd';
import {
  UserOutlined,
  BankOutlined,
  CalendarOutlined,
  MessageOutlined,
  DollarOutlined,
  TeamOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useLocation } from 'wouter';
import { useAuth } from '../../hooks/use-auth';

interface HospitalSidebarProps {
  selectedMenuKey?: string;
  onMenuClick?: () => void;
}

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
        break;
      case 'appointments':
        setLocation('/dashboard/hospital');
        break;
      case 'messages':
        setLocation('/admin/messages');
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
        <Button
          type="text"
          icon={<BankOutlined style={{ fontSize: '20px', color: selectedMenuKey === 'dashboard' ? '#1A8FE3' : '#6B7280' }} />}
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
          icon={<CalendarOutlined style={{ fontSize: '20px', color: selectedMenuKey === 'appointments' ? '#1A8FE3' : '#6B7280' }} />}
          style={{
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: selectedMenuKey === 'appointments' ? '#E3F2FF' : 'transparent',
            borderRadius: '8px',
          }}
          onClick={() => handleMenuClick('appointments')}
          title="Appointments"
        />
        <Button
          type="text"
          icon={<MessageOutlined style={{ fontSize: '20px', color: selectedMenuKey === 'messages' ? '#1A8FE3' : '#6B7280' }} />}
          style={{
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: selectedMenuKey === 'messages' ? '#E3F2FF' : 'transparent',
            borderRadius: '8px',
          }}
          onClick={() => handleMenuClick('messages')}
          title="Messages"
        />
        <Button
          type="text"
          icon={<DollarOutlined style={{ fontSize: '20px', color: selectedMenuKey === 'revenue' ? '#1A8FE3' : '#6B7280' }} />}
          style={{
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: selectedMenuKey === 'revenue' ? '#E3F2FF' : 'transparent',
            borderRadius: '8px',
          }}
          onClick={() => handleMenuClick('revenue')}
          title="Revenue"
        />
        <Button
          type="text"
          icon={<TeamOutlined style={{ fontSize: '20px', color: selectedMenuKey === 'staff' ? '#1A8FE3' : '#6B7280' }} />}
          style={{
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: selectedMenuKey === 'staff' ? '#E3F2FF' : 'transparent',
            borderRadius: '8px',
          }}
          onClick={() => handleMenuClick('staff')}
          title="Staff management"
        />
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
