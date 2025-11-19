# NexaCare Responsive Design Guide

## Overview
This guide documents the responsive design implementation for NexaCare dashboards, ensuring optimal user experience across mobile, tablet, and desktop devices.

## Breakpoints

```typescript
const BREAKPOINTS = {
  mobile: 768,    // < 768px
  tablet: 1024,   // 768px - 1024px
  desktop: 1280,  // ≥ 1024px
};
```

## Responsive Hook

Use the `useResponsive` hook to detect screen size:

```typescript
import { useResponsive } from '../../hooks/use-responsive';

const { isMobile, isTablet, isDesktop, screenSize } = useResponsive();
```

## Implementation Patterns

### 1. Sidebar Navigation

**Desktop/Tablet:**
- Fixed sidebar (260px expanded, 80px collapsed)
- Collapsible with toggle button
- Position: fixed, left: 0

**Mobile:**
- Hidden fixed sidebar
- Drawer component (260px width)
- Opens from left on hamburger menu click
- Closes on menu item click or backdrop tap

```typescript
{!isMobile && (
  <Sider collapsible collapsed={collapsed} ...>
    <SidebarContent />
  </Sider>
)}

{isMobile && (
  <Drawer
    placement="left"
    open={mobileDrawerOpen}
    onClose={() => setMobileDrawerOpen(false)}
  >
    <SidebarContent onMenuClick={() => setMobileDrawerOpen(false)} />
  </Drawer>
)}
```

### 2. KPI Cards

**Desktop:**
```tsx
<Col xs={24} sm={12} md={6}>
  <KpiCard {...props} />
</Col>
```

**Mobile:**
```tsx
{isMobile ? (
  <div style={{ 
    display: 'flex', 
    overflowX: 'auto', 
    gap: 12,
    scrollSnapType: 'x mandatory',
  }}>
    {kpis.map((kpi, idx) => (
      <div key={idx} style={{ minWidth: 200, scrollSnapAlign: 'start' }}>
        <KpiCard {...kpi} />
      </div>
    ))}
  </div>
) : (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={12} md={6}>...</Col>
  </Row>
)}
```

### 3. Quick Actions

**Responsive Grid:**
```tsx
<Row gutter={[16, 16]}>
  <Col xs={24} sm={12} md={6}>
    <QuickActionTile {...props} />
  </Col>
</Row>
```

- Mobile (xs={24}): Full width, stacked
- Tablet (sm={12}): 2 columns
- Desktop (md={6}): 4 columns

### 4. Content Padding

```typescript
padding: isMobile ? '12px 16px' : isTablet ? '16px 20px' : '16px 24px 24px'
```

### 5. Mobile Header

```tsx
{isMobile && (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <Button
      type="text"
      icon={<MenuUnfoldOutlined />}
      onClick={() => setMobileDrawerOpen(true)}
    />
    <Title level={4} style={{ margin: 0 }}>Dashboard</Title>
    <div style={{ width: 32 }} /> {/* Spacer */}
  </div>
)}
```

## Form Value Preservation

For multi-step forms, render all fields but hide inactive steps:

```tsx
<Form preserve={true}>
  {steps.map((step, index) => (
    <div key={index} style={{ display: currentStep === index ? 'block' : 'none' }}>
      {step.content}
    </div>
  ))}
</Form>
```

This ensures Ant Design Form preserves values across steps.

## Tables

For tables on mobile:
- Use horizontal scroll wrapper
- Or stack columns vertically
- Or use card-based layout instead

```tsx
<div style={{ overflowX: 'auto' }}>
  <Table
    scroll={{ x: 'max-content' }}
    columns={columns}
    dataSource={data}
  />
</div>
```

## Status by Dashboard

- ✅ **Patient Dashboard**: Fully responsive
- ⏳ **Doctor Dashboard**: Responsive pending
- ⏳ **Receptionist Dashboard**: Responsive pending
- ⏳ **Hospital Admin Dashboard**: Responsive pending
- ⏳ **Lab Technician Dashboard**: Responsive pending

## Testing Checklist

- [ ] Sidebar drawer opens/closes on mobile
- [ ] KPI cards scroll horizontally on mobile
- [ ] Quick actions stack on mobile
- [ ] Content padding adjusts per breakpoint
- [ ] Tables are scrollable or stack on mobile
- [ ] Forms preserve values across steps
- [ ] Touch targets are at least 44x44px
- [ ] No horizontal scrolling on mobile
- [ ] Text is readable at all sizes
- [ ] Buttons are easily tappable on mobile

## Best Practices

1. **Mobile-First**: Design for mobile, enhance for larger screens
2. **Touch Targets**: Minimum 44x44px for interactive elements
3. **Readable Text**: Minimum 14px font size on mobile
4. **Performance**: Lazy load heavy components on mobile
5. **Testing**: Test on real devices, not just browser dev tools
6. **Progressive Enhancement**: Core functionality works on all devices

