import React, { useMemo } from 'react';
import { Menu, Button, Typography, message } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { DashboardIcon } from '../../assets/icons/DashboardIcon';
import { AppointmentIcon } from '../../assets/icons/AppointmentIcon';
import { PrescriptionIcon } from '../../assets/icons/PrescriptionIcon';
import { LabIcon } from '../../assets/icons/LabIcon';
import { useAuth } from '../../hooks/use-auth';
import { useLocation } from 'wouter';
import { StarOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface PatientSidebarProps {
  selectedMenuKey?: string;
  onMenuClick?: () => void;
}

export const PatientSidebar: React.FC<PatientSidebarProps> = ({ 
  selectedMenuKey = 'dashboard',
  onMenuClick 
}) => {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Generate patient ID (PAT-YYYY-XXX format)
  const patientId = useMemo(() => {
    if (user?.id) {
      const year = new Date().getFullYear();
      const idNum = String(user.id).padStart(3, '0');
      return `PAT-${year}-${idNum}`;
    }
    return 'PAT-2024-001';
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
    return 'UP';
  }, [user?.fullName]);

  const sidebarMenu = useMemo(() => [
    { 
      key: 'dashboard', 
      icon: <DashboardIcon size={18} color={selectedMenuKey === 'dashboard' ? '#1A8FE3' : '#8C8C8C'} />, 
      label: 'Dashboard' 
    },
    { 
      key: 'appointments', 
      icon: <AppointmentIcon size={18} color={selectedMenuKey === 'appointments' ? '#1A8FE3' : '#8C8C8C'} />, 
      label: 'Appointments' 
    },
    { 
      key: 'prescriptions', 
      icon: <PrescriptionIcon size={18} color={selectedMenuKey === 'prescriptions' ? '#1A8FE3' : '#8C8C8C'} />, 
      label: 'Prescriptions' 
    },
    { 
      key: 'reports', 
      icon: <LabIcon size={18} color={selectedMenuKey === 'reports' ? '#1A8FE3' : '#8C8C8C'} />, 
      label: 'Lab Reports' 
    },
  ], [selectedMenuKey]);

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
        message.info('Lab reports page coming soon.');
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
      background: '#fff',
    }}>
      {/* NexaCare Logo/Name Section */}
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
          background: '#1A8FE3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '24px',
        }}>
          <StarOutlined />
        </div>
        <div style={{ textAlign: 'center' }}>
          <Text strong style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111827', lineHeight: 1.4 }}>
            NexaCare
          </Text>
          <Text style={{ display: 'block', fontSize: '12px', color: '#6B7280', lineHeight: 1.4 }}>
            Healthcare System
          </Text>
        </div>
      </div>

      {/* Navigation Menu */}
      <Menu
        className="patient-dashboard-menu"
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
        onClick={(e) => handleMenuClick(e.key)}
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
          {/* First Row: Avatar + Name (top) + ID (below) */}
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
              background: '#1A8FE3',
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
                {user?.fullName || 'Uma Patel'}
              </Text>
              <Text style={{ display: 'block', fontSize: '12px', color: '#8C8C8C' }}>
                ID: {patientId}
              </Text>
            </div>
          </div>
          
          {/* Separator Line */}
          <div style={{
            height: '1px',
            background: '#E5E7EB',
            marginBottom: '12px',
          }} />
          
          {/* Second Row: Active Patient + Settings Icon */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            {/* Active Patient on left */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#10B981',
              }} />
              <Text style={{ fontSize: '12px', color: '#10B981', fontWeight: 500 }}>
                Active Patient
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
};

