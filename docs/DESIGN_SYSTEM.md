# NexaCare Medical System - Design System

## 🎨 Design Philosophy
Inspired by modern medical platforms (TrueToken, Evergreen Hospital, Mediczen), this design system prioritizes:
- **Clarity & Trust**: Clean, professional medical aesthetics
- **Accessibility**: WCAG AA compliant color contrast
- **Consistency**: Unified design language across all pages
- **User Experience**: Intuitive, step-by-step workflows

---

## 🎨 Color Palette

### Primary Colors
```css
/* Primary Blue - Trust & Medical */
--primary-50: #E6F4FF    /* Lightest background */
--primary-100: #BAE0FF
--primary-200: #91D5FF
--primary-300: #69C0FF
--primary-400: #40A9FF
--primary-500: #1890FF   /* Main primary color */
--primary-600: #096DD9
--primary-700: #0050B3
--primary-800: #003A8C
--primary-900: #002766   /* Darkest */

/* Secondary Green - Success & Health */
--success-50: #F6FFED
--success-100: #D9F7BE
--success-200: #B7EB8F
--success-300: #95DE64
--success-400: #73D13D
--success-500: #52C41A   /* Main success color */
--success-600: #389E0D
--success-700: #237804
--success-800: #135200
--success-900: #092B00
```

### Neutral Colors
```css
/* Text Colors */
--text-primary: #262626      /* Main text */
--text-secondary: #595959    /* Secondary text */
--text-tertiary: #8C8C8C     /* Tertiary text */
--text-disabled: #BFBFBF     /* Disabled text */
--text-inverse: #FFFFFF      /* White text on dark */

/* Background Colors */
--bg-primary: #FFFFFF        /* Main background */
--bg-secondary: #FAFAFA      /* Secondary background */
--bg-tertiary: #F5F5F5       /* Tertiary background */
--bg-hover: #F0F0F0          /* Hover states */
--bg-active: #E6F7FF         /* Active/Selected states */

/* Border Colors */
--border-default: #D9D9D9    /* Default borders */
--border-hover: #40A9FF      /* Hover borders */
--border-focus: #1890FF      /* Focus borders */
--border-error: #FF4D4F      /* Error borders */
```

### Semantic Colors
```css
/* Status Colors */
--status-success: #52C41A
--status-warning: #FAAD14
--status-error: #FF4D4F
--status-info: #1890FF
--status-pending: #FAAD14
--status-active: #52C41A
--status-inactive: #8C8C8C

/* Medical Status Colors */
--status-confirmed: #52C41A
--status-pending: #FAAD14
--status-cancelled: #FF4D4F
--status-completed: #1890FF
```

---

## 📝 Typography

### Font Family
```css
--font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
--font-mono: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
```

### Font Sizes
```css
/* Headings */
--font-size-h1: 32px         /* Page titles */
--font-size-h2: 24px         /* Section titles */
--font-size-h3: 20px         /* Subsection titles */
--font-size-h4: 18px         /* Card titles */
--font-size-h5: 16px         /* Small headings */
--font-size-h6: 14px         /* Smallest headings */

/* Body Text */
--font-size-base: 14px       /* Base font size */
--font-size-lg: 16px         /* Large text */
--font-size-sm: 12px         /* Small text */
--font-size-xs: 10px         /* Extra small text */
```

### Font Weights
```css
--font-weight-light: 300
--font-weight-regular: 400
--font-weight-medium: 500
--font-weight-semibold: 600
--font-weight-bold: 700
```

### Line Heights
```css
--line-height-tight: 1.2      /* Headings */
--line-height-normal: 1.5     /* Body text */
--line-height-relaxed: 1.75   /* Long paragraphs */
```

### Typography Scale
```
H1: 32px / 1.2 / 700  - Page titles, hero sections
H2: 24px / 1.3 / 600  - Section headers
H3: 20px / 1.4 / 600  - Subsection headers
H4: 18px / 1.4 / 600  - Card titles
H5: 16px / 1.5 / 500  - Small headings
H6: 14px / 1.5 / 500  - Labels, captions
Body: 14px / 1.5 / 400 - Regular text
Small: 12px / 1.5 / 400 - Secondary text
```

---

## 🔘 Buttons

### Button Variants

#### Primary Button
- **Background**: `#1890FF` (Primary 500)
- **Text**: White
- **Hover**: `#40A9FF` (Primary 400)
- **Active**: `#096DD9` (Primary 600)
- **Disabled**: `#F5F5F5` background, `#BFBFBF` text
- **Height**: 40px (default), 48px (large), 32px (small)
- **Border Radius**: 6px
- **Padding**: 12px 24px
- **Font Weight**: 500
- **Shadow**: `0 2px 4px rgba(24, 144, 255, 0.2)`
- **Hover Shadow**: `0 4px 12px rgba(24, 144, 255, 0.3)`

#### Secondary Button
- **Background**: Transparent
- **Border**: 1px solid `#1890FF`
- **Text**: `#1890FF`
- **Hover**: `#E6F4FF` background
- **Active**: `#BAE0FF` background

#### Outline Button
- **Background**: White
- **Border**: 1px solid `#D9D9D9`
- **Text**: `#262626`
- **Hover**: `#FAFAFA` background, `#1890FF` border
- **Active**: `#F5F5F5` background

#### Text Button
- **Background**: Transparent
- **Text**: `#1890FF`
- **Hover**: `#E6F4FF` background
- **No border**

#### Danger Button
- **Background**: `#FF4D4F`
- **Text**: White
- **Hover**: `#FF7875`
- **Active**: `#CF1322`

### Button Sizes
- **Small**: 32px height, 12px padding, 12px font
- **Medium** (default): 40px height, 16px padding, 14px font
- **Large**: 48px height, 20px padding, 16px font

### Icon Buttons
- **Circular**: 40px × 40px, border-radius: 50%
- **Square**: 40px × 40px, border-radius: 6px
- **Icon Size**: 16px (small), 20px (medium), 24px (large)

---

## 📝 Form Elements

### Input Fields
- **Height**: 40px (default), 48px (large), 32px (small)
- **Border**: 1px solid `#D9D9D9`
- **Border Radius**: 6px
- **Padding**: 8px 12px
- **Font Size**: 14px
- **Background**: White
- **Focus State**: 
  - Border: 1px solid `#1890FF`
  - Box Shadow: `0 0 0 2px rgba(24, 144, 255, 0.2)`
- **Hover State**: Border color `#40A9FF`
- **Error State**: 
  - Border: 1px solid `#FF4D4F`
  - Box Shadow: `0 0 0 2px rgba(255, 77, 79, 0.2)`

### Textarea
- Same styling as Input
- **Min Height**: 80px
- **Resize**: Vertical only

### Select/Dropdown
- Same height and border styling as Input
- **Dropdown Menu**:
  - Background: White
  - Border: 1px solid `#D9D9D9`
  - Border Radius: 6px
  - Box Shadow: `0 4px 12px rgba(0, 0, 0, 0.15)`
  - Hover: `#F5F5F5` background

### Checkbox & Radio
- **Size**: 16px × 16px
- **Border Radius**: 4px (checkbox), 50% (radio)
- **Checked Color**: `#1890FF`
- **Hover**: `#E6F4FF` background

### Form Labels
- **Font Size**: 14px
- **Font Weight**: 500
- **Color**: `#262626`
- **Margin Bottom**: 8px
- **Required Asterisk**: `#FF4D4F`

### Error Messages
- **Font Size**: 12px
- **Color**: `#FF4D4F`
- **Margin Top**: 4px
- **Icon**: Small error icon (optional)

### Help Text
- **Font Size**: 12px
- **Color**: `#8C8C8C`
- **Margin Top**: 4px

---

## 🎴 Cards & Containers

### Card Component
- **Background**: White
- **Border**: 1px solid `#E8E8E8`
- **Border Radius**: 12px
- **Padding**: 24px
- **Box Shadow**: `0 2px 8px rgba(0, 0, 0, 0.08)`
- **Hover Shadow**: `0 4px 16px rgba(0, 0, 0, 0.12)`
- **Transition**: All 0.3s ease

### Card Header
- **Padding**: 16px 24px
- **Border Bottom**: 1px solid `#F0F0F0`
- **Background**: `#FAFAFA` (optional)
- **Font Size**: 16px
- **Font Weight**: 600

### Card Body
- **Padding**: 24px

### Card Footer
- **Padding**: 16px 24px
- **Border Top**: 1px solid `#F0F0F0`
- **Background**: `#FAFAFA` (optional)

### Container
- **Max Width**: 1200px (desktop)
- **Padding**: 24px (desktop), 16px (tablet), 12px (mobile)
- **Margin**: 0 auto

### Section Divider
- **Border**: 1px solid `#F0F0F0`
- **Margin**: 24px 0

---

## 📐 Layout & Spacing

### Grid System
- **Breakpoints**:
  - xs: 0px - 576px (mobile)
  - sm: 576px - 768px (tablet)
  - md: 768px - 992px (small desktop)
  - lg: 992px - 1200px (desktop)
  - xl: 1200px - 1600px (large desktop)
  - xxl: 1600px+ (extra large)

- **Column Gutter**: 16px (mobile), 24px (desktop)

### Spacing Scale (8px base)
```
4px   - XS (--spacing-xs)
8px   - SM (--spacing-sm)
12px  - MD (--spacing-md)
16px  - Base (--spacing-base)
24px  - LG (--spacing-lg)
32px  - XL (--spacing-xl)
48px  - 2XL (--spacing-2xl)
64px  - 3XL (--spacing-3xl)
```

### Container Padding
- **Desktop**: 24px
- **Tablet**: 16px
- **Mobile**: 12px

---

## 🧭 Navigation & Menu

### Sidebar Navigation
- **Width**: 240px (collapsed: 80px)
- **Background**: `#FFFFFF`
- **Border Right**: 1px solid `#E8E8E8`
- **Active Item**:
  - Background: `#E6F4FF`
  - Text Color: `#1890FF`
  - Border Left: 3px solid `#1890FF`
- **Hover**: `#F5F5F5` background
- **Icon Size**: 20px
- **Icon Spacing**: 12px from text
- **Font Size**: 14px
- **Font Weight**: 500 (active), 400 (default)

### Breadcrumbs
- **Font Size**: 14px
- **Separator**: `/` or `>`
- **Color**: `#8C8C8C` (separator), `#1890FF` (link)
- **Active**: `#262626`

### Tabs
- **Active Tab**: 
  - Border Bottom: 2px solid `#1890FF`
  - Color: `#1890FF`
  - Font Weight: 500
- **Inactive Tab**: 
  - Color: `#8C8C8C`
  - Font Weight: 400
- **Hover**: `#F5F5F5` background

### Steps/Progress Indicator
- **Active Step**: `#1890FF` (circle & text)
- **Completed Step**: `#52C41A` (circle & text)
- **Pending Step**: `#D9D9D9` (circle & text)
- **Connector Line**: `#D9D9D9` (pending), `#1890FF` (completed)
- **Size**: 32px circle
- **Font Size**: 14px

---

## 🏷️ Status & Badges

### Badge/Tag Component
- **Border Radius**: 12px
- **Padding**: 4px 12px
- **Font Size**: 12px
- **Font Weight**: 500

### Status Colors
```
Confirmed:   #52C41A (green) - Background: #F6FFED
Pending:     #FAAD14 (orange) - Background: #FFFBE6
Cancelled:   #FF4D4F (red) - Background: #FFF2F0
Completed:   #1890FF (blue) - Background: #E6F7FF
Active:      #52C41A (green)
Inactive:    #8C8C8C (gray)
```

### Badge Sizes
- **Small**: 20px height, 8px padding, 11px font
- **Medium**: 24px height, 8px padding, 12px font
- **Large**: 28px height, 10px padding, 13px font

---

## 🔔 Alerts & Notifications

### Success Alert
- **Background**: `#F6FFED`
- **Border**: 1px solid `#B7EB8F`
- **Icon Color**: `#52C41A`
- **Text Color**: `#389E0D`
- **Border Radius**: 6px
- **Padding**: 12px 16px

### Error Alert
- **Background**: `#FFF2F0`
- **Border**: 1px solid `#FFCCC7`
- **Icon Color**: `#FF4D4F`
- **Text Color**: `#CF1322`
- **Border Radius**: 6px
- **Padding**: 12px 16px

### Warning Alert
- **Background**: `#FFFBE6`
- **Border**: 1px solid `#FFE58F`
- **Icon Color**: `#FAAD14`
- **Text Color**: `#D48806`
- **Border Radius**: 6px
- **Padding**: 12px 16px

### Info Alert
- **Background**: `#E6F7FF`
- **Border**: 1px solid `#91D5FF`
- **Icon Color**: `#1890FF`
- **Text Color**: `#0958D9`
- **Border Radius**: 6px
- **Padding**: 12px 16px

### Toast Notifications
- **Position**: Top-right (default)
- **Duration**: 3 seconds
- **Width**: 320px
- **Border Radius**: 8px
- **Box Shadow**: `0 4px 12px rgba(0, 0, 0, 0.15)`
- **Padding**: 16px 20px

---

## 📊 Tables & Data Display

### Table Header
- **Background**: `#FAFAFA`
- **Font Weight**: 600
- **Font Size**: 14px
- **Color**: `#262626`
- **Padding**: 12px 16px
- **Border Bottom**: 1px solid `#E8E8E8`

### Table Rows
- **Hover**: `#F5F5F5` background
- **Alternating Rows**: `#FAFAFA` (optional)
- **Padding**: 12px 16px
- **Border Bottom**: 1px solid `#F0F0F0`

### Table Borders
- **Cell Borders**: None (clean look)
- **Row Borders**: 1px solid `#F0F0F0`

---

## 🪟 Modals & Dialogs

### Modal Overlay
- **Background**: `rgba(0, 0, 0, 0.45)`
- **Backdrop Blur**: Optional

### Modal Content
- **Background**: White
- **Border Radius**: 12px
- **Box Shadow**: `0 8px 24px rgba(0, 0, 0, 0.2)`
- **Max Width**: 520px (default), 720px (large)
- **Padding**: 0

### Modal Header
- **Background**: White
- **Padding**: 20px 24px
- **Border Bottom**: 1px solid `#F0F0F0`
- **Font Size**: 18px
- **Font Weight**: 600

### Modal Body
- **Padding**: 24px

### Modal Footer
- **Padding**: 16px 24px
- **Border Top**: 1px solid `#F0F0F0`
- **Background**: `#FAFAFA`

---

## 🎯 Onboarding-Specific Elements

### Step Indicator (Horizontal)
- **Layout**: Horizontal with connecting lines
- **Step Circle**: 
  - Size: 32px
  - Active: `#1890FF` background, white text
  - Completed: `#52C41A` background, white checkmark
  - Pending: `#D9D9D9` background, `#8C8C8C` text
- **Step Title**: 14px, 500 weight
- **Step Description**: 12px, `#8C8C8C`
- **Connector Line**: 2px, `#D9D9D9` (pending), `#1890FF` (completed)

### Progress Bar
- **Height**: 4px
- **Background**: `#F0F0F0`
- **Progress**: `#1890FF`
- **Border Radius**: 2px
- **Animation**: Smooth transition

### Form Sections
- **Section Header**: 
  - Font Size: 18px
  - Font Weight: 600
  - Color: `#262626`
  - Margin Bottom: 16px
- **Section Divider**: 1px solid `#F0F0F0`, 24px margin

### Multi-Step Navigation
- **Back Button**: Secondary/Outline style
- **Next Button**: Primary style
- **Save Draft**: Text button style
- **Position**: Fixed bottom or inline with form

---

## 🎨 Shadows & Elevation

### Shadow Levels
```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05)      /* Subtle */
--shadow-base: 0 2px 8px rgba(0, 0, 0, 0.08)    /* Cards */
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.12)      /* Modals */
--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.16)      /* Dropdowns */
--shadow-xl: 0 12px 32px rgba(0, 0, 0, 0.2)      /* Large modals */
```

---

## 📐 Border Radius

```css
--radius-sm: 4px    /* Small elements */
--radius-base: 6px  /* Default */
--radius-md: 8px    /* Cards */
--radius-lg: 12px   /* Large cards */
--radius-xl: 16px   /* Extra large */
--radius-full: 50%  /* Circles */
```

---

## ⚡ Animations & Transitions

### Transition Durations
```css
--transition-fast: 150ms    /* Quick interactions */
--transition-base: 300ms    /* Default */
--transition-slow: 500ms    /* Complex animations */
```

### Common Transitions
- **Hover**: `all 0.3s ease`
- **Focus**: `all 0.2s ease`
- **Modal Enter**: `0.3s ease-out`
- **Modal Exit**: `0.2s ease-in`

### Loading Animations
- **Spinner**: Rotating circle, `#1890FF`
- **Skeleton Loader**: Pulse animation, `#F5F5F5`

---

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 576px
- **Tablet**: 576px - 768px
- **Desktop**: 768px+
- **Large Desktop**: 1200px+

### Mobile Adaptations
- **Sidebar**: Collapsed to icon-only or bottom navigation
- **Cards**: Full width, stacked
- **Tables**: Horizontal scroll or card view
- **Modal**: Full screen on mobile
- **Buttons**: Full width on mobile

---

## 🎯 Component Specifications

### Onboarding Split-Screen Layout
- **Left Panel** (40% width on desktop):
  - Background: Gradient `#1890FF` to `#40A9FF`
  - Logo & branding
  - Progress indicator
  - Helpful tips/instructions
- **Right Panel** (60% width on desktop):
  - White background
  - Form content
  - Navigation buttons

### Dashboard Cards
- **Grid Layout**: 3-4 columns on desktop, 2 on tablet, 1 on mobile
- **Card Spacing**: 24px gutter
- **Card Height**: Auto (min-height: 200px)
- **Hover Effect**: Subtle shadow increase

### Data Visualization
- **Chart Colors**: 
  - Primary: `#1890FF`
  - Secondary: `#52C41A`
  - Tertiary: `#FAAD14`
  - Error: `#FF4D4F`
- **Grid Lines**: `#F0F0F0`
- **Axis Labels**: `#8C8C8C`, 12px

---

## ✅ Implementation Checklist

- [ ] Update Ant Design theme configuration
- [ ] Create CSS custom properties file
- [ ] Create reusable component library
- [ ] Update all existing pages to use new design system
- [ ] Create onboarding component templates
- [ ] Document component usage examples
- [ ] Create Storybook (optional)

---

**Last Updated**: November 5, 2025
**Version**: 1.0.0

