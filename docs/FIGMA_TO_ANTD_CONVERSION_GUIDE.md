# Figma (Tailwind) → Ant Design Conversion Guide — 100% Complete, Nothing Missed

This guide ensures **full visual parity** when converting the Figma Make design (Tailwind/Radix) to Ant Design (Option A). By following it, you avoid missing components or styles.

**Strategy in 3 layers:**

1. **Design tokens** — One source of truth for every color, radius, shadow, spacing. Ant Design theme + optional CSS variables. No Tailwind class is “converted by guess”; each value is defined once and reused.
2. **Component mapping** — Every Figma UI element type maps to an Ant Design component + exact overrides. Custom layouts (KPI card, queue row) use Ant Design primitives + the same tokens.
3. **Screen/flow audit checklist** — Every screen and modal is listed; every visual element on that screen is ticked when implemented. Nothing is skipped.

---

## Layer 1: Design Tokens (Single Source of Truth)

Define these once (in `antd.config.tsx` and/or CSS variables). Use them everywhere so the Figma look is consistent and complete.

### Colors (from Figma design)

| Token | Figma/Tailwind value | Use for |
|-------|----------------------|--------|
| **Primary (role)** | `#F97316` (receptionist) | Active nav, primary buttons, active tab, “Awaiting action” accent. Other roles: see role table in FIGMA_MAKE prompt doc. |
| **Background page** | `#F3F4F6` or `#FAFAFA` | Page/layout background |
| **Background card** | `#FFFFFF` | Cards, modals, sidebar |
| **Border** | `#E5E7EB` | Card borders, inputs, dividers |
| **Text primary** | `#262626` | Headings, body |
| **Text secondary** | `#595959` or `#6B7280` | Labels, hints, inactive |
| **Success** | `#22C55E` or `#10B981` | Completed, Approve, Ready, “Today” tag |
| **Error** | `#EF4444` | Reject, danger, error states |
| **Warning** | `#F59E0B` | Optional warning (e.g. Reschedule icon) |
| **Neutral tag/chip** | `#6B7280` | “In queue”, Pending/Waiting status |

### Spacing & radius (from Figma)

| Token | Value | Use for |
|-------|--------|--------|
| **Card radius** | `16px` (Figma: rounded-2xl) | Cards, modals |
| **Button radius** | `8px` (rounded-lg) | Buttons, inputs |
| **Small radius** | `6px` or `8px` | Tags, badges |
| **Card shadow** | `0 2px 8px rgba(0,0,0,0.08)` | Cards, elevated panels |
| **Grid spacing** | `8px` base, `16px`/`24px` gaps | Gaps between cards, sections |

### Typography (from Figma)

| Element | Size | Weight | Notes |
|---------|------|--------|--------|
| Page title | 20px (text-xl) | 600 | Dashboard, modal titles |
| Section title | 18px (text-lg) | 600 | “Upcoming Appointments” |
| Card label / small heading | 14px (text-sm) | 500 | KPI labels, table headers |
| Body | 14–16px | 400 | Default text |
| KPI value | 30–32px (text-3xl) | 600–700 | Big number in KPI cards |
| Tag / badge | 12px (text-xs) | 500 | “Awaiting action”, “Ready” |

### Role primary (per dashboard)

- Receptionist: `#F97316`
- Doctor: `#1D4ED8`
- Hospital: `#7C3AED`
- Lab: `#0EA5E9`
- Nurse: `#059669`
- Pharmacist: `#10B981`
- Patient: `#1A8FE3`
- (Others in FIGMA_MAKE_RECEPTIONIST_DASHBOARD_PROMPT.md Part 6)

**Implementation:** Use Ant Design `ConfigProvider` with `theme={{ token: { colorPrimary: '<role hex>' } }}` wrapping each dashboard layout (or a layout per role). Sidebar, buttons, and tabs will pick up the right primary without hardcoding in every component.

---

## Layer 2: Component Mapping (Figma → Ant Design, Nothing Missed)

Every UI element type in the Figma design must map to an Ant Design component + overrides. Use the tokens above for all values.

### Buttons

| Figma / Tailwind | Ant Design | Overrides / token |
|------------------|------------|--------------------|
| Primary (orange) | `<Button type="primary">` | `colorPrimary` = role primary (#F97316). Ensure no blue left. |
| Default / outline | `<Button>` or `type="default"` | border `#E5E7EB`, bg white, hover bg `#F3F4F6`. |
| Approve (green) | `<Button style={{ background: tokenSuccess, borderColor: tokenSuccess }}>` or a custom “success” type if you add it. | Use semantic success color, not primary. |
| Reject / danger | `<Button danger>` or default with red | `colorError` or danger. |
| Small (text-xs, px-3 py-1.5) | `<Button size="small">` | controlHeightSM, padding from theme. |

### Cards

| Figma | Ant Design | Overrides |
|-------|------------|-----------|
| White card, 16px radius, light shadow | `<Card>` | token: borderRadius 16 (or borderRadiusLG 16), boxShadow `0 2px 8px rgba(0,0,0,0.08)`, border `1px solid #E5E7EB`. |
| KPI card (icon + label + value + tag) | `<Card>` + `Typography` + `Space` + icon + `Tag` | Same card token; icon in a 48px box with bg `#F3F4F6` or primary/10 for “Pending”; tag uses Tag with appropriate color (primary for “Awaiting action”, success for “Ready”/“Today”, default for “In queue”). |
| Reschedule card (white, no yellow) | `<Card>` | bg white only; no tint. |

### Layout

| Figma | Ant Design | Overrides |
|-------|------------|-----------|
| Sidebar 80px, icon-only | `<Layout.Sider width={80}>` or custom div | bg white, border-right #E5E7EB, icons 24px; active item: bg role primary, color white. |
| Header (title + subtitle + right actions) | `<Layout.Header>` or custom | bg white, border-bottom #E5E7EB, padding 16–24px; title #262626, subtitle #6B7280. |
| Main content area | `<Layout.Content>` | bg #F3F4F6 or #FAFAFA, padding 24px. |

### Tabs

| Figma | Ant Design | Overrides |
|-------|------------|-----------|
| Line tabs (Queue, Today, Pending…) | `<Tabs type="line">` | Active tab underline: colorPrimary (role). Inactive text #6B7280. |
| Tab count badge | Custom in tab label | Gray text, e.g. “Today 48”. |

### Table

| Figma | Ant Design | Overrides |
|-------|------------|-----------|
| Appointments table | `<Table>` | Header bg #FAFAFA or white, border #E5E7EB; row hover #F5F5F5; cell padding 12–16px. |
| Status column (tags) | `<Tag>` | Pending/Waiting: gray; Confirmed: gray or green; Checked In / Completed: success green. |
| Action column | `<Space>` of `<Button>` | One primary (Confirm / Check-in), rest default or danger. |

### Form controls

| Figma | Ant Design | Overrides |
|-------|------------|-----------|
| Input | `<Input>` | borderRadius 8, border #E5E7EB, focus ring primary. |
| Select | `<Select>` | Same border/radius; dropdown style to match. |
| DatePicker | `<DatePicker>` | Same as Input. |
| TextArea | `<Input.TextArea>` | Same border/radius. |

### Modals & drawers

| Figma | Ant Design | Overrides |
|-------|------------|-----------|
| Modal container | `<Modal>` | borderRadius 16, header border-bottom #E5E7EB; content padding 24px. |
| Drawer (patient panel) | `<Drawer>` | width 600 (or responsive), same border/radius for inner cards. |

### Tags & badges

| Figma | Ant Design | Overrides |
|-------|------------|-----------|
| “Awaiting action” (primary) | `<Tag color="primary">` or custom bg | Use role primary. |
| “Ready”, “Today” (green) | `<Tag color="success">` | tokenSuccess. |
| “In queue” (gray) | `<Tag>` default or custom | #6B7280 bg and text. |
| Status dots (Pending/Waiting gray, Checked In/Completed green) | Small `<span>` or Tag | No purple/blue; gray and green only. |

### Icons

| Figma | Ant Design | Overrides |
|-------|------------|-----------|
| Lucide icons | Keep `lucide-react` or swap to `@ant-design/icons` | Active: primary color; inactive: #6B7280. Size 20–24px for nav, 16–20 for inline. |

---

## Layer 3: Screen-by-Screen Audit Checklist

Use this so **every** screen and **every** element is implemented. Tick when done.

### Receptionist dashboard (main)

- [x] Sidebar: width 80px, icons only; active = primary (#F97316), inactive = #6B7280.
- [x] Header: title “Dashboard”, subtitle hospital name; Main Campus dropdown; notification bell (red dot if unread); profile (avatar, name, “Receptionist”).
- [x] KPI row: 4 cards — Pending (primary icon/tag), Confirmed (green tag), Walk-ins (gray tag), Completed (green tag). Card style: white, 16px radius, shadow, border.
- [x] Queue status bar: Pending | Waiting | Checked In | Completed + “X of Y completed today”. Gray for Pending/Waiting, green for Checked In/Completed.
- [x] Reschedule card: white bg, no yellow; “View all” primary link; Approve green, Reject default/gray.
- [x] Upcoming Appointments card: header with “Create Appointment (Walk-in)” primary, “Admit to IPD” default; tabs with active underline primary; table with status tags and action buttons per row.
- [x] Queue Management tab: doctor sub-tabs; queue list with Check-in (primary), Vitals, Lab, Invoice, View patient.

### Receptionist modals (each as a row)

- [x] Walk-in: steps (mobile lookup → patient found / new user → OTP → registration → doctor → date/slot → payment); step indicator primary for current; primary buttons for Next/Book/Submit.
- [x] Admit to IPD: patient selection (today’s list + search + quick create); admission type, doctors, bed selector; Admit primary.
- [x] Vitals: fields BP, Temp, Pulse, SpO2, RR, Weight, Height, Notes; Submit primary.
- [x] Lab request: patient, tests, notes; Submit primary.
- [x] Lab tests confirmation: list of tests; Confirm primary.
- [x] Lab test payment: summary, payment method; Pay primary.
- [x] Invoice create: line items table, total; Create invoice primary.
- [x] Payment: invoice summary, payment method; Record payment primary.
- [x] Invoice view: read-only; Pay primary if unpaid.
- [x] Reschedule: date, slot, reason; Reschedule primary.
- [x] Confirm/Reject: summary; Confirm primary, Reject danger/default.
- [x] Cancel with suggestion: reason dropdown; optional suggest slot (date + time); primary/danger buttons.
- [x] IPD Transfer: new bed selector; Transfer primary.
- [x] IPD Discharge: notes; Discharge primary.
- [x] Lab report viewer: PDF/view area; Close default.
- [x] Patient drawer: Personal info, Medical history, Recommended lab tests, Quick actions (Vitals, Lab, Invoice); same card/button styles.

### Other dashboards (Doctor, Hospital, Patient, Lab, Nurse, Pharmacist, etc.)

- [ ] Per-dashboard: same structure (sidebar, header, main content); only **colorPrimary** changes per role. Use the same checklist pattern: sidebar active = role primary, primary buttons = role primary, tabs = role primary, one “action needed” KPI accent = role primary; all other colors from shared tokens.

---

## How to Avoid Missing Anything

1. **Tokens first**  
   Before changing any component, update `antd.config.tsx` (and optional CSS variables) with the token table above. Add role-based `colorPrimary` via ConfigProvider per layout. Then every Ant Design component that uses tokens will start matching Figma.

2. **One component type at a time**  
   When converting a screen, go by **type**: all buttons → apply Button overrides; all cards → Card token; all tags → Tag colors. Then do layout (sidebar, header, content). You won’t leave one random Tailwind-style div.

3. **Use the audit checklist**  
   Open the Figma design and the checklist side by side. For each screen/frame, tick every line when that element is implemented in Ant Design with the right token/override. If something in Figma has no checklist line, add a line for it.

4. **Custom blocks (KPI card, queue row, reschedule row)**  
   Don’t leave “custom Tailwind” in place. Build them from Ant Design primitives: `Card`, `Typography`, `Space`, `Tag`, `Button`. Use the same tokens (padding, radius, shadow, colors). Then there is no “missing” styling—everything goes through the token layer.

5. **Search for hardcoded colors**  
   After conversion, grep for `#1A8FE3`, `#1890ff`, and any other old blue in the receptionist (and later other) dashboard. Replace with role primary or semantic token so nothing is left behind.

6. **Per-role verification**  
   For each role dashboard, confirm: only the intended primary color appears for active nav, primary buttons, active tab, and one KPI accent; everything else uses shared neutrals and semantic colors. Use the “Where to use primary” rules from the Figma prompt doc.

---

## Summary

- **100% change** = every color, radius, shadow, spacing, and component type from Figma is defined in **tokens** and implemented with **Ant Design components + overrides**; then **every screen and element** is checked off in the **audit checklist**.
- **Design tokens** (Layer 1) ensure no Figma value is “forgotten”; they’re the single source of truth.
- **Component mapping** (Layer 2) ensures every kind of UI element has an Ant Design equivalent and exact override; custom layouts use primitives + tokens.
- **Audit checklist** (Layer 3) ensures every screen and flow is visited and every visual element is implemented—so the conversion is complete and nothing is missed.

Use this guide when implementing Option A for receptionist first, then for each other dashboard as you roll out the full project UI refresh.
