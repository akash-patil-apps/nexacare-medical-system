# PRD — Pharmacy Inventory + Dispensing (v1)

**Primary Roles**: Pharmacist  
**Secondary Roles**: Doctor, Nurse, Billing, Hospital Admin  
**Goal**: basic pharmacy operations: stock + dispensing linked to prescriptions/orders.

---

## 1) Problem
Prescriptions exist, but there’s no pharmacy workflow. Hospitals need:
- inventory tracking (batch/expiry)
- dispensing against prescriptions
- IP issues linked to eMAR (later)

---

## 2) Goals (v1)
- Maintain drug master + stock batches.
- Dispense OPD prescriptions (mark dispensed/partial).
- Track expiry/low stock alerts.

Non-goals v1: purchase orders, vendor mgmt, controlled drugs compliance, GST.

---

## 3) Data Model (Proposed)
### `drug_master`
- `id`, `hospitalId`, `name`, `strength`, `form` (tab/cap/syrup), `isActive`

### `drug_batches`
- `id`, `drugId`
- `batchNo`, `expiryDate`, `mrp`, `purchasePrice`
- `quantityOnHand`

### `dispenses`
- `id`, `hospitalId`, `patientId`, `appointmentId?`, `prescriptionId?`
- `status`: draft/dispensed/partially_dispensed/returned
- `dispensedByUserId`, `dispensedAt`

### `dispense_items`
- `id`, `dispenseId`, `drugBatchId`
- `quantity`, `unitPrice`, `amount`

---

## 4) APIs (Proposed)
- `GET /api/pharmacy/drugs`
- `POST /api/pharmacy/drugs`
- `POST /api/pharmacy/batches` (stock in)
- `PATCH /api/pharmacy/batches/:id/adjust`

- `POST /api/pharmacy/dispenses` body `{ prescriptionId }`
- `PATCH /api/pharmacy/dispenses/:id/dispense` (finalize)
- `GET /api/pharmacy/dispenses?date=`

---

## 5) UI Requirements
### Pharmacy dashboard
- Stock view (search + low stock + expiry)
- Prescription queue (today)
- Dispense screen:
  - choose batch
  - quantity
  - finalize dispense

---

## 6) Rules
- Do not allow dispense beyond quantityOnHand.
- Prefer FEFO (first-expiry-first-out) suggestion.

---

## 7) Acceptance Criteria
- Pharmacist can add a drug and stock batch.
- Pharmacist can dispense against a prescription, updating inventory.
- Low stock / near-expiry is visible.


