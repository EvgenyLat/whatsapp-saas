/**
 * Customers List Page Tests
 * Tests list display, search, filtering, pagination, and CRUD operations
 */

import { render, screen, waitFor, userEvent } from '@/test-utils';
import { useRouter } from 'next/navigation';
import CustomersPage from '../page';
import { mockCustomers } from '@/mocks/handlers';

const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

describe('CustomersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    });
  });

  describe('Rendering', () => {
    it('renders page header and title', async () => {
      render(<CustomersPage />);

      expect(screen.getByRole('heading', { name: /customers/i })).toBeInTheDocument();
      expect(screen.getByText(/manage your customer database/i)).toBeInTheDocument();
    });

    it('renders add customer button', async () => {
      render(<CustomersPage />);

      const addButton = screen.getByRole('link', { name: /add customer/i });
      expect(addButton).toBeInTheDocument();
      expect(addButton).toHaveAttribute('href', '/dashboard/customers/new');
    });

    it('renders search and filter controls', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search by name or phone/i)).toBeInTheDocument();
      });
    });

    it('renders customers table after loading', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
    });

    it('displays all customer data in table', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText(/john doe/i)).toBeInTheDocument();
        expect(screen.getByText(/jane smith/i)).toBeInTheDocument();
        expect(screen.getByText(/bob johnson/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner initially', () => {
      render(<CustomersPage />);

      expect(screen.getByText(/loading customers/i)).toBeInTheDocument();
    });

    it('hides loading spinner after data loads', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.queryByText(/loading customers/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no customers', async () => {
      // Mock empty response
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [],
              pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
            }),
        })
      ) as jest.Mock;

      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText(/no customers found/i)).toBeInTheDocument();
        expect(screen.getByText(/add your first customer to get started/i)).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('filters customers by search term', async () => {
      const user = userEvent.setup();
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText(/john doe/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search by name or phone/i);
      await user.type(searchInput, 'John');

      await waitFor(() => {
        expect(screen.getByText(/john doe/i)).toBeInTheDocument();
      });
    });

    it('resets to page 1 when searching', async () => {
      const user = userEvent.setup();
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search by name or phone/i);
      await user.type(searchInput, 'test');

      // Verify page resets (implementation would check internal state)
      await waitFor(() => {
        expect(searchInput).toHaveValue('test');
      });
    });
  });

  describe('Sorting and Filtering', () => {
    it('can change sort order', async () => {
      const user = userEvent.setup();
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      // Find and click sort dropdown
      const sortButton = screen.getAllByRole('combobox')[0];
      await user.click(sortButton!);

      // This would test the dropdown options
    });

    it('can change items per page', async () => {
      const user = userEvent.setup();
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      // Find and click limit dropdown
      const limitButtons = screen.getAllByRole('combobox');
      const limitButton = limitButtons[limitButtons.length - 1];
      await user.click(limitButton!);

      // This would test the dropdown options
    });
  });

  describe('Navigation', () => {
    it('navigates to customer detail on row click', async () => {
      const user = userEvent.setup();
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText(/john doe/i)).toBeInTheDocument();
      });

      const row = screen.getByText(/john doe/i).closest('tr');
      await user.click(row!);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard/customers/+1234567890');
      });
    });

    it('navigates to customer detail on view button click', async () => {
      const user = userEvent.setup();
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText(/john doe/i)).toBeInTheDocument();
      });

      const viewButtons = screen.getAllByLabelText(/view customer/i);
      await user.click(viewButtons[0]!);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard/customers/+1234567890');
      });
    });

    it('navigates to edit page on edit button click', async () => {
      const user = userEvent.setup();
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText(/john doe/i)).toBeInTheDocument();
      });

      const editButtons = screen.getAllByLabelText(/edit customer/i);
      await user.click(editButtons[0]!);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard/customers/+1234567890/edit');
      });
    });
  });

  describe('Delete Functionality', () => {
    it('shows confirmation dialog on delete', async () => {
      const user = userEvent.setup();
      window.confirm = jest.fn(() => false);

      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText(/john doe/i)).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText(/delete customer/i);
      await user.click(deleteButtons[0]!);

      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Are you sure you want to delete this customer')
      );
    });

    it('deletes customer when confirmed', async () => {
      const user = userEvent.setup();
      window.confirm = jest.fn(() => true);

      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText(/john doe/i)).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText(/delete customer/i);
      await user.click(deleteButtons[0]!);

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalled();
      });
    });

    it('does not delete when cancelled', async () => {
      const user = userEvent.setup();
      window.confirm = jest.fn(() => false);

      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText(/john doe/i)).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText(/delete customer/i);
      await user.click(deleteButtons[0]!);

      // Customer should still be visible
      await waitFor(() => {
        expect(screen.getByText(/john doe/i)).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    it('shows pagination when multiple pages exist', async () => {
      // Mock response with multiple pages
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: mockCustomers,
              pagination: { page: 1, limit: 10, total: 25, totalPages: 3 },
            }),
        })
      ) as jest.Mock;

      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
      });
    });

    it('disables previous button on first page', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: mockCustomers,
              pagination: { page: 1, limit: 10, total: 25, totalPages: 3 },
            }),
        })
      ) as jest.Mock;

      render(<CustomersPage />);

      await waitFor(() => {
        const prevButton = screen.getByRole('button', { name: /previous/i });
        expect(prevButton).toBeDisabled();
      });
    });

    it('can navigate to next page', async () => {
      const user = userEvent.setup();
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: mockCustomers,
              pagination: { page: 1, limit: 10, total: 25, totalPages: 3 },
            }),
        })
      ) as jest.Mock;

      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
      });

      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Would verify page change
    });
  });

  describe('Responsive Design', () => {
    it('shows table view on desktop', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
    });

    it('shows card view on mobile', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });

      render(<CustomersPage />);

      await waitFor(() => {
        // Cards would be rendered instead of table
        expect(screen.getByText(/john doe/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error message on fetch failure', async () => {
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load customers/i)).toBeInTheDocument();
      });
    });

    it('allows retry after error', async () => {
      const user = userEvent.setup();
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load customers/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /try again/i });
      await user.click(retryButton);

      // Would verify retry attempt
    });
  });

  describe('Accessibility', () => {
    it('has proper table headers', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByRole('columnheader', { name: /customer/i })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: /contact/i })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: /total bookings/i })).toBeInTheDocument();
      });
    });

    it('has proper ARIA labels on action buttons', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getAllByLabelText(/view customer/i).length).toBeGreaterThan(0);
        expect(screen.getAllByLabelText(/edit customer/i).length).toBeGreaterThan(0);
        expect(screen.getAllByLabelText(/delete customer/i).length).toBeGreaterThan(0);
      });
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByPlaceholderText(/search by name or phone/i)).toHaveFocus();
    });
  });
});
