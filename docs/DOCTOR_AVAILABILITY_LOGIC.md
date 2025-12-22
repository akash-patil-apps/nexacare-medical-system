# Doctor Availability Logic

## Overview
This document explains how doctor availability status is determined in the appointment booking flow.

## Current Implementation (Updated)

### Status Types on Doctor Card
1. **Available** (Green) - Doctor has available slots (even if some time ranges are unavailable)
2. **Busy** (Yellow) - Doctor manually marked as busy but has slots
3. **Not Available** (Red) - Doctor is unavailable for ENTIRE day (isAvailable=false OR status='out' OR no slots)

### Slot-Level Availability (Color Coding)
When user selects a doctor and date, individual time slots show:
1. **Green** - ≤2 bookings (3+ slots available out of 5 max)
2. **Yellow** - 3-4 bookings (1-2 slots available out of 5 max)
3. **Red** - 5 bookings (Fully booked, 0 slots available)

**Slot Limit**: Each 30-minute slot can have maximum 5 patients.

### Logic Flow

#### Doctor Card Status (`getDoctorAvailabilityStatus()`)
Determines the overall status shown on doctor cards:

1. **Global Availability Check**:
   - If `isAvailable = false` OR `status = 'out'` → **Not Available**
   - This handles: Doctor not available for entire day

2. **Slots Check**:
   - If `availableSlots` is empty → **Not Available**
   - This handles: Doctor has no time slots configured

3. **Status Field Check**:
   - If `status = 'busy'` → **Busy**
   - This handles: Doctor manually marked as busy

4. **Default**:
   - If doctor has slots → **Available** (even if some time ranges are unavailable)
   - Individual slot availability is shown when user selects date

#### Slot-Level Availability (`getSlotAvailabilityColor()`)
When user selects a date, fetches booked appointments and colors each slot:

1. **Fetch Booked Appointments**: 
   - API: `/api/appointments/doctor/:doctorId/date/:date`
   - Counts bookings per slot (excluding cancelled)

2. **Color Logic**:
   - **Green**: `bookings ≤ 2` (3+ available out of 5)
   - **Yellow**: `bookings = 3-4` (1-2 available out of 5)
   - **Red**: `bookings = 5` (0 available, fully booked, disabled)

## Scenarios

### Scenario 1: Doctor Unavailable for Time Range (2pm-4pm), Patient at 3pm
- **Doctor slots**: 10:00-14:00, 17:00-18:00 (available 10am-2pm and 5pm-6pm)
- **Doctor unavailable**: 14:00-17:00 (2pm-5pm) - not in `availableSlots`
- **Patient at**: 15:00 (3pm)
- **Doctor Card Status**: ✅ **Available** (has other slots)
- **When patient clicks doctor and selects date**:
  - Slots 10:00-14:00: **Green** (if ≤2 bookings)
  - Slots 14:00-17:00: **Not shown** (not in availableSlots)
  - Slots 17:00-18:00: **Green** (if ≤2 bookings)

### Scenario 2: Doctor Has Slots, Some Fully Booked
- **Doctor slots**: 10:00-17:00 (all slots in availableSlots)
- **Bookings**: 14:00-14:30 has 5 bookings, 14:30-15:00 has 3 bookings
- **Doctor Card Status**: ✅ **Available**
- **When patient selects date**:
  - 14:00-14:30: **Red** (5/5 booked, disabled)
  - 14:30-15:00: **Yellow** (3/5 booked, 2 available)
  - Other slots: **Green** (if ≤2 bookings)

### Scenario 3: Doctor Not Available Entire Day
- **Doctor**: `isAvailable = false` OR `status = 'out'` OR `availableSlots = []`
- **Doctor Card Status**: ❌ **Not Available**
- **Patient cannot select this doctor**

## Implementation Details

### API Endpoint
**GET** `/api/appointments/doctor/:doctorId/date/:date`
- Returns appointments for a specific doctor on a specific date
- Includes all statuses except 'cancelled'
- Used to count bookings per slot

### Frontend Flow
1. **Doctor Selection**: User clicks on doctor card
   - Shows status: Available/Busy/Not Available
   - Auto-advances to date selection

2. **Date Selection**: User selects a date
   - Fetches booked appointments: `fetchBookedAppointments(doctorId, date)`
   - Counts bookings per slot: `{ "14:00-14:30": 3, "14:30-15:00": 5 }`
   - Updates `slotBookings` state

3. **Slot Display**: Shows all slots from `availableSlots` with color coding
   - Green: ≤2 bookings (3+ available)
   - Yellow: 3-4 bookings (1-2 available)
   - Red: 5 bookings (fully booked, disabled)

### Slot Limit Enforcement
- **Maximum**: 5 patients per 30-minute slot
- **Enforcement**: Backend should validate before booking
- **Display**: Frontend shows availability count and disables fully booked slots

## Data Structure

### Doctor Object
```typescript
interface Doctor {
  id: number;
  isAvailable: boolean;        // Global availability flag
  status: 'in' | 'out' | 'busy'; // Current status
  availableSlots: string;      // JSON array or comma-separated: ["10:00-10:30", "10:30-11:00", ...]
  // ... other fields
}
```

### Slot Format
- Format: `"HH:MM-HH:MM"` (e.g., "14:00-14:30")
- Can be stored as:
  - JSON array: `["10:00-10:30", "10:30-11:00"]`
  - Comma-separated: `"10:00-10:30,10:30-11:00"`

## Future Improvements

1. **Real-time Availability**: Check actual bookings when date is selected
2. **Slot Filtering**: Filter out booked slots from available slots display
3. **Dynamic Status**: Update status when user selects date/time
4. **Backend API**: Create endpoint to get available slots for doctor + date
5. **Conflict Prevention**: Prevent double-booking at booking time

