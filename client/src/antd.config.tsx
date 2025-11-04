import React from 'react';
import { ConfigProvider } from 'antd';
import type { ThemeConfig } from 'antd';

/**
 * NexaCare Medical System - Design System
 * Inspired by modern medical platforms (TrueToken, Evergreen Hospital, Mediczen)
 * 
 * Design Principles:
 * - Clean, professional medical aesthetics
 * - WCAG AA compliant accessibility
 * - Consistent design language
 * - Intuitive user experience
 */
export const medicalTheme: ThemeConfig = {
  token: {
    // Primary Colors - Medical Blue (Trust & Professional)
    colorPrimary: '#1890ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1890ff',
    
    // Background Colors
    colorPrimaryBg: '#e6f7ff',
    colorSuccessBg: '#f6ffed',
    colorWarningBg: '#fffbe6',
    colorErrorBg: '#fff2f0',
    
    // Text Colors
    colorText: '#262626',           // Primary text
    colorTextSecondary: '#595959',  // Secondary text
    colorTextTertiary: '#8c8c8c',   // Tertiary text
    colorTextDisabled: '#bfbfbf',   // Disabled text
    
    // Border Colors
    colorBorder: '#d9d9d9',
    colorBorderSecondary: '#f0f0f0',
    
    // Background Colors
    colorBgContainer: '#ffffff',
    colorBgElevated: '#fafafa',
    colorBgLayout: '#f5f5f5',
    
    // Typography - Inter font family
    fontFamily: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif`,
    fontSize: 14,
    fontSizeHeading1: 32,    // Page titles
    fontSizeHeading2: 24,    // Section titles
    fontSizeHeading3: 20,    // Subsection titles
    fontSizeHeading4: 18,    // Card titles
    fontSizeHeading5: 16,    // Small headings
    fontSizeLG: 16,
    fontSizeSM: 12,
    
    // Line Heights
    lineHeight: 1.5,
    lineHeightHeading1: 1.2,
    lineHeightHeading2: 1.3,
    lineHeightHeading3: 1.4,
    
    // Border Radius - Modern rounded corners
    borderRadius: 6,          // Default
    borderRadiusLG: 12,       // Cards
    borderRadiusSM: 4,       // Small elements
    borderRadiusXS: 2,       // Extra small
    
    // Spacing Scale (8px base)
    padding: 16,
    paddingLG: 24,
    paddingSM: 12,
    paddingXS: 8,
    paddingXXS: 4,
    
    // Control Heights
    controlHeight: 40,       // Default
    controlHeightLG: 48,    // Large
    controlHeightSM: 32,    // Small
    
    // Shadows - Subtle elevation
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    boxShadowSecondary: '0 1px 4px rgba(0, 0, 0, 0.05)',
    boxShadowTertiary: '0 4px 12px rgba(0, 0, 0, 0.12)',
    
    // Motion
    motionDurationFast: '0.15s',
    motionDurationMid: '0.3s',
    motionDurationSlow: '0.5s',
    motionEaseInOut: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
  },
  components: {
    // Button Component
    Button: {
      borderRadius: 6,
      controlHeight: 40,
      fontWeight: 500,
      primaryShadow: '0 2px 4px rgba(24, 144, 255, 0.2)',
      boxShadow: 'none',
      // Primary button hover shadow
      defaultHoverBg: '#fafafa',
      defaultHoverColor: '#1890ff',
      defaultHoverBorderColor: '#1890ff',
    },
    
    // Input Component
    Input: {
      borderRadius: 6,
      controlHeight: 40,
      paddingInline: 12,
      paddingBlock: 8,
      activeBorderColor: '#1890ff',
      hoverBorderColor: '#40a9ff',
      activeShadow: '0 0 0 2px rgba(24, 144, 255, 0.2)',
    },
    
    // Card Component
    Card: {
      borderRadius: 12,
      paddingLG: 24,
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      headerBg: '#fafafa',
      headerFontSize: 18,
      headerFontWeight: 600,
    },
    
    // Form Component
    Form: {
      labelFontSize: 14,
      labelColor: '#262626',
      labelFontWeight: 500,
      itemMarginBottom: 24,
      verticalLabelPadding: '0 0 8px',
      labelRequiredMarkColor: '#ff4d4f',
    },
    
    // Table Component
    Table: {
      headerBg: '#fafafa',
      headerColor: '#262626',
      headerFontSize: 14,
      headerFontWeight: 600,
      rowHoverBg: '#f5f5f5',
      borderColor: '#f0f0f0',
      cellPaddingBlock: 12,
      cellPaddingInline: 16,
    },
    
    // Layout Component
    Layout: {
      headerBg: '#ffffff',
      headerPadding: '0 24px',
      headerHeight: 64,
      siderBg: '#ffffff',
      bodyBg: '#f5f5f5',
    },
    
    // Menu Component (Sidebar Navigation)
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: '#e6f7ff',
      itemSelectedColor: '#1890ff',
      itemHoverBg: '#f5f5f5',
      itemHoverColor: '#1890ff',
      itemActiveBg: '#e6f7ff',
      itemMarginInline: 8,
      itemPaddingInline: 16,
      itemBorderRadius: 6,
      subMenuItemBg: 'transparent',
      fontSize: 14,
      iconSize: 20,
    },
    
    // Modal Component
    Modal: {
      borderRadius: 12,
      headerBg: '#ffffff',
      titleFontSize: 18,
      titleFontWeight: 600,
      paddingContentHorizontal: 24,
      paddingContentVertical: 24,
      paddingLG: 24,
    },
    
    // Steps Component (Onboarding)
    Steps: {
      itemTitleFontSize: 14,
      itemDescriptionFontSize: 12,
      itemIconSize: 32,
      dotSize: 32,
      dotCurrentSize: 32,
      processIconFontSize: 16,
      waitIconFontSize: 16,
      finishIconFontSize: 16,
      errorIconFontSize: 16,
    },
    
    // Select Component
    Select: {
      borderRadius: 6,
      controlHeight: 40,
      optionSelectedBg: '#e6f7ff',
      optionActiveBg: '#f5f5f5',
    },
    
    // Tag/Badge Component
    Tag: {
      borderRadius: 12,
      fontSize: 12,
      lineHeight: 1.5,
      paddingInline: 12,
      defaultBg: '#f5f5f5',
      defaultColor: '#595959',
    },
    
    // Alert Component
    Alert: {
      borderRadius: 6,
      paddingContent: '12px 16px',
    },
    
    // Notification Component
    Notification: {
      borderRadius: 8,
      padding: '16px 20px',
      width: 320,
    },
    
    // Message Component
    Message: {
      borderRadius: 6,
      contentPadding: '12px 16px',
    },
    
    // Typography Component
    Typography: {
      titleMarginBottom: '0.5em',
      titleMarginTop: '1.2em',
    },
    
    // Divider Component
    Divider: {
      marginLG: 24,
      margin: 16,
    },
  },
};

// Export the theme provider component
export const MedicalThemeProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <ConfigProvider theme={medicalTheme}>
      {children}
    </ConfigProvider>
  );
};
