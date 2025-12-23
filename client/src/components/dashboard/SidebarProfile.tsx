import { Avatar, Button, Tag, Typography } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';

const { Text } = Typography;

type SidebarProfileProps = {
  collapsed: boolean;
  name?: string | null;
  roleLabel: string;
  avatarIcon: ReactNode;
  onSettingsClick?: () => void;
  hospitalName?: string | null;
  labName?: string | null;
};

export function SidebarProfile({
  collapsed,
  name,
  roleLabel,
  avatarIcon,
  onSettingsClick,
  hospitalName,
  labName,
}: SidebarProfileProps) {
  const organizationName = hospitalName || labName;
  
  return (
    <div
      style={{
        marginTop: 'auto',
        borderTop: '1px solid #D9D9D9',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: '#fff',
        flexShrink: 0,
      }}
    >
      <Avatar 
        size={collapsed ? 48 : 40} 
        icon={avatarIcon}
        style={{ flexShrink: 0 }}
      />
      {!collapsed && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 4, minWidth: 0 }}>
            <Text strong style={{ lineHeight: 1.2, color: '#262626', fontSize: '14px', fontWeight: 600 }}>
              {name || 'User'}
            </Text>
            <Tag 
              style={{ 
                width: 'fit-content',
                background: '#1A8FE3',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 500,
                textTransform: 'uppercase',
              }}
            >
              {roleLabel}
            </Tag>
            {organizationName && (
              <Text style={{ 
                fontSize: '12px', 
                color: '#8C8C8C', 
                marginTop: 2,
                lineHeight: 1.4,
              }}>
                {organizationName}
              </Text>
            )}
          </div>
          {onSettingsClick && (
            <Button 
              type="text" 
              icon={<SettingOutlined style={{ color: '#8C8C8C', fontSize: '18px' }} />} 
              onClick={onSettingsClick}
              style={{ flexShrink: 0, padding: 0, width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            />
          )}
        </>
      )}
    </div>
  );
}



