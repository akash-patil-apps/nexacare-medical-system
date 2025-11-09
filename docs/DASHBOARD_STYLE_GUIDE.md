# NexaCare Dashboard Style Guide

This guide establishes shared patterns and role-specific theming for all NexaCare dashboards. Use it as the source of truth while redesigning each role experience.

---

## 1. Shared Foundations

| Token | Value | Notes |
| --- | --- | --- |
| Font Family | `Inter`, fallback `DM Sans`, system sans-serif | Use 400 body, 500 labels, 600/700 headings |
| Grid | 8 px spacing units | 16 px interior card padding (desktop), 12 px mobile |
| Corners | Card 16 px, Buttons 10 px, Chips 12 px | Maintain consistent rounding |
| Shadows | Base `0 10px 24px rgba(15,23,42,0.08)` | Active/selected states add subtle tint matching primary |
| Iconography | Ant Design icons, 18 px header actions, 32 px empty states | Keep consistent stroke color per role |

**Layout Template**
- Left nav (collapsed width 80 px, expanded width 256 px) with role badge bottom docked.
- Header stripped to breadcrumb + shortcut actions; no redundant hero text.
- Content wrapper: max width 1320 px centred, `padding: 32px 24px`.
- Page stack: KPI strip → Quick actions → Primary data tables/cards → Right rail (if needed) → secondary modules.

**Interactive States**
- Buttons: primary fill = role color, hover darken 8%, focus outline 2 px role color offset 2 px.
- Secondary buttons: white background, 1 px role color border, text role color.
- Chips & tabs: active fill role pastel (`primary@12%`), text role color.
- Notification & toasts: Ant Design `message` with role accent icon.

---

## 2. Role Palettes & Accent Tokens

| Role | Primary | Secondary | Accent | Background | Highlight |
| --- | --- | --- | --- | --- | --- |
| Patient | `#1A8FE3` | `#10B981` | `#F59E0B` | `#F7FBFF` | `#E3F2FF` |
| Doctor | `#1D4ED8` | `#7C3AED` | `#F97316` | `#F5F7FF` | `#E0E7FF` |
| Hospital Admin | `#7C3AED` | `#0EA5E9` | `#FBBF24` | `#F6F2FF` | `#EDE9FE` |
| Receptionist | `#F97316` | `#6366F1` | `#22C55E` | `#FFF7ED` | `#FFEAD5` |
| Lab Technician | `#0EA5E9` | `#22C55E` | `#F87171` | `#F0FAFF` | `#DFF3FF` |
| System Admin (if needed) | `#111827` | `#2563EB` | `#F59E0B` | `#F8FAFC` | `#E2E8F0` |

Apply gradients sparingly (e.g., KPI backgrounds) using 90° mix of primary + highlight at 30% opacity.

---

## 3. Module Patterns

### 3.1 KPI Strip
- Four cards minimum (Appointments, Workload, Notifications, Revenue or equivalent per role).
- Left-aligned label & icon, right-aligned trend chip (“+12% MoM”).
- Value typography: `32px/40px`, weight 700.
- Trend chips use simple copy (`Updated`, `Critical`, `On Track`) with semantic colors (success, warning, error).

### 3.2 Quick Actions
- Display top four CTA tiles (120×120) with icon inside 40 px pastel circle.
- Secondary actions as pill buttons aligned right (desktop) and stacked below (mobile).
- Example actions:
  - **Doctor**: “Start Consultation”, “Add Prescription”, “Update Availability”, “Review Lab Results”.
  - **Hospital Admin**: “Invite Staff”, “Assign Shift”, “Approve Requests”, “View Reports”.

### 3.3 Primary Lists
- Use two-column responsive grids for cards where possible to avoid wide tables.
- For tabular data, adopt AntD `Table` with `bordered={false}`, zebra `backgroundColor: roleHighlight`.
- Column headers uppercase 11 px, `letter-spacing: 0.05em`.

### 3.4 Timeline / Activity Feed
- Vertical timeline with icon glyph left, card content right.
- Role-specific icon backgrounds: Patient `#E3F2FF`, Doctor `#E9E0FF`, Hospital `#EDE9FE`, etc.
- Provide inline actions (“Reschedule”, “Acknowledge”, “Resolve”).

### 3.5 Notifications Drawer
- Card header “Alerts” + filter tabs (All, Critical, Info).
- Each notification card: severity tag, timestamp, Markdown-friendly message, CTA button (e.g., “View Order”).
- Auto-group by day (Today, Yesterday, This Week).

### 3.6 Real-Time Status Banners
- Slim top banner (48 px height) showing key system state (On Call, Emergency Mode).
- Extendable to show patient arrival queue for receptionists or outstanding lab samples.

---

## 4. Role-Specific Guidance

### 4.1 Patient Dashboard (current baseline)
Refer to `docs/PATIENT_DASHBOARD_SPEC.md`. Keep as template for spacing, component structure, and personalisation (greeting removed, but patient name appears in quick summary banner if desired).

### 4.2 Doctor Dashboard
- **Primary KPIs**: Today’s appointments, Pending prescriptions, Lab results awaiting review, Follow-ups today.
- **Quick Actions**: “Start Consultation”, “Write Prescription”, “Add Notes”, “Send Message”.
- **Layout**: two-column main area:
  - Left: upcoming appointments list with patient context.
  - Right: quick patient search + lab queue cards.
- **Color cues**: focus on productivity; avoid patient greens, emphasise blue/purple combination (primary `#1D4ED8`).
- **Header Tag**: show current clinic/hospital and shift status.

### 4.3 Hospital Admin Dashboard
- **KPIs**: Facility utilisation %, Staff on duty, Admissions today, Revenue summary.
- **Quick Actions**: “Assign Shift”, “Approve Requests”, “View Analytics”, “Manage Inventory”.
- **Widgets**:
  - Staff status board (grid of doctors/receptionists with status chips).
  - Department performance charts (use stacked bars with highlight color `#7C3AED`).
- **Navigation**: Add filter chips for hospital location (if managing multiple).

### 4.4 Receptionist Dashboard
- **Tone**: operational, high-contrast for readability.
- **KPIs**: Walk-ins waiting, Check-ins completed, Pending payments, Calls to return.
- **Core module**: queue list with drag-to-reorder (future), status chips (Waiting, In Consultation, Completed).
- **Quick Actions**: “Create Appointment”, “Check-in Patient”, “Record Payment”, “Notify Doctor”.
- **Color palette** emphasises orange/indigo to signal urgency but remain friendly.

### 4.5 Lab Technician Dashboard
- **KPIs**: Samples pending analysis, Reports ready, Critical alerts.
- **Quick Actions**: “Log Sample”, “Upload Report”, “Assign Technician”, “Request Re-test”.
- **Widgets**:
  - Sample pipeline (Received → In Progress → Completed).
  - Critical alerts panel with red accent `#F87171`.
- **Document viewer**: use card layout with preview icon, timestamp, patient name.

### 4.6 Cross-Dashboard Components
- **Breadcrumb**: `Home / [Role] Dashboard`, Crisp `Title level={2}`.
- **Role Switcher**: use segmented control (for multi-role users) adopting neutral colors.
- **Empty State**: role-specific illustration (e.g., stethoscope for doctor, clipboard for receptionist) with link to create first entry.

---

## 5. Implementation Sequence
1. **Doctor Dashboard** – adjust layout to mirror patient structure, integrate new palette.
2. **Hospital Admin** – introduce analytics cards and staff overview.
3. **Receptionist** – focus on queue usability and action density.
4. **Lab Technician** – add pipeline visualisation and report management.
5. **System Admin (if required)** – create audit/monitoring centre using neutral palette.

For each step:
- Update React layout components (`PatientDashboard` currently a reference).
- Extract shared building blocks into `client/src/components/dashboard/*`.
- Ensure CSS tokens centralised in theme file or constants for reuse.

---

## 6. Accessibility & QA Checklist
- Contrast ratios ≥ 4.5:1 for text (verify role highlight backgrounds).
- Focus order: nav → quick actions → primary content → secondary widgets.
- Responsive behaviour: ≤ 1024 px collapse KPI row to 2-up, quick actions to stacked.
- Cross-dashboards unit tests: ensure API calls scoped per role and loading states show skeleton cards.

---

## 7. Deliverables
When redesigning each dashboard:
1. Update the respective `dashboard` page component.
2. Add screenshots to documentation (optional) for stakeholder review.
3. Log changes in `docs/CHANGELOG.md`.
4. Validate against this style guide before moving to the next role.

This guide will evolve—update it whenever new patterns emerge during implementation.

