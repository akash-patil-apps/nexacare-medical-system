# Figma Make: Receptionist Dashboard UI/UX Redesign Prompt & Best Practices

This document gives you **copy-paste prompts** for Figma Make: a **refined design system** (one primary color per role, rest common), **where to use that primary**, and a **complete prompt** that covers the main dashboard plus **all** receptionist flows (Admit to IPD, Create appointment, Vitals, Labs, Invoice, and every modal/page).

---

## Part 1: Design System — One Primary Per Role, Everything Else Common

**Goal:** Professional, restrained look. Each role has **one** role-specific color (primary only). All other colors are **shared** across all dashboards.

### Role-specific (only this changes per role)
- **One primary color per role** (e.g. Receptionist: `#F97316`). Use **only** in the places listed in “Where to use primary” below. No secondary role color.

### Shared everywhere (same for all roles)
- **Backgrounds:** Page `#F3F4F6` or `#FAFAFA`; cards/panels `#FFFFFF`; no colored card backgrounds (no yellow/purple tint).
- **Borders:** `#E5E7EB`.
- **Text:** Primary `#262626`; secondary `#595959` / `#6B7280`.
- **Semantic only:** Success `#22C55E` (Completed, Approve, Ready, success states); Error `#EF4444` (Reject, danger, error); Warning `#F59E0B` only if you need a neutral “warning” (e.g. past-due). Do not use semantic colors for “role identity.”
- **Components:** Same card (16px radius, light shadow, 1px border), same sidebar (80px, icon-only), same header, same tables/tabs. Only the **primary** accent changes per role.

---

## Part 2: Where to Use the Primary Color (Receptionist Example)

Use the **receptionist primary** (`#F97316`) **only** in these places so the UI stays professional and not “too much colour”:

1. **Active sidebar item** — The current page icon (e.g. Dashboard) with primary fill or background.
2. **Primary action buttons** — One main CTA per section: “Create Appointment (Walk-in)”, “Confirm”, “Check-in”, “Admit to IPD” (if you want it as primary; otherwise outline), “Next” / “Book” / “Submit” in modals.
3. **Active tab indicator** — The underline or pill for the selected tab (e.g. Queue Management).
4. **Single “needs action” accent** — Only one KPI card that means “needs attention”: e.g. **Pending Confirmation** (icon or small tag in primary). Other KPI cards: **no** role color; use neutral icons and semantic green only for “Ready” / “Today” / “Completed.”
5. **Optional:** One text link per block (e.g. “View all” in Reschedule) in primary, if you want a single link style.

**Do not use primary for:**
- Other KPI cards’ icons or tags (use gray or semantic green).
- Status dots/chips in the queue bar (use **semantic**: green for Checked In/Completed; **gray** for Pending/Waiting/In queue).
- Reschedule card background (use **white**, same as other cards).
- “Approve” buttons (use **semantic green**).
- “Reject” buttons (use **semantic red** or default gray).
- Badge counts next to doctor names (use **neutral** gray).
- Secondary actions (use default/outline gray buttons).

Result: **Only primary** is role-specific; everything else is neutral or semantic, so the dashboard looks consistent and professional.

---

## Part 3: Detailed Flows for Each Section (Give These to Figma Make)

Use these **step-by-step flows** when prompting Figma Make so each screen and modal is designed with the correct steps, fields, and branches. Copy the relevant flow into your prompt or attach this section as context.

**Flow index (quick reference):**

| # | Flow | Type |
|---|------|------|
| 1 | Main dashboard | Single screen |
| 2 | Create appointment (Walk-in) | Multi-step + branches (existing vs new user, then doctor → date/slot → payment) |
| 3 | Admit to IPD | Single modal, logical order (patient → admission details → bed → submit); includes Quick create patient |
| 4 | Vitals entry | Single modal, form |
| 5 | Lab request | Single modal |
| 6 | Lab tests confirmation | Single modal |
| 7 | Lab test payment | Single modal |
| 8 | Invoice (create) | Single modal, line items table |
| 9 | Payment (record) | Single modal |
| 10 | Invoice view | Read-only modal/drawer |
| 11 | Patient quick view | Right drawer, multiple sections |
| 12 | Reschedule requests | List on dashboard; Approve → Flow 12b |
| 12b | Reschedule appointment | Modal (date, slot, reason) |
| 13 | Confirm / Reject appointment | Small modal |
| 14 | Cancel with suggestion | Modal (reason + optional suggest slot) |
| 15 | IPD Transfer | Modal (select new bed) |
| 16 | IPD Discharge | Modal (notes + discharge) |
| 17 | Lab report viewer | Modal (PDF/view) |
| 18 | Queue Management (per-doctor) | Tab content: doctor tabs, queue list, actions |

---

### Flow 1 — Main dashboard (single screen)

1. **Entry:** Receptionist lands on dashboard (sidebar: Dashboard active, Appointments, Contact directory, Messages, Logout).
2. **Header:** Title “Dashboard”, subtitle hospital name (e.g. “NexaCare Medical Center”); right: campus/location dropdown, notification bell, profile (avatar + name + “Receptionist” + dropdown).
3. **KPI row:** Four cards in one row — Pending Confirmation (number + “Awaiting action”), Confirmed Today (number + “Ready”), Walk-ins Waiting (number + “In queue”), Completed Today (number + “Today”).
4. **Queue status bar:** One line: Pending (count) | Waiting (count) | Checked In (count) | Completed (count) + “X of Y completed today”.
5. **Reschedule requests card:** Title “Reschedule Requests (N)”, subtitle “Patients waiting for reschedule approval”; list of rows: patient name, “From [date] → [date] at [time]”, buttons **Approve** (green), **Reject** (gray/red); “View all” link (primary).
6. **Upcoming Appointments card:** Title “Upcoming Appointments”; header actions: **+ Create Appointment (Walk-in)** (primary), **+ Admit to IPD** (default). Tabs: Queue Management | Today (N) | Pending (N) | Confirmed (N) | Checked In (N) | In Consultation (N) | Completed (N) | Tomorrow (N).
7. **Queue Management tab content:** Sub-tabs per doctor (e.g. “Dr. Smith 3”, “Dr. Patel 5”). For selected doctor: list/table of queue entries — token number, patient name, status; actions per row: **Check-in** (primary), **Vitals**, **Lab**, **Invoice**, **View patient**.
8. **Other tabs content (Today / Pending / etc.):** Table columns: Token, Patient, Doctor, Time, Status (tag), Actions. Row actions: **Confirm** or **Check-in** (primary), **Reject**, **Vitals**, **Lab**, **Invoice**, **Reschedule**, **View patient**. Status tags: Pending (gray), Confirmed (gray or green), Checked In (green), In Consultation (gray), Completed (green).

---

### Flow 2 — Create appointment (Walk-in) — **step-wise, with branches**

**Step indicator at top:** e.g. “Mobile Lookup” → “Registration” / “Book” (branch) → “OTP Verify” (if new) → “Confirm” / “Book Appointment”.

- **Step 0 — Mobile lookup**
  - Single field: “Enter Mobile Number” (10-digit, validation).
  - Button: **Lookup Patient** (primary).
  - Result: loading state “Searching for patient…”; then branch.

- **Branch A — Existing user found**
  - Alert: “Patient Found” + name is already registered.
  - Card: Name, Mobile, (optional) Email.
  - Button: **Book Appointment** (primary) → goes to **Appointment booking** (doctor → date/slot → payment).

- **Branch B — New user (not found)**
  - **Step 1 — Registration form:** Mobile (prefilled), Full Name, Gender, City, Address. Button: **Send OTP** (primary).
  - **Step 2 — OTP verification:** Message “OTP sent to [mobile]”. Field: “Enter OTP” (6 digits). Buttons: **Back**, **Verify OTP** (primary).
  - **Step 3 — Complete registration:** Summary card (Name, Mobile, Gender, City, Address). Buttons: **Back**, **Complete Registration** (primary).
  - After completion → **Appointment booking** (same as Branch A).

- **Appointment booking (sub-flow, 3 sub-steps)**
  - **Sub-step 0 — Select doctor:** List/cards of doctors grouped by specialty; select one. Optional “Change Patient” link. Button **Next** (primary) or inline “Select” per doctor.
  - **Sub-step 1 — Date and time:** Date picker (default today); list of time slots (show availability, e.g. “2 booked” or “Available”). Select slot. Buttons: **Back**, **Next** (primary). Optional “Change Doctor” link.
  - **Sub-step 2 — Payment / confirm:** Summary (patient, doctor, date, time). Payment method (e.g. Card, Cash, UPI). Buttons: **Back**, **Book Appointment** (primary). After success: success screen “Appointment Booked Successfully!” then auto-close.

Design note: Show at least **two frames** — (1) Step 0 Mobile lookup, (2) One of the appointment booking sub-steps (e.g. doctor selection or date/slot). Optionally add frames for “Patient found”, “New user registration”, “OTP verify”, “Payment step”, “Success”.

---

### Flow 3 — Admit to IPD — **step-wise (single modal, logical order)**

1. **Patient selection (top of modal)**
   - If “Today’s appointments” list exists: show list of today’s patients (name, mobile, time); each row: **Select & admit** (primary).
   - Divider: “Or search by mobile number”.
   - Input: 10-digit mobile + **Search** (primary).
   - If not found and mobile length ≥ 10: show **Create profile for this number** (dashed/link) → opens Quick create sub-modal.
   - When patient selected: show summary card (name, mobile, Patient ID) with **Change patient** link.

2. **Admission details**
   - **Admission type:** Select (Elective | Emergency | Day Care | Observation).
   - **Admitting doctor:** Select (dropdown, searchable).
   - **Attending doctor:** Select (optional, searchable).
   - **Admission notes:** Text area (optional).

3. **Bed selection**
   - Section title “Bed Selection”.
   - **Bed selector:** Hierarchy Floor → Ward → Room → Bed; show only available beds. User selects one bed.
   - When selected: small confirmation “Bed selected: [bed id/label]”.

4. **Actions**
   - **Cancel** (default), **Admit Patient** (primary; disabled until patient + bed selected).

**Quick create patient (nested modal):** Title “Create profile for this number”. Fields: Full name (required), Mobile (disabled, prefilled), Gender (optional), Date of birth (optional). Buttons: **Cancel**, **Create & continue to admit** (primary). On success, close nested modal and show patient as selected in main form.

Design: One frame for main Admit modal (with patient selected, bed section visible); optionally a second frame for Quick create modal.

---

### Flow 4 — Vitals entry

1. Modal title: e.g. “Record Vitals”.
2. **Fields (single form):** Blood pressure (e.g. systolic/diastolic or “120/80” single field), Temperature (°C), Pulse, SpO2 (%), Respiratory rate, Weight (kg), Height (cm); optional **Notes** (textarea).
3. Buttons: **Cancel**, **Save** or **Submit** (primary).

Design: One frame with all fields visible.

---

### Flow 5 — Lab request

1. **Patient:** Pre-filled when opened from appointment/patient context; or dropdown “Select patient” if opened standalone.
2. **Tests:** Multi-select or checkbox list of tests (e.g. CBC, HbA1c, Lipid profile, etc.); or “Test name” multi-select / add custom. Optional **Notes** (textarea).
3. Buttons: **Cancel**, **Request lab** or **Submit** (primary).

Design: One frame.

---

### Flow 6 — Lab tests confirmation (doctor-recommended tests)

1. Modal title: “Recommended Lab Tests (N)”.
2. **Content:** List of tests (test name, type, priority tag if any). Optional short description per test.
3. Actions: **Confirm** or **Confirm & send to lab** (primary). May open payment step next (Flow 7) in real app; for design, one frame is enough.

Design: One frame.

---

### Flow 7 — Lab test payment

1. **Summary:** Test name(s), total amount.
2. **Payment method:** e.g. Card, Cash, UPI (or radio/list).
3. Buttons: **Cancel**, **Pay** or **Proceed to payment** (primary).

Design: One frame.

---

### Flow 8 — Invoice (create)

1. **Context:** Often tied to appointment (patient, doctor, date pre-filled or shown).
2. **Line items table:** Columns — Description, Qty, Unit price, Amount (calculated). “Add line” row or button.
3. **Total** (subtotal/tax if any) at bottom.
4. Buttons: **Cancel**, **Create invoice** or **Save** (primary).

Design: One frame with at least 2–3 sample rows.

---

### Flow 9 — Payment (record payment against invoice)

1. **Invoice summary:** Invoice ref, amount due, patient/appointment context.
2. **Payment method:** Card, Cash, UPI, etc.
3. **Amount** (optional if same as due).
4. Buttons: **Cancel**, **Record payment** or **Pay** (primary).

Design: One frame.

---

### Flow 10 — Invoice view (read-only)

1. **Content:** Invoice number, date, status (Paid / Unpaid); line items (description, qty, unit price, amount); total.
2. If unpaid: optional **Pay** (primary) that leads to Flow 9.

Design: One frame.

---

### Flow 11 — Patient quick view (drawer, right side)

1. **Header:** Patient name as drawer title.
2. **Sections (cards):**
   - **Personal information:** Full name, Mobile, Email, DOB, Gender, Blood group, Height, Weight. Optional: **Call**, **Message** (default buttons). If IPD admitted: tag “IPD ADMITTED”, status, attending/admitting doctor, admitted date.
   - **Medical history** (if any): Medical history, Allergies, Chronic conditions.
   - **Recommended lab tests (N):** If any — list of tests; **Confirm Tests** (primary) → opens Lab tests confirmation (Flow 6).
   - **Recent appointments / Last vitals:** Short summary or list.
3. **Quick actions:** **Vitals**, **Lab**, **Invoice** (default/outline). Optional **View lab report** link.

Design: One frame (drawer open) with 2–3 sections visible.

---

### Flow 12 — Reschedule requests (list on dashboard)

- Already described in Flow 1 (Reschedule requests card). **Approve** opens Reschedule modal (Flow 12b). **Reject** = simple confirm or inline reject.

---

### Flow 12b — Reschedule appointment (modal, staff-initiated or after Approve)

1. **Info alert:** “Choose a new date and available slot…”
2. **New date:** Date picker (disable past dates).
3. **New time slot:** Dropdown/list of available slots (optional: show “booked: N” per slot).
4. **Reason:** Text area (required), placeholder e.g. “Doctor not available / patient requested…”
5. Buttons: **Cancel**, **Reschedule** (primary).

Design: One frame.

---

### Flow 13 — Confirm / Reject appointment (small modal)

1. **Content:** Appointment summary (patient, doctor, date, time).
2. Buttons: **Reject** (red or default), **Confirm** (primary).

Design: One frame.

---

### Flow 14 — Cancel with suggestion (modal)

1. **Alert:** “You can cancel and optionally suggest a new slot…”
2. **Cancellation reason:** Select (required): e.g. Doctor not available, Time slot booked, Hospital closed, Emergency, Patient requested, Duplicate, Other.
3. **Checkbox:** “Suggest next available slot to patient”. If checked, show:
   - **Suggested date:** Date picker.
   - **Suggested time slot:** Select (from available slots).
   - **Reason for new appointment** (optional): Text area.
4. Buttons: **Cancel**, **Cancel appointment** or **Cancel & send suggestion** (primary/danger as per copy).

Design: One frame with checkbox unchecked; optionally a second with checkbox checked and date/slot visible.

---

### Flow 15 — IPD Transfer (modal)

1. **Context:** Patient/encounter (name, current bed).
2. **New bed selection:** Same hierarchy as Admit (Floor → Ward → Room → Bed) or direct “Select new bed” dropdown/list.
3. Buttons: **Cancel**, **Transfer** (primary).

Design: One frame.

---

### Flow 16 — IPD Discharge (modal)

1. **Context:** Patient/encounter.
2. **Discharge notes / summary:** Text area (optional).
3. Buttons: **Cancel**, **Discharge** (primary).

Design: One frame.

---

### Flow 17 — Lab report viewer (modal)

1. **Content:** PDF or image of lab report (placeholder “Report preview” or “PDF viewer”).
2. Button: **Close** (default).

Design: One frame.

---

### Flow 18 — Queue Management (per-doctor view)

1. **Doctor tabs:** e.g. “Dr. Smith 3”, “Dr. Patel 5” (count = in queue + not yet checked in).
2. **Queue list:** For selected doctor — rows: Token number, Patient name, Status (e.g. Waiting, Checked in). Actions: **Call next** (optional), **Check-in** (primary), **Vitals**, **Lab**, **Invoice**, **View patient**.
3. **“Not yet checked in”** (if API supports): Separate list or merged with queue; same actions.

Design: Can be part of main dashboard frame (Queue Management tab) or one dedicated frame.

---

When prompting Figma Make, you can say: “Design each of the following flows as separate frames. Use the step-by-step flow descriptions in the document: [paste or refer to Part 3]. Keep primary color only for primary buttons and active states; all other colors common.”

---

## Part 4: Figma Make Prompt — Refined Dashboard + All Flows (Primary Only)

Use this prompt **after** you have the first draft (e.g. the current dashboard image). It (1) refines the existing screen to “primary only + common colors” and (2) adds **all** missing modals and flows so the **complete** receptionist experience is designed.

**Important:** Use the **step-by-step flows in Part 3** when designing each modal and page. For each frame, follow the exact steps, fields, and branches listed in Part 3 so the UI matches the real app behaviour.

Copy the block below into Figma Make. If the tool has token limits, split into **Prompt A** (refined main dashboard + list of flows) and **Prompt B** (all modals and pages in separate frames, using Part 3 flows for each).

---

**PROMPT START**

Refine and extend the **Receptionist Dashboard** for NexaCare so it looks **professional and restrained**: use **only one role color (primary)** and **all other colors common**. Then add **every** receptionist flow as separate frames. For each flow, follow the **step-by-step flow description** provided (see Part 3 — Detailed Flows): include every step, field, button, and branch so the design matches the actual user flow.

**Color rules (strict):**
- **Receptionist primary (only role color):** #F97316. Use **only** for: (1) active sidebar icon, (2) primary buttons (Create Appointment, Confirm, Check-in, Next, Book, Submit), (3) active tab underline, (4) the “Pending Confirmation” KPI card icon or “Awaiting action” tag, (5) optional “View all” link. Do **not** use primary for any other cards, tags, status dots, or secondary actions.
- **Shared (common across all roles):** Background #F3F4F6 or #FAFAFA; cards #FFFFFF with border #E5E7EB; text #262626 / #595959 / #6B7280; success #22C55E (Completed, Approve, Ready, “Today” tag); error #EF4444 (Reject, danger); warning #F59E0B only if needed. Status “Pending”/“Waiting”/“In queue”: use **gray** (#6B7280) or a small gray dot, not purple/blue. **No** colored card backgrounds (e.g. no yellow on Reschedule card — use white like other cards). **No** secondary role color (no indigo/purple for this role).

**Layout (unchanged):** Left sidebar 80px icon-only; top header with title, hospital, notifications, profile; main content one column, 24px padding. Cards: 16px radius, light shadow, 1px border.

---

**A. Refined main dashboard (one frame)**  
Based on the existing receptionist dashboard, apply the rules above:
- Sidebar: only the active “Dashboard” icon in primary; others gray.
- KPI cards: white background for all. Only “Pending Confirmation” uses primary for icon or “Awaiting action” tag; “Confirmed Today”, “Walk-ins Waiting”, “Completed Today” use **neutral** icons and **gray** or **green** tags only (e.g. “Ready”/“Today” in green; “In queue” in gray).
- Queue status bar: Pending/Waiting in gray; Checked In/Completed in green. No orange/purple dots.
- Reschedule card: **white** background, no yellow. Approve = green button, Reject = gray or red. “View all” link can be primary.
- Upcoming Appointments: “Create Appointment (Walk-in)” = primary button; “Admit to IPD” = default/outline. Tabs: only active tab underline in primary; doctor badges/counts in gray.
- Table actions: one primary button per row for main action (Confirm or Check-in); others default (Vitals, Lab, Invoice) or semantic (Reject = red).

---

**B. All modals and pages (separate frames)**  
Create **one frame per flow** so the full receptionist experience is designed. Use the **same** color rules: primary only for primary buttons and active step; rest neutral/semantic.

1. **Admit to IPD**  
   Modal: Patient (search by mobile or select from “Today’s appointments”), Bed selector (floor → ward → room → bed), Admitting doctor, Admission type, Attendant name/mobile (optional). Primary button: “Admit patient” or “Confirm admission”. Optional: “Quick create patient” sub-flow (minimal form).

2. **Create appointment (Walk-in)**  
   Multi-step modal: Step 1 — Select doctor (list or cards). Step 2 — Date + time slot (calendar + slot list). Step 3 — Patient (lookup by mobile / new registration / OTP if new). Step 4 — Payment or Confirm. “Next” / “Book” = primary; “Back” = default. Step indicator: current step in primary, others gray.

3. **Vitals entry**  
   Modal: Fields for BP, Temperature, Pulse, SpO2, Respiratory rate, Weight, Height; optional notes. Primary button: “Save” or “Submit”.

4. **Lab request**  
   Modal: Select tests (checkboxes or list), add to order; optional notes. Primary button: “Request lab” or “Submit”.

5. **Lab tests confirmation**  
   Modal: List of recommended/selected tests; confirm selection. Primary button: “Confirm” or “Send to lab”.

6. **Lab test payment**  
   Modal: Test name(s), amount, payment method. Primary button: “Pay” or “Proceed to payment”.

7. **Invoice (create)**  
   Modal: Line items table (description, qty, unit price, amount); add line; total. Primary button: “Create invoice” or “Save”.

8. **Payment**  
   Modal: Invoice summary, amount due, payment method (e.g. card/cash/UPI). Primary button: “Record payment” or “Pay”.

9. **Invoice view**  
   Modal or side panel: Read-only invoice details (items, totals, status). Optional “Pay” button (primary) if unpaid.

10. **Patient quick view (drawer)**  
    Right drawer: Patient demos, recent appointments, last vitals summary; quick action buttons (Vitals, Lab, Invoice) as default/outline; optional primary for one main action if needed.

11. **Reschedule request**  
    Modal: Patient name, current date/time, requested date/time; “Approve” (green) and “Reject” (gray or red). If “Suggest new slot”: date + slot picker; primary “Confirm reschedule”.

12. **Confirm / Reject appointment**  
    Small modal: Appointment summary; “Confirm” (primary), “Reject” (red or default).

13. **Cancel with suggestion**  
    Modal: Reason or optional message; suggest alternative date/slot; “Cancel appointment” (red) and “Suggest slot” (primary) or “Send suggestion” (primary).

14. **IPD Transfer**  
    Modal: Select new bed or ward/room; “Transfer” (primary).

15. **IPD Discharge**  
    Modal: Discharge summary or notes; “Discharge” (primary), “Cancel” (default).

16. **Lab report viewer**  
    Modal: PDF or image view of report; “Close” (default).

---

**Deliverables:**  
- One **refined main dashboard** frame (primary-only + common colors), following **Flow 1** (main dashboard) from the step-by-step flows.  
- **One frame per flow** above (16+ frames), each designed according to the **detailed step-wise flow** for that section (Part 3). Use auto layout, 8px grid, named layers. Keep modals/drawers consistent: same padding, same primary button style, no extra accent colors. For multi-step flows (e.g. Walk-in, Admit to IPD), create **one frame per major step or branch** so all states are designed.

**PROMPT END**

---

## Part 5: How to Get the Best Results from Figma Make

1. **Reference the current design**  
   Say: “Refine the existing receptionist dashboard frame so only the primary color #F97316 is used for [list]. Change Reschedule card to white background; use gray for Pending/Waiting and green for Completed/Approve.”

2. **Chunk if needed**  
   - **Chunk 1:** “Apply primary-only color rules to the main dashboard and queue/appointments section.”  
   - **Chunk 2:** “Add frames for: Admit to IPD, Create appointment (4 steps), Vitals, Lab request, Lab confirmation, Lab payment.”  
   - **Chunk 3:** “Add frames for: Invoice create, Payment, Invoice view, Patient drawer, Reschedule, Confirm/Reject, Cancel with suggestion, Transfer, Discharge, Lab report viewer.”  
   Reuse the same color and layout rules in every chunk.

3. **Be explicit**  
   Repeat: “No secondary role color. No purple, indigo, or yellow card backgrounds. Primary only for active nav, primary buttons, active tab, and Pending Confirmation accent.”

4. **Ask for handoff**  
   “Use auto layout, 8px grid, named layers. One frame per modal/flow (and per step for multi-step flows) so we can implement in React.”

5. **Paste flows when needed**  
   When asking for a specific flow (e.g. “Design the Walk-in Create appointment flow”), paste the corresponding **Part 3** flow (Flow 2) into the prompt so Figma Make includes every step and branch.

---

## Part 6: Role Primary-Only Reference (for other dashboards)

| Role            | Primary   | Use only for (same pattern as receptionist)     |
|-----------------|-----------|--------------------------------------------------|
| Receptionist    | #F97316   | Active nav, primary buttons, active tab, one “action needed” accent |
| Doctor          | #1D4ED8   | Same pattern                                      |
| Hospital/Admin  | #7C3AED   | Same pattern                                      |
| Lab             | #0EA5E9   | Same pattern                                      |
| Nurse           | #059669   | Same pattern                                      |
| Pharmacist      | #10B981   | Same pattern                                      |
| Radiology Tech  | #7C3AED   | Same pattern                                      |
| Patient         | #1A8FE3   | Same pattern                                      |

All other colors (neutrals + semantic green/red/warning) are **common** across roles.

---

## Quick Checklist

- [ ] Only **one** role color (primary); no secondary role color in the prompt.
- [ ] Primary used only for: active nav, primary buttons, active tab, single “Pending”/action accent, optional “View all” link.
- [ ] Reschedule and all cards: **white** background; status dots gray/green; Approve = green, Reject = red/gray.
- [ ] **Part 3 (Detailed Flows)** is shared with Figma Make so each section is designed step-by-step with correct fields and branches.
- [ ] All flows covered: main dashboard (Flow 1), Walk-in (Flow 2), Admit to IPD (Flow 3), Vitals (4), Lab request/confirmation/payment (5–7), Invoice create/payment/view (8–10), Patient drawer (11), Reschedule list + modal (12–12b), Confirm/Reject (13), Cancel with suggestion (14), Transfer (15), Discharge (16), Lab report viewer (17), Queue Management (18).
- [ ] Deliverables: one refined dashboard frame + one frame per flow (and per major step for multi-step flows), same design system throughout.

You can paste **Part 4** (Figma Make prompt) into Figma Make and **Part 3** (Detailed Flows) as context so the AI designs every screen and modal correctly. Use **Part 2** whenever you need to remind the AI where the primary color is allowed.
