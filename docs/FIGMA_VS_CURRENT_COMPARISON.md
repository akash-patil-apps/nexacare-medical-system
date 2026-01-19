# Figma Design vs Current Implementation - Patient Dashboard Comparison

**Date**: January 18, 2026  
**Source**: Figma Make Project - "Complete Dashboard Redesign Guide"  
**Current Implementation**: `client/src/pages/dashboards/patient-dashboard.tsx`

---

## Executive Summary

The Figma design uses **Tailwind CSS** classes, while the current implementation uses **Ant Design** components. This comparison extracts design specifications from the Figma code and compares them with the current implementation and the style guide.

---

## 1. Design System Differences

| Aspect | Figma Design | Current Implementation | Style Guide Target |
|--------|-------------|----------------------|-------------------|
| **Framework** | Tailwind CSS | Ant Design | Ant Design (with custom tokens) |
| **Border Radius (Cards)** | `rounded-xl` (12px) | Ant Design default (~6px) | **16px** (per style guide) |
| **Border Radius (Buttons)** | `rounded-lg` (8px) | Ant Design default (~6px) | **10px** (per style guide) |
| **Card Padding** | `p-4` (16px) or `p-6` (24px) | Ant Design default (~24px) | **16px desktop, 12px mobile** |
| **Spacing Between Sections** | `gap-3` (12px) or `gap-4` (16px) | Ant Design Space component | **8px grid system** |
| **Typography** | Tailwind classes (`text-sm`, `text-lg`, etc.) | Ant Design Typography | Inter font, specific sizes |

---

## 2. Color Palette Comparison

### Figma Design Colors (from Tailwind classes)
- **Primary Blue**: `blue-600` (#2563EB)
- **Background**: `gray-50` (#F9FAFB)
- **Card Background**: `white` (#FFFFFF)
- **Border**: `gray-200` (#E5E7EB)
- **Text Primary**: `gray-900` (#111827)
- **Text Secondary**: `gray-700` (#374151)
- **Accent Colors**: 
  - Purple: `purple-600` (#9333EA)
  - Green: `green-600` (#16A34A)
  - Orange: `orange-600` (#EA580C)

### Current Implementation Colors
- Uses Ant Design theme colors
- Primary: Ant Design blue (#1890FF)
- Background: Ant Design gray (#FAFAFA)

### Style Guide Target Colors
- **Patient Primary**: `#1A8FE3`
- **Patient Secondary**: `#10B981`
- **Patient Accent**: `#F59E0B`
- **Background**: `#F7FBFF`
- **Highlight**: `#E3F2FF`

**⚠️ Action Required**: Update colors to match style guide palette.

---

## 3. Component-Specific Comparisons

### 3.1 KPI Cards

| Property | Figma Design | Current Implementation | Style Guide |
|----------|-------------|----------------------|-------------|
| **Border Radius** | `rounded-xl` (12px) | Default (~6px) | **16px** |
| **Padding** | `p-3` or `p-4` (12-16px) | Default (~24px) | **16px desktop** |
| **Gap Between Cards** | `gap-3` (12px) | Space component | **8px grid** |
| **Icon Size** | `h-5 w-5` (20px) | 18px (default) | **18px** ✅ |
| **Value Typography** | `text-2xl` or `text-3xl` | Ant Design Title | **32px/40px, weight 700** |
| **Badge** | `badgeVariant` prop | Ant Design Tag | Semantic colors ✅ |

**Differences**:
- ❌ Border radius should be 16px (not 12px)
- ❌ Padding is larger in current implementation
- ✅ Icon size matches
- ⚠️ Typography size needs verification

---

### 3.2 Quick Action Buttons

| Property | Figma Design | Current Implementation | Style Guide |
|----------|-------------|----------------------|-------------|
| **Height** | `h-9` (36px) | Default (~32px) | **Standard button height** |
| **Border Radius** | `rounded-lg` (8px) | Default (~6px) | **10px** |
| **Font Size** | `text-sm` (14px) | Default (~14px) | **14px** ✅ |
| **Gap Between Buttons** | `gap-2` (8px) | Space component | **8px** ✅ |
| **Grid Layout** | `grid-cols-5` (5 columns) | Responsive grid | **Responsive** ✅ |

**Differences**:
- ❌ Border radius should be 10px (not 8px)
- ✅ Spacing matches 8px grid
- ✅ Layout is responsive

---

### 3.3 Appointment Cards

| Property | Figma Design | Current Implementation | Style Guide |
|----------|-------------|----------------------|-------------|
| **Card Border Radius** | `rounded-xl` (12px) | Default (~6px) | **16px** |
| **Card Padding** | `p-4` (16px) | Default (~24px) | **16px desktop** |
| **Card Border** | `border border-gray-200` | Ant Design Card border | **1px solid gray-200** |
| **Background** | `bg-white` | Ant Design Card | **White** ✅ |
| **Spacing Between Cards** | `space-y-4` (16px) | Space component | **16px** ✅ |

**Differences**:
- ❌ Border radius should be 16px (not 12px)
- ⚠️ Padding needs adjustment to 16px

---

### 3.4 Main Content Container

| Property | Figma Design | Current Implementation | Style Guide |
|----------|-------------|----------------------|-------------|
| **Max Width** | `max-w-7xl` (1280px) | Custom or default | **1320px** |
| **Horizontal Padding** | `px-4` (16px) | Default (~24px) | **24px** |
| **Vertical Padding** | `py-3` (12px) | Default (~24px) | **32px** |
| **Background** | `bg-gray-50` | Ant Design Layout | **Role-specific background** |

**Differences**:
- ❌ Max width should be 1320px (not 1280px)
- ⚠️ Padding values differ
- ⚠️ Background should be role-specific (`#F7FBFF` for Patient)

---

### 3.5 Section Headers

| Property | Figma Design | Current Implementation | Style Guide |
|----------|-------------|----------------------|-------------|
| **Font Size** | `text-lg` (18px) | Ant Design Title | **18px** ✅ |
| **Font Weight** | `font-semibold` (600) | Ant Design Title | **600** ✅ |
| **Color** | `text-gray-900` | Ant Design default | **Gray-900** ✅ |
| **Margin Bottom** | `mb-4` (16px) | Default spacing | **16px** ✅ |

**Differences**:
- ✅ Typography matches style guide

---

## 4. Layout Structure Comparison

### Figma Design Structure
```
- Sidebar (256px width)
- Main Content Area
  - Top Header
  - KPI Cards (4 columns, gap-3)
  - Quick Actions (5 columns, gap-2)
  - Appointments Section (rounded-xl, p-4)
  - Prescriptions & Lab Reports (2 columns, gap-4)
  - Care Timeline (rounded-xl, p-4)
  - Notifications (rounded-xl, p-4)
```

### Current Implementation Structure
```
- Sidebar (PatientSidebar component)
- Main Content Area
  - Top Header
  - KPI Cards (4 columns, Ant Design Grid)
  - Quick Actions (Ant Design Space)
  - Appointments Section (Ant Design Card)
  - Prescriptions & Lab Reports (Ant Design Row/Col)
  - Care Timeline (Ant Design Card)
  - Notifications (Ant Design Card)
```

**Differences**:
- ✅ Structure is similar
- ❌ Border radius values need updating
- ❌ Padding values need adjustment
- ⚠️ Spacing needs to follow 8px grid

---

## 5. Typography Comparison

| Element | Figma Design | Current Implementation | Style Guide |
|---------|-------------|----------------------|-------------|
| **Font Family** | Inter (implied) | Ant Design default | **Inter** |
| **KPI Value** | `text-2xl` or `text-3xl` | Ant Design Title | **32px/40px, weight 700** |
| **Section Title** | `text-lg font-semibold` | Ant Design Title | **18px, weight 600** |
| **Body Text** | `text-sm` (14px) | Ant Design Text | **14px, weight 400** |
| **Button Text** | `text-sm` (14px) | Ant Design Button | **14px** ✅ |

**Differences**:
- ⚠️ Font family needs to be Inter (check if already set)
- ⚠️ KPI value size needs verification
- ✅ Other typography matches

---

## 6. Spacing System Comparison

### Figma Design Spacing
- Uses Tailwind spacing scale (4px, 8px, 12px, 16px, 24px)
- `gap-2` = 8px
- `gap-3` = 12px
- `gap-4` = 16px
- `p-3` = 12px
- `p-4` = 16px
- `p-6` = 24px

### Current Implementation Spacing
- Uses Ant Design spacing scale (8px base)
- Space component with `size` prop
- Card padding from Ant Design defaults

### Style Guide Spacing
- **8px grid system**
- **16px interior card padding (desktop)**
- **12px mobile padding**

**Differences**:
- ✅ Both use 8px base (Tailwind and Ant Design)
- ⚠️ Need to ensure all spacing follows 8px grid
- ❌ Card padding needs to be exactly 16px (desktop)

---

## 7. Priority Action Items

### High Priority (Visual Impact)
1. **Update Card Border Radius**: Change from default (~6px) to **16px**
2. **Update Button Border Radius**: Change to **10px**
3. **Update Card Padding**: Set to **16px** (desktop), **12px** (mobile)
4. **Update Color Palette**: Use style guide colors (`#1A8FE3` for Patient primary)
5. **Update Background Color**: Use role-specific background (`#F7FBFF` for Patient)

### Medium Priority (Spacing & Layout)
6. **Update Max Width**: Set content max-width to **1320px**
7. **Update Spacing**: Ensure all gaps follow **8px grid**
8. **Update Main Padding**: Set to **32px vertical, 24px horizontal**

### Low Priority (Typography & Details)
9. **Verify Font Family**: Ensure Inter font is applied
10. **Verify Typography Sizes**: Match style guide specifications
11. **Update Shadow Values**: Use style guide shadow specifications

---

## 8. Implementation Notes

### Converting Tailwind to Ant Design

Since the Figma design uses Tailwind but the implementation uses Ant Design, here's how to map the values:

| Tailwind Class | Value | Ant Design Equivalent |
|---------------|-------|---------------------|
| `rounded-xl` | 12px | ❌ Should be 16px (custom) |
| `rounded-lg` | 8px | ❌ Should be 10px (custom) |
| `p-4` | 16px | `padding: 16px` (custom) |
| `p-6` | 24px | `padding: 24px` (custom) |
| `gap-3` | 12px | `gap: 12px` (custom) |
| `gap-4` | 16px | `gap: 16px` (custom) |
| `text-lg` | 18px | `fontSize: 18px` (custom) |
| `text-sm` | 14px | `fontSize: 14px` (custom) |

### Custom CSS Needed

To match the style guide, you'll need to add custom CSS:

```css
/* Card border radius */
.ant-card {
  border-radius: 16px !important;
}

/* Button border radius */
.ant-btn {
  border-radius: 10px !important;
}

/* Card padding */
.ant-card-body {
  padding: 16px !important; /* Desktop */
}

@media (max-width: 768px) {
  .ant-card-body {
    padding: 12px !important; /* Mobile */
  }
}

/* Patient-specific background */
.patient-dashboard {
  background-color: #F7FBFF;
}

/* Patient primary color */
.patient-primary {
  color: #1A8FE3;
}
```

---

## 9. Conclusion

The Figma design provides a good reference, but it uses Tailwind CSS classes that need to be converted to Ant Design with custom styling to match the style guide. The main differences are:

1. **Border radius values** (Figma: 12px, Style Guide: 16px for cards)
2. **Color palette** (Figma: Tailwind defaults, Style Guide: specific hex values)
3. **Spacing** (Both use 8px base, but exact values differ)
4. **Max width** (Figma: 1280px, Style Guide: 1320px)

**Recommendation**: Use the **Style Guide** (`DASHBOARD_STYLE_GUIDE.md`) as the primary reference, and use the Figma design as a visual reference for layout and component structure.

---

## 10. Next Steps

1. ✅ Review this comparison document
2. ⏳ Update border radius values in custom CSS
3. ⏳ Update color palette to match style guide
4. ⏳ Update spacing to follow 8px grid
5. ⏳ Update padding values
6. ⏳ Verify typography (Inter font, sizes)
7. ⏳ Test responsive behavior
8. ⏳ Compare visual result with Figma design

---

**Last Updated**: January 18, 2026
