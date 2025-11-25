/**
 * Messages Page Tests
 */

import { render, screen, waitFor } from '@/test-utils';
import MessagesPage from '../page';

describe('MessagesPage', () => {
  it('renders page content', async () => {
    render(<MessagesPage />);
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
  });

  it('displays page heading', () => {
    render(<MessagesPage />);
    expect(screen.getByRole('heading')).toBeInTheDocument();
  });
});
