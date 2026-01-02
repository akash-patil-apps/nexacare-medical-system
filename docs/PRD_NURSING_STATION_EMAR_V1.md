# PRD — Nursing Station + Vitals + eMAR (v1)

**Primary Roles**: Nurse  
**Secondary Roles**: Doctor, Hospital Admin, Pharmacy  
**Depends on**: `PRD_IPD_ADT_BED_MANAGEMENT_V1.md`

---

## 1) Problem
Once patients are admitted, nursing workflows drive most of the day-to-day care. Without nursing station + eMAR:
- meds administration isn’t tracked
- vitals aren’t charted
- doctor orders aren’t operationalized

---

## 2) Goals (v1)
- Nurse station “My Ward” patient list (from IPD encounters).
- Vitals charting (manual entry).
- eMAR: medication schedule + administration logging.

Non-goals v1: device vitals integration, advanced ICU flows, infusion pumps.

---

## 3) Data Model (Proposed)
### `vitals`
- `id`, `encounterId`, `patientId`
- `recordedByUserId`
- `recordedAt`
- fields: `bpSystolic`, `bpDiastolic`, `pulse`, `tempC`, `spo2`, `respRate`, `weightKg`

### `medication_orders` (from doctor)
- `id`, `encounterId`, `orderedByDoctorId`
- `drugName`, `dose`, `unit`, `route`, `frequency`, `startAt`, `endAt`
- `status`: active/stopped

### `med_administrations`
- `id`, `medicationOrderId`
- `scheduledAt`
- `administeredAt`
- `administeredByUserId`
- `status`: given/held/refused/missed
- `note`

---

## 4) Workflow
### 4.1 Vitals
1. Nurse opens encounter
2. Enters vitals
3. System stores reading and shows trend list

### 4.2 Medication administration (eMAR)
1. Doctor places medication order (v1 could be via simple doctor UI)
2. System generates schedule times (basic frequency rules)
3. Nurse marks each scheduled dose as given/held/refused/missed

---

## 5) APIs (Proposed)
- `POST /api/ipd/encounters/:id/vitals`
- `GET /api/ipd/encounters/:id/vitals`

- `POST /api/ipd/encounters/:id/med-orders` (doctor)
- `PATCH /api/ipd/med-orders/:id/stop`
- `GET /api/ipd/encounters/:id/med-orders`

- `PATCH /api/ipd/med-admins/:id` (nurse logs status)
- `GET /api/ipd/encounters/:id/med-admins?date=`

---

## 6) UI Requirements
### Nurse dashboard
- Ward patients list (by ward/assigned)
- Encounter view tabs:
  - Vitals (add + history)
  - Medications (eMAR grid for today)
  - Notes (v1 simple)

### Doctor
- Place medication order inside encounter

---

## 7) Rules
- Only nurses can record eMAR administrations.
- Medication order changes create audit entries (see audit PRD).

---

## 8) Acceptance Criteria
- Nurse can record vitals and they persist.
- Nurse can mark scheduled meds and status is visible historically.
- Doctor can create/stop medication orders.


