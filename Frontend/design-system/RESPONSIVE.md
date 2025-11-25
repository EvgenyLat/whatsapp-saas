# Responsive Design Guide

**Version:** 1.0.0
**Last Updated:** January 18, 2025

This document defines the responsive design strategy for the WhatsApp SaaS Platform frontend.

---

## Table of Contents

1. [Breakpoint System](#breakpoint-system)
2. [Mobile-First Approach](#mobile-first-approach)
3. [Layout Patterns](#layout-patterns)
4. [Component Responsiveness](#component-responsiveness)
5. [Typography Scaling](#typography-scaling)
6. [Touch Targets](#touch-targets)
7. [Images & Media](#images--media)
8. [Testing Guidelines](#testing-guidelines)

---

## Breakpoint System

### Defined Breakpoints

```css
/* Mobile devices (default) */
/* 0px - 639px */

/* Small tablets and large phones (landscape) */
@media (min-width: 640px) { /* sm */ }

/* Tablets (portrait) */
@media (min-width: 768px) { /* md */ }

/* Small laptops and tablets (landscape) */
@media (min-width: 1024px) { /* lg */ }

/* Desktops */
@media (min-width: 1280px) { /* xl */ }

/* Large desktops */
@media (min-width: 1536px) { /* 2xl */ }
```

### CSS Custom Properties

```css
:root {
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  --breakpoint-2xl: 1536px;
}
```

### Usage in Tailwind CSS

```html
<!-- Mobile first: default is mobile, then override for larger screens -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  <!-- Content -->
</div>
```

### Device Categories

| Category | Breakpoint | Screen Width | Orientation | Common Devices |
|----------|------------|--------------|-------------|----------------|
| Mobile | `< 640px` | 320px - 639px | Portrait | iPhone SE, iPhone 12, Galaxy S21 |
| Tablet (portrait) | `640px - 767px` | 640px - 767px | Portrait | iPad Mini, small tablets |
| Tablet (landscape) | `768px - 1023px` | 768px - 1023px | Landscape | iPad, Android tablets |
| Laptop | `1024px - 1279px` | 1024px - 1279px | - | 13" laptops, smaller displays |
| Desktop | `1280px - 1535px` | 1280px - 1535px | - | Standard monitors |
| Large Desktop | `≥ 1536px` | 1536px+ | - | 4K displays, ultrawide |

---

## Mobile-First Approach

### Philosophy

Design for mobile devices first, then progressively enhance for larger screens.

**Rationale:**
- Easier to expand features than to remove them
- Forces focus on essential content
- Better performance on mobile devices
- Simpler media query logic

### Example Pattern

```css
/* ✅ GOOD: Mobile first */
.card {
  padding: 1rem;        /* Mobile: 16px */
  font-size: 0.875rem;  /* Mobile: 14px */
}

@media (min-width: 768px) {
  .card {
    padding: 1.5rem;    /* Tablet: 24px */
    font-size: 1rem;    /* Tablet: 16px */
  }
}

@media (min-width: 1024px) {
  .card {
    padding: 2rem;      /* Desktop: 32px */
  }
}

/* ❌ BAD: Desktop first */
.card {
  padding: 2rem;
}

@media (max-width: 1024px) {
  .card {
    padding: 1.5rem;
  }
}

@media (max-width: 768px) {
  .card {
    padding: 1rem;
  }
}
```

---

## Layout Patterns

### 1. Sidebar Navigation

#### Mobile (< 640px)
```
┌──────────────────────┐
│  ☰ Logo      [User]  │ ← Header with hamburger menu
├──────────────────────┤
│                      │
│  Main Content        │
│                      │
│                      │
│                      │
└──────────────────────┘

Sidebar slides in from left when hamburger clicked
```

**CSS Implementation:**
```css
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: 80%; /* or 256px max */
  height: 100vh;
  transform: translateX(-100%); /* Hidden by default */
  transition: transform 0.3s ease;
  z-index: 1000;
}

.sidebar.open {
  transform: translateX(0); /* Visible when open */
}

.sidebar-overlay {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

.sidebar.open + .sidebar-overlay {
  display: block;
}

@media (min-width: 1024px) {
  .sidebar {
    transform: translateX(0); /* Always visible on desktop */
    position: static;
  }

  .sidebar-overlay {
    display: none !important;
  }
}
```

#### Tablet (640px - 1023px)
```
┌─────┬────────────────┐
│ [☰] │ Logo    [User] │ ← Collapsible sidebar
│─────┤                │
│ 🏠  │ Main Content   │
│ 📅  │                │
│ 💬  │                │
│ 📊  │                │
└─────┴────────────────┘

Sidebar shows icons only, expands on hover
```

**CSS Implementation:**
```css
@media (min-width: 640px) and (max-width: 1023px) {
  .sidebar {
    width: var(--sidebar-width-collapsed); /* 64px */
  }

  .sidebar-nav-text {
    display: none; /* Hide text labels */
  }

  .sidebar:hover {
    width: var(--sidebar-width); /* 256px */
  }

  .sidebar:hover .sidebar-nav-text {
    display: block;
  }
}
```

#### Desktop (≥ 1024px)
```
┌──────────┬──────────────────┐
│  Logo    │  Header  [User]  │
│──────────┤                  │
│ 🏠 Home  │  Main Content    │
│ 📅 Book  │                  │
│ 💬 Msgs  │                  │
│ 📊 Stats │                  │
└──────────┴──────────────────┘

Sidebar always visible with full width
```

### 2. Grid Layouts

#### Stats Cards

**Mobile (< 640px):** 1 column
```
┌─────────────────┐
│ Total Bookings  │
│ 1,247           │
└─────────────────┘
┌─────────────────┐
│ Active Chats    │
│ 12              │
└─────────────────┘
┌─────────────────┐
│ Response Rate   │
│ 95%             │
└─────────────────┘
```

**Tablet (640px - 1023px):** 2 columns
```
┌─────────────┐ ┌─────────────┐
│ Total       │ │ Active      │
│ Bookings    │ │ Chats       │
│ 1,247       │ │ 12          │
└─────────────┘ └─────────────┘
┌─────────────┐ ┌─────────────┐
│ Response    │ │ Messages    │
│ Rate 95%    │ │ Sent 542    │
└─────────────┘ └─────────────┘
```

**Desktop (≥ 1024px):** 4 columns
```
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│Total  │ │Active │ │Resp.  │ │Msgs   │
│Books  │ │Chats  │ │Rate   │ │Sent   │
│1,247  │ │12     │ │95%    │ │542    │
└───────┘ └───────┘ └───────┘ └───────┘
```

**CSS Implementation:**
```css
.stats-grid {
  display: grid;
  grid-template-columns: 1fr; /* Mobile: 1 column */
  gap: var(--spacing-4);
}

@media (min-width: 640px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr); /* Tablet: 2 columns */
  }
}

@media (min-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(4, 1fr); /* Desktop: 4 columns */
  }
}
```

### 3. Two-Column Content

#### Mobile: Stack Vertically
```
┌──────────────────┐
│ Main Content     │
│                  │
│                  │
└──────────────────┘
┌──────────────────┐
│ Sidebar Content  │
│                  │
└──────────────────┘
```

#### Desktop: Side by Side
```
┌──────────────┬────────┐
│ Main Content │Sidebar │
│              │Content │
│              │        │
└──────────────┴────────┘
```

**CSS Implementation:**
```css
.two-column {
  display: flex;
  flex-direction: column; /* Mobile: stack */
  gap: var(--spacing-6);
}

@media (min-width: 1024px) {
  .two-column {
    flex-direction: row; /* Desktop: side by side */
  }

  .two-column-main {
    flex: 2; /* 2/3 width */
  }

  .two-column-sidebar {
    flex: 1; /* 1/3 width */
  }
}
```

---

## Component Responsiveness

### Tables

#### Mobile: Card View
```html
<!-- Mobile: Each row becomes a card -->
<div class="table-card-mobile">
  <div class="table-card-row">
    <span class="label">Code:</span>
    <span class="value">ABC123</span>
  </div>
  <div class="table-card-row">
    <span class="label">Customer:</span>
    <span class="value">Maria Santos</span>
  </div>
  <div class="table-card-row">
    <span class="label">Service:</span>
    <span class="value">Hair Cut</span>
  </div>
  <div class="table-card-actions">
    <button>View</button>
    <button>Edit</button>
  </div>
</div>
```

```css
@media (max-width: 767px) {
  .table {
    display: none; /* Hide table on mobile */
  }

  .table-card-mobile {
    display: block;
  }
}

@media (min-width: 768px) {
  .table {
    display: table; /* Show table on tablet+ */
  }

  .table-card-mobile {
    display: none;
  }
}
```

#### Tablet+: Horizontal Scroll
```css
@media (min-width: 768px) and (max-width: 1023px) {
  .table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .table {
    min-width: 800px; /* Prevent column squishing */
  }

  /* Sticky first column */
  .table th:first-child,
  .table td:first-child {
    position: sticky;
    left: 0;
    background-color: var(--color-bg-primary);
    z-index: 1;
  }
}
```

### Modals

#### Mobile: Full Screen
```css
@media (max-width: 639px) {
  .modal {
    width: 100%;
    height: 100%;
    max-width: 100%;
    max-height: 100%;
    border-radius: 0;
    margin: 0;
  }

  .modal-body {
    max-height: calc(100vh - 120px); /* Account for header/footer */
  }
}
```

#### Desktop: Centered
```css
@media (min-width: 640px) {
  .modal {
    max-width: 32rem; /* 512px */
    border-radius: var(--radius-xl);
  }
}
```

### Forms

#### Mobile: Full Width Inputs
```css
.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.form-group input,
.form-group select {
  width: 100%;
}

/* Stack form actions vertically on mobile */
.form-actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.form-actions button {
  width: 100%;
}

@media (min-width: 640px) {
  /* Inline labels and inputs on tablet+ */
  .form-group-inline {
    flex-direction: row;
    align-items: center;
  }

  .form-group-inline label {
    width: 200px;
    flex-shrink: 0;
  }

  /* Horizontal button layout */
  .form-actions {
    flex-direction: row;
    justify-content: flex-end;
  }

  .form-actions button {
    width: auto;
  }
}
```

### Navigation Tabs

#### Mobile: Horizontal Scroll
```css
.tabs {
  display: flex;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none; /* Firefox */
}

.tabs::-webkit-scrollbar {
  display: none; /* Chrome, Safari */
}

.tab-item {
  flex-shrink: 0; /* Prevent tab shrinking */
  white-space: nowrap;
}
```

#### Desktop: Full Width
```css
@media (min-width: 768px) {
  .tabs {
    overflow-x: visible;
  }

  .tab-item {
    flex: 1; /* Equal width tabs */
  }
}
```

---

## Typography Scaling

### Fluid Typography

Use `clamp()` for smooth scaling between breakpoints:

```css
.heading-1 {
  /* min: 2rem (32px), preferred: 5vw, max: 3rem (48px) */
  font-size: clamp(2rem, 5vw, 3rem);
}

.heading-2 {
  font-size: clamp(1.5rem, 4vw, 2.25rem);
}

.body-text {
  font-size: clamp(0.875rem, 2vw, 1rem);
}
```

### Breakpoint-Based Scaling

```css
/* Mobile */
.heading-1 { font-size: var(--font-size-2xl); }
.heading-2 { font-size: var(--font-size-xl); }
.heading-3 { font-size: var(--font-size-lg); }

/* Tablet */
@media (min-width: 768px) {
  .heading-1 { font-size: var(--font-size-3xl); }
  .heading-2 { font-size: var(--font-size-2xl); }
  .heading-3 { font-size: var(--font-size-xl); }
}

/* Desktop */
@media (min-width: 1024px) {
  .heading-1 { font-size: var(--font-size-4xl); }
  .heading-2 { font-size: var(--font-size-3xl); }
  .heading-3 { font-size: var(--font-size-2xl); }
}
```

### Line Height Adjustments

```css
/* Tighter line height on mobile for better space utilization */
.body-text {
  line-height: 1.5;
}

@media (min-width: 768px) {
  .body-text {
    line-height: 1.625; /* More relaxed on larger screens */
  }
}
```

---

## Touch Targets

### Minimum Sizes

Per WCAG 2.1 guidelines and platform best practices:

- **Minimum touch target:** 44px × 44px (iOS) / 48px × 48px (Android)
- **Recommended:** 48px × 48px for all platforms
- **Comfortable:** 56px × 56px for primary actions

### Mobile Touch Target Sizes

```css
/* Mobile: Larger touch targets */
@media (max-width: 767px) {
  .button {
    min-height: 48px;
    min-width: 48px;
    padding: var(--spacing-3) var(--spacing-6);
  }

  .button-icon {
    width: 48px;
    height: 48px;
  }

  .input-checkbox,
  .input-radio {
    width: 24px;
    height: 24px; /* Larger tap area */
  }

  /* Increase spacing between interactive elements */
  .button-group .button {
    margin: var(--spacing-2);
  }
}

/* Desktop: Standard sizes */
@media (min-width: 768px) {
  .button {
    min-height: 40px;
  }

  .button-icon {
    width: 40px;
    height: 40px;
  }
}
```

### Touch Target Spacing

```css
/* Minimum 8px spacing between touch targets */
.interactive-list > * + * {
  margin-top: var(--spacing-2); /* 8px */
}

@media (max-width: 767px) {
  .interactive-list > * + * {
    margin-top: var(--spacing-3); /* 12px on mobile for easier tapping */
  }
}
```

---

## Images & Media

### Responsive Images

```html
<!-- Responsive image with srcset -->
<img
  src="image-800.jpg"
  srcset="
    image-400.jpg 400w,
    image-800.jpg 800w,
    image-1200.jpg 1200w,
    image-1600.jpg 1600w
  "
  sizes="
    (max-width: 640px) 100vw,
    (max-width: 1024px) 50vw,
    800px
  "
  alt="Salon interior"
  loading="lazy"
/>
```

### Background Images

```css
.hero {
  background-image: url('hero-mobile.jpg');
  background-size: cover;
  background-position: center;
}

@media (min-width: 768px) {
  .hero {
    background-image: url('hero-tablet.jpg');
  }
}

@media (min-width: 1280px) {
  .hero {
    background-image: url('hero-desktop.jpg');
  }
}
```

### Video Embeds

```html
<!-- Responsive video container -->
<div class="video-container">
  <iframe
    src="https://www.youtube.com/embed/..."
    frameborder="0"
    allowfullscreen
  ></iframe>
</div>
```

```css
.video-container {
  position: relative;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
  height: 0;
  overflow: hidden;
}

.video-container iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
```

---

## Testing Guidelines

### Device Testing Matrix

| Device Type | Screen Size | Browser | OS |
|-------------|-------------|---------|-----|
| iPhone SE | 375 × 667 | Safari | iOS 15+ |
| iPhone 12/13 | 390 × 844 | Safari | iOS 15+ |
| iPhone 14 Pro Max | 430 × 932 | Safari | iOS 16+ |
| Samsung Galaxy S21 | 360 × 800 | Chrome | Android 11+ |
| iPad Mini | 768 × 1024 | Safari | iPadOS 15+ |
| iPad Pro 12.9" | 1024 × 1366 | Safari | iPadOS 15+ |
| MacBook Air 13" | 1440 × 900 | Chrome, Safari | macOS |
| Desktop 1080p | 1920 × 1080 | Chrome, Firefox, Edge | Windows/macOS |
| Desktop 4K | 3840 × 2160 | Chrome | Windows/macOS |

### Testing Checklist

#### Layout
- [ ] Sidebar navigation works on all breakpoints
- [ ] Content doesn't overflow horizontally
- [ ] Grids adapt correctly (1 → 2 → 4 columns)
- [ ] Spacing is consistent across breakpoints
- [ ] No overlapping elements

#### Typography
- [ ] Text is readable at all sizes (min 14px body text on mobile)
- [ ] Headings scale appropriately
- [ ] Line length is comfortable (45-75 characters)
- [ ] Line height provides good readability

#### Touch Targets
- [ ] All buttons are at least 48px × 48px on mobile
- [ ] Sufficient spacing between interactive elements (min 8px)
- [ ] Links in text are easy to tap
- [ ] Form inputs are easy to tap and fill

#### Images & Media
- [ ] Images scale correctly without distortion
- [ ] Images load appropriate size for viewport
- [ ] Videos are responsive
- [ ] Icons are crisp on all displays (use SVG)

#### Forms
- [ ] Inputs are full width on mobile
- [ ] Labels are clearly associated with inputs
- [ ] Error messages are visible
- [ ] Keyboard opens appropriate type (email, number, etc.)
- [ ] Submit buttons are accessible

#### Performance
- [ ] Page loads in under 3 seconds on 3G
- [ ] Images are optimized and lazy-loaded
- [ ] Critical CSS is inlined
- [ ] No layout shift (CLS < 0.1)

### Browser Testing Tools

**Chrome DevTools:**
- Device toolbar (Cmd/Ctrl + Shift + M)
- Responsive design mode
- Network throttling (Fast 3G, Slow 3G)

**Firefox DevTools:**
- Responsive Design Mode (Cmd/Ctrl + Shift + M)

**Safari:**
- Enter Responsive Design Mode (Develop → Enter Responsive Design Mode)
- Test on actual iOS devices

**Online Tools:**
- BrowserStack (cross-browser testing)
- LambdaTest (cross-browser testing)
- ResponsivelyApp (open-source responsive testing tool)

### Automated Testing

```javascript
// Example: Cypress viewport testing
describe('Responsive Design', () => {
  const viewports = [
    { device: 'iphone-x', width: 375, height: 812 },
    { device: 'ipad-2', width: 768, height: 1024 },
    { device: 'desktop', width: 1280, height: 720 }
  ];

  viewports.forEach(({ device, width, height }) => {
    it(`should display correctly on ${device}`, () => {
      cy.viewport(width, height);
      cy.visit('/dashboard');

      // Test layout
      cy.get('.sidebar').should('be.visible');
      cy.get('.stats-grid').should('exist');

      // Test touch targets on mobile
      if (width < 768) {
        cy.get('button').each($btn => {
          expect($btn.height()).to.be.at.least(48);
        });
      }
    });
  });
});
```

---

## Common Responsive Patterns

### 1. Container Query Pattern (Future)

When container queries are widely supported:

```css
.card-container {
  container-type: inline-size;
}

@container (min-width: 400px) {
  .card {
    display: flex;
  }
}
```

### 2. CSS Grid Auto-Fit

```css
.auto-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-4);
}
```

### 3. Flexbox Wrap

```css
.flex-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-4);
}

.flex-wrap > * {
  flex: 1 1 250px; /* Grow, shrink, min-width */
}
```

---

## Performance Considerations

### Critical CSS

Inline critical CSS for above-the-fold content:

```html
<head>
  <style>
    /* Critical CSS for mobile layout */
    body { margin: 0; font-family: var(--font-family-sans); }
    .header { height: 64px; }
    /* ... */
  </style>

  <link rel="preload" href="styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
</head>
```

### Lazy Loading

```html
<!-- Lazy load images below the fold -->
<img src="image.jpg" loading="lazy" alt="Description">

<!-- Lazy load iframes -->
<iframe src="..." loading="lazy"></iframe>
```

### Reduce Motion

Respect user preference for reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Accessibility & Responsiveness

### Screen Reader Announcements

```html
<!-- Announce layout changes to screen readers -->
<div role="status" aria-live="polite" class="sr-only">
  Navigation menu opened
</div>
```

### Focus Management

```javascript
// When opening mobile menu, focus first item
const mobileMenu = document.querySelector('.mobile-menu');
const firstMenuItem = mobileMenu.querySelector('a');

mobileMenu.classList.add('open');
firstMenuItem.focus();
```

### Skip Links

```html
<!-- Allow keyboard users to skip navigation -->
<a href="#main-content" class="skip-link">
  Skip to main content
</a>
```

```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--color-primary-500);
  color: white;
  padding: 8px;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```

---

**End of Responsive Design Guide**
