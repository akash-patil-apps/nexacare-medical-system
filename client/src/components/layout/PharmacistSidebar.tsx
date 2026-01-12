import React, { useMemo, useState } from 'react';
import { Menu, Button, Typography, message, Badge, Space } from 'antd';
import { 
  SettingOutlined, 
  BellOutlined,
  DashboardOutlined,
  MedicineBoxOutlined,
  ShoppingCartOutlined,
  FileTextOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { useLocation } from 'wouter';

const { Text } = Typography;

interface PharmacistSidebarProps {
  selectedMenuKey?: string;
  onMenuClick?: (key?: string) => void;
  hospitalName?: string | null;
}

export const PharmacistSidebar: React.FC<PharmacistSidebarProps> = ({ 
  selectedMenuKey = 'dashboard',
  onMenuClick,
  hospitalName,
}) => {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Generate pharmacist ID (PHA-YYYY-XXX format)
  const pharmacistId = useMemo(() => {
    if (user?.id) {
      const year = new Date().getFullYear();
      const idNum = String(user.id).padStart(3, '0');
      return `PHA-${year}-${idNum}`;
    }
    return 'PHA-2024-001';
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
    return 'PH';
  }, [user?.fullName]);

  const sidebarMenu = useMemo(() => [
    { 
      key: 'dashboard', 
      icon: <DashboardOutlined style={{ fontSize: 20 }} />, 
      label: 'Dashboard' 
    },
    { 
      key: 'prescriptions', 
      icon: <MedicineBoxOutlined style={{ fontSize: 20 }} />, 
      label: 'Prescriptions' 
    },
    { 
      key: 'inventory', 
      icon: <ShoppingCartOutlined style={{ fontSize: 20 }} />, 
      label: 'Inventory' 
    },
    { 
      key: 'reports', 
      icon: <FileTextOutlined style={{ fontSize: 20 }} />, 
      label: 'Reports' 
    },
  ], []);

  const handleMenuClick = (key: string) => {
    setShowNotifications(false);
    setShowSettings(false);
    if (onMenuClick) {
      onMenuClick(key);
    }
  };

  // Mock notifications (replace with real data)
  const unreadCount = 0;

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      background: '#fff',
      borderRight: '1px solid #E5E7EB',
    }}>
      {/* Logo/Name Section */}
      <div style={{
        padding: '20px 16px',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: '#10B981',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 24,
        }}>
          <StarOutlined />
        </div>
        <div style={{ textAlign: 'center' }}>
          <Text strong style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#111827', lineHeight: 1.4 }}>
            NexaCare
          </Text>
          <Text style={{ display: 'block', fontSize: 12, color: '#6B7280', lineHeight: 1.4 }}>
            Healthcare System
          </Text>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav style={{ padding: '16px 16px 24px', flex: 1, overflowY: 'auto' }}>
        <Menu
          className="pharmacist-dashboard-menu"
          mode="inline"
          selectedKeys={[selectedMenuKey]}
          items={sidebarMenu}
          style={{ 
            border: 'none', 
            background: 'transparent',
          }}
          onClick={(e) => handleMenuClick(e.key)}
        />
      </nav>

      {/* User Info Footer */}
      <div style={{
        borderTop: '1px solid #E5E7EB',
        padding: 16,
        flexShrink: 0,
        background: '#fff',
      }}>
        <div style={{
          background: '#F3F4F6',
          borderRadius: 12,
          padding: 16,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            marginBottom: 12,
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              flexShrink: 0,
            }}>
              {userInitials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text strong style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#262626', lineHeight: 1.5, marginBottom: 4 }}>
                {user?.fullName || 'Pharmacist'}
              </Text>
              <Text style={{ display: 'block', fontSize: 12, color: '#8C8C8C' }}>
                ID: {pharmacistId}
              </Text>
              {hospitalName && (
                <Text style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                  {hospitalName}
                </Text>
              )}
            </div>
          </div>
          <div style={{
            height: 1,
            background: '#E5E7EB',
            marginBottom: 12,
          }} />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#10B981',
              }} />
              <Text style={{ fontSize: 12, color: '#10B981', fontWeight: 500 }}>
                Active Pharmacist
              </Text>
            </div>
            <Space size={8}>
              <Badge count={unreadCount} size="small" offset={[-2, 2]}>
                <Button
                  type="text"
                  icon={<BellOutlined style={{ fontSize: 18 }} />}
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    setShowSettings(false);
                  }}
                  style={{
                    color: showNotifications ? '#10B981' : '#8C8C8C',
                    padding: 0,
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                />
              </Badge>
              <Button
                type="text"
                icon={<SettingOutlined style={{ fontSize: 18 }} />}
                onClick={() => {
                  setShowSettings(!showSettings);
                  setShowNotifications(false);
                  message.info('Settings coming soon.');
                }}
                style={{
                  color: showSettings ? '#10B981' : '#8C8C8C',
                  padding: 0,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              />
            </Space>
          </div>
        </div>
      </div>
    </div>
  );
};

