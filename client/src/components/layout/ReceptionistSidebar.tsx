import React, { useMemo } from 'react';
import { Menu, Button, Typography, message } from 'antd';
import { SettingOutlined, StarOutlined, TeamOutlined, CalendarOutlined, UserAddOutlined, PhoneOutlined } from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { useLocation } from 'wouter';

const { Text } = Typography;

interface ReceptionistSidebarProps {
  selectedMenuKey?: string;
  onMenuClick?: () => void;
}

export const ReceptionistSidebar: React.FC<ReceptionistSidebarProps> = ({ 
  selectedMenuKey = 'dashboard',
  onMenuClick 
}) => {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  // Generate receptionist ID (REC-YYYY-XXX format)
  const receptionistId = useMemo(() => {
    if (user?.id) {
      const year = new Date().getFullYear();
      const idNum = String(user.id).padStart(3, '0');
      return `REC-${year}-${idNum}`;
    }
    return 'REC-2024-001';
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
    return 'RC';
  }, [user?.fullName]);

  const sidebarMenu = useMemo(() => [
    { 
      key: 'dashboard', 
      icon: <TeamOutlined style={{ fontSize: 18, color: selectedMenuKey === 'dashboard' ? '#1A8FE3' : '#8C8C8C' }} />, 
      label: 'Dashboard' 
    },
    { 
      key: 'appointments', 
      icon: <CalendarOutlined style={{ fontSize: 18, color: selectedMenuKey === 'appointments' ? '#1A8FE3' : '#8C8C8C' }} />, 
      label: 'Appointments' 
    },
    { 
      key: 'walkin', 
      icon: <UserAddOutlined style={{ fontSize: 18, color: selectedMenuKey === 'walkin' ? '#1A8FE3' : '#8C8C8C' }} />, 
      label: 'Walk-in Registration' 
    },
    { 
      key: 'contacts', 
      icon: <PhoneOutlined style={{ fontSize: 18, color: selectedMenuKey === 'contacts' ? '#1A8FE3' : '#8C8C8C' }} />, 
      label: 'Contact Directory' 
    },
  ], [selectedMenuKey]);

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
        message.info('Contact directory coming soon.');
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
        className="receptionist-dashboard-menu"
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
              background: '#F97316',
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
                {user?.fullName || 'Receptionist'}
              </Text>
              <Text style={{ display: 'block', fontSize: '12px', color: '#8C8C8C' }}>
                ID: {receptionistId}
              </Text>
            </div>
          </div>
          
          {/* Separator Line */}
          <div style={{
            height: '1px',
            background: '#E5E7EB',
            marginBottom: '12px',
          }} />
          
          {/* Second Row: Active Receptionist + Settings Icon */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            {/* Active Receptionist on left */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#10B981',
              }} />
              <Text style={{ fontSize: '12px', color: '#10B981', fontWeight: 500 }}>
                Active Receptionist
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



