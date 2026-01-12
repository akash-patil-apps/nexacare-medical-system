# PRD — OPD Billing & Payments (v1)

**Product**: NexaCare Medical System  
**Module**: Revenue Cycle (OPD)  
**Primary Roles**: Receptionist, Hospital Admin  
**Secondary Roles**: Patient, Doctor  
**Status**: Proposed (implementation-ready)

---

## 1) Problem Statement

In real hospitals/clinics, OPD operations require:
- generating an invoice/receipt
- tracking payment status (paid/unpaid/partial/refund)
- basic discount approval controls

NexaCare currently shows “Payment” tags and has receptionist KPI placeholders for “pending payments”, but there is **no billing engine**.

---

## 2) Goals

### Goals (v1)
- Support **OPD consultation billing** per appointment.
- Allow receptionist to:
  - create invoice,
  - mark payment received,
  - print/share receipt (download PDF in v1),
  - apply discount with reason.
- Allow hospital admin to configure:
  - consultation fees (default + per doctor),
  - discount limits.
- Show patient:
  - invoice/receipt history (simple).

### Non-Goals (v1)
- Insurance/TPA claims
- IPD billing (room rent, packages, deposits)
- Inventory-linked pharmacy billing
- GST filings (we can store tax fields but keep compliance minimal in v1)

---

## 3) Scope (What to Bill in v1)

### Included
- **Consultation fee** (doctor visit)
- Optional **registration fee** (one-time or per visit, configurable)
- Optional **discount** (amount/percent)
- Optional **tax** fields (stored but can be 0)

### Excluded
- Labs, radiology, procedures, pharmacy (v2+)

---

## 4) Workflow

### 4.1 Standard OPD flow
1. Patient books appointment (online or walk-in)
2. Receptionist confirms (if needed)
3. On arrival, receptionist check-in (existing)
4. Receptionist clicks **Create Invoice**
5. System calculates charges (doctor fee + extras)
6. Receptionist records payment:
   - cash / card / UPI / online
7. Receipt generated
8. Patient can view receipt in dashboard

### 4.2 Discount flow
1. Receptionist selects discount type: amount or percent
2. Adds reason
3. If discount > configured threshold → require admin approval (v1 optional)

### 4.3 Refund / cancellation
1. Appointment cancelled (existing cancel route)
2. If invoice paid, receptionist can issue refund (v1: mark refunded, store refund reason)

---

## 5) Data Model (Proposed)

### 5.1 New table: `invoices`
- `id` (PK)
- `hospitalId`
- `patientId`
- `appointmentId` (unique; 1 invoice per OPD appointment in v1)
- `invoiceNumber` (unique per hospital)
- `status`:
  - `draft`
  - `issued`
  - `paid`
  - `partially_paid`
  - `refunded`
  - `void`
- Amounts:
  - `subtotal`
  - `discountAmount`
  - `taxAmount`
  - `total`
  - `paidAmount`
  - `balanceAmount`
- `currency` (default INR)
- `issuedAt`
- `createdAt`, `updatedAt`

### 5.2 New table: `invoice_items`
- `id`
- `invoiceId`
- `type`:
  - `consultation_fee`
  - `registration_fee`
- `description`
- `quantity`
- `unitPrice`
- `amount`

### 5.3 New table: `payments`
- `id`
- `invoiceId`
- `method`: `cash` | `card` | `upi` | `online`
- `amount`
- `reference` (upi txn id, etc.)
- `receivedByUserId`
- `receivedAt`
- `notes`

### 5.4 New table: `refunds` (optional v1)
- `id`
- `invoiceId`
- `amount`
- `reason`
- `processedByUserId`
- `processedAt`

### 5.5 Config table (simple)
Either:
- `hospital_settings`: default consultation fee, discount limit
or
- store doctor fee in doctors profile (already has `consultationFee`)

---

## 6) API Design (Proposed)

### Receptionist/Hospital
- `POST /api/billing/opd/invoices`
  - body: `{ appointmentId, items?, discount? }`
  - returns: invoice

- `GET /api/billing/opd/invoices/:invoiceId`
- `GET /api/billing/opd/invoices?hospitalId=&date=`

- `PATCH /api/billing/opd/invoices/:invoiceId/issue`
- `POST /api/billing/opd/invoices/:invoiceId/payments`
  - body: `{ method, amount, reference?, notes? }`

- `POST /api/billing/opd/invoices/:invoiceId/refund`
  - body: `{ amount, reason }`

### Patient
- `GET /api/billing/my/invoices`
- `GET /api/billing/my/invoices/:invoiceId`

### PDF / Print (v1)
- `GET /api/billing/opd/invoices/:invoiceId/pdf`

---

## 7) UI Requirements

### 7.1 Receptionist dashboard
- Add **Billing** column / badge in appointment list:
  - Unbilled / Draft / Paid / Balance due
- Appointment row actions:
  - Create invoice
  - Record payment
  - View/print receipt

### 7.2 Hospital admin dashboard
- Billing settings:
  - default fee
  - discount limit
  - invoice prefix/format
- Revenue view:
  - daily collections
  - outstanding balances

### 7.3 Patient dashboard
- Simple “Invoices/Receipts” page:
  - list invoices
  - download PDF

---

## 8) Business Rules (v1 defaults)
- 1 invoice per OPD appointment
- Invoice numbering per hospital: `HOSP-YYYY-000001` (example)
- Payment status derived from `paidAmount`:
  - if 0 → issued/unpaid
  - if < total → partially_paid
  - if == total → paid
- Refund allowed only if paidAmount > 0

---

## 9) Acceptance Criteria
- Receptionist can generate an invoice from an appointment.
- Receptionist can record a payment and invoice becomes paid/partial correctly.
- Patient can view/download receipt.
- Admin can set default fee/discount limit.









