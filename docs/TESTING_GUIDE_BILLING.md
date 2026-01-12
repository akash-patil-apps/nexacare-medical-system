# Manual Testing Guide - OPD Billing & Payments

## Prerequisites
1. **Login as Receptionist** - You need a receptionist account
2. **Have at least one confirmed appointment** - The appointment should be in "confirmed", "checked-in", or "attended" status
3. **Ensure hospital ID is set** - The receptionist should be associated with a hospital

## Test Scenario 1: Create Invoice

### Steps:
1. **Navigate to Receptionist Dashboard**
   - Login with receptionist credentials
   - You should see the "Appointments" tab

2. **Find a Confirmed Appointment**
   - Look for an appointment with status: "confirmed", "checked-in", or "attended"
   - The appointment should NOT already have an invoice (payment status should show "Unbilled")

3. **Click Create Invoice Button**
   - In the "Actions" column, look for a green dollar button (💰)
   - Tooltip should say "Create invoice"
   - Click the button

4. **Fill Invoice Form**
   - **Consultation Fee**: Should auto-populate from doctor's fee (or default ₹500)
   - **Registration Fee** (Optional): Add if needed (e.g., ₹50)
   - **Discount** (Optional):
     - Select discount type: "Fixed Amount" or "Percentage"
     - Enter discount amount
     - Add discount reason (required if discount > 0)
   - **Tax Amount** (Optional): Add if applicable
   - Review the **Total** at the bottom

5. **Submit Invoice**
   - Click "Create Invoice" button
   - You should see a success message: "Invoice created successfully"
   - Modal should close

6. **Verify Invoice Created**
   - Check the appointment row
   - Payment status should change from "Unbilled" to "Unpaid" (orange tag)
   - A new "View Invoice" button (document icon) should appear
   - The green "Create Invoice" button should disappear

### Expected Results:
- ✅ Invoice created with unique invoice number (format: HOSP-YYYY-000001)
- ✅ Payment status updated to "Unpaid"
- ✅ Invoice visible in database (`invoices` table)
- ✅ Invoice items created (`invoice_items` table)

---

## Test Scenario 2: Record Payment

### Steps:
1. **Find an Unpaid Invoice**
   - Look for an appointment with "Unpaid" payment status
   - An orange dollar button (💰) should be visible in Actions column

2. **Click Record Payment Button**
   - Click the orange dollar button
   - Tooltip should say "Record payment"
   - Payment modal should open

3. **Fill Payment Details**
   - **Payment Method**: Select from dropdown
     - Cash
     - Card
     - UPI
     - Online
   - **Payment Amount**: 
     - Should default to full balance
     - Can be adjusted for partial payment
     - Cannot exceed balance amount
   - **Reference** (Optional): 
     - Transaction ID for UPI/Card
     - Receipt number for cash
   - **Notes** (Optional): Additional payment notes

4. **Submit Payment**
   - Click "Record Payment" button
   - You should see: "Payment recorded successfully"
   - Modal should close

5. **Verify Payment Recorded**
   - Check the appointment row
   - If full payment: Status should change to "Paid" (green tag)
   - If partial payment: Status should change to "Partial" (gold tag)
   - Balance should be updated

### Expected Results:
- ✅ Payment record created in `payments` table
- ✅ Invoice `paidAmount` updated
- ✅ Invoice `balanceAmount` updated
- ✅ Invoice status updated (paid/partially_paid)
- ✅ Payment status tag updated in UI

---

## Test Scenario 3: Partial Payment

### Steps:
1. **Create Invoice** (if not already created)
   - Follow Test Scenario 1

2. **Record Partial Payment**
   - Click "Record Payment" button
   - Enter amount LESS than total (e.g., if total is ₹500, pay ₹200)
   - Select payment method
   - Submit

3. **Verify Partial Payment**
   - Payment status should show "Partial" (gold tag)
   - Balance should show remaining amount
   - "Record Payment" button should still be visible

4. **Record Remaining Payment**
   - Click "Record Payment" again
   - Pay the remaining balance
   - Status should change to "Paid" (green tag)

### Expected Results:
- ✅ Multiple payment records created
- ✅ Invoice status: "partially_paid" → "paid"
- ✅ Balance decreases with each payment

---

## Test Scenario 4: View Invoice

### Steps:
1. **Find Appointment with Invoice**
   - Any appointment with an invoice (paid or unpaid)

2. **Click View Invoice Button**
   - Look for document icon (📄) in Actions column
   - Click the button
   - Invoice should open in new tab/window

3. **Verify Invoice Details**
   - Invoice number
   - Patient name
   - Doctor name
   - Invoice items
   - Subtotal, discount, tax, total
   - Payment history (if any)

### Expected Results:
- ✅ Invoice details displayed correctly
- ✅ All items listed
- ✅ Calculations correct
- ✅ Payment history shown

---

## Test Scenario 5: Discount Application

### Steps:
1. **Create Invoice with Discount**
   - Click "Create Invoice"
   - Add consultation fee (e.g., ₹500)
   - Select discount type: "Percentage"
   - Enter discount: 10%
   - Add reason: "Senior citizen discount"
   - Submit

2. **Verify Discount Applied**
   - Subtotal: ₹500
   - Discount: ₹50 (10% of ₹500)
   - Total: ₹450
   - Discount reason saved

### Expected Results:
- ✅ Discount calculated correctly (amount or percentage)
- ✅ Total updated after discount
- ✅ Discount reason stored
- ✅ Invoice shows discount details

---

## Test Scenario 6: Multiple Items Invoice

### Steps:
1. **Create Invoice with Multiple Items**
   - Click "Create Invoice"
   - Consultation fee: Auto-populated
   - Add registration fee: ₹50
   - Review items table showing both items
   - Submit

2. **Verify Multiple Items**
   - Invoice should show:
     - Consultation fee: ₹500
     - Registration fee: ₹50
     - Total: ₹550

### Expected Results:
- ✅ All items listed in invoice
- ✅ Quantities correct
- ✅ Total calculated correctly

---

## Test Scenario 7: Error Handling

### Test Cases:

1. **Try to create duplicate invoice**
   - Create invoice for an appointment
   - Try to create another invoice for same appointment
   - **Expected**: Error message "Invoice already exists for this appointment"

2. **Try to pay more than balance**
   - Create invoice for ₹500
   - Try to record payment of ₹600
   - **Expected**: Warning "Payment amount cannot exceed balance"

3. **Try to create invoice for pending appointment**
   - Find appointment with "pending" status
   - **Expected**: "Create Invoice" button should NOT be visible

---

## Database Verification

### Check Invoice Created:
```sql
SELECT * FROM invoices WHERE appointment_id = <appointment_id>;
```

### Check Invoice Items:
```sql
SELECT * FROM invoice_items WHERE invoice_id = <invoice_id>;
```

### Check Payments:
```sql
SELECT * FROM payments WHERE invoice_id = <invoice_id>;
```

### Check Audit Logs:
```sql
SELECT * FROM patient_audit_logs 
WHERE entity_type = 'invoice' 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## UI Verification Checklist

- [ ] "Create Invoice" button appears for confirmed/checked-in/attended appointments
- [ ] "Create Invoice" button disappears after invoice is created
- [ ] Payment status tag updates correctly (Unbilled → Unpaid → Partial/Paid)
- [ ] "Record Payment" button appears when invoice has balance
- [ ] "Record Payment" button disappears when fully paid
- [ ] "View Invoice" button appears when invoice exists
- [ ] Invoice modal shows correct doctor fee
- [ ] Discount calculation works (amount and percentage)
- [ ] Total calculation is correct
- [ ] Payment modal shows correct balance
- [ ] Payment amount cannot exceed balance
- [ ] Success messages appear after actions
- [ ] Data refreshes automatically after actions

---

## Common Issues & Troubleshooting

### Issue: "Create Invoice" button not showing
- **Check**: Appointment status must be "confirmed", "checked-in", or "attended"
- **Check**: Invoice should not already exist for this appointment

### Issue: Payment status not updating
- **Check**: Browser console for errors
- **Check**: Network tab to verify API calls succeeded
- **Refresh**: Manually refresh the page

### Issue: Invoice number not generating
- **Check**: Hospital ID is set correctly
- **Check**: Database connection
- **Check**: Server logs for errors

### Issue: Discount not calculating
- **Check**: Discount type is selected
- **Check**: Discount amount is entered
- **Check**: Percentage discount is between 0-100

---

## Test Data Setup

### Create Test Appointment:
1. Login as patient or use walk-in booking
2. Book appointment with a doctor
3. Login as receptionist
4. Confirm the appointment
5. Check-in the patient (optional)

### Expected Test Flow:
1. Appointment created → Status: "pending"
2. Receptionist confirms → Status: "confirmed"
3. Patient arrives → Check-in → Status: "checked-in"
4. Create invoice → Payment status: "Unpaid"
5. Record payment → Payment status: "Paid"

---

## Notes

- **Invoice Numbering**: Format is `HOSP-YYYY-000001` (increments per hospital per year)
- **One Invoice Per Appointment**: v1 supports only one invoice per appointment
- **Payment Methods**: Cash, Card, UPI, Online
- **Audit Logging**: All actions are logged in `patient_audit_logs` table
- **Real-time Updates**: Appointments refresh every 3 seconds

---

## Success Criteria

✅ All test scenarios pass
✅ No console errors
✅ Database records created correctly
✅ UI updates reflect database changes
✅ Payment calculations are accurate
✅ Error handling works as expected






