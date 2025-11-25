/**
 * Analytics Page Tests
 */

import { render, screen, waitFor } from '@/test-utils';
import AnalyticsPage from '../page';

describe('AnalyticsPage', () => {
  it('renders page content', async () => {
    render(<AnalyticsPage />);
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
  });

  it('displays page heading', () => {
    render(<AnalyticsPage />);
    expect(screen.getByRole('heading')).toBeInTheDocument();
  });
});
