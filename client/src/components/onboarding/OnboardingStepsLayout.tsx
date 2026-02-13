import React from 'react';
import { Button, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

const { Text } = Typography;

const LAYOUT_STYLES = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 50%, #F0FDF4 100%)',
    display: 'flex',
  },
  sidebar: {
    width: 280,
    flexShrink: 0,
    background: 'linear-gradient(180deg, #ECFDF5 0%, #F0FDF4 100%)',
    borderRight: '1px solid #D1FAE5',
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: '#D1FAE5',
    border: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#059669',
    marginBottom: 24,
    cursor: 'pointer',
  },
  logo: {
    marginBottom: 32,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 20,
    fontWeight: 700,
  },
  stepItem: (active: boolean, completed: boolean) => ({
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 4,
  }),
  stepCircle: (active: boolean, completed: boolean) => ({
    width: 24,
    height: 24,
    borderRadius: '50%',
    border: active ? '2px solid #059669' : '1.5px solid #D1D5DB',
    background: completed ? '#059669' : (active ? '#ECFDF5' : '#fff'),
    flexShrink: 0,
    marginTop: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),
  stepLine: {
    width: 2,
    minHeight: 24,
    background: '#E5E7EB',
    marginLeft: 11,
    flexShrink: 0,
  },
  contentArea: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    background: '#fff',
    margin: 16,
    marginLeft: 12,
    borderRadius: 16,
    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
    padding: 20,
    overflow: 'auto',
  },
  helpLink: {
    marginTop: 'auto',
    paddingTop: 24,
    fontSize: 13,
    color: '#6B7280',
  },
  helpLinkAnchor: {
    color: '#059669',
    fontWeight: 500,
    cursor: 'pointer',
  },
};

export type OnboardingStepConfig = {
  title: string;
};

export interface OnboardingStepsLayoutProps {
  steps: OnboardingStepConfig[];
  currentStepIndex: number;
  /** Optional; no longer displayed in layout (steps shown in sidebar only) */
  stepTitle?: string;
  /** Optional; no longer displayed in layout */
  stepNote?: string;
  onBack: () => void;
  children: React.ReactNode;
  showHelpLink?: boolean;
  logoLabel?: string;
  /** Hide the back button (e.g. on final success step) */
  hideBackButton?: boolean;
}

export function OnboardingStepsLayout({
  steps,
  currentStepIndex,
  stepTitle,
  stepNote,
  onBack,
  children,
  showHelpLink = true,
  logoLabel = 'NexaCare',
  hideBackButton = false,
}: OnboardingStepsLayoutProps) {
  const totalSteps = steps.length;

  return (
    <div style={LAYOUT_STYLES.page}>
      {/* Left sidebar */}
      <aside style={LAYOUT_STYLES.sidebar}>
        {!hideBackButton && (
          <button
            type="button"
            onClick={onBack}
            style={LAYOUT_STYLES.backBtn}
            aria-label="Go back"
          >
            <ArrowLeftOutlined style={{ fontSize: 16 }} />
          </button>
        )}
        {hideBackButton && <div style={{ height: 40, marginBottom: 24 }} />}

        <div style={LAYOUT_STYLES.logo}>
          <div style={LAYOUT_STYLES.logoIcon}>N</div>
          <Text strong style={{ fontSize: 18, color: '#059669' }}>{logoLabel}</Text>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {steps.map((step, index) => {
            const active = index === currentStepIndex;
            const completed = index < currentStepIndex;
            return (
              <React.Fragment key={index}>
                <div style={LAYOUT_STYLES.stepItem(active, completed)}>
                  <div style={LAYOUT_STYLES.stepCircle(active, completed)}>
                    <span style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: completed ? '#fff' : (active ? '#059669' : '#6B7280'),
                      lineHeight: 1,
                    }}>
                      {index + 1}
                    </span>
                  </div>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: active ? 600 : 400,
                      color: active ? '#111827' : '#6B7280',
                      lineHeight: 1.5,
                    }}
                  >
                    {step.title}
                  </Text>
                </div>
                {index < steps.length - 1 && (
                  <div style={{ ...LAYOUT_STYLES.stepLine, height: 20, minHeight: 20, marginLeft: 11 }} />
                )}
              </React.Fragment>
            );
          })}
        </nav>

      </aside>

      {/* Right content */}
      <main style={LAYOUT_STYLES.contentArea}>
        <div className="onboarding-form-compact" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
