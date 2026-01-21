import React, { useState } from 'react';
import { 
  Input, 
  Avatar, 
  Badge, 
  Button, 
  Dropdown, 
  Space, 
  Typography,
  Breadcrumb,
  message,
} from 'antd';
import {
  SearchOutlined,
  BellOutlined,
  SettingOutlined,
  PhoneOutlined,
  MessageOutlined,
  UserOutlined,
  LogoutOutlined,
  MoonOutlined,
  SunOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { useLocation } from 'wouter';
import { NotificationBell } from '../notifications/NotificationBell';

const { Text } = Typography;

interface TopHeaderProps {
  userName: string;
  userRole: string;
  userId: string;
  userInitials: string;
  notificationCount?: number;
  onSearch?: (query: string) => void;
  bgColor?: string;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  userName,
  userRole,
  userId,
  userInitials,
  notificationCount = 0,
  onSearch,
}) => {
  const { logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const userMenuItems = [
    {
      key: 'profile',
      label: 'Profile',
      icon: <UserOutlined />,
      onClick: () => message.info('Profile coming soon.'),
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: <SettingOutlined />,
      onClick: () => message.info('Settings coming soon.'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      label: 'Logout',
      icon: <LogoutOutlined />,
      danger: true,
      onClick: () => logout(),
    },
  ];

  return (
    <div
      style={{
        background: '#fff',
        borderBottom: '1px solid #E5E7EB',
        padding: '0 16px', // Reduced from 24px to save space
        height: '56px', // Reduced from 64px
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      {/* Left: Breadcrumb */}
      <Breadcrumb
        style={{ fontSize: '14px' }}
        items={[
          {
            title: userRole,
          },
          {
            title: 'Dashboard',
          },
        ]}
      />

      {/* Center: Search Bar */}
      <div style={{ flex: 1, maxWidth: '600px', margin: '0 16px' }}> {/* Reduced margin */}
        <Input
          placeholder="Search..."
          prefix={<SearchOutlined style={{ color: '#8C8C8C' }} />}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          style={{
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
          }}
          allowClear
        />
      </div>

      {/* Right: Action Icons + User */}
      <Space size={16}>
        {/* Keyboard Shortcut Icon */}
        <Button
          type="text"
          style={{ 
            color: '#8C8C8C',
            fontSize: '12px',
            fontWeight: 600,
            padding: '4px 8px',
            minWidth: 'auto',
            height: 'auto',
          }}
          title="Search (⌘F)"
        >
          ⌘F
        </Button>

        {/* Dark Mode Toggle */}
        <Button
          type="text"
          icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />}
          style={{ color: '#8C8C8C', fontSize: '18px' }}
          onClick={() => setIsDarkMode(!isDarkMode)}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        />

        {/* Messages */}
        <Button
          type="text"
          icon={<MessageOutlined style={{ fontSize: '18px', color: '#8C8C8C' }} />}
          style={{ color: '#8C8C8C' }}
          onClick={() => message.info('Messages coming soon.')}
        />

        {/* Phone */}
        <Button
          type="text"
          icon={<PhoneOutlined style={{ fontSize: '18px', color: '#8C8C8C' }} />}
          style={{ color: '#8C8C8C' }}
          title="Call Support: 11 99 92 33"
        >
          <Text style={{ fontSize: '14px', color: '#8C8C8C', marginLeft: 4 }}>
            11 99 92 33
          </Text>
        </Button>

        {/* Notifications */}
        <NotificationBell />

        {/* User Avatar with Dropdown */}
        <Dropdown
          menu={{ items: userMenuItems }}
          placement="bottomRight"
          trigger={['click']}
        >
          <Space
            style={{
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '8px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F3F4F6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Avatar
              size="small"
              style={{
                backgroundColor: '#1A8FE3',
                color: '#fff',
                fontWeight: 600,
              }}
            >
              {userInitials}
            </Avatar>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Text strong style={{ fontSize: '13px', lineHeight: 1.2 }}> {/* Reduced from 14px */}
                {userName}
              </Text>
              <Text style={{ fontSize: '11px', color: '#8C8C8C', lineHeight: 1.2 }}> {/* Reduced from 12px */}
                {userId}
              </Text>
            </div>
            <SettingOutlined style={{ fontSize: '14px', color: '#8C8C8C' }} /> {/* Reduced from 16px */}
          </Space>
        </Dropdown>
      </Space>
    </div>
  );
};
