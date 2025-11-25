# WhatsApp SaaS Platform - Component Specifications

**Version:** 1.0.0
**Last Updated:** January 18, 2025

This document provides detailed specifications for all UI components in the WhatsApp SaaS Platform design system.

---

## Table of Contents

1. [Buttons](#buttons)
2. [Inputs](#inputs)
3. [Cards](#cards)
4. [Tables](#tables)
5. [Modals](#modals)
6. [Navigation](#navigation)
7. [Feedback Components](#feedback-components)
8. [Charts & Data Visualization](#charts--data-visualization)
9. [Forms](#forms)
10. [Typography Components](#typography-components)

---

## Buttons

### Button Variants

#### 1. Primary Button
**Usage:** Main call-to-action buttons, primary actions
**Visual:** Solid WhatsApp green background with white text

```css
.button-primary {
  background-color: var(--color-primary-500);
  color: var(--color-text-inverse);
  border: none;
  padding: var(--spacing-3) var(--spacing-6);
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-base);
  height: var(--button-height-base);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
  cursor: pointer;
}

.button-primary:hover {
  background-color: var(--color-primary-600);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.button-primary:active {
  background-color: var(--color-primary-700);
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}

.button-primary:focus {
  outline: none;
  box-shadow: var(--shadow-focus-primary);
}

.button-primary:disabled {
  background-color: var(--color-neutral-300);
  color: var(--color-neutral-500);
  cursor: not-allowed;
  box-shadow: none;
}
```

#### 2. Secondary Button
**Usage:** Secondary actions, alternative choices
**Visual:** White background with primary green border and text

```css
.button-secondary {
  background-color: transparent;
  color: var(--color-primary-500);
  border: 2px solid var(--color-primary-500);
  padding: var(--spacing-3) var(--spacing-6);
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-base);
  height: var(--button-height-base);
  transition: all var(--transition-base);
  cursor: pointer;
}

.button-secondary:hover {
  background-color: var(--color-primary-50);
  border-color: var(--color-primary-600);
  color: var(--color-primary-600);
}

.button-secondary:active {
  background-color: var(--color-primary-100);
}

.button-secondary:disabled {
  border-color: var(--color-neutral-300);
  color: var(--color-neutral-400);
  cursor: not-allowed;
}
```

#### 3. Tertiary Button
**Usage:** Less prominent actions, inline actions
**Visual:** Text-only button with no border or background

```css
.button-tertiary {
  background-color: transparent;
  color: var(--color-primary-500);
  border: none;
  padding: var(--spacing-3) var(--spacing-4);
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-base);
  transition: all var(--transition-base);
  cursor: pointer;
}

.button-tertiary:hover {
  background-color: var(--color-primary-50);
  color: var(--color-primary-600);
}

.button-tertiary:active {
  background-color: var(--color-primary-100);
}
```

#### 4. Danger Button
**Usage:** Destructive actions (delete, cancel)
**Visual:** Solid red background with white text

```css
.button-danger {
  background-color: var(--color-error-500);
  color: var(--color-text-inverse);
  border: none;
  padding: var(--spacing-3) var(--spacing-6);
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-base);
  height: var(--button-height-base);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
  cursor: pointer;
}

.button-danger:hover {
  background-color: var(--color-error-600);
  box-shadow: var(--shadow-md);
}

.button-danger:active {
  background-color: var(--color-error-700);
}
```

#### 5. Icon Button
**Usage:** Actions represented by icons only
**Visual:** Square or circular button with icon

```css
.button-icon {
  background-color: transparent;
  color: var(--color-text-secondary);
  border: none;
  padding: var(--spacing-2);
  border-radius: var(--radius-md);
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-base);
  cursor: pointer;
}

.button-icon:hover {
  background-color: var(--color-neutral-100);
  color: var(--color-text-primary);
}

.button-icon:active {
  background-color: var(--color-neutral-200);
}
```

### Button Sizes

```css
/* Small Button */
.button-sm {
  height: var(--button-height-sm);
  padding: var(--spacing-2) var(--spacing-4);
  font-size: var(--font-size-sm);
}

/* Base Button (default) */
.button-base {
  height: var(--button-height-base);
  padding: var(--spacing-3) var(--spacing-6);
  font-size: var(--font-size-base);
}

/* Large Button */
.button-lg {
  height: var(--button-height-lg);
  padding: var(--spacing-4) var(--spacing-8);
  font-size: var(--font-size-lg);
}
```

### Button States

| State | Description | Visual Change |
|-------|-------------|---------------|
| Default | Normal interactive state | Base styles |
| Hover | Mouse over the button | Darker background, slight elevation |
| Active | Button being clicked | Even darker, no elevation |
| Focus | Keyboard focus | Focus ring (box-shadow) |
| Disabled | Cannot be interacted with | Grayed out, no cursor pointer |
| Loading | Action in progress | Spinner icon, disabled state |

---

## Inputs

### Input Variants

#### 1. Text Input
**Usage:** Single-line text entry

```css
.input-text {
  background-color: var(--color-bg-primary);
  border: 2px solid var(--color-border-light);
  border-radius: var(--radius-md);
  padding: var(--spacing-3) var(--spacing-4);
  height: var(--input-height-base);
  font-size: var(--font-size-base);
  font-family: var(--font-family-sans);
  color: var(--color-text-primary);
  transition: all var(--transition-base);
  width: 100%;
}

.input-text:hover {
  border-color: var(--color-border-medium);
}

.input-text:focus {
  outline: none;
  border-color: var(--color-border-focus);
  box-shadow: var(--shadow-focus-primary);
}

.input-text::placeholder {
  color: var(--color-text-tertiary);
}

.input-text:disabled {
  background-color: var(--color-neutral-100);
  border-color: var(--color-border-light);
  color: var(--color-text-tertiary);
  cursor: not-allowed;
}

.input-text.error {
  border-color: var(--color-border-error);
}

.input-text.error:focus {
  box-shadow: var(--shadow-focus-error);
}
```

#### 2. Textarea
**Usage:** Multi-line text entry

```css
.input-textarea {
  background-color: var(--color-bg-primary);
  border: 2px solid var(--color-border-light);
  border-radius: var(--radius-md);
  padding: var(--spacing-3) var(--spacing-4);
  font-size: var(--font-size-base);
  font-family: var(--font-family-sans);
  color: var(--color-text-primary);
  transition: all var(--transition-base);
  width: 100%;
  min-height: 6rem;
  resize: vertical;
}
```

#### 3. Select Dropdown
**Usage:** Choose one option from a list

```css
.input-select {
  background-color: var(--color-bg-primary);
  border: 2px solid var(--color-border-light);
  border-radius: var(--radius-md);
  padding: var(--spacing-3) var(--spacing-4);
  height: var(--input-height-base);
  font-size: var(--font-size-base);
  font-family: var(--font-family-sans);
  color: var(--color-text-primary);
  transition: all var(--transition-base);
  width: 100%;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E");
  background-position: right 0.75rem center;
  background-repeat: no-repeat;
  background-size: 1.5rem 1.5rem;
  padding-right: 2.5rem;
}
```

#### 4. Checkbox
**Usage:** Multiple selections or boolean toggle

```css
.input-checkbox {
  appearance: none;
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid var(--color-border-medium);
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-primary);
  cursor: pointer;
  transition: all var(--transition-base);
  position: relative;
}

.input-checkbox:checked {
  background-color: var(--color-primary-500);
  border-color: var(--color-primary-500);
}

.input-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 0.3rem;
  top: 0.05rem;
  width: 0.4rem;
  height: 0.7rem;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.input-checkbox:focus {
  outline: none;
  box-shadow: var(--shadow-focus-primary);
}
```

#### 5. Radio Button
**Usage:** Single selection from multiple options

```css
.input-radio {
  appearance: none;
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid var(--color-border-medium);
  border-radius: var(--radius-full);
  background-color: var(--color-bg-primary);
  cursor: pointer;
  transition: all var(--transition-base);
  position: relative;
}

.input-radio:checked {
  border-color: var(--color-primary-500);
}

.input-radio:checked::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 0.625rem;
  height: 0.625rem;
  border-radius: var(--radius-full);
  background-color: var(--color-primary-500);
}
```

#### 6. Switch Toggle
**Usage:** On/off binary states

```css
.input-switch {
  position: relative;
  display: inline-block;
  width: 3rem;
  height: 1.75rem;
}

.input-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.input-switch-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--color-neutral-300);
  transition: var(--transition-base);
  border-radius: var(--radius-full);
}

.input-switch-slider::before {
  position: absolute;
  content: '';
  height: 1.25rem;
  width: 1.25rem;
  left: 0.25rem;
  bottom: 0.25rem;
  background-color: white;
  transition: var(--transition-base);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-sm);
}

.input-switch input:checked + .input-switch-slider {
  background-color: var(--color-primary-500);
}

.input-switch input:checked + .input-switch-slider::before {
  transform: translateX(1.25rem);
}
```

#### 7. Date Picker
**Usage:** Date selection

```css
.input-date {
  background-color: var(--color-bg-primary);
  border: 2px solid var(--color-border-light);
  border-radius: var(--radius-md);
  padding: var(--spacing-3) var(--spacing-4);
  height: var(--input-height-base);
  font-size: var(--font-size-base);
  font-family: var(--font-family-sans);
  color: var(--color-text-primary);
  transition: all var(--transition-base);
  width: 100%;
  cursor: pointer;
}
```

#### 8. Search Input
**Usage:** Search functionality with icon

```css
.input-search {
  background-color: var(--color-bg-primary);
  border: 2px solid var(--color-border-light);
  border-radius: var(--radius-md);
  padding: var(--spacing-3) var(--spacing-4) var(--spacing-3) var(--spacing-10);
  height: var(--input-height-base);
  font-size: var(--font-size-base);
  font-family: var(--font-family-sans);
  color: var(--color-text-primary);
  transition: all var(--transition-base);
  width: 100%;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'/%3E%3C/svg%3E");
  background-position: left 0.75rem center;
  background-repeat: no-repeat;
  background-size: 1.25rem 1.25rem;
}
```

### Input Label

```css
.input-label {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-2);
}

.input-label.required::after {
  content: ' *';
  color: var(--color-error-500);
}
```

### Input Helper Text

```css
.input-helper {
  display: block;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-top: var(--spacing-1);
}

.input-error-message {
  display: block;
  font-size: var(--font-size-xs);
  color: var(--color-error-500);
  margin-top: var(--spacing-1);
}
```

---

## Cards

### Card Variants

#### 1. Basic Card
**Usage:** Content containers, grouped information

```css
.card {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: var(--card-padding-base);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
}

.card:hover {
  box-shadow: var(--shadow-md);
}
```

#### 2. Interactive Card
**Usage:** Clickable cards that lead to detail pages

```css
.card-interactive {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: var(--card-padding-base);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
  cursor: pointer;
}

.card-interactive:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
  border-color: var(--color-primary-300);
}

.card-interactive:active {
  transform: translateY(0);
  box-shadow: var(--shadow-md);
}
```

#### 3. Stat Card
**Usage:** Dashboard statistics and metrics

```css
.card-stat {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: var(--card-padding-base);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.card-stat-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
}

.card-stat-value {
  font-size: var(--font-size-3xl);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-bold);
}

.card-stat-change {
  font-size: var(--font-size-sm);
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
}

.card-stat-change.positive {
  color: var(--color-success-600);
}

.card-stat-change.negative {
  color: var(--color-error-600);
}
```

#### 4. Alert Card
**Usage:** Important messages and notifications

```css
.card-alert {
  border: 1px solid;
  border-radius: var(--radius-lg);
  padding: var(--spacing-4);
  display: flex;
  gap: var(--spacing-3);
}

.card-alert.info {
  background-color: var(--color-info-50);
  border-color: var(--color-info-300);
  color: var(--color-info-800);
}

.card-alert.success {
  background-color: var(--color-success-50);
  border-color: var(--color-success-300);
  color: var(--color-success-800);
}

.card-alert.warning {
  background-color: var(--color-warning-50);
  border-color: var(--color-warning-300);
  color: var(--color-warning-800);
}

.card-alert.error {
  background-color: var(--color-error-50);
  border-color: var(--color-error-300);
  color: var(--color-error-800);
}
```

#### 5. Profile Card
**Usage:** User or salon profile summary

```css
.card-profile {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: var(--card-padding-base);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--spacing-4);
}

.card-profile-avatar {
  width: 5rem;
  height: 5rem;
  border-radius: var(--radius-full);
  background-color: var(--color-primary-100);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary-700);
}

.card-profile-name {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.card-profile-subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
```

---

## Tables

### Table Structure

```css
.table-container {
  width: 100%;
  overflow-x: auto;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
  background-color: var(--color-bg-primary);
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table thead {
  background-color: var(--color-bg-secondary);
  border-bottom: 2px solid var(--color-border-medium);
}

.table th {
  padding: var(--spacing-3) var(--spacing-4);
  text-align: left;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
}

.table tbody tr {
  border-bottom: 1px solid var(--color-border-light);
  transition: background-color var(--transition-base);
}

.table tbody tr:hover {
  background-color: var(--color-bg-secondary);
}

.table tbody tr:last-child {
  border-bottom: none;
}

.table td {
  padding: var(--spacing-4);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

.table td.numeric {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
```

### Table Status Badges

```css
.table-badge {
  display: inline-block;
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
}

.table-badge.confirmed {
  background-color: var(--color-success-100);
  color: var(--color-success-700);
}

.table-badge.pending {
  background-color: var(--color-warning-100);
  color: var(--color-warning-700);
}

.table-badge.cancelled {
  background-color: var(--color-error-100);
  color: var(--color-error-700);
}

.table-badge.completed {
  background-color: var(--color-info-100);
  color: var(--color-info-700);
}
```

### Table Actions

```css
.table-actions {
  display: flex;
  gap: var(--spacing-2);
  justify-content: flex-end;
}
```

### Pagination

```css
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-4);
  border-top: 1px solid var(--color-border-light);
}

.pagination-info {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.pagination-controls {
  display: flex;
  gap: var(--spacing-2);
}

.pagination-button {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  padding: var(--spacing-2) var(--spacing-3);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all var(--transition-base);
}

.pagination-button:hover:not(:disabled) {
  background-color: var(--color-bg-secondary);
  border-color: var(--color-border-medium);
}

.pagination-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-button.active {
  background-color: var(--color-primary-500);
  border-color: var(--color-primary-500);
  color: var(--color-text-inverse);
}
```

---

## Modals

### Modal Structure

```css
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--color-bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-index-modal-backdrop);
  padding: var(--spacing-4);
}

.modal {
  background-color: var(--color-bg-primary);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-2xl);
  max-width: 32rem;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: modalSlideIn var(--transition-slow);
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-2rem) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  padding: var(--spacing-6);
  border-bottom: 1px solid var(--color-border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.modal-close {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-text-secondary);
  padding: var(--spacing-2);
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
}

.modal-close:hover {
  background-color: var(--color-neutral-100);
  color: var(--color-text-primary);
}

.modal-body {
  padding: var(--spacing-6);
}

.modal-footer {
  padding: var(--spacing-6);
  border-top: 1px solid var(--color-border-light);
  display: flex;
  gap: var(--spacing-3);
  justify-content: flex-end;
}
```

### Modal Sizes

```css
.modal-sm {
  max-width: 24rem;
}

.modal-base {
  max-width: 32rem;
}

.modal-lg {
  max-width: 48rem;
}

.modal-xl {
  max-width: 64rem;
}

.modal-full {
  max-width: 90vw;
  max-height: 90vh;
}
```

---

## Navigation

### Sidebar Navigation

```css
.sidebar {
  width: var(--sidebar-width);
  height: 100vh;
  background-color: var(--color-bg-primary);
  border-right: 1px solid var(--color-border-light);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  z-index: var(--z-index-fixed);
  transition: transform var(--transition-base);
}

.sidebar-header {
  padding: var(--spacing-6);
  border-bottom: 1px solid var(--color-border-light);
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.sidebar-logo {
  width: 2.5rem;
  height: 2.5rem;
}

.sidebar-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.sidebar-nav {
  flex: 1;
  padding: var(--spacing-4);
  overflow-y: auto;
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3) var(--spacing-4);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  text-decoration: none;
  transition: all var(--transition-base);
  margin-bottom: var(--spacing-1);
}

.sidebar-nav-item:hover {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.sidebar-nav-item.active {
  background-color: var(--color-primary-50);
  color: var(--color-primary-600);
}

.sidebar-nav-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.sidebar-footer {
  padding: var(--spacing-4);
  border-top: 1px solid var(--color-border-light);
}
```

### Top Navigation Bar

```css
.header {
  height: var(--header-height);
  background-color: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-6);
  position: sticky;
  top: 0;
  z-index: var(--z-index-sticky);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
}

.header-search {
  width: 24rem;
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.header-notification-button {
  position: relative;
}

.header-notification-badge {
  position: absolute;
  top: -0.25rem;
  right: -0.25rem;
  width: 1rem;
  height: 1rem;
  background-color: var(--color-error-500);
  border: 2px solid var(--color-bg-primary);
  border-radius: var(--radius-full);
  font-size: 0.625rem;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-weight-bold);
}
```

### Breadcrumbs

```css
.breadcrumbs {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  padding: var(--spacing-4) 0;
}

.breadcrumb-item {
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: color var(--transition-base);
}

.breadcrumb-item:hover {
  color: var(--color-primary-500);
}

.breadcrumb-item.active {
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
}

.breadcrumb-separator {
  color: var(--color-text-tertiary);
}
```

### Tabs

```css
.tabs {
  display: flex;
  border-bottom: 2px solid var(--color-border-light);
  gap: var(--spacing-2);
}

.tab-item {
  padding: var(--spacing-3) var(--spacing-4);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  transition: all var(--transition-base);
}

.tab-item:hover {
  color: var(--color-text-primary);
  background-color: var(--color-bg-secondary);
}

.tab-item.active {
  color: var(--color-primary-600);
  border-bottom-color: var(--color-primary-500);
}
```

---

## Feedback Components

### Toast Notification

```css
.toast {
  position: fixed;
  top: var(--spacing-6);
  right: var(--spacing-6);
  background-color: var(--color-bg-elevated);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: var(--spacing-4);
  box-shadow: var(--shadow-lg);
  z-index: var(--z-index-toast);
  min-width: 20rem;
  max-width: 24rem;
  animation: toastSlideIn var(--transition-base);
  display: flex;
  gap: var(--spacing-3);
}

@keyframes toastSlideIn {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.toast.success {
  border-left: 4px solid var(--color-success-500);
}

.toast.error {
  border-left: 4px solid var(--color-error-500);
}

.toast.warning {
  border-left: 4px solid var(--color-warning-500);
}

.toast.info {
  border-left: 4px solid var(--color-info-500);
}

.toast-content {
  flex: 1;
}

.toast-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-1);
}

.toast-message {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.toast-close {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-text-tertiary);
  padding: 0;
}
```

### Loading Spinner

```css
.spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid var(--color-neutral-200);
  border-top-color: var(--color-primary-500);
  border-radius: var(--radius-full);
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.spinner-sm {
  width: 1rem;
  height: 1rem;
  border-width: 2px;
}

.spinner-lg {
  width: 3rem;
  height: 3rem;
  border-width: 4px;
}
```

### Progress Bar

```css
.progress-bar {
  width: 100%;
  height: 0.5rem;
  background-color: var(--color-neutral-200);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background-color: var(--color-primary-500);
  border-radius: var(--radius-full);
  transition: width var(--transition-slow);
}

.progress-bar-fill.success {
  background-color: var(--color-success-500);
}

.progress-bar-fill.warning {
  background-color: var(--color-warning-500);
}

.progress-bar-fill.error {
  background-color: var(--color-error-500);
}
```

### Tooltip

```css
.tooltip {
  position: absolute;
  background-color: var(--color-neutral-800);
  color: var(--color-text-inverse);
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-md);
  font-size: var(--font-size-xs);
  white-space: nowrap;
  z-index: var(--z-index-tooltip);
  box-shadow: var(--shadow-md);
  pointer-events: none;
}

.tooltip::after {
  content: '';
  position: absolute;
  border: 4px solid transparent;
}

.tooltip.top::after {
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  border-top-color: var(--color-neutral-800);
}

.tooltip.bottom::after {
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  border-bottom-color: var(--color-neutral-800);
}
```

### Skeleton Loader

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-neutral-200) 25%,
    var(--color-neutral-300) 50%,
    var(--color-neutral-200) 75%
  );
  background-size: 200% 100%;
  animation: skeletonLoading 1.5s ease-in-out infinite;
  border-radius: var(--radius-md);
}

@keyframes skeletonLoading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.skeleton-text {
  height: 1rem;
  margin-bottom: var(--spacing-2);
}

.skeleton-heading {
  height: 2rem;
  width: 60%;
  margin-bottom: var(--spacing-4);
}

.skeleton-avatar {
  width: 3rem;
  height: 3rem;
  border-radius: var(--radius-full);
}
```

---

## Charts & Data Visualization

### Chart Container

```css
.chart-container {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: var(--card-padding-base);
  box-shadow: var(--shadow-sm);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-6);
}

.chart-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.chart-subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-top: var(--spacing-1);
}

.chart-legend {
  display: flex;
  gap: var(--spacing-4);
  flex-wrap: wrap;
  margin-top: var(--spacing-4);
}

.chart-legend-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.chart-legend-color {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: var(--radius-sm);
}
```

---

## Forms

### Form Layout

```css
.form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-4);
}

.form-actions {
  display: flex;
  gap: var(--spacing-3);
  justify-content: flex-end;
  padding-top: var(--spacing-4);
  border-top: 1px solid var(--color-border-light);
}
```

---

## Typography Components

### Headings

```css
.heading-1 {
  font-size: var(--font-size-4xl);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
  color: var(--color-text-primary);
}

.heading-2 {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
  color: var(--color-text-primary);
}

.heading-3 {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-snug);
  color: var(--color-text-primary);
}

.heading-4 {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-snug);
  color: var(--color-text-primary);
}
```

### Body Text

```css
.body-large {
  font-size: var(--font-size-lg);
  line-height: var(--line-height-relaxed);
  color: var(--color-text-primary);
}

.body-base {
  font-size: var(--font-size-base);
  line-height: var(--line-height-normal);
  color: var(--color-text-primary);
}

.body-small {
  font-size: var(--font-size-sm);
  line-height: var(--line-height-normal);
  color: var(--color-text-secondary);
}
```

### Link

```css
.link {
  color: var(--color-text-link);
  text-decoration: none;
  transition: color var(--transition-base);
}

.link:hover {
  color: var(--color-text-link-hover);
  text-decoration: underline;
}

.link:focus {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
```

---

## Component Usage Examples

### Example: Login Form

```html
<form class="form">
  <div class="form-group">
    <label class="input-label required">Email</label>
    <input type="email" class="input-text" placeholder="admin@example.com" />
  </div>

  <div class="form-group">
    <label class="input-label required">Password</label>
    <input type="password" class="input-text" placeholder="••••••••" />
    <span class="input-helper">Must be at least 8 characters</span>
  </div>

  <div class="form-actions">
    <button type="button" class="button-tertiary">Forgot Password?</button>
    <button type="submit" class="button-primary">Sign In</button>
  </div>
</form>
```

### Example: Stats Dashboard

```html
<div class="dashboard-stats">
  <div class="card-stat">
    <span class="card-stat-label">Total Bookings</span>
    <span class="card-stat-value">1,247</span>
    <span class="card-stat-change positive">
      ↑ 12% from last month
    </span>
  </div>

  <div class="card-stat">
    <span class="card-stat-label">Active Conversations</span>
    <span class="card-stat-value">89</span>
    <span class="card-stat-change positive">
      ↑ 5% from last week
    </span>
  </div>
</div>
```

---

## Accessibility Checklist

- ✅ All interactive elements have `:focus` states
- ✅ Color contrast ratios meet WCAG 2.1 AA standards (minimum 4.5:1)
- ✅ All form inputs have associated labels
- ✅ Button text is descriptive (not just "Click here")
- ✅ Icons have text alternatives (aria-label or sr-only text)
- ✅ Modals trap focus and can be closed with Escape key
- ✅ Tables have proper semantic markup (`<thead>`, `<tbody>`, `<th>`)
- ✅ Loading states are announced to screen readers
- ✅ Error messages are associated with form fields
- ✅ Navigation is keyboard accessible

---

**End of Component Specifications**
