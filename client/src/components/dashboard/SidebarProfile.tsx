import { Avatar, Button, Tag, Typography } from 'antd';
import { SettingOutlined, LogoutOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';

const { Text } = Typography;

type SidebarProfileProps = {
  collapsed: boolean;
  name?: string | null;
  roleLabel: string;
  roleColor: string;
  avatarIcon: ReactNode;
  onSettingsClick?: () => void;
  onLogoutClick?: () => void;
};

export function SidebarProfile({
  collapsed,
  name,
  roleLabel,
  roleColor,
  avatarIcon,
  onSettingsClick,
  onLogoutClick,
}: SidebarProfileProps) {
  return (
    <div
      style={{
        marginTop: 'auto',
        borderTop: '1px solid #f0f0f0',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <Avatar size={collapsed ? 48 : 40} icon={avatarIcon} />
      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <Text strong style={{ lineHeight: 1.2 }}>
            {name || 'User'}
          </Text>
          <Tag color={roleColor} style={{ width: 'fit-content', marginTop: 4 }}>
            {roleLabel}
          </Tag>
        </div>
      )}
      {!collapsed && (
        <div style={{ display: 'flex', gap: 4 }}>
          {onSettingsClick && (
            <Button type="text" icon={<SettingOutlined />} onClick={onSettingsClick} />
          )}
          {onLogoutClick && (
            <Button type="text" icon={<LogoutOutlined />} onClick={onLogoutClick} />
          )}
        </div>
      )}
    </div>
  );
}

