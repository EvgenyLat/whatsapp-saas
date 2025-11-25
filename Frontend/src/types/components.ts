/**
 * React Component Prop Type Definitions
 * WhatsApp SaaS Platform
 *
 * This file contains prop types for reusable UI components.
 * All component props extend native HTML element props where appropriate.
 */

import type { ComponentPropsWithoutRef, ReactNode, MouseEvent, ChangeEvent } from 'react';
import type { ColorVariant, SizeVariant } from './enums';

/**
 * Base component props that all components should support
 */
export interface BaseComponentProps {
  /** Additional CSS class names */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
  /** Test ID for testing */
  testId?: string;
  /** Accessibility label */
  ariaLabel?: string;
}

// ============================================================================
// Button Components
// ============================================================================

/**
 * Button variant types
 */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';

/**
 * Button component props
 * Extends native HTML button element
 */
export interface ButtonProps extends ComponentPropsWithoutRef<'button'>, BaseComponentProps {
  /** Visual variant of the button */
  variant?: ButtonVariant;
  /** Size of the button */
  size?: SizeVariant;
  /** Whether the button is in loading state */
  loading?: boolean;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Whether the button should take full width */
  fullWidth?: boolean;
  /** Icon to display before the button text */
  leftIcon?: ReactNode;
  /** Icon to display after the button text */
  rightIcon?: ReactNode;
  /** Button content */
  children: ReactNode;
  /** Click handler */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}

/**
 * Icon button component props
 */
export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'leftIcon' | 'rightIcon'> {
  /** Icon to display */
  icon: ReactNode;
  /** Accessibility label (required for icon-only buttons) */
  ariaLabel: string;
}

// ============================================================================
// Input Components
// ============================================================================

/**
 * Input component props
 * Extends native HTML input element
 */
export interface InputProps extends Omit<ComponentPropsWithoutRef<'input'>, 'size'>, BaseComponentProps {
  /** Input label */
  label?: string;
  /** Error message to display */
  error?: string;
  /** Helper text to display below input */
  helperText?: string;
  /** Whether the input is required */
  required?: boolean;
  /** Icon to display before the input */
  leftIcon?: ReactNode;
  /** Icon to display after the input */
  rightIcon?: ReactNode;
  /** Whether to show character count */
  showCount?: boolean;
  /** Maximum length for character count */
  maxLength?: number;
  /** Size variant */
  size?: SizeVariant;
}

/**
 * Textarea component props
 */
export interface TextareaProps extends ComponentPropsWithoutRef<'textarea'>, BaseComponentProps {
  /** Textarea label */
  label?: string;
  /** Error message to display */
  error?: string;
  /** Helper text to display below textarea */
  helperText?: string;
  /** Whether the textarea is required */
  required?: boolean;
  /** Whether to show character count */
  showCount?: boolean;
  /** Maximum length for character count */
  maxLength?: number;
  /** Number of rows */
  rows?: number;
  /** Whether to auto-resize based on content */
  autoResize?: boolean;
}

/**
 * Select component props
 */
export interface SelectProps extends Omit<ComponentPropsWithoutRef<'select'>, 'size'>, BaseComponentProps {
  /** Select label */
  label?: string;
  /** Error message to display */
  error?: string;
  /** Helper text to display below select */
  helperText?: string;
  /** Whether the select is required */
  required?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Options to display */
  options: Array<{
    value: string | number;
    label: string;
    disabled?: boolean;
  }>;
  /** Size variant */
  size?: SizeVariant;
}

/**
 * Checkbox component props
 */
export interface CheckboxProps extends Omit<ComponentPropsWithoutRef<'input'>, 'type' | 'size'>, BaseComponentProps {
  /** Checkbox label */
  label?: ReactNode;
  /** Error message to display */
  error?: string;
  /** Whether the checkbox is in indeterminate state */
  indeterminate?: boolean;
  /** Size variant */
  size?: SizeVariant;
}

/**
 * Radio button component props
 */
export interface RadioProps extends Omit<ComponentPropsWithoutRef<'input'>, 'type' | 'size'>, BaseComponentProps {
  /** Radio label */
  label?: ReactNode;
  /** Error message to display */
  error?: string;
  /** Size variant */
  size?: SizeVariant;
}

/**
 * Switch/Toggle component props
 */
export interface SwitchProps extends Omit<ComponentPropsWithoutRef<'input'>, 'type' | 'size'>, BaseComponentProps {
  /** Switch label */
  label?: ReactNode;
  /** Helper text */
  helperText?: string;
  /** Size variant */
  size?: SizeVariant;
  /** Whether to show on/off labels */
  showLabels?: boolean;
  /** Custom on label */
  onLabel?: string;
  /** Custom off label */
  offLabel?: string;
}

// ============================================================================
// Card Components
// ============================================================================

/**
 * Card component props
 */
export interface CardProps extends BaseComponentProps {
  /** Card title */
  title?: ReactNode;
  /** Card subtitle */
  subtitle?: ReactNode;
  /** Card content */
  children: ReactNode;
  /** Card footer content */
  footer?: ReactNode;
  /** Whether the card has a shadow */
  shadow?: boolean | 'sm' | 'md' | 'lg';
  /** Whether the card has a border */
  bordered?: boolean;
  /** Whether the card is hoverable */
  hoverable?: boolean;
  /** Click handler for the entire card */
  onClick?: () => void;
}

/**
 * Card header component props
 */
export interface CardHeaderProps extends BaseComponentProps {
  /** Header title */
  title: ReactNode;
  /** Header subtitle */
  subtitle?: ReactNode;
  /** Actions to display in the header */
  actions?: ReactNode;
  /** Avatar to display in header */
  avatar?: ReactNode;
}

// ============================================================================
// Modal/Dialog Components
// ============================================================================

/**
 * Modal component props
 */
export interface ModalProps extends BaseComponentProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when the modal should close */
  onClose: () => void;
  /** Modal title */
  title?: ReactNode;
  /** Modal content */
  children: ReactNode;
  /** Modal footer content */
  footer?: ReactNode;
  /** Size of the modal */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Whether clicking the overlay closes the modal */
  closeOnOverlayClick?: boolean;
  /** Whether pressing ESC closes the modal */
  closeOnEsc?: boolean;
  /** Whether to show the close button */
  showCloseButton?: boolean;
  /** Whether the modal is scrollable */
  scrollable?: boolean;
}

/**
 * Drawer component props
 */
export interface DrawerProps extends BaseComponentProps {
  /** Whether the drawer is open */
  open: boolean;
  /** Callback when the drawer should close */
  onClose: () => void;
  /** Drawer title */
  title?: ReactNode;
  /** Drawer content */
  children: ReactNode;
  /** Drawer footer content */
  footer?: ReactNode;
  /** Position of the drawer */
  position?: 'left' | 'right' | 'top' | 'bottom';
  /** Size of the drawer */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Whether clicking the overlay closes the drawer */
  closeOnOverlayClick?: boolean;
  /** Whether pressing ESC closes the drawer */
  closeOnEsc?: boolean;
}

// ============================================================================
// Table Components
// ============================================================================

/**
 * Table column definition
 */
export interface TableColumn<T> {
  /** Column key (must match data property) */
  key: keyof T | string;
  /** Column header label */
  label: ReactNode;
  /** Whether the column is sortable */
  sortable?: boolean;
  /** Custom render function for the cell */
  render?: (value: any, record: T, index: number) => ReactNode;
  /** Column width */
  width?: string | number;
  /** Column alignment */
  align?: 'left' | 'center' | 'right';
  /** Whether the column is fixed */
  fixed?: 'left' | 'right';
  /** Custom class name for the column */
  className?: string;
}

/**
 * Table component props
 */
export interface TableProps<T> extends BaseComponentProps {
  /** Array of data to display */
  data: T[];
  /** Column definitions */
  columns: TableColumn<T>[];
  /** Whether the table is loading */
  loading?: boolean;
  /** Empty state message */
  emptyText?: string;
  /** Row key field or function */
  rowKey?: keyof T | ((record: T) => string);
  /** Row click handler */
  onRowClick?: (record: T, index: number) => void;
  /** Whether rows are selectable */
  selectable?: boolean;
  /** Selected row keys */
  selectedRowKeys?: string[];
  /** Selection change handler */
  onSelectionChange?: (selectedKeys: string[], selectedRows: T[]) => void;
  /** Whether the table has a border */
  bordered?: boolean;
  /** Whether the table is striped */
  striped?: boolean;
  /** Whether the table is hoverable */
  hoverable?: boolean;
  /** Pagination configuration */
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  /** Sort configuration */
  sort?: {
    key: string;
    order: 'asc' | 'desc';
    onChange: (key: string, order: 'asc' | 'desc') => void;
  };
}

// ============================================================================
// Badge/Tag Components
// ============================================================================

/**
 * Badge component props
 */
export interface BadgeProps extends BaseComponentProps {
  /** Badge content */
  children: ReactNode;
  /** Color variant */
  variant?: ColorVariant | 'default';
  /** Size variant */
  size?: SizeVariant;
  /** Whether the badge is rounded (pill shape) */
  rounded?: boolean;
  /** Whether the badge has a dot indicator */
  dot?: boolean;
  /** Badge count (for notification badges) */
  count?: number;
  /** Maximum count to display (shows count+ if exceeded) */
  maxCount?: number;
  /** Icon to display in the badge */
  icon?: ReactNode;
}

/**
 * Tag component props
 */
export interface TagProps extends BaseComponentProps {
  /** Tag content */
  children: ReactNode;
  /** Color variant */
  variant?: ColorVariant | 'default';
  /** Size variant */
  size?: SizeVariant;
  /** Whether the tag is closable */
  closable?: boolean;
  /** Close handler */
  onClose?: () => void;
  /** Icon to display in the tag */
  icon?: ReactNode;
}

// ============================================================================
// Loading Components
// ============================================================================

/**
 * Loading spinner component props
 */
export interface LoadingSpinnerProps extends BaseComponentProps {
  /** Size of the spinner */
  size?: SizeVariant | number;
  /** Color variant */
  variant?: ColorVariant;
  /** Whether to center the spinner */
  centered?: boolean;
  /** Loading text to display */
  text?: string;
  /** Whether the spinner is fullscreen */
  fullscreen?: boolean;
}

/**
 * Skeleton component props
 */
export interface SkeletonProps extends BaseComponentProps {
  /** Whether the skeleton is active (animating) */
  active?: boolean;
  /** Shape of the skeleton */
  variant?: 'text' | 'circular' | 'rectangular';
  /** Width of the skeleton */
  width?: string | number;
  /** Height of the skeleton */
  height?: string | number;
  /** Number of rows (for text variant) */
  rows?: number;
}

// ============================================================================
// Alert/Notification Components
// ============================================================================

/**
 * Alert type
 */
export type AlertType = 'info' | 'success' | 'warning' | 'error';

/**
 * Alert component props
 */
export interface AlertProps extends BaseComponentProps {
  /** Alert type */
  type: AlertType;
  /** Alert title */
  title?: ReactNode;
  /** Alert message */
  message: ReactNode;
  /** Whether the alert is closable */
  closable?: boolean;
  /** Close handler */
  onClose?: () => void;
  /** Whether to show an icon */
  showIcon?: boolean;
  /** Custom icon */
  icon?: ReactNode;
  /** Alert actions */
  actions?: ReactNode;
}

/**
 * Toast/Notification component props
 */
export interface ToastProps extends BaseComponentProps {
  /** Toast ID (for managing multiple toasts) */
  id: string;
  /** Toast type */
  type: AlertType;
  /** Toast title */
  title: string;
  /** Toast description */
  description?: string;
  /** Duration in milliseconds (0 for persistent) */
  duration?: number;
  /** Whether the toast is closable */
  closable?: boolean;
  /** Close handler */
  onClose?: () => void;
  /** Action button */
  action?: {
    label: string;
    onClick: () => void;
  };
}

// ============================================================================
// Menu/Dropdown Components
// ============================================================================

/**
 * Menu item type
 */
export interface MenuItem {
  /** Unique key */
  key: string;
  /** Menu item label */
  label: ReactNode;
  /** Menu item icon */
  icon?: ReactNode;
  /** Whether the item is disabled */
  disabled?: boolean;
  /** Whether the item is a divider */
  divider?: boolean;
  /** Nested menu items */
  children?: MenuItem[];
  /** Click handler */
  onClick?: () => void;
}

/**
 * Dropdown component props
 */
export interface DropdownProps extends BaseComponentProps {
  /** Trigger element */
  trigger: ReactNode;
  /** Menu items */
  items: MenuItem[];
  /** Placement of the dropdown */
  placement?: 'bottom-start' | 'bottom' | 'bottom-end' | 'top-start' | 'top' | 'top-end';
  /** Whether the dropdown is disabled */
  disabled?: boolean;
  /** Open/close handler */
  onOpenChange?: (open: boolean) => void;
}

// ============================================================================
// Pagination Components
// ============================================================================

/**
 * Pagination component props
 */
export interface PaginationProps extends BaseComponentProps {
  /** Current page (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Page change handler */
  onPageChange: (page: number) => void;
  /** Whether to show page size selector */
  showSizeChanger?: boolean;
  /** Page size */
  pageSize?: number;
  /** Page size options */
  pageSizeOptions?: number[];
  /** Page size change handler */
  onPageSizeChange?: (pageSize: number) => void;
  /** Whether to show total count */
  showTotal?: boolean;
  /** Total number of items */
  total?: number;
  /** Size variant */
  size?: SizeVariant;
}

// ============================================================================
// Avatar Components
// ============================================================================

/**
 * Avatar component props
 */
export interface AvatarProps extends BaseComponentProps {
  /** Avatar image source */
  src?: string;
  /** Alt text for the image */
  alt?: string;
  /** Initials to display if no image */
  initials?: string;
  /** Size of the avatar */
  size?: SizeVariant | number;
  /** Shape of the avatar */
  shape?: 'circle' | 'square';
  /** Color variant (for background) */
  variant?: ColorVariant;
  /** Click handler */
  onClick?: () => void;
}

/**
 * Avatar group component props
 */
export interface AvatarGroupProps extends BaseComponentProps {
  /** Maximum avatars to display */
  max?: number;
  /** Avatar items */
  children: ReactNode;
  /** Size of avatars */
  size?: SizeVariant | number;
}

// ============================================================================
// Breadcrumb Components
// ============================================================================

/**
 * Breadcrumb item type
 */
export interface BreadcrumbItem {
  /** Item label */
  label: ReactNode;
  /** Item href */
  href?: string;
  /** Item icon */
  icon?: ReactNode;
  /** Click handler */
  onClick?: () => void;
}

/**
 * Breadcrumb component props
 */
export interface BreadcrumbProps extends BaseComponentProps {
  /** Breadcrumb items */
  items: BreadcrumbItem[];
  /** Separator between items */
  separator?: ReactNode;
}

// ============================================================================
// Form Components
// ============================================================================

/**
 * Form field error
 */
export interface FormFieldError {
  /** Field name */
  field: string;
  /** Error message */
  message: string;
}

/**
 * Form component props
 */
export interface FormProps extends ComponentPropsWithoutRef<'form'>, BaseComponentProps {
  /** Form children */
  children: ReactNode;
  /** Submit handler */
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  /** Form errors */
  errors?: FormFieldError[];
  /** Whether the form is loading */
  loading?: boolean;
}
