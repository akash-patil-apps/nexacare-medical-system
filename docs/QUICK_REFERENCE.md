# NexaCare Medical System - Quick Reference

## 🚀 **Start Development**
```bash
# Navigate to project
cd /Users/akashpatil/Desktop/devspace/nexus/nexacare-medical-system

# Create new branch for work
git checkout main
git pull origin main
git checkout -b feature/[feature-name]

# Start development server
npm run dev
```
- Main App: http://localhost:3000
- Frontend Dev: http://localhost:5173
- Backend API: http://localhost:3000/api

## 🌿 **Git Workflow (CRITICAL)**
```bash
# ALWAYS create new branch when starting work
git checkout main && git pull origin main
git checkout -b feature/appointment-management

# Regular commits
git add . && git commit -m "Add: appointment booking feature"

# Push to branch
git push origin feature/appointment-management
```

## 📁 **Key Files**
- `PROJECT_LOG.md` - Complete project history & progress
- `DAILY_WORKFLOW.md` - Daily development guide
- `CHANGELOG.md` - Recent changes
- `server/services/` - Backend business logic
- `client/src/pages/` - Frontend pages
- `client/src/components/` - Reusable UI components

## 🎯 **Current Status (November 9, 2025)**
- ✅ Multi-role appointment workflow (pending → confirmed → completed) live across dashboards.
- ✅ Patient dashboard redesigned with new reusable components, live prescriptions, timeline, notifications.
- ✅ Doctor dashboard refreshed: sticky sidebar, KPI alignment, prescription workflow with unattended patient filter.
- ✅ Appointment booking flow polished (filters, cards, date/time selections, confirmation card).
- ✅ Backend prescription/lab/notification endpoints stable (`condition is not a function` resolved).
- ⚙️ Dashboard style guide, patient spec, and implementation docs published for all roles.
- ⏳ Hospital Admin, Receptionist, and Lab dashboards pending migration to new design system.

## 🔑 **Demo Credentials (300+ Users Available)**
- **Patient**: `9830000000` / `password123` (Meera Jain)
- **Doctor**: `9820000000` / `password123` (Dr. Kavita Gaikwad)
- **Hospital**: `9810000000` / `password123` (Hospital Admin 1)
- **Lab**: `9840000000` / `password123` (Lab Admin 1)
- **Receptionist**: `9850000000` / `password123` (Rajesh Gaikwad)
- **Nurse**: `9860000000` / `password123` (Priya Sharma)
- **Pharmacist**: `9870000000` / `password123` (Priya Patel)
- **Radiology Technician**: `9880000000` / `password123` (Raj Kumar)
- **Admin**: `9876543210` / `password123` (System Administrator)

**Note**: All users have sequential mobile numbers for easy testing:
- Hospitals: `9810000000` to `9810000014` (15 users)
- Doctors: `9820000000` to `9820000039` (40 users)
- Patients: `9830000000` to `9830000099` (100 users)
- Labs: `9840000000` to `9840000009` (10 users)
- Receptionists: `9850000000` to `9850000019` (20 users)
- Nurses: `9860000000` to `9860000019` (20 users)
- Pharmacists: `9870000000` to `9870000019` (20 users)
- Radiology Technicians: `9880000000` to `9880000019` (20 users)

## 🔥 **Next Priority Tasks**
See `docs/PROJECT_PLAN.md` for comprehensive development plan.

**Immediate Priorities (Week 1)**:
1. Apply responsive design to Doctor, Receptionist, Hospital Admin, and Lab dashboards
2. Extend notification widgets across all dashboards
3. Complete lab report upload workflow

**Full Plan**: See `docs/PROJECT_PLAN.md` for detailed phases, timelines, and implementation notes.

## 📱 **Test URLs**
- Main App: `http://localhost:3000/`
- Login: `http://localhost:3000/login`
- Register: `http://localhost:3000/register`
- Test Page: `http://localhost:3000/test`

## 🧪 **Demo Setup & Features**

### **What Works in This Demo**
- ✅ **User Registration** with OTP verification
- ✅ **Login** with both password and OTP
- ✅ **Real PostgreSQL Database** (Neon cloud)
- ✅ **Local SMS Service** (displays OTP in console and UI)
- ✅ **Authentication** with JWT tokens
- ✅ **Role-based Access Control**
- ✅ **Modern UI** with Ant Design framework
- ✅ **Professional medical theme** with custom styling
- ✅ **Complete Prescription System** with detailed medication management
- ✅ **Doctor-Patient Prescription Flow** working end-to-end

### **Demo Flow**
1. **Registration**: Fill form → Send OTP → Verify OTP → Create password → Complete
2. **Login**: Use password or OTP method → OTP appears in toast/console
3. **Dashboard**: Role-based redirect to appropriate dashboard
4. **Prescription**: Doctor creates prescription → Patient views prescription

### **OTP Display**
- **Console**: Check terminal for OTP codes
- **UI**: Toast notifications show OTP codes
- **Format**: 6-digit numbers (e.g., `123456`)

### **Local Services**
- **SMS**: Logs to console (no external SMS service)
- **Email**: Logs to console (no external email service)
- **File Storage**: Simulated locally

## 📱 **Local Services**
- OTP: Shows in console + UI toast
- SMS: Logged to console
- Email: Logged to console
- Files: Stored as base64 in database

## 🐛 **Common Commands**
```bash
# Start PostgreSQL
brew services start postgresql

# Check port usage
lsof -i :3000

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json && npm install
```

## 📊 **Progress Tracking**
- Update `PROJECT_LOG.md` daily
- Use `DAILY_PROGRESS_TEMPLATE.md` for daily logs
- Check `DAILY_WORKFLOW.md` for detailed workflow

## 🎯 **Demo Script (15 minutes)**
1. User registration (3 min)
2. Appointment booking (5 min)
3. Doctor workflow (5 min)
4. Real-time features (2 min)

---

## 🎨 **UI MIGRATION UPDATE** (September 26, 2024)

### ✅ **MAJOR ACHIEVEMENT: Complete Ant Design Migration**
Successfully migrated entire UI system from TailwindCSS to Ant Design framework.

### 🚀 **What's New:**
- **Modern UI Framework**: Ant Design v5.27.4 with custom medical theme
- **All Pages Converted**: Authentication, dashboards, appointments, prescriptions, registrations
- **Professional Medical Aesthetic**: Custom medical-themed color scheme and components
- **Responsive Design**: All layouts maintain responsiveness with Ant Design
- **Enhanced UX**: Ant Design's built-in accessibility features and modern components

### 🛠 **Technical Changes:**
- **Dependencies**: Added `antd`, `@ant-design/icons`, `dayjs`; Removed TailwindCSS dependencies
- **React Version**: Downgraded to React 18.3.1 for Ant Design compatibility
- **Modern APIs**: Updated all deprecated Ant Design components
- **Message System**: Migrated to App.useApp() hook for proper context
- **Configuration**: Custom Ant Design theme with medical branding

### 📋 **Current Status:**
- **Frontend**: `http://localhost:3000` (Vite dev server with Ant Design)
- **Backend**: `http://localhost:3000/api` (Express server)
- **Database**: Neon PostgreSQL (production-ready)
- **UI Framework**: Ant Design v5.27.4
- **React Version**: 18.3.1 (compatible with Ant Design)

**Last Updated**: November 9, 2025
**Current Status**: Patient/Doctor dashboards redesigned; remaining roles queued for migration
