# Appointment Booking Logic Documentation

## Overview
This document explains the logic behind hospital status, doctor availability, and the appointment booking flow.

---

## 1. Hospital Status Logic

### "Pending" Status (Yellow Tag)
**Condition:** `hospital.isVerified === false`

- Hospitals are created with `isVerified: false` by default
- Admin must verify the hospital before it shows as "Available"
- Shows yellow tag with "Pending" text
- Patients can still book appointments at pending hospitals, but they may not be fully verified

### "Available" Status (Green Tag)
**Condition:** `hospital.isVerified === true`

- Hospital has been verified by admin
- Shows green tag with "Available" text
- Indicates the hospital is fully operational and verified

**Code Location:** `client/src/pages/book-appointment.tsx` (line ~920)

```typescript
const status = hospital.isVerified ? 'Available' : 'Pending';
const statusColor = hospital.isVerified ? '#10B981' : '#F59E0B';
const statusBg = hospital.isVerified ? '#D1FAE5' : '#FEF3C7';
```

---

## 2. Doctor Availability Status Logic

### "Not Available" (Red Button)
**Conditions:**
- `doctor.isAvailable === false` OR
- `doctor.status === 'out'` OR
- No slots configured (`availableSlots` is empty)

**Display:**
- Red button with "Not Available" text
- Close circle icon
- Patient cannot select this doctor

### "Busy" (Yellow/Orange Button)
**Conditions:**
- `doctor.status === 'busy'` AND
- Doctor has slots configured

**Display:**
- Yellow/orange button with "Busy" text
- Clock icon
- Patient can still book, but doctor may be less responsive

### "Available" (Green Button)
**Conditions:**
- `doctor.isAvailable === true` AND
- `doctor.status !== 'busy'` AND
- `doctor.status !== 'out'` AND
- Has slots configured

**Display:**
- Green button with "Available" text
- Check circle icon
- Patient can book normally

**Code Location:** `client/src/pages/book-appointment.tsx` (function `getDoctorAvailabilityStatus`)

### Individual Slot Availability (Color Coding)
When a patient selects a doctor and date, individual time slots show color coding:

- **Green**: ≤2 bookings (3+ slots available out of 5 max)
- **Yellow**: 3-4 bookings (1-2 slots available out of 5 max)
- **Red**: 5 bookings (Fully booked, 0 slots available, disabled)

**Slot Limit:** Each 30-minute slot can have maximum 5 patients.

---

## 3. Appointment Booking API

### Endpoint
**POST** `/api/appointments`

### Required Fields
- `doctorId` (number)
- `hospitalId` (number)
- `appointmentDate` (string, format: YYYY-MM-DD)
- `appointmentTime` (string, format: HH:mm)
- `timeSlot` (string, format: "HH:mm-HH:mm" or "HH:mm")
- `reason` (string)
- `priority` (string, optional, default: "normal")
  - Values: "normal", "high", "urgent"

### Optional Fields
- `symptoms` (string)
- `notes` (string)
- `type` (string, default: "online")
- `patientId` (number, for receptionist bookings)

### Priority Values
- **normal** (Green): Standard appointment priority
- **high** (Yellow): Higher priority, may be scheduled earlier
- **urgent** (Red): Urgent priority, may be prioritized in scheduling

**Code Location:** 
- Frontend: `client/src/pages/book-appointment.tsx` (function `handleSubmit`)
- Backend: `server/routes/appointments.routes.ts` (POST route)
- Service: `server/services/appointments.service.ts` (function `bookAppointment`)

---

## 4. Appointment Booking Flow Steps

### Step 1: Select Hospital
- User searches/filters hospitals by name, specialty, and city
- Hospitals display with status tags (Pending/Available)
- User clicks on a hospital card to select

### Step 2: Select Doctor
- Doctors are loaded for the selected hospital
- Doctors are grouped by specialty
- Each doctor card shows availability status (Available/Busy/Not Available)
- User clicks on a doctor card to select

### Step 3: Select Date & Time
- User selects appointment date (7-day calendar)
- Available time slots are displayed with color coding
- User selects a time slot

### Step 4: Confirm Appointment
- Appointment summary is displayed
- User selects priority using color-coded buttons:
  - **Normal** (Green)
  - **High** (Yellow)
  - **Urgent** (Red)
- User confirms and proceeds to payment

---

## 5. Data Flow

```
Patient selects hospital
  ↓
Load doctors for hospital
  ↓
Patient selects doctor
  ↓
Load available slots for doctor
  ↓
Patient selects date
  ↓
Fetch booked appointments for doctor + date
  ↓
Display slots with color coding (green/yellow/red)
  ↓
Patient selects time slot
  ↓
Patient confirms appointment with priority
  ↓
POST /api/appointments
  ↓
Create appointment record
  ↓
Show payment modal
  ↓
Complete booking
```

---

## 6. Status Update Flow

### Hospital Verification
1. Hospital admin creates hospital profile
2. Hospital appears with "Pending" status
3. System admin verifies hospital
4. `isVerified` is set to `true`
5. Hospital shows "Available" status

### Doctor Availability
1. Doctor sets `isAvailable` and `status` fields
2. Doctor configures `availableSlots`
3. Status is calculated based on these fields
4. Status is displayed on doctor card
5. Individual slot availability is calculated when date is selected

---

## 7. Edge Cases

### Hospital Status
- **New hospital**: Always shows "Pending" until verified
- **Unverified hospital**: Patients can still book (may need admin review)

### Doctor Status
- **No slots configured**: Shows "Not Available"
- **All slots booked**: Still shows "Available" (individual slots show red)
- **Doctor marked busy**: Shows "Busy" but can still accept bookings
- **Doctor marked out**: Shows "Not Available" and cannot accept bookings

### Priority Selection
- **Default**: "normal" (green)
- **User can change**: Click on color-coded buttons
- **API validation**: Accepts "normal", "high", "urgent"

---

## 8. API Response Format

### Success Response
```json
{
  "id": 123,
  "patientId": 1,
  "doctorId": 5,
  "hospitalId": 3,
  "appointmentDate": "2024-01-15",
  "appointmentTime": "14:00",
  "timeSlot": "14:00-14:30",
  "status": "pending",
  "priority": "normal",
  "reason": "consultation",
  "createdAt": "2024-01-10T10:00:00Z"
}
```

### Error Response
```json
{
  "message": "Missing required fields",
  "missingFields": ["doctorId", "appointmentDate"]
}
```

---

## 9. Testing Scenarios

### Hospital Status
1. ✅ New hospital shows "Pending"
2. ✅ Verified hospital shows "Available"
3. ✅ Unverified hospital still allows booking

### Doctor Availability
1. ✅ Doctor with slots shows "Available"
2. ✅ Doctor marked busy shows "Busy"
3. ✅ Doctor with no slots shows "Not Available"
4. ✅ Doctor marked out shows "Not Available"

### Priority Selection
1. ✅ Default priority is "normal" (green)
2. ✅ User can select "high" (yellow)
3. ✅ User can select "urgent" (red)
4. ✅ Priority is sent to API correctly

---

## 10. Future Enhancements

- [ ] Hospital approval workflow with admin dashboard
- [ ] Doctor availability calendar with leave management
- [ ] Priority-based scheduling algorithm
- [ ] Real-time slot availability updates
- [ ] Appointment reminders based on priority
