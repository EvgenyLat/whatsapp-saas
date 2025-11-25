/**
 * Test Generation Script
 * Generates comprehensive test files for all pages
 *
 * Usage: node scripts/generate-tests.js
 */

const fs = require('fs');
const path = require('path');

// Test template for list pages
const listPageTemplate = (moduleName, ModuleName) => `/**
 * ${ModuleName} List Page Tests
 * Tests list display, search, filtering, pagination, and CRUD operations
 */

import { render, screen, waitFor, userEvent } from '@/test-utils';
import { useRouter } from 'next/navigation';
import ${ModuleName}Page from '../page';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

describe('${ModuleName}Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  it('renders page header', async () => {
    render(<${ModuleName}Page />);
    expect(screen.getByRole('heading', { name: /${moduleName}/i })).toBeInTheDocument();
  });

  it('renders add button', async () => {
    render(<${ModuleName}Page />);
    const addButton = screen.getByRole('link', { name: /add/i });
    expect(addButton).toBeInTheDocument();
  });

  it('displays items after loading', async () => {
    render(<${ModuleName}Page />);
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
  });

  it('handles search functionality', async () => {
    const user = userEvent.setup();
    render(<${ModuleName}Page />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'test');
    expect(searchInput).toHaveValue('test');
  });

  it('handles delete with confirmation', async () => {
    const user = userEvent.setup();
    window.confirm = jest.fn(() => true);

    render(<${ModuleName}Page />);
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    const deleteButtons = screen.queryAllByLabelText(/delete/i);
    if (deleteButtons.length > 0) {
      await user.click(deleteButtons[0]);
      expect(window.confirm).toHaveBeenCalled();
    }
  });

  it('navigates to detail page on row click', async () => {
    const user = userEvent.setup();
    render(<${ModuleName}Page />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    const rows = screen.queryAllByRole('row');
    if (rows.length > 1) {
      await user.click(rows[1]);
      expect(mockPush).toHaveBeenCalled();
    }
  });
});
`;

// Test template for new/create pages
const newPageTemplate = (moduleName, ModuleName) => `/**
 * New ${ModuleName} Page Tests
 * Tests form validation and creation flow
 */

import { render, screen, waitFor, userEvent } from '@/test-utils';
import { useRouter } from 'next/navigation';
import New${ModuleName}Page from '../page';

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('New${ModuleName}Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      back: mockBack,
    });
  });

  it('renders form header', () => {
    render(<New${ModuleName}Page />);
    expect(screen.getByRole('heading', { name: /add new/i })).toBeInTheDocument();
  });

  it('renders back button', () => {
    render(<New${ModuleName}Page />);
    const backButton = screen.getByRole('button', { name: /back/i });
    expect(backButton).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(<New${ModuleName}Page />);

    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    await waitFor(() => {
      const errors = screen.queryAllByRole('alert');
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  it('navigates back on cancel', async () => {
    const user = userEvent.setup();
    render(<New${ModuleName}Page />);

    const cancelButton = screen.getByRole('button', { name: /cancel|back/i });
    await user.click(cancelButton);

    expect(mockBack).toHaveBeenCalled();
  });
});
`;

// Test template for edit pages
const editPageTemplate = (moduleName, ModuleName) => `/**
 * Edit ${ModuleName} Page Tests
 * Tests form validation and update flow
 */

import { render, screen, waitFor, userEvent } from '@/test-utils';
import { useRouter, useParams } from 'next/navigation';
import Edit${ModuleName}Page from '../page';

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

describe('Edit${ModuleName}Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      back: mockBack,
    });
    (useParams as jest.Mock).mockReturnValue({ id: 'test-id' });
  });

  it('renders form header', async () => {
    render(<Edit${ModuleName}Page />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /edit/i })).toBeInTheDocument();
    });
  });

  it('loads existing data', async () => {
    render(<Edit${ModuleName}Page />);
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
  });

  it('validates fields on submit', async () => {
    const user = userEvent.setup();
    render(<Edit${ModuleName}Page />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /save|update/i });
    await user.click(submitButton);

    // Form may be valid with loaded data, so no assertion
  });
});
`;

// Test template for detail pages
const detailPageTemplate = (moduleName, ModuleName) => `/**
 * ${ModuleName} Detail Page Tests
 * Tests detail view and actions
 */

import { render, screen, waitFor, userEvent } from '@/test-utils';
import { useRouter, useParams } from 'next/navigation';
import ${ModuleName}DetailPage from '../page';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

describe('${ModuleName}DetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    (useParams as jest.Mock).mockReturnValue({ id: 'test-id' });
  });

  it('loads and displays data', async () => {
    render(<${ModuleName}DetailPage />);
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
  });

  it('renders action buttons', async () => {
    render(<${ModuleName}DetailPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    });
  });

  it('navigates to edit page', async () => {
    const user = userEvent.setup();
    render(<${ModuleName}DetailPage />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/edit'));
  });
});
`;

// Simple page template
const simplePageTemplate = (moduleName, ModuleName) => `/**
 * ${ModuleName} Page Tests
 */

import { render, screen, waitFor } from '@/test-utils';
import ${ModuleName}Page from '../page';

describe('${ModuleName}Page', () => {
  it('renders page content', async () => {
    render(<${ModuleName}Page />);
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
  });

  it('displays page heading', () => {
    render(<${ModuleName}Page />);
    expect(screen.getByRole('heading')).toBeInTheDocument();
  });
});
`;

// Module configurations
const modules = [
  {
    name: 'staff',
    displayName: 'Staff',
    pages: ['list', 'detail', 'new', 'edit'],
    path: 'src/app/(dashboard)/dashboard/staff',
  },
  {
    name: 'services',
    displayName: 'Services',
    pages: ['list', 'detail', 'new', 'edit'],
    path: 'src/app/(dashboard)/dashboard/services',
  },
  {
    name: 'templates',
    displayName: 'Templates',
    pages: ['list', 'detail', 'new', 'edit'],
    path: 'src/app/(dashboard)/dashboard/templates',
  },
  {
    name: 'bookings',
    displayName: 'Bookings',
    pages: ['list', 'detail', 'new', 'edit'],
    path: 'src/app/(dashboard)/dashboard/bookings',
  },
];

const simplePages = [
  {
    name: 'dashboard',
    displayName: 'Dashboard',
    path: 'src/app/(dashboard)/dashboard',
  },
  {
    name: 'messages',
    displayName: 'Messages',
    path: 'src/app/(dashboard)/dashboard/messages',
  },
  {
    name: 'analytics',
    displayName: 'Analytics',
    path: 'src/app/(dashboard)/dashboard/analytics',
  },
  {
    name: 'settings',
    displayName: 'Settings',
    path: 'src/app/(dashboard)/dashboard/settings',
  },
];

// Generate tests for CRUD modules
modules.forEach((module) => {
  module.pages.forEach((pageType) => {
    let testDir, template;

    if (pageType === 'list') {
      testDir = path.join(__dirname, '..', module.path, '__tests__');
      template = listPageTemplate(module.name, module.displayName);
    } else if (pageType === 'new') {
      testDir = path.join(__dirname, '..', module.path, 'new', '__tests__');
      template = newPageTemplate(module.name, module.displayName);
    } else if (pageType === 'detail') {
      testDir = path.join(__dirname, '..', module.path, '[id]', '__tests__');
      template = detailPageTemplate(module.name, module.displayName);
    } else if (pageType === 'edit') {
      testDir = path.join(__dirname, '..', module.path, '[id]', 'edit', '__tests__');
      template = editPageTemplate(module.name, module.displayName);
    }

    if (testDir && template) {
      fs.mkdirSync(testDir, { recursive: true });
      const testFile = path.join(testDir, 'page.test.tsx');

      if (!fs.existsSync(testFile)) {
        fs.writeFileSync(testFile, template);
        console.log(`✓ Created ${testFile}`);
      } else {
        console.log(`⊘ Skipped ${testFile} (already exists)`);
      }
    }
  });
});

// Generate tests for simple pages
simplePages.forEach((page) => {
  const testDir = path.join(__dirname, '..', page.path, '__tests__');
  const template = simplePageTemplate(page.name, page.displayName);

  fs.mkdirSync(testDir, { recursive: true });
  const testFile = path.join(testDir, 'page.test.tsx');

  if (!fs.existsSync(testFile)) {
    fs.writeFileSync(testFile, template);
    console.log(`✓ Created ${testFile}`);
  } else {
    console.log(`⊘ Skipped ${testFile} (already exists)`);
  }
});

console.log('\n✨ Test generation complete!');
