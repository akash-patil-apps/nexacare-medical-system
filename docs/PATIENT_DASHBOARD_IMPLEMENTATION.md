# Patient Dashboard Frontend Implementation Plan

## 1. Page-Level Refactor
- [ ] Create new layout wrapper that follows spec ordering (Breadcrumb → KPI → Quick Actions → Prescriptions → Main split).
- [ ] Update Ant Design `Layout` usage: confirm sidebar width, collapsed state, patient profile dock.
- [ ] Ensure page supports responsive breakpoints (desktop/tablet/mobile) matching spec.

## 2. Component Work

### Core Components
- [ ] `KpiCard` – metric label, icon slot, trend pill, CTA link.
- [ ] `QuickActionTile` – icon, label, primary/secondary variant.
- [ ] `PrescriptionCard` – medication details, next dose, refills, adherence progress, actions.
- [ ] `TimelineItem` – type icon, timestamp, description, action button.
- [ ] `NotificationItem` – severity tag, timestamp, accordion body, mark-as-read callback.

### Shared Utilities
- [ ] Progress bar component (adherence).
- [ ] Trend chip component (positive/neutral/negative).
- [ ] Hook or context for `markNotificationRead`, `requestRefill`.

## 3. Data & API Integration
- [ ] Extend prescriptions query to supply `nextDose`, `refillsRemaining`, `adherence`.
- [ ] Introduce endpoint call or mock for timeline aggregation (`appointments`, `prescriptions`, `labs`).
- [ ] Fetch notifications with read/unread status; implement optimistic update for mark-as-read.
- [ ] Map KPI metrics to aggregated API responses.

## 4. State & Interactions
- [ ] Implement loading skeletons for KPI, prescriptions, timeline, notifications.
- [ ] Handle empty states with informative copy and CTA.
- [ ] Wire quick action buttons:
  - `New Appointment` → navigate to `/book-appointment`.
  - `Request Refill` → modal flow (stub until backend ready).
  - `Upload Document` → file upload entry point (future).
  - `Send Message` → route to messaging module (if existing).
  - `View Patient History` → navigate to records page.
- [ ] Add mark-as-read behavior for notifications (button per item).
- [ ] Add timeline action callbacks (Reschedule, View Report).

## 5. Styling & Theming
- [ ] Update Ant Design theme tokens (primary color, border radius 10px, shadows).
- [ ] Create shared SCSS/Tailwind/less overrides aligning with spec (card padding, background).
- [ ] Ensure typography sizes set globally or via utility classes.

## 6. Testing
- [ ] Unit tests for components (React Testing Library).
- [ ] Integration test covering data fetch flows and interaction callbacks.
- [ ] Responsive snapshot or visual test for key breakpoints.

## 7. Documentation & Cleanup
- [ ] Update design system docs with new components/tokens.
- [ ] Remove unused legacy CSS or components replaced by new ones.
- [ ] Update `PROJECT_LOG` and `CHANGELOG` once implementation completes.

