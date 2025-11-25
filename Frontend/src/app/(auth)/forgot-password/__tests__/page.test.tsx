/**
 * Forgot Password Page Tests
 * Tests password reset request flow and rate limiting
 */

import { render, screen, waitFor, userEvent } from '@/test-utils';
import ForgotPasswordPage from '../page';

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ message: 'Reset link sent' }),
      })
    ) as jest.Mock;
  });

  describe('Rendering', () => {
    it('renders forgot password form', () => {
      render(<ForgotPasswordPage />);

      expect(screen.getByRole('heading', { name: /forgot password/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    });

    it('has back to login link', () => {
      render(<ForgotPasswordPage />);

      const loginLink = screen.getByRole('link', { name: /back to login/i });
      expect(loginLink).toHaveAttribute('href', '/login');
    });

    it('displays info message', () => {
      render(<ForgotPasswordPage />);

      expect(screen.getByText(/if an account exists with this email/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('validates email format', async () => {
      const user = userEvent.setup();
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('submits form with valid email', async () => {
      const user = userEvent.setup();
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/auth/forgot-password',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ email: 'test@example.com' }),
          })
        );
      });
    });

    it('shows success message after submission', async () => {
      const user = userEvent.setup();
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText(/reset link sent/i)).toBeInTheDocument();
        expect(screen.getByText(/next steps/i)).toBeInTheDocument();
      });
    });

    it('displays email in success message', async () => {
      const user = userEvent.setup();
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message on failure', async () => {
      const user = userEvent.setup();
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ message: 'User not found' }),
        })
      ) as jest.Mock;

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'nonexistent@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText(/user not found/i)).toBeInTheDocument();
      });
    });

    it('handles network errors', async () => {
      const user = userEvent.setup();
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Rate Limiting', () => {
    it('shows rate limit error on 429 response', async () => {
      const user = userEvent.setup();
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 429,
          json: () => Promise.resolve({ message: 'Too many requests' }),
        })
      ) as jest.Mock;

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText(/too many requests/i)).toBeInTheDocument();
        expect(screen.getByText(/please wait.*seconds/i)).toBeInTheDocument();
      });
    });

    it('disables submit button during countdown', async () => {
      const user = userEvent.setup();
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 429,
          json: () => Promise.resolve({ message: 'Too many requests' }),
        })
      ) as jest.Mock;

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /wait.*s/i });
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Resend Functionality', () => {
    it('shows resend button after success', async () => {
      const user = userEvent.setup();
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resend reset link/i })).toBeInTheDocument();
      });
    });

    it('can resend reset link', async () => {
      const user = userEvent.setup();
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resend reset link/i })).toBeInTheDocument();
      });

      const resendButton = screen.getByRole('button', { name: /resend reset link/i });
      await user.click(resendButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading state during submission', async () => {
      const user = userEvent.setup();
      global.fetch = jest.fn(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true } as any), 1000))
      );

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText(/sending reset link/i)).toBeInTheDocument();
      });
    });

    it('disables form during submission', async () => {
      const user = userEvent.setup();
      global.fetch = jest.fn(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true } as any), 1000))
      );

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(emailInput).toBeDisabled();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('auto-focuses email input', () => {
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveAttribute('autoFocus');
    });

    it('shows error with alert role', async () => {
      const user = userEvent.setup();
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ message: 'Error occurred' }),
        })
      ) as jest.Mock;

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
      });
    });
  });
});
