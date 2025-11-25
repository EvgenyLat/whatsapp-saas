# Accessibility Guide (WCAG 2.1 AA)

**Version:** 1.0.0
**Last Updated:** January 18, 2025
**Standard:** WCAG 2.1 Level AA

This document provides comprehensive accessibility guidelines to ensure the WhatsApp SaaS Platform is usable by everyone, including people with disabilities.

---

## Table of Contents

1. [Overview & Principles](#overview--principles)
2. [Color & Contrast](#color--contrast)
3. [Keyboard Navigation](#keyboard-navigation)
4. [Screen Readers](#screen-readers)
5. [Focus Management](#focus-management)
6. [Forms & Input](#forms--input)
7. [Images & Media](#images--media)
8. [Interactive Components](#interactive-components)
9. [Testing & Validation](#testing--validation)
10. [WCAG 2.1 AA Checklist](#wcag-21-aa-checklist)

---

## Overview & Principles

### POUR Principles

#### Perceivable
Information and user interface components must be presentable to users in ways they can perceive.

#### Operable
User interface components and navigation must be operable.

#### Understandable
Information and the operation of user interface must be understandable.

#### Robust
Content must be robust enough to be interpreted by a wide variety of user agents, including assistive technologies.

### Target Compliance

- **Level A:** Minimum level (all criteria must be met)
- **Level AA:** Mid-range level (TARGET - all Level A and AA criteria must be met)
- **Level AAA:** Highest level (optional enhancements)

---

## Color & Contrast

### Contrast Ratios (WCAG 2.1 AA)

#### Text Contrast Requirements

| Text Type | Minimum Ratio | Example |
|-----------|---------------|---------|
| Normal text (< 18px) | 4.5:1 | Body text on background |
| Large text (≥ 18px or 14px bold) | 3:1 | Headings, buttons |
| UI components (borders, icons) | 3:1 | Input borders, icons |

#### Our Color Palette Compliance

**Text on White Background:**
```css
/* ✅ PASS: 4.5:1+ ratio */
--color-text-primary: #111827;    /* 16.1:1 */
--color-text-secondary: #6B7280;  /* 4.6:1 */
--color-primary-700: #17873F;     /* 4.9:1 */

/* ❌ FAIL: Below 4.5:1 */
--color-primary-400: #4ACC91;     /* 2.1:1 - Only use for large text */
```

**White Text on Primary Background:**
```css
/* ✅ PASS: 4.5:1+ ratio */
--color-primary-500: #25D366; /* 2.9:1 for normal, OK for large text */
--color-primary-600: #1EAD52; /* 3.8:1 - Use for 18px+ text */
--color-primary-700: #17873F; /* 4.9:1 - Safe for all text sizes */
```

### Color Contrast Testing

```javascript
// Example: Check contrast ratio
function getContrastRatio(foreground, background) {
  const l1 = getRelativeLuminance(foreground);
  const l2 = getRelativeLuminance(background);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

// Usage
const ratio = getContrastRatio('#111827', '#FFFFFF');
console.log(`Contrast ratio: ${ratio.toFixed(2)}:1`);
// Output: Contrast ratio: 16.10:1 ✅
```

### Color Independence

**Never rely on color alone to convey information.**

❌ **Bad:**
```html
<span style="color: red;">Error: Invalid input</span>
```

✅ **Good:**
```html
<span class="error">
  <svg aria-hidden="true"><use href="#icon-error"/></svg>
  <span>Error: Invalid input</span>
</span>
```

### Status Indicators

Always combine color with text, icons, or patterns:

```html
<!-- ✅ Booking status with icon + color + text -->
<span class="status-badge confirmed">
  <svg aria-hidden="true" class="icon">
    <use href="#icon-check"/>
  </svg>
  <span>Confirmed</span>
</span>

<span class="status-badge pending">
  <svg aria-hidden="true" class="icon">
    <use href="#icon-clock"/>
  </svg>
  <span>Pending</span>
</span>

<span class="status-badge cancelled">
  <svg aria-hidden="true" class="icon">
    <use href="#icon-x"/>
  </svg>
  <span>Cancelled</span>
</span>
```

---

## Keyboard Navigation

### Focus Order

**Logical tab order:** Left-to-right, top-to-bottom

```html
<!-- Correct tab order -->
<form>
  <input tabindex="0"> <!-- 1st -->
  <input tabindex="0"> <!-- 2nd -->
  <button tabindex="0"> <!-- 3rd -->
</form>

<!-- ❌ Avoid using positive tabindex values -->
<input tabindex="1">  <!-- Bad practice -->
<input tabindex="2">  <!-- Bad practice -->
```

### Keyboard Shortcuts

| Action | Key | Component |
|--------|-----|-----------|
| Navigate forward | Tab | All focusable elements |
| Navigate backward | Shift + Tab | All focusable elements |
| Activate button/link | Enter or Space | Buttons, links |
| Close modal/menu | Escape | Modals, dropdowns, menus |
| Open dropdown | Arrow Down | Select dropdowns |
| Select option | Arrow Up/Down | Dropdowns, radio groups |
| Toggle checkbox | Space | Checkboxes |

### Keyboard Navigation Implementation

```javascript
// Example: Escape to close modal
const modal = document.querySelector('.modal');

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.classList.contains('open')) {
    closeModal();
  }
});

// Example: Arrow key navigation in dropdown
const dropdownItems = document.querySelectorAll('.dropdown-item');
let currentIndex = 0;

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') {
    currentIndex = (currentIndex + 1) % dropdownItems.length;
    dropdownItems[currentIndex].focus();
  } else if (e.key === 'ArrowUp') {
    currentIndex = (currentIndex - 1 + dropdownItems.length) % dropdownItems.length;
    dropdownItems[currentIndex].focus();
  }
});
```

### Skip Links

Provide skip navigation for keyboard users:

```html
<body>
  <a href="#main-content" class="skip-link">
    Skip to main content
  </a>
  <a href="#navigation" class="skip-link">
    Skip to navigation
  </a>

  <nav id="navigation">...</nav>

  <main id="main-content">...</main>
</body>
```

```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--color-primary-500);
  color: white;
  padding: var(--spacing-2) var(--spacing-4);
  text-decoration: none;
  border-radius: var(--radius-md);
  z-index: 100;
  transition: top var(--transition-base);
}

.skip-link:focus {
  top: var(--spacing-2);
}
```

---

## Screen Readers

### Semantic HTML

**Use proper HTML elements for their intended purpose.**

✅ **Good:**
```html
<button>Submit</button>
<a href="/page">Link</a>
<nav>...</nav>
<main>...</main>
<article>...</article>
```

❌ **Bad:**
```html
<div onclick="submit()">Submit</div>
<span onclick="navigate()">Link</span>
<div class="nav">...</div>
```

### ARIA Labels

**ARIA (Accessible Rich Internet Applications) attributes enhance accessibility.**

#### Common ARIA Attributes

| Attribute | Purpose | Example |
|-----------|---------|---------|
| `aria-label` | Provides accessible name | `<button aria-label="Close modal">×</button>` |
| `aria-labelledby` | References element as label | `<div aria-labelledby="title-id">` |
| `aria-describedby` | References descriptive text | `<input aria-describedby="error-msg">` |
| `aria-hidden` | Hides from screen readers | `<svg aria-hidden="true">` |
| `aria-live` | Announces dynamic content | `<div aria-live="polite">` |
| `aria-expanded` | Indicates expanded state | `<button aria-expanded="false">` |
| `aria-current` | Indicates current item | `<a aria-current="page">` |

#### ARIA Examples

**Icon Button:**
```html
<!-- ✅ Accessible icon button -->
<button aria-label="Delete booking" class="button-icon">
  <svg aria-hidden="true">
    <use href="#icon-trash"/>
  </svg>
</button>

<!-- ❌ No accessible name -->
<button class="button-icon">
  <svg>
    <use href="#icon-trash"/>
  </svg>
</button>
```

**Expandable Section:**
```html
<button
  aria-expanded="false"
  aria-controls="details-panel"
  onclick="togglePanel()"
>
  Show Details
</button>

<div id="details-panel" hidden>
  <!-- Details content -->
</div>
```

**Live Regions:**
```html
<!-- Polite: Announces when screen reader is idle -->
<div aria-live="polite" aria-atomic="true">
  Booking created successfully
</div>

<!-- Assertive: Announces immediately (use sparingly) -->
<div aria-live="assertive" aria-atomic="true">
  Error: Failed to save changes
</div>
```

### Screen Reader Only Text

**Provide additional context for screen reader users:**

```html
<style>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>

<!-- Example usage -->
<button>
  <svg aria-hidden="true"><use href="#icon-edit"/></svg>
  <span class="sr-only">Edit booking</span>
</button>

<a href="/dashboard">
  Dashboard
  <span class="sr-only">(current page)</span>
</a>
```

### Page Structure

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Dashboard - WhatsApp SaaS Platform</title>
</head>
<body>
  <a href="#main-content" class="skip-link">Skip to main content</a>

  <header role="banner">
    <nav aria-label="Main navigation">
      <!-- Navigation links -->
    </nav>
  </header>

  <main id="main-content" role="main">
    <h1>Dashboard</h1>
    <!-- Main content -->
  </main>

  <aside aria-label="Related information">
    <!-- Sidebar content -->
  </aside>

  <footer role="contentinfo">
    <!-- Footer content -->
  </footer>
</body>
</html>
```

---

## Focus Management

### Visible Focus Indicators

**All interactive elements MUST have visible focus indicators.**

```css
/* Default focus styles for all interactive elements */
a:focus,
button:focus,
input:focus,
select:focus,
textarea:focus {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
}

/* Enhanced focus for buttons */
.button:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
  box-shadow: var(--shadow-focus-primary);
}

/* Never remove focus without providing alternative */
/* ❌ Bad */
button:focus {
  outline: none;
}

/* ✅ Good - Custom focus style */
button:focus-visible {
  outline: 3px solid var(--color-primary-500);
  outline-offset: 2px;
}
```

### Focus Trapping

**Trap focus within modals:**

```javascript
function trapFocus(element) {
  const focusableElements = element.querySelectorAll(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  element.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift + Tab: Moving backward
      if (document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    } else {
      // Tab: Moving forward
      if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  });

  // Focus first element when modal opens
  firstElement.focus();
}

// Usage
const modal = document.querySelector('.modal');
trapFocus(modal);
```

### Focus Restoration

**Restore focus when closing modals or navigating:**

```javascript
let previousFocus;

function openModal() {
  // Store current focus
  previousFocus = document.activeElement;

  // Open modal and trap focus
  modal.classList.add('open');
  trapFocus(modal);
}

function closeModal() {
  // Close modal
  modal.classList.remove('open');

  // Restore previous focus
  if (previousFocus) {
    previousFocus.focus();
  }
}
```

---

## Forms & Input

### Form Labels

**Every input MUST have an associated label.**

✅ **Good:**
```html
<!-- Explicit label association -->
<label for="email">Email Address</label>
<input type="email" id="email" name="email">

<!-- Implicit label association -->
<label>
  Email Address
  <input type="email" name="email">
</label>

<!-- ARIA label (use sparingly) -->
<input type="search" aria-label="Search bookings">
```

❌ **Bad:**
```html
<!-- No label -->
<input type="email" placeholder="Email">

<!-- Placeholder is not a label -->
<input type="email" placeholder="Enter your email">
```

### Required Fields

**Clearly indicate required fields:**

```html
<label for="name">
  Full Name
  <span aria-label="required">*</span>
</label>
<input type="text" id="name" required aria-required="true">

<!-- Or use screen reader text -->
<label for="email">
  Email Address
  <span class="sr-only">(required)</span>
</label>
<input type="email" id="email" required aria-required="true">
```

```css
/* Visual indicator for required fields */
.input-label.required::after {
  content: ' *';
  color: var(--color-error-500);
}
```

### Error Messages

**Associate error messages with inputs:**

```html
<div class="form-group">
  <label for="email">Email Address</label>
  <input
    type="email"
    id="email"
    aria-invalid="true"
    aria-describedby="email-error"
    class="error"
  >
  <span id="email-error" class="error-message" role="alert">
    Please enter a valid email address
  </span>
</div>
```

```javascript
// Announce errors to screen readers
function showError(inputId, errorMessage) {
  const input = document.getElementById(inputId);
  const errorElement = document.getElementById(`${inputId}-error`);

  input.setAttribute('aria-invalid', 'true');
  input.classList.add('error');

  errorElement.textContent = errorMessage;
  errorElement.setAttribute('role', 'alert'); // Announces immediately
}
```

### Input Types

**Use appropriate input types:**

```html
<!-- Email -->
<input type="email" autocomplete="email">

<!-- Phone -->
<input type="tel" autocomplete="tel">

<!-- Number -->
<input type="number" min="0" max="100" step="1">

<!-- Date -->
<input type="date">

<!-- Search -->
<input type="search" aria-label="Search">

<!-- Password -->
<input type="password" autocomplete="current-password">
```

### Autocomplete

**Enable autofill for common fields:**

```html
<form>
  <input type="text" name="name" autocomplete="name">
  <input type="email" name="email" autocomplete="email">
  <input type="tel" name="phone" autocomplete="tel">

  <!-- Address fields -->
  <input type="text" name="street" autocomplete="street-address">
  <input type="text" name="city" autocomplete="address-level2">
  <input type="text" name="state" autocomplete="address-level1">
  <input type="text" name="zip" autocomplete="postal-code">
  <input type="text" name="country" autocomplete="country-name">
</form>
```

### Fieldsets & Legends

**Group related inputs:**

```html
<fieldset>
  <legend>Contact Information</legend>

  <label for="phone">Phone</label>
  <input type="tel" id="phone">

  <label for="email">Email</label>
  <input type="email" id="email">
</fieldset>

<fieldset>
  <legend>Notification Preferences</legend>

  <label>
    <input type="checkbox" name="email-notifications">
    Email notifications
  </label>

  <label>
    <input type="checkbox" name="sms-notifications">
    SMS notifications
  </label>
</fieldset>
```

---

## Images & Media

### Alternative Text

**Every image must have alt text:**

✅ **Good:**
```html
<!-- Informative image -->
<img src="salon-interior.jpg" alt="Modern hair salon with three styling stations">

<!-- Functional image (link/button) -->
<a href="/home">
  <img src="logo.svg" alt="WhatsApp SaaS Platform home">
</a>

<!-- Decorative image -->
<img src="decorative-pattern.svg" alt="" aria-hidden="true">
```

❌ **Bad:**
```html
<!-- Missing alt -->
<img src="image.jpg">

<!-- Redundant alt -->
<a href="/profile">
  <img src="profile-icon.svg" alt="Profile icon">
  Profile
</a>
<!-- Screen reader would say "Profile icon Profile" -->
```

### Complex Images

**Provide long descriptions for charts and diagrams:**

```html
<figure>
  <img src="sales-chart.png" alt="Sales trend chart" aria-describedby="chart-description">
  <figcaption id="chart-description">
    Line chart showing sales growth from January to December 2024.
    Sales increased from $10,000 in January to $45,000 in December,
    with the largest jump occurring between June and August.
  </figcaption>
</figure>
```

### Video & Audio

**Provide captions and transcripts:**

```html
<video controls>
  <source src="tutorial.mp4" type="video/mp4">
  <track kind="captions" src="captions-en.vtt" srclang="en" label="English">
  <track kind="captions" src="captions-pt.vtt" srclang="pt" label="Português">
</video>

<!-- Transcript -->
<details>
  <summary>Read transcript</summary>
  <p>In this tutorial, we'll show you how to...</p>
</details>
```

---

## Interactive Components

### Buttons

```html
<!-- ✅ Clear purpose -->
<button type="submit">Create Booking</button>
<button type="button">Cancel</button>

<!-- ✅ Icon with text -->
<button>
  <svg aria-hidden="true"><use href="#icon-plus"/></svg>
  Add New
</button>

<!-- ✅ Icon only with label -->
<button aria-label="Close modal">
  <svg aria-hidden="true"><use href="#icon-x"/></svg>
</button>

<!-- ❌ Vague purpose -->
<button>Click here</button>
<button>Submit</button> <!-- Submit what? -->
```

### Links

```html
<!-- ✅ Descriptive link text -->
<a href="/documentation">Read the documentation</a>
<a href="/pricing">View pricing plans</a>

<!-- ❌ Non-descriptive -->
<a href="/docs">Click here</a>
<a href="/pricing">Learn more</a>

<!-- ✅ Context for screen readers -->
<a href="/article-123">
  Read more
  <span class="sr-only">about WhatsApp Business API setup</span>
</a>
```

### Dropdowns

```html
<div class="dropdown">
  <button
    aria-expanded="false"
    aria-haspopup="true"
    aria-controls="user-menu"
    onclick="toggleMenu()"
  >
    User Menu
    <svg aria-hidden="true"><use href="#icon-chevron-down"/></svg>
  </button>

  <ul id="user-menu" role="menu" hidden>
    <li role="none">
      <a href="/profile" role="menuitem">Profile</a>
    </li>
    <li role="none">
      <a href="/settings" role="menuitem">Settings</a>
    </li>
    <li role="none">
      <a href="/logout" role="menuitem">Logout</a>
    </li>
  </ul>
</div>
```

### Modals/Dialogs

```html
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  class="modal"
>
  <div class="modal-content">
    <h2 id="modal-title">Confirm Deletion</h2>

    <p>Are you sure you want to delete this booking?</p>

    <div class="modal-actions">
      <button onclick="closeModal()">Cancel</button>
      <button onclick="confirmDelete()">Delete</button>
    </div>
  </div>
</div>
```

### Tabs

```html
<div class="tabs">
  <div role="tablist" aria-label="Dashboard sections">
    <button
      role="tab"
      aria-selected="true"
      aria-controls="overview-panel"
      id="overview-tab"
    >
      Overview
    </button>
    <button
      role="tab"
      aria-selected="false"
      aria-controls="analytics-panel"
      id="analytics-tab"
    >
      Analytics
    </button>
  </div>

  <div
    role="tabpanel"
    id="overview-panel"
    aria-labelledby="overview-tab"
  >
    <!-- Overview content -->
  </div>

  <div
    role="tabpanel"
    id="analytics-panel"
    aria-labelledby="analytics-tab"
    hidden
  >
    <!-- Analytics content -->
  </div>
</div>
```

---

## Testing & Validation

### Automated Testing Tools

#### Browser Extensions
- **axe DevTools** (Chrome, Firefox) - Comprehensive accessibility scanner
- **WAVE** (Chrome, Firefox, Edge) - Visual accessibility checker
- **Lighthouse** (Chrome DevTools) - Includes accessibility audit

#### Command-Line Tools
```bash
# pa11y - Automated accessibility testing
npm install -g pa11y
pa11y https://example.com

# axe-core CLI
npm install -g @axe-core/cli
axe https://example.com
```

#### Integration Testing

```javascript
// Example: Jest + axe-core
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('Component should have no accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Manual Testing

#### Keyboard Testing
1. Unplug mouse
2. Use only Tab, Shift+Tab, Enter, Space, Arrow keys, Escape
3. Verify all functionality is accessible
4. Check focus indicators are visible

#### Screen Reader Testing

**macOS: VoiceOver**
```
Cmd + F5          - Toggle VoiceOver
Ctrl + Option + → - Navigate forward
Ctrl + Option + ← - Navigate backward
```

**Windows: NVDA (free)**
```
Ctrl + Alt + N    - Start NVDA
Insert + ↓        - Browse mode
Tab               - Navigate between elements
```

**Screen Reader Checklist:**
- [ ] Page title is announced
- [ ] Landmarks are identified
- [ ] Headings are announced with level
- [ ] Links are descriptive
- [ ] Form labels are announced
- [ ] Errors are announced
- [ ] Dynamic content updates are announced

### User Testing

**Include people with disabilities in your testing:**
- Visual impairments (blind, low vision, color blind)
- Motor impairments (limited use of hands)
- Cognitive impairments
- Hearing impairments

---

## WCAG 2.1 AA Checklist

### Perceivable

#### 1.1 Text Alternatives
- [ ] All images have alt text
- [ ] Decorative images use `alt=""` or `aria-hidden="true"`
- [ ] Complex images have long descriptions

#### 1.2 Time-based Media
- [ ] Videos have captions
- [ ] Audio content has transcripts
- [ ] Video content has audio descriptions (if needed)

#### 1.3 Adaptable
- [ ] Content can be presented in different ways without losing information
- [ ] Semantic HTML is used (`<nav>`, `<main>`, `<button>`, etc.)
- [ ] Content order makes sense when CSS is disabled
- [ ] Form inputs have associated labels

#### 1.4 Distinguishable
- [ ] Color is not the only visual means of conveying information
- [ ] Text contrast meets 4.5:1 (normal) or 3:1 (large)
- [ ] Text can be resized up to 200% without loss of functionality
- [ ] Images of text are avoided (use real text)
- [ ] Content can be viewed without horizontal scrolling at 320px width

### Operable

#### 2.1 Keyboard Accessible
- [ ] All functionality is available via keyboard
- [ ] No keyboard traps
- [ ] Keyboard shortcuts don't conflict with assistive technology

#### 2.2 Enough Time
- [ ] Users can extend or disable time limits
- [ ] Auto-updating content can be paused or hidden
- [ ] Users are warned of session timeouts

#### 2.3 Seizures
- [ ] Nothing flashes more than 3 times per second
- [ ] No content causes seizures

#### 2.4 Navigable
- [ ] Skip links are provided
- [ ] Page titles are descriptive and unique
- [ ] Focus order is logical
- [ ] Link purpose is clear from link text
- [ ] Multiple ways to find pages (search, sitemap, navigation)
- [ ] Headings and labels describe topic or purpose
- [ ] Focus indicator is visible

#### 2.5 Input Modalities
- [ ] Touch targets are at least 44x44px (mobile)
- [ ] Functionality that uses motion can be operated by UI components
- [ ] Accidental activation is prevented

### Understandable

#### 3.1 Readable
- [ ] Page language is defined (`<html lang="pt-BR">`)
- [ ] Language changes are marked up (`<span lang="en">`)

#### 3.2 Predictable
- [ ] Focus doesn't cause unexpected context changes
- [ ] Input doesn't cause unexpected context changes
- [ ] Navigation is consistent across pages
- [ ] Components with same functionality are labeled consistently

#### 3.3 Input Assistance
- [ ] Form errors are identified and described
- [ ] Form labels and instructions are provided
- [ ] Error suggestions are provided when possible
- [ ] Errors can be prevented or reversed (especially for legal/financial transactions)

### Robust

#### 4.1 Compatible
- [ ] HTML is valid (passes W3C validation)
- [ ] Name, role, value are programmatically determined for all UI components
- [ ] Status messages can be programmatically determined

---

## Quick Reference

### Essential ARIA Roles

```html
<!-- Navigation -->
<nav role="navigation">

<!-- Main content -->
<main role="main">

<!-- Complementary content -->
<aside role="complementary">

<!-- Search -->
<div role="search">

<!-- Alert -->
<div role="alert">

<!-- Dialog -->
<div role="dialog" aria-modal="true">

<!-- Menu -->
<ul role="menu">
  <li role="menuitem">

<!-- Tab interface -->
<div role="tablist">
  <button role="tab">
<div role="tabpanel">
```

### Common ARIA States

```html
aria-expanded="true|false"     <!-- Expandable elements -->
aria-selected="true|false"     <!-- Selected items (tabs, options) -->
aria-checked="true|false|mixed" <!-- Checkboxes -->
aria-pressed="true|false"      <!-- Toggle buttons -->
aria-disabled="true|false"     <!-- Disabled elements -->
aria-hidden="true|false"       <!-- Hidden from screen readers -->
aria-invalid="true|false"      <!-- Invalid form inputs -->
aria-current="page|step|true"  <!-- Current item in navigation -->
```

---

## Resources

### Official Guidelines
- [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

### Testing Tools
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE](https://wave.webaim.org/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Color Contrast Checker](https://webaim.org/resources/contrastchecker/)

### Screen Readers
- [NVDA](https://www.nvaccess.org/) (Windows, free)
- [JAWS](https://www.freedomscientific.com/products/software/jaws/) (Windows, paid)
- VoiceOver (macOS/iOS, built-in)
- TalkBack (Android, built-in)

---

**End of Accessibility Guide**
