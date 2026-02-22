# Figma Design Export vs NexaCare Receptionist Dashboard — Comparison

This document compares the **Figma-generated code** (downloaded from `Receptionist Dashboard Design`) with the **current NexaCare receptionist dashboard** so you can plan integration or adoption.

---

## 1. High-Level Differences

| Aspect | Figma design export | NexaCare (current) |
|--------|---------------------|---------------------|
| **Purpose** | Standalone UI prototype / design handoff | Full app: auth, API, routing, real data |
| **Stack** | React 18 + Vite + **Tailwind CSS 4** + **Radix UI** + Lucide + MUI (some) | React 18 + Vite + **Ant Design** + **Wouter** + **TanStack Query** + Lucide |
| **Routing** | None (single page, modal toggles) | Wouter: `/dashboard/receptionist`, `/receptionist/appointments`, etc. |
| **Data** | **Mock / local state only** (hardcoded arrays, `useState`) | **Live APIs** (`/api/appointments/my`, `/api/reception/...`, `/api/ipd/...`, etc.) |
| **Auth** | None (no login, no token) | `useAuth()`, `localStorage` token, role check |
| **File structure** | One app folder, many small components + `ui/` (shadcn-style) | Monolithic `receptionist-dashboard.tsx` + shared `components/` (Ant Design, custom) |

---

## 2. Tech Stack & Dependencies

**Figma export:**

- **Styling:** Tailwind CSS 4, `theme.css` with CSS variables (oklch colors, `--primary`, `--sidebar-primary`, etc.). **Receptionist primary is hardcoded in components** as `#F97316` (not from theme vars).
- **UI primitives:** Radix UI (Dialog, Tabs, Select, etc.), shadcn-style components under `src/app/components/ui/` (button, card, input, sheet, etc.).
- **Icons:** Lucide React.
- **Forms:** Local state; no react-hook-form in the parts we saw (could be in some modals).
- **Extra:** Motion, Recharts, react-day-picker, Vaul (drawer), Sonner (toast), etc.

**NexaCare:**

- **Styling:** Ant Design theme + inline styles + some CSS (e.g. `index.css`, onboarding). Primary/secondary per role (e.g. `receptionistTheme.primary`).
- **UI:** Ant Design (Layout, Card, Table, Tabs, Modal, Form, Button, etc.) + custom components (KpiCard, QueuePanel, ReceptionistSidebar, etc.).
- **Icons:** Ant Design Icons + Lucide.
- **Data:** TanStack Query for all API calls; real backend (Express, PostgreSQL).
- **Routing:** Wouter; role-based redirects.

**Implication:** To “use” the Figma design inside NexaCare you either (a) **restyle** existing Ant Design pages to match Figma’s look (colors, spacing, cards) without changing stack, or (b) **replace** receptionist UI piece by piece with Tailwind + Radix/shadcn and wire to your APIs and auth.

---

## 3. Layout & Structure

**Figma:**

- **Single page:** One `App.tsx` with `<Sidebar>`, `<Header>`, main content (KPICards, QueueStatusBar, AppointmentsSection, RescheduleRequests).
- **Modals:** Each flow is a separate component; visibility controlled by `activeModal` state (e.g. `activeModal === 'walkin'` → `<WalkinModal />`). A “Demo All Flows” section with buttons opens each modal for demo.
- **Sidebar:** 80px width, icon-only, **receptionist primary `#F97316`** for active item (matches your spec). Items: Profile, Dashboard, Appointments, Contact Directory, Messages, Logout.
- **Header:** Dashboard title, “NexaCare Medical Center”, Main Campus dropdown, notification bell, profile (Jane Doe, Receptionist).

**NexaCare:**

- **Routes:** `/dashboard/receptionist` (main dashboard), `/receptionist/appointments`, `/dashboard/receptionist/contact-directory`, `/receptionist/messages`, plus profile, etc.
- **One big component:** Most of the receptionist UI lives in `receptionist-dashboard.tsx` (thousands of lines) with many `useState` modals/drawers. Sidebar is `ReceptionistSidebar`; header is `TopHeader`.
- **Modals/drawers:** Opened from table row actions or buttons; each has its own state (`isWalkInModalOpen`, `isAdmissionModalOpen`, etc.) and is rendered at the bottom of the same file.

**Implication:** Figma gives you a **clean, split component structure** (one component per modal/section). NexaCare has a **single huge page** with everything in one file. Adopting Figma’s structure would mean splitting the dashboard into smaller components and routing or state for which modal is open.

---

## 4. Design System Alignment

**Colors:**

- **Figma:** Uses your “primary only” rule: `#F97316` for active nav, primary buttons, “Awaiting action” tag, step indicator, “View all” link. Other KPI tags: green `#22C55E` (Ready, Today), gray `#6B7280` (In queue). Reschedule card: **white** background, Approve green, Reject default. Matches the refined prompt.
- **NexaCare:** Has `receptionistTheme` (primary `#F97316`, secondary `#6366F1`) but many components still use `#1A8FE3` (generic blue) for icons/buttons. So Figma is **more consistent** with “primary only” for receptionist.

**Components:**

- **Cards:** Figma uses `rounded-2xl border border-[#E5E7EB] shadow-[0_2px_8px_rgba(0,0,0,0.08)]` — same intent as your 16px radius, light shadow.
- **Buttons:** Figma primary = `bg-[#F97316]`; default = white + border. NexaCare uses Ant Design `Button type="primary"` (theme-driven) and various overrides.

**Implication:** Figma’s visual design and color usage are **closer to your documented design system** (primary only, neutral/semantic elsewhere). NexaCare would need a pass to remove leftover blue/secondary and align with Figma’s tokens.

---

## 5. Flows & Features (Functional Gaps)

**Figma (UI only, no backend):**

- **Walk-in:** Steps: mobile lookup → patient found / new registration (OTP, complete registration) → select doctor → date & time → payment → success. **Mock only** (e.g. random “patient found” vs “new user”).
- **Admit to IPD:** Patient (today’s list or search), quick create, admission type, admitting/attending doctor, bed selector, notes. **No API**, no real bed structure.
- **Vitals, Lab request, Invoice create, Payment, Invoice view, Reschedule, Confirm/Reject, Cancel with suggestion, IPD Transfer/Discharge, Lab report viewer, Patient drawer:** All present as **UI shells** with local state and mock data.

**NexaCare:**

- Same flows are **fully wired**: real APIs, validation, errors, success toasts, query invalidation, navigation. Walk-in has real OTP, registration, doctor slots, Razorpay/payment; IPD has real bed structure and encounter creation; etc.

**Implication:** The Figma code is a **reference implementation for layout and styling**, not for behavior. You keep NexaCare’s logic and APIs; you’d reuse Figma’s **structure and styling** (and optionally its component split).

---

## 6. File & Component Mapping

Rough mapping so you know what to compare or port:

| Figma (Receptionist Dashboard Design) | NexaCare (client) |
|--------------------------------------|-------------------|
| `App.tsx` (layout + modal state) | `receptionist-dashboard.tsx` (layout + all modals inline) |
| `Sidebar.tsx` | `ReceptionistSidebar.tsx` |
| `Header.tsx` | `TopHeader.tsx` (or header part inside dashboard) |
| `KPICards.tsx` | `KpiCard` + 4 cards in dashboard |
| `QueueStatusBar.tsx` | Queue status row (Pending/Waiting/Checked In/Completed) in dashboard |
| `RescheduleRequests.tsx` | `RescheduleRequestsQueue` |
| `AppointmentsSection.tsx` + `AppointmentTabs.tsx` + `AppointmentTable.tsx` | Tabs (Queue, Today, Pending, …) + table in dashboard |
| `QueueManagementTab.tsx` | `QueuePanel` + doctor sub-tabs |
| `WalkinModal.tsx` | Walk-in modal (Steps 0–4 + appointment sub-steps) in dashboard |
| `AdmitIPDModal.tsx` | `AdmissionModal` (ipd/) |
| `VitalsModal.tsx` | `VitalsEntryForm` (clinical/) |
| `LabRequestModal.tsx` | `LabRequestModal` (modals/) |
| `InvoiceCreateModal.tsx`, `PaymentModal.tsx`, `InvoiceViewModal.tsx` | `InvoiceModal`, `PaymentModal`, `InvoiceViewModal` (billing/) |
| `RescheduleModal.tsx` | Reschedule modal in dashboard |
| `CancelWithSuggestionModal.tsx` | Cancel-with-suggestion modal in dashboard |
| `IPDTransferModal.tsx`, `IPDDischargeModal.tsx` | `TransferModal`, `DischargeModal` (ipd/) |
| `LabReportViewer.tsx` | `LabReportViewerModal` |
| `PatientDrawer.tsx` | Patient info Drawer in dashboard |
| `ConfirmRejectModal.tsx` | Confirm/Reject modal in dashboard |
| `src/app/components/ui/*` (button, card, dialog, input, …) | Ant Design components + custom |

---

## 7. Summary: What’s Different and How to Use the Figma Code

**Differences:**

1. **Stack:** Figma = Tailwind + Radix/shadcn + no backend. NexaCare = Ant Design + Wouter + TanStack Query + real API.
2. **Data:** Figma = mock/local state. NexaCare = live data and auth.
3. **Structure:** Figma = many small components and one place for modal state. NexaCare = one large dashboard file with modals inline.
4. **Design:** Figma follows “primary only” (#F97316) and shared neutrals more consistently; NexaCare still has some generic blue and mixed patterns.
5. **Flows:** Same flows exist in both; only NexaCare has real logic and APIs.

**Ways to use the Figma design:**

- **Option A — Visual only:** Keep NexaCare stack (Ant Design, existing components). Change CSS/theme and component props (e.g. card radius, shadows, primary color, KPI layout) to **match Figma’s look**. No need to adopt Tailwind or Radix.
- **Option B — Component structure:** Gradually split `receptionist-dashboard.tsx` into smaller components (e.g. one per modal/section) **like** the Figma export, but keep Ant Design and your APIs. Optionally reuse Figma’s **layout and copy** (labels, order of fields, step names) and restyle with Ant Design.
- **Option C — Full UI swap:** Introduce Tailwind and Radix/shadcn in the receptionist area, reuse Figma’s components, and **wire** them to your existing APIs and auth (replace mock data and local state with `useQuery`/mutations and route/role checks). Highest effort, biggest visual/structure alignment.

---

## 8. Recommendation: Option A First, Then Option B Incrementally

**Do not do Option C (full UI swap)** for receptionist only. You have many dashboards and pages; introducing Tailwind + Radix only for receptionist would mean:

- Two UI systems in one app (Ant Design everywhere else, Tailwind/Radix for receptionist).
- Inconsistent look and maintenance (different patterns, theming, and components per area).
- Large one-time refactor and ongoing cost when you add features or fix bugs.

**Choose Option A first (visual alignment only):**

- Keep Ant Design and your current component structure.
- Update **only** receptionist-area styling to match Figma:
  - **Primary color:** Use `#F97316` for active sidebar, primary buttons, active tab, and the “Pending Confirmation” KPI accent. Remove or replace any `#1A8FE3` (blue) in receptionist sidebar, headers, and buttons.
  - **Cards:** Same as now (e.g. 16px radius, light shadow, white background). Ensure Reschedule/queue cards use **white** background, not yellow or tinted.
  - **Status / tags:** Pending/Waiting/In queue = gray (`#6B7280`); Checked In/Completed/Ready = green (`#22C55E`); Approve = green button; Reject = default or red.
- Scope is limited to the receptionist dashboard and its modals; no change to Doctor, Hospital, Patient, or other dashboards.
- Effort is low: theme overrides and a few inline/style tweaks. You get the “new design” look without rewriting components or touching other roles.

**Then, optionally, Option B incrementally:**

- Do **not** do a big-bang refactor of `receptionist-dashboard.tsx`.
- When you next work on receptionist (e.g. add a feature, fix a bug, or improve one flow), extract **one** piece into its own component (e.g. RescheduleRequests, Walk-in modal, or Admit IPD modal) and keep using Ant Design and your APIs.
- Over time the file shrinks and becomes easier to maintain, and the structure moves closer to Figma’s component split without a single large project.

**Summary:** Use **Option A** to get the Figma look with minimal risk; use **Option B** only as small, incremental refactors when you touch receptionist code. Avoid **Option C** so you keep one design system (Ant Design) across all dashboards and pages.

---

## 9. Broader Scope: “Platform Will Be Huge” — Do We Change Framework Now (Option C) or Stay on Option A?

If the platform is going to be **very large** (many roles, dashboards, and pages), the question becomes: **standardize on one stack now**, or **keep Ant Design and only align visuals (Option A)**?

### When it *can* make sense to do the framework change now (Option C path)

- You are **committed** to Tailwind + Radix (or a similar modern stack) as the **long-term** standard and are willing to invest in migration and possibly running two systems for a while.
- You want **receptionist to be the pilot**: first dashboard fully on Tailwind/Radix, with shared `ui/` components and design tokens. Then **all new** dashboards/pages use that stack, and you migrate existing ones in phases (e.g. when you redesign or touch them).
- You have **bandwidth** for: (1) building/maintaining a small design system (tokens, Button/Card/Modal etc.), (2) wiring Figma-style components to your APIs/auth, (3) living with Ant Design and Tailwind side-by-side until migration is done.

In that case, **doing Option C for receptionist now** is a strategic bet: you pay the cost once on one dashboard, establish patterns, and then scale the new stack as the platform grows.

### When it’s better to stay on Option A (no framework change)

- You are **not sure** you want to lock in Tailwind/Radix long term, or you prefer to **ship fast** and reduce risk.
- **Ant Design is not a blocker**: it scales to huge apps (enterprise use everywhere). Your main gap is **visual consistency** (primary color, cards, status colors), which you can fix with theme + overrides (Option A).
- You’d rather **one stack everywhere** (Ant Design) and avoid maintaining two design systems and two patterns (Ant Design vs Tailwind/Radix) across many dashboards.

Then **Option A is the right choice**: align design on Ant Design, keep one stack, and revisit “framework change” only when you have a strong reason (e.g. Ant Design actively limiting you, or a greenfield v2).

### Recommended decision frame

| If you… | Then |
|--------|------|
| Are **sure** you want Tailwind/Radix as the future stack and can invest in a pilot + migration | **Do Option C for receptionist now** as the first Tailwind/Radix dashboard; new work uses that stack; migrate others in phases. |
| Prefer **one stack, lower risk, faster delivery** and are fine with Ant Design at scale | **Do Option A**: align receptionist (and later other roles) visually with tokens/theme on Ant Design; no framework change. |
| Are **unsure** | **Start with Option A**. You can always introduce Tailwind/Radix later for a new module or a v2; reversing a full migration is harder. |

### Practical recommendation for “platform will be huge”

- **Default: Option A.**  
  For a growing platform, **one consistent stack** (Ant Design) plus a **clear design system** (primary per role, shared neutrals, card/button rules) usually beats an early, large framework migration. You can make the app look modern and consistent without rewriting components.

- **Choose Option C only if** you have already decided that Tailwind/Radix (or similar) is the long-term standard and you’re ready to run a receptionist pilot and then roll that stack out to new and existing areas over time.

So: **“Do the framework change now”** only if you’re committed to the new stack; otherwise **“go with Option A”** and keep the platform on one framework as it grows.
