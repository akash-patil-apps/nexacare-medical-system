/**
 * Figma-aligned design tokens for Option A (Ant Design) conversion.
 * Single source of truth so no styling is missed.
 * @see docs/FIGMA_TO_ANTD_CONVERSION_GUIDE.md
 */

/** Role-based primary color only; all other colors shared (FIGMA_MAKE prompt). */
export const ROLE_PRIMARY: Record<string, string> = {
  receptionist: '#F97316',
  doctor: '#1D4ED8',
  hospital: '#7C3AED',
  lab: '#0EA5E9',
  nurse: '#059669',
  pharmacist: '#10B981',
  radiology_technician: '#7C3AED',
  patient: '#1A8FE3',
};

/** Figma shared colors (same across all roles). */
export const FIGMA_COLORS = {
  backgroundPage: '#F3F4F6',
  backgroundPageAlt: '#FAFAFA',
  backgroundCard: '#FFFFFF',
  border: '#E5E7EB',
  textPrimary: '#262626',
  textSecondary: '#595959',
  textMuted: '#6B7280',
  success: '#22C55E',
  successAlt: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  /** Neutral for status "Pending" / "Waiting" / "In queue" (no purple/blue). */
  statusNeutral: '#6B7280',
} as const;

/** Figma card/panel styling. */
export const FIGMA_CARD = {
  borderRadius: 16,
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  border: `1px solid ${FIGMA_COLORS.border}`,
  background: FIGMA_COLORS.backgroundCard,
} as const;

/** Figma button/control radius from design (10px). */
export const FIGMA_RADIUS_BUTTON = 10;

/** Figma KPI icon container radius (14px). */
export const FIGMA_RADIUS_KPI_ICON = 14;

/** Figma receptionist dashboard exact dimensions (from Figma CSS). */
export const FIGMA_RECEPTIONIST = {
  /** Sidebar: padding 24px 0, gap 16px, buttons 48x48, radius 10px, icon 24px */
  sidebarPadding: '24px 0',
  sidebarGap: 16,
  sidebarButtonSize: 48,
  sidebarIconSize: 24,
  /** Header: height 85px, padding 0 24px */
  headerHeight: 85,
  headerPaddingHorizontal: 24,
  /** Main content: padding 24px 24px 0, gap 24px */
  contentPadding: '24px 24px 0px',
  contentGap: 24,
  /** KPI card: internal padding 25px, icon box 48x48 radius 14px, tag padding 4px 12px */
  kpiCardPadding: 25,
  kpiIconBoxSize: 48,
  kpiTagPadding: '4px 12px',
  /** Queue status bar: padding 25px 25px 1px */
  queueBarPadding: '25px 25px 1px',
  /** Reschedule card: padding 17px 17px 1px, gap 16px, row height 60px, row radius 10px */
  rescheduleCardPadding: '17px 17px 1px',
  rescheduleCardGap: 16,
  rescheduleRowHeight: 60,
  rescheduleRowRadius: 10,
  /** Upcoming Appointments header: padding 16px 24px 1px, title 18px/600/28px line-height */
  appointmentsHeaderPadding: '16px 24px 1px',
  /** Table: header height 44.5px, row height 63px, cell padding 16px */
  tableHeaderHeight: 44.5,
  tableRowHeight: 63,
  tableCellPadding: 16,
  /** Action buttons: Check-in 94x28, Vitals/Lab/Invoice 30px height, radius 10px */
  buttonCheckInHeight: 28,
  buttonActionHeight: 30,
  /** Demo flows card: padding 25px 25px 1px, gap 16, buttons 38px height, radius 10px */
  demoCardPadding: '25px 25px 1px',
  demoCardGap: 16,
  demoButtonHeight: 38,
} as const;
