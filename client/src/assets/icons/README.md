# Custom Icons from Flaticon

These icons are from Flaticon and need to be updated with the actual SVG content.

## Icons to Download:

1. **Dashboard Icon**: https://www.flaticon.com/free-icon/dashboard_1828673
   - File: `DashboardIcon.tsx`
   - Replace the `<path>` element with the actual SVG path from Flaticon

2. **Appointment Icon**: https://www.flaticon.com/free-icon/appointment_7322293
   - File: `AppointmentIcon.tsx`
   - Replace the `<path>` element with the actual SVG path from Flaticon

3. **Prescription Icon**: https://www.flaticon.com/free-icon/prescription_482007
   - File: `PrescriptionIcon.tsx`
   - Replace the `<path>` element with the actual SVG path from Flaticon

4. **Lab Icon**: https://www.flaticon.com/free-icon/tube_6992820
   - File: `LabIcon.tsx`
   - Replace the `<path>` element with the actual SVG path from Flaticon

## How to Update:

1. Download the SVG file from Flaticon
2. Open the SVG file and copy the `<path>` or `<g>` elements inside the `<svg>` tag
3. Replace the placeholder paths in the corresponding `.tsx` file
4. Make sure to preserve the `viewBox`, `width`, `height`, and `fill="currentColor"` attributes

## Example:

If the Flaticon SVG looks like:
```svg
<svg viewBox="0 0 24 24" fill="currentColor">
  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
  <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
</svg>
```

Replace the placeholder in the component with:
```tsx
<path d="M12 2L2 7l10 5 10-5-10-5z"/>
<path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
```

