import React from 'react';
import { Button, message } from 'antd';
import { UserOutlined, DashboardOutlined, MedicineBoxOutlined, ShoppingCartOutlined, FileTextOutlined, LogoutOutlined } from '@ant-design/icons';
import { useLocation } from 'wouter';
import { useAuth } from '../../hooks/use-auth';

interface PharmacistSidebarProps {
  selectedMenuKey?: string;
  onMenuClick?: (key?: string) => void;
  hospitalName?: string | null;
}

export const PharmacistSidebar: React.FC<PharmacistSidebarProps> = ({ 
  selectedMenuKey = 'dashboard',
  onMenuClick,
}) => {
  const [, setLocation] = useLocation();
  const { logout } = useAuth();
  const handleMenuClick = (key: string) => {
    if (onMenuClick) onMenuClick(key);
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      background: '#fff', // White background matching PatientSidebar
      width: '80px', // Narrow vertical bar
      alignItems: 'center',
      padding: '16px 0',
      gap: '12px',
      borderRight: '1px solid #E5E7EB', // Light border on right
    }}>
      {/* User Icon at Top */}
      <Button
        type="text"
        icon={<UserOutlined style={{ fontSize: '20px', color: '#1A8FE3' }} />}
        style={{
          width: '48px',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#E3F2FF', // Light blue background for active user icon
          borderRadius: '8px',
        }}
        onClick={() => setLocation('/dashboard/profile')}
      />

      {/* Navigation Icons - Vertical Stack */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, alignItems: 'center' }}>
        <Button
          type="text"
          icon={<DashboardOutlined style={{ fontSize: '20px', color: selectedMenuKey === 'dashboard' ? '#1A8FE3' : '#6B7280' }} />}
          style={{
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: selectedMenuKey === 'dashboard' ? '#E3F2FF' : 'transparent',
            borderRadius: '8px',
          }}
          onClick={() => handleMenuClick('dashboard')}
        />
        
        <Button
          type="text"
          icon={<MedicineBoxOutlined style={{ fontSize: '20px', color: selectedMenuKey === 'prescriptions' ? '#1A8FE3' : '#6B7280' }} />}
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
          icon={<ShoppingCartOutlined style={{ fontSize: '20px', color: selectedMenuKey === 'inventory' ? '#1A8FE3' : '#6B7280' }} />}
          style={{
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: selectedMenuKey === 'inventory' ? '#E3F2FF' : 'transparent',
            borderRadius: '8px',
          }}
          onClick={() => handleMenuClick('inventory')}
        />
        
        <Button
          type="text"
          icon={<FileTextOutlined style={{ fontSize: '20px', color: selectedMenuKey === 'reports' ? '#1A8FE3' : '#6B7280' }} />}
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
      </div>

      {/* Bottom Icons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
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
