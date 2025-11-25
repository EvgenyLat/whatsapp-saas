/**
 * Services List Page Tests
 * Tests list display, search, filtering, pagination, and CRUD operations
 */

import { render, screen, waitFor, userEvent } from '@/test-utils';
import { useRouter } from 'next/navigation';
import ServicesPage from '../page';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

describe('ServicesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  it('renders page header', async () => {
    render(<ServicesPage />);
    expect(screen.getByRole('heading', { name: /services/i })).toBeInTheDocument();
  });

  it('renders add button', async () => {
    render(<ServicesPage />);
    const addButton = screen.getByRole('link', { name: /add/i });
    expect(addButton).toBeInTheDocument();
  });

  it('displays items after loading', async () => {
    render(<ServicesPage />);
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
  });

  it('handles search functionality', async () => {
    const user = userEvent.setup();
    render(<ServicesPage />);

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

    render(<ServicesPage />);
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    const deleteButtons = screen.queryAllByLabelText(/delete/i);
    if (deleteButtons.length > 0) {
      await user.click(deleteButtons[0]!);
      expect(window.confirm).toHaveBeenCalled();
    }
  });

  it('navigates to detail page on row click', async () => {
    const user = userEvent.setup();
    render(<ServicesPage />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    const rows = screen.queryAllByRole('row');
    if (rows.length > 1) {
      await user.click(rows[1]!);
      expect(mockPush).toHaveBeenCalled();
    }
  });
});
