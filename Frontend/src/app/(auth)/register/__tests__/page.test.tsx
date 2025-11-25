/**
 * Register Page Tests
 * Tests multi-step registration, validation, and plan selection
 */

import { render, screen, waitFor, userEvent } from '@/test-utils';
import { useRouter } from 'next/navigation';
import RegisterPage from '../page';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('RegisterPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    ) as jest.Mock;
  });

  describe('Step 1: Basic Info', () => {
    it('renders step 1 with all fields', () => {
      render(<RegisterPage />);

      expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });

    it('validates required fields', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument();
      });
    });

    it('validates email format', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'invalid-email');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('validates password strength', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, 'weak');

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it('shows password strength indicator', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, 'Password123!');

      await waitFor(() => {
        expect(screen.getByText(/strong/i)).toBeInTheDocument();
      });
    });

    it('validates password confirmation match', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);

      await user.type(passwordInput, 'Password123!');
      await user.type(confirmInput, 'DifferentPassword123!');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
      });
    });

    it('proceeds to step 2 with valid data', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
      await user.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/salon name/i)).toBeInTheDocument();
      });
    });
  });

  describe('Step 2: Business Info', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      // Complete step 1
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
      await user.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/salon name/i)).toBeInTheDocument();
      });
    });

    it('renders step 2 with business fields', () => {
      expect(screen.getByLabelText(/salon name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/business address/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });

    it('can navigate back to step 1', async () => {
      const user = userEvent.setup();

      const backButton = screen.getByRole('button', { name: /back/i });
      await user.click(backButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      });
    });

    it('validates business fields', async () => {
      const user = userEvent.setup();

      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/salon name must be at least 2 characters/i)).toBeInTheDocument();
      });
    });

    it('validates phone number format', async () => {
      const user = userEvent.setup();

      const phoneInput = screen.getByLabelText(/phone number/i);
      await user.type(phoneInput, 'abc');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid phone number/i)).toBeInTheDocument();
      });
    });

    it('proceeds to step 3 with valid data', async () => {
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/salon name/i), 'Beauty Salon');
      await user.type(screen.getByLabelText(/phone number/i), '+1234567890');
      await user.type(screen.getByLabelText(/business address/i), '123 Main St, City, State');
      await user.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        expect(screen.getByText(/starter/i)).toBeInTheDocument();
        expect(screen.getByText(/professional/i)).toBeInTheDocument();
        expect(screen.getByText(/enterprise/i)).toBeInTheDocument();
      });
    });
  });

  describe('Step 3: Plan Selection', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      // Complete steps 1 and 2
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
      await user.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/salon name/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/salon name/i), 'Beauty Salon');
      await user.type(screen.getByLabelText(/phone number/i), '+1234567890');
      await user.type(screen.getByLabelText(/business address/i), '123 Main St');
      await user.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        expect(screen.getByText(/starter/i)).toBeInTheDocument();
      });
    });

    it('renders all subscription plans', () => {
      expect(screen.getByText(/starter/i)).toBeInTheDocument();
      expect(screen.getByText(/professional/i)).toBeInTheDocument();
      expect(screen.getByText(/enterprise/i)).toBeInTheDocument();
    });

    it('allows selecting a plan', async () => {
      const user = userEvent.setup();

      const professionalPlan = screen.getByText(/professional/i).closest('button');
      await user.click(professionalPlan!);

      expect(professionalPlan).toHaveClass('border-primary-500');
    });

    it('validates terms acceptance', async () => {
      const user = userEvent.setup();

      const professionalPlan = screen.getByText(/professional/i).closest('button');
      await user.click(professionalPlan!);

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/you must accept the terms and conditions/i)).toBeInTheDocument();
      });
    });

    it('submits registration successfully', async () => {
      const user = userEvent.setup();

      const professionalPlan = screen.getByText(/professional/i).closest('button');
      await user.click(professionalPlan!);

      const termsCheckbox = screen.getByRole('checkbox');
      await user.click(termsCheckbox);

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/verify-email'));
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper progress indicator', () => {
      render(<RegisterPage />);

      expect(screen.getByLabelText(/step 1 of 3/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/step 2 of 3/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/step 3 of 3/i)).toBeInTheDocument();
    });

    it('can be navigated with keyboard', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      await user.tab();
      expect(screen.getByLabelText(/full name/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/email address/i)).toHaveFocus();
    });
  });
});
