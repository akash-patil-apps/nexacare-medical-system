# Multi-Role Testing Guide - NexaCare Medical System

## 🎯 Purpose
This guide helps you test the complete appointment booking workflow across multiple user roles simultaneously. You'll be able to see how appointments created by one role appear in other roles' dashboards in real-time.

---

## 🚀 Quick Setup

### Step 1: Start the Development Server
```bash
cd /Users/akashpatil/Desktop/devspace/nexus/nexacare-medical-system
npm run dev
```

### Step 2: Open Multiple Browser Windows/Tabs
You'll need **4-5 browser windows/tabs** to test all roles simultaneously:

**Option A: Multiple Browser Windows (Recommended)**
- Open 4-5 separate browser windows (not tabs)
- Each window will be logged in as a different role
- This makes it easier to see all dashboards side-by-side

**Option B: Incognito/Private Windows**
- Open regular window for Patient
- Open incognito window for Doctor
- Open another incognito window for Receptionist
- Open another incognito window for Hospital Admin

**Option C: Different Browsers**
- Chrome for Patient
- Firefox for Doctor
- Safari for Receptionist
- Edge for Hospital Admin

---

## 🔑 Test Credentials

### Recommended Test Users (All use password: `password123`)

| Role | Mobile Number | Name | Notes |
|------|---------------|------|-------|
| **Patient** | `9833402458` | Pooja Singh | **RECOMMENDED** - Main test patient |
| **Doctor** | `9820000000` | Dr. Kavita Gaikwad | Works at Hospital ID 1 |
| **Receptionist** | `9850000000` | Rajesh Gaikwad | Works at Hospital ID 1 |
| **Hospital Admin** | `9810000000` | Hospital Admin 1 | Manages Hospital ID 1 |

### Alternative Test Users

If the above users don't work, try these sequential numbers:

| Role | Mobile Number Range | Password |
|------|---------------------|----------|
| **Patient** | `9830000000` - `9830000099` | `patient123` |
| **Doctor** | `9820000000` - `9820000039` | `doctor123` |
| **Receptionist** | `9850000000` - `9850000019` | `receptionist123` |
| **Hospital** | `9810000000` - `9810000014` | `hospital123` |

**Note**: See `docs/USER_CREDENTIALS.md` for the complete list of 186+ users.

---

## 📋 Step-by-Step Testing Workflow

### Phase 1: Login All Roles

1. **Window 1 - Patient Login**
   - Go to: `http://localhost:3000/login`
   - Login as: `9833402458` / `password123`
   - You should see the Patient Dashboard
   - Navigate to: "Book Appointment" or `/book-appointment`

2. **Window 2 - Doctor Login**
   - Go to: `http://localhost:3000/login`
   - Login as: `9820000000` / `doctor123`
   - You should see the Doctor Dashboard
   - Keep the dashboard open to see appointments appear

3. **Window 3 - Receptionist Login**
   - Go to: `http://localhost:3000/login`
   - Login as: `9850000000` / `receptionist123`
   - You should see the Receptionist Dashboard
   - Keep the dashboard open to see appointments appear

4. **Window 4 - Hospital Admin Login**
   - Go to: `http://localhost:3000/login`
   - Login as: `9810000000` / `hospital123`
   - You should see the Hospital Dashboard
   - Keep the dashboard open to see appointments appear

### Phase 2: Book Appointment as Patient

In **Window 1 (Patient)**:

1. Click "Book Appointment" button or navigate to `/book-appointment`
2. **Step 1: Select Hospital**
   - Select a city (e.g., "Mumbai")
   - Search for a hospital (e.g., "Apollo Hospital")
   - Click on a hospital card to select it
   - System auto-advances to Step 2

3. **Step 2: Select Doctor**
   - View the list of doctors from the selected hospital
   - Click on a doctor card to select them
   - System auto-advances to Step 3

4. **Step 3: Select Date & Time**
   - Select today or tomorrow
   - Choose an available time slot
   - System auto-advances to Step 4

5. **Step 4: Confirm Appointment**
   - Review all appointment details
   - Click "🏥 Book Appointment" button
   - You should see a success message
   - You're redirected to `/appointments`

### Phase 3: Verify Appointment in Other Roles

After booking, **refresh the dashboards** in other windows to see the new appointment:

1. **Window 2 (Doctor)**
   - Refresh the page or navigate to "Appointments" in sidebar
   - You should see the newly booked appointment in the appointments list
   - The appointment status should be "PENDING"

2. **Window 3 (Receptionist)**
   - Refresh the page
   - You should see the newly booked appointment in the appointments table
   - The appointment should show patient name, doctor name, time, and status

3. **Window 4 (Hospital Admin)**
   - Refresh the page
   - You should see the newly booked appointment in "Today's Appointments" section
   - The appointment should show patient, doctor, time, and status

### Phase 4: Test Appointment Status Updates

1. **As Receptionist** (Window 3):
   - Find the appointment in the table
   - Click "Confirm" or update status (if buttons are available)
   - The appointment status should change to "CONFIRMED"

2. **As Doctor** (Window 2):
   - Refresh the page
   - The appointment status should now show "CONFIRMED"
   - You can view patient details and prepare for consultation

3. **As Patient** (Window 1):
   - Refresh the appointments page
   - The appointment status should update to "CONFIRMED"
   - You should see the updated status in your appointments list

---

## 🔄 Real-Time Updates

### Current Behavior
- **Appointments are stored in the database immediately** when booked
- **Other roles need to refresh** their dashboards to see new appointments
- **Status changes are reflected** after refresh

### Future Enhancement (Not Yet Implemented)
- Real-time WebSocket updates (coming soon)
- Automatic dashboard refresh when appointments change
- Push notifications for appointment status changes

---

## 🐛 Troubleshooting

### Issue: "Appointment not appearing in other roles"

**Solution:**
1. Make sure all users are logged in to the **same hospital**
   - Patient books appointment at Hospital ID 1
   - Doctor works at Hospital ID 1
   - Receptionist works at Hospital ID 1
   - Hospital Admin manages Hospital ID 1

2. **Refresh the dashboards** after booking
   - Click refresh button or press F5
   - Or navigate away and back to the appointments page

3. **Check browser console** for errors
   - Open DevTools (F12)
   - Check Console tab for API errors
   - Check Network tab for failed API calls

### Issue: "Cannot login with credentials"

**Solution:**
1. Try alternative credentials from the table above
2. Check `docs/USER_CREDENTIALS.md` for complete list
3. Make sure you're using the correct password format
4. Try clearing browser cache and cookies

### Issue: "Appointment booking fails"

**Solution:**
1. Check that you've completed all steps (Hospital, Doctor, Date/Time)
2. Make sure the selected date is today or tomorrow
3. Verify the time slot is available
4. Check browser console for error messages
5. Check server logs for backend errors

### Issue: "Dashboard shows no appointments"

**Solution:**
1. Make sure you're logged in as the correct role
2. Verify the user is associated with the correct hospital/doctor
3. Check that appointments exist in the database
4. Try refreshing the page
5. Check API response in Network tab

---

## 📊 Expected Results

### Patient Dashboard
- ✅ Shows all appointments booked by this patient
- ✅ Shows appointment details: Doctor, Hospital, Date, Time, Status
- ✅ Status updates when appointment is confirmed/cancelled

### Doctor Dashboard
- ✅ Shows all appointments assigned to this doctor
- ✅ Shows patient name, appointment time, status
- ✅ Can view appointment details and patient information

### Receptionist Dashboard
- ✅ Shows all appointments for the hospital
- ✅ Shows patient name, doctor name, time, status
- ✅ Can confirm/update appointment status

### Hospital Admin Dashboard
- ✅ Shows all appointments for the hospital
- ✅ Shows patient, doctor, time, status in table
- ✅ Can see appointment statistics and analytics

---

## 🎯 Testing Checklist

### Pre-Testing
- [ ] Development server is running (`npm run dev`)
- [ ] Database is connected and accessible
- [ ] Test users exist in database
- [ ] Multiple browser windows/tabs are open

### During Testing
- [ ] Patient can book appointment successfully
- [ ] Appointment appears in Doctor dashboard after refresh
- [ ] Appointment appears in Receptionist dashboard after refresh
- [ ] Appointment appears in Hospital Admin dashboard after refresh
- [ ] Appointment details are correct in all dashboards
- [ ] Status updates reflect in all roles after refresh

### Post-Testing
- [ ] All appointments are stored in database
- [ ] No errors in browser console
- [ ] No errors in server logs
- [ ] All dashboards load correctly

---

## 📝 Notes

1. **Same Hospital Requirement**: All test users must be associated with the same hospital for appointments to appear across roles.

2. **Refresh Required**: Currently, dashboards need manual refresh to see new appointments. This is expected behavior until real-time updates are implemented.

3. **Database State**: All appointments are stored in PostgreSQL database. You can verify by checking the `appointments` table directly.

4. **API Endpoints**: 
   - Book appointment: `POST /api/appointments`
   - Get appointments: `GET /api/appointments/my`
   - Update status: `PATCH /api/appointments/:id/status`

---

## 🚀 Next Steps

After completing this testing workflow:

1. **Test Status Updates**: Try confirming/cancelling appointments from different roles
2. **Test Multiple Appointments**: Book several appointments and verify they all appear
3. **Test Filtering**: Try filtering appointments by status, date, etc.
4. **Test Edge Cases**: 
   - Book appointment for past date (should fail)
   - Book appointment with unavailable doctor
   - Try booking when slots are full

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review browser console for errors
3. Check server logs for backend errors
4. Verify database connection and data
5. Refer to `docs/PROJECT_LOG.md` for recent changes

---

**Last Updated**: September 28, 2024
**Status**: ✅ All dashboards now use real API data
**Next Enhancement**: Real-time WebSocket updates

