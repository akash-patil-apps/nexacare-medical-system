import React, { useMemo } from 'react';
import { Button } from 'antd';
import { SettingOutlined, UserOutlined, BellOutlined, LogoutOutlined, MessageOutlined } from '@ant-design/icons';
import { DashboardIcon } from '../../assets/icons/DashboardIcon';
import { AppointmentIcon } from '../../assets/icons/AppointmentIcon';
import { PrescriptionIcon } from '../../assets/icons/PrescriptionIcon';
import { LabIcon } from '../../assets/icons/LabIcon';
import { useLocation } from 'wouter';
import { useAuth } from '../../hooks/use-auth';

interface PatientSidebarProps {
  selectedMenuKey?: string;
  onMenuClick?: () => void;
}

export const PatientSidebar: React.FC<PatientSidebarProps> = ({ 
  selectedMenuKey = 'dashboard',
  onMenuClick 
}) => {
  const [, setLocation] = useLocation();
  const { logout } = useAuth();

  const handleMenuClick = (key: string) => {
    if (onMenuClick) onMenuClick();
    
    switch (key) {
      case 'dashboard':
        setLocation('/dashboard/patient');
        break;
      case 'appointments':
        setLocation('/dashboard/patient/appointments');
        break;
      case 'prescriptions':
        setLocation('/dashboard/patient/prescriptions');
        break;
      case 'reports':
        setLocation('/dashboard/patient/reports');
        break;
      case 'messages':
        setLocation('/patient/messages');
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
      background: '#fff', // White background matching Figma
      width: '80px', // Narrow vertical bar
      alignItems: 'center',
      padding: '16px 0',
      gap: '8px',
      borderRight: '1px solid #E5E7EB', // Light border on right
    }}>
      {/* User Icon at Top - Active state with blue background */}
      <Button
        type="text"
        icon={<UserOutlined style={{ fontSize: '20px', color: '#1A8FE3' }} />}
        style={{
          width: '48px',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '8px',
          background: '#E3F2FF', // Light blue background for active state
          borderRadius: '8px',
        }}
        onClick={() => setLocation('/dashboard/profile')}
      />

      {/* Navigation Icons - Vertical Stack */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, alignItems: 'center' }}>
        <Button
          type="text"
          icon={<DashboardIcon size={20} color={selectedMenuKey === 'dashboard' ? '#1A8FE3' : '#6B7280'} />}
          style={{
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: selectedMenuKey === 'dashboard' ? '#E3F2FF' : 'transparent', // Light blue for active
            borderRadius: '8px',
          }}
          onClick={() => handleMenuClick('dashboard')}
        />
        
        <Button
          type="text"
          icon={<AppointmentIcon size={20} color={selectedMenuKey === 'appointments' ? '#1A8FE3' : '#6B7280'} />}
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
          icon={<PrescriptionIcon size={20} color={selectedMenuKey === 'prescriptions' ? '#1A8FE3' : '#6B7280'} />}
          style={{
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: selectedMenuKey === 'prescriptions' ? '#E3F2FF' : 'transparent',
            borderRadius: '8px',
          }}
          onClick={() => handleMenuClick('prescriptions')}
        />
        
        <Button
          type="text"
          icon={<LabIcon size={20} color={selectedMenuKey === 'reports' ? '#1A8FE3' : '#6B7280'} />}
          style={{
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: selectedMenuKey === 'reports' ? '#E3F2FF' : 'transparent',
            borderRadius: '8px',
          }}
          onClick={() => handleMenuClick('reports')}
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
        />
      </div>

      {/* Bottom Icons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
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

