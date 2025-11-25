import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

// No need to mock errorLogger anymore

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary Component', () => {
  let consoleError: jest.SpyInstance;
  let mockOnError: jest.Mock;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockOnError = jest.fn();
    
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined)
      }
    });
  });

  afterEach(() => {
    consoleError.mockRestore();
    jest.clearAllMocks();
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should render error UI when there is an error', async () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(screen.getByText('Произошла ошибка')).toBeInTheDocument();
      expect(screen.getByText('К сожалению, что-то пошло не так. Мы уже работаем над решением проблемы.')).toBeInTheDocument();
    });
  });

  it('should display error ID when available', async () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(screen.getByText('ID ошибки:')).toBeInTheDocument();
      // Error ID is generated dynamically, so we just check that it exists
      expect(screen.getByText(/error_\d+_/)).toBeInTheDocument();
    });
  });

  it('should display error message', async () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(screen.getByText('Детали ошибки:')).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });
  });

  it('should call onError callback when provided', async () => {
    render(
      <ErrorBoundary onError={mockOnError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(expect.stringMatching(/error_\d+_/), expect.any(Error));
    });
  });

  it('should render retry and reload buttons', async () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(screen.getByText('Попробовать снова')).toBeInTheDocument();
      expect(screen.getByText('Обновить страницу')).toBeInTheDocument();
    });
  });

  it('should render support contact information', async () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(screen.getByText('Нужна помощь?')).toBeInTheDocument();
      expect(screen.getByText('support@example.com')).toBeInTheDocument();
      expect(screen.getByText('+972 50-123-4567')).toBeInTheDocument();
      expect(screen.getByText('Telegram')).toBeInTheDocument();
    });
  });

  it('should render support link when error ID is available', async () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    await waitFor(() => {
      const supportLink = screen.getByText('Обратиться в поддержку');
      expect(supportLink).toBeInTheDocument();
      expect(supportLink.closest('a')).toHaveAttribute('href', expect.stringMatching(/https:\/\/support\.example\.com\/error\/error_\d+_/));
    });
  });

  it('should copy error details when copy button is clicked', async () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    await waitFor(() => {
      const copyButton = screen.getByText('Скопировать детали');
      fireEvent.click(copyButton);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('error_')
    );
  });

  it('should handle retry button click', async () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    await waitFor(() => {
      const retryButton = screen.getByText('Попробовать снова');
      fireEvent.click(retryButton);
    });

    // After retry, should show loading state
    expect(screen.getByText('Повторяем...')).toBeInTheDocument();
  });

  it('should render custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;
    
    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('Произошла ошибка')).not.toBeInTheDocument();
  });

  it('should have correct Bootstrap styling for error UI', async () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    await waitFor(() => {
      const container = screen.getByText('Произошла ошибка').closest('div');
      expect(container).toHaveClass('min-vh-100', 'd-flex', 'align-items-center', 'justify-content-center');
    });
  });

  it('should display error timestamp', async () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(screen.getByText(/Время ошибки:/)).toBeInTheDocument();
    });
  });

  it('should handle reload button click', async () => {
    // Mock window.location.reload
    const mockReload = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    await waitFor(() => {
      const reloadButton = screen.getByText('Обновить страницу');
      fireEvent.click(reloadButton);
    });

    expect(mockReload).toHaveBeenCalled();
  });
});