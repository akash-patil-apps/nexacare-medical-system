# Complete Testing Guide - Queue Management & IPD/ADT

## 🚀 Quick Start

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Server should be running at:** `http://localhost:3000`

3. **Test credentials:**
   - Receptionist: `9820000000` / `password123`
   - Hospital Admin: `9810000000` / `password123`
   - Doctor: `9830000000` / `password123`
   - Patient: `9840000000` / `password123`

---

## 📋 Testing Flow

### **PART 1: IPD/ADT Testing**

#### **Step 1: Login as Hospital Admin**
- **URL:** `POST http://localhost:3000/api/auth/login`
- **Body:**
  ```json
  {
    "mobileNumber": "9810000000",
    "password": "password123"
  }
  ```
- **Save the token** from response

#### **Step 2: Get Hospital ID**
- **URL:** `GET http://localhost:3000/api/hospitals/my`
- **Headers:** `Authorization: Bearer YOUR_TOKEN`
- **Note the `id`** from response

#### **Step 3: Create Floor (Optional)**
- **URL:** `POST http://localhost:3000/api/ipd/floors`
- **Headers:** `Authorization: Bearer YOUR_TOKEN`
- **Body:**
  ```json
  {
    "floorNumber": 1,
    "floorName": "First Floor",
    "description": "Main patient floor"
  }
  ```
- **Save the `id`** from response

#### **Step 4: Create Ward**
- **URL:** `POST http://localhost:3000/api/ipd/wards`
- **Headers:** `Authorization: Bearer YOUR_TOKEN`
- **Body:**
  ```json
  {
    "name": "General Ward",
    "type": "general",
    "genderPolicy": "mixed",
    "capacity": 20,
    "floorId": 1
  }
  ```
- **Save the `id`** (or `ward.id` if nested)

#### **Step 5: Create Room**
- **URL:** `POST http://localhost:3000/api/ipd/rooms`
- **Headers:** `Authorization: Bearer YOUR_TOKEN`
- **Body:**
  ```json
  {
    "wardId": YOUR_WARD_ID,
    "roomNumber": "101",
    "roomName": "General Room 101",
    "category": "general",
    "capacity": 2,
    "amenities": "[\"AC\", \"TV\"]"
  }
  ```
- **Save the `id`**

#### **Step 6: Create Beds**
- **URL:** `POST http://localhost:3000/api/ipd/beds`
- **Headers:** `Authorization: Bearer YOUR_TOKEN`
- **Body (Bed 1):**
  ```json
  {
    "roomId": YOUR_ROOM_ID,
    "bedNumber": "1",
    "bedName": "Bed A",
    "bedType": "standard",
    "equipment": "[\"Oxygen\"]"
  }
  ```
- **Body (Bed 2):**
  ```json
  {
    "roomId": YOUR_ROOM_ID,
    "bedNumber": "2",
    "bedName": "Bed B",
    "bedType": "standard"
  }
  ```
- **Save both bed IDs**

#### **Step 7: Get Complete Bed Structure**
- **URL:** `GET http://localhost:3000/api/ipd/structure`
- **Headers:** `Authorization: Bearer YOUR_TOKEN`
- **Expected:** JSON with floors, wards, rooms, beds hierarchy

#### **Step 8: Get Available Beds**
- **URL:** `GET http://localhost:3000/api/ipd/beds/available`
- **Headers:** `Authorization: Bearer YOUR_TOKEN`
- **Expected:** Array of available beds with full hierarchy

#### **Step 9: Login as Receptionist**
- **URL:** `POST http://localhost:3000/api/auth/login`
- **Body:**
  ```json
  {
    "mobileNumber": "9820000000",
    "password": "password123"
  }
  ```
- **Save the token**

#### **Step 10: Get Patient ID**
- **Option A:** Login as patient and get ID
- **Option B:** Use existing patient ID from database
- **URL:** `GET http://localhost:3000/api/patients/my` (as patient)
- **Or:** Use patient ID `1` for testing

#### **Step 11: Get Doctor ID**
- **URL:** `GET http://localhost:3000/api/doctors?hospitalId=YOUR_HOSPITAL_ID`
- **Headers:** `Authorization: Bearer YOUR_TOKEN`
- **Use first doctor's `id`**

#### **Step 12: Admit Patient**
- **URL:** `POST http://localhost:3000/api/ipd/encounters`
- **Headers:** `Authorization: Bearer RECEPTIONIST_TOKEN`
- **Body:**
  ```json
  {
    "patientId": 1,
    "admittingDoctorId": YOUR_DOCTOR_ID,
    "admissionType": "elective",
    "bedId": YOUR_BED1_ID
  }
  ```
- **Save the encounter `id`**
- **Verify:** Bed should now be occupied

#### **Step 13: Get IPD Encounters**
- **URL:** `GET http://localhost:3000/api/ipd/encounters`
- **Headers:** `Authorization: Bearer YOUR_TOKEN`
- **Expected:** Array with your encounter

#### **Step 14: Get Encounter Details**
- **URL:** `GET http://localhost:3000/api/ipd/encounters/YOUR_ENCOUNTER_ID`
- **Headers:** `Authorization: Bearer YOUR_TOKEN`
- **Expected:** Full encounter with patient, doctors, current bed

#### **Step 15: Transfer Patient**
- **URL:** `PATCH http://localhost:3000/api/ipd/encounters/YOUR_ENCOUNTER_ID/transfer`
- **Headers:** `Authorization: Bearer YOUR_TOKEN`
- **Body:**
  ```json
  {
    "newBedId": YOUR_BED2_ID,
    "reason": "Patient requested room change"
  }
  ```
- **Verify:** Old bed should be cleaning, new bed occupied

#### **Step 16: Discharge Patient**
- **URL:** `PATCH http://localhost:3000/api/ipd/encounters/YOUR_ENCOUNTER_ID/discharge`
- **Headers:** `Authorization: Bearer YOUR_TOKEN`
- **Body:**
  ```json
  {
    "dischargeSummaryText": "Patient recovered well. Discharged with medications."
  }
  ```
- **Verify:** Encounter status = "discharged", bed status = "cleaning"

#### **Step 17: Mark Bed as Cleaned**
- **URL:** `PATCH http://localhost:3000/api/ipd/beds/YOUR_BED2_ID/clean`
- **Headers:** `Authorization: Bearer YOUR_TOKEN`
- **Verify:** Bed status = "available"

#### **Step 18: Block/Unblock Bed**
- **URL:** `PATCH http://localhost:3000/api/ipd/beds/YOUR_BED_ID/status`
- **Headers:** `Authorization: Bearer YOUR_TOKEN`
- **Body (Block):**
  ```json
  {
    "status": "blocked",
    "blockedReason": "Maintenance required",
    "blockedUntil": "2025-02-01T00:00:00Z"
  }
  ```
- **Body (Unblock):**
  ```json
  {
    "status": "available"
  }
  ```

---

### **PART 2: Queue Management Testing**

#### **Step 19: Get Appointments (as Receptionist)**
- **URL:** `GET http://localhost:3000/api/appointments/my`
- **Headers:** `Authorization: Bearer RECEPTIONIST_TOKEN`
- **Find a confirmed appointment** (status = "confirmed")
- **Save the appointment `id` and `doctorId`**

#### **Step 20: Check-in to Queue**
- **URL:** `POST http://localhost:3000/api/opd-queue/check-in`
- **Headers:** `Authorization: Bearer RECEPTIONIST_TOKEN`
- **Body:**
  ```json
  {
    "appointmentId": YOUR_APPOINTMENT_ID
  }
  ```
- **Expected:** Queue entry with `tokenNumber` and `id`
- **Save:** `tokenNumber` and queue entry `id`

#### **Step 21: Get Queue for Doctor**
- **URL:** `GET http://localhost:3000/api/opd-queue/doctor/YOUR_DOCTOR_ID/date/2025-01-XX`
- **Headers:** `Authorization: Bearer YOUR_TOKEN`
- **Replace XX with today's date**
- **Expected:** Array of queue entries with patient info

#### **Step 22: Call Token**
- **URL:** `PATCH http://localhost:3000/api/opd-queue/YOUR_QUEUE_ENTRY_ID/call`
- **Headers:** `Authorization: Bearer RECEPTIONIST_TOKEN`
- **Expected:** Status = "called"

#### **Step 23: Login as Doctor**
- **URL:** `POST http://localhost:3000/api/auth/login`
- **Body:**
  ```json
  {
    "mobileNumber": "9830000000",
    "password": "password123"
  }
  ```
- **Save the token**

#### **Step 24: Start Consultation**
- **URL:** `PATCH http://localhost:3000/api/opd-queue/YOUR_QUEUE_ENTRY_ID/start`
- **Headers:** `Authorization: Bearer DOCTOR_TOKEN`
- **Expected:** Status = "in_consultation"
- **Verify:** Appointment status also updated

#### **Step 25: Complete Consultation**
- **URL:** `PATCH http://localhost:3000/api/opd-queue/YOUR_QUEUE_ENTRY_ID/complete`
- **Headers:** `Authorization: Bearer DOCTOR_TOKEN`
- **Expected:** Status = "completed"
- **Verify:** Appointment status = "completed"

#### **Step 26: Test Reorder Queue**
- **URL:** `PATCH http://localhost:3000/api/opd-queue/YOUR_QUEUE_ENTRY_ID/reorder`
- **Headers:** `Authorization: Bearer RECEPTIONIST_TOKEN`
- **Body:**
  ```json
  {
    "position": 2
  }
  ```
- **Expected:** Position updated

#### **Step 27: Test No-Show**
- **URL:** `PATCH http://localhost:3000/api/opd-queue/YOUR_QUEUE_ENTRY_ID/no-show`
- **Headers:** `Authorization: Bearer RECEPTIONIST_TOKEN`
- **Expected:** Status = "no_show"

#### **Step 28: Test Skip Token**
- **URL:** `PATCH http://localhost:3000/api/opd-queue/YOUR_QUEUE_ENTRY_ID/skip`
- **Headers:** `Authorization: Bearer RECEPTIONIST_TOKEN`
- **Expected:** Status = "waiting", position moved to end

---

## 🧪 Quick Test Checklist

### IPD/ADT Features
- [ ] Create floor
- [ ] Create ward
- [ ] Create room
- [ ] Create beds
- [ ] Get bed structure
- [ ] Get available beds
- [ ] Admit patient
- [ ] Get encounters
- [ ] Transfer patient
- [ ] Discharge patient
- [ ] Mark bed cleaned
- [ ] Block/unblock bed

### Queue Management Features
- [ ] Check-in to queue
- [ ] Get queue for doctor
- [ ] Call token
- [ ] Start consultation
- [ ] Complete consultation
- [ ] Reorder queue
- [ ] Mark no-show
- [ ] Skip token

---

## 🔍 Expected Results

### IPD Admission Flow
1. Bed status: `available` → `occupied`
2. Encounter created with status: `admitted`
3. Bed allocation created

### IPD Transfer Flow
1. Old bed: `occupied` → `cleaning`
2. New bed: `available` → `occupied`
3. Old allocation: `toAt` set
4. New allocation: created

### IPD Discharge Flow
1. Encounter status: `admitted` → `discharged`
2. Bed status: `occupied` → `cleaning`
3. Allocation: `toAt` set

### Queue Flow
1. Check-in: Creates queue entry, assigns token
2. Call: Status `waiting` → `called`
3. Start: Status `called` → `in_consultation`
4. Complete: Status `in_consultation` → `completed`

---

## 🛠️ Using Postman

1. **Import Collection:**
   - Create new collection "NexaCare Queue & IPD"
   - Add all endpoints above
   - Set base URL: `http://localhost:3000/api`

2. **Environment Variables:**
   - `base_url`: `http://localhost:3000/api`
   - `hospital_token`: (set after login)
   - `receptionist_token`: (set after login)
   - `doctor_token`: (set after login)
   - `hospital_id`: (set after getting hospital)
   - `ward_id`: (set after creating ward)
   - `room_id`: (set after creating room)
   - `bed1_id`: (set after creating bed)
   - `bed2_id`: (set after creating bed)
   - `encounter_id`: (set after admission)
   - `appointment_id`: (set from appointments)
   - `queue_entry_id`: (set after check-in)

3. **Test Scripts:**
   - Add to login requests: `pm.environment.set("token", pm.response.json().token)`
   - Add to create requests: Save IDs to environment

---

## 🌐 Browser Testing (Using DevTools)

1. **Open Browser Console** (F12)
2. **Login and get token:**
   ```javascript
   fetch('http://localhost:3000/api/auth/login', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       mobileNumber: '9810000000',
       password: 'password123'
     })
   })
   .then(r => r.json())
   .then(data => {
     window.token = data.token;
     console.log('Token:', window.token);
   });
   ```

3. **Test endpoints:**
   ```javascript
   // Get structure
   fetch('http://localhost:3000/api/ipd/structure', {
     headers: { 'Authorization': `Bearer ${window.token}` }
   })
   .then(r => r.json())
   .then(console.log);
   ```

---

## ✅ Success Criteria

### IPD/ADT
- ✅ Can create complete bed structure (floor → ward → room → bed)
- ✅ Can admit patient and bed becomes occupied
- ✅ Can transfer patient between beds
- ✅ Can discharge patient and bed goes to cleaning
- ✅ Can mark bed as cleaned and it becomes available
- ✅ Can block/unblock beds

### Queue Management
- ✅ Can check-in appointment and get token number
- ✅ Can view queue for doctor
- ✅ Can call token
- ✅ Can start consultation
- ✅ Can complete consultation
- ✅ Can reorder queue
- ✅ Can mark no-show
- ✅ Can skip token

---

## 🐛 Troubleshooting

**Issue: "Unauthorized"**
- Check token is valid
- Token might have expired, login again

**Issue: "Bed not found"**
- Verify bed ID exists
- Check bed is in correct hospital

**Issue: "Appointment already in queue"**
- Appointment can only be checked in once
- Use different appointment

**Issue: "Bed is not available"**
- Bed might be occupied/blocked
- Check bed status first

**Issue: "Column already exists"**
- Migration already applied
- Database is up to date

---

## 📊 Test Data Summary

After complete testing, you should have:
- 1+ Floor(s)
- 1+ Ward(s)
- 1+ Room(s)
- 2+ Bed(s)
- 1 IPD Encounter (admitted → transferred → discharged)
- 1+ Queue Entry (checked-in → called → in_consultation → completed)

---

**Ready to test! Start with Step 1 and work through sequentially.**





