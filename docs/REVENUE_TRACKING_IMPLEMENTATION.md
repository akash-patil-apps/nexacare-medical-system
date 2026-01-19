# Revenue Tracking Implementation

## Overview
This document describes the revenue tracking system that captures all payments (online appointments, IPD, OPD) and displays them in the hospital dashboard and detailed revenue page.

## Implementation Details

### 1. Backend Services

**File: `server/services/revenue.service.ts`**
- `getRevenueStats()` - Calculates daily, weekly, monthly, and total revenue
- `getRevenueTransactions()` - Gets detailed transaction list with filters
- `getRevenueBySource()` - Groups revenue by source (appointment, IPD, OPD)
- `getRevenueByPaymentMethod()` - Groups revenue by payment method (online, cash, card, UPI, etc.)

### 2. API Routes

**File: `server/routes/revenue.routes.ts`**
- `GET /api/revenue/stats` - Get revenue statistics
- `GET /api/revenue/transactions` - Get detailed transactions with filters
- `GET /api/revenue/by-source` - Get revenue breakdown by source
- `GET /api/revenue/by-method` - Get revenue breakdown by payment method

### 3. Frontend Pages

**File: `client/src/pages/revenue/revenue-details.tsx`**
- Comprehensive revenue dashboard with:
  - Revenue statistics (daily, weekly, monthly, total)
  - Revenue breakdown by source (Appointments, IPD, OPD)
  - Revenue breakdown by payment method
  - Detailed transactions table with filters
  - Date range filtering
  - Search functionality

### 4. Payment Tracking

All payments are tracked through the `payments` table which is linked to `invoices`. The system tracks:
- **Appointment Payments**: When a patient books and pays online, the payment is recorded with `invoice.appointmentId`
- **IPD Payments**: Payments for IPD encounters are recorded with `invoice.encounterId`
- **OPD Payments**: Other OPD payments are recorded without appointment/encounter IDs

### 5. Revenue Calculation

The revenue calculation includes:
- All payments from the `payments` table
- Filtered by hospital ID (from invoices)
- Uses `receivedAt` timestamp if available, otherwise `createdAt`
- Properly handles IST timezone for daily/weekly/monthly calculations

## Next Steps

1. Update `client/src/pages/dashboards/hospital-dashboard.tsx` to use `/api/revenue/stats` instead of `/api/hospitals/stats`
2. Add route in `client/src/App.tsx` for `/revenue` page
3. Add navigation link in hospital dashboard sidebar to Revenue page
4. Test with actual payment data
