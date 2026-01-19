# Tailwind to Ant Design Conversion Guide

**Important**: Figma designs use **Tailwind CSS**, but our implementation uses **Ant Design**. All measurements must be converted.

---

## 📐 Spacing Conversion

### Tailwind → Ant Design Spacing

Ant Design uses an **8px base unit** for spacing (similar to Tailwind's 4px base, but doubled).

| Tailwind Class | Pixels | Ant Design Equivalent | Notes |
|---------------|--------|----------------------|-------|
| `p-1` | 4px | `padding: 4px` | Custom style |
| `p-2` | 8px | `padding: 8px` | Custom style |
| `p-3` | 12px | `padding: 12px` | Custom style |
| `p-4` | 16px | `padding: 16px` | Custom style |
| `p-6` | 24px | `padding: 24px` | Custom style |
| `px-4` | 16px | `paddingLeft: 16px, paddingRight: 16px` | Custom style |
| `py-3` | 12px | `paddingTop: 12px, paddingBottom: 12px` | Custom style |
| `gap-2` | 8px | `gap: 8px` (CSS Grid/Flexbox) | Custom style |
| `gap-3` | 12px | `gap: 12px` | Custom style |
| `gap-4` | 16px | `gap: 16px` | Custom style |
| `space-y-4` | 16px | `Space` component with `size={16}` or custom `marginBottom` | Use Ant Design Space |
| `mb-4` | 16px | `style={{ marginBottom: 16 }}` | Custom style |
| `mt-4` | 16px | `style={{ marginTop: 16 }}` | Custom style |

**Ant Design Spacing System:**
- Ant Design's `Space` component uses `size` prop: `small` (8px), `middle` (16px), `large` (24px)
- For custom values, use inline styles or CSS

---

## 🎨 Border Radius Conversion

| Tailwind Class | Pixels | Ant Design Equivalent |
|---------------|--------|----------------------|
| `rounded-lg` | 8px | `borderRadius: 8` | Custom style |
| `rounded-xl` | 12px | `borderRadius: 12` | Custom style |
| `rounded-2xl` | 16px | `borderRadius: 16` | **Style Guide Target** |
| `rounded-full` | 50% | `borderRadius: '50%'` | Custom style |

**Important**: 
- Figma uses `rounded-xl` (12px) for cards
- Style Guide specifies **16px** for cards
- **Decision**: Use **16px** (style guide) for cards, **10px** (style guide) for buttons

---

## 📏 Width/Height Conversion

| Tailwind Class | Pixels | Ant Design Equivalent |
|---------------|--------|----------------------|
| `w-4` | 16px | `width: 16` | Custom style |
| `w-5` | 20px | `width: 20` | Custom style |
| `h-9` | 36px | `style={{ height: 36 }}` | Custom style |
| `h-10` | 40px | `style={{ height: 40 }}` | Custom style |
| `max-w-7xl` | 1280px | `style={{ maxWidth: 1280 }}` | Custom style |
| `w-64` | 256px | `width: 256` | Custom style |

---

## 🔤 Typography Conversion

| Tailwind Class | Pixels | Ant Design Equivalent |
|---------------|--------|----------------------|
| `text-xs` | 12px | `Typography.Text` with `style={{ fontSize: 12 }}` |
| `text-sm` | 14px | `Typography.Text` (default is 14px) |
| `text-base` | 16px | `Typography.Text` with `style={{ fontSize: 16 }}` |
| `text-lg` | 18px | `Typography.Title level={5}` or `style={{ fontSize: 18 }}` |
| `text-xl` | 20px | `Typography.Title level={4}` or `style={{ fontSize: 20 }}` |
| `text-2xl` | 24px | `Typography.Title level={3}` or `style={{ fontSize: 24 }}` |
| `font-semibold` | 600 | `style={{ fontWeight: 600 }}` |

---

## 🎯 Component-Specific Conversions

### Cards

**Tailwind:**
```tsx
<div className="rounded-xl border border-gray-200 bg-white p-4">
```

**Ant Design:**
```tsx
<Card 
  style={{ 
    borderRadius: 16, // Use style guide value, not 12px
    padding: 16 
  }}
  bordered
>
```

### Buttons

**Tailwind:**
```tsx
<button className="h-9 text-sm rounded-lg">
```

**Ant Design:**
```tsx
<Button 
  style={{ 
    height: 36, // h-9 = 36px
    fontSize: 14, // text-sm = 14px
    borderRadius: 10 // Style guide value
  }}
>
```

### Grid Layout

**Tailwind:**
```tsx
<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
```

**Ant Design:**
```tsx
<Row gutter={[12, 12]}> {/* gap-3 = 12px */}
  <Col xs={24} md={12} lg={6}> {/* 4 columns on lg */}
```

### Spacing Between Elements

**Tailwind:**
```tsx
<div className="space-y-4">
```

**Ant Design:**
```tsx
<Space direction="vertical" size={16}> {/* space-y-4 = 16px */}
```

---

## 🎨 Color Conversion

**Tailwind Colors → Ant Design Theme Colors:**

| Tailwind | Hex | Ant Design | Notes |
|----------|-----|------------|-------|
| `bg-blue-600` | #2563EB | `primary` color | Use theme token |
| `bg-gray-50` | #F9FAFB | `#F9FAFB` | Custom background |
| `bg-gray-200` | #E5E7EB | `#E5E7EB` | Border color |
| `text-gray-900` | #111827 | `#111827` | Primary text |
| `text-gray-700` | #374151 | `#374151` | Secondary text |

**Better Approach**: Use Ant Design theme tokens or style guide colors:
- Patient Primary: `#1A8FE3`
- Background: `#F7FBFF`

---

## 📋 Implementation Strategy

### 1. Use Ant Design Components
- ✅ Use `<Card>` instead of `<div className="bg-white rounded-xl">`
- ✅ Use `<Button>` instead of `<button>`
- ✅ Use `<Row>` and `<Col>` instead of CSS Grid
- ✅ Use `<Space>` for spacing between elements
- ✅ Use `<Typography>` for text

### 2. Apply Custom Styles
- ✅ Use `style` prop for exact measurements from Figma
- ✅ Use CSS classes for reusable styles
- ✅ Override Ant Design defaults with custom values

### 3. Example Conversion

**Figma/Tailwind:**
```tsx
<div className="max-w-7xl mx-auto px-4 py-3 space-y-4">
  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Title</h2>
    </div>
  </div>
</div>
```

**Ant Design:**
```tsx
<div style={{ maxWidth: 1280, margin: '0 auto', padding: '12px 16px' }}>
  <Space direction="vertical" size={16}>
    <Row gutter={[12, 12]}>
      <Col xs={24} md={12} lg={6}>
        <Card 
          style={{ 
            borderRadius: 16, // Style guide value
            padding: 16 
          }}
          bordered
        >
          <Typography.Title 
            level={5} 
            style={{ 
              fontSize: 18, 
              fontWeight: 600, 
              marginBottom: 16 
            }}
          >
            Title
          </Typography.Title>
        </Card>
      </Col>
    </Row>
  </Space>
</div>
```

---

## ⚠️ Important Notes

1. **Border Radius**: Use style guide values (16px for cards, 10px for buttons), not Figma's 12px
2. **Spacing**: Ant Design uses 8px base, Tailwind uses 4px base - convert accordingly
3. **Components**: Always use Ant Design components, not raw HTML
4. **Theme**: Use Ant Design theme tokens where possible, custom colors from style guide
5. **Responsive**: Use Ant Design's `xs`, `sm`, `md`, `lg`, `xl` breakpoints in `Col` component

---

## 🔧 Quick Reference

### Common Conversions

```typescript
// Padding
p-4 → style={{ padding: 16 }}
px-4 → style={{ paddingLeft: 16, paddingRight: 16 }}
py-3 → style={{ paddingTop: 12, paddingBottom: 12 }}

// Margin
mb-4 → style={{ marginBottom: 16 }}
mt-4 → style={{ marginTop: 16 }}

// Gap
gap-3 → gutter={[12, 12]} or style={{ gap: 12 }}

// Border Radius
rounded-xl → style={{ borderRadius: 16 }} // Use style guide value

// Font Size
text-lg → style={{ fontSize: 18 }}
text-sm → style={{ fontSize: 14 }}

// Width/Height
h-9 → style={{ height: 36 }}
max-w-7xl → style={{ maxWidth: 1280 }}
```

---

**Last Updated**: January 18, 2026
