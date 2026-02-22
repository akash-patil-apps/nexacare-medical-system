import React from 'react';
import { Button } from 'antd';
import { UserOutlined, TeamOutlined, CalendarOutlined, PhoneOutlined, MessageOutlined, LogoutOutlined, MedicineBoxOutlined } from '@ant-design/icons';
import { useLocation } from 'wouter';
import { useAuth } from '../../hooks/use-auth';
import { ROLE_PRIMARY, FIGMA_COLORS, FIGMA_RECEPTIONIST } from '../../design-tokens';

const RECEPTIONIST_PRIMARY = ROLE_PRIMARY.receptionist;

interface ReceptionistSidebarProps {
  selectedMenuKey?: string;
  onMenuClick?: () => void;
  hospitalName?: string | null;
  /** When provided and user clicks Dashboard while already on dashboard, switch to main view (e.g. appointments tab) */
  onDashboardClick?: () => void;
  /** When provided and user clicks Appointments while on dashboard, switch to appointments tab instead of navigating */
  onAppointmentsClick?: () => void;
}

export const ReceptionistSidebar: React.FC<ReceptionistSidebarProps> = ({ 
  selectedMenuKey = 'dashboard',
  onMenuClick,
  onDashboardClick,
  onAppointmentsClick,
}) => {
  const [location, setLocation] = useLocation();
  const { logout } = useAuth();

  const handleMenuClick = (key: string) => {
    if (onMenuClick) onMenuClick();
    
    switch (key) {
      case 'dashboard':
        if (onDashboardClick && location === '/dashboard/receptionist') {
          onDashboardClick();
        } else {
          setLocation('/dashboard/receptionist');
        }
        break;
      case 'appointments':
        setLocation('/receptionist/appointments');
        break;
      case 'ipd':
        setLocation('/dashboard/receptionist/ipd');
        break;
      case 'contacts':
        setLocation('/dashboard/receptionist/contact-directory');
        break;
      case 'messages':
        setLocation('/receptionist/messages');
        break;
      default:
        break;
    }
  };

  const navBtn = (key: string, Icon: React.ComponentType<{ style?: React.CSSProperties }>) => {
    const isActive = selectedMenuKey === key;
    return (
      <Button
        type="text"
        icon={<Icon style={{ fontSize: FIGMA_RECEPTIONIST.sidebarIconSize, color: isActive ? '#fff' : FIGMA_COLORS.textMuted }} />}
        style={{
          width: FIGMA_RECEPTIONIST.sidebarButtonSize,
          height: FIGMA_RECEPTIONIST.sidebarButtonSize,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isActive ? RECEPTIONIST_PRIMARY : 'transparent',
          borderRadius: 10,
        }}
        onClick={() => handleMenuClick(key)}
      />
    );
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: FIGMA_COLORS.backgroundCard,
      width: 80,
      alignItems: 'center',
      padding: FIGMA_RECEPTIONIST.sidebarPadding,
      gap: FIGMA_RECEPTIONIST.sidebarGap,
      borderRight: `1px solid ${FIGMA_COLORS.border}`,
    }}>
      {/* Profile - neutral (Figma: icon only) */}
      <Button
        type="text"
        icon={<UserOutlined style={{ fontSize: FIGMA_RECEPTIONIST.sidebarIconSize, color: FIGMA_COLORS.textMuted }} />}
        style={{
          width: FIGMA_RECEPTIONIST.sidebarButtonSize,
          height: FIGMA_RECEPTIONIST.sidebarButtonSize,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: FIGMA_COLORS.backgroundPage,
          borderRadius: 10,
        }}
        onClick={() => setLocation('/dashboard/profile')}
        title="Profile"
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: FIGMA_RECEPTIONIST.sidebarGap, flex: 1, alignItems: 'center' }}>
        {navBtn('dashboard', TeamOutlined)}
        <Button
          type="text"
          icon={<CalendarOutlined style={{ fontSize: FIGMA_RECEPTIONIST.sidebarIconSize, color: selectedMenuKey === 'appointments' ? '#fff' : FIGMA_COLORS.textMuted }} />}
          style={{
            width: FIGMA_RECEPTIONIST.sidebarButtonSize,
            height: FIGMA_RECEPTIONIST.sidebarButtonSize,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: selectedMenuKey === 'appointments' ? RECEPTIONIST_PRIMARY : 'transparent',
            borderRadius: 10,
          }}
          onClick={() => handleMenuClick('appointments')}
          title="Appointments"
        />
        <Button
          type="text"
          icon={<MedicineBoxOutlined style={{ fontSize: FIGMA_RECEPTIONIST.sidebarIconSize, color: selectedMenuKey === 'ipd' ? '#fff' : FIGMA_COLORS.textMuted }} />}
          style={{
            width: FIGMA_RECEPTIONIST.sidebarButtonSize,
            height: FIGMA_RECEPTIONIST.sidebarButtonSize,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: selectedMenuKey === 'ipd' ? RECEPTIONIST_PRIMARY : 'transparent',
            borderRadius: 10,
          }}
          onClick={() => handleMenuClick('ipd')}
          title="IPD Management"
        />
        {navBtn('contacts', PhoneOutlined)}
        {navBtn('messages', MessageOutlined)}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: FIGMA_RECEPTIONIST.sidebarGap, alignItems: 'center' }}>
        <Button
          type="text"
          icon={<LogoutOutlined style={{ fontSize: FIGMA_RECEPTIONIST.sidebarIconSize, color: FIGMA_COLORS.error }} />}
          style={{ width: FIGMA_RECEPTIONIST.sidebarButtonSize, height: FIGMA_RECEPTIONIST.sidebarButtonSize, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}
          onClick={() => logout()}
          title="Logout"
        />
      </div>
    </div>
  );
};
