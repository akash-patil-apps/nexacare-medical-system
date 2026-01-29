import React, { useMemo } from 'react';
import { Button, message } from 'antd';
import { UserOutlined, TeamOutlined, CalendarOutlined, UserAddOutlined, PhoneOutlined, MessageOutlined, LogoutOutlined } from '@ant-design/icons';
import { useLocation } from 'wouter';
import { useAuth } from '../../hooks/use-auth';

interface ReceptionistSidebarProps {
  selectedMenuKey?: string;
  onMenuClick?: () => void;
  hospitalName?: string | null;
}

export const ReceptionistSidebar: React.FC<ReceptionistSidebarProps> = ({ 
  selectedMenuKey = 'dashboard',
  onMenuClick,
}) => {
  const [, setLocation] = useLocation();
  const { logout } = useAuth();

  const handleMenuClick = (key: string) => {
    if (onMenuClick) onMenuClick();
    
    switch (key) {
      case 'dashboard':
        setLocation('/dashboard/receptionist');
        break;
      case 'appointments':
        message.info('Appointments page coming soon.');
        break;
      case 'walkin':
        message.info('Walk-in registration is available from the dashboard.');
        break;
      case 'contacts':
        setLocation('/dashboard/receptionist/contact-directory');
        break;
      case 'messages':
        setLocation('/messages');
        break;
      default:
        break;
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
          icon={<TeamOutlined style={{ fontSize: '20px', color: selectedMenuKey === 'dashboard' ? '#1A8FE3' : '#6B7280' }} />}
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
        />
        
        <Button
          type="text"
          icon={<UserAddOutlined style={{ fontSize: '20px', color: selectedMenuKey === 'walkin' ? '#1A8FE3' : '#6B7280' }} />}
          style={{
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: selectedMenuKey === 'walkin' ? '#E3F2FF' : 'transparent',
            borderRadius: '8px',
          }}
          onClick={() => handleMenuClick('walkin')}
        />
        
        <Button
          type="text"
          icon={<PhoneOutlined style={{ fontSize: '20px', color: selectedMenuKey === 'contacts' ? '#1A8FE3' : '#6B7280' }} />}
          style={{
            width: '48px',
            height: '48px',
              display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: selectedMenuKey === 'contacts' ? '#E3F2FF' : 'transparent',
            borderRadius: '8px',
          }}
          onClick={() => handleMenuClick('contacts')}
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
