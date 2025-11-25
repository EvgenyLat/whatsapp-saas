/**
 * Bookings Detail Page Tests
 * Tests detail view and actions
 */

import { render, screen, waitFor, userEvent } from '@/test-utils';
import { useRouter, useParams } from 'next/navigation';
import BookingsDetailPage from '../page';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

describe('BookingsDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    (useParams as jest.Mock).mockReturnValue({ id: 'test-id' });
  });

  it('loads and displays data', async () => {
    render(<BookingsDetailPage />);
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
  });

  it('renders action buttons', async () => {
    render(<BookingsDetailPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    });
  });

  it('navigates to edit page', async () => {
    const user = userEvent.setup();
    render(<BookingsDetailPage />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/edit'));
  });
});
