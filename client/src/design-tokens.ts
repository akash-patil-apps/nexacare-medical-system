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

/** Figma Patient Dashboard exact dimensions (from Figma export: patients dashboard). */
export const FIGMA_PATIENT = {
  /** Page: bg #F7FBFF, main content p-6 (24px), space-y-6 (24px gap) */
  pageBg: '#F7FBFF',
  contentPadding: 24,
  contentGap: 24,
  /** Sidebar: w-20 (80px), py-6 (24px), border #E5E7EB, items mb-4 (16px gap) */
  sidebarWidth: 80,
  sidebarPaddingY: 24,
  sidebarItemGap: 16,
  sidebarButtonSize: 48,
  sidebarIconSize: 24,
  sidebarRadius: 8,
  /** Active: bg #1A8FE3 text white; inactive: text #6B7280 hover:bg #F3F4F6 */
  sidebarActiveBg: '#1A8FE3',
  sidebarInactiveText: '#6B7280',
  sidebarHoverBg: '#F3F4F6',
  /** Header: px-6 py-4, border-b #E5E7EB, title text-xl (#262626), subtitle text-sm (#6B7280) */
  headerPaddingX: 24,
  headerPaddingY: 16,
  headerTitleSize: 20,
  headerSubtitleSize: 14,
  /** Header notification: w-10 h-10 (40px), rounded-lg, Bell w-5 h-5 (20px) */
  headerNotifySize: 40,
  headerNotifyIconSize: 20,
  /** Header profile: avatar w-8 h-8 (32px), gap-3 (12px), px-3 py-2, name text-sm, role text-xs */
  headerAvatarSize: 32,
  headerProfileGap: 12,
  /** Cards: bg white, rounded-2xl (16px), border #E5E7EB, p-6 (24px), shadow 0 2px 8px rgba(0,0,0,0.08) */
  cardRadius: 16,
  cardPadding: 24,
  cardShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  /** KPI: grid gap-4 (16px), icon box 48x48 rounded-xl (12px), icon 24px, tag text-xs, label text-sm #6B7280, value text-3xl (30px) font-semibold #262626 */
  kpiGridGap: 16,
  kpiIconBoxSize: 48,
  kpiIconBoxRadius: 12,
  kpiIconSize: 24,
  kpiTagFontSize: 12,
  kpiLabelFontSize: 14,
  kpiValueFontSize: 30,
  /** Quick actions: title mb-4 (16px), flex gap-3 (12px), button px-4 py-2 rounded-lg (8px) text-sm, primary #1A8FE3 hover #1578C5, default border #E5E7EB hover #F3F4F6, icon 16px */
  quickActionsTitleMargin: 16,
  quickActionsGap: 12,
  quickActionsButtonPaddingX: 16,
  quickActionsButtonPaddingY: 8,
  quickActionsButtonRadius: 8,
  quickActionsButtonFontSize: 14,
  quickActionsIconSize: 16,
  primaryHover: '#1578C5',
  /** Medicine reminders: header icon box w-10 h-10 (40px) bg #E3F2FF rounded-lg, Clock 20px #1A8FE3, row p-3 bg #FAFAFA rounded-lg, inner icon 32x32 */
  medicineIconBoxSize: 40,
  medicineRowPadding: 12,
  medicineRowRadius: 8,
  medicineInnerIconSize: 32,
  /** Upcoming appointments: item p-4 border #E5E7EB rounded-lg, status px-3 py-1 rounded-full text-xs */
  appointmentItemPadding: 16,
  appointmentItemRadius: 8,
  statusTagPaddingX: 12,
  statusTagPaddingY: 4,
  statusTagRadius: 9999,
  statusTagFontSize: 12,
} as const;
