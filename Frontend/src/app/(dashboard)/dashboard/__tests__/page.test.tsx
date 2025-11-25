/**
 * Dashboard Page Tests
 */

import { render, screen, waitFor } from '@/test-utils';
import DashboardPage from '../page';

describe('DashboardPage', () => {
  it('renders page content', async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
  });

  it('displays page heading', () => {
    render(<DashboardPage />);
    expect(screen.getByRole('heading')).toBeInTheDocument();
  });
});
