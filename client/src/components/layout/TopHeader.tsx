import React, { useState, useMemo } from 'react';
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
import type { MenuProps } from 'antd';
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
  SwapOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { useLocation } from 'wouter';
import { getMessagesPathForRole } from '../../lib/messages-route';
import { useQuery } from '@tanstack/react-query';
import { useActingPatient } from '../../hooks/use-acting-patient';
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
  /** Role primary color for avatar (e.g. receptionist #F97316). When not set, uses default blue. */
  primaryColor?: string;
}

const DEFAULT_HEADER_PRIMARY = '#1A8FE3';

export const TopHeader: React.FC<TopHeaderProps> = ({
  userName,
  userRole,
  userId,
  userInitials,
  notificationCount = 0,
  onSearch,
  primaryColor = DEFAULT_HEADER_PRIMARY,
}) => {
  const { logout, user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [actingPatientId, setActingPatientId] = useActingPatient();
  const isPatient = user?.role?.toUpperCase() === 'PATIENT';

  const { data: patientProfile } = useQuery({
    queryKey: ['/api/patients/profile', 'header'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const res = await fetch('/api/patients/profile', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user && isPatient,
  });

  const { data: familyMembers = [] } = useQuery({
    queryKey: ['/api/patients/family-members', 'header'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const res = await fetch('/api/patients/family-members', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user && isPatient,
  });

  // Get acting patient info if switched
  const { data: actingPatientInfo } = useQuery({
    queryKey: ['/api/patients', actingPatientId, 'header'],
    queryFn: async () => {
      if (!actingPatientId || !isPatient) return null;
      const token = localStorage.getItem('auth-token');
      const res = await fetch(`/api/patients/profile-by-id/${actingPatientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user && isPatient && !!actingPatientId,
  });

  // Determine display name: acting patient or main user
  const displayName = actingPatientInfo?.user?.fullName || userName;
  const displayInitials = useMemo(() => {
    if (actingPatientInfo?.user?.fullName) {
      const names = actingPatientInfo.user.fullName.split(' ');
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return actingPatientInfo.user.fullName.substring(0, 2).toUpperCase();
    }
    return userInitials;
  }, [actingPatientInfo, userInitials]);

  // Determine display ID: use acting patient's ID if switched, otherwise use passed userId
  const displayUserId = useMemo(() => {
    if (actingPatientInfo?.id) {
      // Use the acting patient's patient ID to generate the formatted ID
      // actingPatientInfo structure: { id: patientId, userId, ..., user: {...} }
      const year = new Date().getFullYear();
      const idNum = String(actingPatientInfo.id).padStart(3, '0');
      return `PAT-${year}-${idNum}`;
    }
    return userId; // Fall back to the passed userId prop (for main user or non-patient roles)
  }, [actingPatientInfo?.id, userId]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  // Unread message count for Messages icon badge
  const { data: unreadMessagesData } = useQuery({
    queryKey: ['/api/messages/unread-count'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const res = await fetch('/api/messages/unread-count', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return { count: 0 };
      return res.json() as Promise<{ count: number }>;
    },
    enabled: !!user,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
  const unreadMessageCount = unreadMessagesData?.count ?? 0;

  const switchAccountChildren: MenuProps['items'] = useMemo(() => {
    if (!isPatient || !patientProfile?.id) return undefined;
    const items: NonNullable<MenuProps['items']> = [
      {
        key: 'switch-self',
        label: 'Self',
        onClick: () => {
          setActingPatientId(null);
          message.success('Now using your own account');
        },
      },
    ];
    familyMembers.forEach((m: { relatedPatientId: number; relationship: string; fullName: string }) => {
      const label = `${m.relationship.charAt(0).toUpperCase() + m.relationship.slice(1)} (${m.fullName})`;
      items.push({
        key: `switch-${m.relatedPatientId}`,
        label,
        onClick: () => {
          setActingPatientId(m.relatedPatientId);
          message.success(`Now booking as ${m.fullName}`);
        },
      });
    });
    return items;
  }, [isPatient, patientProfile?.id, familyMembers, setActingPatientId]);

  const userMenuItems: MenuProps['items'] = useMemo(() => {
    const items: MenuProps['items'] = [
      {
        key: 'profile',
        label: 'Profile',
        icon: <UserOutlined />,
        onClick: () => setLocation('/dashboard/profile'),
      },
      {
        key: 'settings',
        label: 'Settings',
        icon: <SettingOutlined />,
        onClick: () => message.info('Settings coming soon.'),
      },
    ];
    if (switchAccountChildren && switchAccountChildren.length > 0) {
      items.push({
        key: 'switch-account',
        label: 'Switch account',
        icon: <SwapOutlined />,
        children: switchAccountChildren,
      });
    }
    items.push(
      { type: 'divider' },
      {
        key: 'logout',
        label: 'Logout',
        icon: <LogoutOutlined />,
        danger: true,
        onClick: () => logout(),
      }
    );
    return items;
  }, [setLocation, switchAccountChildren, logout]);

  const isPatientHeader = userRole === 'Patient';

  // Figma Patient Header: Welcome back, Patient ID, notification bell 40x40, profile (32px avatar, name, "Patient", chevron)
  if (isPatientHeader) {
    return (
      <header
        style={{
          background: '#fff',
          borderBottom: `1px solid #E5E7EB`,
          paddingLeft: 24,
          paddingRight: 24,
          paddingTop: 16,
          paddingBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 500, color: '#262626', lineHeight: 1.5 }}>
            Welcome back
          </h1>
          <p style={{ margin: 0, marginTop: 2, fontSize: 14, color: '#6B7280', lineHeight: 1.5 }}>
            Patient ID: {displayUserId}
          </p>
        </div>
        <Space size={16}>
          <Badge count={notificationCount} size="small" offset={[-2, 2]}>
            <button
              type="button"
              style={{
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#F3F4F6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
              onClick={() => message.info('Notifications')}
            >
              <BellOutlined style={{ fontSize: 20, color: '#6B7280' }} />
            </button>
          </Badge>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
            <button
              type="button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '8px 12px',
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#F3F4F6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: primaryColor,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {displayInitials}
              </div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ margin: 0, fontSize: 14, color: '#262626', fontWeight: 400, lineHeight: 1.3 }}>
                  {displayName}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: '#6B7280', lineHeight: 1.3 }}>
                  {userRole}
                </p>
              </div>
              <DownOutlined style={{ fontSize: 16, color: '#6B7280' }} />
            </button>
          </Dropdown>
        </Space>
      </header>
    );
  }

  return (
    <div
      style={{
        background: '#fff',
        borderBottom: '1px solid #E5E7EB',
        padding: '0 24px',
        height: '85px',
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
        <Badge count={unreadMessageCount} size="small" offset={[-4, 4]}>
          <Button
            type="text"
            icon={<MessageOutlined style={{ fontSize: '18px', color: '#8C8C8C' }} />}
            style={{ color: '#8C8C8C' }}
            title="Messages"
            onClick={() => setLocation(getMessagesPathForRole(user?.role))}
          />
        </Badge>

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
                backgroundColor: primaryColor,
                color: '#fff',
                fontWeight: 600,
              }}
            >
              {displayInitials}
            </Avatar>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Text strong style={{ fontSize: '13px', lineHeight: 1.2 }}> {/* Reduced from 14px */}
                {displayName}
              </Text>
              <Text style={{ fontSize: '11px', color: '#8C8C8C', lineHeight: 1.2 }}> {/* Reduced from 12px */}
                {displayUserId}
              </Text>
            </div>
            <SettingOutlined style={{ fontSize: '14px', color: '#8C8C8C' }} /> {/* Reduced from 16px */}
          </Space>
        </Dropdown>
      </Space>
    </div>
  );
};
