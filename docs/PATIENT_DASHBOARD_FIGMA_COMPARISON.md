# Patient Dashboard - Figma Design Comparison

**Created**: For comparing current implementation with Figma designs  
**Purpose**: Identify differences between implemented design and Figma specifications

---

## 📋 Current Implementation Summary

### Layout Structure
- **Sidebar**: Fixed left sidebar (260px width) on desktop, drawer on mobile
- **Content Area**: Main content with padding (24px desktop, 16px mobile)
- **Background**: `#F7FBFF` (Patient theme background)

### Components Currently Implemented

#### 1. **KPI Cards Section**
- **Layout**: 4 cards in a row (desktop), horizontal scroll (mobile)
- **Cards**:
  1. Upcoming Appointments (Green: #10B981)
  2. Active Prescriptions (Blue: #2563eb)
  3. Lab Reports (Orange: #F59E0B)
  4. Messages (Purple: #7C3AED)
- **Card Design**:
  - Border radius: 12px
  - Shadow: `0 2px 8px rgba(0, 0, 0, 0.08)`
  - Padding: 20px
  - Min height: 140px
  - Icon + Label on top row
  - Large value (32px, weight 700)
  - Trend tag at bottom
  - "View →" link button

#### 2. **Quick Actions Section**
- **Layout**: Single row, flex wrap on mobile
- **Actions**:
  1. New Appointment (Primary button: #1A8FE3)
  2. Request Refill
  3. Upload Document
  4. Send Message
  5. View History
- **Button Design**:
  - Border radius: 12px
  - Height: auto
  - Padding: 8px 16px
  - Primary: Blue background (#1A8FE3)
  - Secondary: White background, gray border

#### 3. **Upcoming Appointments Card**
- **Layout**: Full width card
- **Features**:
  - Tabs for "Upcoming", "Past", "Cancelled"
  - Appointment cards with:
    - Doctor name (strong)
    - Specialty · Hospital
    - Date · Time
    - Status tag (color-coded)
    - "View Details" link
  - Background colors by status:
    - Confirmed: #E3F2FF (highlight)
    - Pending: #FFF7E6
    - Cancelled: #FFF1F0
    - Completed: #F6FFED
  - Border: 1px solid (primary color for confirmed)
  - Border radius: 12px

#### 4. **Prescriptions Card**
- **Layout**: Half width (lg={12})
- **Features**:
  - "Current" and "Past" toggle buttons
  - Prescription cards showing:
    - Medication name
    - Dosage
    - Next dose time
    - Refills remaining
    - Adherence percentage
  - Empty state with icon

#### 5. **Lab Results Card**
- **Layout**: Half width (lg={12})
- **Features**:
  - Lab report cards showing:
    - Test name
    - Report date
    - Status tag
  - "View All" link
  - Empty state with icon

### Color Scheme (Current)
```javascript
patientTheme = {
  primary: '#1A8FE3',      // Blue
  secondary: '#10B981',    // Green
  accent: '#F59E0B',       // Orange
  background: '#F7FBFF',   // Light blue
  highlight: '#E3F2FF',    // Lighter blue
}
```

### Typography (Current)
- Font: System fonts (not explicitly Inter)
- Sizes: 12px, 14px, 18px, 32px
- Weights: 400, 500, 600, 700

### Spacing (Current)
- Card padding: 20px (KPI cards), 16px (content cards)
- Section gaps: 24px (desktop), 16px (mobile)
- Border radius: 12px (cards), 12px (buttons)

---

## 🎨 Figma Design Specifications (Expected)

### Design System Requirements
Based on `DASHBOARD_STYLE_GUIDE.md` and `FIGMA_REDESIGN_GUIDE.md`:

#### Colors (Expected)
- **Primary**: `#1A8FE3` ✅ (matches)
- **Secondary**: `#10B981` ✅ (matches)
- **Accent**: `#F59E0B` ✅ (matches)
- **Background**: `#F7FBFF` ✅ (matches)
- **Highlight**: `#E3F2FF` ✅ (matches)

#### Typography (Expected)
- **Font Family**: `Inter` (fallback: DM Sans, system sans-serif)
- **Weights**: 400 (body), 500 (labels), 600/700 (headings)
- **Scale**: 12px, 14px, 16px, 18px, 24px, 32px, 40px
- ⚠️ **Issue**: Current implementation may not use Inter explicitly

#### Spacing (Expected)
- **Grid**: 8px base unit
- **Card Padding**: 16px (desktop), 12px (mobile)
- **Section Gaps**: 24px (desktop), 16px (mobile)
- ⚠️ **Issue**: KPI cards use 20px padding instead of 16px

#### Border Radius (Expected)
- **Cards**: 16px
- **Buttons**: 10px
- **Chips/Tags**: 12px
- ⚠️ **Issue**: Current cards use 12px, should be 16px

#### Shadows (Expected)
- Base: `0 10px 24px rgba(15,23,42,0.08)`
- ⚠️ **Issue**: Current uses `0 2px 8px rgba(0, 0, 0, 0.08)` (lighter)

---

## 🔍 Key Differences to Check in Figma

### 1. **KPI Cards**
- [ ] Border radius: Should be 16px (currently 12px)
- [ ] Padding: Should be 16px (currently 20px)
- [ ] Shadow: Should match design system shadow
- [ ] Typography: Should use Inter font explicitly
- [ ] Icon size: Verify 18px vs current
- [ ] Value size: Verify 32px/40px line-height

### 2. **Quick Actions**
- [ ] Button border radius: Should be 10px (currently 12px)
- [ ] Button padding: Verify matches design
- [ ] Icon size: Should be 18px
- [ ] Hover states: Check if match Figma

### 3. **Appointment Cards**
- [ ] Card border radius: Should be 16px (currently 12px)
- [ ] Status colors: Verify exact hex values match
- [ ] Typography hierarchy: Check font sizes
- [ ] Spacing between cards: Verify 12px gap

### 4. **Prescriptions & Lab Results Cards**
- [ ] Card border radius: Should be 16px
- [ ] Toggle button styles: Check if match Figma
- [ ] Empty state icons: Should be 32px
- [ ] Card padding: Should be 16px

### 5. **Overall Layout**
- [ ] Content max-width: Should be 1320px centered
- [ ] Sidebar width: Should be 256px (currently 260px)
- [ ] Header spacing: Verify padding matches
- [ ] Responsive breakpoints: Check mobile/tablet layouts

### 6. **Typography**
- [ ] Font family: Should explicitly use Inter
- [ ] Font weights: Verify 400/500/600/700 usage
- [ ] Line heights: Check if match design system
- [ ] Letter spacing: Verify if specified in Figma

### 7. **Colors & Contrast**
- [ ] Primary color: Verify exact #1A8FE3
- [ ] Status colors: Check all tag colors
- [ ] Background colors: Verify all shades
- [ ] Contrast ratios: Should meet WCAG AA (4.5:1)

### 8. **Interactive States**
- [ ] Hover effects: Check button/card hover states
- [ ] Focus states: Verify 2px outline with offset
- [ ] Active states: Check selected/toggled states
- [ ] Loading states: Verify skeleton loaders match

### 9. **Mobile Responsiveness**
- [ ] KPI cards: Should scroll horizontally on mobile
- [ ] Quick actions: Should wrap/stack on mobile
- [ ] Sidebar: Should be drawer on mobile
- [ ] Padding: Should be 16px on mobile (currently varies)

### 10. **Empty States**
- [ ] Icon size: Should be 32px (currently 48px)
- [ ] Text styling: Verify secondary text color
- [ ] CTA buttons: Check if present in Figma

---

## 📝 Action Items After Figma Review

1. **Update Border Radius**
   - Change card border radius from 12px to 16px
   - Change button border radius from 12px to 10px

2. **Update Typography**
   - Add Inter font family explicitly
   - Verify all font weights match design system

3. **Update Spacing**
   - Adjust KPI card padding from 20px to 16px
   - Verify all section gaps match 8px grid

4. **Update Shadows**
   - Change shadow to match design system specification

5. **Update Sidebar**
   - Adjust width from 260px to 256px

6. **Verify Colors**
   - Double-check all hex values match Figma exactly

7. **Add Missing States**
   - Implement hover/focus/active states if missing
   - Add loading states if not present

8. **Mobile Optimization**
   - Verify mobile layouts match Figma designs
   - Check touch target sizes (min 44px)

---

## 🔗 Related Files

- Current Implementation: `client/src/pages/dashboards/patient-dashboard.tsx`
- KPI Card Component: `client/src/components/dashboard/KpiCard.tsx`
- Quick Action Component: `client/src/components/dashboard/QuickActionTile.tsx`
- Design Guide: `docs/DASHBOARD_STYLE_GUIDE.md`
- Figma Guide: `docs/FIGMA_REDESIGN_GUIDE.md`

---

## 📸 Screenshots Needed

To properly compare with Figma, capture:
1. Desktop full dashboard (1440px width)
2. Mobile dashboard (375px width)
3. KPI cards section (close-up)
4. Quick actions section
5. Appointments card
6. Prescriptions card
7. Lab results card
8. Empty states
9. Hover states
10. Mobile sidebar drawer

---

**Next Steps**: 
1. Access Figma designs for Patient Dashboard
2. Compare each section with this checklist
3. Document specific differences found
4. Create implementation tasks for updates needed
