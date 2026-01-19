# Complete Appointment Flow Testing Guide

## Prerequisites

1. **Run Database Migration:**
   ```bash
   npm run db:push
   ```
   This adds the `temp_token_number` column to the `appointments` table.

2. **Start the Application:**
   ```bash
   npm run dev
   ```

3. **Required Test Accounts:**
   - Patient account (role: `PATIENT`)
   - Receptionist account (role: `RECEPTIONIST`) - associated with Fortis Hospital
   - Doctor account (role: `DOCTOR`) - Dr. Sita, associated with Fortis Hospital
   - Lab Technician account (role: `LAB`)

## Complete Testing Flow

### Step 1: Patient Books Appointment

1. **Login as Patient**
   - Navigate to `/login`
   - Login with patient credentials

2. **Book Appointment**
   - Click "Book Appointment" or navigate to `/book-appointment`
   - Select **Fortis Hospital** from hospital list
   - Select **Dr. Sita** from doctor list
   - Select **Date** (today or future date)
   - Select **Time Slot**
   - Click "Continue" or "Book Appointment"

3. **Payment**
   - Select payment method: **Online**
   - Click "Pay Now"
   - Payment will be processed (demo mode)
   - Appointment status: **PENDING**

### Step 2: Receptionist Confirms Appointment

1. **Login as Receptionist**
   - Navigate to `/login`
   - Login with receptionist credentials (Fortis Hospital)

2. **Confirm Appointment**
   - Go to Receptionist Dashboard
   - Find the pending appointment in the appointments table
   - Click **"Confirm"** button (green checkmark icon)
   - **Expected Result:**
     - Appointment status changes to **CONFIRMED**
     - **Temporary token** is assigned (e.g., Temp Token: 1)
     - Patient and doctor receive notifications

### Step 3: Patient Arrives - Check-In

1. **Check-In Patient**
   - In Receptionist Dashboard, find the confirmed appointment
   - Click **"Check-In"** button (when patient physically arrives)
   - **Expected Result:**
     - Appointment status changes to **CHECKED-IN**
     - **Real token** is assigned (e.g., Real Token: 1)
     - Notes show: "Real Token: 1 (was Temp Token: 1)"
     - If patient is late, notes show: "Real Token: 1 (was Temp Token: 1) - Late arrival"

### Step 4: Receptionist Records Vitals (Optional)

1. **Record Vitals**
   - After check-in, click **"Record Vitals"** button (blue icon with ExperimentOutlined)
   - Fill in vitals form:
     - Temperature
     - Blood Pressure (Systolic/Diastolic)
     - Pulse
     - SpO2
     - Weight, Height (BMI auto-calculated)
   - Click "Save"
   - **Expected Result:**
     - Vitals saved successfully
     - Vitals visible to doctor

### Step 5: Receptionist Requests Lab Test (Optional)

1. **Request Lab Test**
   - After check-in, click **"Request Lab Test"** button (orange icon)
   - Fill in lab request form:
     - Patient: Auto-selected
     - Test Name: e.g., "Complete Blood Count (CBC)"
     - Priority: Normal/High/Urgent
     - Notes: Optional
   - Click "Request Test"
   - **Expected Result:**
     - Lab request created
     - Status: "recommended" or "pending"
     - Notes include: "Requested by: [Hospital Name]"
     - Request appears in Lab Dashboard

### Step 6: Doctor Sees Appointment

1. **Login as Doctor (Dr. Sita)**
   - Navigate to `/login`
   - Login with doctor credentials

2. **View Appointments**
   - Go to Doctor Dashboard
   - Check "Today" or "Upcoming" tab
   - **Expected Result:**
     - Appointment appears in dashboard
     - Shows patient name, time, status: **CHECKED-IN**
     - Shows token number (real token)
     - If vitals recorded, shows vitals data
     - If lab requested, shows lab request

### Step 7: Doctor Creates Prescription

1. **Create Prescription**
   - In Doctor Dashboard, find the checked-in appointment
   - Click on patient name or appointment row
   - Click **"Create Prescription"** or use prescription modal
   - Fill in prescription:
     - Medications
     - Dosage
     - Frequency
     - Duration
   - Click "Save Prescription"
   - **Expected Result:**
     - Prescription created successfully
     - Prescription visible to patient
     - Patient receives notification

### Step 8: Generate Invoice

1. **Create Invoice (Receptionist)**
   - In Receptionist Dashboard, find the checked-in appointment
   - **Note:** Invoice button only appears after check-in
   - Click **"Create Invoice"** button (green dollar icon)
   - Fill in invoice details:
     - Services: Consultation fee
     - Payment method: Online (already paid)
   - Click "Create Invoice"
   - **Expected Result:**
     - Invoice created
     - Shows correct:
       - Patient info (name, ID, mobile)
       - Doctor info (name, specialty)
       - Payment info (amount, method, transaction ID)
       - Timestamp (invoice creation time)
     - Invoice status: **PAID** (if online payment)

### Step 9: Lab Results (If Lab Test Requested)

1. **Lab Technician Processes Test**
   - Login as Lab Technician
   - Find the lab request (should show sender as hospital name)
   - Enter test results
   - Release report

2. **Patient Receives Results**
   - Login as Patient
   - Go to "Lab Results" section
   - **Expected Result:**
     - Lab results visible
     - Patient receives notification
     - Results linked to prescription (if applicable)

### Step 10: Medicine Reminders

1. **Check Notifications**
   - Login as Patient
   - Check notifications
   - **Expected Result:**
     - Medicine reminders appear
     - Reminders based on prescription schedule
     - Notifications for:
       - Appointment confirmations
       - Check-in confirmations
       - Lab results
       - Prescription updates
       - Medicine reminders

## Key Features to Verify

### ✅ Token System
- [ ] Temporary token assigned on confirmation
- [ ] Real token assigned on check-in
- [ ] Late patient handling (token reassignment)
- [ ] Token numbers displayed correctly

### ✅ Invoice Creation
- [ ] Invoice button only shows after check-in
- [ ] Invoice shows correct patient info
- [ ] Invoice shows correct doctor info
- [ ] Invoice shows correct payment info
- [ ] Invoice shows correct timestamp

### ✅ Receptionist Features
- [ ] Vitals recording button appears after check-in
- [ ] Lab request button appears after check-in
- [ ] Vitals saved successfully
- [ ] Lab request created with hospital name as sender

### ✅ Doctor Features
- [ ] Appointment appears in doctor dashboard after confirmation
- [ ] Prescription creation works
- [ ] Prescription data saved correctly

### ✅ Lab Flow
- [ ] Lab request shows hospital name as sender
- [ ] Lab results sent to patient
- [ ] Patient receives notifications

### ✅ Notifications & Reminders
- [ ] Patient receives appointment confirmation
- [ ] Patient receives check-in confirmation
- [ ] Patient receives prescription notifications
- [ ] Patient receives lab result notifications
- [ ] Medicine reminders work correctly

## Troubleshooting

### Issue: Temporary token not assigned
- **Solution:** Run `npm run db:push` to add `temp_token_number` column

### Issue: Invoice button not showing
- **Check:** Appointment must be in `checked-in`, `attended`, `in_consultation`, or `completed` status

### Issue: Lab request doesn't show hospital name
- **Check:** Receptionist must be logged in and associated with a hospital
- **Check:** Backend route should include hospital name in notes

### Issue: Vitals/Lab buttons not showing
- **Check:** Appointment must be checked-in first
- **Check:** Patient ID must be available in appointment record
