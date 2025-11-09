# Patient Dashboard — UX/UI Implementation Spec

## 1. Layout Overview
- **Viewport targets:** Desktop (≥ 1280px), Tablet (768–1279px), Mobile (≤ 767px).
- **Grid & spacing:** 12-column fluid grid; 24px vertical rhythm between modules; 16px padding inside cards; quick action tiles use 16px gap; KPI grid uses 16px gap.
- **Structure order (top → bottom):**
  1. Breadcrumb (`Home / Patient Dashboard`) + page heading.
  2. KPI metrics row (4 cards).
  3. Quick actions module.
  4. Prescriptions module (Current | Past tabs).
  5. Main content split:
     - Left column (2/3 width): Care timeline.
     - Right column (1/3 width): Next appointment, latest lab, notifications.
  6. Sidebar (left): Navigation, patient profile docked bottom.

## 2. Color & Token Usage
- **Patient palette:** Primary `#1A8FE3`, Secondary `#10B981`, Accent `#F59E0B`, Background `#F7FBFF`.
- **Neutrals:** `#1E293B` (heading text), `#0F172A` (emphasis), `#334155` (body), `#64748B` (muted), `#94A3B8` (caption), `#E2E8F0` (borders), `#F1F5F9` (surface alt), `#FFFFFF` (card).
- **Status chips:** Success `#DCFCE7/#15803D`, Warning `#FEF3C7/#B45309`, Info `#E0F2FE/#0369A1`, Urgent `#FEE2E2/#B91C1C`.
- **Shadows:** Card elevation `0 10px 24px rgba(15, 23, 42, 0.08)`; hover `0 12px 32px rgba(15, 23, 42, 0.12)`.
- **Borders:** 1px solid `#E2E8F0`.

## 3. Typography
- **Families:** Primary `Inter`, secondary `DM Sans`, fallback `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- **Sizes / line-height:**
  - H1 32/40 (page title).
  - H2 24/32 (section title).
  - H3 20/28 (card header).
  - Body 16/24.
  - Caption 14/20.
  - Micro 12/18 (badge text).
- **Weight:** Headings 600, KPI numbers 700, body 400, labels 500.

## 4. Components

### 4.1 Sidebar
- Width 256px desktop, 80px collapsed (≥ 400px breakpoint for collapse).
- Items: Dashboard (active), Appointments, Prescriptions, Lab Reports, Health Timeline.
- Patient profile dock: avatar 48px, name + role chip, settings icon; anchored bottom with 16px top border.

### 4.2 KPI Cards
- Four cards equal width (min 220px). Icons right, metric label left.
- Body: Metric number (32px / bold), subline for trend chip (rounded 12px pill) and CTA link.
- Trend pill colors: positive `#DCFCE7/#16A34A`, neutral `#E2E8F0/#64748B`, negative `#FEE2E2/#DC2626`.

### 4.3 Quick Actions
- Container card with 16px padding.
- Primary tiles (New Appointment, Request Refill, Upload Document): 120×120 min, center-aligned icon (40px circle background) + label.
- Secondary buttons (Send Message, View Patient History): 40px height pill buttons aligned right on desktop, full width stacked on mobile.

### 4.4 Prescriptions Module
- Tabs: `Current` (primary solid button), `Past` (ghost). 8px corner radius.
- Card layout: Grid columns (2-1-1-1) on desktop, stacked on mobile.
- Adherence progress bar: track `#E2E8F0`, fill `#22C55E`; label 14px.
- Actions: `View Details` (ghost), `Request Refill` (primary).
- Add 1px divider between cards (`#E2E8F0`) for mobile clarity.

### 4.5 Care Timeline
- Sticky filter chips directly under title.
- Timeline rail 2px width `#E2E8F0`; nodes 48px circles with color-coded icons (Appointments blue, Prescriptions green, Labs orange).
- Entry content: title bold, subline, details paragraph; action button (text style) aligned right.

### 4.6 Right Column Cards
- `Next Appointment`: centered countdown, CTA button (ghost).
- `Latest Lab Result`: metric highlight, status badge (warning style).
- `Notifications`: accordion items; severity tag, timestamp, “Mark as read” text button to the right; expanded content 16px indent.

## 5. Interaction & States
- Hover states: lighten background (`+4%` brightness) and raise shadow.
- Focus: 2px outline `#1A8FE3` offset 2px.
- Buttons: Primary (#1A8FE3), hover darken 8%, active darken 12%.
- Empty states: placeholder illustration + copy; show “No current medications” message when list empty.
- Loading: skeleton bars (16px height) for prescriptions/timeline.

## 6. Responsiveness
- **Tablet (768–1023px):**
  - Sidebar collapses to icon rail.
  - KPI cards two per row.
  - Quick actions become two-per-row tiles + bottom buttons full width.
  - Right column stacks below timeline.
- **Mobile (≤ 767px):**
  - Breadcrumb becomes single-line label.
  - KPI cards horizontal scroll (snap).
  - Quick actions vertical stack with 12px gaps.
  - Timeline entries full width; nodes reduce to 36px.
  - Cards full width, remove right column splitting.

## 7. Accessibility
- Minimum contrast AA (4.5:1). Adjust text colors as needed (e.g., orange badge text uses `#9A3412` or darker).
- All icon-only controls require `aria-label`.
- Tabs and filter chips keyboard navigable via arrow keys.

## 8. Data Interfaces (for implementation alignment)
- **Prescription:** `{ id, drugName, strength, schedule, nextDose, refillsRemaining, adherencePercent }`
- **Timeline item:** `{ id, type: 'appointment' | 'prescription' | 'lab', title, subtitle, description, timestamp, actionLabel }`
- **Notification:** `{ id, severity, title, message, createdAt, read }`
- **KPIs:** `{ label, value, trendLabel, trendType }`

## 9. Outstanding Questions
- Confirm API endpoints for “Request Refill”, “Mark as read”, “Reschedule”.
- Determine whether "Messages" metric requires separate module.
- Provide fallback imagery for avatars.

Use this spec alongside `docs/design-standards` to ensure consistent implementation across patient-facing flows.

