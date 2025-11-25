/**
 * Settings Page Tests
 */

import { render, screen, waitFor } from '@/test-utils';
import SettingsPage from '../page';

describe('SettingsPage', () => {
  it('renders page content', async () => {
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
  });

  it('displays page heading', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('heading')).toBeInTheDocument();
  });
});
