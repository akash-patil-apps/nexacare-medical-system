import React from 'react';
import { Button } from 'antd';
import { UserOutlined, LogoutOutlined, MessageOutlined } from '@ant-design/icons';
import { DashboardIcon } from '../../assets/icons/DashboardIcon';
import { AppointmentIcon } from '../../assets/icons/AppointmentIcon';
import { PrescriptionIcon } from '../../assets/icons/PrescriptionIcon';
import { LabIcon } from '../../assets/icons/LabIcon';
import { useLocation } from 'wouter';
import { useAuth } from '../../hooks/use-auth';
import { FIGMA_PATIENT, FIGMA_COLORS } from '../../design-tokens';

const SIDEBAR_ICON_SIZE = FIGMA_PATIENT.sidebarIconSize;
const SIDEBAR_BTN = FIGMA_PATIENT.sidebarButtonSize;
const SIDEBAR_RADIUS = FIGMA_PATIENT.sidebarRadius;

interface PatientSidebarProps {
  selectedMenuKey?: string;
  onMenuClick?: () => void;
}

export const PatientSidebar: React.FC<PatientSidebarProps> = ({
  selectedMenuKey = 'dashboard',
  onMenuClick,
}) => {
  const [location, setLocation] = useLocation();
  const { logout } = useAuth();
  const isProfile = location === '/dashboard/profile';

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

  const itemStyle = (active: boolean) => ({
    width: SIDEBAR_BTN,
    height: SIDEBAR_BTN,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SIDEBAR_RADIUS,
    background: active ? FIGMA_PATIENT.sidebarActiveBg : 'transparent',
    color: active ? '#fff' : FIGMA_PATIENT.sidebarInactiveText,
    border: 'none',
  });

  return (
    <aside
      style={{
        width: FIGMA_PATIENT.sidebarWidth,
        background: FIGMA_COLORS.backgroundCard,
        borderRight: `1px solid ${FIGMA_COLORS.border}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: FIGMA_PATIENT.sidebarPaddingY,
        paddingBottom: FIGMA_PATIENT.sidebarPaddingY,
        height: '100%',
      }}
    >
      {/* Profile - Figma: same button style, active when on profile */}
      <button
        type="button"
        title="Profile"
        onClick={() => setLocation('/dashboard/profile')}
        style={{
          ...itemStyle(isProfile),
          marginBottom: FIGMA_PATIENT.sidebarItemGap,
        }}
        onMouseEnter={(e) => {
          if (!isProfile) {
            e.currentTarget.style.background = FIGMA_PATIENT.sidebarHoverBg;
          }
        }}
        onMouseLeave={(e) => {
          if (!isProfile) e.currentTarget.style.background = 'transparent';
        }}
      >
        <span style={isProfile ? { display: 'flex', color: '#fff' } : undefined}>
          <UserOutlined style={{ fontSize: SIDEBAR_ICON_SIZE, color: isProfile ? '#fff' : FIGMA_PATIENT.sidebarInactiveText }} />
        </span>
      </button>

      {/* Nav items - Figma: active = bg #1A8FE3 text white, icons 24px */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, alignItems: 'center', gap: FIGMA_PATIENT.sidebarItemGap }}>
        {[
          { key: 'dashboard', Icon: DashboardIcon, label: 'Dashboard' },
          { key: 'appointments', Icon: AppointmentIcon, label: 'Appointments' },
          { key: 'prescriptions', Icon: PrescriptionIcon, label: 'Prescriptions' },
          { key: 'reports', Icon: LabIcon, label: 'Lab Reports' },
          { key: 'messages', Icon: MessageOutlined, label: 'Messages' },
        ].map(({ key, Icon, label }) => {
          const active = selectedMenuKey === key;
          return (
            <button
              key={key}
              type="button"
              title={label}
              onClick={() => handleMenuClick(key)}
              style={itemStyle(active)}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = FIGMA_PATIENT.sidebarHoverBg;
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = 'transparent';
              }}
            >
              <span style={active ? { display: 'flex', filter: 'brightness(0) invert(1)' } : undefined}>
                {Icon === MessageOutlined ? (
                  <MessageOutlined style={{ fontSize: SIDEBAR_ICON_SIZE, color: active ? '#fff' : FIGMA_PATIENT.sidebarInactiveText }} />
                ) : (
                  <Icon size={SIDEBAR_ICON_SIZE} color={active ? '#fff' : FIGMA_PATIENT.sidebarInactiveText} />
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Logout - Figma: same size, red icon */}
      <Button
        type="text"
        icon={<LogoutOutlined style={{ fontSize: SIDEBAR_ICON_SIZE, color: FIGMA_COLORS.error }} />}
        style={{
          width: SIDEBAR_BTN,
          height: SIDEBAR_BTN,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={() => logout()}
        title="Logout"
      />
    </aside>
  );
};

