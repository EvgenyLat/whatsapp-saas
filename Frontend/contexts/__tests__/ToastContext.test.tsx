import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import { ToastProvider, useToast } from '../ToastContext';
import { useState } from 'react';

// Test component that uses the toast context
const TestComponent = () => {
  const { showToast } = useToast();
  const [toastId, setToastId] = useState<string | null>(null);

  const showSuccessToast = () => {
    showToast('Success message', 'success');
  };

  const showErrorToast = () => {
    showToast('Error message', 'error');
  };

  const showInfoToast = () => {
    showToast('Info message', 'info');
  };

  const showWarningToast = () => {
    showToast('Warning message', 'warning');
  };

  return (
    <div>
      <button onClick={showSuccessToast} data-testid="success-btn">
        Show Success
      </button>
      <button onClick={showErrorToast} data-testid="error-btn">
        Show Error
      </button>
      <button onClick={showInfoToast} data-testid="info-btn">
        Show Info
      </button>
      <button onClick={showWarningToast} data-testid="warning-btn">
        Show Warning
      </button>
    </div>
  );
};

describe('ToastContext', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render children without toasts initially', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    expect(screen.getByTestId('success-btn')).toBeInTheDocument();
    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
  });

  it('should show success toast when showToast is called', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByTestId('success-btn'));

    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    expect(screen.getByText('Success message')).toHaveClass('bg-green-50', 'text-green-800');
  });

  it('should show error toast when showToast is called', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByTestId('error-btn'));

    await waitFor(() => {
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    expect(screen.getByText('Error message')).toHaveClass('bg-red-50', 'text-red-800');
  });

  it('should show info toast when showToast is called', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByTestId('info-btn'));

    await waitFor(() => {
      expect(screen.getByText('Info message')).toBeInTheDocument();
    });

    expect(screen.getByText('Info message')).toHaveClass('bg-blue-50', 'text-blue-800');
  });

  it('should show warning toast when showToast is called', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByTestId('warning-btn'));

    await waitFor(() => {
      expect(screen.getByText('Warning message')).toBeInTheDocument();
    });

    expect(screen.getByText('Warning message')).toHaveClass('bg-yellow-50', 'text-yellow-800');
  });

  it('should auto-dismiss toast after default duration', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByTestId('success-btn'));

    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    // Fast-forward time by 5 seconds (default duration)
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });
  });

  it('should allow manual dismissal of toast', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByTestId('success-btn'));

    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    // Find and click the close button
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });
  });

  it('should throw error when useToast is used outside provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useToast must be used within a ToastProvider');

    consoleError.mockRestore();
  });
});
