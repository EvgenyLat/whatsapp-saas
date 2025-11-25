/**
 * New Services Page Tests
 * Tests form validation and creation flow
 */

import { render, screen, waitFor, userEvent } from '@/test-utils';
import { useRouter } from 'next/navigation';
import NewServicesPage from '../page';

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('NewServicesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      back: mockBack,
    });
  });

  it('renders form header', () => {
    render(<NewServicesPage />);
    expect(screen.getByRole('heading', { name: /add new/i })).toBeInTheDocument();
  });

  it('renders back button', () => {
    render(<NewServicesPage />);
    const backButton = screen.getByRole('button', { name: /back/i });
    expect(backButton).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(<NewServicesPage />);

    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    await waitFor(() => {
      const errors = screen.queryAllByRole('alert');
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  it('navigates back on cancel', async () => {
    const user = userEvent.setup();
    render(<NewServicesPage />);

    const cancelButton = screen.getByRole('button', { name: /cancel|back/i });
    await user.click(cancelButton);

    expect(mockBack).toHaveBeenCalled();
  });
});
