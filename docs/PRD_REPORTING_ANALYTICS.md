# PRD — Reporting & Analytics (Operational + Clinical + Revenue) (v1)

**Primary Roles**: Hospital Admin  
**Secondary Roles**: Receptionist, Doctor, Lab  
**Goal**: replace “coming soon” reports with usable, exportable dashboards.

---

## 1) Problem
Hospitals need visibility: appointments load, no-shows, bed occupancy, lab TAT, collections. Current dashboards show KPIs, but many “View reports” actions are placeholders.

---

## 2) Goals (v1)
- Provide role-appropriate reports with filters + exports.
- Standardize metrics definitions (so counts match everywhere).

Non-goals v1: predictive analytics, ML forecasting.

---

## 3) Reports (v1)

### 3.1 OPD Operations
- Appointments by status (pending/confirmed/checked-in/completed/cancelled)
- No-show rate (absent)
- Walk-in vs online mix
- Doctor-wise load (per day)

### 3.2 Lab
- Orders by status
- Turnaround time (ordered → released)
- Pending queue aging

### 3.3 Finance (OPD v1)
- Daily collections
- Outstanding balances
- Discounts granted (by user)

### 3.4 IPD (if enabled)
- Bed occupancy by ward/category
- Admissions/discharges per day

---

## 4) Data Requirements
Prefer server-side aggregation endpoints (avoid heavy client joins).

---

## 5) APIs (Proposed)
- `GET /api/reports/opd?dateFrom=&dateTo=&doctorId=`
- `GET /api/reports/lab?dateFrom=&dateTo=`
- `GET /api/reports/finance/opd?dateFrom=&dateTo=`
- `GET /api/reports/ipd/census?date=`

Export:
- `GET /api/reports/:type/export?format=csv&...`

---

## 6) UI Requirements
- Hospital dashboard “Reports” page:
  - tabs: OPD / Lab / Finance / IPD
  - filters: date range, doctor, department
  - charts + table + export CSV

---

## 7) Acceptance Criteria
- Admin can filter and export OPD appointment status report.
- Lab TAT report matches order timestamps.
- Finance report totals match invoice/payment tables (from billing PRD).




